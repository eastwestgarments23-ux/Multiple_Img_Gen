import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";

// Modular Sub-components
import UpgradeBanner from "../components/generator/UpgradeBanner.jsx";
import ImageUploader from "../components/generator/ImageUploader.jsx";
import ModelSelector from "../components/generator/ModelSelector.jsx";
import GenerateAction from "../components/generator/GenerateAction.jsx";
import ResultsMatrix from "../components/generator/ResultsMatrix.jsx";

// Centralized Static Model Data
export const AVAILABLE_MODELS = [
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

export default function Generator({ user }) {
  // Application State
  const [productImages, setProductImages] = useState([]);
  const [ethnicityFilter, setEthnicityFilter] = useState("all");
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [generationResults, setGenerationResults] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [brokenModels, setBrokenModels] = useState(new Set());

  // Regional Pricing & Limits State
  const [limitData, setLimitData] = useState(null);
  const [regionalPricing, setRegionalPricing] = useState({
    currency: 'INR',
    symbol: '₹',
    pricing: { pro: 999, elite: 2499 }
  });

  // Initialize Geo-Detected Pricing
  useEffect(() => {
    const fetchRegionalPricing = async () => {
      try {
        const response = await fetch('/api/detect-currency');
        const data = await response.json();
        if (data.success) {
          setRegionalPricing({
            currency: data.currency,
            symbol: data.symbol,
            pricing: data.pricing
          });
        }
      } catch (err) {
        console.warn("Failed to fetch regional pricing, defaulting to INR.", err);
      }
    };
    fetchRegionalPricing();
  }, []);

  // Helpers for Generation Engine
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

  // Matrix Generation Engine
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

    // Pre-populate loading states
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

    // Process Generation Queue
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

          const imageBlob = convertBase64ToBlob(data.image_base64, data.mime_type);
          const blobUrl = URL.createObjectURL(imageBlob);

          setGenerationResults((prev) =>
            prev.map((res) =>
              res.uid === uid ? { ...res, status: "success", blobUrl, blob: imageBlob } : res
            )
          );
        } catch (err) {
          if (err.message !== "Quota Exceeded") {
            setGenerationResults((prev) =>
              prev.map((res) =>
                res.uid === uid ? { ...res, status: "error", errorMsg: err.message } : res
              )
            );
          } else {
            setGenerationResults((prev) =>
              prev.map((res) =>
                res.status === "loading"
                  ? { ...res, status: "error", errorMsg: "Cancelled due to limit" }
                  : res
              )
            );
          }
        }
      }
    }
    setIsGenerating(false);
  };

  return (
    <div
      style={{
        padding: "3rem 5%",
        maxWidth: "1400px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Component 1: Rate Limit & Upgrade Banner */}
      {limitData && (
        <UpgradeBanner 
          limitData={limitData} 
          setLimitData={setLimitData}
          regionalPricing={regionalPricing} 
          user={user} 
        />
      )}

      {/* Global Error Fallback */}
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
          <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>{globalError}</span>
        </div>
      )}

      {/* Component 2: Product Image Uploader */}
      <ImageUploader 
        productImages={productImages} 
        setProductImages={setProductImages} 
        isGenerating={isGenerating} 
        setGlobalError={setGlobalError} 
      />

      {/* Component 3: Model Array Selector */}
      <ModelSelector 
        models={AVAILABLE_MODELS}
        ethnicityFilter={ethnicityFilter}
        setEthnicityFilter={setEthnicityFilter}
        selectedModelId={selectedModelId}
        setSelectedModelId={setSelectedModelId}
        brokenModels={brokenModels}
        setBrokenModels={setBrokenModels}
        isGenerating={isGenerating}
      />

      {/* Component 4: Primary Action Button */}
      <GenerateAction 
        isGenerating={isGenerating} 
        selectedModelId={selectedModelId} 
        productImagesCount={productImages.length} 
        handleGenerate={handleGenerate} 
      />

      {/* Component 5: Matrix Results Grid */}
      <ResultsMatrix 
        generationResults={generationResults} 
        productImages={productImages} 
        selectedModelId={selectedModelId} 
        isGenerating={isGenerating} 
      />
      
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}