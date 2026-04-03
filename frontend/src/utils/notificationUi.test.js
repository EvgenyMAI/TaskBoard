import { describe, it, expect } from 'vitest';
import {
  taskTitleFromBody,
  statusCodeFromBody,
  badgeClassForStatus,
} from './notificationUi';

describe('notificationUi', () => {
  it('taskTitleFromBody extracts quoted title', () => {
    expect(taskTitleFromBody('Задача: "Fix bug"')).toBe('Fix bug');
    expect(taskTitleFromBody('')).toBe('');
  });

  it('statusCodeFromBody parses Russian label', () => {
    expect(statusCodeFromBody('статус: IN_PROGRESS')).toBe('IN_PROGRESS');
    expect(statusCodeFromBody('статус: done')).toBe('DONE');
  });

  it('badgeClassForStatus maps known codes', () => {
    expect(badgeClassForStatus('OPEN')).toBe('badge-open');
    expect(badgeClassForStatus('DONE')).toBe('badge-done');
    expect(badgeClassForStatus('UNKNOWN')).toBe('');
  });
});
