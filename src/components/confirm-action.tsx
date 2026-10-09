"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "./icon";
export function ConfirmAction({
  title,
  label,
  description,
  path,
  payload,
  disabled = false,
  children,
  recordPath,
  method = "POST",
}: {
  title: string;
  label: string;
  description: string;
  path: string;
  payload: Record<string, unknown>;
  disabled?: boolean;
  children?: ReactNode;
  recordPath?: string;
  method?: "POST" | "PATCH";
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    operation = useRef<{
      requestKey: string;
      body: Record<string, unknown>;
    } | null>(null);
  const router = useRouter();
  const [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<{
      id?: string;
      transactionId?: string;
      auditId?: string;
    } | null>(null);
  useEffect(() => {
    const current = dialog.current;
    const prevent = (event: Event) => {
      if (busy || uncertain) event.preventDefault();
    };
    current?.addEventListener("cancel", prevent);
    return () => current?.removeEventListener("cancel", prevent);
  }, [busy, uncertain]);
  function finish(data: {
    id?: string;
    transactionId?: string;
    auditId?: string;
  }) {
    setResult(data);
    setUncertain(false);
    setError("");
  }
  async function submit() {
    if (reason.trim().length < 5) {
      setError("Give a meaningful reason of at least five characters.");
      return;
    }
    operation.current ??= {
      requestKey: crypto.randomUUID(),
      body: { ...payload, reason: reason.trim() },
    };
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...operation.current.body,
          requestKey: operation.current.requestKey,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        id?: string;
        transactionId?: string;
        auditId?: string;
      };
      if (response.ok) {
        finish(data);
        return;
      }
      if (response.status >= 500) {
        setUncertain(true);
        setError(
          "The outcome is uncertain. Check status, or retry the exact same operation with its original key.",
        );
        return;
      }
      setUncertain(false);
      operation.current = null;
      setError(
        data.error?.replaceAll("_", " ") ??
          "The action was rejected. Review the latest details before trying again.",
      );
    } catch {
      setUncertain(true);
      setError("The response was lost. Check status before retrying.");
    } finally {
      setBusy(false);
    }
  }
  async function check() {
    if (!operation.current) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/admin/operations/${operation.current.requestKey}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        state?: string;
        id?: string;
        transactionId?: string;
        auditId?: string;
        objectId?: string;
      };
      if (response.ok && data.state === "confirmed")
        finish({ ...data, id: data.objectId, auditId: data.id });
      else
        setError(
          "No completed record was found yet. The original request may still be running.",
        );
    } catch {
      setError(
        "Status could not be checked. Keep this dialog open and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="button secondary"
        disabled={disabled}
        onClick={() => {
          setReason("");
          setError("");
          setResult(null);
          operation.current = null;
          dialog.current?.showModal();
        }}
      >
        {title}
      </button>
      <dialog ref={dialog} className="action-dialog">
        <div className="dialog-header">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close confirmation"
            disabled={busy || uncertain}
            onClick={() => {
              dialog.current?.close();
              if (result) router.refresh();
            }}
          >
            <Icon name="close" />
          </button>
        </div>
        {result ? (
          <div role="status" className="action-result">
            <h3>Action confirmed</h3>
            {result.transactionId && (
              <Link
                className="text-link"
                href={`/admin/transactions/${result.transactionId}`}
                onClick={() => dialog.current?.close()}
              >
                View ledger transaction →
              </Link>
            )}
            {result.id && recordPath && (
              <Link className="text-link" href={`${recordPath}/${result.id}`}>
                Open saved record →
              </Link>
            )}
            {result.auditId && <p>Audit record {result.auditId}</p>}
            <button
              className="button primary"
              onClick={() => {
                dialog.current?.close();
                router.refresh();
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="muted">{description}</p>
            <div className="confirmation-context">{children}</div>
            <label className="form-label">
              Reason
              <textarea
                required
                minLength={5}
                maxLength={1000}
                rows={3}
                disabled={busy || uncertain}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              {uncertain && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void check()}
                >
                  Check status
                </button>
              )}
              <button
                className="button primary"
                disabled={busy || reason.trim().length < 5}
                onClick={() => void submit()}
              >
                {busy
                  ? "Please wait…"
                  : uncertain
                    ? "Retry identical operation"
                    : label}
              </button>
            </div>
            {operation.current && (
              <p className="fine-print">
                Request key: {operation.current.requestKey}
              </p>
            )}
          </>
        )}
      </dialog>
    </>
  );
}
