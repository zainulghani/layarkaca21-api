#!/bin/bash
# Boot/restore script for the LK21 catalog API stack.
#
# Why this exists: in this sandbox the rootfs (/usr, /etc, apt packages) is
# rolled back to the base image periodically, while /home persists. So the
# PostgreSQL server, Redis, and the systemd unit files disappear between
# runs even though the source, build output and credentials in
# /home/hatch/apps/lk21-api survive untouched.
#
# This script is idempotent: it reinstalls what is missing, recreates the
# units, restores the database, and starts everything. Run it from a cron
# job (Hermes cron: "lk21-bootstrap") or by hand after a rootfs rollback.
set -uo pipefail

APP=/home/hatch/apps/lk21-api
UNITS=$APP/systemd
LOG=$APP/logs/bootstrap.log

mkdir -p "$APP/logs" /var/lib/redis
exec >>"$LOG" 2>&1
echo "=== bootstrap $(date -u +%FT%TZ) ==="

# --- packages (rootfs may have been rolled back) ---------------------------
if ! command -v redis-server >/dev/null 2>&1; then
  echo "[pkg] installing redis-server"
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq redis-server >/dev/null 2>&1
fi
if ! ls /usr/lib/postgresql/*/bin/postgres >/dev/null 2>&1; then
  echo "[pkg] installing postgresql-16"
  rm -f /etc/timezone
  printf 'Etc/UTC\n' >/etc/timezone
  DEBIAN_FRONTEND=noninteractive dpkg --configure -a >/dev/null 2>&1
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql-16 >/dev/null 2>&1
fi

# --- systemd units --------------------------------------------------------
for u in "$UNITS"/*.service; do
  name=$(basename "$u")
  if ! cmp -s "$u" "/etc/systemd/system/$name"; then
    cp "$u" "/etc/systemd/system/$name"
    echo "[unit] installed $name"
  fi
done
systemctl daemon-reload >/dev/null 2>&1

# --- postgres -------------------------------------------------------------
PGBIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | head -1)
if [ -n "$PGBIN" ]; then
  systemctl start postgresql@16-main >/dev/null 2>&1
  for _ in $(seq 1 20); do
    su postgres -c "psql -tAc 'select 1'" >/dev/null 2>&1 && break
    sleep 1
  done
  su postgres -c "psql -tAc \"select 1 from pg_roles where rolname='lk21'\"" 2>/dev/null | grep -q 1 || {
    echo "[pg] creating role lk21"
    su postgres -c "psql -tAc \"CREATE ROLE lk21 LOGIN PASSWORD 'lk21_dev_pw_2026'\"" >/dev/null 2>&1
  }
  su postgres -c "psql -tAc \"select 1 from pg_database where datname='lk21'\"" 2>/dev/null | grep -q 1 || {
    echo "[pg] creating database lk21"
    su postgres -c "psql -tAc \"CREATE DATABASE lk21 OWNER lk21\"" >/dev/null 2>&1
  }
  su postgres -c "psql -tAc \"ALTER USER lk21 WITH PASSWORD 'lk21_dev_pw_2026'\"" >/dev/null 2>&1
  su postgres -c "psql -tAc \"ALTER DATABASE lk21 OWNER TO lk21\"" >/dev/null 2>&1
fi

# --- redis ----------------------------------------------------------------
systemctl enable redis-lk21 >/dev/null 2>&1
systemctl restart redis-lk21 >/dev/null 2>&1
for _ in $(seq 1 15); do
  redis-cli ping 2>/dev/null | grep -q PONG && break
  sleep 1
done
echo "[redis] $(redis-cli ping 2>&1)"

# --- prisma schema --------------------------------------------------------
if [ -d "$APP/node_modules/.prisma/client" ]; then
  (cd "$APP" && PGPASSWORD=lk21_dev_pw_2026 npx prisma generate >/dev/null 2>&1)
  (cd "$APP" && PGPASSWORD=lk21_dev_pw_2026 npx prisma db push --skip-generate >/dev/null 2>&1)
  echo "[prisma] schema pushed"
fi

# --- app + tunnels --------------------------------------------------------
systemctl enable lk21-api >/dev/null 2>&1
systemctl restart lk21-api >/dev/null 2>&1
systemctl enable lk21-api-cf-tunnel >/dev/null 2>&1
systemctl restart lk21-api-cf-tunnel >/dev/null 2>&1
systemctl enable lk21-api-pinggy-tunnel >/dev/null 2>&1
systemctl restart lk21-api-pinggy-tunnel >/dev/null 2>&1

# --- health ---------------------------------------------------------------
sleep 6
echo "[health] local: $(curl -s -m 15 http://127.0.0.1:3110/api/health || echo FAIL)"
echo "[health] cf:    $(curl -s -o /dev/null -w '%{http_code}' -m 25 https://api.zainulghani.biz.id/api/health || echo FAIL)"
echo "=== done ==="
