import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getFurgonetaPorCodigo,
  getSeguro, getItv, getFotos, getConductor,
  getPartesKm, getRevisionesVisuales, getMantenimientos,
  getPrestamo, getDocumentos, getIncidencias,
  driveFileUrl, driveThumb,
  type Furgoneta, type SeguroFurgo, type ItvFurgo, type FotoFurgo,
  type Conductor, type ParteKm, type RevisionVisual, type Mantenimiento,
  type Prestamo, type Documento, type Incidencia,
} from '../lib/flota/queries';

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

  useEffect(() => {
    (async () => {
      setLoading(true);
      const f = await getFurgonetaPorCodigo(codigo);
      if (!f) { setLoading(false); return; }
      setFurgo(f);
      const [s, i, fo, pk, rv, mt, pr, dc, ic] = await Promise.all([
        getSeguro(f.id), getItv(f.id), getFotos(f.id),
        getPartesKm(f.id), getRevisionesVisuales(f.id), getMantenimientos(f.id),
        getPrestamo(f.id), getDocumentos(f.id), getIncidencias(f.id),
      ]);
      setSeguro(s); setItv(i); setFotos(fo);
      setPartesKm(pk); setRevisiones(rv); setMantenimientos(mt);
      setPrestamo(pr); setDocs(dc); setIncidencias(ic);
      if (f.conductor_id) setConductor(await getConductor(f.conductor_id));
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

  return (
    <div className="p-6 space-y-5">
      <button onClick={() => navigate('/flota')} className="text-sm text-[var(--fuego,#F26B1F)] font-semibold">
        ← Volver a flota
      </button>

      <div className="flex items-start gap-4">
        {portada ? (
          <img
            src={portada.url_publica ?? driveThumb(portada.drive_file_id)}
            alt={furgo.matricula}
            className="w-44 h-32 object-cover rounded-xl border border-[var(--arena,#EFE6D8)]"
          />
        ) : (
          <div className="w-44 h-32 rounded-xl border border-dashed border-[var(--arena,#EFE6D8)] flex items-center justify-center text-gray-400 text-xs text-center px-2">
            Sin foto portada
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-[var(--marino,#16355C)]">
            {furgo.matricula} · {furgo.conductor}
          </h1>
          <p className="text-gray-500">
            {furgo.modelo} · {furgo.ruta ?? '—'} · {furgo.estado}
          </p>
          {furgo.km_actual != null && (
            <p className="text-xs text-gray-400 mt-1">Km actuales: {furgo.km_actual.toLocaleString('es-ES')}</p>
          )}
        </div>
      </div>

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

      {tab === 'general' && <TabGeneral f={furgo} />}
      {tab === 'seguro' && <TabSeguro seguro={seguro} fmtEur={fmtEur} />}
      {tab === 'itv' && <TabItv itv={itv} />}
      {tab === 'prestamo' && <TabPrestamo prestamo={prestamo} fmtEur={fmtEur} />}
      {tab === 'mantenim' && <TabMantenimiento mantenimientos={mantenimientos} fmtEur={fmtEur} />}
      {tab === 'kms' && <TabKms partes={partesKm} />}
      {tab === 'visual' && <TabVisual revisiones={revisiones} />}
      {tab === 'fotos' && <TabFotos fotos={fotos} />}
      {tab === 'multas' && <TabIncidencias incidencias={incidencias} fmtEur={fmtEur} />}
      {tab === 'docs' && <TabDocs docs={docs} />}
      {tab === 'conductor' && <TabConductor conductor={conductor} />}
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

function TabGeneral({ f }: { f: Furgoneta }) {
  return (
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
      </div>
    </Card>
  );
}

function TabSeguro({ seguro, fmtEur }: { seguro: SeguroFurgo | null; fmtEur: (n: number | null | undefined) => string }) {
  if (!seguro) return <p className="text-gray-500">Sin seguro registrado.</p>;
  const pdfs = [['Póliza', seguro.drive_poliza_id], ['Condicionado', seguro.drive_condicionado_id], ['Último recibo', seguro.drive_recibo_id]] as const;
  return (
    <div className="space-y-4">
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
    </div>
  );
}

function TabItv({ itv }: { itv: ItvFurgo | null }) {
  if (!itv) return <p className="text-gray-500">Sin ITV registrada.</p>;
  return (
    <div className="space-y-4">
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
        <a href={driveFileUrl(itv.drive_informe_id)!} target="_blank" rel="noreferrer" className="inline-block px-3 py-2 text-sm rounded-lg bg-[var(--fuego,#F26B1F)] text-white font-semibold">
          📄 Último informe ITV
        </a>
      )}
    </div>
  );
}

function TabPrestamo({ prestamo, fmtEur }: { prestamo: Prestamo | null; fmtEur: (n: number | null | undefined) => string }) {
  if (!prestamo) return <p className="text-gray-500">Sin préstamo registrado.</p>;
  const pct = prestamo.cuotas_totales && prestamo.cuotas_pagadas != null
    ? Math.round((prestamo.cuotas_pagadas / prestamo.cuotas_totales) * 100)
    : 0;
  return (
    <div className="space-y-4">
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
    </div>
  );
}

function TabMantenimiento({ mantenimientos, fmtEur }: { mantenimientos: Mantenimiento[]; fmtEur: (n: number | null | undefined) => string }) {
  if (mantenimientos.length === 0) return <p className="text-gray-500">Sin mantenimientos registrados.</p>;
  return (
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
                {driveFileUrl(m.drive_factura_id) && <a href={driveFileUrl(m.drive_factura_id)!} target="_blank" rel="noreferrer" className="text-[var(--fuego,#F26B1F)]">📄</a>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function TabKms({ partes }: { partes: ParteKm[] }) {
  if (partes.length === 0) return <p className="text-gray-500">Sin partes de km. El conductor introducirá uno cada lunes.</p>;
  return (
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
  );
}

function TabVisual({ revisiones }: { revisiones: RevisionVisual[] }) {
  if (revisiones.length === 0) return <p className="text-gray-500">Sin revisiones visuales. El conductor sube 5 fotos cada semana.</p>;
  return (
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
  );
}

function TabFotos({ fotos }: { fotos: FotoFurgo[] }) {
  if (fotos.length === 0) return <p className="text-gray-500">Sin fotos. El conductor puede subirlas desde su móvil.</p>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {fotos.map((f) => (
        <a key={f.id} href={`https://drive.google.com/file/d/${f.drive_file_id}/view`} target="_blank" rel="noreferrer" className="relative">
          <img src={f.url_publica ?? driveThumb(f.drive_file_id)} alt={f.fecha ?? ''} className="w-full h-32 object-cover rounded-xl border border-[var(--arena,#EFE6D8)]" />
          {f.es_portada && <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-[var(--fuego,#F26B1F)] text-white font-bold">PORTADA</span>}
          <div className="text-xs text-gray-500 mt-1">{f.fecha} · {f.subida_por ?? ''}</div>
        </a>
      ))}
    </div>
  );
}

function TabIncidencias({ incidencias, fmtEur }: { incidencias: Incidencia[]; fmtEur: (n: number | null | undefined) => string }) {
  if (incidencias.length === 0) return <p className="text-gray-500">Sin multas ni siniestros.</p>;
  return (
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
                {driveFileUrl(i.drive_documento_id) && <a href={driveFileUrl(i.drive_documento_id)!} target="_blank" rel="noreferrer" className="text-[var(--fuego,#F26B1F)]">📄</a>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function TabDocs({ docs }: { docs: Documento[] }) {
  if (docs.length === 0) return <p className="text-gray-500">Sin documentación adicional.</p>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {docs.map((d) => (
        <a key={d.id} href={driveFileUrl(d.drive_file_id)!} target="_blank" rel="noreferrer" className="block">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[var(--marino,#16355C)]">{d.tipo}</div>
                <div className="text-xs text-gray-500">{d.descripcion ?? ''}</div>
              </div>
              <div className="text-[var(--fuego,#F26B1F)]">📄</div>
            </div>
            <div className="text-[11px] text-gray-400 mt-2">
              {d.fecha_documento && <>Doc: {d.fecha_documento}</>}{d.fecha_caducidad && <> · Caduca: {d.fecha_caducidad}</>}
            </div>
          </Card>
        </a>
      ))}
    </div>
  );
}

function TabConductor({ conductor }: { conductor: Conductor | null }) {
  if (!conductor) return <p className="text-gray-500">Sin ficha de conductor.</p>;
  return (
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
  );
}
