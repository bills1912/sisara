from fastapi import APIRouter, HTTPException, status
from typing import List
from app.models.schemas import RevisionCreate, RevisionResponse, RevisionDetailResponse, BudgetRowResponse
from app.services.revision_service import revision_service

router = APIRouter(prefix="/api/revisions", tags=["Revisions"])

@router.get("/", response_model=List[RevisionResponse])
async def get_history():
    return await revision_service.get_all_revisions()

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_revision(payload: RevisionCreate):
    """Save current budget state as a revision snapshot."""
    # Payload.data expects List[BudgetRowResponse] (the tree)
    # Convert Pydantic models to dicts for Mongo insertion if necessary inside service
    # But usually Pydantic handles validation. We pass the list of dicts/models.
    # We might need to dump the model in the service.
    # Let's assume payload.data is passed correctly.
    
    # Quick fix: dump data to list of dicts
    data_dicts = [item.model_dump() for item in payload.data]
    
    rev_id = await revision_service.create_revision(payload.note, data_dicts)
    return {"id": rev_id, "message": "Revision snapshot saved"}

@router.get("/{rev_id}", response_model=RevisionDetailResponse)
async def get_revision_detail(rev_id: str):
    rev = await revision_service.get_revision_by_id(rev_id)
    if not rev:
        raise HTTPException(status_code=404, detail="Revision not found")
    return rev

@router.delete("/{rev_id}")
async def delete_revision(rev_id: str):
    success = await revision_service.delete_revision(rev_id)
    if not success:
        raise HTTPException(status_code=404, detail="Revision not found")
    return {"status": "success", "message": "Revision deleted successfully"}