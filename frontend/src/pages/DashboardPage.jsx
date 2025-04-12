import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react'; // Import useAuth
import { useQuery } from 'react-query';
import { postsAPI, commentsAPI, reviewsAPI, moderationAPI, authAPI } from '../lib/api'; // Import authAPI
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import PostCard from '../components/posts/PostCard';
import { formatDate } from '../lib/utils';
import { Alert, AlertDescription } from '../components/ui/alert'; // Import Alert

const DashboardPage = () => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { getToken, isLoaded: isAuthLoaded } = useAuth(); // Get getToken
  const [activeTab, setActiveTab] = useState('posts');

  // --- Fetch User Data from your Backend ---
  const {
    data: userDataResponse,
    isLoading: isUserDataLoading,
    isError: isUserDataError,
    error: userDataError,
  } = useQuery(
    ['user'], // Use query key 'user'
    async () => {
      const token = await getToken();
      if (!token) return null; // Don't fetch if no token
      return authAPI.getMe(token); // Fetch from your backend /auth/me
    },
    {
      enabled: isUserLoaded && isAuthLoaded && !!user, // Enable only when Clerk is ready and user exists
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
  );
  const localUser = userDataResponse?.user; // Extract nested user object

  // --- Fetch Content Data (Dependent on localUser) ---
  const commonQueryOptions = (tabName) => ({
      enabled: !!localUser?.id && activeTab === tabName && isAuthLoaded, // Ensure localUser ID exists, tab is active, and auth is loaded
      keepPreviousData: true,
      staleTime: 60 * 1000, // 1 minute cache
      refetchOnWindowFocus: false,
  });

  // Fetch user's posts
  const {
    data: postsData,
    isLoading: isPostsLoading,
    isError: isPostsError,
    error: postsError,
  } = useQuery(
    ['user-posts', localUser?.id],
    async () => {
        const token = await getToken();
        // Pass token even though it might be public, for consistency or future changes
        return postsAPI.getUserPosts(localUser.id, { page: 1, limit: 5 }, token);
    },
    commonQueryOptions('posts')
  );

  // Fetch user's comments
  const {
    data: commentsData,
    isLoading: isCommentsLoading,
    isError: isCommentsError,
    error: commentsError,
  } = useQuery(
    ['user-comments', localUser?.id],
     async () => {
        const token = await getToken();
        return commentsAPI.getUserComments(localUser.id, { page: 1, limit: 5 }, token);
    },
    commonQueryOptions('comments')
  );

  // Fetch user's reviews
  const {
    data: reviewsData,
    isLoading: isReviewsLoading,
    isError: isReviewsError,
    error: reviewsError,
  } = useQuery(
    ['user-reviews', localUser?.id],
    async () => {
        const token = await getToken();
        return reviewsAPI.getUserReviews(localUser.id, { page: 1, limit: 5 }, token);
    },
    commonQueryOptions('reviews')
  );

  // Fetch user's flagged content
  const {
    data: flaggedData,
    isLoading: isFlaggedLoading,
    isError: isFlaggedError,
    error: flaggedError,
  } = useQuery(
    ['user-flagged', localUser?.id],
    async () => {
        const token = await getToken();
        if (!token) return null; // Needs token
        return moderationAPI.getFlaggedContent({ page: 1, limit: 5 }, token);
    },
    commonQueryOptions('flagged')
  );

  // Loading state for initial user data
  if ((!isUserLoaded || !isAuthLoaded || isUserDataLoading) && !localUser) {
     return (
        <div className="flex justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
     );
  }

  // Error state for initial user data
  if (isUserDataError) {
       return (
            <Alert variant="danger">
                <AlertDescription>
                    Error loading user data: {userDataError?.message || 'Could not load profile information.'}
                </AlertDescription>
            </Alert>
        );
   }


  // Safely access counts, provide defaults
  const postCount = localUser?._count?.posts ?? postsData?.pagination?.total ?? 0;
  const commentCount = localUser?._count?.comments ?? commentsData?.pagination?.total ?? 0;
  const reviewCount = localUser?._count?.reviews ?? reviewsData?.pagination?.total ?? 0;
  const flaggedCount = localUser?._count?.flaggedContents ?? flaggedData?.pagination?.total ?? 0;

  const renderLoading = () => (
    <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
  );

  const renderError = (error, type) => (
      <Alert variant="danger" className="my-4">
          <AlertDescription>
             Error loading your {type}: {error?.message || 'Could not fetch data.'}
          </AlertDescription>
      </Alert>
  );


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <Link to="/posts/create">
          <Button>
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Post
          </Button>
        </Link>
      </div>

      {/* Stats Cards - Use safe counts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary-50 dark:bg-primary-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
               {postCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary-50 dark:bg-secondary-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {commentCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-success-50 dark:bg-success-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reviewCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-warning-50 dark:bg-warning-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Flagged Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {flaggedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="border-b border-secondary-200 dark:border-secondary-800">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {['posts', 'comments', 'reviews', 'flagged'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                    : 'border-transparent text-secondary-500 hover:border-secondary-300 hover:text-secondary-700 dark:text-secondary-400 dark:hover:border-secondary-700 dark:hover:text-secondary-300'
                }`}
              >
                {tab === 'posts'
                  ? 'Your Posts'
                  : tab === 'comments'
                  ? 'Your Comments'
                  : tab === 'reviews'
                  ? 'Your Reviews'
                  : 'Flagged Content'}
              </button>
            ))}
          </nav>
        </div>

        <div>
          {/* Posts Tab */}
          {activeTab === 'posts' && (
            <>
              {isPostsLoading ? renderLoading() :
               isPostsError ? renderError(postsError, 'posts') :
               !postsData || !Array.isArray(postsData.posts) || postsData.posts.length === 0 ? ( // Robust check
                <div className="rounded-lg border border-secondary-200 bg-white p-8 text-center dark:border-secondary-800 dark:bg-secondary-950">
                  <h3 className="mb-2 text-lg font-medium">No posts yet</h3>
                  <p className="mb-4 text-secondary-600 dark:text-secondary-400">
                    Create your first post to get started.
                  </p>
                  <Link to="/posts/create">
                    <Button>Create Post</Button>
                  </Link>
                </div>
              ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {postsData.posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                        ))}
                    </div>
                    {/* Optional: Link to full list if pagination shows more */}
                    {postsData?.pagination?.total > 5 && (
                         <div className="mt-4 text-center">
                            <Link to="/profile"> {/* Assuming profile shows full list */}
                                <Button variant="outline">View All Posts</Button>
                            </Link>
                         </div>
                    )}
                </>
              )}
            </>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
             <>
               {isCommentsLoading ? renderLoading() :
                isCommentsError ? renderError(commentsError, 'comments') :
                !commentsData || !Array.isArray(commentsData.comments) || commentsData.comments.length === 0 ? ( // Robust check
                 <div className="rounded-lg border border-secondary-200 bg-white p-8 text-center dark:border-secondary-800 dark:bg-secondary-950">
                   <h3 className="mb-2 text-lg font-medium">No comments yet</h3>
                   <p className="text-secondary-600 dark:text-secondary-400">
                     You haven't commented on any posts yet.
                   </p>
                 </div>
               ) : (
                 <>
                    <div className="space-y-4">
                        {commentsData.comments.map((comment) => (
                            <Card key={comment.id}>
                            <CardContent className="p-4">
                                <div className="mb-2 flex items-center justify-between">
                                <Link
                                    to={`/posts/${comment.postId}`} // Ensure postId exists
                                    className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                                >
                                    {comment.post?.title || 'View Post'} {/* Handle missing post title */}
                                </Link>
                                <span className="text-xs text-secondary-500 dark:text-secondary-400">{formatDate(comment.createdAt)}</span>
                                </div>
                                <p className="text-secondary-700 dark:text-secondary-300">{comment.content}</p>
                                {comment.flaggedContent && (
                                <div className="mt-2">
                                    <Badge variant="warning">Flagged: {comment.flaggedContent.status}</Badge>
                                </div>
                                )}
                            </CardContent>
                            </Card>
                        ))}
                    </div>
                    {commentsData?.pagination?.total > 5 && (
                         <div className="mt-4 text-center">
                            <Link to="/profile">
                                <Button variant="outline">View All Comments</Button>
                            </Link>
                         </div>
                    )}
                 </>
               )}
             </>
           )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
             <>
               {isReviewsLoading ? renderLoading() :
                isReviewsError ? renderError(reviewsError, 'reviews') :
                !reviewsData || !Array.isArray(reviewsData.reviews) || reviewsData.reviews.length === 0 ? ( // Robust check
                 <div className="rounded-lg border border-secondary-200 bg-white p-8 text-center dark:border-secondary-800 dark:bg-secondary-950">
                   <h3 className="mb-2 text-lg font-medium">No reviews yet</h3>
                   <p className="text-secondary-600 dark:text-secondary-400">
                     You haven't reviewed any posts yet.
                   </p>
                 </div>
               ) : (
                <>
                 <div className="space-y-4">
                   {reviewsData.reviews.map((review) => (
                     <Card key={review.id}>
                       <CardContent className="p-4">
                         <div className="mb-2 flex items-center justify-between">
                           <div className="flex items-center">
                             <Link to={`/posts/${review.postId}`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">{review.post?.title || 'View Post'}</Link>
                             <div className="ml-2 flex">
                               {[1, 2, 3, 4, 5].map((star) => (
                                 <svg
                                   key={star}
                                   xmlns="http://www.w3.org/2000/svg"
                                   width="16"
                                   height="16"
                                   viewBox="0 0 24 24"
                                   fill={star <= review.rating ? 'currentColor' : 'none'}
                                   stroke="currentColor"
                                   strokeWidth="2"
                                   strokeLinecap="round"
                                   strokeLinejoin="round"
                                   className={
                                     star <= review.rating
                                       ? 'text-warning-500'
                                       : 'text-secondary-300 dark:text-secondary-600'
                                   }
                                 >
                                   <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                 </svg>
                               ))}
                             </div>
                           </div>
                           <span className="text-xs text-secondary-500 dark:text-secondary-400">{formatDate(review.createdAt)}</span>
                         </div>
                         <p className="text-secondary-700 dark:text-secondary-300">{review.content}</p>
                         {review.flaggedContent && (
                           <div className="mt-2">
                             <Badge variant="warning">Flagged: {review.flaggedContent.status}</Badge>
                           </div>
                         )}
                       </CardContent>
                     </Card>
                   ))}
                 </div>
                 {reviewsData?.pagination?.total > 5 && (
                    <div className="mt-4 text-center">
                        <Link to="/profile">
                        <Button variant="outline">View All Reviews</Button>
                        </Link>
                    </div>
                 )}
                </>
               )}
             </>
           )}

            {/* Flagged Content Tab */}
           {activeTab === 'flagged' && (
             <>
               {isFlaggedLoading ? renderLoading() :
                isFlaggedError ? renderError(flaggedError, 'flagged content') :
                !flaggedData || !Array.isArray(flaggedData.flaggedContent) || flaggedData.flaggedContent.length === 0 ? ( // Robust check
                 <div className="rounded-lg border border-secondary-200 bg-white p-8 text-center dark:border-secondary-800 dark:bg-secondary-950">
                   <h3 className="mb-2 text-lg font-medium">No flagged content</h3>
                   <p className="text-secondary-600 dark:text-secondary-400">None of your content has been flagged for moderation.</p>
                 </div>
               ) : (
                 <>
                 <div className="space-y-4">
                   {flaggedData.flaggedContent.map((item) => {
                     const content =
                       item.type === 'COMMENT'
                         ? item.comment?.content || 'Comment content unavailable'
                         : item.review?.content || 'Review content unavailable';
                     const postId =
                       item.type === 'COMMENT' ? item.comment?.postId : item.review?.postId;
                     const postTitle =
                       item.type === 'COMMENT'
                         ? item.comment?.post?.title
                         : item.review?.post?.title;
                     let statusClass = '';
                     if (item.status === 'PENDING') statusClass = 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300';
                     else if (item.status === 'APPROVED') statusClass = 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300';
                     else if (item.status === 'REJECTED') statusClass = 'bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300';

                     return (
                       <Card key={item.id}>
                         <CardContent className="p-4">
                           <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                             <div>
                               {postId && (
                                 <Link to={`/posts/${postId}`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">{postTitle || 'View Post'}</Link>
                               )}
                               <div className="mt-1 flex flex-wrap gap-2">
                                 <Badge variant="secondary">{item.type}</Badge>
                                 <Badge className={statusClass}>{item.status}</Badge>
                               </div>
                             </div>
                             <span className="text-xs text-secondary-500 dark:text-secondary-400">{formatDate(item.createdAt)}</span>
                           </div>
                           <div className="mt-3 rounded-md bg-secondary-50 p-3 dark:bg-secondary-900">
                             <p className="text-secondary-700 dark:text-secondary-300">{content}</p>
                           </div>
                           <div className="mt-3">
                             <h4 className="text-sm font-medium text-secondary-900 dark:text-secondary-100">Reason for flagging:</h4>
                             <p className="text-sm text-secondary-700 dark:text-secondary-300">{item.reason}</p>
                           </div>
                         </CardContent>
                       </Card>
                     );
                   })}
                 </div>
                 {flaggedData?.pagination?.total > 5 && (
                    <div className="mt-4 text-center">
                        <Link to="/profile">
                        <Button variant="outline">View All Flagged Content</Button>
                        </Link>
                    </div>
                 )}
                </>
               )}
             </>
           )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;