import React from 'react';
import { useQuery } from 'react-query';
import { commentsAPI } from '../../lib/api';
import CommentItem from './CommentItem';
import { Button } from '../ui/button';

const CommentList = ({ postId }) => {
  const [page, setPage] = React.useState(1);
  const limit = 10;

  const { data, isLoading, isError, error } = useQuery(
    ['comments', postId, page],
    () => commentsAPI.getComments({ postId, page, limit }),
    {
      keepPreviousData: true,
    }
  );

  if (isLoading) {
    return (
      <div className="my-8 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="my-8 rounded-md bg-danger-50 p-4 text-danger-700 dark:bg-danger-900 dark:text-danger-300">
        <p>Error loading comments: {error.message}</p>
      </div>
    );
  }

  if (data?.comments?.length === 0) {
    return (
      <div className="my-8 rounded-md bg-secondary-50 p-4 text-center text-secondary-700 dark:bg-secondary-900 dark:text-secondary-300">
        <p>No comments yet. Be the first to comment!</p>
      </div>
    );
  }

  return (
    <div className="my-8 space-y-8">
      {data.comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}

      {/* Pagination */}
      {data.pagination.pages > 1 && (
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
            Page {page} of {data.pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(p + 1, data.pagination.pages))}
            disabled={page === data.pagination.pages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default CommentList;