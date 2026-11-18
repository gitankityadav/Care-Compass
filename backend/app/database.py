from psycopg_pool import ConnectionPool

from app.config import get_settings


settings = get_settings()

pool = ConnectionPool(
    conninfo=settings.database_url,
    min_size=1,
    max_size=10,
    kwargs={
        "sslmode": settings.pgsslmode,
    },
    open=False,
)


def get_db_pool() -> ConnectionPool:
    return pool
