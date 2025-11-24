"""Supabase authentication service."""
from typing import Optional
from supabase import create_client, Client
from app.config import settings
from app.models.user import User, TokenData


class AuthService:
    """Service for handling authentication with Supabase."""
    
    def __init__(self):
        self.supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    def verify_token(self, token: str) -> Optional[TokenData]:
        """
        Verify JWT token and extract user data.
        
        Args:
            token: JWT token string
        
        Returns:
            TokenData if valid, None otherwise
        """
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Verify token with Supabase
            response = self.supabase.auth.get_user(token)
            
            if response.user:
                user = response.user
                
                # Get user metadata for role
                user_metadata = user.user_metadata or {}
                role = user_metadata.get('role', 'user')
                
                return TokenData(
                    user_id=user.id,
                    email=user.email,
                    role=role
                )
            
            return None
        
        except Exception as e:
            print(f"Token verification error: {e}")
            return None
    
    def get_user(self, user_id: str) -> Optional[User]:
        """
        Get user information by ID.
        
        Args:
            user_id: User ID
        
        Returns:
            User object if found, None otherwise
        """
        try:
            response = self.supabase.auth.admin.get_user_by_id(user_id)
            
            if response.user:
                user = response.user
                user_metadata = user.user_metadata or {}
                role = user_metadata.get('role', 'user')
                
                return User(
                    id=user.id,
                    email=user.email or "",
                    role=role
                )
            
            return None
        
        except Exception as e:
            print(f"Error getting user: {e}")
            return None
    
    def is_admin(self, token: str) -> bool:
        """
        Check if user has admin role.
        
        Args:
            token: JWT token
        
        Returns:
            True if user is admin, False otherwise
        """
        token_data = self.verify_token(token)
        return token_data is not None and token_data.role == 'admin'


# Global auth service instance
auth_service = AuthService()


