/**

 * Configuração central da navegação autenticada (staff + liderança).

 */



import { isPlatformStaff } from '@/lib/auth/roles'
import { isLicensingV2 } from '@/lib/licensing/model'



export type NavIconName =

  | 'home'

  | 'pentagrama'

  | 'plus'

  | 'building'

  | 'users'

  | 'nr01'

  | 'settings'

  | 'shield'

  | 'credit'



export interface NavItem {

  href: string

  label: string

  icon: NavIconName

  /** Prefixo(s) de pathname para estado ativo */

  match: string | string[]

  requiresModule?: 'pentagrama' | 'nr01'

  adminOnly?: boolean

  /** Sempre visível no menu (vendas/consulta), sem filtro de módulo */

  alwaysShow?: boolean

}



export interface NavSection {

  id: string

  label: string

  items: NavItem[]

}



const UUID =

  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i



export interface ContextTab {

  href: string

  label: string

  match: string

}



export interface ContextSubnav {

  backHref: string

  backLabel: string

  tabs: ContextTab[]

}



/** Links de consulta — sempre no menu (porta a porta + checkout online). */

/** Vendas presenciais — checkout online e tabela de planos ocultos até Asaas/planos estarem ativos. */
const CONSULTA_ITEMS: NavItem[] = [
  {
    href: '/contratacao',
    label: isLicensingV2() ? 'Contratar licença' : 'Emitir fatura (presencial)',
    icon: 'credit',
    match: '/contratacao',
    alwaysShow: true,
  },
  { href: '/faturas', label: 'Minhas faturas', icon: 'credit', match: '/faturas', alwaysShow: true },
]



const STAFF_SECTIONS: NavSection[] = [

  {

    id: 'platform',

    label: 'Plataforma',

    items: [{ href: '/dashboard', label: 'Início', icon: 'home', match: ['/dashboard', '/'] }],

  },

  {

    id: 'consulta',

    label: 'Vendas presenciais',

    items: CONSULTA_ITEMS,

  },

  {

    id: 'pentagrama',

    label: 'Pentagrama',

    items: [
      { href: '/dashboard', label: 'Painel', icon: 'pentagrama', match: '/dashboard', requiresModule: 'pentagrama' },

      {

        href: '/diagnostico/novo',

        label: 'Novo diagnóstico',

        icon: 'plus',

        match: ['/diagnostico/novo', '/diagnostico/empresas'],

        requiresModule: 'pentagrama',

      },

    ],

  },

  {

    id: 'empresas',

    label: 'Empresas & equipe',

    items: [

      { href: '/empresas', label: 'Todas as empresas', icon: 'building', match: '/empresas' },

      { href: '/empresas/nova', label: 'Nova empresa', icon: 'plus', match: '/empresas/nova' },

    ],

  },

  {

    id: 'nr01',

    label: 'NR-01',

    items: [

      { href: '/nr01/dashboard', label: 'Painel', icon: 'nr01', match: '/nr01/dashboard', requiresModule: 'nr01' },

      {

        href: '/nr01/avaliacao/nova',

        label: 'Nova avaliação',

        icon: 'plus',

        match: ['/nr01/avaliacao/nova', '/nr01/empresas'],

        requiresModule: 'nr01',

      },

    ],

  },

  {

    id: 'admin',

    label: 'Administração',

    items: [

      { href: '/admin/usuarios', label: 'Usuários', icon: 'settings', match: '/admin/usuarios', adminOnly: true },

      { href: '/admin/consultores', label: 'Consultores', icon: 'shield', match: '/admin/consultores', adminOnly: true },

      { href: '/admin/faturas', label: 'Faturas (aprovar/pagar)', icon: 'credit', match: '/admin/faturas', adminOnly: true },

    ],

  },

]



const LEADER_SECTIONS: NavSection[] = [

  {

    id: 'platform',

    label: 'Plataforma',

    items: [{ href: '/dashboard', label: 'Início', icon: 'home', match: '/dashboard' }],

  },

  {

    id: 'consulta',

    label: 'Vendas presenciais',

    items: CONSULTA_ITEMS,

  },

  {

    id: 'pentagrama',

    label: 'Pentagrama',

    items: [
      { href: '/dashboard', label: 'Painel Pentagrama', icon: 'pentagrama', match: '/dashboard', requiresModule: 'pentagrama' },

      {

        href: '/diagnostico/novo',

        label: 'Novo diagnóstico',

        icon: 'plus',

        match: ['/diagnostico/novo'],

        requiresModule: 'pentagrama',

      },

    ],

  },

  {

    id: 'nr01',

    label: 'NR-01',

    items: [

      { href: '/nr01/dashboard', label: 'Painel', icon: 'nr01', match: '/nr01/dashboard', requiresModule: 'nr01' },

      {

        href: '/nr01/avaliacao/nova',

        label: 'Nova avaliação',

        icon: 'plus',

        match: ['/nr01/avaliacao/nova'],

        requiresModule: 'nr01',

      },

    ],

  },

]



export function buildNavSections(opts: {

  role: string

  modulePentagrama: boolean

  moduleNr01: boolean

}): NavSection[] {

  const { role, modulePentagrama, moduleNr01 } = opts

  const staff = isPlatformStaff(role)
  const isAdmin = role === 'admin'
  const v2Operator = isLicensingV2() && role === 'leader'

  const source = staff || v2Operator ? STAFF_SECTIONS : LEADER_SECTIONS

  const sections: NavSection[] = []



  for (const section of source) {

    const items = section.items.filter((item) => {

      if (item.adminOnly && !isAdmin) return false

      if (item.alwaysShow) return true

      if (item.requiresModule === 'pentagrama' && !modulePentagrama && !isAdmin) return false

      if (item.requiresModule === 'nr01' && !moduleNr01 && !isAdmin) return false

      if (section.id === 'empresas' && !modulePentagrama && !moduleNr01 && !isAdmin) return false

      return true

    })

    if (items.length > 0) sections.push({ ...section, items })

  }



  return sections

}



export function isNavItemActive(pathname: string, match: string | string[]): boolean {

  const paths = Array.isArray(match) ? match : [match]

  for (const m of paths) {

    if (m === '/') return pathname === '/'

    if (pathname === m || pathname.startsWith(`${m}/`)) return true

  }

  return false

}



/** Subnav contextual (diagnóstico, avaliação NR-01, empresa, relatório). */

export function resolveContextSubnav(pathname: string): ContextSubnav | null {

  const parts = pathname.split('/').filter(Boolean)



  if (parts[0] === 'empresas' && parts[1] && UUID.test(parts[1]) && parts[1] !== 'nova') {

    const id = parts[1]

    return {

      backHref: '/empresas',

      backLabel: 'Empresas',

      tabs: [

        { href: `/empresas/${id}`, label: 'Cadastro', match: `/empresas/${id}` },

        { href: `/empresas/${id}/equipe`, label: 'Equipe & disparos', match: `/empresas/${id}/equipe` },

      ],

    }

  }



  if (parts[0] === 'diagnostico' && parts[1] && UUID.test(parts[1])) {

    const id = parts[1]

    const tabs: ContextTab[] = [

      { href: `/diagnostico/${id}`, label: 'Visão geral', match: `/diagnostico/${id}` },

      { href: `/diagnostico/${id}/disparos`, label: 'Disparos e-mail', match: `/diagnostico/${id}/disparos` },

      { href: `/relatorio/${id}`, label: 'Relatório', match: `/relatorio/${id}` },

    ]

    return { backHref: '/dashboard', backLabel: 'Pentagrama', tabs }

  }



  if (parts[0] === 'relatorio' && parts[1] && UUID.test(parts[1])) {

    const id = parts[1]

    return {

      backHref: `/diagnostico/${id}`,

      backLabel: 'Diagnóstico',

      tabs: [

        { href: `/diagnostico/${id}`, label: 'Visão geral', match: `/diagnostico/${id}` },

        { href: `/diagnostico/${id}/disparos`, label: 'Disparos e-mail', match: `/diagnostico/${id}/disparos` },

        { href: `/relatorio/${id}`, label: 'Relatório', match: `/relatorio/${id}` },

      ],

    }

  }



  if (parts[0] === 'nr01' && parts[1] === 'avaliacao' && parts[2] && UUID.test(parts[2])) {

    const id = parts[2]

    if (parts[3] === 'laudo-print') return null

    return {

      backHref: '/nr01/dashboard',

      backLabel: 'NR-01',

      tabs: [

        { href: `/nr01/avaliacao/${id}`, label: 'Visão geral', match: `/nr01/avaliacao/${id}` },

        { href: `/nr01/avaliacao/${id}/disparos`, label: 'Disparos e-mail', match: `/nr01/avaliacao/${id}/disparos` },

        { href: `/nr01/avaliacao/${id}/monitoramento`, label: 'Monitoramento', match: `/nr01/avaliacao/${id}/monitoramento` },

        { href: `/nr01/avaliacao/${id}/plano`, label: 'Plano de ação', match: `/nr01/avaliacao/${id}/plano` },

        { href: `/nr01/avaliacao/${id}/economico`, label: 'Análise econômica', match: `/nr01/avaliacao/${id}/economico` },

      ],

    }

  }



  return null

}



export function isContextTabActive(pathname: string, tab: ContextTab): boolean {

  if (tab.match.endsWith('/disparos') || tab.match.includes('/equipe')) {

    return pathname === tab.match || pathname.startsWith(`${tab.match}/`)

  }

  if (pathname === tab.match) return true

  if (tab.match.match(/\/[0-9a-f-]{36}$/i) && pathname.startsWith(`${tab.match}/`)) {

    return false

  }

  return pathname.startsWith(`${tab.match}/`)

}



export function moduleSubtitle(modulePentagrama: boolean, moduleNr01: boolean, role: string): string {

  if (role === 'admin') return 'Administrador · todos os módulos'

  if (modulePentagrama && moduleNr01) return 'Pentagrama + NR-01'

  if (moduleNr01) return 'Módulo NR-01'

  if (modulePentagrama) return 'Pentagrama de Ginger'

  return 'Quantum5G'

}


