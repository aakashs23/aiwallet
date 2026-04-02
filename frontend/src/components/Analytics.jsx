import { useEffect, useState } from "react";
import axios from "axios";
import {
  PieChart, Pie, Cell, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

function Analytics() {
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const token = localStorage.getItem("token");
  const fetchAnalytics = async () => {
  try {
    const headers = {
      Authorization: `Bearer ${token}`
    };

    const catRes = await axios.get(
      "http://localhost:5000/analytics/categories",
      { headers }
    );

    const monRes = await axios.get(
      "http://localhost:5000/analytics/monthly",
      { headers }
    );

    console.log("CATEGORY:", catRes.data);
    console.log("MONTHLY:", monRes.data);

    setCategoryData(
      catRes.data.map(item => ({
        name: item.category,
        value: Number(item.total)
      }))
    );

    setMonthlyData(
      monRes.data.map(item => ({
        month: new Date(item.month).toLocaleDateString("en-US", { month: "short" }),
        total: Number(item.total)
      }))
    );

  } catch (err) {
    console.error("ANALYTICS ERROR:", err);
  }
};

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div style={{ marginTop: 40 }}>

      <h2>📊 Analytics Dashboard</h2>

      {/* 🥧 Pie Chart */}
      <h3>Spending by Category</h3>
      <PieChart width={400} height={300}>
        <Pie
          data={categoryData}
          dataKey="value"
          nameKey="name"
          outerRadius={100}
        >
          {categoryData.map((entry, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>

      {/* 📈 Line Chart */}
      <h3>Monthly Spending</h3>
      <LineChart width={500} height={300} data={monthlyData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="total" stroke="#8884d8" />
      </LineChart>

    </div>
  );
}

export default Analytics;