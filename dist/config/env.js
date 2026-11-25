"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env.local') });
exports.config = {
    port: process.env.PORT || 3000,
    redisUrl: process.env.REDIS_URL || '',
    lk21BaseUrl: (process.env.LK21_BASE_URLS || process.env.LK21_BASE_URL || 'https://lk21official.fun').split(',')[0].trim().replace(/\/$/, ''),
    lk21BaseUrls: (process.env.LK21_BASE_URLS || process.env.LK21_BASE_URL || 'https://lk21official.fun,https://lk21official.cloud')
        .split(',')
        .map((s) => s.trim().replace(/\/$/, ''))
        .filter(Boolean),
    proxyUrl: process.env.LK21_PROXY_URL || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '',
    nodeEnv: process.env.NODE_ENV || 'development'
};
