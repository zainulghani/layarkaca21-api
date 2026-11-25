"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./config/swagger");
const routes_1 = __importDefault(require("./routes"));
const error_1 = require("./middlewares/error");
const sanitizer_1 = require("./middlewares/sanitizer");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(sanitizer_1.sanitizeResponse);
app.get('/', (req, res) => {
    res.redirect('/api-docs');
});
const swaggerOptions = {
    customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui.min.css',
    customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui-bundle.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui-standalone-preset.js'
    ]
};
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec, swaggerOptions));
app.use('/api', routes_1.default);
app.use('/', routes_1.default);
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});
app.use(error_1.errorHandler);
exports.default = app;
