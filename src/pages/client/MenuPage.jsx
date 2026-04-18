import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import Search from 'lucide-react/dist/esm/icons/search';
import ShoppingCart from 'lucide-react/dist/esm/icons/shopping-cart';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Minus from 'lucide-react/dist/esm/icons/minus';
import CreditCard from 'lucide-react/dist/esm/icons/credit-card';
import Banknote from 'lucide-react/dist/esm/icons/banknote';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Clock from 'lucide-react/dist/esm/icons/clock';
import ChefHat from 'lucide-react/dist/esm/icons/chef-hat';
import Utensils from 'lucide-react/dist/esm/icons/utensils';
import X from 'lucide-react/dist/esm/icons/x';
import Store from 'lucide-react/dist/esm/icons/store';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { publicApi } from '../../services/api';
import { getSocket, connectSocket } from '../../services/socket';
import { toast } from 'react-hot-toast';
import backgroundImg from '../../assets/background.png';
import logo from '../../assets/logo.webp';


const DEFAULT_MENU_CATEGORY_ID = 'all';
const DEFAULT_CLIENT_INACTIVITY_TIMEOUT_MS = 15000;
const configuredClientTimeoutMs = Number(import.meta.env.VITE_CLIENT_INACTIVITY_TIMEOUT_MS);
const CLIENT_INACTIVITY_TIMEOUT_MS = Number.isFinite(configuredClientTimeoutMs) && configuredClientTimeoutMs > 0
  ? configuredClientTimeoutMs
  : DEFAULT_CLIENT_INACTIVITY_TIMEOUT_MS;
const CLIENT_ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll'];

const getDefaultMenuCategory = (t) => ({
  id: DEFAULT_MENU_CATEGORY_ID,
  name: t('common.all'),
  nameAr: t('common.all'),
});

const MONGO_ID_REGEX = /^[a-f\d]{24}$/i;

const getOrdersEndpoint = () => {
  const baseURL = String(publicApi.defaults.baseURL || '');
  return /\/api\/?$/.test(baseURL) ? '/orders' : '/api/orders';
};

const getTableReleaseEndpoint = (tableId) => {
  const baseURL = String(publicApi.defaults.baseURL || '');
  const normalizedTableId = String(tableId || '').trim();
  if (!normalizedTableId) {
    return '';
  }

  const path = `/tables/${normalizedTableId}/release`;
  return /\/api\/?$/.test(baseURL) ? path : `/api${path}`;
};

const pickLocalizedText = (value, fallback = '') => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    return value.fr || value.en || value.ar || fallback;
  }
  return fallback;
};

const normalizeMenuCategory = (category) => ({
  id: String(category?._id || category?.id || ''),
  name: pickLocalizedText(category?.name, 'Category'),
  nameAr: category?.name?.ar || '',
});

const normalizeMenuItem = (item) => ({
  _id: String(item?._id || item?.id || ''),
  name: pickLocalizedText(item?.name, 'Item'),
  nameAr: item?.name?.ar || '',
  price: Number(item?.price || 0),
  category: String(item?.category?._id || item?.category || ''),
  image: item?.image || '',
  isAvailable: item?.isAvailable !== false,
});

const toId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
};

const MenuPage = () => {
  console.log('MENU PAGE RENDERED');
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const tableId = resolveClientTableId(searchParams);
  const restaurantQueryValue = String(searchParams.get('restaurant') || '').trim();
  const restaurantIdQueryValue = String(searchParams.get('restaurantId') || restaurantQueryValue || '').trim();
  const [tableNumber, setTableNumber] = useState(tableId || '--');
  const [restaurantName, setRestaurantName] = useState(
    restaurantQueryValue && !MONGO_ID_REGEX.test(restaurantQueryValue)
      ? restaurantQueryValue
      : t('common.appName')
  );
  const [restaurantId, setRestaurantId] = useState(
    MONGO_ID_REGEX.test(restaurantIdQueryValue) ? restaurantIdQueryValue : ''
  );
  const [isResolvingTable, setIsResolvingTable] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const ordersEndpoint = getOrdersEndpoint();

  useEffect(() => {
    let isMounted = true;

    const resolveTableNumber = async () => {
      if (!tableId) {
        if (isMounted) {
          setTableNumber('--');
          setIsResolvingTable(false);
        }
        return;
      }

      if (/^\d+$/.test(String(tableId))) {
        if (isMounted) {
          setTableNumber(String(tableId));
          setIsResolvingTable(false);
        }
        return;
      }

      try {
        const response = await publicApi.get(`/tables/qr/${tableId}`);
        const table = response?.data?.table;
        const number = response?.data?.table?.number;
        const restaurant = table?.restaurant;

        if (isMounted) {
          setTableNumber(number !== undefined && number !== null ? String(number) : String(tableId));

          if (restaurant && typeof restaurant === 'object') {
            if (restaurant?._id) {
              setRestaurantId(String(restaurant._id));
            }
            if (restaurant?.name) {
              setRestaurantName(String(restaurant.name));
            }
          } else if (MONGO_ID_REGEX.test(String(restaurant || ''))) {
            setRestaurantId(String(restaurant));
          }
        }
      } catch {
        if (isMounted) {
          setTableNumber(String(tableId));
        }
      } finally {
        if (isMounted) {
          setIsResolvingTable(false);
        }
      }
    };

    resolveTableNumber();

    return () => {
      isMounted = false;
    };
  }, [tableId]);

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState('');
  const [trackedOrderId, setTrackedOrderId] = useState('');
  const [trackedOrderStatus, setTrackedOrderStatus] = useState('received');
  const [trackedOrderDetails, setTrackedOrderDetails] = useState('');
  const [menuCategories, setMenuCategories] = useState([getDefaultMenuCategory(t)]);
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const lastStatusRef = useRef('');
  const lastClientActivityRef = useRef(Date.now());
  const filterBarRef = useRef(null);
  const menuGridRef = useRef(null);
  const orderSteps = useMemo(
    () => [
      { id: 'received', label: t('clientMenu.received'), icon: Clock },
      { id: 'preparing', label: t('clientMenu.preparing'), icon: ChefHat },
      { id: 'ready', label: t('clientMenu.ready'), icon: Utensils },
      { id: 'served', label: t('clientMenu.service'), icon: ShoppingCart },
    ],
    [t]
  );

  useEffect(() => {
    let isActive = true;
    const defaultCategory = getDefaultMenuCategory(t);

    const fetchMenuData = async () => {
      if (!restaurantId) {
        if (isActive) {
          setMenuCategories([defaultCategory]);
          setMenuItems([]);
          setMenuLoading(false);
        }
        return;
      }

      setMenuLoading(true);

      try {
        const [categoriesResponse, itemsResponse] = await Promise.all([
          publicApi.get('/menu/categories', { params: { restaurantId } }),
          publicApi.get('/menu/items', { params: { restaurantId } }),
        ]);

        if (!isActive) return;

        const categories = Array.isArray(categoriesResponse?.data?.categories)
          ? categoriesResponse.data.categories.map(normalizeMenuCategory).filter((category) => category.id)
          : [];

        const items = Array.isArray(itemsResponse?.data?.menuItems)
          ? itemsResponse.data.menuItems.map(normalizeMenuItem).filter((item) => item._id)
          : [];

        setMenuCategories([defaultCategory, ...categories]);
        setMenuItems(items);
      } catch {
        if (!isActive) return;
        setMenuCategories([defaultCategory]);
        setMenuItems([]);
      } finally {
        if (isActive) {
          setMenuLoading(false);
        }
      }
    };

    fetchMenuData();

    return () => {
      isActive = false;
    };
  }, [restaurantId, t]);

  useEffect(() => {
    if (activeCategory !== 'all' && !menuCategories.some((category) => category.id === activeCategory)) {
      setActiveCategory('all');
    }
  }, [activeCategory, menuCategories]);

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const searchValue = searchQuery.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(searchValue)
      || String(item.nameAr || '').toLowerCase().includes(searchValue);
    return matchesCategory && matchesSearch;
  });

  const { total: cartTotal, count: cartCount } = calculateCartMetrics(cart);

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAdd = (item) => {
    if (!item.isAvailable) {
      return;
    }

    setCart((previousCart) => {
      const existing = previousCart.find((entry) => entry.item._id === item._id);
      if (existing) {
        return previousCart.map((entry) =>
          entry.item._id === item._id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        );
      }
      return [...previousCart, { item, quantity: 1 }];
    });
  };

  const handleRemove = (itemId) => {
    setCart((previousCart) => {
      const existing = previousCart.find((entry) => entry.item._id === itemId);
      if (existing && existing.quantity > 1) {
        return previousCart.map((entry) =>
          entry.item._id === itemId
            ? { ...entry, quantity: entry.quantity - 1 }
            : entry
        );
      }
      return previousCart.filter((entry) => entry.item._id !== itemId);
    });
  };

  const getItemQuantity = (itemId) => {
    const found = cart.find((entry) => entry.item._id === itemId);
    return found ? found.quantity : 0;
  };

  useEffect(() => {
    if (!orderPlaced || !trackedOrderId) return;

    let isMounted = true;

    const pollOrderStatus = async () => {
      try {
        const response = await publicApi.get(`${ordersEndpoint}/${trackedOrderId}`, {
          suppressGlobalErrorToast: true
        });
        const order = response?.data?.order;

        if (order && isMounted) {
          const nextStatus = toClientOrderStatus(order?.status);
          const details = Array.isArray(order?.items)
            ? order.items
              .map((item) => `${Number(item?.quantity || 1)}x ${item?.name || item?.menuItem?.name?.fr || 'Item'}`)
              .join(', ')
            : trackedOrderDetails;

          setTrackedOrderStatus(nextStatus);
          setTrackedOrderDetails(details || '');
        }
      } catch {
        // Silently fail, it will retry on next poll
      }
    };

    pollOrderStatus(); // initial fetch immediately
    const intervalId = setInterval(pollOrderStatus, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [orderPlaced, trackedOrderId, ordersEndpoint, trackedOrderDetails]);

  useEffect(() => {
    if ((!orderPlaced && !trackedOrderId) || !tableId) {
      return undefined;
    }

    let socket = getSocket();
    if (!socket) {
      socket = connectSocket(null);
    }
    socket.emit('joinTable', tableId);

    if (restaurantId) {
      socket.emit('joinRestaurant', restaurantId);
    }

    const handleRealtimeOrderUpdate = (data) => {
      const order = data?.order;
      const incomingOrderId = toId(order?._id || order?.id);
      const incomingTableId = toId(order?.table);

      if (!incomingOrderId) return;

      const isTrackedOrder = trackedOrderId && incomingOrderId === trackedOrderId;
      const isSameTableFallback = !trackedOrderId && incomingTableId && incomingTableId === tableId;

      if (!isTrackedOrder && !isSameTableFallback) return;

      const nextStatus = toClientOrderStatus(order?.status);
      const details = Array.isArray(order?.items)
        ? order.items
          .map((item) => `${Number(item?.quantity || 1)}x ${item?.name || item?.menuItem?.name?.fr || 'Item'}`)
          .join(', ')
        : trackedOrderDetails;

      setTrackedOrderId(incomingOrderId);
      setTrackedOrderStatus(nextStatus);
      setTrackedOrderDetails(details || '');
    };

    socket.on('orderStatusUpdated', handleRealtimeOrderUpdate);
    socket.on('order_updated', handleRealtimeOrderUpdate);
    socket.on('order_ready', handleRealtimeOrderUpdate);

    return () => {
      socket.off('orderStatusUpdated', handleRealtimeOrderUpdate);
      socket.off('order_updated', handleRealtimeOrderUpdate);
      socket.off('order_ready', handleRealtimeOrderUpdate);
    };
  }, [orderPlaced, restaurantId, tableId, trackedOrderDetails, trackedOrderId]);

  useEffect(() => {
    if (!orderPlaced) {
      lastStatusRef.current = '';
      return;
    }

    if (trackedOrderStatus && trackedOrderStatus !== lastStatusRef.current) {
      if (trackedOrderStatus === 'ready') {
        toast.success(t('clientMenu.orderReadyToast'));
      }
      if (trackedOrderStatus === 'served') {
        toast.success(t('clientMenu.orderServedToast'));
      }
      lastStatusRef.current = trackedOrderStatus;
    }
  }, [orderPlaced, t, trackedOrderStatus]);

  useEffect(() => {
    if (!orderPlaced || trackedOrderStatus !== 'served') {
      return undefined;
    }

    let isActive = true;
    let hasTimedOut = false;

    const markActivity = () => {
      lastClientActivityRef.current = Date.now();
    };

    const endClientSession = async () => {
      if (!isActive || hasTimedOut) {
        return;
      }
      hasTimedOut = true;

      const releaseEndpoint = getTableReleaseEndpoint(tableId);
      if (releaseEndpoint) {
        try {
          await publicApi.post(
            releaseEndpoint,
            trackedOrderId ? { orderId: trackedOrderId } : {},
            { suppressGlobalErrorToast: true }
          );
        } catch {
          // Ignore release errors to avoid blocking session cleanup.
        }
      }

      if (!isActive) {
        return;
      }

      setOrderPlaced(false);
      setCart([]);
      setIsCartOpen(false);
      setOrderNotes('');
      setPaymentMethod('cash');
      setConfirmedOrderNumber('');
      setTrackedOrderId('');
      setTrackedOrderStatus('received');
      setTrackedOrderDetails('');
      toast.success(t('clientMenu.sessionTimeout', { defaultValue: 'Session closed due to inactivity.' }));
    };

    markActivity();

    for (const eventName of CLIENT_ACTIVITY_EVENTS) {
      window.addEventListener(eventName, markActivity, { passive: true });
    }

    const inactivityInterval = window.setInterval(() => {
      const idleForMs = Date.now() - lastClientActivityRef.current;
      if (idleForMs >= CLIENT_INACTIVITY_TIMEOUT_MS) {
        endClientSession();
      }
    }, 1000);

    return () => {
      isActive = false;
      window.clearInterval(inactivityInterval);
      for (const eventName of CLIENT_ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, markActivity);
      }
    };
  }, [orderPlaced, tableId, t, trackedOrderId, trackedOrderStatus]);

  const handlePlaceOrder = async () => {
    if (isPlacingOrder || cart.length === 0) {
      return;
    }

    if (!tableId) {
      toast.error(t('clientMenu.missingTableId'));
      return;
    }

    if (!restaurantId) {
      toast.error(t('clientMenu.resolveRestaurantError'));
      return;
    }

    if (menuLoading) {
      toast.error(t('clientMenu.menuLoadingWait'));
      return;
    }

    setIsPlacingOrder(true);

    try {
      const items = cart.map((entry) => {
        const item = entry.item;
        return {
          menuItem: item._id,
          quantity: entry.quantity,
          price: item.price,
          name: item.name,
        };
      });

      if (items.length === 0 || items.some((item) => !item.menuItem)) {
        toast.error(t('clientMenu.invalidCart'));
        return;
      }

      const response = await publicApi.post(ordersEndpoint, {
        restaurant: restaurantId,
        table: tableId,
        tableId,
        items,
        notes: orderNotes,
        paymentMethod,
      });

      const createdOrder = response?.data?.order;
      const orderNumber = createdOrder?.orderNumber;
      const createdOrderId = toId(createdOrder?._id || createdOrder?.id);
      const createdStatus = toClientOrderStatus(createdOrder?.status);
      const details = items
        .map((item) => `${Number(item.quantity || 1)}x ${item.name}`)
        .join(', ');

      setIsCartOpen(false);
      setConfirmedOrderNumber(orderNumber ? `#${orderNumber}` : `#${Math.floor(1000 + Math.random() * 9000)}`);
      setTrackedOrderId(createdOrderId);
      setTrackedOrderStatus(createdStatus);
      setTrackedOrderDetails(details);
      setOrderPlaced(true);
    } catch (error) {
      toast.error(error?.response?.data?.message || t('clientMenu.placeOrderFailed'));
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (orderPlaced) {
    const activeStepIndex = Math.max(
      0,
      orderSteps.findIndex((step) => step.id === trackedOrderStatus)
    );

    return (
      <div
        className="relative min-h-screen flex items-center justify-center p-6"
        style={{
          backgroundImage: `url(${backgroundImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-white/60" />

        <Motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 18 }}
          className="relative z-10 w-full max-w-md bg-white/85 backdrop-blur rounded-3xl border border-[#c9963a]/20 shadow-xl p-8 text-center"
        >
          <img src={logo} alt="ليالي قرطاج" className="restaurant-logo-circle w-14 h-14 mx-auto mb-3" />
          <h2 dir="rtl" className="text-3xl font-bold text-[#c9963a] font-serif mb-1">ليالي قرطاج</h2>

          <Motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="w-20 h-20 mx-auto mt-4 mb-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"
          >
            <CheckCircle className="w-12 h-12" />
          </Motion.div>

          <p className="text-xl font-semibold text-[#0a1628]">{t('clientMenu.orderConfirmed')}</p>
          <p className="mt-2 text-[#c9963a] font-bold text-lg">{confirmedOrderNumber}</p>
          {trackedOrderDetails && (
            <p className="mt-1 text-xs text-[#0a1628]/65">{trackedOrderDetails}</p>
          )}

          <div className="mt-7 space-y-3 text-left">
            {orderSteps.map((step, index) => {
              const Icon = step.icon;
              const isCurrent = index === activeStepIndex;
              const isCompleted = index < activeStepIndex;
              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCurrent || isCompleted ? 'bg-[#c9963a] text-white' : 'bg-[#0a1628]/10 text-[#0a1628]/60'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`${isCurrent || isCompleted ? 'text-[#0a1628] font-semibold' : 'text-[#0a1628]/60'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>


          <button
            onClick={() => {
              setOrderPlaced(false);
              setCart([]);
              setOrderNotes('');
              setPaymentMethod('cash');
              setTrackedOrderId('');
              setTrackedOrderStatus('received');
              setTrackedOrderDetails('');
            }}
            className="mt-8 px-6 py-3 rounded-xl bg-[#0a1628] text-white font-bold hover:bg-[#1e3a5f] transition-colors"
          >
            {t('clientMenu.newOrder')}
          </button>
        </Motion.div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen overflow-x-hidden pb-40 text-[#0a1628]"
      style={{
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-white/60" />

      <div className="relative z-10 mx-auto w-full max-w-[480px]">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-[#c9963a]/20 shadow-sm">
          <div className="px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <img src={logo} alt="ليالي قرطاج" className="restaurant-logo-circle w-10 h-10 shrink-0" />
                <div className="min-w-0">
                  <h1 dir="rtl" className="font-bold text-[#c9963a] text-[18px] leading-tight truncate">ليالي قرطاج</h1>
                  <p className="text-[11px] text-[#0a1628]/70 truncate">{restaurantName}</p>
                </div>
              </div>

              <div className="shrink-0 bg-[#0a1628] text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-sm inline-flex items-center gap-1.5 min-h-10 active:scale-[0.98] transition-transform">
                <Store className="w-3.5 h-3.5 text-[#e8c56a]" />
                <span className="max-w-[88px] truncate">{isResolvingTable ? t('clientMenu.resolvingTable') : t('clientMenu.tableLabel', { number: tableNumber })}</span>
              </div>
            </div>
          </div>
        </header>

        <div ref={filterBarRef} className="sticky top-[88px] z-30 bg-white/85 backdrop-blur-sm border-b border-[#c9963a]/20">
          <div className="px-3 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0a1628]/50" />
              <input
                type="text"
                placeholder={t('clientMenu.searchDish')}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full h-11 pl-11 pr-4 rounded-2xl bg-white border border-[#c9963a]/20 text-[#0a1628] placeholder:text-[#0a1628]/50 outline-none focus:border-[#c9963a] focus:ring-2 focus:ring-[#c9963a]/25"
              />
            </div>
          </div>

          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
              {menuCategories.map((category) => {
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`shrink-0 min-h-10 px-4 py-2 rounded-xl border transition-all text-left active:scale-[0.98] ${isActive
                        ? 'bg-[#c9963a] text-white border-[#c9963a] shadow-sm'
                        : 'bg-white text-[#0a1628] border-[#c9963a]/30'
                      }`}
                  >
                    <p className="text-sm font-bold leading-tight">{category.name}</p>
                    <p dir="rtl" className={`text-[11px] text-right leading-tight mt-0.5 ${isActive ? 'text-white/90' : 'text-[#0a1628]/70'}`}>
                      {category.nameAr}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div ref={menuGridRef} className="px-3 pt-3 grid grid-cols-1 min-[390px]:grid-cols-2 gap-3">
          {menuLoading && (
            <div className="col-span-full bg-white/90 border border-[#c9963a]/20 rounded-2xl p-7 text-center text-[#0a1628]/70">
              <div className="mx-auto h-7 w-7 rounded-full border-2 border-[#c9963a]/30 border-t-[#c9963a] animate-spin" />
              <p className="text-sm mt-3 font-semibold">{t('clientMenu.loadingMenu')}</p>
            </div>
          )}

          {!menuLoading && filteredItems.map((item, index) => {
            const quantity = getItemQuantity(item._id);
            const itemImage = item.image;

            return (
              <Motion.div
                key={item._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`bg-white/90 rounded-2xl shadow-sm border border-[#c9963a]/20 overflow-hidden flex flex-col min-h-[280px] ${item.isAvailable ? '' : 'grayscale opacity-60'}`}
              >
                <div className="h-[136px] min-[420px]:h-[150px] relative">
                  {itemImage ? (
                    <img src={itemImage} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#0a1628] to-[#0891b2] flex items-center justify-center">
                      <span className="text-3xl font-black text-[#c9963a] uppercase">{item.name.charAt(0)}</span>
                    </div>
                  )}
                </div>

                <div className="p-3.5 flex flex-col flex-1">
                  <h3 className="font-bold text-[#0a1628] text-[17px] leading-tight line-clamp-2 min-h-[2.6rem]">{item.name}</h3>
                  <p dir="rtl" className="text-[12px] text-right text-[#0a1628]/60 mt-1 line-clamp-1 min-h-[1.1rem]">{item.nameAr}</p>

                  <div className="mt-auto pt-3 flex items-end justify-between gap-2">
                    <span className="font-extrabold text-[#c9963a] text-[18px] leading-none">{item.price.toFixed(3)} TND</span>

                    {item.isAvailable ? (
                      quantity > 0 ? (
                        <div className="ml-auto inline-flex items-center gap-1.5 bg-white border border-[#c9963a]/25 rounded-xl p-1">
                          <button
                            onClick={() => handleRemove(item._id)}
                            className="w-10 h-10 rounded-lg bg-[#1e3a5f] text-white flex items-center justify-center active:scale-[0.96] transition-transform"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-bold min-w-[1.2ch] text-center text-[#0a1628]">{quantity}</span>
                          <button
                            onClick={() => handleAdd(item)}
                            className="w-10 h-10 rounded-lg bg-[#c9963a] text-white flex items-center justify-center active:scale-[0.96] transition-transform"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAdd(item)}
                          className="ml-auto w-11 h-11 rounded-xl bg-[#c9963a] text-white flex items-center justify-center active:scale-[0.96] transition-transform"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      )
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0a1628]/55">{t('clientMenu.unavailable')}</span>
                    )}
                  </div>
                </div>
              </Motion.div>
            );
          })}

          {!menuLoading && filteredItems.length === 0 && (
            <div className="col-span-full bg-white/90 border border-[#c9963a]/20 rounded-2xl p-7 text-center text-[#0a1628]/70">
              <p className="text-base font-semibold">
                {!restaurantId ? t('clientMenu.restaurantNotFound') : t('clientMenu.noItemsFound')}
              </p>
              <p className="text-sm mt-1">
                {!restaurantId
                  ? t('clientMenu.retryScan')
                  : t('clientMenu.tryAnotherCategory')}
              </p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {cartCount > 0 && !isCartOpen && (
          <Motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 right-4 z-40 flex flex-col items-center gap-2"
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-14 h-14 rounded-full bg-[#0a1628] text-white shadow-xl flex items-center justify-center active:scale-[0.96] transition-transform"
            >
              <div className="relative">
                <ShoppingCart className="w-6 h-6 text-[#c9963a]" />
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#c9963a] text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#0a1628]">
                  {cartCount}
                </span>
              </div>
            </button>
            <span className="px-2.5 py-1 rounded-full bg-white/95 border border-[#c9963a]/25 text-[#0a1628] text-[11px] font-bold shadow-sm">
              {cartTotal.toFixed(3)} TND
            </span>
          </Motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),8px)]">
        <div className="mx-auto w-full max-w-[480px] bg-white/95 border border-[#c9963a]/25 rounded-t-2xl shadow-lg grid grid-cols-2 overflow-hidden">
          <button
            onClick={scrollToTop}
            className="min-h-12 px-2 py-2 flex flex-col items-center justify-center gap-1 text-[#0a1628] active:bg-[#0a1628]/5 transition-colors"
          >
            <Store className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wide">{t('common.home', { defaultValue: 'Home' })}</span>
          </button>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative min-h-12 px-2 py-2 flex flex-col items-center justify-center gap-1 text-[#0a1628] active:bg-[#0a1628]/5 transition-colors border-l border-[#c9963a]/15"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wide">{t('clientMenu.cart')}</span>
            {cartCount > 0 && (
              <span className="absolute top-1.5 right-5 h-4 min-w-4 px-1 rounded-full bg-[#c9963a] text-white text-[9px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0a1628]/40 backdrop-blur-sm"
              onClick={() => setIsCartOpen(false)}
            />

            <Motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 220 }}
              className="relative w-full max-w-[480px] mx-auto bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-[#0a1628]/10 flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#0a1628]">{t('clientMenu.yourOrder')}</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 rounded-full bg-[#0a1628]/5 text-[#0a1628]/70">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="space-y-4">
                  {cart.map((entry) => (
                    <div key={entry.item._id} className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-bold text-[#0a1628] text-sm truncate">{entry.item.name}</p>
                        <p dir="rtl" className="text-xs text-[#0a1628]/60 mt-0.5">{entry.item.nameAr}</p>
                        <p className="text-[#c9963a] text-xs font-bold mt-1">{(entry.item.price * entry.quantity).toFixed(3)} TND</p>
                      </div>

                      <div className="flex items-center gap-2 bg-[#0a1628]/5 rounded-lg p-1 shrink-0">
                        <button
                          onClick={() => handleRemove(entry.item._id)}
                          className="w-7 h-7 rounded-md bg-[#1e3a5f] text-white flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-sm text-[#0a1628] min-w-[1ch] text-center">{entry.quantity}</span>
                        <button
                          onClick={() => handleAdd(entry.item)}
                          className="w-7 h-7 rounded-md bg-[#c9963a] text-white flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {cart.length === 0 && <p className="text-center text-[#0a1628]/50 py-4">{t('clientMenu.emptyCart')}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#0a1628] mb-2">Notes</label>
                  <textarea
                    rows="2"
                    value={orderNotes}
                    onChange={(event) => setOrderNotes(event.target.value)}
                    placeholder={t('clientMenu.notesPlaceholder')}
                    className="w-full rounded-xl border border-[#0a1628]/15 bg-[#0a1628]/5 p-3 text-sm outline-none focus:border-[#c9963a] focus:ring-2 focus:ring-[#c9963a]/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#0a1628] mb-2">{t('clientMenu.payment')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-3 rounded-xl border-2 transition-colors flex flex-col items-center gap-2 ${paymentMethod === 'cash'
                          ? 'bg-[#0a1628] text-white border-[#0a1628]'
                          : 'bg-white text-[#0a1628] border-[#0a1628]/20'
                        }`}
                    >
                      <Banknote className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-wider">{t('clientMenu.cash')}</span>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`p-3 rounded-xl border-2 transition-colors flex flex-col items-center gap-2 ${paymentMethod === 'card'
                          ? 'bg-[#0891b2] text-white border-[#0891b2]'
                          : 'bg-white text-[#0a1628] border-[#0a1628]/20'
                        }`}
                    >
                      <CreditCard className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-wider">{t('clientMenu.card')}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-[#0a1628]/10 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[#0a1628]/70 font-medium">{t('common.total')}</span>
                  <span className="text-xl font-bold text-[#0a1628]">{cartTotal.toFixed(3)} TND</span>
                </div>
                <button
                  onClick={handlePlaceOrder}
                  disabled={cart.length === 0 || isPlacingOrder}
                  className="w-full py-4 rounded-xl bg-[#c9963a] hover:bg-[#a07830] text-[#0a1628] font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPlacingOrder ? t('clientMenu.placingOrder') : t('clientMenu.placeOrder')}
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MenuPage;
