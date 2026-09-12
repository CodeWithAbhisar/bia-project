import requests
import json

# 1. Login to get token
res = requests.post("http://localhost:8000/api/auth/login", json={"email": "test@example.com", "password": "password123"})
if res.status_code != 200:
    # try registering
    res = requests.post("http://localhost:8000/api/auth/register", json={"email": "test@example.com", "password": "password123"})
    res = requests.post("http://localhost:8000/api/auth/login", json={"email": "test@example.com", "password": "password123"})

token = res.json().get("access_token")

# 2. Upload file
headers = {"Authorization": f"Bearer {token}"}
with open('sample.csv', 'rb') as f:
    files = {'file': ('sample.csv', f)}
    res = requests.post("http://localhost:8000/api/upload", headers=headers, files=files)
    
print("Status:", res.status_code)
print("Response:", res.text)
