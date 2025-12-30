'use client';

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

/**
 * Reusable Card component with consistent styling
 */
export default function Card({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps) {
  const baseClasses = 'rounded-xl bg-zinc-900/50 backdrop-blur-sm';
  
  const variantClasses = {
    default: 'border border-white/10',
    elevated: 'border border-white/10 shadow-lg shadow-black/20',
    outlined: 'border-2 border-white/20',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}























