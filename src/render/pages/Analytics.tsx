import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  CartesianGrid, Area, AreaChart,
  PieChart, Pie,
} from "recharts";
import { ArrowLeft, Loader2, Calendar } from "lucide-react";

// --- API response types ---
interface TimelineItem {
  period: string;
  totalDuration: number;
  count: number;
}

interface HourlyItem {
  hour: number;
  totalDuration: number;
  count: number;
}

interface TopItem {
  appName?: string;
  domain?: string;
  totalDuration: number;
  count: number;
}

interface DailyCompareItem {
  date: string;
  browserDuration: number;
  appDuration: number;
}

// --- Helpers ---
const COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
];

function formatMs(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

function formatMsShort(ms: number): string {
  const m = Math.round(ms / 60_000);
  if (m >= 60) return `${Math.round(m / 60)}ч`;
  return `${m}м`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function useAnalytics<T>(path: string, from: string, to: string) {
  const fullPath = `${path}${path.includes("?") ? "&" : "?"}from=${from}&to=${to}`;
  return useQuery<T>({
    queryKey: ["analytics", fullPath],
    queryFn: async () => {
      const res = await window.electronAPI.apiFetch<T>(fullPath);
      if (res.error) throw new Error(res.error);
      return res.data as T;
    },
    staleTime: 30_000,
  });
}

// --- Date range presets ---
type RangeKey = "7d" | "14d" | "30d";
const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "7d", label: "7 дней", days: 7 },
  { key: "14d", label: "14 дней", days: 14 },
  { key: "30d", label: "30 дней", days: 30 },
];

function getRange(days: number) {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

// --- Custom tooltips ---
function ChartTooltip({ active, payload, label, formatter }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  formatter?: (label: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900/95 backdrop-blur-sm text-white px-4 py-3 rounded-xl text-sm shadow-2xl border border-gray-700/50">
      <p className="text-gray-400 text-xs mb-1">{formatter ? formatter(String(label)) : label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span>{formatMs(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: TopItem & { name: string; percent: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-900/95 backdrop-blur-sm text-white px-4 py-3 rounded-xl text-sm shadow-2xl border border-gray-700/50">
      <p className="font-semibold">{d.name}</p>
      <p className="text-gray-300">{formatMs(d.totalDuration)}</p>
      <p className="text-gray-500">{d.count} сессий</p>
    </div>
  );
}

// --- Section wrapper ---
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-5">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-gray-600 text-sm">{text}</div>
  );
}

// --- Main component ---
export default function Analytics() {
  const navigate = useNavigate();
  const [rangeKey, setRangeKey] = useState<RangeKey>("7d");
  const days = RANGES.find((r) => r.key === rangeKey)!.days;
  const { from, to } = getRange(days);

  const { data: appsTimeline, isLoading: l1 } = useAnalytics<TimelineItem[]>("/analytics/apps/timeline?interval=day", from, to);
  const { data: browserTimeline, isLoading: l2 } = useAnalytics<TimelineItem[]>("/analytics/browser/timeline?interval=day", from, to);
  const { data: appsHourly, isLoading: l3 } = useAnalytics<HourlyItem[]>("/analytics/apps/hourly", from, to);
  const { data: browserHourly, isLoading: l4 } = useAnalytics<HourlyItem[]>("/analytics/browser/hourly", from, to);
  const { data: topApps, isLoading: l5 } = useAnalytics<TopItem[]>("/analytics/top-apps?limit=10", from, to);
  const { data: topDomains, isLoading: l6 } = useAnalytics<TopItem[]>("/analytics/top-domains?limit=10", from, to);
  const { data: dailyCompare, isLoading: l7 } = useAnalytics<DailyCompareItem[]>("/analytics/daily-compare", from, to);

  const isLoading = l1 || l2 || l3 || l4 || l5 || l6 || l7;

  // Merge hourly data
  const hourlyMerged = Array.from({ length: 24 }, (_, h) => {
    const app = appsHourly?.find((x) => x.hour === h);
    const browser = browserHourly?.find((x) => x.hour === h);
    return {
      hour: `${String(h).padStart(2, "0")}:00`,
      apps: app?.totalDuration ?? 0,
      browser: browser?.totalDuration ?? 0,
    };
  });

  // Prepare pie data
  const topAppsPie = (topApps ?? []).map((t) => ({ ...t, name: t.appName ?? "Unknown" }));
  const topDomainsPie = (topDomains ?? []).map((t) => ({ ...t, name: t.domain ?? "Unknown" }));

  // Daily compare formatted
  const compareData = (dailyCompare ?? []).map((d) => ({
    ...d,
    date: formatDate(d.date),
    browserMin: Math.round(d.browserDuration / 60_000),
    appMin: Math.round(d.appDuration / 60_000),
  }));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-md border-b border-gray-800/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800/80 transition-all cursor-pointer"
              title="Назад"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-xl font-semibold tracking-tight">Аналитика</h1>
          </div>

          {/* Date range selector */}
          <div className="flex items-center gap-1 bg-gray-900/80 rounded-xl p-1 border border-gray-800/50">
            <Calendar size={14} className="text-gray-500 ml-2 mr-1" />
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRangeKey(r.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  rangeKey === r.key
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500 gap-3">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
          <span className="text-sm">Загрузка аналитики...</span>
        </div>
      ) : (
        <main className="px-6 py-6 space-y-6">
          {/* Row 1: Browser vs Apps comparison */}
          <Section title="Браузер vs Приложения по дням">
            {compareData.length === 0 ? (
              <EmptyState text="Нет данных за выбранный период" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compareData} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} tickFormatter={(v) => `${v}м`} />
                    <Tooltip content={<ChartTooltip formatter={String} />} />
                    <Bar dataKey="browserMin" name="Браузер" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar dataKey="appMin" name="Приложения" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>

          {/* Row 2: Timelines */}
          <div className="grid grid-cols-2 gap-6">
            <Section title="Активность приложений">
              {!appsTimeline?.length ? (
                <EmptyState text="Нет данных" />
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={appsTimeline.map((t) => ({ ...t, date: formatDate(t.period), min: Math.round(t.totalDuration / 60_000) }))}>
                      <defs>
                        <linearGradient id="gradApps" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v) => `${v}м`} />
                      <Tooltip content={<ChartTooltip formatter={String} />} />
                      <Area type="monotone" dataKey="min" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradApps)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Section>

            <Section title="Активность браузера">
              {!browserTimeline?.length ? (
                <EmptyState text="Нет данных" />
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={browserTimeline.map((t) => ({ ...t, date: formatDate(t.period), min: Math.round(t.totalDuration / 60_000) }))}>
                      <defs>
                        <linearGradient id="gradBrowser" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v) => `${v}м`} />
                      <Tooltip content={<ChartTooltip formatter={String} />} />
                      <Area type="monotone" dataKey="min" stroke="#6366f1" strokeWidth={2} fill="url(#gradBrowser)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Section>
          </div>

          {/* Row 3: Hourly heatmap */}
          <Section title="Распределение по часам (0-23)">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyMerged} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} interval={1} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} tickFormatter={(v) => formatMsShort(v)} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-gray-900/95 backdrop-blur-sm text-white px-4 py-3 rounded-xl text-sm shadow-2xl border border-gray-700/50">
                          <p className="text-gray-400 text-xs mb-1">{label}</p>
                          {payload.map((p, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: String(p.color) }} />
                              <span className="text-gray-400 text-xs">{String(p.name)}:</span>
                              <span>{formatMs(Number(p.value))}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="apps" name="Приложения" fill="#8b5cf6" radius={[2, 2, 0, 0]} stackId="stack" />
                  <Bar dataKey="browser" name="Браузер" fill="#6366f1" radius={[2, 2, 0, 0]} stackId="stack" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Row 4: Top apps & domains */}
          <div className="grid grid-cols-2 gap-6">
            <Section title="Топ приложений">
              {!topAppsPie.length ? (
                <EmptyState text="Нет данных" />
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-44 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topAppsPie}
                          dataKey="totalDuration"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={70}
                          paddingAngle={2}
                          strokeWidth={0}
                        >
                          {topAppsPie.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    {topAppsPie.slice(0, 6).map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-300 truncate">{item.name}</span>
                        <span className="text-gray-600 ml-auto shrink-0 tabular-nums">{formatMs(item.totalDuration)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            <Section title="Топ сайтов">
              {!topDomainsPie.length ? (
                <EmptyState text="Нет данных" />
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-44 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topDomainsPie}
                          dataKey="totalDuration"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={70}
                          paddingAngle={2}
                          strokeWidth={0}
                        >
                          {topDomainsPie.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    {topDomainsPie.slice(0, 6).map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-300 truncate">{item.name}</span>
                        <span className="text-gray-600 ml-auto shrink-0 tabular-nums">{formatMs(item.totalDuration)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          </div>
        </main>
      )}
    </div>
  );
}
