from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import os
import database
import models
import migration
from routers import analysis, scripts, users, orgs, personas, tags, themes, admin, public, seo

# Initialize Database and Run Migrations
models.Base.metadata.create_all(bind=database.engine)
migration.run_migrations()

app = FastAPI()

# Middleware
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["*"], # Wildcard '*' is invalid with allow_credentials=True
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8080",
        "https://scripts.shawnup.com",
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
