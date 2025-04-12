import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react'; // Import useAuth
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { authAPI, moderationAPI } from '../lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Alert, AlertDescription } from '../components/ui/alert';

const SettingsPage = () => {
  const { user } = useUser();
  const { getToken, isLoaded: isAuthLoaded } = useAuth(); // Get the getToken function and auth loaded state
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch user data using auth token
  const { data: userDataResponse, isLoading: isUserLoading } = useQuery(
    ['user'], // Query key remains the same
    async () => {
      const token = await getToken();
      if (!token) return null; // Don't fetch if no token
      return authAPI.getMe(token);
    },
    {
      enabled: !!user && isAuthLoaded, // Only run if Clerk user exists and auth is loaded
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );
  const userData = userDataResponse?.user; // Extract the nested user object

  // Mutation for updating preferences
  const updateEmailNotificationMutation = useMutation(
    async (emailNotification) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return moderationAPI.updatePreferences(emailNotification, token);
    },
    {
      onSuccess: (data) => {
        // Update the cache directly for instant UI feedback
        queryClient.setQueryData(['user'], (oldData) => {
          if (!oldData || !oldData.user) return oldData; // Handle case where oldData is missing
          return {
            ...oldData,
            user: {
              ...oldData.user,
              emailNotification: data.emailNotification, // Use the response from the API
            },
          };
        });
        setSuccessMessage('Email notification preferences updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      },
      onError: (error) => {
        console.error("Error updating preferences:", error);
        setErrorMessage(error.response?.data?.message || 'Failed to update preferences');
        setTimeout(() => setErrorMessage(''), 3000);
      },
    }
  );

  // Handler for the switch toggle
  const handleToggleEmailNotifications = (checked) => {
    // The 'checked' argument comes directly from the Switch component's onCheckedChange
    if (userData) {
      updateEmailNotificationMutation.mutate(checked);
    }
  };

  // Show loading indicator while Clerk/auth loads or user data fetches
  if ((!isAuthLoaded || isUserLoading) && !userData) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  const displayUser = userData; // Use the already extracted user object

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Manage your account settings and preferences.
        </p>
      </div>

      {successMessage && (
        <Alert variant="success" className="my-4">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="danger" className="my-4">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>View and manage your account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="username">Username</Label>
                <div id="username" className="mt-1 rounded-md border border-secondary-200 bg-secondary-50 px-3 py-2 text-sm text-secondary-700 dark:border-secondary-800 dark:bg-secondary-900 dark:text-secondary-300">
                  {displayUser?.username || user?.username || 'N/A'}
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <div id="email" className="mt-1 rounded-md border border-secondary-200 bg-secondary-50 px-3 py-2 text-sm text-secondary-700 dark:border-secondary-800 dark:bg-secondary-900 dark:text-secondary-300">
                  {displayUser?.email || user?.primaryEmailAddress?.emailAddress || 'N/A'}
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <div id="role" className="mt-1 rounded-md border border-secondary-200 bg-secondary-50 px-3 py-2 text-sm text-secondary-700 dark:border-secondary-800 dark:bg-secondary-900 dark:text-secondary-300">
                {displayUser?.role || 'USER'} {/* Default to USER if not available */}
              </div>
            </div>
          </CardContent>
           <CardFooter>
             <p className="text-xs text-secondary-500 dark:text-secondary-400">
               To update your profile information, please visit the{' '}
               <a
                 href={user?.id ? `https://dashboard.clerk.com/users/${user.id}` : '#'} // Link to Clerk dashboard if user ID is available
                 target="_blank"
                 rel="noopener noreferrer"
                 className="text-primary-600 hover:underline dark:text-primary-400"
               >
                 Clerk User Profile
               </a>
               .
             </p>
           </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>Manage your notification preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <h3 className="text-base font-medium">Email Notifications</h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Receive email notifications when your content is flagged for moderation.
                 </p>
              </div>
              <Switch
                // Use optional chaining and provide a default (e.g., true) if userData is not yet loaded
                checked={displayUser?.emailNotification ?? true}
                onCheckedChange={handleToggleEmailNotifications} // Pass the handler directly
                disabled={updateEmailNotificationMutation.isLoading || !displayUser}
                aria-label="Toggle email notifications"
              />
            </div>
          </CardContent>
           {/* No separate Save button needed as the Switch triggers the update */}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Moderation</CardTitle>
            <CardDescription>Learn about our content moderation policies.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-secondary-700 dark:text-secondary-300">
              Our AI-powered moderation system automatically reviews all content posted on the platform
              to ensure it complies with our community guidelines. Content that may contain inappropriate
              language, harassment, hate speech, or other violations will be flagged for review.
            </p>
            <div className="rounded-md bg-secondary-50 p-4 dark:bg-secondary-900">
              <h4 className="font-medium">What happens when content is flagged?</h4>
              <ul className="ml-4 mt-2 list-disc space-y-1 text-sm text-secondary-700 dark:text-secondary-300">
                <li>The content is sent for review by our moderation team.</li>
                <li>You will receive an email notification (if enabled).</li>
                <li>The content remains visible until a decision is made.</li>
                <li>If approved, no further action is taken.</li>
                <li>If rejected, the content will be removed and you will be notified.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;