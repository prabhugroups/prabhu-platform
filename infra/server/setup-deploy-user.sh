#!/usr/bin/env bash
# One-time (and safe to re-run) server preparation for CI deploys — run as
# root on each company's VPS. See docs/DEPLOYMENT.md, "Adding a company".
#
#   sudo bash setup-deploy-user.sh "ssh-ed25519 AAAA... ci-deploy-<company>"
#
# What it does, idempotently:
#   1. installs Docker Engine + Compose v2 if missing (Debian/Ubuntu)
#   2. creates the `deploy` user: no password (key login only), no sudo,
#      member of the `docker` group
#   3. installs the CI public key in its authorized_keys with forwarding
#      disabled, and fixes ~/.ssh permissions (sshd silently ignores keys in
#      group/world-writable files)
#   4. creates the deploy directory owned by `deploy`
#   5. opens 80/443 in ufw if ufw is active (never enables ufw itself)
#
# It never touches sshd_config, existing users, or infra/.env (secrets are
# yours to create — the script tells you how at the end).
#
# Note: membership in the `docker` group is effectively root on this host
# (it can start privileged containers). That's inherent to letting CI run
# `docker compose`; it's why this key is CI-only and per server.
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/prabhu-platform}"
PUBKEY="${1:-}"

die() { echo "ERROR: $*" >&2; exit 1; }
step() { echo; echo "==> $*"; }

[ "$(id -u)" -eq 0 ] || die "run as root (sudo bash $0 \"<public key>\")"
[ -n "$PUBKEY" ] || die "pass the CI *public* key (contents of deploy_<company>.pub) as the first argument"
case "$PUBKEY" in
  *"PRIVATE KEY"*) die "that's a PRIVATE key — pass the .pub file's contents; the private key goes in GitHub" ;;
esac
# Validate it really is a single public key before installing it.
printf '%s\n' "$PUBKEY" | ssh-keygen -lf /dev/stdin >/dev/null 2>&1 \
  || die "not a valid SSH public key: $PUBKEY"
[ "$(printf '%s\n' "$PUBKEY" | wc -l)" -eq 1 ] || die "pass exactly one public key"
case "$DEPLOY_USER" in *[!a-z0-9_-]* | "") die "invalid DEPLOY_USER '$DEPLOY_USER'" ;; esac

step "Docker"
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "already installed: $(docker --version) / $(docker compose version --short)"
else
  command -v apt-get >/dev/null 2>&1 || die "Docker missing and this isn't Debian/Ubuntu — install Docker Engine + Compose v2 manually, then re-run"
  echo "installing Docker Engine + Compose plugin from download.docker.com"
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null 2>&1 || true
getent group docker >/dev/null || groupadd docker

step "User '$DEPLOY_USER'"
if id "$DEPLOY_USER" >/dev/null 2>&1; then
  echo "exists"
else
  useradd --create-home --shell /bin/bash "$DEPLOY_USER"
  echo "created"
fi
passwd -l "$DEPLOY_USER" >/dev/null 2>&1 || true   # key-only: no password login
usermod -aG docker "$DEPLOY_USER"
if id -nG "$DEPLOY_USER" | tr ' ' '\n' | grep -qx -e sudo -e wheel -e admin; then
  echo "WARNING: $DEPLOY_USER is in a sudo group — CI doesn't need that; consider: gpasswd -d $DEPLOY_USER sudo"
fi
echo "groups: $(id -nG "$DEPLOY_USER")"

step "SSH key"
HOME_DIR=$(getent passwd "$DEPLOY_USER" | cut -d: -f6)
SSH_DIR="$HOME_DIR/.ssh"
AUTH="$SSH_DIR/authorized_keys"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$SSH_DIR"
touch "$AUTH"
# Match on the key material (2nd field) so re-runs never duplicate it, even
# if the comment or options differ.
KEY_BODY=$(printf '%s\n' "$PUBKEY" | awk '{print $2}')
if grep -qF "$KEY_BODY" "$AUTH"; then
  echo "key already authorized"
else
  # CI only runs commands and copies files — no forwarding of any kind.
  printf 'no-port-forwarding,no-agent-forwarding,no-X11-forwarding %s\n' "$PUBKEY" >> "$AUTH"
  echo "key added"
fi
chown "$DEPLOY_USER:$DEPLOY_USER" "$AUTH"
chmod 600 "$AUTH"
chmod go-w "$HOME_DIR"
echo "$(grep -c . "$AUTH") key(s) in $AUTH"

step "Deploy directory $DEPLOY_PATH"
install -d -m 750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$DEPLOY_PATH" "$DEPLOY_PATH/infra"
echo "$(stat -c '%U:%G %a' "$DEPLOY_PATH") $DEPLOY_PATH"

step "Firewall"
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow 80/tcp >/dev/null && ufw allow 443/tcp >/dev/null
  echo "ufw active: 80/tcp and 443/tcp allowed (SSH rules left as they are)"
else
  echo "ufw not active — make sure ports 22, 80 and 443 are open in your provider's firewall (Hostinger: hPanel → VPS → Firewall)"
fi

step "Checks"
fail=0
check() { if eval "$2" >/dev/null 2>&1; then echo "  ok   $1"; else echo "  FAIL $1"; fail=1; fi; }
check "deploy user can run docker"        "su -s /bin/sh $DEPLOY_USER -c 'docker info'"
check "authorized_keys is 600 and owned"  "[ \"\$(stat -c '%U %a' $AUTH)\" = '$DEPLOY_USER 600' ]"
check ".ssh is 700"                       "[ \"\$(stat -c '%a' $SSH_DIR)\" = 700 ]"
check "deploy dir writable by deploy"     "su -s /bin/sh $DEPLOY_USER -c 'test -w $DEPLOY_PATH/infra'"
[ "$fail" -eq 0 ] || echo "Fix the FAIL lines above, then re-run."

# Not a failure: on a shared host another reverse proxy may own 80/443, and
# then this stack must sit behind it instead (docs/TRAEFIK.md).
LISTENERS=$(ss -ltnpH '( sport = :80 or sport = :443 )' 2>/dev/null || true)
if [ -n "$LISTENERS" ]; then
  echo
  echo "NOTE: ports 80/443 are already in use on this host:"
  printf '%s\n' "$LISTENERS" | awk '{print "  " $4 "  " $6}'
  echo "Keep that proxy and run this stack behind it: TLS_CHALLENGE=external in infra/.env"
  echo "plus infra/server/nginx-prabhu-platform.conf (docs/TRAEFIK.md, \"Behind an existing reverse proxy\")."
fi

ENV_FILE="$DEPLOY_PATH/infra/.env"
echo
if [ -f "$ENV_FILE" ]; then
  echo "infra/.env exists ($(stat -c '%U %a' "$ENV_FILE")) — make sure it is owned by $DEPLOY_USER with mode 600:"
  echo "  chown $DEPLOY_USER:$DEPLOY_USER $ENV_FILE && chmod 600 $ENV_FILE"
else
  echo "Next: create the secrets file (template: infra/.env.example in the repo):"
  echo "  sudo -u $DEPLOY_USER nano $ENV_FILE && sudo chmod 600 $ENV_FILE"
fi
echo "Then add this server's host-key fingerprint to the GitHub environment as DEPLOY_SSH_FINGERPRINT:"
# The CI actions (appleboy/*, Go's x/crypto/ssh) negotiate the first host-key
# type in this order that the server has — ECDSA before RSA before ED25519 —
# and compare the fingerprint against that key only. Printing a different
# type's fingerprint fails every deploy with "host key fingerprint mismatch".
HOST_KEY=""
for t in ecdsa rsa ed25519; do
  if [ -f "/etc/ssh/ssh_host_${t}_key.pub" ]; then HOST_KEY="/etc/ssh/ssh_host_${t}_key.pub"; break; fi
done
if [ -n "$HOST_KEY" ]; then
  echo "  $(ssh-keygen -lf "$HOST_KEY" | awk '{print $2}')   ($(basename "$HOST_KEY"))"
else
  echo "  (no host key found in /etc/ssh — run: ssh-keygen -lf /etc/ssh/ssh_host_<type>_key.pub)"
fi
