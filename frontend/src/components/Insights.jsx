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

      {insights.map((i, index) => (
        <div key={index} style={{
          padding: "10px",
          marginBottom: "10px",
          borderRadius: "8px",
          background:
            i.priority === "high" ? "#ffe6e6" :
            i.priority === "medium" ? "#fff4e6" :
            "#f0f0f0"
        }}>
          <p>{i.message}</p>
        </div>
      ))}
    </div>
  );
}

export default Insights;