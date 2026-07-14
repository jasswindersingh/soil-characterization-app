import os
import tensorflow as tf
from tensorflow.keras import layers, models

# Set up paths
IMAGE_DIR = os.path.join("data", "soil_images")
MODEL_OUT = "soil_image_model.h5"

# Global configurations
IMG_SIZE = (150, 150)
BATCH_SIZE = 32

def sanitize_dataset_with_tensorflow(directory):
    """Uses TensorFlow's own decoding engine to find and eliminate corrupt images."""
    print("Using TensorFlow engine to scan and validate image binaries...")
    removed_count = 0
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            
            # Remove hidden files immediately
            if file.startswith('.'):
                try:
                    os.remove(file_path)
                    removed_count += 1
                except Exception:
                    pass
                continue
            
            # Read and attempt to decode using native TensorFlow functions
            try:
                img_bytes = tf.io.read_file(file_path)
                # This mimics exactly what the dataset loader uses internally
                tf.io.decode_image(img_bytes, expand_animations=False)
            except (tf.errors.InvalidArgumentError, Exception) as e:
                # Catch files that TF rejects (e.g., unrecognized format, truncated data)
                try:
                    os.remove(file_path)
                    print(f"Removed TF-incompatible asset: {file_path}")
                    removed_count += 1
                except Exception:
                    pass

    if removed_count > 0:
        print(f"Sanitization complete. Cleaned out {removed_count} problematic files.\n")
    else:
        print("All image files are confirmed compatible with TensorFlow.\n")

def main():
    # Pre-clean the dataset utilizing native TensorFlow decoding checks
    sanitize_dataset_with_tensorflow(IMAGE_DIR)
    
    print("Preparing image datasets...")
    train_ds = tf.keras.utils.image_dataset_from_directory(
        IMAGE_DIR, validation_split=0.2, subset="training", seed=42,
        image_size=IMG_SIZE, batch_size=BATCH_SIZE
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        IMAGE_DIR, validation_split=0.2, subset="validation", seed=42,
        image_size=IMG_SIZE, batch_size=BATCH_SIZE
    )

    class_names = train_ds.class_names
    print(f"Detected soil categories: {class_names}")

    # Build the Convolutional Neural Network (CNN)
    model = models.Sequential([
        layers.Input(shape=(150, 150, 3)),
        layers.Rescaling(1./255),
        layers.Conv2D(32, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(128, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Flatten(),
        layers.Dense(128, activation='relu'),
        layers.Dense(len(class_names), activation='softmax')
    ])

    model.compile(optimizer='adam',
                  loss='sparse_categorical_crossentropy',
                  metrics=['accuracy'])

    print("\nTraining the Neural Image Network...")
    model.fit(train_ds, validation_data=val_ds, epochs=5)

    # Save the architecture metrics
    model.save(MODEL_OUT)
    
    with open("classes.txt", "w") as f:
        for name in class_names:
            f.write(f"{name}\n")
            
    print(f"\nSuccessfully saved image model components to {MODEL_OUT}")

if __name__ == "__main__":
    if os.path.exists(IMAGE_DIR):
        main()
    else:
        print(f"Error: Put your image categorical folders inside {IMAGE_DIR} before running.")