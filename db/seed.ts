import { db, leads, prompts, scoringConfig } from "./index";
import { defaultScoringConfig } from "../lib/types/scoring";

async function seed() {
  console.log("Seeding database...");

  // 1. Insert sample company "OpenCode"
  const [openCode] = await db
    .insert(leads)
    .values({
      companyName: "OpenCode",
      website: "https://opencode.ai",
      researchStatus: "pending",
    })
    .returning();

  console.log(`Created sample company: ${openCode.companyName} (id: ${openCode.id})`);

  // 2. Insert company research prompt
  const companyPromptContent = `You are a sales research analyst. Research this company for sales qualification using the target company information and our company context provided above.

## What to Discover

**Company Fundamentals**
- What they do, business model, stage, and size
- Growth trajectory (hiring trends, funding, expansion signals)

**Demand Signals**
- Evidence they have problems we solve
- Technology stack and gaps
- Team composition relevant to our solution

**Buying Readiness**
- Budget signals (recent funding, relevant spending)
- Timeline indicators (active projects, urgency)

**Key Contacts**
- Decision makers (own problem + budget)
- Champions (users who feel the pain)
- Include LinkedIn URLs when found

**Personalization Intel**
- Recent news, announcements, job postings
- Specific details for outreach personalization

## Output

Write a concise company profile covering the above. End with a qualification assessment (Hot/Warm/Nurture/Disqualified) with reasoning.`;

  const [companyPrompt] = await db
    .insert(prompts)
    .values({
      type: "company",
      content: companyPromptContent,
    })
    .returning();

  console.log(`Created company research prompt (id: ${companyPrompt.id})`);

  // 3. Insert person research prompt
  const personPromptContent = `You are a sales research analyst. Research this prospect for personalized outreach using the person and company information provided above.

## What to Discover

**Role & Authority**
- What they own and are measured on
- Decision-making power vs influencer
- Team size and reporting structure

**Career Context**
- Trajectory and previous companies
- Have they used solutions like ours before?

**Rapport Hooks**
- Mutual connections (especially our customers)
- Recent LinkedIn activity and posts
- Education, interests, career milestones

**Communication Style**
- LinkedIn activity level and tone
- Technical detail vs big picture preference

**Inferred Pain Points**
- Based on role, what challenges do they face?
- What would make them look good to their boss?

## Output

Write a prospect profile enabling personalized outreach:
- Specific opening hook from your research
- 2-3 pain points likely relevant to their role
- Meeting angle that would resonate

If this seems like the wrong contact, suggest who to reach instead.`;

  const [personPrompt] = await db
    .insert(prompts)
    .values({
      type: "person",
      content: personPromptContent,
    })
    .returning();

  console.log(`Created person research prompt (id: ${personPrompt.id})`);

  // 4. Insert conversation topics prompt
  const conversationPromptContent = `You are preparing conversation topics for an upcoming call with this prospect. Use the person profile and company context above to generate actionable call prep.

## Generate

**Opening Hooks** (2-3 strongest options)
- Reference something specific from their LinkedIn
- Mutual connection or shared background
- Recent company news relevant to their role

**Discovery Questions**
- Questions about current situation and pain
- Questions about decision process
- Questions to surface urgency/timeline

**Value Angles**
- Benefits that matter to THIS person in THIS role
- Relevant proof points or case studies

**Objection Prep**
- Likely concerns for their company/role
- Response to "we already have something"
- Response to "not the right time"

Keep output actionable—a cheat sheet for the call, not an essay.`;

  const [conversationPrompt] = await db
    .insert(prompts)
    .values({
      type: "conversation_topics",
      content: conversationPromptContent,
    })
    .returning();

  console.log(`Created conversation topics prompt (id: ${conversationPrompt.id})`);

  // 5. Insert default scoring configuration
  const [scoring] = await db
    .insert(scoringConfig)
    .values({
      name: defaultScoringConfig.name,
      isActive: defaultScoringConfig.isActive,
      requiredCharacteristics: JSON.stringify(defaultScoringConfig.requiredCharacteristics),
      demandSignifiers: JSON.stringify(defaultScoringConfig.demandSignifiers),
      tierHotMin: defaultScoringConfig.tierHotMin,
      tierWarmMin: defaultScoringConfig.tierWarmMin,
      tierNurtureMin: defaultScoringConfig.tierNurtureMin,
    })
    .returning();

  console.log(`Created scoring config: ${scoring.name} (id: ${scoring.id})`);

  console.log("\nSeed completed successfully!");
  console.log("- 1 sample company (OpenCode)");
  console.log("- 3 research prompts (company, person, conversation)");
  console.log("- 1 scoring configuration");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
