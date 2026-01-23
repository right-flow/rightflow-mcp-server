/**
 * Sheet Component
 * Bottom sheet / drawer component for mobile
 * Built on top of Radix Dialog
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

/**
 * Sheet Overlay
 */
const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * Sheet Content
 */
interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: 'bottom' | 'top' | 'left' | 'right';
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = 'bottom', className, children, ...props }, ref) => {
  const variants = {
    bottom: cn(
      'fixed bottom-0 left-0 right-0 z-50',
      'max-h-[85vh] rounded-t-2xl',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
      'duration-300',
    ),
    top: cn(
      'fixed top-0 left-0 right-0 z-50',
      'max-h-[85vh] rounded-b-2xl',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
      'duration-300',
    ),
    left: cn(
      'fixed left-0 top-0 bottom-0 z-50',
      'w-3/4 max-w-sm rounded-r-2xl',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
      'duration-300',
    ),
    right: cn(
      'fixed right-0 top-0 bottom-0 z-50',
      'w-3/4 max-w-sm rounded-l-2xl',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
      'duration-300',
    ),
  };

  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          variants[side],
          'bg-white dark:bg-gray-900',
          'border border-gray-200 dark:border-gray-800',
          'shadow-xl',
          'flex flex-col',
          'focus:outline-none',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className={cn(
            'absolute top-4 left-4',
            'rounded-sm opacity-70',
            'ring-offset-white transition-opacity',
            'hover:opacity-100',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'disabled:pointer-events-none',
            'data-[state=open]:bg-gray-100 dark:data-[state=open]:bg-gray-800',
          )}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">סגור</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = DialogPrimitive.Content.displayName;

/**
 * Sheet Header
 */
const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-2',
      'px-6 py-4',
      'border-b border-gray-200 dark:border-gray-800',
      className,
    )}
    {...props}
  />
);
SheetHeader.displayName = 'SheetHeader';

/**
 * Sheet Footer
 */
const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      'px-6 py-4',
      'border-t border-gray-200 dark:border-gray-800',
      className,
    )}
    {...props}
  />
);
SheetFooter.displayName = 'SheetFooter';

/**
 * Sheet Title
 */
const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold text-gray-900 dark:text-gray-100',
      className,
    )}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

/**
 * Sheet Description
 */
const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-gray-500 dark:text-gray-400', className)}
    {...props}
  />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
