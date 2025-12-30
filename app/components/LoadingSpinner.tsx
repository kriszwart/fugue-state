'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export default function LoadingSpinner({
  size = 'md',
  message,
  fullScreen = false,
  className = '',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-4',
  };

  const content = (
    <div className={`text-center ${className}`} role="status" aria-live="polite" aria-label={message || 'Loading'}>
      <div
        className={`${sizeClasses[size]} border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto ${message ? 'mb-4' : ''}`}
        aria-hidden="true"
      ></div>
      {message && (
        <p className="text-zinc-400 text-sm" aria-label={message}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
        {content}
      </div>
    );
  }

  return content;
}























