export const resolveClientTableId = (searchParams) => {
  return String(searchParams.get('tableId') || searchParams.get('table') || '').trim();
};

export const toClientOrderStatus = (status) => {
  if (status === 'pending' || status === 'confirmed' || status === 'new') return 'received';
  if (status === 'preparing' || status === 'in_progress') return 'preparing';
  if (status === 'ready') return 'ready';
  if (status === 'served') return 'served';
  return 'received';
};

export const calculateCartMetrics = (cart) => {
  const total = cart.reduce((sum, current) => sum + (current.item.price * current.quantity), 0);
  const count = cart.reduce((sum, current) => sum + current.quantity, 0);
  return { total, count };
};

export const shouldRenderFeedbackSection = (orderPlaced, trackedOrderStatus) => {
  return Boolean(orderPlaced) && trackedOrderStatus === 'served';
};
