"use client";
import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { Button } from "./button";
import { Dialog } from "./dialog";

export function RowActions({
  links = [],
  children,
}: {
  links?: readonly { href: string; label: string }[];
  children?: ReactNode;
}) {
  return (
    <div className="row-actions">
      {links.map((link) => (
        <Link className="button secondary" key={link.href} href={link.href}>
          {link.label}
        </Link>
      ))}
      {children}
    </div>
  );
}

export function InspectRow({
  columns,
  cells,
}: {
  columns: readonly { id: string; label: ReactNode; mobileLabel?: string }[];
  cells: readonly ReactNode[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <RowActions>
      <Button variant="secondary" onClick={() => dialog.current?.showModal()}>
        View details
      </Button>
      <Dialog
        dialogRef={dialog}
        title="Record details"
        closeLabel="Close record details"
      >
        <dl className="definition-list">
          {columns.map((column, index) => (
            <div key={column.id}>
              <dt>{column.mobileLabel ?? column.label}</dt>
              <dd>{cells[index]}</dd>
            </div>
          ))}
        </dl>
      </Dialog>
    </RowActions>
  );
}
