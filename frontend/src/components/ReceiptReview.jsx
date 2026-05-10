import { useState } from "react";
import axios from "axios";
import { useEffect } from "react";

function ReceiptReview({ data }) {
  
  useEffect(() => {
    setItems(data.items || []);
  }, [data]);
  
  const [items, setItems] = useState(data.items || []);
  const token = localStorage.getItem("token");

  const categories = [
    "Food", "Transport", "Shopping", "Bills",
    "Entertainment", "Health", "Education",
    "Travel", "Finance", "Other"
  ];

  // 🎨 Confidence color
  const getConfidenceColor = (c) => {
    if (c > 0.8) return "green";
    if (c > 0.6) return "orange";
    return "red";
  };

  // 🧠 Update category
  const updateCategory = (index, value) => {
    const updated = [...items];
    updated[index].category = value;
    setItems(updated);
  };

  // ❌ Delete item
  const deleteItem = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  // 💾 Save
  const handleSave = async () => {
    try {
      await axios.post(
        "http://localhost:5000/transactions/bulk",
        {
          merchant: data.merchant,
          items
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      alert("Saved successfully");

    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 10 }}>🧾 Receipt Review</h2>

      {/* 🏪 Header */}
      <div style={{
        marginBottom: 15,
        padding: 15,
        borderRadius: 12,
        background: "#f9fafb",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
      }}>
        <p><b>Merchant:</b> {data.merchant}</p>
        <p><b>Total:</b> ₹{data.total}</p>
      </div>

      {/* 🧾 Items */}
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            borderRadius: 12,
            padding: 15,
            marginBottom: 12,
            background: item.confidence < 0.6 ? "#fff5f5" : "white",
            boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            border: "1px solid #eee"
          }}
        >

          {/* 🏷 Name + Amount + Delete */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8
            }}
          >
            <b>{item.name}</b>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        
              {/* ❌ Delete button */}
              <button
                onClick={() => deleteItem(i)}
                style={{
                  background: "#f5f5f5",
                  border: "none",
                  borderRadius: "50%",
                  width: 26,
                  height: 26,
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#666",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ✕
              </button>

              {/* 💰 Amount */}
              <span>₹{item.amount}</span>
            </div>
          </div>

          {/* 📂 Category */}
          <select
            value={item.category}
            onChange={(e) => updateCategory(i, e.target.value)}
            style={{
              padding: 6,
              borderRadius: 6,
              border: "1px solid #ccc",
              marginBottom: 10
            }}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>

          {/* 🎯 Confidence Badge */}
          <div style={{ marginBottom: 6 }}>
            <span
              style={{
                background:
                  item.confidence > 0.8
                    ? "#e6fffa"
                    : item.confidence > 0.6
                    ? "#fff7e6"
                    : "#ffe6e6",
                  color: getConfidenceColor(item.confidence),
                  padding: "4px 8px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: "bold"
              }}
            >
              {(item.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>

          {/* ⚠ Low confidence warning */}
          {item.confidence < 0.6 && (
            <div
              style={{
                color: "red",
                fontSize: 12,
                marginBottom: 6
              }}
            >
              ⚠ Needs review
            </div>
          )}

          {/* 🧠 Reason */}
          <small style={{ color: "#666" }}>{item.reason}</small>
        </div>
      ))}

      {/* 💾 Sticky Save Button */}
      <button
        onClick={handleSave}
        style={{
          position: "sticky",
          bottom: 10,
          width: "100%",
          padding: 15,
          background: "linear-gradient(135deg, #4CAF50, #2ecc71)",
          color: "white",
          border: "none",
          borderRadius: 10,
          fontWeight: "bold",
          marginTop: 20,
          cursor: "pointer"
        }}
      >
        💾 Save All Transactions
      </button>
    </div>
  );
}

export default ReceiptReview;