import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../services/socket';
import Bell from 'lucide-react/dist/esm/icons/bell';
import ChefHat from 'lucide-react/dist/esm/icons/chef-hat';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Clock from 'lucide-react/dist/esm/icons/clock';
import X from 'lucide-react/dist/esm/icons/x';
import Filter from 'lucide-react/dist/esm/icons/filter';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import UserCircle from 'lucide-react/dist/esm/icons/user-circle';
import BellRing from 'lucide-react/dist/esm/icons/bell-ring';
import LogOut from 'lucide-react/dist/esm/icons/log-out';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import LanguageSwitcher from '../../components/shared/LanguageSwitcher';

const ACTIVE_API_STATUSES = new Set(['pending', 'confirmed', 'preparing', 'ready']);
const Motion = motion;

const getOrdersEndpoint = () => {
  const baseURL = String(api.defaults.baseURL || '');
  return /\/api\/?$/.test(baseURL) ? '/orders' : '/api/orders';
};

const getTablesEndpoint = () => {
  const baseURL = String(api.defaults.baseURL || '');
  return /\/api\/?$/.test(baseURL) ? '/tables' : '/api/tables';
};

const toId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
};

const getOrderWaiterId = (order) => {
  return toId(order?.waiterId || order?.waiter);
};

const getOrderTableId = (order) => {
  return toId(order?.tableId || order?.table);
};

const formatTimeAgo = (value, t) => {
  if (!value) return t('waiter.justNow');

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('waiter.justNow');

  const diffInMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffInMinutes < 1) return t('waiter.justNow');
  if (diffInMinutes < 60) return t('waiter.minAgo', { count: diffInMinutes });

  const diffInHours = Math.floor(diffInMinutes / 60);
  return t('waiter.hourAgo', { count: diffInHours });
};

const toUiOrderStatus = (apiStatus) => {
  switch (apiStatus) {
    case 'pending':
    case 'confirmed':
      return 'new';
    case 'preparing':
      return 'in_progress';
    case 'ready':
      return 'ready';
    case 'served':
      return 'served';
    default:
      return 'new';
  }
};

const toApiOrderStatus = (uiStatus) => {
  if (uiStatus === 'in_progress') return 'preparing';
  return uiStatus;
};

const getOrderDisplayNumber = (orderNumber, fallbackId, t) => {
  const normalized = String(orderNumber || '').trim();
  if (normalized) return normalized;

  const fallback = String(fallbackId || '').trim();
  if (!fallback) return t ? t('waiter.orderPlaceholder') : 'Order #-';

  return t
    ? t('waiter.orderShort', { suffix: fallback.slice(-4) })
    : `Order #${fallback.slice(-4)}`;
};

const normalizeOrder = (order, t) => {
  const tableNumber = order?.table && typeof order.table === 'object'
    ? order.table.number
    : order?.table;

  const normalizedOrderNumber = String(order?.orderNumber || '').trim();
  const normalizedId = toId(order?._id)
    || normalizedOrderNumber
    || `${toId(order?.table)}-${order?.createdAt || ''}`;

  return {
    id: normalizedId,
    orderNumber: normalizedOrderNumber,
    table: tableNumber ?? '-',
    tableId: toId(order?.table),
    waiterId: toId(order?.waiter),
    status: toUiOrderStatus(order?.status),
    rawStatus: order?.status,
    items: Array.isArray(order?.items)
      ? order.items.map((item) => ({
          name:
            item?.name
            || item?.menuItem?.name?.fr
            || item?.menuItem?.name?.en
            || item?.menuItem?.name?.ar
            || 'Item',
          qty: Number(item?.quantity || 1),
        }))
      : [],
    totalAmount: Number(order?.totalAmount || 0),
    time: formatTimeAgo(order?.createdAt, t),
    createdAt: order?.createdAt,
  };
};

const buildWaiterTables = (
  apiTables,
  waiterTableIds,
  orders,
  previousNeedsHelpById = {},
  waiterId = ''
) => {
  const filteredTables = Array.isArray(apiTables)
    ? apiTables.filter((table) => waiterTableIds.has(toId(table?._id)))
    : [];

  return filteredTables
    .map((table) => {
      const tableId = toId(table?._id);
      const tableNumber = table?.number ?? '-';

      const tableOrders = orders
        .filter((order) => order.tableId === tableId || String(order.table) === String(tableNumber))
        .filter((order) => order.status !== 'served')
        .filter((order) => waiterId && getOrderWaiterId(order) === waiterId);

      const activeOrder = tableOrders[0];
      const needsHelp = Boolean(previousNeedsHelpById[tableId]);
      let tableStatus = 'available';

      if (needsHelp) {
        tableStatus = 'needs_attention';
      } else if (activeOrder?.status === 'ready') {
        tableStatus = 'waiting_food';
      } else if (activeOrder) {
        tableStatus = 'occupied';
      }

      return {
        id: tableId,
        number: tableNumber,
        status: tableStatus,
        activeOrder: activeOrder
          ? getOrderDisplayNumber(activeOrder.orderNumber, activeOrder.id)
          : '-',
        items: activeOrder
          ? activeOrder.items.reduce((sum, item) => sum + Number(item.qty || 0), 0)
          : 0,
        total: Number(activeOrder?.totalAmount || 0),
        needsHelp,
      };
    })
    .sort((a, b) => Number(a.number) - Number(b.number));
};

const WaiterOrdersPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('my-tables');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderFilter, setOrderFilter] = useState('all');

  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const ordersEndpoint = useMemo(() => getOrdersEndpoint(), []);
  const tablesEndpoint = useMemo(() => getTablesEndpoint(), []);
  const cachedTablesRef = useRef([]);
  const waiterTableIdsRef = useRef(new Set());
  const previousNeedsHelpRef = useRef({});
  const orderStatusByIdRef = useRef(new Map());
  const socketRef = useRef(null);

  const statusLabels = useMemo(
    () => ({
      new: t('manager.orders.pending'),
      in_progress: t('manager.orders.preparing'),
      ready: t('manager.orders.ready'),
      served: t('manager.orders.served'),
    }),
    [t]
  );

  const filterOptions = useMemo(
    () => [
      { value: 'all', label: t('common.all') },
      { value: 'new', label: t('manager.orders.pending') },
      { value: 'in_progress', label: t('manager.orders.preparing') },
      { value: 'ready', label: t('manager.orders.ready') },
      { value: 'served', label: t('manager.orders.served') },
    ],
    [t]
  );

  const userContext = useMemo(() => {
    if (user) return user;

    try {
      return JSON.parse(sessionStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, [user]);

  const waiterId = useMemo(() => toId(userContext?._id || userContext?.id), [userContext]);
  const restaurantId = useMemo(() => toId(userContext?.restaurant), [userContext]);

  const belongsToCurrentWaiter = useCallback(
    (order) => {
      if (!waiterId) return false;
      return getOrderWaiterId(order) === waiterId;
    },
    [waiterId]
  );

  const isClaimableByCurrentWaiter = useCallback(
    (order) => {
      if (!waiterId) return false;
      return !getOrderWaiterId(order);
    },
    [waiterId]
  );

  const isVisibleToCurrentWaiter = useCallback(
    (order) => belongsToCurrentWaiter(order) || isClaimableByCurrentWaiter(order),
    [belongsToCurrentWaiter, isClaimableByCurrentWaiter]
  );

  const syncWaiterTableIdsFromOrders = useCallback(
    (nextOrders) => {
      const nextTableIds = new Set(
        nextOrders
          .filter((order) => belongsToCurrentWaiter(order))
          .map((order) => getOrderTableId(order))
          .filter(Boolean)
      );

      waiterTableIdsRef.current = nextTableIds;
    },
    [belongsToCurrentWaiter]
  );

  const syncTablesFromOrders = useCallback((nextOrders) => {
    setTables((previousTables) => {
      const previousNeedsHelpById = Object.fromEntries(
        previousTables.map((table) => [table.id, table.needsHelp])
      );

      const nextTables = buildWaiterTables(
        cachedTablesRef.current,
        waiterTableIdsRef.current,
        nextOrders,
        previousNeedsHelpById,
        waiterId
      );

      previousNeedsHelpRef.current = Object.fromEntries(
        nextTables.map((table) => [table.id, table.needsHelp])
      );

      return nextTables;
    });
  }, [waiterId]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );
  const hasTableCalls = useMemo(
    () => tables.some((table) => table.needsHelp),
    [tables]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !("Notification" in window)) {
      return;
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {
        // Ignore permission errors in unsupported/blocked environments.
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !("Notification" in window)) {
      return;
    }

    tables.forEach((table) => {
      const previousNeedsHelp = previousNeedsHelpRef.current[table.id] ?? false;

      if (!previousNeedsHelp && table.needsHelp && Notification.permission === 'granted') {
        new Notification(t('waiter.tableCallTitle'), {
          body: t('waiter.tableCallBody', { table: table.number }),
        });
      }

      previousNeedsHelpRef.current[table.id] = table.needsHelp;
    });
  }, [tables, t]);

  useEffect(() => {
    if (!restaurantId) {
      setOrders([]);
      setTables([]);
      return;
    }

    let isActive = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [ordersResponse, tablesResponse] = await Promise.all([
          api.get(ordersEndpoint),
          api.get(tablesEndpoint),
        ]);

        if (!isActive) return;

        const apiOrders = Array.isArray(ordersResponse?.data?.orders)
          ? ordersResponse.data.orders
          : [];
        const apiTables = Array.isArray(tablesResponse?.data?.tables)
          ? tablesResponse.data.tables
          : [];

        const waiterVisibleOrders = apiOrders.filter((order) => isVisibleToCurrentWaiter(order));
        const waiterOwnedOrders = apiOrders.filter((order) => belongsToCurrentWaiter(order));

        const activeOrders = waiterVisibleOrders
          .filter((order) => ACTIVE_API_STATUSES.has(order?.status))
          .map((order) => normalizeOrder(order, t));

        const assignedTableIds = new Set(
          waiterOwnedOrders
            .map((order) => getOrderTableId(order))
            .filter(Boolean)
        );

        cachedTablesRef.current = apiTables;
        waiterTableIdsRef.current = assignedTableIds;
        orderStatusByIdRef.current = new Map(
          activeOrders.map((order) => [order.id, String(order.rawStatus || '')])
        );

        setOrders(activeOrders);
        syncTablesFromOrders(activeOrders);
      } catch (error) {
        if (isActive) {
          toast.error(error.response?.data?.message || error.message);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isActive = false;
    };
  }, [
    belongsToCurrentWaiter,
    isVisibleToCurrentWaiter,
    ordersEndpoint,
    restaurantId,
    syncTablesFromOrders,
    t,
    tablesEndpoint,
  ]);

  useEffect(() => {
    if (!restaurantId) {
      return undefined;
    }

    const socket = getSocket();
    if (!socket) return;
    socketRef.current = socket;

    // Join restaurant room for targeted order notifications.
    socket.emit('joinRestaurant', restaurantId);

    const handleOrderStatusUpdated = (data) => {
      const order = data?.order;
      const orderId = toId(order?._id);

      if (!orderId) return;

      const tableNumber = order.table?.number || order.table || '-';
      const normalizedOrder = normalizeOrder(order, t);
      const nextRawStatus = String(order?.status || '');
      const previousRawStatus = orderStatusByIdRef.current.get(orderId);

      const isVisibleToWaiter = isVisibleToCurrentWaiter(order);

      if (isVisibleToWaiter && nextRawStatus === 'ready' && previousRawStatus !== 'ready') {
        const newNotif = {
          id: Date.now(),
          type: 'ready',
          message: `Order ${getOrderDisplayNumber(order.orderNumber, orderId, t)} - Table ${tableNumber} is Ready to Serve!`,
          time: 'Just now',
          read: false,
          orderId,
          tableNumber,
        };

        setNotifications((previousNotifications) => [newNotif, ...previousNotifications]);

        toast.success(`🍽️ Table ${tableNumber} - Order Ready!`, {
          duration: 5000,
          icon: '🔔',
        });

      }

      if (isVisibleToWaiter && nextRawStatus === 'preparing' && previousRawStatus !== 'preparing') {
        const newNotif = {
          id: Date.now(),
          type: 'new',
          message: `Order ${getOrderDisplayNumber(order.orderNumber, orderId, t)} - Table ${tableNumber} is being prepared`,
          time: 'Just now',
          read: false,
        };

        setNotifications((previousNotifications) => [newNotif, ...previousNotifications]);
      }

      if (!isVisibleToWaiter || nextRawStatus === 'served' || nextRawStatus === 'cancelled') {
        orderStatusByIdRef.current.delete(orderId);
      } else {
        orderStatusByIdRef.current.set(orderId, nextRawStatus);
      }

      setOrders((previousOrders) => {
        const shouldRemove = !isVisibleToWaiter || nextRawStatus === 'served' || nextRawStatus === 'cancelled';
        let nextOrders = [];

        if (shouldRemove) {
          nextOrders = previousOrders.filter(
            (existingOrder) => existingOrder.id !== normalizedOrder.id && existingOrder.id !== orderId
          );
        } else {
          const incomingOrder = {
            ...normalizedOrder,
            status: toUiOrderStatus(nextRawStatus),
            rawStatus: nextRawStatus,
          };

          nextOrders = previousOrders.some(
            (existingOrder) => existingOrder.id === normalizedOrder.id || existingOrder.id === orderId
          )
            ? previousOrders.map((existingOrder) => (
                existingOrder.id === normalizedOrder.id || existingOrder.id === orderId
                  ? { ...existingOrder, ...incomingOrder }
                  : existingOrder
              ))
            : [incomingOrder, ...previousOrders];
        }

        syncWaiterTableIdsFromOrders(nextOrders);
        syncTablesFromOrders(nextOrders);
        return nextOrders;
      });
    };

    const handleNewOrder = (data) => {
      const order = data?.order;
      if (!order?._id) return;
      if (!isVisibleToCurrentWaiter(order)) return;

      const tableNumber = order.table?.number || order.table || '-';
      const normalizedOrder = normalizeOrder(order, t);

      orderStatusByIdRef.current.set(normalizedOrder.id, String(order?.status || 'pending'));

      const newNotif = {
        id: Date.now(),
        type: 'new',
        message: `New order from Table ${tableNumber}`,
        time: 'Just now',
        read: false,
      };

      setNotifications((previousNotifications) => [newNotif, ...previousNotifications]);
      setOrders((previousOrders) => {
        const nextOrders = [
          normalizedOrder,
          ...previousOrders.filter((existingOrder) => existingOrder.id !== normalizedOrder.id),
        ];

        syncWaiterTableIdsFromOrders(nextOrders);
        syncTablesFromOrders(nextOrders);
        return nextOrders;
      });
    };

    socket.on('orderStatusUpdated', handleOrderStatusUpdated);
    socket.on('order_updated', handleOrderStatusUpdated);
    socket.on('order_ready', handleOrderStatusUpdated);
    socket.on('newOrder', handleNewOrder);
    socket.on('new_order', handleNewOrder);

    return () => {
      socket.off('orderStatusUpdated', handleOrderStatusUpdated);
      socket.off('order_updated', handleOrderStatusUpdated);
      socket.off('order_ready', handleOrderStatusUpdated);
      socket.off('newOrder', handleNewOrder);
      socket.off('new_order', handleNewOrder);
    };
  }, [
    belongsToCurrentWaiter,
    isVisibleToCurrentWaiter,
    restaurantId,
    syncTablesFromOrders,
    syncWaiterTableIdsFromOrders,
    t,
    user?.restaurant,
  ]);

  const filteredOrders = useMemo(() => {
    const baseOrders = orderFilter === 'all'
      ? orders
      : orders.filter((order) => order.status === orderFilter);

    // Keep waiter-owned orders first, and served orders at the bottom.
    return [...baseOrders].sort((a, b) => {
      const aOwnedByCurrentWaiter = belongsToCurrentWaiter(a);
      const bOwnedByCurrentWaiter = belongsToCurrentWaiter(b);

      if (aOwnedByCurrentWaiter && !bOwnedByCurrentWaiter) {
        return -1;
      }
      if (!aOwnedByCurrentWaiter && bOwnedByCurrentWaiter) {
        return 1;
      }

      if (a.status === 'served' && b.status !== 'served') {
        return 1;
      }
      if (a.status !== 'served' && b.status === 'served') {
        return -1;
      }
      return 0;
    });
  }, [belongsToCurrentWaiter, orders, orderFilter]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMarkAllRead = () => {
    setNotifications((previousNotifications) =>
      previousNotifications.map((notification) => ({ ...notification, read: true }))
    );
  };

  const handleDismissHelp = (tableId) => {
    const calledTable = tables.find((table) => table.id === tableId);
    if (!calledTable) {
      return;
    }

    setTables((previousTables) =>
      previousTables.map((table) =>
        table.id === tableId
          ? { ...table, needsHelp: false, status: 'occupied' }
          : table
      )
    );

    setNotifications((previousNotifications) =>
      previousNotifications.filter(
        (notification) =>
          !(notification.type === 'call' && notification.message.includes(String(calledTable.number)))
      )
    );
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.put(`${ordersEndpoint}/${orderId}/status`, {
        status: toApiOrderStatus(newStatus),
      });

      setOrders((previousOrders) => {
        const nextOrders = previousOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: newStatus,
                waiterId: order.waiterId || waiterId,
              }
            : order
        );

        syncWaiterTableIdsFromOrders(nextOrders);
        syncTablesFromOrders(nextOrders);
        return nextOrders;
      });

      if (newStatus === 'served') {
        toast.success(t('waiter.orderServedToast'));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500 text-white';
      case 'in_progress':
        return 'bg-[#c9963a] text-white';
      case 'ready':
        return 'bg-emerald-500 text-white animate-pulse';
      case 'served':
        return 'bg-slate-600 text-slate-300';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-slate-100 flex flex-col font-sans relative overflow-x-hidden">

      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-[#0d1f3c]/80 backdrop-blur-md border-b border-[#1e3a5f] px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#0891b2]/20 text-[#22d3ee] rounded-full flex items-center justify-center">
            <UserCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{t('waiter.title')}</h1>
            <p className="text-xs text-slate-400">{t('waiter.zone')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <button
            onClick={() => setShowNotifications(true)}
            className="relative p-2 rounded-full bg-[#132845] text-slate-300 hover:text-white transition-colors"
            title={t('common.notifications')}
          >
            <Bell className={`w-6 h-6 ${hasTableCalls ? 'animate-bounce text-red-400' : ''}`} />
            {unreadCount > 0 && (
              <span className={`absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full border-2 border-[#0d1f3c] text-[10px] font-bold text-white flex items-center justify-center ${hasTableCalls ? 'bg-red-500 animate-pulse' : 'bg-[#0891b2]'}`}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="p-2 rounded-full bg-[#132845] text-slate-300 hover:text-red-400 transition-colors"
            title={t('common.logout')}
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* TABS */}
      <div className="px-4 py-3 bg-[#0d1f3c] border-b border-[#1e3a5f] flex space-x-2 shrink-0">
        <button
          onClick={() => setActiveTab('my-tables')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'my-tables' ? 'bg-[#0891b2] text-white shadow-lg' : 'bg-[#132845] text-slate-400'}`}
        >
          {t('waiter.myTables')}
        </button>
        <button
          onClick={() => setActiveTab('all-orders')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'all-orders' ? 'bg-[#0891b2] text-white shadow-lg' : 'bg-[#132845] text-slate-400'}`}
        >
          {t('waiter.allOrders')}
        </button>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-4 pb-24 w-full max-w-4xl mx-auto">

        {loading && (
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#22d3ee] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* TAB: MY TABLES */}
        {!loading && activeTab === 'my-tables' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {tables.map((table) => (
              <div
                key={table.id}
                className={`flex flex-col rounded-2xl border-2 overflow-hidden transition-all ${table.needsHelp ? 'border-red-500 bg-red-500/5' : 'border-[#1e3a5f] bg-[#132845]'}`}
              >
                <div className="p-4 flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-2xl font-black text-slate-100 font-mono">T{table.number}</span>
                    {table.needsHelp && (
                      <span className="animate-bounce text-red-500">
                        <BellRing className="w-5 h-5" />
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-medium text-slate-400 mb-1">{t('waiter.activeOrder')}</p>
                    <p className="font-mono text-[#22d3ee] font-bold">{table.activeOrder}</p>
                    <p className="text-xs text-slate-500 mt-1">{t('waiter.itemsAndTotal', { count: table.items, total: table.total.toFixed(2) })}</p>
                  </div>
                </div>

                {table.needsHelp ? (
                  <button
                    onClick={() => handleDismissHelp(table.id)}
                    className="w-full py-3 bg-red-500 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {t('waiter.callReceived')}
                  </button>
                ) : (
                  <button className="w-full py-3 bg-[#0d1f3c] text-slate-400 font-bold text-sm hover:text-white transition-colors border-t border-[#1e3a5f] flex items-center justify-center gap-1">
                    {t('waiter.viewDetails')}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {tables.length === 0 && (
              <div className="col-span-full bg-[#132845] border border-[#1e3a5f] rounded-2xl p-8 text-center text-slate-400">
                <p className="text-lg font-semibold">{t('waiter.noAssignedTables')}</p>
                <p className="text-sm text-slate-500 mt-1">{t('waiter.assignedTablesHint')}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: ALL ORDERS */}
        {!loading && activeTab === 'all-orders' && (
          <div className="space-y-4">

            {/* Filter */}
            <div className="flex overflow-x-auto no-scrollbar space-x-2 pb-2 items-center">
              <span className="shrink-0 p-2 rounded-full bg-[#132845] border border-[#1e3a5f] text-slate-400">
                <Filter className="w-4 h-4" />
              </span>
              {filterOptions.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setOrderFilter(filter.value)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${orderFilter === filter.value ? 'bg-slate-200 text-[#0a1628]' : 'bg-[#132845] text-slate-400 border border-[#1e3a5f]'}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Orders List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {filteredOrders.map((order) => (
                  <Motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={order.id}
                    className={`bg-[#132845] border border-[#1e3a5f] rounded-2xl p-4 flex flex-col text-sm md:text-base ${order.status === 'served' ? 'opacity-60' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[#0d1f3c] rounded-xl flex items-center justify-center font-black text-[#22d3ee] font-mono">
                          {order.table}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-100 font-mono">
                            {getOrderDisplayNumber(order.orderNumber, order.id, t)}
                          </h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {formatTimeAgo(order.createdAt, t)}
                          </p>
                        </div>
                      </div>

                      <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg ${getStatusColor(order.status)}`}>
                        {statusLabels[order.status] || order.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-sm text-slate-400 mb-4 truncate">
                      {order.items.map((item) => `${item.qty}x ${item.name}`).join(', ')}
                    </p>

                    {/* Actions */}
                    {order.status === 'ready' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'served')}
                        className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl transition-colors flex justify-center items-center gap-2 shadow-lg shadow-emerald-500/20"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        {t('waiter.markServed')}
                      </button>
                    )}
                    {order.status === 'new' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'in_progress')}
                        className="w-full py-3 bg-[#c9963a] text-[#0d1f3c] font-bold rounded-xl active:bg-amber-600 transition-colors flex justify-center items-center gap-2"
                      >
                        <ChefHat className="w-5 h-5" /> {t('waiter.sendToKitchen')}
                      </button>
                    )}
                  </Motion.div>
                ))}
              </AnimatePresence>
            </div>

            {filteredOrders.length === 0 && (
              <div className="text-center py-12 text-slate-500 bg-[#132845] border border-[#1e3a5f] rounded-2xl">
                <p className="font-medium text-lg">{t('waiter.noOrdersFound')}</p>
              </div>
            )}
          </div>
        )}

      </main>

      {/* NOTIFICATION PANEL (SLIDE IN) */}
      <AnimatePresence>
        {showNotifications && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex justify-end"
          >
            <Motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full sm:w-96 h-full bg-[#0d1f3c] border-l border-[#1e3a5f] flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-[#1e3a5f] flex justify-between items-center bg-[#132845]">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#22d3ee]" /> {t('common.notifications')}
                </h2>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-full bg-[#0d1f3c]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.length === 0 ? (
                  <p className="text-slate-500 text-center mt-6">{t('waiter.noNotifications')}</p>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-xl border flex gap-3 ${notification.read ? 'bg-[#0a1628] border-[#1e3a5f] opacity-70' : 'bg-[#132845] border-[#0891b2]/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]'}`}
                    >
                      <div className="mt-1">
                        {notification.type === 'call' && <BellRing className="w-5 h-5 text-red-400" />}
                        {notification.type === 'ready' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                        {notification.type === 'new' && <ChefHat className="w-5 h-5 text-[#22d3ee]" />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${notification.read ? 'text-slate-400' : 'text-slate-100 font-medium'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{notification.time}</p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-[#0891b2] rounded-full mt-2 shrink-0"></div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {unreadCount > 0 && (
                <div className="p-4 border-t border-[#1e3a5f]">
                  <button
                    onClick={handleMarkAllRead}
                    className="w-full py-3 bg-[#132845] text-slate-300 font-bold rounded-xl hover:bg-[#1e3a5f] transition-colors"
                  >
                    {t('waiter.markAllRead')}
                  </button>
                </div>
              )}
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default WaiterOrdersPage;

