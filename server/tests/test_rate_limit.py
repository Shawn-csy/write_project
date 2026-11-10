from ipaddress import ip_address
from types import SimpleNamespace
import pytest

import rate_limit


def request(peer, **headers):
    return SimpleNamespace(
        client=SimpleNamespace(host=peer) if peer else None,
        headers={name.replace("_", "-"): value for name, value in headers.items()},
    )


def test_untrusted_peer_cannot_spoof_client_ip(monkeypatch):
    monkeypatch.setattr(rate_limit, "_trusted_proxy_ips", lambda _bucket: frozenset({ip_address("192.168.97.3")}))
    incoming = request(
        "203.0.113.10",
        x_real_ip="198.51.100.1",
        x_forwarded_for="198.51.100.2",
        cf_connecting_ip="198.51.100.3",
    )

    assert rate_limit.resolve_client_ip(incoming) == ("203.0.113.10", "")
    assert rate_limit.get_client_ip(incoming) == "203.0.113.10"


def test_trusted_proxy_uses_only_overwritten_real_ip(monkeypatch):
    monkeypatch.setattr(rate_limit, "_trusted_proxy_ips", lambda _bucket: frozenset({ip_address("192.168.97.3")}))
    incoming = request(
        "192.168.97.3",
        x_real_ip="2001:0db8::0001",
        x_forwarded_for="198.51.100.2, 192.168.97.1",
        cf_connecting_ip="198.51.100.3",
    )

    assert rate_limit.resolve_client_ip(incoming) == ("2001:db8::1", "2001:db8::1")


def test_invalid_real_ip_falls_back_to_immediate_peer(monkeypatch):
    monkeypatch.setattr(rate_limit, "_trusted_proxy_ips", lambda _bucket: frozenset({ip_address("192.168.97.3")}))
    incoming = request(
        "192.168.97.3",
        x_real_ip="198.51.100.1, 198.51.100.2",
        x_forwarded_for="198.51.100.3",
        cf_connecting_ip="198.51.100.4",
    )

    assert rate_limit.resolve_client_ip(incoming) == ("192.168.97.3", "")


def test_no_proxy_configuration_ignores_headers(monkeypatch):
    monkeypatch.setattr(rate_limit, "_trusted_proxy_ips", lambda _bucket: frozenset())

    assert rate_limit.get_client_ip(request("192.0.2.10", x_real_ip="198.51.100.1")) == "192.0.2.10"


def test_trusted_proxy_hostname_resolves_exact_address(monkeypatch):
    monkeypatch.setattr(rate_limit, "TRUSTED_PROXY_HOSTNAME", "write_project-frontend")
    monkeypatch.setattr(rate_limit.socket, "getaddrinfo", lambda *_args, **_kwargs: [
        (2, 1, 6, "", ("192.168.97.3", 0)),
    ])
    rate_limit._trusted_proxy_ips.cache_clear()
    try:
        assert rate_limit._trusted_proxy_ips(1) == frozenset({ip_address("192.168.97.3")})
    finally:
        rate_limit._trusted_proxy_ips.cache_clear()


def test_missing_client_falls_back_to_unknown():
    assert rate_limit.resolve_client_ip(request(None, x_real_ip="198.51.100.1")) == ("unknown", "")


def test_limiter_is_active():
    from slowapi import Limiter

    assert isinstance(rate_limit.limiter, Limiter)


def test_client_ip_digest_uses_secret_without_storing_ip(monkeypatch):
    monkeypatch.setenv("PUBLIC_ENGAGEMENT_SECRET", "test-secret-one")
    first = rate_limit.client_ip_digest("203.0.113.10")
    assert first == rate_limit.client_ip_digest("203.0.113.10")
    assert "203.0.113.10" not in first
    monkeypatch.setenv("PUBLIC_ENGAGEMENT_SECRET", "test-secret-two")
    assert first != rate_limit.client_ip_digest("203.0.113.10")


def test_production_engagement_digest_requires_secret(monkeypatch):
    monkeypatch.delenv("PUBLIC_ENGAGEMENT_SECRET", raising=False)
    monkeypatch.delenv("REVALIDATE_SECRET", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")
    with pytest.raises(RuntimeError, match="requires a secret"):
        rate_limit.client_ip_digest("203.0.113.10")
