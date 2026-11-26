#!/bin/bash
# Idempotent wrapper around pg_ctl for the persistent PostgreSQL cluster.
#
# The sandbox rootfs is rolled back periodically, which can leave an orphaned
# postgres process behind while the systemd unit is gone. Every entry point
# therefore checks the actual server state first instead of assuming it.
set -u

PGDATA=/home/hatch/apps/lk21-api/pgdata
PGLOG=/home/hatch/apps/lk21-api/logs/postgresql.log
PGBIN=/usr/lib/postgresql/16/bin
OPTS='-c listen_addresses=127.0.0.1 -p 5432'

running() {
  "$PGBIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1
}

case "${1:-start}" in
  start)
    if running; then
      echo "postgres already running"
      exit 0
    fi
    exec "$PGBIN/pg_ctl" -D "$PGDATA" -l "$PGLOG" -o "$OPTS" -w start
    ;;
  stop)
    if running; then
      "$PGBIN/pg_ctl" -D "$PGDATA" -m fast -w stop
    else
      echo "postgres not running"
    fi
    ;;
  status)
    running && { echo "postgres running"; exit 0; }
    echo "postgres stopped"
    exit 1
    ;;
  restart)
    "$0" stop
    "$0" start
    ;;
  *)
    echo "usage: $0 {start|stop|status|restart}" >&2
    exit 2
    ;;
esac
