import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary-100 text-primary-700 hover:bg-primary-200 dark:bg-primary-800 dark:text-primary-100 dark:hover:bg-primary-700",
        secondary:
          "bg-secondary-100 text-secondary-700 hover:bg-secondary-200 dark:bg-secondary-800 dark:text-secondary-100 dark:hover:bg-secondary-700",
        success:
          "bg-success-100 text-success-700 hover:bg-success-200 dark:bg-success-800 dark:text-success-100 dark:hover:bg-success-700",
        warning:
          "bg-warning-100 text-warning-700 hover:bg-warning-200 dark:bg-warning-800 dark:text-warning-100 dark:hover:bg-warning-700",
        danger:
          "bg-danger-100 text-danger-700 hover:bg-danger-200 dark:bg-danger-800 dark:text-danger-100 dark:hover:bg-danger-700",
        outline:
          "border border-secondary-200 bg-transparent text-secondary-900 hover:bg-secondary-100 dark:border-secondary-700 dark:text-secondary-100 dark:hover:bg-secondary-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Badge = ({ className, variant, ...props }) => {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
};

export { Badge, badgeVariants };