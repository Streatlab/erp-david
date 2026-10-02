import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fmtDate } from '@/lib/format'
import { INK, ARENA, BLANCO, GRIS, OLIVA, TERRA, NARANJA, CELESTE, AMBAR, OSW, LEX, BORDER_CARD } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, TablaWrap, thNeo, tdNeo, tdEstado, BotonNeo, BadgeNeo, AvisoNeo } from '@/components/neo/NeoUI'
import { campo, Etiqueta } from '@/components/flota/FormFlota'

/* Usuarios reales: lista blanca de correos que pueden entrar al ERP (Google, enlace o PIN por dispositivo). */

interface Usuario { id: number; nombre: string; perfil: string; email: string | null; activo: boolean; dispositivos: number; huellas: number }
interface Dispositivo { dispositivo: string; creado: string; bloqueado_hasta: string | null; huella: boolean }

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<{ id: number | null; nombre: string; email: string; perfil: string } | null>(null)
  const [abierto, setAbierto] = useState<number | null>(null)
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    supabase.rpc('usuarios_listado').then(({ data, error: e }) => {
      if (e) setError(e.message)
      else setUsuarios(((data ?? []) as any[]).map(u => ({ ...u, dispositivos: Number(u.dispositivos), huellas: Number(u.huellas) })))
    })
  }, [tick])

  useEffect(() => {
    if (abierto === null) return
    supabase.rpc('usuario_dispositivos', { p_usuario: abierto }).then(({ data, error: e }) => {
      if (e) setError(e.message); else setDispositivos((data ?? []) as Dispositivo[])
    })
  }, [abierto, tick])

  async function guardar(u: { id: number | null; nombre: string; email: string; perfil: string; activo?: boolean }) {
    setError(null)
    const { error: e } = await supabase.rpc('usuario_guardar', {
      p_id: u.id, p_nombre: u.nombre, p_email: u.email, p_perfil: u.perfil, p_activo: u.activo ?? true,
    })
    if (e) { setError(e.message); return false }
    setTick(t => t + 1)
    return true
  }

  async function resetear(usuario: number, dispositivo: string) {
    if (!window.confirm('¿Borrar el PIN y la huella de este dispositivo? Tendrá que volver a entrar con Google o enlace.')) return
    const { error: e } = await supabase.rpc('usuario_reset_dispositivo', { p_usuario: usuario, p_dispositivo: dispositivo })
    if (e) setError(e.message); else setTick(t => t + 1)
  }

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Configuración" titulo="Usuarios">
        <BotonNeo onClick={() => setForm({ id: null, nombre: '', email: '', perfil: 'admin' })}><UserPlus size={14} style={{ marginRight: 6 }} /> Dar de alta un correo</BotonNeo>
      </CabeceraNeo>
      {error && <AvisoNeo>{error}</AvisoNeo>}

      {form && (
        <Banda bg={BLANCO}>
          <div style={{ background: ARENA, border: BORDER_CARD, padding: 18, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <Etiqueta txt="Nombre"><input style={campo} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></Etiqueta>
            <Etiqueta txt="Correo (Google o el que use)"><input type="email" style={campo} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Etiqueta>
            <Etiqueta txt="Perfil">
              <select style={campo} value={form.perfil} onChange={e => setForm({ ...form, perfil: e.target.value })}>
                <option value="admin">Administrador</option>
                <option value="repartidor">Repartidor</option>
              </select>
            </Etiqueta>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
              <BotonNeo onClick={async () => { if (await guardar(form)) setForm(null) }}>Guardar</BotonNeo>
              <BotonNeo bg={BLANCO} onClick={() => setForm(null)}>Cancelar</BotonNeo>
            </div>
          </div>
        </Banda>
      )}

      <Banda bg={BLANCO}>
        {usuarios.length === 0 && !error ? (
          <div style={{ fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', color: GRIS }}>Cargando…</div>
        ) : (
          <TablaWrap>
            <thead><tr>{['Nombre', 'Correo', 'Perfil', 'Dispositivos', 'Estado', ''].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr></thead>
            <tbody>
              {usuarios.map((u, i) => (
                <tr key={u.id}>
                  <td style={{ ...tdEstado(i % 2 === 1, u.activo ? OLIVA : GRIS), fontFamily: OSW, fontWeight: 700 }}>{u.nombre}</td>
                  <td style={tdNeo(i % 2 === 1)}>{u.email ?? '—'}</td>
                  <td style={tdNeo(i % 2 === 1)}><BadgeNeo color={u.perfil === 'admin' ? NARANJA : CELESTE}>{u.perfil}</BadgeNeo></td>
                  <td style={tdNeo(i % 2 === 1)}>
                    <button onClick={() => setAbierto(abierto === u.id ? null : u.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: OSW, fontWeight: 700, textDecoration: 'underline', color: INK }}>
                      {u.dispositivos} con PIN · {u.huellas} con huella
                    </button>
                  </td>
                  <td style={tdNeo(i % 2 === 1)}><BadgeNeo color={u.activo ? OLIVA : GRIS}>{u.activo ? 'Puede entrar' : 'De baja'}</BadgeNeo></td>
                  <td style={{ ...tdNeo(i % 2 === 1), whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', gap: 8 }}>
                      <BotonNeo bg={BLANCO} onClick={() => setForm({ id: u.id, nombre: u.nombre, email: u.email ?? '', perfil: u.perfil })}>Editar</BotonNeo>
                      <BotonNeo bg={u.activo ? TERRA : OLIVA} onClick={() => guardar({ id: u.id, nombre: u.nombre, email: u.email ?? '', perfil: u.perfil, activo: !u.activo })}>
                        {u.activo ? 'Dar de baja' : 'Reactivar'}
                      </BotonNeo>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </TablaWrap>
        )}
      </Banda>

      {abierto !== null && (
        <Banda bg={ARENA}>
          <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 18, textTransform: 'uppercase', marginBottom: 12 }}>
            Dispositivos de {usuarios.find(u => u.id === abierto)?.nombre}
          </div>
          {dispositivos.length === 0 ? (
            <div style={{ fontFamily: LEX, fontWeight: 600, color: GRIS }}>Ningún dispositivo con PIN.</div>
          ) : (
            <TablaWrap>
              <thead><tr>{['Dispositivo', 'PIN creado', 'Huella', 'Estado', ''].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr></thead>
              <tbody>
                {dispositivos.map((d, i) => {
                  const bloqueado = d.bloqueado_hasta && new Date(d.bloqueado_hasta) > new Date()
                  return (
                    <tr key={d.dispositivo}>
                      <td style={{ ...tdNeo(i % 2 === 1), fontFamily: 'ui-monospace, monospace' }}>…{d.dispositivo.slice(-8)}</td>
                      <td style={tdNeo(i % 2 === 1)}>{fmtDate(d.creado)}</td>
                      <td style={tdNeo(i % 2 === 1)}>{d.huella ? 'Sí' : 'No'}</td>
                      <td style={tdNeo(i % 2 === 1)}><BadgeNeo color={bloqueado ? AMBAR : OLIVA}>{bloqueado ? 'Bloqueado 15 min' : 'Activo'}</BadgeNeo></td>
                      <td style={tdNeo(i % 2 === 1)}><BotonNeo bg={TERRA} onClick={() => resetear(abierto, d.dispositivo)}>Resetear PIN</BotonNeo></td>
                    </tr>
                  )
                })}
              </tbody>
            </TablaWrap>
          )}
        </Banda>
      )}
    </PageNeo>
  )
}
