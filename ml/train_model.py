import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import (
    Conv2D, MaxPooling2D, Flatten, Dense,
    Dropout, BatchNormalization
)
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
import shutil

# paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(BASE_DIR, "archive", "real_hand_dataset")
OUTPUT_MODEL = os.path.join(BASE_DIR, "ml", "saved_model.h5")
BACKUP_MODEL = os.path.join(BASE_DIR, "ml", "saved_model_backup.h5")

# we only care about rock (fist) and paper (palm)
# so we'll copy those into a temp structure that the generator can read
TEMP_DIR = os.path.join(BASE_DIR, "ml", "_temp_train")

IMG_SIZE = 128
BATCH_SIZE = 32
EPOCHS = 5


def setup_temp_dirs():
    """Create a clean temp folder with symlinks/copies for just fist and palm."""
    if os.path.exists(TEMP_DIR):
        shutil.rmtree(TEMP_DIR)

    # map rock -> fist, paper -> palm
    mapping = {
        "rock": "fist",
        "paper": "palm"
    }

    for src_name, dst_name in mapping.items():
        src = os.path.join(DATASET_DIR, src_name)
        dst = os.path.join(TEMP_DIR, dst_name)
        # just copy the whole folder — dataset isn't huge
        shutil.copytree(src, dst)
        count = len(os.listdir(dst))
        print(f"  {dst_name}: {count} images (from {src_name}/)")

    print()


from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import GlobalAveragePooling2D

def build_model():
    """Transfer Learning with MobileNetV2 for better generalization."""
    base_model = MobileNetV2(
        input_shape=(IMG_SIZE, IMG_SIZE, 3),
        include_top=False,
        weights='imagenet'
    )
    # Freeze pre-trained weights so we only train the new top layers
    base_model.trainable = False

    model = Sequential([
        base_model,
        GlobalAveragePooling2D(),
        Dense(128, activation='relu'),
        Dropout(0.3),
        Dense(2, activation='softmax')
    ])

    from tensorflow.keras.optimizers import Adam
    # Use a slightly higher learning rate initially for transfer learning top layers
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )

    return model


def train():
    print("Setting up dataset folders...")
    setup_temp_dirs()

    train_gen = ImageDataGenerator(
        rescale=1.0 / 255,
        rotation_range=15,
        width_shift_range=0.1,
        height_shift_range=0.1,
        zoom_range=0.15,
        horizontal_flip=True,
        brightness_range=[0.8, 1.2]
    )

    print("Loading training data...")
    train_data = train_gen.flow_from_directory(
        TEMP_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        shuffle=True
    )

    print(f"\nClass indices: {train_data.class_indices}")
    print(f"(server expects: 0=fist, 1=palm)\n")

    model = build_model()
    model.summary()

    callbacks = [
        ReduceLROnPlateau(
            monitor='loss',
            factor=0.5,
            patience=3,
            verbose=1
        )
    ]

    if os.path.exists(OUTPUT_MODEL):
        shutil.copy2(OUTPUT_MODEL, BACKUP_MODEL)
        print(f"Backed up old model to {BACKUP_MODEL}")

    EPOCHS = 10
    
    total = train_data.samples
    num_classes = train_data.num_classes
    class_weights = {}
    for cls_idx, count in zip(*np.unique(train_data.classes, return_counts=True)):
        class_weights[cls_idx] = total / (num_classes * count)
    print(f"\nUsing class weights: {class_weights}\n")

    print("\nStarting training...\n")
    history = model.fit(
        train_data,
        epochs=EPOCHS,
        callbacks=callbacks,
        class_weight=class_weights
    )

    model.save(OUTPUT_MODEL)
    print(f"Model saved to: {OUTPUT_MODEL}")

    # clean up temp folder
    shutil.rmtree(TEMP_DIR)
    print("Cleaned up temp files.")


if __name__ == "__main__":
    train()
