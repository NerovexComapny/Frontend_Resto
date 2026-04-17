import React, { Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { getRoleRedirect, isRouteAuthorized } from './utils/routeGuards';

// Public Pages
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage'));

const MenuPage = React.lazy(() => import('./pages/client/MenuPage'));

// Manager Pages
const DashboardPage = React.lazy(() => import('./pages/manager/DashboardPage'));
const MenuManagementPage = React.lazy(() => import('./pages/manager/MenuManagementPage'));
const TablesPage = React.lazy(() => import('./pages/manager/TablesPage'));
const OrdersPage = React.lazy(() => import('./pages/manager/OrdersPage'));
const StaffPage = React.lazy(() => import('./pages/manager/StaffPage'));
const ReportsPage = React.lazy(() => import('./pages/manager/ReportsPage'));
const FeedbacksPage = React.lazy(() => import('./pages/manager/FeedbacksPage'));

// Other Staff Pages
const WaiterOrdersPage = React.lazy(() => import('./pages/waiter/WaiterOrdersPage'));
const CashierPage = React.lazy(() => import('./pages/cashier/CashierPage'));
const KitchenDisplayPage = React.lazy(() => import('./pages/kitchen/KitchenDisplayPage'));

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { token, user } = useAuthStore();

  if (!isRouteAuthorized(token, user, allowedRoles)) {
    if (!token) {
      return <Navigate to="/login" replace />;
    }

    console.log('PROTECTED_ROUTE - no token, redirecting');
    return <Navigate to={getRoleRedirect(user.role)} replace />;
  }

  return children;
};

const CatchAllRedirect = () => {
  console.log('CATCH_ALL hit');
  return <Navigate to="/login" replace />;
};

const App = () => {
  const { token, user } = useAuthStore();
  console.log('APP RENDERING, path:', window.location.hash);

  return (
    <HashRouter>
      <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#7c6af7] border-t-transparent rounded-full animate-spin"></div></div>}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          {/* Public client menu route (QR users without auth) */}
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/menu/*" element={<MenuPage />} />
          <Route 
            path="/login" 
            element={token && user ? <Navigate to={getRoleRedirect(user.role)} replace /> : <LoginPage />} 
          />
          <Route path="/register" element={<Navigate to="/login" replace />} />

          {/* Manager Protected Routes */}
          <Route path="/manager/dashboard" element={<ProtectedRoute allowedRoles={['manager']}><DashboardPage /></ProtectedRoute>} />
          <Route path="/manager/menu" element={<ProtectedRoute allowedRoles={['manager']}><MenuManagementPage /></ProtectedRoute>} />
          <Route path="/manager/tables" element={<ProtectedRoute allowedRoles={['manager']}><TablesPage /></ProtectedRoute>} />
          <Route path="/manager/orders" element={<ProtectedRoute allowedRoles={['manager']}><OrdersPage /></ProtectedRoute>} />
          <Route path="/manager/feedbacks" element={<ProtectedRoute allowedRoles={['manager']}><FeedbacksPage /></ProtectedRoute>} />
          <Route path="/manager/staff" element={<ProtectedRoute allowedRoles={['manager']}><StaffPage /></ProtectedRoute>} />
          <Route path="/manager/reports" element={<ProtectedRoute allowedRoles={['manager']}><ReportsPage /></ProtectedRoute>} />

          {/* Waiter Routes */}
          <Route path="/waiter/orders" element={<ProtectedRoute allowedRoles={['waiter']}><WaiterOrdersPage /></ProtectedRoute>} />

          {/* Cashier Routes */}
          <Route path="/cashier/payments" element={<ProtectedRoute allowedRoles={['cashier']}><CashierPage /></ProtectedRoute>} />

          {/* Kitchen Routes */}
          <Route path="/kitchen" element={<ProtectedRoute allowedRoles={['cook']}><KitchenDisplayPage /></ProtectedRoute>} />

          {/* Catch All */}
          <Route path="*" element={<CatchAllRedirect />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
};

export default App;
