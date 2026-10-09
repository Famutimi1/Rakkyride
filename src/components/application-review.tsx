"use client";
import { useState } from "react";
import type { DriverApplication } from "@/contracts/admin";
import { ConfirmAction } from "./confirm-action";
import { DocumentViewer } from "./document-viewer";
import { DefinitionList, StatusBadge, Timestamp } from "./primitives";
export function ApplicationReview({
  application,
  preview,
}: {
  application: DriverApplication;
  preview: boolean;
}) {
  const [kind, setKind] = useState("license");
  const doc = application.documents.find((d) => d.kind === kind);
  return (
    <div className="review-grid">
      <section className="panel">
        <header className="panel-header">
          <h2>Application documents</h2>
        </header>
        <div className="document-tabs">
          {application.documents.map((d) => (
            <button
              className="button secondary"
              key={d.kind}
              aria-pressed={kind === d.kind}
              onClick={() => setKind(d.kind)}
            >
              {d.kind === "license"
                ? "Driving licence"
                : d.kind === "registration"
                  ? "Vehicle registration"
                  : "Insurance"}
              {!d.available ? " · Missing" : ""}
            </button>
          ))}
        </div>
        <DocumentViewer
          userId={application.userId}
          kind={kind}
          available={doc?.available ?? false}
          preview={preview}
        />
      </section>
      <aside className="panel">
        <header className="panel-header">
          <h2>Review & decision</h2>
        </header>
        <DefinitionList
          items={[
            ["Applicant", application.name],
            ["Status", <StatusBadge key="state" status={application.status} />],
            ["Vehicle", `${application.make ?? ""} ${application.model ?? ""}`],
            ["Year", application.year ?? "Not supplied"],
            ["Plate", application.plate ?? "Not supplied"],
            [
              "Submitted",
              application.submittedAt ? (
                <Timestamp key="time" value={application.submittedAt} />
              ) : (
                "Not submitted"
              ),
            ],
          ]}
        />
        {application.rejectionReason && (
          <p className="panel-note">
            Rejection reason: {application.rejectionReason}
          </p>
        )}
        <div className="review-actions">
          {(["approved", "rejected"] as const).map((decision) => (
            <ConfirmAction
              key={decision}
              title={
                decision === "approved"
                  ? "Approve application"
                  : "Reject application"
              }
              label={
                decision === "approved"
                  ? "Approve driver application"
                  : "Reject with this reason"
              }
              description={`Review the current document set for ${application.name}. Rejection reasons are shown to the driver. The backend will reject a stale decision.`}
              path={`driver-applications/${application.userId}/review`}
              payload={{ decision, expectedVersion: application.version }}
              disabled={preview || application.status !== "pending"}
            >
              <strong>{application.name}</strong>
              <p>{application.plate}</p>
            </ConfirmAction>
          ))}
        </div>
        <p className="panel-note">
          Each decision is audited. Application approval and account activity
          are separate states.
        </p>
      </aside>
    </div>
  );
}
