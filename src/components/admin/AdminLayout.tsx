import React from 'react';
import { Link, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Import useAuth

const AdminLayout: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth(); // Get auth state

  // For testing, ensure VITE_ADMIN_EMAIL is set in your .env file
  // e.g., VITE_ADMIN_EMAIL="admin@example.com"
  // Fallback for subtask execution if not set, but should be properly configured.
  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@memeforge.app';

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
        <p style={{ fontSize: '1.2rem' }}>Authenticating admin...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Not logged in, redirect to main app (or a login page if you had one)
    return <Navigate to="/" replace />;
  }

  // Check if the logged-in user is the designated admin
  if (user?.email !== ADMIN_EMAIL) {
    // Logged in, but not the admin, redirect to main app
    console.warn(`Access denied for ${user?.email}. Admin email is ${ADMIN_EMAIL}`);
    return <Navigate to="/" replace />;
  }

  // User is authenticated and is the admin
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <aside style={{ width: '220px', backgroundColor: '#001529', color: 'white', padding: '20px', position: 'relative' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', color: 'white' }}>Admin Panel</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 70px)' }}> {/* Adjust height for footer */}
          <ul style={{ listStyle: 'none', padding: 0, flexGrow: 1 }}>
            <li style={{ marginBottom: '10px' }}>
              <Link to="/admin" style={{ color: 'white', textDecoration: 'none' }}>Dashboard</Link>
            </li>
            {/* Admin navigation links will go here */}
          </ul>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: 'auto' }}>
            <li style={{paddingTop: '20px', borderTop: '1px solid #ffffff30'}}>
              <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Back to Main App</Link>
            </li>
          </ul>
        </nav>
        <div style={{color: '#aaa', fontSize: '0.8em', position: 'absolute', bottom: '20px', left: '20px', right: '20px', wordBreak: 'break-all' }}>
         Logged in as: {user.email}
        </div>
      </aside>
      <main style={{ flexGrow: 1, padding: '20px', backgroundColor: 'white' }}>
        <Outlet /> {/* Content for specific admin pages will be rendered here */}
      </main>
    </div>
  );
};

export default AdminLayout;
