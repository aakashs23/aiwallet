import Transactions from "./components/Transactions";
import AddTransaction from "./components/AddTransaction";
import Analytics from "./components/Analytics";
import "./App.css";

function App() {
  const refresh = () => window.location.reload();

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      
      <h1 style={{ textAlign: "center" }}>💰 AI Wallet</h1>

      {/* ➕ Add Transaction */}
      <div style={{ marginBottom: "30px" }}>
        <AddTransaction refresh={refresh} />
      </div>

      {/* 📊 Transactions List */}
      <Transactions />

      {/* 📈 Analytics Dashboard */}
      <Analytics />

    </div>
  );
}

export default App;