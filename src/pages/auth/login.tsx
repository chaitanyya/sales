import { SignIn, useUser, useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";
import { IconLoader2 } from "@tabler/icons-react";

export default function LoginPage() {
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const { isLoaded: isUserLoaded } = useUser();

  // Redirect if already logged in
  if (isAuthLoaded && isUserLoaded && isSignedIn) {
    return <Navigate to="/lead" replace />;
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background bg-terminal-pattern">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 flex rounded-md items-center font-sans justify-center text-[12px] font-semibold text-primary-foreground bg-white/10 backdrop-blur">
              <img className="w-5 h-5" src="/menubar.png" alt="" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Liidi</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Sign in to access lead research and qualification
          </p>
        </div>

        {/* Clerk SignIn Component */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
          <SignIn
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-none border-0 p-0",
                header: "hidden",
                socialButtonsBlock: "gap-3",
                socialButtonsBlockButton:
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                formButtonPrimary:
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                footerAction: "text-sm",
                footerActionLink: "text-primary hover:underline",
                dividerRow: "border-border/50",
                dividerText: "text-muted-foreground text-xs",
                identityPage: {
                  emailField:
                    "bg-background border-border text-foreground rounded-md",
                },
                signInPage: {
                  passwordField:
                    "bg-background border-border text-foreground rounded-md",
                },
                input:
                  "bg-background border-border text-foreground rounded-md",
                label: "text-sm text-muted-foreground",
                formFieldLabel: "text-sm text-foreground",
                formFieldInput:
                  "bg-background border-border text-foreground rounded-md",
                alert: "text-sm",
              },
            }}
            signUpUrl="/auth/signup"
            redirectUrl="/"
          />
        </div>

        {/* Footer text */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

/**
 * Loading Page - Shown during auth initialization
 */
export function AuthLoadingPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-background bg-terminal-pattern">
      <div className="text-center">
        <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
