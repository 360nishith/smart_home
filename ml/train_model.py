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
DATASET_DIR = os.path.join(BASE_DIR, "archive", "rps", "rps")
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


def build_model():
    """3-block CNN with batch norm and dropout. Nothing fancy, just solid."""
    model = Sequential([
        # block 1
        Conv2D(32, (3, 3), activation='relu', padding='same',
               input_shape=(IMG_SIZE, IMG_SIZE, 3)),
        BatchNormalization(),
        MaxPooling2D(2, 2),
        Dropout(0.25),

        # block 2
        Conv2D(64, (3, 3), activation='relu', padding='same'),
        BatchNormalization(),
        MaxPooling2D(2, 2),
        Dropout(0.25),

        # block 3
        Conv2D(128, (3, 3), activation='relu', padding='same'),
        BatchNormalization(),
        MaxPooling2D(2, 2),
        Dropout(0.25),

        # classifier head
        Flatten(),
        Dense(256, activation='relu'),
        Dropout(0.5),
        Dense(2, activation='softmax')
    ])

    from tensorflow.keras.optimizers import Adam
    model.compile(
        optimizer=Adam(learning_rate=0.0005),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )

    return model


def train():
    print("Setting up dataset folders...")
    setup_temp_dirs()

    # augmentation — helps the model generalize to real webcam images
    # instead of just memorizing the synthetic backgrounds
    train_gen = ImageDataGenerator(
        rescale=1.0 / 255,
        rotation_range=15,
        width_shift_range=0.1,
        height_shift_range=0.1,
        zoom_range=0.15,
        horizontal_flip=True,
        brightness_range=[0.8, 1.2],
        validation_split=0.2
    )

    print("Loading training data...")
    train_data = train_gen.flow_from_directory(
        TEMP_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='training',
        shuffle=True
    )

    print("Loading validation data...")
    val_data = train_gen.flow_from_directory(
        TEMP_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='validation',
        shuffle=False
    )

    # print class mapping so we know the order matches what the server expects
    print(f"\nClass indices: {train_data.class_indices}")
    print(f"(server expects: 0=fist, 1=palm)\n")

    model = build_model()
    model.summary()

    callbacks = [
        EarlyStopping(
            monitor='val_loss',
            patience=5,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            verbose=1
        ),
        ModelCheckpoint(
            OUTPUT_MODEL,
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        )
    ]

    # back up old model before we overwrite
    if os.path.exists(OUTPUT_MODEL):
        shutil.copy2(OUTPUT_MODEL, BACKUP_MODEL)
        print(f"Backed up old model to {BACKUP_MODEL}")

    EPOCHS = 30
    
    # Calculate class weights safely to handle imbalance (1566 fist vs 712 palm)
    total = train_data.samples
    num_classes = train_data.num_classes
    class_weights = {}
    for cls_idx, count in zip(*np.unique(train_data.classes, return_counts=True)):
        class_weights[cls_idx] = total / (num_classes * count)
    print(f"\nUsing class weights: {class_weights}\n")

    print("\nStarting training...\n")
    history = model.fit(
        train_data,
        validation_data=val_data,
        epochs=EPOCHS,
        callbacks=callbacks,
        class_weight=class_weights
    )

    # final results
    best_val_acc = max(history.history['val_accuracy'])
    print(f"\nDone. Best validation accuracy: {best_val_acc:.4f}")
    print(f"Model saved to: {OUTPUT_MODEL}")

    # clean up temp folder
    shutil.rmtree(TEMP_DIR)
    print("Cleaned up temp files.")


if __name__ == "__main__":
    train()
