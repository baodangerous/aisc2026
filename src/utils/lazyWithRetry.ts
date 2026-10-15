import { lazy, ComponentType } from 'react';

/**
 * Wraps React.lazy with automatic single-retry on network or chunk-load failures.
 * Prevents transient network glitches from throwing unhandled chunk load errors.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T } | T>,
  maxRetries = 1
) {
  return lazy(async () => {
    let attempts = 0;
    while (attempts <= maxRetries) {
      try {
        const mod = await factory();
        return 'default' in mod ? mod : { default: mod };
      } catch (err) {
        attempts++;
        if (attempts > maxRetries) {
          console.error('[lazyWithRetry] Module chunk failed to load after retry:', err);
          throw err;
        }
        // Small backoff before retrying dynamic import
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }
    throw new Error('Module import failed');
  });
}
