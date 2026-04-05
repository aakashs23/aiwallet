import { useEffect, useState } from "react";
import axios from "axios";

function Analytics() {
  const [topMerchants, setTopMerchants] = useState([]);
  const [savingsRate, setSavingsRate] = useState(0);
  const [score, setScore] = useState(0);
  const [trends, setTrends] = useState([]);

  const token = localStorage.getItem("token");

  const fetchAnalytics = async () => {
    try {
      const headers = {
        Authorization: `Bearer ${token}`
      };

      const [merchantsRes, savingsRes, scoreRes, trendsRes] =
        await Promise.all([
          axios.get("http://localhost:5000/analytics/top-merchants", { headers }),
          axios.get("http://localhost:5000/analytics/savings-rate", { headers }),
          axios.get("http://localhost:5000/analytics/financial-score", { headers }),
          axios.get("http://localhost:5000/analytics/category-trends", { headers })
        ]);

      setTopMerchants(merchantsRes.data);
      setSavingsRate(savingsRes.data.savingsRate);
      setScore(scoreRes.data.score);
      setTrends(trendsRes.data);

    } catch (err) {
      console.error("Analytics error:", err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div style={{ marginTop: 40 }}>
      <h2>📊 Advanced Analytics</h2>

      {/* 💯 Financial Score */}
      <div style={{
        padding: "20px",
        marginBottom: "20px",
        borderRadius: "10px",
        background: "#f0f8ff",
        textAlign: "center"
      }}>
        <h3>Financial Health Score</h3>
        <h1>{score}/100</h1>
      </div>

      {/* 💰 Savings Rate */}
      <div style={{
        padding: "15px",
        marginBottom: "20px",
        borderRadius: "10px",
        background: "#e6ffe6"
      }}>
        <h3>Savings Rate</h3>
        <p>{savingsRate}%</p>
      </div>

      {/* 🏪 Top Merchants */}
      <div style={{ marginBottom: "20px" }}>
        <h3>Top Merchants</h3>

        {topMerchants.map((m, index) => (
          <div key={index} style={{
            padding: "10px",
            borderBottom: "1px solid #ddd"
          }}>
            <strong>{m.merchant}</strong>
            <p>₹{Number(m.total)}</p>
          </div>
        ))}
      </div>

      {/* 📈 Category Trends */}
      <div>
        <h3>Category Trends (Month vs Last Month)</h3>

        {trends.map((t, index) => {
          const change = Number(t.change);

          return (
            <div key={index} style={{
              padding: "10px",
              marginBottom: "10px",
              borderRadius: "8px",
              background:
                change > 0 ? "#ffe6e6" :
                change < 0 ? "#e6ffe6" :
                "#f0f0f0"
            }}>
              <strong>{t.category}</strong>
              <p>
                {change > 0 ? "🔺" : change < 0 ? "🔻" : "➖"} {change}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Analytics;