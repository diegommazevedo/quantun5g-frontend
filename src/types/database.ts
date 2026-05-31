/**
 * QUANTUM5G — TypeScript Types para o Schema Supabase
 * Gerado manualmente a partir de supabase/schema.sql
 * Versão: 1.0 | Data: 2026-03-24
 */

// ============================================================
// ENUMS E CONSTANTES
// ============================================================

export type UserRole = 'admin' | 'consultant' | 'leader' | 'collaborator'

export type DiagnosticStatus =
  | 'CRIADO'
  | 'AGUARDANDO_IL'
  | 'COLETANDO_IC'
  | 'ENCERRADO'
  | 'RELATORIO_GERADO'
  | 'ARQUIVADO'

export type DimensaoNivel = 'critico' | 'vulneravel' | 'saudavel' | 'excelente' | 'sem_dados'

export type DisplayLevel =
  | 'normal'
  | 'baixa_amostragem_amarelo'
  | 'baixa_amostragem_laranja'
  | 'apenas_dimensao'
  | 'sem_dados'

export type Dimensao = 'fisica' | 'afetiva' | 'racional' | 'social' | 'cultural' | 'indisponivel'

// ============================================================
// TIPOS DE ALERT (estrutura do campo alerts jsonb)
// ============================================================

export type AlertType =
  | 'BOLHA_SISTEMICA'
  | 'QUESTAO_ANCORA'
  | 'BLOCO_CRITICO_OCULTO'
  | 'BAIXA_AMOSTRAGEM'

export interface DiagnosticAlert {
  tipo: AlertType
  descricao: string
  dimensoes?: Dimensao[]   // para BOLHA_SISTEMICA
  questao?: number          // para QUESTAO_ANCORA
  bloco?: string            // para BLOCO_CRITICO_OCULTO (ex: "F-A", "A-3")
  dimensao?: Dimensao       // para BLOCO_CRITICO_OCULTO
  n?: number                // para BAIXA_AMOSTRAGEM
}

export interface QuestaoAncora {
  questao: number
  media: number
  dimensao: Dimensao
}

// ============================================================
// TABELA: profiles
// ============================================================

export interface Profile {
  id: string
  role: UserRole
  name: string | null
  email: string | null
  is_active: boolean
  module_pentagrama: boolean
  module_nr01: boolean
  created_at: string
  updated_at: string
}

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'> & {
  module_pentagrama?: boolean
  module_nr01?: boolean
}
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>

export interface CompanyIlLeader {
  id: string
  company_id: string
  name: string
  email: string
  sort_order: number
  created_at: string
}

export type CompanyContactRole = 'leader' | 'collaborator'

export interface CompanyContact {
  id: string
  company_id: string
  full_name: string
  email: string
  contact_role: CompanyContactRole
  job_title: string | null
  department: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type SurveyModule = 'pentagrama' | 'nr01'
export type SurveyKind = 'il' | 'ic' | 'nr01_coleta'

export interface SurveyInvite {
  id: string
  token: string
  company_id: string
  contact_id: string
  module: SurveyModule
  survey_kind: SurveyKind
  reference_id: string
  survey_url: string
  email_sent_at: string | null
  email_status: string | null
  email_error: string | null
  resend_email_id: string | null
  email_delivered_at: string | null
  email_opened_at: string | null
  email_clicked_at: string | null
  opened_at: string | null
  completed_at: string | null
  created_at: string
}

export type SurveyInviteEmailStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'complained'

export interface EmailSuppression {
  id: string
  email_normalized: string
  reason: 'hard_bounce' | 'complaint' | 'manual'
  resend_email_id: string | null
  resend_event_id: string | null
  contact_id: string | null
  notes: string | null
  created_at: string
}

// ============================================================
// TABELA: companies
// ============================================================

export interface Company {
  id: string
  name: string
  legal_name: string | null
  trade_name: string | null
  cnpj: string | null
  rh_contact_name: string | null
  rh_contact_email: string | null
  technical_lead_name: string | null
  technical_lead_crp: string | null
  technical_lead_profession: string | null
  technical_lead_email: string | null
  il_leader_name: string | null
  il_leader_email: string | null
  name_normalized: string | null
  total_collaborators: number
  consultant_id: string
  created_at: string
  updated_at: string
}

export type CompanyInsert = Omit<
  Company,
  'id' | 'created_at' | 'updated_at' | 'name_normalized' | 'legal_name' | 'trade_name' | 'cnpj' | 'rh_contact_name' | 'rh_contact_email' | 'technical_lead_name' | 'technical_lead_crp' | 'technical_lead_profession' | 'technical_lead_email' | 'il_leader_name' | 'il_leader_email'
> & {
  legal_name?: string | null
  trade_name?: string | null
  cnpj?: string | null
  rh_contact_name?: string | null
  rh_contact_email?: string | null
  technical_lead_name?: string | null
  technical_lead_crp?: string | null
  technical_lead_profession?: string | null
  technical_lead_email?: string | null
  il_leader_name?: string | null
  il_leader_email?: string | null
  name_normalized?: string | null
}
export type CompanyUpdate = Partial<Omit<Company, 'id' | 'created_at' | 'consultant_id'>>

// ============================================================
// TABELA: diagnostics
// ============================================================

export interface Diagnostic {
  id: string
  company_id: string
  consultant_id: string
  name: string
  leader_name: string | null
  leader_email: string | null
  status: DiagnosticStatus
  il_token: string | null
  ic_token: string | null
  il_submitted_at: string | null
  ic_closed_at: string | null
  il_deadline: string | null
  ic_deadline: string | null
  competencia_seq: number | null
  competencia_month: number | null
  competencia_year: number | null
  competencia_label: string | null
  created_at: string
  updated_at: string
}

export type DiagnosticInsert = Omit<Diagnostic,
  'id' | 'status' | 'il_token' | 'ic_token' | 'il_submitted_at' | 'ic_closed_at' | 'created_at' | 'updated_at'
>

export type DiagnosticUpdate = Partial<Omit<Diagnostic, 'id' | 'created_at' | 'consultant_id'>>

// ============================================================
// TIPO AUXILIAR: 125 respostas (Q1–Q125)
// ============================================================

type Q125 = {
  q1:  number | null; q2:  number | null; q3:  number | null; q4:  number | null; q5:  number | null;
  q6:  number | null; q7:  number | null; q8:  number | null; q9:  number | null; q10: number | null;
  q11: number | null; q12: number | null; q13: number | null; q14: number | null; q15: number | null;
  q16: number | null; q17: number | null; q18: number | null; q19: number | null; q20: number | null;
  q21: number | null; q22: number | null; q23: number | null; q24: number | null; q25: number | null;
  q26: number | null; q27: number | null; q28: number | null; q29: number | null; q30: number | null;
  q31: number | null; q32: number | null; q33: number | null; q34: number | null; q35: number | null;
  q36: number | null; q37: number | null; q38: number | null; q39: number | null; q40: number | null;
  q41: number | null; q42: number | null; q43: number | null; q44: number | null; q45: number | null;
  q46: number | null; q47: number | null; q48: number | null; q49: number | null; q50: number | null;
  q51: number | null; q52: number | null; q53: number | null; q54: number | null; q55: number | null;
  q56: number | null; q57: number | null; q58: number | null; q59: number | null; q60: number | null;
  q61: number | null; q62: number | null; q63: number | null; q64: number | null; q65: number | null;
  q66: number | null; q67: number | null; q68: number | null; q69: number | null; q70: number | null;
  q71: number | null; q72: number | null; q73: number | null; q74: number | null; q75: number | null;
  q76: number | null; q77: number | null; q78: number | null; q79: number | null; q80: number | null;
  q81: number | null; q82: number | null; q83: number | null; q84: number | null; q85: number | null;
  q86: number | null; q87: number | null; q88: number | null; q89: number | null; q90: number | null;
  q91: number | null; q92: number | null; q93: number | null; q94: number | null; q95: number | null;
  q96: number | null; q97: number | null; q98: number | null; q99: number | null; q100: number | null;
  q101: number | null; q102: number | null; q103: number | null; q104: number | null; q105: number | null;
  q106: number | null; q107: number | null; q108: number | null; q109: number | null; q110: number | null;
  q111: number | null; q112: number | null; q113: number | null; q114: number | null; q115: number | null;
  q116: number | null; q117: number | null; q118: number | null; q119: number | null; q120: number | null;
  q121: number | null; q122: number | null; q123: number | null; q124: number | null; q125: number | null;
}

// ============================================================
// TABELA: il_responses
// ============================================================

export interface ILResponse extends Q125 {
  id: string
  diagnostic_id: string
  submitted_at: string
}

export type ILResponseInsert = Omit<ILResponse, 'id' | 'submitted_at'> & {
  submitted_at?: string
}

// ============================================================
// TABELA: ic_responses
// ============================================================
// REGRA INVIOLÁVEL: respondente_anonimo_id nunca tem FK para nenhuma
// tabela de usuários. UUID gerado no cliente, sem vínculo de identidade.

export interface ICResponse extends Q125 {
  id: string
  diagnostic_id: string
  respondente_anonimo_id: string  // UUID sem FK — NUNCA ALTERAR
  submitted_at: string
}

export type ICResponseInsert = Omit<ICResponse, 'id' | 'submitted_at'> & {
  submitted_at?: string
}

// ============================================================
// TABELA: diagnostic_results
// ============================================================

export interface DiagnosticResult {
  id: string
  diagnostic_id: string
  // IC por dimensão
  ic_fisica_pct:    number | null
  ic_afetiva_pct:   number | null
  ic_racional_pct:  number | null
  ic_social_pct:    number | null
  ic_cultural_pct:  number | null
  ic_global_pct:    number | null
  // IL por dimensão
  il_fisica_pct:    number | null
  il_afetiva_pct:   number | null
  il_racional_pct:  number | null
  il_social_pct:    number | null
  il_cultural_pct:  number | null
  il_global_pct:    number | null
  // Combinados
  combined_fisica_pct:   number | null
  combined_afetiva_pct:  number | null
  combined_racional_pct: number | null
  combined_social_pct:   number | null
  combined_cultural_pct: number | null
  combined_global_pct:   number | null
  // Gaps (IL% - IC%)
  gap_fisica:    number | null
  gap_afetiva:   number | null
  gap_racional:  number | null
  gap_social:    number | null
  gap_cultural:  number | null
  // Níveis
  nivel_ic_fisica:    DimensaoNivel | null
  nivel_ic_afetiva:   DimensaoNivel | null
  nivel_ic_racional:  DimensaoNivel | null
  nivel_ic_social:    DimensaoNivel | null
  nivel_ic_cultural:  DimensaoNivel | null
  nivel_combined:     DimensaoNivel | null
  // Scores de bloco IC (blocos reais — DECISÃO 001)
  ic_bloco_fa_pct: number | null  // Física A (Q1-8)
  ic_bloco_fb_pct: number | null  // Física B (Q9-16)
  ic_bloco_fc_pct: number | null  // Física C (Q17-25)
  ic_bloco_a1_pct: number | null  // Afetiva 1 (Q26-30)
  ic_bloco_a2_pct: number | null  // Afetiva 2 (Q31-35)
  ic_bloco_a3_pct: number | null  // Afetiva 3 (Q36-40)
  ic_bloco_a4_pct: number | null  // Afetiva 4 (Q41-45)
  ic_bloco_a5_pct: number | null  // Afetiva 5 (Q46-50)
  ic_bloco_r1_pct: number | null  // Racional 1 (Q51-55)
  ic_bloco_r2_pct: number | null  // Racional 2 (Q56-60)
  ic_bloco_r3_pct: number | null  // Racional 3 (Q61-65)
  ic_bloco_r4_pct: number | null  // Racional 4 (Q66-70)
  ic_bloco_r5_pct: number | null  // Racional 5 (Q71-75)
  ic_bloco_sa_pct: number | null  // Social A (Q76-83)
  ic_bloco_sb_pct: number | null  // Social B (Q84-91)
  ic_bloco_sc_pct: number | null  // Social C (Q92-100)
  ic_bloco_ca_pct: number | null  // Cultural A (Q101-108)
  ic_bloco_cb_pct: number | null  // Cultural B (Q109-116)
  ic_bloco_cc_pct: number | null  // Cultural C (Q117-125)
  // Metadados
  n_ic_respondents: number
  ic_weight:        number
  il_weight:        number
  alerts:           DiagnosticAlert[]
  anchor_questions: QuestaoAncora[]
  display_level:    DisplayLevel
  // Laudos vinculados
  laudo_fisica_id:   string | null
  laudo_afetiva_id:  string | null
  laudo_racional_id: string | null
  laudo_social_id:   string | null
  laudo_cultural_id: string | null
  calculated_at: string
}

// ============================================================
// TABELA: laudos
// ============================================================

export interface Laudo {
  id: string
  dimensao: Dimensao
  nivel: DimensaoNivel | 'sem_dados'
  texto: string
}

// ============================================================
// TABELAS: products / product_plans / subscriptions / payments (P021)
// ============================================================

export interface Product {
  id: string
  name: string
  subdomain: string
  description: string | null
  active: boolean
  created_at: string
}
export interface ProductInsert {
  id: string
  name: string
  subdomain: string
  description?: string | null
  active?: boolean
  created_at?: string
}

export type PlanModality = 'one_off' | 'annual' | 'monthly'

export interface ProductPlan {
  id: string
  product_id: string
  name: string
  collaborators_min: number
  collaborators_max: number | null
  price_cents: number
  modality: PlanModality
  assessments_per_period: number
  active: boolean
  created_at: string
}
export interface ProductPlanInsert {
  id: string
  product_id: string
  name: string
  collaborators_min: number
  collaborators_max?: number | null
  price_cents: number
  modality: PlanModality
  assessments_per_period: number
  active?: boolean
  created_at?: string
}

export type SubscriptionStatus =
  | 'pending' | 'active' | 'expired' | 'cancelled' | 'failed'

export interface Subscription {
  id: string
  user_id: string
  product_id: string
  plan_id: string
  company_id: string | null
  status: SubscriptionStatus
  starts_at: string | null
  expires_at: string | null
  assessments_remaining: number
  asaas_customer_id: string | null
  asaas_payment_id: string | null
  asaas_subscription_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}
export interface SubscriptionInsert {
  id?: string
  user_id: string
  product_id: string
  plan_id: string
  company_id?: string | null
  status: SubscriptionStatus
  starts_at?: string | null
  expires_at?: string | null
  assessments_remaining?: number
  asaas_customer_id?: string | null
  asaas_payment_id?: string | null
  asaas_subscription_id?: string | null
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface Payment {
  id: string
  subscription_id: string
  asaas_payment_id: string
  amount_cents: number
  status: string
  payment_method: string | null
  paid_at: string | null
  webhook_payload: Record<string, unknown>
  webhook_received_at: string
}
export interface PaymentInsert {
  id?: string
  subscription_id: string
  asaas_payment_id: string
  amount_cents: number
  status: string
  payment_method?: string | null
  paid_at?: string | null
  webhook_payload: Record<string, unknown>
  webhook_received_at?: string
}

export interface ActiveSubscriptionRow {
  id: string
  user_id: string
  product_id: string
  plan_id: string
  subdomain: string
  expires_at: string | null
  assessments_remaining: number
  company_id: string | null
}

export type CommercialInvoiceStatus = 'emitida' | 'aprovada' | 'paga' | 'cancelada'

export interface CommercialInvoice {
  id: string
  invoice_number: string
  status: CommercialInvoiceStatus
  user_id: string
  company_id: string | null
  consultant_id: string
  created_by: string
  product_id: string
  plan_id: string
  amount_cents: number
  billing_mode: 'anual_parcelado' | 'anual_vista'
  include_pentagrama: boolean
  headcount_declared: number | null
  subscription_id: string | null
  metadata: Record<string, unknown>
  notes: string | null
  approved_by: string | null
  approved_at: string | null
  paid_by: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// TIPO: Database (compatível com @supabase/supabase-js)
// ============================================================

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
        Relationships: []
      }
      companies: {
        Row: Company
        Insert: CompanyInsert
        Update: CompanyUpdate
        Relationships: []
      }
      diagnostics: {
        Row: Diagnostic
        Insert: DiagnosticInsert
        Update: DiagnosticUpdate
        Relationships: []
      }
      il_responses: {
        Row: ILResponse
        Insert: ILResponseInsert
        Update: Partial<ILResponseInsert>
        Relationships: []
      }
      ic_responses: {
        Row: ICResponse
        Insert: ICResponseInsert
        Update: Partial<ICResponseInsert>
        Relationships: []
      }
      diagnostic_results: {
        Row: DiagnosticResult
        Insert: Omit<DiagnosticResult, 'id' | 'calculated_at'>
        Update: Partial<Omit<DiagnosticResult, 'id' | 'diagnostic_id' | 'calculated_at'>>
        Relationships: []
      }
      laudos: {
        Row: Laudo
        Insert: Omit<Laudo, 'id'>
        Update: Partial<Omit<Laudo, 'id'>>
        Relationships: []
      }
      products: {
        Row: Product
        Insert: ProductInsert
        Update: Partial<ProductInsert>
        Relationships: []
      }
      product_plans: {
        Row: ProductPlan
        Insert: ProductPlanInsert
        Update: Partial<ProductPlanInsert>
        Relationships: []
      }
      subscriptions: {
        Row: Subscription
        Insert: SubscriptionInsert
        Update: Partial<SubscriptionInsert>
        Relationships: []
      }
      payments: {
        Row: Payment
        Insert: PaymentInsert
        Update: Partial<PaymentInsert>
        Relationships: []
      }
      commercial_invoices: {
        Row: CommercialInvoice
        Insert: Omit<CommercialInvoice, 'id' | 'created_at' | 'updated_at' | 'invoice_number'> & {
          invoice_number?: string
        }
        Update: Partial<CommercialInvoice>
        Relationships: []
      }
    }
    Views: {
      [_: string]: { Row: Record<string, unknown> }
    }
    Functions: {
      [_: string]: {
        Args: Record<string, unknown>
        Returns: unknown
      }
    }
    Enums: {
      user_role: UserRole
      diagnostic_status: DiagnosticStatus
      dimensao_nivel: DimensaoNivel
      display_level: DisplayLevel
    }
  }
}

// ============================================================
// TABELA: ai_reports (Entrega 6)
// ============================================================

export interface AiReportNarrativa {
  sintetico: string
  analitico: string
}

export interface AiReportPlanoAcao {
  dimensao:   string
  prioridade: 'P1' | 'P2' | 'P3'
  narrativa:  string
  acoes:      string[]
  prazo:      string
  responsavel: string
}

export interface AiReportFerramenta {
  nome:                    string
  dimensao:                string
  justificativa_especifica: string
  como_aplicar:            string
  resultado_esperado: {
    '30_dias': string
    '60_dias': string
    '90_dias': string
  }
}

export interface AiReportRoteiro {
  abertura:            string
  desenvolvimento:     string[]
  fechamento:          string
  frases_de_transicao: string[]
}

export interface AiReportPergunta {
  pergunta:  string
  dimensao:  string
  objetivo:  string
}

export interface AiReportInsight {
  insight: string
  fonte:   string
}

export interface AiReportRecomendacao {
  recomendacao: string
  contexto:     string
  dimensao:     string
}

export interface AiReport {
  id:                        string
  diagnostic_id:             string
  report_type:               'inicial' | 'expandido'
  mode:                      'sintetico' | 'analitico'
  narrativa_executiva:       AiReportNarrativa | null
  plano_de_acao:             AiReportPlanoAcao[] | null
  ferramentas_prescritas:    AiReportFerramenta[] | null
  roteiro_devolutiva:        AiReportRoteiro | null
  perguntas_aprofundamento:  AiReportPergunta[] | null
  insights_da_conversa:      AiReportInsight[] | null
  recomendacoes_adicionais:  AiReportRecomendacao[] | null
  source_chat_messages:      string[] | null
  version:                   number
  generated_at:              string
  model_used:                string
  tokens_used:               number | null
  generation_time_ms:        number | null
}

// ============================================================
// TABELA: ai_chat_history (Entrega 6)
// ============================================================

export interface AiChatMessage {
  id:            string
  diagnostic_id: string
  user_id?:      string | null
  role:          'user' | 'assistant'
  content:       string
  created_at:    string
}

// ============================================================
// TIPOS DE CONVENIÊNCIA PARA JOINS
// ============================================================

export type DiagnosticWithCompany = Diagnostic & {
  companies: Pick<Company, 'id' | 'name' | 'total_collaborators'>
}

export type DiagnosticResultWithLaudos = DiagnosticResult & {
  laudo_fisica:   Pick<Laudo, 'texto'> | null
  laudo_afetiva:  Pick<Laudo, 'texto'> | null
  laudo_racional: Pick<Laudo, 'texto'> | null
  laudo_social:   Pick<Laudo, 'texto'> | null
  laudo_cultural: Pick<Laudo, 'texto'> | null
}
