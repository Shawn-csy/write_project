try:
    from slowapi import Limiter
except Exception:
    Limiter = None

def get_client_ip(request):
    # Prefer Cloudflare's connecting IP when behind Tunnel
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip
    # Fallback to standard forwarded header
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

if Limiter:
    limiter = Limiter(key_func=get_client_ip)
    RATE_LIMIT_ENABLED = True
else:
    RATE_LIMIT_ENABLED = False

    class _NoopLimiter:
        def limit(self, _rule):
            def decorator(func):
                return func
            return decorator

    limiter = _NoopLimiter()
