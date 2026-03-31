import { createAuthClient } from "better-auth/react"

const rawBaseURL = import.meta.env.VITE_BASE_URL as string | undefined
// Some env files accidentally include quotes (e.g. `'http://localhost:3000'`).
// If that happens, Better Auth will treat it as part of the URL and API calls will 404.
const baseURL = rawBaseURL
  ? rawBaseURL.trim().replace(/^['"]|['"]$/g, "")
  : undefined

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: { credentials: "include" },
})
export const { signIn, signUp, useSession } = authClient;