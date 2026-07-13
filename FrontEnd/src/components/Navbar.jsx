import { Link, useLocation } from 'react-router-dom';
import { Camera, User, LogOut, LogIn, Sparkles } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  const location = useLocation();

  // Reusable NavItem for consistent styling and active state detection
  const NavItem = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: isActive ? 'var(--aurora-primary)' : 'var(--aurora-text-main)',
          textDecoration: 'none',
          fontWeight: isActive ? 600 : 500,
          padding: '0.5rem 0.75rem',
          borderRadius: 'var(--radius-md)',
          background: isActive ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
          transition: 'var(--transition-base)'
        }}
      >
        <Icon size={18} />
        {/* We use inline styles for responsiveness where appropriate, but rely on text-overflow for mobile if needed */}
        <span style={{ display: 'inline-block' }}>{label}</span>
      </Link>
    );
  };

  return (
    <header 
      className="glass-panel" 
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '1rem 5%',
        borderBottom: '1px solid var(--aurora-border)'
      }}
    >
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        
        {/* Brand Logo & Name */}
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          textDecoration: 'none',
          color: 'var(--aurora-text-main)',
          fontWeight: 700,
          fontSize: '1.25rem',
          letterSpacing: '-0.025em'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--aurora-primary), var(--aurora-secondary))',
            padding: '0.5rem',
            borderRadius: 'var(--radius-md)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)'
          }}>
            <Sparkles size={20} />
          </div>
          <span>Aurora Try-On</span>
        </Link>

        {/* Navigation Actions */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user ? (
            <>
              <NavItem to="/" icon={Camera} label="Generator" />
              <NavItem to="/profile" icon={User} label="Profile" />
              
              <div style={{ 
                width: '1px', 
                height: '24px', 
                background: 'var(--aurora-border)', 
                margin: '0 0.5rem' 
              }} />
              
              <button 
                onClick={onLogout} 
                className="aurora-btn aurora-btn-outline" 
                style={{ padding: '0.5rem 1rem' }}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link 
                to="/login" 
                style={{ 
                  textDecoration: 'none', 
                  color: 'var(--aurora-text-main)', 
                  fontWeight: 500,
                  padding: '0.5rem 1rem',
                  transition: 'color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.color = 'var(--aurora-primary)'}
                onMouseOut={(e) => e.target.style.color = 'var(--aurora-text-main)'}
              >
                Log in
              </Link>
              <Link to="/signup" className="aurora-btn aurora-btn-primary">
                <LogIn size={16} />
                Sign up
              </Link>
            </>
          )}
        </nav>
        
      </div>
    </header>
  );
}