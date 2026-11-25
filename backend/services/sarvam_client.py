import requests
import json
import os
import time

# Accept GEMINI_API_KEY first, fall back to legacy SARVAM_API_KEY for compatibility
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("SARVAM_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
GEMINI_MODEL = "gemini-flash-lite-latest" 

def generate_response(prompt: str) -> str:
    if not GEMINI_API_KEY:
        return "AI key not configured: set GEMINI_API_KEY in the backend environment."
    payload = {
        "model": GEMINI_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 4096
    }
    headers = {"Authorization": f"Bearer {GEMINI_API_KEY}", "Content-Type": "application/json"}
    try:
        response = requests.post(GEMINI_URL, json=payload, headers=headers, timeout=60)
        response.raise_for_status()
        return response.json()['choices'][0]['message']['content']
    except Exception as e:
        detail = ""
        if getattr(e, "response", None) is not None:
            try:
                detail = f" | API said: {e.response.json()}"
            except Exception:
                pass
        return f"AI request failed: {e}{detail}"

def generate_response_stream(prompt: str):
    if not GEMINI_API_KEY:
        yield "AI key not configured: set GEMINI_API_KEY in the backend environment."
        return
    payload = {
        "model": GEMINI_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 4096,
        "stream": True
    }
    headers = {"Authorization": f"Bearer {GEMINI_API_KEY}", "Content-Type": "application/json"}
    try:
        response = requests.post(GEMINI_URL, json=payload, headers=headers, timeout=60, stream=True)
        response.raise_for_status()
        
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                if decoded_line.startswith("data: "):
                    data_str = decoded_line[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                        if data.get('choices') and len(data['choices']) > 0:
                            if data['choices'][0].get('delta', {}).get('content'):
                                yield data['choices'][0]['delta']['content']
                    except json.JSONDecodeError:
                        pass
    except requests.exceptions.RequestException as e:
        detail = ""
        if getattr(e, "response", None) is not None:
            try:
                detail = f" | API said: {e.response.json()}"
            except Exception:
                pass
        yield f"AI request failed: {e}{detail}"
    except Exception as e:
        yield f"Error processing AI response: {str(e)}"
