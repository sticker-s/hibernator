from sqlalchemy import Column, String, Float, ForeignKey, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from pgvector.sqlalchemy import Vector
from app.core.database import Base

class Candidate(Base):
    __tablename__ = "candidates"
    id = Column(String, primary_key=True)
    full_name = Column(String, nullable=True)
    primary_email = Column(String, nullable=True, index=True)
    location = Column(String, nullable=True)
    current_org = Column(String, nullable=True)

    craftsmanship_score = Column(Float, default=0.0)
    hibernation_index = Column(Float, default=0.0)

    created_at = Column(DateTime, default=datetime.utcnow)

    identities = relationship("Identity", back_populates="candidate", cascade="all, delete-orphan")
    artifacts = relationship("TechnicalArtifact", back_populates="candidate", cascade="all, delete-orphan")

class Identity(Base):
    __tablename__ = "identities"

    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    platform = Column(String, nullable=False)
    handle = Column(String, nullable=False)
    profile_url = Column(String, nullable=True)

    candidate = relationship("Candidate", back_populates="identities")

class TechnicalArtifact(Base):
    __tablename__ = "technical_artifacts"

    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=True)
    artifact_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    url = Column(String, nullable=True)

    embedding = Column(Vector(384), nullable=True)

    raw_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="artifacts")
    
class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    target_role = Column(String, nullable=False)
    tone_profile = Column(String, default="engineer-to-engineer")
    created_at = Column(DateTime, default=datetime.utcnow)

class OutreachLog(Base):
    __tablename__ = "outreach_logs"

    id = Column(String, primary_key=True)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    status = Column(String, default="drafted")
    email_subject = Column(String, nullable=True)
    email_body = Column(Text, nullable=True)
    sent_at = Column(DateTime, nullable=True)

    
    

