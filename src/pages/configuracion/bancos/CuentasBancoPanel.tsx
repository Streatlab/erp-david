import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtDate } from '@/lib/format'
import { TablaWrap, thNeo, tdNeo, tdEstado, BadgeNeo, BotonNeo, KpiNeo } from '@/components/neo/NeoUI'
import { INK, ARENA, BLANCO, GRIS, OLIVA, TERRA, NARANJA, AMBAR, CELESTE, MARINO, OSW, LEX, BORDER_CARD } from '@/styles/neobrutal'
import { diasHasta, sesionPorBanco } from '@/lib/bancos'
import type { Sesion } from '@/lib/bancos'

interface Cuenta {
  id: string
  alias: string
  banco: string
  iban: string | null
  iban_mask: string | null
  titular: string | null
  cuenta_uid: string | null
  descargar: boolean
  personal: boolean
  cobro_via_juan: boolean
  activa: boolean
}

const URL_CONECTAR = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/banco-auth?llave=david-banco-2026&accion=menu`

function enmascarar(c: Cuenta): string {
  const iban = (c.iban ?? '').replace(/\s+/g, '')
  if (iban.length >= 8) return `${iban.slice(0, 4)} •••• •••• ${iban.slice(-4)}`
  return c.iban_mask || '—'
}

function Interruptor({ on, onClick, si, no, colorSi = OLIVA, colorNo = GRIS, disabled }: {
  on: boolean; onClick: () => void; si: string; no: string; colorSi?: string; colorNo?: string; disabled?: boolean
}) {
  return <BotonNeo onClick={onClick} disabled={disabled} bg={on ? colorSi : colorNo}>{on ? si : no}</BotonNeo>
}

export default function CuentasBancoPanel() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState<string | null>(null)

  async function cargar() {
    const [c, s] = await Promise.all([
      supabase.from('cuentas_bancarias')
        .select('id, alias, banco, iban, iban_mask, titular, cuenta_uid, descargar, personal, cobro_via_juan, activa')
        .order('banco').order('alias'),
      supabase.from('banco_sesiones').select('id, banco, estado, valida_hasta, created_at').order('id', { ascending: false }),
    ])
    if (c.error) throw c.error
    if (s.error) throw s.error
    setCuentas((c.data ?? []) as Cuenta[])
    setSesiones((s.data ?? []) as Sesion[])
  }

  useEffect(() => {
    cargar().catch(e => setError(e?.message ?? 'Error')).finally(() => setCargando(false))
  }, [])

  async function cambiar(c: Cuenta, campo: 'descargar' | 'personal' | 'cobro_via_juan') {
    setGuardando(c.id + campo)
    const valor = !c[campo]
    const { error: e } = await supabase.from('cuentas_bancarias').update({ [campo]: valor }).eq('id', c.id)
    if (e) setError(e.message)
    else setCuentas(cs => cs.map(x => x.id === c.id ? { ...x, [campo]: valor } : x))
    setGuardando(null)
  }

  async function renombrar(c: Cuenta) {
    const nuevo = window.prompt('Nombre de la cuenta', c.alias)?.trim()
    if (!nuevo || nuevo === c.alias) return
    const { error: e } = await supabase.from('cuentas_bancarias').update({ alias: nuevo }).eq('id', c.id)
    if (e) setError(e.message)
    else setCuentas(cs => cs.map(x => x.id === c.id ? { ...x, alias: nuevo } : x))
  }

  if (cargando) return <div style={{ padding: 24, fontFamily: LEX }}>Cargando…</div>

  const porBanco = sesionPorBanco(sesiones)
  const bancos = [...new Set([...cuentas.map(c => c.banco), ...porBanco.keys()])].sort()
  const porCaducar = bancos.filter(b => {
    const s = porBanco.get(b)
    const d = s?.estado === 'autorizada' ? diasHasta(s.valida_hasta) : null
    return d !== null && d < 10
  })
  const descargando = cuentas.filter(c => c.descargar).length
  const personales = cuentas.filter(c => c.personal).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: LEX, color: INK }}>
      {error && (
        <div style={{ background: TERRA, color: ARENA, border: BORDER_CARD, padding: '10px 14px', fontFamily: OSW, fontWeight: 700 }}>{error}</div>
      )}
      {porCaducar.length > 0 && (
        <div style={{ background: TERRA, color: ARENA, border: BORDER_CARD, padding: '12px 16px', fontFamily: OSW, fontWeight: 700, fontSize: 15, textTransform: 'uppercase' }}>
          Atención: la conexión de {porCaducar.join(' y ')} caduca en menos de 10 días. Pulsa «Conectar banco» y renuévala.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <KpiNeo label="Cuentas" valor={String(cuentas.length)} sub={`${descargando} se descargan cada noche`} />
        <KpiNeo label="Personales" valor={String(personales)} sub="sus movimientos van a ámbito personal" color={CELESTE} />
        <KpiNeo label="Bancos conectados" valor={String(bancos.filter(b => porBanco.get(b)?.estado === 'autorizada').length)} sub={`de ${bancos.length}`} color={OLIVA} />
      </div>

      {/* Estado de la conexión por banco */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        {bancos.map(b => {
          const s = porBanco.get(b)
          const d = s?.estado === 'autorizada' ? diasHasta(s.valida_hasta) : null
          const color = !s || s.estado !== 'autorizada' ? GRIS : d !== null && d < 10 ? TERRA : d !== null && d < 30 ? AMBAR : OLIVA
          const texto = !s ? 'sin conexión'
            : s.estado !== 'autorizada' ? (s.estado === 'caducada' ? 'caducada' : 'pendiente de autorizar')
            : `hasta ${s.valida_hasta ? fmtDate(s.valida_hasta) : '—'} (${d} días)`
          return (
            <div key={b} style={{ border: BORDER_CARD, background: BLANCO, padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase' }}>{b}</span>
              <BadgeNeo color={color}>{texto}</BadgeNeo>
            </div>
          )
        })}
        <BotonNeo onClick={() => window.open(URL_CONECTAR, '_blank', 'noopener')} bg={NARANJA}>Conectar banco</BotonNeo>
      </div>

      {cuentas.length === 0 ? (
        <div style={{ border: BORDER_CARD, background: BLANCO, padding: 18, fontFamily: OSW, textTransform: 'uppercase' }}>
          Sin cuentas · conecta un banco y aparecerán aquí tras la descarga nocturna
        </div>
      ) : (
        <TablaWrap>
          <thead>
            <tr>
              <th style={thNeo}>Cuenta</th>
              <th style={thNeo}>Banco</th>
              <th style={thNeo}>IBAN</th>
              <th style={thNeo}>Titular</th>
              <th style={thNeo}>Descargar</th>
              <th style={thNeo}>Ámbito</th>
              <th style={thNeo}>Cobro del negocio vía Juan</th>
              <th style={thNeo}>Sesión</th>
            </tr>
          </thead>
          <tbody>
            {cuentas.map((c, i) => {
              const alt = i % 2 === 1
              const s = porBanco.get(c.banco)
              const d = s?.estado === 'autorizada' ? diasHasta(s.valida_hasta) : null
              return (
                <tr key={c.id}>
                  <td style={tdEstado(alt, c.descargar ? (c.personal ? CELESTE : MARINO) : GRIS)}>
                    <button onClick={() => renombrar(c)} title="Cambiar nombre"
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: LEX, fontWeight: 700, fontSize: 13, color: INK, textAlign: 'left' }}>
                      {c.alias}
                    </button>
                  </td>
                  <td style={tdNeo(alt)}>{c.banco}</td>
                  <td style={{ ...tdNeo(alt), fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap' }}>{enmascarar(c)}</td>
                  <td style={tdNeo(alt)}>{c.titular ?? '—'}</td>
                  <td style={tdNeo(alt)}>
                    <Interruptor on={c.descargar} si="Sí" no="No" disabled={guardando === c.id + 'descargar'} onClick={() => cambiar(c, 'descargar')} />
                  </td>
                  <td style={tdNeo(alt)}>
                    <Interruptor on={c.personal} si="Personal" no="Actividad" colorSi={CELESTE} colorNo={MARINO}
                      disabled={guardando === c.id + 'personal'} onClick={() => cambiar(c, 'personal')} />
                  </td>
                  <td style={tdNeo(alt)}>
                    <Interruptor on={c.cobro_via_juan} si="Sí" no="No" colorSi={AMBAR}
                      disabled={guardando === c.id + 'cobro_via_juan'} onClick={() => cambiar(c, 'cobro_via_juan')} />
                  </td>
                  <td style={tdNeo(alt)}>
                    {d === null ? <BadgeNeo color={GRIS}>sin sesión</BadgeNeo>
                      : <BadgeNeo color={d < 10 ? TERRA : d < 30 ? AMBAR : OLIVA}>{d} días</BadgeNeo>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TablaWrap>
      )}
      <div style={{ fontSize: 12, color: GRIS, fontWeight: 600 }}>
        «Personal» manda los movimientos nuevos sin regla a «Pendiente revisar (personal)». «Descargar = No» detiene la descarga nocturna de esa cuenta.
      </div>
    </div>
  )
}
