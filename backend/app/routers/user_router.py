from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.database import get_collection
from app.auth.security import get_password_hash, oauth2_scheme
from app.models.user_models import UserResponse, UserCreate, UserUpdate, UserRole
from app.routers.auth import read_users_me # Reuse fungsi auth untuk validasi token

router = APIRouter(prefix="/api/users", tags=["User Management"])

# --- DEPENDENCY: CEK ROLE PPK ---
async def get_current_ppk_user(current_user: UserResponse = Depends(read_users_me)):
    """Memastikan hanya user dengan role PPK yang bisa akses"""
    if current_user.role != UserRole.PPK:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Hanya PPK yang dapat mengelola pengguna."
        )
    return current_user

# --- GET ALL USERS ---
@router.get("", response_model=List[UserResponse])
async def get_all_users(current_user: UserResponse = Depends(read_users_me)):
    # Semua user yang login (PPK/Operator) boleh melihat list user (opsional, bisa dibatasi ke PPK saja)
    collection = get_collection("users")
    users_cursor = collection.find({})
    users = await users_cursor.to_list(length=100)
    
    # Mapping _id ObjectId ke string dilakukan otomatis oleh Pydantic UserResponse
    return [UserResponse(id=str(user["_id"]), **user) for user in users]

# --- CREATE USER ---
@router.post("", response_model=UserResponse)
async def create_user(user: UserCreate, current_user: UserResponse = Depends(get_current_ppk_user)):
    collection = get_collection("users")
    
    # Cek username unik
    existing_user = await collection.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username sudah digunakan")
    
    # Hash Password
    hashed_password = get_password_hash(user.password)
    
    user_dict = user.dict()
    del user_dict["password"] # Hapus plain password
    user_dict["hashed_password"] = hashed_password
    
    # Insert ke MongoDB
    result = await collection.insert_one(user_dict)
    
    # Return response
    created_user = await collection.find_one({"_id": result.inserted_id})
    return UserResponse(id=str(created_user["_id"]), **created_user)

# --- UPDATE USER ---
@router.put("/{username}", response_model=UserResponse)
async def update_user(
    username: str, 
    user_update: UserUpdate, 
    current_user: UserResponse = Depends(get_current_ppk_user)
):
    collection = get_collection("users")
    
    # Cek user exists
    user_in_db = await collection.find_one({"username": username})
    if not user_in_db:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    update_data = {}
    
    if user_update.full_name:
        update_data["full_name"] = user_update.full_name
    if user_update.role:
        update_data["role"] = user_update.role
    if user_update.password:
        # Jika password diisi, hash ulang
        update_data["hashed_password"] = get_password_hash(user_update.password)
        
    if not update_data:
        raise HTTPException(status_code=400, detail="Tidak ada data yang diubah")
        
    await collection.update_one({"username": username}, {"$set": update_data})
    
    updated_user = await collection.find_one({"username": username})
    return UserResponse(id=str(updated_user["_id"]), **updated_user)

# --- DELETE USER ---
@router.delete("/{username}")
async def delete_user(username: str, current_user: UserResponse = Depends(get_current_ppk_user)):
    collection = get_collection("users")
    
    # Mencegah hapus diri sendiri
    if username == current_user.username:
        raise HTTPException(status_code=400, detail="Tidak dapat menghapus akun sendiri saat sedang login")
        
    result = await collection.delete_one({"username": username})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
        
    return {"message": f"User {username} berhasil dihapus"}