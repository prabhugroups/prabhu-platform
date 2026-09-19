#!/usr/bin/env bash
# Stops everything started by start.sh in this directory: backend, frontend,
# and all 7 tenant reverse proxies. Does NOT touch MySQL (system service,
# managed separately). Safe to re-run if some processes are already down.
echo "Stopping backend..."
pkill -f "uvicorn app.main:app" 2>/dev/null || true

echo "Stopping frontend..."
pkill -f "next dev -p 3001" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true

echo "Stopping tenant proxies..."
pkill -f "tenant-proxy.mjs" 2>/dev/null || true

sleep 1
echo "Done. Remaining matching processes (should be empty):"
ps aux | grep -E "uvicorn app.main:app|next dev -p 3001|next-server|tenant-proxy.mjs" | grep -v grep || echo "  (none)"
