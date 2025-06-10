import React, { useState, useEffect, useCallback } from 'react';
import { supabaseHelpers } from '../../utils/supabase'; // Adjust path as needed

interface PerformanceMetric {
  event_name: string;
  metric_value: number | null; // Updated to number or null
  timestamp: string;
}

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

const PerformanceMetricsWidget: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [eventNameFilter, setEventNameFilter] = useState<string>('performance_metric%');
  // Add simple date string states for now, can be enhanced with date pickers later
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters = {
        eventName: eventNameFilter || 'performance_metric%',
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
        limit: 50
      };
      const { data, error: fetchError } = await supabaseHelpers.getPerformanceMetrics(filters);
      if (fetchError) {
        throw fetchError;
      }
      setMetrics(data || []);
    } catch (err: any) {
      console.error("Error fetching performance metrics:", err);
      setError(err.message || 'Failed to fetch performance metrics.');
    } finally {
      setIsLoading(false);
    }
  }, [eventNameFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleFilterSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     fetchMetrics();
  };

  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>Performance Metrics</h3>
      <form onSubmit={handleFilterSubmit} style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
         <div>
             <label htmlFor="eventNameFilter" style={{marginRight: '5px'}}>Event Name (e.g., performance_%) </label>
             <input
                 type="text"
                 id="eventNameFilter"
                 value={eventNameFilter}
                 onChange={e => setEventNameFilter(e.target.value)}
                 placeholder="performance_metric%"
                 style={{padding: '5px', border: '1px solid #ccc', borderRadius: '4px'}}
             />
         </div>
         <div>
             <label htmlFor="startDateFilter" style={{marginRight: '5px'}}>Start Date: </label>
             <input
                 type="date"
                 id="startDateFilter"
                 value={startDateFilter}
                 onChange={e => setStartDateFilter(e.target.value)}
                 style={{padding: '5px', border: '1px solid #ccc', borderRadius: '4px'}}
             />
         </div>
         <div>
             <label htmlFor="endDateFilter" style={{marginRight: '5px'}}>End Date: </label>
             <input
                 type="date"
                 id="endDateFilter"
                 value={endDateFilter}
                 onChange={e => setEndDateFilter(e.target.value)}
                 style={{padding: '5px', border: '1px solid #ccc', borderRadius: '4px'}}
             />
         </div>
         <button type="submit" style={{padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Apply Filters</button>
      </form>

      {isLoading && <p>Loading metrics...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!isLoading && !error && (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>Event Name</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>Value (ms)</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {metrics.length === 0 && !isLoading ? (
                 <tr><td colSpan={3} style={{textAlign: 'center', padding: '10px'}}>No performance metrics found for the selected filters.</td></tr>
              ) : (
                 metrics.map((metric, index) => (
                     <tr key={index}>
                     <td style={{ border: '1px solid #ddd', padding: '8px' }}>{metric.event_name}</td>
                     <td style={{ border: '1px solid #ddd', padding: '8px' }}>{metric.metric_value !== null ? metric.metric_value.toFixed(2) : 'N/A'}</td>
                     <td style={{ border: '1px solid #ddd', padding: '8px' }}>{new Date(metric.timestamp).toLocaleString()}</td>
                     </tr>
                 ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PerformanceMetricsWidget;
