import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '@clerk/clerk-react'; // Import useAuth
import { adminAPI } from '../../lib/api';
import { formatDate, getStatusColor } from '../../lib/utils';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';

const FlaggedContentList = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedContent, setSelectedContent] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const limit = 10;

  const queryClient = useQueryClient();
  const { getToken, isLoaded: isAuthLoaded } = useAuth(); // Get getToken

  const { data, isLoading, isError, error } = useQuery(
    ['flagged-content', statusFilter, typeFilter, page],
    // Make queryFn async
    async () => {
      const token = await getToken();
      if (!token) {
        console.warn("FlaggedContentList: No token available, skipping fetch.");
        return null;
      }
      const params = {
        status: statusFilter || undefined, // Pass undefined if empty string
        type: typeFilter || undefined,   // Pass undefined if empty string
        page,
        limit
      };
      // Pass token as second argument
      return adminAPI.getAllFlaggedContent(params, token);
    },
    {
      enabled: isAuthLoaded, // Only run when auth is ready
      keepPreviousData: true,
      staleTime: 30000,
    }
  );

  const approveMutation = useMutation(
    // Make mutationFn async
    async (id) => {
      const token = await getToken();
      if (!token) throw new Error("Authentication required.");
      // Pass token
      return adminAPI.approveFlaggedContent(id, token);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['flagged-content']);
        queryClient.invalidateQueries(['admin-stats']);
        setSelectedContent(null);
        setActionType(null);
      },
      // Add onError for better debugging
      onError: (error) => {
          console.error("Approve Error:", error);
          // Optionally show an error message to the user
      }
    }
  );

  const rejectMutation = useMutation(
    // Make mutationFn async
    async ({ id, reason }) => {
      const token = await getToken();
      if (!token) throw new Error("Authentication required.");
       // Pass token
      return adminAPI.rejectFlaggedContent(id, reason, token);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['flagged-content']);
        queryClient.invalidateQueries(['admin-stats']);
        setSelectedContent(null);
        setActionType(null);
        setRejectionReason('');
      },
       // Add onError for better debugging
      onError: (error) => {
          console.error("Reject Error:", error);
          // Optionally show an error message to the user
      }
    }
  );

  const handleApprove = () => {
    if (selectedContent) {
       approveMutation.mutate(selectedContent.id);
    }
  };

  const handleReject = () => {
    if (selectedContent) {
        rejectMutation.mutate({
          id: selectedContent.id,
          reason: rejectionReason || selectedContent.reason // Use state or original reason
        });
    }
  };


  const openActionDialog = (content, action) => {
    setSelectedContent(content);
    setActionType(action);
    if (action === 'reject') {
      setRejectionReason(content.reason || '');
    }
  };

  const closeActionDialog = () => {
    setSelectedContent(null);
    setActionType(null);
    setRejectionReason('');
  };

  const getContentText = (item) => {
    if (item.type === 'COMMENT' && item.comment) {
      return item.comment.content;
    } else if (item.type === 'REVIEW' && item.review) {
      return item.review.content;
    }
    return 'Content not available';
  };

  if (isLoading || !isAuthLoaded) { // Check auth loaded state
    return (
      <div className="flex justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md bg-danger-50 p-4 text-danger-700 dark:bg-danger-900 dark:text-danger-300">
        <p>Error loading flagged content: {error?.response?.data?.message || error?.message || 'Unknown error'}</p>
      </div>
    );
  }

  // Handle case where data is null (e.g., token wasn't ready)
  const flaggedContent = data?.flaggedContent ?? [];
  const pagination = data?.pagination ?? { page: 1, pages: 1, total: 0 };


  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <h2 className="text-2xl font-bold">Flagged Content</h2>
        {/* ... filter dropdowns ... */}
         <div className="flex flex-wrap gap-2">
           <select
             value={statusFilter}
             onChange={(e) => {
               setStatusFilter(e.target.value);
               setPage(1);
             }}
             className="rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm dark:border-secondary-700 dark:bg-secondary-900"
           >
             <option value="PENDING">Pending</option>
             <option value="APPROVED">Approved</option>
             <option value="REJECTED">Rejected</option>
             <option value="">All Statuses</option>
           </select>

           <select
             value={typeFilter}
             onChange={(e) => {
               setTypeFilter(e.target.value);
               setPage(1);
             }}
             className="rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm dark:border-secondary-700 dark:bg-secondary-900"
           >
             <option value="">All Types</option>
             <option value="COMMENT">Comments</option>
             <option value="REVIEW">Reviews</option>
           </select>
         </div>
      </div>

      {/* Table or No Data Message */}
      {flaggedContent.length === 0 ? (
        <div className="rounded-md bg-secondary-50 p-8 text-center text-secondary-700 dark:bg-secondary-900 dark:text-secondary-300">
          <p>No flagged content found matching the current filters.</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-secondary-200 dark:border-secondary-800">
             {/* ... table structure ... */}
              <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-800">
                 <thead className="bg-secondary-50 dark:bg-secondary-900">
                   <tr>
                     <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                       Content
                     </th>
                     <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                       User
                     </th>
                     <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                       Type
                     </th>
                     <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                       Reason
                     </th>
                     <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                       Status
                     </th>
                     <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                       Date
                     </th>
                     <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-secondary-700 dark:text-secondary-300">
                       Actions
                     </th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-secondary-200 bg-white dark:divide-secondary-800 dark:bg-secondary-950">
                    {flaggedContent.map((item) => {
                         const statusColor = getStatusColor(item.status);
                         return (
                             <tr key={item.id}>
                                <td className="whitespace-pre-wrap px-6 py-4">
                                    <div className="max-w-xs truncate text-sm text-secondary-900 dark:text-secondary-100 sm:max-w-sm">
                                    {getContentText(item)}
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <div className="text-sm text-secondary-900 dark:text-secondary-100">{item.user?.username}</div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <Badge variant="secondary">{item.type}</Badge>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <div className="max-w-xs truncate text-sm text-secondary-700 dark:text-secondary-300 sm:max-w-sm">
                                    {item.reason}
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusColor.bg} ${statusColor.text}`}
                                    >
                                    {item.status}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <div className="text-sm text-secondary-700 dark:text-secondary-300">
                                    {formatDate(item.createdAt)}
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                                    {item.status === 'PENDING' && (
                                    <div className="flex justify-end space-x-2">
                                        <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-success-600 hover:bg-success-50 hover:text-success-700 dark:text-success-400 dark:hover:bg-success-950 dark:hover:text-success-300"
                                        onClick={() => openActionDialog(item, 'approve')}
                                        disabled={approveMutation.isLoading} // Disable button during mutation
                                        >
                                         {approveMutation.isLoading && approveMutation.variables === item.id ? 'Approving...' : 'Approve'}
                                        </Button>
                                        <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-danger-600 hover:bg-danger-50 hover:text-danger-700 dark:text-danger-400 dark:hover:bg-danger-950 dark:hover:text-danger-300"
                                        onClick={() => openActionDialog(item, 'reject')}
                                        disabled={rejectMutation.isLoading} // Disable button during mutation
                                        >
                                         {rejectMutation.isLoading && rejectMutation.variables?.id === item.id ? 'Rejecting...' : 'Reject'}
                                        </Button>
                                    </div>
                                    )}
                                </td>
                             </tr>
                         );
                    })}
                 </tbody>
              </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
             <div className="mt-6 flex justify-center space-x-2">
                 {/* ... pagination buttons ... */}
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => setPage((p) => Math.max(p - 1, 1))}
                   disabled={page === 1}
                 >
                   Previous
                 </Button>
                 <span className="flex items-center px-3 text-sm text-secondary-600 dark:text-secondary-400">
                   Page {page} of {pagination.pages}
                 </span>
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
                   disabled={page === pagination.pages}
                 >
                   Next
                 </Button>
             </div>
           )}

        </>
      )}

      {/* Approval Dialog */}
      <Dialog open={actionType === 'approve'} onOpenChange={closeActionDialog}>
        {/* ... dialog content remains the same, ensure buttons use mutation state */}
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Approve Content</DialogTitle>
           </DialogHeader>
           <div className="space-y-4">
             <div>
               <h4 className="font-medium">Content:</h4>
               <p className="mt-1 rounded-md bg-secondary-50 p-3 text-sm text-secondary-700 dark:bg-secondary-900 dark:text-secondary-300">
                 {selectedContent && getContentText(selectedContent)}
               </p>
             </div>
             <div>
               <h4 className="font-medium">Flagged Reason:</h4>
               <p className="mt-1 text-sm text-secondary-700 dark:text-secondary-300">
                 {selectedContent?.reason}
               </p>
             </div>
             <p className="text-sm text-secondary-700 dark:text-secondary-300">
               Are you sure you want to approve this content? It will remain visible to all users.
             </p>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={closeActionDialog} disabled={approveMutation.isLoading}>
               Cancel
             </Button>
             <Button
               variant="success"
               onClick={handleApprove}
               disabled={approveMutation.isLoading}
             >
               {approveMutation.isLoading ? 'Approving...' : 'Approve Content'}
             </Button>
           </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={actionType === 'reject'} onOpenChange={closeActionDialog}>
         {/* ... dialog content remains the same, ensure buttons use mutation state */}
          <DialogContent>
           <DialogHeader>
             <DialogTitle>Reject Content</DialogTitle>
           </DialogHeader>
           <div className="space-y-4">
             <div>
               <h4 className="font-medium">Content:</h4>
               <p className="mt-1 rounded-md bg-secondary-50 p-3 text-sm text-secondary-700 dark:bg-secondary-900 dark:text-secondary-300">
                 {selectedContent && getContentText(selectedContent)}
               </p>
             </div>
             <div>
               <h4 className="font-medium">Rejection Reason:</h4>
               <Textarea
                 value={rejectionReason}
                 onChange={(e) => setRejectionReason(e.target.value)}
                 placeholder="Provide a reason for rejection (optional, uses original reason if blank)"
                 className="mt-1"
               />
             </div>
             <p className="text-sm text-secondary-700 dark:text-secondary-300">
               The user will be notified about the rejection via email if they have notifications enabled.
             </p>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={closeActionDialog} disabled={rejectMutation.isLoading}>
               Cancel
             </Button>
             <Button
               variant="destructive"
               onClick={handleReject}
               disabled={rejectMutation.isLoading}
             >
               {rejectMutation.isLoading ? 'Rejecting...' : 'Reject Content'}
             </Button>
           </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlaggedContentList;