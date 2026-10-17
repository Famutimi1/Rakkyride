"use client";
import { useEffect, useState } from "react";
import type { DriverApplication, ServiceType, VehicleCategory } from "@/contracts/admin";
import { ConfirmAction } from "./confirm-action";
import { DocumentViewer } from "./document-viewer";
import { DriverServiceState } from "./driver-service-state";
import { Button } from "./ui/button";
import { Dropdown } from "./ui/dropdown";
import { FormField } from "./ui/filter-toolbar";
import {
  buildServiceReview, canClassifyVehicle, driverServiceNames,
  serviceDecisionOptions, confirmedApplication,
  type ReviewSelection, type ServiceDecision,
} from "@/lib/driver-services";
import { DefinitionList, Notice, StatusBadge, Timestamp } from "./primitives";

interface SelectedReview {
  title: string;
  choices: ReviewSelection;
  category: VehicleCategory | "";
  review: ReturnType<typeof buildServiceReview>;
}

function actionLabel(service: ServiceType, decision: ServiceDecision, restoring: boolean) {
  const name = service === "ride" ? "passenger rides" : "courier deliveries";
  return decision === "approved" ? `${restoring ? "Restore" : "Approve"} ${name}`
    : decision === "suspended" ? `Suspend ${name}` : `Reject ${name}`;
}

export function ApplicationReview({ application: initial, preview, staffEntryUrl = "/login" }: { application: DriverApplication; preview: boolean; staffEntryUrl?: string }) {
  const [application, setApplication] = useState(initial);
  const [kind, setKind] = useState("license");
  const [category, setCategory] = useState<VehicleCategory | "">("");
  const [selected, setSelected] = useState<SelectedReview | null>(null);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    setApplication(initial);
    setCategory("");
    setNotice("");
  }, [initial.userId, initial.version]);

  const settings = application.serviceSettings;
  const classify = canClassifyVehicle(application);
  const canReview = !preview && application.allowedActions.includes("review-services");
  const doc = application.documents.find(document => document.kind === kind);

  function reviewOption(choices: ReviewSelection) {
    try { return { review: buildServiceReview(application, choices, category), error: "" }; }
    catch (error) { return { review: undefined, error: error instanceof Error ? error.message : "Refresh the application before reviewing." }; }
  }
  function choose(title: string, choices: ReviewSelection) {
    if (!canReview) return;
    const result = reviewOption(choices);
    if (!result.review) return;
    setSelected({ title, choices, category, review: result.review });
    setOpen(true);
  }
  async function saved() {
    const response = await fetch(`/api/admin/driver-applications/${initial.userId}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("The decision was saved, but the current application could not be reloaded.");
    const confirmed = confirmedApplication(await response.json(), initial.userId);
    setApplication(confirmed);
    setNotice("Decision saved to the backend. The current database status is shown below.");
  }

  const classification = classify && category ? reviewOption({}) : undefined;
  return <>
    {preview && <Notice>
      <strong>Read-only preview.</strong> Passenger and courier approval and suspension require a real application and staff sign-in.
      <a className="button primary preview-reset" href={staffEntryUrl}>Open connected staff dashboard</a>
    </Notice>}
    {notice && <p className="service-review-notice" role="status">{notice}</p>}
    <div className="review-grid">
      <section className="panel application-documents" id="application-documents">
        <header className="panel-header"><h2>Application documents</h2></header>
        <div className="document-tabs" role="group" aria-label="Application documents">
          {application.documents.map(document => <Button
            variant="secondary" key={document.kind} aria-pressed={kind === document.kind}
            onClick={() => setKind(document.kind)}
          >
            {document.kind === "license" ? "Driving licence" : document.kind === "registration" ? "Vehicle registration" : "Insurance"}
            {!document.available ? " · Missing" : ""}
          </Button>)}
        </div>
        <DocumentViewer userId={application.userId} kind={kind} available={doc?.available ?? false} preview={preview} />
      </section>
      <section className="panel service-review-panel" aria-label="Service review">
        <header className="panel-header"><h2>Review & decision</h2><a className="text-link" href="#application-documents">View documents</a></header>
        <DefinitionList items={[
          ["Applicant", application.name],
          ["Profile status", <StatusBadge key="state" status={application.status} />],
          ["Vehicle", `${application.make ?? ""} ${application.model ?? ""}`],
          ["Year", application.year ?? "Not supplied"],
          ["Plate", application.plate ?? "Not supplied"],
          ["Submitted", application.submittedAt ? <Timestamp key="time" value={application.submittedAt} /> : "Not submitted"],
        ]} />
        {application.rejectionReason && <p className="panel-note">Rejection reason: {application.rejectionReason}</p>}
        {settings ? <div className="service-review-options">
          <h3>Services and consent</h3>
          {classify ? <FormField label="Confirm vehicle category" hint={`Required for approval. Check the documents. Partner requested: ${settings.requestedVehicleCategory ?? settings.vehicleCategory ?? "not recorded"}. Suspension and rejection do not require classification.`}>
            <Dropdown aria-label="Confirm vehicle category" value={category} onValueChange={value => setCategory(value as VehicleCategory | "")} disabled={!canReview}
              options={[{ value: "", label: "Select verified category" }, { value: "car", label: "Car" }, { value: "motorcycle", label: "Motorcycle · courier only" }]} />
          </FormField> : <p className="panel-note">Verified category: {settings.vehicleCategory === "car" ? "Car" : "Motorcycle"}</p>}
          <div className="service-review-grid">
            {(["ride", "courier"] as const).map(service => {
              const current = settings.services[service];
              const options = serviceDecisionOptions(current.status);
              const legacy = current.consentBasis === "legacy_passenger_approval";
              return <section key={service} className="service-review-item" aria-label={driverServiceNames[service]}>
                <h4>{driverServiceNames[service]}</h4>
                <DriverServiceState status={current.status} enabled={current.enabled} />
                <p className="panel-note">{legacy ? "Legacy passenger approval; no new consent record was created."
                  : current.consentAccepted ? "Explicit service consent recorded." : "Current service consent is required before approval."}</p>
                {current.consentRecord && <p className="fine-print">{current.consentRecord.action === "accepted" ? "Accepted" : "Withdrawn"} · {current.consentRecord.version} · <Timestamp value={current.consentRecord.at} /></p>}
                {current.review?.reason && <p className="panel-note">Last decision: {current.review.reason}</p>}
                {current.review?.submittedAt && <p className="fine-print">Service requested <Timestamp value={current.review.submittedAt} /></p>}
                <div className="service-decision-actions">
                  {options.map(option => {
                    const decision = option.value;
                    const choices = { [service]: decision };
                    const candidate = reviewOption(choices);
                    const title = actionLabel(service, decision, current.status === "suspended");
                    return <div key={decision}>
                      <Button variant={decision === "approved" ? "primary" : "danger"}
                        disabled={!canReview || !candidate.review}
                        aria-describedby={!candidate.review ? `${service}-${decision}-reason` : undefined}
                        onClick={() => choose(title, choices)}>{title}</Button>
                      {!candidate.review && <small id={`${service}-${decision}-reason`}>{candidate.error}</small>}
                    </div>;
                  })}
                </div>
                {!options.length && <p className="panel-note">{current.status === "none" ? "Not requested. Approval is unavailable." : "The partner must submit a new application before review."}</p>}
              </section>;
            })}
          </div>
          {classification?.review && <Button disabled={!canReview} onClick={() => choose("Confirm vehicle category", {})}>Confirm vehicle category</Button>}
          <p className="panel-note">Every action opens a confirmation and requires a reason. Unselected services keep their state. Staff cannot change the partner’s request preferences.</p>
        </div> : <Notice>Service eligibility was not returned by the backend. Refresh after deploying the service-aware API. Approval actions are unavailable.</Notice>}
      </section>
    </div>
    {!preview && <ConfirmAction title={selected?.title ?? "Review service"}
      label="Confirm decision"
      description="This saves the selected passenger or courier decision to the backend, then reloads its saved status. Suspending future requests does not cancel an accepted job."
      path={`driver-applications/${application.userId}/review`} payload={selected?.review.payload ?? {}}
      open={open} onOpenChange={setOpen} hideTrigger onSuccess={saved}>
      <strong>{application.name} · {application.plate ?? "No plate supplied"}</strong>
      <ul className="service-change-list">{selected?.review.changes.map(change => <li key={change.label}>{change.label}: {change.before} → {change.after}</li>)}</ul>
      <p>Restoring approval leaves requests off until the partner enables them.</p>
    </ConfirmAction>}
  </>;
}
