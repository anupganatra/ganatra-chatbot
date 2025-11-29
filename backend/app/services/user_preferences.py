"""User preferences service for managing user settings."""
from supabase import create_client, Client
from app.config import settings
from typing import Optional


class UserPreferencesService:
    """Service for managing user preferences."""
    
    def __init__(self):
        self.supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    def get_user_model(self, user_id: str) -> Optional[str]:
        """
        Get user's selected model from metadata.
        
        Args:
            user_id: User ID
        
        Returns:
            Model ID or None if not set
        """
        try:
            response = self.supabase.auth.admin.get_user_by_id(user_id)
            if response and response.user:
                user_metadata = response.user.user_metadata or {}
                return user_metadata.get("selected_model_id")
        except Exception as e:
            print(f"Error getting user model: {e}")
        return None
    
    def set_user_model(self, user_id: str, model_id: str) -> bool:
        """
        Update user's selected model in metadata.
        
        Args:
            user_id: User ID
            model_id: Model ID to set
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get current user metadata
            response = self.supabase.auth.admin.get_user_by_id(user_id)
            if not response or not response.user:
                return False
            
            current_metadata = response.user.user_metadata or {}
            current_metadata["selected_model_id"] = model_id
            
            # Update user metadata
            self.supabase.auth.admin.update_user_by_id(
                user_id,
                {"user_metadata": current_metadata}
            )
            return True
        except Exception as e:
            print(f"Error setting user model: {e}")
            return False


# Global user preferences service instance
user_preferences_service = UserPreferencesService()

