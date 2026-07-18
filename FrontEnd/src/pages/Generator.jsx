import { useState, useRef } from "react";
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
  ArrowUpRight,
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

const TIERS = {
  free: { next: "pro", name: "Pro", price: "₹999", limit: 50 },
  pro: { next: "elite", name: "Elite", price: "₹2499", limit: 200 },
  elite: { next: null },
};

export default function Generator({ user }) {
  const [productImages, setProductImages] = useState([]);
  const [ethnicityFilter, setEthnicityFilter] = useState("all");
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [generationResults, setGenerationResults] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [globalError, setGlobalError] = useState("");

  // Rate Limit & Upgrade State
  const [limitData, setLimitData] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [brokenModels, setBrokenModels] = useState(new Set());
  const fileInputRef = useRef(null);

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
    if (productImages.length === 0)
      return setGlobalError("Please upload at least one product image.");
    if (!selectedModelId) return setGlobalError("Please select a Model Array.");

    setGlobalError("");
    setLimitData(null);
    setIsGenerating(true);
    setGenerationResults([]);

    const token = localStorage.getItem("aurora_token");
    const targetModel = AVAILABLE_MODELS.find((m) => m.id === selectedModelId);
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
          const poseBase64Data = await getBase64FromUrl(pose.src);
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
            // DETECT RATE LIMIT
            if (data.error === "LIMIT_REACHED") {
              setLimitData({
                currentTier: data.currentTier || "free",
                message: data.message,
              });
              haltExecution = true;
              throw new Error("Quota Exceeded");
            }
            throw new Error(data.error || "Generation failed.");
          }

          const imageBlob = convertBase64ToBlob(
            data.image_base64,
            data.mime_type,
          );
          const blobUrl = URL.createObjectURL(imageBlob);

          setGenerationResults((prev) =>
            prev.map((res) =>
              res.uid === uid
                ? { ...res, status: "success", blobUrl, blob: imageBlob }
                : res,
            ),
          );
        } catch (err) {
          if (err.message !== "Quota Exceeded") {
            setGenerationResults((prev) =>
              prev.map((res) =>
                res.uid === uid
                  ? { ...res, status: "error", errorMsg: err.message }
                  : res,
              ),
            );
          } else {
            // Mark all remaining loading states as cancelled
            setGenerationResults((prev) =>
              prev.map((res) =>
                res.status === "loading"
                  ? {
                      ...res,
                      status: "error",
                      errorMsg: "Cancelled due to limit",
                    }
                  : res,
              ),
            );
          }
        }
      }
    }
    setIsGenerating(false);
  };

  // ==========================================
  // RAZORPAY CHECKOUT FLOW
  // ==========================================
  const handleUpgrade = async (targetTier) => {
    setIsProcessingPayment(true);
    const token = localStorage.getItem("aurora_token");

    try {
      // 1. Create Order on Backend
      const orderRes = await fetch("/api/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetTier }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error);

      // 2. Initialize Razorpay UI
      const options = {
        key: orderData.keyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "Aurora Generator",
        description: `Upgrade to ${targetTier.toUpperCase()} Tier`,
        order_id: orderData.order.id,
        handler: async function (response) {
          // 3. Verify Payment on Backend
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
              targetTier,
            }),
          });

          if (verifyRes.ok) {
            alert(
              "Payment Successful! Your tier has been upgraded. Please try generating again.",
            );
            setLimitData(null); // Clear the banner
            // Optional: Update local user state if needed
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
    const arrayResults = generationResults.filter(
      (r) => r.productId === productId && r.status === "success",
    );
    if (arrayResults.length === 0) return;
    const zip = new JSZip();
    arrayResults.forEach((res) => zip.file(res.filename, res.blob));
    const content = await zip.generateAsync({ type: "blob" });
    triggerDownload(
      URL.createObjectURL(content),
      `Model_${selectedModelId}_${productName}_Array.zip`,
    );
  };

  const downloadMasterZip = async () => {
    const successfulResults = generationResults.filter(
      (r) => r.status === "success",
    );
    if (successfulResults.length === 0) return;
    const zip = new JSZip();
    successfulResults.forEach((res) => {
      const folder = zip.folder(`Model_${res.modelId}_${res.productName}`);
      folder.file(res.filename, res.blob);
    });
    const content = await zip.generateAsync({ type: "blob" });
    triggerDownload(
      URL.createObjectURL(content),
      `Aurora_Generated_Matrix.zip`,
    );
  };

  const displayModels = AVAILABLE_MODELS.filter(
    (m) =>
      (ethnicityFilter === "all" || m.ethnicity === ethnicityFilter) &&
      !brokenModels.has(m.id),
  );

  return (
    <div
      style={{
        padding: "3rem 5%",
        maxWidth: "1400px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* UPGRADE BANNER (Triggers when Limit Hit) */}
      {limitData && TIERS[limitData.currentTier]?.next && (
        <div
          style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%)",
            borderRadius: "var(--radius-lg)",
            padding: "2rem",
            marginBottom: "2rem",
            color: "white",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "2rem",
            boxShadow: "0 20px 25px -5px rgba(67, 56, 202, 0.3)",
          }}
        >
          <div style={{ flex: "1 1 300px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "rgba(255,255,255,0.2)",
                padding: "0.25rem 0.75rem",
                borderRadius: "var(--radius-full)",
                fontSize: "0.85rem",
                fontWeight: 600,
                marginBottom: "1rem",
              }}
            >
              <AlertCircle size={16} /> Daily Limit Reached
            </div>
            <h2
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                margin: "0 0 0.5rem 0",
              }}
            >
              Upgrade to {TIERS[limitData.currentTier].name}
            </h2>
            <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.5 }}>
              You've hit your {limitData.currentTier} plan limit. Upgrade now to
              generate up to{" "}
              <strong>
                {TIERS[limitData.currentTier].limit} images per day
              </strong>{" "}
              and keep your workflow moving without interruption.
            </p>
          </div>
          <button
            onClick={() => handleUpgrade(TIERS[limitData.currentTier].next)}
            disabled={isProcessingPayment}
            className="aurora-btn"
            style={{
              background: "white",
              color: "#4338ca",
              padding: "1rem 2rem",
              fontSize: "1.1rem",
              whiteSpace: "nowrap",
            }}
          >
            {isProcessingPayment ? (
              <Loader2 className="spin" size={20} />
            ) : (
              <Zap size={20} />
            )}
            {isProcessingPayment
              ? "Processing..."
              : `Upgrade for ${TIERS[limitData.currentTier].price}`}
          </button>
        </div>
      )}

      {/* Global Error Banner */}
      {globalError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            background: "#fef2f2",
            color: "var(--aurora-danger)",
            padding: "1.25rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid #fecaca",
            marginBottom: "2rem",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <AlertCircle size={24} />
          <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>
            {globalError}
          </span>
        </div>
      )}

      {/* Step 1: Upload */}
      <div
        className="glass-panel"
        style={{
          padding: "2.5rem",
          borderRadius: "var(--radius-lg)",
          marginBottom: "2rem",
        }}
      >
        <h3
          style={{
            fontSize: "1.5rem",
            margin: "0 0 1.5rem 0",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            color: "var(--aurora-primary)",
          }}
        >
          <Upload size={28} /> 1. Upload Product Image(s)
        </h3>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: "none" }}
          ref={fileInputRef}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="aurora-btn aurora-btn-outline"
          style={{ padding: "1rem 2rem", fontSize: "1.1rem" }}
          disabled={isGenerating}
        >
          Select Clothing Images
        </button>
        {productImages.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1.5rem",
              marginTop: "2rem",
            }}
          >
            {productImages.map((img) => (
              <div
                key={img.id}
                style={{
                  position: "relative",
                  width: "140px",
                  height: "140px",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                  border: "2px solid var(--aurora-border)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <img
                  src={img.previewUrl}
                  alt={img.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <button
                  onClick={() => removeProductImage(img.id)}
                  disabled={isGenerating}
                  style={{
                    position: "absolute",
                    top: "6px",
                    right: "6px",
                    background: "rgba(0,0,0,0.7)",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "28px",
                    height: "28px",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Model Selection */}
      <div
        className="glass-panel"
        style={{
          padding: "2.5rem",
          borderRadius: "var(--radius-lg)",
          marginBottom: "2.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1.5rem",
            borderBottom: "2px solid var(--aurora-border)",
            paddingBottom: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <h3
            style={{
              fontSize: "1.5rem",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              color: "var(--aurora-primary)",
            }}
          >
            <ImageIcon size={28} /> 2. Choose Model Array
          </h3>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <Filter size={20} style={{ color: "var(--aurora-text-muted)" }} />
            <select
              className="aurora-input"
              style={{
                width: "auto",
                padding: "0.75rem 2.5rem 0.75rem 1rem",
                cursor: "pointer",
              }}
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

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {displayModels.map((model) => (
            <div
              key={model.id}
              style={{
                border: `3px solid ${selectedModelId === model.id ? "var(--aurora-primary)" : "transparent"}`,
                background:
                  selectedModelId === model.id
                    ? "rgba(79, 70, 229, 0.04)"
                    : "var(--aurora-surface)",
                borderRadius: "var(--radius-lg)",
                padding: "1.5rem",
                cursor: isGenerating ? "not-allowed" : "pointer",
                opacity: isGenerating && selectedModelId !== model.id ? 0.4 : 1,
                boxShadow:
                  selectedModelId === model.id
                    ? "var(--shadow-md)"
                    : "var(--shadow-sm)",
              }}
              onClick={() => !isGenerating && setSelectedModelId(model.id)}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    border: `3px solid ${selectedModelId === model.id ? "var(--aurora-primary)" : "var(--aurora-border)"}`,
                    background: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selectedModelId === model.id && (
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        background: "var(--aurora-primary)",
                      }}
                    />
                  )}
                </div>
                <h4 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
                  {model.name}
                </h4>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
                {model.poses.map((pose) => (
                  <div
                    key={pose.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <img
                      src={pose.src}
                      alt={`Pose ${pose.id}`}
                      onError={() => handleImageError(model.id)}
                      style={{
                        width: "130px",
                        height: "180px",
                        objectFit: "cover",
                        borderRadius: "var(--radius-md)",
                        border: "2px solid var(--aurora-border)",
                        background: "#fff",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "0.9rem",
                        color: "var(--aurora-text-muted)",
                        fontWeight: 600,
                      }}
                    >
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
        style={{
          width: "100%",
          padding: "1.25rem",
          fontSize: "1.25rem",
          marginBottom: "2.5rem",
          borderRadius: "var(--radius-lg)",
        }}
        onClick={handleGenerate}
        disabled={
          isGenerating || !selectedModelId || productImages.length === 0
        }
      >
        {isGenerating ? (
          <>
            <Loader2
              size={28}
              className="spin"
              style={{ animation: "spin 1s linear infinite" }}
            />
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
        <div
          className="glass-panel"
          style={{ padding: "2.5rem", borderRadius: "var(--radius-lg)" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "2rem",
              flexWrap: "wrap",
              gap: "1.5rem",
            }}
          >
            <h3
              style={{
                fontSize: "1.5rem",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                color: "var(--aurora-primary)",
              }}
            >
              <Package size={28} />
              Generated Results
            </h3>
            {generationResults.some((r) => r.status === "success") && (
              <button
                onClick={downloadMasterZip}
                className="aurora-btn aurora-btn-outline"
                style={{ background: "white", padding: "0.75rem 1.25rem" }}
              >
                📦 Download Master ZIP
              </button>
            )}
          </div>

          {productImages.map((prodImg) => {
            const specificResults = generationResults.filter(
              (r) => r.productId === prodImg.id,
            );
            if (specificResults.length === 0) return null;

            return (
              <div
                key={prodImg.id}
                style={{
                  marginBottom: "2.5rem",
                  padding: "2rem",
                  background: "white",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--aurora-border)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "2rem",
                    paddingBottom: "1.5rem",
                    borderBottom: "2px dashed var(--aurora-border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1.25rem",
                    }}
                  >
                    <img
                      src={prodImg.previewUrl}
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "var(--radius-sm)",
                        objectFit: "cover",
                        border: "1px solid var(--aurora-border)",
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--aurora-text-muted)",
                          fontWeight: 700,
                        }}
                      >
                        SOURCE
                      </div>
                      <div style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                        {prodImg.name}
                      </div>
                    </div>
                  </div>
                  {specificResults.some((r) => r.status === "success") && (
                    <button
                      onClick={() => downloadArrayZip(prodImg.id, prodImg.name)}
                      className="aurora-btn"
                      style={{
                        background: "var(--aurora-text-main)",
                        color: "white",
                        padding: "0.6rem 1.25rem",
                      }}
                    >
                      ⬇️ Array .ZIP
                    </button>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "1.5rem",
                  }}
                >
                  {specificResults.map((res) => (
                    <div
                      key={res.uid}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                        padding: "0.75rem",
                        border: "1px solid var(--aurora-border)",
                        borderRadius: "var(--radius-md)",
                        background: "var(--aurora-bg)",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          aspectRatio: "3/4",
                          background: "#e2e8f0",
                          borderRadius: "var(--radius-sm)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          position: "relative",
                        }}
                      >
                        {res.status === "loading" && (
                          <div
                            style={{
                              textAlign: "center",
                              color: "var(--aurora-text-muted)",
                            }}
                          >
                            <Loader2
                              size={32}
                              style={{
                                animation: "spin 1s linear infinite",
                                margin: "0 auto 0.75rem",
                              }}
                            />
                            <div
                              style={{ fontSize: "0.9rem", fontWeight: 600 }}
                            >
                              Pose {res.poseId}
                            </div>
                          </div>
                        )}
                        {res.status === "success" && (
                          <img
                            src={res.blobUrl}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        )}
                        {res.status === "error" && (
                          <div
                            style={{
                              textAlign: "center",
                              color: "var(--aurora-danger)",
                              padding: "1rem",
                            }}
                          >
                            <AlertCircle
                              size={28}
                              style={{ margin: "0 auto 0.5rem" }}
                            />
                            <div
                              style={{ fontSize: "0.8rem", fontWeight: 600 }}
                            >
                              {res.errorMsg}
                            </div>
                          </div>
                        )}
                      </div>
                      {res.status === "success" && (
                        <button
                          onClick={() =>
                            triggerDownload(res.blobUrl, res.filename)
                          }
                          className="aurora-btn aurora-btn-outline"
                          style={{ padding: "0.6rem" }}
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
