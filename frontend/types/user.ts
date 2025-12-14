export interface User {
  id: string
  email: string
  role: "admin" | "user" | "super_admin"
  fullName?: string
}

export interface UserMetadata {
  role?: "admin" | "user" | "super_admin"
  fullName?: string
}

export type Theme = "system" | "dark" | "light"
