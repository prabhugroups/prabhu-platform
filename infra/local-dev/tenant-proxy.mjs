// Local-only dev convenience: listens on PORT, forwards every request to the
// single Next.js dev server on UPSTREAM_PORT, rewriting the Host header to
// TARGET_HOST_HEADER so frontend/src/proxy.ts resolves the right tenant by
// domain — without ever touching /etc/hosts or dialing a real domain.
// Used by start.sh / stop.sh in this directory.
import http from "node:http";
import net from "node:net";

const PORT = process.env.PORT;
const TARGET_HOST_HEADER = process.env.TARGET_HOST_HEADER;
const UPSTREAM_HOST = "127.0.0.1";
const UPSTREAM_PORT = Number(process.env.UPSTREAM_PORT || 3001);

if (!PORT || !TARGET_HOST_HEADER) {
  console.error("Usage: PORT=3002 TARGET_HOST_HEADER=prabhusteel.com node tenant-proxy.mjs");
  process.exit(1);
}

// Next.js Server Actions reject a request whose Origin/Referer host doesn't
// match the Host header (CSRF protection) — rewrite those too, or every
// form POST (e.g. /admin/login) gets blocked even though GETs work fine.
function rewriteOriginHeaders(headers) {
  const next = { ...headers };
  if (next.origin) next.origin = `http://${TARGET_HOST_HEADER}`;
  if (next.referer) next.referer = next.referer.replace(/^https?:\/\/[^/]+/, `http://${TARGET_HOST_HEADER}`);
  return next;
}

const server = http.createServer((clientReq, clientRes) => {
  const headers = rewriteOriginHeaders({ ...clientReq.headers, host: TARGET_HOST_HEADER });
  const proxyReq = http.request(
    { hostname: UPSTREAM_HOST, port: UPSTREAM_PORT, path: clientReq.url, method: clientReq.method, headers },
    (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(clientRes);
    },
  );
  proxyReq.on("error", (err) => {
    clientRes.writeHead(502);
    clientRes.end("Bad gateway: " + err.message);
  });
  clientReq.pipe(proxyReq);
});

server.on("upgrade", (req, clientSocket, head) => {
  const headers = rewriteOriginHeaders({ ...req.headers, host: TARGET_HOST_HEADER });
  const proxySocket = net.connect(UPSTREAM_PORT, UPSTREAM_HOST, () => {
    let headerLines = `${req.method} ${req.url} HTTP/1.1\r\n`;
    for (const [k, v] of Object.entries(headers)) headerLines += `${k}: ${v}\r\n`;
    headerLines += "\r\n";
    proxySocket.write(headerLines);
    if (head && head.length) proxySocket.write(head);
    clientSocket.pipe(proxySocket);
    proxySocket.pipe(clientSocket);
  });
  proxySocket.on("error", () => clientSocket.destroy());
  clientSocket.on("error", () => proxySocket.destroy());
});

server.listen(Number(PORT), "127.0.0.1", () => {
  console.log(`Tenant proxy: 127.0.0.1:${PORT} -> Host:${TARGET_HOST_HEADER} -> 127.0.0.1:${UPSTREAM_PORT}`);
});
