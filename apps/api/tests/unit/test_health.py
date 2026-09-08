import httpx
import pytest

from app.config import Settings
from app.main import create_app


async def request_path(path: str, app=None) -> httpx.Response:
    application = app if app is not None else create_app()
    transport = httpx.ASGITransport(app=application)
    async with application.router.lifespan_context(application):
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            return await client.get(path)


class TestHealthEndpoints:
    @pytest.mark.asyncio
    async def test_health_succeeds_without_mongo(self) -> None:
        response = await request_path("/api/v1/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    @pytest.mark.asyncio
    async def test_ready_fails_cleanly_when_mongo_unavailable(self) -> None:
        unreachable = Settings(
            mongodb_uri="mongodb://localhost:59999",
            mongodb_db="insightscope",
            mongodb_server_selection_timeout_ms=300,
        )
        response = await request_path("/api/v1/ready", app=create_app(unreachable))
        assert response.status_code == 503
        payload = response.json()
        assert payload["status"] == "not_ready"
        assert payload["database"] == "unreachable"
