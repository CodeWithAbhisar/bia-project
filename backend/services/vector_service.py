import os
import chromadb
from PyPDF2 import PdfReader

# Initialize ChromaDB in persistent mode
db_client = chromadb.PersistentClient(path="./chroma_db")

def process_document(file_path: str, user_id: int):
    """Parses a document, chunks it, and saves the vectors to ChromaDB."""
    text = ""
    
    # Extract Text
    if file_path.endswith('.pdf'):
        reader = PdfReader(file_path)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    elif file_path.endswith('.txt'):
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
            
    if not text.strip():
        raise ValueError("Document contains no readable text.")

    # Chunk the text into roughly 500 character blocks to preserve context
    chunk_size = 500
    chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
    
    # Get or create a collection specific to this user
    collection_name = f"user_{user_id}_docs"
    collection = db_client.get_or_create_collection(name=collection_name)
    
    # Generate unique IDs for each chunk
    ids = [f"{os.path.basename(file_path)}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"source": os.path.basename(file_path)} for _ in range(len(chunks))]
    
    # Add to ChromaDB (Chroma automatically handles the embedding using its default model)
    collection.add(
        documents=chunks,
        metadatas=metadatas,
        ids=ids
    )
    
    return True

def search_documents(query: str, user_id: int) -> str:
    """Searches the user's vector database for relevant document chunks."""
    collection_name = f"user_{user_id}_docs"
    
    try:
        collection = db_client.get_collection(name=collection_name)
    except Exception:
        # Collection doesn't exist yet
        return ""
        
    results = collection.query(
        query_texts=[query],
        n_results=3 # Get top 3 most relevant chunks
    )
    
    if not results['documents'] or not results['documents'][0]:
        return ""
        
    # Format the retrieved chunks into a context string
    retrieved_text = "\n\n".join(results['documents'][0])
    
    return f"[DOCUMENT KNOWLEDGE BASE]\n{retrieved_text}\n"
