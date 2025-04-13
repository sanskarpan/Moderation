# Database Schema

## Introduction

The application uses a PostgreSQL database, hosted on Supabase. The schema is managed using the Prisma ORM. This document outlines the data models and their relationships.

The schema definition can be found in `backend/prisma/schema.prisma`.

## Models

### `User`

Stores information about registered users, synced with Clerk authentication.

| Field             | Type            | Attributes                      | Description                                     |
| :---------------- | :-------------- | :------------------------------ | :---------------------------------------------- |
| `id`              | String          | `@id @default(uuid())`          | Unique identifier for the user (UUID)           |
| `clerkId`         | String          | `@unique`                       | User ID from the Clerk authentication service   |
| `email`           | String          | `@unique`                       | User's email address                            |
| `username`        | String          | `@unique`                       | User's chosen username                          |
| `role`            | `Role`          | `@default(USER)`                | User role (`USER` or `ADMIN`)                   |
| `emailNotification` | Boolean         | `@default(true)`                | Preference for receiving email notifications    |
| `createdAt`       | DateTime        | `@default(now())`               | Timestamp of user creation                      |
| `updatedAt`       | DateTime        | `@updatedAt`                    | Timestamp of last user update                   |
| `comments`        | `Comment[]`     |                                 | Relation to comments made by the user           |
| `flaggedContents` | `FlaggedContent[]`|                                 | Relation to content flagged related to the user |
| `posts`           | `Post[]`        |                                 | Relation to posts created by the user           |
| `reviews`         | `Review[]`      |                                 | Relation to reviews made by the user            |

### `Post`

Represents a blog post or main content item created by a user.

| Field       | Type        | Attributes                            | Description                                      |
| :---------- | :---------- | :------------------------------------ | :----------------------------------------------- |
| `id`        | String      | `@id @default(uuid())`                | Unique identifier for the post (UUID)            |
| `title`     | String      |                                       | Title of the post                                |
| `content`   | String      |                                       | Main content body of the post                    |
| `userId`    | String      |                                       | Foreign key linking to the `User` who created it |
| `createdAt` | DateTime    | `@default(now())`                     | Timestamp of post creation                       |
| `updatedAt` | DateTime    | `@updatedAt`                          | Timestamp of last post update                    |
| `comments`  | `Comment[]` |                                       | Relation to comments made on this post           |
| `user`      | `User`      | `@relation(..., onDelete: Cascade)`   | Relation to the authoring `User`                 |
| `reviews`   | `Review[]`  |                                       | Relation to reviews made on this post            |

### `Comment`

Represents a comment made by a user on a specific post.

| Field          | Type            | Attributes                            | Description                                          |
| :------------- | :-------------- | :------------------------------------ | :--------------------------------------------------- |
| `id`           | String          | `@id @default(uuid())`                | Unique identifier for the comment (UUID)             |
| `content`      | String          |                                       | The text content of the comment                      |
| `userId`       | String          |                                       | Foreign key linking to the `User` who commented    |
| `postId`       | String          |                                       | Foreign key linking to the `Post` being commented on |
| `createdAt`    | DateTime        | `@default(now())`                     | Timestamp of comment creation                        |
| `updatedAt`    | DateTime        | `@updatedAt`                          | Timestamp of last comment update                     |
| `post`         | `Post`          | `@relation(..., onDelete: Cascade)`   | Relation to the parent `Post`                        |
| `user`         | `User`          | `@relation(..., onDelete: Cascade)`   | Relation to the authoring `User`                     |
| `flaggedContent` | `FlaggedContent?`|                                     | Optional relation to a flag record for this comment  |

### `Review`

Represents a review (with rating) made by a user on a specific post.

| Field          | Type            | Attributes                            | Description                                         |
| :------------- | :-------------- | :------------------------------------ | :-------------------------------------------------- |
| `id`           | String          | `@id @default(uuid())`                | Unique identifier for the review (UUID)             |
| `content`      | String          |                                       | The text content of the review                      |
| `rating`       | Int             |                                       | Numerical rating (e.g., 1-5)                        |
| `userId`       | String          |                                       | Foreign key linking to the `User` who reviewed      |
| `postId`       | String          |                                       | Foreign key linking to the `Post` being reviewed    |
| `createdAt`    | DateTime        | `@default(now())`                     | Timestamp of review creation                        |
| `updatedAt`    | DateTime        | `@updatedAt`                          | Timestamp of last review update                     |
| `flaggedContent` | `FlaggedContent?`|                                     | Optional relation to a flag record for this review  |
| `post`         | `Post`          | `@relation(..., onDelete: Cascade)`   | Relation to the parent `Post`                       |
| `user`         | `User`          | `@relation(..., onDelete: Cascade)`   | Relation to the authoring `User`                    |

### `FlaggedContent`

Stores records of comments or reviews that have been flagged by the moderation system.

| Field       | Type               | Attributes                            | Description                                                                   |
| :---------- | :----------------- | :------------------------------------ | :---------------------------------------------------------------------------- |
| `id`        | String             | `@id @default(uuid())`                | Unique identifier for the flag record (UUID)                                  |
| `contentId` | String             |                                       | The ID of the original `Comment` or `Review` that was flagged                 |
| `type`      | `ContentType`      |                                       | Indicates whether the flagged content is a `COMMENT` or `REVIEW`              |
| `status`    | `ModerationStatus` | `@default(PENDING)`                   | Current moderation status (`PENDING`, `APPROVED`, `REJECTED`)                 |
| `reason`    | String             |                                       | Reason why the content was flagged (e.g., from AI analysis or manual report) |
| `userId`    | String             |                                       | Foreign key linking to the `User` whose content was flagged                 |
| `commentId` | String?            | `@unique`                             | Optional foreign key linking directly to the `Comment` (if type is `COMMENT`) |
| `reviewId`  | String?            | `@unique`                             | Optional foreign key linking directly to the `Review` (if type is `REVIEW`)   |
| `createdAt` | DateTime           | `@default(now())`                     | Timestamp when the content was flagged                                        |
| `updatedAt` | DateTime           | `@updatedAt`                          | Timestamp of last update to the flag record (e.g., status change)           |
| `comment`   | `Comment?`         | `@relation(..., onDelete: Cascade)`   | Optional relation to the flagged `Comment`                                    |
| `review`    | `Review?`          | `@relation(..., onDelete: Cascade)`   | Optional relation to the flagged `Review`                                     |
| `user`      | `User`             | `@relation(..., onDelete: Restrict)`  | Relation to the `User` associated with the flagged content                  |

## Relationships Summary

*   **User <-> Post:** One-to-Many (A user can have many posts, a post belongs to one user). Deleting a User cascades to delete their Posts.
*   **User <-> Comment:** One-to-Many (A user can have many comments, a comment belongs to one user). Deleting a User cascades to delete their Comments.
*   **User <-> Review:** One-to-Many (A user can have many reviews, a review belongs to one user). Deleting a User cascades to delete their Reviews.
*   **Post <-> Comment:** One-to-Many (A post can have many comments, a comment belongs to one post). Deleting a Post cascades to delete its Comments.
*   **Post <-> Review:** One-to-Many (A post can have many reviews, a review belongs to one post). Deleting a Post cascades to delete its Reviews.
*   **Comment <-> FlaggedContent:** One-to-One (optional) (A comment can have at most one flag record). Deleting a Comment cascades to delete its Flag record.
*   **Review <-> FlaggedContent:** One-to-One (optional) (A review can have at most one flag record). Deleting a Review cascades to delete its Flag record.
*   **User <-> FlaggedContent:** One-to-Many (A user can have multiple pieces of flagged content). Deleting a User is restricted if they have associated FlaggedContent (prevents orphaned flags).

## Enums

### `Role`
Defines user roles for authorization.
*   `USER`
*   `ADMIN`

### `ContentType`
Identifies the type of content being flagged.
*   `COMMENT`
*   `REVIEW`

### `ModerationStatus`
Tracks the status of flagged content during the review process.
*   `PENDING`
*   `APPROVED`
*   `REJECTED`