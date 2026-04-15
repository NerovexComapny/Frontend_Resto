import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import Clock from 'lucide-react/dist/esm/icons/clock';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import ChefHat from 'lucide-react/dist/esm/icons/chef-hat';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Flame from 'lucide-react/dist/esm/icons/flame';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { connectSocket } from '../../services/socket';
import LanguageSwitcher from '../../components/shared/LanguageSwitcher';

const getOrdersEndpoint = () => {
  const baseURL = String(api.defaults.baseURL || '');
  return /\/api\/?$/.test(baseURL) ? '/orders' : '/api/orders';
};

const toKitchenStatus = (status) => {
  if (status === 'pending' || status === 'confirmed' || status === 'new') return 'new';
  if (status === 'preparing' || status === 'in_progress') return 'in_progress';
  if (status === 'ready') return 'ready';
  if (status === 'served') return 'served';
  return 'new';
};

const toApiStatus = (status) => {
  if (status === 'in_progress') return 'preparing';
  return status;
};

const toId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
};

const normalizeItemName = (item) => {
  const baseName = item?.name
    || item?.menuItem?.name?.fr
    || item?.menuItem?.name?.en
    || item?.menuItem?.name?.ar
    || 'Item';
  const quantity = Number(item?.quantity || 1);
  return `${baseName} x${quantity}`;
};

const normalizeOrder = (order) => {
  const tableValue = order?.table && typeof order.table === 'object'
    ? order.table.number
    : order?.table;

  return {
    ...order,
    table: tableValue ?? 'Takeaway',
    items: Array.isArray(order?.items)
      ? order.items.map((item) => ({ name: normalizeItemName(item) }))
      : [],
    notes: order?.notes || '',
    createdAt: order?.createdAt || new Date().toISOString(),
    status: toKitchenStatus(order?.status),
  };
};

const getTimeColor = (minutes) => {
  if (minutes < 5) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  if (minutes < 10) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
  return 'text-red-400 bg-red-400/10 border-red-400/20';
};

const getElapsed = (createdAt) => {
  const diff = Math.max(0, Date.now() - new Date(createdAt).getTime());
  return {
    mins: Math.floor(diff / 60000),
    secs: Math.floor((diff % 60000) / 1000),
  };
};

// Single global clock - updates every 10 seconds only
const ClockDisplay = memo(() => {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('en-US', { hour12: false }));
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 10000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-2xl font-mono font-bold text-slate-300 bg-[#132845] px-5 py-2 rounded-xl border border-[#1e3a5f]">
      {time}
    </div>
  );
});

// Single global ticker - all tickets share ONE interval
let globalTick = 0;
const tickListeners = new Set();
setInterval(() => {
  globalTick++;
  tickListeners.forEach(fn => fn(globalTick));
}, 1000);

const OrderTicket = memo(({ order, onAction, isUpdating, labels }) => {
  const [, forceUpdate] = useState(0);
  const actionOrderId = order._id || order.id;

  useEffect(() => {
    const handler = (tick) => forceUpdate(tick);
    tickListeners.add(handler);
    return () => tickListeners.delete(handler);
  }, []);

  const { mins, secs } = getElapsed(order.createdAt);
  const timeColor = getTimeColor(mins);
  const isPulse = order.status === 'new' && mins < 2;

  return (
    <div
      className={
        "animate-fade-in bg-[#132845] rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden shadow-lg border-2 " +
        (isPulse ? "border-[#c9963a]/60 shadow-[0_0_20px_rgba(201,150,58,0.15)]" : "border-[#1e3a5f]")
      }
    >
      <div className="absolute -right-6 -bottom-6 opacity-[0.03] pointer-events-none">
        {order.status === 'new' && <Flame className="w-48 h-48" />}
        {order.status === 'in_progress' && <ChefHat className="w-48 h-48" />}
        {order.status === 'ready' && <CheckCircle2 className="w-48 h-48" />}
      </div>

      <div className="flex justify-between items-start border-b border-[#1e3a5f] pb-4 z-10">
        <div>
          <div className="text-3xl md:text-5xl font-bold text-[#c9963a]" style={{ fontFamily: "'Playfair Display', serif" }}>
            {(String(order.table).toLowerCase() !== 'takeaway')
                ? `${labels.table} ${order.table}`
                : labels.takeaway}
          </div>
          <div className="text-slate-400 font-mono tracking-widest text-lg mt-1">{order.orderNumber}</div>
        </div>
        <div className={"px-3 py-1.5 rounded-xl border font-mono text-2xl font-bold flex items-center gap-2 " + timeColor}>
          <Clock className="w-6 h-6" />
          <span>{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
        </div>
      </div>

      <div className="flex-1 space-y-3 py-3 z-10">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex items-start text-xl md:text-3xl font-bold text-slate-100 leading-tight">
            <span className="text-[#c9963a] mr-3 opacity-70">•</span>
            <span>{item.name}</span>
          </div>
        ))}
      </div>

      {order.notes && (
        <div className="bg-yellow-500/10 text-yellow-400 p-4 rounded-xl border border-yellow-500/30 text-xl font-bold flex items-start gap-3 z-10">
          <AlertCircle className="w-7 h-7 shrink-0 mt-0.5" />
          <span className="leading-snug">{order.notes}</span>
        </div>
      )}

      <div className="mt-2 z-10">
        {order.status === 'new' && (
          <button
            onClick={() => onAction(actionOrderId, 'in_progress')}
            disabled={isUpdating}
            className={
              "w-full py-3 md:py-5 text-base md:text-2xl font-bold text-white rounded-xl transition-all flex items-center justify-center gap-3 "
              + (isUpdating
                ? "bg-blue-600/70 cursor-not-allowed opacity-80"
                : "bg-blue-600 hover:bg-blue-500 active:scale-[0.98]")
            }
          >
            <ChefHat className="w-6 h-6" />
            <span>{isUpdating ? labels.starting : labels.startCooking}</span>
          </button>
        )}
        {order.status === 'in_progress' && (
          <button
            onClick={() => onAction(actionOrderId, 'ready')}
            disabled={isUpdating}
            className={
              "w-full py-3 md:py-5 text-base md:text-2xl font-bold text-white rounded-xl transition-all flex items-center justify-center gap-3 "
              + (isUpdating
                ? "bg-emerald-600/70 cursor-not-allowed opacity-80"
                : "bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98]")
            }
          >
            <CheckCircle2 className="w-6 h-6" />
            <span>{isUpdating ? labels.updating : labels.markReady}</span>
          </button>
        )}
        {order.status === 'ready' && (
          <button
            onClick={() => onAction(actionOrderId, 'served')}
            disabled={isUpdating}
            className={
              "w-full py-3 md:py-5 text-base md:text-2xl font-bold rounded-xl border transition-all "
              + (isUpdating
                ? "text-slate-400 bg-[#1e3a5f]/70 border-[#1e4a75] cursor-not-allowed opacity-80"
                : "text-slate-400 bg-[#1e3a5f] hover:bg-[#1e4a75] border-[#1e4a75] active:scale-[0.98]")
            }
          >
            {isUpdating ? labels.clearing : labels.clearTicket}
          </button>
        )}
      </div>
    </div>
  );
});

const KitchenDisplayPage = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingActions, setPendingActions] = useState({});
  const user = useAuthStore((state) => state.user);
  const ordersEndpoint = getOrdersEndpoint();
  const ordersRef = useRef([]);
  const inFlightActionsRef = useRef(new Set());
  const userContext = useMemo(() => {
    if (user) return user;

    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, [user]);
  const restaurantId = useMemo(() => toId(userContext?.restaurant), [userContext]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    if (!restaurantId) return;

    let isActive = true;

    const fetchKitchenOrders = async () => {
      setLoading(true);
      try {
        const statuses = ['pending', 'confirmed', 'preparing', 'ready'];
        const responses = await Promise.all(
          statuses.map((status) => api.get(ordersEndpoint, { params: { status } }))
        );

        if (!isActive) return;

        const mergedOrders = responses.flatMap((response) =>
          Array.isArray(response?.data?.orders) ? response.data.orders : []
        );

        const uniqueOrders = new Map();
        mergedOrders.forEach((order) => {
          if (order?._id) {
            uniqueOrders.set(order._id, normalizeOrder(order));
          }
        });

        setOrders(Array.from(uniqueOrders.values()));
      } catch {
        if (isActive) {
          setOrders([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchKitchenOrders();

    const socket = connectSocket();
    socket.emit('joinRestaurant', restaurantId);

    const handleNewOrder = (data) => {
      const incomingOrder = data?.order;
      if (!incomingOrder?._id) return;

      const mapped = normalizeOrder(incomingOrder);
      if (mapped.status === 'served') {
        return;
      }

      setOrders((prev) => [mapped, ...prev.filter((order) => order._id !== mapped._id)]);
    };

    const handleOrderStatusUpdated = (data) => {
      if (!data?.order?._id) return;

      const mapped = normalizeOrder(data.order);
      setOrders((prev) => {
        const exists = prev.some((order) => order._id === mapped._id);

        if (mapped.status === 'served') {
          return prev.filter((order) => order._id !== mapped._id);
        }

        if (!exists) {
          return [mapped, ...prev];
        }

        return prev.map((order) => (order._id === mapped._id ? mapped : order));
      });
    };

    const handleOrderCancelled = (data) => {
      const cancelledId = toId(data?.order?._id);
      if (!cancelledId) return;

      setOrders((prev) => prev.filter((order) => order._id !== cancelledId));
    };

    socket.on('newOrder', handleNewOrder);
    socket.on('new_order', handleNewOrder);
    socket.on('orderStatusUpdated', handleOrderStatusUpdated);
    socket.on('order_updated', handleOrderStatusUpdated);
    socket.on('order_ready', handleOrderStatusUpdated);
    socket.on('orderCancelled', handleOrderCancelled);

    return () => {
      isActive = false;
      socket.off('newOrder', handleNewOrder);
      socket.off('new_order', handleNewOrder);
      socket.off('orderStatusUpdated', handleOrderStatusUpdated);
      socket.off('order_updated', handleOrderStatusUpdated);
      socket.off('order_ready', handleOrderStatusUpdated);
      socket.off('orderCancelled', handleOrderCancelled);
    };
  }, [ordersEndpoint, restaurantId]);

  const handleAction = useCallback(async (orderId, newStatus) => {
    if (!orderId) return;
    if (inFlightActionsRef.current.has(orderId)) return;

    const currentOrder = ordersRef.current.find((order) => (order._id || order.id) === orderId);
    if (!currentOrder) return;
    if (newStatus === 'in_progress' && currentOrder.status === 'in_progress') return;
    if (currentOrder.status === newStatus) return;

    inFlightActionsRef.current.add(orderId);
    setPendingActions((prev) => ({ ...prev, [orderId]: true }));

    try {
      const apiStatus = toApiStatus(newStatus);
      await api.put(`${ordersEndpoint}/${orderId}/status`, { status: apiStatus });

      if (newStatus === 'served') {
        setOrders((prev) => prev.filter((order) => order._id !== orderId));
      } else {
        setOrders((prev) =>
          prev.map((order) =>
            order._id === orderId ? { ...order, status: newStatus } : order
          )
        );
      }
    } catch {
      // Keep UI unchanged and rely on next socket update/refetch if request fails.
    } finally {
      inFlightActionsRef.current.delete(orderId);
      setPendingActions((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  }, [ordersEndpoint]);

  const newOrders = orders.filter(o => o.status === 'new');
  const inProgressOrders = orders.filter(o => o.status === 'in_progress');
  const readyOrders = orders.filter(o => o.status === 'ready');

  const columnData = [
    { key: 'new', label: t('kitchen.newOrders'), orders: newOrders, count: newOrders.length, headerClass: 'bg-[#c9963a]/10 text-[#c9963a] border-[#c9963a]/20', badgeClass: 'bg-[#c9963a] text-slate-900', emptyIcon: <Flame className="w-16 h-16 mb-4" />, emptyText: t('kitchen.noNewOrders'), borderClass: 'md:border-r-4 border-[#132845]' },
    { key: 'in_progress', label: t('kitchen.inProgress'), orders: inProgressOrders, count: inProgressOrders.length, headerClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20', badgeClass: 'bg-blue-500 text-white', emptyIcon: <ChefHat className="w-16 h-16 mb-4" />, emptyText: t('kitchen.clearBoard'), borderClass: 'md:border-r-4 border-[#132845]' },
    { key: 'ready', label: t('kitchen.readyToServe'), orders: readyOrders, count: readyOrders.length, headerClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', badgeClass: 'bg-emerald-500 text-white', emptyIcon: <CheckCircle2 className="w-16 h-16 mb-4" />, emptyText: t('kitchen.nothingReady'), borderClass: '' },
  ];

  const ticketLabels = {
    table: t('common.table'),
    takeaway: t('kitchen.takeaway'),
    startCooking: t('kitchen.startCooking'),
    starting: t('kitchen.starting'),
    markReady: t('kitchen.markReady'),
    updating: t('kitchen.updating'),
    clearTicket: t('kitchen.clearTicket'),
    clearing: t('kitchen.clearing'),
  };

  return (
    <div className="h-screen w-full bg-[#0a1628] text-slate-100 flex flex-col font-sans overflow-hidden">
      <header className="min-h-20 bg-[#0d1f3c] border-b-2 border-[#1e3a5f] px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-2 sm:gap-6 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold tracking-wider text-[#c9963a] uppercase">{t('kitchen.title')}</h1>
          <div className="flex flex-wrap gap-2">
            {columnData.map(col => (
              <span key={col.key} className={"px-2 md:px-3 py-1 text-xs md:text-sm font-bold rounded-lg " + (col.count > 0 ? col.headerClass + " border" : "bg-[#132845] text-slate-500")}>
                {col.count} {col.label.split(' ')[0].toUpperCase()}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher compact />
          <div className="hidden sm:block">
            <ClockDisplay />
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-0">
        {loading && (
          <div className="col-span-full min-h-[60vh] flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-[#c9963a] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {!loading && columnData.map(col => (
          <section key={col.key} className={"flex flex-col min-h-64 h-[60vh] md:h-auto md:min-h-0 overflow-hidden bg-[#0a1628] " + col.borderClass}>
            <div className={"p-4 border-b-4 flex justify-between items-center shrink-0 " + col.headerClass}>
              <h2 className="text-lg md:text-2xl font-black tracking-widest uppercase">{col.label}</h2>
              <div className={"w-8 h-8 rounded-full flex items-center justify-center font-black text-xl " + col.badgeClass}>
                {col.count}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e3a5f transparent' }}>
              {col.orders.map(order => {
                const orderId = order._id || order.id;
                return (
                  <OrderTicket
                    key={orderId}
                    order={order}
                    onAction={handleAction}
                    isUpdating={Boolean(pendingActions[orderId])}
                    labels={ticketLabels}
                  />
                );
              })}
              {col.count === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 pt-20">
                  {col.emptyIcon}
                  <p className="text-xl font-bold uppercase tracking-widest">{col.emptyText}</p>
                </div>
              )}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};

export default KitchenDisplayPage;