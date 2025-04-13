import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useQuery } from 'react-query';
// Import specific APIs needed
import { postsAPI, commentsAPI, reviewsAPI, moderationAPI, authAPI } from '../lib/api';
import { formatDate } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';

// Helper render functions
const renderLoading = () => (
    <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
    </div>
);

const renderError = (error, type) => (
    <Alert variant="danger" className="my-4">
        <AlertDescription>
            Error loading your {type}: {error?.response?.data?.message || error?.message || 'Could not fetch data.'}
        </AlertDescription>
    </Alert>
);

const ProfilePage = () => {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { getToken, isLoaded: isAuthLoaded } = useAuth();
  const [activeTab, setActiveTab] = useState('posts');
  const [page, setPage] = useState(1);
  const limit = 10;

  // --- Access User Data from React Query Cache ---
  const {
    data: localUser,
    isLoading: isUserDataLoading,
    isError: isUserDataError,
    error: userDataError,
  } = useQuery(
    ['user'],
    async () => {
      const token = await getToken();
      if (!token) return null;
      try {
        const data = await authAPI.getMe(token);
        return data.user;
      } catch (err) {
        console.error("ProfilePage useQuery('user'): Error fetching user data:", err);
        throw err;
      }
    },
    {
      enabled: isUserLoaded && isAuthLoaded && !!clerkUser,
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  // --- Fetch Paginated Content Data ---
   const commonQueryOptions = (tabName) => ({
        enabled: !!localUser?.id && activeTab === tabName && isAuthLoaded,
        keepPreviousData: true,
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
   });

   const { data: postsData, isLoading: isPostsLoading, isError: isPostsError, error: postsError } = useQuery(
     ['user-posts', localUser?.id, page],
     async () => {
        if (!localUser?.id) return { posts: [], pagination: {} };
        const token = await getToken();
        return postsAPI.getUserPosts(localUser.id, { page, limit }, token);
     },
     commonQueryOptions('posts')
   );

   const { data: commentsData, isLoading: isCommentsLoading, isError: isCommentsError, error: commentsError } = useQuery(
     ['user-comments', localUser?.id, page],
     async () => {
        if (!localUser?.id) return { comments: [], pagination: {} };
        const token = await getToken();
        return commentsAPI.getUserComments(localUser.id, { page, limit }, token);
     },
     commonQueryOptions('comments')
   );

   const { data: reviewsData, isLoading: isReviewsLoading, isError: isReviewsError, error: reviewsError } = useQuery(
     ['user-reviews', localUser?.id, page],
     async () => {
        if (!localUser?.id) return { reviews: [], pagination: {} };
        const token = await getToken();
        return reviewsAPI.getUserReviews(localUser.id, { page, limit }, token);
     },
     commonQueryOptions('reviews')
   );

   const { data: flaggedData, isLoading: isFlaggedLoading, isError: isFlaggedError, error: flaggedError } = useQuery(
     ['user-flagged', localUser?.id, page],
     async () => {
        if (!localUser?.id) return { flaggedContent: [], pagination: {} };
        const token = await getToken();
        if (!token) return { flaggedContent: [], pagination: {} };
        return moderationAPI.getFlaggedContent({ page, limit }, token);
     },
     commonQueryOptions('flagged')
   );


  // --- Event Handlers ---
  // *** NO CHANGE NEEDED HERE, handler is correct ***
  const handleTabChange = (value) => {
    console.log("Changing tab to:", value); // Add log for debugging
    setActiveTab(value);
    setPage(1);
  };

  // --- Loading / Error States ---
  const initialLoadComplete = isUserLoaded && isAuthLoaded && !isUserDataLoading;

  if (!initialLoadComplete) {
    return renderLoading();
  }

  if (isUserDataError || !localUser) {
    return (
        <Card className="bg-warning-50 text-warning-700 dark:bg-warning-900 dark:text-warning-300">
            <CardContent className="p-6">
                <h3 className="mb-2 font-semibold">Profile Not Available</h3>
                <p>Could not retrieve your profile details. {userDataError?.response?.data?.message || userDataError?.message}</p>
            </CardContent>
        </Card>
    );
  }

  // --- Pagination Renderer ---
  const renderPagination = (paginationData, contentLoading) => {
     const pagination = paginationData?.pagination;
     if (!pagination || pagination.pages <= 1) return null;
     return (
       <div className="mt-6 flex justify-center space-x-2">
         <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1 || contentLoading}>Previous</Button>
         <span className="flex items-center px-3 text-sm text-secondary-600 dark:text-secondary-400">Page {page} of {pagination.pages}</span>
         <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))} disabled={page === pagination.pages || contentLoading}>Next</Button>
       </div>
     );
  };

  // --- Component Render ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <Link to="/settings"><Button variant="outline"> {/* ... Settings Button ... */} Settings </Button></Link>
      </div>

      {/* User Info Card */}
      <Card>
         {/* ... User info display using localUser ... */}
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4 sm:flex-row sm:items-start sm:space-x-4 sm:space-y-0">
              <Avatar className="h-24 w-24">
                <AvatarImage src={clerkUser?.imageUrl} alt={localUser.username} />
                <AvatarFallback className="text-xl">{localUser.username?.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
              </Avatar>
              <div className="space-y-2 text-center sm:text-left">
                <h2 className="text-xl font-bold text-secondary-900 dark:text-secondary-100">{localUser.username}</h2>
                <p className="text-secondary-600 dark:text-secondary-400">{localUser.email}</p>
                <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                  <Badge variant={localUser.role === 'ADMIN' ? 'primary' : 'secondary'}>{localUser.role}</Badge>
                  <Badge variant="outline">Joined {formatDate(localUser.createdAt)}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
      </Card>

      {/* Tabs */}
      <div className="space-y-4">
         {/* *** Pass handleTabChange via prop drilling OR use Context OR direct onClick (Simplest Fix Here) *** */}
         {/* Using direct onClick for simplicity now */}
         <Tabs defaultValue="posts" /* Removed onValueChange={handleTabChange} */ >
            <TabsList>
                {/* Add onClick to each trigger */}
                <TabsTrigger value="posts" onClick={() => handleTabChange('posts')} active={activeTab === 'posts'}>
                    Posts ({localUser._count?.posts ?? 0})
                </TabsTrigger>
                <TabsTrigger value="comments" onClick={() => handleTabChange('comments')} active={activeTab === 'comments'}>
                    Comments ({localUser._count?.comments ?? 0})
                </TabsTrigger>
                <TabsTrigger value="reviews" onClick={() => handleTabChange('reviews')} active={activeTab === 'reviews'}>
                    Reviews ({localUser._count?.reviews ?? 0})
                </TabsTrigger>
                <TabsTrigger value="flagged" onClick={() => handleTabChange('flagged')} active={activeTab === 'flagged'}>
                    Flagged ({localUser._count?.flaggedContents ?? 0})
                </TabsTrigger>
            </TabsList>

            {/* Content Tabs - Ensure conditional className is present */}
            <TabsContent value="posts" className={activeTab !== 'posts' ? 'hidden' : ''}>
                {/* ... Posts Content ... */}
                 {isPostsLoading ? renderLoading() :
                  isPostsError ? renderError(postsError, 'posts') :
                  !postsData?.posts || postsData.posts.length === 0 ? ( <Card><CardContent className="p-6 text-center"><p className="mb-4 text-secondary-600 dark:text-secondary-400">You haven't created any posts yet.</p><Link to="/posts/create"><Button>Create Your First Post</Button></Link></CardContent></Card> ) : (
                    <div className="space-y-4">
                        {postsData.posts.map((post) => ( <Card key={post.id}><CardContent className="p-4"> {/* ... post item ... */} </CardContent></Card> ))}
                        {renderPagination(postsData, isPostsLoading)}
                    </div>
                 )}
            </TabsContent>

             <TabsContent value="comments" className={activeTab !== 'comments' ? 'hidden' : ''}>
                 {/* ... Comments Content ... */}
                  {isCommentsLoading ? renderLoading() :
                   isCommentsError ? renderError(commentsError, 'comments') :
                   !commentsData?.comments || commentsData.comments.length === 0 ? ( <Card><CardContent className="p-6 text-center"><p className="text-secondary-600 dark:text-secondary-400">You haven't made any comments yet.</p></CardContent></Card> ) : (
                       <div className="space-y-4">
                           {commentsData.comments.map((comment) => ( <Card key={comment.id}><CardContent className="p-4"> {/* ... comment item ... */} </CardContent></Card> ))}
                           {renderPagination(commentsData, isCommentsLoading)}
                       </div>
                   )}
             </TabsContent>

              <TabsContent value="reviews" className={activeTab !== 'reviews' ? 'hidden' : ''}>
                 {/* ... Reviews Content ... */}
                   {isReviewsLoading ? renderLoading() :
                    isReviewsError ? renderError(reviewsError, 'reviews') :
                    !reviewsData?.reviews || reviewsData.reviews.length === 0 ? ( <Card><CardContent className="p-6 text-center"><p className="text-secondary-600 dark:text-secondary-400">You haven't written any reviews yet.</p></CardContent></Card> ) : (
                        <div className="space-y-4">
                            {reviewsData.reviews.map((review) => ( <Card key={review.id}><CardContent className="p-4"> {/* ... review item ... */} </CardContent></Card> ))}
                            {renderPagination(reviewsData, isReviewsLoading)}
                        </div>
                    )}
              </TabsContent>

              <TabsContent value="flagged" className={activeTab !== 'flagged' ? 'hidden' : ''}>
                 {/* ... Flagged Content ... */}
                   {isFlaggedLoading ? renderLoading() :
                    isFlaggedError ? renderError(flaggedError, 'flagged content') :
                    !flaggedData?.flaggedContent || flaggedData.flaggedContent.length === 0 ? ( <Card><CardContent className="p-6 text-center"><p className="text-secondary-600 dark:text-secondary-400">You don't have any flagged content.</p></CardContent></Card> ) : (
                        <div className="space-y-4">
                            {flaggedData.flaggedContent.map((item) => ( <Card key={item.id}><CardContent className="p-4"> {/* ... flagged item ... */} </CardContent></Card> ))}
                            {renderPagination(flaggedData, isFlaggedLoading)}
                        </div>
                    )}
              </TabsContent>
         </Tabs>
      </div>
    </div>
  );
}

export default ProfilePage;