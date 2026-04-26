import type { Furgoneta } from '../../lib/flota/queries';

export default function FurgonetaCard({
  furgoneta,
  costeMes,
  combustibleMes,
  onClick,
}: {
  furgoneta: Furgoneta;
  costeMes: number;
  combustibleMes: number;
  onClick: () => void;
}) {
  const fmtEur = (n: number) =>
    n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  const estadoColor =
    furgoneta.estado === 'OPERATIVA'
      ? 'bg-emerald-100 text-emerald-700'
      : furgoneta.estado === 'EN_REVISION'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-rose-100 text-rose-700';

  return (
    <button
      onClick={onClick}
      className="text-left p-5 bg-white rounded-2xl border border-[var(--arena)] hover:border-[var(--fuego)] transition-all shadow-sm hover:shadow-md"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-lg font-bold text-[var(--marino)]">
            {furgoneta.conductor} · {furgoneta.matricula}
          </div>
          <div className="text-sm text-gray-500">
            {furgoneta.modelo} · {furgoneta.ruta ?? '—'}
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${estadoColor}`}>
          {furgoneta.estado}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-[11px] text-gray-400 uppercase">Coste mes</div>
          <div className="font-bold text-[var(--fuego)]">{fmtEur(costeMes)}</div>
        </div>
        <div>
          <div className="text-[11px] text-gray-400 uppercase">Combustible mes</div>
          <div className="font-semibold text-[var(--marino)]">{fmtEur(combustibleMes)}</div>
        </div>
        <div>
          <div className="text-[11px] text-gray-400 uppercase">ITV próxima</div>
          <div className="text-[var(--marino)]">{furgoneta.itv_fecha ?? '—'}</div>
        </div>
        <div>
          <div className="text-[11px] text-gray-400 uppercase">Seguro vence</div>
          <div className="text-[var(--marino)]">{furgoneta.seguro_fecha_vencimiento ?? '—'}</div>
        </div>
      </div>

      <div className="mt-3 text-xs text-[var(--fuego)] font-semibold">Ver ficha completa →</div>
    </button>
  );
}
