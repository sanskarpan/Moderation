import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query'; // Added useMutation, useQueryClient
import { useUser } from '@clerk/clerk-react';
import { postsAPI } from '../lib/api';
import { formatDate, formatRelativeTime } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'; // Use the UI component
import CommentList from '../components/comments/CommentList';
import CreateCommentForm from '../components/comments/CreateCommentForm';
import ReviewList from '../components/reviews/ReviewList';
import CreateReviewForm from '../components/reviews/CreateReviewForm';
import { Alert, AlertDescription } from '../components/ui/alert'; // Import Alert

const PostDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user, isSignedIn } = useUser();
  const [activeTab, setActiveTab] = useState('comments');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState(''); // State for delete error

  const queryClient = useQueryClient(); // Get query client instance

  // Fetch post data
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery(['post', postId], () => postsAPI.getPost(postId), {
    retry: false, // Don't retry if post not found
  });

  // Delete post mutation
  const deletePostMutation = useMutation(
    () => postsAPI.deletePost(postId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['posts']); // Invalidate list of posts
        navigate('/posts'); // Navigate away after successful delete
      },
      onError: (error) => {
        console.error('Error deleting post:', error);
        setDeleteError(error.response?.data?.message || 'Failed to delete post. Please try again.');
        setDeleteDialogOpen(false); // Close dialog on error
      },
    }
  );

  const handleDeleteConfirm = () => {
    setDeleteError(''); // Clear previous errors
    deletePostMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="bg-danger-50 text-danger-700 dark:bg-danger-900 dark:text-danger-300">
        <CardContent className="p-6">
          <h3 className="mb-2 font-semibold">Error Loading Post</h3>
          <p>{error?.response?.data?.message || error?.message || 'This post could not be found or has been removed.'}</p>
          <Button
            variant="outline"
            onClick={() => navigate('/posts')}
            className="mt-4"
          >
            Back to Posts
          </Button>
        </CardContent>
      </Card>
    );
  }

  const post = data?.post; // Use optional chaining

  // Handle case where post might be null/undefined even if no error occurred
  if (!post) {
      return (
        <Card className="bg-warning-50 text-warning-700 dark:bg-warning-900 dark:text-warning-300">
          <CardContent className="p-6">
            <h3 className="mb-2 font-semibold">Post Not Available</h3>
            <p>The requested post could not be loaded.</p>
            <Button
              variant="outline"
              onClick={() => navigate('/posts')}
              className="mt-4"
            >
              Back to Posts
            </Button>
          </CardContent>
        </Card>
      );
  }

  // Check ownership using clerkId from the database user object
  const isOwner = isSignedIn && user?.id === post?.user?.clerkId;

  return (
    <div className="space-y-6">
       {deleteError && (
        <Alert variant="danger" className="mb-4">
          <AlertDescription>{deleteError}</AlertDescription>
        </Alert>
      )}
      {/* Navigation and actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)} // Go back one step in history
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mr-1 h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </Button>

        {isOwner && (
          <div className="flex space-x-2">
            {/* TODO: Implement Edit Post Page/Functionality */}
            {/* <Link to={`/posts/edit/${postId}`}>
              <Button
                variant="outline"
                size="sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mr-1 h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Edit
              </Button>
            </Link> */}
            <Button
              variant="outline"
              size="sm"
              className="text-danger-600 hover:bg-danger-50 hover:text-danger-700 dark:text-danger-400 dark:hover:bg-danger-950 dark:hover:text-danger-300"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mr-1 h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Post content */}
      <article className="rounded-lg border border-secondary-200 bg-white p-6 shadow-sm dark:border-secondary-800 dark:bg-secondary-950">
        <header className="mb-6">
          <h1 className="mb-3 text-3xl font-bold text-secondary-900 dark:text-secondary-100 break-words">
            {post.title}
          </h1>

          <div className="flex items-center space-x-4">
             {/* Use optional chaining for user data */}
             <Avatar>
              <AvatarImage src={post.user?.imageUrl} alt={post.user?.username || 'User'} />
              <AvatarFallback>{post.user?.username?.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <p className="font-medium text-secondary-900 dark:text-secondary-100">
                {post.user?.username || 'Unknown User'}
              </p>
              <div className="flex items-center text-sm text-secondary-500 dark:text-secondary-400">
                <time dateTime={post.createdAt} title={formatDate(post.createdAt, { dateStyle: 'full', timeStyle: 'short' })}>
                  {formatRelativeTime(post.createdAt)}
                </time>

                {post.updatedAt && post.createdAt !== post.updatedAt && (
                  <span className="ml-2 text-xs">(Updated {formatRelativeTime(post.updatedAt)})</span>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="prose max-w-none dark:prose-invert">
          <p className="whitespace-pre-wrap text-secondary-700 dark:text-secondary-300">
            {post.content}
          </p>
        </div>
      </article>

      {/* Comments and Reviews Tabs */}
      <div className="mt-8 space-y-4">
        <Tabs defaultValue="comments" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="comments">
              Comments ({post._count?.comments || 0})
            </TabsTrigger>
            <TabsTrigger value="reviews">
              Reviews ({post._count?.reviews || 0})
            </TabsTrigger>
          </TabsList>

          {/* Wrap content in the TabsContent component from ui/tabs */}
          <TabsContent value="comments" className={activeTab !== 'comments' ? 'hidden' : ''}>
            {isSignedIn ? (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="mb-4 text-lg font-medium">Leave a Comment</h3>
                  <CreateCommentForm postId={postId} />
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-6 bg-secondary-50 dark:bg-secondary-900">
                <CardContent className="p-6 text-center">
                  <p className="mb-4 text-secondary-600 dark:text-secondary-400">
                    You need to be signed in to leave a comment.
                  </p>
                  <Link to="/sign-in">
                    <Button>Sign In</Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            <CommentList postId={postId} />
          </TabsContent>

          <TabsContent value="reviews" className={activeTab !== 'reviews' ? 'hidden' : ''}>
            {isSignedIn ? (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h3 className="mb-4 text-lg font-medium">Leave a Review</h3>
                  <CreateReviewForm postId={postId} />
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-6 bg-secondary-50 dark:bg-secondary-900">
                <CardContent className="p-6 text-center">
                  <p className="mb-4 text-secondary-600 dark:text-secondary-400">
                    You need to be signed in to leave a review.
                  </p>
                  <Link to="/sign-in">
                    <Button>Sign In</Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            <ReviewList postId={postId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
          </DialogHeader>
          <p className="text-secondary-600 dark:text-secondary-400">
            Are you sure you want to delete this post? This action cannot be undone and all comments and reviews will also be deleted.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletePostMutation.isLoading} // Disable if deleting
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm} // Use the handler
              disabled={deletePostMutation.isLoading} // Disable if deleting
            >
              {deletePostMutation.isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostDetailPage;