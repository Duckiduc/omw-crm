import { useCallback } from 'react';

interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
}

export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const { showToast = true, logError = true } = options;

  const handleError = useCallback((error: unknown, context?: string) => {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    if (logError) {
      console.error(`Error${context ? ` in ${context}` : ''}:`, error);
    }

    if (showToast) {
      // In a real implementation, this would use the toast context
      // For now, we'll just console.error
      console.error('Toast would show:', errorMessage);
    }

    return errorMessage;
  }, [showToast, logError]);

  const handleApiError = useCallback((response: { error?: string; status?: number }, context?: string) => {
    if (response.error) {
      handleError(new Error(response.error), context);
    }
  }, [handleError]);

  return { handleError, handleApiError };
}