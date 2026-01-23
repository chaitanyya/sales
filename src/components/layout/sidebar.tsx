import { Link } from "react-router-dom";
import {
  IconChevronDown,
  IconBuilding,
  IconUsers,
  IconTypography,
  IconTargetArrow,
} from "@tabler/icons-react";
import { ModelSelector } from "./model-selector";
import { ChromeToggle } from "./chrome-toggle";
import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist";
import { useOnboardingStatus } from "@/lib/query";

export function Sidebar() {
  const { data: onboardingStatus } = useOnboardingStatus();

  return (
    <aside className="w-52 bg-sidebar flex flex-col text-[13px] shrink-0 border-r border-white/5 pt-8">
      {/* Draggable region for traffic lights area */}
      <div className="p-2">
        <div className="flex items-center gap-2 w-full px-2 py-1 font-medium">
          <div className="w-6 h-6 flex rounded-md items-center font-sans justify-center text-[12px] font-semibold text-primary-foreground bg-white/10 backdrop-blur">
            <img className="w-4 h-4" src="./menubar.png" alt="" />
          </div>
          <span className="flex-1 text-left truncate">Qualify</span>
        </div>
      </div>

      <nav className="flex-1 px-2 py-1 space-y-px overflow-y-auto">
        <div className="py-1">
          <div className="flex items-center gap-1.5 w-full px-2 py-1 text-muted-foreground text-[11px] uppercase tracking-wider font-medium">
            <IconChevronDown className="w-3 h-3" />
            Views
          </div>
          <div className="mt-0.5 space-y-px">
            <Link
              to="/people"
              className="flex items-center rounded gap-2 px-2 py-1 text-muted-foreground hover:bg-white/[0.12]"
            >
              <IconUsers className="w-4 h-4" />
              <span className="flex-1">People</span>
            </Link>
            <Link
              to="/lead"
              className="flex items-center rounded gap-2 px-2 py-1 text-muted-foreground hover:bg-white/[0.12]"
            >
              <IconBuilding className="w-4 h-4" />
              <span className="flex-1">Companies</span>
            </Link>
          </div>
        </div>

        <div className="py-1">
          <div className="flex items-center gap-1.5 w-full px-2 py-1 text-muted-foreground text-[11px] uppercase tracking-wider font-medium">
            <IconChevronDown className="w-3 h-3" />
            Workspace
          </div>
          <div className="mt-0.5 space-y-px">
            <Link
              to="/prompt"
              className="flex items-center rounded gap-2 w-full px-2 py-1 text-muted-foreground hover:bg-white/[0.12]"
            >
              <IconTypography className="w-4 h-4" />
              <span className="flex-1 text-left">Prompt</span>
            </Link>
            <Link
              to="/scoring"
              className="flex items-center rounded gap-2 w-full px-2 py-1 text-muted-foreground hover:bg-white/[0.12]"
            >
              <IconTargetArrow className="w-4 h-4" />
              <span className="flex-1 text-left">Scoring</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="p-2 border-t border-white/5 space-y-1">
        <div className="px-2 py-1 text-muted-foreground text-[11px] uppercase tracking-wider font-medium">
          Settings
        </div>
        <ModelSelector />
        <ChromeToggle />
      </div>

      {onboardingStatus && <OnboardingChecklist status={onboardingStatus} />}
    </aside>
  );
}
