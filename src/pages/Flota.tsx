import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getFurgonetas,
  getCosteFlotaMes,
  costeMensualFurgo,
  type Furgoneta,
  type CosteFlota,
} from '../lib/flota/queries';
import FurgonetaCard from '../components/flota/FurgonetaCard';

export default function Flota() {
  const navigate = useNavigate();
  const [furgos, setFurgos] = useState<Furgoneta[]>([]);
  const [costes, setCostes] = useState<CosteFlota | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [fs, cs] = await Promise.all([getFurgonetas(), getCosteFlotaMes()]);
        setFurgos(fs);
        setCostes(cs);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-8 text-[var(--marino,#16355C)]">Cargando flota…</div>;

  const fmtEur = (n: number) =>
    n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  const operativas = furgos.filter((f) => f.estado === 'OPERATIVA').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--marino,#16355C)]">Flota</h1>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Coste flota mes" value={fmtEur(costes?.costeTotal ?? 0)} highlight />
        <Kpi label="Combustible mes" value={fmtEur(costes?.combustibleTotal ?? 0)} />
        <Kpi label="Préstamos mes" value={fmtEur(costes?.prestamoTotal ?? 0)} />
        <Kpi label="Operativas" value={`${operativas} / ${furgos.length}`} />
      </div>

      {/* Mini cards furgo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {furgos.map((f) => (
          <FurgonetaCard
            key={f.id}
            furgoneta={f}
            costeMes={costeMensualFurgo(f, costes?.combustiblePorFurgo[f.id] ?? 0)}
            combustibleMes={costes?.combustiblePorFurgo[f.id] ?? 0}
            onClick={() => navigate(`/flota/${f.codigo}`)}
          />
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-[var(--arena,#EFE6D8)] shadow-sm">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-2xl font-bold ${highlight ? 'text-[var(--fuego,#F26B1F)]' : 'text-[var(--marino,#16355C)]'}`}>
        {value}
      </div>
    </div>
  );
}
