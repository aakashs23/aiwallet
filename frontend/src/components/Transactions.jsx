import { useEffect, useState } from "react";
import axios from "axios";

function Transactions({ refreshTrigger }) {
  const [transactions, setTransactions] = useState([]);
  const [lastLoaded, setLastLoaded] = useState(null);
  const token = localStorage.getItem("token");
  const fetchTransactions = async () => {
    const res = await axios.get("http://localhost:5000/transactions", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log("Transactions API response:", res.data);
    setTransactions(res.data);
    setLastLoaded(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    fetchTransactions();

    const handleExternalRefresh = () => {
      fetchTransactions();
    };

    window.addEventListener("transactionsUpdated", handleExternalRefresh);
    return () => {
      window.removeEventListener("transactionsUpdated", handleExternalRefresh);
    };
  }, [refreshTrigger]);

  const updateCategory = async (id, category) => {
    await axios.put(
      `http://localhost:5000/transactions/${id}`,
      { category },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    fetchTransactions();
  };

  return (
    <div>
      <h2>Transactions</h2>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ color: "#555" }}>
          Showing {transactions.length} transaction{transactions.length === 1 ? "" : "s"}.
          {lastLoaded && <span> Last loaded at {lastLoaded}.</span>}
        </div>
        <button
          onClick={fetchTransactions}
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "1px solid #ccc",
            background: "white",
            cursor: "pointer"
          }}
        >
          Refresh
        </button>
      </div>

      {transactions.map((tx) => (
        <div key={tx.id} style={{ border: "1px solid #ccc", margin: 10, padding: 10 }}>
          
          <p><b>Merchant:</b> {tx.merchant || tx.name || "Unknown"}</p>
          <p><b>Category:</b> {tx.category || "Other"}</p>
          <p><b>Date:</b> {tx.date ? new Date(tx.date).toDateString() : tx.transaction_date ? new Date(tx.transaction_date).toDateString() : "Unknown date"}</p>
          <p><b>Amount:</b> ₹{tx.amount ?? 0}</p>
          <p><b>Confidence:</b> {tx.confidence ?? 0} ({tx.confidence_label || ""})</p>
          <p><b>Source:</b> {tx.source}</p>
          <p><b>Reason:</b> {tx.reason}</p>

          {tx.needs_feedback && (
            <div style={{ marginTop: 10 }}>
              <p style={{ color: "red" }}>{tx.feedback_message}</p>

              {tx.suggested_options.map((option, i) => (
                <button key={i} onClick={() => updateCategory(tx.id, option)}>
                  {option}
                </button>
              ))}
            </div>
          )}

        </div>
      ))}
    </div>
  );
}

export default Transactions;