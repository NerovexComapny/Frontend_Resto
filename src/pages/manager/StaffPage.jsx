import React, { useEffect, useState } from 'react';
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

const StaffPage = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

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
    setEditingStaff(staffMember);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingStaff(null), 200);
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
          toast.error(error.response?.data?.message || 'Failed to load staff');
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
  }, []);

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
              Staff Management
            </h2>
            <p className="text-slate-400 mt-1">Manage your restaurant personnel and roles.</p>
          </div>
          
          <button 
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#c9963a] hover:bg-[#a07830] text-[#0d1f3c] px-4 py-2.5 rounded-xl font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Staff Member</span>
          </button>
        </div>

        {/* Filters */}
        <Motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col sm:flex-row gap-3 bg-[#132845] p-4 rounded-2xl border border-[#1e3a5f]">
          <div className="relative w-full max-w-full sm:max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search staff by name or email..."
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
              <option value="all">All Roles</option>
              <option value="manager">Manager</option>
              <option value="waiter">Waiter</option>
              <option value="cashier">Cashier</option>
              <option value="cook">Cook</option>
            </select>
          </div>
        </Motion.div>

        {/* Staff Table */}
        <Motion.div variants={containerVariants} initial="hidden" animate="visible" className="bg-[#132845] border border-[#1e3a5f] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-[#0d1f3c] text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-3 md:px-6 py-4">Employee</th>
                  <th className="px-3 md:px-6 py-4">Contact</th>
                  <th className="px-3 md:px-6 py-4">Role</th>
                  <th className="hidden md:table-cell px-3 md:px-6 py-4">Status</th>
                  <th className="px-3 md:px-6 py-4 text-right">Actions</th>
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
                        <div className="flex items-center space-x-4">
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
                          <div className="flex items-center space-x-2 text-slate-300">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            <span>{person.email}</span>
                          </div>
                          <div className="hidden md:flex items-center space-x-2 text-slate-400 text-xs">
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            <span>{person.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${styles.badge}`}>
                          {person.role}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-3 md:px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${person.isActive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                          {person.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenModal(person)}
                            className="p-2 bg-[#0d1f3c] border border-[#1e3a5f] text-slate-400 hover:text-[#c9963a] rounded-xl transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-2 bg-[#0d1f3c] border border-[#1e3a5f] text-slate-400 hover:text-red-500 rounded-xl transition-colors"
                            title="Deactivate/Delete"
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
                      No staff members found matching your filters.
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
                  <h3 className="text-2xl font-bold text-slate-100 flex items-center space-x-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                    <Shield className="w-6 h-6 text-[#c9963a]" />
                    <span>{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</span>
                  </h3>
                  <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-[#c9963a] bg-[#132845] rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto">
                  <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleCloseModal(); }}>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                          <input 
                            type="text" 
                            defaultValue={editingStaff?.name || ''}
                            placeholder="e.g. John Doe"
                            className="w-full pl-12 pr-4 py-3 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#c9963a] focus:ring-1 focus:ring-amber-500 transition-all"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                          <input 
                            type="tel" 
                            defaultValue={editingStaff?.phone || ''}
                            placeholder="+216XX XXXXXX"
                            className="w-full pl-12 pr-4 py-3 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#c9963a] focus:ring-1 focus:ring-amber-500 transition-all"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input 
                          type="email" 
                          defaultValue={editingStaff?.email || ''}
                          placeholder="staff@restaurant.com"
                          className="w-full pl-12 pr-4 py-3 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#c9963a] focus:ring-1 focus:ring-amber-500 transition-all"
                          required
                        />
                      </div>
                    </div>

                    {!editingStaff && (
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">Temporary Password</label>
                        <input 
                          type="password" 
                          placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                          className="w-full px-4 py-3 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#c9963a] focus:ring-1 focus:ring-amber-500 transition-all"
                          required
                        />
                        <p className="text-xs text-slate-500 mt-2">The staff member will be prompted to change this on their first login.</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1.5">Assign Role</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {['manager', 'waiter', 'cashier', 'cook'].map(role => (
                          <label key={role} className="cursor-pointer relative">
                            <input 
                              type="radio" 
                              name="role" 
                              value={role} 
                              defaultChecked={editingStaff?.role === role || (!editingStaff && role === 'waiter')}
                              className="peer sr-only" 
                            />
                            <div className="py-2.5 px-3 text-center bg-[#132845] border border-[#1e3a5f] rounded-xl text-sm font-medium text-slate-400 peer-checked:bg-[#c9963a]/10 peer-checked:text-[#c9963a] peer-checked:border-[#c9963a]/50 transition-all capitalize">
                              {role}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 flex gap-3 border-t border-[#1e3a5f]">
                      <button type="button" onClick={handleCloseModal} className="flex-1 py-3 px-4 bg-[#132845] hover:bg-[#1e3a5f] text-slate-300 rounded-xl font-medium transition-colors">
                        Cancel
                      </button>
                      <button type="submit" className="flex-1 py-3 px-4 bg-[#c9963a] hover:bg-[#a07830] text-[#0d1f3c] rounded-xl font-semibold transition-colors">
                        {editingStaff ? 'Save Changes' : 'Create Account'}
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

