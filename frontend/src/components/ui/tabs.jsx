import React from 'react';
import { cn } from '../../lib/utils';

const Tabs = React.forwardRef(({ className, onValueChange, defaultValue, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-2", className)}
    {...props}
  />
));
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-secondary-100 p-1 text-secondary-600 dark:bg-secondary-800 dark:text-secondary-400",
      className
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef(({ className, active, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-primary-700 data-[state=active]:shadow-sm dark:ring-offset-secondary-950 dark:data-[state=active]:bg-secondary-950 dark:data-[state=active]:text-primary-400",
      active && "bg-white text-primary-700 shadow-sm dark:bg-secondary-950 dark:text-primary-400",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef(({ className, children, value, ...props }, ref) => (
  <div
      ref={ref}
      // The className prop passed from PostDetailPage handles visibility
      className={cn(
          "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:ring-offset-secondary-950",
          className // This applies the 'hidden' class when needed
      )}
      role="tabpanel"
      aria-labelledby={`tab-${value}`} // Example of linking trigger/panel
      // Ensure children are always passed through
      {...props}
  >
      {children}
  </div>
));
TabsContent.displayName = "TabsContent";


export { Tabs, TabsList, TabsTrigger, TabsContent };