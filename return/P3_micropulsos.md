P3 feito.

Micro-pulsos no ar. Patch 002 aplicado no banco (4 tabelas + 1 view k-anonymity ≥ 3 + 9 policies). Duas novas rotas: /nr01/avaliacao/[id]/monitoramento (consultor) e /nr01/pulso/[token] (coleta pública). Build webpack passou (15 rotas total), tsc limpo.

O que entregou:

Schema do patch_002:
- nr01_pulse_config: 1 linha por avaliação (enabled, day_of_week, recipient_emails jsonb, questions_per_week, window_hours, calibration_weeks default 3, weeks_dispatched).
- nr01_pulse_dispatches: 1 linha por semana (week_number, dispatched_at, question_ids jsonb, invites_sent_count, window_closes_at).
- nr01_pulse_invites: 1 linha por destinatário (email_hash com sal por-avaliação, token uuid único, used_at). UNIQUE (dispatch_id, email_hash) bloqueia duplicata.
- nr01_pulse_responses: respostas anônimas. anon_id sem FK ao invite — anonimato matemático. UNIQUE (dispatch_id, anon_id, question_id).
- View nr01_pulse_weekly_scores: agrega scores por (semana × dimensão) com k-anonymity ≥ 3 (mais permissivo que o ≥ 5 da coleta principal porque amostras semanais são naturalmente menores).
- DROP TABLE legacy nr01_micro_pulses (vazia, verificado antes).

Email adapter pluggable em lib/nr01/email.ts:
- Driver real: Resend via fetch direto, sem dep nova no package.json. Quando RESEND_API_KEY está no .env.local, sai email real.
- Driver fallback: console — loga payload formatado no servidor e devolve ok=true. Permite smoke test e dev sem credencial. Em prod sem key, falha visível (driver aparece marcado em badge no dashboard).
- buildPulseEmail: assunto "Pulso semanal NR-01 · 3 perguntas · 90 segundos", corpo text+html minimal, sem copy de marketing.

Helpers em lib/nr01/pulse.ts:
- selectQuestionsForWeek: embaralha dimensões (RNG injetável p/ teste), pega 1 por dimensão até atingir count, exclui question_ids dos últimos 2 dispatches para não repetir.
- hashEmail: HMAC sha256 com sal por-avaliação (mesmo padrão do hashIp do patch 001) — bloqueia correlação cruzada de email entre clientes.
- normalizeEmails: parse lista bruta (vírgula, ponto-e-vírgula, linha), dedup, lower, regex de sanidade.
- buildPulseUrl: link absoluto a partir de NEXT_PUBLIC_APP_URL.

UI consultor /monitoramento:
- Header com status (ativo/inativo + driver de email + semanas disparadas).
- Form de ativação: textarea de emails (parse permissivo), dia da semana, perguntas/semana (default 3), janela de horas (default 168 = 7 dias).
- Botão "disparar pulso" — fake cron manual conforme decisão do Diego. Mostra última semana e contagem de destinatários.
- Tabela histórica: semana, disparo, fechamento, convites, respondentes únicos, adesão %. Adesão < 40% pinta em vermelho; 40-60% amarelo; >= 60% verde.
- Tabela de scores semanais por dimensão (k-anonymity bloqueia células com n < 3 — render "—").
- Banner de calibração: enquanto weeks_dispatched <= calibration_weeks (3), aviso explícito "alertas preditivos só após semana 4".
- Banner de alerta de adesão: 2 semanas seguidas < 40% sinaliza ao consultor revisar canal/horário.

UI pública /nr01/pulso/[token]:
- Carrega 3 questões da semana a partir do dispatch.
- Estados explícitos: já respondido (used_at != null) | janela encerrada (now > window_closes_at) | sucesso (status=ok).
- Likert 1-5 obrigatório por questão.
- Submit gera anon_id NOVO no servidor, insere respostas, marca invite usado em call separada (reduz correlação temporal email→resposta no log).
- Audit MICRO_PULSE_RESPONDED com ip_hash salgado por-avaliação.

Eventos de auditoria:
- PULSE_MONITORING_ACTIVATED (n_emails, n_invalid, day_of_week, questions_per_week)
- PULSE_MONITORING_DEACTIVATED
- MICRO_PULSE_DISPATCHED (dispatch_id, week_number, n_questions, n_invites_sent, n_failed)
- MICRO_PULSE_RESPONDED (dispatch_id, week_number, n_answers)

O que NÃO entrou (conforme contrato):
- WhatsApp (v2)
- Cron automático (próxima onda — fake manual destrava monitoramento agora)
- Seleção priorizada por dimensão crítica (v2)
- Personalização por colaborador
- Gamificação
- Gráfico de linha (texto basta para validar sinal)

Decisões aplicadas (todas do Diego):
1. 3 perguntas/semana por padrão, configurável 1-5.
2. Calibration_weeks default 3 — alertas só a partir da semana 4.
3. Email-only (Resend pluggável); WhatsApp roadmap.
4. Cron manual nos primeiros 14 dias.
5. Adesão < 40% por 2 semanas → alerta visual ao consultor (não ao cliente).

Anti-poisoning preservado: a rota /pulso/[token] herda o esquema de invite por token único + UNIQUE constraint + used_at. Não precisa do throttle por IP do patch 001 porque o token já controla 1 resposta por destinatário por dispatch.

Pendência (sua, paralela): cadastrar conta Resend e colar RESEND_API_KEY=re_xxx no .env.local. Sem isso, o smoke test do P6 vai usar o driver console (payload no log do servidor); funciona, mas não chega email de verdade.

Tempo total P3: ~1h45 (dentro do alvo de 2h, longe do limite de 3h).

Aguardo "segue P4" para PDF server-side.
