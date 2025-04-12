import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { postsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import PostCard from '../components/posts/PostCard';
import { Input } from '../components/ui/input';

const PostsPage = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const limit = 9;

  const {
    data,
    isLoading,
    isError,
    error
  } = useQuery(
    ['posts', page, limit],
    () => postsAPI.getPosts({ page, limit }),
    {
      keepPreviousData: true,
    }
  );

  // Filter posts by search term (client-side filtering)
  const filteredPosts = data?.posts?.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    post.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
          <p className="text-secondary-600 dark:text-secondary-400">
            Browse and discover content from our community.
          </p>
        </div>
        
        <div className="flex flex-col gap-4 sm:flex-row">
          <Input
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
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
              New Post
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      ) : isError ? (
        <Card className="bg-danger-50 text-danger-700 dark:bg-danger-900 dark:text-danger-300">
          <CardContent className="p-6">
            <h3 className="mb-2 font-semibold">Error Loading Posts</h3>
            <p>{error?.message || 'Something went wrong. Please try again later.'}</p>
          </CardContent>
        </Card>
      ) : filteredPosts?.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="mb-2 font-semibold">No Posts Found</h3>
            {searchTerm ? (
              <p className="text-secondary-600 dark:text-secondary-400">
                No posts match your search criteria. Try a different search term.
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-secondary-600 dark:text-secondary-400">
                  No posts have been created yet. Be the first to share!
                </p>
                <Link to="/posts/create">
                  <Button>Create Your First Post</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {data.pagination.pages > 1 && (
            <div className="flex justify-center space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1 || isLoading}
              >
                Previous
              </Button>
              <span className="flex items-center px-3 text-sm text-secondary-600 dark:text-secondary-400">
                Page {page} of {data.pagination.pages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(p + 1, data.pagination.pages))}
                disabled={page === data.pagination.pages || isLoading}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PostsPage;