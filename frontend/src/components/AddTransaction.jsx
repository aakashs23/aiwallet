import { useState } from "react";
import axios from "axios";

function AddTransaction({ refresh = () => {} }) {
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState("");
  const token = localStorage.getItem("token");
  const handleSubmit = async () => {
    try {
      await axios.post(
        "http://localhost:5000/transactions",
        { amount, merchant, date },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setDate("");
      setAmount("");
      setMerchant("");
      refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to add transaction. Check the console for details.");
    }
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
   
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <button onClick={handleSubmit}>Add</button>
    </div>
  );
}

export default AddTransaction;