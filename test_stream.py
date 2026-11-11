from backend.services.sarvam_client import generate_response_stream

for chunk in generate_response_stream("Test"):
    print(f"CHUNK: '{chunk}'")
