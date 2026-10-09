"use client";
import { useId, type DialogHTMLAttributes, type RefObject } from "react";
import { Icon } from "../icon";

export function Dialog({
  title,
  dialogRef,
  children,
  closeDisabled = false,
  closeLabel = "Close dialog",
  onDismiss,
  ...props
}: DialogHTMLAttributes<HTMLDialogElement> & {
  title: string;
  dialogRef: RefObject<HTMLDialogElement | null>;
  closeDisabled?: boolean;
  closeLabel?: string;
  onDismiss?: () => void;
}) {
  const titleId = useId();
  return (
    <dialog {...props} ref={dialogRef} aria-labelledby={titleId}>
      <div className="dialog-header">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          disabled={closeDisabled}
          aria-label={closeLabel}
          onClick={() => {
            dialogRef.current?.close();
            onDismiss?.();
          }}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
