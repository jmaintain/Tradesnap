/**
 * Error handling utilities for IndexedDB operations
 */

export enum IndexedDBErrorType {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  VERSION_ERROR = 'VERSION_ERROR',
  TRANSACTION_INACTIVE = 'TRANSACTION_INACTIVE',
  CONSTRAINT_ERROR = 'CONSTRAINT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface IndexedDBErrorDetails {
  type: IndexedDBErrorType;
  message: string;
  operation: string;
  originalError?: any;
  recoverable: boolean;
  recommendation: string;
}

/**
 * Parse an IndexedDB error and return structured information
 * @param error - The error thrown during an IndexedDB operation
 * @param operation - The operation that was being performed
 */
export function parseIndexedDBError(error: any, operation: string): IndexedDBErrorDetails {
  const errorName = error?.name || '';
  const errorMessage = error?.message || 'Unknown error occurred';
  
  // Determine the type of error
  let type = IndexedDBErrorType.UNKNOWN_ERROR;
  let recoverable = true;
  let recommendation = '';
  
  if (errorName === 'QuotaExceededError' || errorMessage.includes('quota')) {
    type = IndexedDBErrorType.QUOTA_EXCEEDED;
    recommendation = 'Please clear some browser storage or delete old trades to free up space.';
  } else if (errorName === 'SecurityError' || errorMessage.includes('access') || errorMessage.includes('permission')) {
    type = IndexedDBErrorType.ACCESS_DENIED;
    recommendation = 'Please check your browser permissions for storage access.';
    recoverable = false;
  } else if (errorName === 'VersionError' || errorMessage.includes('version')) {
    type = IndexedDBErrorType.VERSION_ERROR;
    recommendation = 'Please reload the application to update the database schema.';
  } else if (errorName === 'TransactionInactiveError' || errorMessage.includes('transaction')) {
    type = IndexedDBErrorType.TRANSACTION_INACTIVE;
    recommendation = 'Please try the operation again. If the problem persists, reload the application.';
  } else if (errorName === 'ConstraintError' || errorMessage.includes('constraint')) {
    type = IndexedDBErrorType.CONSTRAINT_ERROR;
    recommendation = 'The operation failed due to a constraint violation. Please check your input data.';
  } else if (errorMessage.includes('network') || errorMessage.includes('offline')) {
    type = IndexedDBErrorType.NETWORK_ERROR;
    recommendation = 'Please check your internet connection and try again.';
  }
  
  return {
    type,
    message: errorMessage,
    operation,
    originalError: error,
    recoverable,
    recommendation
  };
}

/**
 * Get a user-friendly message for an IndexedDB error
 */
export function getUserFriendlyErrorMessage(errorDetails: IndexedDBErrorDetails): string {
  const baseMessage = `Storage error while ${errorDetails.operation}.`;
  
  switch (errorDetails.type) {
    case IndexedDBErrorType.QUOTA_EXCEEDED:
      return `${baseMessage} You've reached your browser's storage limit. ${errorDetails.recommendation}`;
    
    case IndexedDBErrorType.ACCESS_DENIED:
      return `${baseMessage} TradeSnap doesn't have permission to access your browser's storage. ${errorDetails.recommendation}`;
    
    case IndexedDBErrorType.VERSION_ERROR:
      return `${baseMessage} There's a database version mismatch. ${errorDetails.recommendation}`;
    
    case IndexedDBErrorType.TRANSACTION_INACTIVE:
      return `${baseMessage} The storage operation couldn't be completed. ${errorDetails.recommendation}`;
    
    case IndexedDBErrorType.CONSTRAINT_ERROR:
      return `${baseMessage} ${errorDetails.recommendation}`;
    
    case IndexedDBErrorType.NETWORK_ERROR:
      return `${baseMessage} A network issue prevented the operation. ${errorDetails.recommendation}`;
    
    default:
      return `${baseMessage} ${errorDetails.message}. Please try again or reload the application.`;
  }
}

/**
 * Check if browser supports IndexedDB
 */
export function isIndexedDBSupported(): boolean {
  return window.indexedDB !== undefined && window.indexedDB !== null;
}

/**
 * Safely handle errors during IndexedDB operations
 * @param operation - The operation being performed
 * @param action - The function that performs the operation
 * @param errorCallback - Optional callback to handle specific errors
 */
export async function safeIndexedDBOperation<T>(
  operation: string,
  action: () => Promise<T>,
  errorCallback?: (error: IndexedDBErrorDetails) => void
): Promise<{ success: boolean; data?: T; error?: IndexedDBErrorDetails }> {
  try {
    const result = await action();
    return { success: true, data: result };
  } catch (error) {
    const errorDetails = parseIndexedDBError(error, operation);
    
    console.error(`IndexedDB operation failed (${operation}):`, errorDetails);
    
    if (errorCallback) {
      errorCallback(errorDetails);
    }
    
    return { success: false, error: errorDetails };
  }
}