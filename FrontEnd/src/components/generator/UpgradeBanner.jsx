import { useState } from "react";
import { AlertCircle, Loader2, Zap } from "lucide-react";

export default function UpgradeBanner({ limitData, setLimitData, regionalPricing, user }) {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Dynamically constructed tiers based on regional pricing
  const TIERS = {
    free: { next: "pro", name: "Pro", price: `${regionalPricing.symbol}${regionalPricing.pricing.pro}`, limit: 50 },
    pro: { next: "elite", name: "Elite", price: `${regionalPricing.symbol}${regionalPricing.pricing.elite}`, limit: 200 },
    elite: { next: null },
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
        currency: orderData.order.currency, // Dynamically set from backend detection
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
              "Payment Successful! Your tier has been upgraded. Please try generating again."
            );
            setLimitData(null); // Clear the banner
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

  const nextTier = TIERS[limitData.currentTier]?.next;

  if (!nextTier) return null;

  return (
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
        onClick={() => handleUpgrade(nextTier)}
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
  );
}