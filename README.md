# lrange-sadd

Containerized Redis CLI utility to range a list into a set.

<img src='https://raw.githubusercontent.com/evanx/lrange-sadd/master/docs/readme/images/options.png'>


## Use case

Sample data
```
redis-cli lpush mylist:l some_error
redis-cli lpush mylist:l other_error
```

We wish to `lrange` and `sadd` to a set as follows using `bash` and `redis-cli`
```
for item in `redis-cli lrange mylist:l 0 -1`
do
  redis-cli sadd myset:s $item
done
```

## Usage

## Config

See `app/config.js`
```javascript
    list: {
        description: 'the list to lrange from',
    },
    start: {
        description: 'the start index to lrange from',
    },
    stop: {
        description: 'the stop index to lrange to',
    },
    set: {
        description: 'the set to sadd into',
    },
    limit: {
        description: 'the maximum number of keys to add',
        note: 'zero means unlimited',
        default: 0
    },
    host: {
        description: 'the Redis host',
        default: 'localhost'
    }
    port: {
        description: 'the Redis port',
        default: 6379
    }
```

## Implementation

See `app/index.js`
```javascript
    const [lrange] = await multiExecAsync(client, multi => {
        multi.lrange(config.list, config.start, config.stop);
    });
```

## Docker

Having audited the `Dockerfile` and code, you can build and run as follows:

```shell
docker build -t hget https://github.com/evanx/lrange-sadd.git
```
where we tag the image as `hget`

```shell
docker run --network=host -e list=mylist -e set=myset lrange-sadd
```
where `--network-host` connects the container to your `localhost` bridge. The default `host` and `port` are valid in that case i.e. `localhost:6379` works in that case.


### Prebuilt image demo

```
evan@dijkstra:~$ docker run --network=test-redis-network \
  -e host=$host \
  -e pattern='authbot:*' -e field=role -e format=both \
  evanxsummers/lrange-sadd
```
where rather than using `--network=host` we have a Redis container with IP address `$host` on a network bridge called `test-hget-redis-network`

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
