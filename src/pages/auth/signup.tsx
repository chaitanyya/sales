import { SignUp, useUser, useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";

export default function SignUpPage() {
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
            Create an account to start researching and qualifying leads
          </p>
        </div>

        {/* Clerk SignUp Component */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
          <SignUp
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
                input:
                  "bg-background border-border text-foreground rounded-md",
                label: "text-sm text-muted-foreground",
                formFieldLabel: "text-sm text-foreground",
                formFieldInput:
                  "bg-background border-border text-foreground rounded-md",
                alert: "text-sm",
              },
            }}
            signInUrl="/auth/login"
            redirectUrl="/"
            afterSignUpUrl="/"
          />
        </div>

        {/* Footer text */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By creating an account, you agree to our Terms of Service and Privacy
          Policy.
        </p>
      </div>
    </div>
  );
}
