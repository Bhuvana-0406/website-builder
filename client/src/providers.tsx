import React from "react";
import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { authClient } from "@/lib/auth-client";
import { useNavigate, Link as RouterLink,type LinkProps } from "react-router-dom";

// This wrapper solves two things:
// 1. Translates 'href' (what library wants) to 'to' (what React Router wants)
// 2. Forwards the Ref (so the dropdown knows where to appear)
const LinkWrapper = React.forwardRef<
  HTMLAnchorElement, 
  { href: string } & Omit<LinkProps, 'to'>
>(({ href, ...props }, ref) => {
  return <RouterLink ref={ref} to={href} {...props} />;
});

LinkWrapper.displayName = "LinkWrapper";

export function Providers({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={navigate}
      Link={LinkWrapper} // ✅ Use the wrapper here
    >
      {children}
    </AuthUIProvider>
  );
}