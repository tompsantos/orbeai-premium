from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ArtifactCreate(BaseModel):
    title: str = Field(min_length=2, max_length=220)
    kind: str = Field(default="documento", max_length=80)
    content: str = ""
    project_id: str | None = None
    source_type: str | None = Field(default=None, max_length=80)
    source_product: str | None = Field(default=None, max_length=80)
    source_entity_id: str | None = Field(default=None, max_length=120)


class ArtifactUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=220)
    kind: str | None = Field(default=None, max_length=80)
    status: str | None = Field(default=None, max_length=40)
    project_id: str | None = None
    source_type: str | None = Field(default=None, max_length=80)
    source_product: str | None = Field(default=None, max_length=80)
    source_entity_id: str | None = Field(default=None, max_length=120)


class ArtifactVersionCreate(BaseModel):
    content: str
    note: str | None = Field(default="Edição", max_length=160)


class ArtifactVersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    artifact_id: str
    version_number: int
    content: str
    created_at: datetime


class ArtifactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    project_id: str | None
    title: str
    kind: str
    status: str
    source_type: str | None
    source_product: str | None
    source_entity_id: str | None
    created_at: datetime
    updated_at: datetime
    versions: list[ArtifactVersionRead] = []

class ArtifactExportRead(BaseModel):
    artifact_id: str
    title: str
    kind: str
    version_number: int
    content: str
    exported_at: datetime

