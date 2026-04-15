import React, { useEffect, useMemo, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import Search from 'lucide-react/dist/esm/icons/search';
import Filter from 'lucide-react/dist/esm/icons/filter';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Edit2 from 'lucide-react/dist/esm/icons/edit-2';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import X from 'lucide-react/dist/esm/icons/x';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Phone from 'lucide-react/dist/esm/icons/phone';
import Mail from 'lucide-react/dist/esm/icons/mail';
import User from 'lucide-react/dist/esm/icons/user';
import { useTranslation } from 'react-i18next';
import ManagerLayout from '../../layouts/ManagerLayout';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const getInitials = (name) => {
  if (!name) return 'NA';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
};

const getRoleStyle = (role) => {
  switch (role) {
    case 'waiter': return { badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20', avatar: 'bg-blue-500/20 text-blue-500' };
    case 'cashier': return { badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', avatar: 'bg-emerald-500/20 text-emerald-500' };
    case 'cook': return { badge: 'bg-orange-500/10 text-orange-500 border-orange-500/20', avatar: 'bg-orange-500/20 text-orange-500' };
    case 'manager': return { badge: 'bg-[#c9963a]/10 text-[#c9963a] border-[#c9963a]/20', avatar: 'bg-[#c9963a]/20 text-[#c9963a]' };
    default: return { badge: 'bg-slate-500/10 text-slate-500 border-slate-500/20', avatar: 'bg-slate-500/20 text-slate-500' };
  }
};

const EMPTY_FORM_STATE = {
  name: '',
  phone: '',
  email: '',
  password: '',
  role: 'waiter',
};

const StaffPage = () => {
  const { i18n } = useTranslation();
  const currentLanguage = String(i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const isArabic = currentLanguage === 'ar';
  const text = useMemo(() => (
    isArabic
      ? {
          loadFailed: 'فشل تحميل فريق العمل',
          title: 'إدارة الفريق',
          subtitle: 'إدارة موظفي المطعم والأدوار',
          addStaff: 'إضافة موظف',
          searchPlaceholder: 'ابحث بالاسم أو البريد...',
          allRoles: 'كل الأدوار',
          manager: 'مدير',
          waiter: 'نادل',
          cashier: 'أمين صندوق',
          cook: 'طباخ',
          employee: 'الموظف',
          contact: 'التواصل',
          role: 'الدور',
          status: 'الحالة',
          actions: 'الإجراءات',
          active: 'نشط',
          inactive: 'غير نشط',
          edit: 'تعديل',
          deactivateDelete: 'إيقاف/حذف',
          noStaff: 'لا يوجد موظفون مطابقون للفلاتر',
          editStaff: 'تعديل موظف',
          addStaffModal: 'إضافة موظف',
          fullName: 'الاسم الكامل',
          fullNamePlaceholder: 'مثال: محمد علي',
          phoneNumber: 'رقم الهاتف',
          phonePlaceholder: '+216XX XXXXXX',
          emailAddress: 'البريد الإلكتروني',
          emailPlaceholder: 'staff@restaurant.com',
          tempPassword: 'كلمة مرور مؤقتة',
          tempPasswordPlaceholder: '********',
          tempPasswordHint: 'سيُطلب من الموظف تغيير كلمة المرور عند أول تسجيل دخول.',
          assignRole: 'تعيين الدور',
          cancel: 'إلغاء',
          saveChanges: 'حفظ التعديلات',
          createAccount: 'إنشاء حساب',
          staffCreated: 'تم إنشاء الموظف بنجاح',
          staffUpdated: 'تم تحديث الموظف بنجاح',
          staffDeactivated: 'تم إيقاف الموظف بنجاح',
          updateFailed: 'فشل تحديث الموظف',
          createFailed: 'فشل إنشاء الموظف',
          deactivateFailed: 'فشل إيقاف الموظف',
          requiredFields: 'الرجاء تعبئة الحقول المطلوبة',
        }
      : {
          loadFailed: 'Failed to load staff',
          title: 'Staff Management',
          subtitle: 'Manage your restaurant personnel and roles.',
          addStaff: 'Add Staff Member',
          searchPlaceholder: 'Search staff by name or email...',
          allRoles: 'All Roles',
          manager: 'Manager',
          waiter: 'Waiter',
          cashier: 'Cashier',
          cook: 'Cook',
          employee: 'Employee',
          contact: 'Contact',
          role: 'Role',
          status: 'Status',
          actions: 'Actions',
          active: 'Active',
          inactive: 'Inactive',
          edit: 'Edit',
          deactivateDelete: 'Deactivate/Delete',
          noStaff: 'No staff members found matching your filters.',
          editStaff: 'Edit Staff Member',
          addStaffModal: 'Add Staff Member',
          fullName: 'Full Name',
          fullNamePlaceholder: 'e.g. John Doe',
          phoneNumber: 'Phone Number',
          phonePlaceholder: '+216XX XXXXXX',
          emailAddress: 'Email Address',
          emailPlaceholder: 'staff@restaurant.com',
          tempPassword: 'Temporary Password',
          tempPasswordPlaceholder: '********',
          tempPasswordHint: 'The staff member will be prompted to change this on their first login.',
          assignRole: 'Assign Role',
          cancel: 'Cancel',
          saveChanges: 'Save Changes',
          createAccount: 'Create Account',
          staffCreated: 'Staff member created successfully',
          staffUpdated: 'Staff member updated successfully',
          staffDeactivated: 'Staff member deactivated successfully',
          updateFailed: 'Failed to update staff member',
          createFailed: 'Failed to create staff member',
          deactivateFailed: 'Failed to deactivate staff member',
          requiredFields: 'Please fill all required fields',
        }
  ), [isArabic]);

  const roleLabels = useMemo(() => ({
    manager: text.manager,
    waiter: text.waiter,
    cashier: text.cashier,
    cook: text.cook,
  }), [text]);

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM_STATE);
  const [isSaving, setIsSaving] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  const handleOpenModal = (staffMember = null) => {
    const nextFormData = staffMember
      ? {
          name: staffMember?.name || '',
          phone: staffMember?.phone || '',
          email: staffMember?.email || '',
          password: '',
          role: staffMember?.role || 'waiter',
        }
      : EMPTY_FORM_STATE;

    setFormData(nextFormData);
    setEditingStaff(staffMember);
    setIsModalOpen(true);
  };

  const handleCloseModal = (force = false) => {
    if (isSaving && !force) return;

    setIsModalOpen(false);
    setTimeout(() => {
      setEditingStaff(null);
      setFormData(EMPTY_FORM_STATE);
    }, 200);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmitStaff = async (event) => {
    event.preventDefault();

    const payload = {
      name: String(formData.name || '').trim(),
      phone: String(formData.phone || '').trim(),
      email: String(formData.email || '').trim(),
      role: String(formData.role || 'waiter').trim(),
    };

    const password = String(formData.password || '').trim();

    if (!payload.name || !payload.email || !payload.role) {
      toast.error(text.requiredFields);
      return;
    }

    if (!editingStaff?._id && !password) {
      toast.error(text.requiredFields);
      return;
    }

    setIsSaving(true);

    try {
      if (editingStaff?._id) {
        const response = await api.put(`/users/${editingStaff._id}`, payload);
        const updatedUser = response?.data?.user || { ...editingStaff, ...payload };

        setStaff((previousStaff) => previousStaff.map((person) => (
          person._id === editingStaff._id
            ? { ...person, ...updatedUser }
            : person
        )));

        toast.success(text.staffUpdated);
      } else {
        const response = await api.post('/staff', {
          ...payload,
          password,
        });

        const createdUser = response?.data?.user;
        if (createdUser) {
          setStaff((previousStaff) => [createdUser, ...previousStaff]);
        }

        toast.success(text.staffCreated);
      }

      handleCloseModal(true);
    } catch (error) {
      const fallbackMessage = editingStaff?._id ? text.updateFailed : text.createFailed;
      toast.error(error?.response?.data?.message || fallbackMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivateStaff = async (staffId) => {
    try {
      await api.delete(`/users/${staffId}`);
      setStaff((previousStaff) => previousStaff.map((person) => (
        person._id === staffId
          ? { ...person, isActive: false }
          : person
      )));
      toast.success(text.staffDeactivated);
    } catch (error) {
      toast.error(error?.response?.data?.message || text.deactivateFailed);
    }
  };

  useEffect(() => {
    let isActive = true;

    const fetchStaff = async () => {
      setLoading(true);
      try {
        const response = await api.get('/staff');
        const list = Array.isArray(response?.data?.staff)
          ? response.data.staff
          : Array.isArray(response?.data?.users)
            ? response.data.users
            : [];

        if (isActive) {
          setStaff(list);
        }
      } catch (error) {
        if (isActive) {
          toast.error(error.response?.data?.message || text.loadFailed);
          setStaff([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchStaff();

    return () => {
      isActive = false;
    };
  }, [text.loadFailed]);

  const filteredStaff = staff.filter(s => {
    const name = String(s?.name || '');
    const email = String(s?.email || '');
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || s.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <ManagerLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#c9963a] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout>
      <div className="space-y-6">
        
        {/* Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-100" style={{ fontFamily: "'Playfair Display', serif" }}>
              {text.title}
            </h2>
            <p className="text-slate-400 mt-1">{text.subtitle}</p>
          </div>
          
          <button 
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#c9963a] hover:bg-[#a07830] text-[#0d1f3c] px-4 py-2.5 rounded-xl font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>{text.addStaff}</span>
          </button>
        </div>

        {/* Filters */}
        <Motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col sm:flex-row gap-3 bg-[#132845] p-4 rounded-2xl border border-[#1e3a5f]">
          <div className="relative w-full max-w-full sm:max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              type="text" 
              placeholder={text.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-[#0d1f3c] border border-[#1e3a5f] rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#c9963a] focus:ring-1 focus:ring-amber-500 transition-colors"
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <select 
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-[#0d1f3c] border border-[#1e3a5f] rounded-xl text-slate-100 outline-none focus:border-[#c9963a] focus:ring-1 focus:ring-amber-500 transition-colors appearance-none cursor-pointer"
            >
              <option value="all">{text.allRoles}</option>
              <option value="manager">{text.manager}</option>
              <option value="waiter">{text.waiter}</option>
              <option value="cashier">{text.cashier}</option>
              <option value="cook">{text.cook}</option>
            </select>
          </div>
        </Motion.div>

        {/* Staff Table */}
        <Motion.div variants={containerVariants} initial="hidden" animate="visible" className="bg-[#132845] border border-[#1e3a5f] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-[#0d1f3c] text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-3 md:px-6 py-4">{text.employee}</th>
                  <th className="px-3 md:px-6 py-4">{text.contact}</th>
                  <th className="px-3 md:px-6 py-4">{text.role}</th>
                  <th className="hidden md:table-cell px-3 md:px-6 py-4">{text.status}</th>
                  <th className="px-3 md:px-6 py-4 text-right">{text.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e3a5f]">
                {filteredStaff.map((person, i) => {
                  const styles = getRoleStyle(person.role);
                  return (
                    <Motion.tr 
                      key={person._id}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="hover:bg-[#0d1f3c]/50 transition-colors group"
                    >
                      <td className="px-3 md:px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${styles.avatar}`}>
                            {getInitials(person.name)}
                          </div>
                          <div>
                            <p className="text-slate-100 font-semibold">{person.name}</p>
                            <p className="text-slate-500 text-xs">{person._id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-slate-300">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            <span>{person.email}</span>
                          </div>
                          <div className="hidden md:flex items-center gap-2 text-slate-400 text-xs">
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            <span>{person.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${styles.badge}`}>
                          {roleLabels[person.role] || person.role}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-3 md:px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${person.isActive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                          {person.isActive ? text.active : text.inactive}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenModal(person)}
                            className="p-2 bg-[#0d1f3c] border border-[#1e3a5f] text-slate-400 hover:text-[#c9963a] rounded-xl transition-colors"
                            title={text.edit}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeactivateStaff(person._id)}
                            className="p-2 bg-[#0d1f3c] border border-[#1e3a5f] text-slate-400 hover:text-red-500 rounded-xl transition-colors"
                            title={text.deactivateDelete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </Motion.tr>
                  );
                })}
                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-3 md:px-6 py-12 text-center text-slate-400">
                      {text.noStaff}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Motion.div>

        {/* Add/Edit Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <Motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={handleCloseModal}
              />
              <Motion.div 
                variants={modalVariants} initial="hidden" animate="visible" exit="exit"
                className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-2xl w-full max-w-sm sm:max-w-md md:max-w-lg mx-4 relative z-10 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center p-4 sm:p-6 border-b border-[#1e3a5f]">
                  <h3 className="text-2xl font-bold text-slate-100 flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                    <Shield className="w-6 h-6 text-[#c9963a]" />
                    <span>{editingStaff ? text.editStaff : text.addStaffModal}</span>
                  </h3>
                  <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-[#c9963a] bg-[#132845] rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto">
                  <form className="space-y-5" onSubmit={handleSubmitStaff}>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">{text.fullName}</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                          <input 
                            name="name"
                            type="text" 
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder={text.fullNamePlaceholder}
                            className="w-full pl-12 pr-4 py-3 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#c9963a] focus:ring-1 focus:ring-amber-500 transition-all"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">{text.phoneNumber}</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                          <input 
                            name="phone"
                            type="tel" 
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder={text.phonePlaceholder}
                            className="w-full pl-12 pr-4 py-3 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#c9963a] focus:ring-1 focus:ring-amber-500 transition-all"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">{text.emailAddress}</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input 
                          name="email"
                          type="email" 
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder={text.emailPlaceholder}
                          className="w-full pl-12 pr-4 py-3 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#c9963a] focus:ring-1 focus:ring-amber-500 transition-all"
                          required
                        />
                      </div>
                    </div>

                    {!editingStaff && (
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">{text.tempPassword}</label>
                        <input 
                          name="password"
                          type="password" 
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder={text.tempPasswordPlaceholder}
                          className="w-full px-4 py-3 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#c9963a] focus:ring-1 focus:ring-amber-500 transition-all"
                          required
                        />
                        <p className="text-xs text-slate-500 mt-2">{text.tempPasswordHint}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">{text.assignRole}</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {['manager', 'waiter', 'cashier', 'cook'].map(role => (
                          <label key={role} className="cursor-pointer relative">
                            <input 
                              type="radio" 
                              name="role" 
                              value={role} 
                              checked={formData.role === role}
                              onChange={handleInputChange}
                              className="peer sr-only" 
                            />
                            <div className="py-2.5 px-3 text-center bg-[#132845] border border-[#1e3a5f] rounded-xl text-sm font-medium text-slate-400 peer-checked:bg-[#c9963a]/10 peer-checked:text-[#c9963a] peer-checked:border-[#c9963a]/50 transition-all">
                              {roleLabels[role] || role}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 flex gap-3 border-t border-[#1e3a5f]">
                      <button type="button" onClick={handleCloseModal} disabled={isSaving} className="flex-1 py-3 px-4 bg-[#132845] hover:bg-[#1e3a5f] text-slate-300 rounded-xl font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                        {text.cancel}
                      </button>
                      <button type="submit" disabled={isSaving} className="flex-1 py-3 px-4 bg-[#c9963a] hover:bg-[#a07830] text-[#0d1f3c] rounded-xl font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                        {isSaving ? (isArabic ? 'جار الحفظ...' : 'Saving...') : (editingStaff ? text.saveChanges : text.createAccount)}
                      </button>
                    </div>
                  </form>
                </div>
              </Motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </ManagerLayout>
  );
};

export default StaffPage;

