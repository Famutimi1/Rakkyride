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
  const previewRecords = preview
    ? await (async () => {
        const { people, trips, intents, withdrawals, accounts } =
          await import("@/lib/fixtures");
        const records: import("@/contracts/admin").StaffSearchHit[] = [
          ...people.map((person) => ({
            id: person.id,
            type: "person" as const,
            title: person.name,
            subtitle: `${person.phoneMasked} · ${person.emailMasked}`,
            href: `/admin/${person.driver ? "drivers" : "riders"}/${person.id}`,
          })),
          ...trips.map((trip) => ({
            id: trip.id,
            type: "trip" as const,
            title: `${trip.riderName} · ${trip.service === "ride" ? "Passenger" : "Courier"} trip`,
            subtitle: trip.status,
            href: `/admin/trips/${trip.id}`,
          })),
          ...intents.map((payment) => ({
            id: payment.id,
            type: "payment" as const,
            title: payment.reference,
            subtitle: payment.status,
            href: `/admin/payments/${payment.id}`,
          })),
          ...withdrawals.map((withdrawal) => ({
            id: withdrawal.id,
            type: "withdrawal" as const,
            title: withdrawal.reference,
            subtitle: withdrawal.status,
            href: `/admin/withdrawals/${withdrawal.id}`,
          })),
          ...accounts.map((account) => ({
            id: account.id,
            type: "account" as const,
            title: account.owner,
            subtitle: account.kind,
            href: `/admin/ledger/${account.id}`,
          })),
        ];
        return records;
      })()
    : undefined;
  return (
    <AdminShell
      preview={preview}
      previewRecords={previewRecords}
      staffName={staff?.name}
      staffRole={staff?.platformRole}
      environment={environment}
    >
      {children}
    </AdminShell>
  );
}
