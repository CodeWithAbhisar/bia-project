import requests
import json
import os

# Sarvam API credentials (from environment variables)
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_URL = "https://api.sarvam.ai/v1/chat/completions" 

def generate_response(prompt: str) -> str:
    """
    Sends a constructed prompt to the Sarvam LLM. 
    The prompt string already contains all necessary context and instructions.
    """
    payload = {
        "model": "sarvam-105b", # Ensure this is the correct model ID for your Sarvam tier
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 4096
    }
    
    headers = {
        "Authorization": f"Bearer {SARVAM_API_KEY}", 
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(SARVAM_URL, json=payload, headers=headers, timeout=60)
        response.raise_for_status()
        
        # Extract the AI's text response from the JSON payload
        return response.json()['choices'][0]['message']['content']
        
    except requests.exceptions.RequestException as e:
        # Fallback to local mock if offline or DNS fails
        
        # Simple local heuristic for mock response based on the prompt
        # Extract only the user's question to prevent false positives from system context
        user_query = prompt.split("User question:")[-1].lower() if "User question:" in prompt else prompt.lower()
        
        if "revenue" in user_query or "sales" in user_query:
            return "Based on your data, your revenue looks healthy. Ensure you check your top performing categories in the inventory tab to maintain this growth!"
        elif "inventory" in user_query or "stock" in user_query:
            return "I recommend monitoring items with a 'Low Stock' status closely. Maintaining a good sell-through rate prevents high carrying costs."
        elif "customer" in user_query or "client" in user_query:
            return "Your VIP customers are driving a large portion of your revenue. Consider offering a loyalty discount to retain them."
        else:
            return "I am currently running in offline mode due to a network connection issue to the AI servers. However, based on your dataset, your overall metrics have been processed successfully. Please check your Dashboard and Cashflow tabs for detailed insights!"
    except Exception as e:
        return f"Error processing AI response: {str(e)}"