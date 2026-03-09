from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

with TestClient(app) as client:
    response = client.post("/users/register", json={
        "fullname": "Test", 
        "email": "testclient@example.com", 
        "password": "pass"
    })

    print("Status:", response.status_code)
    print("Response:", response.text)
