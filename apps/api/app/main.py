from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings, get_settings
from app.db import create_client
from app.routers import health, ready


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved = settings if settings is not None else get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        client = create_client(resolved)
        app.state.settings = resolved
        app.state.client = client
        yield
        await client.close()

    app = FastAPI(title="InsightScope API", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.allowed_origins,
        allow_methods=["GET"],
        allow_headers=["*"],
    )
    app.include_router(health.router)
    app.include_router(ready.router)
    return app


app = create_app()
