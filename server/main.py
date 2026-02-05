from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import os
import database
import models
import migration
from routers import analysis, scripts, users, orgs, personas, tags, themes, admin, public, seo
from dependencies import get_current_user_id
from rate_limit import limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Initialize Database and Run Migrations
models.Base.metadata.create_all(bind=database.engine)
migration.run_migrations()

app = FastAPI()
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return Response("Rate limit exceeded", status_code=429)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    # Loose CSP to avoid blocking current frontend behavior
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src * 'self' data: blob: 'unsafe-inline' 'unsafe-eval'; "
        "img-src * data: blob:; "
        "connect-src *; "
        "style-src * 'unsafe-inline'; "
        "frame-ancestors 'self';",
    )
    # Allow auth popup to close itself (Firebase)
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "no-referrer-when-downgrade")
    return response

# Middleware
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["*"], # Wildcard '*' is invalid with allow_credentials=True
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:1090",
        "http://localhost:8080",
        "https://scripts.shawnup.com",
        "https://open-scripts.shawnup.com",
        "https://scripts-api.shawnup.com",
        "https://scripts-666540946249.asia-east1.run.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(analysis.router)
app.include_router(scripts.router)
app.include_router(scripts.export_router)
app.include_router(scripts.search_router)
app.include_router(users.router)
app.include_router(orgs.router)
app.include_router(personas.router)
app.include_router(tags.router)
app.include_router(themes.router)
app.include_router(admin.router)
app.include_router(public.router)
app.include_router(seo.router)

# Simple auth check endpoint for debugging
@app.get("/api/health/auth")
async def auth_health_check(user_id: str = Depends(get_current_user_id)):
    return {"ok": True, "uid": user_id}

# Static File Serving (SPA Fallback)
DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "dist")
INDEX_PATH = os.path.join(DIST_DIR, "index.html")

if os.path.exists(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")
    
    # Catch-all for React Router (Must be last)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Check if path starts with /api/ to avoid serving HTML for missing API routes
        # This helps debugging 404s
        if full_path.startswith("api/"):
            return {"error": "API endpoint not found (404)"}
            
        if os.path.exists(INDEX_PATH):
             return HTMLResponse(content=open(INDEX_PATH, "r", encoding="utf-8").read())
        return {"error": "Frontend not built"}
