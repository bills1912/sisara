import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import connect_to_database, close_database_connection
from app.routers import budget_router, master_data_router, theme_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    await connect_to_database()
    yield
    # Shutdown
    await close_database_connection()


app = FastAPI(
    title="SISARA API",
    description="Backend API for Sistem Perencanaan Anggaran (Budget Planning and Revision System)",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware - Allow frontend origins
# Update these with your actual frontend URLs
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    # Add your Render/Vercel/Netlify frontend URLs here
    "https://*.onrender.com",
    "https://*.vercel.app",
    "https://*.netlify.app",
]

# In production, you might want to restrict this
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(budget_router)
app.include_router(master_data_router)
app.include_router(theme_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to SISARA API",
        "description": "Sistem Perencanaan Anggaran - Budget Planning System",
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "health": "/health",
            "budget": "/api/budget",
            "master_data": "/api/master-data",
            "theme": "/api/theme"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for Render."""
    return {"status": "healthy", "service": "sisara-api"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
