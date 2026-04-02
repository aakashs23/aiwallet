import { useEffect, useState } from "react";
import axios from "axios";

function Insights() {
  const [insights, setInsights] = useState([]);
  const token = localStorage.getItem("token");
  const fetchInsights = async () => {
    try {
      const res = await axios.get("http://localhost:5000/insights", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setInsights(res.data);

    } catch (err) {
      console.error("Insights error:", err);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  return (
    <div style={{ marginTop: 40 }}>
      <h2>🧠 Insights</h2>

      {insights.length === 0 && (
        <p>No insights available yet</p>
      )}

      {insights.map((insight, index) => (
        <div
          key={index}
          style={{
            padding: "15px",
            marginBottom: "10px",
            borderRadius: "10px",
            backgroundColor: "#f5f5f5",
            borderLeft: "5px solid #4CAF50",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
          }}
        >
          {insight}
        </div>
      ))}
    </div>
  );
}

export default Insights;