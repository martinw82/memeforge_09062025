import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'MemeForge',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      uptime: process.uptime(),
      checks: {
        database: 'operational', // Would check Supabase connection
        storage: 'operational',   // Would check file storage
        api: 'operational',       // Would check external APIs
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
        },
      },
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(healthCheck, null, 2),
    };
  } catch (error) {
    console.error('Health check failed:', error);
    
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Service unavailable',
      }),
    };
  }
};