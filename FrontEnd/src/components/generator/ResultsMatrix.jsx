import JSZip from "jszip";
import { Package, Loader2, AlertCircle, Download } from "lucide-react";

export default function ResultsMatrix({
  generationResults,
  productImages,
  selectedModelId,
  isGenerating,
}) {
  if (generationResults.length === 0 && !isGenerating) {
    return null;
  }

  // Local helper for downloading a single file
  const triggerDownload = (url, filename) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Local helper for Array ZIP creation
  const downloadArrayZip = async (productId, productName) => {
    const arrayResults = generationResults.filter(
      (r) => r.productId === productId && r.status === "success"
    );
    if (arrayResults.length === 0) return;
    
    const zip = new JSZip();
    arrayResults.forEach((res) => zip.file(res.filename, res.blob));
    const content = await zip.generateAsync({ type: "blob" });
    
    triggerDownload(
      URL.createObjectURL(content),
      `Model_${selectedModelId}_${productName}_Array.zip`
    );
  };

  // Local helper for Master ZIP creation
  const downloadMasterZip = async () => {
    const successfulResults = generationResults.filter(
      (r) => r.status === "success"
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
      `Aurora_Generated_Matrix.zip`
    );
  };

  return (
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
          (r) => r.productId === prodImg.id
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
                  alt={prodImg.name}
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
                        <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                          Pose {res.poseId}
                        </div>
                      </div>
                    )}
                    {res.status === "success" && (
                      <img
                        src={res.blobUrl}
                        alt={`Generated Pose ${res.poseId}`}
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
                        <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                          {res.errorMsg}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {res.status === "success" && (
                    <button
                      onClick={() => triggerDownload(res.blobUrl, res.filename)}
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
  );
}