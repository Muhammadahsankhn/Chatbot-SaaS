import urllib.request, json
req = urllib.request.Request(
    'http://localhost:8001/users/register',
    data=json.dumps({"fullname": "Test", "email":"test10@example.com", "password": "pass"}).encode(),
    headers={'Content-Type': 'application/json'}
)
try:
    urllib.request.urlopen(req)
    print("Success")
except Exception as e:
    print(e.read().decode() if hasattr(e, 'read') else str(e))
