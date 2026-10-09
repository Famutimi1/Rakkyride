"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dropdown, type DropdownOption } from "./ui/dropdown";
import { SearchField } from "./ui/search-field";
import { Button } from "./ui/button";
import { FilterForm, FormField } from "./ui/filter-toolbar";

export function DirectoryFilters({
  statuses,
  defaultStatus = "",
  searchLabel = "Exact record ID",
  preview = false,
  searchName = "id",
  statusName = "status",
  statusLabel = "State",
  allLabel = "All states",
}: {
  statuses?: readonly DropdownOption[];
  defaultStatus?: string;
  searchLabel?: string;
  preview?: boolean;
  searchName?: string;
  statusName?: string;
  statusLabel?: string;
  allLabel?: string;
}) {
  const params = useSearchParams(),
    path = usePathname(),
    router = useRouter();
  return (
    <FilterForm
      key={params.toString()}
      aria-label="Directory filters"
      onSubmit={(event) => {
        event.preventDefault();
        const next = new URLSearchParams(params.toString());
        next.delete("cursor");
        next.delete("before");
        for (const [name, value] of new FormData(event.currentTarget)) {
          const text = String(value).trim();
          if (text || name === statusName) next.set(name, text);
          else next.delete(name);
        }
        router.replace(`${path}?${next}`, { scroll: false });
      }}
    >
      <FormField label={searchLabel}>
        <SearchField
          label={searchLabel}
          name={searchName}
          placeholder={preview ? "Sample record ID…" : "Record UUID…"}
          defaultValue={params.get(searchName) ?? ""}
          pattern={preview ? undefined : "[0-9a-fA-F-]{36}"}
        />
      </FormField>
      {statuses && (
        <FormField label={statusLabel}>
          <Dropdown
            aria-label={`Directory ${statusLabel.toLowerCase()}`}
            name={statusName}
            defaultValue={params.get(statusName) ?? defaultStatus}
            options={[{ value: "", label: allLabel }, ...statuses]}
          />
        </FormField>
      )}
      <Button type="submit">Apply filters</Button>
      <Button onClick={() => router.replace(path)}>Clear filters</Button>
    </FilterForm>
  );
}
