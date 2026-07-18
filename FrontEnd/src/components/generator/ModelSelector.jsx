import { Image as ImageIcon, Filter } from "lucide-react";

export default function ModelSelector({
  models,
  ethnicityFilter,
  setEthnicityFilter,
  selectedModelId,
  setSelectedModelId,
  brokenModels,
  setBrokenModels,
  isGenerating,
}) {
  const handleImageError = (modelId) => {
    setBrokenModels((prev) => new Set(prev).add(modelId));
    if (selectedModelId === modelId) setSelectedModelId(null);
  };

  const displayModels = models.filter(
    (m) =>
      (ethnicityFilter === "all" || m.ethnicity === ethnicityFilter) &&
      !brokenModels.has(m.id)
  );

  return (
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
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
              border: `3px solid ${
                selectedModelId === model.id
                  ? "var(--aurora-primary)"
                  : "transparent"
              }`,
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
                  border: `3px solid ${
                    selectedModelId === model.id
                      ? "var(--aurora-primary)"
                      : "var(--aurora-border)"
                  }`,
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
  );
}