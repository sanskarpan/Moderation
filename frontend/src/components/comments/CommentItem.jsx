import React, { useState } from 'react'; // Added useState import
import { useUser, useAuth } from '@clerk/clerk-react'; // Import useAuth
import { useMutation, useQueryClient } from 'react-query';
import { commentsAPI } from '../../lib/api';
import { formatDate, formatRelativeTime } from '../../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';

const CommentItem = ({ comment }) => {
  const { user } = useUser();
  const { getToken } = useAuth(); // Get token function
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); // State for dialog

  // Check ownership using clerkId
  const isOwner = user?.id === comment.user?.clerkId;
  const isFlagged = comment.flaggedContent !== null;

  // --- Delete Comment Mutation ---
  const deleteCommentMutation = useMutation(
    // Make async and get token
    async (commentIdToDelete) => {
      const token = await getToken();
      if (!token) throw new Error("Authentication required to delete comment.");
      console.log(`CommentItem: Calling commentsAPI.deleteComment for ID: ${commentIdToDelete}`);
      // Pass token to API call
      return commentsAPI.deleteComment(commentIdToDelete, token);
    },
    {
      onSuccess: () => {
        console.log("CommentItem: deleteCommentMutation success");
        // Invalidate queries to refresh lists
        queryClient.invalidateQueries(['comments', comment.postId]); // Use postId for specific list invalidation
        queryClient.invalidateQueries(['post', comment.postId]); // Invalidate post data too (for counts)
        queryClient.invalidateQueries(['user']); // Invalidate user data if counts are displayed there
        setIsDeleteDialogOpen(false); // Close dialog
      },
      onError: (error) => {
        // Log the error
        console.error("CommentItem: deleteCommentMutation error:", error);
        // Optionally show an error message to the user (e.g., using a toast notification)
        alert(`Failed to delete comment: ${error?.response?.data?.message || error?.message || 'Unknown error'}`);
        setIsDeleteDialogOpen(false); // Close dialog on error too
      },
    }
  );

  // Handler for the confirmation button in the dialog
  const handleDeleteConfirm = () => {
    console.log("CommentItem: Confirming delete for comment:", comment.id);
    deleteCommentMutation.mutate(comment.id); // Pass the comment ID to the mutation
  };

  // --- Render ---
  return (
    <div className="rounded-lg border border-secondary-200 bg-white p-4 shadow-sm dark:border-secondary-800 dark:bg-secondary-950">
      <div className="flex items-start space-x-4">
         {/* ... Avatar ... */}
          <Avatar>
            <AvatarImage src={comment.user?.imageUrl} alt={comment.user?.username} />
            <AvatarFallback>{comment.user?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>

        <div className="flex-1 space-y-2">
           {/* ... User Info, Timestamp, Badge ... */}
            <div className="flex flex-col justify-between space-y-1 sm:flex-row sm:items-center sm:space-y-0">
                <div>
                  <p className="font-medium text-secondary-900 dark:text-secondary-100">{comment.user?.username}</p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                    <time dateTime={comment.createdAt} title={formatDate(comment.createdAt, { dateStyle: 'full', timeStyle: 'short' })}>
                      {formatRelativeTime(comment.createdAt)}
                    </time>
                  </p>
                </div>
                {isFlagged && (<Badge variant="warning" className="ml-0 sm:ml-2">{comment.flaggedContent.status}</Badge>)}
            </div>

           {/* ... Comment Content ... */}
            <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="text-secondary-700 dark:text-secondary-300">{comment.content}</p>
            </div>

           {/* Delete Button (Only if owner) */}
           {isOwner && (
             <div className="flex justify-end">
               <Button
                 variant="ghost"
                 size="sm"
                 className="text-danger-600 hover:bg-danger-50 hover:text-danger-700 dark:text-danger-400 dark:hover:bg-danger-950 dark:hover:text-danger-300"
                 // onClick should open the dialog
                 onClick={() => 
                  { 
                     console.log("CommentItem: Delete button clicked for comment:", comment.id);
                     setIsDeleteDialogOpen(true);
                 }}
               >
                 Delete
               </Button>
             </div>
           )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Comment</DialogTitle>
          </DialogHeader>
          <p className="text-secondary-700 dark:text-secondary-300">
            Are you sure you want to delete this comment? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={deleteCommentMutation.isLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              // onClick calls the confirmation handler
              onClick={handleDeleteConfirm}
              // onClick={() => alert('Dialog Confirm Clicked!')} 
              disabled={deleteCommentMutation.isLoading}
            >
              {deleteCommentMutation.isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommentItem;