import React from 'react';

const paddingVariants = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const Card = ({ children, padding = 'md', hoverEffect = false, className = '', ...props }) => {
  const baseClasses = `bg-[#1c1c26] border border-[#2a2a38] rounded-2xl ${paddingVariants[padding]} ${className}`;
  const hoverClasses = hoverEffect ? 'hover:border-slate-500 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-300' : '';

  return (
    <div className={`${baseClasses} ${hoverClasses}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
