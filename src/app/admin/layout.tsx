import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { previewEnabled, requireStaff, adminRead } from "@/lib/server";
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const preview = previewEnabled();
  const staff = preview ? null : await requireStaff();
  const connected = preview
    ? null
    : await adminRead<{ nodeEnvironment: string; paymentEnvironment: string }>(
        "environment",
      );
  const label = process.env.RAKKY_ENVIRONMENT;
  const environment = connected
    ? `${connected.paymentEnvironment} · ${connected.nodeEnvironment}${label && label !== connected.paymentEnvironment ? " · label mismatch" : ""}`
    : "Development preview";
  return (
    <AdminShell
      preview={preview}
      staffName={staff?.name}
      staffRole={staff?.platformRole}
      environment={environment}
    >
      {children}
    </AdminShell>
  );
}
