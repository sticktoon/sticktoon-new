import { API_BASE_URL } from "../config/api";

const TOKEN_KEY = "authToken";
const REFRESH_TOKEN_KEY = "refreshToken";

// Store tokens
export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

// Get access token
export const getAccessToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

// Get refresh token
export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

// Clear tokens (logout)
export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// Refresh access token using refresh token
export const refreshAccessToken = async () => {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      throw new Error("Refresh failed");
    }

    const data = await response.json();
    
    // Store new tokens
    if (data.token) {
      setTokens(data.token, refreshToken);
    }

    return data.token;
  } catch (error) {
    clearTokens();
    // Redirect to login
    window.location.href = "/login";
    throw error;
  }
};

// Handle old users without refreshToken - auto-migrate them
const handleOldUserMigration = async () => {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  // Old user has access token but NO refresh token
  if (accessToken && !refreshToken) {
    console.log("Old user detected - attempting to refresh session...");
    try {
      // Try to use existing access token to verify user is still valid
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${accessToken}` },
      });

      if (response.ok) {
        // Access token still valid - generate new refresh token
        // by re-authenticating with a new endpoint
        const data = await response.json();
        
        // Create new refresh token using user ID
        const newRefreshToken = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: accessToken }), // Use access token as temporary refresh
        });

        if (newRefreshToken.ok) {
          const refreshData = await newRefreshToken.json();
          setTokens(refreshData.token, refreshData.token); // Store both
          return true;
        }
      }
    } catch (error) {
      console.log("Migration failed - redirecting to login");
      clearTokens();
      window.location.href = "/login?reason=session-refresh-required";
    }
  }
  return false;
};

// Main API wrapper with auto-refresh
export const apiCall = async (
  endpoint: string,
  options: RequestInit & { autoRetry?: boolean } = {}
) => {
  const { autoRetry = true, ...fetchOptions } = options;
  
  // Handle old users without refresh token
  const migrated = await handleOldUserMigration();
  
  // Add auth header
  const headers = new Headers(fetchOptions.headers || {});
  const token = getAccessToken();
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const requestOptions: RequestInit = {
    ...fetchOptions,
    headers,
  };

  let response = await fetch(`${API_BASE_URL}${endpoint}`, requestOptions);

  // If 401 and auto-retry enabled, try to refresh token
  if (response.status === 401 && autoRetry && token) {
    try {
      const newToken = await refreshAccessToken();
      
      // Retry request with new token
      headers.set("Authorization", `Bearer ${newToken}`);
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...requestOptions,
        headers,
      });
    } catch (error) {
      // Refresh failed, return original 401 response
      return response;
    }
  }

  return response;
};

// Helper for GET requests
export const get = (endpoint: string, options?: RequestInit) => {
  return apiCall(endpoint, { method: "GET", ...options });
};

// Helper for POST requests
export const post = (
  endpoint: string,
  body?: unknown,
  options?: RequestInit
) => {
  return apiCall(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });
};

// Helper for PUT requests
export const put = (
  endpoint: string,
  body?: unknown,
  options?: RequestInit
) => {
  return apiCall(endpoint, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });
};

// Helper for DELETE requests
export const del = (endpoint: string, options?: RequestInit) => {
  return apiCall(endpoint, { method: "DELETE", ...options });
};

// Export migration handler for optional use in App initialization
export const migrateOldUserSession = handleOldUserMigration;
