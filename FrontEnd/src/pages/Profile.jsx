import { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, Image as ImageIcon, Loader2, AlertCircle, Zap, Clock, ChevronLeft, ChevronRight, Award } from 'lucide-react';

export default function Profile({ user }) {
  const [profileData, setProfileData] = useState(null);
  const [galleryHistory, setGalleryHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isGalleryLoading, setIsGalleryLoading] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const token = localStorage.getItem('aurora_token');
        if (!token) throw new Error('Authentication token missing. Please log in again.');

        const profileRes = await fetch('/api/profile', { headers: { 'Authorization': `Bearer ${token}` }});
        const profileJson = await profileRes.json();
        if (!profileRes.ok) throw new Error(profileJson.error || 'Failed to fetch profile.');
        setProfileData(profileJson);

        fetchGalleryPage(1, token);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    };
    fetchProfileData();
  }, []);

  const fetchGalleryPage = async (page, tokenString = null) => {
      setIsGalleryLoading(true);
      try {
          const token = tokenString || localStorage.getItem('aurora_token');
          const galleryRes = await fetch(`/api/gallery?page=${page}`, { headers: { 'Authorization': `Bearer ${token}` }});
          const galleryJson = await galleryRes.json();
          if (galleryRes.ok) {
            setGalleryHistory(galleryJson.data || []);
            setTotalPages(galleryJson.totalPages || 1);
            setCurrentPage(galleryJson.currentPage || 1);
          }
      } catch (err) {
          console.error("Gallery pagination error:", err);
      } finally {
          setIsGalleryLoading(false);
          setIsLoading(false);
      }
  };

  const handlePageChange = (newPage) => {
      if (newPage >= 1 && newPage <= totalPages) {
          fetchGalleryPage(newPage);
      }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Loader2 size={32} style={{ color: 'var(--aurora-primary)', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--aurora-text-muted)', fontWeight: 500 }}>Loading profile data...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fef2f2', color: 'var(--aurora-danger)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #fecaca' }}>
          <AlertCircle size={20} />
          <span style={{ fontWeight: 500 }}>{error}</span>
        </div>
      </div>
    );
  }

  const { user: userData, usage } = profileData;
  const usagePercentage = (usage.today / usage.limit) * 100;

  return (
    <div style={{ padding: '2rem 5%', maxWidth: '1200px', margin: '0 auto', width: '100%', flex: 1 }}>
      
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Welcome, {userData.name.split(' ')[0]}</h1>
            <p style={{ color: 'var(--aurora-text-muted)', margin: 0 }}>Manage your account settings and view your generation history.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--aurora-primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: '0.9rem', boxShadow: 'var(--shadow-sm)' }}>
            <Award size={18} />
            <span style={{ textTransform: 'capitalize' }}>{userData.tier || 'Free'} Plan</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Account Details Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <User size={20} style={{ color: 'var(--aurora-primary)' }} />
            Account Details
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.5rem', background: '#f1f5f9', borderRadius: 'var(--radius-md)', color: 'var(--aurora-text-muted)' }}><Mail size={16} /></div>
              <div><div style={{ fontSize: '0.75rem', color: 'var(--aurora-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Email Address</div><div style={{ fontWeight: 500 }}>{userData.email}</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.5rem', background: '#f1f5f9', borderRadius: 'var(--radius-md)', color: 'var(--aurora-text-muted)' }}><Phone size={16} /></div>
              <div><div style={{ fontSize: '0.75rem', color: 'var(--aurora-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Phone Number</div><div style={{ fontWeight: 500 }}>{userData.phone}</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ padding: '0.5rem', background: '#f1f5f9', borderRadius: 'var(--radius-md)', color: 'var(--aurora-text-muted)' }}><Calendar size={16} /></div>
              <div><div style={{ fontSize: '0.75rem', color: 'var(--aurora-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Member Since</div><div style={{ fontWeight: 500 }}>{new Date(userData.created_at).toLocaleDateString()}</div></div>
            </div>
          </div>
        </div>

        {/* Usage Limits Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Zap size={20} style={{ color: 'var(--aurora-primary)' }} />
            Daily Generation Limit
          </h2>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 500 }}>
              <span>Images Generated Today</span>
              <span>{usage.today} / {usage.limit}</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--aurora-border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(usagePercentage, 100)}%`, background: usagePercentage >= 100 ? 'var(--aurora-danger)' : 'var(--aurora-primary)', borderRadius: 'var(--radius-full)', transition: 'width 0.5s ease-out' }} />
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--aurora-text-muted)', lineHeight: 1.5 }}>
            {usage.remaining > 0 ? `You have ${usage.remaining} generation${usage.remaining === 1 ? '' : 's'} remaining for today. Your limit resets at midnight.` : `You have reached your daily limit of ${usage.limit} generations. Please upgrade your tier or check back tomorrow!`}
          </p>
        </div>
      </div>

      {/* Generation History */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', position: 'relative' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <ImageIcon size={20} style={{ color: 'var(--aurora-primary)' }} />
          Recent Generations
        </h2>
        
        {isGalleryLoading && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 'var(--radius-lg)' }}>
                <Loader2 size={32} style={{ color: 'var(--aurora-primary)', animation: 'spin 1s linear infinite' }} />
            </div>
        )}

        {galleryHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--aurora-text-muted)', background: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
            <ImageIcon size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
            <p style={{ fontWeight: 500, fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>No generations yet</p>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>Head over to the Generator to create your first virtual try-on.</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid var(--aurora-border)', color: 'var(--aurora-text-muted)' }}>
                    <th style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>File Name</th>
                    <th style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>Project / Model</th>
                    <th style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>Timestamp</th>
                    </tr>
                </thead>
                <tbody>
                    {galleryHistory.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--aurora-border)' }}>
                        <td style={{ padding: '1rem 0.5rem', fontWeight: 500, color: 'var(--aurora-primary)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.file_name}
                        </td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                        <span style={{ background: '#f1f5f9', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--aurora-text-main)' }}>
                            {item.parent_folder.replace(/_/g, ' ')}
                        </span>
                        </td>
                        <td style={{ padding: '1rem 0.5rem', color: 'var(--aurora-text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={14} />
                        {new Date(item.created_at).toLocaleString()}
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', borderTop: '1px solid var(--aurora-border)', paddingTop: '1.5rem' }}>
                    <button 
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || isGalleryLoading}
                        className="aurora-btn aurora-btn-outline"
                        style={{ padding: '0.5rem', background: 'white' }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--aurora-text-muted)' }}>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button 
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || isGalleryLoading}
                        className="aurora-btn aurora-btn-outline"
                        style={{ padding: '0.5rem', background: 'white' }}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}