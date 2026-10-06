/**
 * Utility to resolve media/image URLs.
 * If URL is relative (e.g. /api/uploads/xyz.png), it ensures proper resolution
 * without triggering mixed-content (HTTP vs HTTPS) or CORS/CORP errors.
 */
export const getMediaUrl = (url) => {
    if (!url) return '';
    if (typeof url !== 'string') return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
        return url;
    }

    // If url starts with /api/, preserve relative path for dev proxy and reverse proxy setups
    if (url.startsWith('/api/')) {
        const apiBase = import.meta.env.VITE_API_URL || '';
        try {
            if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
                const apiUrl = new URL(apiBase);
                // When running with localhost or same-origin reverse proxy, relative URL avoids cross-origin/CORP blocks
                if (typeof window !== 'undefined') {
                    if (apiUrl.hostname === 'localhost' || apiUrl.hostname === '127.0.0.1' || apiUrl.origin === window.location.origin) {
                        return url;
                    }
                }
                const backendOrigin = `${apiUrl.protocol}//${apiUrl.host}`;
                return `${backendOrigin}${url}`;
            }
        } catch (e) {
            // fallback to relative
        }
        return url;
    }

    // Default return for local static assets like /svg logo/...
    return url;
};

