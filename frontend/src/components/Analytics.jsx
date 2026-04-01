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

  const fetchAnalytics = async () => {
    const headers = {
      Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3MWVjNzZlYS04Y2Y3LTRhNjctYmMwNC1kMWZiNmI2OTBmNWUiLCJpYXQiOjE3NzUwNDQxNTAsImV4cCI6MTc3NTA0Nzc1MH0.Mvdt1PEnbmiaX9opWhRNPEknpYFhy3dZcCMCndv91kw"
    };

    const catRes = await axios.get("http://localhost:5000/analytics/categories", { headers });
    const monRes = await axios.get("http://localhost:5000/analytics/monthly", { headers });

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