import * as fs from 'fs';
import * as path from 'path';
import { ServiceConfig, FunctionConfig, EventConfig, HttpEventConfig, CronEventConfig, QueueEventConfig } from './types';

export class ConfigParser {
  parse(configPath: string): ServiceConfig {
    const resolvedPath = path.resolve(configPath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Configuration file not found: ${resolvedPath}`);
    }

    const content = fs.readFileSync(resolvedPath, 'utf-8');
    const raw = this.parseYamlSimple(content);

    return this.buildServiceConfig(raw);
  }

  private buildServiceConfig(raw: Record<string, unknown>): ServiceConfig {
    const provider = raw.provider as Record<string, unknown> ?? {};
    const stage = this.interpolate(String(provider.stage ?? 'dev'), raw);
    const region = this.interpolate(String(provider.region ?? 'us-east-1'), raw);

    const functionsRaw = raw.functions as Record<string, Record<string, unknown>> ?? {};
    const functions: FunctionConfig[] = [];

    for (const [name, funcDef] of Object.entries(functionsRaw)) {
      functions.push(this.parseFunctionConfig(name, funcDef, provider));
    }

    const resourcesRaw = raw.resources as Record<string, Record<string, unknown>>[] ?? [];
    const resources = Array.isArray(resourcesRaw)
      ? resourcesRaw.map((r) => ({
          name: String(r.name ?? ''),
          type: String(r.type ?? ''),
          properties: (r.properties as Record<string, unknown>) ?? {},
        }))
      : [];

    return {
      service: String(raw.service ?? 'unnamed-service'),
      provider: {
        name: String(provider.name ?? 'aws'),
        runtime: String(provider.runtime ?? 'nodejs18.x'),
        region,
        stage,
        memorySize: Number(provider.memorySize ?? 256),
        timeout: Number(provider.timeout ?? 30),
        environment: (provider.environment as Record<string, string>) ?? {},
      },
      functions,
      resources,
      plugins: (raw.plugins as string[]) ?? [],
      custom: (raw.custom as Record<string, unknown>) ?? {},
    };
  }

  private parseFunctionConfig(
    name: string,
    raw: Record<string, unknown>,
    providerDefaults: Record<string, unknown>
  ): FunctionConfig {
    const events = this.parseEvents(raw.events as unknown[] ?? []);

    return {
      name,
      handler: String(raw.handler ?? `src/handlers/${name}.handler`),
      runtime: String(raw.runtime ?? providerDefaults.runtime ?? 'nodejs18.x'),
      memory: Number(raw.memory ?? providerDefaults.memorySize ?? 256),
      timeout: Number(raw.timeout ?? providerDefaults.timeout ?? 30),
      environment: {
        ...(providerDefaults.environment as Record<string, string> ?? {}),
        ...(raw.environment as Record<string, string> ?? {}),
      },
      events,
      layers: (raw.layers as string[]) ?? [],
      tags: (raw.tags as Record<string, string>) ?? {},
    };
  }

  private parseEvents(eventsRaw: unknown[]): EventConfig[] {
    const events: EventConfig[] = [];

    for (const event of eventsRaw) {
      if (typeof event !== 'object' || event === null) continue;
      const eventObj = event as Record<string, unknown>;

      if ('http' in eventObj) {
        const http = eventObj.http as Record<string, unknown>;
        events.push({
          type: 'http',
          config: {
            path: String(http.path ?? '/'),
            method: String(http.method ?? 'GET').toUpperCase(),
            cors: Boolean(http.cors ?? false),
            authorizer: http.authorizer ? String(http.authorizer) : undefined,
          } as HttpEventConfig,
        });
      }

      if ('schedule' in eventObj) {
        const schedule = eventObj.schedule as Record<string, unknown>;
        events.push({
          type: 'cron',
          config: {
            schedule: String(typeof schedule === 'string' ? schedule : schedule.rate ?? schedule.cron ?? ''),
            description: schedule.description ? String(schedule.description) : undefined,
            enabled: Boolean(schedule.enabled ?? true),
            payload: schedule.input as Record<string, unknown>,
          } as CronEventConfig,
        });
      }

      if ('sqs' in eventObj) {
        const sqs = eventObj.sqs as Record<string, unknown>;
        events.push({
          type: 'queue',
          config: {
            queue: String(sqs.arn ?? sqs.queue ?? ''),
            batchSize: Number(sqs.batchSize ?? 10),
            maxRetries: Number(sqs.maxRetries ?? 3),
          } as QueueEventConfig,
        });
      }
    }

    return events;
  }

  interpolate(value: string, context: Record<string, unknown>): string {
    return value.replace(/\$\{(\w+(?:\.\w+)*)\}/g, (_match, path: string) => {
      const parts = path.split('.');
      let current: unknown = context;

      for (const part of parts) {
        if (typeof current !== 'object' || current === null) return _match;
        current = (current as Record<string, unknown>)[part];
      }

      return current !== undefined ? String(current) : _match;
    });
  }

  private parseYamlSimple(content: string): Record<string, unknown> {
    // Simple YAML parser for flat-ish structures
    // For production, use the `yaml` package
    try {
      // Attempt JSON parse first (some configs are JSON)
      return JSON.parse(content);
    } catch {
      // Minimal YAML-like parsing
      const result: Record<string, unknown> = {};
      const lines = content.split('\n');
      let currentKey = '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const topLevel = line.match(/^(\w+):\s*(.*)$/);
        if (topLevel) {
          currentKey = topLevel[1];
          const value = topLevel[2].trim();
          result[currentKey] = value || {};
          continue;
        }

        const nested = line.match(/^\s+(\w+):\s*(.+)$/);
        if (nested && currentKey) {
          const obj = (result[currentKey] ?? {}) as Record<string, unknown>;
          obj[nested[1]] = nested[2].trim();
          result[currentKey] = obj;
        }
      }

      return result;
    }
  }
}
