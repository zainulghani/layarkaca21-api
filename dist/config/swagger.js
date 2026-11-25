"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
exports.swaggerSpec = {
    openapi: '3.0.0',
    info: {
        title: 'Movie & TV Catalog API',
        version: '1.0.0',
        description: 'API documentation for LK21 metadata catalog',
    },
    servers: [
        {
            url: '/api',
            description: 'Current Environment'
        }
    ],
    paths: {
        '/home': {
            get: {
                summary: 'Get all home page sliders and navigation links',
                tags: ['Home'],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean', example: true },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                filmUnggulan: { type: 'string', example: '/api/home/film-unggulan' },
                                                latestMovies: { type: 'string' },
                                                navigation: {
                                                    type: 'object',
                                                    properties: {
                                                        genre: { type: 'string' },
                                                        country: { type: 'string' }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/home/{slider}': {
            get: {
                summary: 'Get items for a specific home slider',
                tags: ['Home'],
                parameters: [
                    {
                        in: 'path',
                        name: 'slider',
                        required: true,
                        schema: {
                            type: 'string',
                            enum: ['film-unggulan', 'latest-movies', 'latest-series', 'series-update', 'top-month', 'recommendations', 'family', 'action', 'drakor', 'horror', 'romance', 'comedy', 'korea', 'thailand', 'india']
                        }
                    }
                ],
                responses: {
                    '200': { description: 'A list of movies or series' }
                }
            }
        },
        '/search': {
            get: {
                summary: 'Search for movies or series',
                tags: ['Search'],
                parameters: [
                    {
                        in: 'query',
                        name: 'q',
                        required: true,
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    '200': { description: 'Search results' }
                }
            }
        },
        '/movie/{id}': {
            get: {
                summary: 'Get movie details',
                tags: ['Movie'],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    '200': { description: 'Movie details' }
                }
            }
        },
        '/series/{id}': {
            get: {
                summary: 'Get series details',
                tags: ['Series'],
                parameters: [
                    {
                        in: 'path',
                        name: 'id',
                        required: true,
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    '200': { description: 'Series details' }
                }
            }
        },
        '/genre/{slug}/movies': {
            get: {
                summary: 'Get movies by genre',
                tags: ['Genre'],
                parameters: [
                    {
                        in: 'path',
                        name: 'slug',
                        required: true,
                        schema: { type: 'string' }
                    }
                ],
                responses: {
                    '200': { description: 'List of movies for the genre' }
                }
            }
        }
    }
};
