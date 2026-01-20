import Link from "next/link";
import {
  IconChevronDown,
  IconBuilding,
  IconUsers,
  IconTypography,
  IconSettings,
  IconTargetArrow,
} from "@tabler/icons-react";

export function Sidebar() {
  return (
    <aside className="w-52 bg-sidebar flex flex-col text-[13px] shrink-0 border-r border-[#1a1a1d]">
      {/* Workspace header */}
      <div className="p-2">
        <div className="flex items-center gap-2 w-full px-2 py-1 hover:bg-white/5 font-medium">
          <div className="w-5 h-5 bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
            Q
          </div>
          <span className="flex-1 text-left truncate">Qualify</span>
          <IconChevronDown className="w-3 h-3 text-muted-foreground" />
        </div>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-2 py-1 space-y-px overflow-y-auto">
        {/* Views section */}
        <div className="py-1">
          <div className="flex items-center gap-1.5 w-full px-2 py-1 text-muted-foreground text-[11px] uppercase tracking-wider font-medium">
            <IconChevronDown className="w-3 h-3" />
            Views
          </div>
          <div className="mt-0.5 space-y-px">
            <Link
              href="/people"
              className="flex items-center gap-2 px-2 py-1 rounded text-muted-foreground hover:bg-white/5"
            >
              <IconUsers className="w-4 h-4" />
              <span className="flex-1">People</span>
            </Link>
            <Link
              href="/lead"
              className="flex items-center gap-2 px-2 py-1 rounded text-muted-foreground hover:bg-white/5"
            >
              <IconBuilding className="w-4 h-4" />
              <span className="flex-1">Companies</span>
            </Link>
          </div>
        </div>

        {/* Workspace section */}
        <div className="py-1">
          <div className="flex items-center gap-1.5 w-full px-2 py-1 text-muted-foreground text-[11px] uppercase tracking-wider font-medium">
            <IconChevronDown className="w-3 h-3" />
            Workspace
          </div>
          <div className="mt-0.5 space-y-px">
            <Link
              href="/prompt"
              className="flex items-center gap-2 w-full px-2 py-1 rounded text-muted-foreground hover:bg-white/5"
            >
              <IconTypography className="w-4 h-4" />
              <span className="flex-1 text-left">Prompt</span>
            </Link>
            <Link
              href="/scoring"
              className="flex items-center gap-2 w-full px-2 py-1 rounded text-muted-foreground hover:bg-white/5"
            >
              <IconTargetArrow className="w-4 h-4" />
              <span className="flex-1 text-left">Scoring</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Bottom section */}
      <div className="p-2 border-t border-white/5">
        <div className="flex items-center gap-2 w-full px-2 py-1 rounded text-muted-foreground hover:bg-white/5 cursor-pointer">
          <IconSettings className="w-4 h-4" />
          <span>Settings</span>
        </div>
      </div>
    </aside>
  );
}
