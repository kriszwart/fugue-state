/**
 * LazyImage Component
 * Lazy loads images only when visible + blur-up effect
 * Saves bandwidth and improves page load speed
 */

'use client';

import { useState, useEffect, useRef, CSSProperties } from 'react';
import Image from 'next/image';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
  blurDataURL?: string;
  onLoad?: () => void;
  priority?: boolean;
}

export default function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  style,
  blurDataURL,
  onLoad,
  priority = false,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority) return; // Skip intersection observer if priority

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={style}
    >
      {isInView && (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={`transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => {
            setIsLoaded(true);
            onLoad?.();
          }}
          loading={priority ? 'eager' : 'lazy'}
          placeholder={blurDataURL ? 'blur' : 'empty'}
          blurDataURL={blurDataURL}
        />
      )}

      {/* Loading placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 animate-pulse" />
      )}
    </div>
  );
}

/**
 * Progressive image loader with blur-up effect
 */
export function ProgressiveImage({
  src,
  lowResSrc,
  alt,
  className = '',
}: {
  src: string;
  lowResSrc?: string;
  alt: string;
  className?: string;
}) {
  const [currentSrc, setCurrentSrc] = useState(lowResSrc || src);
  const [isHighResLoaded, setIsHighResLoaded] = useState(false);

  useEffect(() => {
    if (!lowResSrc) return;

    // Preload high-res image
    const img = new window.Image();
    img.src = src;
    img.onload = () => {
      setCurrentSrc(src);
      setIsHighResLoaded(true);
    };
  }, [src, lowResSrc]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={`transition-all duration-700 ${
        isHighResLoaded ? '' : 'blur-sm scale-110'
      } ${className}`}
      loading="lazy"
      decoding="async"
    />
  );
}

/**
 * Image with fallback
 */
export function ImageWithFallback({
  src,
  fallbackSrc = '/images/placeholder.png',
  alt,
  className = '',
}: {
  src: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
}) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        if (!hasError) {
          setImgSrc(fallbackSrc);
          setHasError(true);
        }
      }}
    />
  );
}

/**
 * Example usage:
 *
 * <LazyImage
 *   src="/images/memory.jpg"
 *   alt="Memory"
 *   width={400}
 *   height={300}
 *   className="rounded-lg"
 * />
 *
 * <ProgressiveImage
 *   lowResSrc="/images/memory-thumb.jpg"
 *   src="/images/memory.jpg"
 *   alt="Memory"
 * />
 */
