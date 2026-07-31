import {useState, useEffect} from 'react';
import { router } from "expo-router";

type ErrorListener = (error: string | null) => void;
const listeners = new Set<ErrorListener>();

let currentError: string | null = null;

export const showError = (message: string) => {
    currentError = message;
    listeners.forEach((listener) => listener(currentError));
};

export const clearError = () => {
    let status = null;
    if (currentError)
        status = currentError === 'Unauthenticated.'
    currentError = null;
    listeners.forEach((listener) => listener(currentError));
    if (status) {
        router.replace({
            pathname: '/login',
            params: {
                logout: 1
            }
        })
        return;
    }
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

    return {error, clearError};
};
