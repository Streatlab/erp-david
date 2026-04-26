/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getFurgonetaPorCodigo, updateFurgoneta,
  getSeguro, upsertSeguro,
  getItv, upsertItv,
  getFotos, insertFoto, deleteFoto, setPortada,
  getConductor, updateConductor,
  getPartesKm, insertParteKm,
  getRevisionesVisuales, insertRevisionVisual,
  getMantenimientos, insertMantenimiento, deleteMantenimiento,
  getPrestamo, upsertPrestamo,
  getDocumentos, insertDocumento, deleteDocumento,
  getIncidencias, insertIncidencia, deleteIncidencia,
  driveFileUrl, driveThumb, extractDriveFileId, lunesDeFecha,
  type Furgoneta, type SeguroFurgo, type ItvFurgo, type FotoFurgo,
  type Conductor, type ParteKm, type RevisionVisual, type Mantenimiento,
  type Prestamo, type Documento, type Incidencia,
} from '../lib/flota/queries';
import Modal, { FormRow, Input, Select, TextArea, BtnPrimary, BtnGhost } from '../components/Modal';

type Tab = 'general' | 'seguro' | 'itv' | 'prestamo' | 'mantenim' | 'kms' | 'visual' | 'fotos' | 'multas' | 'docs' | 'conductor';

export default function FurgonetaDetalle() {
  const { codigo = '' } = useParams();
  const navigate = useNavigate();

  const [furgo, setFurgo] = useState<Furgoneta | null>(null);
  const [seguro, setSeguro] = useState<SeguroFurgo | null>(null);
  const [itv, setItv] = useState<ItvFurgo | null>(null);
  const [fotos, setFotos] = useState<FotoFurgo[]>([]);
  const [conductor, setConductor] = useState<Conductor | null>(null);
  const [partesKm, setPartesKm] = useState<ParteKm[]>([]);
  const [revisiones, setRevisiones] = useState<RevisionVisual[]>([]);
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [prestamo, setPrestamo] = useState<Prestamo | null>(null);
  const [docs, setDocs] = useState<Documento[]>([]);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [tab, setTab] = useState<Tab>('general');
  const [loading, setLoading] = useState(true);

  // Modales
  const [modal, setModal] = useState<null | 'general' | 'seguro' | 'itv' | 'prestamo' | 'foto' | 'kms' | 'visual' | 'mantenim' | 'multa' | 'doc' | 'conductor'>(null);

  const recargar = async (id: string, conductorId?: string | null) => {
    const [s, i, fo, pk, rv, mt, pr, dc, ic] = await Promise.all([
      getSeguro(id), getItv(id), getFotos(id),
      getPartesKm(id), getRevisionesVisuales(id), getMantenimientos(id),
      getPrestamo(id), getDocumentos(id), getIncidencias(id),
    ]);
    setSeguro(s); setItv(i); setFotos(fo);
    setPartesKm(pk); setRevisiones(rv); setMantenimientos(mt);
    setPrestamo(pr); setDocs(dc); setIncidencias(ic);
    if (conductorId) setConductor(await getConductor(conductorId));
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const f = await getFurgonetaPorCodigo(codigo);
      if (!f) { setLoading(false); return; }
      setFurgo(f);
      await recargar(f.id, f.conductor_id);
      setLoading(false);
    })();
  }, [codigo]);

  if (loading) return <div className="p-8 text-[var(--marino,#16355C)]">Cargando furgoneta…</div>;
  if (!furgo) return (
    <div className="p-8">
      <button onClick={() => navigate('/flota')} className="text-[var(--fuego,#F26B1F)] font-semibold">← Volver</button>
      <p className="mt-4 text-gray-500">Furgoneta {codigo} no encontrada.</p>
    </div>
  );

  const fmtEur = (n: number | null | undefined) =>
    n == null ? '—' : Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const portada = fotos.find((f) => f.es_portada) ?? fotos[0];

  // KPIs furgo
  const kmMes = partesKm
    .filter(p => {
      if (!p.semana_lunes) return false;
      const d = new Date(p.semana_lunes);
      const hoy = new Date();
      return d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear();
    })
    .reduce((acc, p) => acc + (p.km_recorridos ?? 0), 0);

  const ultimaRevision = revisiones[0];
  const diasSinDanos = ultimaRevision && !ultimaRevision.daños_detectados
    ? Math.floor((Date.now() - new Date(ultimaRevision.semana_lunes).getTime()) / 86400000)
    : null;

  const tabs: [Tab, string][] = [
    ['general', 'General'],
    ['seguro', 'Seguro'],
    ['itv', 'ITV'],
    ['prestamo', 'Préstamo'],
    ['mantenim', `Mantenimiento (${mantenimientos.length})`],
    ['kms', `Kms (${partesKm.length})`],
    ['visual', `Control visual (${revisiones.length})`],
    ['fotos', `Fotos (${fotos.length})`],
    ['multas', `Multas / Siniestros (${incidencias.length})`],
    ['docs', `Documentación (${docs.length})`],
    ['conductor', 'Conductor'],
  ];

  const reload = () => recargar(furgo.id, furgo.conductor_id);

  return (
    <div className="p-6 space-y-5">
      <button onClick={() => navigate('/flota')} className="text-sm text-[var(--fuego,#F26B1F)] font-semibold">
        ← Volver a flota
      </button>

      {/* Header */}
      <div className="flex items-start gap-4">
        {portada ? (
          <img
            src={portada.url_publica ?? driveThumb(portada.drive_file_id)}
            alt={furgo.matricula}
            className="w-44 h-32 object-cover rounded-xl border border-[var(--arena,#EFE6D8)]"
          />
        ) : (
          <button
            onClick={() => setModal('foto')}
            className="w-44 h-32 rounded-xl border border-dashed border-[var(--arena,#EFE6D8)] flex items-center justify-center text-gray-400 text-xs text-center px-2 hover:border-[var(--fuego,#F26B1F)] hover:text-[var(--fuego,#F26B1F)]"
          >
            + Añadir foto portada
          </button>
        )}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--marino,#16355C)]">
                {furgo.matricula} · {furgo.conductor}
              </h1>
              <p className="text-gray-500">
                {furgo.modelo} · {furgo.ruta ?? '—'} · <span className={`text-xs px-2 py-0.5 rounded-full ${furgo.estado === 'OPERATIVA' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{furgo.estado}</span>
              </p>
            </div>
            <BtnGhost onClick={() => setModal('general')}>✎ Editar general</BtnGhost>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <KpiMini label="Km mes" value={kmMes ? `${kmMes.toLocaleString('es-ES')} km` : '—'} />
            <KpiMini label="Km totales" value={furgo.km_actual?.toLocaleString('es-ES') ?? '—'} />
            <KpiMini label="Próx. ITV" value={itv?.proxima_fecha ?? furgo.itv_fecha ?? '—'} />
            <KpiMini label="Días sin daños" value={diasSinDanos != null ? `${diasSinDanos}` : '—'} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap border-b border-[var(--arena,#EFE6D8)]">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === k
                ? 'border-[var(--fuego,#F26B1F)] text-[var(--fuego,#F26B1F)]'
                : 'border-transparent text-gray-500 hover:text-[var(--marino,#16355C)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tabs content */}
      {tab === 'general' && <TabGeneral f={furgo} onEdit={() => setModal('general')} />}
      {tab === 'seguro' && <TabSeguro seguro={seguro} fmtEur={fmtEur} onEdit={() => setModal('seguro')} />}
      {tab === 'itv' && <TabItv itv={itv} onEdit={() => setModal('itv')} />}
      {tab === 'prestamo' && <TabPrestamo prestamo={prestamo} fmtEur={fmtEur} onEdit={() => setModal('prestamo')} />}
      {tab === 'mantenim' && <TabMantenimiento mantenimientos={mantenimientos} fmtEur={fmtEur} onAdd={() => setModal('mantenim')} onDelete={async (id) => { await deleteMantenimiento(id); reload(); }} />}
      {tab === 'kms' && <TabKms partes={partesKm} onAdd={() => setModal('kms')} />}
      {tab === 'visual' && <TabVisual revisiones={revisiones} onAdd={() => setModal('visual')} />}
      {tab === 'fotos' && <TabFotos fotos={fotos} furgoId={furgo.id} onAdd={() => setModal('foto')} onDelete={async (id) => { await deleteFoto(id); reload(); }} onSetPortada={async (id) => { await setPortada(id, furgo.id); reload(); }} />}
      {tab === 'multas' && <TabIncidencias incidencias={incidencias} fmtEur={fmtEur} onAdd={() => setModal('multa')} onDelete={async (id) => { await deleteIncidencia(id); reload(); }} />}
      {tab === 'docs' && <TabDocs docs={docs} onAdd={() => setModal('doc')} onDelete={async (id) => { await deleteDocumento(id); reload(); }} />}
      {tab === 'conductor' && <TabConductor conductor={conductor} onEdit={() => setModal('conductor')} />}

      {/* Modales */}
      {modal === 'general' && <ModalGeneral furgo={furgo} onClose={() => setModal(null)} onSave={async (patch) => { await updateFurgoneta(furgo.id, patch); const f = await getFurgonetaPorCodigo(codigo); if (f) setFurgo(f); setModal(null); }} />}
      {modal === 'seguro' && <ModalSeguro seguro={seguro} onClose={() => setModal(null)} onSave={async (patch) => { await upsertSeguro(furgo.id, patch); reload(); setModal(null); }} />}
      {modal === 'itv' && <ModalItv itv={itv} onClose={() => setModal(null)} onSave={async (patch) => { await upsertItv(furgo.id, patch); reload(); setModal(null); }} />}
      {modal === 'prestamo' && <ModalPrestamo prestamo={prestamo} onClose={() => setModal(null)} onSave={async (patch) => { await upsertPrestamo(furgo.id, patch); reload(); setModal(null); }} />}
      {modal === 'foto' && <ModalFoto onClose={() => setModal(null)} onSave={async (patch) => { await insertFoto(furgo.id, patch); reload(); setModal(null); }} />}
      {modal === 'kms' && <ModalKms onClose={() => setModal(null)} onSave={async (patch) => { await insertParteKm(furgo.id, patch); reload(); setModal(null); }} />}
      {modal === 'visual' && <ModalVisual onClose={() => setModal(null)} onSave={async (patch) => { await insertRevisionVisual(furgo.id, patch); reload(); setModal(null); }} />}
      {modal === 'mantenim' && <ModalMantenim onClose={() => setModal(null)} onSave={async (patch) => { await insertMantenimiento(furgo.id, patch); reload(); setModal(null); }} />}
      {modal === 'multa' && <ModalIncidencia onClose={() => setModal(null)} onSave={async (patch) => { await insertIncidencia(furgo.id, patch); reload(); setModal(null); }} />}
      {modal === 'doc' && <ModalDoc onClose={() => setModal(null)} onSave={async (patch) => { await insertDocumento(furgo.id, patch); reload(); setModal(null); }} />}
      {modal === 'conductor' && <ModalConductor conductor={conductor} onClose={() => setModal(null)} onSave={async (patch) => { if (conductor) { await updateConductor(conductor.id, patch); reload(); setModal(null); } }} />}
    </div>
  );
}

// ─── Mini components ────────────────────────────────────────
function KpiMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-3 rounded-xl border border-[var(--arena,#EFE6D8)]">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-lg font-bold text-[var(--marino,#16355C)]">{value}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase text-gray-400 tracking-wide">{label}</div>
      <div className="text-sm text-[var(--marino,#16355C)]">{value ?? '—'}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white p-4 rounded-xl border border-[var(--arena,#EFE6D8)]">{children}</div>;
}

function HeaderTab({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-semibold text-[var(--marino,#16355C)]">{title}</h2>
      {action}
    </div>
  );
}

// ─── Tabs ───────────────────────────────────────────────────
function TabGeneral({ f, onEdit }: { f: Furgoneta; onEdit: () => void }) {
  return (
    <div className="space-y-3">
      <HeaderTab title="Datos generales" action={<BtnGhost onClick={onEdit}>✎ Editar</BtnGhost>} />
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Código" value={f.codigo} />
          <Field label="Matrícula" value={f.matricula} />
          <Field label="Modelo" value={f.modelo} />
          <Field label="Conductor" value={f.conductor} />
          <Field label="Ruta" value={f.ruta} />
          <Field label="Estado" value={f.estado} />
          <Field label="Km actuales" value={f.km_actual?.toLocaleString('es-ES')} />
          <Field label="Próx. revisión km" value={f.km_proxima_revision?.toLocaleString('es-ES')} />
          <Field label="Próx. ITV" value={f.itv_fecha} />
          <Field label="Vence seguro" value={f.seguro_fecha_vencimiento} />
          <Field label="Préstamo / mes" value={f.prestamo_mensual ? `${f.prestamo_mensual} €` : '—'} />
          <Field label="Seguro / año" value={f.seguro_anual ? `${f.seguro_anual} €` : '—'} />
        </div>
      </Card>
    </div>
  );
}

function TabSeguro({ seguro, fmtEur, onEdit }: { seguro: SeguroFurgo | null; fmtEur: (n: number | null | undefined) => string; onEdit: () => void }) {
  const pdfs = seguro ? [['Póliza', seguro.drive_poliza_id], ['Condicionado', seguro.drive_condicionado_id], ['Último recibo', seguro.drive_recibo_id]] as const : [];
  return (
    <div className="space-y-3">
      <HeaderTab title="Seguro" action={<BtnGhost onClick={onEdit}>{seguro ? '✎ Editar' : '+ Añadir'}</BtnGhost>} />
      {!seguro ? <p className="text-gray-500">Sin seguro registrado.</p> : (
        <>
          <Card>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Compañía" value={seguro.compania} />
              <Field label="Nº póliza" value={seguro.numero_poliza} />
              <Field label="Teléfono" value={seguro.telefono} />
              <Field label="Email" value={seguro.email} />
              <Field label="Mediador" value={seguro.mediador_nombre} />
              <Field label="Tel. mediador" value={seguro.mediador_tel} />
              <Field label="Coberturas" value={seguro.coberturas} />
              <Field label="Franquicia" value={fmtEur(seguro.franquicia_eur)} />
              <Field label="Prima anual" value={fmtEur(seguro.prima_anual_eur)} />
              <Field label="Forma de pago" value={seguro.forma_pago} />
              <Field label="Próximo cobro" value={seguro.fecha_proximo_cobro} />
              <Field label="Renovación" value={seguro.fecha_renovacion} />
            </div>
          </Card>
          <div>
            <div className="text-sm font-semibold text-[var(--marino,#16355C)] mb-2">Documentos</div>
            <div className="flex gap-2 flex-wrap">
              {pdfs.map(([label, id]) => {
                const url = driveFileUrl(id);
                return url ? (
                  <a key={label} href={url} target="_blank" rel="noreferrer" className="px-3 py-2 text-sm rounded-lg bg-[var(--fuego,#F26B1F)] text-white font-semibold">📄 {label}</a>
                ) : (
                  <span key={label} className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-400">{label} (sin subir)</span>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TabItv({ itv, onEdit }: { itv: ItvFurgo | null; onEdit: () => void }) {
  return (
    <div className="space-y-3">
      <HeaderTab title="ITV" action={<BtnGhost onClick={onEdit}>{itv ? '✎ Editar' : '+ Añadir'}</BtnGhost>} />
      {!itv ? <p className="text-gray-500">Sin ITV registrada.</p> : (
        <>
          <Card>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Estación" value={itv.estacion} />
              <Field label="Tel. estación" value={itv.estacion_tel} />
              <Field label="Última fecha" value={itv.ultima_fecha} />
              <Field label="Km en última" value={itv.ultima_km?.toLocaleString('es-ES')} />
              <Field label="Resultado" value={itv.ultima_resultado} />
              <Field label="Próxima fecha" value={itv.proxima_fecha} />
            </div>
          </Card>
          {driveFileUrl(itv.drive_informe_id) && (
            <a href={driveFileUrl(itv.drive_informe_id)!} target="_blank" rel="noreferrer" className="inline-block px-3 py-2 text-sm rounded-lg bg-[var(--fuego,#F26B1F)] text-white font-semibold">📄 Último informe ITV</a>
          )}
        </>
      )}
    </div>
  );
}

function TabPrestamo({ prestamo, fmtEur, onEdit }: { prestamo: Prestamo | null; fmtEur: (n: number | null | undefined) => string; onEdit: () => void }) {
  const pct = prestamo?.cuotas_totales && prestamo.cuotas_pagadas != null
    ? Math.round((prestamo.cuotas_pagadas / prestamo.cuotas_totales) * 100) : 0;
  return (
    <div className="space-y-3">
      <HeaderTab title="Préstamo" action={<BtnGhost onClick={onEdit}>{prestamo ? '✎ Editar' : '+ Añadir'}</BtnGhost>} />
      {!prestamo ? <p className="text-gray-500">Sin préstamo registrado.</p> : (
        <>
          <Card>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Entidad" value={prestamo.entidad} />
              <Field label="Nº préstamo" value={prestamo.numero_prestamo} />
              <Field label="Importe total" value={fmtEur(prestamo.importe_total)} />
              <Field label="Cuota mensual" value={fmtEur(prestamo.cuota_mensual)} />
              <Field label="TAE" value={prestamo.tae != null ? `${prestamo.tae}%` : '—'} />
              <Field label="Inicio" value={prestamo.fecha_inicio} />
              <Field label="Fin" value={prestamo.fecha_fin} />
              <Field label="Cuotas pagadas" value={`${prestamo.cuotas_pagadas ?? 0} / ${prestamo.cuotas_totales ?? 0}`} />
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Progreso</span><span>{pct}%</span></div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-[var(--fuego,#F26B1F)] h-2 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </Card>
          {driveFileUrl(prestamo.drive_contrato_id) && (
            <a href={driveFileUrl(prestamo.drive_contrato_id)!} target="_blank" rel="noreferrer" className="inline-block px-3 py-2 text-sm rounded-lg bg-[var(--fuego,#F26B1F)] text-white font-semibold">📄 Contrato préstamo</a>
          )}
        </>
      )}
    </div>
  );
}

function TabMantenimiento({ mantenimientos, fmtEur, onAdd, onDelete }: { mantenimientos: Mantenimiento[]; fmtEur: (n: number | null | undefined) => string; onAdd: () => void; onDelete: (id: string) => void }) {
  return (
    <div className="space-y-3">
      <HeaderTab title="Mantenimiento" action={<BtnPrimary onClick={onAdd}>+ Añadir</BtnPrimary>} />
      {mantenimientos.length === 0 ? <p className="text-gray-500">Sin mantenimientos registrados.</p> : (
        <Card>
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase text-gray-400 tracking-wide">
              <tr><th className="text-left py-2">Fecha</th><th className="text-left">Tipo</th><th className="text-left">Taller</th><th className="text-right">Km</th><th className="text-right">Coste</th><th></th></tr>
            </thead>
            <tbody>
              {mantenimientos.map((m) => (
                <tr key={m.id} className="border-t border-[var(--arena,#EFE6D8)]">
                  <td className="py-2">{m.fecha}</td>
                  <td>{m.tipo ?? '—'}</td>
                  <td>{m.taller ?? '—'}</td>
                  <td className="text-right">{m.km?.toLocaleString('es-ES') ?? '—'}</td>
                  <td className="text-right">{fmtEur(m.coste_eur)}</td>
                  <td className="text-right">
                    {driveFileUrl(m.drive_factura_id) && <a href={driveFileUrl(m.drive_factura_id)!} target="_blank" rel="noreferrer" className="text-[var(--fuego,#F26B1F)] mr-2">📄</a>}
                    <button onClick={() => onDelete(m.id)} className="text-rose-500 hover:text-rose-700">🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function TabKms({ partes, onAdd }: { partes: ParteKm[]; onAdd: () => void }) {
  return (
    <div className="space-y-3">
      <HeaderTab title="Partes semanales de km" action={<BtnPrimary onClick={onAdd}>+ Nuevo parte</BtnPrimary>} />
      {partes.length === 0 ? <p className="text-gray-500">Sin partes de km. El conductor introducirá uno cada lunes.</p> : (
        <Card>
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase text-gray-400 tracking-wide">
              <tr><th className="text-left py-2">Semana</th><th className="text-right">Km inicio</th><th className="text-right">Km fin</th><th className="text-right">Km recorridos</th><th className="text-left">Notas</th></tr>
            </thead>
            <tbody>
              {partes.map((p) => (
                <tr key={p.id} className="border-t border-[var(--arena,#EFE6D8)]">
                  <td className="py-2">{p.semana_lunes}</td>
                  <td className="text-right">{p.km_inicio?.toLocaleString('es-ES') ?? '—'}</td>
                  <td className="text-right">{p.km_fin?.toLocaleString('es-ES') ?? '—'}</td>
                  <td className="text-right font-semibold">{p.km_recorridos?.toLocaleString('es-ES') ?? '—'}</td>
                  <td className="text-gray-500">{p.notas ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function TabVisual({ revisiones, onAdd }: { revisiones: RevisionVisual[]; onAdd: () => void }) {
  return (
    <div className="space-y-3">
      <HeaderTab title="Control visual semanal (5 fotos)" action={<BtnPrimary onClick={onAdd}>+ Nueva revisión</BtnPrimary>} />
      {revisiones.length === 0 ? <p className="text-gray-500">Sin revisiones visuales. El conductor sube 5 fotos cada semana.</p> : (
        <div className="space-y-3">
          {revisiones.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-[var(--marino,#16355C)]">Semana {r.semana_lunes}</div>
                {r.daños_detectados && <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">⚠ DAÑOS</span>}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {(['drive_frontal_id', 'drive_lateral_izq_id', 'drive_lateral_dch_id', 'drive_trasera_id', 'drive_interior_id'] as const).map((k) => {
                  const id = (r as any)[k] as string | null;
                  const label = k.replace('drive_', '').replace('_id', '').replace(/_/g, ' ');
                  return id ? (
                    <a key={k} href={driveFileUrl(id)!} target="_blank" rel="noreferrer">
                      <img src={driveThumb(id)} alt={label} className="w-full h-20 object-cover rounded-lg border border-[var(--arena,#EFE6D8)]" />
                      <div className="text-[10px] text-gray-500 mt-1 capitalize">{label}</div>
                    </a>
                  ) : (
                    <div key={k} className="w-full h-20 bg-gray-50 rounded-lg flex items-center justify-center text-[10px] text-gray-400 capitalize">{label}</div>
                  );
                })}
              </div>
              {r.notas && <p className="text-xs text-gray-500 mt-2">{r.notas}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TabFotos({ fotos, furgoId, onAdd, onDelete, onSetPortada }: { fotos: FotoFurgo[]; furgoId: string; onAdd: () => void; onDelete: (id: string) => void; onSetPortada: (id: string) => void }) {
  return (
    <div className="space-y-3">
      <HeaderTab title="Fotos" action={<BtnPrimary onClick={onAdd}>+ Añadir foto</BtnPrimary>} />
      {fotos.length === 0 ? <p className="text-gray-500">Sin fotos. Pulsa "+ Añadir foto" para empezar.</p> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {fotos.map((f) => (
            <div key={f.id} className="relative group">
              <a href={`https://drive.google.com/file/d/${f.drive_file_id}/view`} target="_blank" rel="noreferrer">
                <img src={f.url_publica ?? driveThumb(f.drive_file_id)} alt={f.fecha ?? ''} className="w-full h-32 object-cover rounded-xl border border-[var(--arena,#EFE6D8)]" />
              </a>
              {f.es_portada && <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-[var(--fuego,#F26B1F)] text-white font-bold">PORTADA</span>}
              <div className="text-xs text-gray-500 mt-1">{f.fecha} · {f.subida_por ?? ''}</div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 flex gap-1">
                {!f.es_portada && <button onClick={() => onSetPortada(f.id)} title="Marcar portada" className="text-xs px-2 py-1 rounded bg-white shadow">⭐</button>}
                <button onClick={() => onDelete(f.id)} title="Eliminar" className="text-xs px-2 py-1 rounded bg-white shadow text-rose-500">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabIncidencias({ incidencias, fmtEur, onAdd, onDelete }: { incidencias: Incidencia[]; fmtEur: (n: number | null | undefined) => string; onAdd: () => void; onDelete: (id: string) => void }) {
  return (
    <div className="space-y-3">
      <HeaderTab title="Multas / Siniestros" action={<BtnPrimary onClick={onAdd}>+ Registrar</BtnPrimary>} />
      {incidencias.length === 0 ? <p className="text-gray-500">Sin multas ni siniestros.</p> : (
        <Card>
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase text-gray-400 tracking-wide">
              <tr><th className="text-left py-2">Fecha</th><th className="text-left">Tipo</th><th className="text-left">Descripción</th><th className="text-right">Importe</th><th className="text-center">Recurrida</th><th className="text-left">Estado</th><th></th></tr>
            </thead>
            <tbody>
              {incidencias.map((i) => (
                <tr key={i.id} className="border-t border-[var(--arena,#EFE6D8)]">
                  <td className="py-2">{i.fecha}</td>
                  <td><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${i.tipo === 'MULTA' ? 'bg-amber-100 text-amber-700' : i.tipo === 'SINIESTRO' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-700'}`}>{i.tipo}</span></td>
                  <td className="max-w-xs truncate">{i.descripcion ?? '—'}</td>
                  <td className="text-right">{fmtEur(i.importe_eur)}</td>
                  <td className="text-center">{i.recurrida ? '✓' : '—'}</td>
                  <td>{i.estado ?? '—'}</td>
                  <td className="text-right">
                    {driveFileUrl(i.drive_documento_id) && <a href={driveFileUrl(i.drive_documento_id)!} target="_blank" rel="noreferrer" className="text-[var(--fuego,#F26B1F)] mr-2">📄</a>}
                    <button onClick={() => onDelete(i.id)} className="text-rose-500 hover:text-rose-700">🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function TabDocs({ docs, onAdd, onDelete }: { docs: Documento[]; onAdd: () => void; onDelete: (id: string) => void }) {
  return (
    <div className="space-y-3">
      <HeaderTab title="Documentación adicional" action={<BtnPrimary onClick={onAdd}>+ Añadir documento</BtnPrimary>} />
      {docs.length === 0 ? <p className="text-gray-500">Sin documentación adicional.</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {docs.map((d) => (
            <Card key={d.id}>
              <div className="flex items-start justify-between gap-2">
                <a href={driveFileUrl(d.drive_file_id)!} target="_blank" rel="noreferrer" className="flex-1">
                  <div className="text-sm font-semibold text-[var(--marino,#16355C)]">{d.tipo}</div>
                  <div className="text-xs text-gray-500">{d.descripcion ?? ''}</div>
                  <div className="text-[11px] text-gray-400 mt-2">
                    {d.fecha_documento && <>Doc: {d.fecha_documento}</>}{d.fecha_caducidad && <> · Caduca: {d.fecha_caducidad}</>}
                  </div>
                </a>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[var(--fuego,#F26B1F)]">📄</span>
                  <button onClick={() => onDelete(d.id)} className="text-rose-500 hover:text-rose-700 text-xs">🗑</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TabConductor({ conductor, onEdit }: { conductor: Conductor | null; onEdit: () => void }) {
  return (
    <div className="space-y-3">
      <HeaderTab title="Conductor" action={conductor ? <BtnGhost onClick={onEdit}>✎ Editar</BtnGhost> : null} />
      {!conductor ? <p className="text-gray-500">Sin ficha de conductor.</p> : (
        <Card>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Nombre" value={`${conductor.nombre} ${conductor.apellidos ?? ''}`} />
            <Field label="DNI" value={conductor.dni} />
            <Field label="Teléfono" value={conductor.telefono} />
            <Field label="Email" value={conductor.email} />
            <Field label="Dirección" value={conductor.direccion} />
            <Field label="Tipo contrato" value={conductor.tipo_contrato} />
            <Field label="Salario / mes" value={conductor.salario_mensual} />
            <Field label="Fecha alta" value={conductor.fecha_alta} />
            <Field label="Carnet" value={`${conductor.carnet_tipo ?? '—'} (cad. ${conductor.carnet_caducidad ?? '—'})`} />
            <Field label="Cuenta bancaria" value={conductor.cuenta_bancaria} />
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Modales ────────────────────────────────────────────────
function useFormState<T>(initial: T) {
  const [s, set] = useState<T>(initial);
  const update = (patch: Partial<T>) => set((prev) => ({ ...prev, ...patch }));
  return [s, update] as const;
}

function ModalGeneral({ furgo, onClose, onSave }: { furgo: Furgoneta; onClose: () => void; onSave: (p: Partial<Furgoneta>) => void }) {
  const [s, u] = useFormState({
    matricula: furgo.matricula,
    modelo: furgo.modelo,
    conductor: furgo.conductor,
    nombre_corto: furgo.nombre_corto ?? '',
    ruta: furgo.ruta ?? '',
    estado: furgo.estado,
    km_actual: furgo.km_actual ?? '',
    km_proxima_revision: furgo.km_proxima_revision ?? '',
    itv_fecha: furgo.itv_fecha ?? '',
    seguro_fecha_vencimiento: furgo.seguro_fecha_vencimiento ?? '',
    prestamo_mensual: furgo.prestamo_mensual ?? '',
    seguro_anual: furgo.seguro_anual ?? '',
    alquiler_mensual: furgo.alquiler_mensual ?? '',
  });
  return (
    <Modal open onClose={onClose} title="Editar datos generales" footer={<><BtnGhost onClick={onClose}>Cancelar</BtnGhost><BtnPrimary onClick={() => onSave({
      matricula: s.matricula, modelo: s.modelo, conductor: s.conductor, nombre_corto: s.nombre_corto || null,
      ruta: s.ruta || null, estado: s.estado as Furgoneta['estado'],
      km_actual: s.km_actual === '' ? null : Number(s.km_actual),
      km_proxima_revision: s.km_proxima_revision === '' ? null : Number(s.km_proxima_revision),
      itv_fecha: s.itv_fecha || null, seguro_fecha_vencimiento: s.seguro_fecha_vencimiento || null,
      prestamo_mensual: s.prestamo_mensual === '' ? null : Number(s.prestamo_mensual),
      seguro_anual: s.seguro_anual === '' ? null : Number(s.seguro_anual),
      alquiler_mensual: s.alquiler_mensual === '' ? null : Number(s.alquiler_mensual),
    })}>Guardar</BtnPrimary></>}>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Matrícula" required><Input value={s.matricula} onChange={(e) => u({ matricula: e.target.value })} /></FormRow>
        <FormRow label="Modelo"><Input value={s.modelo} onChange={(e) => u({ modelo: e.target.value })} /></FormRow>
        <FormRow label="Conductor"><Input value={s.conductor} onChange={(e) => u({ conductor: e.target.value })} /></FormRow>
        <FormRow label="Nombre corto"><Input value={s.nombre_corto} onChange={(e) => u({ nombre_corto: e.target.value })} /></FormRow>
        <FormRow label="Ruta"><Input value={s.ruta} onChange={(e) => u({ ruta: e.target.value })} /></FormRow>
        <FormRow label="Estado">
          <Select value={s.estado} onChange={(e) => u({ estado: e.target.value as any })}>
            <option value="OPERATIVA">Operativa</option>
            <option value="EN_REVISION">En revisión</option>
            <option value="FUERA_SERVICIO">Fuera de servicio</option>
          </Select>
        </FormRow>
        <FormRow label="Km actuales"><Input type="number" value={s.km_actual} onChange={(e) => u({ km_actual: e.target.value })} /></FormRow>
        <FormRow label="Km próx. revisión"><Input type="number" value={s.km_proxima_revision} onChange={(e) => u({ km_proxima_revision: e.target.value })} /></FormRow>
        <FormRow label="Próx. ITV"><Input type="date" value={s.itv_fecha} onChange={(e) => u({ itv_fecha: e.target.value })} /></FormRow>
        <FormRow label="Vence seguro"><Input type="date" value={s.seguro_fecha_vencimiento} onChange={(e) => u({ seguro_fecha_vencimiento: e.target.value })} /></FormRow>
        <FormRow label="Préstamo / mes (€)"><Input type="number" step="0.01" value={s.prestamo_mensual} onChange={(e) => u({ prestamo_mensual: e.target.value })} /></FormRow>
        <FormRow label="Seguro / año (€)"><Input type="number" step="0.01" value={s.seguro_anual} onChange={(e) => u({ seguro_anual: e.target.value })} /></FormRow>
        <FormRow label="Alquiler / mes (€)"><Input type="number" step="0.01" value={s.alquiler_mensual} onChange={(e) => u({ alquiler_mensual: e.target.value })} /></FormRow>
      </div>
    </Modal>
  );
}

function DriveInput({ value, onChange, placeholder }: { value: string; onChange: (id: string) => void; placeholder?: string }) {
  return (
    <Input
      placeholder={placeholder ?? 'Pega URL o ID de Drive'}
      value={value}
      onChange={(e) => {
        const id = extractDriveFileId(e.target.value) ?? e.target.value;
        onChange(id);
      }}
    />
  );
}

function ModalSeguro({ seguro, onClose, onSave }: { seguro: SeguroFurgo | null; onClose: () => void; onSave: (p: Partial<SeguroFurgo>) => void }) {
  const [s, u] = useFormState({
    compania: seguro?.compania ?? '', numero_poliza: seguro?.numero_poliza ?? '',
    telefono: seguro?.telefono ?? '', email: seguro?.email ?? '',
    mediador_nombre: seguro?.mediador_nombre ?? '', mediador_tel: seguro?.mediador_tel ?? '',
    coberturas: seguro?.coberturas ?? '', franquicia_eur: seguro?.franquicia_eur ?? '',
    prima_anual_eur: seguro?.prima_anual_eur ?? '', forma_pago: seguro?.forma_pago ?? '',
    fecha_proximo_cobro: seguro?.fecha_proximo_cobro ?? '', fecha_renovacion: seguro?.fecha_renovacion ?? '',
    drive_poliza_id: seguro?.drive_poliza_id ?? '', drive_condicionado_id: seguro?.drive_condicionado_id ?? '',
    drive_recibo_id: seguro?.drive_recibo_id ?? '', notas: seguro?.notas ?? '',
  });
  return (
    <Modal open onClose={onClose} title={seguro ? 'Editar seguro' : 'Añadir seguro'} footer={<><BtnGhost onClick={onClose}>Cancelar</BtnGhost><BtnPrimary onClick={() => onSave({
      ...s,
      franquicia_eur: s.franquicia_eur === '' ? null : Number(s.franquicia_eur),
      prima_anual_eur: s.prima_anual_eur === '' ? null : Number(s.prima_anual_eur),
      fecha_proximo_cobro: s.fecha_proximo_cobro || null,
      fecha_renovacion: s.fecha_renovacion || null,
    } as any)}>Guardar</BtnPrimary></>}>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Compañía"><Input value={s.compania} onChange={(e) => u({ compania: e.target.value })} /></FormRow>
        <FormRow label="Nº póliza"><Input value={s.numero_poliza} onChange={(e) => u({ numero_poliza: e.target.value })} /></FormRow>
        <FormRow label="Teléfono"><Input value={s.telefono} onChange={(e) => u({ telefono: e.target.value })} /></FormRow>
        <FormRow label="Email"><Input value={s.email} onChange={(e) => u({ email: e.target.value })} /></FormRow>
        <FormRow label="Mediador"><Input value={s.mediador_nombre} onChange={(e) => u({ mediador_nombre: e.target.value })} /></FormRow>
        <FormRow label="Tel. mediador"><Input value={s.mediador_tel} onChange={(e) => u({ mediador_tel: e.target.value })} /></FormRow>
        <FormRow label="Coberturas"><Input value={s.coberturas} onChange={(e) => u({ coberturas: e.target.value })} /></FormRow>
        <FormRow label="Franquicia (€)"><Input type="number" step="0.01" value={s.franquicia_eur} onChange={(e) => u({ franquicia_eur: e.target.value })} /></FormRow>
        <FormRow label="Prima anual (€)"><Input type="number" step="0.01" value={s.prima_anual_eur} onChange={(e) => u({ prima_anual_eur: e.target.value })} /></FormRow>
        <FormRow label="Forma de pago"><Input value={s.forma_pago} onChange={(e) => u({ forma_pago: e.target.value })} /></FormRow>
        <FormRow label="Próximo cobro"><Input type="date" value={s.fecha_proximo_cobro} onChange={(e) => u({ fecha_proximo_cobro: e.target.value })} /></FormRow>
        <FormRow label="Renovación"><Input type="date" value={s.fecha_renovacion} onChange={(e) => u({ fecha_renovacion: e.target.value })} /></FormRow>
        <FormRow label="PDF Póliza (Drive)"><DriveInput value={s.drive_poliza_id} onChange={(id) => u({ drive_poliza_id: id })} /></FormRow>
        <FormRow label="PDF Condicionado (Drive)"><DriveInput value={s.drive_condicionado_id} onChange={(id) => u({ drive_condicionado_id: id })} /></FormRow>
        <FormRow label="PDF Último recibo (Drive)"><DriveInput value={s.drive_recibo_id} onChange={(id) => u({ drive_recibo_id: id })} /></FormRow>
        <div className="col-span-2"><FormRow label="Notas"><TextArea rows={2} value={s.notas} onChange={(e) => u({ notas: e.target.value })} /></FormRow></div>
      </div>
    </Modal>
  );
}

function ModalItv({ itv, onClose, onSave }: { itv: ItvFurgo | null; onClose: () => void; onSave: (p: Partial<ItvFurgo>) => void }) {
  const [s, u] = useFormState({
    estacion: itv?.estacion ?? '', estacion_tel: itv?.estacion_tel ?? '',
    ultima_fecha: itv?.ultima_fecha ?? '', ultima_km: itv?.ultima_km ?? '',
    ultima_resultado: itv?.ultima_resultado ?? '', proxima_fecha: itv?.proxima_fecha ?? '',
    drive_informe_id: itv?.drive_informe_id ?? '', notas: itv?.notas ?? '',
  });
  return (
    <Modal open onClose={onClose} title={itv ? 'Editar ITV' : 'Añadir ITV'} footer={<><BtnGhost onClick={onClose}>Cancelar</BtnGhost><BtnPrimary onClick={() => onSave({
      ...s, ultima_fecha: s.ultima_fecha || null, proxima_fecha: s.proxima_fecha || null,
      ultima_km: s.ultima_km === '' ? null : Number(s.ultima_km),
    } as any)}>Guardar</BtnPrimary></>}>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Estación"><Input value={s.estacion} onChange={(e) => u({ estacion: e.target.value })} /></FormRow>
        <FormRow label="Tel. estación"><Input value={s.estacion_tel} onChange={(e) => u({ estacion_tel: e.target.value })} /></FormRow>
        <FormRow label="Última fecha"><Input type="date" value={s.ultima_fecha} onChange={(e) => u({ ultima_fecha: e.target.value })} /></FormRow>
        <FormRow label="Km en última"><Input type="number" value={s.ultima_km} onChange={(e) => u({ ultima_km: e.target.value })} /></FormRow>
        <FormRow label="Resultado">
          <Select value={s.ultima_resultado} onChange={(e) => u({ ultima_resultado: e.target.value })}>
            <option value="">—</option>
            <option value="Favorable">Favorable</option>
            <option value="Desfavorable">Desfavorable</option>
            <option value="Negativa">Negativa</option>
          </Select>
        </FormRow>
        <FormRow label="Próxima fecha"><Input type="date" value={s.proxima_fecha} onChange={(e) => u({ proxima_fecha: e.target.value })} /></FormRow>
        <FormRow label="PDF informe ITV (Drive)"><DriveInput value={s.drive_informe_id} onChange={(id) => u({ drive_informe_id: id })} /></FormRow>
        <div className="col-span-2"><FormRow label="Notas"><TextArea rows={2} value={s.notas} onChange={(e) => u({ notas: e.target.value })} /></FormRow></div>
      </div>
    </Modal>
  );
}

function ModalPrestamo({ prestamo, onClose, onSave }: { prestamo: Prestamo | null; onClose: () => void; onSave: (p: Partial<Prestamo>) => void }) {
  const [s, u] = useFormState({
    entidad: prestamo?.entidad ?? '', numero_prestamo: prestamo?.numero_prestamo ?? '',
    importe_total: prestamo?.importe_total ?? '', cuota_mensual: prestamo?.cuota_mensual ?? '',
    fecha_inicio: prestamo?.fecha_inicio ?? '', fecha_fin: prestamo?.fecha_fin ?? '',
    cuotas_pagadas: prestamo?.cuotas_pagadas ?? '', cuotas_totales: prestamo?.cuotas_totales ?? '',
    tae: prestamo?.tae ?? '', drive_contrato_id: prestamo?.drive_contrato_id ?? '', notas: prestamo?.notas ?? '',
  });
  return (
    <Modal open onClose={onClose} title={prestamo ? 'Editar préstamo' : 'Añadir préstamo'} footer={<><BtnGhost onClick={onClose}>Cancelar</BtnGhost><BtnPrimary onClick={() => onSave({
      ...s,
      importe_total: s.importe_total === '' ? null : Number(s.importe_total),
      cuota_mensual: s.cuota_mensual === '' ? null : Number(s.cuota_mensual),
      fecha_inicio: s.fecha_inicio || null, fecha_fin: s.fecha_fin || null,
      cuotas_pagadas: s.cuotas_pagadas === '' ? null : Number(s.cuotas_pagadas),
      cuotas_totales: s.cuotas_totales === '' ? null : Number(s.cuotas_totales),
      tae: s.tae === '' ? null : Number(s.tae),
    } as any)}>Guardar</BtnPrimary></>}>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Entidad"><Input value={s.entidad} onChange={(e) => u({ entidad: e.target.value })} /></FormRow>
        <FormRow label="Nº préstamo"><Input value={s.numero_prestamo} onChange={(e) => u({ numero_prestamo: e.target.value })} /></FormRow>
        <FormRow label="Importe total (€)"><Input type="number" step="0.01" value={s.importe_total} onChange={(e) => u({ importe_total: e.target.value })} /></FormRow>
        <FormRow label="Cuota mensual (€)"><Input type="number" step="0.01" value={s.cuota_mensual} onChange={(e) => u({ cuota_mensual: e.target.value })} /></FormRow>
        <FormRow label="TAE (%)"><Input type="number" step="0.01" value={s.tae} onChange={(e) => u({ tae: e.target.value })} /></FormRow>
        <FormRow label="Inicio"><Input type="date" value={s.fecha_inicio} onChange={(e) => u({ fecha_inicio: e.target.value })} /></FormRow>
        <FormRow label="Fin"><Input type="date" value={s.fecha_fin} onChange={(e) => u({ fecha_fin: e.target.value })} /></FormRow>
        <FormRow label="Cuotas pagadas"><Input type="number" value={s.cuotas_pagadas} onChange={(e) => u({ cuotas_pagadas: e.target.value })} /></FormRow>
        <FormRow label="Cuotas totales"><Input type="number" value={s.cuotas_totales} onChange={(e) => u({ cuotas_totales: e.target.value })} /></FormRow>
        <FormRow label="PDF contrato (Drive)"><DriveInput value={s.drive_contrato_id} onChange={(id) => u({ drive_contrato_id: id })} /></FormRow>
        <div className="col-span-2"><FormRow label="Notas"><TextArea rows={2} value={s.notas} onChange={(e) => u({ notas: e.target.value })} /></FormRow></div>
      </div>
    </Modal>
  );
}

function ModalFoto({ onClose, onSave }: { onClose: () => void; onSave: (p: Partial<FotoFurgo>) => void }) {
  const [s, u] = useFormState({
    drive_file_id: '', es_portada: false, fecha: new Date().toISOString().slice(0, 10), subida_por: '', notas: '',
  });
  return (
    <Modal open onClose={onClose} title="Añadir foto" footer={<><BtnGhost onClick={onClose}>Cancelar</BtnGhost><BtnPrimary disabled={!s.drive_file_id} onClick={() => onSave({ drive_file_id: s.drive_file_id, es_portada: s.es_portada, fecha: s.fecha || null, subida_por: s.subida_por || null, notas: s.notas || null } as any)}>Guardar</BtnPrimary></>}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><FormRow label="URL o ID Drive" required><DriveInput value={s.drive_file_id} onChange={(id) => u({ drive_file_id: id })} placeholder="https://drive.google.com/file/d/XXX/view" /></FormRow></div>
        <FormRow label="Fecha"><Input type="date" value={s.fecha} onChange={(e) => u({ fecha: e.target.value })} /></FormRow>
        <FormRow label="Subida por"><Input value={s.subida_por} onChange={(e) => u({ subida_por: e.target.value })} /></FormRow>
        <div className="col-span-2 flex items-center gap-2">
          <input type="checkbox" id="esp" checked={s.es_portada} onChange={(e) => u({ es_portada: e.target.checked })} />
          <label htmlFor="esp" className="text-sm">Marcar como portada</label>
        </div>
        <div className="col-span-2"><FormRow label="Notas"><TextArea rows={2} value={s.notas} onChange={(e) => u({ notas: e.target.value })} /></FormRow></div>
      </div>
    </Modal>
  );
}

function ModalKms({ onClose, onSave }: { onClose: () => void; onSave: (p: Partial<ParteKm>) => void }) {
  const [s, u] = useFormState({
    semana_lunes: lunesDeFecha(),
    km_inicio: '', km_fin: '', notas: '',
  });
  return (
    <Modal open onClose={onClose} title="Nuevo parte semanal de km" footer={<><BtnGhost onClick={onClose}>Cancelar</BtnGhost><BtnPrimary disabled={!s.semana_lunes} onClick={() => onSave({
      semana_lunes: s.semana_lunes,
      km_inicio: s.km_inicio === '' ? null : Number(s.km_inicio),
      km_fin: s.km_fin === '' ? null : Number(s.km_fin),
      notas: s.notas || null,
    } as any)}>Guardar</BtnPrimary></>}>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Semana (lunes)" required><Input type="date" value={s.semana_lunes} onChange={(e) => u({ semana_lunes: e.target.value })} /></FormRow>
        <div />
        <FormRow label="Km inicio"><Input type="number" value={s.km_inicio} onChange={(e) => u({ km_inicio: e.target.value })} /></FormRow>
        <FormRow label="Km fin"><Input type="number" value={s.km_fin} onChange={(e) => u({ km_fin: e.target.value })} /></FormRow>
        <div className="col-span-2"><FormRow label="Notas"><TextArea rows={2} value={s.notas} onChange={(e) => u({ notas: e.target.value })} /></FormRow></div>
      </div>
    </Modal>
  );
}

function ModalVisual({ onClose, onSave }: { onClose: () => void; onSave: (p: Partial<RevisionVisual>) => void }) {
  const [s, u] = useFormState({
    semana_lunes: lunesDeFecha(),
    drive_frontal_id: '', drive_lateral_izq_id: '', drive_lateral_dch_id: '',
    drive_trasera_id: '', drive_interior_id: '',
    danos: false, notas: '',
  });
  return (
    <Modal open onClose={onClose} title="Nueva revisión visual semanal" footer={<><BtnGhost onClick={onClose}>Cancelar</BtnGhost><BtnPrimary disabled={!s.semana_lunes} onClick={() => onSave({
      semana_lunes: s.semana_lunes,
      drive_frontal_id: s.drive_frontal_id || null,
      drive_lateral_izq_id: s.drive_lateral_izq_id || null,
      drive_lateral_dch_id: s.drive_lateral_dch_id || null,
      drive_trasera_id: s.drive_trasera_id || null,
      drive_interior_id: s.drive_interior_id || null,
      ['daños_detectados' as any]: s.danos,
      notas: s.notas || null,
    } as any)}>Guardar</BtnPrimary></>}>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Semana (lunes)" required><Input type="date" value={s.semana_lunes} onChange={(e) => u({ semana_lunes: e.target.value })} /></FormRow>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="dn" checked={s.danos} onChange={(e) => u({ danos: e.target.checked })} />
          <label htmlFor="dn" className="text-sm">⚠ Marcar daños detectados</label>
        </div>
        <FormRow label="Foto frontal"><DriveInput value={s.drive_frontal_id} onChange={(id) => u({ drive_frontal_id: id })} /></FormRow>
        <FormRow label="Foto trasera"><DriveInput value={s.drive_trasera_id} onChange={(id) => u({ drive_trasera_id: id })} /></FormRow>
        <FormRow label="Foto lateral izq."><DriveInput value={s.drive_lateral_izq_id} onChange={(id) => u({ drive_lateral_izq_id: id })} /></FormRow>
        <FormRow label="Foto lateral dch."><DriveInput value={s.drive_lateral_dch_id} onChange={(id) => u({ drive_lateral_dch_id: id })} /></FormRow>
        <FormRow label="Foto interior carga"><DriveInput value={s.drive_interior_id} onChange={(id) => u({ drive_interior_id: id })} /></FormRow>
        <div />
        <div className="col-span-2"><FormRow label="Notas"><TextArea rows={2} value={s.notas} onChange={(e) => u({ notas: e.target.value })} /></FormRow></div>
      </div>
    </Modal>
  );
}

function ModalMantenim({ onClose, onSave }: { onClose: () => void; onSave: (p: Partial<Mantenimiento>) => void }) {
  const [s, u] = useFormState({
    fecha: new Date().toISOString().slice(0, 10),
    km: '', taller: '', taller_tel: '', tipo: '', descripcion: '', coste_eur: '', drive_factura_id: '', notas: '',
  });
  return (
    <Modal open onClose={onClose} title="Nuevo mantenimiento" footer={<><BtnGhost onClick={onClose}>Cancelar</BtnGhost><BtnPrimary disabled={!s.fecha} onClick={() => onSave({
      fecha: s.fecha, km: s.km === '' ? null : Number(s.km), taller: s.taller || null, taller_tel: s.taller_tel || null,
      tipo: s.tipo || null, descripcion: s.descripcion || null, coste_eur: s.coste_eur === '' ? null : Number(s.coste_eur),
      drive_factura_id: s.drive_factura_id || null, notas: s.notas || null,
    } as any)}>Guardar</BtnPrimary></>}>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Fecha" required><Input type="date" value={s.fecha} onChange={(e) => u({ fecha: e.target.value })} /></FormRow>
        <FormRow label="Km"><Input type="number" value={s.km} onChange={(e) => u({ km: e.target.value })} /></FormRow>
        <FormRow label="Tipo">
          <Select value={s.tipo} onChange={(e) => u({ tipo: e.target.value })}>
            <option value="">—</option>
            <option value="Revisión periódica">Revisión periódica</option>
            <option value="Aceite/filtros">Aceite / filtros</option>
            <option value="Frenos">Frenos</option>
            <option value="Neumáticos">Neumáticos</option>
            <option value="Eléctrico/batería">Eléctrico / batería</option>
            <option value="Reparación daño">Reparación daño</option>
            <option value="Otro">Otro</option>
          </Select>
        </FormRow>
        <FormRow label="Coste (€)"><Input type="number" step="0.01" value={s.coste_eur} onChange={(e) => u({ coste_eur: e.target.value })} /></FormRow>
        <FormRow label="Taller"><Input value={s.taller} onChange={(e) => u({ taller: e.target.value })} /></FormRow>
        <FormRow label="Tel. taller"><Input value={s.taller_tel} onChange={(e) => u({ taller_tel: e.target.value })} /></FormRow>
        <div className="col-span-2"><FormRow label="Descripción"><TextArea rows={2} value={s.descripcion} onChange={(e) => u({ descripcion: e.target.value })} /></FormRow></div>
        <FormRow label="PDF factura (Drive)"><DriveInput value={s.drive_factura_id} onChange={(id) => u({ drive_factura_id: id })} /></FormRow>
        <FormRow label="Notas"><Input value={s.notas} onChange={(e) => u({ notas: e.target.value })} /></FormRow>
      </div>
    </Modal>
  );
}

function ModalIncidencia({ onClose, onSave }: { onClose: () => void; onSave: (p: Partial<Incidencia>) => void }) {
  const [s, u] = useFormState({
    tipo: 'MULTA' as Incidencia['tipo'], fecha: new Date().toISOString().slice(0, 10),
    importe_eur: '', descripcion: '', recurrida: false, resultado_recurso: '',
    drive_documento_id: '', estado: 'ABIERTA', notas: '',
  });
  return (
    <Modal open onClose={onClose} title="Registrar multa o siniestro" footer={<><BtnGhost onClick={onClose}>Cancelar</BtnGhost><BtnPrimary disabled={!s.fecha} onClick={() => onSave({
      tipo: s.tipo, fecha: s.fecha,
      importe_eur: s.importe_eur === '' ? null : Number(s.importe_eur),
      descripcion: s.descripcion || null,
      recurrida: s.recurrida, resultado_recurso: s.resultado_recurso || null,
      drive_documento_id: s.drive_documento_id || null,
      estado: s.estado, notas: s.notas || null,
    } as any)}>Guardar</BtnPrimary></>}>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Tipo" required>
          <Select value={s.tipo} onChange={(e) => u({ tipo: e.target.value as any })}>
            <option value="MULTA">Multa</option>
            <option value="SINIESTRO">Siniestro</option>
            <option value="OTRO">Otro</option>
          </Select>
        </FormRow>
        <FormRow label="Fecha" required><Input type="date" value={s.fecha} onChange={(e) => u({ fecha: e.target.value })} /></FormRow>
        <FormRow label="Importe (€)"><Input type="number" step="0.01" value={s.importe_eur} onChange={(e) => u({ importe_eur: e.target.value })} /></FormRow>
        <FormRow label="Estado">
          <Select value={s.estado} onChange={(e) => u({ estado: e.target.value })}>
            <option value="ABIERTA">Abierta</option>
            <option value="EN_RECURSO">En recurso</option>
            <option value="PAGADA">Pagada</option>
            <option value="CERRADA">Cerrada</option>
          </Select>
        </FormRow>
        <div className="col-span-2"><FormRow label="Descripción"><TextArea rows={2} value={s.descripcion} onChange={(e) => u({ descripcion: e.target.value })} /></FormRow></div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="rec" checked={s.recurrida} onChange={(e) => u({ recurrida: e.target.checked })} />
          <label htmlFor="rec" className="text-sm">Recurrida</label>
        </div>
        <FormRow label="Resultado recurso"><Input value={s.resultado_recurso} onChange={(e) => u({ resultado_recurso: e.target.value })} /></FormRow>
        <div className="col-span-2"><FormRow label="PDF documento (Drive)"><DriveInput value={s.drive_documento_id} onChange={(id) => u({ drive_documento_id: id })} /></FormRow></div>
        <div className="col-span-2"><FormRow label="Notas"><TextArea rows={2} value={s.notas} onChange={(e) => u({ notas: e.target.value })} /></FormRow></div>
      </div>
    </Modal>
  );
}

function ModalDoc({ onClose, onSave }: { onClose: () => void; onSave: (p: Partial<Documento>) => void }) {
  const [s, u] = useFormState({
    tipo: '', descripcion: '', drive_file_id: '',
    fecha_documento: '', fecha_caducidad: '', notas: '',
  });
  return (
    <Modal open onClose={onClose} title="Añadir documento" footer={<><BtnGhost onClick={onClose}>Cancelar</BtnGhost><BtnPrimary disabled={!s.tipo || !s.drive_file_id} onClick={() => onSave({
      tipo: s.tipo, descripcion: s.descripcion || null, drive_file_id: s.drive_file_id,
      fecha_documento: s.fecha_documento || null, fecha_caducidad: s.fecha_caducidad || null, notas: s.notas || null,
    } as any)}>Guardar</BtnPrimary></>}>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Tipo" required>
          <Select value={s.tipo} onChange={(e) => u({ tipo: e.target.value })}>
            <option value="">—</option>
            <option value="Permiso circulación">Permiso de circulación</option>
            <option value="Ficha técnica">Ficha técnica</option>
            <option value="Tarjeta transporte">Tarjeta de transporte</option>
            <option value="Recibo IVTM">Recibo IVTM</option>
            <option value="Otro">Otro</option>
          </Select>
        </FormRow>
        <FormRow label="Descripción"><Input value={s.descripcion} onChange={(e) => u({ descripcion: e.target.value })} /></FormRow>
        <div className="col-span-2"><FormRow label="URL o ID Drive" required><DriveInput value={s.drive_file_id} onChange={(id) => u({ drive_file_id: id })} /></FormRow></div>
        <FormRow label="Fecha doc."><Input type="date" value={s.fecha_documento} onChange={(e) => u({ fecha_documento: e.target.value })} /></FormRow>
        <FormRow label="Caducidad"><Input type="date" value={s.fecha_caducidad} onChange={(e) => u({ fecha_caducidad: e.target.value })} /></FormRow>
        <div className="col-span-2"><FormRow label="Notas"><TextArea rows={2} value={s.notas} onChange={(e) => u({ notas: e.target.value })} /></FormRow></div>
      </div>
    </Modal>
  );
}

function ModalConductor({ conductor, onClose, onSave }: { conductor: Conductor | null; onClose: () => void; onSave: (p: Partial<Conductor>) => void }) {
  const [s, u] = useFormState({
    nombre: conductor?.nombre ?? '', apellidos: conductor?.apellidos ?? '',
    dni: conductor?.dni ?? '', fecha_nacimiento: conductor?.fecha_nacimiento ?? '',
    fecha_alta: conductor?.fecha_alta ?? '', tipo_contrato: conductor?.tipo_contrato ?? '',
    salario_mensual: conductor?.salario_mensual ?? '',
    telefono: conductor?.telefono ?? '', email: conductor?.email ?? '',
    direccion: conductor?.direccion ?? '', carnet_tipo: conductor?.carnet_tipo ?? '',
    carnet_caducidad: conductor?.carnet_caducidad ?? '', cuenta_bancaria: conductor?.cuenta_bancaria ?? '',
    drive_dni_id: conductor?.drive_dni_id ?? '', drive_carnet_id: conductor?.drive_carnet_id ?? '',
    drive_contrato_id: conductor?.drive_contrato_id ?? '', notas: conductor?.notas ?? '',
  });
  return (
    <Modal open onClose={onClose} title="Editar conductor" footer={<><BtnGhost onClick={onClose}>Cancelar</BtnGhost><BtnPrimary onClick={() => onSave({
      ...s,
      salario_mensual: s.salario_mensual === '' ? null : Number(s.salario_mensual),
      fecha_nacimiento: s.fecha_nacimiento || null,
      fecha_alta: s.fecha_alta || null,
      carnet_caducidad: s.carnet_caducidad || null,
    } as any)}>Guardar</BtnPrimary></>}>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Nombre" required><Input value={s.nombre} onChange={(e) => u({ nombre: e.target.value })} /></FormRow>
        <FormRow label="Apellidos"><Input value={s.apellidos} onChange={(e) => u({ apellidos: e.target.value })} /></FormRow>
        <FormRow label="DNI"><Input value={s.dni} onChange={(e) => u({ dni: e.target.value })} /></FormRow>
        <FormRow label="Fecha nacimiento"><Input type="date" value={s.fecha_nacimiento} onChange={(e) => u({ fecha_nacimiento: e.target.value })} /></FormRow>
        <FormRow label="Fecha alta"><Input type="date" value={s.fecha_alta} onChange={(e) => u({ fecha_alta: e.target.value })} /></FormRow>
        <FormRow label="Tipo contrato">
          <Select value={s.tipo_contrato} onChange={(e) => u({ tipo_contrato: e.target.value })}>
            <option value="">—</option>
            <option value="Autónomo">Autónomo</option>
            <option value="Asalariado">Asalariado</option>
            <option value="Colaborador">Colaborador</option>
          </Select>
        </FormRow>
        <FormRow label="Salario / mes (€)"><Input type="number" step="0.01" value={s.salario_mensual} onChange={(e) => u({ salario_mensual: e.target.value })} /></FormRow>
        <FormRow label="Teléfono"><Input value={s.telefono} onChange={(e) => u({ telefono: e.target.value })} /></FormRow>
        <FormRow label="Email"><Input value={s.email} onChange={(e) => u({ email: e.target.value })} /></FormRow>
        <FormRow label="Carnet tipo">
          <Select value={s.carnet_tipo} onChange={(e) => u({ carnet_tipo: e.target.value })}>
            <option value="">—</option>
            <option value="B">B</option>
            <option value="C1">C1</option>
            <option value="C">C</option>
          </Select>
        </FormRow>
        <FormRow label="Carnet caducidad"><Input type="date" value={s.carnet_caducidad} onChange={(e) => u({ carnet_caducidad: e.target.value })} /></FormRow>
        <FormRow label="Cuenta bancaria"><Input value={s.cuenta_bancaria} onChange={(e) => u({ cuenta_bancaria: e.target.value })} /></FormRow>
        <FormRow label="Dirección"><Input value={s.direccion} onChange={(e) => u({ direccion: e.target.value })} /></FormRow>
        <FormRow label="PDF DNI"><DriveInput value={s.drive_dni_id} onChange={(id) => u({ drive_dni_id: id })} /></FormRow>
        <FormRow label="PDF Carnet"><DriveInput value={s.drive_carnet_id} onChange={(id) => u({ drive_carnet_id: id })} /></FormRow>
        <FormRow label="PDF Contrato"><DriveInput value={s.drive_contrato_id} onChange={(id) => u({ drive_contrato_id: id })} /></FormRow>
        <div className="col-span-2"><FormRow label="Notas"><TextArea rows={2} value={s.notas} onChange={(e) => u({ notas: e.target.value })} /></FormRow></div>
      </div>
    </Modal>
  );
}
