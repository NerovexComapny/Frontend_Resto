import React from 'react';
import { motion } from 'framer-motion';

const variants = {
  primary: 'bg-amber-500 hover:bg-amber-400 text-[#13131a] shadow-[0_0_15px_rgba(245,158,11,0.2)]',
  secondary: 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]',
  danger: 'bg-red-500 hover:bg-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.2)]',
  ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const Button = React.forwardRef(({
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  children,
  ...props
}, ref) => {
  const baseStyle = 'inline-flex items-center justify-center font-bold font-sans rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 disabled:cursor-not-allowed uppercase tracking-wider gap-2';
  
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
        />
      ) : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
