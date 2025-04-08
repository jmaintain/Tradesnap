/**
 * Utility functions for date handling and formatting throughout the application
 * This provides consistent date handling to avoid timezone issues
 */

/**
 * Converts a date to a simple YYYY-MM-DD string format
 * This is used as a consistent key format for date-related operations
 */
export const getDateKey = (date: Date | string): string => {
  if (typeof date === 'string') {
    // If it's already a string, try to normalize it
    if (date.includes('T')) {
      // ISO format like "2025-04-03T00:00:00.000Z"
      // Just take the date part
      return date.split('T')[0];
    } else if (date.includes('-') && date.split('-').length === 3) {
      // Already in YYYY-MM-DD format
      return date;
    }
    
    // For other string formats, parse to date first
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const day = String(parsedDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // If parsing failed, return today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // If it's a Date object
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse a date string ensuring it maintains the proper day
 * regardless of timezone differences
 */
export const parseDatePreservingDay = (dateString: string): Date => {
  if (!dateString) return new Date();
  
  // If the string is a full ISO string (with T)
  if (dateString.includes('T')) {
    const dateOnly = dateString.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    // Create at noon UTC to avoid timezone boundary issues
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }
  
  // If it's already in YYYY-MM-DD format
  if (dateString.includes('-') && dateString.split('-').length === 3) {
    const [year, month, day] = dateString.split('-').map(Number);
    // Create at noon UTC to avoid timezone boundary issues
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  }
  
  // Fallback - but this might not preserve the day correctly
  return new Date(dateString);
};

/**
 * Format a date for display in a consistent way
 */
export const formatDisplayDate = (date: Date | string): string => {
  const dateKey = getDateKey(date);
  return dateKey;
};