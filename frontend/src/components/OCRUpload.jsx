import { useState } from "react";
import axios from "axios";
import ReceiptReview from "../components/ReceiptReview";

function OCRPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const handleFile = (f) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return alert("Upload a receipt");

    const formData = new FormData();
    formData.append("image", file);

    try {
      setLoading(true);

      const res = await axios.post(
        "http://localhost:5000/ocr/scan",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );

      setData(res.data);

    } catch (err) {
      console.error(err);
      alert("Scan failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ocr-container">
      {/* 🔥 Upload Zone */}
      <div
        className="upload-box"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <p>Drag & drop receipt or click to upload</p>

        <input
          type="file"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {/* 👀 Preview */}
      {preview && (
        <div className="preview-card">
          <img src={preview} alt="preview" />
        </div>
      )}

      {/* 🚀 Button */}
      <button className="scan-btn" onClick={handleUpload}>
        Scan Receipt
      </button>

      {/* ⏳ Loader */}
      {loading && (
        <div className="loader">
          <div className="spinner"></div>
          <p>Analyzing your receipt...</p>
        </div>
      )}

      {/* 🧾 Results */}
      {data && (
        <div className="result-card">
          <ReceiptReview data={data} />
        </div>
      )}
    </div>
  );
}

export default OCRPage;