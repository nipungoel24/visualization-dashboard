from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings, get_settings
from app.db import create_client
from app.errors import register_error_handlers
from app.routers import facets, health, meta, overview, ready, records


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved = settings if settings is not None else get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        client = create_client(resolved)
        app.state.settings = resolved
        app.state.client = client
        yield
        await client.close()

    app = FastAPI(
        title="InsightScope API",
        version="0.1.0",
        lifespan=lifespan,
        description="Global Intelligence Dashboard — analytics and filtering API.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.allowed_origins,
        allow_methods=["GET"],
        allow_headers=["*"],
    )
    register_error_handlers(app)
    app.include_router(health.router)
    app.include_router(ready.router)
    app.include_router(meta.router)
    app.include_router(facets.router)
    app.include_router(overview.router)
    app.include_router(records.router)
    return app


app = create_app()
