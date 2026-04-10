console.log("Starting Server...");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");

dotenv.config();
console.log("Dotenv loaded");
connectDB();
console.log("ConnectDB called");

const app = express();
const port = process.env.PORT || 5001;

// CORS configuration - allow all origins for development
const corsOptions = {
    origin: true, // Reflects the request origin, allowing all
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Security middleware — explicit policies for production hardening
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*"],
        }
    },
    crossOriginEmbedderPolicy: false,   // allow loading cross-origin fonts/styles
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' },
}));

// Compression middleware - compresses response bodies
app.use(compression());

// Rate limiting - prevents abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per windowMs (raised for admin preloading)
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use('/api/', limiter);

// Disable ETags
app.set('etag', false);

// Global No-Cache Middleware
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
});

// Body parser and CORS
app.use(express.json());


// Debug Route
app.get("/test", (req, res) => {
    res.send("Server is working");
});

app.get("/", (req, res) => {
    res.send("Money Management Backend Running");
});

// Mount Routes
console.log("Attempting to require authRoutes...");
const authRoutes = require('./routes/authRoutes');
const incomeRoutes = require('./routes/incomeRoutes');
const expenseRoutes = require('./routes/expenseRoutes');

console.log("AuthRoutes required successfully. Type:", typeof authRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/v1', incomeRoutes);
app.use('/api/v1', expenseRoutes);
app.use('/api/v1/category', require('./routes/categoryRoutes'));
app.use('/api/v1/dashboard', require('./routes/dashboard'));
app.use('/api/v1', require('./routes/savingRoutes'));
app.use('/api/v1/admin', require('./routes/adminRoutes'));

// New Feature Routes
app.use('/api/v1', require('./routes/extendedRoutes'));           // /recurring, /budget/suggestions, /reports/monthly-comparison
app.use('/api/v1/notifications', require('./routes/notificationRoutes'));
app.use('/api/v1/health-score', require('./routes/healthRoutes'));

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log("Routes mounted at /api/auth");
});
