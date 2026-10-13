import { useEffect, useState } from 'react'
import { eur, luhn, markPaid, requestPayment } from '../lib/domain'
import type { PayMethod, Registration } from '../lib/store'

// Pagamento simulado: MB WAY, Multibanco e cartão. Nada é cobrado.
// Em produção: PSP português (Eupago, ifthenpay ou Stripe) + webhook que chama markPaid().

const METHODS: [PayMethod, string, string][] = [
  ['mbway', 'MB WAY', 'Aceitas o pedido na app do telemóvel'],
  ['multibanco', 'Multibanco', 'Referência para pagar no multibanco ou homebanking'],
  ['cartao', 'Cartão', 'Visa ou Mastercard'],
]

export function PaymentPanel({ reg, onPaid }: { reg: Registration; onPaid?: () => void }) {
  const [method, setMethod] = useState<PayMethod>(reg.payment?.method ?? 'mbway')
  const [phone, setPhone] = useState(reg.payment?.phone ?? reg.phone ?? '')
  const [card, setCard] = useState({ num: '', exp: '', cvc: '' })
  const [waiting, setWaiting] = useState(false)
  const [left, setLeft] = useState(240)

  const pending = reg.payment && reg.payment.method === method && !reg.payment.paidAt

  useEffect(() => {
    if (!waiting) return
    const id = window.setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => window.clearInterval(id)
  }, [waiting])

  if (reg.status === 'paga') {
    return (
      <div className="pay done">
        <p className="mono ember" style={{ margin: 0 }}>Pago</p>
        <p style={{ margin: '6px 0 0' }}>
          {eur(reg.priceEur)} · dorsal <strong className="mono">{reg.bib}</strong>
        </p>
      </div>
    )
  }

  const paid = () => {
    markPaid(reg.id)
    setWaiting(false)
    onPaid?.()
  }

  const phoneOk = /^9\d{8}$/.test(phone.replace(/\s/g, ''))
  const cardOk = luhn(card.num) && /^(0[1-9]|1[0-2])\/\d{2}$/.test(card.exp) && /^\d{3,4}$/.test(card.cvc)

  return (
    <div className="pay">
      <div className="choice" role="radiogroup" aria-label="Método de pagamento">
        {METHODS.map(([v, t, s]) => (
          <label key={v}>
            <input type="radio" name={`pay-${reg.id}`} checked={method === v} onChange={() => { setMethod(v); setWaiting(false) }} />
            <span>
              <strong>{t}</strong>
              <span className="muted" style={{ display: 'block', fontSize: 14 }}>{s}</span>
            </span>
            <span />
          </label>
        ))}
      </div>

      {method === 'mbway' && (
        <div className="stack mt" style={{ ['--s' as string]: '16px' }}>
          {!waiting ? (
            <>
              <div className="field">
                <label htmlFor={`mbw-${reg.id}`}>Telemóvel MB WAY</label>
                <input id={`mbw-${reg.id}`} inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="912 345 678" />
              </div>
              <button className="btn" disabled={!phoneOk} onClick={() => { requestPayment(reg, 'mbway', { phone }); setLeft(240); setWaiting(true) }}>
                Enviar pedido · {eur(reg.priceEur)}
              </button>
            </>
          ) : (
            <>
              <p className="notice" style={{ margin: 0 }}>
                Pedido de {eur(reg.priceEur)} enviado para {phone}. Aceita na app MB WAY nos próximos{' '}
                <span className="mono">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>.
              </p>
              <div className="row">
                <button className="btn" onClick={paid}>Simular aceitação</button>
                <button className="btn ghost noarrow" onClick={() => setWaiting(false)}>Cancelar</button>
              </div>
            </>
          )}
        </div>
      )}

      {method === 'multibanco' && (
        <div className="stack mt" style={{ ['--s' as string]: '16px' }}>
          {pending && reg.payment?.reference ? (
            <>
              <dl className="kv mbref">
                <dt>Entidade</dt><dd className="mono">{reg.payment.entity}</dd>
                <dt>Referência</dt><dd className="mono">{reg.payment.reference}</dd>
                <dt>Valor</dt><dd className="mono">{eur(reg.priceEur)}</dd>
              </dl>
              <p className="muted" style={{ fontSize: 14, margin: 0 }}>Válida 72 h. A inscrição confirma quando o pagamento entrar.</p>
              <button className="btn ghost" onClick={paid}>Simular pagamento recebido</button>
            </>
          ) : (
            <button className="btn" onClick={() => requestPayment(reg, 'multibanco')}>Gerar referência</button>
          )}
        </div>
      )}

      {method === 'cartao' && (
        <div className="stack mt" style={{ ['--s' as string]: '16px' }}>
          <div className="field">
            <label htmlFor={`cn-${reg.id}`}>Número do cartão</label>
            <input id={`cn-${reg.id}`} inputMode="numeric" autoComplete="cc-number" value={card.num}
              onChange={(e) => setCard({ ...card, num: e.target.value.replace(/[^\d ]/g, '').slice(0, 23) })} placeholder="4242 4242 4242 4242" />
          </div>
          <div className="grid2">
            <div className="field">
              <label htmlFor={`ce-${reg.id}`}>Validade</label>
              <input id={`ce-${reg.id}`} autoComplete="cc-exp" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value.slice(0, 5) })} placeholder="MM/AA" />
            </div>
            <div className="field">
              <label htmlFor={`cc-${reg.id}`}>CVC</label>
              <input id={`cc-${reg.id}`} inputMode="numeric" autoComplete="cc-csc" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
            </div>
          </div>
          <button className="btn" disabled={!cardOk} onClick={() => { requestPayment(reg, 'cartao', { last4: card.num.replace(/\D/g, '').slice(-4) }); paid() }}>
            Pagar {eur(reg.priceEur)}
          </button>
          <span className="hint muted" style={{ fontSize: 13 }}>Simulação: usa 4242 4242 4242 4242, qualquer data futura e CVC.</span>
        </div>
      )}

      <p className="mono muted" style={{ fontSize: 11, marginTop: 16 }}>Pagamento simulado · nenhum valor é cobrado</p>
    </div>
  )
}
