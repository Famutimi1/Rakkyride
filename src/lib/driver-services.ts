import type { DriverApplication, DriverServiceStatus, LiveDriver, ServiceType, VehicleCategory } from "../contracts/admin.ts";

export const driverServiceNames: Record<ServiceType, string> = {
  ride: "Passenger rides",
  courier: "Courier deliveries",
};
export type ServiceDecision = "approved" | "rejected" | "suspended";
export type ReviewSelection = Partial<Record<ServiceType, ServiceDecision>>;

export function serviceDecisionOptions(status: DriverServiceStatus) {
  if (status === "pending") return [{ value: "approved", label: "Approve" }, { value: "rejected", label: "Reject" }] as const;
  if (status === "approved") return [{ value: "suspended", label: "Suspend future requests" }] as const;
  if (status === "suspended") return [{ value: "approved", label: "Restore approval (requests stay off)" }] as const;
  return [];
}

export function canClassifyVehicle(application: DriverApplication):boolean {
  const settings=application.serviceSettings;
  if(!settings)return false;
  return settings.vehicleCategory===null||(application.status==='pending'&&!Object.values(settings.services).some(service=>service.status==='approved'||service.status==='suspended'));
}

export function buildServiceReview(application: DriverApplication, choices: ReviewSelection, category: VehicleCategory | "") {
  const settings = application.serviceSettings;
  if (!settings) throw new Error("Service eligibility was not returned. Refresh after updating the backend.");
  if (!application.allowedActions.includes("review-services")) throw new Error("This application is not available for service review.");
  const restrictionsOnly = Object.values(choices).filter(Boolean).length > 0
    && Object.values(choices).filter(Boolean).every(value => value === "rejected" || value === "suspended");
  const classify=canClassifyVehicle(application) && !restrictionsOnly;
  const confirmedCategory = classify?category:settings.vehicleCategory;
  if (!confirmedCategory && !restrictionsOnly) throw new Error("Confirm the vehicle category from the documents before approving.");
  const services: ReviewSelection = {};
  const changes: { label: string; before: string; after: string }[] = [];
  for (const service of ["ride", "courier"] as const) {
    const decision = choices[service];
    if (!decision) continue;
    const current = settings.services[service];
    if (!serviceDecisionOptions(current.status).some(option => option.value === decision)) throw new Error(`The ${driverServiceNames[service].toLowerCase()} decision no longer matches the current state.`);
    if (decision === "approved" && (!current.consentAccepted || (service === "ride" && confirmedCategory !== "car"))) throw new Error(`Approval requirements are not met for ${driverServiceNames[service].toLowerCase()}.`);
    services[service] = decision;
    changes.push({ label: driverServiceNames[service], before: current.status, after: decision });
  }
  if (classify && confirmedCategory) {
    if(settings.vehicleCategory!==confirmedCategory)changes.push({ label: "Vehicle category", before: settings.vehicleCategory??"Unclassified", after: confirmedCategory });
    if (confirmedCategory === "motorcycle") {
      if (settings.services.ride.status === "pending" && services.ride !== "rejected") throw new Error("Reject the passenger application before classifying this vehicle as a motorcycle.");
      if (settings.services.ride.status === "approved" && !services.ride) changes.push({ label: "Passenger rides", before: "approved", after: "suspended" });
    }
  }
  if (!changes.length) throw new Error("Choose at least one service decision.");
  return {
    payload: {
      decision: Object.values(services).includes("approved") || !Object.keys(services).length ? "approved" : "rejected",
      services,
      expectedVersion: application.version,
      ...(classify && confirmedCategory ? { vehicleCategory: confirmedCategory } : {}),
    },
    changes,
  };
}

export function liveServiceDrivers(drivers: LiveDriver[], service: ServiceType): LiveDriver[] {
  return drivers.filter(driver => {
    const status = service === "ride" ? driver.rideServiceStatus : driver.courierServiceStatus;
    return Boolean((status && status !== "none") || (driver.activeTripId && driver.activeTripService === service));
  });
}

export function showServiceMarker(driver: LiveDriver, service: ServiceType): boolean {
  const approved = service === "ride" ? driver.rideServiceStatus === "approved" && driver.rideOptIn === true : driver.courierServiceStatus === "approved" && driver.courierOptIn === true;
  return (approved && driver.availability === "available") || Boolean(driver.activeTripId && driver.activeTripService === service);
}

/** Only a fresh, correctly scoped API record may replace the displayed service states. */
export function confirmedApplication(value: unknown, userId: string): DriverApplication {
  const object = (input: unknown): input is Record<string, unknown> => Boolean(input && typeof input === "object" && !Array.isArray(input));
  if (!object(value) || value.userId !== userId || typeof value.version !== "string" || !value.version
    || !["none", "pending", "approved", "rejected"].includes(String(value.status))
    || !Array.isArray(value.documents) || !Array.isArray(value.allowedActions)) {
    throw new Error("The backend did not return the saved application. Reload its status before continuing.");
  }
  const settings = value.serviceSettings;
  if (!object(settings) || !Number.isSafeInteger(settings.version) || !object(settings.services)) {
    throw new Error("The backend did not return saved passenger and courier states.");
  }
  for (const service of ["ride", "courier"] as const) {
    const state = settings.services[service];
    if (!object(state) || !["none", "pending", "approved", "rejected", "suspended"].includes(String(state.status))
      || typeof state.enabled !== "boolean" || typeof state.consentAccepted !== "boolean") {
      throw new Error("The backend returned an incomplete service state. Reload before continuing.");
    }
  }
  return value as unknown as DriverApplication;
}
