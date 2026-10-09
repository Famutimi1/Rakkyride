import type { PaginationInfo } from "../contracts/admin.ts";
export function paginationInfo(
  total: number,
  page = 1,
  pageSize = 20,
): PaginationInfo {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.max(1, Math.min(page, totalPages));
  return {
    page: current,
    pageSize,
    total,
    totalPages,
    from: total ? (current - 1) * pageSize + 1 : 0,
    to: Math.min(current * pageSize, total),
    hasPrevious: current > 1,
    hasNext: current < totalPages,
  };
}
export function paginationInput(page?: string | null, limit?: string | null) {
  if (page != null && !/^[1-9]\d{0,5}$/.test(page))
    throw new RangeError("Invalid page");
  if (
    limit != null &&
    (!/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 100)
  )
    throw new RangeError("Invalid page size");
  return {
    page: page ? Number(page) : 1,
    pageSize: limit ? Number(limit) : 20,
  };
}
export function pageSlice<T>(
  items: T[],
  page?: string | null,
  limit?: string | null,
) {
  const requested = paginationInput(page, limit);
  const pagination = paginationInfo(
    items.length,
    requested.page,
    requested.pageSize,
  );
  return {
    items: items.slice(
      (pagination.page - 1) * pagination.pageSize,
      pagination.to,
    ),
    pagination,
  };
}
