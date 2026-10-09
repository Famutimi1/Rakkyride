"use client";
import { useState } from "react";
import { toKobo, money } from "@/lib/format";
import { ConfirmAction } from "./confirm-action";
export function RefundAction({
  tripId,
  recipient,
  remainingKobo,
  enabled,
}: {
  tripId: string;
  recipient: string;
  remainingKobo: string;
  enabled: boolean;
}) {
  const [amount, setAmount] = useState("");
  let amountKobo: string | null = null;
  try {
    amountKobo = toKobo(amount);
  } catch {}
  const valid =
    amountKobo !== null && BigInt(amountKobo) <= BigInt(remainingKobo);
  return (
    <div className="money-action-form">
      <h3>Refund to rider wallet</h3>
      <p className="muted">Remaining refundable: {money(remainingKobo)}</p>
      <label className="form-label">
        Amount · NGN
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          disabled={!enabled}
        />
      </label>
      <ConfirmAction
        title="Review wallet refund"
        label={
          valid ? `Refund ${money(amountKobo!)} to wallet` : "Refund to wallet"
        }
        description="This credits the rider’s internal wallet. Driver earnings are not automatically clawed back, and no card or bank refund is initiated."
        path="payments/refunds"
        payload={{ tripId, amountKobo: valid ? Number(amountKobo) : 0 }}
        disabled={!enabled || !valid}
      >
        <p>
          Recipient: <strong>{recipient}</strong>
        </p>
        <p>Trip: {tripId}</p>
        <p>
          Amount: <strong>{valid ? money(amountKobo!) : "—"}</strong>
        </p>
      </ConfirmAction>
      {!enabled && (
        <small>
          Money actions are gated until rollout checks are approved.
        </small>
      )}
    </div>
  );
}
export function AccountActions({
  userId,
  owner,
  kind,
  balanceKobo,
  frozen,
  enabled,
}: {
  userId: string;
  owner: string;
  kind: "wallet" | "earnings";
  balanceKobo: string;
  frozen: boolean;
  enabled: boolean;
}) {
  const [amount, setAmount] = useState(""),
    [direction, setDirection] = useState<"credit" | "debit">("credit");
  let kobo: string | null = null;
  try {
    kobo = toKobo(amount);
  } catch {}
  return (
    <div className="money-action-form">
      <h3>Account controls</h3>
      <label className="form-label">
        Adjustment
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as "credit" | "debit")}
          disabled={!enabled}
        >
          <option value="credit">Increase funds</option>
          <option value="debit">Decrease funds</option>
        </select>
      </label>
      <label className="form-label">
        Amount · NGN
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={!enabled}
          placeholder="0.00"
        />
      </label>
      <ConfirmAction
        title="Review adjustment"
        label={
          kobo
            ? `${direction === "credit" ? "Increase" : "Decrease"} ${kind} by ${money(kobo)}`
            : "Confirm adjustment"
        }
        description="Final balance and permission limits are checked under database locks. A correction adds a balanced ledger transaction."
        path="payments/adjustments"
        payload={{
          userId,
          account: kind,
          direction,
          amountKobo: kobo ? Number(kobo) : 0,
        }}
        disabled={!enabled || !kobo}
      >
        <p>
          Owner: <strong>{owner}</strong>
        </p>
        <p>Account: {kind}</p>
        <p>Current: {money(balanceKobo)}</p>
        <p>
          Proposed:{" "}
          {kobo
            ? money(
                (
                  BigInt(balanceKobo) +
                  (direction === "credit" ? BigInt(kobo) : -BigInt(kobo))
                ).toString(),
              )
            : "—"}
        </p>
      </ConfirmAction>
      <ConfirmAction
        title={frozen ? "Unfreeze account" : "Freeze account"}
        label={frozen ? "Unfreeze this account" : "Freeze this account"}
        description="Freeze prevents postings that decrease this account’s balance, including eligible holds or payouts. Incoming credits remain possible. It may affect settlement or release paths that debit this account; review the linked trip before acting."
        path={`payments/accounts/${userId}/freeze`}
        payload={{ account: kind, frozen: !frozen }}
        disabled={!enabled}
      >
        <strong>
          {owner} · {kind}
        </strong>
        <p>Current balance: {money(balanceKobo)}</p>
      </ConfirmAction>
      {!enabled && (
        <small>
          Money actions are gated until rollout checks are approved.
        </small>
      )}
    </div>
  );
}
