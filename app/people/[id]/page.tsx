import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getPerson, getAdjacentPeople } from "@/lib/db/queries";
import {
  IconBuilding,
  IconBrandLinkedin,
  IconMail,
  IconCalendar,
  IconBriefcase,
  IconUser,
  IconCircleCheck,
} from "@tabler/icons-react";
import { PersonProfileTabs } from "@/components/people/person-profile-tabs";
import { UserStatusSelector } from "@/components/status/user-status-selector";
import { ResearchStatusBadge } from "@/components/status/research-status-badge";
import { validatePersonUserStatus } from "@/lib/constants/status-config";
import {
  EntityDetailLayout,
  ActivityItem,
  SidebarSection,
  SidebarProperty,
} from "@/components/layout/entity-detail-layout";

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
  const userStatus = validatePersonUserStatus(person.userStatus);

  const subtitle = (
    <>
      {person.title && <span>{person.title}</span>}
      {person.title && person.companyName && <span> at </span>}
      <Link href={`/lead/${person.leadId}`} className="hover:text-foreground transition-colors">
        {person.companyName}
      </Link>
    </>
  );

  const activityContent = (
    <>
      {person.researchedAt && (
        <ActivityItem
          icon={<IconCircleCheck className="w-3.5 h-3.5 text-green-500" />}
          iconBgColor="bg-green-500/20"
          label="Research completed"
          date={new Date(person.researchedAt)}
        />
      )}
      <ActivityItem
        icon={<IconUser className="w-3.5 h-3.5 text-primary" />}
        iconBgColor="bg-primary/20"
        label="Person added"
        date={new Date(person.createdAt)}
      />
    </>
  );

  const sidebarContent = (
    <>
      <SidebarSection title="Status">
        <UserStatusSelector type="person" entityId={person.id} currentStatus={userStatus} />
      </SidebarSection>

      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Person
      </h3>

      <div className="space-y-4">
        <SidebarProperty label="Research">
          <ResearchStatusBadge status={person.researchStatus} showLabel size="md" />
        </SidebarProperty>

        {person.title && (
          <SidebarProperty label="Title">
            <div className="flex items-center gap-1.5 text-sm">
              <IconBriefcase className="w-4 h-4 text-muted-foreground" />
              <span>{person.title}</span>
            </div>
          </SidebarProperty>
        )}

        {person.managementLevel && (
          <SidebarProperty label="Level">
            <span className="inline-flex px-2 py-0.5 rounded bg-white/5 text-xs">
              {person.managementLevel}
            </span>
          </SidebarProperty>
        )}

        {person.yearJoined && (
          <SidebarProperty label="Joined">
            <div className="flex items-center gap-1.5 text-sm">
              <IconCalendar className="w-4 h-4 text-muted-foreground" />
              <span>{person.yearJoined}</span>
            </div>
          </SidebarProperty>
        )}

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
            <div className="mt-2 text-xs text-muted-foreground/70">{person.companyIndustry}</div>
          )}
        </div>

        {(person.email || person.linkedinUrl) && (
          <div className="border-t border-white/5 pt-4 mt-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Contact
            </h4>
            <div className="space-y-2">
              {person.email && (
                <a
                  href={`mailto:${person.email}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <IconMail className="w-4 h-4" />
                  <span className="truncate">{person.email}</span>
                </a>
              )}
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
        )}

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
    </>
  );

  return (
    <EntityDetailLayout
      backHref="/people"
      breadcrumbLabel="People"
      title={fullName}
      subtitle={subtitle}
      prevUrl={prevPerson ? `/people/${prevPerson.id}` : null}
      nextUrl={nextPerson ? `/people/${nextPerson.id}` : null}
      currentIndex={currentIndex}
      totalItems={total}
      mainContent={
        <PersonProfileTabs
          personId={person.id}
          personName={fullName}
          personProfile={person.personProfile}
          conversationTopics={person.conversationTopics}
          companyName={person.companyName}
        />
      }
      activityContent={activityContent}
      sidebarContent={sidebarContent}
    />
  );
}
