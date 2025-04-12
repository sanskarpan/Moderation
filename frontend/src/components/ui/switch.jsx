import React from 'react';
import { cn } from '../../lib/utils';

const Switch = React.forwardRef(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    const [isSwitched, setIsSwitched] = React.useState(checked || false);

    React.useEffect(() => {
      setIsSwitched(checked || false);
    }, [checked]);

    const handleToggle = () => {
      if (disabled) return;
      
      const newValue = !isSwitched;
      setIsSwitched(newValue);
      
      if (onCheckedChange) {
        onCheckedChange(newValue);
      }
    };

    return (
      <button
        type="button"
        role="switch"
        aria-checked={isSwitched}
        data-state={isSwitched ? 'checked' : 'unchecked'}
        className={cn(
          'inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          isSwitched
            ? 'bg-primary-600'
            : 'bg-secondary-300 dark:bg-secondary-700',
          className
        )}
        onClick={handleToggle}
        disabled={disabled}
        ref={ref}
        {...props}
      >
        <span
          data-state={isSwitched ? 'checked' : 'unchecked'}
          className={cn(
            'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
            isSwitched ? 'translate-x-5' : 'translate-x-1'
          )}
        />
      </button>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };