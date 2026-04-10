const DEFAULT_TTL_MS = 2 * 60 * 1000; // 2 minutes
const MAX_CACHE_ENTRIES = 1000;
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const responseCache = new Map();

const safeClone = (value) => {
    if (value === undefined || value === null) {
        return value;
    }

    return JSON.parse(JSON.stringify(value));
};

const getUserCacheKey = (req) => {
    if (!req.user) {
        return 'public';
    }

    return String(req.user._id || req.user.id || 'auth');
};

const buildCacheKey = (req) => {
    return `${req.method}:${req.originalUrl}:u:${getUserCacheKey(req)}`;
};

const clearExpiredEntries = () => {
    const now = Date.now();
    for (const [key, value] of responseCache.entries()) {
        if (value.expiresAt <= now) {
            responseCache.delete(key);
        }
    }
};

const evictOldestEntry = () => {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) {
        responseCache.delete(oldestKey);
    }
};

const cacheGet = (ttlMs = DEFAULT_TTL_MS) => {
    return (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }

        clearExpiredEntries();

        const cacheKey = buildCacheKey(req);
        const cached = responseCache.get(cacheKey);

        if (cached && cached.expiresAt > Date.now()) {
            res.set('X-Cache', 'HIT');
            return res.status(cached.statusCode).json(safeClone(cached.body));
        }

        res.set('X-Cache', 'MISS');
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                if (responseCache.size >= MAX_CACHE_ENTRIES) {
                    evictOldestEntry();
                }

                responseCache.set(cacheKey, {
                    body: safeClone(body),
                    statusCode: res.statusCode,
                    expiresAt: Date.now() + ttlMs
                });
            }

            return originalJson(body);
        };

        next();
    };
};

const clearApiCache = (req, _res, next) => {
    if (MUTATING_METHODS.has(req.method)) {
        responseCache.clear();
    }
    next();
};

const clearApiCacheStore = () => {
    responseCache.clear();
};

const cacheGet30s = () => cacheGet(DEFAULT_TTL_MS);

module.exports = {
    cacheGet,
    cacheGet30s,
    clearApiCache,
    clearApiCacheStore
};
