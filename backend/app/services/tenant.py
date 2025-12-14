"""Tenant management service."""
from typing import Optional, List, Dict, Any
from supabase import create_client, Client
from app.config import settings
from datetime import datetime
import uuid


class TenantService:
    """Service for managing tenants and user-tenant relationships."""
    
    def __init__(self):
        self.supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    
    def is_super_admin(self, user_id: str) -> bool:
        """
        Check if user is a super admin.
        
        Args:
            user_id: User ID to check
        
        Returns:
            True if user is super admin
        """
        try:
            response = self.supabase.auth.admin.get_user_by_id(user_id)
            if response.user:
                user_metadata = response.user.user_metadata or {}
                role = user_metadata.get('role', 'user')
                return role == 'super_admin'
            return False
        except Exception as e:
            print(f"Error checking super admin status: {e}")
            return False
    
    def get_user_tenant_and_role(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user's tenant_id and role in a single optimized query.
        This is faster than calling get_user_tenant and get_user_tenant_role separately.
        
        Args:
            user_id: User ID
        
        Returns:
            Dictionary with 'tenant_id' and 'role' if user has an active tenant, None otherwise
        """
        try:
            # Single query to get tenant_id and role, then verify tenant is active
            response = (
                self.supabase.table("user_tenants")
                .select("tenant_id, role")
                .eq("user_id", user_id)
                .eq("is_active", True)
                .limit(1)
                .execute()
            )
            
            if response.data and len(response.data) > 0:
                tenant_id = response.data[0].get("tenant_id")
                role = response.data[0].get("role")
                
                # Quick check if tenant is active (cached/optimized query)
                if tenant_id and self.is_tenant_active(tenant_id):
                    return {
                        "tenant_id": tenant_id,
                        "role": role
                    }
            return None
        except Exception as e:
            print(f"Error getting user tenant and role: {e}")
            return None
    
    def get_user_tenant(self, user_id: str) -> Optional[str]:
        """
        Get the active tenant_id for a user.
        
        Args:
            user_id: User ID
        
        Returns:
            Tenant ID if user has an active tenant, None otherwise
        """
        try:
            response = (
                self.supabase.table("user_tenants")
                .select("tenant_id")
                .eq("user_id", user_id)
                .eq("is_active", True)
                .limit(1)
                .execute()
            )
            
            if response.data and len(response.data) > 0:
                tenant_id = response.data[0].get("tenant_id")
                # Verify tenant is active
                if tenant_id and self.is_tenant_active(tenant_id):
                    return tenant_id
            return None
        except Exception as e:
            print(f"Error getting user tenant: {e}")
            return None
    
    def get_user_tenant_role(self, user_id: str, tenant_id: str) -> Optional[str]:
        """
        Get user's role in a specific tenant.
        
        Args:
            user_id: User ID
            tenant_id: Tenant ID
        
        Returns:
            Role ('admin' or 'user') if user is in tenant, None otherwise
        """
        try:
            response = (
                self.supabase.table("user_tenants")
                .select("role")
                .eq("user_id", user_id)
                .eq("tenant_id", tenant_id)
                .eq("is_active", True)
                .limit(1)
                .execute()
            )
            
            if response.data and len(response.data) > 0:
                return response.data[0].get("role")
            return None
        except Exception as e:
            print(f"Error getting user tenant role: {e}")
            return None
    
    def is_user_in_tenant(self, user_id: str, tenant_id: str) -> bool:
        """
        Check if user belongs to a tenant.
        
        Args:
            user_id: User ID
            tenant_id: Tenant ID
        
        Returns:
            True if user is in tenant and both are active
        """
        return self.is_user_active_in_tenant(user_id, tenant_id)
    
    def is_user_active_in_tenant(self, user_id: str, tenant_id: str) -> bool:
        """
        Check if user is active in tenant.
        
        Args:
            user_id: User ID
            tenant_id: Tenant ID
        
        Returns:
            True if user-tenant relationship is active and tenant is active
        """
        if not self.is_tenant_active(tenant_id):
            return False
        
        try:
            response = (
                self.supabase.table("user_tenants")
                .select("is_active")
                .eq("user_id", user_id)
                .eq("tenant_id", tenant_id)
                .eq("is_active", True)
                .limit(1)
                .execute()
            )
            
            return response.data and len(response.data) > 0
        except Exception as e:
            print(f"Error checking user-tenant relationship: {e}")
            return False
    
    def is_tenant_active(self, tenant_id: str) -> bool:
        """
        Check if tenant is active.
        
        Args:
            tenant_id: Tenant ID
        
        Returns:
            True if tenant exists and is active
        """
        try:
            response = (
                self.supabase.table("tenants")
                .select("is_active")
                .eq("id", tenant_id)
                .eq("is_active", True)
                .limit(1)
                .execute()
            )
            
            return response.data and len(response.data) > 0
        except Exception as e:
            print(f"Error checking tenant active status: {e}")
            return False
    
    def can_manage_tenant(self, user_id: str, tenant_id: str) -> bool:
        """
        Check if user can manage a tenant.
        
        Args:
            user_id: User ID
            tenant_id: Tenant ID
        
        Returns:
            True if user is super admin or tenant admin
        """
        if self.is_super_admin(user_id):
            return True
        
        role = self.get_user_tenant_role(user_id, tenant_id)
        return role == 'admin'
    
    def can_user_login(self, user_id: str) -> bool:
        """
        Check if user can login (has active tenant).
        
        Args:
            user_id: User ID
        
        Returns:
            True if user has at least one active tenant
        """
        tenant_id = self.get_user_tenant(user_id)
        return tenant_id is not None
    
    def create_tenant(self, name: str, created_by: str) -> str:
        """
        Create a new tenant.
        
        Args:
            name: Tenant name
            created_by: User ID of creator
        
        Returns:
            Created tenant ID
        
        Raises:
            ValueError: If creation fails
        """
        try:
            tenant_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()
            
            payload = {
                "id": tenant_id,
                "name": name,
                "is_active": True,
                "created_at": now,
                "updated_at": now
            }
            
            response = self.supabase.table("tenants").insert(payload).execute()
            
            if hasattr(response, 'error') and response.error:
                raise ValueError(f"Error creating tenant: {response.error}")
            
            return tenant_id
        except Exception as e:
            raise ValueError(f"Error creating tenant: {str(e)}")
    
    def update_tenant(self, tenant_id: str, name: str) -> bool:
        """
        Update tenant name.
        
        Args:
            tenant_id: Tenant ID
            name: New tenant name
        
        Returns:
            True if successful
        """
        try:
            response = (
                self.supabase.table("tenants")
                .update({
                    "name": name,
                    "updated_at": datetime.utcnow().isoformat()
                })
                .eq("id", tenant_id)
                .execute()
            )
            
            if hasattr(response, 'error') and response.error:
                return False
            
            return response.data and len(response.data) > 0
        except Exception as e:
            print(f"Error updating tenant: {e}")
            return False
    
    def deactivate_tenant(self, tenant_id: str) -> bool:
        """
        Deactivate a tenant (soft delete).
        
        Args:
            tenant_id: Tenant ID
        
        Returns:
            True if successful
        """
        try:
            response = (
                self.supabase.table("tenants")
                .update({
                    "is_active": False,
                    "updated_at": datetime.utcnow().isoformat()
                })
                .eq("id", tenant_id)
                .execute()
            )
            
            if hasattr(response, 'error') and response.error:
                return False
            
            return response.data and len(response.data) > 0
        except Exception as e:
            print(f"Error deactivating tenant: {e}")
            return False
    
    def activate_tenant(self, tenant_id: str) -> bool:
        """
        Reactivate a tenant.
        
        Args:
            tenant_id: Tenant ID
        
        Returns:
            True if successful
        """
        try:
            response = (
                self.supabase.table("tenants")
                .update({
                    "is_active": True,
                    "updated_at": datetime.utcnow().isoformat()
                })
                .eq("id", tenant_id)
                .execute()
            )
            
            if hasattr(response, 'error') and response.error:
                return False
            
            return response.data and len(response.data) > 0
        except Exception as e:
            print(f"Error activating tenant: {e}")
            return False
    
    def list_tenants(self, user_id: str, include_inactive: bool = False) -> List[Dict[str, Any]]:
        """
        List tenants accessible to user.
        
        Args:
            user_id: User ID
            include_inactive: Whether to include inactive tenants
        
        Returns:
            List of tenant dictionaries
        """
        try:
            query = self.supabase.table("tenants").select("*")
            
            if self.is_super_admin(user_id):
                # Super admin sees all tenants
                if not include_inactive:
                    query = query.eq("is_active", True)
            else:
                # Regular users see only their tenant
                user_tenant_id = self.get_user_tenant(user_id)
                if user_tenant_id:
                    query = query.eq("id", user_tenant_id)
                    if not include_inactive:
                        query = query.eq("is_active", True)
                else:
                    return []
            
            response = query.order("created_at", desc=True).execute()
            return response.data or []
        except Exception as e:
            print(f"Error listing tenants: {e}")
            return []
    
    def get_tenant_users(self, tenant_id: str, include_inactive: bool = False) -> List[Dict[str, Any]]:
        """
        Get all users in a tenant.
        
        Args:
            tenant_id: Tenant ID
            include_inactive: Whether to include inactive users
        
        Returns:
            List of user dictionaries with tenant role
        """
        try:
            query = (
                self.supabase.table("user_tenants")
                .select("user_id, role, is_active, created_at, deactivated_at")
                .eq("tenant_id", tenant_id)
            )
            
            if not include_inactive:
                query = query.eq("is_active", True)
            
            response = query.order("created_at", desc=True).execute()
            
            # Enrich with user email, full_name, and account creation date from auth
            users = []
            for row in (response.data or []):
                try:
                    user_response = self.supabase.auth.admin.get_user_by_id(row["user_id"])
                    if user_response.user:
                        user_metadata = user_response.user.user_metadata or {}
                        # Get account creation date from auth.users (when user account was created)
                        # This is different from user_tenants.created_at (when added to tenant)
                        # The Supabase user object has created_at as an ISO string
                        account_created_at = None
                        if hasattr(user_response.user, 'created_at'):
                            account_created_at = user_response.user.created_at
                        elif hasattr(user_response.user, 'user_metadata') and isinstance(user_response.user.user_metadata, dict):
                            # Fallback: check if it's in metadata (unlikely but safe)
                            pass
                        
                        users.append({
                            "user_id": row["user_id"],
                            "email": user_response.user.email or "",
                            "full_name": user_metadata.get("full_name"),
                            "role": row["role"],
                            "is_active": row["is_active"],
                            "created_at": account_created_at,  # Use account creation date from auth.users
                            "deactivated_at": row.get("deactivated_at")
                        })
                except Exception:
                    # Skip users that can't be fetched
                    continue
            
            return users
        except Exception as e:
            print(f"Error getting tenant users: {e}")
            return []
    
    def add_user_to_tenant(self, user_id: str, tenant_id: str, role: str) -> bool:
        """
        Add user to tenant.
        Also updates user_metadata.role.
        
        Args:
            user_id: User ID
            tenant_id: Tenant ID
            role: User role ('admin' or 'user')
        
        Returns:
            True if successful
        """
        if role not in ('admin', 'user'):
            return False
        
        try:
            # Check if relationship already exists
            existing = (
                self.supabase.table("user_tenants")
                .select("is_active")
                .eq("user_id", user_id)
                .eq("tenant_id", tenant_id)
                .limit(1)
                .execute()
            )
            
            if existing.data and len(existing.data) > 0:
                # Update existing relationship
                response = (
                    self.supabase.table("user_tenants")
                    .update({
                        "role": role,
                        "is_active": True,
                        "deactivated_at": None,
                        "created_at": datetime.utcnow().isoformat()
                    })
                    .eq("user_id", user_id)
                    .eq("tenant_id", tenant_id)
                    .execute()
                )
            else:
                # Create new relationship
                payload = {
                    "user_id": user_id,
                    "tenant_id": tenant_id,
                    "role": role,
                    "is_active": True,
                    "created_at": datetime.utcnow().isoformat()
                }
                response = self.supabase.table("user_tenants").insert(payload).execute()
            
            if hasattr(response, 'error') and response.error:
                return False
            
            # Update user_metadata.role (but preserve super_admin role)
            try:
                # Get current user metadata to preserve other fields
                user_response = self.supabase.auth.admin.get_user_by_id(user_id)
                if user_response.user:
                    current_metadata = user_response.user.user_metadata or {}
                    current_role = current_metadata.get('role', 'user')
                    # Only update role if user is not a super_admin
                    # Super admins keep their super_admin role even when added to a tenant
                    if current_role != 'super_admin':
                        current_metadata['role'] = role
                        # Update user metadata
                        self.supabase.auth.admin.update_user_by_id(
                            user_id,
                            {"user_metadata": current_metadata}
                        )
            except Exception as e:
                print(f"Error updating user_metadata.role: {e}")
                # Don't fail the whole operation if metadata update fails
            
            return True
        except Exception as e:
            print(f"Error adding user to tenant: {e}")
            return False
    
    def create_user_and_add_to_tenant(
        self, 
        email: str, 
        password: str,
        tenant_id: str, 
        role: str, 
        full_name: Optional[str] = None
    ) -> Optional[str]:
        """
        Create a new user with password and add them to a tenant.
        Creates user in auth.users with password, sets user_metadata, and adds to user_tenants.
        If user already exists, adds them to the tenant instead.
        
        Args:
            email: User email address
            password: User password
            tenant_id: Tenant ID
            role: User role ('admin' or 'user')
            full_name: Optional full name
        
        Returns:
            User ID if successful, None otherwise
        """
        if role not in ('admin', 'user'):
            return None
        
        try:
            # Check if user already exists by email
            # List users and find by email (Supabase doesn't have direct get_by_email)
            try:
                users_response = self.supabase.auth.admin.list_users()
                existing_user = None
                if users_response and hasattr(users_response, 'users') and users_response.users:
                    for user in users_response.users:
                        if user.email and user.email.lower() == email.lower():
                            existing_user = user
                            break
                
                if existing_user:
                    # User exists, add to tenant
                    user_id = existing_user.id
                    # Update user metadata if needed
                    current_metadata = existing_user.user_metadata or {}
                    if current_metadata.get('role') != role or (full_name and current_metadata.get('full_name') != full_name):
                        new_metadata = current_metadata.copy()
                        new_metadata['role'] = role
                        if full_name:
                            new_metadata['full_name'] = full_name
                        try:
                            self.supabase.auth.admin.update_user_by_id(
                                user_id,
                                {"user_metadata": new_metadata}
                            )
                        except Exception as e:
                            print(f"Error updating user metadata: {e}")
                    
                    success = self.add_user_to_tenant(user_id, tenant_id, role)
                    if success:
                        return user_id
                    return None
            except Exception as e:
                print(f"Error checking for existing user: {e}")
                # Continue to create new user
            
            # User doesn't exist, create new user with password
            try:
                # Prepare user metadata
                user_metadata = {"role": role}
                if full_name:
                    user_metadata["full_name"] = full_name
                
                # Create user with password and metadata
                create_response = self.supabase.auth.admin.create_user({
                    "email": email,
                    "password": password,
                    "email_confirm": True,  # Auto-confirm email since admin is creating the user
                    "user_metadata": user_metadata
                })
                
                # Check for errors in response
                if hasattr(create_response, 'error') and create_response.error:
                    error_msg = getattr(create_response.error, 'message', str(create_response.error))
                    print(f"Supabase create user error: {error_msg}")
                    raise Exception(f"Failed to create user: {error_msg}")
                
                # Check if user was created
                if not create_response or not hasattr(create_response, 'user') or not create_response.user:
                    print(f"Failed to create user: Invalid response. Response: {create_response}")
                    raise Exception("Failed to create user: Invalid response from Supabase")
                
                user_id = create_response.user.id
                if not user_id:
                    print(f"Failed to create user: user_id is None")
                    raise Exception("Failed to create user: No user ID returned")
                    
            except Exception as create_error:
                print(f"Error creating user: {create_error}")
                import traceback
                traceback.print_exc()
                raise
            
            # Add user to tenant
            success = self.add_user_to_tenant(user_id, tenant_id, role)
            if not success:
                print(f"Failed to add user {user_id} to tenant {tenant_id}")
                return None
            
            return user_id
        except Exception as e:
            print(f"Error creating user and adding to tenant: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def deactivate_user_from_tenant(self, user_id: str, tenant_id: str) -> bool:
        """
        Deactivate user from tenant (soft delete).
        
        Args:
            user_id: User ID
            tenant_id: Tenant ID
        
        Returns:
            True if successful
        """
        try:
            response = (
                self.supabase.table("user_tenants")
                .update({
                    "is_active": False,
                    "deactivated_at": datetime.utcnow().isoformat()
                })
                .eq("user_id", user_id)
                .eq("tenant_id", tenant_id)
                .execute()
            )
            
            if hasattr(response, 'error') and response.error:
                return False
            
            return response.data and len(response.data) > 0
        except Exception as e:
            print(f"Error deactivating user from tenant: {e}")
            return False
    
    def activate_user_in_tenant(self, user_id: str, tenant_id: str) -> bool:
        """
        Reactivate user in tenant.
        
        Args:
            user_id: User ID
            tenant_id: Tenant ID
        
        Returns:
            True if successful
        """
        try:
            response = (
                self.supabase.table("user_tenants")
                .update({
                    "is_active": True,
                    "deactivated_at": None
                })
                .eq("user_id", user_id)
                .eq("tenant_id", tenant_id)
                .execute()
            )
            
            if hasattr(response, 'error') and response.error:
                return False
            
            return response.data and len(response.data) > 0
        except Exception as e:
            print(f"Error activating user in tenant: {e}")
            return False
    
    def update_user_tenant_role(self, user_id: str, tenant_id: str, role: str) -> bool:
        """
        Update user role in tenant.
        Also updates user_metadata.role.
        
        Args:
            user_id: User ID
            tenant_id: Tenant ID
            role: New role ('admin' or 'user')
        
        Returns:
            True if successful
        """
        if role not in ('admin', 'user'):
            return False
        
        try:
            response = (
                self.supabase.table("user_tenants")
                .update({"role": role})
                .eq("user_id", user_id)
                .eq("tenant_id", tenant_id)
                .execute()
            )
            
            if hasattr(response, 'error') and response.error:
                return False
            
            if not (response.data and len(response.data) > 0):
                return False
            
            # Update user_metadata.role
            try:
                # Get current user metadata to preserve other fields
                user_response = self.supabase.auth.admin.get_user_by_id(user_id)
                if user_response.user:
                    current_metadata = user_response.user.user_metadata or {}
                    # Update role in metadata
                    current_metadata['role'] = role
                    # Update user metadata
                    self.supabase.auth.admin.update_user_by_id(
                        user_id,
                        {"user_metadata": current_metadata}
                    )
            except Exception as e:
                print(f"Error updating user_metadata.role: {e}")
                # Don't fail the whole operation if metadata update fails
            
            return True
        except Exception as e:
            print(f"Error updating user tenant role: {e}")
            return False
    
    def get_tenant_documents(self, tenant_id: str) -> List[Dict[str, Any]]:
        """
        Get all documents for a tenant.
        
        Args:
            tenant_id: Tenant ID
        
        Returns:
            List of document dictionaries
        """
        try:
            response = (
                self.supabase.table("documents")
                .select("*")
                .eq("tenant_id", tenant_id)
                .order("uploaded_at", desc=True)
                .execute()
            )
            
            return response.data or []
        except Exception as e:
            print(f"Error getting tenant documents: {e}")
            return []


# Global tenant service instance
tenant_service = TenantService()

