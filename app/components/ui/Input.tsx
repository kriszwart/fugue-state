'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

/**
 * Reusable Input component with consistent styling and accessibility
 */
export default function Input({
  label,
  error,
  helperText,
  fullWidth = false,
  className = '',
  id,
  required,
  ...props
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!error;

  const baseInputClasses = 'w-full px-4 py-3 rounded-lg bg-zinc-900/50 border text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 transition-colors';
  const errorClasses = hasError
    ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
    : 'border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/20';
  const widthClass = fullWidth ? 'w-full' : '';
  const minHeightClass = 'min-h-[44px]';

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm text-zinc-400 mb-2"
        >
          {label}
          {required && <span className="text-red-400 ml-1" aria-label="required">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={`${baseInputClasses} ${errorClasses} ${widthClass} ${minHeightClass} ${className}`}
        aria-invalid={hasError}
        aria-describedby={
          error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
        }
        required={required}
        {...props}
      />
      {error && (
        <p
          id={`${inputId}-error`}
          className="mt-1 text-sm text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}
      {helperText && !error && (
        <p
          id={`${inputId}-helper`}
          className="mt-1 text-sm text-zinc-500"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}























