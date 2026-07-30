import { useRef, useState } from "react";
import { Image as ImageIcon, Upload, Filter, AlertCircle, X } from "lucide-react";
import { AVAILABLE_MODELS } from "../data/constants.js";

export default function ModelSelector({
  isGenerating,
  customModel,
  setCustomModel,
  selectedModelId,
  setSelectedModelId,
  ethnicityFilter,
  setEthnicityFilter,
  brokenModels,
  setBrokenModels
}) {
  const customModelInputRef = useRef(null);
  const [alertModal, setAlertModal] = useState({ show: false, message: '' });

  // Custom Model Upload Handler (Up to 4 images)
  const handleCustomModelUpload = (e) => {
    const files = Array.from(e.target.files).slice(0, 4); // Strict limit 4
    if (files.length === 0) return;
    
    if (e.target.files.length > 4) {
        setAlertModal({ show: true, message: "You can only upload up to 4 images for a custom model array. We will only process the first 4 images you selected." });
    }

    const poses = [];
    let loadedCount = 0;

    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        poses.push({
          id: `c${index + 1}`,
          src: event.target.result,
          base64Data: event.target.result.split(",")[1]
        });
        
        loadedCount++;
        if (loadedCount === files.length) {
          setCustomModel({
            id: "custom",
            ethnicity: "custom",
            name: "Your Custom Model Array",
            poses: poses
          });
          setSelectedModelId("custom");
          setEthnicityFilter("all");
        }
      };
      reader.readAsDataURL(file);
    });
    if (customModelInputRef.current) customModelInputRef.current.value = "";
  };

  const removeCustomModel = (e) => {
      e.stopPropagation();
      setCustomModel(null);
      if (selectedModelId === "custom") setSelectedModelId(null);
  };

  const handleImageError = (modelId) => {
    setBrokenModels((prev) => new Set(prev).add(modelId));
    if (selectedModelId === modelId) setSelectedModelId(null);
  };

  // Combine custom model with static models for display
  const allModels = customModel ? [customModel, ...AVAILABLE_MODELS] : AVAILABLE_MODELS;
  const displayModels = allModels.filter(
    (m) => (ethnicityFilter === "all" || m.ethnicity === ethnicityFilter || m.id === "custom") && !brokenModels.has(m.id)
  );

  return (
    <>
      <div className="glass-panel" style={{ padding: "2.5rem", borderRadius: "var(--radius-lg)", marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5rem", borderBottom: "2px solid var(--aurora-border)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
          <div>
              <h3 style={{ fontSize: "1.5rem", margin: 0, display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--aurora-primary)" }}>
                <ImageIcon size={28} /> 2. Choose Model Array
              </h3>
              <p style={{ margin: "0.5rem 0 0 0", color: "var(--aurora-text-muted)", fontSize: "0.9rem" }}>Select a pre-built model array or upload your own reference poses (Max 4).</p>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            {/* Custom Upload Button */}
            <input type="file" multiple accept="image/*" onChange={handleCustomModelUpload} style={{ display: "none" }} ref={customModelInputRef} />
            <button 
                onClick={() => customModelInputRef.current?.click()}
                className="aurora-btn aurora-btn-outline" 
                style={{ padding: "0.75rem 1rem", fontSize: "0.9rem" }}
                disabled={isGenerating || customModel !== null}
            >
                <Upload size={16} /> Upload Custom Array
            </button>

            {/* Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Filter size={20} style={{ color: "var(--aurora-text-muted)" }} />
                <select
                className="aurora-input"
                style={{ width: "auto", padding: "0.75rem 2.5rem 0.75rem 1rem", cursor: "pointer" }}
                value={ethnicityFilter}
                onChange={(e) => {
                    setEthnicityFilter(e.target.value);
                    setSelectedModelId(null);
                }}
                disabled={isGenerating}
                >
                <option value="all">All Ethnicities</option>
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
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {displayModels.map((model) => (
            <div
              key={model.id}
              style={{
                border: `3px solid ${selectedModelId === model.id ? "var(--aurora-primary)" : "transparent"}`,
                background: selectedModelId === model.id ? "rgba(79, 70, 229, 0.04)" : "var(--aurora-surface)",
                borderRadius: "var(--radius-lg)",
                padding: "1.5rem",
                cursor: isGenerating ? "not-allowed" : "pointer",
                opacity: isGenerating && selectedModelId !== model.id ? 0.4 : 1,
                boxShadow: selectedModelId === model.id ? "var(--shadow-md)" : "var(--shadow-sm)",
                position: "relative"
              }}
              onClick={() => !isGenerating && setSelectedModelId(model.id)}
            >
              {model.id === "custom" && !isGenerating && (
                 <button 
                    onClick={removeCustomModel}
                    style={{ position: "absolute", top: "1rem", right: "1rem", background: "#fef2f2", color: "var(--aurora-danger)", border: "1px solid #fecaca", padding: "0.25rem 0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", cursor: "pointer", fontWeight: 600 }}
                 >
                    Remove Custom Array
                 </button>
              )}
              
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: `3px solid ${selectedModelId === model.id ? "var(--aurora-primary)" : "var(--aurora-border)"}`, background: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {selectedModelId === model.id && <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: "var(--aurora-primary)" }} />}
                </div>
                <h4 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
                  {model.name} {model.id === "custom" && <span style={{fontSize: "0.85rem", color: "var(--aurora-primary)", background: "rgba(79,70,229,0.1)", padding: "0.2rem 0.5rem", borderRadius: "4px", marginLeft: "0.5rem"}}>Your Upload</span>}
                </h4>
              </div>
              
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
                {model.poses.map((pose) => (
                  <div key={pose.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                    <img
                      src={pose.src}
                      alt={`Pose ${pose.id}`}
                      onError={() => handleImageError(model.id)}
                      style={{ width: "130px", height: "180px", objectFit: "cover", borderRadius: "var(--radius-md)", border: "2px solid var(--aurora-border)", background: "#fff", boxShadow: "var(--shadow-sm)" }}
                    />
                    <span style={{ fontSize: "0.9rem", color: "var(--aurora-text-muted)", fontWeight: 600 }}>
                      Pose {pose.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Themed Alert Modal for Upload Limits */}
      {alertModal.show && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="glass-panel" style={{ background: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)', maxWidth: '400px', width: '100%', borderTop: `4px solid #f59e0b`, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', position: 'relative' }}>
            <button onClick={() => setAlertModal({ show: false, message: '' })} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--aurora-text-muted)' }}>
              <X size={20} />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
              <AlertCircle size={48} style={{ color: '#f59e0b' }} />
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Upload Limit Reached</h3>
              <p style={{ margin: 0, color: 'var(--aurora-text-muted)', lineHeight: 1.5 }}>
                {alertModal.message}
              </p>
              <button onClick={() => setAlertModal({ show: false, message: '' })} className="aurora-btn" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', background: '#f59e0b', color: 'white' }}>
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}