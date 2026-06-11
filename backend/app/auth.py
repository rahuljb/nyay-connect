import os
import bcrypt
from datetime import datetime, timedelta

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from .database import get_db
from . import models, schemas

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-nyay-connect-key-for-mvp-123456789")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours for development ease

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    plain_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(plain_bytes, hashed_bytes)



def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("email")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(
            email=email,
            role=payload.get("role"),
            user_id=payload.get("user_id"),
        )
    except JWTError:
        raise credentials_exception

    user = (
        db.query(models.User)
        .filter(models.User.email == token_data.email)
        .first()
    )
    if user is None:
        raise credentials_exception
    return user


def get_current_advocate(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> models.Advocate:
    if current_user.role != "advocate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not registered as an advocate",
        )
    advocate = (
        db.query(models.Advocate)
        .filter(models.Advocate.id == current_user.id)
        .first()
    )
    if not advocate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Advocate profile not found",
        )
    return advocate


def get_current_admin(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation restricted to admin users",
        )
    return current_user
