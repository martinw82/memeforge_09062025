import React, { useState, useEffect, useCallback } from 'react';
import { supabaseHelpers } from '../../utils/supabase';

interface ErrorEvent {
  error_message: string;
  component: string;
  timestamp: string;
  user_id?: string;
  session_id?: string;
  stack_trace?: string;
  additional_info?: any;
  error_id?: string;
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

const ErrorSummaryWidget: React.FC = () => {
  const [errors, setErrors] = useState<ErrorEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [showDetails, setShowDetails] = useState<Record<number, boolean>>({});

  const fetchErrors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters = {
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
        limit: 50
      };
      const { data, error: fetchError } = await supabaseHelpers.getErrorEvents(filters);
      if (fetchError) {
        throw fetchError;
      }
      setErrors(data || []);
    } catch (err: any) {
      console.error("Error fetching error events:", err);
      setError(err.message || 'Failed to fetch error events.');
    } finally {
      setIsLoading(false);
    }
  }, [startDateFilter, endDateFilter]);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  const handleFilterSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     fetchErrors();
  };

  const toggleDetails = (index: number) => {
     setShowDetails(prev => ({...prev, [index]: !prev[index]}));
  };

  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>Client-Side Error Summary</h3>
      <form onSubmit={handleFilterSubmit} style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
         <div>
             <label htmlFor="errorStartDateFilter" style={{marginRight: '5px'}}>Start Date: </label>
             <input
                 type="date"
                 id="errorStartDateFilter"
                 value={startDateFilter}
                 onChange={e => setStartDateFilter(e.target.value)}
                 style={{padding: '5px', border: '1px solid #ccc', borderRadius: '4px'}}
             />
         </div>
         <div>
             <label htmlFor="errorEndDateFilter" style={{marginRight: '5px'}}>End Date: </label>
             <input
                 type="date"
                 id="errorEndDateFilter"
                 value={endDateFilter}
                 onChange={e => setEndDateFilter(e.target.value)}
                 style={{padding: '5px', border: '1px solid #ccc', borderRadius: '4px'}}
             />
         </div>
         <button type="submit" style={{padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Apply Filters</button>
      </form>

      {isLoading && <p>Loading error summary...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!isLoading && !error && (
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>Timestamp</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>Message</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>Component</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>User ID</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {errors.length === 0 && !isLoading ? (
                 <tr><td colSpan={5} style={{textAlign: 'center', padding: '10px'}}>No error events found for the selected filters.</td></tr>
              ) : (
                 errors.map((err, index) => (
                   <React.Fragment key={index}>
                     <tr>
                       <td style={{ border: '1px solid #ddd', padding: '8px' }}>{new Date(err.timestamp).toLocaleString()}</td>
                       <td style={{ border: '1px solid #ddd', padding: '8px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={err.error_message}>{err.error_message}</td>
                       <td style={{ border: '1px solid #ddd', padding: '8px' }}>{err.component}</td>
                       <td style={{ border: '1px solid #ddd', padding: '8px', fontSize: '0.8em' }} title={err.user_id}>{err.user_id ? `${err.user_id.substring(0,8)}...` : 'N/A'}</td>
                       <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                         <button onClick={() => toggleDetails(index)} style={{fontSize: '0.8em', padding: '2px 5px'}}>
                           {showDetails[index] ? 'Hide' : 'Details'}
                         </button>
                       </td>
                     </tr>
                     {showDetails[index] && (
                         <tr>
                             <td colSpan={5} style={{padding: '10px', backgroundColor: '#f9f9f9', borderBottom: '1px solid #ddd'}}>
                                 <div style={{fontSize: '0.85em'}}>
                                     <p><strong>Error ID:</strong> {err.error_id || 'N/A'}</p>
                                     <p><strong>Session ID:</strong> {err.session_id || 'N/A'}</p>
                                     <p><strong>Full Message:</strong> {err.error_message}</p>
                                     {err.stack_trace && <pre style={{whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto', backgroundColor: '#eee', padding: '5px', borderRadius: '4px', marginTop: '5px'}}>Stack: {err.stack_trace}</pre>}
                                     {err.additional_info && <p><strong>Additional Info:</strong> <pre style={{whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto'}}>{JSON.stringify(err.additional_info, null, 2)}</pre></p>}
                                 </div>
                             </td>
                         </tr>
                     )}
                   </React.Fragment>
                 ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ErrorSummaryWidget;
