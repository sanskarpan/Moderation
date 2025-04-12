import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { adminAPI } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const UsersList = () => {
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const limit = 10;

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery(
    ['admin-users', page],
    () => adminAPI.getUsers({ page, limit }),
    {
      keepPreviousData: true,
    }
  );

  const updateRoleMutation = useMutation(
    ({ id, role }) => adminAPI.updateUserRole(id, role),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-users']);
        setShowRoleDialog(false);
        setSelectedUser(null);
      },
    }
  );

  const openRoleDialog = (user) => {
    setSelectedUser(user);
    setShowRoleDialog(true);
  };

  const handleRoleChange = (role) => {
    if (selectedUser) {
      updateRoleMutation.mutate({
        id: selectedUser.id,
        role,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md bg-danger-50 p-4 text-danger-700 dark:bg-danger-900 dark:text-danger-300">
        <p>Error loading users: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <h2 className="text-2xl font-bold">Users</h2>
      </div>

      {data?.users?.length === 0 ? (
        <div className="rounded-md bg-secondary-50 p-8 text-center text-secondary-700 dark:bg-secondary-900 dark:text-secondary-300">
          <p>No users found.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-secondary-200 dark:border-secondary-800">
            <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-800">
              <thead className="bg-secondary-50 dark:bg-secondary-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                    Email Notifications
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                    Content
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                    Joined Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-200 bg-white dark:divide-secondary-800 dark:bg-secondary-950">
                {data.users.map((user) => (
                  <tr key={user.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-secondary-900 dark:text-secondary-100">{user.username}</div>
                          <div className="text-xs text-secondary-500 dark:text-secondary-400">ID: {user.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-secondary-900 dark:text-secondary-100">{user.email}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge variant={user.role === 'ADMIN' ? 'primary' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-secondary-900 dark:text-secondary-100">
                        {user.emailNotification ? (
                          <span className="inline-flex items-center text-success-600 dark:text-success-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                              <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-danger-600 dark:text-danger-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="15" y1="9" x2="9" y2="15"></line>
                              <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                            Disabled
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex space-x-2 text-xs text-secondary-600 dark:text-secondary-400">
                        <span className="inline-flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                          </svg>
                          {user._count.posts}
                        </span>
                        <span className="inline-flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                          </svg>
                          {user._count.comments}
                        </span>
                        <span className="inline-flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                          </svg>
                          {user._count.reviews}
                        </span>
                        <span className="inline-flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                          {user._count.flaggedContents}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-secondary-600 dark:text-secondary-400">
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRoleDialog(user)}
                      >
                        Change Role
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pagination.pages > 1 && (
            <div className="mt-6 flex justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-3 text-sm text-secondary-600 dark:text-secondary-400">
                Page {page} of {data.pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(p + 1, data.pagination.pages))}
                disabled={page === data.pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUser && (
              <div>
                <p className="text-sm text-secondary-700 dark:text-secondary-300">
                  Change role for user: <span className="font-medium">{selectedUser.username}</span>
                </p>
                <p className="text-sm text-secondary-700 dark:text-secondary-300">
                  Current role: <Badge variant={selectedUser.role === 'ADMIN' ? 'primary' : 'secondary'}>{selectedUser.role}</Badge>
                </p>
              </div>
            )}
            
            <div className="flex justify-center space-x-4">
              <Button
                variant={selectedUser?.role === 'USER' ? 'outline' : 'secondary'}
                onClick={() => handleRoleChange('USER')}
                disabled={selectedUser?.role === 'USER' || updateRoleMutation.isLoading}
              >
                Set as User
              </Button>
              <Button
                variant={selectedUser?.role === 'ADMIN' ? 'outline' : 'primary'}
                onClick={() => handleRoleChange('ADMIN')}
                disabled={selectedUser?.role === 'ADMIN' || updateRoleMutation.isLoading}
              >
                Set as Admin
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRoleDialog(false)}
              disabled={updateRoleMutation.isLoading}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersList;