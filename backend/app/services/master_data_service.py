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
        self._indexes_initialized = False

    def get_collection(self):
        return get_collection(self.collection_name)

    async def _ensure_indexes(self):
        """
        Memastikan index unik pada (type, code) memiliki pengecualian untuk COMPONENT.
        Jika index lama yang ketat (strict) ditemukan, index tersebut akan dihapus dan dibuat ulang.
        """
        if self._indexes_initialized:
            return

        collection = self.get_collection()
        try:
            indexes = await collection.index_information()
            
            # Cek jika index lama 'type_1_code_1' sudah ada
            if "type_1_code_1" in indexes:
                index_info = indexes["type_1_code_1"]
                # Jika index tersebut tidak memiliki partialFilterExpression, berarti itu index lama yang strict
                # Kita harus menghapusnya agar bisa membuat yang baru
                if "partialFilterExpression" not in index_info:
                    print("Dropping strict unique index 'type_1_code_1' to allow COMPONENT duplicates...")
                    await collection.drop_index("type_1_code_1")
            
            # Buat index baru: Unik (type, code) HANYA JIKA type != COMPONENT
            # Ini mengizinkan duplikat code khusus untuk COMPONENT
            await collection.create_index(
                [("type", 1), ("code", 1)],
                unique=True,
                partialFilterExpression={"type": {"$ne": "COMPONENT"}},
                name="type_1_code_1"
            )
            self._indexes_initialized = True
        except Exception as e:
            # Log error tapi jangan hentikan aplikasi
            print(f"Warning: Failed to initialize indexes: {e}")

    async def get_all(self) -> Dict[str, List[MasterDataItem]]:
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
        collection = self.get_collection()
        cursor = collection.find({"type": row_type.value})
        items = await cursor.to_list(length=None)
        
        return [
            MasterDataItem(code=item["code"], desc=item["desc"])
            for item in items
        ]

    async def create(self, data: MasterDataCreate) -> str:
        # Pastikan index sudah benar sebelum insert
        await self._ensure_indexes()
        
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

    async def delete(self, row_type: RowType, code: str, desc: Optional[str] = None) -> bool:
        """
        Menghapus data master. Jika desc diberikan, pencocokan dilakukan dengan desc juga 
        (penting untuk menghapus item COMPONENT yang kodenya kembar).
        """
        collection = self.get_collection()
        query = {
            "type": row_type.value,
            "code": code
        }
        if desc:
            query["desc"] = desc
            
        result = await collection.delete_one(query)
        return result.deleted_count > 0

    async def update(
        self,
        row_type: RowType,
        code: str,
        new_desc: str,
        current_desc: Optional[str] = None
    ) -> bool:
        """
        Update deskripsi. Jika current_desc diberikan, digunakan untuk identifikasi record spesifik
        (penting untuk update item COMPONENT yang kodenya kembar).
        """
        collection = self.get_collection()
        query = {"type": row_type.value, "code": code}
        
        # Jika ada current_desc (dari frontend), gunakan agar tidak salah update record lain yang kodenya sama
        if current_desc:
            query["desc"] = current_desc
            
        result = await collection.update_one(
            query,
            {"$set": {"desc": new_desc}}
        )
        return result.modified_count > 0

    async def bulk_create(self, items: List[MasterDataCreate]) -> int:
        if not items:
            return 0
        
        await self._ensure_indexes()
        
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
        await self._ensure_indexes()
        
        collection = self.get_collection()
        counts = {}
        
        for type_key, items in data.items():
            await collection.delete_many({"type": type_key})
            
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