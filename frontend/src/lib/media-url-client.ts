// Client-safe duplicate of the one-line helper in lib/api.ts (which is
// marked server-only because the rest of that file talks to the internal
// backend URL directly). This has no such restriction.
export function mediaUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  return `/media/${relativePath}`;
}
