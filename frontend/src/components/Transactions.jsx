import { useEffect, useState } from "react";
import axios from "axios";

function Transactions() {
  const [transactions, setTransactions] = useState([]);

  const fetchTransactions = async () => {
    const res = await axios.get("http://localhost:5000/transactions", {
      headers: {
        Authorization: "Bearer YOUR_TOKEN"
      }
    });

    setTransactions(res.data);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const updateCategory = async (id, category) => {
    await axios.put(
      `http://localhost:5000/transactions/${id}`,
      { category },
      {
        headers: {
          Authorization: "Bearer YOUR_TOKEN"
        }
      }
    );

    fetchTransactions();
  };

  return (
    <div>
      <h2>Transactions</h2>

      {transactions.map((tx) => (
        <div key={tx.id} style={{ border: "1px solid #ccc", margin: 10, padding: 10 }}>
          
          <p><b>Merchant:</b> {tx.merchant}</p>
          <p><b>Category:</b> {tx.category}</p>

          <p><b>Confidence:</b> {tx.confidence} ({tx.confidence_label})</p>
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