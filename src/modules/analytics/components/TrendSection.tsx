import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Section } from "@/design-system";
import type { AnalyticsResult } from "../types";

export function TrendSection({ data }: { data: AnalyticsResult }) {
  const chart = useMemo(
    () =>
      data.trend.map((p) => ({
        date: p.date.slice(5),
        criadas: p.criadas,
        concluidas: p.concluidas,
        backlog: p.backlog,
      })),
    [data.trend],
  );

  return (
    <Section title="Tendência operacional" description="Volume diário, backlog acumulado e conclusões.">
      <Card>
        <CardHeader>
          <CardTitle className="ds-card-title">Volume diário</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer>
            <AreaChart data={chart} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="fillBacklog" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="backlog"
                name="Backlog"
                stroke="hsl(var(--info))"
                fill="url(#fillBacklog)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="criadas"
                name="Criadas"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="concluidas"
                name="Concluídas"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Section>
  );
}
