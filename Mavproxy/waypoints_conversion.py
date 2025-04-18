import json
from pymavlink import mavutil

def load_waypoints(json_file):
    with open(json_file, 'r') as file:
        return json.load(file)

def connect_to_speedybee(connection_string):
    return mavutil.mavlink_connection(connection_string)

def upload_waypoints(fc, waypoints):
    fc.mav.mission_clear_all_send(fc.target_system, fc.target_component)
    fc.recv_match(type='MISSION_ACK', blocking=True)
    
    fc.mav.mission_count_send(fc.target_system, fc.target_component, len(waypoints))
    
    for i, waypoint in enumerate(waypoints):
        lat, lon, alt = waypoint['latitude'], waypoint['longitude'], waypoint['altitude']
        fc.mav.mission_item_send(
            fc.target_system,       # Target system
            fc.target_component,    # Target component
            i,                      # Sequence number
            3,                      # Frame (relative altitude)
            16,                     # Command (NAV_WAYPOINT)
            0,                      # Current waypoint
            1,                      # Auto-continue
            0, 0, 0, 0,             # Params (not used for waypoints)
            lat,                    # Latitude
            lon,                    # Longitude
            alt                     # Altitude
        )
        print(f"Uploaded waypoint {i}: Lat {lat}, Lon {lon}, Alt {alt}")

    fc.recv_match(type='MISSION_ACK', blocking=True)
    print("Mission upload complete!")

if __name__ == "__main__":
    json_file = "waypoints.json"
    connection_string = "serial:/dev/ttyUSB0:115200"

    waypoints = load_waypoints(json_file)

    fc = connect_to_speedybee(connection_string)
    print("Connected to SpeedyBee")

    fc.wait_heartbeat()
    print("Heartbeat received")

    upload_waypoints(fc, waypoints)