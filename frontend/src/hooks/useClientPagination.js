import { useEffect, useMemo, useState } from 'react';

function defaultMemberRowMatch(row, q) {
  const u = row.user;
  const uid = row.uid;
  const un = (u?.username || '').toLowerCase();
  const em = (u?.email || '').toLowerCase();
  const idStr = String(uid);
  return un.includes(q) || em.includes(q) || idStr.includes(q);
}

/**
 * Фильтрация по строке поиска и пагинация для списка в памяти.
 * @param {function} [options.matchesSearch] — (item, queryLower) => boolean; иначе матчинг для строк участников проекта { uid, user }.
 */
export function useClientPagination(rows, { pageSize, search, matchesSearch }) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    const match = matchesSearch || defaultMemberRowMatch;
    return rows.filter((row) => match(row, q));
  }, [rows, search, matchesSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [search]);
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pageSafe = Math.min(page, totalPages);
  const pageSlice = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe, pageSize]);

  return {
    filteredRows: filtered,
    totalPages,
    page: pageSafe,
    setPage,
    pageSlice,
  };
}
