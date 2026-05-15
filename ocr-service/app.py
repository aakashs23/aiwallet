from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import cv2
import numpy as np
from paddleocr import PaddleOCR
import tempfile
from pdf2image import convert_from_path
import os

app = FastAPI()

ocr = None

@app.on_event("startup")
async def startup_event():
    global ocr
    print("⏳ Loading PaddleOCR model...")
    ocr = PaddleOCR(use_textline_orientation=True)

    # 🔥 Warm up
    dummy = np.zeros((100, 100, 3), dtype=np.uint8)
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
            tmp_path = tmp.name
            cv2.imwrite(tmp_path, dummy)
        ocr.predict(tmp_path)
    except Exception as e:
        print(f"Warmup warning (non-fatal): {e}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    print("✅ PaddleOCR ready")


@app.post("/ocr")
async def extract_text(image: UploadFile = File(...)):
    try:
        print(f"OCR request received: filename={image.filename}")
        file_bytes = await image.read()

        suffix = os.path.splitext(image.filename)[-1].lower()

        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        image_paths = []

        try:
            # 📄 PDF handling
            if suffix == ".pdf":
                poppler_path = os.environ.get("POPPLER_PATH")
                convert_kwargs = {
                    "dpi": 300
                }
                if poppler_path:
                    convert_kwargs["poppler_path"] = poppler_path

                pages = convert_from_path(tmp_path, **convert_kwargs)

                for i, page in enumerate(pages):
                    img_path = f"{tmp_path}_page_{i}.png"
                    page.save(img_path, "PNG")
                    image_paths.append(img_path)

            # 🖼 Image handling
            else:
                image_paths.append(tmp_path)

            # 🔍 OCR processing
            extracted_text = ""

            for img in image_paths:
                result = ocr.predict(img)

                if result:
                    for page in result:
                        texts = page.get("rec_texts", [])
                        scores = page.get("rec_scores", [])

                        for text, score in zip(texts, scores):
                            if text and score > 0.1:
                                extracted_text += text + " "

            extracted_text = " ".join(extracted_text.split())

        finally:
            # 🧹 cleanup
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

            for img in image_paths:
                if os.path.exists(img):
                    os.unlink(img)

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