/**
 * FugueState API Client
 * Handles all backend communication with caching, offline support, and error handling
 * Phase 1.2 - API Integration Layer
 */

class APIClient {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
        this.cache = new Map();
        this.requestQueue = [];
        this.isOnline = navigator.onLine;
        this.defaultCacheTTL = 5 * 60 * 1000; // 5 minutes

        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());

        console.log('[APIClient] Initialized with baseURL:', baseURL);
    }

    // ====================================================================
    // AUTHENTICATION
    // ====================================================================

    /**
     * Get authentication token from localStorage or cookie
     */
    getAuthToken() {
        // Check localStorage first
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        if (token) return token;

        // Fallback to cookie
        const cookies = document.cookie.split(';');
        const authCookie = cookies.find(c => c.trim().startsWith('token='));
        if (authCookie) {
            return authCookie.split('=')[1];
        }

        return null;
    }

    /**
     * Get default headers including authentication
     */
    getHeaders(customHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...customHeaders
        };

        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    // ====================================================================
    // CACHING
    // ====================================================================

    /**
     * Cache key generator
     */
    getCacheKey(method, endpoint, params = {}) {
        const paramString = JSON.stringify(params);
        return `${method}:${endpoint}:${paramString}`;
    }

    /**
     * Get cached response if valid
     */
    getCachedResponse(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (!cached) return null;

        const now = Date.now();
        if (now - cached.timestamp > cached.ttl) {
            this.cache.delete(cacheKey);
            return null;
        }

        console.log('[APIClient] Cache hit:', cacheKey);
        return cached.data;
    }

    /**
     * Store response in cache
     */
    setCachedResponse(cacheKey, data, ttl = this.defaultCacheTTL) {
        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    /**
     * Clear all cache
     */
    clearCache() {
        this.cache.clear();
        console.log('[APIClient] Cache cleared');
    }

    // ====================================================================
    // OFFLINE SUPPORT
    // ====================================================================

    handleOnline() {
        console.log('[APIClient] Back online');
        this.isOnline = true;
        this.processRequestQueue();
    }

    handleOffline() {
        console.log('[APIClient] Offline mode');
        this.isOnline = false;
    }

    /**
     * Queue request for later when offline
     */
    queueRequest(method, endpoint, data, options) {
        this.requestQueue.push({
            method,
            endpoint,
            data,
            options,
            timestamp: Date.now()
        });
        console.log('[APIClient] Request queued:', method, endpoint);
    }

    /**
     * Process queued requests when back online
     */
    async processRequestQueue() {
        if (this.requestQueue.length === 0) return;

        console.log(`[APIClient] Processing ${this.requestQueue.length} queued requests`);

        const queue = [...this.requestQueue];
        this.requestQueue = [];

        for (const request of queue) {
            try {
                await this.request(
                    request.method,
                    request.endpoint,
                    request.data,
                    request.options
                );
                console.log('[APIClient] Queued request processed:', request.method, request.endpoint);
            } catch (error) {
                console.error('[APIClient] Failed to process queued request:', error);
                // Re-queue if failed
                this.requestQueue.push(request);
            }
        }
    }

    // ====================================================================
    // CORE REQUEST METHOD
    // ====================================================================

    /**
     * Generic request method with interceptors
     */
    async request(method, endpoint, data = null, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const cacheKey = this.getCacheKey(method, endpoint, data);

        // Check cache for GET requests
        if (method === 'GET' && !options.skipCache) {
            const cached = this.getCachedResponse(cacheKey);
            if (cached) return cached;
        }

        // Handle offline mode
        if (!this.isOnline && !options.skipQueue) {
            if (method !== 'GET') {
                this.queueRequest(method, endpoint, data, options);
                throw new Error('Offline: Request queued for later');
            }
            throw new Error('Offline: No cached data available');
        }

        const requestOptions = {
            method,
            headers: this.getHeaders(options.headers),
            ...options
        };

        if (data && method !== 'GET') {
            requestOptions.body = JSON.stringify(data);
        }

        try {
            console.log(`[APIClient] ${method} ${url}`, data);

            const response = await fetch(url, requestOptions);

            // Handle different response status codes
            if (response.status === 401) {
                console.error('[APIClient] Unauthorized - token may be expired');
                this.handleUnauthorized();
                throw new Error('Unauthorized');
            }

            if (response.status === 403) {
                throw new Error('Forbidden: You do not have permission');
            }

            if (response.status === 404) {
                throw new Error('Not found');
            }

            if (response.status >= 500) {
                throw new Error('Server error');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP Error: ${response.status}`);
            }

            // Parse response
            const contentType = response.headers.get('content-type');
            let responseData;

            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }

            // Cache GET requests
            if (method === 'GET' && !options.skipCache) {
                this.setCachedResponse(cacheKey, responseData, options.cacheTTL);
            }

            // Handle onboarding events from API responses
            if (responseData && responseData.onboardingEvent) {
                const eventType = responseData.onboardingEvent;
                document.dispatchEvent(new CustomEvent(eventType, { 
                    detail: responseData 
                }));
                console.log(`[APIClient] Onboarding event fired: ${eventType}`);
            }

            console.log(`[APIClient] ${method} ${url} - Success`);
            return responseData;

        } catch (error) {
            console.error(`[APIClient] ${method} ${url} - Error:`, error);
            throw error;
        }
    }

    /**
     * Handle 401 Unauthorized responses
     */
    handleUnauthorized() {
        // Clear token
        localStorage.removeItem('authToken');
        localStorage.removeItem('token');

        // Optionally redirect to login
        // window.location.href = '/login';

        // Or dispatch an event for the app to handle
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    // ====================================================================
    // HTTP METHOD SHORTCUTS
    // ====================================================================

    async get(endpoint, options = {}) {
        return this.request('GET', endpoint, null, options);
    }

    async post(endpoint, data, options = {}) {
        return this.request('POST', endpoint, data, options);
    }

    async put(endpoint, data, options = {}) {
        return this.request('PUT', endpoint, data, options);
    }

    async patch(endpoint, data, options = {}) {
        return this.request('PATCH', endpoint, data, options);
    }

    async delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, null, options);
    }

    // ====================================================================
    // FILE UPLOAD
    // ====================================================================

    /**
     * Upload file(s) with multipart/form-data
     */
    async uploadFile(endpoint, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);

        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });

        const url = `${this.baseURL}${endpoint}`;
        const token = this.getAuthToken();

        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[APIClient] Upload error:', error);
            throw error;
        }
    }

    // ====================================================================
    // OPTIMISTIC UPDATES
    // ====================================================================

    /**
     * Optimistic update: Update UI immediately, rollback on error
     */
    async optimisticUpdate(endpoint, data, updateFn, rollbackFn, options = {}) {
        // Apply optimistic update to UI
        updateFn(data);

        try {
            // Make actual API call
            const result = await this.put(endpoint, data, options);
            console.log('[APIClient] Optimistic update confirmed');
            return result;
        } catch (error) {
            // Rollback on error
            console.error('[APIClient] Optimistic update failed, rolling back:', error);
            if (rollbackFn) rollbackFn();
            throw error;
        }
    }
}

// ====================================================================
// DATA LAYER FACADE
// ====================================================================

/**
 * High-level data access layer for entries
 */
class EntryDataLayer {
    constructor(apiClient) {
        this.api = apiClient;
    }

    /**
     * Get all entries with optional filters
     */
    async getEntries(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `/entries?${queryParams}` : '/entries';
        return await this.api.get(endpoint);
    }

    /**
     * Get single entry by ID
     */
    async getEntry(entryId) {
        return await this.api.get(`/entries/${entryId}`);
    }

    /**
     * Create new entry
     */
    async createEntry(entryData) {
        return await this.api.post('/entries', entryData);
    }

    /**
     * Update entry
     */
    async updateEntry(entryId, entryData) {
        return await this.api.put(`/entries/${entryId}`, entryData);
    }

    /**
     * Delete entry
     */
    async deleteEntry(entryId) {
        return await this.api.delete(`/entries/${entryId}`);
    }

    /**
     * Upload media for entry
     */
    async uploadMedia(entryId, file) {
        return await this.api.uploadFile(`/entries/${entryId}/media`, file);
    }

    /**
     * Search entries
     */
    async searchEntries(query, filters = {}) {
        return await this.api.post('/entries/search', { query, ...filters });
    }
}

/**
 * High-level data access layer for Dameris AI
 */
class DamerisDataLayer {
    constructor(apiClient) {
        this.api = apiClient;
    }

    /**
     * Send chat message to Dameris
     */
    async chat(message, context = {}) {
        return await this.api.post('/dameris/chat', {
            message,
            context,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Generate insights for an entry
     */
    async generateInsights(entryId) {
        return await this.api.post(`/dameris/insights`, { entryId });
    }

    /**
     * Get pattern analysis
     */
    async analyzePatterns() {
        return await this.api.get('/dameris/patterns');
    }
}

/**
 * High-level data access layer for analytics
 */
class AnalyticsDataLayer {
    constructor(apiClient) {
        this.api = apiClient;
    }

    /**
     * Get user statistics
     */
    async getStats() {
        return await this.api.get('/analytics');
    }

    /**
     * Export data
     */
    async exportData(format = 'json') {
        return await this.api.post('/export', { format });
    }
}

// ====================================================================
// GLOBAL INSTANCE
// ====================================================================

// Create global API client instance
const apiClient = new APIClient('/api');

// Create data layer instances
const EntryAPI = new EntryDataLayer(apiClient);
const DamerisAPI = new DamerisDataLayer(apiClient);
const AnalyticsAPI = new AnalyticsDataLayer(apiClient);

// Export for module usage or global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APIClient, EntryAPI, DamerisAPI, AnalyticsAPI };
}

console.log('[APIClient] Ready - EntryAPI, DamerisAPI, AnalyticsAPI available globally');
