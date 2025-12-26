from typing import List, Dict, Optional
from bson import ObjectId
from app.database import get_collection
from app.models.schemas import (
    MasterDataItem,
    MasterDataCreate,
    MasterDataDocument,
    MasterDataResponse,
    RowType,
)


class MasterDataService:
    def __init__(self):
        self.collection_name = "master_data"

    def get_collection(self):
        return get_collection(self.collection_name)

    async def get_all(self) -> Dict[str, List[MasterDataItem]]:
        """Get all master data grouped by type."""
        collection = self.get_collection()
        cursor = collection.find({})
        items = await cursor.to_list(length=None)
        
        result = {}
        for item in items:
            type_key = item["type"]
            if type_key not in result:
                result[type_key] = []
            result[type_key].append(MasterDataItem(
                code=item["code"],
                desc=item["desc"]
            ))
        
        return result

    async def get_by_type(self, row_type: RowType) -> List[MasterDataItem]:
        """Get master data by type."""
        collection = self.get_collection()
        cursor = collection.find({"type": row_type.value})
        items = await cursor.to_list(length=None)
        
        return [
            MasterDataItem(code=item["code"], desc=item["desc"])
            for item in items
        ]

    async def create(self, data: MasterDataCreate) -> str:
        """Create new master data item."""
        collection = self.get_collection()
        doc_id = str(ObjectId())
        doc = {
            "_id": doc_id,
            "type": data.type.value,
            "code": data.code,
            "desc": data.desc
        }
        await collection.insert_one(doc)
        return doc_id

    async def delete(self, row_type: RowType, code: str) -> bool:
        """Delete master data item by type and code."""
        collection = self.get_collection()
        result = await collection.delete_one({
            "type": row_type.value,
            "code": code
        })
        return result.deleted_count > 0

    async def update(
        self,
        row_type: RowType,
        code: str,
        new_desc: str
    ) -> bool:
        """Update master data description."""
        collection = self.get_collection()
        result = await collection.update_one(
            {"type": row_type.value, "code": code},
            {"$set": {"desc": new_desc}}
        )
        return result.modified_count > 0

    async def bulk_create(self, items: List[MasterDataCreate]) -> int:
        """Bulk create master data items."""
        if not items:
            return 0
        
        collection = self.get_collection()
        docs = [
            {
                "_id": str(ObjectId()),
                "type": item.type.value,
                "code": item.code,
                "desc": item.desc
            }
            for item in items
        ]
        result = await collection.insert_many(docs)
        return len(result.inserted_ids)

    async def sync_all(self, data: Dict[str, List[MasterDataItem]]) -> Dict[str, int]:
        """
        Sync all master data - delete existing and insert new.
        Accepts format: { "KRO": [{code, desc}, ...], "RO": [...], ... }
        """
        collection = self.get_collection()
        counts = {}
        
        for type_key, items in data.items():
            # Delete existing items of this type
            await collection.delete_many({"type": type_key})
            
            # Insert new items
            if items:
                docs = [
                    {
                        "_id": str(ObjectId()),
                        "type": type_key,
                        "code": item.code,
                        "desc": item.desc
                    }
                    for item in items
                ]
                result = await collection.insert_many(docs)
                counts[type_key] = len(result.inserted_ids)
            else:
                counts[type_key] = 0
        
        return counts


master_data_service = MasterDataService()
