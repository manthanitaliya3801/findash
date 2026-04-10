export const environment = {
    production: false,
    get apiUrl(): string {
        // This getter is evaluated at runtime, not at module load time
        if (typeof window !== 'undefined') {
            // Get the current hostname (could be localhost, 192.168.x.x, etc.)
            const hostname = window.location.hostname;
            return `http://${hostname}:5001/api`;
        }
        // Fallback for SSR
        return 'http://localhost:5001/api';
    }
};
