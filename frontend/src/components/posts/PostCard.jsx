import React from 'react';
import { Link } from 'react-router-dom';
import { formatDate, truncateText } from '../../lib/utils';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';

const PostCard = ({ post }) => {
  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="line-clamp-2 text-xl">
          <Link to={`/posts/${post.id}`} className="hover:text-primary-600 dark:hover:text-primary-400">
            {post.title}
          </Link>
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-4">
        <p className="line-clamp-3 text-secondary-600 dark:text-secondary-400">
          {truncateText(post.content, 150)}
        </p>
      </CardContent>

      <CardFooter className="flex flex-col items-start space-y-3 pt-0 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={post.user?.imageUrl} alt={post.user?.username} />
            <AvatarFallback className="text-xs">
              {post.user?.username?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{post.user?.username}</p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">
              {formatDate(post.createdAt)}
            </p>
          </div>
        </div>

        <Button asChild variant="link" size="sm" className="px-0 text-primary-600 dark:text-primary-400">
          <Link to={`/posts/${post.id}`}>Read more</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PostCard;
