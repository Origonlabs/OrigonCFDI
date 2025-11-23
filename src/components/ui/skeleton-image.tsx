'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type SkeletonImageProps = ImageProps & {
  skeletonClassName?: string;
  wrapperClassName?: string;
};

// Lightweight wrapper to show a pulse skeleton until the image finishes loading
export function SkeletonImage({
  className,
  skeletonClassName,
  wrapperClassName,
  onLoadingComplete,
  ...props
}: SkeletonImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span className={cn('relative inline-block', wrapperClassName)} style={{ width: props.width, height: props.height }}>
      {!loaded && (
        <span
          className={cn(
            'absolute inset-0 rounded-md bg-muted animate-pulse',
            skeletonClassName
          )}
          aria-hidden="true"
        />
      )}
      <Image
        {...props}
        onLoadingComplete={(result) => {
          setLoaded(true);
          onLoadingComplete?.(result);
        }}
        className={cn(loaded ? 'opacity-100' : 'opacity-0', 'transition-opacity', className)}
      />
    </span>
  );
}
