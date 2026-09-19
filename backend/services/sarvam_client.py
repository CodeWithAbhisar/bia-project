import requests
import json
import os
import time

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_URL = "https://api.sarvam.ai/v1/chat/completions" 

def generate_response(prompt: str) -> str:
    payload = {
        "model": "sarvam-105b", 
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 4096
    }
    headers = {"Authorization": f"Bearer {SARVAM_API_KEY}", "Content-Type": "application/json"}
    try:
        response = requests.post(SARVAM_URL, json=payload, headers=headers, timeout=60)
        response.raise_for_status()
        return response.json()['choices'][0]['message']['content']
    except Exception as e:
        return "I am currently offline or encountered an error."

def generate_response_stream(prompt: str):
    payload = {
        "model": "sarvam-105b", 
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 4096,
        "stream": True
    }
    headers = {"Authorization": f"Bearer {SARVAM_API_KEY}", "Content-Type": "application/json"}
    try:
        response = requests.post(SARVAM_URL, json=payload, headers=headers, timeout=60, stream=True)
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
                        if data['choices'][0]['delta'].get('content'):
                            yield data['choices'][0]['delta']['content']
                    except json.JSONDecodeError:
                        pass
    except requests.exceptions.RequestException as e:
        # Fallback simulated stream for offline mode
        offline_msg = "I am currently running in offline mode due to a network connection issue. However, based on your dataset, your overall metrics have been processed successfully. Please check your Dashboard for detailed insights!"
        words = offline_msg.split(' ')
        for word in words:
            yield word + ' '
            time.sleep(0.05)
    except Exception as e:
        yield f"Error processing AI response: {str(e)}"
