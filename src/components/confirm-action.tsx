"use client";
import { Button } from "./ui/button";
import { FormField } from "./ui/filter-toolbar";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog } from "./ui/dialog";
export interface ActionResult {
  id?: string;
  transactionId?: string;
  auditId?: string;
  [key: string]: unknown;
}
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
  open,
  onOpenChange,
  hideTrigger = false,
  onSuccess,
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  onSuccess?: (result: ActionResult) => void | Promise<void>;
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
    [result, setResult] = useState<ActionResult | null>(null),
    [needsRefresh, setNeedsRefresh] = useState(false);
  function begin() {
    setReason("");
    setError("");
    setResult(null);
    setNeedsRefresh(false);
    operation.current = null;
    dialog.current?.showModal();
  }
  useEffect(() => {
    if (open) begin();
  }, [open]);
  useEffect(() => {
    const current = dialog.current;
    const prevent = (event: Event) => {
      if (busy || uncertain) event.preventDefault();
    };
    current?.addEventListener("cancel", prevent);
    return () => current?.removeEventListener("cancel", prevent);
  }, [busy, uncertain]);
  async function finish(data: ActionResult) {
    setResult(data);
    setUncertain(false);
    setError("");
    try { await onSuccess?.(data); }
    catch (error) { setError(error instanceof Error ? error.message : "The decision was saved, but its current status could not be reloaded."); }
  }
  async function submit() {
    if (busy) return;
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
      const data = (await response.json()) as ActionResult & { error?: string };
      if (response.ok) {
        await finish(data);
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
      setNeedsRefresh(response.status === 409);
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
        await finish({ ...data, id: data.objectId, auditId: data.id });
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
      {!hideTrigger && <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={begin}
      >
        {title}
      </Button>}
      <Dialog
        dialogRef={dialog}
        className="action-dialog"
        title={title}
        closeLabel="Close confirmation"
        closeDisabled={busy || uncertain}
        onClose={() => {
          onOpenChange?.(false);
          if (result) router.refresh();
        }}
      >
        {result ? (
          <div role="status" className="action-result">
            <h3>Action confirmed by the backend</h3>
            {error && <><p className="form-error" role="alert">{error}</p><Button disabled={busy} onClick={() => { setBusy(true); void finish(result).finally(() => setBusy(false)); }}>Reload saved status</Button></>}
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
            <Button
              type="button"
              variant="primary"
              disabled={busy}
              onClick={() => {
                dialog.current?.close();
              }}
            >
              {busy ? "Reloading saved status…" : "Done"}
            </Button>
          </div>
        ) : (
          <>
            <p className="muted">{description}</p>
            <div className="confirmation-context">{children}</div>
            <FormField>
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
            </FormField>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {needsRefresh && <Button type="button" variant="secondary" onClick={() => { dialog.current?.close(); router.refresh(); }}>Reload latest application</Button>}
            <div className="dialog-actions">
              {uncertain && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void check()}
                >
                  Check status
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                disabled={busy || needsRefresh || reason.trim().length < 5}
                onClick={() => void submit()}
              >
                {busy
                  ? "Please wait…"
                  : uncertain
                    ? "Retry identical operation"
                    : label}
              </Button>
            </div>
            {operation.current && (
              <p className="fine-print">
                Request key: {operation.current.requestKey}
              </p>
            )}
          </>
        )}
      </Dialog>
    </>
  );
}
