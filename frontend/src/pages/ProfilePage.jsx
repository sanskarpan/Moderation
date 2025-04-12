import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react'; // Import useAuth
import { useQuery } from 'react-query';
import { authAPI, postsAPI, commentsAPI, reviewsAPI, moderationAPI } from '../lib/api';
import { formatDate } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert'; // Import Alert

const ProfilePage = () => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { getToken, isLoaded: isAuthLoaded } = useAuth(); // Get getToken
  const [activeTab, setActiveTab] = useState('posts');
  const [page, setPage] = useState(1);
  const limit = 10; // Define limit for pagination

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
        // Use localUser.id from your backend, NOT clerk user.id directly for API calls
        enabled: !!localUser?.id && activeTab === tabName && isAuthLoaded,
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
     ['user-posts', localUser?.id, page], // Add page to query key
     async () => {
       const token = await getToken();
       return postsAPI.getUserPosts(localUser.id, { page, limit }, token);
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
     ['user-comments', localUser?.id, page], // Add page to query key
     async () => {
       const token = await getToken();
       return commentsAPI.getUserComments(localUser.id, { page, limit }, token);
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
     ['user-reviews', localUser?.id, page], // Add page to query key
     async () => {
       const token = await getToken();
       return reviewsAPI.getUserReviews(localUser.id, { page, limit }, token);
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
     ['user-flagged', localUser?.id, page], // Add page to query key
     async () => {
       const token = await getToken();
       if (!token) return null; // Needs token
       return moderationAPI.getFlaggedContent({ page, limit }, token); // Uses correct endpoint
     },
     commonQueryOptions('flagged')
   );


  // Reset page to 1 when tab changes
  const handleTabChange = (value) => {
    setActiveTab(value);
    setPage(1);
  };

  // Loading and Error States
  if ((!isUserLoaded || !isAuthLoaded || isUserDataLoading) && !localUser) {
     return (
        <div className="flex justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
     );
  }

  if (isUserDataError) {
       return (
            <Alert variant="danger">
                <AlertDescription>
                    Error loading profile: {userDataError?.message || 'Could not load profile information.'}
                </AlertDescription>
            </Alert>
        );
   }

    if (!localUser && !isUserDataLoading) { // Handle case where user fetch finished but no user data
        return (
            <Card className="bg-warning-50 text-warning-700 dark:bg-warning-900 dark:text-warning-300">
                <CardContent className="p-6">
                    <h3 className="mb-2 font-semibold">Profile Not Available</h3>
                    <p>Could not retrieve your profile details.</p>
                </CardContent>
            </Card>
        );
    }

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


  const renderPagination = (pagination) => {
    if (!pagination || pagination.pages <= 1) return null;

    return (
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
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <Link to="/settings">
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
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Settings
          </Button>
        </Link>
      </div>

      {/* User Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4 sm:flex-row sm:items-start sm:space-x-4 sm:space-y-0">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user?.imageUrl} alt={localUser?.username} />
              <AvatarFallback className="text-xl">
                {localUser?.username?.substring(0, 2).toUpperCase() || '??'}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-2 text-center sm:text-left">
              <h2 className="text-xl font-bold text-secondary-900 dark:text-secondary-100">
                {localUser?.username || 'User'}
              </h2>
              <p className="text-secondary-600 dark:text-secondary-400">
                {localUser?.email || 'No email'}
              </p>
              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                <Badge variant={localUser?.role === 'ADMIN' ? 'primary' : 'secondary'}>
                  {localUser?.role || 'USER'}
                </Badge>
                {localUser?.createdAt && (
                    <Badge variant="outline">
                        Joined {formatDate(localUser.createdAt)}
                    </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Stats - Use optional chaining and nullish coalescing */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
         <Card className="bg-primary-50 dark:bg-primary-900">
            <CardContent className="flex items-center justify-between p-6">
                <div><p className="text-sm font-medium">Posts</p><p className="text-2xl font-bold">{localUser?._count?.posts ?? postsData?.pagination?.total ?? 0}</p></div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </CardContent>
         </Card>
         <Card className="bg-secondary-50 dark:bg-secondary-900">
             <CardContent className="flex items-center justify-between p-6">
                 <div><p className="text-sm font-medium">Comments</p><p className="text-2xl font-bold">{localUser?._count?.comments ?? commentsData?.pagination?.total ?? 0}</p></div>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-secondary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
             </CardContent>
         </Card>
         <Card className="bg-success-50 dark:bg-success-900">
             <CardContent className="flex items-center justify-between p-6">
                 <div><p className="text-sm font-medium">Reviews</p><p className="text-2xl font-bold">{localUser?._count?.reviews ?? reviewsData?.pagination?.total ?? 0}</p></div>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-success-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
             </CardContent>
         </Card>
         <Card className="bg-warning-50 dark:bg-warning-900">
             <CardContent className="flex items-center justify-between p-6">
                 <div><p className="text-sm font-medium">Flagged</p><p className="text-2xl font-bold">{localUser?._count?.flaggedContents ?? flaggedData?.pagination?.total ?? 0}</p></div>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-warning-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
             </CardContent>
         </Card>
      </div>


      {/* Tabs */}
      <div className="space-y-4">
         <Tabs defaultValue="posts" onValueChange={handleTabChange}>
            <TabsList>
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="flagged">Flagged Content</TabsTrigger>
            </TabsList>

            {/* Content for Posts */}
            <TabsContent value="posts">
                {isPostsLoading ? renderLoading() :
                 isPostsError ? renderError(postsError, 'posts') :
                 !postsData || !Array.isArray(postsData.posts) || postsData.posts.length === 0 ? (
                    <Card><CardContent className="p-6 text-center"><p className="mb-4 text-secondary-600 dark:text-secondary-400">You haven't created any posts yet.</p><Link to="/posts/create"><Button>Create Your First Post</Button></Link></CardContent></Card>
                ) : (
                    <div className="space-y-4">
                        {postsData.posts.map((post) => (
                            <Card key={post.id}>
                                <CardContent className="p-4">
                                    <Link to={`/posts/${post.id}`} className="mb-2 block text-lg font-medium text-primary-600 hover:underline dark:text-primary-400">{post.title}</Link>
                                    <p className="line-clamp-2 text-secondary-700 dark:text-secondary-300">{post.content}</p>
                                    <div className="mt-2 flex items-center justify-between">
                                        <div className="flex space-x-4 text-sm text-secondary-500 dark:text-secondary-400">
                                            <span>{post._count?.comments || 0} Comments</span>
                                            <span>{post._count?.reviews || 0} Reviews</span>
                                        </div>
                                        <span className="text-xs text-secondary-500 dark:text-secondary-400">{formatDate(post.createdAt)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {renderPagination(postsData.pagination)}
                    </div>
                )}
            </TabsContent>

             {/* Content for Comments */}
             <TabsContent value="comments">
                 {isCommentsLoading ? renderLoading() :
                  isCommentsError ? renderError(commentsError, 'comments') :
                  !commentsData || !Array.isArray(commentsData.comments) || commentsData.comments.length === 0 ? (
                      <Card><CardContent className="p-6 text-center"><p className="text-secondary-600 dark:text-secondary-400">You haven't made any comments yet.</p></CardContent></Card>
                  ) : (
                      <div className="space-y-4">
                          {commentsData.comments.map((comment) => (
                              <Card key={comment.id}>
                                  <CardContent className="p-4">
                                      <Link to={`/posts/${comment.postId}`} className="mb-2 block font-medium text-primary-600 hover:underline dark:text-primary-400">{comment.post?.title || 'Post'}</Link>
                                      <p className="text-secondary-700 dark:text-secondary-300">{comment.content}</p>
                                      <div className="mt-2 flex items-center justify-between">
                                          <div>{comment.flaggedContent && <Badge variant="warning">Flagged: {comment.flaggedContent.status}</Badge>}</div>
                                          <span className="text-xs text-secondary-500 dark:text-secondary-400">{formatDate(comment.createdAt)}</span>
                                      </div>
                                  </CardContent>
                              </Card>
                          ))}
                          {renderPagination(commentsData.pagination)}
                      </div>
                  )}
             </TabsContent>

             {/* Content for Reviews */}
              <TabsContent value="reviews">
                  {isReviewsLoading ? renderLoading() :
                   isReviewsError ? renderError(reviewsError, 'reviews') :
                   !reviewsData || !Array.isArray(reviewsData.reviews) || reviewsData.reviews.length === 0 ? (
                       <Card><CardContent className="p-6 text-center"><p className="text-secondary-600 dark:text-secondary-400">You haven't written any reviews yet.</p></CardContent></Card>
                   ) : (
                       <div className="space-y-4">
                           {reviewsData.reviews.map((review) => (
                               <Card key={review.id}>
                                   <CardContent className="p-4">
                                       <div className="mb-2 flex items-center justify-between">
                                           <Link to={`/posts/${review.postId}`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">{review.post?.title || 'Post'}</Link>
                                           <div className="flex items-center">
                                               {[1, 2, 3, 4, 5].map((star) => (
                                                   <svg key={star} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={star <= review.rating ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ star <= review.rating ? 'text-warning-500' : 'text-secondary-300 dark:text-secondary-600' }>
                                                       <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                                   </svg>
                                               ))}
                                           </div>
                                       </div>
                                       <p className="text-secondary-700 dark:text-secondary-300">{review.content}</p>
                                       <div className="mt-2 flex items-center justify-between">
                                           <div>{review.flaggedContent && <Badge variant="warning">Flagged: {review.flaggedContent.status}</Badge>}</div>
                                           <span className="text-xs text-secondary-500 dark:text-secondary-400">{formatDate(review.createdAt)}</span>
                                       </div>
                                   </CardContent>
                               </Card>
                           ))}
                           {renderPagination(reviewsData.pagination)}
                       </div>
                   )}
              </TabsContent>

              {/* Content for Flagged Content */}
              <TabsContent value="flagged">
                  {isFlaggedLoading ? renderLoading() :
                   isFlaggedError ? renderError(flaggedError, 'flagged content') :
                   !flaggedData || !Array.isArray(flaggedData.flaggedContent) || flaggedData.flaggedContent.length === 0 ? (
                       <Card><CardContent className="p-6 text-center"><p className="text-secondary-600 dark:text-secondary-400">You don't have any flagged content.</p></CardContent></Card>
                   ) : (
                       <div className="space-y-4">
                           {flaggedData.flaggedContent.map((item) => {
                                const content = item.type === 'COMMENT' ? item.comment?.content : item.review?.content;
                                const postId = item.type === 'COMMENT' ? item.comment?.postId : item.review?.postId;
                                const postTitle = item.type === 'COMMENT' ? item.comment?.post?.title : item.review?.post?.title;
                                let statusClass = '';
                                if (item.status === 'PENDING') statusClass = 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300';
                                else if (item.status === 'APPROVED') statusClass = 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300';
                                else if (item.status === 'REJECTED') statusClass = 'bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300';

                                return (
                                    <Card key={item.id}>
                                        <CardContent className="p-4">
                                            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    {postId && <Link to={`/posts/${postId}`} className="font-medium text-primary-600 hover:underline dark:text-primary-400">{postTitle || 'View Post'}</Link>}
                                                    <div className="mt-1 flex flex-wrap gap-2">
                                                        <Badge variant="secondary">{item.type}</Badge>
                                                        <Badge className={statusClass}>{item.status}</Badge>
                                                    </div>
                                                </div>
                                                <span className="text-xs text-secondary-500 dark:text-secondary-400">{formatDate(item.createdAt)}</span>
                                            </div>
                                            <div className="mt-3 rounded-md bg-secondary-50 p-3 dark:bg-secondary-900">
                                                <p className="text-secondary-700 dark:text-secondary-300">{content || 'Content not available'}</p>
                                            </div>
                                            <div className="mt-3">
                                                <h4 className="text-sm font-medium text-secondary-900 dark:text-secondary-100">Reason for flagging:</h4>
                                                <p className="text-sm text-secondary-700 dark:text-secondary-300">{item.reason}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                           })}
                           {renderPagination(flaggedData.pagination)}
                       </div>
                   )}
              </TabsContent>
         </Tabs>
      </div>
    </div>
  );
}

export default ProfilePage;