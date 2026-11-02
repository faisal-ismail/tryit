"""
cPanel Phusion Passenger / LiteSpeed WSGI Entry Point for TryIt AI.
Uses a direct synchronous ASGI-to-WSGI bridge with `asyncio.run()`
to eliminate the multi-threaded event-loop deadlock known to occur
with `a2wsgi` on LiteSpeed Web Server / shared cPanel hosting.
"""
import asyncio
import os
import sys
from typing import Callable, Iterable, List, Tuple

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from main import app


class LiteSpeedFastAPIAdapter:
    """Zero-thread synchronous WSGI-to-ASGI bridge for LiteSpeed/Passenger."""

    def __init__(self, asgi_app: Callable) -> None:
        self.asgi_app = asgi_app

    def __call__(self, environ: dict, start_response: Callable) -> Iterable[bytes]:
        length = int(environ.get("CONTENT_LENGTH") or 0)
        body = environ["wsgi.input"].read(length) if length > 0 and "wsgi.input" in environ else b""

        headers: List[Tuple[bytes, bytes]] = []
        for k, v in environ.items():
            if k.startswith("HTTP_"):
                h_name = k[5:].replace("_", "-").lower().encode("latin1")
                headers.append((h_name, str(v).encode("latin1")))
        if environ.get("CONTENT_TYPE"):
            headers.append((b"content-type", str(environ["CONTENT_TYPE"]).encode("latin1")))

        path_info = environ.get("PATH_INFO", "/") or "/"
        if path_info in ("", "/index.html", "/index.php"):
            path_info = "/"
        query_string = environ.get("QUERY_STRING", "") or ""

        scope = {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": environ.get("REQUEST_METHOD", "GET"),
            "scheme": environ.get("wsgi.url_scheme", "https"),
            "path": path_info,
            "raw_path": path_info.encode("latin1"),
            "query_string": query_string.encode("latin1"),
            "headers": headers,
            "client": ("127.0.0.1", 0),
            "server": ("127.0.0.1", 80),
        }

        status_code = "200 OK"
        response_headers: List[Tuple[str, str]] = []
        chunks: List[bytes] = []

        async def receive():
            return {"type": "http.request", "body": body, "more_body": False}

        async def send(message: dict):
            nonlocal status_code, response_headers
            if message["type"] == "http.response.start":
                status_code = f"{message['status']} OK"
                response_headers = [
                    (k.decode("latin1"), v.decode("latin1"))
                    for k, v in message.get("headers", [])
                ]
            elif message["type"] == "http.response.body":
                chunks.append(message.get("body", b""))

        asyncio.run(self.asgi_app(scope, receive, send))
        start_response(status_code, response_headers)
        return chunks


application = LiteSpeedFastAPIAdapter(app)
