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

# Keep the log bounded: the cron runs every 30 minutes for the life of the
# deployment, so the file would otherwise grow without limit.
if [ -f "$LOG" ] && [ "$(stat -c %s "$LOG")" -gt 1048576 ]; then
  tail -n 500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi

# Tee everything into the log file *and* stdout, so a cron run shows its
# progress in the scheduler output instead of silently redirecting it away.
exec > >(tee -a "$LOG") 2>&1
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
# The data directory lives under /home on purpose: the sandbox rootfs is
# rolled back periodically and takes /var/lib/postgresql with it, which wipes
# every row of the cast-credit index. A cluster on /home survives.
PGDATA=/home/hatch/apps/lk21-api/pgdata
PGBIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | head -1)

if [ -n "$PGBIN" ]; then
  if [ ! -s "$PGDATA/PG_VERSION" ]; then
    echo "[pg] initialising cluster in $PGDATA"
    mkdir -p "$PGDATA" "$APP/logs"
    # The postgres user must be able to traverse the path down to PGDATA.
    # /home/hatch is mode drwxrwx--- root:nogroup, and supplementary groups do
    # not survive `su`, so grant traverse on "other" instead.
    chmod o+x /home/hatch /home/hatch/apps "$APP" 2>/dev/null
    rm -rf "$PGDATA"
    mkdir -p "$PGDATA"
    chown -R postgres:postgres "$PGDATA"
    chmod 700 "$PGDATA"
    su postgres -c "$PGBIN/initdb -D $PGDATA -U postgres --auth-local=trust --auth-host=md5 -E UTF8" >/dev/null 2>&1
    # Listen on the loopback only; the API reaches it through 127.0.0.1:5432.
    cat >>"$PGDATA/postgresql.conf" <<'CONF'

# --- lk21-api overrides ---
listen_addresses = '127.0.0.1'
port = 5432
unix_socket_directories = '/var/run/postgresql'
CONF
    cat >"$PGDATA/pg_hba.conf" <<'HBA'
local   all             all                                     trust
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
HBA
    chown postgres:postgres "$PGDATA/postgresql.conf" "$PGDATA/pg_hba.conf"
  fi

  mkdir -p /var/run/postgresql && chown postgres:postgres /var/run/postgresql

  systemctl enable lk21-postgres >/dev/null 2>&1
  if ! systemctl is-active --quiet lk21-postgres; then
    systemctl restart lk21-postgres >/dev/null 2>&1
    echo "[pg] started lk21-postgres"
  fi

  for _ in $(seq 1 30); do
    su postgres -c "psql -h /var/run/postgresql -p 5432 -tAc 'select 1'" >/dev/null 2>&1 && break
    sleep 1
  done

  su postgres -c "psql -h /var/run/postgresql -p 5432 -tAc \"select 1 from pg_roles where rolname='lk21'\"" 2>/dev/null | grep -q 1 || {
    echo "[pg] creating role lk21"
    su postgres -c "psql -h /var/run/postgresql -p 5432 -tAc \"CREATE ROLE lk21 LOGIN PASSWORD 'lk21_dev_pw_2026'\"" >/dev/null 2>&1
  }
  su postgres -c "psql -h /var/run/postgresql -p 5432 -tAc \"select 1 from pg_database where datname='lk21'\"" 2>/dev/null | grep -q 1 || {
    echo "[pg] creating database lk21"
    su postgres -c "psql -h /var/run/postgresql -p 5432 -tAc \"CREATE DATABASE lk21 OWNER lk21\"" >/dev/null 2>&1
  }
  su postgres -c "psql -h /var/run/postgresql -p 5432 -tAc \"ALTER USER lk21 WITH PASSWORD 'lk21_dev_pw_2026'\"" >/dev/null 2>&1
  su postgres -c "psql -h /var/run/postgresql -p 5432 -tAc \"ALTER DATABASE lk21 OWNER TO lk21\"" >/dev/null 2>&1
fi

# --- redis ----------------------------------------------------------------
systemctl enable redis-lk21 >/dev/null 2>&1
if ! systemctl is-active --quiet redis-lk21; then
  systemctl restart redis-lk21 >/dev/null 2>&1
  echo "[redis] started redis-lk21"
fi
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
# Only (re)start what is not already running. The cron fires every 30 minutes;
# unconditionally restarting the API would reset its uptime and throw away the
# warm Redis cache on every tick.
ensure_service() {
  local unit=$1
  systemctl enable "$unit" >/dev/null 2>&1
  if systemctl is-active --quiet "$unit"; then
    echo "[svc] $unit already active"
  else
    systemctl restart "$unit" >/dev/null 2>&1
    echo "[svc] restarted $unit"
  fi
}

ensure_service lk21-api
ensure_service lk21-api-cf-tunnel
ensure_service lk21-api-pinggy-tunnel

# --- health ---------------------------------------------------------------
sleep 6
echo "[health] local: $(curl -s -m 15 http://127.0.0.1:3110/api/health || echo FAIL)"
echo "[health] cf:    $(curl -s -o /dev/null -w '%{http_code}' -m 25 https://api.zainulghani.biz.id/api/health || echo FAIL)"
echo "=== done ==="
