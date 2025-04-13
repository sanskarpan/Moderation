import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignIn, SignUp } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from 'react-query';

// Components
import Layout from './components/layout/Layout';
import RequireAuth from './components/auth/RequireAuth';
import RequireAdmin from './components/auth/RequireAdmin';

// Pages
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import PostsPage from './pages/PostsPage';
import PostDetailPage from './pages/PostDetailPage';
import CreatePostPage from './pages/CreatePostPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminFlaggedContentPage from './pages/admin/AdminFlaggedContentPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import NotFoundPage from './pages/NotFoundPage';

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

const App = () => {
  if (!clerkPubKey) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-danger-600">Configuration Error</h1>
          <p className="mt-2 text-secondary-600">
            Missing REACT_APP_CLERK_PUBLISHABLE_KEY environment variable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="sign-in/*" element={<SignIn routing="path" path="/sign-in" />} />
              <Route path="sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />
              <Route path="posts" element={<PostsPage />} />
              <Route path="posts/:postId" element={<PostDetailPage />} />

              {/* Protected routes */}
              <Route
                path="dashboard"
                element={
                  <RequireAuth>
                    <DashboardPage />
                  </RequireAuth>
                }
              />
              <Route
                path="posts/create"
                element={
                  <RequireAuth>
                    <CreatePostPage />
                  </RequireAuth>
                }
              />
              <Route
                path="profile"
                element={
                  <RequireAuth>
                    <ProfilePage />
                  </RequireAuth>
                }
              />
              <Route
                path="settings"
                element={
                  <RequireAuth>
                    <SettingsPage />
                  </RequireAuth>
                }
              />

              {/* Admin routes */}
              <Route
                path="admin"
                element={
                  <RequireAdmin>
                    <AdminDashboardPage />
                  </RequireAdmin>
                }
              />
              <Route
                path="admin/flagged-content"
                element={
                  <RequireAdmin>
                    <AdminFlaggedContentPage />
                  </RequireAdmin>
                }
              />
              <Route
                path="admin/users"
                element={
                  <RequireAdmin>
                    <AdminUsersPage />
                  </RequireAdmin>
                }
              />

              {/* Fallback routes */}
              <Route path="404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
        </Router>
      </QueryClientProvider>
    </ClerkProvider>
  );
};

export default App;