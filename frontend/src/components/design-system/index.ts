// ── Primitives ───────────────────────────────────────────────────────────────
export { Typography, typographyVariants }           from './primitives/Typography'
export type { TypographyProps }                     from './primitives/Typography'

// ── Buttons ──────────────────────────────────────────────────────────────────
export { Button, buttonVariants }                   from './buttons/Button'
export type { ButtonProps }                         from './buttons/Button'
export { IconButton }                               from './buttons/IconButton'
export type { IconButtonProps }                     from './buttons/IconButton'

// ── Inputs ───────────────────────────────────────────────────────────────────
export { FormField, statusStyles }                  from './inputs/FormField'
export type { FormFieldProps, FieldStatus }         from './inputs/FormField'
export { TextField }                                from './inputs/TextField'
export type { TextFieldProps }                      from './inputs/TextField'
export { TextareaField }                            from './inputs/TextareaField'
export type { TextareaFieldProps }                  from './inputs/TextareaField'
export { SearchBox }                                from './inputs/SearchBox'
export type { SearchBoxProps }                      from './inputs/SearchBox'
export { PasswordField }                            from './inputs/PasswordField'
export type { PasswordFieldProps }                  from './inputs/PasswordField'
export { SelectField }                              from './inputs/SelectField'
export type { SelectFieldProps, SelectOption }      from './inputs/SelectField'
export { MultiSelect }                              from './inputs/MultiSelect'
export type { MultiSelectProps, MultiSelectOption } from './inputs/MultiSelect'
export { TagInput }                                 from './inputs/TagInput'
export type { TagInputProps }                       from './inputs/TagInput'
export { FileUpload }                               from './inputs/FileUpload'
export type { FileUploadProps, UploadedFile }       from './inputs/FileUpload'

// ── Cards ────────────────────────────────────────────────────────────────────
export { StatCard }                                 from './cards/StatCard'
export type { StatCardProps }                       from './cards/StatCard'
export { CourseCard }                               from './cards/CourseCard'
export type { CourseCardProps }                     from './cards/CourseCard'
export { DocumentCard }                             from './cards/DocumentCard'
export type { DocumentCardProps, DocumentType }     from './cards/DocumentCard'
export { AIGenerationCard }                         from './cards/AIGenerationCard'
export type { AIGenerationCardProps }               from './cards/AIGenerationCard'
export { EmptyState }                               from './cards/EmptyState'
export type { EmptyStateProps }                     from './cards/EmptyState'

// ── Data ─────────────────────────────────────────────────────────────────────
export { DataTable }                                from './data/DataTable'
export type { DataTableProps, Column, BulkAction }  from './data/DataTable'

// ── Feedback ─────────────────────────────────────────────────────────────────
export { Alert }                                    from './feedback/Alert'
export type { AlertProps }                          from './feedback/Alert'
export { Banner }                                   from './feedback/Banner'
export type { BannerProps, BannerVariant }          from './feedback/Banner'
export {
  Spinner, SpinnerOverlay, FullPageSpinner,
}                                                   from './feedback/Spinner'
export type { SpinnerProps }                        from './feedback/Spinner'
export {
  Skeleton, SkeletonText, SkeletonCard,
  SkeletonStatCard, SkeletonTableRow,
  SkeletonTable, SkeletonListItem, SkeletonPage,
}                                                   from './feedback/Skeleton'
export { ProgressBar, ProgressRing }                from './feedback/ProgressBar'
export type { ProgressBarProps, ProgressRingProps, ProgressVariant } from './feedback/ProgressBar'
export { ConfirmDialog }                            from './feedback/ConfirmDialog'
export type { ConfirmDialogProps, ConfirmDialogVariant } from './feedback/ConfirmDialog'

// ── AI Components ─────────────────────────────────────────────────────────────
export { PromptEditor }                             from './ai/PromptEditor'
export type { PromptEditorProps, PromptTemplate }   from './ai/PromptEditor'
export { GenerationProgress }                       from './ai/GenerationProgress'
export type { GenerationProgressProps, GenerationStep, StepStatus } from './ai/GenerationProgress'
export { StreamingOutput }                          from './ai/StreamingOutput'
export type { StreamingOutputProps }                from './ai/StreamingOutput'
export { ModelSelector }                            from './ai/ModelSelector'
export type { ModelSelectorProps, AIModel }         from './ai/ModelSelector'

// ── Widgets ──────────────────────────────────────────────────────────────────
export { StatsWidget }                              from './widgets/StatsWidget'
export type { StatsWidgetProps }                    from './widgets/StatsWidget'
export { ActivityTimeline }                         from './widgets/ActivityTimeline'
export type { ActivityTimelineProps, ActivityItem, ActivityType } from './widgets/ActivityTimeline'
export { QuickActions }                             from './widgets/QuickActions'
export type { QuickActionsProps, QuickAction }      from './widgets/QuickActions'
