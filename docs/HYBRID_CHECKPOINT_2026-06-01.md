# Checkpoint — Devolutiva híbrida v1.0.0 (sem LLM)

**Data:** 2026-06-01  
**Tag lógica:** `hybrid-v1.0.0`  
**Uso:** primeiro cliente com NR-01 + Pentagrama vinculado.

## O que foi entregue (80/20)

1. `config/pentagrama-nr01-crosswalk.v1.json` — mapa 5×10 Pentagrama → NR-01  
2. `src/lib/hybrid/compute.ts` — motor determinístico (sinais, plano fecundado, resumo executivo)  
3. `supabase/migrations/20260601000000_hybrid_reports.sql` — persistência + RLS  
4. UI `/nr01/avaliacao/[id]/hibrido` — gerar, recalcular, semear PDCA, imprimir  
5. Botão na avaliação **CONCLUIDO** com `linked_diagnostic_id`

## Antes do deploy (obrigatório)

```bash
npm run db:apply-pending
# ou aplicar manualmente 20260601000000_hybrid_reports.sql no Supabase
```

## Fluxo consultor (amanhã)

1. Encerrar Pentagrama vinculado → calcular relatório (`RELATORIO_GERADO` ou `ENCERRADO`)  
2. Processar NR-01 → `CONCLUIDO`  
3. Avaliação NR-01 → **Devolutiva híbrida** → **Gerar + semear plano PDCA**  
4. Revisar `/plano`, atribuir responsáveis, aprovar  
5. Laudo NR-01 regulatório continua separado (PDF oficial)

## Rollback

- Remover migration (drop `hybrid_reports`) se necessário  
- Código anterior não dependia desta tabela

## Próxima fase (não neste checkpoint)

- LLM opcional (Ollama/Groq) só para polir narrativa  
- PDF server-side da devolutiva híbrida
