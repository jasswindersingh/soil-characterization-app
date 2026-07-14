import os
import pickle
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score
from xgboost import XGBClassifier

# Define Paths
DATA_PATH = os.path.join("data", "crop_recommendation.csv")
MODEL_PATH = "soil_model.pkl"
ENCODER_PATH = "label_encoder.pkl"

def main():
    # Load Data
    print("Loading dataset...")
    df = pd.read_csv(DATA_PATH)
    
    # Separate Features (X) and Target (y)
    X = df.drop("label", axis=1)
    y = df["label"]
    
    # Encode Categorical Labels to Numbers
    print("Encoding crop labels...")
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    
    # Split Data into Training and Testing sets (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42
    )
    
    # Initialize and Train XGBoost Classifier
    print("Training the XGBoost model...")
    model = XGBClassifier(
        use_label_encoder=False, 
        eval_metric="mlogloss", 
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluate Model Performance
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Model Training Complete. Validation Accuracy: {accuracy * 100:.2f}%")
    
    # Save Model and Label Encoder to disk using Pickle
    print("Saving model components for backend use...")
    with open(MODEL_PATH, "wb") as model_file:
        pickle.dump(model, model_file)
        
    with open(ENCODER_PATH, "wb") as encoder_file:
        pickle.dump(label_encoder, encoder_file)
        
    print("Successfully saved 'soil_model.pkl' and 'label_encoder.pkl'.")

if __name__ == "__main__":
    main()