import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from 'react-query';

const RequireAdmin = ({ children }) => {
  const { isLoaded, isSignedIn } = useUser();
  const location = useLocation();

  // Get user data from React Query cache
  const { data: userData, isLoading } = useQuery(['user'], { enabled: isSignedIn });
  
  // Check if user is admin
  const isAdmin = userData?.role === 'ADMIN';

  if (!isLoaded || isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (!isSignedIn) {
    // Redirect to login page
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    // Redirect to dashboard if user is not an admin
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default RequireAdmin;