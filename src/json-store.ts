import { app } from "electron";
import path from "node:path";
import fs from "node:fs";

/**
 * Simple JSON file store that works in CJS context.
 * Files are stored in the app's userData directory.
 * Path resolution is deferred until first access (after app.ready).
 */
export class JsonStore<T extends Record<string, unknown>> {
  private name: string;
  private defaults: T;
  private _filePath: string | null = null;

  constructor(name: string, defaults: T) {
    this.name = name;
    this.defaults = defaults;
  }

  private get filePath(): string {
    if (!this._filePath) {
      const userDataPath = app.getPath("userData");
      this._filePath = path.join(userDataPath, `${this.name}.json`);
    }
    return this._filePath;
  }

  private readAll(): T {
    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      return { ...this.defaults, ...JSON.parse(raw) };
    } catch {
      return { ...this.defaults };
    }
  }

  private writeAll(data: T): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.readAll()[key];
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    const data = this.readAll();
    data[key] = value;
    this.writeAll(data);
  }
}
