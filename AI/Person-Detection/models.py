from pydantic import BaseModel, Field
from typing import List

class GPSCoordinates(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

class Person(BaseModel):
    person_id: int = Field(..., ge=1)
    gps_coordinates: GPSCoordinates

class DetectionResponse(BaseModel):
    people: List[Person] = Field(default_factory=list)

class DroneData(BaseModel):
    drone_lat: float = Field(..., ge=-90, le=90)
    drone_lon: float = Field(..., ge=-180, le=180)
    altitude: float = Field(..., gt=0)
    fov_h: float = Field(..., gt=0, le=360)
    fov_v: float = Field(..., gt=0, le=360)
