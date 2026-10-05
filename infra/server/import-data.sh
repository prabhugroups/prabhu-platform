#!/usr/bin/env bash
# Replaces the running stack's data with a dump made by push-local-data.sh.
# Runs ON THE SERVER (push-local-data.sh uploads and invokes it):
#
#   bash import-data.sh <data.sql.gz> <uploads.tar.gz>
#
# 1. backs up the current database to $DEPLOY_PATH/backups/
# 2. stops the API + frontend (no writes mid-import; Traefik keeps running)
# 3. empties every table except alembic_version, loads the dump's rows
# 4. replaces the uploads volume's contents with the tarball
# 5. starts the stack again (`migrate` runs as on every deploy: migrations
#    are a no-op at the same revision, the seed skips what already exists)
#
# The dump holds rows only — the tables are the ones Alembic created here,
# so it loads across MySQL versions. Both sides must be at the same Alembic
# revision; push-local-data.sh checks that before uploading.
#
# Needs: run as root or the deploy user (docker access + infra/.env).
set -euo pipefail

DUMP="${1:?usage: import-data.sh <data.sql.gz> <uploads.tar.gz>}"
UPLOADS="${2:?usage: import-data.sh <data.sql.gz> <uploads.tar.gz>}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/prabhu-platform}"

die() { echo "ERROR: $*" >&2; exit 1; }
step() { echo; echo "==> $*"; }

[ -f "$DUMP" ] || die "no dump at $DUMP"
[ -f "$UPLOADS" ] || die "no uploads tarball at $UPLOADS"
cd "$DEPLOY_PATH/infra"
[ -f .env ] || die "$DEPLOY_PATH/infra/.env missing — is the stack deployed?"

dc() { docker compose "$@"; }
# Root credentials come from the mysql container's own environment, via
# MYSQL_PWD so they never appear in a process list.
sql() { dc exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot --default-character-set=utf8mb4 "$MYSQL_DATABASE" "$@"' sh "$@"; }

dc ps --status running --services | grep -qx mysql || die "mysql isn't running — deploy the stack first"

step "Backing up the current database"
mkdir -p ../backups
BACKUP="../backups/pre-import-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
dc exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -uroot --single-transaction --no-tablespaces --default-character-set=utf8mb4 "$MYSQL_DATABASE"' | gzip > "$BACKUP"
echo "saved $(cd ../backups && pwd)/$(basename "$BACKUP") ($(du -h "$BACKUP" | cut -f1))"

step "Stopping API and frontend"
dc stop frontend backend

step "Loading database rows"
TABLES=$(sql -N -e "select table_name from information_schema.tables where table_schema = database() and table_type = 'BASE TABLE' and table_name <> 'alembic_version'")
{
  echo "SET FOREIGN_KEY_CHECKS=0;"
  for t in $TABLES; do echo "TRUNCATE TABLE \`$t\`;"; done
  gunzip -c "$DUMP"
  echo "SET FOREIGN_KEY_CHECKS=1;"
} | sql
echo "loaded into $(echo "$TABLES" | wc -w) tables"

step "Replacing uploaded files"
# The API container is stopped, so use a one-off one (same image, user and
# volume). Media are demo content for now — no backup of the old files.
gunzip -c "$UPLOADS" | dc run --rm --no-deps -T --entrypoint sh backend \
  -c 'find /app/uploads -mindepth 1 -delete && tar -xf - -C /app/uploads --no-same-owner && echo "$(find /app/uploads -type f | wc -l) files"'

step "Starting the stack"
dc up -d --wait --no-build
dc ps

echo
echo "Done. Roll back the database with:"
echo "  gunzip -c $(cd ../backups && pwd)/$(basename "$BACKUP") | docker compose -f $DEPLOY_PATH/infra/docker-compose.yml exec -T mysql sh -c 'MYSQL_PWD=\"\$MYSQL_ROOT_PASSWORD\" mysql -uroot \"\$MYSQL_DATABASE\"'"
