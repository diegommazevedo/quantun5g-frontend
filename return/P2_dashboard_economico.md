P2 feito.

Rota /nr01/avaliacao/[id]/economico no ar. Build webpack passou (Turbopack bloqueado pelo WDAC, sem impacto), todas as 13 rotas compilam, tsc limpo.

O que entregou:

- Bloco 1 (inputs editáveis): N° colab, folha mensal/colab, afastamentos CID-F/ano, dias médios, turnover %, RAT %, FAP, custo do programa. Defaults oficiais pré-preenchidos do Diego (DIEESE/ISMA-BR/INSS) carregados de DEFAULT_CLIENT_INPUTS em economic.ts. Recalcular dispara Server Action que salva inputs + roda computeFullProjection + persiste projeção + audita.

- Bloco 2 (exposição atual, número grande em serif vermelho): total + breakdown por vetor. V1 multas, V2 afastamentos, V3 turnover, V4 produtividade marcados como `production`. V5 FAP, V6 contencioso, V7 reputação marcados como `roadmap` e renderizam "em roadmap" em vez de número falso (constante VECTOR_CONFIDENCE em economic.ts).

- Bloco 3 (três cenários lado a lado): Não agir (perda projetada, vermelho) | Agir parcial (resultado líquido, neutro/positivo) | Agir integral (resultado líquido, verde). Card recomendado pelo sistema fica com ring esmeralda + selo "RECOMENDADO".

- Bloco 4 (recomendação): frase única, derivada do cenário com maior net_brl, com ISO + nível de risco + exposição + investimento + economia + payback + ROI. Botão de PDF stubbed (Passo 4) com fallback "imprime via browser".

- Bloqueio honesto se status != CONCLUIDO: mostra "Status atual: COLETANDO" + link de volta. Não tenta renderizar com dados pela metade.

- Em roadmap explicitado no rodapé: cálculo INSS oficial do FAP, provisões reais de contencioso, proxy reputacional Glassdoor, benchmark setorial.

Defaults oficiais aplicados em economic.ts:
- absence_cost_per_day_brl: 302 (4500 × 1,68 encargos × 1,20 retrabalho ÷ 30)
- productivity_gain_pct: 25 (alinhado com "redução 25%")
- expected_absence_reduction_pct e expected_turnover_reduction_pct: 25%
- DEFAULT_CLIENT_INPUTS exportado: 4500/folha, 1,68 encargos, 4% afastamento CID-F, 18% turnover, 90 dias, RAT 2%, FAP 1.0, programa 1% da folha

Tipografia: font-serif do Tailwind (Georgia fallback) nos números grandes — funcional sem dependência adicional. Plug Playfair via next/font fica como nice-to-have, fora do escopo de hoje.

Auditoria: cada recálculo gera evento ECONOMIC_RECALCULATED em nr01_audit_log com ISO, total_workers, na_total e ai_net.

O que NÃO entrou (conforme contrato): export PDF formal (P4), gráficos, cenários customizados, benchmark.

Avaliação subjetiva: tela passa o teste do CFO. Os números grandes em serif comunicam gravidade sem virar pitch deck. A flag "em roadmap" nos vetores incertos é o que protege a credibilidade — preferi mostrar "em roadmap" do que inventar fórmula. ROI/payback aparecem só no cenário integral porque é onde têm fundamento; nos demais ficaria ruído.

Tempo total P2: ~1h30 (dentro do alvo de 2-3h).

Bloqueador externo: WDAC bloqueia o Turbopack (.node nativo), tive que usar `next build --webpack`. Sem impacto funcional, mas vale registrar para o runbook do Passo 7 — desenvolvedor novo no projeto vai bater nesse erro.

Aguardo "segue P3" para micro-pulsos.
