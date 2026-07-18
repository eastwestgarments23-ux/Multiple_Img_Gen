import { CheckCircle, Loader2 } from "lucide-react";

export default function GenerateAction({
  isGenerating,
  selectedModelId,
  productImagesCount,
  handleGenerate,
}) {
  return (
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
      disabled={isGenerating || !selectedModelId || productImagesCount === 0}
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
  );
}