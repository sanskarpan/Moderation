import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { useMutation, useQueryClient } from 'react-query';
import { reviewsAPI } from '../../lib/api';
import { formatDate, formatRelativeTime } from '../../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';

const RatingStars = ({ rating }) => {
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={star <= rating ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={
            star <= rating
              ? 'text-warning-500'
              : 'text-secondary-300 dark:text-secondary-600'
          }
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
};

const ReviewItem = ({ review }) => {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const isFlagged = review.flaggedContent !== null;
  const isOwner = user?.id === review.user?.clerkId;

  const deleteReviewMutation = useMutation(
    (id) => reviewsAPI.deleteReview(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['reviews']);
        queryClient.invalidateQueries(['post', review.postId]);
        setIsDeleteDialogOpen(false);
      },
    }
  );

  const handleDelete = () => {
    deleteReviewMutation.mutate(review.id);
  };

  return (
    <div className="rounded-lg border border-secondary-200 bg-white p-4 shadow-sm dark:border-secondary-800 dark:bg-secondary-950">
      <div className="flex items-start space-x-4">
        <Avatar>
          <AvatarImage src={review.user?.imageUrl} alt={review.user?.username} />
          <AvatarFallback>{review.user?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
          <div className="flex flex-col justify-between space-y-1 sm:flex-row sm:items-center sm:space-y-0">
            <div>
              <div className="flex items-center space-x-2">
                <p className="font-medium text-secondary-900 dark:text-secondary-100">
                  {review.user?.username}
                </p>
                <RatingStars rating={review.rating} />
              </div>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">
                <time dateTime={review.createdAt} title={formatDate(review.createdAt, { dateStyle: 'full', timeStyle: 'short' })}>
                  {formatRelativeTime(review.createdAt)}
                </time>
              </p>
            </div>
            
            {isFlagged && (
              <Badge variant="warning" className="ml-0 sm:ml-2">
                {review.flaggedContent.status}
              </Badge>
            )}
          </div>
          
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <p className="text-secondary-700 dark:text-secondary-300">{review.content}</p>
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
            <DialogTitle>Delete Review</DialogTitle>
          </DialogHeader>
          <p className="text-secondary-700 dark:text-secondary-300">
            Are you sure you want to delete this review? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteReviewMutation.isLoading}
            >
              {deleteReviewMutation.isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewItem;