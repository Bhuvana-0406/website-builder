import { createAuthClient } from "better-auth/react"

const baseURL = import.meta.env.VITE_API_URL as string

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: { credentials: "include" },
})

export const { signIn, signUp, useSession } = authClient;