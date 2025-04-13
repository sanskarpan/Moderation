import React, { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
// **** ADD CLERK HOOK ****
import { useAuth } from '@clerk/clerk-react';
// APIs
import { commentsAPI, moderationAPI } from '../../lib/api';
// UI Components
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';

const CreateCommentForm = ({ postId, onSuccess }) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);

  const queryClient = useQueryClient();
  // **** GET TOKEN FUNCTION ****
  const { getToken } = useAuth();

  // --- Mutation for Creating Comment ---
  const createCommentMutation = useMutation(
    // **** MAKE ASYNC AND GET TOKEN ****
    async (data) => {
      const token = await getToken();
      if (!token) throw new Error("Authentication required to create comment.");
      console.log("CreateCommentForm: Calling commentsAPI.createComment"); // Add log
      // Pass token
      return commentsAPI.createComment(data, token);
    },
    {
      onSuccess: () => {
        console.log("CreateCommentForm: createCommentMutation success"); // Add log
        queryClient.invalidateQueries(['comments', postId]);
        queryClient.invalidateQueries(['post', postId]);
        setContent('');
        setPreviewResult(null);
        setError(''); // Clear error on success
        if (onSuccess) onSuccess();
      },
      onError: (error) => {
        console.error("CreateCommentForm: createCommentMutation error:", error); // Add log
        setError(error.response?.data?.message || error.message || 'Failed to create comment');
      },
    }
  );

  // --- Mutation for Previewing Content ---
  const previewMutation = useMutation(
    // **** MAKE ASYNC AND GET TOKEN ****
    async (data) => {
      const token = await getToken();
      if (!token) throw new Error("Authentication required to preview content.");
      console.log("CreateCommentForm: Calling moderationAPI.checkContent"); // Add log
      // Pass token
      return moderationAPI.checkContent(data, token);
    },
    {
      onSuccess: (data) => {
        console.log("CreateCommentForm: previewMutation success"); // Add log
        setPreviewResult(data.moderationResult);
        setIsPreviewLoading(false);
        setError(''); // Clear error on success
      },
      onError: (error) => {
        console.error("CreateCommentForm: previewMutation error:", error); // Add log
        // Use error.message from the thrown error if available
        setError(error.message || error.response?.data?.message || 'Failed to preview comment');
        setIsPreviewLoading(false);
      },
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(''); // Clear error before submit attempt
    setPreviewResult(null); // Clear previous preview

    if (!content.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    // Trigger the mutation
    createCommentMutation.mutate({ content, postId });
  };

  const handlePreview = () => {
    setError(''); // Clear error before preview attempt
    setPreviewResult(null); // Clear previous preview

    if (!content.trim()) {
      setError('Comment cannot be empty');
      return; // Don't proceed if empty
    }

    setIsPreviewLoading(true);
    // Trigger the mutation
    previewMutation.mutate({ content });
  };

  // --- Render ---
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ... Textarea ... */}
      <Textarea
          placeholder="Write a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px]"
      />

      {/* Display Error */}
      {error && (
        <Alert variant="danger" className="my-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Display Preview Result */}
      {previewResult && (
         <div className="rounded-md border border-secondary-200 p-4 dark:border-secondary-800">
            {/* ... preview content display ... */}
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

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={handlePreview}
          disabled={isPreviewLoading || createCommentMutation.isLoading} // Also disable if posting
        >
          {isPreviewLoading ? 'Checking...' : 'Preview'}
        </Button>
        <Button
          type="submit"
          disabled={createCommentMutation.isLoading || isPreviewLoading} // Also disable if previewing
        >
          {createCommentMutation.isLoading ? 'Posting...' : 'Post Comment'}
        </Button>
      </div>
    </form>
  );
};

export default CreateCommentForm;