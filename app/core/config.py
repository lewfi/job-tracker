from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")
    DATABASE_URL: str = "postgresql://postgres:JOBTRACK101@db:5432/job_tracker"

settings = Settings()