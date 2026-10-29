from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
from enum import Enum

class SkillType(str, Enum):
    LISTENING = "listening"
    READING = "reading"
    WRITING = "writing"
    SPEAKING = "speaking"

class AllowedMode(str, Enum):
    PRACTICE = "practice"
    MOCK = "mock"
    BOTH = "both"

class ContentStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class ContentOrigin(str, Enum):
    MANUAL = "manual"
    AI_GENERATED = "ai_generated"
    OPEN_LICENSE = "open_license"

class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE_NOT_GIVEN = "true_false_not_given"
    MATCHING = "matching"
    COMPLETION = "completion"
    SHORT_ANSWER = "short_answer"
    WRITING_TASK1 = "writing_task1"
    WRITING_TASK2 = "writing_task2"
    SPEAKING_PART1 = "speaking_part1"
    SPEAKING_PART2 = "speaking_part2"
    SPEAKING_PART3 = "speaking_part3"

# --- Test Sets ---
class TestSetCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)

class TestSetResponse(BaseModel):
    id: str
    name: str
    created_by: Optional[str] = None
    created_at: datetime

# --- Tests ---
class TestCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=300)
    skill: SkillType
    test_set_id: Optional[str] = None
    allowed_mode: AllowedMode = AllowedMode.BOTH
    status: ContentStatus = ContentStatus.DRAFT
    duration_min: Optional[int] = Field(None, gt=0)
    difficulty: Optional[str] = "medium"
    origin: ContentOrigin = ContentOrigin.MANUAL
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    license: Optional[str] = None

class TestUpdate(BaseModel):
    title: Optional[str] = None
    test_set_id: Optional[str] = None
    allowed_mode: Optional[AllowedMode] = None
    status: Optional[ContentStatus] = None
    duration_min: Optional[int] = None
    difficulty: Optional[str] = None
    origin: Optional[ContentOrigin] = None
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    license: Optional[str] = None

class TestStatusUpdate(BaseModel):
    status: ContentStatus

class TestResponse(BaseModel):
    id: str
    test_set_id: Optional[str] = None
    title: str
    skill: SkillType
    allowed_mode: AllowedMode
    status: ContentStatus
    version: int
    duration_min: Optional[int] = None
    difficulty: Optional[str] = "medium"
    origin: ContentOrigin
    source_name: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime

# --- Sections ---
class TestSectionCreate(BaseModel):
    order_no: int
    title: Optional[str] = None
    passage_text: Optional[str] = None
    audio_key: Optional[str] = None
    audio_script: Optional[Dict[str, Any]] = None
    transcript: Optional[str] = None
    topic_id: Optional[str] = None

class TestSectionUpdate(BaseModel):
    order_no: Optional[int] = None
    title: Optional[str] = None
    passage_text: Optional[str] = None
    audio_key: Optional[str] = None
    audio_script: Optional[Dict[str, Any]] = None
    transcript: Optional[str] = None
    topic_id: Optional[str] = None

class TestSectionResponse(TestSectionCreate):
    id: str
    test_id: str

# --- Question Groups & Questions ---
class AnswerKeyCreate(BaseModel):
    accepted_answers: List[str]
    explanation: Optional[str] = None
    evidence: Optional[str] = None

class AnswerKeyResponse(AnswerKeyCreate):
    question_id: str

class QuestionCreate(BaseModel):
    number: int
    prompt: Optional[str] = None
    options: Optional[List[Any]] = None
    max_words: Optional[int] = None
    prompt_audio_key: Optional[str] = None
    prep_time_sec: Optional[int] = None
    answer_time_sec: Optional[int] = None
    answer_key: Optional[AnswerKeyCreate] = None

class QuestionResponse(BaseModel):
    id: str
    group_id: str
    number: int
    prompt: Optional[str] = None
    options: Optional[List[Any]] = None
    max_words: Optional[int] = None
    prompt_audio_key: Optional[str] = None
    prep_time_sec: Optional[int] = None
    answer_time_sec: Optional[int] = None
    answer_key: Optional[AnswerKeyResponse] = None

class QuestionGroupCreate(BaseModel):
    order_no: int
    question_type: QuestionType
    question_subtype: Optional[str] = None
    instructions: Optional[str] = None
    image_key: Optional[str] = None
    content: Optional[Dict[str, Any]] = None
    questions: Optional[List[QuestionCreate]] = None

class QuestionGroupResponse(BaseModel):
    id: str
    section_id: str
    order_no: int
    question_type: QuestionType
    question_subtype: Optional[str] = None
    instructions: Optional[str] = None
    image_key: Optional[str] = None
    content: Optional[Dict[str, Any]] = None
    questions: Optional[List[QuestionResponse]] = None
