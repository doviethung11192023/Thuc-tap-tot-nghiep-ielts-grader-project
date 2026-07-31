from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TopicCreate(BaseModel):
    title: str
    description: str
    prompt_content: str
    task_type: str
    difficulty: str
    category: str

class TopicUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    prompt_content: Optional[str] = None
    task_type: Optional[str] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None

class TopicResponse(TopicCreate):
    id: str
    is_active: bool
    created_by: str
    created_at: datetime
