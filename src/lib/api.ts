// Centralized API configuration
const API_BASE = '';

// Helper function to ensure API calls work with Vite proxy
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE}${endpoint}`;
  console.log('API Call:', { url, options }); // Debug logging
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error('API Call Error:', { endpoint, error });
    throw error;
  }
};

// Specific API functions
export const generateThumbnail = async (filePath: string, type?: string, userEmail?: string) => {
  return apiCall('/api/admin/generate-thumbnail', {
    method: 'POST',
    headers: userEmail ? { 'x-user-email': userEmail } : undefined,
    body: JSON.stringify({ filePath, type }),
  });
};

export const scrapeCover = async (url: string, userEmail?: string) => {
  return apiCall('/api/admin/scrape-cover', {
    method: 'POST',
    headers: userEmail ? { 'x-user-email': userEmail } : undefined,
    body: JSON.stringify({ url }),
  });
};

export const updateBookThumbnail = async (bookId: string, coverImagePath: string) => {
  return apiCall(`/api/books/${bookId}`, {
    method: 'PATCH',
    body: JSON.stringify({ cover_image_path: coverImagePath }),
  });
};

export const fetchBooks = async () => {
  return apiCall('/api/books');
};

export const fetchAdminBooks = async () => {
  return apiCall('/api/admin/books');
};
