You are analyzing a company's website to create a comprehensive profile for B2B sales and marketing purposes.

## Company to Analyze
- Company Name: {{company_name}}
- Product Name: {{product_name}}
- Website: {{website}}

## Research Strategy

1. **Start with the website** - Browse {{website}} thoroughly to understand their offering
2. **Use web search** - Find recent news, funding information, analyst coverage
3. **Check LinkedIn** - Look for company size, recent hires, growth indicators
4. **Look at competitors** - Find comparison articles and competitive landscape

## Analysis Task

Extract and organize information into these sections:

### 1. Target Audience
Identify who this company sells to. Include:
- Company sizes (SMB, mid-market, enterprise) - specific employee counts if mentioned
- Industries/verticals they serve
- Job titles of decision makers they target
- Geographic focus (regions/countries)
- Use cases and pain points they address

Format as JSON array:
```json
[
  {
    "segment": "Segment name (e.g., Marketing Leaders)",
    "description": "Detailed description of this audience segment",
    "indicators": [
      "Specific signals that indicate a company matches this segment"
    ]
  }
]
```

### 2. Unique Selling Propositions (USPs)
What makes this company's offering unique? Be specific and evidence-based.
- Key differentiators vs competitors
- Technology advantages (if applicable)
- Business model innovations
- Outcome-focused value propositions with metrics if available

Format as JSON array:
```json
[
  {
    "headline": "Clear, concise USP statement (max 60 characters)",
    "explanation": "Detailed explanation with evidence from website (max 200 characters)",
    "evidence": [
      "Specific proof points cited from website content"
    ]
  }
]
```

### 3. Marketing Narrative
How should this company describe itself to prospects? Write as if you're writing their website copy.

Include:
- Brand positioning statement
- Key messaging themes (3-5 main points)
- Value propositions by segment
- Proof points and social proof (customer logos, testimonials, metrics)

Write as well-structured markdown with headings and bullet points.

### 4. Sales Narrative
How should salespeople talk about this company? Include:

**Elevator Pitch** (2-3 sentences max, 200 characters):
```
A concise pitch that answers "What do you do?" in a compelling way.
```

**Key Talking Points** for sales calls:
- Problem agitation: What pain points do they address?
- Solution presentation: How do they solve it?
- Social proof: What results have they achieved?
- Objection handling: Common concerns and responses
- Call to action: What's the next step?

Format as JSON array:
```json
[
  {
    "category": "problem|solution|social-proof|cta|custom",
    "content": "Specific talking point for this category",
    "order": 1
  }
]
```

### 5. Competitors
Who competes with this company? Be thorough and specific.

Format as JSON array:
```json
[
  {
    "name": "Competitor company name",
    "type": "direct|indirect|alternative",
    "website": " competitor website if found",
    "strengths": [
      "What this competitor does well"
    ],
    "weaknesses": [
      "Where they fall short compared to {{company_name}}"
    ],
    "differentiation": "How {{company_name}} is different from this competitor"
  }
]
```

### 6. Market Insights
What broader market context is relevant? Think strategically.

Include:
- Industry trends affecting this space
- Market challenges the company addresses
- Timing factors (why now?)
- Regulatory/environmental factors
- Growth opportunities

Format as JSON array:
```json
[
  {
    "category": "trends|challenges|opportunities|timing|regulation|other",
    "content": "Specific insight with context",
    "relevance": "Why this matters for {{company_name}} specifically"
  }
]
```

## Output Instructions

1. **Browse first** - Use web browsing tools to thoroughly research the website
2. **Be specific** - Cite actual information found, don't make things up
3. **Be thorough** - The more complete the profile, the better it will serve for lead qualification
4. **Handle uncertainty** - If you cannot find information for a section, state that explicitly rather than guessing

## Final Output Format

Provide your response in this exact structure:

```markdown
# Company Profile Analysis for {{company_name}}

## Target Audience
[Your analysis of who they sell to]

## Unique Selling Propositions
[Your analysis of what makes them unique]

## Marketing Narrative
[Your suggested marketing copy]

## Sales Narrative
[Your suggested sales approach]

## Competitors
[Your competitive analysis]

## Market Insights
[Your market context analysis]
```

At the END of your response, include a JSON block with all structured data:

```json
{
  "targetAudience": [...],
  "usps": [...],
  "salesNarrative": {...},
  "competitors": [...],
  "marketInsights": [...]
}
```

The marketing and sales narratives should be in markdown format BEFORE the JSON block.
