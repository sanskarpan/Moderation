import React from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '@clerk/clerk-react'; // Import useAuth
import { adminAPI } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { formatDate } from '../../lib/utils';

const StatCard = ({ title, value, icon, description, className }) => {
  // ... StatCard component remains the same
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-8 w-8 rounded-md bg-primary-100 p-1.5 text-primary-700 dark:bg-primary-800 dark:text-primary-300">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-secondary-500 dark:text-secondary-400">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};


const AdminStats = () => {
  const { getToken, isLoaded: isAuthLoaded } = useAuth(); // Get getToken and loaded state

  const { data, isLoading, isError, error } = useQuery(
    ['admin-stats'],
    // Make the query function async to await the token
    async () => {
      const token = await getToken();
      if (!token) {
          console.warn("AdminStats: No token available, skipping fetch.");
          return null; // Or throw an error if preferred
      }
      // Pass the token to the API call
      return adminAPI.getStats(token);
    },
    {
      enabled: isAuthLoaded, // Only fetch when Clerk auth is loaded
      refetchInterval: 60000, // Refetch every minute
      staleTime: 30000, // Consider data stale after 30 seconds
    }
  );

  if (isLoading || !isAuthLoaded) { // Also check isAuthLoaded
    return (
      <div className="flex justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md bg-danger-50 p-4 text-danger-700 dark:bg-danger-900 dark:text-danger-300">
        <p>Error loading stats: {error?.response?.data?.message || error?.message || 'Unknown error'}</p>
      </div>
    );
  }

   // Handle case where data might be null if token wasn't ready
   if (!data) {
     return (
       <div className="rounded-md bg-secondary-50 p-4 text-secondary-700 dark:bg-secondary-900 dark:text-secondary-300">
         <p>Loading statistics...</p>
       </div>
     );
   }


  const { stats, recentFlagged } = data;

  return (
    <div className="space-y-6">
      {/* --- Grid for Stat Cards --- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
         {/* User Stat Card */}
         <StatCard
           title="Total Users"
           value={stats?.users ?? 0} // Use nullish coalescing
           icon={
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
               <circle cx="9" cy="7" r="4"></circle>
               <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
               <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
             </svg>
           }
         />
         {/* Post Stat Card */}
         <StatCard
           title="Total Posts"
           value={stats?.posts ?? 0} // Use nullish coalescing
           icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
               <polyline points="14 2 14 8 20 8"></polyline>
               <line x1="16" y1="13" x2="8" y2="13"></line>
               <line x1="16" y1="17" x2="8" y2="17"></line>
               <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
           }
         />
         {/* Comment Stat Card */}
         <StatCard
           title="Comments"
           value={stats?.comments ?? 0} // Use nullish coalescing
           icon={
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
             </svg>
           }
         />
         {/* Review Stat Card */}
         <StatCard
           title="Reviews"
           value={stats?.reviews ?? 0} // Use nullish coalescing
           icon={
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
             </svg>
           }
         />
      </div>

      {/* --- Grid for Moderation Stats and Recent Flagged --- */}
      <div className="grid gap-4 md:grid-cols-2">
         {/* Moderation Stats Card */}
         <Card>
           <CardHeader>
             <CardTitle>Moderation Stats</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="space-y-4">
               {/* Total */}
               <div className="flex items-center justify-between">
                 <div className="text-sm text-secondary-700 dark:text-secondary-300">Total Flagged Content</div>
                 <div className="font-bold">{stats?.flagged?.total ?? 0}</div>
               </div>
               {/* Progress Bar */}
               <div className="h-1 w-full bg-secondary-200 dark:bg-secondary-800">
                 <div className="flex h-full">
                   <div
                     className="bg-warning-500"
                     style={{ width: `${(stats?.flagged?.pending / (stats?.flagged?.total || 1)) * 100}%` }}
                     title={`Pending: ${stats?.flagged?.pending ?? 0}`}
                   ></div>
                   <div
                     className="bg-success-500"
                     style={{ width: `${(stats?.flagged?.approved / (stats?.flagged?.total || 1)) * 100}%` }}
                     title={`Approved: ${stats?.flagged?.approved ?? 0}`}
                   ></div>
                   <div
                     className="bg-danger-500"
                     style={{ width: `${(stats?.flagged?.rejected / (stats?.flagged?.total || 1)) * 100}%` }}
                     title={`Rejected: ${stats?.flagged?.rejected ?? 0}`}
                   ></div>
                 </div>
               </div>
               {/* Status Breakdown */}
               <div className="grid grid-cols-3 gap-2 text-center">
                 <div className="rounded-md bg-warning-50 p-2 dark:bg-warning-900">
                   <div className="font-medium text-warning-700 dark:text-warning-300">Pending</div>
                   <div className="text-sm">{stats?.flagged?.pending ?? 0}</div>
                 </div>
                 <div className="rounded-md bg-success-50 p-2 dark:bg-success-900">
                   <div className="font-medium text-success-700 dark:text-success-300">Approved</div>
                   <div className="text-sm">{stats?.flagged?.approved ?? 0}</div>
                 </div>
                 <div className="rounded-md bg-danger-50 p-2 dark:bg-danger-900">
                   <div className="font-medium text-danger-700 dark:text-danger-300">Rejected</div>
                   <div className="text-sm">{stats?.flagged?.rejected ?? 0}</div>
                 </div>
               </div>
             </div>
           </CardContent>
         </Card>

         {/* Recently Flagged Card */}
         <Card>
           <CardHeader>
             <CardTitle>Recently Flagged</CardTitle>
           </CardHeader>
           <CardContent>
             {(recentFlagged ?? []).length === 0 ? (
               <p className="text-center text-sm text-secondary-500 dark:text-secondary-400">
                 No recent flagged content
               </p>
             ) : (
               <div className="space-y-4">
                 {(recentFlagged ?? []).map((item) => {
                   const content = item.type === 'COMMENT' ? item.comment?.content : item.review?.content;

                   return (
                     <div key={item.id} className="rounded-md border border-secondary-200 p-3 dark:border-secondary-800">
                       {/* ... rest of the recent flagged item display ... */}
                        <div className="flex items-center justify-between">
                            <div className="font-medium">{item.user?.username}</div>
                            <div className="text-xs text-secondary-500 dark:text-secondary-400">
                              {formatDate(item.createdAt)}
                            </div>
                        </div>
                        <p className="mt-2 text-sm text-secondary-700 dark:text-secondary-300">
                            {content?.length > 100 ? `${content.substring(0, 100)}...` : content}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                            <div className="rounded-full bg-warning-100 px-2 py-0.5 text-xs font-medium text-warning-700 dark:bg-warning-900 dark:text-warning-300">
                              {item.status}
                            </div>
                            <div className="text-xs text-secondary-500 dark:text-secondary-400">{item.type}</div>
                        </div>
                     </div>
                   );
                 })}
               </div>
             )}
           </CardContent>
         </Card>
      </div>
    </div>
  );
};

export default AdminStats;