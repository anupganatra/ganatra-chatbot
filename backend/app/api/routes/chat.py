"""Chat API routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from app.models.chat import ChatRequest, ChatResponse
from app.models.user import User
from app.api.dependencies import get_current_user
from app.services.rag import rag_service
from app.middleware.rate_limit import limiter
import json
import uuid

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
@limiter.limit("10/minute")
async def chat(
    request: Request,
    chat_request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Chat endpoint - generate response using RAG.
    
    Args:
        request: FastAPI request object
        chat_request: Chat request with message
        current_user: Current authenticated user
    
    Returns:
        ChatResponse with generated answer
    """
    try:
        # Retrieve context and generate answer
        context = rag_service.retrieve_context(chat_request.message)
        
        if not context:
            return ChatResponse(
                response="I couldn't find relevant information in the documents to answer your question. Please try rephrasing or ask about something else.",
                conversation_id=chat_request.conversation_id or str(uuid.uuid4()),
                sources=[],
                similarity_scores=[]
            )
        
        # Generate answer
        answer = rag_service.generate_answer(
            query=chat_request.message,
            context=context,
            stream=False
        )
        
        # Format sources
        sources = [
            {
                "filename": chunk["metadata"]["filename"],
                "chunk_index": chunk["metadata"]["chunk_index"],
                "score": chunk["score"]
            }
            for chunk in context
        ]
        
        similarity_scores = [chunk["score"] for chunk in context]
        
        return ChatResponse(
            response=answer,
            conversation_id=chat_request.conversation_id or str(uuid.uuid4()),
            sources=sources,
            similarity_scores=similarity_scores
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating response: {str(e)}"
        )


@router.post("/stream")
@limiter.limit("10/minute")
async def chat_stream(
    request: Request,
    chat_request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Streaming chat endpoint.
    
    Args:
        request: FastAPI request object
        chat_request: Chat request with message
        current_user: Current authenticated user
    
    Returns:
        StreamingResponse with chunks
    """
    try:
        # Retrieve context
        context = rag_service.retrieve_context(chat_request.message)
        
        async def generate():
            if not context:
                yield "data: {0}\n\n".format(json.dumps({
                    "content": "I couldn't find relevant information in the documents.",
                    "done": True
                }))
                return
            
            # Stream response
            async for chunk in rag_service.generate_answer_stream(
                query=chat_request.message,
                context=context
            ):
                yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"
            
            yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating stream: {str(e)}"
        )


