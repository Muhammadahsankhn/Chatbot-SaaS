import requests

print("Testing REGISTER")
res1 = requests.post("http://localhost:8000/users/register", json={
    "fullname": "Test User",
    "email": "test@test.com",
    "password": "password123"
})
print(res1.status_code, res1.text)

print("\nTesting LOGIN")
res2 = requests.post("http://localhost:8000/users/login", json={
    "email": "test@test.com",
    "password": "password123"
})
print(res2.status_code, res2.text)
