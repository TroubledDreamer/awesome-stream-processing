# inside warpstream container: show listening TCP sockets and the owning process
docker compose exec warpstream sh -c "ss -lntp || netstat -lntp"

# check the warpstream process & args
docker compose exec warpstream sh -c "ps aux | grep -i agent || true"

# inspect recent warpstream logs for binding/port errors
docker compose logs warpstream --tail 200

# from the producer container: test TCP connect to warpstream
docker compose exec warpstream-producer sh -c "apk add --no-cache netcat-openbsd >/dev/null 2>&1 || true; nc -vz warpstream 9092 || echo 'connect failed'"

# also test from host (optional)
telnet localhost 9092  # or: nc -vz 127.0.0.1 9092