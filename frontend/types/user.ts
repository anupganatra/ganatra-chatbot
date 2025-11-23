export interface User {
  id: string
  email: string
  role: 'admin' | 'user'
}

export interface UserMetadata {
  role?: 'admin' | 'user'
}

