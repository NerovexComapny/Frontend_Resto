const { publicApiMock } = vi.hoisted(() => ({
  publicApiMock: {
    defaults: { baseURL: 'https://example.com/api' },
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../services/api', () => ({
  publicApi: publicApiMock,
  default: {},
}));

import {
  getFeedbacks,
  getStoredFeedbacks,
  getUnreadFeedbackCount,
  isFeedbackAlreadySubmitted,
  submitFeedback,
  toggleFeedbackReviewed,
} from '../services/feedbacks';

describe('Feedback Service', () => {
  beforeEach(() => {
    publicApiMock.post.mockReset();
    publicApiMock.get.mockReset();
    publicApiMock.put.mockReset();
  });

  it('Offline feedback queuing syncs on reconnect', async () => {
    publicApiMock.post.mockRejectedValue({ code: 'ERR_NETWORK' });

    const queuedResult = await submitFeedback({
      tableId: 'table-10',
      orderId: 'order-queue-1',
      rating: 4,
      category: 'Service',
      comment: 'Great support',
      createdAt: '2026-04-17T10:00:00.000Z',
    });

    expect(queuedResult.queued).toBe(true);
    expect(isFeedbackAlreadySubmitted('order-queue-1')).toBe(true);

    let stored = getStoredFeedbacks();
    expect(stored).toHaveLength(1);
    expect(stored[0].isSynced).toBe(false);

    publicApiMock.get.mockResolvedValue({
      data: {
        feedbacks: [
          {
            _id: 'fb-synced-1',
            table: { _id: 'table-10', number: 10 },
            orderId: 'order-queue-1',
            rating: 4,
            category: 'Service',
            comment: 'Great support',
            status: 'new',
            createdAt: '2026-04-17T10:00:00.000Z',
          },
        ],
      },
    });

    const synced = await getFeedbacks();
    expect(synced).toHaveLength(1);
    expect(synced[0]._id).toBe('fb-synced-1');
    expect(synced[0].isSynced).toBe(true);

    stored = getStoredFeedbacks();
    expect(stored).toHaveLength(1);
    expect(stored[0]._id).toBe('fb-synced-1');
  });

  it('Mark as reviewed toggles status and persists after reload', async () => {
    publicApiMock.post.mockRejectedValue({ code: 'ERR_NETWORK' });

    await submitFeedback({
      tableId: 'table-2',
      orderId: 'order-local-2',
      rating: 5,
      category: 'Overall',
      comment: '',
      createdAt: '2026-04-17T11:00:00.000Z',
    });

    const localFeedback = getStoredFeedbacks()[0];
    expect(localFeedback.status).toBe('new');

    publicApiMock.put.mockRejectedValue({ code: 'ERR_NETWORK' });

    const updated = await toggleFeedbackReviewed(localFeedback._id, true);
    expect(updated.status).toBe('reviewed');

    const afterUpdate = getStoredFeedbacks();
    expect(afterUpdate[0].status).toBe('reviewed');

    const afterReloadRead = getStoredFeedbacks();
    expect(afterReloadRead[0].status).toBe('reviewed');
  });

  it('Unread feedback count fallback works from local storage cache', async () => {
    publicApiMock.post
      .mockRejectedValueOnce({ code: 'ERR_NETWORK' })
      .mockRejectedValueOnce({ code: 'ERR_NETWORK' });

    await submitFeedback({
      tableId: 'table-3',
      orderId: 'order-a',
      rating: 3,
      category: 'Food Quality',
      comment: '',
      createdAt: '2026-04-17T12:00:00.000Z',
    });

    await submitFeedback({
      tableId: 'table-4',
      orderId: 'order-b',
      rating: 2,
      category: 'Ambiance',
      comment: '',
      createdAt: '2026-04-17T12:30:00.000Z',
    });

    const stored = getStoredFeedbacks();
    await toggleFeedbackReviewed(stored[0]._id, true);

    publicApiMock.get.mockRejectedValue({ code: 'ERR_NETWORK' });

    const unreadCount = await getUnreadFeedbackCount();
    expect(unreadCount).toBe(1);
  });
});
