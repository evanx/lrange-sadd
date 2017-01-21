# lrange-sadd

Containerized utility to scan Redis keys and hget a specified hashes field.

<img src='https://raw.githubusercontent.com/evanx/lrange-sadd/master/docs/readme/images/options.png'>


## Use case

Sample data
```
redis-cli lpush mylist:l err some_error
redis-cli lpush mylist:l err other_error
```
where we might have the field `err` on some hashes keys.

We wish to perform a query on this specific field e.g. as follows using `bash` and `redis-cli`
```
for key in `redis-cli keys 'mytest:*:h'`
do
  echo $key `redis-cli hget $key err`
done
```
```
mylist:l some_error
mylist:l other_error
```

## Usage

Use `format=both` to print the key and the field value:
```
pattern='mytest*' format=both field=err npm start
```
where we have specified the `err` field for the query.
```
mylist:l other_error
mylist:l some_error
```
where the hash key and the value of its `err` field have been printed.

Otherwise `format=value` will print only the field value:
```
pattern='mytest*' format=value field=err npm start
```
```
other_error
some_error
```

## Config

See `app/config.js`
```javascript
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
```
where the default `redisUrl` is `'redis://localhost:6379'`

## Implementation

See `app/index.js`
```javascript
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
```

## Docker

Having audited the `Dockerfile` and code, you can build and run as follows:

```shell
docker build -t hget https://github.com/evanx/hget.git
```
where we tag the image as `hget`

```shell
docker run --network=host -e pattern='authbot:*' -e field=role -e format=both hget
```
where `--network-host` connects the container to your `localhost` bridge. The default `redisUrl` of `redis://localhost:6379` works in that case.


### Prebuilt image demo

```
evan@dijkstra:~$ docker run --network=redis \
  -e redisUrl=redis://$redisHost:6379 \
  -e pattern='authbot:*' -e field=role -e format=both \
  evanxsummers/hget
```
where rather than using `--network=host` we have a Redis container with IP address `$redisHost` on a network bridge called `redis`


### Test Redis instance

See `scripts/demo.sh`
```
docker network create -d bridge test-hget-redis-network
container=`docker run --network=test-hget-redis-network \
  --name test-redis-hget -d tutum/redis`
redisPass=`docker logs $container | grep '^\s*redis-cli -a' |
  sed -e 's/^\s*redis-cli -a \(\w*\) .*$/\1/'`
redisHost=`docker inspect $container |
  grep '"IPAddress":' | tail -1 | sed 's/.*"\([0-9\.]*\)",/\1/'`
redisUrl="redis://:$redisPass@$redisHost:6379"
redis-cli -a $redisPass -h $redisHost lpush mylist:l some_item
redis-cli -a $redisPass -h $redisHost lpush mylist:l other_item
redis-cli -a $redisPass -h $redisHost lrange mylist:l
docker run --network=test-hget-redis-network -e redisUrl=$redisUrl \
  -e list=mylist:l -e field=err -e format=both evanxsummers/hget
docker rm -f `docker ps -q -f name=test-redis-hget`
docker network rm test-hget-redis-network
```
where we:
- create an isolated bridge network `test-hget-redis-network` for the demo
- `docker run tutum/redis` for an isolated test Redis container
- from the `logs` of that instance to get its password into `redisPass`
- `docker inspect` that instance to get its IP number into `redisHost`
- build `redisUrl` from `redisPass` and `redisHost` and default port `6379`
- use `redis-cli` to create some test keys in the Redis container e.g. `mylist:l`
- `docker run evanxsummers/hget` to run our utility against that Redis container
- remove the test Redis container
- remove the test network


See `docs/demo.out`
```
docker run --network=test-hget-redis-network
-e redisUrl=redis://:OyWqclBrXP7QNw1cqwlP8hgwNxgz36AV@172.20.0.2:6379
-e format=both -e list=mylist:l -e field=err evanxsummers/hget
```
where we have specified `format=both` to print hashes key and field value for `field=err`
```
mylist:l other_error
mylist:l some_error
```

https://twitter.com/@evanxsummers
