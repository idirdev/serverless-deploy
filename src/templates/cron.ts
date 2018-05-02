/**
 * Cron/scheduled event template - simulates CloudWatch Events / EventBridge rule
 */

export interface ScheduledEvent {
  source: string;
  'detail-type': string;
  detail: Record<string, unknown>;
  time: string;
  region: string;
  resources: string[];
  id: string;
  account: string;
}

export function createCronEvent(
  schedule: string,
  payload: Record<string, unknown> = {}
): ScheduledEvent {
  return {
    source: 'aws.events',
    'detail-type': 'Scheduled Event',
    detail: {
      schedule,
      ...payload,
    },
    time: new Date().toISOString(),
    region: 'us-east-1',
    resources: [`arn:aws:events:us-east-1:123456789:rule/${schedule.replace(/\s+/g, '-')}`],
    id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    account: '123456789012',
  };
}

export function parseScheduleExpression(expression: string): {
  type: 'rate' | 'cron';
  description: string;
} {
  if (expression.startsWith('rate(')) {
    const match = expression.match(/rate\((\d+)\s+(minutes?|hours?|days?)\)/);
    if (match) {
      return { type: 'rate', description: `Every ${match[1]} ${match[2]}` };
    }
  }

  if (expression.startsWith('cron(')) {
    return { type: 'cron', description: `Cron: ${expression}` };
  }

  return { type: 'rate', description: expression };
}
