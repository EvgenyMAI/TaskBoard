import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClientPagination } from './useClientPagination';

describe('useClientPagination', () => {
  const memberRows = [
    { uid: 1, user: { username: 'alpha', email: 'a@x.test' } },
    { uid: 2, user: { username: 'beta', email: 'b@x.test' } },
  ];

  it('uses default matcher for project member rows', () => {
    const { result } = renderHook(() =>
      useClientPagination(memberRows, { pageSize: 10, search: 'alp' }),
    );
    expect(result.current.filteredRows).toHaveLength(1);
    expect(result.current.filteredRows[0].uid).toBe(1);
  });

  it('uses custom matchesSearch', () => {
    const users = [
      { id: 1, username: 'u1', email: 'e1@test' },
      { id: 2, username: 'other', email: 'e2@test' },
    ];
    const { result } = renderHook(() =>
      useClientPagination(users, {
        pageSize: 1,
        search: 'other',
        matchesSearch: (u, q) => (u.username || '').toLowerCase().includes(q),
      }),
    );
    expect(result.current.filteredRows).toHaveLength(1);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.pageSlice).toHaveLength(1);
  });

  it('resets page when search changes', () => {
    const { result, rerender } = renderHook(
      ({ search }) => useClientPagination(memberRows, { pageSize: 1, search }),
      { initialProps: { search: '' } },
    );
    act(() => {
      result.current.setPage(2);
    });
    expect(result.current.page).toBe(2);
    act(() => {
      rerender({ search: 'beta' });
    });
    expect(result.current.page).toBe(1);
  });
});
