import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Save, Check, Globe, Key } from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();
  const [apiUrl, setApiUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [browserToken, setBrowserToken] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.electronAPI.getSyncConfig().then((config) => {
      setApiUrl(config.apiUrl);
      setApiToken(config.apiToken);
      setBrowserToken(config.browserToken);
    });
  }, []);

  const handleSave = async () => {
    await window.electronAPI.setSyncConfig({ apiUrl, apiToken, browserToken });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-md border-b border-gray-800/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800/80 transition-all cursor-pointer"
            title="Назад"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-xl font-semibold tracking-tight">Настройки</h1>
        </div>
      </header>

      <main className="px-6 py-6">
        <div className="max-w-lg">
          <section className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-6 space-y-5">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Синхронизация
            </h2>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <Globe size={14} />
                API URL
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:3031"
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <Key size={14} />
                API Token (приложения)
              </label>
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Токен для приложений"
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <Key size={14} />
                Browser Token (браузер)
              </label>
              <input
                type="password"
                value={browserToken}
                onChange={(e) => setBrowserToken(e.target.value)}
                placeholder="Токен для браузера"
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all"
              />
            </div>

            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                saved
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {saved ? <Check size={15} /> : <Save size={15} />}
              {saved ? "Сохранено" : "Сохранить"}
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
