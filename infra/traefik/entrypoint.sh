#!/bin/sh
# Renders Traefik's complete config from environment variables (infra/.env,
# passed through docker-compose.yml), then execs traefik. This is the one
# place env becomes routing: Traefik ignores CLI flags whenever a config
# file is in use and never interpolates env vars inside its config files.
#
# Routing model (docs/TRAEFIK.md):
#   <slug>.$BASE_DOMAIN   -> frontend; Next.js resolves the tenant from Host
#   $SUPER_ADMIN_DOMAIN   -> frontend; operator console, tighter rate limit
#   $CUSTOM_DOMAINS       -> frontend; each also needs a tenant_domains row
#   <any host>/media/*    -> backend (FastAPI static files)
#
# TLS_CHALLENGE picks how certificates are issued:
#   dns        one wildcard cert for *.$BASE_DOMAIN via DNS-01 (needs DNS
#              provider API credentials). New tenants need no infra change.
#   http       one cert per hostname via HTTP-01. Wildcards are impossible
#              with HTTP-01, so every tenant subdomain must be listed in
#              TENANT_SUBDOMAINS.
#   selfsigned Traefik's built-in default cert. Local/staging testing only.
set -eu

SRC=/etc/traefik/src
STATIC=/etc/traefik/traefik.yml
DYNAMIC=/etc/traefik/dynamic

die() { echo "traefik-entrypoint: $*" >&2; exit 1; }
lower() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }
# "a, B ,c" -> "a b c"
split_list() { lower "$1" | tr ',' ' '; }

LABEL='[a-z0-9]([a-z0-9-]*[a-z0-9])?'
# Values below end up inside YAML strings and Go regexps — accept DNS
# characters only, so a typo in .env fails loudly instead of mis-routing.
check_host() {
  printf '%s' "$1" | grep -Eq "^$LABEL(\.$LABEL)*\$" || die "invalid hostname '$1' in $2"
}
check_label() {
  printf '%s' "$1" | grep -Eq "^$LABEL\$" || die "invalid subdomain '$1' in $2"
}
# `Host(a) || Host(b)` for each argument
host_rule() {
  rule=""
  for h in "$@"; do rule="${rule:+$rule || }Host(\`$h\`)"; done
  printf '%s' "$rule"
}

BASE_DOMAIN=$(lower "${BASE_DOMAIN:-}")
SUPER_ADMIN_DOMAIN=$(lower "${SUPER_ADMIN_DOMAIN:-}")
TLS_CHALLENGE=$(lower "${TLS_CHALLENGE:-dns}")
CUSTOM_DOMAINS=$(split_list "${CUSTOM_DOMAINS:-}")
TENANT_SUBDOMAINS=$(split_list "${TENANT_SUBDOMAINS:-}")
ACME_CA_SERVER="${ACME_CA_SERVER:-https://acme-v02.api.letsencrypt.org/directory}"

[ -n "$BASE_DOMAIN" ] || die "BASE_DOMAIN must be set (tenants are served at <slug>.BASE_DOMAIN)"
[ -n "$SUPER_ADMIN_DOMAIN" ] || die "SUPER_ADMIN_DOMAIN must be set"
check_host "$BASE_DOMAIN" BASE_DOMAIN
check_host "$SUPER_ADMIN_DOMAIN" SUPER_ADMIN_DOMAIN
for h in $CUSTOM_DOMAINS; do check_host "$h" CUSTOM_DOMAINS; done
for s in $TENANT_SUBDOMAINS; do check_label "$s" TENANT_SUBDOMAINS; done

case "$TLS_CHALLENGE" in
  dns | http)
    printf '%s' "${ACME_EMAIL:-}" | grep -Eq '^[^"\\ ]+@[^"\\ ]+$' \
      || die "ACME_EMAIL must be a valid email for TLS_CHALLENGE=$TLS_CHALLENGE"
    ;;
  selfsigned) ;;
  *) die "TLS_CHALLENGE must be dns, http or selfsigned (got '$TLS_CHALLENGE')" ;;
esac
if [ "$TLS_CHALLENGE" = dns ]; then
  printf '%s' "${ACME_DNS_PROVIDER:-}" | grep -Eq '^[a-z0-9.-]+$' \
    || die "ACME_DNS_PROVIDER must name a lego DNS provider (e.g. cloudflare) for TLS_CHALLENGE=dns"
fi
if [ "$TLS_CHALLENGE" = http ] && [ -z "$TENANT_SUBDOMAINS" ]; then
  die "TLS_CHALLENGE=http cannot issue wildcard certs — list every tenant subdomain in TENANT_SUBDOMAINS, or use TLS_CHALLENGE=dns"
fi

# ---- TLS blocks per router ----
TLS_HTTP='{ certResolver: le-http }'
case "$TLS_CHALLENGE" in
  dns)
    TENANT_TLS="{ certResolver: le-dns, domains: [{ main: \"$BASE_DOMAIN\", sans: [\"*.$BASE_DOMAIN\"] }] }"
    OTHER_TLS=$TLS_HTTP
    ;;
  http) TENANT_TLS=$TLS_HTTP OTHER_TLS=$TLS_HTTP ;;
  selfsigned) TENANT_TLS='{}' OTHER_TLS='{}' ;;
esac
# The admin console shares the wildcard cert when it's a direct subdomain.
case "$SUPER_ADMIN_DOMAIN" in
  *.*.$BASE_DOMAIN) ADMIN_TLS=$OTHER_TLS ;;
  *.$BASE_DOMAIN) ADMIN_TLS=$TENANT_TLS ;;
  *) ADMIN_TLS=$OTHER_TLS ;;
esac

# ---- Tenant host matcher ----
if [ "$TLS_CHALLENGE" = http ]; then
  hosts=""
  for s in $TENANT_SUBDOMAINS; do hosts="$hosts $s.$BASE_DOMAIN"; done
  # shellcheck disable=SC2086 # intentional word splitting
  TENANT_HOSTS=$(host_rule $hosts)
else
  base_re=$(printf '%s' "$BASE_DOMAIN" | sed 's/\./\\./g')
  TENANT_HOSTS="HostRegexp(\`^[a-z0-9-]+\\.$base_re\$\`)"
fi

# ---- Static config ----
{
  cat "$SRC/traefik.yml"
  if [ "$TLS_CHALLENGE" != selfsigned ]; then
    cat <<EOF

certificatesResolvers:
  le-http:
    acme:
      email: "$ACME_EMAIL"
      caServer: "$ACME_CA_SERVER"
      storage: /letsencrypt/acme-http.json
      httpChallenge:
        entryPoint: web
EOF
  fi
  if [ "$TLS_CHALLENGE" = dns ]; then
    cat <<EOF
  le-dns:
    acme:
      email: "$ACME_EMAIL"
      caServer: "$ACME_CA_SERVER"
      storage: /letsencrypt/acme-dns.json
      dnsChallenge:
        provider: "$ACME_DNS_PROVIDER"
        resolvers: ["1.1.1.1:53", "8.8.8.8:53"]
EOF
  fi
} > "$STATIC"

# ---- Dynamic config ----
mkdir -p "$DYNAMIC"
rm -f "$DYNAMIC"/*.yml
cp "$SRC"/dynamic/*.yml "$DYNAMIC"/

PUBLIC_MW='[security-headers, rate-limit, in-flight, buffering]'
{
  cat <<EOF
# GENERATED by entrypoint.sh at container start — edit infra/.env or the
# script, not this file.
http:
  routers:
    # Every <slug>.$BASE_DOMAIN. The Super Admin console is confined to its
    # own host: /super-admin never reaches the frontend from a tenant host.
    tenants:
      rule: '($TENANT_HOSTS) && !PathPrefix(\`/super-admin\`)'
      entryPoints: [websecure]
      service: frontend
      middlewares: $PUBLIC_MW
      tls: $TENANT_TLS
      priority: 100

    super-admin:
      rule: 'Host(\`$SUPER_ADMIN_DOMAIN\`)'
      entryPoints: [websecure]
      service: frontend
      middlewares: [admin-root-redirect, security-headers, super-admin-rate-limit, in-flight, buffering]
      tls: $ADMIN_TLS
      priority: 500

    # /super-admin on any other host (e.g. a super admin who signed in on a
    # tenant subdomain) is sent to the console's own host instead.
    super-admin-elsewhere:
      rule: 'PathPrefix(\`/super-admin\`)'
      entryPoints: [websecure]
      service: noop@internal
      middlewares: [to-super-admin-domain]
      tls: {}
      priority: 200

    # Uploaded media for every host, straight from FastAPI's StaticFiles
    # mount — the only public path to the backend.
    media:
      rule: 'PathPrefix(\`/media/\`)'
      entryPoints: [websecure]
      service: backend
      middlewares: $PUBLIC_MW
      tls: {}
      priority: 1000
EOF
  if [ -n "$CUSTOM_DOMAINS" ]; then
    # shellcheck disable=SC2086 # intentional word splitting
    cat <<EOF

    custom-domains:
      rule: '($(host_rule $CUSTOM_DOMAINS)) && !PathPrefix(\`/super-admin\`)'
      entryPoints: [websecure]
      service: frontend
      middlewares: $PUBLIC_MW
      tls: $OTHER_TLS
      priority: 300
EOF
  fi
  cat <<EOF

  middlewares:
    # Bare https://$SUPER_ADMIN_DOMAIN/ lands on the console, not a tenant page.
    admin-root-redirect:
      redirectRegex:
        regex: '^(https?://[^/]+)/?\$'
        replacement: '\${1}/super-admin'

    to-super-admin-domain:
      redirectRegex:
        regex: '^https?://[^/]+/(.*)\$'
        replacement: 'https://$SUPER_ADMIN_DOMAIN/\${1}'

  services:
    frontend:
      loadBalancer:
        servers:
          - url: "http://frontend:3000"

    backend:
      loadBalancer:
        servers:
          - url: "http://backend:8000"
EOF
} > "$DYNAMIC/routers.yml"

echo "traefik-entrypoint: TLS_CHALLENGE=$TLS_CHALLENGE tenants=*.$BASE_DOMAIN admin=$SUPER_ADMIN_DOMAIN custom=[${CUSTOM_DOMAINS# }]"
exec traefik --configFile="$STATIC" "$@"
