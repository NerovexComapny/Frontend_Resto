export const getRoleRedirect = (role) => {
  switch (role) {
    case 'manager': return '/manager/dashboard';
    case 'waiter': return '/waiter/orders';
    case 'cashier': return '/cashier/payments';
    case 'cook': return '/kitchen';
    default: return '/login';
  }
};

export const isRouteAuthorized = (token, user, allowedRoles) => {
  if (!token) {
    return false;
  }

  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    return false;
  }

  return true;
};
