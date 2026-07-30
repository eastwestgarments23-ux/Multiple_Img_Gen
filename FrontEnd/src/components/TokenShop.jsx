import { useState } from "react";
import { Zap, Mail, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { TOKEN_PACKAGES } from "../data/constants.js";

export default function TokenShop({ user, onPaymentSuccess }) {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [alertModal, setAlertModal] = useState({ show: false, type: 'success', message: '' });

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
            setAlertModal({ show: true, type: 'success', message: 'Payment Successful! Tokens have been securely added to your account.' });
            if (onPaymentSuccess) onPaymentSuccess();
          } else {
            setAlertModal({ show: true, type: 'error', message: 'Payment verification failed. Please contact support if you were charged.' });
          }
        },
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: "#4f46e5" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        setAlertModal({ show: true, type: 'error', message: `Payment Failed: ${response.error.description}` });
      });
      rzp.open();
    } catch (err) {
      setAlertModal({ show: true, type: 'error', message: err.message });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <>
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem', border: '2px solid var(--aurora-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.25rem 0' }}>
              <Zap size={20} style={{ color: 'var(--aurora-primary)' }} />
              Recharge Tokens
            </h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--aurora-text-muted)' }}>
              1 Token = 1 Generation. Select a package below to instantly recharge your account.
            </p>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--aurora-text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(0,0,0,0.03)', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)' }}>
            <Mail size={14} /> Need a custom token package? Contact us at support@auroragenerator.com
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {TOKEN_PACKAGES.map(pkg => (
            <div key={pkg.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--aurora-surface)', border: '1px solid var(--aurora-border)', padding: '1rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--aurora-text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {pkg.name}
                  {pkg.discount && <span style={{ background: 'var(--aurora-secondary)', color: 'white', fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-full)' }}>{pkg.discount}</span>}
                </div>
                <div style={{ color: 'var(--aurora-primary)', fontWeight: 800, fontSize: '1.1rem' }}>{pkg.price}</div>
              </div>
              <button
                onClick={() => handleTokenPurchase(pkg.id)}
                disabled={isProcessingPayment}
                className="aurora-btn aurora-btn-outline"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'white' }}
              >
                {isProcessingPayment ? <Loader2 size={14} className="spin" /> : 'Buy Now'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Themed Alert Modal */}
      {alertModal.show && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div className="glass-panel" style={{ background: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)', maxWidth: '400px', width: '100%', borderTop: `4px solid ${alertModal.type === 'error' ? 'var(--aurora-danger)' : 'var(--aurora-success)'}`, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', position: 'relative' }}>
            <button onClick={() => setAlertModal({ show: false, message: '', type: 'success' })} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--aurora-text-muted)' }}>
              <X size={20} />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem' }}>
              {alertModal.type === 'error' ? (
                <AlertCircle size={48} style={{ color: 'var(--aurora-danger)' }} />
              ) : (
                <CheckCircle2 size={48} style={{ color: 'var(--aurora-success)' }} />
              )}
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                {alertModal.type === 'error' ? 'Transaction Error' : 'Success!'}
              </h3>
              <p style={{ margin: 0, color: 'var(--aurora-text-muted)', lineHeight: 1.5 }}>
                {alertModal.message}
              </p>
              <button onClick={() => setAlertModal({ show: false, message: '', type: 'success' })} className="aurora-btn" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', background: alertModal.type === 'error' ? 'var(--aurora-danger)' : 'var(--aurora-primary)', color: 'white' }}>
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}