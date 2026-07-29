import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Upload,
  Image as ImageIcon,
  Filter,
  CheckCircle,
  Loader2,
  Download,
  Package,
  AlertCircle,
  Zap,
  Coins,
  Key,
  Mail
} from "lucide-react";
import JSZip from "jszip";

// Centralized Static Model Data
const AVAILABLE_MODELS = [
  {
    id: "1",
    ethnicity: "african",
    name: "Model Array (African)",
    poses: [
      { id: "1", src: "/African/M1_pose1.png" },
      { id: "2", src: "/African/M1_pose2.png" },
      { id: "3", src: "/African/M1_pose3.png" },
      { id: "4", src: "/African/M1_pose4.png" },
    ],
  },
  {
    id: "2",
    ethnicity: "korean",
    name: "Model Array (Korean)",
    poses: [
      { id: "1", src: "/Korean/M1_pose1.png" },
      { id: "2", src: "/Korean/M1_pose2.png" },
      { id: "3", src: "/Korean/M1_pose3.png" },
      { id: "4", src: "/Korean/M1_pose4.png" },
    ],
  },
  {
    id: "3",
    ethnicity: "indian",
    name: "Model Array (Indian)",
    poses: [
      { id: "1", src: "/Indian/M1_pose1.png" },
      { id: "2", src: "/Indian/M1_pose2.png" },
      { id: "3", src: "/Indian/M1_pose3.png" },
    ],
  },
  {
    id: "4",
    ethnicity: "australian",
    name: "Model Array (Australian)",
    poses: [
      { id: "1", src: "/Australian/M1_pose1.png" },
      { id: "2", src: "/Australian/M1_pose2.png" },
      { id: "3", src: "/Australian/M1_pose3.png" },
      { id: "4", src: "/Australian/M1_pose4.png" },
    ],
  },
  {
    id: "5",
    ethnicity: "malaysian_indonesian",
    name: "Model Array (Malaysian/Indonesian)",
    poses: [
      { id: "1", src: "/Malaysian/M1_pose1.png" },
      { id: "2", src: "/Malaysian/M1_pose2.png" },
      { id: "3", src: "/Malaysian/M1_pose3.png" },
      { id: "4", src: "/Malaysian/M1_pose4.png" },
    ],
  },
  {
    id: "6",
    ethnicity: "middle_eastern",
    name: "Model Array (Middle Eastern)",
    poses: [
      { id: "1", src: "/MiddleEastern/M1_pose1.png" },
      { id: "2", src: "/MiddleEastern/M1_pose2.png" },
      { id: "3", src: "/MiddleEastern/M1_pose3.png" },
      { id: "4", src: "/MiddleEastern/M1_pose4.png" },
    ],
  },
  {
    id: "7",
    ethnicity: "chinese",
    name: "Model Array (Chinese)",
    poses: [
      { id: "1", src: "/Chinese/M1_pose1.png" },
      { id: "2", src: "/Chinese/M1_pose2.png" },
      { id: "3", src: "/Chinese/M1_pose3.png" },
      { id: "4", src: "/Chinese/M1_pose4.png" },
    ],
  },
  {
    id: "8",
    ethnicity: "japanese",
    name: "Model Array (Japanese)",
    poses: [
      { id: "1", src: "/Japanese/M1_pose1.png" },
      { id: "2", src: "/Japanese/M1_pose2.png" },
      { id: "3", src: "/Japanese/M1_pose3.png" },
      { id: "4", src: "/Japanese/M1_pose4.png" },
    ],
  },
  {
    id: "9",
    ethnicity: "european",
    name: "Model Array (European)",
    poses: [
      { id: "1", src: "/European/M1_pose1.png" },
      { id: "2", src: "/European/M1_pose2.png" },
      { id: "3", src: "/European/M1_pose3.png" },
      { id: "4", src: "/European/M1_pose4.png" },
    ],
  },
  {
    id: "10",
    ethnicity: "russian",
    name: "Model Array (Russian)",
    poses: [
      { id: "1", src: "/Russian/M1_pose1.png" },
      { id: "2", src: "/Russian/M1_pose2.png" },
      { id: "3", src: "/Russian/M1_pose3.png" },
      { id: "4", src: "/Russian/M11_pose4.png" },
    ],
  },
];

// Token Economy Configuration
const TOKEN_PACKAGES = [
  { id: "100", name: "100 Tokens", price: "₹2,000", discount: "" },
  { id: "500", name: "500 Tokens", price: "₹8,000", discount: "20% OFF" },
  { id: "1000", name: "1,000 Tokens", price: "₹14,000", discount: "30% OFF" }
];

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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [brokenModels, setBrokenModels] = useState(new Set());
  
  // Refs
  const fileInputRef = useRef(null);
  const customModelInputRef = useRef(null);

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
  // INPUT HANDLING & UTILITIES
  // ==========================================
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target.result.split(",")[1];
        setProductImages((prev) => [
          ...prev,
          {
            id: Date.now() + index,
            name: file.name.split(".")[0],
            mimeType: file.type,
            data: base64String,
            previewUrl: event.target.result,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setGlobalError("");
  };

  const removeProductImage = (idToRemove) =>
    setProductImages((prev) => prev.filter((img) => img.id !== idToRemove));

  // Custom Model Upload Handler (Up to 4 images)
  const handleCustomModelUpload = (e) => {
    const files = Array.from(e.target.files).slice(0, 4); // Strict limit 4
    if (files.length === 0) return;
    
    if (files.length > 4) {
        alert("You can only upload up to 4 images for a custom model array. Only the first 4 will be used.");
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
    for (let i = 0; i < rawBinary.length; i++)
      bytesBuffer[i] = rawBinary.charCodeAt(i);
    return new Blob([bytesBuffer], { type: mimeType });
  };

  const triggerDownload = (url, filename) => {
    const a = document.createElement("a");
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

  // ==========================================
  // RAZORPAY TOKEN CHECKOUT FLOW
  // ==========================================
  const handleTokenPurchase = async (packageId) => {
    setIsProcessingPayment(true);
    const token = localStorage.getItem("aurora_token");

    try {
      const orderRes = await fetch("/api/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ packageId }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error);

      const options = {
        key: orderData.keyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "Aurora Generator",
        description: `Purchase ${packageId} Tokens`,
        order_id: orderData.order.id,
        handler: async function (response) {
          const verifyRes = await fetch("/api/verify-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              packageId,
            }),
          });

          if (verifyRes.ok) {
            alert(`Payment Successful! Tokens have been added.`);
            setShowTokenShop(false);
            fetchProfileData(); // Refresh token count
          } else {
            alert("Payment verification failed. Please contact support.");
          }
        },
        prefill: { name: user.name, email: user.email, contact: user.phone },
        theme: { color: "#4f46e5" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        alert(`Payment Failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // ==========================================
  // ZIP DOWNLOAD HANDLERS
  // ==========================================
  const downloadArrayZip = async (productId, productName) => {
    const arrayResults = generationResults.filter((r) => r.productId === productId && r.status === "success");
    if (arrayResults.length === 0) return;
    const zip = new JSZip();
    arrayResults.forEach((res) => zip.file(res.filename, res.blob));
    const content = await zip.generateAsync({ type: "blob" });
    triggerDownload(URL.createObjectURL(content), `Model_${selectedModelId}_${productName}_Array.zip`);
  };

  const downloadMasterZip = async () => {
    const successfulResults = generationResults.filter((r) => r.status === "success");
    if (successfulResults.length === 0) return;
    const zip = new JSZip();
    successfulResults.forEach((res) => {
      const folder = zip.folder(`Model_${res.modelId}_${res.productName}`);
      folder.file(res.filename, res.blob);
    });
    const content = await zip.generateAsync({ type: "blob" });
    triggerDownload(URL.createObjectURL(content), `Aurora_Generated_Matrix.zip`);
  };

  // Combine custom model with static models for display
  const allModels = customModel ? [customModel, ...AVAILABLE_MODELS] : AVAILABLE_MODELS;
  const displayModels = allModels.filter(
    (m) => (ethnicityFilter === "all" || m.ethnicity === ethnicityFilter || m.id === "custom") && !brokenModels.has(m.id)
  );

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

      {/* TOKEN SHOP (Triggers when Limit Hit) */}
      {showTokenShop && (
        <div style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)", borderRadius: "var(--radius-lg)",
            padding: "2.5rem", marginBottom: "2rem", color: "white", boxShadow: "0 20px 25px -5px rgba(67, 56, 202, 0.4)"
        }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "2rem", fontWeight: 700, margin: "0 0 0.5rem 0", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
                <Coins size={32} /> Recharge Tokens
            </h2>
            <p style={{ opacity: 0.9, fontSize: "1.1rem" }}>1 Token = 1 Generation. Unlock higher discounts with larger packages.</p>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
              {TOKEN_PACKAGES.map(pkg => (
                  <div key={pkg.id} style={{
                      background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                      padding: "1.5rem", borderRadius: "var(--radius-md)", textAlign: "center", backdropFilter: "blur(10px)"
                  }}>
                      {pkg.discount && (
                          <div style={{ background: "var(--aurora-secondary)", color: "white", fontSize: "0.8rem", fontWeight: 700, padding: "0.25rem 0.75rem", borderRadius: "var(--radius-full)", display: "inline-block", marginBottom: "1rem" }}>
                              {pkg.discount}
                          </div>
                      )}
                      <h3 style={{ fontSize: "1.5rem", margin: "0 0 0.5rem 0" }}>{pkg.name}</h3>
                      <div style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1.5rem" }}>{pkg.price}</div>
                      <button 
                          onClick={() => handleTokenPurchase(pkg.id)} 
                          disabled={isProcessingPayment}
                          className="aurora-btn" 
                          style={{ width: "100%", background: "white", color: "#4338ca", justifyContent: "center" }}
                      >
                          {isProcessingPayment ? <Loader2 size={18} className="spin" /> : <Zap size={18} />}
                          Buy Now
                      </button>
                  </div>
              ))}
          </div>

          <div style={{ marginTop: "2rem", textAlign: "center", opacity: 0.8, fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              <Mail size={16} /> Need a custom token package? Contact us at support@auroragenerator.com
          </div>
        </div>
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

      {/* Step 1: Upload */}
      <div className="glass-panel" style={{ padding: "2.5rem", borderRadius: "var(--radius-lg)", marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.5rem", margin: "0 0 1.5rem 0", display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--aurora-primary)" }}>
          <Upload size={28} /> 1. Upload Product Image(s)
        </h3>
        <input type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} ref={fileInputRef} />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="aurora-btn aurora-btn-outline"
          style={{ padding: "1rem 2rem", fontSize: "1.1rem" }}
          disabled={isGenerating}
        >
          Select Clothing Images
        </button>
        {productImages.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", marginTop: "2rem" }}>
            {productImages.map((img) => (
              <div key={img.id} style={{ position: "relative", width: "140px", height: "140px", borderRadius: "var(--radius-md)", overflow: "hidden", border: "2px solid var(--aurora-border)", boxShadow: "var(--shadow-sm)" }}>
                <img src={img.previewUrl} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button onClick={() => removeProductImage(img.id)} disabled={isGenerating} style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,0.7)", color: "white", border: "none", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", transition: "background 0.2s" }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Model Selection */}
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

      {/* Step 3: Action Button */}
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

      {/* Step 4: Results Matrix */}
      {(generationResults.length > 0 || isGenerating) && (
        <div className="glass-panel" style={{ padding: "2.5rem", borderRadius: "var(--radius-lg)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1.5rem" }}>
            <h3 style={{ fontSize: "1.5rem", margin: 0, display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--aurora-primary)" }}>
              <Package size={28} />
              Generated Results
            </h3>
            {generationResults.some((r) => r.status === "success") && (
              <button onClick={downloadMasterZip} className="aurora-btn aurora-btn-outline" style={{ background: "white", padding: "0.75rem 1.25rem" }}>
                📦 Download Master ZIP
              </button>
            )}
          </div>

          {productImages.map((prodImg) => {
            const specificResults = generationResults.filter((r) => r.productId === prodImg.id);
            if (specificResults.length === 0) return null;

            return (
              <div key={prodImg.id} style={{ marginBottom: "2.5rem", padding: "2rem", background: "white", borderRadius: "var(--radius-lg)", border: "1px solid var(--aurora-border)", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "2px dashed var(--aurora-border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                    <img src={prodImg.previewUrl} style={{ width: "60px", height: "60px", borderRadius: "var(--radius-sm)", objectFit: "cover", border: "1px solid var(--aurora-border)" }} />
                    <div>
                      <div style={{ fontSize: "0.85rem", color: "var(--aurora-text-muted)", fontWeight: 700 }}>SOURCE</div>
                      <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>{prodImg.name}</div>
                    </div>
                  </div>
                  {specificResults.some((r) => r.status === "success") && (
                    <button onClick={() => downloadArrayZip(prodImg.id, prodImg.name)} className="aurora-btn" style={{ background: "var(--aurora-text-main)", color: "white", padding: "0.6rem 1.25rem" }}>
                      ⬇️ Array .ZIP
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" }}>
                  {specificResults.map((res) => (
                    <div key={res.uid} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "0.75rem", border: "1px solid var(--aurora-border)", borderRadius: "var(--radius-md)", background: "var(--aurora-bg)" }}>
                      <div style={{ width: "100%", aspectRatio: "3/4", background: "#e2e8f0", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                        {res.status === "loading" && (
                          <div style={{ textAlign: "center", color: "var(--aurora-text-muted)" }}>
                            <Loader2 size={32} style={{ animation: "spin 1s linear infinite", margin: "0 auto 0.75rem" }} />
                            <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>Pose {res.poseId}</div>
                          </div>
                        )}
                        {res.status === "success" && <img src={res.blobUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                        {res.status === "error" && (
                          <div style={{ textAlign: "center", color: "var(--aurora-danger)", padding: "1rem" }}>
                            <AlertCircle size={28} style={{ margin: "0 auto 0.5rem" }} />
                            <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{res.errorMsg}</div>
                          </div>
                        )}
                      </div>
                      {res.status === "success" && (
                        <button onClick={() => triggerDownload(res.blobUrl, res.filename)} className="aurora-btn aurora-btn-outline" style={{ padding: "0.6rem" }}>
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