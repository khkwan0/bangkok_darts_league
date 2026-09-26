import type {
  PresetDefinition,
  StructureEdge,
  StructureStage,
  TournamentPresetKey,
  TournamentStructure,
} from './types'
import {emptyStructure} from './types'

function num(cfg: Record<string, unknown>, key: string, fallback: number): number {
  const n = Number(cfg[key])
  return Number.isFinite(n) ? n : fallback
}

function bool(
  cfg: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  if (typeof cfg[key] === 'boolean') return cfg[key]
  return fallback
}

function seMain(): StructureStage {
  return {
    stage_key: 'main',
    label: 'Main bracket',
    stage_order: 0,
    kind: 'single_elimination',
    config: {},
  }
}

function deMain(): StructureStage {
  return {
    stage_key: 'main',
    label: 'Main bracket',
    stage_order: 0,
    kind: 'double_elimination',
    config: {},
  }
}

const PRESETS: PresetDefinition[] = [
  {
    key: 'blank',
    label: 'Blank (compose yourself)',
    description: 'Empty stage graph — add stages in the composer.',
    explanation:
      'Starts with no stages. Use this when none of the named presets match the cup you want: add knockout, group, consolation, or championship stages and wire how teams advance between them. Applying another preset later replaces this graph.',
    configFields: [],
    build: () => emptyStructure(),
  },
  {
    key: 'single_elimination',
    label: 'Single elimination',
    description: 'One loss and you are out.',
    explanation:
      'Classic knockout: each match eliminates the loser and the last remaining team wins. The bracket is sized to the next power of two, with byes filling empty slots. Best when you want a clear champion and a compact schedule.',
    configFields: [],
    build: () => ({
      version: 1,
      stages: [seMain()],
      edges: [],
    }),
  },
  {
    key: 'double_elimination',
    label: 'Double elimination',
    description: 'Winners and losers brackets with a grand final.',
    explanation:
      'A team must lose twice to be knocked out. First-loss teams drop from the winners bracket into the losers bracket; the two bracket winners meet in a grand final. Gives more matches and a second chance, at the cost of a larger bracket.',
    configFields: [],
    build: () => ({
      version: 1,
      stages: [deMain()],
      edges: [],
    }),
  },
  {
    key: 'regional_single_elimination',
    label: 'Regional single elimination',
    description:
      'Two regional single-elimination brackets; winners meet in the championship.',
    explanation:
      'Splits the field into Region A and Region B, each a single-elimination knockout. The two regional champions meet in a championship match. Use when you want geographic or seeded halves to play down separately before a final. Set teams per region (and optional auto-assign by seed) below.',
    configFields: [
      {
        key: 'teams_per_region',
        label: 'Teams per region',
        type: 'number',
        default: 4,
        min: 2,
        max: 16,
      },
      {
        key: 'auto_assign_regions',
        label: 'Auto-assign regions by seed',
        type: 'boolean',
        default: true,
      },
    ],
    build: cfg => {
      const tpr = num(cfg, 'teams_per_region', 4)
      const auto = bool(cfg, 'auto_assign_regions', true)
      const stages: StructureStage[] = [
        {
          stage_key: 'region-a',
          label: 'Region A',
          stage_order: 0,
          kind: 'single_elimination',
          config: {teams_per_region: tpr, auto_assign_regions: auto, region_index: 0},
        },
        {
          stage_key: 'region-b',
          label: 'Region B',
          stage_order: 1,
          kind: 'single_elimination',
          config: {teams_per_region: tpr, auto_assign_regions: auto, region_index: 1},
        },
        {
          stage_key: 'championship',
          label: 'Championship',
          stage_order: 2,
          kind: 'final',
          config: {},
        },
      ]
      const edges: StructureEdge[] = [
        {
          id: 'a-to-champ',
          from_stage: 'region-a',
          to_stage: 'championship',
          source: 'winners',
          slot_policy: 'fixed_bracket_slots',
        },
        {
          id: 'b-to-champ',
          from_stage: 'region-b',
          to_stage: 'championship',
          source: 'winners',
          slot_policy: 'fixed_bracket_slots',
        },
      ]
      return {version: 1, stages, edges}
    },
  },
  {
    key: 'regional_double_elimination',
    label: 'Regional double elimination',
    description:
      'Two regional double-elimination brackets; winners meet in the championship.',
    explanation:
      'Same two-region split as regional single elimination, but each region is a double-elimination bracket (winners and losers sides). The champion of each region still meets in the championship. Use when regional play should give teams a second chance before the final.',
    configFields: [
      {
        key: 'teams_per_region',
        label: 'Teams per region',
        type: 'number',
        default: 4,
        min: 2,
        max: 16,
      },
      {
        key: 'auto_assign_regions',
        label: 'Auto-assign regions by seed',
        type: 'boolean',
        default: true,
      },
    ],
    build: cfg => {
      const tpr = num(cfg, 'teams_per_region', 4)
      const auto = bool(cfg, 'auto_assign_regions', true)
      return {
        version: 1,
        stages: [
          {
            stage_key: 'region-a',
            label: 'Region A',
            stage_order: 0,
            kind: 'double_elimination',
            config: {teams_per_region: tpr, auto_assign_regions: auto, region_index: 0},
          },
          {
            stage_key: 'region-b',
            label: 'Region B',
            stage_order: 1,
            kind: 'double_elimination',
            config: {teams_per_region: tpr, auto_assign_regions: auto, region_index: 1},
          },
          {
            stage_key: 'championship',
            label: 'Championship',
            stage_order: 2,
            kind: 'final',
            config: {},
          },
        ],
        edges: [
          {
            id: 'a-to-champ',
            from_stage: 'region-a',
            to_stage: 'championship',
            source: 'winners',
            slot_policy: 'fixed_bracket_slots',
          },
          {
            id: 'b-to-champ',
            from_stage: 'region-b',
            to_stage: 'championship',
            source: 'winners',
            slot_policy: 'fixed_bracket_slots',
          },
        ],
      }
    },
  },
  {
    key: 'regional_final_four',
    label: 'Regional Final Four',
    description: 'NCAA-style regional brackets feeding a Final Four stage.',
    explanation:
      'Several regional single-elimination brackets (default four) each produce a champion; those champions play a Final Four knockout. Configure how many regions and teams per region, then generate. Auto-assign by seed places teams into regions when the bracket is built.',
    configFields: [
      {
        key: 'region_count',
        label: 'Number of regions',
        type: 'number',
        default: 4,
        min: 2,
        max: 8,
      },
      {
        key: 'teams_per_region',
        label: 'Teams per region',
        type: 'number',
        default: 4,
        min: 2,
        max: 16,
      },
      {
        key: 'auto_assign_regions',
        label: 'Auto-assign regions by seed',
        type: 'boolean',
        default: true,
      },
    ],
    build: cfg => {
      const rc = Math.max(2, Math.min(8, num(cfg, 'region_count', 4)))
      const tpr = num(cfg, 'teams_per_region', 4)
      const auto = bool(cfg, 'auto_assign_regions', true)
      const names =
        Array.isArray(cfg.region_names) && cfg.region_names.length >= rc
          ? (cfg.region_names as string[])
          : Array.from({length: rc}, (_, i) => `Region ${i + 1}`)
      const stages: StructureStage[] = names.map((label, i) => ({
        stage_key: `region-${i}`,
        label,
        stage_order: i,
        kind: 'single_elimination' as const,
        config: {
          region_count: rc,
          teams_per_region: tpr,
          auto_assign_regions: auto,
          region_index: i,
          region_names: names,
        },
      }))
      stages.push({
        stage_key: 'final-four',
        label: 'Final Four',
        stage_order: rc,
        kind: 'final',
        config: {region_count: rc},
      })
      const edges: StructureEdge[] = names.map((_, i) => ({
        id: `r${i}-ff`,
        from_stage: `region-${i}`,
        to_stage: 'final-four',
        source: 'winners' as const,
        slot_policy: 'fixed_bracket_slots' as const,
      }))
      return {version: 1, stages, edges}
    },
  },
  {
    key: 'cup_plate',
    label: 'Cup + Plate',
    description:
      'Main single-elim cup; first-round losers feed a consolation Plate bracket.',
    explanation:
      'A main single-elimination cup plus a consolation Plate. Teams that lose in round 1 of the cup drop into the Plate so they still have matches. Common in amateur pool and snooker cups. You can rename Plate in the stage graph after applying this preset.',
    configFields: [],
    build: () => ({
      version: 1,
      stages: [
        seMain(),
        {
          stage_key: 'plate',
          label: 'Plate',
          stage_order: 1,
          kind: 'consolation',
          config: {fed_by_round: 1},
        },
      ],
      edges: [
        {
          id: 'r1-losers-plate',
          from_stage: 'main',
          to_stage: 'plate',
          source: 'round_losers',
          filter: {round: 1},
          slot_policy: 'seed_order',
        },
      ],
    }),
  },
  {
    key: 'cup_plate_spoon',
    label: 'Cup + Plate + Spoon',
    description:
      'Main cup, Plate for R1 losers, Spoon for Plate R1 losers (labels editable).',
    explanation:
      'Main single-elimination cup, a Plate for first-round cup losers, and a Spoon for first-round Plate losers. Early exits still have a consolation path. Plate and Spoon labels are free text — rename them in the stage graph if you prefer Bowl, Shield, or similar.',
    configFields: [],
    build: () => ({
      version: 1,
      stages: [
        seMain(),
        {
          stage_key: 'plate',
          label: 'Plate',
          stage_order: 1,
          kind: 'consolation',
          config: {fed_by_round: 1},
        },
        {
          stage_key: 'spoon',
          label: 'Spoon',
          stage_order: 2,
          kind: 'consolation',
          config: {fed_by_round: 1},
        },
      ],
      edges: [
        {
          id: 'r1-losers-plate',
          from_stage: 'main',
          to_stage: 'plate',
          source: 'round_losers',
          filter: {round: 1},
          slot_policy: 'seed_order',
        },
        {
          id: 'plate-r1-spoon',
          from_stage: 'plate',
          to_stage: 'spoon',
          source: 'round_losers',
          filter: {round: 1},
          slot_policy: 'seed_order',
        },
      ],
    }),
  },
  {
    key: 'groups_knockout',
    label: 'Groups → Knockout',
    description:
      'Round-robin groups; top N from each group advance to a single-elim knockout.',
    explanation:
      'World Cup style: teams play round-robin in groups, then the top N from each group advance to a single-elimination knockout. Set group count, teams per group, and how many advance. Group winners are cross-paired into the knockout when the bracket is generated.',
    configFields: [
      {
        key: 'group_count',
        label: 'Number of groups',
        type: 'number',
        default: 4,
        min: 2,
        max: 16,
      },
      {
        key: 'teams_per_group',
        label: 'Teams per group',
        type: 'number',
        default: 4,
        min: 3,
        max: 12,
      },
      {
        key: 'advance_per_group',
        label: 'Advance per group',
        type: 'number',
        default: 2,
        min: 1,
        max: 4,
      },
    ],
    build: cfg => {
      const gc = Math.max(2, Math.min(16, num(cfg, 'group_count', 4)))
      const tpg = Math.max(3, Math.min(12, num(cfg, 'teams_per_group', 4)))
      const adv = Math.max(1, Math.min(4, num(cfg, 'advance_per_group', 2)))
      return {
        version: 1,
        stages: [
          {
            stage_key: 'groups',
            label: 'Group stage',
            stage_order: 0,
            kind: 'round_robin',
            config: {
              group_count: gc,
              teams_per_group: tpg,
              advance_per_group: adv,
            },
          },
          {
            stage_key: 'knockout',
            label: 'Knockout',
            stage_order: 1,
            kind: 'single_elimination',
            config: {
              expected_entries: gc * adv,
            },
          },
        ],
        edges: [
          {
            id: 'groups-to-ko',
            from_stage: 'groups',
            to_stage: 'knockout',
            source: 'placement',
            filter: {min_rank: 1, max_rank: adv},
            slot_policy: 'group_winners_cross',
          },
        ],
      }
    },
  },
]

export function listTournamentPresets(): PresetDefinition[] {
  return PRESETS
}

export function getTournamentPreset(
  key: string,
): PresetDefinition | undefined {
  return PRESETS.find(p => p.key === key)
}

export function isValidTournamentPreset(
  key: string,
): key is TournamentPresetKey {
  return PRESETS.some(p => p.key === key)
}

export function buildStructureFromPreset(
  key: string,
  config: Record<string, unknown> = {},
): TournamentStructure {
  const preset = getTournamentPreset(key)
  if (!preset) {
    throw new Error(`Unknown preset: ${key}`)
  }
  return preset.build(config)
}

/** Legacy format key → structure (for tournaments without structure yet). */
export function structureFromLegacyFormat(
  format: string,
  formatConfig: Record<string, unknown>,
): TournamentStructure {
  if (isValidTournamentPreset(format) && format !== 'blank') {
    return buildStructureFromPreset(format, formatConfig)
  }
  return buildStructureFromPreset('single_elimination', {})
}
