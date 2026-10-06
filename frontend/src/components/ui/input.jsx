import React from 'react';

export const Input = React.forwardRef(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={`flex h-10 w-full rounded-md border border-telecom-muted bg-telecom-bg px-3 py-2 text-sm text-telecom-text ring-offset-telecom-bg file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-telecom-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-telecom-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow ${className}`}
            ref={ref}
            {...props}
        />
    );
});

Input.displayName = "Input";
