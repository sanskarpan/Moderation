import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { commentsAPI, moderationAPI } from '../../lib/api';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';

const CreateCommentForm = ({ postId, onSuccess }) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
  
  const queryClient = useQueryClient();

  const createCommentMutation = useMutation(
    (data) => commentsAPI.createComment(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['comments', postId]);
        queryClient.invalidateQueries(['post', postId]);
        setContent('');
        setPreviewResult(null);
        if (onSuccess) onSuccess();
      },
      onError: (error) => {
        setError(error.response?.data?.message || 'Failed to create comment');
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
        setError(error.response?.data?.message || 'Failed to preview comment');
        setIsPreviewLoading(false);
      },
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    createCommentMutation.mutate({ content, postId });
  };

  const handlePreview = () => {
    setError('');
    setIsPreviewLoading(true);
    setPreviewResult(null);

    if (!content.trim()) {
      setError('Comment cannot be empty');
      setIsPreviewLoading(false);
      return;
    }

    previewMutation.mutate({ content });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="Write a comment..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[100px]"
      />

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
          disabled={isPreviewLoading || createCommentMutation.isLoading}
        >
          {isPreviewLoading ? 'Checking...' : 'Preview'}
        </Button>
        <Button
          type="submit"
          disabled={createCommentMutation.isLoading}
        >
          {createCommentMutation.isLoading ? 'Posting...' : 'Post Comment'}
        </Button>
      </div>
    </form>
  );
};

export default CreateCommentForm;