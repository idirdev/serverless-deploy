> **Archived** — Kept for reference. Not part of the current portfolio.

# serverless-deploy

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

A serverless deployment framework that packages, deploys, invokes, and monitors serverless functions. Supports HTTP, cron, and queue event triggers with multi-stage deployments and rollback capabilities.

## Features

- **Smart Packaging** - Bundle with tree-shaking, dev dependency exclusion, size optimization
- **Multi-stage Deploy** - dev, staging, production with stage-specific configuration
- **Blue-green Deployment** - Health checks with automatic rollback on failure
- **Local Invocation** - Test functions locally with mock events and contexts
- **Log Viewer** - Fetch, filter, and tail function logs with color formatting
- **Event Templates** - HTTP (API Gateway) and cron (CloudWatch) event mocking

## Installation

```bash
npm install -g serverless-deploy
```

## Quick Start

### Configuration (serverless.yml)

```yaml
service: my-api

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  stage: dev
  memorySize: 256
  timeout: 30
  environment:
    DATABASE_URL: ${env.DATABASE_URL}
    NODE_ENV: ${self.provider.stage}

functions:
  getUsers:
    handler: src/handlers/getUsers.handler
    memory: 512
    events:
      - http:
          path: /users
          method: GET
          cors: true

  processQueue:
    handler: src/handlers/processQueue.handler
    timeout: 60
    events:
      - sqs:
          queue: my-queue
          batchSize: 10

  dailyReport:
    handler: src/handlers/dailyReport.handler
    events:
      - schedule:
          rate: rate(1 day)
          description: Generate daily report
          enabled: true

plugins:
  - serverless-offline

custom:
  tableName: users-${self.provider.stage}
```

### Handler Example

```typescript
export async function handler(event: any, context: any) {
  const users = await db.query('SELECT * FROM users LIMIT 10');

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ users }),
  };
}
```

## CLI Reference

### Deploy

```bash
# Deploy all functions to dev
sls-deploy deploy

# Deploy to staging
sls-deploy deploy --stage staging --region eu-west-1

# Deploy single function
sls-deploy deploy --function getUsers --stage prod

# Dry run
sls-deploy deploy --dry-run

# Force deploy (skip change detection)
sls-deploy deploy --force
```

### Invoke

```bash
# Invoke locally
sls-deploy invoke -f getUsers --local

# Invoke with event data
sls-deploy invoke -f getUsers --local -d '{"pathParameters":{"id":"123"}}'

# Invoke remotely
sls-deploy invoke -f getUsers --stage prod
```

### Logs

```bash
# View recent logs
sls-deploy logs -f getUsers

# Tail logs in real-time
sls-deploy logs -f getUsers --tail

# Filter logs
sls-deploy logs -f getUsers --filter "ERROR"

# Logs from last 30 minutes
sls-deploy logs -f getUsers --start 30m
```

### Remove

```bash
# Remove single function
sls-deploy remove -f getUsers --stage dev

# Remove entire service
sls-deploy remove --stage dev
```

### Status

```bash
sls-deploy status --stage prod --region us-east-1
```

## Deploy Flow

```
1. Parse serverless.yml
   |
2. Package functions
   |-- Bundle source code
   |-- Tree-shake unused code
   |-- Exclude dev dependencies
   |-- Generate zip archive
   |
3. Deploy (per function)
   |-- Upload package
   |-- Create/update function
   |-- Set environment variables
   |-- Configure event triggers
   |-- Set memory & timeout
   |
4. Health check
   |-- Pass -> Switch traffic (blue-green)
   |-- Fail -> Rollback to previous version
   |
5. Report results
```

## Event Templates

### HTTP Event

```typescript
import { createHttpEvent, createSuccessResponse } from 'serverless-deploy/templates/http';

const event = createHttpEvent({
  httpMethod: 'POST',
  path: '/users',
  body: JSON.stringify({ name: 'Alice' }),
});

const response = createSuccessResponse({ id: 1, name: 'Alice' }, 201);
```

### Cron Event

```typescript
import { createCronEvent } from 'serverless-deploy/templates/cron';

const event = createCronEvent('rate(1 hour)', { reportType: 'daily' });
```

## Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--stage` | `-s` | Deployment stage | `dev` |
| `--region` | `-r` | Cloud region | `us-east-1` |
| `--function` | `-f` | Target function name | all |
| `--dry-run` | | Preview without deploying | `false` |
| `--force` | | Skip change detection | `false` |
| `--local` | | Invoke locally | `false` |
| `--tail` | `-t` | Follow log output | `false` |
| `--filter` | | Filter logs by pattern | - |
| `--data` | `-d` | Event data (JSON string) | `{}` |

## License

MIT
