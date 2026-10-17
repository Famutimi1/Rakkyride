"use client";
import { useRef, useState } from "react";
import { ConfirmAction } from "./confirm-action";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Dropdown } from "./ui/dropdown";
import { FormField } from "./ui/filter-toolbar";
import { money, toKobo, statusLabel } from "@/lib/format";

export interface FareSettings {
  vehicleType: string;
  baseFareKobo: string;
  perKmKobo: string;
  perMinuteKobo: string;
  minimumFareKobo: string;
  commissionBps: number;
  active: boolean;
  updatedAt: string;
  version: string;
}
const fareFields = [
  ["baseFareKobo", "Base fare"],
  ["perKmKobo", "Per kilometre"],
  ["perMinuteKobo", "Per minute"],
  ["minimumFareKobo", "Minimum fare"],
] as const;
const decimal = (kobo: string) =>
  `${BigInt(kobo) / 100n}.${String(BigInt(kobo) % 100n).padStart(2, "0")}`;
export function PricingEditor({ fare }: { fare: FareSettings }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fareFields.map(([key]) => [key, decimal(fare[key])])),
  );
  const [commission, setCommission] = useState(String(fare.commissionBps / 100));
  const [active, setActive] = useState(fare.active);
  const changes: [string, string, string][] = [];
  const payload: Record<string, unknown> = {
    expectedVersion: fare.version,
    active,
  };
  let error = "";
  try {
    for (const [key, label] of fareFields) {
      const kobo = /^0+(\.0{1,2})?$/.test(values[key])
        ? "0"
        : toKobo(values[key]);
      if (BigInt(kobo) > 1_000_000_000n)
        throw new Error("Fare values must be at most NGN 10,000,000.");
      payload[key] = Number(kobo);
      if (kobo !== fare[key])
        changes.push([label, money(fare[key]), money(kobo)]);
    }
    if (!/^\d+(\.\d{1,2})?$/.test(commission) || Number(commission) > 100)
      throw new Error(
        "Commission must be between 0 and 100%, with up to two decimal places.",
      );
    const bps = Math.round(Number(commission) * 100);
    payload.commissionBps = bps;
    if (bps !== fare.commissionBps)
      changes.push([
        "Commission",
        `${fare.commissionBps / 100}%`,
        `${bps / 100}%`,
      ]);
    if (active !== fare.active)
      changes.push([
        "Availability",
        fare.active ? "Active" : "Inactive",
        active ? "Active" : "Inactive",
      ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Review the values.";
  }
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setValues(
            Object.fromEntries(fareFields.map(([key]) => [key, decimal(fare[key])])),
          );
          setCommission(String(fare.commissionBps / 100));
          setActive(fare.active);
          dialog.current?.showModal();
        }}
      >
        Edit pricing
      </Button>
      <Dialog
        dialogRef={dialog}
        title={`${statusLabel(fare.vehicleType)} pricing`}
        closeLabel="Close pricing editor"
        className="action-dialog"
      >
        <div className="care-form">
          <p className="muted">
            Amounts are in NGN. Saved trip fares and posted ledger history are
            retained. Commission is applied when an unsettled trip completes.
            Disabling a service stops new estimates while existing trips can
            finish.
          </p>
          {fareFields.map(([key, label]) => (
            <FormField key={key} label={`${label} · NGN`}>
              <input
                inputMode="decimal"
                value={values[key]}
                onChange={(e) =>
                  setValues({ ...values, [key]: e.target.value })
                }
              />
            </FormField>
          ))}
          <FormField label="Commission · %">
            <input
              inputMode="decimal"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
            />
          </FormField>
          <FormField label="Availability">
            <Dropdown
              aria-label="Fare availability"
              value={String(active)}
              onValueChange={(value) => setActive(value === "true")}
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
          </FormField>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <ConfirmAction
            title="Review pricing changes"
            label="Save pricing"
            description="Confirm these changes with a reason. A concurrent configuration edit requires a refresh."
            path={`pricing/${fare.vehicleType}`}
            method="PATCH"
            payload={payload}
            disabled={!!error || !changes.length}
          >
            <dl className="definition-list">
              {changes.map(([label, before, after]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>
                    {before} → {after}
                  </dd>
                </div>
              ))}
            </dl>
          </ConfirmAction>
        </div>
      </Dialog>
    </>
  );
}

export function PersonEditor({
  person,
}: {
  person: { id: string; name: string; active: boolean; version: string; driver?:{status:string;activeTripId?:string|null}|null };
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(person.name),
    [active, setActive] = useState(person.active);
  const nameLocked=person.driver?.status==='approved'||Boolean(person.driver?.activeTripId);
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setName(person.name);
          setActive(person.active);
          dialog.current?.showModal();
        }}
      >
        Edit account
      </Button>
      <Dialog
        dialogRef={dialog}
        title="Edit customer account"
        closeLabel="Close account editor"
        className="action-dialog"
      >
        <div className="care-form">
          <p className="muted">
            {person.id}. Deactivation blocks further authenticated requests. An
            account with a scheduled or active trip cannot be deactivated.
          </p>
          <FormField label="Name">
            <input
              value={name}
              disabled={nameLocked}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
          {nameLocked && <p className="muted">Reviewed driver identity cannot be changed directly. Material changes need a staff review and cannot be made during an active trip.</p>}
          <FormField label="Account status">
            <Dropdown
              aria-label="Account status"
              value={String(active)}
              onValueChange={(value) => setActive(value === "true")}
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
            />
          </FormField>
          <ConfirmAction
            title="Review account changes"
            label="Save account"
            description="Confirm the name and account status change with a reason. Login identifiers and staff permissions are managed separately."
            method="PATCH"
            path={`users/${person.id}`}
            payload={{ name, active, expectedVersion: person.version }}
            disabled={
              name.trim().length < 2 ||
              (name.trim() === person.name && active === person.active)
            }
          >
            <p>
              Name: {person.name} → {name.trim()}
            </p>
            <p>
              Status: {person.active ? "Active" : "Inactive"} →{" "}
              {active ? "Active" : "Inactive"}
            </p>
          </ConfirmAction>
        </div>
      </Dialog>
    </>
  );
}

export function ScheduleEditor({
  trip,
}: {
  trip: { id: string; scheduledAt: string; version: string };
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pickup, setPickup] = useState(
    new Date(Date.parse(trip.scheduledAt) + 3600_000)
      .toISOString()
      .slice(0, 16),
  );
  const scheduledAt = `${pickup}:00+01:00`;
  const changed = Date.parse(scheduledAt) !== Date.parse(trip.scheduledAt);
  const delay = Date.parse(scheduledAt) - Date.now();
  const valid =
    Number.isFinite(delay) && delay >= 30 * 60_000 && delay <= 7 * 86400_000;
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setPickup(
            new Date(Date.parse(trip.scheduledAt) + 3600_000)
              .toISOString()
              .slice(0, 16),
          );
          dialog.current?.showModal();
        }}
      >
        Manage booking
      </Button>
      <Dialog
        dialogRef={dialog}
        title="Manage scheduled booking"
        closeLabel="Close booking editor"
        className="action-dialog"
      >
        <div className="care-form">
          <p className="muted">
            {trip.id}. Changes are available until dispatch starts. Pickup times
            use Lagos time (WAT).
          </p>
          <FormField label="Pickup · WAT">
            <input
              type="datetime-local"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
            />
          </FormField>
          {!valid && (
            <p role="alert">
              Choose a pickup between 30 minutes and 7 days from now.
            </p>
          )}
          <ConfirmAction
            title="Review pickup change"
            label="Reschedule booking"
            description="Keep the saved route and fare; change only pickup time. Overlapping bookings are rejected."
            path={`trips/${trip.id}/schedule`}
            payload={{
              action: "reschedule",
              scheduledAt,
              expectedVersion: trip.version,
            }}
            disabled={!changed || !valid}
          >
            <p>
              Pickup · WAT:{" "}
              {new Date(trip.scheduledAt).toLocaleString("en-NG", {
                timeZone: "Africa/Lagos",
              })}{" "}
              → {pickup.replace("T", " ")}
            </p>
          </ConfirmAction>
          <ConfirmAction
            title="Cancel booking"
            label="Confirm cancellation"
            description="Cancel this scheduled ride before dispatch. This action records your reason in the trip timeline and audit log."
            path={`trips/${trip.id}/schedule`}
            payload={{ action: "cancel", expectedVersion: trip.version }}
          >
            <p>Trip: {trip.id}</p>
          </ConfirmAction>
        </div>
      </Dialog>
    </>
  );
}
