from fastapi import APIRouter, HTTPException, status
from typing import List, Dict
from app.models.schemas import (
    MasterDataItem,
    MasterDataCreate,
    MasterDataResponse,
    RowType,
)
from app.services.master_data_service import master_data_service

router = APIRouter(prefix="/api/master-data", tags=["Master Data"])


@router.get("/", response_model=Dict[str, List[MasterDataItem]])
async def get_all_master_data():
    """Get all master data grouped by type."""
    return await master_data_service.get_all()


@router.get("/{row_type}", response_model=List[MasterDataItem])
async def get_master_data_by_type(row_type: RowType):
    """Get master data by type."""
    return await master_data_service.get_by_type(row_type)


@router.post("/")
async def save_master_data(data: Dict[str, List[MasterDataItem]]):
    """
    Save/sync all master data.
    Accepts format: { "KRO": [...], "RO": [...], ... } - replaces all existing data.
    """
    result = await master_data_service.sync_all(data)
    return {
        "message": "Master data saved successfully",
        "counts": result
    }


@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_single_master_data(data: MasterDataCreate):
    """Create a single new master data item."""
    doc_id = await master_data_service.create(data)
    return {"id": doc_id, "message": "Master data created successfully"}


@router.post("/bulk", status_code=status.HTTP_201_CREATED)
async def bulk_create_master_data(items: List[MasterDataCreate]):
    """Bulk create master data items."""
    count = await master_data_service.bulk_create(items)
    return {"count": count, "message": f"{count} master data items created"}


@router.put("/sync")
async def sync_all_master_data(data: Dict[str, List[MasterDataItem]]):
    """
    Sync all master data - replaces existing data with new data.
    Accepts format: { "KRO": [...], "RO": [...], ... }
    """
    result = await master_data_service.sync_all(data)
    return {
        "message": "Master data synced successfully",
        "counts": result
    }


@router.delete("/{row_type}/{code}")
async def delete_master_data(row_type: RowType, code: str):
    """Delete a master data item by type and code."""
    success = await master_data_service.delete(row_type, code)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Master data with type {row_type} and code {code} not found"
        )
    return {"message": "Master data deleted successfully"}


@router.put("/{row_type}/{code}")
async def update_master_data(row_type: RowType, code: str, new_desc: str):
    """Update master data description."""
    success = await master_data_service.update(row_type, code, new_desc)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Master data with type {row_type} and code {code} not found"
        )
    return {"message": "Master data updated successfully"}
