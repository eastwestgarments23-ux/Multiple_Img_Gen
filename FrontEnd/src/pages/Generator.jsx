import { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Filter, CheckCircle, Loader2, Download, Package, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';

// Centralized Static Model Data
const AVAILABLE_MODELS = [
  { 
    id: '1', ethnicity: 'african', name: 'Model 1 Array (African)', 
    poses: [
      { id: '1', src: '/African/M1_pose1.png' },
      { id: '2', src: '/African/M1_pose2.png' },
      { id: '3', src: '/African/M1_pose3.png' },
      { id: '4', src: '/African/M1_pose4.png' }
    ]
  },
  { 
    id: '2', ethnicity: 'korean', name: 'Model 2 Array (Korean)', 
    poses: [
      { id: '1', src: '/Korean/M1_pose1.png' },
      { id: '2', src: '/Korean/M1_pose2.png' },
      { id: '3', src: '/Korean/M1_pose3.png' },
      { id: '4', src: '/Korean/M1_pose4.png' }
    ]
  },
  { 
    id: '3', ethnicity: 'indian', name: 'Model 3 Array (Indian)', 
    poses: [
      { id: '1', src: '/Indian/M1_pose1.png' },
      { id: '2', src: '/Indian/M1_pose2.png' },
      { id: '3', src: '/Indian/M1_pose3.png' }
    ]
  },
  { 
    id: '4', ethnicity: 'australian', name: 'Model 4 Array (Australian)', 
    poses: [
      { id: '1', src: '/Australian/M1_pose1.png' },
      { id: '2', src: '/Australian/M1_pose2.png' },
      { id: '3', src: '/Australian/M1_pose3.png' },
      { id: '4', src: '/Australian/M1_pose4.png' }
    ]
  },
  { 
    id: '5', ethnicity: 'malaysian_indonesian', name: 'Model 5 Array (Malaysian/Indonesian)', 
    poses: [
      { id: '1', src: '/Malaysian/M1_pose1.png' },
      { id: '2', src: '/Malaysian/M1_pose2.png' },
      { id: '3', src: '/Malaysian/M1_pose3.png' },
      { id: '4', src: '/Malaysian/M1_pose4.png' }
    ]
  },
  { 
    id: '6', ethnicity: 'middle_eastern', name: 'Model 6 Array (Middle Eastern)', 
    poses: [
      { id: '1', src: '/MiddleEastern/M1_pose1.png' },
      { id: '2', src: '/MiddleEastern/M1_pose2.png' },
      { id: '3', src: '/MiddleEastern/M1_pose3.png' },
      { id: '4', src: '/MiddleEastern/M1_pose4.png' }
    ]
  },
  { 
    id: '7', ethnicity: 'chinese', name: 'Model 7 Array (Chinese)', 
    poses: [
      { id: '1', src: '/Chinese/M1_pose1.png' },
      { id: '2', src: '/Chinese/M1_pose2.png' },
      { id: '3', src: '/Chinese/M1_pose3.png' },
      { id: '4', src: '/Chinese/M1_pose4.png' }
    ]
  },
  { 
    id: '8', ethnicity: 'japanese', name: 'Model 8 Array (Japanese)', 
    poses: [
      { id: '1', src: '/Japanese/M1_pose1.png' },
      { id: '2', src: '/Japanese/M1_pose2.png' },
      { id: '3', src: '/Japanese/M1_pose3.png' },
      { id: '4', src: '/Japanese/M1_pose4.png' }
    ]
  },
  { 
    id: '9', ethnicity: 'european', name: 'Model 9 Array (European)', 
    poses: [
      { id: '1', src: '/European/M1_Pose1.png' },
      { id: '2', src: '/European/M1_Pose2.png' },
      { id: '3', src: '/European/M1_Pose3.png' },
      { id: '4', src: '/European/M1_Pose4.png' }
    ]
  },
  { 
    id: '10', ethnicity: 'russian', name: 'Model 10 Array (Russian)', 
    poses: [
      { id: '1', src: '/Russian/M1_Pose1.png' },
      { id: '2', src: '/Russian/M1_Pose2.png' },
      { id: '3', src: '/Russian/M1_Pose3.png' },
      { id: '4', src: '/Russian/M1_Pose4.png' }
    ]
  }
];

export default function Generator({ user }) {
  const [productImages, setProductImages] = useState([]);
  const [ethnicityFilter, setEthnicityFilter] = useState('all');
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [generationResults, setGenerationResults] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [globalError, setGlobalError] = useState('');
  
  // State to track models that have missing/broken images in the public folder
  const [brokenModels, setBrokenModels] = useState(new Set());
  const fileInputRef = useRef(null);

  // ==========================================
  // INPUT HANDLING
  // ==========================================
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target.result.split(',')[1];
        setProductImages((prev) => [
          ...prev, 
          {
            id: Date.now() + index,
            name: file.name.split('.')[0],
            mimeType: file.type,
            data: base64String,
            previewUrl: event.target.result
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
    setGlobalError('');
  };

  const removeProductImage = (idToRemove) => {
    setProductImages(prev => prev.filter(img => img.id !== idToRemove));
  };

  const handleImageError = (modelId) => {
    setBrokenModels(prev => {
      const newSet = new Set(prev);
      newSet.add(modelId);
      return newSet;
    });
    // If the currently selected model breaks, deselect it
    if (selectedModelId === modelId) {
        setSelectedModelId(null);
    }
  };

  // ==========================================
  // UTILITIES
  // ==========================================
  const getBase64FromUrl = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load pose image: ${url}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const convertBase64ToBlob = (base64Data, mimeType = 'image/png') => {
    const rawBinary = atob(base64Data);
    const bytesBuffer = new Uint8Array(rawBinary.length);
    for (let i = 0; i < rawBinary.length; i++) {
      bytesBuffer[i] = rawBinary.charCodeAt(i);
    }
    return new Blob([bytesBuffer], { type: mimeType });
  };

  const triggerDownload = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ==========================================
  // GENERATION ENGINE
  // ==========================================
  const handleGenerate = async () => {
    if (productImages.length === 0) {
      setGlobalError("Please upload at least one product image.");
      return;
    }
    if (!selectedModelId) {
      setGlobalError("Please select a Model Array.");
      return;
    }

    setGlobalError('');
    setIsGenerating(true);
    setGenerationResults([]);

    const token = localStorage.getItem('aurora_token');
    const targetModel = AVAILABLE_MODELS.find(m => m.id === selectedModelId);
    let matrixState = [];

    productImages.forEach(prodImg => {
      targetModel.poses.forEach(pose => {
        matrixState.push({
          uid: `${prodImg.id}-${pose.id}`,
          productId: prodImg.id,
          productName: prodImg.name,
          modelId: targetModel.id,
          poseId: pose.id,
          status: 'loading',
          blobUrl: null,
          blob: null,
          filename: `Model_${targetModel.id}_Pose_${pose.id}_${prodImg.name}.png`,
          errorMsg: null
        });
      });
    });

    setGenerationResults(matrixState);

    for (const prodImg of productImages) {
      for (const pose of targetModel.poses) {
        const uid = `${prodImg.id}-${pose.id}`;
        
        try {
          const poseBase64Data = await getBase64FromUrl(pose.src);

          const response = await fetch('/api/generate-pose', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              base64Image: prodImg.data,
              mimeType: prodImg.mimeType,
              sourceName: prodImg.name,
              poseBase64: poseBase64Data,
              poseMimeType: 'image/jpeg',
              modelId: targetModel.id,
              poseId: pose.id,
              ethnicity: targetModel.ethnicity
            })
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Generation failed.");
          }

          const imageBlob = convertBase64ToBlob(data.image_base64, data.mime_type);
          const blobUrl = URL.createObjectURL(imageBlob);

          setGenerationResults(prev => prev.map(res => 
            res.uid === uid ? { ...res, status: 'success', blobUrl, blob: imageBlob } : res
          ));

        } catch (err) {
          console.error(`Error processing ${uid}:`, err);
          setGenerationResults(prev => prev.map(res => 
            res.uid === uid ? { ...res, status: 'error', errorMsg: err.message } : res
          ));
          
          if (err.message.includes("Daily limit reached")) {
            setGlobalError("Daily generation limit reached. Halting remaining requests.");
            setIsGenerating(false);
            return;
          }
        }
      }
    }
    setIsGenerating(false);
  };

  // ==========================================
  // ZIP DOWNLOAD HANDLERS
  // ==========================================
  const downloadArrayZip = async (productId, productName) => {
    const arrayResults = generationResults.filter(r => r.productId === productId && r.status === 'success');
    if (arrayResults.length === 0) return;

    const zip = new JSZip();
    arrayResults.forEach(res => {
      zip.file(res.filename, res.blob);
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    triggerDownload(url, `Model_${selectedModelId}_${productName}_Array.zip`);
  };

  const downloadMasterZip = async () => {
    const successfulResults = generationResults.filter(r => r.status === 'success');
    if (successfulResults.length === 0) return;

    const zip = new JSZip();
    successfulResults.forEach(res => {
      const folder = zip.folder(`Model_${res.modelId}_${res.productName}`);
      folder.file(res.filename, res.blob);
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    triggerDownload(url, `Aurora_Generated_Matrix.zip`);
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================
  // Filter out models that don't match the dropdown OR have broken images
  const displayModels = AVAILABLE_MODELS.filter(m => {
    const matchesEthnicity = ethnicityFilter === 'all' || m.ethnicity === ethnicityFilter;
    const hasValidImages = !brokenModels.has(m.id);
    return matchesEthnicity && hasValidImages;
  });

  return (
    <div style={{ padding: '3rem 5%', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      
      {globalError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#fef2f2', color: 'var(--aurora-danger)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #fecaca', marginBottom: '2rem', boxShadow: 'var(--shadow-sm)' }}>
          <AlertCircle size={24} />
          <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{globalError}</span>
        </div>
      )}

      {/* Step 1: Upload */}
      <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.5rem', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--aurora-primary)' }}>
          <Upload size={28} />
          1. Upload Product Image(s)
        </h3>
        
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          onChange={handleImageUpload} 
          style={{ display: 'none' }} 
          ref={fileInputRef}
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="aurora-btn aurora-btn-outline"
          style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}
          disabled={isGenerating}
        >
          Select Clothing Images
        </button>

        {productImages.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '2rem' }}>
            {productImages.map((img) => (
              <div key={img.id} style={{ position: 'relative', width: '140px', height: '140px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '2px solid var(--aurora-border)', boxShadow: 'var(--shadow-sm)' }}>
                <img src={img.previewUrl} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button 
                  onClick={() => removeProductImage(img.id)}
                  disabled={isGenerating}
                  style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'var(--aurora-danger)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Model Selection */}
      <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', borderBottom: '2px solid var(--aurora-border)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--aurora-primary)' }}>
            <ImageIcon size={28} />
            2. Choose Model Array
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Filter size={20} style={{ color: 'var(--aurora-text-muted)' }} />
            <select 
              className="aurora-input" 
              style={{ width: 'auto', padding: '0.75rem 2.5rem 0.75rem 1rem', cursor: 'pointer' }}
              value={ethnicityFilter} 
              onChange={(e) => {
                setEthnicityFilter(e.target.value);
                setSelectedModelId(null);
              }}
              disabled={isGenerating}
            >
              <option value="all">All Ethnicities (Show All)</option>
              <option value="australian">Australian</option>
              <option value="african">African</option>
              <option value="malaysian_indonesian">Malaysian/Indonesian</option>
              <option value="indian">Indian</option>
              <option value="middle_eastern">Middle Eastern</option>
              <option value="chinese">Chinese</option>
              <option value="japanese">Japanese</option>
              <option value="korean">Korean</option>
              <option value="european">European</option>
              <option value="russian">Russian</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {displayModels.map(model => (
            <div 
              key={model.id} 
              style={{ 
                border: `3px solid ${selectedModelId === model.id ? 'var(--aurora-primary)' : 'transparent'}`,
                background: selectedModelId === model.id ? 'rgba(79, 70, 229, 0.04)' : 'var(--aurora-surface)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                transition: 'var(--transition-base)',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                opacity: isGenerating && selectedModelId !== model.id ? 0.4 : 1,
                boxShadow: selectedModelId === model.id ? 'var(--shadow-md)' : 'var(--shadow-sm)'
              }}
              onClick={() => !isGenerating && setSelectedModelId(model.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ 
                  width: '28px', height: '28px', borderRadius: '50%', 
                  border: `3px solid ${selectedModelId === model.id ? 'var(--aurora-primary)' : 'var(--aurora-border)'}`,
                  background: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {selectedModelId === model.id && <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--aurora-primary)' }} />}
                </div>
                <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{model.name}</h4>
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                {model.poses.map(pose => (
                  <div key={pose.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <img 
                      src={pose.src} 
                      alt={`Pose ${pose.id}`} 
                      onError={() => handleImageError(model.id)}
                      style={{ width: '130px', height: '180px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '2px solid var(--aurora-border)', background: '#fff', boxShadow: 'var(--shadow-sm)' }} 
                    />
                    <span style={{ fontSize: '0.9rem', color: 'var(--aurora-text-muted)', fontWeight: 600 }}>Pose {pose.id}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {displayModels.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 0', background: 'rgba(255,255,255,0.5)', borderRadius: 'var(--radius-lg)' }}>
                <ImageIcon size={48} style={{ color: 'var(--aurora-border)', margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--aurora-text-muted)', fontSize: '1.1rem', fontWeight: 500 }}>
                    No populated models found for this selection.<br/>
                    <span style={{ fontSize: '0.9rem' }}>(Ensure your images are correctly placed in the <code>public</code> folder)</span>
                </p>
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Action Button */}
      <button 
        className="aurora-btn aurora-btn-primary" 
        style={{ width: '100%', padding: '1.25rem', fontSize: '1.25rem', marginBottom: '2.5rem', height: 'auto', borderRadius: 'var(--radius-lg)' }}
        onClick={handleGenerate}
        disabled={isGenerating || !selectedModelId || productImages.length === 0}
      >
        {isGenerating ? (
          <>
            <Loader2 size={28} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span>Processing Engine Matrix...</span>
          </>
        ) : (
          <>
            <CheckCircle size={28} />
            <span>Generate Outputs</span>
          </>
        )}
      </button>

      {/* Step 4: Results Matrix */}
      {(generationResults.length > 0 || isGenerating) && (
        <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--aurora-primary)' }}>
              <Package size={28} />
              Generated Results
            </h3>
            
            {generationResults.some(r => r.status === 'success') && (
              <button onClick={downloadMasterZip} className="aurora-btn aurora-btn-outline" style={{ background: 'white', fontSize: '1rem', padding: '0.75rem 1.25rem' }}>
                📦 Download Master ZIP
              </button>
            )}
          </div>

          {productImages.map(prodImg => {
            const specificResults = generationResults.filter(r => r.productId === prodImg.id);
            if (specificResults.length === 0) return null;

            return (
              <div key={prodImg.id} style={{ marginBottom: '2.5rem', padding: '2rem', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--aurora-border)', boxShadow: 'var(--shadow-sm)' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '2px dashed var(--aurora-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <img src={prodImg.previewUrl} alt="Source" style={{ width: '60px', height: '60px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--aurora-border)' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--aurora-text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>Source Input</div>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{prodImg.name}</div>
                    </div>
                  </div>
                  
                  {specificResults.some(r => r.status === 'success') && (
                    <button 
                      onClick={() => downloadArrayZip(prodImg.id, prodImg.name)} 
                      className="aurora-btn" 
                      style={{ background: 'var(--aurora-text-main)', color: 'white', fontSize: '0.9rem', padding: '0.6rem 1.25rem' }}
                    >
                      ⬇️ Array .ZIP
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                  {specificResults.map(res => (
                    <div key={res.uid} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem', border: '1px solid var(--aurora-border)', borderRadius: 'var(--radius-md)', background: 'var(--aurora-bg)' }}>
                      
                      <div style={{ width: '100%', aspectRatio: '3/4', background: '#e2e8f0', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                        {res.status === 'loading' && (
                          <div style={{ textAlign: 'center', color: 'var(--aurora-text-muted)' }}>
                            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }} />
                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Pose {res.poseId}</div>
                          </div>
                        )}
                        {res.status === 'success' && (
                          <img src={res.blobUrl} alt={`Generated Pose ${res.poseId}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                        {res.status === 'error' && (
                          <div style={{ textAlign: 'center', color: 'var(--aurora-danger)', padding: '1.5rem' }}>
                            <AlertCircle size={32} style={{ margin: '0 auto 0.75rem' }} />
                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Failed</div>
                          </div>
                        )}
                      </div>
                      
                      {res.status === 'success' && (
                        <button 
                          onClick={() => triggerDownload(res.blobUrl, res.filename)}
                          className="aurora-btn aurora-btn-outline" 
                          style={{ width: '100%', padding: '0.6rem', fontSize: '0.95rem' }}
                        >
                          <Download size={16} /> Download
                        </button>
                      )}
                      
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}