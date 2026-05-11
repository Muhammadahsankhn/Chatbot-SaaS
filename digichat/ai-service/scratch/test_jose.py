from jose import jwt
payload = {"sub": "1234567890", "name": "John Doe", "iat": 1516239022}
token = jwt.encode(payload, "secret", algorithm="HS256")
print(f"Token: {token}")
decoded = jwt.decode(token, "secret", algorithms=["HS256"])
print(f"Decoded: {decoded}")
