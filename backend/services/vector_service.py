import os
import chromadb
from PyPDF2 import PdfReader

# Initialize ChromaDB in persistent mode
db_client = chromadb.PersistentClient(path="./chroma_db")


def process_document(file_path: str, user_id: int, file_id: int = None):
    """Parses a large document incrementally and upserts chunks to ChromaDB in safe batches."""
    chunks = []
    chunk_size = 500
    lower_path = file_path.lower()

    if lower_path.endswith(".pdf"):
        reader = PdfReader(file_path)
        buffer = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                buffer += page_text + "\n"
                while len(buffer) >= chunk_size:
                    chunks.append(buffer[:chunk_size])
                    buffer = buffer[chunk_size:]
        if buffer.strip():
            chunks.append(buffer)
    elif lower_path.endswith(".txt"):
        opened = False
        for enc in ("utf-8-sig", "utf-8", "cp1252", "latin1"):
            try:
                with open(file_path, "r", encoding=enc) as f:
                    buffer = ""
                    while True:
                        block = f.read(65536)
                        if not block:
                            break
                        buffer += block
                        while len(buffer) >= chunk_size:
                            chunks.append(buffer[:chunk_size])
                            buffer = buffer[chunk_size:]
                    if buffer.strip():
                        chunks.append(buffer)
                opened = True
                break
            except UnicodeDecodeError:
                chunks.clear()
                continue
        if not opened:
            raise ValueError("Could not decode text file encoding.")

    if not chunks:
        raise ValueError("Document contains no readable text.")

    collection_name = f"user_{user_id}_docs"
    collection = db_client.get_or_create_collection(name=collection_name)

    doc_key = f"file_{file_id}" if file_id is not None else os.path.basename(file_path)
    source_name = os.path.basename(file_path)
    batch_size = 500

    for i in range(0, len(chunks), batch_size):
        batch_chunks = chunks[i : i + batch_size]
        batch_ids = [f"{doc_key}_chunk_{i + j}" for j in range(len(batch_chunks))]
        batch_meta = [{"source": source_name, "file_id": str(file_id or "")} for _ in batch_chunks]
        collection.upsert(documents=batch_chunks, metadatas=batch_meta, ids=batch_ids)

    return True


def search_documents(query: str, user_id: int) -> str:
    """Searches the user's vector database for relevant document chunks."""
    collection_name = f"user_{user_id}_docs"

    try:
        collection = db_client.get_collection(name=collection_name)
    except Exception:
        return ""

    results = collection.query(query_texts=[query], n_results=3)

    if not results["documents"] or not results["documents"][0]:
        return ""

    retrieved_text = "\n\n".join(results["documents"][0])
    return f"[DOCUMENT KNOWLEDGE BASE]\n{retrieved_text}\n"
