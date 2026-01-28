import { useState } from "react";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  IconBuilding,
  IconChevronDown,
  IconPlus,
  IconUsers,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * OrgSwitcher - Dropdown to switch between organizations
 *
 * Displays the current organization and allows switching between
 * the user's organization memberships.
 */
export function OrgSwitcher() {
  const { org, orgMemberships, switchOrg } = useAuthStore();
  const [open, setOpen] = useState(false);

  // If no org memberships, don't show the switcher
  if (orgMemberships.length === 0) {
    return null;
  }

  // If only one org, show it without dropdown
  if (orgMemberships.length === 1) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 text-muted-foreground">
        <IconBuilding className="w-4 h-4" />
        <span className="text-xs truncate max-w-[120px]">{org?.name}</span>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-2 py-1 text-muted-foreground hover:bg-white/[0.12] justify-start"
        >
          <IconBuilding className="w-4 h-4 shrink-0" />
          <span className="text-xs truncate max-w-[100px]">{org?.name}</span>
          <IconChevronDown className="w-3 h-3 shrink-0 ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[220px]" align="start" side="bottom">
        <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground px-2 py-1.5 pointer-events-none">
          Organizations
        </div>
        {orgMemberships.map((membership) => {
          const isSelected = org?.id === membership.organization.id;
          return (
            <DropdownMenuItem
              key={membership.id}
              onClick={() => {
                switchOrg(membership.organization.id);
                setOpen(false);
              }}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                isSelected && "bg-white/[0.12]"
              )}
            >
              <IconUsers className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate text-xs">
                {membership.organization.name}
              </span>
              {isSelected && (
                <span className="text-[10px] text-muted-foreground">Active</span>
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            // Open Clerk's organization creation
            window.open("https://dashboard.clerk.com/orgs/new", "_blank");
          }}
          className="cursor-pointer"
        >
          <IconPlus className="w-4 h-4 shrink-0" />
          <span className="text-xs">Create organization</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * CompactOrgDisplay - Shows current org without switcher
 * For use in sidebar header when space is limited
 */
export function CompactOrgDisplay() {
  const { org } = useAuthStore();

  if (!org) return null;

  return (
    <div
      className="flex items-center gap-1.5 text-muted-foreground truncate"
      title={org.name}
    >
      <IconBuilding className="w-3 h-3 shrink-0" />
      <span className="text-[10px] truncate max-w-[80px]">{org.name}</span>
    </div>
  );
}
