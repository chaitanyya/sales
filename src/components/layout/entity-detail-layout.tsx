import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  IconArrowLeft,
  IconChevronDown,
  IconChevronUp,
  IconStar,
  IconDotsVertical,
  IconLoader2,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

interface NoteConfig {
  id: number;
  value: string;
  onSave: (value: string) => Promise<void>;
}

interface EntityDetailLayoutProps {
  /** Back link href (e.g., "/lead" or "/people") */
  backHref: string;
  /** Breadcrumb label (e.g., "Leads" or "People") */
  breadcrumbLabel: string;
  /** Entity title (e.g., company name or person name) */
  title: string;
  /** Entity subtitle content */
  subtitle: React.ReactNode;
  /** URL for previous item navigation */
  prevUrl: string | null;
  /** URL for next item navigation */
  nextUrl: string | null;
  /** Current index in list */
  currentIndex: number;
  /** Total items in list */
  totalItems: number;
  /** Main content area */
  mainContent: React.ReactNode;
  /** Activity items (will be rendered in activity section) */
  activityContent: React.ReactNode;
  /** Right sidebar content */
  sidebarContent: React.ReactNode;
  note?: NoteConfig;
}

function EntityNoteEditor({ note }: { note: NoteConfig }) {
  const [noteDraft, setNoteDraft] = useState(note.value);
  const [isSaving, setIsSaving] = useState(false);

  const saveNote = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving || noteDraft.trim() === note.value.trim()) return;

    setIsSaving(true);
    try {
      await note.onSave(noteDraft);
      setNoteDraft(noteDraft.trim());
      toast.success(noteDraft.trim() ? "Note saved" : "Note removed");
    } catch (error) {
      console.error("Failed to save note:", error);
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="mt-6" onSubmit={saveNote}>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-sm text-muted-foreground focus-within:border-white/20">
        <input
          type="text"
          placeholder="Leave a note..."
          value={noteDraft}
          maxLength={5000}
          disabled={isSaving}
          onChange={(event) => setNoteDraft(event.target.value)}
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/50"
        />
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          disabled={isSaving || noteDraft.trim() === note.value.trim()}
          className="h-7 px-2"
        >
          {isSaving ? <IconLoader2 className="size-3.5 animate-spin" /> : "Save"}
        </Button>
      </div>
    </form>
  );
}

export function EntityDetailLayout({
  backHref,
  breadcrumbLabel,
  title,
  subtitle,
  prevUrl,
  nextUrl,
  currentIndex,
  totalItems,
  mainContent,
  activityContent,
  sidebarContent,
  note,
}: EntityDetailLayoutProps) {
  return (
    <>
      <header
        data-tauri-drag-region
        className="h-10 border-b border-white/5 flex items-center px-3 gap-2"
      >
        <Link
          to={backHref}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconArrowLeft className="size-4" />
        </Link>
        <div className="flex items-center gap-1.5 text-sm">
          <Link to={backHref} className="text-muted-foreground hover:text-foreground">
            {breadcrumbLabel}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{title}</span>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <button className="p-1 rounded hover:bg-white/5 text-muted-foreground">
            <IconStar className="size-4" />
          </button>
          <button className="p-1 rounded hover:bg-white/5 text-muted-foreground">
            <IconDotsVertical className="size-4" />
          </button>
        </div>

        <div className="flex-1" data-tauri-drag-region />

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>
            {currentIndex} / {totalItems}
          </span>
          <Link
            to={prevUrl ?? "#"}
            className={`p-1 rounded hover:bg-white/5 ${!prevUrl ? "opacity-30 pointer-events-none" : ""}`}
          >
            <IconChevronUp className="size-4" />
          </Link>
          <Link
            to={nextUrl ?? "#"}
            className={`p-1 rounded hover:bg-white/5 ${!nextUrl ? "opacity-30 pointer-events-none" : ""}`}
          >
            <IconChevronDown className="size-4" />
          </Link>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-scroll scroll-stable">
          <div className="max-w-4xl mx-auto px-8 py-6">
            <h1 className="text-2xl font-semibold mb-1">{title}</h1>
            <p className="text-muted-foreground mb-6">{subtitle}</p>

            {mainContent}

            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium">Activity</h2>
              </div>
              <div className="space-y-3">{activityContent}</div>

              {note && <EntityNoteEditor key={`${note.id}:${note.value}`} note={note} />}
            </div>
          </div>
        </div>

        <aside className="w-64 border-l bg-black/95 border-white/5 overflow-y-scroll scroll-stable shrink-0">
          <div className="p-4">{sidebarContent}</div>
        </aside>
      </div>
    </>
  );
}

interface ActivityItemProps {
  icon: React.ReactNode;
  iconBgColor: string;
  label: string;
  timestamp: number;
}

export function ActivityItem({ icon, iconBgColor, label, timestamp }: ActivityItemProps) {
  const formatted = formatActivityDate(timestamp);
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className={`size-6 rounded-full ${iconBgColor} flex items-center justify-center mt-0.5`}>
        {icon}
      </div>
      <div>
        <p className="text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">{formatted}</p>
      </div>
    </div>
  );
}

function formatActivityDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  hasBorder?: boolean;
}

export function SidebarSection({ title, children, hasBorder = false }: SidebarSectionProps) {
  return (
    <div
      className={
        hasBorder ? "border-t border-white/5 pt-4 mt-4" : "mb-6 pb-4 border-b border-white/5"
      }
    >
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

interface SidebarPropertyProps {
  label: string;
  children: React.ReactNode;
}

export function SidebarProperty({ label, children }: SidebarPropertyProps) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}
