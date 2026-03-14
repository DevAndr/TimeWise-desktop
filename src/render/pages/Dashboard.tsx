import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { RefreshCw, Settings, Clock, AppWindow, Monitor, Loader2, BarChart3 } from "lucide-react";

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
  percent: number;
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd",
  "#818cf8", "#7c3aed", "#5b21b6", "#4f46e5",
  "#4338ca", "#3730a3",
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
  const entries = Array.from(map.entries());
  const totalMs = entries.reduce((sum, [, d]) => sum + d.totalMs, 0);
  return entries
    .map(([appName, data]) => ({
      appName,
      totalMs: data.totalMs,
      totalMin: Math.round(data.totalMs / 60_000),
      sessions: data.sessions,
      percent: totalMs > 0 ? Math.round((data.totalMs / totalMs) * 100) : 0,
    }))
    .sort((a, b) => b.totalMs - a.totalMs);
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: AppStat }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-gray-900/95 backdrop-blur-sm text-white px-4 py-3 rounded-xl text-sm shadow-2xl border border-gray-700/50">
      <p className="font-semibold text-base">{data.appName}</p>
      <div className="flex items-center gap-3 mt-1 text-gray-300">
        <span>{formatDuration(data.totalMs)}</span>
        <span className="text-gray-600">|</span>
        <span>{data.sessions} сессий</span>
        <span className="text-gray-600">|</span>
        <span>{data.percent}%</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus(null);
    const result = await window.electronAPI.syncNow();
    setSyncing(false);
    if (result.error) {
      setSyncStatus(`${result.error}`);
    } else {
      setSyncStatus(`${result.synced} сессий`);
    }
    setTimeout(() => setSyncStatus(null), 3000);
  };

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
      <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-gray-500 gap-3">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
        <span className="text-sm">Загрузка данных...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-md border-b border-gray-800/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Clock size={16} className="text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">TimeWise</h1>
          </div>
          <div className="flex items-center gap-2">
            {syncStatus && (
              <span className="text-xs text-gray-500 mr-1">{syncStatus}</span>
            )}
            <button
              onClick={() => navigate("/analytics")}
              className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800/80 transition-all cursor-pointer"
              title="Аналитика"
            >
              <BarChart3 size={16} />
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800/80 transition-all cursor-pointer disabled:opacity-50"
              title="Синхронизировать"
            >
              <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800/80 transition-all cursor-pointer"
              title="Настройки"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={<Clock size={18} className="text-indigo-400" />}
            label="Время сегодня"
            value={formatDuration(totalTodayMs)}
            accent="indigo"
          />
          <StatCard
            icon={<AppWindow size={18} className="text-violet-400" />}
            label="Приложений"
            value={String(todayStats.length)}
            accent="violet"
          />
          <StatCard
            icon={<Monitor size={18} className="text-purple-400" />}
            label="Текущая сессия"
            value={formatDuration(totalCurrentMs)}
            accent="purple"
          />
        </div>

        {/* Bar chart */}
        <section className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-5">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
            Активность по приложениям
          </h2>
          {todayStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-600">
              <Monitor size={32} className="mb-3 text-gray-700" />
              <p className="text-sm">Трекер собирает данные...</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={todayStats} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `${v}м`}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="appName"
                    width={100}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#d1d5db", fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.08)" }} />
                  <Bar dataKey="totalMin" radius={[0, 6, 6, 0]} barSize={20}>
                    {todayStats.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* App breakdown list */}
        {todayStats.length > 0 && (
          <section className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-5">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
              Распределение
            </h2>
            <div className="space-y-3">
              {todayStats.map((stat, i) => (
                <div key={stat.appName} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-gray-200">{stat.appName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{formatDuration(stat.totalMs)}</span>
                      <span className="tabular-nums w-8 text-right">{stat.percent}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${stat.percent}%`,
                        backgroundColor: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Session history table */}
        <section className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-5">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
            История сессий
          </h2>
          {allSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-600">
              <p className="text-sm">Сессии ещё не записаны</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-72 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-2.5 font-medium">Приложение</th>
                    <th className="text-left px-4 py-2.5 font-medium">Заголовок</th>
                    <th className="text-right px-4 py-2.5 font-medium">Время</th>
                    <th className="text-right px-4 py-2.5 font-medium">Начало</th>
                  </tr>
                </thead>
                <tbody>
                  {[...allSessions].reverse().map((s, i) => (
                    <tr
                      key={i}
                      className="border-t border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-200">{s.appName}</td>
                      <td className="px-4 py-2.5 text-gray-500 truncate max-w-[200px]">
                        {s.windowTitle}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-gray-300">
                        {formatDuration(s.duration)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">
                        {new Date(s.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "indigo" | "violet" | "purple";
}) {
  const gradients = {
    indigo: "from-indigo-500/10 to-transparent",
    violet: "from-violet-500/10 to-transparent",
    purple: "from-purple-500/10 to-transparent",
  };
  return (
    <div className={`relative overflow-hidden bg-gray-900/50 rounded-2xl p-5 border border-gray-800/50`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradients[accent]} pointer-events-none`} />
      <div className="relative">
        <div className="mb-3">{icon}</div>
        <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  );
}
