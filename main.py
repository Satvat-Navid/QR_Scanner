from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from datetime import datetime, timezone
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os, uvicorn

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
URI = os.getenv('URI')
client = MongoClient(URI, server_api=ServerApi('1'))

try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(e)

db = client["attendance"]
students_collection = db["students"]

class CheckInRequest(BaseModel):
    student_id: str

@app.post("/checkin")
def checkin(data: CheckInRequest):
    print(data)
    print(data.student_id)
    student = students_collection.find_one({"studentNumber": data.student_id})
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    students_collection.update_one(
        {"studentNumber": data.student_id},
        # {"$set": {"is_present": True, "last_checkin": datetime.utcnow()}}
        {"$set": {"is_present": True, "last_checkin": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Check-in successful", "student": data.student_id}

app.mount("/", StaticFiles(directory="public", html=True), name="public")


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000
    )