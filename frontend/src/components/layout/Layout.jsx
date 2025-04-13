import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react'; 
import { useQuery } from 'react-query'; 

import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';
import { authAPI } from '../../lib/api'; 

const Layout = () => {
  // --- Clerk Hooks ---
  const { isSignedIn, isLoaded: isUserLoaded } = useUser();
  const { getToken, isLoaded: isAuthLoaded } = useAuth();

  // --- State ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });


  // Fetch user data from *your* backend using useQuery
  // This query depends on the Clerk session being ready (isAuthLoaded) and the user being signed in.
  useQuery(
    ['user'], // Query key for caching user data
    async () => {
      console.log("Layout.jsx useQuery: Attempting to fetch user data..."); // Log start

      // Fetch the Clerk token asynchronously *inside* the query function
      const token = await getToken();

      if (!token) {
        console.log("Layout.jsx useQuery: No token available, cannot fetch user data.");
        // Return null or throw error if token is essential for this query to proceed
        // Returning null will keep the query state as loading/idle if enabled: false kicks in later
        // Throwing an error will put the query into an error state
        return null;
      }

      console.log("Layout.jsx useQuery: Token found, fetching /auth/me...");
      try {
        // Call your backend API endpoint
        const data = await authAPI.getMe(token);
        console.log("Layout.jsx useQuery: User data fetched successfully:", data?.user);
        // IMPORTANT: Return the actual user data object expected by other components
        return data.user;
      } catch (error) {
         console.error("Layout.jsx useQuery: Error fetching user data:", error);
         // Re-throw the error so React Query can handle the error state
         throw error;
      }
    },
    {
      // --- Query Options ---
      // Enable the query only when Clerk Auth is loaded AND the user is signed in
      enabled: isAuthLoaded && isSignedIn,
      // How long the data is considered fresh (ms)
      staleTime: 5 * 60 * 1000, // 5 minutes
      // How long inactive data remains in the cache (ms)
      cacheTime: 15 * 60 * 1000, // 15 minutes
      // Refetch data when the window gains focus
      refetchOnWindowFocus: true,
      // Retry once if the query fails
      retry: 1,
      // Optional: Log errors specifically from this query
      onError: (error) => {
        console.error('Layout.jsx useQuery explicit onError:', error);
      },
    }
  );

  // --- Dark Mode Logic ---
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const savedTheme = localStorage.getItem('theme');
      if (!savedTheme) {
        setIsDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // --- Sidebar Logic ---
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // --- Render ---
  // Optional: Show a global loading indicator while Clerk loads initially
  if (!isAuthLoaded || !isUserLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary-50 dark:bg-secondary-900">
      <Header
        toggleSidebar={toggleSidebar}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />

      <div className="flex flex-1">
        <Sidebar
          isOpen={isSidebarOpen}
          closeSidebar={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 overflow-x-hidden p-4 md:p-6 lg:ml-64"> {/* Added lg:ml-64 assuming sidebar width */}
          <div className="container mx-auto">
             {/* Outlet renders the matched child route's component */}
            <Outlet />
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default Layout;