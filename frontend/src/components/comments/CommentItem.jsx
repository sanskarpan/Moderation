import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { useMutation, useQueryClient } from 'react-query';
import { commentsAPI } from '../../lib/api';
import { formatDate, formatRelativeTime } from '../../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';

const CommentItem = ({ comment }) => {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const isFlagged = comment.flaggedContent !== null;
  const isOwner = user?.id === comment.user?.clerkId;

  const deleteCommentMutation = useMutation(
    (id) => commentsAPI.deleteComment(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['comments']);
        queryClient.invalidateQueries(['post', comment.postId]);
        setIsDeleteDialogOpen(false);
      },
    }
  );

  const handleDelete = () => {
    deleteCommentMutation.mutate(comment.id);
  };

  return (
    <div className="rounded-lg border border-secondary-200 bg-white p-4 shadow-sm dark:border-secondary-800 dark:bg-secondary-950">
      <div className="flex items-start space-x-4">
        <Avatar>
          <AvatarImage src={comment.user?.imageUrl} alt={comment.user?.username} />
          <AvatarFallback>{comment.user?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
          <div className="flex flex-col justify-between space-y-1 sm:flex-row sm:items-center sm:space-y-0">
            <div>
              <p className="font-medium text-secondary-900 dark:text-secondary-100">
                {comment.user?.username}
              </p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">
                <time dateTime={comment.createdAt} title={formatDate(comment.createdAt, { dateStyle: 'full', timeStyle: 'short' })}>
                  {formatRelativeTime(comment.createdAt)}
                </time>
              </p>
            </div>
            
            {isFlagged && (
              <Badge variant="warning" className="ml-0 sm:ml-2">
                {comment.flaggedContent.status}
              </Badge>
            )}
          </div>
          
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="text-secondary-700 dark:text-secondary-300">{comment.content}</p>
          </div>
          
          {isOwner && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-danger-600 hover:bg-danger-50 hover:text-danger-700 dark:text-danger-400 dark:hover:bg-danger-950 dark:hover:text-danger-300"
                onClick={() => setIsDeleteDialogOpen(true)}
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
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
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