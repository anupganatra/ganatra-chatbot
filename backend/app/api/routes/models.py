"""Models API routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from typing import List, Dict, Any
from app.models.user import User
from app.api.dependencies import get_current_user, get_current_admin_user
from app.services.supabase_client import supabase_client
from app.config import settings
from app.middleware.rate_limit import limiter
import httpx

router = APIRouter(prefix="/models", tags=["models"])


@router.get("")
@limiter.limit("30/minute")
async def get_available_models(
    request: Request,
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Get list of available models (active only).
    
    Args:
        request: FastAPI request object
        current_user: Current authenticated user
    
    Returns:
        List of available models
    """
    try:
        # Query Supabase for active models
        response = supabase_client.supabase.table("available_models").select("*").eq("is_active", True).order("name").execute()
        
        models = response.data if hasattr(response, 'data') else []
        
        # Format response
        return [
            {
                "id": model["id"],
                "model_id": model["model_id"],
                "provider": model["provider"],
                "name": model["name"],
                "description": model.get("description"),
                "is_free": model.get("is_free", False)
            }
            for model in models
        ]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching models: {str(e)}"
        )


@router.get("/openrouter")
@limiter.limit("10/minute")
async def get_openrouter_models(
    request: Request,
    current_user: User = Depends(get_current_admin_user)
) -> List[Dict[str, Any]]:
    """
    Fetch available models from OpenRouter API (admin only).
    Returns only free models.
    
    Args:
        request: FastAPI request object
        current_user: Current authenticated admin user
    
    Returns:
        List of free models from OpenRouter
    """
    try:
        if not settings.OPENROUTER_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OpenRouter API key is not configured"
            )
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{settings.OPENROUTER_BASE_URL}/models",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json"
                }
            )
            response.raise_for_status()
            data = response.json()
            
            # Debug: Log response structure if no data
            if "data" not in data:
                print(f"OpenRouter API response structure: {list(data.keys())}")
            
            # Filter for free models
            free_models = []
            if "data" in data:
                for model in data["data"]:
                    # Check if model is free
                    # OpenRouter marks free models with pricing.prompt = 0 or null
                    pricing = model.get("pricing")
                    
                    # If pricing is None/null, it's free
                    if pricing is None:
                        model_name = model.get("name", "")
                        # Remove "(free)" from model name if present
                        model_name = model_name.replace(" (free)", "").replace("(free)", "").strip()
                        free_models.append({
                            "id": model.get("id", ""),
                            "name": model_name,
                            "description": model.get("description", ""),
                            "pricing": None
                        })
                        continue
                    
                    # Check prompt and completion prices
                    prompt_price = pricing.get("prompt", "0") if isinstance(pricing, dict) else "0"
                    completion_price = pricing.get("completion", "0") if isinstance(pricing, dict) else "0"
                    
                    # Convert to float for comparison
                    try:
                        prompt = float(prompt_price) if prompt_price else 0.0
                        completion = float(completion_price) if completion_price else 0.0
                        
                        # Model is free if both prompt and completion prices are 0
                        if prompt == 0.0 and completion == 0.0:
                            model_name = model.get("name", "")
                            # Remove "(free)" from model name if present
                            model_name = model_name.replace(" (free)", "").replace("(free)", "").strip()
                            free_models.append({
                                "id": model.get("id", ""),
                                "name": model_name,
                                "description": model.get("description", ""),
                                "pricing": pricing
                            })
                    except (ValueError, TypeError):
                        # If pricing is unclear, skip
                        continue
            
            return free_models
    
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OpenRouter API error: {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching OpenRouter models: {str(e)}"
        )


@router.post("/user/preference")
@limiter.limit("10/minute")
async def set_user_model_preference(
    request: Request,
    model_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Set user's model preference.
    
    Args:
        request: FastAPI request object
        model_id: Model ID to set as preference
        current_user: Current authenticated user
    
    Returns:
        Success message
    """
    try:
        from app.services.user_preferences import user_preferences_service
        
        # Verify model exists and is active
        model_response = supabase_client.supabase.table("available_models").select("*").eq("model_id", model_id).eq("is_active", True).execute()
        models = model_response.data if hasattr(model_response, 'data') else []
        
        if not models:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found or not available"
            )
        
        # Set user preference
        success = user_preferences_service.set_user_model(current_user.id, model_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user preference"
            )
        
        return {"message": "Model preference updated successfully", "model_id": model_id}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error setting model preference: {str(e)}"
        )


@router.get("/user/preference")
@limiter.limit("30/minute")
async def get_user_model_preference(
    request: Request,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get user's current model preference.
    
    Args:
        request: FastAPI request object
        current_user: Current authenticated user
    
    Returns:
        User's model preference or None
    """
    try:
        from app.services.user_preferences import user_preferences_service
        
        model_id = user_preferences_service.get_user_model(current_user.id)
        
        if not model_id:
            return {"model_id": None}
        
        # Get model details
        model_response = supabase_client.supabase.table("available_models").select("*").eq("model_id", model_id).execute()
        models = model_response.data if hasattr(model_response, 'data') else []
        
        if models:
            model = models[0]
            return {
                "model_id": model["model_id"],
                "name": model["name"],
                "description": model.get("description"),
                "provider": model["provider"],
                "is_free": model.get("is_free", False)
            }
        
        return {"model_id": model_id}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting model preference: {str(e)}"
        )

