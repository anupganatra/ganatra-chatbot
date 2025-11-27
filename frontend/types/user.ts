export interface User {
  id: string
  email: string
  role: "admin" | "user"
  fullName?: string
}

export interface UserMetadata {
  role?: "admin" | "user"
  fullName?: string
}

export type Theme = "system" | "dark" | "light"
