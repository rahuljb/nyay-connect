import uuid
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    Text,
    ForeignKey,
    DateTime,
    Table,
    JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

# Association table for Advocate <-> Specialization (Many-to-Many)
advocate_specialization = Table(
    "advocate_specialization",
    Base.metadata,
    Column(
        "advocate_id",
        String,
        ForeignKey("advocates.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "specialization_id",
        String,
        ForeignKey("specializations.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    role = Column(String, nullable=False, default="citizen")  # citizen, advocate, admin
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    advocate_profile = relationship(
        "Advocate", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    consultations = relationship(
        "Consultation",
        back_populates="citizen",
        foreign_keys="[Consultation.user_id]",
    )


class Advocate(Base):
    __tablename__ = "advocates"

    id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    enrollment_number = Column(String, unique=True, nullable=False)
    state_bar_council = Column(String, nullable=False)
    experience_years = Column(Integer, nullable=False)
    city = Column(String, index=True, nullable=False)
    state = Column(String, nullable=False)
    bio = Column(Text, nullable=True)
    languages = Column(JSON, nullable=True, default=list)  # list of strings
    courts = Column(JSON, nullable=True, default=list)  # list of strings
    verified = Column(Boolean, default=False)
    premium = Column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="advocate_profile")
    specializations = relationship(
        "Specialization",
        secondary=advocate_specialization,
        back_populates="advocates",
    )
    consultations = relationship(
        "Consultation",
        back_populates="advocate",
        foreign_keys="[Consultation.advocate_id]",
    )


class Specialization(Base):
    __tablename__ = "specializations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, nullable=False)

    # Relationships
    advocates = relationship(
        "Advocate",
        secondary=advocate_specialization,
        back_populates="specializations",
    )


class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    advocate_id = Column(
        String, ForeignKey("advocates.id", ondelete="CASCADE"), nullable=False
    )
    issue_summary = Column(Text, nullable=False)
    status = Column(
        String, nullable=False, default="pending"
    )  # pending, accepted, declined, completed
    appointment_date = Column(DateTime(timezone=True), nullable=True)
    meeting_link = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


    # Relationships
    citizen = relationship(
        "User", back_populates="consultations", foreign_keys=[user_id]
    )
    advocate = relationship(
        "Advocate", back_populates="consultations", foreign_keys=[advocate_id]
    )
