"""Supabase authentication service."""
from typing import Optional
from supabase import create_client, Client
from app.config import settings
from app.models.user import User, TokenData
from app.services.tenant import tenant_service


class AuthService:
    """Service for handling authentication with Supabase."""
    
    def __init__(self):
        self.supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    def verify_token(self, token: str) -> Optional[TokenData]:
        """
        Verify JWT token and extract user data.
        Also checks if user can login (has active tenant).
        Role is read from user_metadata.role.
        
        Args:
            token: JWT token string
        
        Returns:
            TokenData if valid and user can login, None otherwise
        """
        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Verify token with Supabase
            response = self.supabase.auth.get_user(token)
            
            if response.user:
                user = response.user
                user_metadata = user.user_metadata or {}
                
                # Read role from user_metadata (defaults to 'user' if not set)
                role = user_metadata.get('role', 'user')
                
                # Check if user can login (has active tenant) for non-super-admins
                if role != 'super_admin' and not self.check_user_can_login(user.id):
                    print(f"User {user.id} cannot login: no active tenant")
                    return None
                
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
        Also verifies user can login (has active tenant) unless super admin.
        Role is read from user_metadata.role.
        
        Args:
            user_id: User ID
        
        Returns:
            User object if found and can login, None otherwise
        """
        try:
            response = self.supabase.auth.admin.get_user_by_id(user_id)
            
            if response.user:
                user = response.user
                user_metadata = user.user_metadata or {}
                
                # Read role from user_metadata (defaults to 'user' if not set)
                role = user_metadata.get('role', 'user')
                print(f"DEBUG: auth_service.get_user - user_id: {user_id}, role from metadata: {role}, metadata: {user_metadata}")
                
                # Check if user can login (has active tenant) for non-super-admins
                if role != 'super_admin' and not self.check_user_can_login(user_id):
                    print(f"User {user_id} cannot login: no active tenant")
                    return None
                
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
        Check if user has admin role (super admin or tenant admin).
        
        Args:
            token: JWT token
        
        Returns:
            True if user is admin, False otherwise
        """
        token_data = self.verify_token(token)
        return token_data is not None and (token_data.role == 'admin' or token_data.role == 'super_admin')
    
    def check_user_can_login(self, user_id: str) -> bool:
        """
        Check if user can login (has active tenant and user is active in tenant).
        Super admins can always login.
        
        Args:
            user_id: User ID
        
        Returns:
            True if user can login, False otherwise
        """
        # Super admins can always login
        if tenant_service.is_super_admin(user_id):
            return True
        
        # Regular users need an active tenant AND must be active in that tenant
        tenant_id = tenant_service.get_user_tenant(user_id)
        if tenant_id is None:
            print(f"User {user_id} cannot login: no active tenant found")
            return False
        
        # Double-check that user is active in the tenant (get_user_tenant already checks this, but be explicit)
        if not tenant_service.is_user_active_in_tenant(user_id, tenant_id):
            print(f"User {user_id} cannot login: user is not active in tenant {tenant_id}")
            return False
        
        return True


# Global auth service instance
auth_service = AuthService()


