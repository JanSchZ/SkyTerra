import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/api'; // Assuming authService can provide current user

const AdminProtectedRoute = ({ element }) => {
  const location = useLocation();
  const currentUser = authService.getCurrentUser(); // Or get from context if available

  if (!currentUser) {
    // Not logged in, redirect to login page
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!currentUser.is_staff) {
    // Logged in but not an admin, redirect to home or a 'not authorized' page
    // For now, redirecting to home.
    console.warn('AdminProtectedRoute: User is not staff, redirecting to home.');
    return <Navigate to="/" replace />;
  }

  // User is authenticated and is an admin, render the element
  return element;
};

export default AdminProtectedRoute; 