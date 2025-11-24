# AI Chatbot Application - Full Stack

A production-ready AI chatbot application with RAG (Retrieval-Augmented Generation) pipeline, built with Next.js 14, FastAPI, Supabase, Qdrant Cloud, and Google Gemini.

## Architecture

### Frontend (Next.js 14)
- **Location**: `frontend/`
- **Framework**: Next.js 14 with App Router
- **UI**: shadcn/ui components with Tailwind CSS
- **Authentication**: Supabase Auth (email/password + social)
- **Deployment**: Vercel

### Backend (FastAPI)
- **Location**: `backend/`
- **Framework**: FastAPI
- **LLM**: Google Gemini
- **Vector DB**: Qdrant Cloud
- **Authentication**: Supabase JWT verification
- **Deployment**: Railway

### Database & Services
- **Auth & Chat History**: Supabase
- **Vector Database**: Qdrant Cloud
- **LLM Provider**: Google Gemini

## Features

- ✅ PDF document ingestion and processing
- ✅ Text chunking with overlap
- ✅ Embedding generation using Gemini
- ✅ Vector storage and retrieval with Qdrant
- ✅ RAG pipeline for context-aware responses
- ✅ Streaming chat responses
- ✅ Role-based access control (Admin/User)
- ✅ Document upload and management (Admin only)
- ✅ Modern, responsive UI with shadcn/ui
- ✅ Rate limiting and security best practices

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Supabase account
- Qdrant Cloud account
- Google Gemini API key

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file:
```bash
cp .env.example .env
```

5. Fill in environment variables (see `backend/.env.example`)

6. Run the server:
```bash
uvicorn app.main:app --reload
```

Backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```bash
cp .env.local.example .env.local
```

4. Fill in environment variables (see `frontend/.env.local.example`)

5. Run the development server:
```bash
npm run dev
```

Frontend will be available at `http://localhost:3000`

## Environment Variables

### Backend (.env)

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Qdrant
QDRANT_URL=your_qdrant_cloud_url
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION_NAME=documents

# Gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-pro
GEMINI_EMBEDDING_MODEL=models/embedding-001

# CORS
CORS_ORIGINS=["http://localhost:3000"]
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## Deployment

### Backend (Railway)

1. Push backend code to GitHub
2. Create new project in Railway
3. Connect GitHub repository
4. Add all environment variables from `.env.example`
5. Railway will auto-detect FastAPI and deploy
6. Update `CORS_ORIGINS` in backend to include your Vercel URL

### Frontend (Vercel)

1. Push frontend code to GitHub
2. Import repository in Vercel
3. Add environment variables from `.env.local.example`
4. Update `NEXT_PUBLIC_BACKEND_URL` to your Railway backend URL
5. Deploy

### Supabase Setup

1. Create a new Supabase project
2. Enable Authentication
3. Configure email/password and social providers (Google)
4. Set up redirect URLs:
   - `http://localhost:3000/api/auth/callback` (development)
   - `https://your-app.vercel.app/api/auth/callback` (production)
5. Create a user and set role in user_metadata:
   ```sql
   UPDATE auth.users 
   SET raw_user_meta_data = jsonb_build_object('role', 'admin')
   WHERE email = 'your-admin@email.com';
   ```

### Qdrant Cloud Setup

1. Create a Qdrant Cloud account
2. Create a new cluster
3. Get your cluster URL and API key
4. Add to backend environment variables

## Project Structure

```
.
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── models/         # Pydantic models
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utilities
│   │   └── main.py         # FastAPI app
│   ├── requirements.txt
│   └── railway.json
│
└── frontend/               # Next.js frontend
    ├── app/                # App Router pages
    ├── components/         # React components
    ├── lib/                # Utilities and API clients
    ├── hooks/              # Custom hooks
    ├── types/              # TypeScript types
    └── package.json
```

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

All endpoints (except `/` and `/health`) require authentication via Bearer token:

```
Authorization: Bearer <jwt_token>
```

Tokens are obtained from Supabase Auth on the frontend.

## Role-Based Access

- **User**: Can chat and search documents
- **Admin**: Can upload documents, manage documents, and access admin endpoints

Set user role in Supabase user metadata:
```json
{
  "role": "admin"  // or "user"
}
```

## RAG Pipeline

1. **Document Upload**: PDF is uploaded and validated
2. **Text Extraction**: Text is extracted from PDF
3. **Chunking**: Text is split into chunks with overlap
4. **Embedding**: Chunks are converted to embeddings using Gemini
5. **Storage**: Embeddings are stored in Qdrant with metadata
6. **Query**: User query is converted to embedding
7. **Retrieval**: Similar chunks are retrieved from Qdrant
8. **Generation**: Retrieved context is sent to Gemini with query
9. **Response**: Generated answer is streamed to user

## Security Best Practices

- JWT token verification on all protected endpoints
- Rate limiting (10 requests/minute per user)
- File size limits (10MB for PDFs)
- Input validation and sanitization
- CORS restricted to frontend domain
- Environment variables for all secrets
- Role-based access control

## Troubleshooting

### Backend Issues

- **Import errors**: Ensure virtual environment is activated
- **Qdrant connection**: Verify URL and API key
- **Gemini API errors**: Check API key and quota
- **CORS errors**: Update `CORS_ORIGINS` in backend config

### Frontend Issues

- **Auth redirects**: Verify Supabase redirect URLs
- **API errors**: Check `NEXT_PUBLIC_BACKEND_URL` is correct
- **Build errors**: Run `npm install` and check Node version

## License

MIT

