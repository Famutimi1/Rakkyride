# Shared dashboard components

Common controls live in `src/components/ui`. Use these components when adding pages instead of copying table markup, native select styling, or filter layouts. All colors come from the canonical generated semantic tokens.

- `Dropdown`: controlled `value/onValueChange` or uncontrolled `defaultValue`; typed `options` or existing option children; required accessible label. Named hidden inputs preserve FormData and GET form submission. Disabled fieldsets disable the trigger and its submitted value. Arrow keys, Home/End, typeahead, Enter/Space, Tab and Escape are supported. Popups stay within the viewport and inside an open dialog's top layer.
- `SearchField`: one search input with icon, accessible label, optional clear button and optional Enter callback. Standard native input props are forwarded. Avoid sensitive search terms in shareable URLs.
- `SearchFilterBar`: wide search with a More filters / Hide filters toggle, an accessible expandable options region, Apply filters and Clear filters. Filters start collapsed; applying/clearing preserves expansion while resetting page 1 and form values. Enter submits the search even when the options are collapsed.
- `FilterToolbar`, `FilterForm`, `FormField`: shared grouped controls, wrapping form layout, labels and optional hints. Explicit labels describe each field's purpose; forms stack on small screens.
- `DataTable`: typed columns and keyed rows, optional grouped rows, alignment and shared density. At every screen size it remains a semantic table with visible column headings. On phones, its focusable region scrolls horizontally using touch or arrow keys; the page itself stays within the viewport. All pages use this behavior without a separate mobile variant.
- `Pagination`: matching-record range and total, Rows dropdown (10/20/50/100), Previous, Page X of Y and Next. Disabled boundary/pending controls, empty range 0–0 and mobile wrapping are shared. Directory adapters preserve filters and reset page 1 when row size changes. Legacy cursors still use first/next links; do not infer a grand total from a cursor slice.
- `Button`, `LinkButton`: shared variants for actions and navigation. Native buttons default to `type="button"`; use `type="submit"` explicitly for forms. File exports retain native anchors so download behavior is preserved.
- `Dialog`: named native dialog and common close control. Native showModal supplies focus containment and focus return. Sensitive actions may disable dismissal while pending or uncertain; their operation state stays in `ConfirmAction`.

`DirectoryTable` keys cells before server serialization; `DirectoryTableClient` owns navigation and composes `DataTable` with `Pagination`. Pass the API `pagination` object for server paging. Complete static arrays page locally without rewriting another table’s URL. Provide actual record IDs through `rowKeys` when available. `DirectoryFilters` handles exact IDs and optional state/role/action choices, preserves URL navigation, resets pagination, and resets form values when the URL changes. It allows named ID/state fields for audit and team pages without creating another filter component. `RecordSearch` composes the shared controls for staff-wide searches and cursor buttons; its text stays in memory and is cleared when the dialog closes.

Existing shared `Panel`, `PageHeader`, `Notice`, `QueryState`, `StatusBadge`, `MoneyValue`, `Timestamp`, `DefinitionList`, `CopyButton` and `ConfirmAction` remain the standard presentation primitives. Preserve exact kobo strings, WAT timestamps and status meanings when reusing them.

`AdminShell` owns the shared navigation. Its top-bar sidebar button switches between a labeled 240px menu and a 72px icon rail on desktop/tablet (768px and above). Accessible link names and native title tooltips remain available in the rail. The choice is saved by the UI store under `rakky-sidebar-collapsed`; before a choice, widths below 1280px default to the rail. Phones retain the full labeled drawer, background scroll lock, focus containment and Escape dismissal. Keep page navigation inside this shell so the same preference applies everywhere.

```tsx
<FilterForm onSubmit={submitFilters}>
  <FormField label="Reference">
    <SearchField label="Exact reference" name="reference" />
  </FormField>
  <FormField label="State">
    <Dropdown aria-label="Payment state" name="status"
      options={[{ value: "", label: "All states" },
                { value: "pending", label: "Pending" }]} />
  </FormField>
  <Button type="submit">Apply filters</Button>
</FilterForm>
<DataTable label="Payments"
  columns={[{id:"reference",label:"Reference"},{id:"amount",label:"Amount · NGN",align:"end"}]}
  rows={payments.map(payment => ({id:payment.id,cells:[payment.reference,<MoneyValue key="amount" value={payment.amountKobo}/>]}))} />
```

Accessibility reference: [WAI-ARIA select-only combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/). Keyboard, focus, form submission, mobile bounds and both token themes were exercised in browser preview; see `mobile-review.md`.
