#!/usr/bin/env bash
# Copies your local dev data (MySQL rows + backend/uploads) to a deployed
# server, REPLACING the data there. For seeding a demo/staging server from
# the content you entered locally — not a routine deploy step.
#
#   infra/server/push-local-data.sh root@<server-ip>
#
# Reads the local DB credentials from backend/.env (DB_HOST, DB_PORT,
# DB_NAME, DB_USER, DB_PASSWORD) and media from its UPLOADS_DIR. The SSH
# user needs docker access and read access to infra/.env on the server
# (root, or the deploy user). The server side is import-data.sh, which
# backs up the server's database before touching anything.
#
# Env: BACKEND_ENV (default backend/.env), DEPLOY_PATH (/opt/prabhu-platform),
#      ASSUME_YES=1 to skip the confirmation prompt.
set -euo pipefail

TARGET="${1:?usage: push-local-data.sh <user@server>}"
REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
BACKEND_ENV="${BACKEND_ENV:-$REPO_ROOT/backend/.env}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/prabhu-platform}"

die() { echo "ERROR: $*" >&2; exit 1; }
step() { echo; echo "==> $*"; }
envval() { sed -n "s/^$1=//p" "$BACKEND_ENV" | tail -1 | sed -e 's/^["'\'']//' -e 's/["'\'']$//'; }

[ -f "$BACKEND_ENV" ] || die "no $BACKEND_ENV"
command -v mysqldump >/dev/null || die "mysqldump not found (install the MySQL client)"
DB_HOST=$(envval DB_HOST); DB_PORT=$(envval DB_PORT); DB_NAME=$(envval DB_NAME); DB_USER=$(envval DB_USER)
MYSQL_PWD=$(envval DB_PASSWORD); export MYSQL_PWD
UPLOADS_DIR=$(envval UPLOADS_DIR)
case "$UPLOADS_DIR" in /*) ;; *) UPLOADS_DIR="$REPO_ROOT/backend/${UPLOADS_DIR#./}" ;; esac
[ -d "$UPLOADS_DIR" ] || die "uploads dir $UPLOADS_DIR not found"
local_sql() { mysql -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"$DB_USER" "$DB_NAME" -N -e "$1"; }

step "Checking schema revisions"
LOCAL_REV=$(local_sql "select version_num from alembic_version") || die "can't query local database $DB_NAME"
REMOTE_REV=$(ssh "$TARGET" "cd '$DEPLOY_PATH/infra' && docker compose exec -T mysql sh -c 'MYSQL_PWD=\"\$MYSQL_ROOT_PASSWORD\" exec mysql -uroot -N \"\$MYSQL_DATABASE\" -e \"select version_num from alembic_version\"'") \
  || die "can't read the server's schema revision (is the stack deployed at $DEPLOY_PATH?)"
echo "local $LOCAL_REV / server $REMOTE_REV"
[ "$LOCAL_REV" = "$REMOTE_REV" ] || die "schema revisions differ — run 'alembic upgrade head' locally and/or deploy the latest main first"

WORK=$(mktemp -d)
trap 'rm -rf -- "$WORK"' EXIT

step "Dumping local data ($DB_NAME)"
# MySQL's client has --set-gtid-purged (GTID lines would fail the import on
# a server without GTIDs); MariaDB's doesn't, and never writes them.
# MySQL 9's --masking-policies (on by default) needs extra privileges and
# isn't wanted in a rows-only dump.
GTID_OPT=()
DUMP_HELP=$(mysqldump --help 2>/dev/null || true)
grep -q -- --set-gtid-purged <<<"$DUMP_HELP" && GTID_OPT+=(--set-gtid-purged=OFF)
grep -q -- --skip-masking-policies <<<"$DUMP_HELP" && GTID_OPT+=(--skip-masking-policies)
mysqldump -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"$DB_USER" \
  --no-create-info --skip-triggers --complete-insert --single-transaction \
  --no-tablespaces "${GTID_OPT[@]}" --hex-blob --default-character-set=utf8mb4 \
  --ignore-table="$DB_NAME.alembic_version" "$DB_NAME" | gzip > "$WORK/data.sql.gz"
tar -czf "$WORK/uploads.tar.gz" -C "$UPLOADS_DIR" --exclude=.gitkeep .
echo "database $(du -h "$WORK/data.sql.gz" | cut -f1), uploads $(du -h "$WORK/uploads.tar.gz" | cut -f1) ($(find "$UPLOADS_DIR" -type f ! -name .gitkeep | wc -l) files)"
echo "rows: $(local_sql "select group_concat(concat(table_name, '=', table_rows) order by table_rows desc separator ', ') from information_schema.tables where table_schema = database() and table_rows > 0 and table_name <> 'alembic_version'")"

if [ "${ASSUME_YES:-}" != 1 ]; then
  echo
  echo "This REPLACES every row and uploaded file on $TARGET with the above"
  echo "(the server's database is backed up first). Admin logins become your local ones."
  read -r -p "Type 'replace' to continue: " answer
  [ "$answer" = replace ] || die "aborted"
fi

step "Uploading"
REMOTE_TMP=$(ssh "$TARGET" mktemp -d)
scp -q "$WORK/data.sql.gz" "$WORK/uploads.tar.gz" "$REPO_ROOT/infra/server/import-data.sh" "$TARGET:$REMOTE_TMP/"

step "Importing on $TARGET"
ssh "$TARGET" "DEPLOY_PATH='$DEPLOY_PATH' bash '$REMOTE_TMP/import-data.sh' '$REMOTE_TMP/data.sql.gz' '$REMOTE_TMP/uploads.tar.gz'; status=\$?; rm -rf -- '$REMOTE_TMP'; exit \$status"
