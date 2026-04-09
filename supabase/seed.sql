-- ============================================================
-- QUANTUM5G — Pentagrama de Ginger | Seed SQL
-- Versão: 1.1 | Data: 2026-03-24
-- 21 laudos fixos: 20 (5 dimensões × 4 níveis) + 1 indisponibilidade
-- REGRA INVIOLÁVEL: textos copiados integralmente do material autoral
-- de Jovane Borlini da Silva. Nunca parafrasear, resumir ou modificar.
-- Executar APÓS schema.sql no Supabase SQL Editor.
-- IDEMPOTENTE: ON CONFLICT DO NOTHING — pode rodar múltiplas vezes.
-- ============================================================

-- ============================================================
-- DIMENSÃO FÍSICA
-- ============================================================

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'fisica', 'critico',
  'O ambiente de trabalho tornou-se hostil ao bem-estar humano. As condições físicas, estruturais e ergonômicas são precárias, comprometendo produtividade e saúde. A desorganização dos espaços, a falta de manutenção e a ausência de cuidado com o conforto revelam uma cultura que negligencia o corpo e o ambiente como extensões da vida organizacional. Os colaboradores convivem com esgotamento, fadiga e desatenção — e o espaço, em vez de ser fonte de energia, tornou-se fator de desgaste. Quando o espaço é descuidado, o ser humano também o é. A empresa opera em modo de sobrevivência, reagindo mais do que planejando, com baixa atenção à estética, iluminação, ventilação e funcionalidade. Este é o ponto em que o ambiente grita por cuidado — não apenas reforma estrutural, mas reconstrução simbólica do sentido de pertencimento e dignidade.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'fisica', 'vulneravel',
  'O espaço físico demonstra tentativas de organização, mas carece de intencionalidade e coerência. As condições não são ruins, mas deixam a desejar em conforto, praticidade e harmonia. O ambiente é funcional, porém sem identidade — cumpre sua finalidade, mas não inspira. A sensação é de um espaço impessoal: os colaboradores percebem que algo falta, ainda que não saibam dizer exatamente o quê. Pequenos detalhes — iluminação, ventilação, limpeza, conservação — oscilam entre o cuidado e o descuido. Estágio típico de organizações que se preocupam mais com o operacional do que com o experiencial. A vulnerabilidade física é um convite à reflexão: até que ponto o ambiente está cuidando das pessoas, e até que ponto está apenas servindo à rotina?'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'fisica', 'saudavel',
  'A organização entende o ambiente como extensão da sua cultura e como expressão do cuidado com as pessoas. Os espaços são limpos, bem iluminados, organizados e projetados para promover conforto, segurança e eficiência. O layout favorece o fluxo de trabalho, e a estética comunica coerência e pertencimento. O físico não é apenas cenário, mas parte da narrativa organizacional: cada detalhe reflete respeito, zelo e valorização do ser humano. Há harmonia entre funcionalidade e bem-estar. A organização demonstra maturidade ao compreender que cuidar do ambiente é cuidar da experiência humana no trabalho.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'fisica', 'excelente',
  'O ambiente transcende o conceito de espaço e torna-se símbolo vivo da identidade organizacional. Cada detalhe é pensado para promover bem-estar, fluidez e sentido. A estética é funcional e inspiradora, revelando a cultura em cores, formas e atmosferas. O espaço é agradável, sustentável, acessível e estimulante — convidando à criatividade e ao convívio. Aqui, o ambiente fala. E o que ele comunica é: cuidado, pertencimento e propósito. O colaborador sente orgulho de pertencer e prazer em estar no ambiente. A dimensão física excelente é a tradução visível da alma invisível da instituição.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

-- ============================================================
-- DIMENSÃO AFETIVA
-- ============================================================

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'afetiva', 'critico',
  'Ambiente emocionalmente adoecido. Os vínculos estão fragilizados e o clima relacional tornou-se árido. Os colaboradores se sentem isolados, desvalorizados e desconectados da essência da organização. A ausência de empatia, escuta e reconhecimento gera frieza nas relações, e a comunicação tende a ser instrumental, sem calor humano. O trabalho é visto apenas como obrigação — não como espaço de convivência e realização. A confiança se esvai, o medo se instala e a cooperação cede lugar à competição. O coração organizacional pulsa fraco. As relações tornam-se mecânicas, o colaborador atua como peça de engrenagem sem sentimento de contribuição real. A dimensão afetiva em estado crítico revela uma empresa que mantém o corpo ativo, mas com o coração cansado.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'afetiva', 'vulneravel',
  'Há tentativas de construção de vínculos, mas elas ainda são frágeis e inconsistentes. Existem pessoas bem-intencionadas, relações amistosas e momentos de acolhimento, mas sem continuidade e profundidade. O clima é de cordialidade, mas não de pertencimento. A empatia existe, porém é seletiva; a escuta, parcial; o reconhecimento, pontual. O ambiente revela boa vontade, mas carência de sensibilidade genuína nas relações cotidianas. O coração organizacional oscila entre o cuidado e a indiferença. Há espaço para o diálogo, mas ele não se consolida como prática. O afeto é percebido, mas não estruturado. As pessoas sentem falta de uma presença emocional mais constante e autêntica.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'afetiva', 'saudavel',
  'O respeito, a empatia e o senso de pertencimento já são valores perceptíveis e praticados. Os colaboradores se sentem vistos, ouvidos e reconhecidos como parte essencial do todo. As relações são estáveis, e o clima de convivência favorece a cooperação e o bem-estar. Há abertura para o diálogo, espaços de escuta e trocas genuínas que fortalecem os laços humanos. O trabalho é feito com envolvimento e significado. O coração da empresa pulsa de forma equilibrada e constante. Ainda há pontos de atenção, mas o fundamento está bem construído. A afetividade saudável sustenta o engajamento e torna a convivência um fator de força — não de desgaste.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'afetiva', 'excelente',
  'O ápice da maturidade emocional dentro da organização. O ambiente é regido por confiança mútua, respeito e profundo sentimento de pertencimento. As relações são marcadas por cuidado, acolhimento e alegria compartilhada. O clima organizacional é caloroso sem ser permissivo, e o afeto se expressa em gestos cotidianos de empatia, solidariedade e valorização humana. O coração da empresa pulsa forte e ritmado, alimentando todas as outras dimensões. O afeto transcende a esfera emocional e se torna cultura — influenciando comportamentos, decisões e práticas. O cuidado é natural: não imposto, mas vivido. A organização se revela não apenas produtiva, mas profundamente humana.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

-- ============================================================
-- DIMENSÃO RACIONAL
-- ============================================================

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'racional', 'critico',
  'Perda de clareza, coerência e sentido estratégico. As decisões são tomadas de forma improvisada, reativa e desconectada dos objetivos maiores. Falta direção, e o pensamento coletivo se dispersa em meio a dúvidas, ruídos e desorganização. A empresa se movimenta, mas sem propósito definido. As pessoas executam tarefas sem compreender o porquê das ações, e o raciocínio organizacional se torna fragmentado. Prevalece a confusão entre urgência e importância. O foco se dissolve diante de pressões imediatas. Ambiente intelectualmente cansado, onde o pensar não orienta o fazer. A empresa perde a capacidade de refletir sobre si mesma — sem clareza, sem norte e sem discernimento coletivo.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'racional', 'vulneravel',
  'Há lógica e direção, mas com lacunas significativas de alinhamento e coerência. A empresa tem objetivos, mas nem todos os colaboradores compreendem sua totalidade. Existem processos definidos, porém mal comunicados ou inconsistentemente aplicados. A racionalidade existe em partes, mas não permeia o todo. As decisões tendem a ser mais reativas do que planejadas, e a comunicação estratégica chega com ruído. O pensamento organizacional existe, mas não flui com clareza. É o estágio de quem tem mapa, mas não sabe bem onde está — e nem todos os passageiros receberam o mesmo mapa.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'racional', 'saudavel',
  'Há coerência entre o pensar e o agir. As decisões são tomadas com base em critérios claros, e a comunicação flui de modo transparente. A racionalidade dá forma à estratégia, organiza o tempo e confere previsibilidade às ações. Os colaboradores compreendem o propósito e sabem como seu trabalho conecta ao todo. A bússola organizacional está calibrada. A razão funciona de forma lúcida e sensível — não apenas eficiente, mas permeada por sentido.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'racional', 'excelente',
  'A mente organizacional opera em seu nível mais alto: decisões coerentes, comunicação clara, processos bem definidos e amplamente compreendidos. Há integração entre estratégia e humanidade — as escolhas racionais consideram impacto humano. O pensamento organizacional não é apenas eficiente; é orientado por propósito. Os erros são tratados como aprendizado, e a empresa tem capacidade de refletir sobre si mesma e ajustar o curso com discernimento. A dimensão racional excelente transforma intenções em resultados sem perder de vista as pessoas que os produzem.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

-- ============================================================
-- DIMENSÃO SOCIAL
-- ============================================================

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'social', 'critico',
  'O tecido relacional está rompido. Conflitos não resolvidos, silos entre setores, comunicação fragmentada e desconfiança generalizada comprometem a capacidade de cooperação. As pessoas trabalham no mesmo espaço, mas não formam equipe. O individualismo substitui o colaborativo, e as disputas internas consomem a energia que deveria ser direcionada ao trabalho. O "nós" se dissolve; resta apenas o "eu". A fragmentação social é, frequentemente, invisível para a liderança — mas sentida intensamente pelos colaboradores. Neste nível, qualquer iniciativa estratégica enfrenta resistência passiva porque o campo relacional não sustenta cooperação.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'social', 'vulneravel',
  'Há boa vontade relacional, mas as conexões são frágeis e dependentes de contextos específicos. A cooperação acontece pontualmente, mas não como cultura. Os conflitos são evitados — o que parece paz, mas é supressão. A comunicação flui bem em momentos tranquilos, mas quebra sob pressão. A convivência existe; o encontro verdadeiro, ainda não. O tecido social está sendo tecido, mas com muitos fios soltos.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'social', 'saudavel',
  'Equipes colaborativas, líderes acessíveis e comunicação que aproxima em vez de separar. O ambiente social é estável o suficiente para suportar conflitos sem ruptura. As divergências são tratadas com maturidade, e o espírito de equipe é perceptível no dia a dia. O "eu" e o "nós" coexistem sem que um precise anular o outro. A diversidade é reconhecida como fonte de riqueza coletiva.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'social', 'excelente',
  'O tecido relacional é forte, fluido e autorreparável. A cooperação é espontânea, não induzida. Os conflitos são tratados como fronteiras de crescimento — não como ameaças à harmonia. A celebração das vitórias é genuinamente coletiva. O campo social sustenta a empresa mesmo em momentos de pressão externa. Aqui, a convivência tornou-se cultura viva: ela não precisa ser gerenciada — ela acontece porque foi cultivada.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

-- ============================================================
-- DIMENSÃO CULTURAL
-- ============================================================

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'cultural', 'critico',
  'Perda de identidade organizacional. As pessoas deixam de saber por que fazem o que fazem, e a empresa perde seu norte. A distância entre os valores declarados e os valores praticados é ampla e percebida pelos colaboradores como hipocrisia institucional. O propósito não orienta — é discurso. Quando a cultura está confusa ou enfraquecida, cada setor inventa sua própria regra — e o campo se fragmenta. É o nível em que a empresa pode ter processos, estratégias e ferramentas, mas nenhuma força que una tudo. A alma está ausente.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'cultural', 'vulneravel',
  'Há valores declarados, mas sua prática é inconsistente. A cultura existe como intenção, mas não como vivência cotidiana. Os colaboradores percebem os valores em momentos específicos (eventos, comunicações), mas não os sentem no dia a dia das decisões. A cultura existe no papel, mas ainda não desceu para o chão. Lideranças bem-intencionadas, mas inconsistentes em sua modelagem cultural, são a marca deste nível.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'cultural', 'saudavel',
  'Os valores são conhecidos, praticados e percebidos como força real. Há coerência entre o que a empresa diz e o que ela faz — ao menos na maior parte do tempo. O propósito é compreendido e conecta as pessoas a algo maior que suas funções. A cultura funciona como fio invisível que une setores e comportamentos. Quando surgem tensões, os valores organizacionais funcionam como referência — não como adorno.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'cultural', 'excelente',
  'A cultura é a alma viva da organização. Os valores não são apenas praticados — são encarnados. A identidade organizacional é forte o suficiente para sobreviver a crises, mudanças e rotatividade de lideranças. O propósito é genuíno e mobilizador. Cada colaborador compreende que seu trabalho é parte de algo maior. A diversidade é celebrada dentro de uma identidade coesa. Aqui, a cultura não precisa ser gerenciada — ela se reproduz porque foi integrada na experiência cotidiana de cada pessoa.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

-- ============================================================
-- LAUDO DE INDISPONIBILIDADE (N = 0)
-- Exibido quando não há respostas de colaboradores para a dimensão.
-- ============================================================

INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(), 'indisponivel', 'sem_dados',
  'Não há respostas de colaboradores disponíveis para esta dimensão. O diagnóstico desta dimensão está baseado exclusivamente na percepção da liderança. Para um diagnóstico completo, é necessário coletar ao menos 1 resposta de colaboradores.'
) ON CONFLICT (dimensao, nivel) DO NOTHING;

-- ============================================================
-- Verificação: deve retornar 21 registros
-- SELECT dimensao, nivel FROM laudos ORDER BY dimensao, nivel;
-- ============================================================
