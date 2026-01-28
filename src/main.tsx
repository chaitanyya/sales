import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { enableMapSet } from "immer";
import { open } from "@tauri-apps/plugin-shell";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./globals.css";

// Enable Immer MapSet plugin for Zustand stores that use Map/Set
enableMapSet();

// Open external links (http/https) in system browser
document.addEventListener("click", (e) => {
  const anchor = (e.target as HTMLElement).closest("a");
  if (!anchor) return;

  const href = anchor.getAttribute("href");
  if (href?.startsWith("http://") || href?.startsWith("https://")) {
    e.preventDefault();
    open(href);
  }
});

// Clerk publishable key - should be in .env file
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkKey}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>
);
