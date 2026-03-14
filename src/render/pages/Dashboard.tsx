import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Session {
  appName: string;
  windowTitle: string;
  startTime: number;
  endTime: number;
  duration: number;
}

interface AppStat {
  appName: string;
  totalMs: number;
  totalMin: number;
  sessions: number;
}

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
}

function aggregateByApp(sessions: Session[]): AppStat[] {
  const map = new Map<string, { totalMs: number; sessions: number }>();
  for (const s of sessions) {
    const existing = map.get(s.appName);
    if (existing) {
      existing.totalMs += s.duration;
      existing.sessions += 1;
    } else {
      map.set(s.appName, { totalMs: s.duration, sessions: 1 });
    }
  }
  return Array.from(map.entries())
    .map(([appName, data]) => ({
      appName,
      totalMs: data.totalMs,
      totalMin: Math.round(data.totalMs / 60_000),
      sessions: data.sessions,
    }))
    .sort((a, b) => b.totalMs - a.totalMs);
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: AppStat }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm shadow-lg">
      <p className="font-semibold">{data.appName}</p>
      <p>{formatDuration(data.totalMs)}</p>
      <p className="text-gray-400">{data.sessions} сессий</p>
    </div>
  );
}

export default function Dashboard() {
  const { data: todaySessions = [], isLoading: loadingToday } = useQuery<Session[]>({
    queryKey: ["today-sessions"],
    queryFn: () => window.electronAPI.getTodaySessions(),
    refetchInterval: 5_000,
  });

  const { data: allSessions = [], isLoading: loadingAll } = useQuery<Session[]>({
    queryKey: ["all-sessions"],
    queryFn: () => window.electronAPI.getSessions(),
    refetchInterval: 5_000,
  });

  const todayStats = aggregateByApp(todaySessions);
  const currentStats = aggregateByApp(allSessions);

  const totalTodayMs = todayStats.reduce((sum, s) => sum + s.totalMs, 0);
  const totalCurrentMs = currentStats.reduce((sum, s) => sum + s.totalMs, 0);

  const isLoading = loadingToday || loadingAll;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">TimeWise</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Общее время сегодня" value={formatDuration(totalTodayMs)} />
        <StatCard label="Приложений сегодня" value={String(todayStats.length)} />
        <StatCard label="Текущая сессия" value={formatDuration(totalCurrentMs)} />
      </div>

      {/* Bar chart */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Активность по приложениям (сегодня)</h2>
        {todayStats.length === 0 ? (
          <p className="text-gray-500">Нет данных — трекер собирает информацию...</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={todayStats} layout="vertical" margin={{ left: 100 }}>
                <XAxis type="number" tickFormatter={(v) => `${v} мин`} />
                <YAxis type="category" dataKey="appName" width={90} tick={{ fill: "#9ca3af", fontSize: 13 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                <Bar dataKey="totalMin" radius={[0, 4, 4, 0]}>
                  {todayStats.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Detailed table */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Детали сессий</h2>
        {allSessions.length === 0 ? (
          <p className="text-gray-500">Сессии ещё не записаны</p>
        ) : (
          <div className="overflow-auto max-h-80 rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2">Приложение</th>
                  <th className="text-left px-4 py-2">Заголовок окна</th>
                  <th className="text-right px-4 py-2">Длительность</th>
                  <th className="text-right px-4 py-2">Начало</th>
                </tr>
              </thead>
              <tbody>
                {[...allSessions].reverse().map((s, i) => (
                  <tr key={i} className="border-t border-gray-800 hover:bg-gray-900/50">
                    <td className="px-4 py-2 font-medium">{s.appName}</td>
                    <td className="px-4 py-2 text-gray-400 truncate max-w-xs">{s.windowTitle}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatDuration(s.duration)}</td>
                    <td className="px-4 py-2 text-right text-gray-400 tabular-nums">
                      {new Date(s.startTime).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
