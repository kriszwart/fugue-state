'use client';

import React from 'react';
import LoadingSpinner from '../LoadingSpinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

/**
 * Reusable Button component with consistent styling and accessibility
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] focus:ring-indigo-500',
    secondary: 'bg-zinc-800 text-white hover:bg-zinc-700 focus:ring-zinc-500',
    ghost: 'bg-transparent text-zinc-400 hover:text-white hover:bg-white/5 focus:ring-zinc-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-lg min-h-[36px]',
    md: 'px-4 py-2 text-base rounded-lg min-h-[44px]',
    lg: 'px-6 py-3 text-lg rounded-xl min-h-[52px]',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading && (
        <span className="mr-2">
          <LoadingSpinner size="sm" />
        </span>
      )}
      {children}
    </button>
  );
}





















