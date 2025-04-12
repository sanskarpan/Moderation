import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import { useAuth } from '@clerk/clerk-react'; // Import useAuth
import { postsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Alert, AlertDescription } from '../components/ui/alert';

const CreatePostPage = () => {
  const navigate = useNavigate();
  const { getToken } = useAuth(); // Get getToken function
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const createPostMutation = useMutation(
    async (postData) => { // Make the mutation function async
      const token = await getToken(); // Get token inside the mutation
      if (!token) throw new Error("Not authenticated");
      return postsAPI.createPost(postData, token); // Pass token to API call
    },
    {
      onSuccess: (data) => {
        // Navigate to the new post detail page
        if (data?.post?.id) {
          navigate(`/posts/${data.post.id}`);
        } else {
          // Fallback if ID is missing for some reason
          console.warn("Post created but ID missing in response, navigating to posts list.");
          navigate('/posts');
        }
      },
      onError: (error) => {
        console.error("Create post error:", error);
        setError(error.response?.data?.message || error.message || 'Failed to create post. Please try again.');
      },
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Basic client-side validation
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (title.length < 3) { // Example length check
       setError('Title must be at least 3 characters long');
       return;
    }
    if (!content.trim()) {
      setError('Content is required');
      return;
    }
     if (content.length < 10) { // Example length check
       setError('Content must be at least 10 characters long');
       return;
    }

    // Submit form data
    createPostMutation.mutate({ title, content });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Post</h1>
        <p className="text-secondary-600 dark:text-secondary-400">
          Share your thoughts, ideas, or questions with the community.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>New Post</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="danger">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter post title (min 3 chars)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={150} // Add max length if desired
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder="Write your post content here... (min 10 chars)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[200px]"
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)} // Go back
              disabled={createPostMutation.isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPostMutation.isLoading}
            >
              {createPostMutation.isLoading ? 'Posting...' : 'Create Post'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default CreatePostPage;