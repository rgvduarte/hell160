import { Link } from 'react-router-dom'
import { pointAtKm } from '../data/route'
import { RouteMap } from '../components/RouteMap'
import { EVENT } from '../data/event'

// Proposta de rede: as aldeias do percurso e as bases de vida. Os dois DAE já instalados ainda não têm local registado.
const AED = [
  { place: 'DAE 1 · local a confirmar', km: null, status: 'instalado' },
  { place: 'DAE 2 · local a confirmar', km: null, status: 'instalado' },
  { place: 'A-do-Pinto · partida e meta', km: 0, status: 'proposto' },
  { place: 'Vale de Vargo', km: 11.8, status: 'proposto' },
  { place: 'Vila Verde de Ficalho', km: 36.2, status: 'proposto' },
  { place: 'Pias', km: 60.4, status: 'proposto' },
  { place: 'Vila Nova de São Bento', km: 72.0, status: 'proposto' },
  { place: 'Pulo do Lobo · acesso', km: 95.1, status: 'proposto' },
  { place: 'Brinches', km: 118.8, status: 'proposto' },
  { place: 'Santa Iria', km: 130.2, status: 'proposto' },
] as const

const UNIT_EUR = 1800 // DAE + armário exterior + formação — estimativa

export function Safety() {
  const missing = AED.filter((a) => a.status === 'proposto').length
  return (
    <>
      <section className="sec tight">
        <div className="wrap split" style={{ alignItems: 'end' }}>
          <div>
            <p className="eyebrow">Segurança</p>
            <h1 className="display" style={{ fontSize: 'clamp(48px, 8vw, 120px)' }}>Ninguém fica sem sinal</h1>
          </div>
          <p className="lede">
            Em 2026 falharam tracks e dispositivos, houve buscas de noite e uma atleta quase a desmaiar longe de tudo. Em 2027 a segurança
            começa na inscrição.
          </p>
        </div>
      </section>

      <section className="sec tight rule">
        <div className="wrap split">
          <div>
            <p className="eyebrow">Tracking</p>
            <h2 className="cond" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>Duas fontes, uma posição</h2>
          </div>
          <ol className="numlist">
            <li><div><strong>App HELL160 obrigatória</strong><p className="muted">iOS e Android. Carrega o GPX oficial, guarda posição offline e envia ao minuto quando há rede.</p></div></li>
            <li><div><strong>Relógio emparelhado (recomendado)</strong><p className="muted">Segunda fonte de posição. A plataforma cruza as duas e usa a que for mais fiável naquele momento.</p></div></li>
            <li><div><strong>Localizador satélite para alugar</strong><p className="muted">Para zonas sem rede, como a descida ao Pulo do Lobo. 15 € na inscrição.</p></div></li>
            <li><div><strong>Alertas automáticos</strong><p className="muted">Paragem acima de 20 min fora de abastecimento, desvio de traçado, perda das duas fontes — a central é avisada antes de alguém dar pela falta.</p></div></li>
            <li><div><strong>Botão SOS</strong><p className="muted">Envia posição à equipa de resgate mais próxima e liga ao posto médico.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="sec tight rule">
        <div className="wrap split">
          <div>
            <p className="eyebrow">Fazer ou comprar</p>
            <h2 className="cond" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>Decisão em aberto</h2>
            <p className="muted mt-s">Por decidir até janeiro de 2027, antes de abrir a app a testes no percurso.</p>
          </div>
          <table className="board">
            <thead><tr><th /><th>App própria</th><th>Fornecedor (ex.: DotWatcher)</th></tr></thead>
            <tbody>
              {[
                ['Custo inicial', 'Alto', 'Baixo'],
                ['Custo por atleta', 'Baixo', 'Médio a alto'],
                ['Prazo para julho 2027', 'Apertado', 'Seguro'],
                ['Integração com inscrição e alojamento', 'Total', 'Parcial (API)'],
                ['Replicável a outras provas', 'Sim — é o produto', 'Não'],
                ['Hardware satélite', 'Alugado à parte', 'Incluído'],
              ].map((r) => (
                <tr key={r[0]} style={{ cursor: 'default' }}>
                  <td className="muted">{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sec night">
        <div className="wrap">
          <div className="split">
            <div>
              <p className="eyebrow">Rede comunitária</p>
              <h2 className="display" style={{ fontSize: 'clamp(34px, 4.4vw, 68px)' }}>Desfibri&shy;lhadores nas aldeias</h2>
              <p className="lede mt">
                Já há dois. Cada um que entra fica na aldeia, para a aldeia — a prova é a razão para os pôr lá, não a única para os usar.
              </p>
              <div className="stats mt" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div><b>2</b><span>instalados</span></div>
                <div><b className="ember">{missing}</b><span>em falta</span></div>
                <div><b>{((missing * UNIT_EUR) / 1000).toFixed(1)}k</b><span>€ estimados</span></div>
              </div>
              <div className="row mt">
                <a className="btn ember" href={`mailto:${EVENT.email}?subject=Desfibrilhadores%20HELL160`}>Patrocinar um DAE</a>
                <a className="btn ghost" href={`mailto:${EVENT.email}?subject=Formação%20primeiros%20socorros`}>Quero formação</a>
              </div>
            </div>
            <div>
              <RouteMap labels={false}>
                {AED.map((a) => {
                  if (a.km == null) return null
                  const [x, y] = pointAtKm(a.km)
                  return (
                    <g key={a.place} transform={`translate(${x} ${y})`}>
                      <circle r={18} fill="var(--bg)" stroke="var(--ember)" strokeWidth={3} strokeDasharray="4 4" />
                      <path d="M-6,-2 L-1,-2 L-3,6 L6,-4 L1,-4 L3,-10 Z" fill="var(--ember)" />
                    </g>
                  )
                })}
              </RouteMap>
              <ul className="ticklist mt">
                {AED.map((a) => (
                  <li key={a.place} className="row between">
                    <span>{a.place}</span>
                    <span className={a.status === 'instalado' ? 'tag ember' : 'tag'}>{a.status}</span>
                  </li>
                ))}
              </ul>
              <p className="mono muted mt-s">Localizações propostas · custo unitário estimado {UNIT_EUR} € (DAE, armário, formação)</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec tight">
        <div className="wrap split">
          <div>
            <p className="eyebrow">Lições de 2026</p>
            <h2 className="cond" style={{ fontSize: 'clamp(32px, 4vw, 52px)' }}>O que muda</h2>
          </div>
          <ul className="ticklist">
            <li>GPX oficial único, validado no terreno e distribuído pela app — não por email.</li>
            <li>Teste de sinal obrigatório no levantamento do dorsal.</li>
            <li>Abastecimentos reforçados com água entre bases de vida, protocolo de calor a partir dos 38 °C.</li>
            <li>Postos médicos nas três bases de vida, com a posição de todos os atletas em tempo real.</li>
            <li>Resgate noturno com coordenadas exatas, não com a última passagem.</li>
          </ul>
        </div>
        <div className="wrap mt">
          <Link to="/live" className="btn">Ver o live em simulação</Link>
        </div>
      </section>
    </>
  )
}
