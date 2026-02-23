import pytest
from unittest.mock import MagicMock
from rate_limit import get_client_ip, limiter, _NoopLimiter

def test_get_client_ip_cf_connecting_ip():
    mock_request = MagicMock()
    # If cf-connecting-ip is present, use it.
    mock_request.headers.get.side_effect = lambda k: "203.0.113.1" if k == "cf-connecting-ip" else None
    
    ip = get_client_ip(mock_request)
    assert ip == "203.0.113.1"
    mock_request.headers.get.assert_called_with("cf-connecting-ip")

def test_get_client_ip_x_forwarded_for():
    mock_request = MagicMock()
    # Simulating X-Forwarded-For where there could be multiple IPs
    def mock_headers_get(key):
        if key == "cf-connecting-ip":
            return None
        if key == "x-forwarded-for":
            return "198.51.100.2, 10.0.0.1"
        return None
    mock_request.headers.get.side_effect = mock_headers_get
    
    ip = get_client_ip(mock_request)
    # Should take the first IP without spaces
    assert ip == "198.51.100.2"

def test_get_client_ip_fallback():
    mock_request = MagicMock()
    mock_request.headers.get.return_value = None
    mock_request.client.host = "192.168.1.10"
    
    ip = get_client_ip(mock_request)
    assert ip == "192.168.1.10"

def test_get_client_ip_no_request_client():
    mock_request = MagicMock()
    mock_request.headers.get.return_value = None
    mock_request.client = None
    
    ip = get_client_ip(mock_request)
    assert ip == "unknown"

def test_noop_limiter_decorator():
    # In test environments without redis/slowapi, Limiter can fallback to Noop.
    noop = _NoopLimiter()
    # Check if the decorator successfully returns the function unmodified
    @noop.limit("10/minute")
    def dummy_route():
        return "ok"
    assert dummy_route() == "ok"
