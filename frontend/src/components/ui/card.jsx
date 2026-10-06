import React from 'react';

export const Card = ({ className, children, ...props }) => (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`} {...props}>
        {children}
    </div>
);

export const CardHeader = ({ className, children, ...props }) => (
    <div className={`p-6 pb-4 ${className}`} {...props}>
        {children}
    </div>
);

export const CardTitle = ({ className, children, ...props }) => (
    <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`} {...props}>
        {children}
    </h3>
);

export const CardDescription = ({ className, children, ...props }) => (
    <p className={`text-sm text-gray-500 mt-2 ${className}`} {...props}>
        {children}
    </p>
);

export const CardContent = ({ className, children, ...props }) => (
    <div className={`p-6 pt-0 ${className}`} {...props}>
        {children}
    </div>
);

export const CardFooter = ({ className, children, ...props }) => (
    <div className={`flex items-center p-6 pt-0 ${className}`} {...props}>
        {children}
    </div>
);
