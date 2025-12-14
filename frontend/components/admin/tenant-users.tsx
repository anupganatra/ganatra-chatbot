"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { useTenantUsers } from "@/hooks/use-tenants"
import { useAuth } from "@/hooks/use-auth"
import { Plus, Power, PowerOff, UserCog, Loader2, User, X, Eye, EyeOff } from "lucide-react"

interface TenantUsersProps {
  tenantId: string
  onClose?: () => void
}

export function TenantUsers({ tenantId, onClose }: TenantUsersProps) {
  const { user: currentUser } = useAuth()
  const { users, loading, error, refreshUsers, addUser, deactivateUser, activateUser, updateUserRole } = useTenantUsers(tenantId)
  const [showInactive, setShowInactive] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [activateDialogOpen, setActivateDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [newUserFullName, setNewUserFullName] = useState("")
  const [newUserRole, setNewUserRole] = useState<"admin" | "user">("user")
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    refreshUsers(showInactive)
  }, [showInactive, refreshUsers])

  const handleAddUser = async () => {
    if (!newUserEmail.trim() || !newUserPassword.trim()) return
    if (newUserPassword.length < 6) {
      // Password validation will be handled by backend, but we can show a quick check
      return
    }
    const result = await addUser(newUserEmail.trim(), newUserPassword, newUserFullName.trim() || undefined, newUserRole)
    if (result) {
      setAddDialogOpen(false)
      setNewUserEmail("")
      setNewUserPassword("")
      setNewUserFullName("")
      setNewUserRole("user")
    }
  }

  const handleDeactivate = async () => {
    if (!selectedUserId) return
    const result = await deactivateUser(selectedUserId)
    if (result) {
      setDeactivateDialogOpen(false)
      setSelectedUserId(null)
    }
  }

  const handleActivate = async () => {
    if (!selectedUserId) return
    const result = await activateUser(selectedUserId)
    if (result) {
      setActivateDialogOpen(false)
      setSelectedUserId(null)
    }
  }

  const handleRoleChange = async (userId: string, newRole: "admin" | "user") => {
    await updateUserRole(userId, newRole)
  }

  const openDeactivateDialog = (userId: string) => {
    setSelectedUserId(userId)
    setDeactivateDialogOpen(true)
  }

  const openActivateDialog = (userId: string) => {
    setSelectedUserId(userId)
    setActivateDialogOpen(true)
  }

  // Filter out current user from the list
  const filteredUsers = (showInactive ? users : users.filter(u => u.is_active))
    .filter(u => u.user_id !== currentUser?.id)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Users</h3>
          <p className="text-sm text-muted-foreground">Manage users in this company</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-inactive-users"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <Label htmlFor="show-inactive-users">Show inactive</Label>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add User</DialogTitle>
                <DialogDescription>
                  Create a new user account. The user can log in immediately with the provided credentials.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="user-email">Email *</Label>
                  <Input
                    id="user-email"
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddUser()
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="user-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddUser()
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-name">Full Name</Label>
                  <Input
                    id="user-name"
                    placeholder="John Doe (optional)"
                    value={newUserFullName}
                    onChange={(e) => setNewUserFullName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddUser()
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-role">Role</Label>
                  <Select value={newUserRole} onValueChange={(value: "admin" | "user") => setNewUserRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddUser} disabled={!newUserEmail.trim() || !newUserPassword.trim() || newUserPassword.length < 6 || loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {loading && users.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <User className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">No users found</p>
          <p className="text-xs text-muted-foreground">
            {showInactive ? "No users in this company" : "No active users in this company"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <div
              key={user.user_id}
              className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.full_name || user.email}</p>
                    {user.full_name && (
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline">
                        {user.role === "admin" ? "Admin" : "User"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {user.created_at && (
                    <span>Added: {new Date(user.created_at).toLocaleDateString()}</span>
                  )}
                  {user.deactivated_at && (
                    <span>Deactivated: {new Date(user.deactivated_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Select
                  value={user.role}
                  onValueChange={(value: "admin" | "user") => handleRoleChange(user.user_id, value)}
                  disabled={loading || user.user_id === currentUser?.id}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {user.is_active ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeactivateDialog(user.user_id)}
                    disabled={user.user_id === currentUser?.id}
                    title={user.user_id === currentUser?.id ? "You cannot deactivate yourself" : ""}
                  >
                    <PowerOff className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openActivateDialog(user.user_id)}
                    disabled={user.user_id === currentUser?.id}
                    title={user.user_id === currentUser?.id ? "You cannot activate yourself" : ""}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deactivate Confirmation */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the user from this company. They will not be able to log in.
              You can reactivate them later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate Confirmation */}
      <AlertDialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will activate the user in this company. They will be able to log in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

