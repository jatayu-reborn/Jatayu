from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import base64
from openai import OpenAI
import os
from dotenv import load_dotenv
import httpx
from typing import Optional

load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.post("/classify-image")
async def classify_image(
    file: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    priority: Optional[str] = Form(None)
):
    # Read the image file
    image_content = await file.read()
    
    # Convert to base64
    base64_image = base64.b64encode(image_content).decode('utf-8')
    
    # Create the prompt for classification
    prompt = """Please analyze this medical image and classify the condition into one of these categories:
            1. Normal - No visible issues
            2. Intermediate - Moderate concerns present
            3. Severe - Serious condition detected
            Provide only the category name as response (Normal, Intermediate, or Severe)."""

    # Make request to OpenAI
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": f"data:image/jpeg;base64,{base64_image}"
                    }
                ]
            }
        ],
        max_tokens=50
    )
    
    # Extract the classification
    classification = response.choices[0].message.content.strip()
    
    # Prepare data for Garuda API
    payload = {
        "coordinates": [
            {
                "latitude": latitude,
                "longitude": longitude,
                "priority": classification
            }
        ]
    }
    
    # Post to Garuda API
    async with httpx.AsyncClient() as client:
        garuda_response = await client.post(
            "https://garuda-phi.vercel.app/api/coordinates",
            json=payload
        )
        
        if garuda_response.status_code != 200:
            return {"error": "Failed to update coordinates in Garuda API"}
    
    return {
        "classification": classification,
        "coordinates_updated": True,
        "data_sent": payload
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
