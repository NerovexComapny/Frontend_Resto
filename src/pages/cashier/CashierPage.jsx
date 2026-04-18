import React, { useEffect, useMemo, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import Search from 'lucide-react/dist/esm/icons/search';
import Banknote from 'lucide-react/dist/esm/icons/banknote';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Receipt from 'lucide-react/dist/esm/icons/receipt';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Calculator from 'lucide-react/dist/esm/icons/calculator';
import Printer from 'lucide-react/dist/esm/icons/printer';
import Download from 'lucide-react/dist/esm/icons/download';
import { loadStripe } from '@stripe/stripe-js';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import { connectSocket } from '../../services/socket';
import useAuthStore from '../../store/authStore';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

const getOrdersEndpoint = () => {
  const baseURL = String(api.defaults.baseURL || '');
  return /\/api\/?$/.test(baseURL) ? '/orders' : '/api/orders';
};

const getPaymentsEndpoint = () => {
  const baseURL = String(api.defaults.baseURL || '');
  return /\/api\/?$/.test(baseURL) ? '/payments' : '/api/payments';
};

const toId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
};

const PAYABLE_ORDER_STATUSES = new Set(['ready', 'served']);

const isUnpaidPayableOrder = (order) => {
  const status = String(order?.status || '').toLowerCase();
  const paymentStatus = String(order?.paymentStatus || '').toLowerCase();

  return paymentStatus !== 'paid'
    && status !== 'cancelled'
    && PAYABLE_ORDER_STATUSES.has(status);
};

const buildPaymentStatusByOrderId = (payments) => {
  const byOrderId = new Map();

  for (const payment of payments) {
    const orderId = toId(payment?.order);
    if (!orderId) continue;

    if (!byOrderId.has(orderId)) {
      byOrderId.set(orderId, payment?.status || 'pending');
    }
  }

  return byOrderId;
};

const normalizeOrder = (order) => {
  const tableNumber = order?.table && typeof order.table === 'object'
    ? order.table.number
    : order?.table;

  const normalizedItems = Array.isArray(order?.items)
    ? order.items.map((item) => ({
        name: item?.name
          || item?.menuItem?.name?.fr
          || item?.menuItem?.name?.en
          || item?.menuItem?.name?.ar
          || 'Item',
        quantity: Number(item?.quantity || 1),
        price: Number(item?.price || 0),
      }))
    : [];

  const computedTotal = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    ...order,
    _id: toId(order?._id),
    table: { number: tableNumber ?? '-' },
    items: normalizedItems,
    totalAmount: Number(order?.totalAmount ?? computedTotal),
  };
};

const formatCurrencyTnd = (value) => `${Number(value || 0).toFixed(3)} TND`;

const buildFallbackReceiptPdfBlob = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  const pageWidth = 226.77;
  const estimatedHeight = Math.max(420, 280 + items.length * 34);
  const margin = 14;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [pageWidth, estimatedHeight],
    compress: true,
  });

  const ticketNumber = String(order?.orderNumber || order?._id || '').trim() || 'N/A';
  const tableNumber = String(order?.table?.number ?? '-');
  const printedAt = new Date().toLocaleString('fr-TN');
  const subtotal = items.reduce((sum, item) => {
    return sum + (Number(item?.price || 0) * Number(item?.quantity || 1));
  }, 0);
  const total = Number(order?.totalAmount ?? subtotal);

  let y = margin + 2;

  const centerText = (text, size = 10, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.text(String(text || ''), pageWidth / 2, y, { align: 'center' });
    y += size + 4;
  };

  const leftRightText = (left, right, size = 9, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.text(String(left || ''), margin, y);
    doc.text(String(right || ''), pageWidth - margin, y, { align: 'right' });
    y += size + 4;
  };

  const divider = () => {
    doc.setDrawColor(120);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  };

  centerText('Layali Carthage', 13, true);
  centerText('Rue Zouhour Beni Khalled', 8);
  centerText('+216 76 77 77 77', 8);
  divider();

  leftRightText('Table', tableNumber);
  leftRightText('Ticket', ticketNumber);
  leftRightText('Date', printedAt);
  divider();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Item', margin, y);
  doc.text('Qty', margin + 104, y, { align: 'right' });
  doc.text('PU', margin + 143, y, { align: 'right' });
  doc.text('Total', pageWidth - margin, y, { align: 'right' });
  y += 8;
  divider();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  items.forEach((item) => {
    const name = String(item?.name || 'Item');
    const qty = Number(item?.quantity || 1);
    const unitPrice = Number(item?.price || 0);
    const lineTotal = qty * unitPrice;
    const wrappedName = doc.splitTextToSize(name, 92);

    doc.text(wrappedName, margin, y);
    doc.text(String(qty), margin + 104, y, { align: 'right' });
    doc.text(formatCurrencyTnd(unitPrice), margin + 143, y, { align: 'right' });
    doc.text(formatCurrencyTnd(lineTotal), pageWidth - margin, y, { align: 'right' });

    y += Math.max(12, wrappedName.length * 9) + 2;
  });

  divider();
  leftRightText('Sous-total', formatCurrencyTnd(subtotal), 9);
  leftRightText('Taxe (0%)', formatCurrencyTnd(0), 9);
  leftRightText('TOTAL', formatCurrencyTnd(total), 10, true);
  divider();
  centerText('Merci pour votre visite', 9, true);
  centerText('Heureux de vous servir et de vous revoir', 8);

  return doc.output('blob');
};

const extractApiErrorMessage = async (error, fallbackMessage) => {
  const data = error?.response?.data;

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);

      if (parsed?.message) {
        return String(parsed.message);
      }
    } catch {
      // Ignore blob parsing errors and use fallback below.
    }
  }

  if (error?.response?.data?.message) {
    return String(error.response.data.message);
  }

  if (error?.message) {
    return String(error.message);
  }

  return fallbackMessage;
};

const CashierPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' or 'card'
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successOrderNumber, setSuccessOrderNumber] = useState('');
  const [lastReceiptOrder, setLastReceiptOrder] = useState(null);
  const [receiptNotice, setReceiptNotice] = useState('');
  const user = useAuthStore((state) => state.user);
  const ordersEndpoint = useMemo(() => getOrdersEndpoint(), []);
  const paymentsEndpoint = useMemo(() => getPaymentsEndpoint(), []);
  const restaurantId = useMemo(() => {
    if (user?.restaurant) return user.restaurant;

    try {
      return JSON.parse(sessionStorage.getItem('user') || 'null')?.restaurant || '';
    } catch {
      return '';
    }
  }, [user?.restaurant]);

  useEffect(() => {
    let isActive = true;

    const fetchOrdersAndPayments = async () => {
      setLoading(true);
      try {
        const [ordersResponse, paymentsResponse] = await Promise.all([
          api.get(ordersEndpoint),
          api.get(paymentsEndpoint),
        ]);

        if (!isActive) return;

        const apiOrders = Array.isArray(ordersResponse?.data?.orders)
          ? ordersResponse.data.orders
          : [];
        const apiPayments = Array.isArray(paymentsResponse?.data?.payments)
          ? paymentsResponse.data.payments
          : [];

        const paymentStatusByOrderId = buildPaymentStatusByOrderId(apiPayments);

        const payableUnpaidOrders = apiOrders
          .filter((order) => {
            const orderId = toId(order?._id);
            const paymentStatusFromOrder = String(order?.paymentStatus || '').toLowerCase();
            const paymentStatusFromPayments = String(paymentStatusByOrderId.get(orderId) || '').toLowerCase();

            if (paymentStatusFromOrder === 'paid') return false;
            if (paymentStatusFromPayments === 'completed') return false;

            return isUnpaidPayableOrder(order);
          })
          .map(normalizeOrder);

        setOrders(payableUnpaidOrders);
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

    fetchOrdersAndPayments();

    const socket = connectSocket();
    if (restaurantId) {
      socket.emit('joinRestaurant', restaurantId);
    }

    const handleOrderStatusUpdated = (data) => {
      const incomingOrder = data?.order;
      if (!incomingOrder?._id) return;

      const incomingId = toId(incomingOrder._id);

      const incomingStatus = String(incomingOrder?.status || '').toLowerCase();
      const incomingPaymentStatus = String(incomingOrder?.paymentStatus || '').toLowerCase();
      const shouldRemoveFromCashierQueue = incomingPaymentStatus === 'paid'
        || incomingStatus === 'cancelled'
        || !PAYABLE_ORDER_STATUSES.has(incomingStatus);

      if (shouldRemoveFromCashierQueue) {
        setOrders((prev) => prev.filter((order) => order._id !== incomingId));
        setSelectedOrder((prev) => (prev?._id === incomingId ? null : prev));
        return;
      }

      const incoming = normalizeOrder(incomingOrder);
      setOrders((prev) => [incoming, ...prev.filter((order) => order._id !== incoming._id)]);
    };

    const handlePaymentCompleted = (data) => {
      const paidOrderId = toId(data?.order?._id || data?.payment?.order);
      if (!paidOrderId) return;

      setOrders((prev) => prev.filter((order) => order._id !== paidOrderId));
      setSelectedOrder((prev) => (prev?._id === paidOrderId ? null : prev));
    };

    socket.on('orderStatusUpdated', handleOrderStatusUpdated);
    socket.on('order_updated', handleOrderStatusUpdated);
    socket.on('paymentCompleted', handlePaymentCompleted);

    return () => {
      isActive = false;
      socket.off('orderStatusUpdated', handleOrderStatusUpdated);
      socket.off('order_updated', handleOrderStatusUpdated);
      socket.off('paymentCompleted', handlePaymentCompleted);
    };
  }, [ordersEndpoint, paymentsEndpoint, restaurantId]);

  useEffect(() => {
    if (!selectedOrder) return;
    if (showSuccess) return;

    const refreshedOrder = orders.find((order) => order._id === selectedOrder._id);
    if (!refreshedOrder) {
      setSelectedOrder(null);
      return;
    }

    if (refreshedOrder !== selectedOrder) {
      setSelectedOrder(refreshedOrder);
    }
  }, [orders, selectedOrder, showSuccess]);

  const filteredOrders = orders.filter((order) => {
    const normalizedQuery = String(searchQuery || '').toLowerCase();
    const normalizedOrderNumber = String(order?.orderNumber || '').toLowerCase();
    const normalizedTableNumber = String(order?.table?.number || '');

    return normalizedOrderNumber.includes(normalizedQuery)
      || normalizedTableNumber.includes(normalizedQuery);
  });

  const fetchReceiptPdfBlob = async (order) => {
    const orderId = order?._id;
    if (!orderId) {
      throw new Error('Order ID is required to export receipt');
    }

    try {
      const response = await api.get(`${paymentsEndpoint}/order/${orderId}/receipt/pdf`, {
        responseType: 'blob',
        suppressGlobalErrorToast: true,
      });

      return response.data;
    } catch (error) {
      const message = await extractApiErrorMessage(error, 'Unable to export receipt');
      const isRouteMissing = error?.response?.status === 404 && /route\s+.+\s+not\s+found/i.test(message);

      if (!isRouteMissing) {
        throw error;
      }

      return buildFallbackReceiptPdfBlob(order);
    }
  };

  const buildReceiptFileName = (order) => {
    const reference = String(order?.orderNumber || order?._id || 'receipt').replace(/[^a-z0-9-_]/gi, '_');
    return `facture-${reference}.pdf`;
  };

  const downloadReceiptPdfForOrder = async (order) => {
    if (!order?._id) return;

    const blob = await fetchReceiptPdfBlob(order);
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = buildReceiptFileName(order);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const openReceiptPrintPreview = async (order) => {
    if (!order?._id) return;

    const blob = await fetchReceiptPdfBlob(order);
    const blobUrl = URL.createObjectURL(blob);
    const printWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      URL.revokeObjectURL(blobUrl);
      throw new Error('Popup blocked. Please allow popups to print receipts.');
    }
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  };

  const handleReceiptPdfDownload = async (order) => {
    try {
      await downloadReceiptPdfForOrder(order);
      setReceiptNotice('Facture exportee en PDF.');
    } catch (error) {
      const message = await extractApiErrorMessage(error, 'Unable to export receipt');
      setReceiptNotice('Export facture indisponible pour le moment.');
      toast.error(message);
    }
  };

  const handleReceiptPrint = async (order) => {
    try {
      await openReceiptPrintPreview(order);
      setReceiptNotice('Apercu impression ouvert.');
    } catch (error) {
      const message = await extractApiErrorMessage(error, 'Unable to print receipt');
      setReceiptNotice('Impression indisponible pour le moment.');
      toast.error(message);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedOrder) return;
    setIsProcessing(true);
    const paidOrder = selectedOrder;

    try {
      if (paymentMethod === 'cash') {
        const cashInitResponse = await api.post(`${paymentsEndpoint}/cash`, {
          orderId: paidOrder._id,
        });
        const paymentId = cashInitResponse?.data?.payment?._id;

        if (!paymentId) {
          throw new Error('Unable to create cash payment');
        }

        await api.post(`${paymentsEndpoint}/cash/confirm`, {
          paymentId,
        });
      } else {
        const cardInitResponse = await api.post(`${paymentsEndpoint}/card`, {
          orderId: paidOrder._id,
        });

        const clientSecret = cardInitResponse?.data?.clientSecret;
        if (!clientSecret) {
          throw new Error('Unable to initiate card payment');
        }

        if (!stripePromise) {
          throw new Error('Stripe publishable key is missing');
        }

        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error('Stripe failed to initialize');
        }

        const stripeResult = await stripe.confirmCardPayment(clientSecret, {
          payment_method: 'pm_card_visa',
        });

        if (stripeResult.error) {
          throw stripeResult.error;
        }

        const paymentIntentId = stripeResult?.paymentIntent?.id;
        if (!paymentIntentId) {
          throw new Error('Card confirmation did not return payment intent');
        }

        await api.post(`${paymentsEndpoint}/card/confirm`, {
          paymentIntentId,
        });
      }

      setIsProcessing(false);
      setSuccessOrderNumber(paidOrder.orderNumber);
      setShowSuccess(true);
      setLastReceiptOrder(paidOrder);

      try {
        await downloadReceiptPdfForOrder(paidOrder);
        setReceiptNotice('Facture exportee automatiquement en PDF.');
      } catch (error) {
        const message = await extractApiErrorMessage(error, 'Unable to export receipt');
        setReceiptNotice('Paiement confirme. Export facture indisponible pour le moment.');
        toast.error(message);
      }

      // Cleanup after success
      setTimeout(() => {
        setOrders(prev => prev.filter(o => o._id !== paidOrder._id));
        setSelectedOrder(null);
        setShowSuccess(false);
        setSuccessOrderNumber('');
        setPaymentMethod('cash');
      }, 3500);
    } catch (error) {
      setIsProcessing(false);
      setShowSuccess(false);
      setSuccessOrderNumber('');
      setReceiptNotice('');
      toast.error(error?.response?.data?.message || error?.message || 'Payment confirmation failed');
    }
  };

  return (
    <div className="h-screen w-full bg-[#0a1628] text-slate-100 flex flex-col font-sans overflow-hidden">
      
      {/* Top Header */}
      <header className="h-20 bg-[#0d1f3c] border-b border-[#1e3a5f] px-6 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#7c6af7]/20 text-[#7c6af7] rounded-xl">
            <Calculator className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-wide text-slate-100" style={{ fontFamily: "'Playfair Display', serif" }}>
            Point of Sale
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-slate-400 font-medium">Pending Payments:</span>
          <span className="bg-[#132845] border border-[#1e3a5f] text-[#7c6af7] font-bold px-4 py-1.5 rounded-lg text-lg shadow-inner">
            {orders.length}
          </span>
        </div>
      </header>

      {/* Main Terminal Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        
        {/* --- LEFT PANEL (60%) --- */}
        <section className="w-full lg:w-[60%] flex flex-col h-auto lg:h-full lg:border-r border-[#1e3a5f] bg-[#0a1628]">
          
          <div className="p-6 shrink-0 border-b border-[#132845]">
            <h2 className="text-xl font-bold text-slate-200 mb-4 tracking-wider uppercase">Active Orders</h2>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search by order number or table..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 placeholder-slate-500 outline-none focus:ring-1 focus:ring-[#7c6af7] focus:border-[#7c6af7] transition-all font-medium text-lg shadow-inner"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-10 h-10 border-4 border-[#7c6af7]/30 border-t-[#7c6af7] rounded-full mb-4"
                />
                <p className="text-base font-semibold uppercase tracking-widest">Loading Payable Orders...</p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredOrders.map(order => {
                const isSelected = selectedOrder?._id === order._id;
                const itemsSummary = order.items.map(i => i.name).join(', ');

                return (
                  <Motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={order._id}
                    onClick={() => setSelectedOrder(order)}
                    className={"cursor-pointer group flex items-center justify-between p-4 text-base rounded-2xl border-2 transition-all duration-200 " + (isSelected ? "bg-[#132845] border-[#7c6af7] shadow-[0_0_20px_rgba(124, 106, 247, 0.2)]" : "bg-[#0d1f3c] border-[#1e3a5f] hover:border-slate-600")}
                  >
                    <div className="flex items-center space-x-6">
                      <div className={"w-14 h-14 rounded-xl flex items-center justify-center font-bold text-2xl " + (isSelected ? "bg-[#7c6af7] text-[#0d1f3c]" : "bg-[#132845] text-[#7c6af7]")}>
                        {order.table.number}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-100 font-mono tracking-widest">{order.orderNumber}</h3>
                        <p className="text-slate-500 text-sm mt-1 max-w-sm truncate">{order.items.length} items: {itemsSummary}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-sm text-slate-500 font-medium uppercase tracking-widest mb-1">Total</p>
                        <p className={"text-2xl font-bold " + (isSelected ? "text-[#7c6af7]" : "text-emerald-400")}>
                          {order.totalAmount.toFixed(2)} TND
                        </p>
                      </div>
                      <div className={"p-2 rounded-full transition-transform " + (isSelected ? "bg-[#7c6af7]/20 text-[#7c6af7] translate-x-1" : "bg-[#132845] text-slate-600 group-hover:text-slate-400")}>
                        <ArrowRight className="w-6 h-6" />
                      </div>
                    </div>
                  </Motion.div>
                );
                })}
              </AnimatePresence>
            )}

            {!loading && filteredOrders.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 mt-20">
                <Receipt className="w-16 h-16 mb-4" />
                <p className="text-xl font-bold uppercase tracking-widest">No unpaid orders awaiting payment</p>
              </div>
            )}
          </div>
        </section>

        {/* --- RIGHT PANEL (40%) --- */}
        <section className={`w-full lg:w-[40%] bg-[#0d1f3c] flex-col h-auto lg:h-full shadow-2xl relative ${selectedOrder ? 'flex' : 'hidden lg:flex'}`}>
          
          {/* Success Overlay */}
          <AnimatePresence>
            {showSuccess && (
              <Motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-emerald-500/95 backdrop-blur-md flex flex-col items-center justify-center text-white"
              >
                <Motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                  className="bg-white text-emerald-500 rounded-full p-4 mb-6 shadow-2xl"
                >
                  <CheckCircle2 className="w-20 h-20" />
                </Motion.div>
                <h2 className="text-4xl font-extrabold tracking-wide mb-2">Payment Successful</h2>
                <p className="text-emerald-100 text-xl font-mono opacity-90">{successOrderNumber || selectedOrder?.orderNumber}</p>
                <p className="mt-3 text-emerald-50 text-sm font-medium">{receiptNotice}</p>

                {lastReceiptOrder && (
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => handleReceiptPrint(lastReceiptOrder)}
                      className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 border border-white/40 text-white text-sm font-bold tracking-wide flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      Print Receipt
                    </button>
                    <button
                      onClick={() => handleReceiptPdfDownload(lastReceiptOrder)}
                      className="px-4 py-2 rounded-lg bg-white text-emerald-600 hover:bg-emerald-50 border border-white text-sm font-bold tracking-wide flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export PDF
                    </button>
                  </div>
                )}
              </Motion.div>
            )}
          </AnimatePresence>

          {!selectedOrder ? (
            // Empty State
            <div className="h-full flex flex-col items-center justify-center text-slate-600 border-l border-[#1e3a5f] opacity-50">
              <Calculator className="w-24 h-24 mb-6 stroke-[1.5]" />
              <h2 className="text-2xl font-bold tracking-widest uppercase">Select an Order</h2>
            </div>
          ) : (
            // Selected Order Details
            <div className="flex flex-col h-full">
              
              {/* Receipt Header */}
              <div className="p-6 bg-[#132845] shrink-0 border-b border-[#1e3a5f]">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-2xl font-bold text-slate-100 font-mono">{selectedOrder.orderNumber}</h2>
                  <span className="px-3 py-1 bg-[#7c6af7]/20 text-[#7c6af7] border border-[#7c6af7]/30 rounded-lg text-sm font-bold tracking-wider">
                    TABLE {selectedOrder.table.number}
                  </span>
                </div>
                <p className="text-slate-400 font-medium">Please review items prior to payment.</p>
              </div>

              {/* Items Summary (Scrollable) */}
              <div className="flex-1 p-6 overflow-y-auto no-scrollbar border-b border-[#1e3a5f]">
                <table className="w-full text-left">
                  <thead className="text-slate-500 text-sm border-b border-[#1e3a5f]">
                    <tr>
                      <th className="pb-3 font-semibold uppercase tracking-wider">Item</th>
                      <th className="pb-3 font-semibold uppercase tracking-wider text-center">Qty</th>
                      <th className="pb-3 font-semibold uppercase tracking-wider text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e3a5f]/50">
                    {selectedOrder.items.map((item, idx) => (
                      <tr key={idx} className="group">
                        <td className="py-4 font-bold text-slate-200 text-lg group-hover:text-[#7c6af7] transition-colors">{item.name}</td>
                        <td className="py-4 font-medium text-slate-400 text-center text-lg">{item.quantity}</td>
                        <td className="py-4 font-bold text-slate-300 text-right tracking-wider">{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Payment Actions (Bottom Fixed) */}
              <div className="p-6 bg-[#0a1628] shrink-0">
                {/* Total */}
                <div className="flex justify-between items-end mb-8 bg-[#132845] p-5 rounded-2xl border border-[#1e3a5f]">
                  <span className="text-slate-400 text-lg font-bold uppercase tracking-widest">Total Due</span>
                  <span className="text-3xl md:text-5xl font-black text-[#7c6af7] drop-shadow-[0_0_15px_rgba(124, 106, 247, 0.2)]" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {selectedOrder.totalAmount.toFixed(2)} TND
                  </span>
                </div>

                {/* Method Toggles */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button 
                    onClick={() => setPaymentMethod('cash')}
                    className={"flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all " + (paymentMethod === 'cash' ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "bg-[#132845] border-[#1e3a5f] text-slate-400 hover:border-slate-500")}
                  >
                    <Banknote className="w-8 h-8 mb-2" />
                    <span className="font-bold tracking-widest text-sm uppercase">Cash Payment</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod('card')}
                    className={"flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all " + (paymentMethod === 'card' ? "bg-blue-500/10 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]" : "bg-[#132845] border-[#1e3a5f] text-slate-400 hover:border-slate-500")}
                  >
                    <CreditCard className="w-8 h-8 mb-2" />
                    <span className="font-bold tracking-widest text-sm uppercase">Card Payment</span>
                  </button>
                </div>

                {/* Confirm Button */}
                <button 
                  onClick={handleConfirmPayment}
                  disabled={isProcessing}
                  className="w-full bg-[#7c6af7] hover:bg-[#6557e0] text-[#0d1f3c] font-extrabold text-lg md:text-2xl py-4 md:py-6 rounded-2xl shadow-[0_0_20px_rgba(124, 106, 247, 0.2)] active:scale-[0.98] transition-all flex justify-center items-center gap-3 disabled:opacity-70 disabled:active:scale-100 disabled:cursor-not-allowed uppercase tracking-widest"
                >
                  {isProcessing ? (
                    <Motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-8 h-8 border-4 border-[#0d1f3c]/30 border-t-[#0d1f3c] rounded-full"
                    />
                  ) : (
                    <span>Confirm Payment</span>
                  )}
                </button>

              </div>
            </div>
          )}

        </section>
      </div>

    </div>
  );
};

export default CashierPage;


