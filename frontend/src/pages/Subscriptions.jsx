import { useEffect, useState } from "react";
import axios from "axios";

function Subscriptions() {
  const [subs, setSubs] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchSubs();
  }, []);

  const fetchSubs = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/transactions/subscriptions",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setSubs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // 🧠 helpers
  const getDaysLeft = (date) => {
    const diff = new Date(date) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const active = subs.filter(s => s.status !== "unused");
  const unused = subs.filter(s => s.status === "unused");

  return (
    <div style={{ padding: 20 }}>
      <h2>📅 Subscriptions</h2>

      {/* 🔥 Active */}
      <h3 style={{ marginTop: 20 }}>Active</h3>
      {active.map((sub, i) => {
        const days = getDaysLeft(sub.next_due);

        return (
          <div key={i} style={{
            padding: 15,
            borderRadius: 12,
            marginBottom: 10,
            background: days <= 3 ? "#fff5f5" : "white",
            border: "1px solid #eee",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
          }}>
            <b>{sub.merchant}</b>

            <div style={{ marginTop: 6 }}>
              ₹{sub.avg_amount} / {sub.billing_cycle}
            </div>

            <div style={{ fontSize: 12, color: "#666" }}>
              Next: {new Date(sub.next_due).toDateString()}
            </div>

            {days <= 3 && (
              <div style={{ color: "red", fontSize: 12 }}>
                ⚠ Due in {days} days
              </div>
            )}
          </div>
        );
      })}

      {/* ❌ Unused */}
      <h3 style={{ marginTop: 30 }}>Unused</h3>
      {unused.map((sub, i) => (
        <div key={i} style={{
          padding: 15,
          borderRadius: 12,
          marginBottom: 10,
          background: "#f9fafb",
          border: "1px solid #eee"
        }}>
          <b>{sub.merchant}</b>

          <div style={{ fontSize: 12, color: "#666" }}>
            Not used recently
          </div>

          <div style={{ color: "orange", fontSize: 12 }}>
            💡 Consider cancelling
          </div>
        </div>
      ))}
    </div>
  );
}

export default Subscriptions;