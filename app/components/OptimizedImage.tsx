'use client';

import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  onError?: () => void;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  fill = false,
  sizes,
  onError,
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError && onError) {
      onError();
    } else if (!hasError) {
      // Fallback to a placeholder or default image
      setImgSrc('/placeholder-image.png');
      setHasError(true);
    }
  };

  // For external images, we need to use unoptimized or configure domains
  const isExternal = imgSrc.startsWith('http://') || imgSrc.startsWith('https://');

  if (fill) {
    return (
      <Image
        src={imgSrc}
        alt={alt}
        fill
        className={className}
        priority={priority}
        sizes={sizes}
        onError={handleError}
        unoptimized={isExternal}
      />
    );
  }

  if (!width || !height) {
    // If dimensions not provided, use object-fit approach
    return (
      <div className={`relative ${className}`} style={{ width, height }}>
        <Image
          src={imgSrc}
          alt={alt}
          fill
          className="object-cover"
          priority={priority}
          sizes={sizes}
          onError={handleError}
          unoptimized={isExternal}
        />
      </div>
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      sizes={sizes}
      onError={handleError}
      unoptimized={isExternal}
      loading={priority ? undefined : 'lazy'}
    />
  );
}























