"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { useTenants } from "@/hooks/use-tenants"
import { Plus, Edit2, Power, PowerOff, Users, Loader2, Building2 } from "lucide-react"
import { TenantUsers } from "./tenant-users"

export function TenantManagement() {
  const { tenants, loading, error, refreshTenants, createTenant, updateTenant, deactivateTenant, activateTenant } = useTenants()
  const [showInactive, setShowInactive] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [activateDialogOpen, setActivateDialogOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null)
  const [viewUsersTenant, setViewUsersTenant] = useState<string | null>(null)
  const [tenantName, setTenantName] = useState("")
  const [editName, setEditName] = useState("")

  useEffect(() => {
    refreshTenants(showInactive)
  }, [showInactive, refreshTenants])

  const handleCreate = async () => {
    if (!tenantName.trim()) return
    const result = await createTenant(tenantName.trim())
    if (result) {
      setCreateDialogOpen(false)
      setTenantName("")
    }
  }

  const handleEdit = async () => {
    if (!selectedTenant || !editName.trim()) return
    const result = await updateTenant(selectedTenant, editName.trim())
    if (result) {
      setEditDialogOpen(false)
      setSelectedTenant(null)
      setEditName("")
    }
  }

  const handleDeactivate = async () => {
    if (!selectedTenant) return
    const result = await deactivateTenant(selectedTenant)
    if (result) {
      setDeactivateDialogOpen(false)
      setSelectedTenant(null)
    }
  }

  const handleActivate = async () => {
    if (!selectedTenant) return
    const result = await activateTenant(selectedTenant)
    if (result) {
      setActivateDialogOpen(false)
      setSelectedTenant(null)
    }
  }

  const openEditDialog = (tenant: { id: string; name: string }) => {
    setSelectedTenant(tenant.id)
    setEditName(tenant.name)
    setEditDialogOpen(true)
  }

  const openDeactivateDialog = (tenantId: string) => {
    setSelectedTenant(tenantId)
    setDeactivateDialogOpen(true)
  }

  const openActivateDialog = (tenantId: string) => {
    setSelectedTenant(tenantId)
    setActivateDialogOpen(true)
  }

  const filteredTenants = showInactive ? tenants : tenants.filter(t => t.is_active)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Companies</h2>
          <p className="text-sm text-muted-foreground">Manage companies</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <Label htmlFor="show-inactive">Show inactive</Label>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Company</DialogTitle>
                <DialogDescription>
                  Create a new company. Users can be added to the company after creation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="tenant-name">Company Name</Label>
                  <Input
                    id="tenant-name"
                    placeholder="Company Name"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreate()
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!tenantName.trim() || loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Create
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

      {loading && tenants.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">No companies found</p>
          <p className="text-xs text-muted-foreground">
            {showInactive ? "No companies exist yet" : "No active companies found"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTenants.map((tenant) => (
            <div
              key={tenant.id}
              className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{tenant.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={tenant.is_active ? "default" : "secondary"}>
                        {tenant.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>Created: {new Date(tenant.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewUsersTenant(tenant.id)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Users
                </Button>
                {tenant.is_active ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(tenant)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeactivateDialog(tenant.id)}
                    >
                      <PowerOff className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openActivateDialog(tenant.id)}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>
              Update the company name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Company Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleEdit()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!editName.trim() || loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Company?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the company. Users in this company will not be able to log in.
              You can reactivate it later if needed.
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
            <AlertDialogTitle>Activate Company?</AlertDialogTitle>
            <AlertDialogDescription>
              This will activate the company. Users in this company will be able to log in again.
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

      {/* Users View Dialog */}
      {viewUsersTenant && (
        <Dialog open={!!viewUsersTenant} onOpenChange={(open) => !open && setViewUsersTenant(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Company Users</DialogTitle>
              <DialogDescription>
                Manage users in this company
              </DialogDescription>
            </DialogHeader>
            <TenantUsers tenantId={viewUsersTenant} onClose={() => setViewUsersTenant(null)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

