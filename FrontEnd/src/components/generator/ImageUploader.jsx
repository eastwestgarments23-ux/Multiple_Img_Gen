import { useRef } from "react";
import { Upload } from "lucide-react";

export default function ImageUploader({ 
  productImages, 
  setProductImages, 
  isGenerating, 
  setGlobalError 
}) {
  const fileInputRef = useRef(null);

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

  const removeProductImage = (idToRemove) => {
    setProductImages((prev) => prev.filter((img) => img.id !== idToRemove));
  };

  return (
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
  );
}