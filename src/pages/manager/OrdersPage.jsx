import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Search from 'lucide-react/dist/esm/icons/search';
import Filter from 'lucide-react/dist/esm/icons/filter';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import Utensils from 'lucide-react/dist/esm/icons/utensils';
import Clock from 'lucide-react/dist/esm/icons/clock';
import X from 'lucide-react/dist/esm/icons/x';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import ManagerLayout from '../../layouts/ManagerLayout';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { connectSocket } from '../../services/socket';
import useAuthStore from '../../store/authStore';

const getOrdersEndpoint = () => {
  const baseURL = String(api.defaults.baseURL || '');
  return /\/api\/?$/.test(baseURL) ? '/orders' : '/api/orders';
};

const normalizeOrder = (order) => {
  const normalizedTable = order?.table && typeof order.table === 'object'
    ? order.table
    : { number: order?.table ?? '-' };

  const normalizedItems = Array.isArray(order?.items)
    ? order.items.map((item) => ({
        ...item,
        quantity: item?.quantity ?? 1,
        name: item?.name || item?.menuItem?.name?.fr || item?.menuItem?.name || 'Item',
      }))
    : [];

  return {
    ...order,
    table: normalizedTable,
    items: normalizedItems,
    totalAmount: Number(order?.totalAmount || 0),
  };
};

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cancelTarget, setCancelTarget] = useState(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchOrders = async (showLoading = false) => {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const response = await api.get(getOrdersEndpoint());
        if (!isActive) return;

        const apiOrders = Array.isArray(response?.data?.orders) ? response.data.orders : [];
        setOrders(apiOrders.map(normalizeOrder));
      } catch (error) {
        if (isActive) {
          toast.error(error.response?.data?.message || error.message);
        }
      } finally {
        if (showLoading && isActive) {
          setLoading(false);
        }
      }
    };

    fetchOrders(true);
    const pollInterval = setInterval(() => fetchOrders(false), 30000);

    const socket = connectSocket();
    if (user?.restaurant) {
      socket.emit('joinRestaurant', user.restaurant);
    }

    const handleNewOrder = (data) => {
      if (!data?.order) return;
      setOrders((prev) => [normalizeOrder(data.order), ...prev]);
      toast.success('New order received!');
    };

    const handleOrderStatusUpdated = (data) => {
      if (!data?.order?._id) return;
      const normalized = normalizeOrder(data.order);
      setOrders((prev) => prev.map((o) => (o._id === normalized._id ? normalized : o)));
    };

    socket.on('newOrder', handleNewOrder);
    socket.on('orderStatusUpdated', handleOrderStatusUpdated);

    return () => {
      isActive = false;
      clearInterval(pollInterval);
      socket.off('newOrder', handleNewOrder);
      socket.off('orderStatusUpdated', handleOrderStatusUpdated);
    };
  }, [user?.restaurant]);

  if (loading) {
    return (
      <ManagerLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#7c6af7] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </ManagerLayout>
    );
  }

  const summaryCounts = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((order) => order.status === 'pending').length,
      preparing: orders.filter((order) => order.status === 'preparing').length,
      ready: orders.filter((order) => order.status === 'ready').length,
      served: orders.filter((order) => order.status === 'served').length,
      cancelled: orders.filter((order) => order.status === 'cancelled').length,
    };
  }, [orders]);

  const getTimeElapsed = (date) => {
    const diffInMinutes = Math.floor((currentTime - new Date(date)) / 60000);
    if (diffInMinutes < 1) {
      return 'Just now';
    }
    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    }
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', bg: 'bg-[#7c6af7]/10 text-[#7c6af7] border-[#7c6af7]/20' };
      case 'confirmed':
        return { label: 'Confirmed', bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
      case 'preparing':
        return { label: 'Preparing', bg: 'bg-[#0891b2]/10 text-[#22d3ee] border-[#0891b2]/20' };
      case 'ready':
        return { label: 'Ready', bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
      case 'served':
        return { label: 'Served', bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
      case 'cancelled':
        return { label: 'Cancelled', bg: 'bg-red-500/10 text-red-500 border-red-500/20' };
      default:
        return { label: 'Unknown', bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    }
  };

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const matchesSearch = (order.orderNumber || '').toLowerCase().includes(searchQuery.trim().toLowerCase());
        const matchesStatus = statusFilter === 'All' || order.status === statusFilter.toLowerCase();
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        const matchesDate = !dateFilter || orderDate === dateFilter;
        return matchesSearch && matchesStatus && matchesDate;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orders, searchQuery, statusFilter, dateFilter]);

  const openCancelModal = (order) => {
    setCancelTarget(order);
  };

  const closeCancelModal = () => {
    setCancelTarget(null);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await api.put(`${getOrdersEndpoint()}/${orderId}/status`, { status: newStatus });
      const updatedOrder = response?.data?.order
        ? normalizeOrder(response.data.order)
        : null;

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === orderId
            ? (updatedOrder || { ...order, status: newStatus })
            : order
        )
      );

      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
      return false;
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) {
      return;
    }

    const success = await updateOrderStatus(cancelTarget._id, 'cancelled');
    if (success) {
      closeCancelModal();
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
  };

  return (
    <ManagerLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-3xl font-bold text-slate-100" style={{ fontFamily: "'Playfair Display', serif" }}>
            Orders Overview
          </h2>

          <div className="flex items-center space-x-2 bg-[#0d1f3c] px-4 py-2 border border-[#1e3a5f] rounded-xl text-sm font-medium text-[#7c6af7]">
            <div className="w-2 h-2 rounded-full bg-[#7c6af7] animate-pulse"></div>
            <span>Monitoring ({orders.length} Total)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-xl px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Total</p>
            <p className="text-xl font-bold text-slate-100 mt-1">{summaryCounts.total}</p>
          </div>
          <div className="bg-[#0d1f3c] border border-[#7c6af7]/20 rounded-xl px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Pending</p>
            <p className="text-xl font-bold text-[#7c6af7] mt-1">{summaryCounts.pending}</p>
          </div>
          <div className="bg-[#0d1f3c] border border-[#0891b2]/20 rounded-xl px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Preparing</p>
            <p className="text-xl font-bold text-[#22d3ee] mt-1">{summaryCounts.preparing}</p>
          </div>
          <div className="bg-[#0d1f3c] border border-emerald-500/20 rounded-xl px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Ready</p>
            <p className="text-xl font-bold text-emerald-500 mt-1">{summaryCounts.ready}</p>
          </div>
          <div className="bg-[#0d1f3c] border border-slate-500/20 rounded-xl px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Served</p>
            <p className="text-xl font-bold text-slate-300 mt-1">{summaryCounts.served}</p>
          </div>
          <div className="bg-[#0d1f3c] border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Cancelled</p>
            <p className="text-xl font-bold text-red-500 mt-1">{summaryCounts.cancelled}</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-[#0d1f3c] p-4 rounded-2xl border border-[#1e3a5f]">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by order number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#7c6af7] transition-colors"
            />
          </div>

          <div className="flex w-full lg:w-auto gap-4">
            <div className="relative flex-1 lg:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-8 py-2 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 appearance-none focus:outline-none focus:border-[#7c6af7] transition-colors cursor-pointer"
              >
                {['All', 'Pending', 'Confirmed', 'Preparing', 'Ready', 'Served', 'Cancelled'].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 lg:w-48">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 focus:outline-none focus:border-[#7c6af7] transition-colors"
              />
            </div>
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              const canCancel = order.status === 'pending' || order.status === 'confirmed';

              return (
                <motion.div
                  layout
                  key={order._id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-2xl overflow-hidden flex flex-col group hover:border-[#1e5080] transition-colors shadow-sm"
                >
                  <div className="p-5 border-b border-[#1e3a5f] flex justify-between items-start bg-[#132845]/30">
                    <div>
                      <h3 className="text-xl font-bold text-[#7c6af7] mb-1">{order.orderNumber}</h3>
                      <div className="flex items-center text-xs text-slate-400 font-medium space-x-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{getTimeElapsed(order.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.bg}`}>
                        {statusInfo.label}
                      </span>
                      {canCancel && (
                        <button
                          onClick={() => openCancelModal(order)}
                          className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center space-x-2 text-slate-200 font-semibold mb-4 bg-[#132845] p-3 rounded-xl border border-[#1e3a5f]">
                      <Utensils className="w-5 h-5 text-[#7c6af7]" />
                      <span>Table {order.table.number}</span>
                    </div>

                    <div className="space-y-3 flex-1">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm">
                          <span className="w-6 h-6 rounded-md bg-[#132845] border border-[#1e3a5f] flex items-center justify-center text-slate-300 font-medium">
                            {item.quantity}
                          </span>
                          <span className="text-slate-300">{item.name}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#1e3a5f] flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-400">Total Amount</span>
                      <span className="text-lg font-bold text-slate-100">{order.totalAmount.toFixed(2)} TND</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {filteredOrders.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-12 flex flex-col items-center justify-center text-slate-500 bg-[#0d1f3c] rounded-2xl border border-[#1e3a5f] border-dashed"
              >
                <Utensils className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No orders found matching your filters.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {cancelTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeCancelModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 220, damping: 24 }}
              className="w-full max-w-md bg-[#0d1f3c] border border-[#1e3a5f] rounded-2xl shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="p-5 border-b border-[#1e3a5f] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </span>
                  <h3 className="text-lg font-bold text-slate-100">Cancel Order</h3>
                </div>
                <button
                  onClick={closeCancelModal}
                  className="p-2 rounded-full bg-[#132845] text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <p className="text-slate-300">
                  Are you sure you want to cancel this order?
                </p>
                <div className="text-sm text-slate-400 bg-[#132845] border border-[#1e3a5f] rounded-xl p-3">
                  <span className="font-semibold text-slate-200">{cancelTarget.orderNumber}</span> â€¢ Table {cancelTarget.table.number}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={closeCancelModal}
                    className="px-4 py-2.5 rounded-xl bg-[#132845] border border-[#1e3a5f] text-slate-300 hover:bg-[#1e3a5f] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmCancel}
                    className="px-4 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-400 font-semibold transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ManagerLayout>
  );
};

export default OrdersPage;

