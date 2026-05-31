import { appendFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { findPkgRoot } from '~/lib/pkg-root.js';

export interface FetchResult {
  vehicleId: number;
  fileName: string;
  success: boolean;
  elapsed: number;
  data: unknown;
  error?: Error;
}

type FetchResolve = (result: FetchResult) => void;

class HttpError extends Error {
  constructor(
    readonly status: number,
    url: string,
  ) {
    super(`HTTP ${status} for ${url}`);
  }
}

export class TomatoApi {
  private readonly dataDir: string;
  private readonly apiKey: string;
  private readonly rateLimit: number;
  private readonly logPath: string;

  private lastRequestAt = 0;
  private draining = false;
  private readonly queue: Array<() => Promise<void>> = [];

  constructor(dataDir = './tomato/data', apiKey = '', rateLimit = 30) {
    this.dataDir = resolve(findPkgRoot(new URL(import.meta.url)), dataDir);
    this.apiKey = apiKey || process.env.TOMATO_API_KEY || '';
    this.rateLimit = rateLimit;
    this.logPath = join(this.dataDir, 'requests.log');
  }

  async fetchVehicleVisuals(vehicleId: number, forceUpdate = false): Promise<FetchResult> {
    const filename = 'index.json';
    const t0 = Date.now();
    if (!forceUpdate && (await this.hasData(vehicleId, filename))) {
      return { vehicleId, fileName: filename, success: true, elapsed: Date.now() - t0, data: await this.loadData(vehicleId, filename) };
    }

    return new Promise<FetchResult>((resolve) => {
      this.queue.push(() => this.runVehicleVisuals(vehicleId, filename, resolve));
      void this.drain();
    });
  }

  async fetchVehicleLoadouts(vehicleId: number, forceUpdate = false): Promise<FetchResult> {
    const filename = 'loadouts.json';
    const t0 = Date.now();
    if (!forceUpdate && (await this.hasData(vehicleId, filename))) {
      return { vehicleId, fileName: filename, success: true, elapsed: Date.now() - t0, data: await this.loadData(vehicleId, filename) };
    }

    return new Promise<FetchResult>((resolve) => {
      this.queue.push(() => this.runVehicleLoadouts(vehicleId, filename, resolve));
      void this.drain();
    });
  }

  async fetchVehicleProLoadouts(vehicleId: number, forceUpdate = false): Promise<FetchResult> {
    const filename = 'pro-loadouts.json';
    const t0 = Date.now();
    if (!forceUpdate && (await this.hasData(vehicleId, filename))) {
      return { vehicleId, fileName: filename, success: true, elapsed: Date.now() - t0, data: await this.loadData(vehicleId, filename) };
    }

    return new Promise<FetchResult>((resolve) => {
      this.queue.push(() => this.runVehicleProLoadouts(vehicleId, filename, resolve));
      void this.drain();
    });
  }

  private async runVehicleVisuals(vehicleId: number, filename: string, resolve: FetchResolve): Promise<void> {
    const t0 = Date.now();
    const url = `https://tomato.gg/wot/vehicles/visuals/${vehicleId}.json`;
    try {
      const data = await this.request(url);
      await this.saveResponse(vehicleId, filename, data);
      resolve({ vehicleId, fileName: filename, success: true, elapsed: Date.now() - t0, data });
    } catch (err) {
      resolve({ vehicleId, fileName: filename, success: false, elapsed: Date.now() - t0, data: undefined, error: err instanceof Error ? err : new Error(String(err)) });
    }
  }

  private async runVehicleLoadouts(vehicleId: number, filename: string, resolve: FetchResolve): Promise<void> {
    const t0 = Date.now();
    const url = `https://api.tomato.gg/api/tank/loadout-performance/${vehicleId}?cache=true`;
    try {
      const data = await this.request(url);
      await this.saveResponse(vehicleId, filename, data);
      resolve({ vehicleId, fileName: filename, success: true, elapsed: Date.now() - t0, data });
    } catch (err) {
      resolve({ vehicleId, fileName: filename, success: false, elapsed: Date.now() - t0, data: undefined, error: err instanceof Error ? err : new Error(String(err)) });
    }
  }

  private async runVehicleProLoadouts(vehicleId: number, filename: string, resolve: FetchResolve): Promise<void> {
    const t0 = Date.now();
    const url = `https://api.tomato.gg/api/tank/top-loadouts/${vehicleId}?cache=true`;
    try {
      const data = await this.request(url);
      await this.saveResponse(vehicleId, filename, data);
      resolve({ vehicleId, fileName: filename, success: true, elapsed: Date.now() - t0, data });
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) {
        await this.saveResponse(vehicleId, filename, null);
      }

      resolve({ vehicleId, fileName: filename, success: false, elapsed: Date.now() - t0, data: undefined, error: err instanceof Error ? err : new Error(String(err)) });
    }
  }

  private async request(url: string): Promise<unknown> {
    const response = await fetch(url, {
      headers: { 'x-api-key': this.apiKey },
      signal: AbortSignal.timeout(10_000),
    });
    await this.logRequest(url, response.status);
    if (!response.ok) {
      throw new HttpError(response.status, url);
    }

    return response.json();
  }

  private async drain(): Promise<void> {
    if (this.draining) {
      return;
    }

    this.draining = true;
    try {
      while (this.queue.length > 0) {
        await this.waitForRateLimit();
        this.lastRequestAt = Date.now();
        const task = this.queue.shift()!;
        await task();
      }
    } finally {
      this.draining = false;
    }
  }

  private async waitForRateLimit(): Promise<void> {
    const intervalMs = Math.ceil(60_000 / this.rateLimit);
    const last = await this.getLastRequestTime();
    const waitMs = last + intervalMs - Date.now();
    if (waitMs > 0) {
      await new Promise<void>((r) => setTimeout(r, waitMs));
    }
  }

  private async getLastRequestTime(): Promise<number> {
    let logMtime = 0;
    try {
      const s = await stat(this.logPath);
      logMtime = s.mtimeMs;
    } catch {
      // log file doesn't exist yet
    }

    return Math.max(this.lastRequestAt, logMtime);
  }

  private resolveFilePath(vehicleId: number, filename: string): string {
    return join(this.dataDir, String(vehicleId), filename);
  }

  async hasData(vehicleId: number, filename: string): Promise<boolean> {
    try {
      await stat(this.resolveFilePath(vehicleId, filename));

      return true;
    } catch {
      return false;
    }
  }

  async loadData(vehicleId: number, filename: string): Promise<unknown> {
    const content = await readFile(this.resolveFilePath(vehicleId, filename), 'utf-8');

    return JSON.parse(content) as unknown;
  }

  private async saveResponse(vehicleId: number, filename: string, data: unknown): Promise<void> {
    const filePath = this.resolveFilePath(vehicleId, filename);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(data, null, 2));
  }

  private async logRequest(url: string, status: number): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
    await appendFile(this.logPath, `${new Date().toISOString()} ${url} ${status}\n`);
  }
}
