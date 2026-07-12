from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime

class UserCreate(BaseModel):
    email: str
    password: str = Field(min_length=8)

class UserLogin(BaseModel):
    email: str
    password: str

class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str
