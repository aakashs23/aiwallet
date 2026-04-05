import { Routes, Route, Link } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Transactions from "./components/Transactions";
import AddTransaction from "./components/AddTransaction";
import Analytics from "./components/Analytics";
import Insights from "./components/Insights";
import Budgets from "./components/Budgets";
import Login from "./pages/Login";
import Register from "./pages/Register";

import "./App.css";

// 🏠 Home Page
function Home() {
  return (
    <div>
      <h2>Welcome to AI Wallet</h2>
      <p>Your intelligent finance assistant</p>
    </div>
  );
}

// 📊 Dashboard Page (main app view)
function Dashboard() {
  return (
    <>
      <Transactions />
      <Analytics />
      <Insights />
    </>
  );
}

// ℹ️ About Page
function About() {
  return (
    <div>
      <h2>About AI Wallet</h2>
      <p>This app helps you track and analyze your spending using AI.</p>
    </div>
  );
}

function App() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>

      {/* 🔗 NAVBAR */}
      <nav style={{ marginBottom: "20px" }}>
        <Link to="/">Home</Link> |{" "}
        <Link to="/dashboard">Dashboard</Link> |{" "}
        <Link to="/transactions">Transactions</Link> |{" "}
        <Link to="/analytics">Analytics</Link> |{" "}
        <Link to="/insights">Insights</Link> |{" "}
        <Link to="/about">About</Link> |{" "}
        <Link to="/login">Login</Link> |{" "}
        <Link to="/register">Register</Link> |{" "}
        <Link to="/budgets">Budgets</Link>
      </nav>

      {/* 🧭 ROUTES */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/transactions" 
          element={
            <ProtectedRoute>
              <>
                <AddTransaction />
                  <Transactions />
              </>
            </ProtectedRoute>
          }        
        />
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/insights" 
          element={
            <ProtectedRoute>
              <Insights />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/about" 
          element={
            <ProtectedRoute>
              <About />
            </ProtectedRoute> 
          }
        />
        <Route 
          path="/login" 
          element={
            <Login />
          }
        />
        <Route 
          path="/register" 
          element={
            <Register />
          } 
        />
        <Route 
          path="/budgets" 
          element={
            <ProtectedRoute>
              <Budgets />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </div>
  );
}

export default App;