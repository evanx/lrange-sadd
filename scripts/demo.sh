(
  set -u -e -x
  docker network create -d bridge test-hget-redis-network
  container=`docker run --network=test-hget-redis-network \
    --name test-redis-hget -d tutum/redis`
  redisPass=`docker logs $container | grep '^\s*redis-cli -a' |
    sed -e 's/^\s*redis-cli -a \(\w*\) .*$/\1/'`
  redisHost=`docker inspect $container |
    grep '"IPAddress":' | tail -1 | sed 's/.*"\([0-9\.]*\)",/\1/'`
  redisUrl="redis://:$redisPass@$redisHost:6379"
  redis-cli -a $redisPass -h $redisHost hset mytest:1001:h err some_error
  redis-cli -a $redisPass -h $redisHost hset mytest:1002:h err other_error
  redis-cli -a $redisPass -h $redisHost keys 'mytest:*:h'
  docker run --network=test-hget-redis-network -e redisUrl=$redisUrl \
    -e pattern=mytest:*:h -e field=err -e format=both evanxsummers/hget
  docker rm -f `docker ps -q -f name=test-redis-hget`
  docker network rm test-hget-redis-network
)
