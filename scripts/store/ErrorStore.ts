import { useState, useEffect } from 'react';

type ErrorListener = (error: string | null) => void;
const listeners = new Set<ErrorListener>();

let currentError: string | null = null;

export const showError = (message: string) => {
  currentError = message;
  listeners.forEach((listener) => listener(currentError));
};

export const clearError = () => {
  currentError = null;
  listeners.forEach((listener) => listener(currentError));
};

export const useGlobalError = () => {
  const [error, setError] = useState<string | null>(currentError);

  useEffect(() => {
    const listener = (newError: string | null) => setError(newError);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { error, clearError };
};
