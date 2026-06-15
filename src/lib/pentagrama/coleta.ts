/** Diagnóstico Pentagrama com IL e IC abertos para coleta/disparo em paralelo. */
export const PENTAGRAMA_COLETA_ABERTA = ['AGUARDANDO_IL', 'COLETANDO_IC'] as const

export function isPentagramaColetaAberta(status: string): boolean {
  return (PENTAGRAMA_COLETA_ABERTA as readonly string[]).includes(status)
}
