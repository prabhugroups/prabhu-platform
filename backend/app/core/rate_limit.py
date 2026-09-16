import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings

settings = get_settings()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """In-memory sliding-window limiter, per client IP. The legacy codebase
    had this exact pattern written but commented out in every tenant; at this
    scale (7 tenants, simple CMS traffic) a single in-process deque per IP is
    sufficient — no Redis needed. Not safe across multiple backend replicas,
    which is fine: the platform runs one backend instance (see infra plan)."""

    def __init__(self, app):
        super().__init__(app)
        self._hits: dict[str, deque] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        window = self._hits[client_ip]
        while window and now - window[0] > settings.rate_limit_window_seconds:
            window.popleft()
        if len(window) >= settings.rate_limit_requests:
            return Response("Too many requests", status_code=429)
        window.append(now)
        return await call_next(request)


class LoginRateLimiter:
    """A second, much tighter sliding-window limiter scoped to failed login
    attempts, keyed by (client_ip, username) rather than IP alone. The
    app-wide RateLimitMiddleware above (120 req/60s) is nowhere near tight
    enough to stop credential stuffing against /auth/login — this exists
    specifically for that. Same single-instance, no-Redis-needed assumption
    as RateLimitMiddleware; a successful login clears the counter for that
    (ip, username) pair so legitimate users who mistype a password once or
    twice aren't punished once they get it right."""

    def __init__(self, max_attempts: int, window_seconds: int):
        self._max_attempts = max_attempts
        self._window_seconds = window_seconds
        self._attempts: dict[str, deque] = defaultdict(deque)

    @staticmethod
    def _key(client_ip: str, username: str) -> str:
        return f"{client_ip}:{username}"

    def _prune(self, key: str) -> deque:
        now = time.monotonic()
        window = self._attempts[key]
        while window and now - window[0] > self._window_seconds:
            window.popleft()
        return window

    def check(self, client_ip: str, username: str) -> None:
        window = self._prune(self._key(client_ip, username))
        if len(window) >= self._max_attempts:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "Too many login attempts. Try again later.",
            )

    def record_failure(self, client_ip: str, username: str) -> None:
        self._prune(self._key(client_ip, username)).append(time.monotonic())

    def record_success(self, client_ip: str, username: str) -> None:
        self._attempts.pop(self._key(client_ip, username), None)


login_rate_limiter = LoginRateLimiter(
    max_attempts=settings.login_rate_limit_attempts,
    window_seconds=settings.login_rate_limit_window_seconds,
)
