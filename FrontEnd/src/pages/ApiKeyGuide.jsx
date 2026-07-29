import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Copy, CheckCircle2, ArrowLeft, Image as ImageIcon, ShieldAlert } from 'lucide-react';

export default function ApiKeyGuide() {
  // SEO & Meta Tags Injection
  useEffect(() => {
    document.title = "How to Get a Google Gemini API Key | Aurora Try-On";
    
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = "Step-by-step guide with screenshots on how to generate and configure your own Google Gemini API key for the Aurora Virtual Try-On Generator.";
    
    // Cleanup on unmount
    return () => {
      document.title = "Aurora Pose Generator";
    };
  }, []);

  const steps = [
    {
      id: 1,
      title: "Go to Google AI Studio",
      description: "Navigate to the official Google AI Studio dashboard. You will need to sign in with your standard Google or Gmail account.",
      actionLink: "https://aistudio.google.com/app/apikey",
      actionText: "Open Google AI Studio",
      imageSrc: "/images/gemini-step-1.png",
    },
    {
      id: 2,
      title: "Navigate to API Keys",
      description: "Once logged in, look at the left-hand navigation sidebar and click on the 'Get API key' or 'API Keys' tab.",
      imageSrc: "/images/gemini-step-2.png",
    },
    {
      id: 3,
      title: "Create a New Key",
      description: "Click the prominent 'Create API key' button. You can choose to create it in a new project or an existing Google Cloud project if you have one.",
      imageSrc: "/images/gemini-step-3.png",
    },
    {
      id: 4,
      title: "Copy Your API Key",
      description: "Your key will be generated (it usually starts with 'AIzaSy...'). Click the copy icon next to the key. Keep this key completely secret and do not share it publicly.",
      imageSrc: "/images/gemini-step-4.png",
    }
  ];

  return (
    <div style={{ padding: '3rem 5%', maxWidth: '900px', margin: '0 auto', width: '100%', flex: 1 }}>
      
      {/* Navigation & Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <Link 
          to="/profile" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            color: 'var(--aurora-text-muted)', 
            textDecoration: 'none', 
            fontWeight: 600,
            marginBottom: '1.5rem',
            transition: 'color 0.2s'
          }}
          onMouseOver={(e) => e.target.style.color = 'var(--aurora-primary)'}
          onMouseOut={(e) => e.target.style.color = 'var(--aurora-text-muted)'}
        >
          <ArrowLeft size={18} />
          Back to Profile
        </Link>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--aurora-text-main)', lineHeight: 1.2 }}>
          How to get your Gemini API Key
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--aurora-text-muted)', margin: 0, lineHeight: 1.6 }}>
          To generate high-quality virtual try-on images, Aurora requires a Google Gemini API key. Follow these simple steps to generate yours for free.
        </p>
      </div>

      {/* Security Disclaimer */}
      <div style={{ 
          marginBottom: '3rem', 
          background: '#f0fdf4', 
          color: '#166534', 
          padding: '1.5rem', 
          borderRadius: 'var(--radius-lg)', 
          border: '1px solid #bbf7d0',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start',
          boxShadow: 'var(--shadow-sm)'
      }}>
          <ShieldAlert size={28} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700 }}>Your Key is Secure With Us</h4>
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                  When you save your API key in Aurora, it is heavily encrypted using AES-256 before being stored in our database. We never expose or misuse your key, and you can delete it from our system at any time from your Profile page.
              </p>
          </div>
      </div>

      {/* Step-by-Step Guide */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {steps.map((step) => (
          <div key={step.id} className="glass-panel" style={{ 
            padding: '2rem', 
            borderRadius: 'var(--radius-lg)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Step Number Badge */}
            <div style={{ 
              position: 'absolute', 
              top: '2rem', 
              right: '2rem',
              fontSize: '4rem',
              fontWeight: 900,
              color: 'var(--aurora-primary)',
              opacity: 0.1,
              lineHeight: 0.8,
              userSelect: 'none'
            }}>
              {step.id}
            </div>

            <div style={{ maxWidth: '85%' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ 
                  background: 'var(--aurora-primary)', 
                  color: 'white', 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '1rem'
                }}>
                  {step.id}
                </span>
                {step.title}
              </h2>
              
              <p style={{ fontSize: '1.05rem', color: 'var(--aurora-text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                {step.description}
              </p>

              {step.actionLink && (
                <a 
                  href={step.actionLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="aurora-btn aurora-btn-primary"
                  style={{ marginBottom: '1.5rem', padding: '0.75rem 1.25rem' }}
                >
                  {step.actionText}
                  <ExternalLink size={18} />
                </a>
              )}
            </div>

            {/* Smart Image Loader with Fallback */}
            <div style={{ marginTop: '1.5rem', position: 'relative' }}>
              <img 
                src={step.imageSrc} 
                alt={`Screenshot for ${step.title}`}
                onError={(e) => {
                  // Hide the broken image icon
                  e.target.style.display = 'none';
                  // Show the fallback placeholder div immediately following it
                  e.target.nextSibling.style.display = 'flex';
                }}
                style={{ 
                  width: '100%', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--aurora-border)',
                  boxShadow: 'var(--shadow-md)',
                  display: 'block'
                }} 
              />
              {/* Hidden by default, revealed if the image file fails to load */}
              <div style={{ 
                display: 'none', 
                width: '100%',
                background: '#f1f5f9',
                border: '2px dashed #cbd5e1',
                borderRadius: 'var(--radius-md)',
                padding: '3rem 2rem',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                gap: '1rem',
                textAlign: 'center'
              }}>
                <ImageIcon size={48} style={{ opacity: 0.5 }} />
                <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--aurora-danger)' }}>Screenshot Not Found</div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>{step.missingHint}</div>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Final Step Validation */}
      <div className="glass-panel" style={{ 
        marginTop: '3rem', 
        padding: '2.5rem', 
        borderRadius: 'var(--radius-lg)', 
        textAlign: 'center',
        background: 'linear-gradient(to right, rgba(79, 70, 229, 0.05), rgba(236, 72, 153, 0.05))'
      }}>
        <CheckCircle2 size={48} style={{ color: 'var(--aurora-success)', margin: '0 auto 1rem auto' }} />
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1rem 0' }}>Ready to Generate?</h3>
        <p style={{ color: 'var(--aurora-text-muted)', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem auto' }}>
          Once you have copied your new API key, head back to your profile to save it securely and start generating your virtual try-on arrays.
        </p>
        <Link to="/profile" className="aurora-btn aurora-btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          <Copy size={20} /> Go to Profile & Paste Key
        </Link>
      </div>

    </div>
  );
}