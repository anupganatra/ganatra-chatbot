# Ganatra Chatbot Backend

FastAPI backend for Ganatra chatbot application with RAG pipeline.

## Features

- PDF document ingestion and processing
- Text chunking with overlap
- Embedding generation using Gemini
- Vector storage with Qdrant Cloud
- RAG pipeline for context-aware responses
- Google Gemini LLM integration
- Supabase authentication
- Role-based access control (Admin/User)
- Rate limiting
- Streaming responses

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Fill in your environment variables:
- Supabase URL and key
- Qdrant Cloud URL and API key
- Gemini API key
- OpenRouter API key (optional, for OpenRouter models)
- CORS origins (your frontend URL)

## Running Locally

```bash
uvicorn app.main:app --reload
```

API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Deployment on Railway

1. Connect your GitHub repository to Railway
2. Set all environment variables in Railway dashboard
3. Railway will auto-detect FastAPI and deploy
4. Your API will be available at the Railway-provided URL

## API Endpoints

### Chat
- `POST /chat` - Send chat message (requires auth)
- `POST /chat/stream` - Streaming chat (requires auth)

### Documents (Admin only)
- `POST /documents/upload` - Upload PDF document
- `DELETE /documents/{document_id}` - Delete document

### Admin
- `GET /admin/stats` - Get system statistics
- `POST /admin/rebuild-index` - Rebuild vector index

## Authentication

All endpoints (except `/` and `/health`) require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Tokens are obtained from Supabase Auth on the frontend.


