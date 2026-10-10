"use client";
import { FormField } from "./ui/filter-toolbar";
import { Dropdown } from "./ui/dropdown";
import { Button } from "./ui/button";
import { useState } from "react";
import { ConfirmAction } from "./confirm-action";
import { toKobo, money } from "@/lib/format";
const fields = [
  ["min_topup_kobo", "minTopupKobo", "Minimum top-up"],
  ["max_topup_kobo", "maxTopupKobo", "Maximum top-up"],
  ["min_withdrawal_kobo", "minWithdrawalKobo", "Minimum withdrawal"],
  [
    "max_daily_withdrawal_kobo",
    "maxDailyWithdrawalKobo",
    "Daily withdrawal maximum",
  ],
  ["withdrawal_fee_kobo", "withdrawalFeeKobo", "Withdrawal fee"],
  ["cash_debt_limit_kobo", "cashDebtLimitKobo", "Cash debt limit"],
  [
    "paystack_balance_alert_kobo",
    "paystackBalanceAlertKobo",
    "Paystack balance alert",
  ],
  [
    "admin_adjustment_approval_kobo",
    "adminAdjustmentApprovalKobo",
    "Adjustment threshold",
  ],
] as const;
export interface PaymentSettings {
  version: string;
  min_topup_kobo: string;
  max_topup_kobo: string;
  min_withdrawal_kobo: string;
  max_daily_withdrawal_kobo: string;
  withdrawal_fee_kobo: string;
  cash_debt_limit_kobo: string;
  paystack_balance_alert_kobo: string;
  admin_adjustment_approval_kobo: string;
  new_payout_account_cooldown_hours: number;
  payout_name_match: string;
  transfer_fee_tiers: { maxKobo: number | null; feeKobo: number }[];
}
const decimal = (value: string | number) => {
  const n = BigInt(value);
  return `${n / 100n}.${String(n % 100n).padStart(2, "0")}`;
};
const parse = (value: string) =>
  /^0+(\.0{1,2})?$/.test(value) ? 0 : Number(toKobo(value));
export function PaymentSettingsEditor({
  settings,
  enabled,
}: {
  settings: PaymentSettings;
  enabled: boolean;
}) {
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
      Object.fromEntries(fields.map(([key]) => [key, decimal(settings[key])])),
    ),
    [cooldown, setCooldown] = useState(
      String(settings.new_payout_account_cooldown_hours),
    ),
    [match, setMatch] = useState(settings.payout_name_match),
    [tiers, setTiers] = useState(
      settings.transfer_fee_tiers.map((t) => ({
        max: t.maxKobo === null ? null : decimal(t.maxKobo),
        fee: decimal(t.feeKobo),
      })),
    );
  let payload: Record<string, unknown> = { expectedVersion: settings.version },
    error = "";
  const differences: [string, string, string][] = [];
  try {
    for (const [key, request, label] of fields) {
      const next = parse(amounts[key]);
      payload[request] = next;
      if (String(next) !== String(settings[key]))
        differences.push([label, money(settings[key]), money(String(next))]);
    }
    const hours = Number(cooldown);
    if (
      !/^\d+$/.test(cooldown) ||
      !Number.isSafeInteger(hours) ||
      hours > 2147483647
    )
      throw new Error("Enter a valid whole number of cooldown hours.");
    payload.newPayoutAccountCooldownHours = hours;
    payload.payoutNameMatch = match;
    const transferFeeTiers = tiers.map((t) => ({
      maxKobo: t.max === null ? null : parse(t.max),
      feeKobo: parse(t.fee),
    }));
    payload.transferFeeTiers = transferFeeTiers;
    if (
      Number(payload.minTopupKobo) > Number(payload.maxTopupKobo) ||
      Number(payload.minWithdrawalKobo) > Number(payload.maxDailyWithdrawalKobo)
    )
      throw new Error("Minimum amounts cannot exceed their maximums.");
    let previous = 0;
    for (const tier of tiers.slice(0, -1)) {
      const upper = parse(tier.max ?? "");
      if (upper <= previous)
        throw new Error(
          "Transfer fee upper amounts must increase from one tier to the next.",
        );
      previous = upper;
    }
    if (hours !== settings.new_payout_account_cooldown_hours)
      differences.push([
        "Cooldown",
        `${settings.new_payout_account_cooldown_hours} hours`,
        `${hours} hours`,
      ]);
    if (match !== settings.payout_name_match)
      differences.push(["Name matching", settings.payout_name_match, match]);
    if (
      JSON.stringify(transferFeeTiers.map((tier) => [tier.maxKobo, tier.feeKobo])) !==
      JSON.stringify(
        settings.transfer_fee_tiers.map((tier) => [tier.maxKobo, tier.feeKobo]),
      )
    )
      differences.push([
        "Transfer fee tiers",
        JSON.stringify(settings.transfer_fee_tiers),
        JSON.stringify(payload.transferFeeTiers),
      ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Review the configuration.";
  }
  return (
    <div className="care-form">
      {!enabled && (
        <p className="muted">
          Editing is disabled until the owner approves commercial limits and the
          privileged rollout policy.
        </p>
      )}
      {fields.map(([key, , label]) => (
        <FormField key={key}>
          {label} · NGN
          <input
            inputMode="decimal"
            value={amounts[key]}
            disabled={!enabled}
            onChange={(e) => setAmounts({ ...amounts, [key]: e.target.value })}
          />
        </FormField>
      ))}
      <FormField>
        New payout account cooldown · hours
        <input
          inputMode="numeric"
          disabled={!enabled}
          value={cooldown}
          onChange={(e) => setCooldown(e.target.value)}
        />
      </FormField>
      <FormField>
        Payout name matching
        <Dropdown
          aria-label="Payout name matching"
          disabled={!enabled}
          value={match}
          onValueChange={(value) => setMatch(value)}
        >
          {["strict", "lenient", "off"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Dropdown>
      </FormField>
      <h3>Transfer fees · NGN</h3>
      <p className="muted">
        Bounded tiers run in increasing order. The final tier covers all higher
        amounts.
      </p>
      {tiers.map((t, i) => (
        <fieldset key={i}>
          <legend>Tier {i + 1}</legend>
          <FormField>
            Upper amount (inclusive)
            {t.max === null ? (
              <span>No upper bound</span>
            ) : (
              <input
                inputMode="decimal"
                disabled={!enabled}
                value={t.max}
                onChange={(e) =>
                  setTiers(
                    tiers.map((v, j) =>
                      j === i ? { ...v, max: e.target.value } : v,
                    ),
                  )
                }
              />
            )}
          </FormField>
          <FormField>
            Fee
            <input
              inputMode="decimal"
              disabled={!enabled}
              value={t.fee}
              onChange={(e) =>
                setTiers(
                  tiers.map((v, j) =>
                    j === i ? { ...v, fee: e.target.value } : v,
                  ),
                )
              }
            />
          </FormField>
          {t.max !== null && (
            <Button
              variant="secondary"
              disabled={!enabled}
              onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
            >
              Remove tier {i + 1}
            </Button>
          )}
        </fieldset>
      ))}
      <Button
        variant="secondary"
        disabled={!enabled || tiers.length >= 50}
        onClick={() =>
          setTiers([
            ...tiers.slice(0, -1),
            { max: "", fee: "0.00" },
            tiers[tiers.length - 1],
          ])
        }
      >
        Add fee tier
      </Button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <ConfirmAction
        title="Review settings changes"
        label="Apply configuration"
        description="Super_admin only. Configuration changes require a reason and the current settings version; another staff edit causes a conflict."
        path="payments/settings"
        method="PATCH"
        payload={payload}
        disabled={!enabled || Boolean(error) || !differences.length}
      >
        <dl className="definition-list">
          {differences.map(([label, before, after]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                {before} → {after}
              </dd>
            </div>
          ))}
        </dl>
      </ConfirmAction>
    </div>
  );
}
