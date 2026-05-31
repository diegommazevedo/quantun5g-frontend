'use server'

import {
  criarEmpresa as criarEmpresaImpl,
  atualizarEmpresa as atualizarEmpresaImpl,
} from '@/lib/companies/actions'

/** Server Actions na rota /empresas — evita UnrecognizedActionError após hot reload. */
export async function criarEmpresa(formData: FormData) {
  return criarEmpresaImpl(formData)
}

export async function atualizarEmpresa(formData: FormData) {
  return atualizarEmpresaImpl(formData)
}
