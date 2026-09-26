/** Stage-graph model for flexible cups. Structure JSON is the draft source of truth. */

export type StageKind =
  | 'round_robin'
  | 'single_elimination'
  | 'double_elimination'
  | 'consolation'
  | 'final'

export type AdvancementSourceKind =
  | 'winners'
  | 'losers'
  | 'placement'
  | 'all_entries'
  | 'round_losers'

export type SlotPolicy =
  | 'seed_order'
  | 'fixed_bracket_slots'
  | 'group_winners_cross'

export type ParticipantMode = 'team' | 'player' | 'mixed'

export type StructureStage = {
  stage_key: string
  label: string
  stage_order: number
  kind: StageKind
  /** Kind-specific options (groups, advance_count, region names, etc.). */
  config: Record<string, unknown>
}

export type StructureEdge = {
  id: string
  from_stage: string
  to_stage: string
  source: AdvancementSourceKind
  /** For placement: {min_rank:1, max_rank:2} or round_losers: {round:1} */
  filter?: Record<string, unknown>
  slot_policy?: SlotPolicy
}

export type TournamentStructure = {
  version: 1
  stages: StructureStage[]
  edges: StructureEdge[]
}

export type TournamentPresetKey =
  | 'single_elimination'
  | 'double_elimination'
  | 'regional_single_elimination'
  | 'regional_double_elimination'
  | 'regional_final_four'
  | 'cup_plate'
  | 'cup_plate_spoon'
  | 'groups_knockout'
  | 'blank'

export type PresetDefinition = {
  key: TournamentPresetKey
  label: string
  /** One-line summary shown in lists and under the preset picker. */
  description: string
  /** Longer how-it-works copy shown when this preset is selected. */
  explanation: string
  configFields: Array<{
    key: string
    label: string
    type: 'number' | 'boolean' | 'string_array'
    default?: unknown
    min?: number
    max?: number
  }>
  /** Expand preset + admin config into a stage graph. */
  build: (config: Record<string, unknown>) => TournamentStructure
}

export function emptyStructure(): TournamentStructure {
  return {version: 1, stages: [], edges: []}
}

export function parseTournamentStructure(
  raw: unknown,
): TournamentStructure | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (!Array.isArray(obj.stages) || !Array.isArray(obj.edges)) return null
  const stages: StructureStage[] = obj.stages
    .filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === 'object')
    .map(s => ({
      stage_key: String(s.stage_key ?? ''),
      label: String(s.label ?? s.stage_key ?? ''),
      stage_order: Number(s.stage_order) || 0,
      kind: (String(s.kind ?? 'single_elimination') as StageKind),
      config:
        typeof s.config === 'object' && s.config !== null
          ? (s.config as Record<string, unknown>)
          : {},
    }))
    .filter(s => s.stage_key)
  const edges: StructureEdge[] = obj.edges
    .filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === 'object')
    .map((e, i) => ({
      id: String(e.id ?? `edge-${i}`),
      from_stage: String(e.from_stage ?? ''),
      to_stage: String(e.to_stage ?? ''),
      source: String(e.source ?? 'winners') as AdvancementSourceKind,
      filter:
        typeof e.filter === 'object' && e.filter !== null
          ? (e.filter as Record<string, unknown>)
          : undefined,
      slot_policy: e.slot_policy
        ? (String(e.slot_policy) as SlotPolicy)
        : 'seed_order',
    }))
    .filter(e => e.from_stage && e.to_stage)
  return {version: 1, stages, edges}
}

export function serializeTournamentStructure(
  structure: TournamentStructure,
): string {
  return JSON.stringify({
    version: 1,
    stages: structure.stages,
    edges: structure.edges,
  })
}
