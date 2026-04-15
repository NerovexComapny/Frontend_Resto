import React, { useEffect, useMemo, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import ShoppingBag from 'lucide-react/dist/esm/icons/shopping-bag';
import DollarSign from 'lucide-react/dist/esm/icons/dollar-sign';
import Clock from 'lucide-react/dist/esm/icons/clock';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import ManagerLayout from '../../layouts/ManagerLayout';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const getReportsBasePath = () => {
  const baseURL = String(api.defaults.baseURL || '');
  return /\/api\/?$/.test(baseURL) ? '/reports' : '/api/reports';
};

const formatTime = (value) => {
  if (!value) return '--:--';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// --- COMPONENTS ---
const StatCard = ({ title, value, icon, colorClass }) => {
  const iconNode = icon ? React.createElement(icon, { className: 'w-5 h-5' }) : null;

  return (
    <div className="bg-[#132845] border border-[#1e3a5f] rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-400 font-medium">{title}</h3>
        <div className={`p-2 rounded-xl ${colorClass}`}>
          {iconNode}
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-100" style={{ fontFamily: "'Playfair Display', serif" }}>
        {value}
      </div>
    </div>
  );
};

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailySummary, setDailySummary] = useState({ totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 });
  const [dailyOrders, setDailyOrders] = useState([]);
  const [weeklySummary, setWeeklySummary] = useState({ totalOrders: 0, totalRevenue: 0 });
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const reportsBasePath = useMemo(() => getReportsBasePath(), []);

  const DAILY_SUMMARY = dailySummary;
  const DAILY_ORDERS = dailyOrders;
  const WEEKLY_SUMMARY = weeklySummary;
  const WEEKLY_DATA = weeklyData;
  const MONTHLY_DATA = monthlyData;
  const TOP_ITEMS = topItems;
  const PEAK_HOURS = peakHours;

  useEffect(() => {
    let isActive = true;

    const fetchDailyReport = async () => {
      try {
        setLoadingDaily(true);

        const response = await api.get(`${reportsBasePath}/daily`, {
          params: { date: selectedDate },
        });

        if (!isActive) return;

        const totalOrders = Number(response?.data?.totalOrders || 0);
        const totalRevenue = Number(response?.data?.totalRevenue || 0);
        const averageOrderValue = Number(response?.data?.averageOrderValue || 0);
        const orders = Array.isArray(response?.data?.orders) ? response.data.orders : [];

        setDailySummary({ totalOrders, totalRevenue, averageOrderValue });
        setDailyOrders(
          orders.map((order, index) => ({
            id: order?.orderNumber || `ORD-${index + 1}`,
            table: order?.table != null ? String(order.table) : '-',
            amount: Number(order?.totalAmount || 0),
            status: order?.status || 'pending',
            time: formatTime(order?.createdAt),
          }))
        );
      } catch (error) {
        if (isActive) {
          toast.error(error.response?.data?.message || error.message);
        }
      } finally {
        if (isActive) {
          setLoadingDaily(false);
        }
      }
    };

    fetchDailyReport();

    return () => {
      isActive = false;
    };
  }, [reportsBasePath, selectedDate]);

  useEffect(() => {
    let isActive = true;

    const fetchWeeklyReport = async () => {
      try {
        setLoadingWeekly(true);

        const response = await api.get(`${reportsBasePath}/weekly`);
        if (!isActive) return;

        const report = Array.isArray(response?.data?.report) ? response.data.report : [];
        const mappedWeeklyData = report.map((row) => ({
          day: row?.date || '-',
          revenue: Number(row?.totalRevenue || 0),
        }));

        const totalOrders = report.reduce((sum, row) => sum + Number(row?.totalOrders || 0), 0);
        const totalRevenue = report.reduce((sum, row) => sum + Number(row?.totalRevenue || 0), 0);

        setWeeklyData(mappedWeeklyData);
        setWeeklySummary({ totalOrders, totalRevenue });
      } catch (error) {
        if (isActive) {
          toast.error(error.response?.data?.message || error.message);
        }
      } finally {
        if (isActive) {
          setLoadingWeekly(false);
        }
      }
    };

    fetchWeeklyReport();

    return () => {
      isActive = false;
    };
  }, [reportsBasePath]);

  useEffect(() => {
    let isActive = true;

    const fetchMonthlyReport = async () => {
      try {
        setLoadingMonthly(true);

        const [monthlyResponse, topItemsResponse, peakHoursResponse] = await Promise.all([
          api.get(`${reportsBasePath}/monthly`),
          api.get(`${reportsBasePath}/top-items`),
          api.get(`${reportsBasePath}/peak-hours`),
        ]);

        if (!isActive) return;

        const monthlyReport = Array.isArray(monthlyResponse?.data?.report)
          ? monthlyResponse.data.report
          : [];
        const topItemsReport = Array.isArray(topItemsResponse?.data?.topItems)
          ? topItemsResponse.data.topItems
          : [];
        const peakHoursReport = Array.isArray(peakHoursResponse?.data?.hours)
          ? peakHoursResponse.data.hours
          : [];

        setMonthlyData(
          monthlyReport.map((row) => ({
            date: row?.date || '-',
            revenue: Number(row?.totalRevenue || 0),
          }))
        );

        setTopItems(
          topItemsReport.map((item) => ({
            name: item?.itemName || 'Unknown item',
            qty: Number(item?.totalQuantity || 0),
            revenue: Number(item?.totalRevenue || 0),
          }))
        );

        setPeakHours(
          peakHoursReport.map((row) => ({
            hour: `${row?.hour ?? 0}:00`,
            orders: Number(row?.totalOrders || 0),
          }))
        );
      } catch (error) {
        if (isActive) {
          toast.error(error.response?.data?.message || error.message);
        }
      } finally {
        if (isActive) {
          setLoadingMonthly(false);
        }
      }
    };

    fetchMonthlyReport();

    return () => {
      isActive = false;
    };
  }, [reportsBasePath]);

  const exportRange = useMemo(() => {
    if (activeTab === 'daily') {
      return {
        startDate: selectedDate,
        endDate: selectedDate,
      };
    }

    if (activeTab === 'weekly' && WEEKLY_DATA.length > 0) {
      return {
        startDate: WEEKLY_DATA[0].day,
        endDate: WEEKLY_DATA[WEEKLY_DATA.length - 1].day,
      };
    }

    if (activeTab === 'monthly' && MONTHLY_DATA.length > 0) {
      return {
        startDate: MONTHLY_DATA[0].date,
        endDate: MONTHLY_DATA[MONTHLY_DATA.length - 1].date,
      };
    }

    return {
      startDate: selectedDate,
      endDate: selectedDate,
    };
  }, [activeTab, selectedDate, WEEKLY_DATA, MONTHLY_DATA]);

  const handleExport = async (format) => {
    const isPdf = format === 'pdf';
    const endpoint = isPdf ? 'pdf' : 'excel';

    try {
      if (isPdf) {
        setIsExportingPdf(true);
      } else {
        setIsExportingExcel(true);
      }

      const response = await api.get(`${reportsBasePath}/export/${endpoint}`, {
        params: {
          startDate: exportRange.startDate,
          endDate: exportRange.endDate,
        },
        responseType: 'blob',
      });

      const mimeType = isPdf
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      const blob = new Blob([response.data], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = isPdf ? 'orders.pdf' : 'orders.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      if (isPdf) {
        setIsExportingPdf(false);
      } else {
        setIsExportingExcel(false);
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } }
  };

  const renderDaily = () => (
    <Motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-[#132845] border border-[#1e3a5f] p-4 rounded-2xl">
        <div className="flex items-center space-x-3">
          <Calendar className="text-[#7c6af7] w-5 h-5" />
          <span className="text-slate-300 font-medium">Select Date:</span>
        </div>
        <input 
          type="date" 
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-auto bg-[#0d1f3c] border border-[#1e3a5f] rounded-xl px-4 py-2 text-slate-200 outline-none focus:border-[#7c6af7] focus:ring-1 focus:ring-[#7c6af7] transition-colors"
        />
      </div>

      {loadingDaily && (
        <div className="bg-[#132845] border border-[#1e3a5f] p-4 rounded-2xl text-slate-300 text-sm">
          Loading daily report...
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <StatCard title="Total Orders" value={DAILY_SUMMARY.totalOrders} icon={ShoppingBag} colorClass="bg-blue-500/10 text-blue-500" />
        <StatCard title="Total Revenue" value={`${DAILY_SUMMARY.totalRevenue.toFixed(2)} TND`} icon={DollarSign} colorClass="bg-emerald-500/10 text-emerald-500" />
        <StatCard title="Avg Order Value" value={`${DAILY_SUMMARY.averageOrderValue.toFixed(2)} TND`} icon={TrendingUp} colorClass="bg-purple-500/10 text-purple-500" />
      </div>

      <div className="bg-[#132845] border border-[#1e3a5f] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[#1e3a5f]">
          <h3 className="text-xl font-bold text-slate-100" style={{ fontFamily: "'Playfair Display', serif" }}>Orders List</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-[#0d1f3c] text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-3 md:px-6 py-4 font-semibold">Order</th>
                <th className="px-3 md:px-6 py-4 font-semibold">Table</th>
                <th className="px-3 md:px-6 py-4 font-semibold">Amount</th>
                <th className="px-3 md:px-6 py-4 font-semibold">Status</th>
                <th className="hidden md:table-cell px-3 md:px-6 py-4 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e3a5f]">
              {DAILY_ORDERS.map((order, i) => (
                <Motion.tr 
                  key={order.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="hover:bg-[#0d1f3c]/50 transition-colors"
                >
                  <td className="px-3 md:px-6 py-4 font-medium text-slate-200">{order.id}</td>
                  <td className="px-3 md:px-6 py-4 text-slate-400">{order.table}</td>
                  <td className="px-3 md:px-6 py-4 font-semibold text-emerald-400">{order.amount.toFixed(2)} TND</td>
                  <td className="px-3 md:px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      order.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                      order.status === 'preparing' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-[#7c6af7]/10 text-[#7c6af7]'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-3 md:px-6 py-4 text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span>{order.time}</span>
                  </td>
                </Motion.tr>
              ))}
              {DAILY_ORDERS.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 md:px-6 py-8 text-center text-slate-400">
                    No orders for this date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Motion.div>
  );

  const renderWeekly = () => (
    <Motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {loadingWeekly && (
        <div className="bg-[#132845] border border-[#1e3a5f] p-4 rounded-2xl text-slate-300 text-sm">
          Loading weekly report...
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <StatCard title="Total Orders (This Week)" value={WEEKLY_SUMMARY.totalOrders} icon={ShoppingBag} colorClass="bg-blue-500/10 text-blue-500" />
        <StatCard title="Total Revenue (This Week)" value={`${WEEKLY_SUMMARY.totalRevenue.toFixed(2)} TND`} icon={DollarSign} colorClass="bg-emerald-500/10 text-emerald-500" />
      </div>

      <div className="bg-[#132845] border border-[#1e3a5f] rounded-2xl p-6">
        <h3 className="text-xl font-bold text-slate-100 mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>Revenue - Last 7 Days</h3>
        <div className="h-48 sm:h-64 md:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={WEEKLY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
              <XAxis dataKey="day" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val} T`} />
              <RechartsTooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: '#0d1f3c', borderColor: '#1e3a5f', borderRadius: '0.75rem', color: '#f8fafc' }}
                itemStyle={{ color: '#7c6af7', fontWeight: 'bold' }}
              />
              <Bar dataKey="revenue" fill="#7c6af7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Motion.div>
  );

  const renderMonthly = () => (
    <Motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {loadingMonthly && (
        <div className="bg-[#132845] border border-[#1e3a5f] p-4 rounded-2xl text-slate-300 text-sm">
          Loading monthly report...
        </div>
      )}

      <div className="bg-[#132845] border border-[#1e3a5f] rounded-2xl p-6">
        <h3 className="text-xl font-bold text-slate-100 mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>Revenue - Last 30 Days</h3>
        <div className="h-48 sm:h-64 md:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={MONTHLY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={30} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val} T`} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#0d1f3c', borderColor: '#1e3a5f', borderRadius: '0.75rem', color: '#f8fafc' }}
                itemStyle={{ color: '#7c6af7', fontWeight: 'bold' }}
              />
              <Line type="monotone" dataKey="revenue" stroke="#7c6af7" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#7c6af7', stroke: '#0d1f3c', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#132845] border border-[#1e3a5f] rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-[#1e3a5f]">
            <h3 className="text-xl font-bold text-slate-100" style={{ fontFamily: "'Playfair Display', serif" }}>Top 5 Items</h3>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-[#0d1f3c] text-slate-400 uppercase text-xs">
                <tr>
                  <th className="px-3 md:px-6 py-4">Item Name</th>
                  <th className="hidden md:table-cell px-3 md:px-6 py-4">Qty Sold</th>
                  <th className="px-3 md:px-6 py-4">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e3a5f]">
                {TOP_ITEMS.map((item, i) => (
                  <tr key={i} className="hover:bg-[#0d1f3c]/50">
                    <td className="px-3 md:px-6 py-4 font-medium text-slate-200">{item.name}</td>
                    <td className="hidden md:table-cell px-3 md:px-6 py-4 text-slate-400">{item.qty}</td>
                    <td className="px-3 md:px-6 py-4 font-semibold text-emerald-400">{item.revenue.toFixed(2)} TND</td>
                  </tr>
                ))}
                {TOP_ITEMS.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 md:px-6 py-8 text-center text-slate-400">
                      No item sales data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#132845] border border-[#1e3a5f] rounded-2xl p-6">
          <h3 className="text-xl font-bold text-slate-100 mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>Peak Hours</h3>
          <div className="h-48 sm:h-64 md:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PEAK_HOURS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" vertical={false} />
                <XAxis dataKey="hour" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#0d1f3c', borderColor: '#1e3a5f', borderRadius: '0.75rem', color: '#f8fafc' }}
                  itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                />
                <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Motion.div>
  );

  return (
    <ManagerLayout>
      <div className="space-y-8">
        
        {/* Header & Exports */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-100" style={{ fontFamily: "'Playfair Display', serif" }}>
              Reports & Analytics
            </h2>
            <p className="text-slate-400 mt-1">Review your business performance</p>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExportingPdf}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#7c6af7]/10 hover:bg-[#7c6af7]/20 text-[#7c6af7] border border-[#7c6af7]/20 px-4 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-60"
            >
              <FileText className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={() => handleExport('excel')}
              disabled={isExportingExcel}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#7c6af7] hover:bg-[#6557e0] text-[#0d1f3c] px-4 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-60"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 bg-[#132845] p-1.5 rounded-xl w-full sm:w-fit border border-[#1e3a5f]">
          {['daily', 'weekly', 'monthly'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-semibold capitalize transition-all ${
                activeTab === tab 
                  ? 'bg-[#1e3a5f] text-[#7c6af7] shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e3a5f]/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Dynamic Content */}
        <AnimatePresence mode="wait">
          <Motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'daily' && renderDaily()}
            {activeTab === 'weekly' && renderWeekly()}
            {activeTab === 'monthly' && renderMonthly()}
          </Motion.div>
        </AnimatePresence>

      </div>
    </ManagerLayout>
  );
};

export default ReportsPage;


