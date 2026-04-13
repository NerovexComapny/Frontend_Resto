import React, { useState, useEffect } from 'react';
import { motion as Motion } from 'framer-motion';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import Clock from 'lucide-react/dist/esm/icons/clock';
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import ManagerLayout from '../../layouts/ManagerLayout';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const getApiEndpoint = (path) => {
  const baseURL = String(api.defaults.baseURL || '');
  const normalizedPath = `/${String(path || '').replace(/^\/+/, '').replace(/^api\/?/, '')}`;
  return /\/api\/?$/.test(baseURL) ? normalizedPath : `/api${normalizedPath}`;
};

const normalizeStatus = (status) => {
  const normalized = String(status || 'pending').toLowerCase();
  if (normalized === 'in_progress') return 'preparing';
  if (normalized === 'completed') return 'served';
  return normalized;
};

const formatOrderId = (orderNumber, fallbackId) => {
  const rawValue = orderNumber || fallbackId || 'N/A';
  const value = String(rawValue);
  return value.startsWith('#') ? value : `#${value}`;
};

const formatTableNumber = (tableNumber) => {
  if (tableNumber === undefined || tableNumber === null || tableNumber === '') return 'N/A';
  return String(tableNumber);
};

const resolveTableNumber = (orderTable, tableNumbersById) => {
  if (orderTable && typeof orderTable === 'object') {
    if (orderTable.number !== undefined && orderTable.number !== null && orderTable.number !== '') {
      return orderTable.number;
    }
    const mapped = tableNumbersById.get(String(orderTable._id || ''));
    return mapped !== undefined ? mapped : null;
  }

  const mapped = tableNumbersById.get(String(orderTable || ''));
  if (mapped !== undefined) return mapped;
  return orderTable;
};

const isSameDay = (leftDate, rightDate) =>
  leftDate.getFullYear() === rightDate.getFullYear()
  && leftDate.getMonth() === rightDate.getMonth()
  && leftDate.getDate() === rightDate.getDate();

const buildRevenueData = (orders, locale) => {
  const today = new Date();
  const byDay = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const dayDate = new Date(today);
    dayDate.setDate(today.getDate() - offset);

    const key = dayDate.toISOString().slice(0, 10);
    byDay.push({
      key,
      name: dayDate.toLocaleDateString(locale, { weekday: 'short' }),
      revenue: 0,
    });
  }

  const dayMap = new Map(byDay.map((row) => [row.key, row]));

  for (const order of orders) {
    const createdAt = order?.createdAt ? new Date(order.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) continue;

    const key = createdAt.toISOString().slice(0, 10);
    const row = dayMap.get(key);
    if (!row) continue;

    const status = normalizeStatus(order?.status);
    if (status === 'cancelled') continue;

    row.revenue += Number(order?.totalAmount || 0);
  }

  return byDay.map(({ name, revenue }) => ({
    name,
    revenue: Number(revenue.toFixed(2)),
  }));
};

const getStatusBadge = (status, t) => {
  const labels = {
    pending: t('manager.orders.pending'),
    preparing: t('manager.orders.preparing'),
    ready: t('manager.orders.ready'),
    served: t('manager.orders.served'),
    cancelled: t('manager.orders.cancelled'),
  };

  const styles = {
    pending: 'bg-[#7c6af7]/10 text-[#7c6af7] border-[#7c6af7]/20',
    preparing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    ready: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    served: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
  };
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.pending} capitalize`}>
      {labels[status] || t('manager.orders.unknown')}
    </span>
  );
};

const DashboardPage = () => {
  const { t, i18n } = useTranslation();
  const [dashboardStats, setDashboardStats] = useState({
    totalOrdersToday: 0,
    totalRevenueToday: 0,
    occupiedTables: 0,
    pendingOrders: 0,
    totalTables: 0,
    availableTables: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    let isActive = true;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [dashboardResponse, ordersResponse, tablesResponse] = await Promise.all([
          api.get(getApiEndpoint('dashboard/stats')).catch(() => null),
          api.get(getApiEndpoint('orders')),
          api.get(getApiEndpoint('tables')),
        ]);

        if (!isActive) return;

        const dashboardData = dashboardResponse?.data || {};
        const apiTables = Array.isArray(tablesResponse?.data?.tables) ? tablesResponse.data.tables : [];
        setDashboardStats({
          totalOrdersToday: Number(dashboardData.totalOrdersToday || 0),
          totalRevenueToday: Number(dashboardData.totalRevenueToday || 0),
          occupiedTables: Number(dashboardData.occupiedTables || 0),
          pendingOrders: Number(dashboardData.pendingOrders || 0),
          totalTables: apiTables.length,
          availableTables: apiTables.filter((table) => table?.status === 'available').length,
        });

        const apiOrders = Array.isArray(ordersResponse?.data?.orders) ? ordersResponse.data.orders : [];
        const tableNumbersById = new Map(
          apiTables
            .filter((table) => table?._id)
            .map((table) => [String(table._id), table.number])
        );

        if (!dashboardResponse?.data?.success) {
          const today = new Date();
          const totalOrdersToday = apiOrders.filter((order) => {
            const createdAt = order?.createdAt ? new Date(order.createdAt) : null;
            return createdAt && !Number.isNaN(createdAt.getTime()) && isSameDay(createdAt, today);
          }).length;

          const totalRevenueToday = apiOrders
            .filter((order) => {
              const createdAt = order?.createdAt ? new Date(order.createdAt) : null;
              const status = normalizeStatus(order?.status);
              return createdAt && !Number.isNaN(createdAt.getTime()) && isSameDay(createdAt, today) && status !== 'cancelled';
            })
            .reduce((sum, order) => sum + Number(order?.totalAmount || 0), 0);

          const pendingOrders = apiOrders.filter((order) => normalizeStatus(order?.status) === 'pending').length;
          const occupiedTables = apiTables.filter((table) => table?.status === 'occupied').length;

          setDashboardStats({
            totalOrdersToday,
            totalRevenueToday: Number(totalRevenueToday.toFixed(2)),
            occupiedTables,
            pendingOrders,
            totalTables: apiTables.length,
            availableTables: apiTables.filter((table) => table?.status === 'available').length,
          });
        }

        const mappedOrders = apiOrders.slice(0, 5).map((order) => ({
          id: formatOrderId(order.orderNumber, order._id),
          table: formatTableNumber(resolveTableNumber(order?.table, tableNumbersById)),
          amount: Number(order.totalAmount || 0).toFixed(2),
          status: normalizeStatus(order.status),
        }));

        setRecentOrders(mappedOrders);
        setRevenueData(buildRevenueData(apiOrders, i18n.language));
      } catch (error) {
        if (isActive) {
          toast.error(error?.response?.data?.message || error.message);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      isActive = false;
    };
  }, [i18n.language, user?.restaurant]);

  const stats = [
    {
      title: t('manager.dashboard.totalOrdersToday'),
      value: String(dashboardStats.totalOrdersToday),
      icon: TrendingUp,
      color: 'text-[#0891b2]',
      bg: 'bg-[#0891b2]/10',
      border: 'border-[#0891b2]/20',
      trend: t('manager.dashboard.recentOrdersLoaded', { count: recentOrders.length }),
    },
    {
      title: t('manager.dashboard.revenueToday'),
      value: `${dashboardStats.totalRevenueToday.toFixed(2)} TND`,
      icon: DollarSign,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      trend: t('manager.dashboard.basedOnNonCancelled'),
    },
    {
      title: t('manager.dashboard.occupiedTables'),
      value: String(dashboardStats.occupiedTables),
      icon: LayoutGrid,
      color: 'text-[#7c6af7]',
      bg: 'bg-[#7c6af7]/10',
      border: 'border-[#7c6af7]/20',
      trend: t('manager.dashboard.availableTotal', {
        available: dashboardStats.availableTables,
        total: dashboardStats.totalTables,
      }),
    },
    {
      title: t('manager.dashboard.pendingOrders'),
      value: String(dashboardStats.pendingOrders),
      icon: Clock,
      color: 'text-pink-500',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
      trend: dashboardStats.pendingOrders > 0
        ? t('manager.dashboard.needsActionNow')
        : t('manager.dashboard.noPendingQueue'),
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
  };

  if (loading) {
    return (
      <ManagerLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#7c6af7] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-slate-100" style={{ fontFamily: "'Playfair Display', serif" }}>
            {t('manager.dashboard.title')}
          </h2>
          <div className="text-sm text-slate-400 bg-[#0d1f3c] px-4 py-2 border border-[#1e3a5f] rounded-lg">
            {new Date().toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Stats Grid */}
        <Motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Motion.div 
                key={index}
                variants={itemVariants}
                className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-2xl p-6 flex flex-col shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl border ${stat.bg} ${stat.color} ${stat.border}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-sm font-medium mb-1">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-slate-100">{stat.value}</h3>
                  <p className="text-xs text-slate-500 mt-2">{stat.trend}</p>
                </div>
              </Motion.div>
            );
          })}
        </Motion.div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders - 2 Columns wide on LG */}
          <Motion.div 
            className="lg:col-span-2 bg-[#0d1f3c] border border-[#1e3a5f] rounded-2xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-100" style={{ fontFamily: "'Playfair Display', serif" }}>{t('manager.dashboard.recentOrders')}</h3>
              <button className="text-sm text-[#7c6af7] hover:text-[#9d94fa] transition-colors">{t('manager.dashboard.viewAll')}</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1e3a5f] text-slate-400 text-sm">
                    <th className="pb-3 font-medium">{t('common.orderId')}</th>
                    <th className="pb-3 font-medium">{t('common.table')}</th>
                    <th className="pb-3 font-medium">{t('common.amount')}</th>
                    <th className="pb-3 font-medium text-right">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {recentOrders.map((order, idx) => (
                    <tr key={idx} className="border-b border-[#1e3a5f]/50 last:border-0 hover:bg-[#132845]/50 transition-colors">
                      <td className="py-4 font-medium text-slate-200">{order.id}</td>
                      <td className="py-4 text-slate-300">{order.table}</td>
                      <td className="py-4 text-slate-300">{order.amount} TND</td>
                      <td className="py-4 text-right">{getStatusBadge(order.status, t)}</td>
                    </tr>
                  ))}
                  {recentOrders.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-400">{t('manager.dashboard.noOrders')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Motion.div>

          {/* Revenue Chart - 1 Column wide on LG */}
          <Motion.div 
            className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-2xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-xl font-bold text-slate-100 mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>{t('manager.dashboard.revenue7Days')}</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    hide 
                  />
                  <Tooltip 
                    cursor={{ fill: '#132845' }}
                    contentStyle={{ backgroundColor: '#0d1f3c', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#f1f5f9' }}
                    itemStyle={{ color: '#7c6af7', fontWeight: 'bold' }}
                    formatter={(value) => [`${value} TND`, t('manager.dashboard.revenue')]}
                  />
                  <Bar dataKey="revenue" fill="#7c6af7" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Motion.div>
        </div>
      </div>
    </ManagerLayout>
  );
};

export default DashboardPage;

