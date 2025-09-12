
import { useEffect, useRef } from 'react';

/**
 * Custom hook that creates a debounced version of a callback function
 * This helps improve performance by limiting the rate at which a function is called
 * 
 * @param callback Function to debounce
 * @param delay Delay in milliseconds
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<number | null>(null);
  const callbackRef = useRef<T>(callback);
  const lastArgsRef = useRef<Parameters<T> | null>(null);
  
  // Update the callback ref whenever the callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return function debouncedCallback(...args: Parameters<T>) {
    // Store the latest arguments
    lastArgsRef.current = args;
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = window.setTimeout(() => {
      if (lastArgsRef.current) {
        callbackRef.current(...lastArgsRef.current);
      }
    }, delay);
  };
}
