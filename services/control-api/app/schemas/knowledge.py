from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

KnowledgeKind = Literal["web", "arquivo", "interna", "integração"]
ResearchStatus = Literal["rascunho", "em andamento", "concluído"]


class KnowledgeMaterialCreate(BaseModel):
    title: str = Field(min_length=1, max_length=220)
    kind: KnowledgeKind = "arquivo"
    url: str | None = Field(default=None, max_length=1000)
    excerpt: str = ""
    confidence: float = Field(default=1.0, ge=0, le=1)
    project_id: str | None = None
    report_id: str | None = None
    source_type: str | None = Field(default=None, max_length=80)
    source_product: str | None = Field(default="orbeAI", max_length=80)
    source_entity_id: str | None = Field(default=None, max_length=120)
    meta: dict[str, Any] | None = None


class KnowledgeMaterialUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=220)
    kind: KnowledgeKind | None = None
    url: str | None = Field(default=None, max_length=1000)
    excerpt: str | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    project_id: str | None = None
    report_id: str | None = None
    source_type: str | None = Field(default=None, max_length=80)
    source_product: str | None = Field(default=None, max_length=80)
    source_entity_id: str | None = Field(default=None, max_length=120)
    meta: dict[str, Any] | None = None


class KnowledgeMaterialRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    project_id: str | None
    report_id: str | None
    title: str
    kind: KnowledgeKind
    url: str | None
    excerpt: str
    confidence: float
    source_type: str | None
    source_product: str | None
    source_entity_id: str | None
    meta: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime


class ResearchReportCreate(BaseModel):
    question: str = Field(min_length=2)
    project_id: str | None = None
    status: ResearchStatus = "rascunho"
    plan: list[str] | None = None
    summary: str = ""
    risks: list[str] = []


class ResearchReportUpdate(BaseModel):
    question: str | None = Field(default=None, min_length=2)
    project_id: str | None = None
    status: ResearchStatus | None = None
    plan: list[str] | None = None
    summary: str | None = None
    risks: list[str] | None = None


class ResearchReportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    project_id: str | None
    question: str
    status: ResearchStatus
    plan: list[str]
    summary: str
    risks: list[str]
    created_at: datetime
    updated_at: datetime
    sources: list[KnowledgeMaterialRead] = []
