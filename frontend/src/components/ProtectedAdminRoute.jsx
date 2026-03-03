import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * ProtectedAdminRoute
 * Wraps children and only renders them when:
 *   1. A JWT token exists in localStorage or sessionStorage
 *   2. The stored role is 'admin'
 *
 * Otherwise redirects to /login, preserving the intended URL in `state.from`
 * so Login can redirect back after a successful sign-in.
 */
const ProtectedAdminRoute = ({ children }) => {
  const location = useLocation();

  const token =
    localStorage.getItem('token') || sessionStorage.getItem('token');
  const role =
    localStorage.getItem('role') || sessionStorage.getItem('role');

  if (!token) {
    // Not logged in at all — send to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role !== 'admin') {
    // Logged in but not an admin — send to home
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedAdminRoute;
