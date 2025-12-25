from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from app.models.schemas import (
    BudgetRowCreate,
    BudgetRowUpdate,
    BudgetRowResponse,
    MonthlyDetail,
)
from app.services.budget_service import budget_service

router = APIRouter(prefix="/api/budget", tags=["Budget"])


@router.get("/", response_model=List[BudgetRowResponse])
async def get_all_budget_rows():
    """Get all budget rows as hierarchical tree structure."""
    rows = await budget_service.get_all_rows()
    return rows


@router.get("/{row_id}")
async def get_budget_row(row_id: str):
    """Get a single budget row by ID."""
    row = await budget_service.get_row_by_id(row_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Budget row with ID {row_id} not found"
        )
    return row


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_budget_row(
    row_data: BudgetRowCreate,
    parent_id: Optional[str] = None
):
    """Create a new budget row (optionally under a parent)."""
    row_id = await budget_service.create_row(row_data, parent_id)
    return {"id": row_id, "message": "Budget row created successfully"}


@router.post("/{parent_id}/children", status_code=status.HTTP_201_CREATED)
async def add_child_row(parent_id: str, row_data: BudgetRowCreate):
    """Add a child row to an existing parent row."""
    row_id = await budget_service.add_child_row(parent_id, row_data)
    if not row_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parent row with ID {parent_id} not found"
        )
    return {"id": row_id, "message": "Child row added successfully"}


@router.put("/{row_id}")
async def update_budget_row(row_id: str, row_data: BudgetRowUpdate):
    """Update a budget row."""
    success = await budget_service.update_row(row_id, row_data)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Budget row with ID {row_id} not found or no changes made"
        )
    return {"message": "Budget row updated successfully"}


@router.delete("/{row_id}")
async def delete_budget_row(row_id: str):
    """Delete a budget row and all its children."""
    success = await budget_service.delete_row(row_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Budget row with ID {row_id} not found"
        )
    return {"message": "Budget row and all children deleted successfully"}


@router.post("/{row_id}/copy", status_code=status.HTTP_201_CREATED)
async def copy_budget_row(row_id: str):
    """Copy a budget row and all its children."""
    new_id = await budget_service.copy_row(row_id)
    if not new_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Budget row with ID {row_id} not found"
        )
    return {"id": new_id, "message": "Budget row copied successfully"}


@router.put("/{row_id}/monthly/{month_index}")
async def update_monthly_allocation(
    row_id: str,
    month_index: int,
    detail: MonthlyDetail
):
    """Update monthly allocation for a specific month (0-11)."""
    if month_index < 0 or month_index > 11:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Month index must be between 0 and 11"
        )
    
    success = await budget_service.update_monthly_allocation(
        row_id, month_index, detail
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Budget row with ID {row_id} not found"
        )
    return {"message": f"Monthly allocation for month {month_index} updated"}
