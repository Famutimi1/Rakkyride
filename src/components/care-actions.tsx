"use client";
import { FormField } from "./ui/filter-toolbar";
import { Dropdown } from "./ui/dropdown";
import { useState } from "react";
import { ConfirmAction } from "./confirm-action";
import { Notice } from "./primitives";
export function CreateCare({
  kind,
  disabled,
}: {
  kind: "support" | "safety";
  disabled: boolean;
}) {
  const [subject, setSubject] = useState(""),
    [body, setBody] = useState(""),
    [severity, setSeverity] = useState("medium"),
    [category, setCategory] = useState("other"),
    [customerId, setCustomerId] = useState(""),
    [tripId, setTripId] = useState(""),
    [paymentId, setPaymentId] = useState(""),
    [nextAction, setNextAction] = useState("");
  return (
    <div className="care-form">
      <FormField>
        Subject
        <input
          value={subject}
          maxLength={160}
          onChange={(e) => setSubject(e.target.value)}
        />
      </FormField>
      <FormField>
        Initial internal note
        <textarea
          value={body}
          maxLength={4000}
          rows={4}
          onChange={(e) => setBody(e.target.value)}
        />
      </FormField>
      <FormField>
        Severity
        <Dropdown
          aria-label="Severity"
          value={severity}
          onValueChange={(value) => setSeverity(value)}
        >
          {["low", "medium", "high", "critical"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Dropdown>
      </FormField>
      {kind === "support" ? (
        <FormField>
          Category
          <Dropdown
            aria-label="Category"
            value={category}
            onValueChange={(value) => setCategory(value)}
          >
            {["trip", "payment", "account", "other"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Dropdown>
        </FormField>
      ) : (
        <FormField>
          Next staff action
          <textarea
            value={nextAction}
            maxLength={1000}
            onChange={(e) => setNextAction(e.target.value)}
          />
        </FormField>
      )}
      <FormField>
        Customer UUID (optional)
        <input
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        />
      </FormField>
      <FormField>
        Trip UUID (optional)
        <input value={tripId} onChange={(e) => setTripId(e.target.value)} />
      </FormField>
      {kind === "support" && (
        <FormField>
          Payment intent UUID (optional)
          <input
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
          />
        </FormField>
      )}
      <ConfirmAction
        title={`Create ${kind} record`}
        label="Save record"
        description="Review the subject and links. This saves an internal staff record and does not notify the customer."
        path={kind}
        recordPath={`/admin/${kind}`}
        payload={{
          subject,
          body,
          severity,
          category,
          customerId,
          tripId,
          paymentId,
          nextAction,
        }}
        disabled={
          disabled ||
          subject.trim().length < 5 ||
          body.trim().length < 5 ||
          (kind === "safety" && nextAction.trim().length < 5)
        }
      >
        <p>
          {subject} · {severity}
        </p>
      </ConfirmAction>
    </div>
  );
}
export function CareActions({
  kind,
  id,
  version,
  status,
  states,
  disabled,
}: {
  kind: "support" | "safety";
  id: string;
  version: number;
  status: string;
  states: string[];
  disabled: boolean;
}) {
  const [body, setBody] = useState(""),
    [next, setNext] = useState(states[0] ?? ""),
    [assignee, setAssignee] = useState(""),
    [nextAction, setNextAction] = useState("");
  const path = `${kind}/${id}/activity`;
  return (
    <div className="care-form">
      <Notice>
        Notes are internal. Saving a note does not send a customer reply.
        Refresh before acting if another staff member changed this record.
      </Notice>
      <FormField>
        Internal note
        <textarea
          rows={4}
          maxLength={4000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </FormField>
      <ConfirmAction
        title="Add internal note"
        label="Save note"
        description={`Save this note on record ${id}, version ${version}.`}
        path={path}
        payload={{ action: "note", version, body }}
        disabled={disabled || body.trim().length < 5}
      />
      <FormField>
        Next state
        <Dropdown
          aria-label="Next state"
          value={next}
          onValueChange={(value) => setNext(value)}
        >
          {states.map((s) => (
            <option key={s}>{s}</option>
          ))}
          {!states.length && <option>No further transition</option>}
        </Dropdown>
      </FormField>
      {kind === "safety" && (
        <FormField>
          Next staff action (optional update)
          <textarea
            maxLength={1000}
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
          />
        </FormField>
      )}
      <ConfirmAction
        title="Change state"
        label="Confirm transition"
        description={`Move ${id} from ${status} to ${next}. A reason is required, including when resolving.`}
        path={path}
        payload={{
          action: "transition",
          version,
          status: next,
          ...(nextAction ? { nextAction } : {}),
        }}
        disabled={
          disabled ||
          !states.includes(next) ||
          Boolean(nextAction && nextAction.trim().length < 5)
        }
      />
      <FormField>
        Assigned staff UUID (empty removes assignment)
        <input value={assignee} onChange={(e) => setAssignee(e.target.value)} />
      </FormField>
      <ConfirmAction
        title="Update assignment"
        label="Confirm assignment"
        description={`Assign record ${id}. ${kind === "safety" ? "Only super_admin staff may be assigned." : "Only active staff may be assigned."}`}
        path={path}
        payload={{ action: "assign", version, assignedStaffId: assignee }}
        disabled={disabled}
      />
    </div>
  );
}
