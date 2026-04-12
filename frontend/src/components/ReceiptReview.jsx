import { useState } from "react";
import axios from "axios";

function ReceiptReview({ data }) {
  const [items, setItems] = useState(data.items);

  // 👇 ADD HERE
  const getConfidenceColor = (c) => {
    if (c > 0.8) return "green";
    if (c > 0.6) return "orange";
    return "red";
  };

  const token = localStorage.getItem("token");

  const categories = [
    "Food", "Transport", "Shopping", "Bills",
    "Entertainment", "Health", "Education",
    "Travel", "Finance", "Other"
  ];

  const updateCategory = (index, value) => {
    const updated = [...items];
    updated[index].category = value;
    setItems(updated);
  };

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

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("image", file);

    const res = await axios.post(
        "http://localhost:5000/ocr/scan",
        formData,
        {
            headers: {
            Authorization: `Bearer ${token}`
            }
        }
    );

    setReceiptData(res.data); // 👈 send to ReceiptReview
};

  const getColor = (c) => {
    if (c > 0.8) return "green";
    if (c > 0.6) return "orange";
    return "red";
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>🧾 Receipt Review</h2>

      <p><b>Merchant:</b> {data.merchant}</p>
      <p><b>Total:</b> ₹{data.total}</p>

      {items.map((item, i) => (
        <div key={i} style={{
          border: "1px solid #ccc",
          marginBottom: 10,
          padding: 10,
          borderRadius: 8
        }}>
          <p><b>{item.name}</b></p>
          <p>₹{item.amount}</p>

          <select
            value={item.category}
            onChange={(e) => updateCategory(i, e.target.value)}
          >
            {categories.map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>

          <p style={{ color: getConfidenceColor(item.confidence) }}>
            Confidence: {(item.confidence * 100).toFixed(0)}%
          </p>

          {item.confidence < 0.6 && (
            <span style={{ color: "red", fontSize: 12 }}>
                ⚠ Review this
            </span>
          )}

          <small>{item.reason}</small>
        </div>
      ))}

      <button onClick={handleSave}>
        💾 Save All Transactions
      </button>
    </div>
  );
}

export default ReceiptReview;