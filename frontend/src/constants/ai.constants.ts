export const AI_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000 },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', contextWindow: 200000 },
      { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', contextWindow: 200000 },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', contextWindow: 200000 },
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1000000 },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 2000000 },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', contextWindow: 64000 },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', contextWindow: 64000 },
    ],
  },
] as const

export type AIProviderID = (typeof AI_PROVIDERS)[number]['id']

export const DEFAULT_AI_PROVIDER: AIProviderID = 'anthropic'
export const DEFAULT_AI_MODEL = 'claude-sonnet-4-6'

export const AI_MODULE_TYPES = [
  'lecture-notes',
  'questions',
  'assignment',
  'exam',
  'rubric',
  'course-outline',
  'presentation',
  'chat',
  'summary',
  'expand',
  'simplify',
  'rewrite',
] as const

export type AIModuleType = (typeof AI_MODULE_TYPES)[number]

export const MAX_TOKENS_PER_REQUEST = 8192
export const MAX_FILE_SIZE_MB = 20
export const SUPPORTED_FILE_TYPES = ['.pdf', '.docx', '.pptx', '.txt', '.md']
