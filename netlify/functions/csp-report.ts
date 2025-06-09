import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const cspReport = JSON.parse(event.body || '{}');
    
    // Log CSP violation
    console.warn('CSP Violation Report:', {
      timestamp: new Date().toISOString(),
      userAgent: event.headers['user-agent'],
      sourceIP: event.headers['x-forwarded-for'] || event.headers['client-ip'],
      report: cspReport,
    });

    // In production, you might want to:
    // 1. Store violations in a database
    // 2. Send alerts for critical violations
    // 3. Aggregate violations for security analysis

    return {
      statusCode: 204,
      headers,
      body: '',
    };
  } catch (error) {
    console.error('CSP report processing failed:', error);
    
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid report format' }),
    };
  }
};