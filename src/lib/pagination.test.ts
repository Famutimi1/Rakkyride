import test from "node:test";
import assert from "node:assert/strict";
import { pageSlice, paginationInput } from "./pagination.ts";

test("pages cover each matching record once and clamp after results shrink", () => {
  const records = Array.from({ length: 108 }, (_, id) => ({ id }));
  const pages = Array.from({ length: 6 }, (_, i) =>
    pageSlice(records, String(i + 1), "20"),
  );
  assert.deepEqual(
    pages.flatMap((page) => page.items),
    records,
  );
  assert.deepEqual(pages[0].pagination, {
    page: 1,
    pageSize: 20,
    total: 108,
    totalPages: 6,
    from: 1,
    to: 20,
    hasPrevious: false,
    hasNext: true,
  });
  assert.equal(pages[5].items.length, 8);
  assert.equal(pages[5].pagination.from, 101);
  assert.equal(pages[5].pagination.to, 108);
  assert.equal(pages[5].pagination.hasNext, false);
  const filtered = pageSlice(records.slice(0, 3), "6", "20");
  assert.equal(filtered.pagination.page, 1);
  assert.equal(filtered.pagination.total, 3);
  const empty = pageSlice([], "6", "20");
  assert.equal(empty.pagination.from, 0);
  assert.equal(empty.pagination.to, 0);
  assert.equal(empty.pagination.totalPages, 1);
  assert.equal(empty.pagination.hasPrevious, false);
  assert.equal(empty.pagination.hasNext, false);
});
test("URL pagination rejects invalid pages and oversized requests", () => {
  assert.deepEqual(paginationInput(), { page: 1, pageSize: 20 });
  assert.deepEqual(paginationInput("2", "10"), { page: 2, pageSize: 10 });
  for (const page of ["", "0", "-1", "1.5", "1000000", "abc"])
    assert.throws(() => paginationInput(page));
  for (const size of ["", "0", "-1", "101", "1.5", "abc"])
    assert.throws(() => paginationInput("1", size));
});
