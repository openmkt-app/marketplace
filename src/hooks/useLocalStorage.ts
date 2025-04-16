// src/hooks/useLocalStorage.ts
'use client';

import { useState, useEffect, useRef } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const isInitialized = useRef(false);

  // Initialize the value from localStorage if it exists, otherwise use initialValue
  useEffect(() => {
    if (typeof window === 'undefined' || isInitialized.current) {
      return;
    }
    
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse and set stored value or use initialValue if storage is empty
      if (item) {
        setStoredValue(JSON.parse(item));
      }
      
      // Mark as initialized to prevent re-running
      isInitialized.current = true;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to local storage, but only if we're in the browser
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}