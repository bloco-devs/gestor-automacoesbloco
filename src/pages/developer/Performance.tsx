import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { DeveloperShell } from "@/modules/developer-center/DeveloperShell";
import { StatCard } from "@/design-system/patterns/StatCard";
import { collectPerformance } from "@/modules/platform-health";

interface FpsSample { t: number; fps: number }

export default function PerformanceLab() {
  const [fps, setFps] = useState(0);
  const [samples, setSamples] = useState<FpsSample[]>([]);
  const perf = collectPerformance();
  const memory = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  const raf = useRef<number | null>(null);
  const last = useRef<number>(performance.now());
  const frames = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    function loop() {
      frames.current += 1;
      const now = performance.now();
      if (now - last.current >= 1000) {
        const value = Math.round((frames.current * 1000) / (now - last.current));
        setFps(value);
        setSamples((s) => [...s.slice(-59), { t: now, fps: value }]);
        frames.current = 0;
        last.current = now;
      }
      if (!cancelled) raf.current = requestAnimationFrame(loop);
    }
    raf.current = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const heap = memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : null;
  const heapLimit = memory ? Math.round(memory.jsHeapSizeLimit / 1024 / 1024) : null;

  return (
    <DeveloperShell title="Performance Lab" description="FPS ao vivo, memória JS, e métricas do Platform Health.">
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="FPS" value={fps} tone={fps >= 55 ? "success" : fps >= 30 ? "warning" : "danger"} />
        <StatCard label="Heap (MB)" value={heap ?? "—"} />
        <StatCard label="Heap limite (MB)" value={heapLimit ?? "—"} />
        <StatCard label="Amostras" value={samples.length} />
      </section>
      <Card className="p-4">
        <h2 className="ds-h3 mb-3">Platform Health · métricas</h2>
        <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[40vh]">{JSON.stringify(perf, null, 2)}</pre>
      </Card>
    </DeveloperShell>
  );
}
