"use client";
import { Button } from "./ui/button";
import { GoogleSignIn } from "./google-sign-in";
import { useState, type FormEvent } from "react";

export function LoginForm({
  reason,
  googleClientId,
}: {
  reason?: string;
  googleClientId?: string;
}) {
  const [phone, setPhone] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function perform(action: string) {
    setBusy(true);
    setError("");
    try {
      const send = () =>
        fetch(`/api/session/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, code }),
        });
      const response =
        action === "refresh" && navigator.locks
          ? await navigator.locks.request("rakky-session-refresh", send)
          : await send();
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Sign-in failed.");
        return;
      }
      if (action === "initiate") setSent(true);
      else {
        window.location.assign("/admin");
      }
    } catch {
      setError("Could not connect. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void perform(sent ? "verify" : "initiate");
  }
  return (
    <div className="login-methods">
      <form onSubmit={submit} className="login-form">
        {reason && (
          <div className="notice">
            {reason === "forbidden"
              ? "This account does not have staff access."
              : reason === "expired"
                ? "Your session expired. Renew your session or sign in again."
                : reason === "logout_unconfirmed"
                  ? "You are signed out on this browser. Server session revocation could not be confirmed. Ask the owner to revoke the session if needed."
                : "The backend is unavailable. Please try again."}
          </div>
        )}
        <label>
          Staff phone number
          <input
            type="tel"
            autoComplete="tel"
            placeholder="+2348012345678"
            required
            pattern="\+234[0-9]{10}"
            value={phone}
            readOnly={sent || busy}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        {sent && (
          <label>
            Verification code
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy
            ? "Please wait…"
            : sent
              ? "Verify and sign in"
              : "Send verification code"}
        </Button>
        {sent && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setSent(false);
              setCode("");
            }}
          >
            Use a different number
          </Button>
        )}
        {reason === "expired" && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void perform("refresh")}
          >
            Renew existing session
          </Button>
        )}
      </form>
      <div className="login-divider">
        <span>or</span>
      </div>
      <GoogleSignIn
        clientId={googleClientId}
        disabled={busy}
        onPending={setBusy}
      />
      <p className="fine-print">
        Staff access must be provisioned by the owner. Public registration
        cannot grant administration access.
      </p>
    </div>
  );
}
