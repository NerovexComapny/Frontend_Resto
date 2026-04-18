import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = sessionStorage.getItem('token');
  const user = JSON.parse(sessionStorage.getItem('user') || 'null');
  const role = user?.role; // e.g., 'manager', 'waiter', 'cashier', 'kitchen'

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Check role and redirect to correct dashboard
    if (role === 'manager') return <Navigate to="/manager/dashboard" replace />;
    if (role === 'waiter') return <Navigate to="/waiter/orders" replace />;
    if (role === 'cashier') return <Navigate to="/cashier/payments" replace />;
    if (role === 'kitchen') return <Navigate to="/kitchen" replace />;
    
    // Fallback redirect
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
