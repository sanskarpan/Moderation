import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes without conflicts
 * @param  {...any} inputs - Class names to merge
 * @returns {string} - Merged class names
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to a readable string
 * @param {string|Date|null|undefined} dateInput - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date or empty string if invalid
 */
export function formatDate(dateInput, options = {}) {
  if (!dateInput) return ''; // Return empty if date is null/undefined

  try {
    const date = new Date(dateInput);
    // Check if the date object is valid
    if (isNaN(date.getTime())) {
        console.warn("Invalid date passed to formatDate:", dateInput);
        return ''; // Return empty for invalid dates
    }

    // Use simpler default options that are widely supported
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      // Avoid dateStyle/timeStyle for now if causing issues
      // hour: 'numeric',
      // minute: 'numeric',
    };

    // Merge defaults with provided options
    const mergedOptions = { ...defaultOptions, ...options };

    return new Intl.DateTimeFormat('en-US', mergedOptions).format(date);
  } catch (error) {
      console.error("Error formatting date:", dateInput, error);
      return ''; // Return empty on formatting error
  }
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {string|Date|null|undefined} dateInput - Date to format
 * @returns {string} - Relative time string or empty string if invalid
 */
export function formatRelativeTime(dateInput) {
  if (!dateInput) return ''; // Return empty if date is null/undefined

   try {
       const now = new Date();
       const then = new Date(dateInput);

        // Check if the date object is valid
       if (isNaN(then.getTime())) {
           console.warn("Invalid date passed to formatRelativeTime:", dateInput);
           return ''; // Return empty for invalid dates
       }

       const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

       if (seconds < 5) { // Increased threshold for "Just now"
           return 'Just now';
       }

       const intervals = [ // Order from largest to smallest
           { label: 'year', seconds: 31536000 },
           { label: 'month', seconds: 2592000 },
           { label: 'week', seconds: 604800 },
           { label: 'day', seconds: 86400 },
           { label: 'hour', seconds: 3600 },
           { label: 'minute', seconds: 60 },
           { label: 'second', seconds: 1 }
       ];

       for (const interval of intervals) {
           const count = Math.floor(seconds / interval.seconds);
           if (count >= 1) {
               return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
           }
       }

       return 'Just now'; // Fallback

   } catch (error) {
       console.error("Error formatting relative time:", dateInput, error);
       return ''; // Return empty on error
   }
}


/**
 * Truncate text to a specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} - Truncated text
 */
export function truncateText(text, length = 100) {
  if (!text) return '';
  if (text.length <= length) return text;
  
  return `${text.substring(0, length)}...`;
}

/**
 * Get initials from a name
 * @param {string} name - Full name
 * @returns {string} - Initials
 */
export function getInitials(name) {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Get status color based on moderation status
 * @param {string} status - Moderation status
 * @returns {Object} - Tailwind CSS classes for text and background
 */
export function getStatusColor(status) {
  switch (status) {
    case 'PENDING':
      return { text: 'text-warning-600', bg: 'bg-warning-100' };
    case 'APPROVED':
      return { text: 'text-success-600', bg: 'bg-success-100' };
    case 'REJECTED':
      return { text: 'text-danger-600', bg: 'bg-danger-100' };
    default:
      return { text: 'text-secondary-600', bg: 'bg-secondary-100' };
  }
}

/**
 * Delay execution by a specified time
 * @param {number} ms - Time in milliseconds
 * @returns {Promise} - Promise that resolves after the delay
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random ID
 * @param {number} length - Length of the ID
 * @returns {string} - Random ID
 */
export function generateId(length = 8) {
  return Math.random().toString(36).substring(2, 2 + length);
}