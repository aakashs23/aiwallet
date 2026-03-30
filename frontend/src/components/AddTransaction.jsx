import { useState } from "react";
import axios from "axios";

function AddTransaction({ refresh }) {
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");

  const handleSubmit = async () => {
    await axios.post(
      "http://localhost:5000/transactions",
      { amount, merchant },
      {
        headers: {
          Authorization: "7f9c2c8c8c4f5e9e2a6d4d8c3f7a91b6c2e5a4f9d1e7b3c6a8f0d2c4e6b9a1f3"
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