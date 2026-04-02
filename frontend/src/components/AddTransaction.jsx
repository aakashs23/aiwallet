import { useState } from "react";
import axios from "axios";

function AddTransaction({ refresh }) {
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const token = localStorage.getItem("token");
  const handleSubmit = async () => {
    await axios.post(
      
      "http://localhost:5000/transactions",
      { amount, merchant },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    setAmount("");
    setMerchant("");
    refresh();
  };

  return (
    <div>
      <h3>Add Transaction</h3>

      <input
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <input
        placeholder="Merchant"
        value={merchant}
        onChange={(e) => setMerchant(e.target.value)}
      />

      <button onClick={handleSubmit}>Add</button>
    </div>
  );
}

export default AddTransaction;