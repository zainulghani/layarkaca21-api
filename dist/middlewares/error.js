"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../config/logger");
const errorHandler = (err, req, res, next) => {
    logger_1.logger.error('Unhandled Exception', err?.message || err);
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({
        success: false,
        error: {
            message,
            status,
            ...(err.upstreamStatus ? { upstreamStatus: err.upstreamStatus } : {}),
        }
    });
};
exports.errorHandler = errorHandler;
