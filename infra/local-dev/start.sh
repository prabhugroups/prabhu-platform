#!/usr/bin/env bash
# Starts the full local (no-Docker) dev environment:
#   - backend (uvicorn, :8000)
#   - frontend (next dev, :3001)
#   - one small reverse proxy per tenant (:3002-:3008), each rewriting the
#     Host header so frontend/src/proxy.ts resolves the right tenant without
#     touching /etc/hosts or DNS. See tenant-proxy.mjs in this directory.
#
# Assumes: backend/.env already configured and pointing at a reachable
# MySQL with migrations run (see docs/RUNBOOK.md), and `npm install` already
# run in frontend/. Logs go to /tmp/prabhu-*.log. Use stop.sh to stop
# everything this script started.
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROXY_SCRIPT="$ROOT/infra/local-dev/tenant-proxy.mjs"

echo "Starting backend on :8000..."
cd "$ROOT/backend"
> /tmp/prabhu-backend.log
nohup .venv/bin/uvicorn app.main:app --reload --port 8000 >> /tmp/prabhu-backend.log 2>&1 &
disown

echo "Starting frontend on :3001..."
cd "$ROOT/frontend"
> /tmp/prabhu-frontend.log
nohup npm run dev -- -p 3001 >> /tmp/prabhu-frontend.log 2>&1 &
disown

sleep 4

echo "Starting tenant proxies..."
> /tmp/prabhu-tenant-proxies.log
start_proxy() {
  PORT="$1" TARGET_HOST_HEADER="$2" nohup node "$PROXY_SCRIPT" >> /tmp/prabhu-tenant-proxies.log 2>&1 &
  disown
}
start_proxy 3002 prabhusteel.com
start_proxy 3003 holdingshydro.com
start_proxy 3004 ichchhakamanacablecar.com
start_proxy 3005 nepallandbroker.com
start_proxy 3006 prabhucablecar.com
start_proxy 3007 holdingsprabhu.com
start_proxy 3008 ranimahalcablecar.com

sleep 2
echo
echo "Started:"
echo "  Backend:   http://127.0.0.1:8000 (docs at /docs)"
echo "  Frontend:  http://127.0.0.1:3001 (no tenant resolves here directly)"
echo "  Tenants:"
echo "    :3002 -> Prabhu Steels        (prabhusteel.com)"
echo "    :3003 -> Hydro Holdings       (holdingshydro.com)"
echo "    :3004 -> Ichchhakamana Cable Car (ichchhakamanacablecar.com)"
echo "    :3005 -> Nepal Land Broker    (nepallandbroker.com)"
echo "    :3006 -> Prabhu Cable Car     (prabhucablecar.com)"
echo "    :3007 -> Prabhu Holdings      (holdingsprabhu.com)"
echo "    :3008 -> Ranimahal Cable Car  (ranimahalcablecar.com)"
echo
echo "Logs: /tmp/prabhu-backend.log /tmp/prabhu-frontend.log /tmp/prabhu-tenant-proxies.log"
echo "Stop with: infra/local-dev/stop.sh"
