# OCR Service Setup Guide

## Issue Resolved
The backend was calling `http://localhost:8000/ocr` but the OCR service application was missing. This has been fixed by:

1. Creating `app.py` with FastAPI OCR endpoint using PaddleOCR
2. Adding proper error handling in the backend controller
3. Providing this setup guide

## Quick Start

### 1. Install Dependencies
```bash
cd ocr-service
pip install -r requirements.txt
```

### 2. Run the OCR Service
```bash
python app.py
```

The service will start on `http://localhost:8000`

### 3. Verify It's Running
- Health check: `http://localhost:8000/health` (returns `{"status": "healthy", "service": "OCR"}`)
- Swagger docs: `http://localhost:8000/docs`

## Endpoints

### POST /ocr
**Extracts text from an image using PaddleOCR**

Request:
- Method: POST
- Content-Type: multipart/form-data
- Body: Form field named "image" with image file

Response:
```json
{
  "text": "extracted text from image",
  "status": "success"
}
```

### GET /health
Health check endpoint (returns 200 if service is healthy)

## How It Works

1. Receives image file via multipart form-data
2. Decodes image to OpenCV format
3. Runs PaddleOCR with angle classification enabled
4. Extracts text from all detected lines
5. Returns text as JSON

## Supported Image Formats
- JPEG
- PNG
- BMP
- TIFF

## Troubleshooting

If you get error `Axios 404 Not Found`:
1. Ensure OCR service is running: `python app.py`
2. Check port 8000 is not blocked by firewall
3. Verify the endpoint is `/ocr` (GET /health should respond)

If PaddleOCR model downloading is slow:
- First run downloads the model (~500MB)
- Subsequent runs use cached model

## Performance Notes
- First request will be slower as the model loads
- Typical OCR processing time: 2-5 seconds per image
- Best results with preprocessed images (which the backend does automatically)
