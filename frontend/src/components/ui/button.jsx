import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({ className, variant = 'default', size = 'default', isLoading, children, ...props }) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-telecom-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-telecom-bg cursor-pointer";

    const variants = {
        default: "bg-telecom-primary text-white shadow hover:bg-telecom-secondary",
        destructive: "bg-telecom-error text-white shadow-sm hover:opacity-90",
        outline: "border border-telecom-muted bg-transparent hover:bg-telecom-cardBg text-telecom-text",
        secondary: "bg-telecom-secondary text-white shadow-sm hover:opacity-90",
        ghost: "hover:bg-telecom-cardBg text-telecom-text hover:text-telecom-primary",
        link: "underline-offset-4 hover:underline text-telecom-primary",
    };

    const sizes = {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10",
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className || ''}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </button>
    );
};
