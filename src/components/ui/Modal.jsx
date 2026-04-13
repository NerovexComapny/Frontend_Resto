import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import X from 'lucide-react/dist/esm/icons/x';

const Modal = ({ isOpen, onClose, title, children, footer, className = '' }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative bg-[#13131a] border border-[#2a2a38] rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] w-full max-w-lg overflow-hidden flex flex-col font-sans ${className}`}
          >
            {title && (
              <div className="px-6 py-4 border-b border-[#2a2a38] flex items-center justify-between bg-[#1c1c26]">
                <h3 className="text-xl font-bold text-slate-100 tracking-wide">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2a2a38] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            {!title && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2a2a38] transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            
            <div className="p-6 overflow-y-auto max-h-[70vh] no-scrollbar text-slate-300">
              {children}
            </div>

            {footer && (
              <div className="px-6 py-4 border-t border-[#2a2a38] bg-[#0a0a0f] flex justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
