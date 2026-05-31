/**
 * QUANTUM5G — Módulo NR-01 | TypeScript Types
 * Gerado a partir de supabase/nr01_schema.sql
 * Versão: 0.1 | Data: 2026-04-18
 *
 * Convenções:
 * - Códigos de dimensão são strings em snake_case (catálogo fixo, ver DIMENSION_CODES).
 * - Likert sempre 1-5; questões reverse_scored são invertidas no motor (6 - v).
 * - risk_level segue a pirâmide NR-01: muito_baixo | baixo | atencao | elevado | critico.
 */

// ============================================================
// ENUMS / CONSTANTES
// ============================================================

export const NR01_DIMENSION_CODES = [
  'carga_trabalho',
  'controle_autonomia',
  'exigencias_emocionais',
  'reconhecimento',
  'relacoes_interpessoais',
  'estabilidade_seguranca',
  'assedio_violencia',
  'organizacao_trabalho',
  'lideranca_gestao',
  'saude_bem_estar',
] as const

export type Nr01DimensionCode = typeof NR01_DIMENSION_CODES[number]

export type Nr01RiskLevel =
  | 'muito_baixo'
  | 'baixo'
  | 'atencao'
  | 'elevado'
  | 'critico'
  | 'sem_dados'

export type Nr01AssessmentStatus =
  | 'CRIADO'
  | 'COLETANDO'
  | 'COLETA_ENCERRADA'
  | 'PROCESSANDO'
  | 'CONCLUIDO'
  | 'ARQUIVADO'

export type Nr01Modality = 'WEB' | 'QR' | 'WHATSAPP' | 'KIOSK' | 'PAPER'

export type Nr01ActionPriority = 'P1' | 'P2' | 'P3'

export type Nr01ActionStatus =
  | 'pendente'
  | 'em_andamento'
  | 'bloqueado'
  | 'concluido'
  | 'cancelado'

export type Nr01ActionPlanStatus =
  | 'rascunho'
  | 'aprovado'
  | 'em_execucao'
  | 'revisao'
  | 'concluido'

export type Nr01CompanySize = 'qualquer' | 'pequena' | 'media' | 'grande'

export type Nr01CostBand = 'baixo' | 'medio' | 'alto'

/**
 * Labels oficiais (NR01_GRO v1.1) para exibição em UI/PDF.
 * Mantém os códigos internos em snake_case apenas para persistência.
 */
export const NR01_DIMENSION_LABEL: Record<Nr01DimensionCode, string> = {
  carga_trabalho: 'Carga de Trabalho e Pressão',
  controle_autonomia: 'Controle e Autonomia sobre as Tarefas',
  exigencias_emocionais: 'Exigências Emocionais e Equilíbrio Trabalho-Vida',
  reconhecimento: 'Reconhecimento e Recompensa',
  relacoes_interpessoais: 'Relações Interpessoais e Clima Organizacional',
  estabilidade_seguranca: 'Segurança e Estabilidade',
  assedio_violencia: 'Violência e Assédio',
  organizacao_trabalho: 'Organização do Trabalho',
  lideranca_gestao: 'Liderança e Gestão',
  saude_bem_estar: 'Saúde e Bem-Estar Relacionados ao Trabalho',
}

// ============================================================
// JSONB STRUCTURES
// ============================================================

export interface Nr01AnchorItem {
  question_id: string
  text: string
  mean: number
  ord: number
}

export interface Nr01InterventionRolloutStep {
  ord?: number
  descricao: string
}

export interface Nr01EconomicAssumptions {
  fines_per_worker_brl: number      // valor base da multa por trabalhador
  fines_severity_multiplier: number // 1.0 conservador / 2.0 provável / 4.0 agravado
  absence_cost_per_day_brl: number
  turnover_cost_multiplier: number  // ex: 1.5x salário anual
  productivity_gain_pct: number     // % de ganho aplicado à folha
  fap_reduction_pp: number          // pontos percentuais reduzidos no FAP esperado
  expected_absence_reduction_pct: number
  expected_turnover_reduction_pct: number
}

// ============================================================
// TABELAS
// ============================================================

export interface Nr01Dimension {
  code: Nr01DimensionCode
  ord: number
  name: string
  description: string
  nr01_clause: string
  weight: number
}

export interface Nr01Question {
  id: string
  dimension_code: Nr01DimensionCode
  ord: number
  text: string
  reverse_scored: boolean
  instrument_version: string
  is_active: boolean
  created_at: string
}

export interface Nr01Assessment {
  id: string
  company_id: string
  consultant_id: string
  name: string
  reference_period: string | null
  instrument_version: string
  status: Nr01AssessmentStatus
  modality: Nr01Modality
  collection_token: string
  expected_respondents: number
  k_anonymity_min: number
  collection_opens_at: string | null
  collection_closes_at: string | null
  technical_lead_id: string | null
  technical_lead_name: string | null
  technical_lead_profession: string | null
  technical_lead_crp: string | null
  linked_diagnostic_id: string | null
  competencia_seq: number | null
  competencia_month: number | null
  competencia_year: number | null
  competencia_label: string | null
  created_at: string
  updated_at: string
}

export type Nr01AssessmentInsert = Omit<Nr01Assessment,
  'id' | 'collection_token' | 'created_at' | 'updated_at' | 'status'
> & {
  status?: Nr01AssessmentStatus
}

export interface Nr01Invite {
  id: string
  assessment_id: string
  invite_token: string
  invited_at: string
  used_at: string | null
  setor: string | null
  funcao: string | null
  vinculo: string | null
  is_leader: boolean
}

export interface Nr01Response {
  id: string
  assessment_id: string
  anon_id: string
  setor: string | null
  funcao: string | null
  vinculo: string | null
  tempo_casa: string | null
  is_leader: boolean
  open_q1: string | null
  open_q2: string | null
  open_q3: string | null
  open_q4: string | null
  open_q5: string | null
  instrument_version: string
  client_locale: string | null
  submitted_at: string
}

export interface Nr01ResponseAnswer {
  id: string
  response_id: string
  question_id: string
  value: number
}

export interface Nr01DimensionScore {
  id: string
  assessment_id: string
  dimension_code: Nr01DimensionCode
  score_pct: number
  risk_level: Nr01RiskLevel
  mean_likert: number | null
  median_likert: number | null
  stddev_likert: number | null
  n_respondents: number
  anchor_items: Nr01AnchorItem[]
  ai_summary: string | null
  ai_model_used: string | null
  ai_generated_at: string | null
  calculated_at: string
}

export interface Nr01AssessmentResult {
  id: string
  assessment_id: string
  iso_score: number
  iso_risk_level: Nr01RiskLevel
  total_invites: number
  total_responses: number
  adherence_pct: number | null
  macro_report_text: string | null
  macro_report_status: 'rascunho' | 'revisado' | 'assinado'
  pentagrama_correlation: Record<string, unknown> | null
  ic_weight: number
  calculated_at: string
}

export interface Nr01EvidencePack {
  id: string
  assessment_id: string
  instrument_sha256: string
  collection_started_at: string
  collection_ended_at: string
  total_invites_sent: number
  total_responses_complete: number
  adherence_pct: number
  methodology_text: string
  methodology_version: string
  technical_lead_name: string
  technical_lead_crp: string | null
  signed_at: string | null
  signature_hash: string | null
  signature_method: 'icp_brasil' | 'platform_internal' | 'external' | null
  timestamp_authority: string | null
  timestamp_token: string | null
  pack_sha256: string
  generated_at: string
  // patch_003
  pdf_sha256: string | null
  pdf_generated_at: string | null
  pdf_byte_size: number | null
  pdf_page_count: number | null
  // patch_008
  laudos_pack_sha256: string | null
}

export interface Nr01Intervention {
  id: string
  code: string
  dimension_code: Nr01DimensionCode
  applicable_levels: Nr01RiskLevel[]
  company_size: Nr01CompanySize
  title: string
  description: string
  rollout_steps: Nr01InterventionRolloutStep[] | string[]
  expected_impact_pct: number | null
  typical_duration_days: number | null
  cost_band: Nr01CostBand | null
  evidence_refs: string[]
  is_active: boolean
  created_at: string
}

export interface Nr01ActionPlan {
  id: string
  assessment_id: string
  status: Nr01ActionPlanStatus
  approved_by: string | null
  approved_at: string | null
  next_review_at: string | null
  execution_started_at: string | null
  review_notes: string | null
  created_at: string
  updated_at: string
}

export interface Nr01ActionItemCheckNotes {
  '30'?: string
  '60'?: string
  '90'?: string
}

export interface Nr01ActionItem {
  id: string
  action_plan_id: string
  dimension_code: Nr01DimensionCode
  intervention_id: string | null
  owner_name: string
  owner_email: string | null
  title: string
  description: string | null
  kpi: string | null
  due_date: string
  priority: Nr01ActionPriority
  estimated_cost_brl: number | null
  status: Nr01ActionStatus
  pdca_phase: 'plan' | 'do' | 'check' | 'act'
  rollout_steps: Nr01InterventionRolloutStep[]
  check_notes: Nr01ActionItemCheckNotes
  baseline_score_pct: number | null
  check_30d_at: string | null
  check_60d_at: string | null
  check_90d_at: string | null
  completion_notes: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Nr01EconomicInputs {
  id: string
  assessment_id: string
  total_workers: number
  avg_monthly_salary_brl: number
  total_payroll_brl_year: number
  cid_f_absences_last_year: number
  avg_absence_days: number
  voluntary_turnover_pct: number
  rat_aliquot_pct: number
  fap_multiplier: number
  active_lawsuits: number
  avg_lawsuit_provision_brl: number
  program_annual_cost_brl: number
  created_at: string
  updated_at: string
}

export type Nr01EconomicInputsInsert = Omit<Nr01EconomicInputs,
  'id' | 'total_payroll_brl_year' | 'created_at' | 'updated_at'
>

export interface Nr01EconomicProjection {
  id: string
  assessment_id: string
  // Cenário NÃO AGIR
  na_fines_exposure_brl: number
  na_absence_cost_brl: number
  na_turnover_cost_brl: number
  na_productivity_loss_brl: number
  na_fap_extra_cost_brl: number
  na_litigation_risk_brl: number
  na_total_brl: number
  // Cenário AGIR PARCIAL
  ap_total_savings_brl: number
  ap_program_cost_brl: number
  ap_net_brl: number
  // Cenário AGIR INTEGRAL
  ai_total_savings_brl: number
  ai_program_cost_brl: number
  ai_net_brl: number
  ai_roi_pct: number | null
  ai_payback_months: number | null
  ai_3y_total_savings_brl: number | null
  ai_3y_total_cost_brl: number | null
  ai_3y_roi_pct: number | null
  assumptions: Nr01EconomicAssumptions
  calculated_at: string
}

// ============================================================
// MICRO-PULSOS (patch 002)
// ============================================================

export interface Nr01PulseConfig {
  assessment_id: string
  enabled: boolean
  day_of_week: number              // 1=segunda, 7=domingo
  recipient_emails: string[]
  questions_per_week: number
  window_hours: number
  calibration_weeks: number
  last_dispatched_at: string | null
  weeks_dispatched: number
  created_at: string
  updated_at: string
}

export interface Nr01PulseDispatch {
  id: string
  assessment_id: string
  week_number: number
  dispatched_at: string
  question_ids: string[]
  invites_sent_count: number
  window_closes_at: string
  created_at: string
}

export interface Nr01PulseInvite {
  id: string
  dispatch_id: string
  email_hash: string
  token: string
  used_at: string | null
}

export interface Nr01PulseResponse {
  id: string
  dispatch_id: string
  question_id: string
  anon_id: string
  value: number
  submitted_at: string
}

/** Linha da view nr01_pulse_weekly_scores. */
export interface Nr01PulseWeeklyScore {
  assessment_id: string
  week_number: number
  week_date: string
  dimension_code: Nr01DimensionCode
  score_pct: number
  n_respondents: number
  n_answers: number
}

// ============================================================
// STATUS PÚBLICO (patch 004)
// ============================================================

export interface Nr01PublicStatusToken {
  id: string
  assessment_id: string
  token: string
  created_by: string | null
  created_at: string
  revoked_at: string | null
  accessed_count: number
  last_accessed_at: string | null
}

/** Cor visual do semáforo de cada item. */
export type StatusColor = 'verde' | 'amarelo' | 'vermelho' | 'cinza'

export interface PublicStatusItem {
  key: 'avaliacao' | 'plano' | 'micro_pulsos' | 'revisao_90d' | 'reavaliacao_anual'
  label: string
  color: StatusColor
  caption: string                  // descrição do estado atual
  next_action_if_pending?: string  // texto para "próxima ação obrigatória" se for o item mais urgente
  pending_priority?: number        // 1 = mais urgente
  due_date?: string | null
}

export interface Nr01AuditLog {
  id: number
  assessment_id: string | null
  actor_id: string | null
  actor_role: string | null
  event_type: string
  payload: Record<string, unknown>
  ip_hash: string | null
  user_agent: string | null
  created_at: string
}

// ============================================================
// CONVENIENT JOINED VIEWS
// ============================================================

export type Nr01AssessmentWithCompany = Nr01Assessment & {
  companies: { id: string; name: string; total_collaborators: number }
}

export type Nr01AssessmentFull = Nr01Assessment & {
  result: Nr01AssessmentResult | null
  dimension_scores: Nr01DimensionScore[]
  evidence_pack: Nr01EvidencePack | null
  economic: Nr01EconomicProjection | null
}

// ============================================================
// THRESHOLDS — classificação de risco em escala Likert 1-5.
// Fonte: NR01_GRO.docx, seção "CLASSIFICAÇÃO FINAL" (linhas 253-263).
// Orientação: MAIOR valor = MAIOR risco (doc:27 — "Quanto maior a
// nota, maior o risco percebido").
// ============================================================

export const NR01_RISK_THRESHOLDS_LIKERT = {
  muito_baixo: { min: 1.0, max: 1.8 },  // [1.0, 1.8]
  baixo:       { min: 1.9, max: 2.6 },  // [1.9, 2.6]
  atencao:     { min: 2.7, max: 3.4 },  // [2.7, 3.4]
  elevado:     { min: 3.5, max: 4.2 },  // [3.5, 4.2]
  critico:     { min: 4.3, max: 5.0 },  // [4.3, 5.0]
} as const

/**
 * Recebe média Likert (1.0 a 5.0) e devolve nível de risco conforme
 * fronteiras oficiais do NR01_GRO.docx. Maior média = maior risco.
 */
export function classifyRisk(meanLikert: number | null | undefined, n: number): Nr01RiskLevel {
  if (n <= 0 || meanLikert == null || Number.isNaN(meanLikert)) return 'sem_dados'
  if (meanLikert <= 1.8) return 'muito_baixo'
  if (meanLikert <= 2.6) return 'baixo'
  if (meanLikert <= 3.4) return 'atencao'
  if (meanLikert <= 4.2) return 'elevado'
  return 'critico'  // 4.3 a 5.0
}

export const RISK_LEVEL_LABEL: Record<Nr01RiskLevel, string> = {
  muito_baixo: 'Muito baixo',
  baixo:       'Baixo',
  atencao:     'Atenção',
  elevado:     'Elevado',
  critico:     'Crítico',
  sem_dados:   'Sem dados',
}

export const RISK_LEVEL_COLOR: Record<Nr01RiskLevel, string> = {
  muito_baixo: 'bg-green-100 text-green-800',
  baixo:       'bg-green-100 text-green-800',
  atencao:     'bg-amber-100 text-amber-800',
  elevado:     'bg-red-100 text-red-800',
  critico:     'bg-red-100 text-red-800',
  sem_dados:   'bg-zinc-100 text-zinc-700',
}

export const ASSESSMENT_STATUS_LABEL: Record<Nr01AssessmentStatus, string> = {
  CRIADO: 'Criado',
  COLETANDO: 'Coletando',
  COLETA_ENCERRADA: 'Coleta encerrada',
  PROCESSANDO: 'Processando',
  CONCLUIDO: 'Concluído',
  ARQUIVADO: 'Arquivado',
}

export const ASSESSMENT_STATUS_COLOR: Record<Nr01AssessmentStatus, string> = {
  CRIADO: 'bg-zinc-100 text-zinc-700',
  COLETANDO: 'bg-amber-100 text-amber-800',
  COLETA_ENCERRADA: 'bg-amber-100 text-amber-800',
  PROCESSANDO: 'bg-blue-100 text-blue-800',
  CONCLUIDO: 'bg-green-100 text-green-800',
  ARQUIVADO: 'bg-zinc-100 text-zinc-700',
}
