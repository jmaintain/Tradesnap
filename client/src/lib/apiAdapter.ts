/**
 * Type-safe adapter for making API requests to the backend
 * 
 * @param url The URL to make the request to
 * @param options The options to pass to fetch
 * @returns A promise that resolves to the response body of type T
 */
export const apiRequestAdapter = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  // For DELETE requests that don't return a response body
  if (response.status === 204) {
    return null as any;
  }
  
  const data = await response.json();
  return data as T;
};