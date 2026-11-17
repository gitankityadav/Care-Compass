from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import get_db_pool
from app.routes.data import router as data_router
from app.routes.mutations import router as mutations_router
from app.routes.scenarios import router as scenarios_router

settings = get_settings()
pool = get_db_pool()


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool.open()
    try:
        yield
    finally:
        pool.close()


app = FastAPI(
    title="Care Compass API",
    description="Healthcare GIS Command Center API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data_router)
app.include_router(mutations_router)
app.include_router(scenarios_router)


@app.get("/")
def root():
    return {
        "service": "Care Compass API",
        "status": "running",
    }


@app.get("/api/health")
def health():
    try:
        with pool.connection() as connection:
            connection.execute("SELECT 1")

        return {
            "status": "ok",
            "database": "connected",
            "service": "Care Compass API",
        }

    except Exception:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "error",
                "message": "Database unavailable",
            },
        )
