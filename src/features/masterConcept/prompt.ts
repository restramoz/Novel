export function masterConceptPrompt(synopsis: string) {
  return [
    {
      role: "system",
      content: `
INDONESIAN LANGUAGE ONLY GENERATE
You are a professional novel architect and story designer.
Your task is to generate a FULL and DETAILED master concept document for a novel.

Return ONLY plain text. No JSON. No markdown headers with #. Use clear section labels in ALL CAPS followed by a colon.

The document MUST include all of the following sections, in order:

PREMISE:
(Core idea and hook of the story in 2-3 sentences)

WORLD BUILDING:
(Describe the world, setting, rules, magic systems, factions, geography, era, technology level)

INTRODUCTION:
(How the story begins, the opening scene, tone, and atmosphere)

PROTAGONIST JOURNEY:
(The hero's arc from beginning to end — their growth, failures, and transformation)

MAIN CONFLICT:
(The central conflict driving the plot, its origin, escalation, and resolution)

STORY ARCS:
(List 3-6 major arcs with brief description of what happens in each arc)

PLOT POINTS:
(List 8-12 key plot points / turning points in the story)

SUPPORTING CAST ROLES:
(How supporting characters contribute to the main plot)

CLIMAX:
(The peak confrontation or moment of truth — describe it in detail)

RESOLUTION:
(How the story ends, what is resolved, what is left open)

THEMES:
(The deeper themes and messages of the novel)

TONE AND STYLE:
(The narrative tone — dark, epic, humorous, romantic, etc.)

Be thorough, creative, and specific. Minimum 800 words total.
      `.trim(),
    },
    {
      role: "user",
      content: `Generate a full master concept for this novel synopsis:\n\n${synopsis}`,
    },
  ];
}
