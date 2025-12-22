import os
import httpx
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from . import models, schemas, crud
from .database import get_db

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
# Use pbkdf2_sha256 for broader compatibility on Windows without native bcrypt build.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:5173/auth/google/callback")

security = HTTPBearer()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise JWTError()
        return user_id
    except JWTError:
        return None

# Google functions are defined below.

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> models.User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not credentials:
        raise credentials_exception
    
    user_id = verify_token(credentials.credentials)
    if user_id is None:
        raise credentials_exception
    
    user = crud.get_user(db, user_id=user_id)
    if user is None:
        raise credentials_exception
    
    return user

def get_current_active_user(
    current_user: models.User = Depends(get_current_user)
) -> models.User:
    """Get current active user (add any additional checks here if needed)"""
    return current_user

def user_owns_project(user: models.User, project: models.Project) -> bool:
    """Check if user owns the project"""
    return project.owner_id == user.id

# POTENTIALLY UNUSED: This function is defined but never used.
def user_can_access_file(user: models.User, file: models.UploadedFile) -> bool:
    """Check if user can access the file (through project ownership)"""
    return file.project.owner_id == user.id

# Password hashing functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password.encode('utf-8')[:72], hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password.encode('utf-8')[:72])

def authenticate_user(db: Session, email: str, password: str) -> Optional[models.User]:
    """Authenticate user with email and password"""
    user = crud.get_user_by_email(db, email)
    if not user:
        return None
    if not user.password_hash:
        return None  # User registered via OAuth, no password set
    if not verify_password(password, user.password_hash):
        return None
    return user

# Google OAuth functions
def get_google_auth_url():
    """Generate Google OAuth authorization URL"""
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent"
    }
    
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    return f"https://accounts.google.com/o/oauth2/auth?{query_string}"

async def exchange_google_code_for_token(code: str) -> Optional[str]:
    """Exchange Google authorization code for access token"""
    data = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": code,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post("https://oauth2.googleapis.com/token", data=data)
            if response.status_code == 200:
                token_data = response.json()
                return token_data.get("access_token")
        except Exception as e:
            print(f"Error exchanging Google code for token: {e}")
            return None
    
    return None

async def get_google_user_info(access_token: str) -> Optional[schemas.GoogleUserInfo]:
    """Get user information from Google API"""
    headers = {"Authorization": f"Bearer {access_token}"}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("https://www.googleapis.com/oauth2/v2/userinfo", headers=headers)
            if response.status_code == 200:
                user_data = response.json()
                return schemas.GoogleUserInfo(
                    id=user_data.get("id"),
                    email=user_data.get("email", ""),
                    name=user_data.get("name", ""),
                    picture=user_data.get("picture")
                )
        except Exception as e:
            print(f"Error getting Google user info: {e}")
            return None
    
    return None
