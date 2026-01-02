from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.database import get_collection
from app.auth.security import verify_password, create_access_token, get_password_hash, oauth2_scheme, SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from app.models.user_models import UserResponse, Token, UserRole
from datetime import timedelta
from jose import JWTError, jwt

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# @router.post("/setup", status_code=201)
# async def setup_default_users():
#     """
#     Setup atau Reset user default.
#     Menggunakan upsert=True untuk memperbaiki data user jika password rusak/hash salah.
#     """
#     collection = get_collection("users")
    
#     users = [
#         {
#             "username": "ppk_user",
#             "full_name": "Budi Santoso (PPK)",
#             "role": UserRole.PPK.value,
#             "password": "ppk123"
#         },
#         {
#             "username": "operator_user",
#             "full_name": "Siti Aminah (Operator)",
#             "role": UserRole.OPERATOR.value,
#             "password": "operator123"
#         }
#     ]

#     for user_data in users:
#         hashed = get_password_hash(user_data["password"])
#         # Update user jika ada, Insert jika belum ada (Upsert)
#         # Ini akan menimpa password lama dengan hash yang valid
#         await collection.update_one(
#             {"username": user_data["username"]},
#             {
#                 "$set": {
#                     "full_name": user_data["full_name"],
#                     "role": user_data["role"],
#                     "hashed_password": hashed
#                 }
#             },
#             upsert=True
#         )
    
#     return {"message": "Default users setup/repaired successfully"}

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    collection = get_collection("users")
    user = await collection.find_one({"username": form_data.username})
    
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"]}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user["role"],
        "full_name": user["full_name"]
    }

@router.get("/me", response_model=UserResponse)
async def read_users_me(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    collection = get_collection("users")
    user = await collection.find_one({"username": username})
    if user is None:
        raise credentials_exception
    
    user_id = str(user.pop("_id"))
    
    return UserResponse(id=user_id, **user)
