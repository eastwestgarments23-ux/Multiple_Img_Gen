import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Loader2, AlertCircle, Key } from "lucide-react";

// Components & Data
import { AVAILABLE_MODELS } from "../data/constants.js";
import TokenShop from "../components/TokenShop.jsx";
import ProductUploader from "../components/ProductUploader.jsx";
import ModelSelector from "../components/ModelSelector.jsx";
import ResultsMatrix from "../components/ResultsMatrix.jsx";

export default function Generator({ user }) {
  // Application Data State
  const [profileData, setProfileData] = useState(null);
  
  // Input State
  const [productImages, setProductImages] = useState([]);
  const [customModel, setCustomModel] = useState(null);
  const [ethnicityFilter, setEthnicityFilter] = useState("all");
  const [selectedModelId, setSelectedModelId] = useState(null);
  
  // Generation Process State
  const [generationResults, setGenerationResults] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [globalError, setGlobalError] = useState("");

  // System States
  const [showTokenShop, setShowTokenShop] = useState(false);
  const [brokenModels, setBrokenModels] = useState(new Set());

  // Fetch real-time API Key & Token status
  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const token = localStorage.getItem("aurora_token");
      if (!token) return;
      const res = await fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setProfileData(data.user);
    } catch (err) {
      console.error("Failed to fetch profile", err);
    }
  };

  // ==========================================
  // UTILITIES
  // ==========================================
  const getBase64FromUrl = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load pose image`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const convertBase64ToBlob = (base64Data, mimeType = "image/png") => {
    const rawBinary = atob(base64Data);
    const bytesBuffer = new Uint8Array(rawBinary.length);
    for (let i = 0; i < rawBinary.length; i++) {
      bytesBuffer[i] = rawBinary.charCodeAt(i);
    }
    return new Blob([bytesBuffer], { type: mimeType });
  };

  // ==========================================
  // GENERATION ENGINE
  // ==========================================
  const handleGenerate = async () => {
    if (productImages.length === 0) return setGlobalError("Please upload at least one product image.");
    if (!selectedModelId) return setGlobalError("Please select a Model Array.");
    if (profileData && !profileData.hasApiKey) {
        return setGlobalError("You must configure your API Key in your profile before generating.");
    }

    setGlobalError("");
    setShowTokenShop(false);
    setIsGenerating(true);
    setGenerationResults([]);

    const token = localStorage.getItem("aurora_token");
    
    // Determine Target Model
    const allModels = customModel ? [customModel, ...AVAILABLE_MODELS] : AVAILABLE_MODELS;
    const targetModel = allModels.find((m) => m.id === selectedModelId);
    
    let matrixState = [];
    productImages.forEach((prodImg) => {
      targetModel.poses.forEach((pose) => {
        matrixState.push({
          uid: `${prodImg.id}-${pose.id}`,
          productId: prodImg.id,
          productName: prodImg.name,
          modelId: targetModel.id,
          poseId: pose.id,
          status: "loading",
          blobUrl: null,
          blob: null,
          filename: `Model_${targetModel.id}_Pose_${pose.id}_${prodImg.name}.png`,
          errorMsg: null,
        });
      });
    });

    setGenerationResults(matrixState);
    let haltExecution = false;

    for (const prodImg of productImages) {
      if (haltExecution) break;
      for (const pose of targetModel.poses) {
        if (haltExecution) break;
        const uid = `${prodImg.id}-${pose.id}`;

        try {
          // If custom model, use the pre-extracted base64, otherwise fetch from URL
          const poseBase64Data = pose.base64Data || await getBase64FromUrl(pose.src);
          
          const response = await fetch("/api/generate-pose", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              base64Image: prodImg.data,
              mimeType: prodImg.mimeType,
              sourceName: prodImg.name,
              poseBase64: poseBase64Data,
              poseMimeType: "image/jpeg",
              modelId: targetModel.id,
              poseId: pose.id,
              ethnicity: targetModel.ethnicity,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            if (data.error === "INSUFFICIENT_TOKENS") {
              setShowTokenShop(true);
              setGlobalError("You have run out of tokens. Please recharge to continue.");
              haltExecution = true;
              throw new Error("Quota Exceeded");
            }
            if (data.error === "MISSING_API_KEY") {
              haltExecution = true;
              throw new Error("API Key Missing");
            }
            throw new Error(data.error || "Generation failed.");
          }

          // Update local token count state visually
          if (data.tokens_remaining !== undefined) {
             setProfileData(prev => ({...prev, tokens: data.tokens_remaining}));
          }

          const imageBlob = convertBase64ToBlob(data.image_base64, data.mime_type);
          const blobUrl = URL.createObjectURL(imageBlob);

          setGenerationResults((prev) =>
            prev.map((res) => res.uid === uid ? { ...res, status: "success", blobUrl, blob: imageBlob } : res)
          );
        } catch (err) {
          if (err.message !== "Quota Exceeded" && err.message !== "API Key Missing") {
            setGenerationResults((prev) =>
              prev.map((res) => res.uid === uid ? { ...res, status: "error", errorMsg: err.message } : res)
            );
          } else {
            setGenerationResults((prev) =>
              prev.map((res) => res.status === "loading" ? { ...res, status: "error", errorMsg: "Cancelled: " + err.message } : res)
            );
          }
        }
      }
    }
    setIsGenerating(false);
  };

  return (
    <div style={{ padding: "3rem 5%", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
      
      {/* System Alerts */}
      {profileData && !profileData.hasApiKey && (
        <div style={{
            background: "#fffbeb", border: "1px solid #fde68a", padding: "1.5rem", borderRadius: "var(--radius-lg)",
            marginBottom: "2rem", display: "flex", gap: "1rem", alignItems: "flex-start", boxShadow: "var(--shadow-md)"
        }}>
          <AlertCircle size={28} color="#b45309" style={{ marginTop: "4px" }} />
          <div>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#b45309", fontSize: "1.25rem" }}>API Key Required</h3>
            <p style={{ margin: "0 0 1rem 0", color: "#92400e", lineHeight: 1.5 }}>
              You must supply your own Google Gemini API key to use this generator. You are responsible for your own Cloud API billing.
            </p>
            <Link to="/profile" className="aurora-btn" style={{ background: "#b45309", color: "white", padding: "0.5rem 1rem", fontSize: "0.95rem" }}>
              <Key size={16} /> Configure API Key in Profile
            </Link>
          </div>
        </div>
      )}

      {/* Token Shop (Appears if limit hit) */}
      {showTokenShop && (
        <TokenShop 
          user={profileData || user} 
          onPaymentSuccess={() => {
            setShowTokenShop(false);
            fetchProfileData();
          }} 
        />
      )}

      {/* Global Error Banner */}
      {globalError && (
        <div style={{
            display: "flex", alignItems: "center", gap: "0.75rem", background: "#fef2f2", color: "var(--aurora-danger)",
            padding: "1.25rem", borderRadius: "var(--radius-md)", border: "1px solid #fecaca", marginBottom: "2rem", boxShadow: "var(--shadow-sm)"
        }}>
          <AlertCircle size={24} />
          <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>{globalError}</span>
        </div>
      )}

      {/* Modular Generation Pipeline */}
      <ProductUploader 
        productImages={productImages}
        setProductImages={setProductImages}
        isGenerating={isGenerating}
        setGlobalError={setGlobalError}
      />

      <ModelSelector 
        isGenerating={isGenerating}
        customModel={customModel}
        setCustomModel={setCustomModel}
        selectedModelId={selectedModelId}
        setSelectedModelId={setSelectedModelId}
        ethnicityFilter={ethnicityFilter}
        setEthnicityFilter={setEthnicityFilter}
        brokenModels={brokenModels}
        setBrokenModels={setBrokenModels}
      />

      {/* Action Button */}
      <button
        className="aurora-btn aurora-btn-primary"
        style={{ width: "100%", padding: "1.25rem", fontSize: "1.25rem", marginBottom: "2.5rem", borderRadius: "var(--radius-lg)" }}
        onClick={handleGenerate}
        disabled={isGenerating || !selectedModelId || productImages.length === 0 || (profileData && !profileData.hasApiKey)}
      >
        {isGenerating ? (
          <>
            <Loader2 size={28} className="spin" style={{ animation: "spin 1s linear infinite" }} />
            <span>Processing Matrix...</span>
          </>
        ) : (
          <>
            <CheckCircle size={28} />
            <span>Generate Outputs</span>
          </>
        )}
      </button>

      <ResultsMatrix 
        generationResults={generationResults}
        isGenerating={isGenerating}
        productImages={productImages}
        selectedModelId={selectedModelId}
      />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}