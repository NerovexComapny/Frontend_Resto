export const TABLE_REALTIME_EVENTS = [
  'tableStatusUpdated',
  'table_updated',
  'table_created',
  'table_deleted',
  'newOrder',
  'new_order',
  'orderStatusUpdated',
  'order_updated',
  'orderCancelled',
  'connect',
  'reconnect',
];

export const shouldRefreshTablesForEvent = (eventName) => {
  return TABLE_REALTIME_EVENTS.includes(String(eventName || ''));
};

export const applyRealtimeTableUpdate = (tables, incomingTable) => {
  if (!incomingTable?._id) {
    return tables;
  }

  const existingIndex = tables.findIndex((table) => table._id === incomingTable._id);
  if (existingIndex < 0) {
    return [incomingTable, ...tables];
  }

  const next = [...tables];
  next[existingIndex] = incomingTable;
  return next;
};
