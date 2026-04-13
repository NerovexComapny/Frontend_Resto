import React from 'react';

const statuses = {
  new: { label: 'New', color: 'bg-blue-500 text-white' },
  in_progress: { label: 'In Progress', color: 'bg-amber-500 text-[#13131a]' },
  ready: { label: 'Ready', color: 'bg-emerald-500 text-[#13131a] animate-pulse' },
  served: { label: 'Served', color: 'bg-slate-600 text-slate-300' },
  paid: { label: 'Paid', color: 'bg-indigo-500 text-white' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500 text-white' },
};

const StatusBadge = ({ status, className = '' }) => {
  const config = statuses[status] || { label: status, color: 'bg-slate-700 text-slate-300' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${config.color} ${className}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
