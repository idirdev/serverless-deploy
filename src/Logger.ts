import { LogEntry } from './types';

interface LogViewerOptions {
  functionName: string;
  stage: string;
  tail?: boolean;
  startTime?: string;
  filter?: string;
}

export class LogViewer {
  private logBuffer: LogEntry[] = [];

  viewLogs(options: LogViewerOptions): void {
    console.log(`\n  Logs: ${options.functionName} (${options.stage})`);
    console.log('  ' + '─'.repeat(50));

    // Parse start time
    const since = this.parseTimeOffset(options.startTime);

    // Fetch logs (simulated)
    const logs = this.fetchLogs(options.functionName, options.stage, since);

    // Apply filter
    const filtered = options.filter
      ? logs.filter((log) => log.message.toLowerCase().includes(options.filter!.toLowerCase()))
      : logs;

    // Display logs
    for (const log of filtered) {
      this.formatAndPrint(log);
    }

    if (filtered.length === 0) {
      console.log('  No logs found for the specified criteria.');
    }

    // Tail mode
    if (options.tail) {
      console.log('\n  Waiting for new logs... (Ctrl+C to stop)\n');
      this.startTailing(options);
    }
  }

  private fetchLogs(functionName: string, stage: string, since: Date): LogEntry[] {
    // In a real implementation, this would call the cloud provider's API
    // Here we return mock log entries for demonstration
    const now = new Date();
    const logs: LogEntry[] = [];

    // Generate some sample log entries
    const sampleMessages = [
      { level: 'INFO' as const, message: 'Function initialized' },
      { level: 'INFO' as const, message: 'Processing incoming request' },
      { level: 'DEBUG' as const, message: 'Request body parsed successfully' },
      { level: 'INFO' as const, message: 'Database query executed in 12ms' },
      { level: 'WARN' as const, message: 'Rate limit approaching threshold (85%)' },
      { level: 'INFO' as const, message: 'Response sent: 200 OK' },
      { level: 'INFO' as const, message: `REPORT Duration: 45ms Memory: 72MB` },
    ];

    for (let i = 0; i < sampleMessages.length; i++) {
      const timestamp = new Date(now.getTime() - (sampleMessages.length - i) * 60000);
      if (timestamp < since) continue;

      logs.push({
        timestamp,
        level: sampleMessages[i].level,
        message: sampleMessages[i].message,
        requestId: `req-${Math.random().toString(36).slice(2, 10)}`,
        functionName,
      });
    }

    return logs;
  }

  private formatAndPrint(log: LogEntry): void {
    const timestamp = log.timestamp.toISOString().replace('T', ' ').slice(0, 23);
    const levelColors: Record<string, string> = {
      INFO: '\x1b[32m',   // green
      WARN: '\x1b[33m',   // yellow
      ERROR: '\x1b[31m',  // red
      DEBUG: '\x1b[36m',  // cyan
    };

    const color = levelColors[log.level] ?? '\x1b[0m';
    const reset = '\x1b[0m';
    const dimmed = '\x1b[2m';

    const level = log.level.padEnd(5);
    const reqId = log.requestId ? `${dimmed}[${log.requestId}]${reset} ` : '';

    console.log(`  ${dimmed}${timestamp}${reset} ${color}${level}${reset} ${reqId}${log.message}`);
  }

  private parseTimeOffset(timeStr?: string): Date {
    if (!timeStr) {
      // Default: last 1 hour
      return new Date(Date.now() - 60 * 60 * 1000);
    }

    // Try parsing as relative time (e.g., "5m", "1h", "2d")
    const relativeMatch = timeStr.match(/^(\d+)([mhd])$/);
    if (relativeMatch) {
      const amount = parseInt(relativeMatch[1], 10);
      const unit = relativeMatch[2];
      const multipliers: Record<string, number> = { m: 60000, h: 3600000, d: 86400000 };
      return new Date(Date.now() - amount * (multipliers[unit] ?? 3600000));
    }

    // Try parsing as ISO date
    const parsed = new Date(timeStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    // Default fallback
    return new Date(Date.now() - 60 * 60 * 1000);
  }

  private startTailing(options: LogViewerOptions): void {
    // In a real implementation, this would poll or use a WebSocket
    // Here we simulate periodic log generation
    const interval = setInterval(() => {
      const log: LogEntry = {
        timestamp: new Date(),
        level: 'INFO',
        message: `Request processed (${Math.floor(Math.random() * 100)}ms)`,
        requestId: `req-${Math.random().toString(36).slice(2, 10)}`,
        functionName: options.functionName,
      };

      if (options.filter && !log.message.toLowerCase().includes(options.filter.toLowerCase())) {
        return;
      }

      this.formatAndPrint(log);
      this.logBuffer.push(log);
    }, 3000);

    // Handle cleanup
    process.on('SIGINT', () => {
      clearInterval(interval);
      console.log(`\n  Stopped tailing. ${this.logBuffer.length} new log entries received.`);
      process.exit(0);
    });
  }
}
