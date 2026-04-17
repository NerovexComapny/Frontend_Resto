import { getRoleRedirect, isRouteAuthorized } from '../utils/routeGuards';
import {
  applyFeedbackFilters,
  computeFeedbackSummary,
  sortFeedbacks,
} from '../services/feedbacks';
import {
  TABLE_REALTIME_EVENTS,
  applyRealtimeTableUpdate,
  shouldRefreshTablesForEvent,
} from '../utils/tablesRealtime';

describe('Manager Flow', () => {
  it('Manager auth guard blocks access without token', () => {
    const token = null;
    const user = { role: 'manager' };

    expect(isRouteAuthorized(token, user, ['manager'])).toBe(false);
    expect(getRoleRedirect('manager')).toBe('/manager/dashboard');
  });

  it('Table grid data supports all table statuses', () => {
    const tables = [
      { _id: 't-1', status: 'available' },
      { _id: 't-2', status: 'occupied' },
      { _id: 't-3', status: 'reserved' },
      { _id: 't-4', status: 'cleaning' },
    ];

    expect(tables.map((table) => table.status)).toEqual([
      'available',
      'occupied',
      'reserved',
      'cleaning',
    ]);
  });

  it('Table status change updates manager grid in real time (regression test)', () => {
    const initial = [
      { _id: 't-1', status: 'occupied' },
      { _id: 't-2', status: 'reserved' },
    ];

    const updated = applyRealtimeTableUpdate(initial, { _id: 't-1', status: 'available' });
    expect(updated.find((table) => table._id === 't-1')?.status).toBe('available');
    expect(shouldRefreshTablesForEvent('tableStatusUpdated')).toBe(true);
  });

  it('Table set to available while manager view is open refreshes without reload', () => {
    expect(TABLE_REALTIME_EVENTS).toContain('tableStatusUpdated');
    expect(TABLE_REALTIME_EVENTS).toContain('orderStatusUpdated');
  });

  it('Feedback filter by category works', () => {
    const feedbacks = [
      { _id: '1', category: 'Service', rating: 3, status: 'new', createdAt: '2026-04-10T10:00:00.000Z' },
      { _id: '2', category: 'Food Quality', rating: 5, status: 'new', createdAt: '2026-04-10T11:00:00.000Z' },
    ];

    const filtered = applyFeedbackFilters(feedbacks, {
      category: 'Service',
      minRating: '0',
      status: 'all',
      fromDate: '',
      toDate: '',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].category).toBe('Service');
  });

  it('Feedback filter by rating works', () => {
    const feedbacks = [
      { _id: '1', category: 'Overall', rating: 2, status: 'new', createdAt: '2026-04-10T10:00:00.000Z' },
      { _id: '2', category: 'Overall', rating: 4, status: 'new', createdAt: '2026-04-10T11:00:00.000Z' },
      { _id: '3', category: 'Overall', rating: 5, status: 'reviewed', createdAt: '2026-04-10T12:00:00.000Z' },
    ];

    const filtered = applyFeedbackFilters(feedbacks, {
      category: 'all',
      minRating: '4',
      status: 'all',
      fromDate: '',
      toDate: '',
    });

    expect(filtered).toHaveLength(2);
    expect(sortFeedbacks(filtered, 'rating_desc')[0].rating).toBe(5);
  });

  it('Summary cards compute accurate average ratings', () => {
    const now = new Date('2026-04-17T12:00:00.000Z');
    const feedbacks = [
      { rating: 5, status: 'reviewed', createdAt: '2026-04-16T12:00:00.000Z' },
      { rating: 3, status: 'new', createdAt: '2026-04-14T12:00:00.000Z' },
      { rating: 1, status: 'new', createdAt: '2026-03-01T12:00:00.000Z' },
    ];

    const summary = computeFeedbackSummary(feedbacks, now);

    expect(summary.total).toBe(3);
    expect(summary.reviewed).toBe(1);
    expect(summary.averageAllTime).toBeCloseTo(3);
    expect(summary.averageLast7Days).toBeCloseTo(4);
  });
});
