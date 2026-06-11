from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime


# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[str] = None


# Specialization schemas
class SpecializationBase(BaseModel):
    name: str


class SpecializationCreate(SpecializationBase):
    pass


class SpecializationResponse(SpecializationBase):
    id: str

    class Config:
        from_attributes = True


# User schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    role: str = Field(..., description="Role must be either 'citizen' or 'advocate'")


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# Advocate schemas
class AdvocateBase(BaseModel):
    enrollment_number: str
    state_bar_council: str
    experience_years: int
    city: str
    state: str
    bio: Optional[str] = None
    languages: List[str] = []
    courts: List[str] = []


class AdvocateCreate(AdvocateBase):
    specialization_ids: List[str] = []


class AdvocateProfileUpdate(BaseModel):
    state_bar_council: Optional[str] = None
    experience_years: Optional[int] = None
    city: Optional[str] = None
    state: Optional[str] = None
    bio: Optional[str] = None
    languages: Optional[List[str]] = None
    courts: Optional[List[str]] = None
    specialization_ids: Optional[List[str]] = None


class AdvocateResponse(AdvocateBase):
    id: str
    verified: bool
    premium: bool
    user: UserResponse
    specializations: List[SpecializationResponse] = []

    class Config:
        from_attributes = True


# Detail/Brief Advocate Response for search lists
class AdvocateSearchResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    experience_years: int
    city: str
    state: str
    languages: List[str]
    courts: List[str]
    verified: bool
    premium: bool
    specializations: List[str]

    class Config:
        from_attributes = True


# Consultation schemas
class ConsultationBase(BaseModel):
    advocate_id: str
    issue_summary: str


class ConsultationCreate(ConsultationBase):
    pass


class ConsultationStatusUpdate(BaseModel):
    status: str = Field(..., description="Status can be: pending, accepted, declined, completed")
    appointment_date: Optional[datetime] = None
    meeting_link: Optional[str] = None


class ConsultationResponse(BaseModel):
    id: str
    user_id: str
    advocate_id: str
    issue_summary: str
    status: str
    appointment_date: Optional[datetime] = None
    meeting_link: Optional[str] = None
    created_at: datetime
    citizen_name: Optional[str] = None
    advocate_name: Optional[str] = None


    class Config:
        from_attributes = True
