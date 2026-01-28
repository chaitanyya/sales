import { useState } from "react";
import { Link } from "react-router-dom";
import {
  IconChevronDown,
  IconBuilding,
  IconUsers,
  IconTypography,
  IconTargetArrow,
  IconLogout,
  IconSettings,
} from "@tabler/icons-react";
import { ModelSelector } from "./model-selector";
import { ChromeToggle } from "./chrome-toggle";
import { GlmToggle } from "./glm-toggle";
import { ThemeToggle } from "./theme-toggle";
import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist";
import { useOnboardingStatus } from "@/lib/query";
import { useAuth } from "@clerk/clerk-react";

export function Sidebar() {
  const { data: onboardingStatus } = useOnboardingStatus();
  const { signOut } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    // Clear auth store
    window.location.href = "/auth/login";
  };

  return (
    <aside className="w-52 bg-sidebar flex flex-col text-[13px] shrink-0 border-r border-sidebar-border pt-8">
      {/* Draggable region for traffic lights area */}
      <div className="p-2">
        <div className="flex items-center gap-2 w-full px-2 py-1 font-medium">
          <div className="w-6 h-6 flex rounded-md items-center font-sans justify-center text-[12px] font-semibold text-primary-foreground bg-white/10 backdrop-blur">
            <img className="w-4 h-4" src="./menubar.png" alt="" />
          </div>
          <span className="flex-1 text-left truncate">Zyntopia Liidi</span>
        </div>

      </div>

      <nav className="flex-1 px-2 py-1 space-y-px overflow-y-auto">
        <Link
          to="/people"
          className="flex items-center rounded gap-2 px-2 py-1 text-muted-foreground hover:bg-[var(--hover-overlay)]"
        >
          <IconUsers className="w-4 h-4" />
          <span className="flex-1">People</span>
        </Link>
        <Link
          to="/lead"
          className="flex items-center rounded gap-2 px-2 py-1 text-muted-foreground hover:bg-[var(--hover-overlay)]"
        >
          <IconBuilding className="w-4 h-4" />
          <span className="flex-1">Companies</span>
        </Link>
      </nav>

      <div className="p-2 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="flex items-center gap-1.5 w-full px-2 py-1 text-muted-foreground text-[11px] uppercase tracking-wider font-medium hover:text-foreground transition-colors"
        >
          <IconChevronDown
            className={`w-3 h-3 transition-transform duration-200 ${isSettingsOpen ? "" : "-rotate-90"
              }`}
          />
          <IconSettings className="w-3.5 h-3.5" />
          Settings
        </button>

        <div
          className={`space-y-px overflow-hidden transition-all duration-200 ${isSettingsOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
        >
          {/* Workspace items */}
          <Link
            to="/prompt"
            className="flex items-center rounded gap-2 w-full px-2 py-1 text-muted-foreground hover:bg-[var(--hover-overlay)]"
          >
            <IconTypography className="w-4 h-4" />
            <span className="flex-1 text-left">Prompt</span>
          </Link>
          <Link
            to="/scoring"
            className="flex items-center rounded gap-2 w-full px-2 py-1 text-muted-foreground hover:bg-[var(--hover-overlay)]"
          >
            <IconTargetArrow className="w-4 h-4" />
            <span className="flex-1 text-left">Scoring</span>
          </Link>

          {/* Settings toggles */}
          <ModelSelector />
          <ThemeToggle />
          <ChromeToggle />
          <GlmToggle />

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-2 py-1 text-muted-foreground hover:bg-[var(--hover-overlay)] rounded text-left"
          >
            <IconLogout className="w-4 h-4" />
            <span className="text-xs">Sign out</span>
          </button>
        </div>
      </div>

      {onboardingStatus && <OnboardingChecklist status={onboardingStatus} />}
    </aside>
  );
}
