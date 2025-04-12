import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { authAPI, moderationAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Alert, AlertDescription } from '../components/ui/alert';

const SettingsPage = () => {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Get user data from React Query cache
  const { data: userData } = useQuery(['user'], () => authAPI.getMe());

  const updateEmailNotificationMutation = useMutation(
    (emailNotification) => moderationAPI.updatePreferences(emailNotification),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['user']);
        setSuccessMessage('Email notification preferences updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      },
      onError: (error) => {
        setErrorMessage(error.response?.data?.message || 'Failed to update preferences');
        setTimeout(() => setErrorMessage(''), 3000);
      },
    }
  );

  const handleToggleEmailNotifications = () => {
    if (userData) {
      updateEmailNotificationMutation.mutate(!userData.emailNotification);
    }
  };

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
                <label className="text-sm font-medium">Username</label>
                <div className="mt-1 rounded-md border border-secondary-200 bg-secondary-50 px-3 py-2 text-secondary-700 dark:border-secondary-800 dark:bg-secondary-900 dark:text-secondary-300">
                  {userData?.username || user?.username}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <div className="mt-1 rounded-md border border-secondary-200 bg-secondary-50 px-3 py-2 text-secondary-700 dark:border-secondary-800 dark:bg-secondary-900 dark:text-secondary-300">
                  {userData?.email || user?.primaryEmailAddress?.emailAddress}
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <div className="mt-1 rounded-md border border-secondary-200 bg-secondary-50 px-3 py-2 text-secondary-700 dark:border-secondary-800 dark:bg-secondary-900 dark:text-secondary-300">
                {userData?.role || 'User'}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">
              To update your profile information, please visit the{' '}
              <a 
                href="https://clerk.com/docs/users/user-profile" 
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
              <div>
                <h3 className="text-base font-medium">Email Notifications</h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Receive email notifications when your content is flagged for moderation.
                </p>
              </div>
              <Switch
                checked={userData?.emailNotification || false}
                onCheckedChange={handleToggleEmailNotifications}
                disabled={updateEmailNotificationMutation.isLoading}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              onClick={handleToggleEmailNotifications} 
              disabled={updateEmailNotificationMutation.isLoading}
            >
              {updateEmailNotificationMutation.isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
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
                <li>The content is sent for review by our moderation team</li>
                <li>You will receive an email notification (if enabled)</li>
                <li>The content remains visible until a decision is made</li>
                <li>If approved, no further action is taken</li>
                <li>If rejected, the content will be removed and you will be notified</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;