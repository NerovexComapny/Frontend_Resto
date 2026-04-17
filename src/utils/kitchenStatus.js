export const toKitchenStatus = (status) => {
  if (status === 'pending' || status === 'confirmed' || status === 'new') return 'new';
  if (status === 'preparing' || status === 'in_progress') return 'in_progress';
  if (status === 'ready') return 'ready';
  if (status === 'served') return 'served';
  return 'new';
};

export const toApiStatus = (status) => {
  if (status === 'in_progress') return 'preparing';
  return status;
};
