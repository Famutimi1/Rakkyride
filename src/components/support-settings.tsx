"use client";

import { useState } from "react";
import { FormField } from "./ui/filter-toolbar";
import { ConfirmAction } from "./confirm-action";

export interface SupportSettings {
  phone: string | null;
  email: string | null;
  staffedHours: string;
  availabilityMessage: string;
  version: number;
  updatedAt: string;
}

export function SupportSettingsEditor({ settings }: { settings: SupportSettings }) {
  const [phone, setPhone] = useState(settings.phone ?? "");
  const [email, setEmail] = useState(settings.email ?? "");
  const [hours, setHours] = useState(settings.staffedHours);
  const [message, setMessage] = useState(settings.availabilityMessage);
  const next = {
    phone: phone.trim() || null,
    email: email.trim().toLowerCase() || null,
    staffedHours: hours.trim(),
    availabilityMessage: message.trim(),
  };
  const error = next.phone && !/^\+[1-9]\d{7,14}$/.test(next.phone)
    ? "Enter an international phone number, for example +234 followed by the number, or leave it empty."
    : next.email && (next.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email))
      ? "Enter a valid support email or leave it empty."
      : !next.staffedHours || next.staffedHours.length > 160
        ? "Support hours must contain 1–160 characters."
        : !next.availabilityMessage || next.availabilityMessage.length > 300
          ? "The availability message must contain 1–300 characters."
          : "";
  const fields = [
    ["phone", "Phone"], ["email", "Email"],
    ["staffedHours", "Staffed hours"], ["availabilityMessage", "Availability message"],
  ] as const;
  const changes = fields.filter(([key]) => next[key] !== settings[key]);
  return (
    <div className="care-form">
      <p className="muted">Customers see these saved values in the app. Empty phone and email fields hide their contact buttons.</p>
      <FormField>Support phone
        <input type="tel" value={phone} maxLength={16} onChange={(event) => setPhone(event.target.value)} />
      </FormField>
      <FormField>Support email
        <input type="email" value={email} maxLength={254} onChange={(event) => setEmail(event.target.value)} />
      </FormField>
      <FormField>Staffed hours · include the time zone
        <input value={hours} maxLength={160} onChange={(event) => setHours(event.target.value)} />
      </FormField>
      <FormField>Availability message
        <textarea value={message} maxLength={300} onChange={(event) => setMessage(event.target.value)} />
      </FormField>
      {error && <p role="alert" className="form-error">{error}</p>}
      <ConfirmAction
        title="Review support settings"
        label="Save support settings"
        description="Review the contact details customers will see. A reason is required and concurrent edits are rejected."
        path="support-settings"
        method="PATCH"
        payload={{ ...next, expectedVersion: settings.version }}
        disabled={Boolean(error) || changes.length === 0}
      >
        <dl className="definition-list">
          {changes.map(([key, label]) => (
            <div key={key}><dt>{label}</dt><dd>{settings[key] || "Not configured"} → {next[key] || "Not configured"}</dd></div>
          ))}
        </dl>
      </ConfirmAction>
    </div>
  );
}
