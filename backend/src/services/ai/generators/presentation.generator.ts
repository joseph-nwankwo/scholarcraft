import { BaseGenerator, type GenerationParams } from './base.generator'
import type { DocumentType } from '@prisma/client'

export class PresentationGenerator extends BaseGenerator {
  readonly documentType: DocumentType = 'PRESENTATION'
  readonly moduleType = 'presentation'

  buildTitle(params: GenerationParams): string {
    return `Presentation: ${params.topic}${params.courseCode ? ` (${params.courseCode})` : ''}`
  }

  buildSystemPrompt(): string {
    return `You are an expert academic presenter and instructional designer specialising in creating structured presentation outlines for Nigerian higher education.
You produce slide-by-slide outlines optimised for PowerPoint or Google Slides with clear visual hierarchy, detailed speaker notes, and audience engagement strategies.
Adapt the structure, slide density, and tone to the requested presentation style.
Format in clean Markdown with clear slide delineation using consistent headings.`
  }

  buildPrompt(params: GenerationParams): string {
    const ci             = params.customInstructions ?? ''
    const style          = params.teachingStyle ?? 'Academic / Lecture'
    const duration       = params.duration ?? 60
    const bloom          = params.bloomLevel ? `Cognitive Level: ${this.bloomLabel(params.bloomLevel)}\n` : ''

    // Parse number of slides from customInstructions; clamp 5–60
    const slidesMatch    = ci.match(/Number of slides:\s*(\d+)\./)
    const n              = slidesMatch
      ? Math.max(5, Math.min(60, Number(slidesMatch[1])))
      : Math.max(10, Math.min(30, Math.round(duration / 2)))

    const withActivities = /Include engagement activities:\s*true\./.test(ci)

    // Body slides available for content (title, agenda, objectives, summary, refs, Q&A are fixed)
    const fixedSlides    = 6
    const contentSlides  = Math.max(3, n - fixedSlides)

    const styleBlock     = this.styleInstructions(style, withActivities)
    const contentBody    = this.buildContentSlides(style, contentSlides, params.topic, withActivities)
    const engagementAppendix = withActivities ? this.buildEngagementGuide(style, n) : ''

    return `Generate a complete, slide-by-slide presentation outline for:
${this.sourceContextBlock(params)}
Topic: ${params.topic}
Course: ${params.courseTitle ?? '[Course Name]'}${params.courseCode ? ` (${params.courseCode})` : ''}
Academic Level: ${this.levelLabel(params.academicLevel)}
Presentation Style: ${style}
Duration: ${duration} minutes
Total Slides: ${n}
${bloom}${this.commonInstructions(params) ? `Additional Requirements: ${this.commonInstructions(params)}` : ''}

${styleBlock}

Produce the full outline below — replace ALL placeholder content with actual, accurate material about "${params.topic}" at ${this.levelLabel(params.academicLevel)} level.

---

# ${params.topic}
## ${params.courseTitle ?? '[Course Name]'}${params.courseCode ? ` | ${params.courseCode}` : ''}

**Presentation Style:** ${style} · **Duration:** ${duration} min · **Slides:** ${n} · **Level:** ${this.levelLabel(params.academicLevel)}

---

## SLIDE 1 — TITLE SLIDE
**Layout:** Title Slide

### Content
- **Title:** ${params.topic}
- **Subtitle:** ${params.courseTitle ?? '[Course Name]'}${params.courseCode ? ` | ${params.courseCode}` : ''}
- **Presenter:** [Lecturer Name, Qualification]
- **Institution:** [Institution Name, Department]
- **Date:** [Date]

### Visual Suggestion
[Relevant header image, institutional logo, or thematic background]

### Speaker Notes
Welcome the audience. Introduce yourself briefly. State the purpose of the session and approximate duration.

---

## SLIDE 2 — AGENDA
**Layout:** Content Slide

### Content
**Today's Session:**
1. Learning Objectives
2. [Main Section 1]
3. [Main Section 2]
4. [Main Section 3]${withActivities ? '\n5. [Group Activity / Discussion]' : ''}
5. Summary & Key Takeaways
6. Q&A

### Speaker Notes
Walk through the agenda. Indicate roughly how long each section will take. Ask if anyone has prior knowledge of the topic.

---

## SLIDE 3 — LEARNING OBJECTIVES
**Layout:** Content Slide

### Content
**By the end of this ${this.sessionWord(style)}, you will be able to:**
- [CLO 1 — aligned to ${bloom || 'Remember / Understand'} level]
- [CLO 2 — relate to specific concept in ${params.topic}]
- [CLO 3 — apply to real-world scenario]
- [CLO 4 — analyse or evaluate]${style.includes('Research') ? '\n- [CLO 5 — critique methodology or findings]' : ''}

### Speaker Notes
Emphasise that these objectives link to assessed outcomes. Invite students to consider which areas they feel least confident about.

---

${contentBody}

## SLIDE ${n - 2} — SUMMARY & KEY TAKEAWAYS
**Layout:** Content Slide

### Content
**What we covered today:**
- ✅ [Key takeaway 1 — most important concept from ${params.topic}]
- ✅ [Key takeaway 2]
- ✅ [Key takeaway 3]
- ✅ [Key takeaway 4]
- ✅ [Key takeaway 5]

**Remember:**
> [One memorable, quotable statement that captures the essence of ${params.topic}]

**Next session:** [Brief preview of next lecture / week's topic]

### Speaker Notes
Recap each point. Ask two or three students to summarise in their own words. Preview the next session to build continuity.

---

## SLIDE ${n - 1} — REFERENCES & FURTHER READING
**Layout:** Content Slide

### Content
**Recommended Textbooks:**
1. [Author, A. B. (Year). *Title*. Publisher.]
2. [Author, A. B. (Year). *Title*. Publisher.]

**Key Articles / Online Resources:**
- [Journal article or reputable website]
- [Nigerian / African resource where applicable]

**Past Questions / Practice:**
- [Where to access past exam questions on this topic]

### Speaker Notes
Highlight which chapters cover today's content. Mention any resources relevant to the next assignment or test.

---

## SLIDE ${n} — Q&A / CLOSE
**Layout:** Title Slide

### Content
**Questions & Discussion**

*"What questions do you have?"*

**Next Lecture:** [Topic]
**Office Hours:** [Day, Time, Location]
**Email:** [Institutional email]
**Assignment Due:** [If applicable]

### Speaker Notes
Open the floor. Address common misconceptions proactively. If no questions, pose a reflection question: "What was the most surprising thing you learned today?" Remind students of any upcoming deadlines.

---

## TIMING GUIDE

| Section | Slides | Suggested Time |
|---------|--------|----------------|
| Title & Agenda | 1–2 | ${Math.ceil(duration * 0.08)} min |
| Objectives | 3 | ${Math.ceil(duration * 0.05)} min |
| Main Content | 4–${n - 3} | ${Math.floor(duration * 0.65)} min |
| Summary | ${n - 2} | ${Math.ceil(duration * 0.08)} min |
| References | ${n - 1} | ${Math.ceil(duration * 0.04)} min |
| Q&A | ${n} | ${Math.floor(duration * 0.10)} min |
| **Total** | **${n}** | **${duration} min** |

---

## DESIGN RECOMMENDATIONS

${this.designNotes(style)}

${engagementAppendix}`
  }

  // ── Style-specific builders ───────────────────────────────────────────────

  private styleInstructions(style: string, withActivities: boolean): string {
    const s = style.toLowerCase()
    if (s.includes('interactive') || s.includes('workshop')) {
      return `STYLE GUIDANCE: This is an INTERACTIVE / WORKSHOP presentation.
- Alternate content slides with activity or discussion prompts
- Keep content slides concise (3–5 bullet points max) — participants will fill in details through activities
- Include clear activity instructions on designated slides${withActivities ? ' (add extra activity slides as needed)' : ''}
- Speaker notes should include facilitator tips and expected responses`
    }
    if (s.includes('research') || s.includes('conference')) {
      return `STYLE GUIDANCE: This is a RESEARCH / CONFERENCE presentation.
- Structure: Background → Research Gap → Methodology → Findings → Discussion → Conclusion → Future Work
- Use data-focused slides (charts, tables, key statistics)
- Maintain formal academic register throughout
- Include a dedicated limitations slide
- Speaker notes should reference specific data points and anticipate audience questions`
    }
    if (s.includes('professional') || s.includes('corporate')) {
      return `STYLE GUIDANCE: This is a PROFESSIONAL / CORPORATE presentation.
- Executive summary on slide 2 (key message upfront)
- Data-driven slides with clear visuals (avoid dense text)
- End with clear recommendations or calls to action
- Speaker notes should be punchy and results-focused`
    }
    if (s.includes('student') || s.includes('engaging')) {
      return `STYLE GUIDANCE: This is a STUDENT-FACING / ENGAGING presentation.
- Conversational, accessible language — avoid dense jargon
- Include a fun fact, real-world hook, or relatable scenario on the opening content slide
- Use frequent questions to check understanding
- Lighter slide content (5–6 words per bullet) with rich speaker notes${withActivities ? '\n- Include at least 2 interactive activity slides' : ''}
- End with a memorable takeaway or challenge question`
    }
    // Default: Academic / Lecture
    return `STYLE GUIDANCE: This is an ACADEMIC / LECTURE presentation.
- Structured, formal tone appropriate for higher education
- Each content slide covers one main concept with 4–6 supporting bullet points
- Speaker notes provide full explanations the lecturer would deliver verbally
- Include definitions, theoretical frameworks, and real-world examples`
  }

  private buildContentSlides(style: string, n: number, topic: string, withActivities: boolean): string {
    const s = style.toLowerCase()
    const slides: string[] = []

    if (s.includes('research') || s.includes('conference')) {
      const sections = [
        { title: 'BACKGROUND & CONTEXT',       content: ['Situate the research within the broader field', 'Key definitions and scope of study', 'Why this topic matters now (current relevance)'] },
        { title: 'RESEARCH GAP & PROBLEM STATEMENT', content: ['What is not yet known or adequately addressed?', 'The specific problem this research addresses', 'Research questions / hypotheses'] },
        { title: 'METHODOLOGY',                 content: ['Research design (qualitative / quantitative / mixed)', 'Data collection instruments and procedures', 'Sample / population and sampling technique', 'Data analysis approach'] },
        { title: 'KEY FINDINGS',                content: ['Finding 1 — [specific result with data]', 'Finding 2 — [specific result with data]', 'Finding 3 — [specific result with data]', '[Insert chart or table of main results]'] },
        { title: 'DISCUSSION',                  content: ['Interpretation of findings in context', 'Comparison with prior studies', 'Theoretical implications'] },
        { title: 'LIMITATIONS',                 content: ['Limitation 1 — [specific constraint]', 'Limitation 2 — [and its impact]', 'How limitations were mitigated'] },
        { title: 'CONCLUSION & RECOMMENDATIONS', content: ['Key conclusion drawn from findings', 'Practical recommendations for stakeholders', 'Contribution to knowledge'] },
        { title: 'FUTURE RESEARCH DIRECTIONS',  content: ['Gap 1 that remains for future study', 'Suggested methodology for follow-up study', 'Potential collaborations or funding directions'] },
      ]
      for (let i = 0; i < n; i++) {
        const sec = sections[i % sections.length]
        slides.push(this.slide(i + 4, sec.title, sec.content, topic, 'Chart / Table / Diagram as appropriate', this.speakerNote(style, sec.title, topic)))
      }
    } else if (s.includes('interactive') || s.includes('workshop')) {
      for (let i = 0; i < n; i++) {
        const isActivity = withActivities && i > 0 && i % 3 === 2
        if (isActivity) {
          slides.push(`## SLIDE ${i + 4} — ACTIVITY ${Math.ceil((i + 1) / 3)}
**Layout:** Activity / Workshop Slide

### Content
**🎯 Activity: [Activity Name]**

**Instructions:**
1. [Step 1 — what participants should do]
2. [Step 2 — e.g., discuss in pairs / small groups]
3. [Step 3 — share back with the group]

**Time:** [X minutes]

**Guiding Question:** [Specific question related to ${topic}]

### Speaker Notes
Set up the activity clearly. Circulate during group work. Bring the group back together and facilitate sharing. Synthesise key points before moving on.

---

`)
        } else {
          slides.push(this.slide(
            i + 4,
            `[Content Topic ${i + 1} related to ${topic}]`,
            [
              '[Core concept — keep to 5–6 words]',
              '[Supporting point — brief]',
              '[Example or application]',
              '[Reflection question for participants]',
            ],
            topic,
            '[Diagram, visual, or prompt question on screen]',
            `Deliver this section conversationally. Pause after the reflection question and invite 2–3 responses before moving on. Allocate ~${Math.floor(3)} minutes.`
          ))
        }
      }
    } else {
      // Academic / Lecture, Professional, Student-facing — standard content slides
      for (let i = 0; i < n; i++) {
        slides.push(this.slide(
          i + 4,
          `[Content Slide ${i + 1}: Key aspect of ${topic}]`,
          [
            `[Key Point 1 — specific concept about ${topic}]`,
            '[Key Point 2 — definition / theory / framework]',
            '[Key Point 3 — application or example]',
            '[Key Point 4 — Nigerian / African context if relevant]',
          ],
          topic,
          '[Diagram / Chart / Image / Table that illustrates this concept]',
          this.speakerNote(style, `Content Slide ${i + 1}`, topic)
        ))
      }
    }

    return slides.join('\n')
  }

  private slide(num: number, title: string, bullets: string[], _topic: string, visual: string, notes: string): string {
    return `## SLIDE ${num} — ${title}
**Layout:** Content with Title

### Content
${bullets.map((b) => `- ${b}`).join('\n')}

### Visual Suggestion
${visual}

### Speaker Notes
${notes}

---

`
  }

  private speakerNote(style: string, section: string, topic: string): string {
    const s = style.toLowerCase()
    if (s.includes('professional') || s.includes('corporate')) {
      return `Lead with the headline insight. Support with data. Keep to 2–3 minutes. End with a transition statement to the next slide.`
    }
    if (s.includes('student') || s.includes('engaging')) {
      return `Start with a relatable question or real-world hook on ${topic}. Use simple language. Check for understanding with a quick show of hands or question. Approx. 3 minutes.`
    }
    return `Explain ${section} in depth. Connect to prior knowledge and real-world application in ${topic}. Pause to check understanding. Allocate approximately ${Math.ceil(2)} minutes per slide.`
  }

  private sessionWord(style: string): string {
    if (style.toLowerCase().includes('workshop')) return 'workshop'
    if (style.toLowerCase().includes('conference')) return 'presentation'
    return 'lecture'
  }

  private designNotes(style: string): string {
    const s = style.toLowerCase()
    if (s.includes('research') || s.includes('conference')) {
      return `- **Colour scheme:** Neutral academic palette (dark navy / white / grey)
- **Fonts:** Serif for headings (Times New Roman / Georgia), Sans-serif for body
- **Charts:** Use high-contrast colours; include data labels
- **Transitions:** None or subtle Fade — keep professional
- **Density:** Data-focused slides can carry more content than general slides`
    }
    if (s.includes('student') || s.includes('engaging')) {
      return `- **Colour scheme:** Vibrant but accessible (check WCAG contrast ratios)
- **Fonts:** Clean sans-serif (Calibri / Arial / Nunito)
- **Visuals:** Use images, icons, and infographics — minimum text per slide
- **Transitions:** Appear or Wipe — avoid distracting effects
- **Interactivity:** Consider embedding Mentimeter / Kahoot QR codes on activity slides`
    }
    if (s.includes('interactive') || s.includes('workshop')) {
      return `- **Colour scheme:** Warm, inviting palette (teal / orange / white)
- **Activity slides:** Distinct background colour to signal mode change
- **Fonts:** Clean sans-serif at 24pt minimum for readability
- **Transitions:** Consistent Fade; pause after activity slides for discussion time`
    }
    // Default: Academic / Professional
    return `- **Colour scheme:** Institutional colours or neutral professional palette
- **Fonts:** Sans-serif (Calibri / Arial) — minimum 24pt for body text
- **Transitions:** Appear or Fade — avoid excessive animation
- **Slide density:** 4–6 bullets per slide maximum; offload detail to speaker notes
- **Accessibility:** Ensure sufficient colour contrast (WCAG AA); use alt text on images`
  }

  private buildEngagementGuide(style: string, totalSlides: number): string {
    const s = style.toLowerCase()
    return `---

## ENGAGEMENT & ACTIVITY GUIDE

${s.includes('interactive') || s.includes('workshop') ? `### Workshop Activities
| # | Activity Type | When | Duration | Description |
|---|--------------|------|----------|-------------|
| 1 | Think-Pair-Share | Slide ~5 | 5 min | Pose a problem; pairs discuss; share back |
| 2 | Group Discussion | Slide ~${Math.floor(totalSlides / 2)} | 8 min | Small groups answer a guiding question |
| 3 | Case Study / Scenario | Slide ~${Math.floor(totalSlides * 0.7)} | 10 min | Apply concepts to a real scenario |
| 4 | Exit Ticket | Final slide | 3 min | Each participant writes one key takeaway |` : `### Recommended Engagement Checkpoints
| Slide | Strategy | Purpose |
|-------|----------|---------|
| 5 | Quick poll / show of hands | Gauge prior knowledge |
| ${Math.floor(totalSlides / 3)} | Think-Pair-Share | Consolidate first section |
| ${Math.floor(totalSlides / 2)} | Comprehension check question | Mid-point understanding |
| ${Math.floor(totalSlides * 0.75)} | Case study / worked example | Apply to real-world context |
| ${totalSlides - 1} | Exit ticket / one-sentence summary | Confirm learning before Q&A |`}

### Differentiation Tips
- **Struggling students:** Offer a worked example handout to follow along
- **Advanced students:** Pose extension questions ("What would happen if…?")
- **Large classes (>50):** Use Mentimeter, Slido, or WhatsApp polls for engagement`
  }
}

export const presentationGenerator = new PresentationGenerator()
