import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link if needed for other parts, not strictly for settings
import { useUser, useAuth } from '@clerk/clerk-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
// Import specific APIs needed
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
import { Button } from '../components/ui/button'; // Import Button if needed for other actions

const SettingsPage = () => {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser(); // Clerk's user object
  const { getToken, isLoaded: isAuthLoaded } = useAuth();
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // --- Access User Data from React Query Cache ---
  // Reads the user data populated by Layout.jsx or fetches if stale/missing
  const {
    data: localUser, // Directly access the cached user object
    isLoading: isUserDataLoading,
    isError: isUserDataError,
    error: userDataError,
  } = useQuery(
    ['user'], // Access the cache key
    async () => {
      // Refetch function if cache is stale/invalidated
      const token = await getToken();
      if (!token) return null;
      try {
        const data = await authAPI.getMe(token);
        return data.user; // Return the user object
      } catch (err) {
        console.error("SettingsPage useQuery('user'): Error fetching user data:", err);
        throw err;
      }
    },
    {
      enabled: isUserLoaded && isAuthLoaded && !!clerkUser,
      staleTime: 5 * 60 * 1000, // Keep fresh for 5 mins
      cacheTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false, // Less critical to refetch constantly here
    }
  );

  // --- Mutation for Updating Preferences ---
  const updateEmailNotificationMutation = useMutation(
    async (newEmailNotificationValue) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      // Call the API with the new boolean value
      return moderationAPI.updatePreferences(newEmailNotificationValue, token);
    },
    {
      onSuccess: (data) => {
        // Update the React Query cache correctly
        // The cached data under ['user'] is the user object itself
        queryClient.setQueryData(['user'], (oldUserData) => {
          // If cache is empty or invalid, don't try to update
          if (!oldUserData) return oldUserData;
          // Return the previous user data with only emailNotification updated
          return {
            ...oldUserData,
            emailNotification: data.emailNotification, // Use the confirmed value from API response
          };
        });
        setSuccessMessage('Email notification preferences updated successfully!');
        setErrorMessage(''); // Clear any previous error
        setTimeout(() => setSuccessMessage(''), 3000);
      },
      onError: (error) => {
        console.error("Error updating preferences:", error);
        setErrorMessage(error.response?.data?.message || error.message || 'Failed to update preferences');
        setSuccessMessage(''); // Clear any previous success message
        setTimeout(() => setErrorMessage(''), 5000); // Show error longer

        // Optionally revert optimistic update if you implement one
        // queryClient.invalidateQueries(['user']); // Or force refetch on error
      },
    }
  );

  // Handler for the switch toggle - receives the NEW state from the Switch component
  const handleToggleEmailNotifications = (checked) => {
    // Only proceed if we have the user data loaded
    if (localUser) {
      // Clear messages before new attempt
      setSuccessMessage('');
      setErrorMessage('');
      // Mutate with the new boolean value received from the Switch
      updateEmailNotificationMutation.mutate(checked);
    } else {
      console.warn("Cannot toggle notifications: localUser data not available.");
      setErrorMessage("User data not loaded yet. Please wait and try again.");
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  // --- Loading / Error States ---
  const initialLoadComplete = isUserLoaded && isAuthLoaded && !isUserDataLoading;

  if (!initialLoadComplete) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  // Show error if the fetch for *our* backend user failed OR if localUser is still null/undefined after loading
  if (isUserDataError || !localUser) {
     return (
          <Alert variant="danger">
              <AlertDescription>
                  Error loading settings: {userDataError?.response?.data?.message || userDataError?.message || 'Could not load user profile information.'}
              </AlertDescription>
          </Alert>
      );
  }

  // Now `localUser` should be reliably populated if no error occurred

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Display Success/Error Messages */}
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
        {/* Account Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>View and manage your account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Use localUser for displaying details */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="username">Username</Label>
                <div id="username" className="mt-1 rounded-md border border-secondary-200 bg-secondary-50 px-3 py-2 text-sm text-secondary-700 dark:border-secondary-800 dark:bg-secondary-900 dark:text-secondary-300">
                  {localUser.username}
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <div id="email" className="mt-1 rounded-md border border-secondary-200 bg-secondary-50 px-3 py-2 text-sm text-secondary-700 dark:border-secondary-800 dark:bg-secondary-900 dark:text-secondary-300">
                  {localUser.email}
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <div id="role" className="mt-1 rounded-md border border-secondary-200 bg-secondary-50 px-3 py-2 text-sm text-secondary-700 dark:border-secondary-800 dark:bg-secondary-900 dark:text-secondary-300">
                {localUser.role}
              </div>
            </div>
          </CardContent>
           <CardFooter>
             <p className="text-xs text-secondary-500 dark:text-secondary-400">
               To update your profile information, please visit the{' '}
               <a
                 href={clerkUser?.id ? `https://dashboard.clerk.com/users/${clerkUser.id}` : '#'}
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

        {/* Notification Settings Card */}
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
              {/* Use localUser.emailNotification directly. Handle potential undefined during initial render. */}
              {/* The disabled state handles the loading phase. */}
              <Switch
                // Use the value from the successfully fetched localUser
                // The key forces re-render if localUser changes significantly, ensuring switch reflects cache updates
                key={localUser.id} // Add key based on user ID
                checked={localUser.emailNotification}
                onCheckedChange={handleToggleEmailNotifications}
                // Disable if mutation is running OR if localUser data isn't fully loaded yet
                disabled={updateEmailNotificationMutation.isLoading || !initialLoadComplete || !localUser}
                aria-label="Toggle email notifications"
              />
            </div>
             {/* Display mutation status if needed */}
             {updateEmailNotificationMutation.isLoading && (
                 <p className="text-sm text-secondary-500 dark:text-secondary-400">Updating preferences...</p>
             )}
          </CardContent>
           {/* Footer is optional here, no save button needed */}
        </Card>

        {/* Content Moderation Info Card */}
        <Card>
            {/* ... Content Moderation details ... */}
            <CardHeader>
                <CardTitle>Content Moderation</CardTitle>
                <CardDescription>Learn about our content moderation policies.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* ... policy text ... */}
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