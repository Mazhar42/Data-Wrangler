from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

# Determine the environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Load the corresponding .env file
if ENVIRONMENT == "production":
    dotenv_path = ".env.production"
else:
    dotenv_path = ".env.development"

load_dotenv(dotenv_path=dotenv_path)

db_url = os.getenv("DATABASE_URL")
print(f"Loaded DATABASE_URL for {ENVIRONMENT} environment: {db_url}")
if not db_url:
    print("DATABASE_URL is not set or is empty, falling back to local SQLite.")
    if ENVIRONMENT == "development":
        db_url = "sqlite:///./data_cleansing_dev.db"
    else:
        db_url = "sqlite:///./data_cleansing.db"


SQLALCHEMY_DATABASE_URL = db_url
print(f"Attempting to connect with URL: {SQLALCHEMY_DATABASE_URL}")

engine = None
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()