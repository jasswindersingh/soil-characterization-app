import os
import io
import json
import pickle
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, File, UploadFile, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import tensorflow as tf
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta

app = FastAPI(title="Unified Multi-Modal Soil Characterization, History Management & Security API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "SUPER_SECRET_COMPUTE_KEY_CHANGE_THIS_IN_PRODUCTION"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
DB_FILE = "local_database.json"


def normalize_password(password: str) -> str:
    if not password:
        return password
    encoded = password.encode("utf-8")
    if len(encoded) <= 72:
        return password
    return encoded[:72].decode("utf-8", errors="ignore")

SOIL_CHARACTERISTICS = {
    "Alluvial_Soil": {
        "description": "Highly fertile soil formed by river silt deposits. Rich in phosphoric acid, lime, and humus.",
        "color": "Light Grey to Ash Brown", "texture": "Sandy loam to clayey", "best_crops": "Rice, Wheat, Sugarcane, Pulses, Jute"
    },
    "Arid_Soil": {
        "description": "Soil found in dry regions with high salt content and low moisture retention.",
        "color": "Red to Light Brown", "texture": "Sandy and coarse structure", "best_crops": "Millets, Barley, Guar, Deep-rooted pulses"
    },
    "Black_Soil": {
        "description": "Also known as Regur soil. Highly clayey, expands when wet and developments deep structural cracks when dry, holding moisture exceptionally well.",
        "color": "Deep Black to Dark Charcoal", "texture": "Fine Clay texture", "best_crops": "Cotton, Soybeans, Wheat, Linseed, Tobacco"
    },
    "Laterite_Soil": {
        "description": "Formed under intense tropical leaching conditions. Highly acidic and low in natural nutrient content unless intensely managed.",
        "color": "Rusty Red due to Iron Oxides", "texture": "Coarse, gravelly structure", "best_crops": "Cashew nuts, Tea, Coffee, Rubber"
    },
    "Mountain_Soil": {
        "description": "Immature soil rich in organic matter and forest humus, but highly acidic and dynamic depending on altitude landscapes.",
        "color": "Dark Brown to Blackish-grey", "texture": "Loamy, silty, and gravelly mix", "best_crops": "Tea, Spices, Apples, Peaches, Saffron"
    },
    "Red_Soil": {
        "description": "Formed from crystalline metamorphic rocks. Low in moisture thresholds and organic nutrients.",
        "color": "Bright Red to Reddish-brown", "texture": "Sandy-loam to porous crystalline", "best_crops": "Groundnuts, Ragi, Tobacco, Oilseeds, Pulses"
    },
    "Yellow_Soil": {
        "description": "A structural variation of red soil that develops a distinct color profile when highly hydrated or moist.",
        "color": "Ochre Yellow to Dull Gold", "texture": "Fine-grained porous sandy loam", "best_crops": "Rice, Maize, Groundnuts, Sugarcane"
    }
}

def load_local_database():
    if not os.path.exists(DB_FILE):
        with open(DB_FILE, "w") as f: json.dump({}, f)
        return {}
    try:
        with open(DB_FILE, "r") as f: return json.load(f)
    except Exception: return {}

def save_to_local_database(data):
    with open(DB_FILE, "w") as f: json.dump(data, f, indent=4)

def get_user_from_token(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except Exception:
        return None

class UserAuthSchema(BaseModel):
    username: str
    password: str

class SoilInput(BaseModel):
    N: float; P: float; K: float; temperature: float; humidity: float; ph: float; rainfall: float

model, label_encoder, image_model, image_classes, general_classifier = None, None, None, [], None

@app.on_event("startup")
def load_all_model_components():
    global model, label_encoder, image_model, image_classes, general_classifier
    try:
        if os.path.exists("soil_model.pkl") and os.path.exists("label_encoder.pkl"):
            with open("soil_model.pkl", "rb") as mf: model = pickle.load(mf)
            with open("label_encoder.pkl", "rb") as ef: label_encoder = pickle.load(ef)
    except Exception as e: print(f"Error loading tabular models: {str(e)}")
        
    try:
        if os.path.exists("soil_image_model.h5") and os.path.exists("classes.txt"):
            image_model = tf.keras.models.load_model("soil_image_model.h5")
            with open("classes.txt", "r") as f: image_classes = [line.strip() for line in f.readlines()]
    except Exception as e: print(f"Error loading vision models: {str(e)}")

    try:
        general_classifier = tf.keras.applications.MobileNetV2(weights="imagenet", include_top=True)
    except Exception as e: print(f"Error loading guard weights: {str(e)}")

@app.get("/")
def read_root():
    return {"status": "healthy"}

# ================= AUTHENTICATION ENDPOINTS =================

@app.post("/auth/register")
def register_user(user: UserAuthSchema):
    db = load_local_database()
    if user.username in db:
        raise HTTPException(status_code=400, detail="Identity profile already registered.")
    normalized_password = normalize_password(user.password)
    db[user.username] = {
        "username": user.username,
        "password": pwd_context.hash(normalized_password),
        "history": []
    }
    save_to_local_database(db)
    return {"success": True}

@app.post("/auth/login")
def login_user(user: UserAuthSchema):
    db = load_local_database()
    db_user = db.get(user.username)
    normalized_password = normalize_password(user.password)
    if not db_user or not pwd_context.verify(normalized_password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid signature or decryption key mismatch.")
    token = jwt.encode({"sub": user.username, "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"success": True, "token": token, "username": user.username}

# ================= HISTORY LOG DATABASE MANAGEMENT ENDPOINTS =================

@app.get("/history")
def fetch_user_history(authorization: str = Header(None)):
    username = get_user_from_token(authorization)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid session verification signatures.")
    db = load_local_database()
    return {"success": True, "history": db.get(username, {}).get("history", [])}

@app.delete("/history")
def delete_history_record(timestamp: str, authorization: str = Header(None)):
    username = get_user_from_token(authorization)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid session verification signatures.")
    
    db = load_local_database()
    if username in db:
        current_history = db[username].get("history", [])
        # Filter out the specific historical snapshot log entry matching the execution timestamp
        updated_history = [record for record in current_history if record.get("timestamp") != timestamp]
        db[username]["history"] = updated_history
        save_to_local_database(db)
        return {"success": True, "history": updated_history}
        
    raise HTTPException(status_code=404, detail="User target space metadata profile not found.")

# ================= DATA PROCESSING ENDPOINTS =================

@app.post("/predict")
def predict_crop(data: SoilInput, authorization: str = Header(None)):
    if model is None or label_encoder is None:
        raise HTTPException(status_code=500, detail="Tabular predictive components are not ready.")
    try:
        input_data = pd.DataFrame([data.dict()])
        encoded_prediction = model.predict(input_data)
        decoded_prediction = str(label_encoder.inverse_transform(encoded_prediction)[0])
        
        username = get_user_from_token(authorization)
        if username:
            db = load_local_database()
            if "history" not in db[username]: db[username]["history"] = []
            db[username]["history"].append({
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "type": "tabular",
                "output": decoded_prediction.upper(),
                "metric": f"pH: {data.ph} | NPK: {data.N}-{data.P}-{data.K}"
            })
            save_to_local_database(db)

        return {"success": True, "prediction": decoded_prediction}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/predict-image")
async def predict_soil_image(file: UploadFile = File(...), authorization: str = Header(None)):
    if image_model is None or general_classifier is None:
        raise HTTPException(status_code=500, detail="Computer vision engine is offline.")
    try:
        contents = await file.read()
        raw_image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        img_hsv = np.array(raw_image.convert("HSV"))
        green_pixels = (img_hsv[:,:,0] >= 55) & (img_hsv[:,:,0] <= 105) & (img_hsv[:,:,1] > 35) & (img_hsv[:,:,2] > 35)
        if (np.sum(green_pixels) / img_hsv[:,:,0].size) * 100 > 20.0:
            raise HTTPException(status_code=400, detail="Invalid Content: Image contains too much green vegetation.")
        
        guard_img = raw_image.resize((224, 224))
        guard_array = tf.keras.preprocessing.image.img_to_array(guard_img)
        guard_array = tf.keras.applications.mobilenet_v2.preprocess_input(np.expand_dims(guard_array, axis=0))
        guard_predictions = general_classifier.predict(guard_array)
        decoded_labels = [label[1].lower() for label in tf.keras.applications.mobilenet_v2.decode_predictions(guard_predictions, top=5)[0]]
        
        if any(p in obj for p in ['rice','grass','leaf','tree','vegetation'] for obj in decoded_labels) and not any(s in obj for s in ['soil','mud','sand','earth','ground','rock'] for obj in decoded_labels):
            raise HTTPException(status_code=400, detail="Invalid Content: Uploaded file appears to be a crop or plant.")

        image = raw_image.resize((150, 150))
        img_array = np.array(image)
        img_array = np.expand_dims(img_array, axis=0)
        
        predictions = image_model.predict(img_array)[0]
        top_indices = np.argsort(predictions)[::-1]
        
        detected_soil = image_classes[top_indices[0]]
        confidence_value = float(predictions[top_indices[0]])
        
        secondary_match = None
        if predictions[top_indices[1]] > 0.15:
            secondary_match = {"soil_type": image_classes[top_indices[1]], "confidence": float(predictions[top_indices[1]])}
            
        username = get_user_from_token(authorization)
        if username:
            db = load_local_database()
            if "history" not in db[username]: db[username]["history"] = []
            db[username]["history"].append({
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "type": "image",
                "output": detected_soil.replace('_', ' ').upper(),
                "metric": f"Match Score: {(confidence_value * 100):.1f}%"
            })
            save_to_local_database(db)
        
        # Standardize matching normalization mapping arrays
        formatted_key = detected_soil.replace(' ', '_')
        # Check standard capitalized structures
        if formatted_key.lower() == "alluvial_soil": formatted_key = "Alluvial_Soil"
        elif formatted_key.lower() == "arid_soil": formatted_key = "Arid_Soil"
        elif formatted_key.lower() == "black_soil": formatted_key = "Black_Soil"
        elif formatted_key.lower() == "laterite_soil": formatted_key = "Laterite_Soil"
        elif formatted_key.lower() == "mountain_soil": formatted_key = "Mountain_Soil"
        elif formatted_key.lower() == "red_soil": formatted_key = "Red_Soil"
        elif formatted_key.lower() == "yellow_soil": formatted_key = "Yellow_Soil"

        return {
            "success": True, "soil_type": detected_soil, "confidence": confidence_value,
            "secondary_match": secondary_match, "characteristics": SOIL_CHARACTERISTICS.get(formatted_key, {})
        }
    except HTTPException as he: raise he
    except Exception: raise HTTPException(status_code=400, detail="Vision matrix calculation processing failure.")