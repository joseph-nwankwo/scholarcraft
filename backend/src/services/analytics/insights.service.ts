import { AIProviderFactory } from '../ai/factory'
import { analyticsService } from './analytics.service'

export const insightsService = {
  async generateLecturerInsights(userId: string, institutionId: string | null): Promise<string> {
    const [dashboard, bloom, aiStats, _approvals] = await Promise.all([
      analyticsService.getLecturerDashboard(userId),
      analyticsService.getBloomCoverage({ userId }),
      analyticsService.getAIUsageStats({ userId }),
      analyticsService.getApprovalStats({ institutionId: institutionId ?? undefined }),
    ])

    const prompt = `You are an academic analytics expert. Based on the following teaching data for a lecturer, provide 5-7 specific, actionable insights and recommendations. Format as a numbered list with clear headings.

TEACHING DATA:
- Total documents: ${dashboard.summary.totalDocs}
- Documents this month: ${dashboard.summary.docsThisPeriod}
- Questions in bank: ${dashboard.summary.questionsCount}
- Assessments created: ${dashboard.summary.assessmentsCount}
- AI generations this month: ${dashboard.summary.aiGenerations}
- AI cost: $${dashboard.summary.aiCostUsd.toFixed(2)}
- Approval rate: ${dashboard.summary.approvalRate ?? 'N/A'}%

BLOOM'S TAXONOMY COVERAGE (questions):
Coverage score: ${bloom.coverageScore}%
Missing levels: ${bloom.missingLevels.join(', ') || 'None'}
Distribution: ${bloom.distribution.map((d) => `${d.level}: ${d.count} (${d.percentage}%)`).join(', ')}

DOCUMENT TYPES:
${dashboard.docsByType.map((t) => `${t.type}: ${t.count}`).join('\n')}

AI USAGE BY PROVIDER:
${aiStats.byProvider.map((p) => `${p.provider}: ${p.generations} generations, ${p.tokens} tokens, $${p.costUsd.toFixed(3)}`).join('\n')}

Generate insights covering:
1. Teaching productivity assessment
2. Bloom's taxonomy balance (higher-order vs lower-order thinking)
3. Assessment diversity and quality
4. AI utilization efficiency and cost optimization
5. Content type balance (lecture notes vs assessments vs etc.)
6. Approval workflow recommendations
7. Specific action items for the next 30 days`

    const ai = AIProviderFactory.getDefault()
    const response = await ai.generate({ prompt, maxTokens: 1000, temperature: 0.7 })
    return response.content
  },

  async generateInstitutionInsights(institutionId: string): Promise<string> {
    const [instData, _aiStats, assStats, leaderboard] = await Promise.all([
      analyticsService.getInstitutionDashboard(institutionId),
      analyticsService.getAIUsageStats({ institutionId }),
      analyticsService.getAssessmentStats({ institutionId }),
      analyticsService.getProductivityLeaderboard(institutionId),
    ])

    const topLecturers = leaderboard.slice(0, 5).map((l) => `${l.name} (${l.documents} docs, ${l.questions} questions)`)

    const prompt = `You are a higher education analytics consultant. Analyze this institution's academic data and provide strategic insights and recommendations. Be specific and actionable. Use numbered lists with clear categories.

INSTITUTION OVERVIEW:
- Active users: ${instData.summary.activeUsers} / ${instData.summary.totalUsers} total
- New users this month: ${instData.summary.newUsersThisPeriod}
- Total documents: ${instData.summary.totalDocs} (${instData.summary.docsThisPeriod} this month)
- Total questions: ${instData.summary.totalQuestions}
- Assessments: ${instData.summary.totalAssessments}
- Pending approvals: ${instData.summary.pendingApprovals}

AI ADOPTION:
- Total generations: ${instData.summary.aiGenerations}
- Total cost: $${instData.summary.aiCostUsd.toFixed(2)}
- AI cost trend: ${instData.summary.aiCostChange !== null ? `${instData.summary.aiCostChange > 0 ? '+' : ''}${instData.summary.aiCostChange}% vs last month` : 'First month'}
- Providers: ${instData.aiByProvider.map((p) => `${p.provider}: ${p.generations} uses`).join(', ')}

ASSESSMENT QUALITY:
- Questions: ${assStats.questions.total}
- By Bloom's: ${assStats.questions.byBloom.map((b) => `${b.level}:${b.count}`).join(', ')}
- By Difficulty: ${assStats.questions.byDifficulty.map((d) => `${d.difficulty}:${d.count}`).join(', ')}
- Moderation: ${assStats.questions.byModeration.map((m) => `${m.status}:${m.count}`).join(', ')}

TOP PRODUCTIVE LECTURERS:
${topLecturers.join('\n')}

Provide insights on:
1. AI adoption strategy and ROI
2. Content quality and assessment standards
3. Approval workflow bottlenecks
4. User engagement and platform utilization
5. Bloom's taxonomy institutional coverage
6. Cost optimization opportunities
7. Growth and scaling recommendations`

    const ai = AIProviderFactory.getDefault()
    const response = await ai.generate({ prompt, maxTokens: 1200, temperature: 0.7 })
    return response.content
  },

  async generateBloomInsights(opts: { userId?: string; institutionId?: string; courseId?: string }): Promise<string> {
    const bloom = await analyticsService.getBloomCoverage(opts)

    const prompt = `As an educational psychology expert, analyze this Bloom's taxonomy distribution and provide specific recommendations for improving cognitive diversity in assessments.

BLOOM'S DISTRIBUTION:
${bloom.distribution.map((d) => `${d.level}: ${d.count} questions (${d.percentage}%)`).join('\n')}
Coverage score: ${bloom.coverageScore}%
Missing levels: ${bloom.missingLevels.join(', ') || 'None — excellent coverage!'}
Total questions: ${bloom.total}

Bloom's Taxonomy reminder:
- REMEMBER (Level 1): Recall facts, recognize information
- UNDERSTAND (Level 2): Interpret, classify, explain
- APPLY (Level 3): Use information in new situations
- ANALYSE (Level 4): Draw connections, compare, contrast
- EVALUATE (Level 5): Make judgments, critique, defend
- CREATE (Level 6): Produce new work, design, construct

Provide:
1. Assessment of current cognitive level distribution
2. Specific gaps and why they matter
3. Question types to add for missing/underrepresented levels
4. Examples of questions at each level for this subject
5. Recommended final distribution for a balanced assessment`

    const ai = AIProviderFactory.getDefault()
    const response = await ai.generate({ prompt, maxTokens: 800, temperature: 0.7 })
    return response.content
  },

  async generateAssessmentInsights(opts: { userId?: string; institutionId?: string }): Promise<string> {
    const [assStats, bloom] = await Promise.all([
      analyticsService.getAssessmentStats(opts),
      analyticsService.getBloomCoverage(opts),
    ])

    const prompt = `As an assessment design expert, analyze this data and provide recommendations for improving assessment quality and coverage.

QUESTION BANK:
- Total: ${assStats.questions.total}
- By type: ${assStats.questions.byType.map((t) => `${t.type}:${t.count}`).join(', ')}
- By difficulty: ${assStats.questions.byDifficulty.map((d) => `${d.difficulty}:${d.count}`).join(', ')}
- Bloom's coverage: ${bloom.coverageScore}% (missing: ${bloom.missingLevels.join(', ') || 'none'})
- Moderation: ${assStats.questions.byModeration.map((m) => `${m.status}:${m.count}`).join(', ')}

ASSESSMENTS:
- Total: ${assStats.assessments.total}
- By type: ${assStats.assessments.byType.map((t) => `${t.type}:${t.count}`).join(', ')}
- By status: ${assStats.assessments.byStatus.map((s) => `${s.status}:${s.count}`).join(', ')}
- Rubrics: ${assStats.rubrics}
- Learning outcomes: ${assStats.outcomes}

Provide insights on:
1. Question type diversity (MCQ vs open-ended balance)
2. Difficulty distribution (easy/medium/hard balance)
3. Assessment coverage completeness
4. Moderation pipeline health
5. Learning outcome alignment
6. Specific recommendations with target numbers`

    const ai = AIProviderFactory.getDefault()
    const response = await ai.generate({ prompt, maxTokens: 800, temperature: 0.7 })
    return response.content
  },
}
