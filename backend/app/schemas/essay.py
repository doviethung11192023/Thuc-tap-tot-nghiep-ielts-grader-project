from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime

class EssayCreate(BaseModel):
    topic_id: Optional[str] = None
    content: str
    task_type: Optional[str] = None

    @validator('content')
    def validate_content_length(cls, v):
        if len(v.split()) < 50:
            raise ValueError('Essay is too short. Minimum requirement is 50 words.')
        return v
    
    @validator('task_type')
    def validate_task_type(cls, v, values):
        if not values.get('topic_id') and not v:
            raise ValueError('task_type is required if topic_id is not provided')
        if v and v not in ['task1', 'task2']:
            raise ValueError('task_type must be task1 or task2')
        return v

class GrammarError(BaseModel):
    error_type: str
    original_text: str
    corrected_text: str
    explanation: str
    position_start: int
    position_end: int
    severity: str

class EvaluationResultDetail(BaseModel):
    overall_band: float
    task_response_score: float
    coherence_cohesion_score: float
    lexical_resource_score: float
    grammar_accuracy_score: float
    overall_feedback: str
    tr_feedback: str
    cc_feedback: str
    lr_feedback: str
    gra_feedback: str
    improvement_suggestions: str
    is_score_overridden: bool

class EssayDetail(BaseModel):
    id: str
    content: str
    word_count: int
    status: str
    evaluated_at: Optional[datetime] = None

class EvaluationResponse(BaseModel):
    essay: EssayDetail
    result: Optional[EvaluationResultDetail] = None
    grammar_errors: Optional[List[GrammarError]] = None
    trace_info: Optional[dict] = None
