/**
 * QUANTUM5G — Dados das 125 questões
 * IL: perspectiva da liderança
 * IC: perspectiva do colaborador (espelho do IL)
 *
 * Blocos reais (DECISÃO 001):
 *   Física:   F-A(Q1-8), F-B(Q9-16), F-C(Q17-25)
 *   Afetiva:  A-1(Q26-30), A-2(Q31-35), A-3(Q36-40), A-4(Q41-45), A-5(Q46-50)
 *   Racional: R-1(Q51-55), R-2(Q56-60), R-3(Q61-65), R-4(Q66-70), R-5(Q71-75)
 *   Social:   S-A(Q76-83), S-B(Q84-91), S-C(Q92-100)
 *   Cultural: C-A(Q101-108), C-B(Q109-116), C-C(Q117-125)
 */

export type Dimensao = 'fisica' | 'afetiva' | 'racional' | 'social' | 'cultural'
export type Bloco =
  | 'F-A' | 'F-B' | 'F-C'
  | 'A-1' | 'A-2' | 'A-3' | 'A-4' | 'A-5'
  | 'R-1' | 'R-2' | 'R-3' | 'R-4' | 'R-5'
  | 'S-A' | 'S-B' | 'S-C'
  | 'C-A' | 'C-B' | 'C-C'

export interface Questao {
  n: number       // 1–125
  bloco: Bloco
  dimensao: Dimensao
  il: string      // texto para liderança
  ic: string      // texto para colaborador
}

export interface BlocoInfo {
  id: Bloco
  dimensao: Dimensao
  titulo: string
  questoes: number[]  // range [inicio, fim] inclusive
}

// ============================================================
// BLOCOS
// ============================================================
export const BLOCOS: BlocoInfo[] = [
  { id: 'F-A', dimensao: 'fisica',   titulo: 'Conforto, Estrutura e Condições do Espaço',       questoes: [1,   8]  },
  { id: 'F-B', dimensao: 'fisica',   titulo: 'Corpo, Ergonomia e Saúde Física',                  questoes: [9,  16]  },
  { id: 'F-C', dimensao: 'fisica',   titulo: 'Sensações, Acolhimento e Significado do Espaço',   questoes: [17, 25]  },
  { id: 'A-1', dimensao: 'afetiva',  titulo: 'Clima Emocional e Saúde Afetiva',                  questoes: [26, 30]  },
  { id: 'A-2', dimensao: 'afetiva',  titulo: 'Pertencimento e Reconhecimento',                   questoes: [31, 35]  },
  { id: 'A-3', dimensao: 'afetiva',  titulo: 'Liderança Afetiva',                                questoes: [36, 40]  },
  { id: 'A-4', dimensao: 'afetiva',  titulo: 'Comunicação Empática',                             questoes: [41, 45]  },
  { id: 'A-5', dimensao: 'afetiva',  titulo: 'Vínculos, Cuidado e Relações Interpessoais',       questoes: [46, 50]  },
  { id: 'R-1', dimensao: 'racional', titulo: 'Clareza da Comunicação',                           questoes: [51, 55]  },
  { id: 'R-2', dimensao: 'racional', titulo: 'Coerência e Feedback',                             questoes: [56, 60]  },
  { id: 'R-3', dimensao: 'racional', titulo: 'Processos, Organização e Fluxos',                  questoes: [61, 65]  },
  { id: 'R-4', dimensao: 'racional', titulo: 'Metas, Planejamento e Direcionamento',             questoes: [66, 70]  },
  { id: 'R-5', dimensao: 'racional', titulo: 'Sentido, Propósito e Aprendizado',                 questoes: [71, 75]  },
  { id: 'S-A', dimensao: 'social',   titulo: 'Relações e Comunicação',                           questoes: [76, 83]  },
  { id: 'S-B', dimensao: 'social',   titulo: 'Confiança e Colaboração',                          questoes: [84, 91]  },
  { id: 'S-C', dimensao: 'social',   titulo: 'Pertencimento e Clima Social',                     questoes: [92, 100] },
  { id: 'C-A', dimensao: 'cultural', titulo: 'Coerência e Identidade Cultural',                  questoes: [101, 108]},
  { id: 'C-B', dimensao: 'cultural', titulo: 'Ética, Respeito e Diversidade',                    questoes: [109, 116]},
  { id: 'C-C', dimensao: 'cultural', titulo: 'Valores Vividos e Propósito Compartilhado',        questoes: [117, 125]},
]

export const DIMENSAO_LABEL: Record<Dimensao, string> = {
  fisica:   'Física',
  afetiva:  'Afetiva',
  racional: 'Racional',
  social:   'Social',
  cultural: 'Cultural',
}

export const DIMENSAO_SUBTITULO_IL: Record<Dimensao, string> = {
  fisica:   'O ambiente que você constrói — ou tolera',
  afetiva:  'O coração que você pulsa — ou endurece — na sua empresa',
  racional: 'A mente que você calibra — ou deixa em deriva',
  social:   'O tecido que você tece — ou deixa se desfiar',
  cultural: 'A alma que você sustenta — ou deixa esvaziar',
}

export const DIMENSAO_SUBTITULO_IC: Record<Dimensao, string> = {
  fisica:   'O ambiente que você vive no seu dia a dia',
  afetiva:  'Como você se sente nesta empresa',
  racional: 'A clareza e o sentido do seu trabalho',
  social:   'Como você se relaciona com os colegas e a empresa',
  cultural: 'O que esta empresa representa para você',
}

// ============================================================
// 125 QUESTÕES (IL + IC espelho)
// ============================================================
export const QUESTOES: Questao[] = [
  // ── FÍSICA ──────────────────────────────────────────────────
  // Bloco F-A (Q1–Q8)
  { n: 1,  bloco: 'F-A', dimensao: 'fisica', il: 'O ambiente de trabalho que oferecemos é confortável para que as pessoas realizem suas atividades diárias.', ic: 'O ambiente de trabalho é confortável para que eu realize minhas atividades diárias.' },
  { n: 2,  bloco: 'F-A', dimensao: 'fisica', il: 'A iluminação dos setores é suficiente para o trabalho sem gerar esforço ou desgaste excessivo.', ic: 'A iluminação do meu setor é suficiente para o trabalho sem gerar esforço ou desgaste excessivo.' },
  { n: 3,  bloco: 'F-A', dimensao: 'fisica', il: 'A temperatura do ambiente (calor, frio, ventilação) é adequada na maior parte do tempo.', ic: 'A temperatura do ambiente (calor, frio, ventilação) é adequada na maior parte do tempo.' },
  { n: 4,  bloco: 'F-A', dimensao: 'fisica', il: 'Os espaços não são apertados ou desconfortáveis — as pessoas conseguem se movimentar sem dificuldades.', ic: 'Os espaços não são apertados ou desconfortáveis — consigo me movimentar sem dificuldades.' },
  { n: 5,  bloco: 'F-A', dimensao: 'fisica', il: 'O nível de ruído nos ambientes de trabalho é tolerável e não gera desgaste físico.', ic: 'O nível de ruído no ambiente de trabalho é tolerável e não gera desgaste físico.' },
  { n: 6,  bloco: 'F-A', dimensao: 'fisica', il: 'Os equipamentos e ferramentas disponíveis apoiam o trabalho e funcionam adequadamente.', ic: 'Os equipamentos e ferramentas disponíveis apoiam meu trabalho e funcionam adequadamente.' },
  { n: 7,  bloco: 'F-A', dimensao: 'fisica', il: 'Há limpeza e organização suficientes para que o ambiente seja agradável.', ic: 'Há limpeza e organização suficientes para que o ambiente seja agradável.' },
  { n: 8,  bloco: 'F-A', dimensao: 'fisica', il: 'As pessoas conseguem acessar os materiais necessários sem esforço, confusão ou perda de tempo.', ic: 'Consigo acessar os materiais necessários sem esforço, confusão ou perda de tempo.' },
  // Bloco F-B (Q9–Q16)
  { n: 9,  bloco: 'F-B', dimensao: 'fisica', il: 'As condições de trabalho permitem que as pessoas mantenham postura adequada na maior parte do tempo.', ic: 'As condições de trabalho me permitem manter postura adequada na maior parte do tempo.' },
  { n: 10, bloco: 'F-B', dimensao: 'fisica', il: 'O trabalho não leva as pessoas a chegarem ao fim do dia com dor ou cansaço excessivo causado pelo ambiente.', ic: 'O trabalho não me leva a chegar ao fim do dia com dor ou cansaço excessivo causado pelo ambiente.' },
  { n: 11, bloco: 'F-B', dimensao: 'fisica', il: 'Oferecemos orientações sobre ergonomia ou boas práticas para evitar dores e lesões.', ic: 'Recebo orientações sobre ergonomia ou boas práticas para evitar dores e lesões.' },
  { n: 12, bloco: 'F-B', dimensao: 'fisica', il: 'As pessoas têm pausas suficientes para recuperar o corpo ao longo do dia.', ic: 'Tenho pausas suficientes para recuperar o corpo ao longo do dia.' },
  { n: 13, bloco: 'F-B', dimensao: 'fisica', il: 'O uso de Equipamentos de Proteção Individual (EPIs) é adequado e contribui para a segurança das pessoas.', ic: 'O uso de Equipamentos de Proteção Individual (EPIs) é adequado e contribui para minha segurança.' },
  { n: 14, bloco: 'F-B', dimensao: 'fisica', il: 'Os deslocamentos internos (caminhar, subir escadas, transportar itens) são seguros e não desgastam o corpo.', ic: 'Os deslocamentos internos (caminhar, subir escadas, transportar itens) são seguros e não desgastam meu corpo.' },
  { n: 15, bloco: 'F-B', dimensao: 'fisica', il: 'O ambiente físico protege a saúde das pessoas e não as expõe a riscos desnecessários.', ic: 'O ambiente físico protege minha saúde e não me expõe a riscos desnecessários.' },
  { n: 16, bloco: 'F-B', dimensao: 'fisica', il: 'O ritmo físico do trabalho é compatível com o que o corpo humano consegue sustentar de forma saudável.', ic: 'O ritmo físico do trabalho é compatível com o que meu corpo consegue sustentar de forma saudável.' },
  // Bloco F-C (Q17–Q25)
  { n: 17, bloco: 'F-C', dimensao: 'fisica', il: 'O ambiente transmite acolhimento e não gera sensação de pressão ou opressão nas pessoas.', ic: 'O ambiente transmite acolhimento e não gera sensação de pressão ou opressão em mim.' },
  { n: 18, bloco: 'F-C', dimensao: 'fisica', il: 'O espaço foi pensado para que as pessoas se sintam bem — não apenas para que produzam mais.', ic: 'O espaço foi pensado para que eu me sinta bem — não apenas para que produza mais.' },
  { n: 19, bloco: 'F-C', dimensao: 'fisica', il: 'A estética do ambiente (cores, arrumação, cuidado visual) contribui positivamente para o humor das pessoas.', ic: 'A estética do ambiente (cores, arrumação, cuidado visual) contribui positivamente para o meu humor.' },
  { n: 20, bloco: 'F-C', dimensao: 'fisica', il: 'Há espaços onde as pessoas podem respirar, recuperar o foco e retornar ao trabalho melhor.', ic: 'Há espaços onde posso respirar, recuperar o foco e retornar ao trabalho melhor.' },
  { n: 21, bloco: 'F-C', dimensao: 'fisica', il: 'Como liderança, nos preocupamos genuinamente com o bem-estar físico das pessoas, não apenas com as entregas.', ic: 'A liderança se preocupa genuinamente com meu bem-estar físico, não apenas com as entregas.' },
  { n: 22, bloco: 'F-C', dimensao: 'fisica', il: 'O ambiente físico transmite segurança psicológica — sensação de cuidado, respeito e proteção.', ic: 'O ambiente físico me transmite segurança psicológica — sensação de cuidado, respeito e proteção.' },
  { n: 23, bloco: 'F-C', dimensao: 'fisica', il: 'O ambiente facilita a comunicação entre as pessoas (falar, ouvir, entender).', ic: 'O ambiente facilita a comunicação entre as pessoas (falar, ouvir, entender).' },
  { n: 24, bloco: 'F-C', dimensao: 'fisica', il: 'A organização do espaço ajuda as pessoas a trabalharem com menos estresse.', ic: 'A organização do espaço me ajuda a trabalhar com menos estresse.' },
  { n: 25, bloco: 'F-C', dimensao: 'fisica', il: 'De forma geral, acredito que o ambiente físico que oferecemos respeita o corpo e as emoções das pessoas.', ic: 'De forma geral, o ambiente físico desta empresa respeita meu corpo e minhas emoções.' },

  // ── AFETIVA ─────────────────────────────────────────────────
  // Bloco A-1 (Q26–Q30)
  { n: 26, bloco: 'A-1', dimensao: 'afetiva', il: 'O ambiente de trabalho é emocionalmente seguro — as pessoas podem expressar sentimentos e opiniões sem medo de julgamento.', ic: 'O ambiente de trabalho é emocionalmente seguro — posso expressar sentimentos e opiniões sem medo de julgamento.' },
  { n: 27, bloco: 'A-1', dimensao: 'afetiva', il: 'Existe um clima de respeito e cordialidade nas relações entre colegas e líderes.', ic: 'Existe um clima de respeito e cordialidade nas relações entre colegas e líderes.' },
  { n: 28, bloco: 'A-1', dimensao: 'afetiva', il: 'As pessoas demonstram empatia e interesse genuíno umas pelas outras.', ic: 'As pessoas demonstram empatia e interesse genuíno umas pelas outras.' },
  { n: 29, bloco: 'A-1', dimensao: 'afetiva', il: 'Há abertura real para conversas honestas sobre dificuldades, erros e sentimentos.', ic: 'Há abertura real para conversas honestas sobre dificuldades, erros e sentimentos.' },
  { n: 30, bloco: 'A-1', dimensao: 'afetiva', il: 'O ambiente emocional da empresa favorece a colaboração mais do que a competição.', ic: 'O ambiente emocional desta empresa favorece a colaboração mais do que a competição.' },
  // Bloco A-2 (Q31–Q35)
  { n: 31, bloco: 'A-2', dimensao: 'afetiva', il: 'As pessoas sentem que fazem parte de algo maior que o seu cargo — percebem propósito no que fazem.', ic: 'Sinto que faço parte de algo maior que meu cargo — percebo propósito no que faço.' },
  { n: 32, bloco: 'A-2', dimensao: 'afetiva', il: 'Os esforços e resultados das pessoas são reconhecidos de maneira justa e transparente.', ic: 'Meus esforços e resultados são reconhecidos de maneira justa e transparente.' },
  { n: 33, bloco: 'A-2', dimensao: 'afetiva', il: 'Oferecemos feedbacks que valorizam o que as pessoas fazem bem, não apenas o que precisa melhorar.', ic: 'Recebo feedbacks que valorizam o que faço bem, não apenas o que precisa melhorar.' },
  { n: 34, bloco: 'A-2', dimensao: 'afetiva', il: 'Como liderança, nos importamos genuinamente com o crescimento pessoal e profissional de cada um.', ic: 'A liderança se importa genuinamente com meu crescimento pessoal e profissional.' },
  { n: 35, bloco: 'A-2', dimensao: 'afetiva', il: 'Acredito que as pessoas sentem orgulho em pertencer a esta equipe ou organização.', ic: 'Sinto orgulho em pertencer a esta equipe ou organização.' },
  // Bloco A-3 (Q36–Q40)
  { n: 36, bloco: 'A-3', dimensao: 'afetiva', il: 'Demonstro empatia e sensibilidade genuínas no trato com as pessoas que lidero.', ic: 'A liderança demonstra empatia e sensibilidade genuínas no trato comigo.' },
  { n: 37, bloco: 'A-3', dimensao: 'afetiva', il: 'Me preocupo ativamente com o bem-estar emocional da minha equipe.', ic: 'A liderança se preocupa ativamente com meu bem-estar emocional.' },
  { n: 38, bloco: 'A-3', dimensao: 'afetiva', il: 'Faço correções e dou orientações com respeito e escuta — não com imposição.', ic: 'As correções e orientações que recebo são feitas com respeito e escuta — não com imposição.' },
  { n: 39, bloco: 'A-3', dimensao: 'afetiva', il: 'Sei reconhecer quando erro e tenho facilidade em pedir desculpas quando necessário.', ic: 'A liderança sabe reconhecer quando erra e tem facilidade em pedir desculpas quando necessário.' },
  { n: 40, bloco: 'A-3', dimensao: 'afetiva', il: 'Acredito que as pessoas confiam em mim e percebem coerência entre o que digo e o que faço.', ic: 'Confio na liderança e percebo coerência entre o que ela diz e o que faz.' },
  // Bloco A-4 (Q41–Q45)
  { n: 41, bloco: 'A-4', dimensao: 'afetiva', il: 'A comunicação entre liderança e equipes é clara, respeitosa e transparente.', ic: 'A comunicação entre a liderança e a equipe é clara, respeitosa e transparente.' },
  { n: 42, bloco: 'A-4', dimensao: 'afetiva', il: 'As pessoas se sentem à vontade para discordar da liderança sem medo de represálias.', ic: 'Me sinto à vontade para discordar da liderança sem medo de represálias.' },
  { n: 43, bloco: 'A-4', dimensao: 'afetiva', il: 'Os conflitos são tratados com diálogo e escuta — não com imposição ou silêncio.', ic: 'Os conflitos são tratados com diálogo e escuta — não com imposição ou silêncio.' },
  { n: 44, bloco: 'A-4', dimensao: 'afetiva', il: 'Há cuidado consistente no tom de voz e nas palavras utilizadas no dia a dia.', ic: 'Há cuidado consistente no tom de voz e nas palavras utilizadas no dia a dia.' },
  { n: 45, bloco: 'A-4', dimensao: 'afetiva', il: 'As reuniões e conversas internas valorizam tanto resultados quanto pessoas.', ic: 'As reuniões e conversas internas valorizam tanto resultados quanto pessoas.' },
  // Bloco A-5 (Q46–Q50)
  { n: 46, bloco: 'A-5', dimensao: 'afetiva', il: 'As pessoas se importam umas com as outras de forma verdadeira — não apenas profissionalmente.', ic: 'As pessoas se importam umas com as outras de forma verdadeira — não apenas profissionalmente.' },
  { n: 47, bloco: 'A-5', dimensao: 'afetiva', il: 'Quando alguém está passando por um momento difícil, há solidariedade e apoio genuínos.', ic: 'Quando estou passando por um momento difícil, há solidariedade e apoio genuínos.' },
  { n: 48, bloco: 'A-5', dimensao: 'afetiva', il: 'O clima afetivo da empresa reflete confiança e proximidade entre as pessoas.', ic: 'O clima afetivo desta empresa reflete confiança e proximidade entre as pessoas.' },
  { n: 49, bloco: 'A-5', dimensao: 'afetiva', il: 'Há espaço real para celebrar conquistas e reconhecer vitórias coletivas.', ic: 'Há espaço real para celebrar conquistas e reconhecer vitórias coletivas.' },
  { n: 50, bloco: 'A-5', dimensao: 'afetiva', il: 'Acredito que cada pessoa sente que sua presença faz diferença na equipe — que é necessária.', ic: 'Sinto que minha presença faz diferença na equipe — que sou necessário(a).' },

  // ── RACIONAL ────────────────────────────────────────────────
  // Bloco R-1 (Q51–Q55)
  { n: 51, bloco: 'R-1', dimensao: 'racional', il: 'As informações importantes chegam às pessoas de forma clara e compreensível.', ic: 'As informações importantes chegam a mim de forma clara e compreensível.' },
  { n: 52, bloco: 'R-1', dimensao: 'racional', il: 'As pessoas sabem exatamente o que esperamos delas nas atividades do trabalho.', ic: 'Sei exatamente o que a empresa espera de mim nas atividades do trabalho.' },
  { n: 53, bloco: 'R-1', dimensao: 'racional', il: 'As mensagens que transmitimos como liderança são coerentes entre si — não se contradizem.', ic: 'As mensagens da liderança são coerentes entre si — não se contradizem.' },
  { n: 54, bloco: 'R-1', dimensao: 'racional', il: 'Quando há mudanças na empresa, as explicamos e justificamos de forma adequada.', ic: 'Quando há mudanças na empresa, elas são explicadas e justificadas de forma adequada.' },
  { n: 55, bloco: 'R-1', dimensao: 'racional', il: 'Há um canal oficial e eficiente de comunicação interna.', ic: 'Há um canal oficial e eficiente de comunicação interna.' },
  // Bloco R-2 (Q56–Q60)
  { n: 56, bloco: 'R-2', dimensao: 'racional', il: 'Ajo de forma coerente com o que comunico — não há distância entre discurso e prática.', ic: 'A liderança age de forma coerente com o que comunica — não há distância entre discurso e prática.' },
  { n: 57, bloco: 'R-2', dimensao: 'racional', il: 'Os feedbacks que ofereço são claros o suficiente para que as pessoas saibam exatamente o que precisam melhorar.', ic: 'Os feedbacks que recebo são claros o suficiente para que eu saiba exatamente o que preciso melhorar.' },
  { n: 58, bloco: 'R-2', dimensao: 'racional', il: 'As pessoas se sentem seguras para expressar dúvidas sem medo de julgamento.', ic: 'Me sinto seguro(a) para expressar dúvidas sem medo de julgamento.' },
  { n: 59, bloco: 'R-2', dimensao: 'racional', il: 'Dou retorno sobre as sugestões e ideias apresentadas pela equipe.', ic: 'A liderança dá retorno sobre as sugestões e ideias que apresento.' },
  { n: 60, bloco: 'R-2', dimensao: 'racional', il: 'Meu comportamento como líder reforça o que é dito nas reuniões e comunicações oficiais.', ic: 'O comportamento da liderança reforça o que é dito nas reuniões e comunicações oficiais.' },
  // Bloco R-3 (Q61–Q65)
  { n: 61, bloco: 'R-3', dimensao: 'racional', il: 'Os processos internos são bem definidos e de fácil compreensão para as pessoas.', ic: 'Os processos internos são bem definidos e de fácil compreensão para mim.' },
  { n: 62, bloco: 'R-3', dimensao: 'racional', il: 'As pessoas sabem exatamente a quem recorrer quando precisam resolver um problema.', ic: 'Sei exatamente a quem recorrer quando preciso resolver um problema.' },
  { n: 63, bloco: 'R-3', dimensao: 'racional', il: 'As tarefas e responsabilidades estão bem distribuídas entre os setores.', ic: 'As tarefas e responsabilidades estão bem distribuídas entre os setores.' },
  { n: 64, bloco: 'R-3', dimensao: 'racional', il: 'Revisamos e atualizamos os processos quando identificamos falhas ou atrasos.', ic: 'Os processos são revisados e atualizados quando há falhas ou atrasos.' },
  { n: 65, bloco: 'R-3', dimensao: 'racional', il: 'Os fluxos de trabalho entre setores são integrados e funcionam de forma harmoniosa.', ic: 'Os fluxos de trabalho entre setores são integrados e funcionam de forma harmoniosa.' },
  // Bloco R-4 (Q66–Q70)
  { n: 66, bloco: 'R-4', dimensao: 'racional', il: 'As metas da empresa e dos setores são bem explicadas e compreensíveis para todos.', ic: 'As metas da empresa e do meu setor são bem explicadas e compreensíveis para mim.' },
  { n: 67, bloco: 'R-4', dimensao: 'racional', il: 'As pessoas sabem como seu trabalho contribui para o alcance dos resultados gerais da empresa.', ic: 'Sei como meu trabalho contribui para o alcance dos resultados gerais da empresa.' },
  { n: 68, bloco: 'R-4', dimensao: 'racional', il: 'Existe clareza sobre os critérios de avaliação de desempenho.', ic: 'Existe clareza sobre os critérios pelos quais meu desempenho é avaliado.' },
  { n: 69, bloco: 'R-4', dimensao: 'racional', il: 'As decisões estratégicas da empresa são comunicadas com transparência.', ic: 'As decisões estratégicas da empresa são comunicadas com transparência.' },
  { n: 70, bloco: 'R-4', dimensao: 'racional', il: 'Temos um planejamento racional que orienta o dia a dia — não vivemos apenas apagando incêndios.', ic: 'A empresa tem um planejamento que orienta o dia a dia — não vivemos apenas apagando incêndios.' },
  // Bloco R-5 (Q71–Q75)
  { n: 71, bloco: 'R-5', dimensao: 'racional', il: 'As pessoas entendem claramente o propósito da empresa e acreditam nele.', ic: 'Entendo claramente o propósito desta empresa e acredito nele.' },
  { n: 72, bloco: 'R-5', dimensao: 'racional', il: 'As decisões que tomamos refletem os valores e o propósito da empresa.', ic: 'As decisões da empresa refletem seus valores e propósito.' },
  { n: 73, bloco: 'R-5', dimensao: 'racional', il: 'Há coerência perceptível entre o que a empresa diz e o que ela faz.', ic: 'Há coerência perceptível entre o que a empresa diz e o que ela faz.' },
  { n: 74, bloco: 'R-5', dimensao: 'racional', il: 'Quando ocorrem erros, tratamos como oportunidade de aprendizado — não como motivo de punição.', ic: 'Quando ocorrem erros, eles são tratados como oportunidade de aprendizado — não como motivo de punição.' },
  { n: 75, bloco: 'R-5', dimensao: 'racional', il: 'Buscamos constantemente alinhar racionalidade e humanidade nas nossas decisões.', ic: 'Percebo que a empresa busca alinhar racionalidade e humanidade nas suas decisões.' },

  // ── SOCIAL ──────────────────────────────────────────────────
  // Bloco S-A (Q76–Q83)
  { n: 76, bloco: 'S-A', dimensao: 'social', il: 'Há um ambiente de respeito mútuo entre os colegas de trabalho.', ic: 'Há um ambiente de respeito mútuo entre os colegas de trabalho.' },
  { n: 77, bloco: 'S-A', dimensao: 'social', il: 'A comunicação entre os setores da empresa é clara e aberta.', ic: 'A comunicação entre os setores da empresa é clara e aberta.' },
  { n: 78, bloco: 'S-A', dimensao: 'social', il: 'As pessoas podem expressar suas opiniões sem medo de julgamentos.', ic: 'Posso expressar minhas opiniões sem medo de julgamentos.' },
  { n: 79, bloco: 'S-A', dimensao: 'social', il: 'As pessoas se escutam de verdade durante conversas e reuniões.', ic: 'As pessoas se escutam de verdade durante conversas e reuniões.' },
  { n: 80, bloco: 'S-A', dimensao: 'social', il: 'Quando há divergências, as pessoas conseguem dialogar de forma madura.', ic: 'Quando há divergências, as pessoas conseguem dialogar de forma madura.' },
  { n: 81, bloco: 'S-A', dimensao: 'social', il: 'As informações importantes circulam de forma transparente entre todos.', ic: 'As informações importantes circulam de forma transparente entre todos.' },
  { n: 82, bloco: 'S-A', dimensao: 'social', il: 'As pessoas são tratadas com empatia e consideração no dia a dia.', ic: 'Sou tratado(a) com empatia e consideração no dia a dia.' },
  { n: 83, bloco: 'S-A', dimensao: 'social', il: 'Como liderança, estimulamos ativamente a cooperação entre pessoas e setores.', ic: 'A liderança estimula ativamente a cooperação entre pessoas e setores.' },
  // Bloco S-B (Q84–Q91)
  { n: 84, bloco: 'S-B', dimensao: 'social', il: 'As pessoas confiam que os colegas cumprem o que prometem.', ic: 'Confio que os colegas cumprem o que prometem.' },
  { n: 85, bloco: 'S-B', dimensao: 'social', il: 'Existe um clima de confiança entre liderança e equipe.', ic: 'Existe um clima de confiança entre a liderança e a equipe.' },
  { n: 86, bloco: 'S-B', dimensao: 'social', il: 'As pessoas colaboram umas com as outras mesmo sem serem solicitadas.', ic: 'As pessoas colaboram umas com as outras mesmo sem serem solicitadas.' },
  { n: 87, bloco: 'S-B', dimensao: 'social', il: 'As decisões são tomadas com base no diálogo — não na imposição.', ic: 'As decisões são tomadas com base no diálogo — não na imposição.' },
  { n: 88, bloco: 'S-B', dimensao: 'social', il: 'Há união e espírito de equipe perceptíveis no ambiente de trabalho.', ic: 'Há união e espírito de equipe perceptíveis no ambiente de trabalho.' },
  { n: 89, bloco: 'S-B', dimensao: 'social', il: 'Os conflitos são tratados de maneira respeitosa e produtiva.', ic: 'Os conflitos são tratados de maneira respeitosa e produtiva.' },
  { n: 90, bloco: 'S-B', dimensao: 'social', il: 'As vitórias são celebradas coletivamente, sem disputas internas.', ic: 'As vitórias são celebradas coletivamente, sem disputas internas.' },
  { n: 91, bloco: 'S-B', dimensao: 'social', il: 'Valorizamos e reforçamos atitudes de cooperação mais do que atitudes competitivas.', ic: 'A empresa valoriza e reforça atitudes de cooperação mais do que atitudes competitivas.' },
  // Bloco S-C (Q92–Q100)
  { n: 92,  bloco: 'S-C', dimensao: 'social', il: 'As pessoas sentem que fazem parte de algo maior dentro da empresa.', ic: 'Sinto que faço parte de algo maior dentro desta empresa.' },
  { n: 93,  bloco: 'S-C', dimensao: 'social', il: 'As pessoas têm orgulho de pertencer à equipe e ao que ela representa.', ic: 'Tenho orgulho de pertencer a esta equipe e ao que ela representa.' },
  { n: 94,  bloco: 'S-C', dimensao: 'social', il: 'Reconhecemos o valor de cada colaborador de forma consistente.', ic: 'Meu valor como colaborador(a) é reconhecido de forma consistente.' },
  { n: 95,  bloco: 'S-C', dimensao: 'social', il: 'As pessoas se preocupam umas com as outras — não apenas com resultados.', ic: 'As pessoas se preocupam umas com as outras — não apenas com resultados.' },
  { n: 96,  bloco: 'S-C', dimensao: 'social', il: 'O clima de trabalho é saudável e favorece o bem-estar emocional.', ic: 'O clima de trabalho é saudável e favorece meu bem-estar emocional.' },
  { n: 97,  bloco: 'S-C', dimensao: 'social', il: 'Há espaço real para diálogo e reconciliação quando há desentendimentos.', ic: 'Há espaço real para diálogo e reconciliação quando há desentendimentos.' },
  { n: 98,  bloco: 'S-C', dimensao: 'social', il: 'Há coerência perceptível entre o discurso da empresa e o modo como ela trata as pessoas.', ic: 'Há coerência perceptível entre o discurso da empresa e o modo como ela me trata.' },
  { n: 99,  bloco: 'S-C', dimensao: 'social', il: 'Os relacionamentos no ambiente de trabalho ajudam as pessoas a crescer como pessoas e profissionais.', ic: 'Os relacionamentos no ambiente de trabalho me ajudam a crescer como pessoa e profissional.' },
  { n: 100, bloco: 'S-C', dimensao: 'social', il: 'A convivência diária motiva as pessoas a continuarem contribuindo com o seu melhor.', ic: 'A convivência diária me motiva a continuar contribuindo com o meu melhor.' },

  // ── CULTURAL ────────────────────────────────────────────────
  // Bloco C-A (Q101–Q108)
  { n: 101, bloco: 'C-A', dimensao: 'cultural', il: 'As pessoas compreendem claramente quais são os valores e princípios que orientam as ações da empresa.', ic: 'Compreendo claramente quais são os valores e princípios que orientam as ações desta empresa.' },
  { n: 102, bloco: 'C-A', dimensao: 'cultural', il: 'Minhas atitudes como líder refletem os valores que a empresa comunica.', ic: 'As atitudes da liderança refletem os valores que a empresa comunica.' },
  { n: 103, bloco: 'C-A', dimensao: 'cultural', il: 'A forma como tomamos decisões mostra coerência com o que acreditamos.', ic: 'A forma como as decisões são tomadas mostra coerência com o que a empresa diz acreditar.' },
  { n: 104, bloco: 'C-A', dimensao: 'cultural', il: 'A cultura da empresa é vivida no dia a dia — não apenas falada em reuniões.', ic: 'A cultura desta empresa é vivida no dia a dia — não apenas falada em reuniões.' },
  { n: 105, bloco: 'C-A', dimensao: 'cultural', il: 'Tomo decisões levando em conta o impacto humano — não apenas o resultado.', ic: 'A liderança toma decisões levando em conta o impacto humano — não apenas o resultado.' },
  { n: 106, bloco: 'C-A', dimensao: 'cultural', il: 'As regras e políticas da empresa são aplicadas com justiça e de forma igual para todos.', ic: 'As regras e políticas da empresa são aplicadas com justiça e de forma igual para todos.' },
  { n: 107, bloco: 'C-A', dimensao: 'cultural', il: 'A cultura da empresa ajuda as pessoas a entenderem o que é esperado do comportamento delas no trabalho.', ic: 'A cultura desta empresa me ajuda a entender o que é esperado do meu comportamento no trabalho.' },
  { n: 108, bloco: 'C-A', dimensao: 'cultural', il: 'Acredito que a cultura da empresa é uma força positiva que genuinamente une as pessoas.', ic: 'Acredito que a cultura desta empresa é uma força positiva que genuinamente une as pessoas.' },
  // Bloco C-B (Q109–Q116)
  { n: 109, bloco: 'C-B', dimensao: 'cultural', il: 'As pessoas se sentem seguras para expressar opiniões e ideias sem medo de punições.', ic: 'Me sinto seguro(a) para expressar opiniões e ideias sem medo de punições.' },
  { n: 110, bloco: 'C-B', dimensao: 'cultural', il: 'A empresa trata as pessoas com respeito, independentemente de cargo ou função.', ic: 'Esta empresa me trata com respeito, independentemente do meu cargo ou função.' },
  { n: 111, bloco: 'C-B', dimensao: 'cultural', il: 'Líderes e colegas respeitam as diferenças de gênero, idade, crença ou opinião.', ic: 'Líderes e colegas respeitam as diferenças de gênero, idade, crença ou opinião.' },
  { n: 112, bloco: 'C-B', dimensao: 'cultural', il: 'Situações de injustiça ou desrespeito são tratadas com seriedade pela liderança.', ic: 'Situações de injustiça ou desrespeito são tratadas com seriedade pela liderança.' },
  { n: 113, bloco: 'C-B', dimensao: 'cultural', il: 'Ajo de forma ética no dia a dia — não apenas quando estou sendo observado.', ic: 'A liderança age de forma ética no dia a dia — não apenas quando está sendo observada.' },
  { n: 114, bloco: 'C-B', dimensao: 'cultural', il: 'As pessoas se ajudam e se apoiam nos momentos difíceis.', ic: 'As pessoas se ajudam e se apoiam nos momentos difíceis.' },
  { n: 115, bloco: 'C-B', dimensao: 'cultural', il: 'Há um ambiente de confiança onde as pessoas podem ser quem são.', ic: 'Há um ambiente de confiança onde posso ser quem sou.' },
  { n: 116, bloco: 'C-B', dimensao: 'cultural', il: 'A diversidade é genuinamente vista como algo que enriquece o ambiente de trabalho.', ic: 'A diversidade é genuinamente vista como algo que enriquece o ambiente de trabalho.' },
  // Bloco C-C (Q117–Q125)
  { n: 117, bloco: 'C-C', dimensao: 'cultural', il: 'Os valores que a empresa diz defender são visíveis na prática cotidiana.', ic: 'Os valores que esta empresa diz defender são visíveis na prática cotidiana.' },
  { n: 118, bloco: 'C-C', dimensao: 'cultural', il: 'As pessoas sabem qual é o propósito da empresa e entendem como seu trabalho contribui para ele.', ic: 'Sei qual é o propósito desta empresa e entendo como meu trabalho contribui para ele.' },
  { n: 119, bloco: 'C-C', dimensao: 'cultural', il: 'As pessoas sentem orgulho genuíno de fazer parte desta empresa.', ic: 'Sinto orgulho genuíno de fazer parte desta empresa.' },
  { n: 120, bloco: 'C-C', dimensao: 'cultural', il: 'A empresa valoriza mais a atitude ética e colaborativa do que apenas resultados.', ic: 'Esta empresa valoriza mais a atitude ética e colaborativa do que apenas resultados.' },
  { n: 121, bloco: 'C-C', dimensao: 'cultural', il: 'Reconhecemos atitudes que refletem os valores da empresa de forma consistente.', ic: 'Atitudes que refletem os valores da empresa são reconhecidas de forma consistente.' },
  { n: 122, bloco: 'C-C', dimensao: 'cultural', il: 'As comemorações e eventos da empresa reforçam o sentimento de pertencimento.', ic: 'As comemorações e eventos da empresa reforçam meu sentimento de pertencimento.' },
  { n: 123, bloco: 'C-C', dimensao: 'cultural', il: 'A cultura da empresa motiva as pessoas a crescer e dar o seu melhor.', ic: 'A cultura desta empresa me motiva a crescer e dar o meu melhor.' },
  { n: 124, bloco: 'C-C', dimensao: 'cultural', il: 'As mudanças na empresa mantêm o respeito à sua essência e aos seus valores.', ic: 'As mudanças nesta empresa mantêm o respeito à sua essência e aos seus valores.' },
  { n: 125, bloco: 'C-C', dimensao: 'cultural', il: 'Os valores e o propósito da empresa influenciam positivamente o modo como as pessoas trabalham.', ic: 'Os valores e o propósito desta empresa influenciam positivamente o modo como trabalho.' },
]

// ============================================================
// HELPERS
// ============================================================

/** Retorna questões de um bloco específico */
export function questoesPorBloco(bloco: Bloco): Questao[] {
  return QUESTOES.filter(q => q.bloco === bloco)
}

/** Retorna questões de uma dimensão específica */
export function questoesPorDimensao(dimensao: Dimensao): Questao[] {
  return QUESTOES.filter(q => q.dimensao === dimensao)
}

/** Retorna blocos de uma dimensão específica */
export function blocosPorDimensao(dimensao: Dimensao): BlocoInfo[] {
  return BLOCOS.filter(b => b.dimensao === dimensao)
}

/** Chave typed para q1..q125 */
export function qKey(n: number): `q${number}` {
  return `q${n}` as `q${number}`
}
