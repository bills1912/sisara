from fastapi import APIRouter
from app.models.schemas import ThemeConfig
from app.services.theme_service import theme_service

router = APIRouter(prefix="/api/theme", tags=["Theme"])


@router.get("/", response_model=ThemeConfig)
async def get_theme(user_id: str = "default"):
    """Get theme configuration."""
    return await theme_service.get_theme(user_id)


@router.put("/")
async def update_theme(theme: ThemeConfig, user_id: str = "default"):
    """Update theme configuration."""
    await theme_service.update_theme(theme, user_id)
    return {"message": "Theme updated successfully"}


@router.post("/reset", response_model=ThemeConfig)
async def reset_theme(user_id: str = "default"):
    """Reset theme to default configuration."""
    return await theme_service.reset_theme(user_id)
