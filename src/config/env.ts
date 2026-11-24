import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

export const config = {
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
