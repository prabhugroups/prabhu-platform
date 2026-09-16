#!/bin/sh
# Traefik's file provider does not do env-var substitution on its own, so we
# render the one templated value (SUPER_ADMIN_DOMAIN) here before starting.
# Uses sed rather than envsubst so this runs in the stock traefik image
# without adding a custom build.
set -eu

sed "s|\${SUPER_ADMIN_DOMAIN}|${SUPER_ADMIN_DOMAIN}|g" \
  /etc/traefik/dynamic/routers.yml.template \
  > /etc/traefik/dynamic/routers.yml

exec traefik "$@"
