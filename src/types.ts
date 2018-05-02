export interface FunctionConfig {
  name: string;
  handler: string;
  runtime?: string;
  memory?: number;
  timeout?: number;
  environment?: Record<string, string>;
  events: EventConfig[];
  layers?: string[];
  tags?: Record<string, string>;
}

export interface EventConfig {
  type: 'http' | 'cron' | 'queue' | 'stream' | 's3';
  config: HttpEventConfig | CronEventConfig | QueueEventConfig;
}

export interface HttpEventConfig {
  path: string;
  method: string;
  cors?: boolean;
  authorizer?: string;
}

export interface CronEventConfig {
  schedule: string; // cron expression or rate
  description?: string;
  enabled?: boolean;
  payload?: Record<string, unknown>;
}

export interface QueueEventConfig {
  queue: string;
  batchSize?: number;
  maxRetries?: number;
}

export interface ServiceConfig {
  service: string;
  provider: {
    name: string;
    runtime: string;
    region: string;
    stage: string;
    memorySize: number;
    timeout: number;
    environment: Record<string, string>;
  };
  functions: FunctionConfig[];
  resources?: ResourceConfig[];
  plugins?: string[];
  custom?: Record<string, unknown>;
}

export interface ResourceConfig {
  name: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface StageConfig {
  stage: string;
  region: string;
  force?: boolean;
}

export interface DeployResult {
  functionName: string;
  status: 'created' | 'updated' | 'unchanged' | 'failed';
  url?: string;
  version?: string;
  size?: number;
  error?: string;
  duration?: number;
}

export interface InvokeResult {
  response: unknown;
  statusCode?: number;
  logs?: string[];
  duration: number;
  memoryUsed?: number;
}

export interface LogEntry {
  timestamp: Date;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  requestId?: string;
  functionName: string;
  duration?: number;
  memoryUsed?: number;
}

export interface PackageResult {
  functionName: string;
  handler: string;
  zipPath: string;
  size: number;
  hash: string;
  files: string[];
}
