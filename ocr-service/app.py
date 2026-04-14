from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import cv2
import numpy as np
from paddleocr import PaddleOCR
import tempfile
import os

app = FastAPI()

ocr = None

@app.on_event("startup")
async def startup_event():
    global ocr
    print("⏳ Loading PaddleOCR model...")
    ocr = PaddleOCR(use_textline_orientation=True)  # show_log=False reduces noise
    print("✅ PaddleOCR ready")

    # 🔥 Warm up with a blank image so first real request is fast
    import numpy as np
    dummy = np.zeros((100, 100, 3), dtype=np.uint8)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
        import cv2
        cv2.imwrite(tmp.name, dummy)
        try:
            ocr.predict(tmp.name)
        except:
            pass
        finally:
            os.unlink(tmp.name)
    
    print("✅ PaddleOCR ready")

@app.post("/ocr")
async def extract_text(image: UploadFile = File(...)):
    try:
        image_bytes = await image.read()

        suffix = os.path.splitext(image.filename)[-1] or ".png"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name

        try:
            # ✅ PaddleOCR 3.x: predict() with no extra args
            result = ocr.predict(tmp_path)
        finally:
            os.unlink(tmp_path)

        # ✅ PaddleOCR 3.x result structure is different from 2.x
        # result is a list of dicts with keys: rec_texts, rec_scores, dt_boxes
        extracted_text = ""
        if result:
            for page in result:
                texts = page.get("rec_texts", [])
                scores = page.get("rec_scores", [])
                for text, score in zip(texts, scores):
                    if text and score > 0.1:
                        extracted_text += text + " "

        extracted_text = " ".join(extracted_text.split())

        return {
            "text": extracted_text.strip(),
            "status": "success"
        }

    except Exception as e:
        print(f"❌ OCR Error: {type(e).__name__}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"OCR processing failed: {str(e)}"}
        )

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "OCR"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)