import { Link } from "react-router-dom";
import {
  IconArrowLeft,
  IconChevronDown,
  IconChevronUp,
  IconStar,
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconCheck,
  IconX,
  IconBold,
  IconItalic,
  IconList,
  IconCode,
} from "@tabler/icons-react";
import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";

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
  /** Callback to add a note */
  onAddNote?: (content: string) => Promise<void>;
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
  onAddNote,
}: EntityDetailLayoutProps) {
  const [noteContent, setNoteContent] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormat = (prefix: string, suffix: string = "") => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = noteContent;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newText = before + prefix + selection + suffix + after;
    setNoteContent(newText);

    // Defer focus and selection update to next tick to ensure state update has processed
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = start + prefix.length + selection.length + suffix.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleNoteKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!noteContent.trim() || !onAddNote || isSubmittingNote) return;

      setIsSubmittingNote(true);
      try {
        await onAddNote(noteContent);
        setNoteContent("");
      } finally {
        setIsSubmittingNote(false);
      }
    }
  };

  return (
    <>
      <header data-tauri-drag-region className="h-10 border-b border-sidebar-border flex items-center px-3 gap-2">
        <Link
          to={backHref}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-1.5 text-sm">
          <Link to={backHref} className="text-muted-foreground hover:text-foreground">
            {breadcrumbLabel}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{title}</span>
        </div>

        <div className="flex items-center gap-1 ml-2">
          <button className="p-1 rounded hover:bg-muted text-muted-foreground">
            <IconStar className="w-4 h-4" />
          </button>
          <button className="p-1 rounded hover:bg-muted text-muted-foreground">
            <IconDotsVertical className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1" data-tauri-drag-region />

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>
            {currentIndex} / {totalItems}
          </span>
          <Link
            to={prevUrl ?? "#"}
            className={`p-1 rounded hover:bg-muted ${!prevUrl ? "opacity-30 pointer-events-none" : ""}`}
          >
            <IconChevronUp className="w-4 h-4" />
          </Link>
          <Link
            to={nextUrl ?? "#"}
            className={`p-1 rounded hover:bg-muted ${!nextUrl ? "opacity-30 pointer-events-none" : ""}`}
          >
            <IconChevronDown className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-scroll scroll-stable">
          <div className="max-w-4xl mx-auto px-8 py-6">
            <h1 className="text-2xl font-semibold mb-1">{title}</h1>
            <p className="text-muted-foreground mb-6">{subtitle}</p>

            {mainContent}

            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium">Activity</h2>
              </div>

              <div className="mb-6 relative">
                <div className="flex items-center gap-1 mb-2 p-1 bg-secondary/20 rounded-md border border-border/50 w-fit">
                  <button
                    type="button"
                    onClick={() => insertFormat("**", "**")}
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                    title="Bold"
                  >
                    <IconBold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormat("*", "*")}
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                    title="Italic"
                  >
                    <IconItalic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormat("- ")}
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                    title="List"
                  >
                    <IconList className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormat("`", "`")}
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                    title="Code"
                  >
                    <IconCode className="w-4 h-4" />
                  </button>
                </div>
                <Textarea
                  ref={textareaRef}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  onKeyDown={handleNoteKeyDown}
                  disabled={isSubmittingNote}
                  placeholder="Leave a note... (supports **bold**, *italic*, - lists, `code`)"
                  className="min-h-[80px] pr-12 resize-none bg-secondary/30 border-border focus-visible:ring-1 focus-visible:ring-primary/20"
                />
                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground/50 pointer-events-none">
                  ↵ to submit
                </div>
              </div>

              <div className="space-y-3">
                {activityContent}
              </div>
            </div>
          </div>
        </div>

        <aside className="w-64 border-l bg-sidebar border-sidebar-border overflow-y-scroll scroll-stable shrink-0">
          <div className="p-4">{sidebarContent}</div>
        </aside>
      </div>
    </>
  );
}

interface ActivityItemProps {
  icon: React.ReactNode;
  iconBgColor: string;
  label: React.ReactNode;
  date: Date;
  isEditable?: boolean;
  onEdit?: (newContent: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function ActivityItem({ icon, iconBgColor, label, date, isEditable, onEdit, onDelete }: ActivityItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  // Initialize edit content from label if it's a string or element containing string
  const startEdit = () => {
    let content = "";
    if (typeof label === 'string') {
      content = label;
    } else if (React.isValidElement(label)) {
      const element = label as React.ReactElement<{ children: string }>;
      if (element.props.children) {
        content = element.props.children;
      }
    }
    setEditContent(content);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (onEdit) {
      await onEdit(editContent);
      setIsEditing(false);
    }
  };

  const content = isEditing ? (
    <div className="flex flex-col gap-2 w-full">
      <Textarea
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        className="min-h-[60px] resize-y"
      />
      <div className="flex items-center gap-2">
        <button onClick={handleSave} className="p-1 hover:bg-green-500/10 text-green-500 rounded"><IconCheck className="w-4 h-4" /></button>
        <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-red-500/10 text-red-500 rounded"><IconX className="w-4 h-4" /></button>
      </div>
    </div>
  ) : (
    <div className="prose prose-sm dark:prose-invert max-w-none [&>*]:text-foreground [&_strong]:text-foreground [&_em]:text-foreground [&_code]:text-foreground [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_ul]:text-foreground [&_li]:text-foreground">
      {typeof label === 'string' ? <ReactMarkdown>{label}</ReactMarkdown> : label}
    </div>
  );

  return (
    <div className="flex items-start gap-3 text-sm group">
      <div
        className={`w-6 h-6 rounded-full ${iconBgColor} flex items-center justify-center mt-0.5 shrink-0`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        {content}
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          {date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>
      {isEditable && !isEditing && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button onClick={startEdit} className="p-1 hover:bg-secondary text-muted-foreground rounded" title="Edit">
            <IconPencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1 hover:bg-red-500/10 text-red-500 rounded" title="Delete">
            <IconTrash className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
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
        hasBorder ? "border-t border-sidebar-border pt-4 mt-4" : "mb-6 pb-4 border-b border-sidebar-border"
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
