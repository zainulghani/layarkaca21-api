"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
const logger_1 = require("./logger");
const createNoopRedis = () => ({
    status: 'disabled',
    get: async () => null,
    set: async () => 'OK',
    on: () => { },
});
let redisInstance;
if (env_1.config.redisUrl) {
    const client = new ioredis_1.default(env_1.config.redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        retryStrategy: () => null,
    });
    client.on('connect', () => {
        logger_1.logger.info('Redis connected successfully');
    });
    client.on('error', (err) => {
        logger_1.logger.error('Redis connection error', err);
    });
    redisInstance = client;
}
else {
    logger_1.logger.warn('REDIS_URL not set, running without cache');
    redisInstance = createNoopRedis();
}
exports.redis = redisInstance;
