import { useEffect, useState } from "react";
import axios from "axios";

function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [category, setCategory] = useState("");
  const [limitInput, setLimitInput] = useState("");

  const token = localStorage.getItem("token");

  // ✅ Fetch budgets
  const fetchBudgets = async () => {
    try {
      const res = await axios.get("http://localhost:5000/budgets", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setBudgets(res.data);

    } catch (err) {
      console.error("Budget fetch error:", err);
    }
  };

  // ✅ Set budget
  const handleSetBudget = async () => {
    if (!category.trim() || !limitInput.trim()) {
      alert("Please enter category and limit");
      return;
    }

    const parsedLimit = Number(limitInput);

    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      alert("Enter a valid amount");
      return;
    }

    try {
      await axios.post(
        "http://localhost:5000/budgets",
        {
          category,
          monthly_limit: parsedLimit
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // reset inputs
      setCategory("");
      setLimitInput("");

      fetchBudgets();

    } catch (err) {
      console.error("Set budget error:", err);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  return (
    <div style={{ marginTop: 40 }}>
      <h2>💰 Budgets</h2>

      {/* ➕ Add Budget */}
      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />

        <input
          placeholder="Monthly Limit"
          type="number"
          value={limitInput}
          onChange={(e) => setLimitInput(e.target.value)}
        />

        <button onClick={handleSetBudget}>Set Budget</button>
      </div>

      {/* 📊 Budget List */}
      {budgets.map((b, index) => {
        const spent = Number(b.spent) || 0;
        const budgetLimit = Number(b.monthly_limit) || 0;

        const percent =
          budgetLimit > 0
            ? ((spent / budgetLimit) * 100).toFixed(1)
            : 0;

        const isOver = spent > budgetLimit;

        return (
          <div
            key={index}
            style={{
              padding: "10px",
              marginBottom: "10px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              background: isOver ? "#ffe6e6" : "#f9f9f9"
            }}
          >
            <h4>{b.category}</h4>

            <p>Spent: ₹{spent}</p>
            <p>Limit: ₹{budgetLimit}</p>
            <p>Usage: {percent}%</p>

            {isOver && (
              <p style={{ color: "red" }}>
                ⚠ Overspending!
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default Budgets;