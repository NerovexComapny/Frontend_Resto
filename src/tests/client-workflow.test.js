import {
  calculateCartMetrics,
  resolveClientTableId,
  shouldRenderFeedbackSection,
  toClientOrderStatus,
} from '../utils/clientWorkflow';
import { toApiStatus, toKitchenStatus } from '../utils/kitchenStatus';

describe('Client Flow', () => {
  it('Table QR scan / session init attaches correct tableId', () => {
    const searchParams = new URLSearchParams('tableId=tbl_44');
    expect(resolveClientTableId(searchParams)).toBe('tbl_44');
  });

  it('Menu browsing cart math returns correct total and count', () => {
    const cart = [
      { item: { price: 12.5 }, quantity: 2 },
      { item: { price: 7.25 }, quantity: 1 },
    ];

    const metrics = calculateCartMetrics(cart);
    expect(metrics.total).toBeCloseTo(32.25);
    expect(metrics.count).toBe(3);
  });

  it('Place order enters kitchen queue as new ticket', () => {
    expect(toKitchenStatus('pending')).toBe('new');
    expect(toKitchenStatus('confirmed')).toBe('new');
  });

  it('Order status updates propagate to client timeline', () => {
    expect(toClientOrderStatus('pending')).toBe('received');
    expect(toClientOrderStatus('preparing')).toBe('preparing');
    expect(toClientOrderStatus('ready')).toBe('ready');
    expect(toClientOrderStatus('served')).toBe('served');
  });

  it('Feedback form visibility is enabled only after served state', () => {
    expect(shouldRenderFeedbackSection(true, 'served')).toBe(true);
    expect(shouldRenderFeedbackSection(true, 'ready')).toBe(false);
    expect(shouldRenderFeedbackSection(false, 'served')).toBe(false);
  });
});

describe('Kitchen Flow', () => {
  it('Kitchen marking preparing translates to API status preparing', () => {
    expect(toApiStatus('in_progress')).toBe('preparing');
  });

  it('Kitchen marking ready keeps ready status for client/manager propagation', () => {
    expect(toApiStatus('ready')).toBe('ready');
    expect(toClientOrderStatus('ready')).toBe('ready');
  });
});
