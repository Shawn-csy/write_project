"""Route-specific request body limits enforced before JSON parsing."""

import re
from collections.abc import Mapping, Sequence
from typing import Pattern

from starlette.responses import PlainTextResponse
from starlette.types import ASGIApp, Receive, Scope, Send


class RequestBodyLimitMiddleware:
    def __init__(
        self,
        app: ASGIApp,
        limits: Mapping[tuple[str, str], int],
        pattern_limits: Sequence[tuple[str, str, int]] = (),
        default_api_limit: int | None = None,
    ) -> None:
        self.app = app
        self.limits = dict(limits)
        self.pattern_limits: tuple[tuple[str, Pattern[str], int], ...] = tuple(
            (method, re.compile(pattern), limit)
            for method, pattern, limit in pattern_limits
        )
        self.default_api_limit = default_api_limit

    def body_limit(self, method: str, path: str) -> int | None:
        exact = self.limits.get((method, path))
        if exact is not None:
            return exact
        for rule_method, pattern, limit in self.pattern_limits:
            if method == rule_method and pattern.fullmatch(path):
                return limit
        if self.default_api_limit is not None and method in {"POST", "PUT", "PATCH"} and path.startswith("/api/"):
            return self.default_api_limit
        return None

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        limit = self.body_limit(scope.get("method", ""), scope.get("path", "")) if scope["type"] == "http" else None
        if limit is None:
            await self.app(scope, receive, send)
            return

        too_large = PlainTextResponse("Request body too large", status_code=413)
        for name, value in scope.get("headers", []):
            if name.lower() == b"content-length":
                try:
                    if int(value) > limit:
                        await too_large(scope, receive, send)
                        return
                except ValueError:
                    pass

        messages = []
        size = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            if message["type"] != "http.request":
                continue
            size += len(message.get("body", b""))
            if size > limit:
                await too_large(scope, receive, send)
                return
            messages.append(message)
            if not message.get("more_body", False):
                break

        async def replay() -> dict:
            if messages:
                return messages.pop(0)
            return await receive()

        await self.app(scope, replay, send)
