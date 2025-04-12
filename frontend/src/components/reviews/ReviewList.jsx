import React from 'react';
import { useQuery } from 'react-query';
import { reviewsAPI } from '../../lib/api';
import ReviewItem from './ReviewItem';
import { Button } from '../ui/button';

const ReviewList = ({ postId }) => {
  const [page, setPage] = React.useState(1);
  const limit = 10;

  const { data, isLoading, isError, error } = useQuery(
    ['reviews', postId, page],
    () => reviewsAPI.getReviews({ postId, page, limit }),
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
        <p>Error loading reviews: {error.message}</p>
      </div>
    );
  }

  if (data?.reviews?.length === 0) {
    return (
      <div className="my-8 rounded-md bg-secondary-50 p-4 text-center text-secondary-700 dark:bg-secondary-900 dark:text-secondary-300">
        <p>No reviews yet. Be the first to review!</p>
      </div>
    );
  }

  // Calculate average rating
  const averageRating = data.reviews.reduce((acc, review) => acc + review.rating, 0) / data.reviews.length;
  
  // Count ratings by star
  const ratingCounts = data.reviews.reduce((acc, review) => {
    acc[review.rating] = (acc[review.rating] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="my-8">
      <div className="mb-6 rounded-lg bg-secondary-50 p-4 dark:bg-secondary-900">
        <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
          <div className="flex items-center space-x-2">
            <span className="text-3xl font-bold text-secondary-900 dark:text-secondary-100">
              {averageRating.toFixed(1)}
            </span>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill={star <= Math.round(averageRating) ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={
                    star <= Math.round(averageRating)
                      ? 'text-warning-500'
                      : 'text-secondary-300 dark:text-secondary-600'
                  }
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              ({data.pagination.total} {data.pagination.total === 1 ? 'review' : 'reviews'})
            </span>
          </div>

          <div className="flex flex-col space-y-1">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center space-x-2">
                <span className="w-4 text-xs">{star}</span>
                <div className="h-2 w-32 overflow-hidden rounded-full bg-secondary-200 dark:bg-secondary-700">
                  <div
                    className="h-full bg-warning-500"
                    style={{
                      width: `${
                        ((ratingCounts[star] || 0) / data.pagination.total) * 100
                      }%`,
                    }}
                  ></div>
                </div>
                <span className="text-xs text-secondary-600 dark:text-secondary-400">
                  {ratingCounts[star] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {data.reviews.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
      </div>

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

export default ReviewList;