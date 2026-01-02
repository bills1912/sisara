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

# --- TAMBAHKAN INI ---
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None
# ---------------------

class UserInDB(UserBase):
    hashed_password: str

class UserResponse(UserBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
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