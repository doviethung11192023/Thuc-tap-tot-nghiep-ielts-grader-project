from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.schemas.exam_content import SkillType

class BandConversionCreate(BaseModel):
    skill: SkillType
    raw_min: int = Field(..., ge=0, le=40)
    raw_max: int = Field(..., ge=0, le=40)
    band: float = Field(..., ge=0.0, le=9.0)

class BandConversionResponse(BandConversionCreate):
    id: str

class SystemSettingCreate(BaseModel):
    key: str = Field(..., min_length=2, max_length=100)
    value: Dict[str, Any]
    description: Optional[str] = None

class SystemSettingUpdate(BaseModel):
    value: Dict[str, Any]
    description: Optional[str] = None

class SystemSettingResponse(BaseModel):
    key: str
    value: Dict[str, Any]
    description: Optional[str] = None
    updated_at: datetime
    updated_by: Optional[str] = None

# Crawled Dataset Ingestion Schemas
class ScannedTestItem(BaseModel):
    id: str
    title: str
    skill: str
    category: str = ""
    folder: str = ""
    path: str
    is_imported: bool = False
    duration_min: int = 60

class CrawledDatasetIngestRequest(BaseModel):
    dataset_path: Optional[str] = None
    include_reading_listening: bool = True
    include_writing: bool = True
    include_speaking: bool = True
    test_limit: Optional[int] = None
    only_pending: bool = True
    selected_tests: Optional[List[Dict[str, Any]]] = None

class CrawledDatasetIngestResponse(BaseModel):
    success: bool
    message: str
    test_sets_created: int = 0
    tests_created: int = 0
    tests_skipped_existing: int = 0
    sections_created: int = 0
    question_groups_created: int = 0
    questions_created: int = 0
    topics_created: int = 0
    errors: List[str] = []

class SkillScanSummary(BaseModel):
    total: int = 0
    imported: int = 0
    pending: int = 0

class DatasetScanResponse(BaseModel):
    total_found: int = 0
    total_imported: int = 0
    total_pending: int = 0
    by_skill: Dict[str, SkillScanSummary] = {}
    pending_samples: List[Dict[str, Any]] = []
    tests: List[ScannedTestItem] = []
