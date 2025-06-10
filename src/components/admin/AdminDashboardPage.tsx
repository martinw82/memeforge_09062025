import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Using axios as it's available
import PerformanceMetricsWidget from './PerformanceMetricsWidget';
import ErrorSummaryWidget from './ErrorSummaryWidget'; // Add this import

interface HealthCheckItem {
  status: string;
  // Add more specific types if needed for individual checks
}

interface MemoryUsage {
  used: number;
  total: number;
}

interface HealthData {
  status: string;
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  uptime: number; // in seconds
  checks: {
    database: string;
    storage: string;
    api: string;
    memory: MemoryUsage;
  };
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatUptime = (seconds: number): string => {
     const d = Math.floor(seconds / (3600*24));
     const h = Math.floor(seconds % (3600*24) / 3600);
     const m = Math.floor(seconds % 3600 / 60);
     const s = Math.floor(seconds % 60);

     const dDisplay = d > 0 ? d + (d === 1 ? " day, " : " days, ") : "";
     const hDisplay = h > 0 ? h + (h === 1 ? " hour, " : " hours, ") : "";
     const mDisplay = m > 0 ? m + (m === 1 ? " minute, " : " minutes, ") : "";
     const sDisplay = s > 0 ? s + (s === 1 ? " second" : " seconds") : "";
     if (d === 0 && h === 0 && m === 0 && s === 0 && seconds >= 0) return sDisplay || "0 seconds"; // Handle 0 seconds explicitly
     if (seconds < 0) return "Invalid uptime"; // Handle negative uptime
     return (dDisplay + hDisplay + mDisplay + sDisplay).replace(/, $/, ''); // Remove trailing comma and space
 };


const AdminDashboardPage: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealthStatus = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // The '/health' path will be correctly routed by Netlify to the function
        // when deployed or using Netlify Dev. For local Vite dev without Netlify Dev,
        // this might need proxying or the full Netlify function URL during development.
        // Assuming Netlify Dev or deployment context for '/health'.
        const response = await axios.get('/.netlify/functions/health');
        setHealthData(response.data);
      } catch (err) {
        console.error("Error fetching health status:", err);
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.error || err.message || 'Failed to fetch health status.');
        } else {
          setError('An unexpected error occurred.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchHealthStatus();
  }, []);

  const cardStyle: React.CSSProperties = {
     border: '1px solid #e8e8e8',
     borderRadius: '8px',
     padding: '20px',
     marginBottom: '20px',
     boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
     backgroundColor: '#ffffff'
  };

  const titleStyle: React.CSSProperties = {
     fontSize: '1.5rem',
     fontWeight: 'bold',
     marginBottom: '15px',
     color: '#333'
  };

  const itemStyle: React.CSSProperties = {
     marginBottom: '8px',
     fontSize: '1rem',
     color: '#555'
  };
   const strongStyle: React.CSSProperties = {
     fontWeight: '600',
     color: '#333'
  };


  if (isLoading) {
    return <div style={cardStyle}><p>Loading health status...</p></div>;
  }

  if (error) {
    return <div style={{...cardStyle, borderColor: 'red', color: 'red' }}><p>Error: {error}</p></div>;
  }

  if (!healthData) {
    return <div style={cardStyle}><p>No health data available.</p></div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '20px', color: '#1a202c' }}>Admin Dashboard</h1>

      {/* Health Status Card ... existing code ... */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>Application Health Status</h2>
        <p style={itemStyle}><strong style={strongStyle}>Overall Status:</strong> <span style={{color: healthData.status === 'healthy' ? 'green' : 'red', fontWeight: 'bold'}}>{healthData.status.toUpperCase()}</span></p>
        <p style={itemStyle}><strong style={strongStyle}>Service:</strong> {healthData.service}</p>
        <p style={itemStyle}><strong style={strongStyle}>Version:</strong> {healthData.version}</p>
        <p style={itemStyle}><strong style={strongStyle}>Environment:</strong> {healthData.environment}</p>
        <p style={itemStyle}><strong style={strongStyle}>Timestamp:</strong> {new Date(healthData.timestamp).toLocaleString()}</p>
        <p style={itemStyle}><strong style={strongStyle}>Uptime:</strong> {formatUptime(healthData.uptime)}</p>
      </div>

      <div style={cardStyle}>
         <h3 style={{...titleStyle, fontSize: '1.2rem'}}>Dependency Checks:</h3>
         <ul style={{listStyle: 'none', paddingLeft: 0}}>
             <li style={itemStyle}><strong style={strongStyle}>Database:</strong> <span style={{color: healthData.checks.database === 'operational' ? 'green' : 'red'}}>{healthData.checks.database}</span></li>
             <li style={itemStyle}><strong style={strongStyle}>Storage:</strong> <span style={{color: healthData.checks.storage === 'operational' ? 'green' : 'red'}}>{healthData.checks.storage}</span></li>
             <li style={itemStyle}><strong style={strongStyle}>External API:</strong> <span style={{color: healthData.checks.api === 'operational' ? 'green' : 'red'}}>{healthData.checks.api}</span></li>
         </ul>
      </div>

      <div style={cardStyle}>
         <h3 style={{...titleStyle, fontSize: '1.2rem'}}>Resource Usage:</h3>
          <p style={itemStyle}><strong style={strongStyle}>Memory Used:</strong> {formatBytes(healthData.checks.memory.used)}</p>
          <p style={itemStyle}><strong style={strongStyle}>Memory Total:</strong> {formatBytes(healthData.checks.memory.total)}</p>
      </div>

      <PerformanceMetricsWidget />
      <ErrorSummaryWidget /> {/* Add this line */}

      {/* Placeholder for more dashboard content */}
      <p style={{marginTop: '20px', color: '#777'}}>More monitoring widgets and management tools will be added here.</p>
    </div>
  );
};

export default AdminDashboardPage;
