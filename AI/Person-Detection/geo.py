import math
import cv2
import torch
import requests
from transformers import DetrImageProcessor, DetrForObjectDetection
from PIL import Image  

def pixel_to_gps(drone_lat, drone_lon, altitude, fov_h, fov_v, img_size, pixel_coords):
    print(drone_lat,drone_lon,altitude,fov_h,fov_v,img_size,pixel_coords)
    earth_radius = 6378137  
    img_width, img_height = img_size
    obj_x, obj_y = pixel_coords

    ground_width = 2 * altitude * math.tan(math.radians(fov_h / 2))
    ground_height = 2 * altitude * math.tan(math.radians(fov_v / 2))

    meters_per_pixel_x = ground_width / img_width
    meters_per_pixel_y = ground_height / img_height

    pixel_offset_x = obj_x - img_width / 2
    pixel_offset_y = img_height / 2 - obj_y  

    offset_x_meters = pixel_offset_x * meters_per_pixel_x
    offset_y_meters = pixel_offset_y * meters_per_pixel_y

    delta_lat = offset_y_meters / earth_radius * (180 / math.pi)
    delta_lon = offset_x_meters / (earth_radius * math.cos(math.pi * drone_lat / 180)) * (180 / math.pi)

    obj_lat = drone_lat + delta_lat
    obj_lon = drone_lon + delta_lon
    return obj_lat, obj_lon

processor = DetrImageProcessor.from_pretrained("facebook/detr-resnet-50")
model = DetrForObjectDetection.from_pretrained("facebook/detr-resnet-50")
model.eval()
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)

def process_image(image_path):
    frame = cv2.imread(image_path)
    h, w, _ = frame.shape
    pil_image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(pil_image)  

    inputs = processor(images=pil_image, return_tensors="pt").to(device)

    with torch.no_grad():  
        outputs = model(**inputs)

    target_sizes = torch.tensor([pil_image.size[::-1]])
    results = processor.post_process_object_detection(outputs, target_sizes=target_sizes, threshold=0.5)[0]

    coordinates_list = []
    human_count = 0
    data = {"people": []}  

    # Hardcoded values as in original code
    DRONE_LAT = 27.7172
    DRONE_LON = 85.3240
    ALTITUDE = 10
    FOV_H = 90
    FOV_V = 60

    for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
        if label.item() == 1: 
            x1, y1, x2, y2 = box.tolist()
            mid_x = (x1 + x2) / 2
            mid_y = (y1 + y2) / 2
            
            gps_cords = pixel_to_gps(DRONE_LAT, DRONE_LON, ALTITUDE, FOV_H, FOV_V, (w, h), (mid_x, mid_y))
            
            human_count += 1
            coordinates_list.append({
                "latitude": gps_cords[0],
                "longitude": gps_cords[1],
                "priority": "unknown"
            })
            
            data["people"].append({
                "person_id": human_count,
                "gps_coordinates": {
                    "latitude": gps_cords[0],
                    "longitude": gps_cords[1]
                }
            })

    # Post coordinates to the API
    try:
        print("posting coordinates to API")
        response = requests.post(
            'https://garuda-phi.vercel.app//api/coordinates',
            json={"coordinates": coordinates_list},
            headers={'Content-Type': 'application/json'}
        )
        response.raise_for_status()
        print("Coordinates successfully posted to API")
    except requests.exceptions.RequestException as e:
        print(f"Error posting coordinates to API: {e}")

    return data
