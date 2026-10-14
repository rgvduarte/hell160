import { Link } from 'react-router-dom'
import { EVENT } from '../data/event'
import { Media } from '../components/Media'

// Quem somos: a Associação Desportiva e Cultural HELL160, nas palavras do manifesto da associação.
// O texto é o da associação; não acrescentar factos, números nem descrições de projetos que ela não publicou.

const PILLARS = [
  ['Desporto', 'que atraia pessoas'],
  ['Cultura', 'que preserve a identidade'],
  ['Educação', 'que abra horizontes'],
  ['Ação social', 'que aproxime gerações'],
  ['Património', 'que mantenha viva a memória coletiva'],
] as const

const PROJECTS = [
  'Casa HELL160',
  'Centro Interpretativo Memória Viva da Margem Esquerda do Guadiana',
  'Bosque e Caminho dos Lendários',
  'Fórum de Desenvolvimento Rural Além Guadiana',
] as const

export function Association() {
  return (
    <>
      <section className="page-hero about-hero" aria-labelledby="about-h">
        <Media slot="associacao" tone="night" eager />
        <div className="wrap">
          <h1 className="display" id="about-h">
            Uma região com memória. Um futuro por construir.
          </h1>
          <p className="lede">Há terras que não podem ser esquecidas. E há histórias que não podem terminar no abandono.</p>
        </div>
      </section>

      <section className="sec">
        <div className="wrap split">
          <h2 className="display about-h2">Quem somos</h2>
          <div className="stack about-prose">
            <p className="lede">
              A Associação Desportiva e Cultural HELL160 nasceu de um sonho: não deixar morrer uma região que tanto deu ao país e que hoje luta
              contra a desertificação, a perda de oportunidades e o esquecimento.
            </p>
            <p>
              Nascemos da memória dos nossos pais e avós. Daqueles homens e mulheres que trabalharam esta terra de sol a sol, enfrentaram a dureza
              dos campos e, muitas vezes com tão pouco como pão, água e azeite à mesa, conseguiram alimentar as suas famílias e contribuir para
              alimentar um país inteiro.
            </p>
            <p>
              Esta foi uma terra de trabalho, de sacrifício e de riqueza. Uma terra que ajudou a construir o que somos hoje. Não podemos aceitar
              que o seu legado se perca, nem que as gerações futuras sejam privadas da possibilidade de aqui construir o seu próprio futuro.
            </p>
            <p>
              Honrar o passado não pode significar apenas recordar aquilo que fomos. Tem de significar trabalhar para recuperar aquilo que ainda
              podemos ser.
            </p>
          </div>
        </div>
      </section>

      <section className="sec band-panel">
        <div className="wrap split">
          <h2 className="display about-h2">Porque HELL160?</h2>
          <div className="stack about-prose">
            <p className="lede">
              O nome HELL160 encerra uma metáfora sobre a realidade de uma região tantas vezes desconhecida, ignorada ou associada apenas ao calor
              e às dificuldades. Um território que muitos não sabem localizar e que outros nunca tiveram oportunidade de conhecer verdadeiramente.
            </p>
            <p>
              Assumimos essa metáfora como um desafio: transformar o desconhecimento em descoberta, o abandono em oportunidade e a invisibilidade em
              reconhecimento.
            </p>
            <p>
              Queremos mostrar que, por detrás das dificuldades, existe uma terra com identidade, património, cultura, tradições e, acima de tudo,
              pessoas que merecem oportunidades.
            </p>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap split">
          <h2 className="display about-h2">Mais do que uma associação, uma missão</h2>
          <div className="stack about-prose">
            <p className="lede">
              O evento desportivo HELL160 foi o primeiro grande passo para transformar este sonho em realidade. A primeira edição reuniu 320 atletas em{' '}
              <span className="nw">A-do-Pinto</span> e demonstrou que é possível mobilizar pessoas, dinamizar a comunidade e dar visibilidade ao
              território.
            </p>
            <p>Mas o nosso propósito vai muito além do desporto. Queremos construir um projeto integrado de desenvolvimento regional, com:</p>
            <ol className="numlist about-pillars">
              {PILLARS.map(([t, d]) => (
                <li key={t}>
                  <p>
                    <strong>{t}</strong> {d}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="sec band-panel" aria-labelledby="proj-t">
        <div className="wrap split">
          <div className="stack">
            <h2 className="display about-h2" id="proj-t">
              Os projetos
            </h2>
            <p className="muted about-note">Cada projeto nasce de uma visão comum: criar valor para o território e melhorar a vida das pessoas.</p>
          </div>
          <div className="stack">
            <ul className="about-projects">
              {PROJECTS.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <div className="about-vision">
              <h3 className="cond">A do Pinto 2035</h3>
              <p>
                É neste caminho que se enquadra a visão A do Pinto 2035, que procura articular comunidade, desenvolvimento económico,
                conhecimento e inovação para construir novas possibilidades para a região.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec night">
        <div className="wrap split">
          <h2 className="display about-h2">O cérebro e o coração de uma região</h2>
          <div className="stack about-prose">
            <p className="lede">
              É esse o papel que queremos assumir: ser o cérebro que pensa, planeia e constrói soluções, e o coração que mantém viva a ligação às pessoas, às raízes e à identidade do
              território.
            </p>
            <p>
              Queremos mobilizar a comunidade, aproximar instituições, empresas e parceiros, transformar ideias em projetos e criar oportunidades
              para que as pessoas tenham razões para ficar, para regressar e para investir nesta terra.
            </p>
            <p>
              Sabemos que não podemos mudar tudo sozinhos. Mas acreditamos que podemos contribuir para mudar o rumo, criando movimento onde existe
              estagnação e esperança onde tantas vezes se instalou a resignação.
            </p>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap split">
          <h2 className="display about-h2">O primeiro ano</h2>
          <div className="stack about-prose">
            <p className="lede">
              Com cerca de 50 associados e ainda no nosso primeiro ano de existência, estamos apenas a começar. Temos muito para construir, mas
              sabemos por que razão existimos.
            </p>
            <p>
              Não queremos regressar ao passado. Queremos recuperar a força, a dignidade e a vitalidade que fizeram esta região crescer, adaptando
              essa herança aos desafios do presente e às oportunidades do futuro.
            </p>
            <p>
              Porque a maior homenagem que podemos fazer aos nossos pais e avós é garantir que a terra que tanto trabalharam continua a ter vida,
              oportunidades e futuro.
            </p>
          </div>
        </div>
      </section>

      <section className="sec tight rule about-close" aria-labelledby="about-close-t">
        <div className="wrap">
          <p className="about-sign" id="about-close-t">
            Somos a HELL160. Nascemos da memória, <span className="nw">movemo-nos</span> pela comunidade e trabalhamos para transformar o futuro de uma região.
          </p>
          <div className="pill-row mt">
            <a className="btn ember" href={`mailto:${EVENT.email}?subject=${encodeURIComponent('Associação HELL160')}`}>
              Falar com a associação
            </a>
            <Link className="btn ghost" to="/causa">
              A causa
            </Link>
            <Link className="btn ghost" to="/apoiar">
              Apoiar
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
