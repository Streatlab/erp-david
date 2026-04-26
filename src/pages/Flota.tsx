import { useEffect, useState } from 'react';
import {
  getFurgonetas,
  getCosteFlotaMes,
  costeMensualFurgo,
  type Furgoneta,
  type CosteFlota,
} from '../lib/flota/queries';
import FurgonetaCard from '../components/flota/FurgonetaCard';
import FichaFurgoneta from '../components/flota/FichaFurgoneta';

export default function Flota() {
  const [furgos, setFurgos] = useState<Furgoneta[]>([]);
  const [costes, setCostes] = useState<CosteFlota | null>(null);
  const [seleccionada, setSeleccionada] = useState<Furgoneta | null>(null);
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

  if (loading) {
    return <div className="p-8 text-[var(--marino)]">Cargando flota…</div>;
  }

  if (seleccionada) {
    return (
      <FichaFurgoneta
        furgoneta={seleccionada}
        combustibleMes={costes?.combustiblePorFurgo[seleccionada.id] ?? 0}
        onVolver={() => setSeleccionada(null)}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--marino)]">Flota</h1>
        <div className="text-right">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Coste flota mes</div>
          <div className="text-2xl font-bold text-[var(--fuego)]">
            {(costes?.costeTotal ?? 0).toLocaleString('es-ES', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            })}
          </div>
          <div className="text-[11px] text-gray-400">
            Combustible {(costes?.combustibleTotal ?? 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
            {' · '}Préstamos {(costes?.prestamoTotal ?? 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
            {' · '}Seguros {(costes?.seguroTotal ?? 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {furgos.map((f) => (
          <FurgonetaCard
            key={f.id}
            furgoneta={f}
            costeMes={costeMensualFurgo(f, costes?.combustiblePorFurgo[f.id] ?? 0)}
            combustibleMes={costes?.combustiblePorFurgo[f.id] ?? 0}
            onClick={() => setSeleccionada(f)}
          />
        ))}
      </div>
    </div>
  );
}
