import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import UsersList from '../../components/admin/UsersList';

const AdminUsersPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Users</h1>
          <p className="text-secondary-600 dark:text-secondary-400">
            View and manage user accounts and roles.
          </p>
        </div>
        
        <div>
          <Link to="/admin">
            <Button variant="outline">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mr-2 h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <UsersList />
    </div>
  );
};

export default AdminUsersPage;