import React from 'react';

const variants = {
  default: 'bg-slate-700 text-slate-300',
  success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-500 border border-amber-500/30',
  danger: 'bg-red-500/20 text-red-500 border border-red-500/30',
  info: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
};

const Badge = ({ children, variant = 'default', className = '' }) => {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
