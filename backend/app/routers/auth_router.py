from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.database import get_collection
from app.auth.security import verify_password, create_access_token, get_password_hash, oauth2_scheme
from app.models.user_models import UserCreate, UserResponse, Token, UserInDB, UserRole
from datetime import timedelta
from jose import JWTError, jwt
from app.auth.security import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

async def get_current_user(token: str = Depends(oauth2_scheme)):
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
    return UserResponse(id=str(user["_id"]), **user)

@router.post("/setup", status_code=201)
async def setup_default_users():
    """Endpoint untuk membuat user default awal (Jalankan sekali saja)"""
    collection = get_collection("users")
    
    # Cek jika user sudah ada
    if await collection.count_documents({}) > 0:
        return {"message": "Users already exist"}

    users = [
        {
            "username": "ppk_user",
            "full_name": "Budi Santoso (PPK)",
            "role": UserRole.PPK.value,
            "hashed_password": get_password_hash("ppk123")
        },
        {
            "username": "operator_user",
            "full_name": "Siti Aminah (Operator)",
            "role": UserRole.OPERATOR.value,
            "hashed_password": get_password_hash("operator123")
        }
    ]
    await collection.insert_many(users)
    return {"message": "Default users created: ppk_user/ppk123, operator_user/operator123"}

@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
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
async def read_users_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user