import React, { useEffect, useState } from 'react';
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
import api from '../../services/api';
import backgroundImg from '../../assets/background.png';
import logo from '../../assets/logo.webp';

const MENU_CATEGORIES = [
  { id: 'all', name: 'Tout', nameAr: 'الكل' },
  { id: 'boissons', name: 'Boissons', nameAr: 'مشروبات' },
  { id: 'entrees', name: 'Entrées', nameAr: 'مقبلات' },
  { id: 'traditionnels', name: 'Plats Traditionnels', nameAr: 'أطباق تقليدية' },
  { id: 'pates', name: 'Pâtes & Spécialités', nameAr: 'معكرونة' },
  { id: 'sandwichs', name: 'Sandwichs', nameAr: 'ساندويتش' },
  { id: 'viandes', name: 'Viandes & Grillades', nameAr: 'مشاوي' },
  { id: 'desserts', name: 'Desserts', nameAr: 'حلويات' },
];

const MENU_ITEMS = [
  { _id: 'b1', name: 'Eau minérale', nameAr: 'ماء معدني', price: 1.500, category: 'boissons', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004875/Eau_min%C3%A9rale_gmohyg.jpg', isAvailable: true },
  { _id: 'b2', name: 'Soda', nameAr: 'صودا', price: 2.500, category: 'boissons', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776031616/sodaa_tuivfc.jpg', isAvailable: true },
  { _id: 'b3', name: 'Jus', nameAr: 'عصير', price: 3.500, category: 'boissons', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004877/Jus_jl392u.jpg', isAvailable: true },
  { _id: 'b4', name: 'Thé', nameAr: 'شاي', price: 1.500, category: 'boissons', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004876/the_qydggx.jpg', isAvailable: true },
  { _id: 'b5', name: '9ahwa Arbi', nameAr: 'قهوة عربي', price: 1.500, category: 'boissons', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004875/9ahwa_arbi_hruf4f.jpg', isAvailable: true },
  { _id: 'e1', name: 'Salade Tunisienne', nameAr: 'سلاطة تونسية', price: 6.000, category: 'entrees', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004876/Salade_Tunisienne_xrpgsg.jpg', isAvailable: true },
  { _id: 'e2', name: 'Slata Mechouia', nameAr: 'سلاطة مشوية', price: 7.000, category: 'entrees', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004876/Slata_Mechouia_dezue1.jpg', isAvailable: true },
  { _id: 'e3', name: "Brik à l'œuf", nameAr: 'بريك بالبيض', price: 2.000, category: 'entrees', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004876/Brik_%C3%A0_l_%C5%93uf_jsihkw.jpg', isAvailable: true },
  { _id: 'e4', name: 'Fricassé thon', nameAr: 'فريكاسي تونة', price: 3.500, category: 'entrees', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004879/Fricass%C3%A9_thon_jduzc4.jpg', isAvailable: true },
  { _id: 'e5', name: 'Lablabi', nameAr: 'لبلابي', price: 5.000, category: 'entrees', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004879/Lablabi_tgzbrd.jpg', isAvailable: true },
  { _id: 't1', name: 'Couscous poulet', nameAr: 'كسكسي دجاج', price: 12.000, category: 'traditionnels', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004878/Couscous_au_poulet_icqdlv.jpg', isAvailable: true },
  { _id: 't2', name: 'Couscous agneau', nameAr: 'كسكسي خروف', price: 18.000, category: 'traditionnels', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004879/Couscous_agneau_u10a1y.png', isAvailable: true },
  { _id: 't3', name: 'Couscous poisson', nameAr: 'كسكسي سمك', price: 16.000, category: 'traditionnels', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004878/Couscous_poisson_e623zr.jpg', isAvailable: true },
  { _id: 't4', name: 'Mloukhiya viande', nameAr: 'ملوخية لحم', price: 14.000, category: 'traditionnels', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004878/Mloukhia_viande_ftg6zf.jpg', isAvailable: true },
  { _id: 't5', name: 'Kamounia', nameAr: 'كامونية', price: 13.000, category: 'traditionnels', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004878/Kamounia_jny08g.jpg', isAvailable: true },
  { _id: 't6', name: 'Ojja merguez', nameAr: 'عجة مرقاز', price: 10.000, category: 'traditionnels', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004879/Ojja_Merguez_aanpqq.jpg', isAvailable: true },
  { _id: 't7', name: 'Riz Djerbien', nameAr: 'رز جربي', price: 11.000, category: 'traditionnels', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004878/Riz_Djerbien_edniti.jpg', isAvailable: true },
  { _id: 'p1', name: 'Makarouna salsa escalope', nameAr: 'معكرونة بالإسكالوب', price: 12.000, category: 'pates', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004878/Makarouna_salsa_escalope_vmkm73.jpg', isAvailable: true },
  { _id: 's1', name: 'Sandwich thon', nameAr: 'ساندويتش تونة', price: 5.000, category: 'sandwichs', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004876/Sandwich_thon_ml9kr1.jpg', isAvailable: true },
  { _id: 's2', name: 'Chapati escalope', nameAr: 'شاباتي إسكالوب', price: 7.000, category: 'sandwichs', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004876/Chapati_escalope_ndotsw.jpg', isAvailable: true },
  { _id: 's3', name: 'Kafteji royal', nameAr: 'كفتاجي رويال', price: 6.000, category: 'sandwichs', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004878/Kafteji_royal_dl8jb9.jpg', isAvailable: true },
  { _id: 'v1', name: 'Escalope grillée', nameAr: 'إسكالوب مشوي', price: 14.000, category: 'viandes', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004877/Escalope_grill%C3%A9e_wuuv9n.jpg', isAvailable: true },
  { _id: 'v2', name: 'Brochettes de poulet', nameAr: 'بروشيت دجاج', price: 13.000, category: 'viandes', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004877/Brochettes_de_poulet_sk4lzr.jpg', isAvailable: true },
  { _id: 'v3', name: 'Merguez grillée', nameAr: 'مرقاز مشوي', price: 12.000, category: 'viandes', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004877/Merguez_grill%C3%A9e_khbbky.jpg', isAvailable: true },
  { _id: 'v4', name: 'Grillade mixte', nameAr: 'مشاوي مختلطة', price: 22.000, category: 'viandes', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004876/Grillade_mixte_axebq0.jpg', isAvailable: true },
  { _id: 'v5', name: 'Poisson grillé', nameAr: 'سمك مشوي', price: 18.000, category: 'viandes', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004877/Poisson_grill%C3%A9_xdfdbx.jpg', isAvailable: true },
  { _id: 'd1', name: 'Assida zgougou', nameAr: 'عصيدة زقوقو', price: 5.000, category: 'desserts', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004876/Assida_zgougou_hy1xuz.jpg', isAvailable: true },
  { _id: 'd2', name: 'Dro3', nameAr: 'ذراع', price: 4.500, category: 'desserts', image: 'https://res.cloudinary.com/dbiszp8lt/image/upload/v1776004877/dro3_ercnll.jpg', isAvailable: true },
];

const ORDER_STEPS = [
  { id: 'received', label: 'Reçue', icon: Clock },
  { id: 'preparing', label: 'Préparation', icon: ChefHat },
  { id: 'ready', label: 'Prête', icon: Utensils },
  { id: 'served', label: 'Service', icon: ShoppingCart },
];

const MenuPage = () => {
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('table') || '1';
  const restaurantName = searchParams.get('restaurant') || 'ليالي قرطاج';
  const [tableNumber, setTableNumber] = useState(String(tableId));

  useEffect(() => {
    let isMounted = true;

    const resolveTableNumber = async () => {
      if (/^\d+$/.test(String(tableId))) {
        if (isMounted) {
          setTableNumber(String(tableId));
        }
        return;
      }

      try {
        const response = await api.get(`/tables/qr/${tableId}`);
        const number = response?.data?.table?.number;
        if (isMounted) {
          setTableNumber(number !== undefined && number !== null ? String(number) : String(tableId));
        }
      } catch {
        if (isMounted) {
          setTableNumber(String(tableId));
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

  const filteredItems = MENU_ITEMS.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartTotal = cart.reduce((sum, current) => sum + (current.item.price * current.quantity), 0);
  const cartCount = cart.reduce((sum, current) => sum + current.quantity, 0);

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

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      return;
    }

    const cartItems = cart.map((entry) => ({
      ...entry.item,
      quantity: entry.quantity,
    }));

    const items = cartItems.map((item) => ({
      menuItem: item._id,
      quantity: item.quantity,
      price: item.price,
      name: item.name,
    }));

    if (items.length === 0) {
      return;
    }

    setIsCartOpen(false);
    setConfirmedOrderNumber(`#${Math.floor(1000 + Math.random() * 9000)}`);
    setTimeout(() => {
      setOrderPlaced(true);
    }, 300);
  };

  if (orderPlaced) {
    return (
      <div
        className="relative min-h-screen flex items-center justify-center p-6"
        style={{
          backgroundImage: `url(${backgroundImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="absolute inset-0 bg-white/60" />

        <Motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 18 }}
          className="relative z-10 w-full max-w-md bg-white/85 backdrop-blur rounded-3xl border border-[#c9963a]/20 shadow-xl p-8 text-center"
        >
          <img src={logo} alt="ليالي قرطاج" className="w-20 h-20 mx-auto object-contain mb-3" />
          <h2 dir="rtl" className="text-3xl font-bold text-[#c9963a] font-serif mb-1">ليالي قرطاج</h2>

          <Motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="w-20 h-20 mx-auto mt-4 mb-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"
          >
            <CheckCircle className="w-12 h-12" />
          </Motion.div>

          <p className="text-xl font-semibold text-[#0a1628]">Votre commande est confirmée!</p>
          <p className="mt-2 text-[#c9963a] font-bold text-lg">{confirmedOrderNumber}</p>

          <div className="mt-7 space-y-3 text-left">
            {ORDER_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCurrent = index === 0;
              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isCurrent ? 'bg-[#c9963a] text-white' : 'bg-[#0a1628]/10 text-[#0a1628]/60'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`${isCurrent ? 'text-[#0a1628] font-semibold' : 'text-[#0a1628]/60'}`}>
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
            }}
            className="mt-8 px-6 py-3 rounded-xl bg-[#0a1628] text-white font-bold hover:bg-[#1e3a5f] transition-colors"
          >
            Nouvelle commande
          </button>
        </Motion.div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen pb-28 text-[#0a1628]"
      style={{
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-white/60" />

      <div className="relative z-10">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-[#c9963a]/20 shadow-sm">
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <img src={logo} alt="ليالي قرطاج" className="w-10 h-10 object-contain" />
              <div className="min-w-0">
                <h1 dir="rtl" className="font-bold text-[#c9963a] text-lg leading-tight">ليالي قرطاج</h1>
                <p className="text-xs text-[#0a1628]/70 truncate">{restaurantName}</p>
              </div>
            </div>

            <div className="bg-[#0a1628] text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm inline-flex items-center gap-2">
              <Store className="w-4 h-4 text-[#e8c56a]" />
              <span>Table {tableNumber}</span>
            </div>
          </div>
        </header>

        <div className="px-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0a1628]/50" />
            <input
              type="text"
              placeholder="Rechercher un plat..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/85 border border-[#c9963a]/20 text-[#0a1628] placeholder:text-[#0a1628]/50 outline-none focus:border-[#c9963a] focus:ring-2 focus:ring-[#c9963a]/25"
            />
          </div>
        </div>

        <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {MENU_CATEGORIES.map((category) => {
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`shrink-0 px-4 py-2 rounded-xl border transition-all text-left ${
                  isActive
                    ? 'bg-[#c9963a] text-white border-[#c9963a]'
                    : 'bg-white/80 text-[#0a1628] border-[#c9963a]/30'
                }`}
              >
                <p className="text-sm font-bold leading-tight">{category.name}</p>
                <p dir="rtl" className={`text-[11px] leading-tight mt-0.5 ${isActive ? 'text-white/90' : 'text-[#0a1628]/70'}`}>
                  {category.nameAr}
                </p>
              </button>
            );
          })}
        </div>

        <div className="px-4 mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredItems.map((item, index) => {
            const quantity = getItemQuantity(item._id);
            const itemImage = item.image;

            return (
              <Motion.div
                key={item._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-[#c9963a]/20 overflow-hidden flex flex-col ${item.isAvailable ? '' : 'grayscale opacity-60'}`}
              >
                <div className="h-28 relative">
                  {itemImage ? (
                    <img src={itemImage} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#0a1628] to-[#0891b2] flex items-center justify-center">
                      <span className="text-3xl font-black text-[#c9963a] uppercase">{item.name.charAt(0)}</span>
                    </div>
                  )}
                </div>

                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-bold text-[#0a1628] text-sm line-clamp-1">{item.name}</h3>
                  <p dir="rtl" className="text-[11px] text-[#0a1628]/60 mt-1 line-clamp-1">{item.nameAr}</p>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="font-bold text-[#c9963a] text-sm">{item.price.toFixed(3)} TND</span>

                    {item.isAvailable ? (
                      quantity > 0 ? (
                        <div className="flex items-center gap-2 bg-white/90 border border-[#c9963a]/20 rounded-lg p-1">
                          <button
                            onClick={() => handleRemove(item._id)}
                            className="w-6 h-6 rounded-md bg-[#1e3a5f] text-white flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-bold min-w-[1ch] text-center text-[#0a1628]">{quantity}</span>
                          <button
                            onClick={() => handleAdd(item)}
                            className="w-6 h-6 rounded-md bg-[#c9963a] text-white flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAdd(item)}
                          className="w-8 h-8 rounded-lg bg-[#c9963a] text-white flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0a1628]/55">Indisponible</span>
                    )}
                  </div>
                </div>
              </Motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {cartCount > 0 && !isCartOpen && (
          <Motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-0 right-0 px-4 z-40"
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-[#0a1628] text-white rounded-2xl shadow-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart className="w-6 h-6 text-[#c9963a]" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#c9963a] text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#0a1628]">
                    {cartCount}
                  </span>
                </div>
                <span className="font-bold">Panier</span>
              </div>
              <span className="font-bold text-[#e8c56a]">{cartTotal.toFixed(3)} TND</span>
            </button>
          </Motion.div>
        )}
      </AnimatePresence>

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
              className="relative bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-[#0a1628]/10 flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#0a1628]">Votre commande</h2>
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
                  {cart.length === 0 && <p className="text-center text-[#0a1628]/50 py-4">Panier vide.</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#0a1628] mb-2">Notes</label>
                  <textarea
                    rows="2"
                    value={orderNotes}
                    onChange={(event) => setOrderNotes(event.target.value)}
                    placeholder="Allergies ou remarques..."
                    className="w-full rounded-xl border border-[#0a1628]/15 bg-[#0a1628]/5 p-3 text-sm outline-none focus:border-[#c9963a] focus:ring-2 focus:ring-[#c9963a]/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#0a1628] mb-2">Paiement</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-3 rounded-xl border-2 transition-colors flex flex-col items-center gap-2 ${
                        paymentMethod === 'cash'
                          ? 'bg-[#0a1628] text-white border-[#0a1628]'
                          : 'bg-white text-[#0a1628] border-[#0a1628]/20'
                      }`}
                    >
                      <Banknote className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-wider">Espèces</span>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`p-3 rounded-xl border-2 transition-colors flex flex-col items-center gap-2 ${
                        paymentMethod === 'card'
                          ? 'bg-[#0891b2] text-white border-[#0891b2]'
                          : 'bg-white text-[#0a1628] border-[#0a1628]/20'
                      }`}
                    >
                      <CreditCard className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-wider">Carte</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-[#0a1628]/10 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[#0a1628]/70 font-medium">Total</span>
                  <span className="text-xl font-bold text-[#0a1628]">{cartTotal.toFixed(3)} TND</span>
                </div>
                <button
                  onClick={handlePlaceOrder}
                  disabled={cart.length === 0}
                  className="w-full py-4 rounded-xl bg-[#c9963a] hover:bg-[#a07830] text-[#0a1628] font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Place Order
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
