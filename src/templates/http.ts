/**
 * HTTP event template - simulates API Gateway request/response mapping
 */

export interface APIGatewayEvent {
  httpMethod: string;
  path: string;
  headers: Record<string, string>;
  queryStringParameters: Record<string, string> | null;
  pathParameters: Record<string, string> | null;
  body: string | null;
  isBase64Encoded: boolean;
  requestContext: {
    requestId: string;
    stage: string;
    identity: {
      sourceIp: string;
      userAgent: string;
    };
  };
}

export interface APIGatewayResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
  isBase64Encoded?: boolean;
}

export function createHttpEvent(overrides: Partial<APIGatewayEvent> = {}): APIGatewayEvent {
  return {
    httpMethod: 'GET',
    path: '/',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'sls-deploy/1.0',
      'X-Forwarded-For': '127.0.0.1',
      Host: 'localhost',
      ...overrides.headers,
    },
    queryStringParameters: overrides.queryStringParameters ?? null,
    pathParameters: overrides.pathParameters ?? null,
    body: overrides.body ?? null,
    isBase64Encoded: overrides.isBase64Encoded ?? false,
    requestContext: {
      requestId: `req-${Date.now().toString(36)}`,
      stage: 'dev',
      identity: {
        sourceIp: '127.0.0.1',
        userAgent: 'sls-deploy/1.0',
      },
      ...overrides.requestContext,
    },
  };
}

export function createSuccessResponse(body: unknown, statusCode: number = 200): APIGatewayResponse {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

export function createErrorResponse(message: string, statusCode: number = 500): APIGatewayResponse {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: message }),
  };
}
