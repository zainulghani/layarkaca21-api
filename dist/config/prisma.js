"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("./logger");
let prisma;
if (!process.env.DATABASE_URL) {
    logger_1.logger.warn('DATABASE_URL not set, Prisma disabled');
    exports.prisma = prisma = new Proxy({}, {
        get: () => {
            throw new Error('Database not configured (DATABASE_URL missing)');
        },
    });
}
else {
    exports.prisma = prisma = new client_1.PrismaClient();
}
