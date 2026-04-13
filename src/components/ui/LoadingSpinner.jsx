import React from 'react';
import { motion } from 'framer-motion';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      className={`text-amber-500 inline-flex ${sizes[size]} ${className}`}
    >
      <Loader2 className="w-full h-full" />
    </motion.div>
  );
};

export default LoadingSpinner;
