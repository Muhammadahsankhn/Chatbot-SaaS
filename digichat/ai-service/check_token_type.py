from auth import create_token
token = create_token("123")
print(f"Token: {token}")
print(f"Type: {type(token)}")
