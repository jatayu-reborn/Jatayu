
import torch
from transformers import DetrImageProcessor, DetrForObjectDetection
from PIL import Image  
import cv2
from pixel_to_gps import pixel_to_gps 

def detect_and_get_gps_coordinates(image_path, drone_lat, drone_lon, altitude, fov_h, fov_v):
    processor = DetrImageProcessor.from_pretrained("facebook/detr-resnet-50")
    model = DetrForObjectDetection.from_pretrained("facebook/detr-resnet-50")
    
    model.eval()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    frame = cv2.imread(image_path)
    h, w, _ = frame.shape
    pil_image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(pil_image)

    inputs = processor(images=pil_image, return_tensors="pt").to(device)
    with torch.no_grad():
        outputs = model(**inputs)

    target_sizes = torch.tensor([pil_image.size[::-1]])
    results = processor.post_process_object_detection(outputs, target_sizes=target_sizes, threshold=0.5)[0]

    human_count = 0
    data = {"people": []}  

    for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
        if label.item() == 1:  
            x1, y1, x2, y2 = box.tolist()
            mid_x = (x1 + x2) / 2
            mid_y = (y1 + y2) / 2
            
            gps_coords = pixel_to_gps(drone_lat, drone_lon, altitude, fov_h, fov_v, (w, h), (mid_x, mid_y))
            print(f"GPS coordinates of detected person: {gps_coords}")
            
            human_count += 1
            data["people"].append({
                "person_id": human_count,
                "gps_coordinates": {
                    "latitude": gps_coords[0],
                    "longitude": gps_coords[1]
                }
            })

    return data
