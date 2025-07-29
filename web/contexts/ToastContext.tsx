'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastData, ToastType } from '@/components/Toast/Toast';
import ToastContainer from '@/components/Toast/ToastContainer';

interface ToastOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, options?: ToastOptions) => void;
  showSuccess: (title: string, message?: string, options?: ToastOptions) => void;
  showError: (title: string, message?: string, options?: ToastOptions) => void;
  showWarning: (title: string, message?: string, options?: ToastOptions) => void;
  showInfo: (title: string, message?: string, options?: ToastOptions) => void;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Default durations for different toast types
const DEFAULT_DURATIONS = {
  success: 4000,  // 4 seconds
  error: 6000,    // 6 seconds (errors need more time to read)
  warning: 5000,  // 5 seconds
  info: 4000      // 4 seconds
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((
    type: ToastType,
    title: string,
    message?: string,
    options?: ToastOptions
  ) => {
    const id = `${Date.now()}-${Math.random()}`;
    const duration = options?.duration ?? DEFAULT_DURATIONS[type];
    
    const newToast: ToastData = {
      id,
      type,
      title,
      message,
      duration,
      action: options?.action
    };

    setToasts((prev) => [...prev, newToast]);
  }, []);

  const showSuccess = useCallback((title: string, message?: string, options?: ToastOptions) => {
    showToast('success', title, message, options);
  }, [showToast]);

  const showError = useCallback((title: string, message?: string, options?: ToastOptions) => {
    showToast('error', title, message, options);
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string, options?: ToastOptions) => {
    showToast('warning', title, message, options);
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string, options?: ToastOptions) => {
    showToast('info', title, message, options);
  }, [showToast]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        dismissToast,
        dismissAll
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Convenience function for handling API errors
export function useApiErrorHandler() {
  const { showError } = useToast();

  return useCallback((error: any, customMessage?: string) => {
    console.error('API Error:', error);
    
    let title = customMessage || 'An error occurred';
    let message = 'Please try again later';
    
    if (error.response?.data?.message) {
      message = error.response.data.message;
    } else if (error.message) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }
    
    // Check for specific error types
    if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
      title = 'Connection Error';
      message = 'Please check your internet connection';
    } else if (error.status === 401) {
      title = 'Authentication Required';
      message = 'Please log in to continue';
    } else if (error.status === 403) {
      title = 'Access Denied';
      message = 'You don\'t have permission to perform this action';
    } else if (error.status === 429) {
      title = 'Too Many Requests';
      message = 'Please slow down and try again later';
    }
    
    showError(title, message, {
      action: error.retry ? {
        label: 'Retry',
        onClick: error.retry
      } : undefined
    });
  }, [showError]);
}