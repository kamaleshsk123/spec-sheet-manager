"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const specs_1 = __importDefault(require("./routes/specs"));
const teams_1 = __importDefault(require("./routes/teams"));
const messagetypes_1 = __importDefault(require("./routes/messagetypes"));
const messageEnvelopes_1 = __importDefault(require("./routes/messageEnvelopes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:4200',
        /https:\/\/.*\.ngrok-free\.app/
    ],
    credentials: true
}));
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
dotenv_1.default.config();
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
app.use('/api/auth', auth_1.default);
app.use('/api/specs', specs_1.default);
app.use('/api/teams', teams_1.default);
app.use('/api', messagetypes_1.default);
app.use('/api/message-envelopes', messageEnvelopes_1.default);
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});
// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
exports.default = app;
//# sourceMappingURL=server.js.map