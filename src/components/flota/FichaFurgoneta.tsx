import { useEffect, useState } from 'react';
import {
  type Furgoneta,
  type SeguroFurgo,
  type ItvFurgo,
  type FotoFurgo,
  type Conductor,
  getSeguro,
  getItv,
  getFotos,
  getConductor,
  driveFileUrl,
} from '../../lib/flota/queries';

type Tab = 'seguro' | 'itv' | 'conductor' | 'fotos';

export default function FichaFurgoneta({
  furgoneta,
  combustibleMes,
  onVolver,
}: {
  furgoneta: Furgoneta;
  combustibleMes: number;
  onVolver: () => void;
}) {
  const [tab, setTab] = useState<Tab>('seguro');
  const [seguro, setSeguro] = useState<SeguroFurgo | null>(null);
  const [itv, setItv] = useState<ItvFurgo | null>(null);
  const [fotos, setFotos] = useState<FotoFurgo[]>([]);
  const [conductor, setConductor] = useState<Conductor | null>(null);

  useEffect(() => {
    (async () => {
      const [s, i, f] = await Promise.all([
        getSeguro(furgoneta.id),
        getItv(furgoneta.id),
        getFotos(furgoneta.id),
      ]);
      setSeguro(s);
      setItv(i);
      setFotos(f);
      if (furgoneta.conductor_id) {
        setConductor(await getConductor(furgoneta.conductor_id));
      }
    })();
  }, [furgoneta.id, furgoneta.conductor_id]);

  const fmtEur = (n: number | null | undefined) =>
    n == null ? '—' : Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const portada = fotos.find((f) => f.es_portada) ?? fotos[0];

  return (
    <div className="p-6 space-y-5">
      <button onClick={onVolver} className="text-sm text-[var(--fuego)] font-semibold">
        ← Volver a flota
      </button>

      <div className="flex items-start gap-4">
        {portada && (
          <img
            src={portada.url_publica ?? `https://drive.google.com/thumbnail?id=${portada.drive_file_id}&sz=w400`}
            alt={furgoneta.matricula}
            className="w-40 h-28 object-cover rounded-xl border border-[var(--arena)]"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold text-[var(--marino)]">
            {furgoneta.conductor} · {furgoneta.matricula}
          </h1>
          <p className="text-gray-500">
            {furgoneta.modelo} · {furgoneta.ruta ?? '—'} · {furgoneta.estado}
          </p>
          <p className="text-xs text-gray-400 mt-1">Combustible mes: {fmtEur(combustibleMes)}</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-[var(--arena)]">
        {[
          ['seguro', 'Seguro'],
          ['itv', 'ITV'],
          ['conductor', 'Conductor'],
          ['fotos', `Fotos (${fotos.length})`],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k as Tab)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === k
                ? 'border-[var(--fuego)] text-[var(--fuego)]'
                : 'border-transparent text-gray-500 hover:text-[var(--marino)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'seguro' && (
        <TabSeguro seguro={seguro} fmtEur={fmtEur} />
      )}
      {tab === 'itv' && <TabItv itv={itv} />}
      {tab === 'conductor' && <TabConductor conductor={conductor} />}
      {tab === 'fotos' && <TabFotos fotos={fotos} />}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase text-gray-400 tracking-wide">{label}</div>
      <div className="text-sm text-[var(--marino)]">{value ?? '—'}</div>
    </div>
  );
}

function TabSeguro({
  seguro,
  fmtEur,
}: {
  seguro: SeguroFurgo | null;
  fmtEur: (n: number | null | undefined) => string;
}) {
  if (!seguro) return <div className="text-gray-500">Sin seguro registrado.</div>;
  const pdfs = [
    ['Póliza', seguro.drive_poliza_id],
    ['Condicionado', seguro.drive_condicionado_id],
    ['Último recibo', seguro.drive_recibo_id],
  ] as const;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-[var(--arena)]">
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

      <div>
        <div className="text-sm font-semibold text-[var(--marino)] mb-2">Documentos</div>
        <div className="flex gap-2 flex-wrap">
          {pdfs.map(([label, id]) => {
            const url = driveFileUrl(id);
            if (!url) return (
              <span key={label} className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-400">
                {label} (sin subir)
              </span>
            );
            return (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 text-sm rounded-lg bg-[var(--fuego)] text-white font-semibold hover:opacity-90"
              >
                📄 {label}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TabItv({ itv }: { itv: ItvFurgo | null }) {
  if (!itv) return <div className="text-gray-500">Sin ITV registrada.</div>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-[var(--arena)]">
        <Field label="Estación" value={itv.estacion} />
        <Field label="Tel. estación" value={itv.estacion_tel} />
        <Field label="Última fecha" value={itv.ultima_fecha} />
        <Field label="Km en última" value={itv.ultima_km} />
        <Field label="Resultado" value={itv.ultima_resultado} />
        <Field label="Próxima fecha" value={itv.proxima_fecha} />
      </div>
      {driveFileUrl(itv.drive_informe_id) && (
        <a
          href={driveFileUrl(itv.drive_informe_id)!}
          target="_blank"
          rel="noreferrer"
          className="inline-block px-3 py-2 text-sm rounded-lg bg-[var(--fuego)] text-white font-semibold"
        >
          📄 Último informe ITV
        </a>
      )}
    </div>
  );
}

function TabConductor({ conductor }: { conductor: Conductor | null }) {
  if (!conductor) return <div className="text-gray-500">Sin ficha de conductor.</div>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-[var(--arena)]">
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
  );
}

function TabFotos({ fotos }: { fotos: FotoFurgo[] }) {
  if (fotos.length === 0)
    return <div className="text-gray-500">Sin fotos. El conductor puede subirlas desde su móvil.</div>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {fotos.map((f) => (
        <a
          key={f.id}
          href={`https://drive.google.com/file/d/${f.drive_file_id}/view`}
          target="_blank"
          rel="noreferrer"
          className="relative group"
        >
          <img
            src={f.url_publica ?? `https://drive.google.com/thumbnail?id=${f.drive_file_id}&sz=w400`}
            alt={f.fecha ?? ''}
            className="w-full h-32 object-cover rounded-xl border border-[var(--arena)]"
          />
          {f.es_portada && (
            <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-[var(--fuego)] text-white font-bold">
              PORTADA
            </span>
          )}
          <div className="text-xs text-gray-500 mt-1">{f.fecha} · {f.subida_por ?? ''}</div>
        </a>
      ))}
    </div>
  );
}
