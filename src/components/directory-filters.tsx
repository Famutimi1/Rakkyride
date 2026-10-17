"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dropdown, type DropdownOption } from "./ui/dropdown";
import { SearchField } from "./ui/search-field";
import { SearchFilterBar } from "./ui/search-filter-bar";
import { FormField } from "./ui/filter-toolbar";

export function DirectoryFilters({
  statuses,
  defaultStatus = "",
  searchLabel = "Exact record ID",
  preview = false,
  searchName = "id",
  statusName = "status",
  statusLabel = "State",
  allLabel = "All states",
  children,
}: {
  statuses?: readonly DropdownOption[];
  defaultStatus?: string;
  searchLabel?: string;
  preview?: boolean;
  searchName?: string;
  statusName?: string;
  statusLabel?: string;
  allLabel?: string;
  children?: import("react").ReactNode;
}) {
  const params = useSearchParams(),
    path = usePathname(),
    router = useRouter();
  const account = !statuses && searchName === "id";
  const choices = statuses ?? [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];
  const stateName = account ? "mode" : statusName;
  const clear = () => {
    const next = new URLSearchParams();
    if (params.get("limit")) next.set("limit", params.get("limit")!);
    next.set("page", "1");
    if (defaultStatus) next.set(stateName, "");
    router.replace(`${path}?${next}`, { scroll: false });
  };
  return (
    <SearchFilterBar
      preview={preview}
      recordSearchScope={searchName === "objectId" ? undefined : path.includes("support") ? "support" : path.includes("safety") ? "safety" : "people"}
      resetKey={params.toString()}
      onClear={clear}
      search={
        <SearchField
          label={searchLabel}
          name={searchName}
          placeholder={
            preview
              ? "Search by sample record ID…"
              : `Search by ${searchLabel.toLowerCase()}…`
          }
          defaultValue={params.get(searchName) ?? ""}
          pattern={preview ? undefined : "[0-9a-fA-F-]{36}"}
        />
      }
      aria-label="Directory filters"
      onSubmit={(event) => {
        event.preventDefault();
        const next = new URLSearchParams(params.toString());
        next.delete("cursor");
        next.delete("before");
        next.set("page", "1");
        for (const [name, value] of new FormData(event.currentTarget)) {
          let text = String(value).trim();
          if(text && ["from","to"].includes(name)) text=`${text}T00:00:00+01:00`;
          if (text || name === stateName) next.set(name, text);
          else next.delete(name);
        }
        router.replace(`${path}?${next}`, { scroll: false });
      }}
    >
      {children}
      {choices && (
        <FormField label={account ? "Account status" : statusLabel}>
          <Dropdown
            aria-label={`Directory ${account ? "account status" : statusLabel.toLowerCase()}`}
            name={stateName}
            defaultValue={params.get(stateName) ?? defaultStatus}
            options={[
              { value: "", label: account ? "All accounts" : allLabel },
              ...choices,
            ]}
          />
        </FormField>
      )}
    </SearchFilterBar>
  );
}
