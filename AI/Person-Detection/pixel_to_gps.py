import math

def pixel_to_gps(drone_lat, drone_lon, altitude, fov_h, fov_v, img_size, pixel_coords):
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
