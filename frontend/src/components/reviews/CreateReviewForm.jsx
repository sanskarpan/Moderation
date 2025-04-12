import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { reviewsAPI, moderationAPI } from '../../lib/api';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';

const StarRating = ({ rating, setRating }) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="focus:outline-none"
          onClick={() => setRating(star)}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={
              star <= (hoverRating || rating) ? 'currentColor' : 'none'
            }
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={
              star <= (hoverRating || rating)
                ? 'text-warning-500'
                : 'text-secondary-300 dark:text-secondary-600'
            }
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  );
};

const CreateReviewForm = ({ postId, onSuccess }) => {
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(0);
  const [error, setError] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
  
  const queryClient = useQueryClient();

  const createReviewMutation = useMutation(
    (data) => reviewsAPI.createReview(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['reviews', postId]);
        queryClient.invalidateQueries(['post', postId]);
        setContent('');
        setRating(0);
        setPreviewResult(null);
        if (onSuccess) onSuccess();
      },
      onError: (error) => {
        setError(error.response?.data?.message || 'Failed to create review');
      },
    }
  );

  const previewMutation = useMutation(
    (data) => moderationAPI.checkContent(data),
    {
      onSuccess: (data) => {
        setPreviewResult(data.moderationResult);
        setIsPreviewLoading(false);
      },
      onError: (error) => {
        setError(error.response?.data?.message || 'Failed to preview review');
        setIsPreviewLoading(false);
      },
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError('Review content cannot be empty');
      return;
    }

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    createReviewMutation.mutate({ content, rating, postId });
  };

  const handlePreview = () => {
    setError('');
    setIsPreviewLoading(true);
    setPreviewResult(null);

    if (!content.trim()) {
      setError('Review content cannot be empty');
      setIsPreviewLoading(false);
      return;
    }

    previewMutation.mutate({ content });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-secondary-900 dark:text-secondary-100">
          Rating
        </label>
        <StarRating rating={rating} setRating={setRating} />
      </div>

      <div>
        <label
          htmlFor="review-content"
          className="mb-2 block text-sm font-medium text-secondary-900 dark:text-secondary-100"
        >
          Your Review
        </label>
        <Textarea
          id="review-content"
          placeholder="Write your review..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px]"
        />
      </div>

      {error && (
        <Alert variant="danger" className="my-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {previewResult && (
        <div className="rounded-md border border-secondary-200 p-4 dark:border-secondary-800">
          <h3 className="mb-2 font-medium">Content Preview:</h3>
          
          {previewResult.isToxic ? (
            <Alert variant="danger" className="mb-2">
              <AlertDescription>
                <strong>Warning:</strong> This content may be flagged for the following reason: {previewResult.toxicityReason}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="success" className="mb-2">
              <AlertDescription>Content looks good! No issues detected.</AlertDescription>
            </Alert>
          )}
          
          <div className="mt-2 text-xs">
            <p className="mb-1">
              <strong>Sentiment:</strong> {previewResult.sentiment.score.toFixed(2)} (
              {previewResult.sentiment.score > 0
                ? 'Positive'
                : previewResult.sentiment.score < 0
                ? 'Negative'
                : 'Neutral'}
              )
            </p>
            {previewResult.categories.length > 0 && (
              <div className="mb-1">
                <strong>Categories:</strong>
                <ul className="ml-4 mt-1">
                  {previewResult.categories.map((category, index) => (
                    <li key={index}>
                      {category.name} ({(category.confidence * 100).toFixed(0)}%)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={handlePreview}
          disabled={isPreviewLoading || createReviewMutation.isLoading}
        >
          {isPreviewLoading ? 'Checking...' : 'Preview'}
        </Button>
        <Button
          type="submit"
          disabled={createReviewMutation.isLoading}
        >
          {createReviewMutation.isLoading ? 'Posting...' : 'Post Review'}
        </Button>
      </div>
    </form>
  );
};

export default CreateReviewForm;