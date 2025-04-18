from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from models import DetectionResponse
import os
from geo import process_image
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/detect", response_model=DetectionResponse)
async def detect_people(file: UploadFile = File(...)):
    # Save uploaded file temporarily
    temp_file_path = f"temp_{file.filename}"
    with open(temp_file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    try:
        # Process the image
        result = process_image(temp_file_path)
        return result
    finally:
        # Clean up temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
