from slowapi import Limiter

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

limiter = Limiter(key_func=get_client_ip)
