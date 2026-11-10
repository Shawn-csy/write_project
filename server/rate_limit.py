import os
import hashlib
import hmac
import socket
import time
from functools import lru_cache
from ipaddress import ip_address

from slowapi import Limiter


TRUSTED_PROXY_HOSTNAME = os.getenv("TRUSTED_PROXY_HOSTNAME", "").strip()


@lru_cache(maxsize=2)
def _trusted_proxy_ips(_ten_second_bucket):
    if not TRUSTED_PROXY_HOSTNAME:
        return frozenset()
    try:
        records = socket.getaddrinfo(TRUSTED_PROXY_HOSTNAME, None, type=socket.SOCK_STREAM)
    except OSError:
        return frozenset()
    return frozenset(ip_address(record[4][0]) for record in records)


def resolve_client_ip(request):
    """Return a verified client IP and the proxy-supplied value for audit rows.

    The ingress overwrites X-Real-IP. Caller-supplied forwarding headers are
    never trusted when the immediate peer is outside the configured proxy net.
    """
    peer = request.client.host if request.client else ""
    try:
        peer_ip = ip_address(peer)
    except ValueError:
        return peer or "unknown", ""

    if peer_ip in _trusted_proxy_ips(int(time.monotonic() // 10)):
        forwarded = (request.headers.get("x-real-ip") or "").strip()
        try:
            verified = str(ip_address(forwarded))
            return verified, verified
        except ValueError:
            pass
    return str(peer_ip), ""


def get_client_ip(request):
    return resolve_client_ip(request)[0]


def client_ip_digest(client_ip: str) -> str:
    """Keyed source identifier for engagement rows without storing raw IPs."""
    secret = os.getenv("PUBLIC_ENGAGEMENT_SECRET") or os.getenv("REVALIDATE_SECRET")
    if secret:
        return hmac.new(
            secret.encode("utf-8"),
            b"public-engagement-v1\0" + client_ip.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
    if os.getenv("ENVIRONMENT", "").lower() == "production":
        raise RuntimeError("Production public engagement requires a secret")
    return hashlib.sha256(b"dev-public-engagement-v1\0" + client_ip.encode("utf-8")).hexdigest()


limiter = Limiter(key_func=get_client_ip)
RATE_LIMIT_ENABLED = True
