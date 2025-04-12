import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { moderationAPI } from '../../lib/api';
import { formatRelativeTime, cn } from '../../lib/utils';
import { Button } from './button';
import { Badge } from './badge';

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readNotifications, setReadNotifications] = useState(() => {
    const savedReadNotifications = localStorage.getItem('readNotifications');
    return savedReadNotifications ? JSON.parse(savedReadNotifications) : [];
  });

  const queryClient = useQueryClient();

  // Fetch flagged content as notifications
  const { data } = useQuery(
    ['user-flagged-notifications'],
    () => moderationAPI.getFlaggedContent({ limit: 10 }),
    {
      refetchInterval: 60000, // Refetch every minute
    }
  );

  const notifications = data?.flaggedContent || [];

  // Update unread count
  useEffect(() => {
    if (notifications.length > 0) {
      const unread = notifications.filter(
        (notification) => !readNotifications.includes(notification.id)
      ).length;
      setUnreadCount(unread);
    }
  }, [notifications, readNotifications]);

  // Save read notifications to localStorage
  useEffect(() => {
    localStorage.setItem('readNotifications', JSON.stringify(readNotifications));
  }, [readNotifications]);

  const markAllAsRead = () => {
    const newReadNotifications = [
      ...readNotifications,
      ...notifications.map((notification) => notification.id),
    ];
    setReadNotifications(newReadNotifications);
    setUnreadCount(0);
  };

  const markAsRead = (id) => {
    if (!readNotifications.includes(id)) {
      const newReadNotifications = [...readNotifications, id];
      setReadNotifications(newReadNotifications);
      setUnreadCount(Math.max(0, unreadCount - 1));
    }
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    setIsOpen(false);
  };

  // Format notification message based on type
  const getNotificationMessage = (notification) => {
    const contentType = notification.type === 'COMMENT' ? 'comment' : 'review';
    
    switch (notification.status) {
      case 'PENDING':
        return `Your ${contentType} has been flagged for moderation.`;
      case 'APPROVED':
        return `Your flagged ${contentType} has been approved.`;
      case 'REJECTED':
        return `Your flagged ${contentType} has been rejected.`;
      default:
        return `Your ${contentType} requires attention.`;
    }
  };

  // Get status badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">Pending</Badge>;
      case 'APPROVED':
        return <Badge variant="success">Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon-sm"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-danger-500 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div 
            className="absolute right-0 z-50 mt-2 w-80 rounded-md border border-secondary-200 bg-white shadow-lg dark:border-secondary-800 dark:bg-secondary-950"
          >
            <div className="flex items-center justify-between border-b border-secondary-200 p-3 dark:border-secondary-800">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  onClick={markAllAsRead}
                >
                  Mark all as read
                </Button>
              )}
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-secondary-500 dark:text-secondary-400">
                  <p>No notifications</p>
                </div>
              ) : (
                <ul>
                  {notifications.map((notification) => {
                    const isRead = readNotifications.includes(notification.id);
                    const contentType = notification.type === 'COMMENT' ? 'comment' : 'review';
                    const postId = notification.type === 'COMMENT' 
                      ? notification.comment?.postId 
                      : notification.review?.postId;
                    
                    return (
                      <li 
                        key={notification.id}
                        className={cn(
                          "border-b border-secondary-200 last:border-0 dark:border-secondary-800",
                          !isRead && "bg-primary-50 dark:bg-primary-900/20"
                        )}
                      >
                        <a 
                          href={`/posts/${postId}`}
                          className="block p-4 hover:bg-secondary-50 dark:hover:bg-secondary-900"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm text-secondary-900 dark:text-secondary-100">
                                {getNotificationMessage(notification)}
                              </p>
                              <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
                                {formatRelativeTime(notification.createdAt)}
                              </p>
                            </div>
                            {getStatusBadge(notification.status)}
                          </div>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="border-t border-secondary-200 p-3 text-center dark:border-secondary-800">
              <a 
                href="/settings"
                className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Notification settings
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;