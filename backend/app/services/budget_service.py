from typing import List, Optional, Dict, Any
from bson import ObjectId
from app.database import get_collection
from app.models.schemas import (
    BudgetRowCreate,
    BudgetRowUpdate,
    BudgetRowResponse,
    MonthlyDetail,
    RowType,
)


class BudgetService:
    def __init__(self):
        self.collection_name = "budget_rows"

    def get_collection(self):
        return get_collection(self.collection_name)

    async def _build_tree(self, rows: List[dict], parent_id: Optional[str] = None) -> List[BudgetRowResponse]:
        """Recursively build tree structure from flat list."""
        tree = []
        for row in rows:
            if row.get("parent_id") == parent_id:
                children = await self._build_tree(rows, row["_id"])
                tree.append(BudgetRowResponse(
                    id=row["_id"],
                    code=row["code"],
                    description=row["description"],
                    type=row["type"],
                    semula=row.get("semula"),
                    menjadi=row.get("menjadi"),
                    monthlyAllocation=row.get("monthlyAllocation", {}),
                    isBlocked=row.get("isBlocked"),
                    isOpen=row.get("isOpen", True),
                    children=children
                ))
        # Sort by order
        tree.sort(key=lambda x: next(
            (r.get("order", 0) for r in rows if r["_id"] == x.id), 0
        ))
        return tree

    async def get_all_rows(self) -> List[BudgetRowResponse]:
        """Get all budget rows as tree structure."""
        collection = self.get_collection()
        cursor = collection.find({})
        rows = await cursor.to_list(length=None)
        return await self._build_tree(rows, None)

    async def get_row_by_id(self, row_id: str) -> Optional[dict]:
        """Get single budget row by ID."""
        collection = self.get_collection()
        row = await collection.find_one({"_id": row_id})
        return row

    async def _create_row_recursive(
        self,
        row_data: BudgetRowCreate,
        parent_id: Optional[str],
        order: int
    ) -> str:
        """Recursively create row and its children."""
        collection = self.get_collection()
        
        # Generate unique ID
        row_id = str(ObjectId())
        
        # Prepare document
        doc = {
            "_id": row_id,
            "code": row_data.code,
            "description": row_data.description,
            "type": row_data.type.value,
            "semula": row_data.semula.model_dump() if row_data.semula else None,
            "menjadi": row_data.menjadi.model_dump() if row_data.menjadi else None,
            "monthlyAllocation": {
                k: v.model_dump() for k, v in row_data.monthlyAllocation.items()
            } if row_data.monthlyAllocation else {},
            "isBlocked": row_data.isBlocked,
            "isOpen": row_data.isOpen,
            "parent_id": parent_id,
            "order": order
        }
        
        await collection.insert_one(doc)
        
        # Create children
        for i, child in enumerate(row_data.children):
            await self._create_row_recursive(child, row_id, i)
        
        return row_id

    async def create_row(
        self,
        row_data: BudgetRowCreate,
        parent_id: Optional[str] = None
    ) -> str:
        """Create a new budget row."""
        # Get current max order for siblings
        collection = self.get_collection()
        max_order_doc = await collection.find_one(
            {"parent_id": parent_id},
            sort=[("order", -1)]
        )
        order = (max_order_doc.get("order", -1) + 1) if max_order_doc else 0
        
        return await self._create_row_recursive(row_data, parent_id, order)

    async def update_row(self, row_id: str, row_data: BudgetRowUpdate) -> bool:
        """Update a budget row."""
        collection = self.get_collection()
        
        update_data = {}
        if row_data.code is not None:
            update_data["code"] = row_data.code
        if row_data.description is not None:
            update_data["description"] = row_data.description
        if row_data.type is not None:
            update_data["type"] = row_data.type.value
        if row_data.semula is not None:
            update_data["semula"] = row_data.semula.model_dump()
        if row_data.menjadi is not None:
            update_data["menjadi"] = row_data.menjadi.model_dump()
        if row_data.monthlyAllocation is not None:
            update_data["monthlyAllocation"] = {
                k: v.model_dump() for k, v in row_data.monthlyAllocation.items()
            }
        if row_data.isBlocked is not None:
            update_data["isBlocked"] = row_data.isBlocked
        if row_data.isOpen is not None:
            update_data["isOpen"] = row_data.isOpen
        
        if not update_data:
            return False
        
        result = await collection.update_one(
            {"_id": row_id},
            {"$set": update_data}
        )
        return result.modified_count > 0

    async def delete_row(self, row_id: str) -> bool:
        """Delete a budget row and all its children."""
        collection = self.get_collection()
        
        # Get all descendant IDs
        async def get_descendant_ids(parent_id: str) -> List[str]:
            ids = [parent_id]
            cursor = collection.find({"parent_id": parent_id})
            children = await cursor.to_list(length=None)
            for child in children:
                ids.extend(await get_descendant_ids(child["_id"]))
            return ids
        
        all_ids = await get_descendant_ids(row_id)
        result = await collection.delete_many({"_id": {"$in": all_ids}})
        return result.deleted_count > 0

    async def copy_row(self, row_id: str) -> Optional[str]:
        """Copy a row and all its children."""
        collection = self.get_collection()
        
        # Get original row
        original = await collection.find_one({"_id": row_id})
        if not original:
            return None
        
        async def copy_recursive(orig_id: str, new_parent_id: Optional[str]) -> str:
            orig = await collection.find_one({"_id": orig_id})
            new_id = str(ObjectId())
            
            # Create new document
            new_doc = {
                "_id": new_id,
                "code": orig["code"],
                "description": orig["description"],
                "type": orig["type"],
                "semula": orig.get("semula"),
                "menjadi": orig.get("menjadi"),
                "monthlyAllocation": orig.get("monthlyAllocation", {}),
                "isBlocked": orig.get("isBlocked"),
                "isOpen": orig.get("isOpen", True),
                "parent_id": new_parent_id,
                "order": orig.get("order", 0) + 1  # Place after original
            }
            await collection.insert_one(new_doc)
            
            # Copy children
            cursor = collection.find({"parent_id": orig_id})
            children = await cursor.to_list(length=None)
            for child in children:
                await copy_recursive(child["_id"], new_id)
            
            return new_id
        
        return await copy_recursive(row_id, original.get("parent_id"))

    async def add_child_row(self, parent_id: str, row_data: BudgetRowCreate) -> Optional[str]:
        """Add a child row to a parent."""
        # Verify parent exists
        parent = await self.get_row_by_id(parent_id)
        if not parent:
            return None
        
        return await self.create_row(row_data, parent_id)

    async def update_monthly_allocation(
        self,
        row_id: str,
        month_index: int,
        detail: MonthlyDetail
    ) -> bool:
        """Update monthly allocation for a specific month."""
        collection = self.get_collection()
        result = await collection.update_one(
            {"_id": row_id},
            {"$set": {f"monthlyAllocation.{month_index}": detail.model_dump()}}
        )
        return result.modified_count > 0


budget_service = BudgetService()
