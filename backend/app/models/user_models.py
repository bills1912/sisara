from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from bson import ObjectId
from datetime import datetime

class UserRole(str, Enum):
    PPK = "PPK"
    OPERATOR = "OPERATOR"

class UserBase(BaseModel):
    username: str
    full_name: str
    role: UserRole

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    hashed_password: str

class UserResponse(UserBase):
    id: str = Field(alias="_id")
    
    class Config:
        json_encoders = {ObjectId: str}

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str

class SystemState(BaseModel):
    is_revision_active: bool = False
    last_updated_by: Optional[str] = None
    last_updated_at: Optional[datetime] = None