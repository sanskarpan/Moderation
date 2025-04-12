import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '../../lib/utils';

const DialogContext = createContext({
  open: false,
  setOpen: () => {},
});

const Dialog = ({ children, defaultOpen = false, onOpenChange }) => {
  const [open, setOpen] = useState(defaultOpen);

  const handleOpenChange = useCallback(
    (value) => {
      setOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange]
  );

   // Render children only when open or if specifically designed to always be present
   // Modify this logic based on how DialogTrigger interacts if needed
  // const contextValue = { open, setOpen: handleOpenChange };
  // return <DialogContext.Provider value={contextValue}>{children}</DialogContext.Provider>;

    // Render portal conditionally based on 'open' state
   return (
     <DialogContext.Provider value={{ open, setOpen: handleOpenChange }}>
       {children}
       {open && <DialogPortalWrapper />} {/* Render portal content only when open */}
     </DialogContext.Provider>
   );
};

// Helper component to render portal content conditionally
const DialogPortalWrapper = () => {
  const { open } = useContext(DialogContext);
  // Find DialogContent and DialogOverlay within the children passed to Dialog
  // This part requires knowing the structure passed to <Dialog>.
  // A more robust way might involve context or slots.
  // Assuming DialogContent is the primary child we want in the portal:
  // This logic is simplified and might need adjustment based on actual usage.
  // It's generally better if DialogContent itself uses a Portal primitive.

  // Let's revert to the simpler structure where DialogContent handles its own rendering
  // and assume the z-index fix is the primary issue.
  // The original implementation structure was likely intended.

  // If DialogContent isn't rendering because it's not a direct child when needed,
  // that's a different issue related to component composition.
  // For now, focus on z-index within the existing structure.
  return null; // Let DialogContent handle rendering itself if open.
};


const DialogTrigger = ({ children, ...props }) => {
  const { setOpen } = useContext(DialogContext);

   // Ensure children is a single valid React element
   if (!React.isValidElement(children) || React.Children.count(children) !== 1) {
     console.error("DialogTrigger expects a single React element as its child.");
     return null;
   }


  return React.cloneElement(children, {
    ...props,
    onClick: (e) => {
       // Call the original onClick if it exists
       if (children.props.onClick) {
         children.props.onClick(e);
       }
      // Always open the dialog
      setOpen(true);
    },
  });
};


// Portal component remains conceptual here unless using a library like Radix UI
const DialogPortal = ({ children }) => {
    // In a real implementation, this would use ReactDOM.createPortal
    // For now, assume DialogContent handles its fixed positioning.
    const { open } = useContext(DialogContext);
    return open ? <>{children}</> : null;
};


const DialogOverlay = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useContext(DialogContext);

    // Only render if open
    if (!open) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "fixed inset-0 transition-opacity duration-300 ease-in-out",
           // Apply higher z-index and background/blur
          "z-[90] bg-black/60 backdrop-blur-sm", // INCREASED z-index, Adjusted background opacity
          className
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true" // Indicate it's decorative or for modality
        {...props}
      />
    );
  }
);
DialogOverlay.displayName = "DialogOverlay";

const DialogContent = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useContext(DialogContext);

    // Only render if open
    if (!open) return null;


    return (
      // Use Portal conceptually - overlay and content are siblings in the stack
      <>
        <DialogOverlay /> {/* Render overlay as sibling */}
        <div
          ref={ref}
          className={cn(
            "fixed left-[50%] top-[50%] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-secondary-200 bg-white p-6 shadow-xl duration-200 dark:border-secondary-800 dark:bg-secondary-950 sm:rounded-lg",
            "z-[100]", // INCREASED z-index, higher than overlay
            className
          )}
          role="dialog" // Role for the dialog itself
          aria-modal="true" // Indicate it's a modal
          // Add aria-labelledby or aria-describedby pointing to title/description if applicable
          onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing via overlay
          {...props}
        >
          {children}
          <button
            type="button" // Explicitly type as button
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary-100 data-[state=open]:text-secondary-500 dark:ring-offset-secondary-950 dark:focus:ring-primary-500 dark:data-[state=open]:bg-secondary-800 dark:data-[state=open]:text-secondary-400"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
             <span className="sr-only">Close</span> {/* Screen reader text */}
          </button>
        </div>
      </>
    );
  }
);
DialogContent.displayName = "DialogContent";


// Header, Footer, Title, Description remain the same as provided before
const DialogHeader = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2", // Added gap-2 for spacing
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef(
  ({ className, ...props }, ref) => (
    <h3 // Use h3 for semantic heading level within dialog
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  )
);
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef(
  ({ className, ...props }, ref) => (
    <div 
      ref={ref}
      className={cn("text-sm text-secondary-500 dark:text-secondary-400", className)}
      {...props}
    />
  )
);
DialogDescription.displayName = "DialogDescription";


export {
  Dialog,
  DialogTrigger,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};