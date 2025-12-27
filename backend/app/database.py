from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi
from app.config import get_settings

settings = get_settings()


class Database:
    client: AsyncIOMotorClient = None
    db = None


db = Database()


async def connect_to_database():
    """Create database connection."""
    db.client = AsyncIOMotorClient(
        settings.mongodb_url,
        server_api=ServerApi('1')
    )
    db.db = db.client[settings.database_name]
    
    # Verify connection
    try:
        await db.client.admin.command('ping')
        print("✅ Successfully connected to MongoDB!")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        raise e


async def close_database_connection():
    """Close database connection."""
    if db.client:
        db.client.close()
        print("🔌 MongoDB connection closed.")


def get_database():
    """Get database instance."""
    return db.db


def get_collection(collection_name: str):
    """Get a specific collection."""
    return db.db[collection_name]
