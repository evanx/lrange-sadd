
const clc = require('cli-color');
require('../components/redisCliApp')(require('./config')).then(main);

async function main(context) {
    Object.assign(global, context);
    logger.level = config.logging;
    logger.debug('main', config);
    let count = 0;
    try {
        let cursor;
        while (true) {
            const [result] = await multiExecAsync(client, multi => {
                multi.scan(cursor || 0, 'match', config.pattern);
            });
            cursor = parseInt(result[0]);
            const keys = result[1];
            if (config.format === 'key') {
                keys.forEach(key => {
                    console.log(key);
                    count++;
                });
            } else {
                const types = await multiExecAsync(client, multi => {
                    keys.forEach(key => multi.type(key));
                });
                const hashesKeys = keys.filter((key, index) => types[index] === 'hash');
                if (hashesKeys.length) {
                    const hget = await multiExecAsync(client, multi => {
                        hashesKeys.forEach(key => multi.hget(key, config.field));
                    });
                    hashesKeys.map((key, index) => [key, hget[index]])
                    .filter(([key, value]) => value && value !== 'null')
                    .map(([key, value]) => {
                        count++;
                        if (config.format === 'both') {
                            console.log(`${clc.cyan(key)} ${value}`);
                        } else if (config.format === 'value') {
                            console.log(value);
                        } else if (config.format === 'json') {
                            console.log(JSON.stringify(JSON.parse(value), null, 2));
                        } else {
                            assert(false, 'format');
                        }
                    });
                }
            }
            if (config.limit > 0 && count > config.limit) {
                console.error(clc.yellow('Limit exceeded. Try: limit=0'));
                break;
            }
            if (cursor === 0) {
                break;
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        end();
    }
}

async function end() {
    client.quit();
}
