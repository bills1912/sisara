from fastapi import APIRouter, Body
from app.database import get_collection
from app.models.user_models import SystemState
from datetime import datetime

router = APIRouter(prefix="/api/system", tags=["System State"])

@router.get("/status", response_model=SystemState)
async def get_system_status():
    collection = get_collection("system_state")
    state = await collection.find_one({"_id": "global_config"})
    
    if not state:
        # Default state
        return SystemState(is_revision_active=False)
    
    return SystemState(**state)

@router.post("/status", response_model=SystemState)
async def update_revision_status(is_active: bool = Body(..., embed=True), user: str = Body("System", embed=True)):
    collection = get_collection("system_state")
    
    new_state = {
        "is_revision_active": is_active,
        "last_updated_by": user,
        "last_updated_at": datetime.now()
    }
    
    await collection.update_one(
        {"_id": "global_config"},
        {"$set": new_state},
        upsert=True
    )
    
    return SystemState(**new_state)