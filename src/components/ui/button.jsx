import React from 'react';

export const Button = React.forwardRef(({ className, variant = "default", size = "default", asChild = false, children, ...props }, ref) => {
  const Comp = asChild ? children.type : "button";
  
  let baseClass = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ";
  
  if (variant === 'default') baseClass += "bg-primary text-primary-foreground shadow hover:bg-primary/90 ";
  if (variant === 'outline') baseClass += "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground ";
  if (variant === 'ghost') baseClass += "hover:bg-accent hover:text-accent-foreground ";

  if (size === 'default') baseClass += "h-9 px-4 py-2 ";
  if (size === 'sm') baseClass += "h-8 rounded-md px-3 text-xs ";
  if (size === 'icon') baseClass += "h-9 w-9 ";

  const childProps = asChild ? { ...children.props, ...props, className: `${baseClass} ${className || ''} ${children.props.className || ''}` } : props;

  if (asChild) {
    return React.cloneElement(children, { ...childProps, ref });
  }

  return (
    <Comp
      className={`${baseClass} ${className || ''}`}
      ref={ref}
      {...props}
    >
      {children}
    </Comp>
  )
})
Button.displayName = "Button"
