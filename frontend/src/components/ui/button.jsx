import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800",
        destructive: "bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800",
        outline: "border border-secondary-300 bg-transparent hover:bg-secondary-100 active:bg-secondary-200 dark:border-secondary-700 dark:hover:bg-secondary-800 dark:active:bg-secondary-700",
        secondary: "bg-secondary-200 text-secondary-900 hover:bg-secondary-300 active:bg-secondary-400 dark:bg-secondary-800 dark:text-secondary-100 dark:hover:bg-secondary-700 dark:active:bg-secondary-600",
        ghost: "bg-transparent hover:bg-secondary-100 active:bg-secondary-200 dark:hover:bg-secondary-800 dark:active:bg-secondary-700",
        link: "bg-transparent text-primary-600 hover:text-primary-700 active:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 underline-offset-4 hover:underline px-0",
        success: "bg-success-600 text-white hover:bg-success-700 active:bg-success-800",
        warning: "bg-warning-600 text-white hover:bg-warning-700 active:bg-warning-800",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10 p-0",
        "icon-sm": "h-8 w-8 p-0",
        "icon-lg": "h-12 w-12 p-0",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: false,
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, fullWidth, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };