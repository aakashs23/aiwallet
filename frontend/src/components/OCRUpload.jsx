import { useState } from "react";
import axios from "axios";
import ReceiptReview from "./ReceiptReview";

function OCRUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const token = localStorage.getItem("token");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await axios.post("http://localhost:5000/ocr/scan", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`
        }
      });

      setOcrResult(response.data);
      setSelectedFile(null);
    } catch (err) {
      console.error("OCR Error:", err);
      setError(
        err.response?.data?.message || "Failed to process receipt. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (ocrResult) {
    return <ReceiptReview data={ocrResult} />;
  }

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: 20 }}>
      <div style={{
        border: "2px dashed #ccc",
        borderRadius: 8,
        padding: 40,
        textAlign: "center",
        backgroundColor: "#f9f9f9",
        cursor: "pointer",
        transition: "all 0.3s"
      }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
          id="receipt-upload"
        />
        <label
          htmlFor="receipt-upload"
          style={{ cursor: "pointer", display: "block" }}
        >
          <div style={{ fontSize: 48, marginBottom: 10 }}>📸</div>
          <p style={{ margin: 0, color: "#666" }}>
            {selectedFile
              ? `Selected: ${selectedFile.name}`
              : "Click to select receipt image"}
          </p>
        </label>
      </div>

      {selectedFile && (
        <button
          onClick={handleUpload}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: 15,
            padding: 12,
            backgroundColor: loading ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 16
          }}
        >
          {loading ? "Processing..." : "Scan Receipt"}
        </button>
      )}

      {error && (
        <div style={{
          marginTop: 15,
          padding: 10,
          backgroundColor: "#f8d7da",
          color: "#721c24",
          borderRadius: 4
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default OCRUpload;
