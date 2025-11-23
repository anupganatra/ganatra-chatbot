# AI Chatbot Frontend

Next.js 14 frontend for AI chatbot application with RAG pipeline.

## Features

- Next.js 14 with App Router
- Supabase Authentication (email/password + social)
- Role-based access control
- Chat interface with streaming support
- Admin dashboard for document management
- shadcn/ui components
- TypeScript
- Tailwind CSS

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment on Vercel

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Project Structure

- `app/` - Next.js App Router pages and layouts
- `components/` - React components
  - `ui/` - shadcn/ui components
  - `chat/` - Chat-related components
  - `admin/` - Admin components
  - `auth/` - Authentication components
- `lib/` - Utility functions and API clients
- `hooks/` - Custom React hooks
- `types/` - TypeScript type definitions

## Authentication

The app uses Supabase Auth with:
- Email/password authentication
- Social providers (Google)
- Protected routes via middleware
- Role-based access (Admin/User)

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_BACKEND_URL` - FastAPI backend URL

