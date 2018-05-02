import * as fs from 'fs';
import * as path from 'path';
import { InvokeResult } from './types';

export class Invoker {
  async invokeLocal(functionName: string, eventData: Record<string, unknown>): Promise<InvokeResult> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      // Look for handler file
      const handlerPath = this.resolveHandler(functionName);

      if (!handlerPath) {
        return {
          response: { error: `Handler not found for function: ${functionName}` },
          statusCode: 404,
          duration: Date.now() - startTime,
          logs: [`ERROR: Handler file not found for ${functionName}`],
        };
      }

      // Load and execute handler
      delete require.cache[require.resolve(handlerPath)];
      const handlerModule = require(handlerPath);
      const handler = handlerModule.handler ?? handlerModule.default;

      if (typeof handler !== 'function') {
        throw new Error(`No handler function exported from ${handlerPath}`);
      }

      // Create mock context
      const context = this.createMockContext(functionName);
      const logs: string[] = [];

      // Capture console.log within handler
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
      };

      const response = await handler(eventData, context);

      console.log = originalLog;

      const memoryUsed = process.memoryUsage().heapUsed - startMemory;

      return {
        response,
        statusCode: response?.statusCode ?? 200,
        logs,
        duration: Date.now() - startTime,
        memoryUsed: Math.round(memoryUsed / 1024 / 1024),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      return {
        response: { error: message, stack },
        statusCode: 500,
        logs: [`ERROR: ${message}`],
        duration: Date.now() - startTime,
      };
    }
  }

  async invokeRemote(
    functionName: string,
    eventData: Record<string, unknown>,
    stage: string
  ): Promise<InvokeResult> {
    const startTime = Date.now();

    // Simulate remote invocation
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200));

    return {
      response: {
        statusCode: 200,
        body: JSON.stringify({
          message: `Function ${functionName} invoked on ${stage}`,
          input: eventData,
          timestamp: new Date().toISOString(),
        }),
      },
      statusCode: 200,
      logs: [
        `START RequestId: ${this.generateRequestId()}`,
        `Processing event: ${JSON.stringify(eventData).slice(0, 100)}`,
        `END RequestId`,
        `REPORT Duration: ${Date.now() - startTime}ms`,
      ],
      duration: Date.now() - startTime,
      memoryUsed: 64,
    };
  }

  private resolveHandler(functionName: string): string | null {
    const possiblePaths = [
      path.resolve(`src/handlers/${functionName}.js`),
      path.resolve(`src/handlers/${functionName}.ts`),
      path.resolve(`src/${functionName}.js`),
      path.resolve(`src/${functionName}.ts`),
      path.resolve(`handlers/${functionName}.js`),
      path.resolve(`handlers/${functionName}.ts`),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }

    return null;
  }

  private createMockContext(functionName: string): Record<string, unknown> {
    return {
      functionName,
      functionVersion: '$LATEST',
      invokedFunctionArn: `arn:aws:lambda:us-east-1:123456789:function:${functionName}`,
      memoryLimitInMB: '256',
      awsRequestId: this.generateRequestId(),
      logGroupName: `/aws/lambda/${functionName}`,
      logStreamName: `${new Date().toISOString().slice(0, 10)}/[$LATEST]`,
      getRemainingTimeInMillis: () => 30000,
      callbackWaitsForEmptyEventLoop: true,
    };
  }

  private generateRequestId(): string {
    const chars = '0123456789abcdef';
    const segments = [8, 4, 4, 4, 12];
    return segments
      .map((len) =>
        Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
      )
      .join('-');
  }
}
