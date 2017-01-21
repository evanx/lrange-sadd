
module.exports = {
    required: {
        pattern: {
            description: 'the matching pattern for Redis scan',
            example: '*'
        },
        field: {
            description: 'name of the hashes field to print'
        },
        limit: {
            description: 'the maximum number of keys to print',
            note: 'zero means unlimited',
            default: 30
        },
        redisUrl: {
            description: 'the Redis URL',
            default: 'redis://localhost:6379'
        },
        format: {
            description: 'the output format',
            options: ['key', 'value', 'both', 'json'],
            default: 'key',
        },
        logging: {
            default: 'info',
            description: 'the logging level'
        },
    },
    development: {
        logging: 'debug',
        pattern: '*',
        format: 'verbose'
    },
};
