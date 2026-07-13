import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, Phone, AlertCircle, Loader2 } from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Frontend Validation
    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      setError("Name, email, phone, and password are required.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account.');
      }

      // Route to login on successful creation
      navigate('/login', { state: { message: "Account created successfully. Please log in." } });
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      padding: '2rem',
      background: 'radial-gradient(circle at top left, rgba(16, 185, 129, 0.1), transparent 40%), radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.1), transparent 40%)'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '2.5rem',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--aurora-success)',
            color: 'white',
            padding: '1rem',
            borderRadius: '50%',
            marginBottom: '1rem',
            boxShadow: 'var(--shadow-md)'
          }}>
            <UserPlus size={28} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Create an Account</h1>
          <p style={{ color: 'var(--aurora-text-muted)', margin: 0, fontSize: '0.95rem' }}>
            Join Aurora Generator to start creating try-on poses.
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#fef2f2',
            color: 'var(--aurora-danger)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #fecaca',
            fontSize: '0.875rem',
            fontWeight: 500
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Grid for Name and Phone on larger screens, stacks on mobile */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label className="aurora-label" htmlFor="name">Full Name</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--aurora-text-muted)' }}>
                  <User size={18} />
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="aurora-input"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="aurora-label" htmlFor="phone">Phone Number</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--aurora-text-muted)' }}>
                  <Phone size={18} />
                </div>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="aurora-input"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="aurora-label" htmlFor="email">Email Address</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--aurora-text-muted)' }}>
                <Mail size={18} />
              </div>
              <input
                type="email"
                id="email"
                name="email"
                className="aurora-input"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label className="aurora-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--aurora-text-muted)' }}>
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="aurora-input"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="aurora-label" htmlFor="confirmPassword">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--aurora-text-muted)' }}>
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  className="aurora-input"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="aurora-btn aurora-btn-primary" 
            style={{ marginTop: '0.5rem', height: '2.75rem', backgroundColor: 'var(--aurora-success)' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Sign Up</span>
            )}
          </button>
        </form>

        <div style={{ 
          textAlign: 'center', 
          fontSize: '0.875rem', 
          color: 'var(--aurora-text-muted)',
          marginTop: '0.5rem',
          borderTop: '1px solid var(--aurora-border)',
          paddingTop: '1.5rem'
        }}>
          Already have an account?{' '}
          <Link to="/login" style={{ 
            color: 'var(--aurora-primary)', 
            textDecoration: 'none', 
            fontWeight: 600 
          }}>
            Sign in here
          </Link>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}