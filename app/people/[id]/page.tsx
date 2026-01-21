import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getPerson, getAdjacentPeople } from "@/lib/db/queries";
import {
  IconArrowLeft,
  IconChevronDown,
  IconChevronUp,
  IconStar,
  IconDotsVertical,
  IconCircle,
  IconLoader2,
  IconCircleCheck,
  IconCircleX,
  IconBuilding,
  IconBrandLinkedin,
  IconMail,
  IconCalendar,
  IconBriefcase,
  IconUser,
} from "@tabler/icons-react";
import { PersonResearchPanel } from "@/components/people/person-research-panel";
import { EnrichEmailButton } from "@/components/people/enrich-email-button";

// Revalidate data every 30 seconds
export const revalidate = 30;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const personId = parseInt(id, 10);

  if (isNaN(personId)) {
    return { title: "Person Not Found" };
  }

  const person = await getPerson(personId);

  if (!person) {
    return { title: "Person Not Found" };
  }

  return {
    title: `${person.firstName} ${person.lastName}`,
    description: `${person.firstName} ${person.lastName}${person.title ? ` - ${person.title}` : ""} at ${person.companyName}`,
  };
}

type StatusType = "pending" | "in_progress" | "completed" | "failed";

const statusConfig: Record<
  StatusType,
  { label: string; icon: typeof IconCircle; color: string; bgColor: string }
> = {
  pending: {
    label: "Pending",
    icon: IconCircle,
    color: "text-muted-foreground",
    bgColor: "bg-muted-foreground/20",
  },
  in_progress: {
    label: "In Progress",
    icon: IconLoader2,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/20",
  },
  completed: {
    label: "Completed",
    icon: IconCircleCheck,
    color: "text-green-500",
    bgColor: "bg-green-500/20",
  },
  failed: { label: "Failed", icon: IconCircleX, color: "text-red-500", bgColor: "bg-red-500/20" },
};

export default async function PersonDetailPage({ params }: PageProps) {
  const { id } = await params;
  const personId = parseInt(id, 10);

  if (isNaN(personId)) {
    notFound();
  }

  const person = await getPerson(personId);

  if (!person) {
    notFound();
  }

  const adjacentPeople = await getAdjacentPeople(personId);
  const { prevPerson, nextPerson, currentIndex, total } = adjacentPeople;

  const fullName = `${person.firstName} ${person.lastName}`;
  const status = (person.researchStatus || "pending") as StatusType;
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <>
      {/* Header bar */}
      <header className="h-10 border-b border-white/5 flex items-center px-3 gap-2">
        {/* Breadcrumb */}
        <Link
          href="/people"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-1.5 text-sm">
          <Link href="/people" className="text-muted-foreground hover:text-foreground">
            People
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{fullName}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-2">
          <button className="p-1 rounded hover:bg-white/5 text-muted-foreground">
            <IconStar className="w-4 h-4" />
          </button>
          <button className="p-1 rounded hover:bg-white/5 text-muted-foreground">
            <IconDotsVertical className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1" />

        {/* Navigation between people */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>
            {currentIndex} / {total}
          </span>
          <Link
            href={prevPerson ? `/people/${prevPerson.id}` : "#"}
            className={`p-1 rounded hover:bg-white/5 ${!prevPerson ? "opacity-30 pointer-events-none" : ""}`}
          >
            <IconChevronUp className="w-4 h-4" />
          </Link>
          <Link
            href={nextPerson ? `/people/${nextPerson.id}` : "#"}
            className={`p-1 rounded hover:bg-white/5 ${!nextPerson ? "opacity-30 pointer-events-none" : ""}`}
          >
            <IconChevronDown className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Content with right sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main content */}
        <div className="flex-1 overflow-y-scroll scroll-stable">
          <div className="max-w-4xl mx-auto px-8 py-6">
            {/* Title */}
            <h1 className="text-2xl font-semibold mb-1">{fullName}</h1>
            <p className="text-muted-foreground mb-6">
              {person.title && <span>{person.title}</span>}
              {person.title && person.companyName && <span> at </span>}
              <Link
                href={`/lead/${person.leadId}`}
                className="hover:text-foreground transition-colors"
              >
                {person.companyName}
              </Link>
            </p>

            {/* Research content */}
            <PersonResearchPanel
              personId={person.id}
              personName={fullName}
              personProfile={person.personProfile}
              companyName={person.companyName}
            />

            {/* Activity section */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium">Activity</h2>
              </div>
              <div className="space-y-3">
                {person.researchedAt && (
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                      <IconCircleCheck className="w-3.5 h-3.5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Research completed</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {new Date(person.researchedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                    <IconUser className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Person added</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {new Date(person.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Comment input */}
              <div className="mt-6">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/10 bg-white/[0.02] text-sm text-muted-foreground focus-within:border-white/20">
                  <input
                    type="text"
                    placeholder="Leave a note..."
                    className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar - Person Properties */}
        <aside className="w-64 border-l border-white/5 overflow-y-scroll scroll-stable shrink-0">
          <div className="p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Person
            </h3>

            <div className="space-y-4">
              {/* Status */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Status</div>
                <div className="flex items-center gap-1.5 text-sm">
                  <StatusIcon className={`w-4 h-4 ${config.color}`} />
                  <span>{config.label}</span>
                </div>
              </div>

              {/* Title */}
              {person.title && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Title</div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <IconBriefcase className="w-4 h-4 text-muted-foreground" />
                    <span>{person.title}</span>
                  </div>
                </div>
              )}

              {/* Management Level */}
              {person.managementLevel && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Level</div>
                  <span className="inline-flex px-2 py-0.5 rounded bg-white/5 text-xs">
                    {person.managementLevel}
                  </span>
                </div>
              )}

              {/* Year Joined */}
              {person.yearJoined && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Joined</div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <IconCalendar className="w-4 h-4 text-muted-foreground" />
                    <span>{person.yearJoined}</span>
                  </div>
                </div>
              )}

              {/* Company */}
              <div className="border-t border-white/5 pt-4 mt-4">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Company
                </h4>
                <Link
                  href={`/lead/${person.leadId}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <IconBuilding className="w-4 h-4" />
                  <span>{person.companyName}</span>
                </Link>
                {person.companyIndustry && (
                  <div className="mt-2 text-xs text-muted-foreground/70">
                    {person.companyIndustry}
                  </div>
                )}
              </div>

              {/* Contact & Hunter.io Enrichment */}
              <div className="border-t border-white/5 pt-4 mt-4">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Contact
                </h4>
                <div className="space-y-3">
                  {/* Email with Hunter.io enrichment */}
                  <EnrichEmailButton
                    personId={person.id}
                    currentEmail={person.email}
                  />

                  {/* LinkedIn */}
                  {person.linkedinUrl && (
                    <a
                      href={person.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <IconBrandLinkedin className="w-4 h-4" />
                      <span>LinkedIn</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Research date */}
              {person.researchedAt && (
                <div className="border-t border-white/5 pt-4 mt-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <IconCalendar className="w-3.5 h-3.5" />
                    <span>
                      Researched{" "}
                      {new Date(person.researchedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
