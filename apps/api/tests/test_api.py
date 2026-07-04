"""
CivicMind AI — Backend API Tests

Tests for authentication, dataset CRUD, cleaning, analytics,
forecasting, risk scoring, and system health endpoints.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.main import app


@pytest.fixture
async def client():
    """Create an async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_root_health(client):
    """Test that the root endpoint returns operational status."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert data["service"] == "CivicMind AI"


@pytest.mark.asyncio
async def test_login(client):
    """Test user login returns a JWT token."""
    response = await client.post(
        "/api/auth/login",
        json={"email": "test@metro.gov", "password": "testpass", "role": "Analyst"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@metro.gov"
    assert data["user"]["role"] == "Analyst"


@pytest.mark.asyncio
async def test_login_invalid_email(client):
    """Test login with missing email returns 422."""
    response = await client.post(
        "/api/auth/login",
        json={"email": "not-an-email", "password": "test"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_list_datasets(client):
    """Test listing datasets returns seeded data."""
    response = await client.get("/api/datasets")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3  # 3 seeded datasets


@pytest.mark.asyncio
async def test_create_dataset(client):
    """Test creating a new dataset."""
    response = await client.post(
        "/api/datasets",
        json={
            "name": "Test Dataset",
            "type": "Custom",
            "rows": [
                {"id": 1, "value": 42, "label": "Alpha"},
                {"id": 2, "value": 55, "label": "Beta"},
            ],
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Dataset"
    assert len(data["rows"]) == 2
    assert data["isCleaned"] is False


@pytest.mark.asyncio
async def test_create_dataset_no_rows(client):
    """Test creating a dataset without rows returns 400."""
    response = await client.post(
        "/api/datasets",
        json={"name": "Empty", "rows": []},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_clean_dataset(client):
    """Test cleaning a seeded dataset."""
    # Get list and find uncleaned or use safety dataset
    datasets = (await client.get("/api/datasets")).json()

    # Create a new dataset with dirty data
    create_resp = await client.post(
        "/api/datasets",
        json={
            "name": "Dirty Dataset",
            "type": "Safety",
            "rows": [
                {"id": 1, "district": "A", "response_time": 10, "severity": "High"},
                {"id": 2, "district": "B", "response_time": None, "severity": ""},
            ],
        },
    )
    ds_id = create_resp.json()["id"]

    response = await client.post(f"/api/datasets/{ds_id}/clean")
    assert response.status_code == 200
    data = response.json()
    assert data["dataset"]["isCleaned"] is True
    assert data["dataset"]["qualityScore"] == 100


@pytest.mark.asyncio
async def test_benchmark_query(client):
    """Test running a benchmark aggregation query."""
    response = await client.post(
        "/api/datasets/dataset_safety_01/query",
        json={
            "groupByCol": "district",
            "aggregateCol": "response_time",
            "operation": "avg",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "processingTimeMs" in data
    assert "results" in data
    assert len(data["results"]) > 0


@pytest.mark.asyncio
async def test_forecast(client):
    """Test generating a predictive forecast."""
    response = await client.post(
        "/api/datasets/dataset_safety_01/forecast",
        json={
            "metricCol": "response_time",
            "labelCol": "district",
            "periods": 4,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "forecast" in data
    assert len(data["forecast"]) > 0
    assert "metricName" in data


@pytest.mark.asyncio
async def test_risk_scores(client):
    """Test retrieving community risk scores."""
    response = await client.get("/api/risk-scores")
    assert response.status_code == 200
    data = response.json()
    assert "overallScore" in data
    assert "categories" in data
    assert len(data["categories"]) == 5


@pytest.mark.asyncio
async def test_recommendations(client):
    """Test listing seeded recommendations."""
    response = await client.get("/api/recommendations")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3


@pytest.mark.asyncio
async def test_update_recommendation(client):
    """Test updating a recommendation status."""
    response = await client.put(
        "/api/recommendations/rec_01",
        json={"status": "Approved", "assignedTo": "Chief Environmental Officer"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "Approved"


@pytest.mark.asyncio
async def test_alerts_crud(client):
    """Test creating and listing alerts."""
    # Create
    create_resp = await client.post(
        "/api/alerts",
        json={
            "name": "Test Alert",
            "datasetId": "dataset_safety_01",
            "column": "response_time",
            "operator": "gt",
            "value": 20,
        },
    )
    assert create_resp.status_code == 201
    alert = create_resp.json()
    assert alert["name"] == "Test Alert"

    # List
    list_resp = await client.get("/api/alerts")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 3  # 2 seeded + 1 new

    # Update
    update_resp = await client.put(
        f"/api/alerts/{alert['id']}",
        json={"status": "Muted"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "Muted"


@pytest.mark.asyncio
async def test_notifications(client):
    """Test listing and marking notifications as read."""
    list_resp = await client.get("/api/notifications")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 2

    read_resp = await client.post("/api/notifications/read")
    assert read_resp.status_code == 200


@pytest.mark.asyncio
async def test_audit_logs(client):
    """Test listing audit logs."""
    response = await client.get("/api/audit-logs")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_chat_requires_query(client):
    """Test that chat endpoint requires a query."""
    response = await client.post("/api/chat", json={})
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_chat_with_query(client):
    """Test chat with a valid query (uses fallback without API key)."""
    response = await client.post(
        "/api/chat",
        json={"query": "What is the safety status?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "text" in data


@pytest.mark.asyncio
async def test_system_health(client):
    """Test system health endpoint."""
    response = await client.get("/api/system/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"


@pytest.mark.asyncio
async def test_delete_dataset(client):
    """Test deleting a dataset."""
    # Create one first
    create_resp = await client.post(
        "/api/datasets",
        json={
            "name": "To Delete",
            "rows": [{"id": 1, "val": 10}],
        },
    )
    ds_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/api/datasets/{ds_id}")
    assert del_resp.status_code == 200

    # Verify it's gone
    datasets = (await client.get("/api/datasets")).json()
    assert not any(d["id"] == ds_id for d in datasets)


@pytest.mark.asyncio
async def test_delete_nonexistent_dataset(client):
    """Test deleting a non-existent dataset returns 404."""
    response = await client.delete("/api/datasets/nonexistent_id")
    assert response.status_code == 404
