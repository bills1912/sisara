from typing import Optional
from bson import ObjectId
from app.database import get_collection
from app.models.schemas import ThemeConfig, ThemeConfigDocument


class ThemeService:
    def __init__(self):
        self.collection_name = "theme_configs"

    def get_collection(self):
        return get_collection(self.collection_name)

    async def get_theme(self, user_id: str = "default") -> ThemeConfig:
        """Get theme configuration for user."""
        collection = self.get_collection()
        doc = await collection.find_one({"user_id": user_id})
        
        if doc and "config" in doc:
            return ThemeConfig(**doc["config"])
        
        # Return default theme
        return ThemeConfig()

    async def update_theme(
        self,
        theme: ThemeConfig,
        user_id: str = "default"
    ) -> bool:
        """Update or create theme configuration."""
        collection = self.get_collection()
        
        result = await collection.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "config": theme.model_dump()
                },
                "$setOnInsert": {
                    "_id": str(ObjectId()),
                    "user_id": user_id
                }
            },
            upsert=True
        )
        return result.modified_count > 0 or result.upserted_id is not None

    async def reset_theme(self, user_id: str = "default") -> ThemeConfig:
        """Reset theme to default."""
        default_theme = ThemeConfig()
        await self.update_theme(default_theme, user_id)
        return default_theme


theme_service = ThemeService()
