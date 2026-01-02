import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    mongodb_url: str = os.environ.get(
        "MONGODB_URL",
        "mongodb+srv://ricardozalukhu1925:kuran1925@cluster0.lhmox.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    )
    database_name: str = os.environ.get("DATABASE_NAME", "budget_system")
    
    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings():
    return Settings()
