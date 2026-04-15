import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Users from 'lucide-react/dist/esm/icons/users';
import QrCode from 'lucide-react/dist/esm/icons/qr-code';
import Edit2 from 'lucide-react/dist/esm/icons/edit-2';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import X from 'lucide-react/dist/esm/icons/x';
import Download from 'lucide-react/dist/esm/icons/download';
import Printer from 'lucide-react/dist/esm/icons/printer';
import { useTranslation } from 'react-i18next';
import ManagerLayout from '../../layouts/ManagerLayout';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const getStatusStyle = (status) => {
  switch (status) {
    case 'available': return { dot: 'bg-emerald-500', text: 'text-emerald-500', bg: 'bg-[#0d1f3c] hover:bg-[#132845]', border: 'border-[#1e3a5f] border-emerald-500/20' };
    case 'occupied': return { dot: 'bg-red-500', text: 'text-red-500', bg: 'bg-red-500/5 hover:bg-red-500/10', border: 'border-red-500/30' };
    case 'reserved': return { dot: 'bg-[#7c6af7]', text: 'text-[#7c6af7]', bg: 'bg-[#7c6af7]/5 hover:bg-[#7c6af7]/10', border: 'border-[#7c6af7]/30' };
    default: return { dot: 'bg-slate-500', text: 'text-slate-500', bg: 'bg-[#0d1f3c]', border: 'border-[#1e3a5f]' };
  }
};

const getTablesEndpoint = () => {
  const baseURL = String(api.defaults.baseURL || '');
  return /\/api\/?$/.test(baseURL) ? '/tables' : '/api/tables';
};

const getRegenerateQRsEndpoint = () => `${getTablesEndpoint()}/regenerate-all-qr`;

const TablesPage = () => {
  const { t } = useTranslation();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRegeneratingQrs, setIsRegeneratingQrs] = useState(false);
  const [editingTableId, setEditingTableId] = useState('');
  const [selectedQrTable, setSelectedQrTable] = useState(null);
  const [newTable, setNewTable] = useState({ number: '', capacity: '4' });
  const [editTable, setEditTable] = useState({ number: '', capacity: '4', status: 'available' });
  const user = useAuthStore((state) => state.user);

  const getRequestError = (error) => {
    return error?.response?.data?.message || error?.message || 'Request failed';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 100 } }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  useEffect(() => {
    let isActive = true;

    const fetchTables = async () => {
      setLoading(true);
      try {
        const response = await api.get(getTablesEndpoint());
        if (!isActive) return;

        const apiTables = Array.isArray(response?.data?.tables) ? response.data.tables : [];
        setTables(apiTables);
      } catch (error) {
        if (isActive) {
          toast.error(getRequestError(error));
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchTables();

    return () => {
      isActive = false;
    };
  }, []);

  const handleCreateTable = async (event) => {
    event.preventDefault();

    const number = Number(newTable.number);
    const capacity = Number(newTable.capacity) || 4;

    if (!number || number <= 0) {
      toast.error(t('manager.tables.tableNumberPositive'));
      return;
    }

    if (!capacity || capacity <= 0) {
      toast.error(t('manager.tables.capacityPositive'));
      return;
    }

    try {
      const payload = {
        number,
        capacity,
      };

      const response = await api.post(getTablesEndpoint(), payload);
      const createdTable = response?.data?.table;

      if (createdTable) {
        setTables((previousTables) => [createdTable, ...previousTables]);
      }

      setIsAddModalOpen(false);
      setNewTable({ number: '', capacity: '4' });
      toast.success(t('manager.tables.tableCreated'));
    } catch (error) {
      if (error?.response?.data?.message === 'Table number already exists') {
        toast.error(t('manager.tables.tableNumberExists'));
        return;
      }
      toast.error(getRequestError(error));
    }
  };

  const openEditModal = (table) => {
    setEditingTableId(String(table?._id || ''));
    setEditTable({
      number: String(table?.number ?? ''),
      capacity: String(table?.capacity ?? '4'),
      status: table?.status || 'available',
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTableId('');
    setEditTable({ number: '', capacity: '4', status: 'available' });
  };

  const handleUpdateTable = async (event) => {
    event.preventDefault();

    if (!editingTableId) {
      toast.error(t('manager.tables.missingTableId'));
      return;
    }

    const number = Number(editTable.number);
    const capacity = Number(editTable.capacity) || 4;

    if (!number || number <= 0) {
      toast.error(t('manager.tables.tableNumberPositive'));
      return;
    }

    if (!capacity || capacity <= 0) {
      toast.error(t('manager.tables.capacityPositive'));
      return;
    }

    try {
      const payload = {
        number,
        capacity,
        status: editTable.status,
      };

      const response = await api.put(`${getTablesEndpoint()}/${editingTableId}`, payload);
      const updatedTable = response?.data?.table;

      if (updatedTable?._id) {
        setTables((previousTables) =>
          previousTables.map((table) =>
            table._id === updatedTable._id ? updatedTable : table
          )
        );
      }

      closeEditModal();
      toast.success(t('manager.tables.tableUpdated'));
    } catch (error) {
      toast.error(getRequestError(error));
    }
  };

  const handleDeleteTable = async (tableId) => {
    try {
      await api.delete(`${getTablesEndpoint()}/${tableId}`);
      setTables((previousTables) => previousTables.filter((table) => table._id !== tableId));
      toast.success(t('manager.tables.tableDeleted'));
    } catch (error) {
      toast.error(getRequestError(error));
    }
  };

  const handleDownloadQR = (table) => {
    if (!table?.qrCode) return;
    const link = document.createElement('a');
    link.href = table.qrCode;
    link.download = `table-${table.number}-qr.png`;
    link.click();
  };

  const handleRegenerateAllQrs = async () => {
    if (isRegeneratingQrs) return;

    setIsRegeneratingQrs(true);
    try {
      await api.post(getRegenerateQRsEndpoint());
      const response = await api.get(getTablesEndpoint());
      const apiTables = Array.isArray(response?.data?.tables) ? response.data.tables : [];
      setTables(apiTables);
      toast.success(t('manager.tables.qrRegeneratedAll', { count: apiTables.length }));
    } catch (error) {
      toast.error(getRequestError(error));
    } finally {
      setIsRegeneratingQrs(false);
    }
  };

  return (
    <ManagerLayout>
      <div className="space-y-6">
        
        {/* Header Options */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-100" style={{ fontFamily: "'Playfair Display', serif" }}>
              {t('manager.tables.title')}
            </h2>
            <div className="text-slate-400 mt-1 capitalize text-sm flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 translate-y-px"></span>
                {t('manager.tables.available')}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 translate-y-px"></span>
                {t('manager.tables.occupied')}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#7c6af7] translate-y-px"></span>
                {t('manager.tables.reserved')}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-2">
            <button
              onClick={handleRegenerateAllQrs}
              disabled={isRegeneratingQrs}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#132845] hover:bg-[#1e3a5f] disabled:opacity-60 disabled:cursor-not-allowed text-slate-200 px-4 py-2.5 rounded-xl font-semibold transition-colors border border-[#1e3a5f]"
            >
              <QrCode className="w-5 h-5" />
              <span>{isRegeneratingQrs ? t('manager.tables.regeneratingQr') : t('manager.tables.regenerateAllQr')}</span>
            </button>

            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#7c6af7] hover:bg-[#6557e0] text-[#0d1f3c] px-4 py-2.5 rounded-xl font-semibold transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>{t('manager.tables.addTable')}</span>
            </button>
          </div>
        </div>

        {/* Floor Plan Grid */}
        <Motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
        >
          {loading && (
            <div className="col-span-full min-h-[40vh] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[#7c6af7] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {!loading && tables.length === 0 && (
            <div className="col-span-full min-h-[40vh] flex flex-col items-center justify-center text-slate-400">
              <Users className="w-12 h-12 mb-3 opacity-70" />
              <p className="text-lg font-semibold">{t('manager.tables.noTables')}</p>
              <p className="text-sm text-slate-500 mt-1">{t('manager.tables.createFirstTable')}</p>
            </div>
          )}

          <AnimatePresence>
            {!loading && tables.map((table) => {
              const styles = getStatusStyle(table.status);
              
              return (
                <Motion.div
                  layout
                  key={table._id}
                  variants={cardVariants}
                  className={`${styles.bg} border ${styles.border} rounded-2xl p-6 relative group transition-colors shadow-sm flex flex-col items-center justify-center aspect-[4/5]`}
                >
                  {/* Actions (Hover) */}
                  <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(table)}
                      className="p-2 bg-[#132845]/80 backdrop-blur-md border border-[#1e3a5f] text-slate-300 hover:text-[#7c6af7] rounded-xl transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTable(table._id)}
                      className="p-2 bg-[#132845]/80 backdrop-blur-md border border-[#1e3a5f] text-slate-300 hover:text-red-500 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* QR Code Quick Button */}
                  <div className="absolute top-3 left-3">
                    <button 
                      onClick={() => setSelectedQrTable(table)}
                      className="p-2 bg-[#132845]/80 backdrop-blur-md border border-[#1e3a5f] text-slate-300 hover:text-[#7c6af7] rounded-xl transition-colors group/qr"
                      title={t('manager.tables.viewQr')}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Number */}
                  <h3 
                    className="text-6xl font-bold text-slate-100 mt-4 mb-2 drop-shadow-md" 
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {table.number}
                  </h3>
                  
                  {/* Capacity */}
                  <div className="flex items-center gap-1.5 text-slate-400 mb-6 bg-[#132845]/50 px-3 py-1 rounded-lg border border-[#1e3a5f]/50">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">{table.capacity} {t('manager.tables.seats')}</span>
                  </div>

                  {/* Status Indicator */}
                  <div className="mt-auto border-t border-[#1e3a5f]/50 w-full pt-4 flex items-center justify-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${styles.dot} shadow-[0_0_8px_rgba(0,0,0,0.5)] shadow-${styles.dot.split('-')[1]}-500/50`}></div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${styles.text}`}>
                      {table.status}
                    </span>
                  </div>
                </Motion.div>
              );
            })}
          </AnimatePresence>
        </Motion.div>

        {/* --- MODALS --- */}
        
        {/* Add Table Modal */}
        <AnimatePresence>
          {isAddModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <Motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setIsAddModalOpen(false)}
              />
              <Motion.div 
                variants={modalVariants} initial="hidden" animate="visible" exit="exit"
                className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md md:max-w-lg mx-4 max-h-[90vh] overflow-y-auto relative z-10 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6 border-b border-[#1e3a5f]/50 pb-4">
                  <h3 className="text-2xl font-bold text-slate-100" style={{ fontFamily: "'Playfair Display', serif" }}>{t('manager.tables.addTable')}</h3>
                  <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-slate-400 hover:text-[#7c6af7] bg-[#132845] rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form className="space-y-5" onSubmit={handleCreateTable}>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('manager.tables.tableNumber')}</label>
                    <input 
                      type="number" 
                      placeholder="5"
                      value={newTable.number}
                      onChange={(e) => setNewTable((previous) => ({ ...previous, number: e.target.value }))}
                      className="w-full px-4 py-3 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#7c6af7] focus:ring-1 focus:ring-[#7c6af7] transition-all font-bold text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('manager.tables.seatCapacity')}</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input 
                        type="number" 
                        placeholder="4"
                        value={newTable.capacity}
                        onChange={(e) => setNewTable((previous) => ({ ...previous, capacity: e.target.value }))}
                        className="w-full pl-12 pr-4 py-3 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#7c6af7] focus:ring-1 focus:ring-[#7c6af7] transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('manager.tables.restaurantIdAuto')}</label>
                    <input 
                      type="text" 
                      value={user?.restaurant || ''}
                      disabled
                      className="w-full px-4 py-3 bg-[#0f2040] border border-[#1e3a5f] rounded-xl text-slate-500 cursor-not-allowed opacity-70"
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 px-4 bg-[#132845] hover:bg-[#1e3a5f] text-slate-300 rounded-xl font-medium transition-colors">
                      {t('common.cancel')}
                    </button>
                    <button type="submit" className="flex-1 py-3 px-4 bg-[#7c6af7] hover:bg-[#6557e0] text-[#0d1f3c] rounded-xl font-semibold transition-colors">
                      {t('manager.tables.saveTable')}
                    </button>
                  </div>
                </form>
              </Motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Table Modal */}
        <AnimatePresence>
          {isEditModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <Motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={closeEditModal}
              />
              <Motion.div
                variants={modalVariants} initial="hidden" animate="visible" exit="exit"
                className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md md:max-w-lg mx-4 max-h-[90vh] overflow-y-auto relative z-10 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6 border-b border-[#1e3a5f]/50 pb-4">
                  <h3 className="text-2xl font-bold text-slate-100" style={{ fontFamily: "'Playfair Display', serif" }}>{t('manager.tables.editTable')}</h3>
                  <button onClick={closeEditModal} className="p-2 text-slate-400 hover:text-[#7c6af7] bg-[#132845] rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form className="space-y-5" onSubmit={handleUpdateTable}>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('manager.tables.tableNumber')}</label>
                    <input
                      type="number"
                      value={editTable.number}
                      onChange={(e) => setEditTable((previous) => ({ ...previous, number: e.target.value }))}
                      className="w-full px-4 py-3 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#7c6af7] focus:ring-1 focus:ring-[#7c6af7] transition-all font-bold text-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('manager.tables.seatCapacity')}</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input
                        type="number"
                        value={editTable.capacity}
                        onChange={(e) => setEditTable((previous) => ({ ...previous, capacity: e.target.value }))}
                        className="w-full pl-12 pr-4 py-3 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-[#7c6af7] focus:ring-1 focus:ring-[#7c6af7] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('common.status')}</label>
                    <select
                      value={editTable.status}
                      onChange={(e) => setEditTable((previous) => ({ ...previous, status: e.target.value }))}
                      className="w-full px-4 py-3 bg-[#132845] border border-[#1e3a5f] rounded-xl text-slate-100 focus:outline-none focus:border-[#7c6af7] focus:ring-1 focus:ring-[#7c6af7] transition-all"
                    >
                      <option value="available">{t('manager.tables.available')}</option>
                      <option value="occupied">{t('manager.tables.occupied')}</option>
                      <option value="reserved">{t('manager.tables.reserved')}</option>
                    </select>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={closeEditModal} className="flex-1 py-3 px-4 bg-[#132845] hover:bg-[#1e3a5f] text-slate-300 rounded-xl font-medium transition-colors">
                      {t('common.cancel')}
                    </button>
                    <button type="submit" className="flex-1 py-3 px-4 bg-[#7c6af7] hover:bg-[#6557e0] text-[#0d1f3c] rounded-xl font-semibold transition-colors">
                      {t('manager.tables.updateTable')}
                    </button>
                  </div>
                </form>
              </Motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* QR Code View Modal */}
        <AnimatePresence>
          {selectedQrTable && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <Motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setSelectedQrTable(null)}
              />
              <Motion.div 
                variants={modalVariants} initial="hidden" animate="visible" exit="exit"
                className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-2xl w-full max-w-sm sm:max-w-md md:max-w-lg mx-4 max-h-[90vh] overflow-y-auto relative z-10 shadow-2xl flex flex-col"
              >
                <div className="flex justify-between items-center p-4 sm:p-6 bg-[#132845]/50 border-b border-[#1e3a5f]">
                  <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-[#7c6af7]" />
                    <span>{t('manager.tables.tableAccess', { number: selectedQrTable.number })}</span>
                  </h3>
                  <button onClick={() => setSelectedQrTable(null)} className="p-1.5 text-slate-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-4 sm:p-6 flex flex-col items-center justify-center bg-white">
                  {/* QR code image from API */}
                  <img 
                    src={selectedQrTable.qrCode} 
                    alt={`QR Code for Table ${selectedQrTable.number}`}
                    className="w-48 h-48 rounded-lg shadow-sm"
                  />
                  <p className="mt-6 text-[#0d1f3c] font-bold text-sm text-center uppercase tracking-widest">
                    {t('manager.tables.scanForMenu')}
                  </p>
                </div>

                <div className="p-4 sm:p-6 border-t border-[#1e3a5f] bg-[#0f2040] flex gap-3">
                  <button
                    onClick={() => handleDownloadQR(selectedQrTable)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#132845] border border-[#1e3a5f] hover:bg-[#1e3a5f] text-slate-300 rounded-xl font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t('manager.tables.saveQr')}</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#7c6af7] hover:bg-[#6557e0] text-[#0d1f3c] rounded-xl font-bold transition-colors">
                    <Printer className="w-4 h-4" />
                    <span>{t('manager.tables.printQr')}</span>
                  </button>
                </div>
              </Motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </ManagerLayout>
  );
};

export default TablesPage;

