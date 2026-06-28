export type Page<T> = { items: T[]; page: number; pageCount: number };

/** Paginação genérica 1-based; clampa a página em [1, pageCount]. */
export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const clamped = Math.min(Math.max(1, page), pageCount);
  const start = (clamped - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: clamped, pageCount };
}
