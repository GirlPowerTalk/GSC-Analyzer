
import { useEffect, useRef } from 'react';

/**
 * Custom hook that creates a throttled version of a callback function
 * This helps improve performance by limiting the rate at which a function is called
 * 
 * @param callback Function to throttle
 * @param limit Limit in milliseconds
 */
export function useThrottleCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number
): (...args: Parameters<T>) => void {
  const lastRunRef = useRef<number>(0);
  const callbackRef = useRef<T>(callback);
  const timeoutRef = useRef<number | null>(null);
  const pendingArgsRef = useRef<Parameters<T> | null>(null);
  
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
  
  return function throttledCallback(...args: Parameters<T>) {
    const now = Date.now();
    
    // Always store the latest arguments
    pendingArgsRef.current = args;
    
    // Calculate time since last execution
    const timeSinceLastRun = now - lastRunRef.current;
    
    // If we haven't run recently, run now
    if (timeSinceLastRun >= limit) {
      lastRunRef.current = now;
      return callbackRef.current(...args);
    }
    
    // Otherwise, schedule to run after remaining time
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = window.setTimeout(() => {
      lastRunRef.current = Date.now();
      
      // Use the most recent arguments
      if (pendingArgsRef.current) {
        callbackRef.current(...pendingArgsRef.current);
        // Clear pending args after use
        pendingArgsRef.current = null;
      }
    }, limit - timeSinceLastRun);
  };
}
