import React, { useEffect, useMemo, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Search from 'lucide-react/dist/esm/icons/search';
import Filter from 'lucide-react/dist/esm/icons/filter';
import Edit2 from 'lucide-react/dist/esm/icons/edit-2';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import X from 'lucide-react/dist/esm/icons/x';
import ManagerLayout from '../../layouts/ManagerLayout';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { useTranslation } from 'react-i18next';

const getMenuBasePath = () => {
  const baseURL = String(api.defaults.baseURL || '');
  return /\/api\/?$/.test(baseURL) ? '/menu' : '/api/menu';
};

const getLocalizedField = (field, language = 'en') => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field !== 'object') return '';

  const lang = String(language || 'en').split('-')[0];
  const priority =
    lang === 'ar' ? ['ar', 'fr', 'en'] : lang === 'fr' ? ['fr', 'en', 'ar'] : ['en', 'fr', 'ar'];

  for (const key of priority) {
    const value = field?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return '';
};

const getCategoryName = (category, language = 'en') => {
  if (!category) return '';
  if (typeof category === 'string') return category;
  if (typeof category === 'object') {
    if (typeof category.name === 'string') return category.name;
    return getLocalizedField(category.name, language);
  }
  return '';
};

const getCategoryId = (category) => {
  if (!category) return null;
  if (typeof category === 'string') return category;
  if (typeof category === 'object') return category._id || category.id || null;
  return null;
};

const MenuManagementPage = () => {
  const { i18n } = useTranslation();
  const currentLanguage = String(i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const isArabic = currentLanguage === 'ar';
  const text = useMemo(
    () =>
      isArabic
        ? {
            missingRestaurantContext: 'سياق المطعم غير متوفر',
            categoryCreated: 'تم إنشاء التصنيف بنجاح',
            categoryDeleted: 'تم حذف التصنيف بنجاح',
            itemCreated: 'تم إنشاء العنصر بنجاح',
            itemDeleted: 'تم حذف العنصر بنجاح',
            createCategoryFirst: 'يرجى إنشاء تصنيف أولاً',
            loadingMenuData: 'جاري تحميل بيانات القائمة...',
            pageTitle: 'إدارة القائمة',
            menuItems: 'عناصر القائمة',
            categories: 'التصنيفات',
            addCategory: 'إضافة تصنيف',
            addItem: 'إضافة عنصر',
            searchItems: 'ابحث في عناصر القائمة...',
            allCategories: 'كل التصنيفات',
            unnamedCategory: 'تصنيف بدون اسم',
            itemsCount: 'عنصر',
            noCategories: 'لا توجد تصنيفات بعد. أضف أول تصنيف.',
            unnamedItem: 'عنصر بدون اسم',
            uncategorized: 'بدون تصنيف',
            prepTimeSuffix: 'دقيقة',
            available: 'متاح',
            noItemsMatch: 'لا توجد عناصر تطابق عوامل التصفية الحالية.',
            addCategoryTitle: 'إضافة تصنيف',
            nameFrench: 'الاسم (فرنسي)',
            nameEnglish: 'الاسم (إنجليزي)',
            nameArabic: 'الاسم (عربي)',
            categoryFrPlaceholder: 'مثال: الأطباق الرئيسية',
            categoryEnPlaceholder: 'مثال: Main Dishes',
            categoryArPlaceholder: 'الاسم بالعربية',
            displayOrder: 'ترتيب العرض',
            cancel: 'إلغاء',
            saving: 'جارٍ الحفظ...',
            saveCategory: 'حفظ التصنيف',
            addMenuItemTitle: 'إضافة عنصر قائمة',
            uploadItemImage: 'انقر لرفع صورة العنصر',
            uploadHint: 'PNG، JPG، WEBP حتى 5MB',
            namesDescriptions: 'الأسماء والوصف',
            french: 'الفرنسية',
            english: 'الإنجليزية',
            arabic: 'العربية',
            itemNameFr: 'اسم العنصر (فرنسي)',
            itemNameEn: 'اسم العنصر (إنجليزي)',
            itemNameAr: 'اسم العنصر بالعربية',
            descFr: 'الوصف (فرنسي)',
            descEn: 'الوصف (إنجليزي)',
            descAr: 'الوصف بالعربية',
            itemDetails: 'تفاصيل العنصر',
            category: 'التصنيف',
            select: 'اختر...',
            prepTimeMin: 'وقت التحضير (دقيقة)',
            min: 'دقيقة',
            price: 'السعر (دينار)',
            vegetarianOption: 'خيار نباتي',
            glutenFreeOption: 'خيار خالٍ من الغلوتين',
            saveItem: 'حفظ العنصر',
          }
        : {
            missingRestaurantContext: 'Missing restaurant context',
            categoryCreated: 'Category created successfully',
            categoryDeleted: 'Category deleted successfully',
            itemCreated: 'Menu item created successfully',
            itemDeleted: 'Menu item deleted successfully',
            createCategoryFirst: 'Please create a category first',
            loadingMenuData: 'Loading menu data...',
            pageTitle: 'Menu Management',
            menuItems: 'Menu Items',
            categories: 'Categories',
            addCategory: 'Add Category',
            addItem: 'Add Item',
            searchItems: 'Search menu items...',
            allCategories: 'All Categories',
            unnamedCategory: 'Unnamed Category',
            itemsCount: 'Items',
            noCategories: 'No categories yet. Add your first category.',
            unnamedItem: 'Unnamed Item',
            uncategorized: 'Uncategorized',
            prepTimeSuffix: 'min',
            available: 'Available',
            noItemsMatch: 'No menu items match your current filters.',
            addCategoryTitle: 'Add Category',
            nameFrench: 'Name (French)',
            nameEnglish: 'Name (English)',
            nameArabic: 'Name (Arabic)',
            categoryFrPlaceholder: 'e.g., Plats Principaux',
            categoryEnPlaceholder: 'e.g., Main Dishes',
            categoryArPlaceholder: 'Arabic name',
            displayOrder: 'Display Order',
            cancel: 'Cancel',
            saving: 'Saving...',
            saveCategory: 'Save Category',
            addMenuItemTitle: 'Add Menu Item',
            uploadItemImage: 'Click to upload item image',
            uploadHint: 'PNG, JPG, WEBP up to 5MB',
            namesDescriptions: 'Names & Descriptions',
            french: 'French',
            english: 'English',
            arabic: 'Arabic',
            itemNameFr: 'Item Name (Fr)',
            itemNameEn: 'Item Name (En)',
            itemNameAr: 'Arabic item name',
            descFr: 'Description (Fr)',
            descEn: 'Description (En)',
            descAr: 'Arabic description',
            itemDetails: 'Item Details',
            category: 'Category',
            select: 'Select...',
            prepTimeMin: 'Prep Time (min)',
            min: 'min',
            price: 'Price (TND)',
            vegetarianOption: 'Vegetarian Option',
            glutenFreeOption: 'Gluten-Free Option',
            saveItem: 'Save Item',
          },
    [isArabic]
  );

  const [activeTab, setActiveTab] = useState('items'); // 'categories' or 'items'
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const user = useAuthStore((state) => state.user);
  const restaurantId = useMemo(() => {
    if (user?.restaurant) return user.restaurant;

    try {
      return JSON.parse(localStorage.getItem('user') || 'null')?.restaurant || '';
    } catch {
      return '';
    }
  }, [user?.restaurant]);

  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    fr: '',
    en: '',
    ar: '',
    order: '1',
  });
  const [itemForm, setItemForm] = useState({
    name: { fr: '', en: '', ar: '' },
    description: { fr: '', en: '', ar: '' },
    category: '',
    preparationTime: '15',
    price: '',
    isVegetarian: false,
    isGlutenFree: false,
    imageFile: null,
  });
  const [itemImagePreview, setItemImagePreview] = useState('');
  const menuBasePath = useMemo(() => getMenuBasePath(), []);
  
  // Modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  const resetCategoryForm = () => {
    setCategoryForm({
      fr: '',
      en: '',
      ar: '',
      order: '1',
    });
  };

  const clearItemImagePreview = () => {
    if (itemImagePreview && itemImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(itemImagePreview);
    }
    setItemImagePreview('');
  };

  const resetItemForm = () => {
    clearItemImagePreview();
    setItemForm({
      name: { fr: '', en: '', ar: '' },
      description: { fr: '', en: '', ar: '' },
      category: categories[0]?._id || '',
      preparationTime: '15',
      price: '',
      isVegetarian: false,
      isGlutenFree: false,
      imageFile: null,
    });
  };

  useEffect(() => {
    let isMounted = true;

    const fetchMenuData = async () => {
      if (!restaurantId) {
        if (isMounted) {
          setCategories([]);
          setMenuItems([]);
        }
        return;
      }

      try {
        setIsLoading(true);

        const [categoriesResponse, itemsResponse] = await Promise.all([
          api.get(`${menuBasePath}/categories`, {
            params: { restaurantId },
          }),
          api.get(`${menuBasePath}/items`, {
            params: { restaurantId },
          }),
        ]);

        if (!isMounted) return;

        const apiCategories = Array.isArray(categoriesResponse?.data?.categories)
          ? categoriesResponse.data.categories
          : [];
        const apiItems = Array.isArray(itemsResponse?.data?.menuItems)
          ? itemsResponse.data.menuItems
          : [];

        setCategories(apiCategories);
        setMenuItems(apiItems);
      } catch (error) {
        if (isMounted) {
          toast.error(error.response?.data?.message || error.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMenuData();

    return () => {
      isMounted = false;
    };
  }, [menuBasePath, restaurantId]);

  useEffect(() => {
    if (categoryFilter === 'All') return;
    const exists = categories.some((category) => getCategoryName(category, currentLanguage) === categoryFilter);

    if (!exists) {
      setCategoryFilter('All');
    }
  }, [categories, categoryFilter, currentLanguage]);

  useEffect(() => {
    return () => {
      if (itemImagePreview && itemImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(itemImagePreview);
      }
    };
  }, [itemImagePreview]);

  const categoryItemCounts = useMemo(() => {
    return menuItems.reduce((counts, item) => {
      const categoryId = getCategoryId(item.category);
      if (!categoryId) return counts;

      counts[categoryId] = (counts[categoryId] || 0) + 1;
      return counts;
    }, {});
  }, [menuItems]);

  const handleCreateCategory = async (event) => {
    event.preventDefault();

    if (!restaurantId) {
      toast.error(text.missingRestaurantContext);
      return;
    }

    try {
      setIsSubmittingCategory(true);

      const payload = {
        name: {
          fr: categoryForm.fr.trim(),
          en: categoryForm.en.trim(),
          ar: categoryForm.ar.trim(),
        },
        order: Number(categoryForm.order) || 1,
        restaurant: restaurantId,
      };

      const response = await api.post(`${menuBasePath}/categories`, payload);
      const createdCategory = response?.data?.category;

      if (createdCategory) {
        setCategories((previousCategories) =>
          [...previousCategories, createdCategory].sort(
            (a, b) => Number(a?.order || 0) - Number(b?.order || 0)
          )
        );
      }

      setIsCategoryModalOpen(false);
      resetCategoryForm();
      toast.success(text.categoryCreated);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      await api.delete(`${menuBasePath}/categories/${categoryId}`);

      setCategories((previousCategories) =>
        previousCategories.filter((category) => category._id !== categoryId)
      );
      setMenuItems((previousItems) =>
        previousItems.filter((item) => getCategoryId(item.category) !== categoryId)
      );

      toast.success(text.categoryDeleted);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const handleItemImageChange = (event) => {
    const file = event.target.files?.[0] || null;

    setItemForm((previousForm) => ({
      ...previousForm,
      imageFile: file,
    }));

    if (itemImagePreview && itemImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(itemImagePreview);
    }

    setItemImagePreview(file ? URL.createObjectURL(file) : '');
  };

  const handleCreateMenuItem = async (event) => {
    event.preventDefault();

    if (!restaurantId) {
      toast.error(text.missingRestaurantContext);
      return;
    }

    try {
      setIsSubmittingItem(true);

      let response;

      if (itemForm.imageFile) {
        const formData = new FormData();
        formData.append('name', JSON.stringify(itemForm.name));
        formData.append('description', JSON.stringify(itemForm.description));
        formData.append('price', String(Number(itemForm.price)));
        formData.append('category', itemForm.category);
        formData.append('restaurant', restaurantId);
        formData.append('isVegetarian', String(itemForm.isVegetarian));
        formData.append('isGlutenFree', String(itemForm.isGlutenFree));
        if (itemForm.preparationTime !== '') {
          formData.append('preparationTime', String(Number(itemForm.preparationTime)));
        }
        formData.append('image', itemForm.imageFile);

        response = await api.post(`${menuBasePath}/items`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        const payload = {
          name: itemForm.name,
          description: itemForm.description,
          price: Number(itemForm.price),
          category: itemForm.category,
          restaurant: restaurantId,
          isVegetarian: itemForm.isVegetarian,
          isGlutenFree: itemForm.isGlutenFree,
          preparationTime: itemForm.preparationTime === '' ? undefined : Number(itemForm.preparationTime),
        };

        response = await api.post(`${menuBasePath}/items`, payload);
      }

      const createdItem = response?.data?.menuItem;

      if (createdItem) {
        const resolvedCategory = typeof createdItem.category === 'string'
          ? categories.find((category) => category._id === createdItem.category) || createdItem.category
          : createdItem.category;

        setMenuItems((previousItems) => [
          {
            ...createdItem,
            category: resolvedCategory,
          },
          ...previousItems,
        ]);
      }

      setIsItemModalOpen(false);
      resetItemForm();
      toast.success(text.itemCreated);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    try {
      await api.delete(`${menuBasePath}/items/${itemId}`);
      setMenuItems((previousItems) => previousItems.filter((item) => item._id !== itemId));
      toast.success(text.itemDeleted);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const handleToggleAvailability = async (itemId) => {
    try {
      const response = await api.patch(`${menuBasePath}/items/${itemId}/toggle`);
      const updatedItem = response?.data?.menuItem;
      const updatedAvailability = updatedItem?.isAvailable;

      setMenuItems((previousItems) =>
        previousItems.map((item) => {
          if (item._id !== itemId) return item;

          return {
            ...item,
            isAvailable:
              typeof updatedAvailability === 'boolean'
                ? updatedAvailability
                : !item.isAvailable,
          };
        })
      );
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  // Animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
  };

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const query = searchQuery.toLowerCase();
      const itemNames = [item?.name?.fr, item?.name?.en, item?.name?.ar]
        .filter((name) => typeof name === 'string')
        .map((name) => name.toLowerCase());
      const matchesSearch = itemNames.some((name) => name.includes(query));
      const itemCategoryName = getCategoryName(item?.category, currentLanguage);
      const matchesCategory = categoryFilter === 'All' || itemCategoryName === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchQuery, categoryFilter, currentLanguage]);

  return (
    <ManagerLayout>
      <div className="space-y-6">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-100" style={{ fontFamily: "'Playfair Display', serif" }}>
            {text.pageTitle}
          </h2>
          
          <div className="flex p-1 bg-[#0d1f3c] rounded-lg border border-[#1e3a5f] w-fit">
            <button
              onClick={() => setActiveTab('items')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'items' 
                  ? 'bg-[#c9963a] text-[#0d1f3c]' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {text.menuItems}
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'categories' 
                  ? 'bg-[#c9963a] text-[#0d1f3c]' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {text.categories}
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-2xl p-4 text-sm text-slate-300">
            {text.loadingMenuData}
          </div>
        )}

        {/* Categories Tab Content */}
        {activeTab === 'categories' && (
          <Motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="flex justify-end">
              <button 
                onClick={() => setIsCategoryModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#c9963a] hover:bg-[#a07830] text-[#0d1f3c] px-4 py-2 rounded-xl font-semibold transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>{text.addCategory}</span>
              </button>
            </div>

            <Motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {categories.map((cat) => (
                <Motion.div
                  key={cat._id}
                  variants={cardVariants}
                  className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-2xl p-6 relative group hover:border-[#1e5080] transition-colors"
                >
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 bg-[#132845] text-slate-400 hover:text-[#c9963a] rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat._id)}
                      className="p-2 bg-[#132845] text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-100 mb-2">{getCategoryName(cat, currentLanguage) || text.unnamedCategory}</h3>
                  <p className="text-sm text-slate-400 mb-4">{cat?.name?.en || '-'} • {cat?.name?.ar || '-'}</p>
                  
                  <div className="flex items-center text-sm text-[#c9963a] font-medium">
                    <div className="w-2 h-2 rounded-full bg-[#c9963a] mr-2" />
                    {categoryItemCounts[cat._id] || 0} {text.itemsCount}
                  </div>
                </Motion.div>
              ))}
              {!isLoading && categories.length === 0 && (
                <div className="col-span-full bg-[#0d1f3c] border border-[#1e3a5f] rounded-2xl p-6 text-slate-400 text-center">
                  {text.noCategories}
                </div>
              )}
            </Motion.div>
          </Motion.div>
        )}

        {/* Menu Items Tab Content */}
        {activeTab === 'items' && (
          <Motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-[#0d1f3c] p-4 rounded-2xl border border-[#1e3a5f]">
              <div className="flex flex-col sm:flex-row w-full gap-3">
                <div className="relative w-full max-w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input 
                    type="text"
                    placeholder={text.searchItems}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#c9963a] transition-colors"
                  />
                </div>
                <div className="relative w-full sm:w-auto">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 appearance-none focus:outline-none focus:border-[#c9963a] transition-colors cursor-pointer"
                  >
                    <option value="All">{text.allCategories}</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={getCategoryName(cat, currentLanguage)}>{getCategoryName(cat, currentLanguage)}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  if (categories.length === 0) {
                    toast.error(text.createCategoryFirst);
                    return;
                  }
                  setIsItemModalOpen(true);
                  setItemForm((previousForm) => ({
                    ...previousForm,
                    category: previousForm.category || categories[0]?._id || '',
                  }));
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#c9963a] hover:bg-[#a07830] text-[#0d1f3c] px-4 py-2 rounded-xl font-semibold transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>{text.addItem}</span>
              </button>
            </div>

            {/* Items Grid */}
            <Motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            >
              {filteredItems.map((item) => (
                <Motion.div
                  key={item._id}
                  variants={cardVariants}
                  className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-2xl overflow-hidden flex flex-col group hover:border-[#1e5080] transition-colors"
                >
                  {/* Image Placeholder */}
                  <div className="h-40 bg-[#132845] relative flex items-center justify-center border-b border-[#1e3a5f]">
                    {item.image ? (
                      <img src={item.image} alt={getLocalizedField(item?.name, currentLanguage) || text.menuItems} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-slate-600" />
                    )}
                    <div className="absolute top-3 right-3 flex gap-2">
                       <button className="p-2 bg-black/50 backdrop-blur-sm text-slate-200 hover:text-[#c9963a] rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMenuItem(item._id)}
                        className="p-2 bg-black/50 backdrop-blur-sm text-slate-200 hover:text-red-500 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-slate-100">{getLocalizedField(item?.name, currentLanguage) || text.unnamedItem}</h3>
                      <span className="font-bold text-[#c9963a]">{Number(item.price || 0).toFixed(2)} TND</span>
                    </div>
                    
                    <div className="mb-4">
                      <span className="inline-block px-2 py-1 bg-[#132845] border border-[#1e3a5f] text-xs text-slate-400 rounded-md">
                        {getCategoryName(item.category, currentLanguage) || text.uncategorized}
                      </span>
                      <span className="inline-block ml-2 text-xs text-slate-500">
                        ⏱ {item.preparationTime || '-'} {text.prepTimeSuffix}
                      </span>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-[#1e3a5f] flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-400">{text.available}</span>
                      
                      {/* Custom Toggle Switch */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={Boolean(item.isAvailable)}
                          onChange={() => handleToggleAvailability(item._id)}
                        />
                        <div className="w-11 h-6 bg-[#1e3a5f] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#c9963a]"></div>
                      </label>
                    </div>
                  </div>
                </Motion.div>
              ))}
              {!isLoading && filteredItems.length === 0 && (
                <div className="col-span-full bg-[#0d1f3c] border border-[#1e3a5f] rounded-2xl p-6 text-slate-400 text-center">
                  {text.noItemsMatch}
                </div>
              )}
            </Motion.div>
          </Motion.div>
        )}
      </div>

      {/* --- MODALS --- */}
      
      {/* Category Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <Motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => {
                setIsCategoryModalOpen(false);
                resetCategoryForm();
              }}
            />
            <Motion.div 
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md md:max-w-lg mx-4 max-h-[90vh] overflow-y-auto relative z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6 border-b border-[#1e3a5f]/50 pb-4">
                <h3 className="text-2xl font-bold text-slate-100" style={{ fontFamily: "'Playfair Display', serif" }}>{text.addCategoryTitle}</h3>
                <button 
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    resetCategoryForm();
                  }}
                  className="p-2 text-slate-400 hover:text-[#c9963a] bg-[#132845] rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleCreateCategory}>
                <div>
                  <label htmlFor="cat-fr" className="block text-sm font-medium text-slate-400 mb-1.5">{text.nameFrench}</label>
                  <input 
                    type="text" 
                    id="cat-fr"
                    placeholder={text.categoryFrPlaceholder}
                    value={categoryForm.fr}
                    onChange={(e) => setCategoryForm((previousForm) => ({ ...previousForm, fr: e.target.value }))}
                    required
                    className="w-full px-4 py-3 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#c9963a] focus:ring-1 focus:ring-amber-500 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="cat-en" className="block text-sm font-medium text-slate-400 mb-1.5">{text.nameEnglish}</label>
                  <input 
                    type="text" 
                    id="cat-en"
                    placeholder={text.categoryEnPlaceholder}
                    value={categoryForm.en}
                    onChange={(e) => setCategoryForm((previousForm) => ({ ...previousForm, en: e.target.value }))}
                    required
                    className="w-full px-4 py-3 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#c9963a] focus:ring-1 focus:ring-amber-500 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="cat-ar" className="block text-sm font-medium text-slate-400 mb-1.5">{text.nameArabic}</label>
                  <input 
                    type="text" 
                    id="cat-ar"
                    placeholder={text.categoryArPlaceholder}
                    dir="rtl"
                    value={categoryForm.ar}
                    onChange={(e) => setCategoryForm((previousForm) => ({ ...previousForm, ar: e.target.value }))}
                    required
                    className="w-full px-4 py-3 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#c9963a] focus:ring-1 focus:ring-amber-500 transition-all"
                  />
                </div>
                
                <div className="pt-2">
                  <label htmlFor="cat-order" className="block text-sm font-medium text-slate-400 mb-1.5">{text.displayOrder}</label>
                  <input 
                    type="number" 
                    id="cat-order"
                    value={categoryForm.order}
                    onChange={(e) => setCategoryForm((previousForm) => ({ ...previousForm, order: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 focus:outline-none focus:border-[#c9963a] focus:ring-1 focus:ring-amber-500 transition-all"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsCategoryModalOpen(false);
                      resetCategoryForm();
                    }}
                    className="flex-1 py-3 px-4 bg-[#132845] hover:bg-[#1e3a5f] text-slate-300 rounded-xl font-medium transition-colors"
                  >
                    {text.cancel}
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingCategory}
                    className="flex-1 py-3 px-4 bg-[#c9963a] hover:bg-[#a07830] text-[#0d1f3c] rounded-xl font-semibold transition-colors"
                  >
                    {isSubmittingCategory ? text.saving : text.saveCategory}
                  </button>
                </div>
              </form>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Menu Item Modal */}
      <AnimatePresence>
        {isItemModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <Motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => {
                setIsItemModalOpen(false);
                resetItemForm();
              }}
            />
            <Motion.div 
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-2xl w-full max-w-sm sm:max-w-md md:max-w-lg mx-4 relative z-10 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center p-4 sm:p-6 border-b border-[#1e3a5f]">
                <h3 className="text-2xl font-bold text-slate-100" style={{ fontFamily: "'Playfair Display', serif" }}>{text.addMenuItemTitle}</h3>
                <button 
                  onClick={() => {
                    setIsItemModalOpen(false);
                    resetItemForm();
                  }}
                  className="p-2 text-slate-400 hover:text-[#c9963a] bg-[#132845] rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
                <form id="item-form" className="space-y-8" onSubmit={handleCreateMenuItem}>
                  
                  {/* Image Upload */}
                  <label htmlFor="item-image-upload" className="w-full h-40 border-2 border-dashed border-[#1e3a5f] rounded-2xl flex flex-col items-center justify-center bg-[#132845]/50 hover:bg-[#132845] hover:border-[#c9963a]/50 transition-colors cursor-pointer group overflow-hidden">
                    {itemImagePreview ? (
                      <img src={itemImagePreview} alt="Item preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <div className="p-3 bg-[#0d1f3c] rounded-full mb-3 group-hover:scale-110 transition-transform">
                          <ImageIcon className="w-6 h-6 text-slate-400 group-hover:text-[#c9963a] transition-colors" />
                        </div>
                        <span className="text-sm font-medium text-slate-300">{text.uploadItemImage}</span>
                        <span className="text-xs text-slate-500 mt-1">{text.uploadHint}</span>
                      </>
                    )}
                  </label>
                  <input
                    id="item-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleItemImageChange}
                    className="hidden"
                  />

                  {/* Two Column Layout for Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Left Column: Translations */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-bold text-slate-100 mb-4 flex items-center">
                          <span className="w-2 h-2 rounded-full bg-[#c9963a] mr-2"></span>
                          {text.namesDescriptions}
                        </h4>
                        
                        <div className="space-y-4">
                          {/* French */}
                          <div className="p-4 bg-[#132845]/50 border border-[#1e3a5f] rounded-xl space-y-3">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{text.french}</span>
                            <input
                              type="text"
                              placeholder={text.itemNameFr}
                              value={itemForm.name.fr}
                              onChange={(e) =>
                                setItemForm((previousForm) => ({
                                  ...previousForm,
                                  name: { ...previousForm.name, fr: e.target.value },
                                }))
                              }
                              required
                              className="w-full px-3 py-2 bg-[#0d1f3c] border border-[#1e3a5f] rounded-lg text-slate-100 text-sm focus:outline-none focus:border-[#c9963a]"
                            />
                            <textarea
                              rows="2"
                              placeholder={text.descFr}
                              value={itemForm.description.fr}
                              onChange={(e) =>
                                setItemForm((previousForm) => ({
                                  ...previousForm,
                                  description: { ...previousForm.description, fr: e.target.value },
                                }))
                              }
                              className="w-full px-3 py-2 bg-[#0d1f3c] border border-[#1e3a5f] rounded-lg text-slate-100 text-sm focus:outline-none focus:border-[#c9963a] resize-none"
                            ></textarea>
                          </div>
                          
                          {/* English */}
                          <div className="p-4 bg-[#132845]/50 border border-[#1e3a5f] rounded-xl space-y-3">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{text.english}</span>
                            <input
                              type="text"
                              placeholder={text.itemNameEn}
                              value={itemForm.name.en}
                              onChange={(e) =>
                                setItemForm((previousForm) => ({
                                  ...previousForm,
                                  name: { ...previousForm.name, en: e.target.value },
                                }))
                              }
                              required
                              className="w-full px-3 py-2 bg-[#0d1f3c] border border-[#1e3a5f] rounded-lg text-slate-100 text-sm focus:outline-none focus:border-[#c9963a]"
                            />
                            <textarea
                              rows="2"
                              placeholder={text.descEn}
                              value={itemForm.description.en}
                              onChange={(e) =>
                                setItemForm((previousForm) => ({
                                  ...previousForm,
                                  description: { ...previousForm.description, en: e.target.value },
                                }))
                              }
                              className="w-full px-3 py-2 bg-[#0d1f3c] border border-[#1e3a5f] rounded-lg text-slate-100 text-sm focus:outline-none focus:border-[#c9963a] resize-none"
                            ></textarea>
                          </div>

                          {/* Arabic */}
                          <div className="p-4 bg-[#132845]/50 border border-[#1e3a5f] rounded-xl space-y-3">
                            <div className="flex justify-end">
                              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{text.arabic}</span>
                            </div>
                            <input
                              type="text"
                              dir="rtl"
                              placeholder={text.itemNameAr}
                              value={itemForm.name.ar}
                              onChange={(e) =>
                                setItemForm((previousForm) => ({
                                  ...previousForm,
                                  name: { ...previousForm.name, ar: e.target.value },
                                }))
                              }
                              required
                              className="w-full px-3 py-2 bg-[#0d1f3c] border border-[#1e3a5f] rounded-lg text-slate-100 text-sm focus:outline-none focus:border-[#c9963a]"
                            />
                            <textarea
                              rows="2"
                              dir="rtl"
                              placeholder={text.descAr}
                              value={itemForm.description.ar}
                              onChange={(e) =>
                                setItemForm((previousForm) => ({
                                  ...previousForm,
                                  description: { ...previousForm.description, ar: e.target.value },
                                }))
                              }
                              className="w-full px-3 py-2 bg-[#0d1f3c] border border-[#1e3a5f] rounded-lg text-slate-100 text-sm focus:outline-none focus:border-[#c9963a] resize-none"
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Settings */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-bold text-slate-100 mb-4 flex items-center">
                          <span className="w-2 h-2 rounded-full bg-[#0891b2] mr-2"></span>
                          {text.itemDetails}
                        </h4>
                        
                        <div className="space-y-5">
                          {/* Category & Prep Time */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-400 mb-1.5">{text.category}</label>
                              <select
                                value={itemForm.category}
                                onChange={(e) =>
                                  setItemForm((previousForm) => ({
                                    ...previousForm,
                                    category: e.target.value,
                                  }))
                                }
                                required
                                className="w-full px-4 py-2.5 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 text-sm focus:outline-none focus:border-[#c9963a] transition-all cursor-pointer"
                              >
                                <option value="" disabled hidden>{text.select}</option>
                                {categories.map((cat) => (
                                  <option key={cat._id} value={cat._id}>{getCategoryName(cat, currentLanguage)}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                               <label className="block text-xs font-medium text-slate-400 mb-1.5">{text.prepTimeMin}</label>
                              <div className="relative">
                                <input
                                  type="number"
                                  placeholder="15"
                                  value={itemForm.preparationTime}
                                  onChange={(e) =>
                                    setItemForm((previousForm) => ({
                                      ...previousForm,
                                      preparationTime: e.target.value,
                                    }))
                                  }
                                  className="w-full px-4 py-2.5 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 text-sm focus:outline-none focus:border-[#c9963a] transition-all"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{text.min}</span>
                              </div>
                            </div>
                          </div>

                          {/* Pricing */}
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">{text.price}</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                placeholder="0.00"
                                value={itemForm.price}
                                onChange={(e) =>
                                  setItemForm((previousForm) => ({
                                    ...previousForm,
                                    price: e.target.value,
                                  }))
                                }
                                required
                                className="w-full px-4 py-2.5 pl-12 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 text-sm font-bold focus:outline-none focus:border-[#c9963a] transition-all"
                              />
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#c9963a]">TND</span>
                            </div>
                          </div>

                          {/* Dietary Toggles */}
                          <div className="p-4 bg-[#132845]/50 border border-[#1e3a5f] rounded-xl space-y-4">
                            <label className="flex items-center justify-between cursor-pointer">
                              <span className="text-sm font-medium text-slate-300">{text.vegetarianOption}</span>
                              <div className="relative flex items-center justify-center w-5 h-5">
                                <input
                                  type="checkbox"
                                  checked={itemForm.isVegetarian}
                                  onChange={(e) =>
                                    setItemForm((previousForm) => ({
                                      ...previousForm,
                                      isVegetarian: e.target.checked,
                                    }))
                                  }
                                  className="peer appearance-none w-5 h-5 border border-[#1e3a5f] rounded bg-[#0d1f3c] checked:bg-emerald-500 checked:border-emerald-500 transition-colors cursor-pointer"
                                />
                                <svg className="absolute w-3 h-3 text-[#0d1f3c] opacity-0 peer-checked:opacity-100 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              </div>
                            </label>
                            
                            <label className="flex items-center justify-between cursor-pointer">
                              <span className="text-sm font-medium text-slate-300">{text.glutenFreeOption}</span>
                              <div className="relative flex items-center justify-center w-5 h-5">
                                <input
                                  type="checkbox"
                                  checked={itemForm.isGlutenFree}
                                  onChange={(e) =>
                                    setItemForm((previousForm) => ({
                                      ...previousForm,
                                      isGlutenFree: e.target.checked,
                                    }))
                                  }
                                  className="peer appearance-none w-5 h-5 border border-[#1e3a5f] rounded bg-[#0d1f3c] checked:bg-[#c9963a] checked:border-[#c9963a] transition-colors cursor-pointer"
                                />
                                <svg className="absolute w-3 h-3 text-[#0d1f3c] opacity-0 peer-checked:opacity-100 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-6 border-t border-[#1e3a5f] bg-[#0f2040] rounded-b-2xl flex justify-end gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => {
                    setIsItemModalOpen(false);
                    resetItemForm();
                  }}
                  className="py-2.5 px-6 bg-[#0d1f3c] border border-[#1e3a5f] hover:bg-[#1e3a5f] text-slate-300 rounded-xl font-medium transition-colors"
                >
                  {text.cancel}
                </button>
                <button 
                  type="submit"
                  form="item-form"
                  disabled={isSubmittingItem}
                  className="py-2.5 px-8 bg-[#c9963a] hover:bg-[#a07830] text-[#0d1f3c] rounded-xl font-bold transition-colors shadow-lg shadow-[#c9963a]-500/20"
                >
                  {isSubmittingItem ? text.saving : text.saveItem}
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </ManagerLayout>
  );
};

export default MenuManagementPage;

