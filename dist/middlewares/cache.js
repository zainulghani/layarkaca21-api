"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = void 0;
const redis_1 = require("../config/redis");
const logger_1 = require("../config/logger");
const cache = (durationInSeconds) => {
    return async (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }
        if (!redis_1.redis || redis_1.redis.status === 'disabled') {
            return next();
        }
        const key = `__express__${req.originalUrl || req.url}`;
        try {
            const cachedResponse = await redis_1.redis.get(key);
            if (cachedResponse) {
                res.setHeader('Content-Type', 'application/json');
                return res.send(cachedResponse);
            }
            else {
                res.sendResponse = res.send;
                res.send = ((body) => {
                    redis_1.redis.set(key, body, 'EX', durationInSeconds);
                    return res.sendResponse(body);
                });
                next();
            }
        }
        catch (error) {
            logger_1.logger.error('Cache middleware error', error);
            next();
        }
    };
};
exports.cache = cache;
