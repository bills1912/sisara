from typing import List, Optional
from bson import ObjectId
from datetime import datetime
from app.database import get_collection
from app.models.schemas import RevisionCreate, RevisionResponse, RevisionDetailResponse

class RevisionService:
    def __init__(self):
        self.collection_name = "revisions"

    def get_collection(self):
        return get_collection(self.collection_name)

    async def create_revision(self, note: str, data: List[dict]) -> str:
        collection = self.get_collection()
        doc = {
            "note": note,
            "timestamp": datetime.now(),
            "data": data # Simpan full JSON tree
        }
        result = await collection.insert_one(doc)
        return str(result.inserted_id)

    async def get_all_revisions(self) -> List[RevisionResponse]:
        collection = self.get_collection()
        # Projection: exclude 'data' field for lighter list response
        cursor = collection.find({}, {"data": 0}).sort("timestamp", -1)
        rows = await cursor.to_list(length=None)
        return [
            RevisionResponse(
                id=str(row["_id"]),
                note=row["note"],
                timestamp=row["timestamp"]
            ) for row in rows
        ]

    async def get_revision_by_id(self, rev_id: str) -> Optional[RevisionDetailResponse]:
        collection = self.get_collection()
        row = await collection.find_one({"_id": ObjectId(rev_id)})
        if not row:
            return None
        return RevisionDetailResponse(
            id=str(row["_id"]),
            note=row["note"],
            timestamp=row["timestamp"],
            data=row["data"]
        )

    async def delete_revision(self, rev_id: str) -> bool:
        collection = self.get_collection()
        # Menghapus dokumen berdasarkan _id
        result = await collection.delete_one({"_id": ObjectId(rev_id)})
        # Mengembalikan True jika ada data yang terhapus (count > 0)
        return result.deleted_count > 0

revision_service = RevisionService()
