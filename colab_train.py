"""
colab_train.py - Standalone PyTorch training script for Google Colab GPU
=========================================================================
Uses CICIDS2017 (Wednesday subset) for real network attack data.
Produces: attack_forecaster.pth (place into ai_engine/models/)

Usage in Colab:
  !python colab_train.py
"""

import os
import io
import zipfile
import urllib.request
import random
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import LabelEncoder, MinMaxScaler

# ============================================================
# 1. CONFIGURATION
# ============================================================
NUM_STAGES = 14
FEATURE_DIM = 12
WINDOW_SIZE = 30
HIDDEN_DIM = 128
NUM_LAYERS = 2
DROPOUT = 0.3
BATCH_SIZE = 64
EPOCHS = 50
LR = 1e-3
WEIGHT_DECAY = 1e-5
VAL_RATIO = 0.15
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
OUTPUT_PATH = "attack_forecaster.pth"

# CICIDS2017 Wednesday URL (only ~15MB, contains all attack types)
DATA_URL = "https://media.githubusercontent.com/media/Aayush3238/sih26/main/data/Wednesday-workingHours.pcap_ISCX.csv.zip"
# Fallback: direct download from the CICIDS2017 original source
FALLBACK_URL = "https://www.unb.ca/cic/datasets/ids-2017.html"

ATTACK_STAGES = [
    "Reconnaissance", "Resource Development", "Initial Access", "Execution",
    "Persistence", "Privilege Escalation", "Defense Evasion", "Credential Access",
    "Discovery", "Lateral Movement", "Collection", "Command and Control",
    "Exfiltration", "Impact",
]

# CICIDS2017 labels -> MITRE ATT&CK stage indices
LABEL_TO_STAGE = {
    "BENIGN": 2,                   # Initial Access (normal baseline)
    "Bot": 11,                     # Command and Control
    "DoS Hulk": 13,                # Impact
    "DoS GoldenEye": 13,           # Impact
    "DoS slowloris": 13,           # Impact
    "DoS Slowhttptest": 13,        # Impact
    "Heartbleed": 2,               # Initial Access
    "Infiltration": 9,             # Lateral Movement
    "PortScan": 0,                 # Reconnaissance
    "Web Attack - Brute Force": 2, # Initial Access
    "Web Attack - Sql Injection": 2,  # Initial Access
    "Web Attack - XSS": 2,         # Initial Access
}

# 12 flow features matching our model input
FEATURE_COLUMNS = [
    "Flow Duration",
    "Total Fwd Packets",
    "Total Bwd Packets",
    "Total Length of Fwd Packets",
    "Total Length of Bwd Packets",
    "Fwd Packet Length Mean",
    "Bwd Packet Length Mean",
    "Flow Bytes/s",
    "Flow Packets/s",
    "Fwd IAT Mean",
    "Bwd IAT Mean",
    "Subflow Fwd Bytes",
]

# ============================================================
# 2. DATA LOADING - CICIDS2017 Wednesday subset
# ============================================================
def download_cicids2017():
    """Download and extract the Wednesday file from CICIDS2017."""
    csv_path = Path("Wednesday-workingHours.pcap_ISCX.csv")

    if csv_path.exists():
        print(f"[data] Found existing {csv_path}, skipping download.")
        return csv_path

    zip_path = Path("cicids2017_wednesday.zip")

    print("[data] Downloading CICIDS2017 Wednesday subset (~15MB)...")
    try:
        urllib.request.urlretrieve(DATA_URL, str(zip_path))
        print("[data] Download complete. Extracting...")
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(".")
        zip_path.unlink()
        print(f"[data] Extracted {csv_path}")
        return csv_path
    except Exception as e:
        print(f"[data] Primary download failed: {e}")
        print("[data] Generating synthetic dataset as fallback...")
        return None


def load_and_process_data(csv_path):
    """Load CSV, extract features, map labels to MITRE ATT&CK stages."""
    print("[data] Loading CSV (this may take a minute)...")
    df = pd.read_csv(csv_path, encoding="latin-1")

    # Clean column names
    df.columns = df.columns.str.strip()

    # Drop rows with infinite/NaN values
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df.dropna(subset=FEATURE_COLUMNS + ["Label"], inplace=True)

    print(f"[data] Loaded {len(df)} flow records")

    # Map labels to MITRE ATT&CK stages
    df["Label_clean"] = df["Label"].str.strip()
    df["stage"] = df["Label_clean"].map(LABEL_TO_STAGE)
    df.dropna(subset=["stage"], inplace=True)
    df["stage"] = df["stage"].astype(int)

    print(f"[data] After label mapping: {len(df)} records across {df['stage'].nunique()} stages")

    # Extract features and labels
    X = df[FEATURE_COLUMNS].values.astype(np.float32)
    y = df["stage"].values.astype(np.int64)

    # Normalize features to [0, 1]
    scaler = MinMaxScaler()
    X = scaler.fit_transform(X)

    return X, y


def create_windows(X, y, window_size=WINDOW_SIZE):
    """Convert flat samples into sliding windows with current + next stage labels."""
    print(f"[data] Creating sliding windows (size={window_size})...")
    windows, cur_labels, nxt_labels = [], [], []

    # Group by approximate time order (use index as proxy)
    num_samples = len(X)
    num_windows = num_samples // window_size

    for i in range(num_windows):
        start = i * window_size
        end = start + window_size
        if end >= num_samples:
            break

        window = X[start:end]
        current_stage = y[end - 1]

        # Next stage: look ahead or stay at last known
        next_idx = min(end, num_samples - 1)
        next_stage = y[next_idx]

        windows.append(window)
        cur_labels.append(current_stage)
        nxt_labels.append(next_stage)

    print(f"[data] Created {len(windows)} windows")
    return np.array(windows, dtype=np.float32), np.array(cur_labels), np.array(nxt_labels)


# ============================================================
# 3. SYNTHETIC DATASET (fallback if download fails)
# ============================================================
class SyntheticAttackDataset(Dataset):
    """Generates realistic synthetic network flow windows."""

    def __init__(self, num_samples=8000, window_size=WINDOW_SIZE):
        self.num_samples = num_samples
        self.window_size = window_size
        self.samples, self.cur_labels, self.nxt_labels = self._generate()

    def _generate(self):
        samples, cur_labels, nxt_labels = [], [], []
        for _ in range(self.num_samples):
            stage = random.choices(range(NUM_STAGES), weights=[1.5]*4 + [1.0]*6 + [0.5]*4)[0]
            nxt_stage = min(NUM_STAGES - 1, stage + random.choices([0, 1, 2], weights=[0.3, 0.5, 0.2])[0])

            window = []
            for t in range(self.window_size):
                noise = np.random.randn(FEATURE_DIM) * 0.1
                base = self._stage_features(stage)
                trend = np.linspace(0, 0.2, FEATURE_DIM) * (t / self.window_size)
                window.append((base + noise + trend).tolist())

            samples.append(window)
            cur_labels.append(stage)
            nxt_labels.append(nxt_stage)
        return samples, cur_labels, nxt_labels

    def _stage_features(self, stage):
        base = np.zeros(FEATURE_DIM)
        progress = stage / max(1, NUM_STAGES - 1)
        base[0] = 0.2 + progress * 0.6
        base[1] = 0.1 + progress * 0.7
        base[2] = 0.3 + progress * 0.4
        base[3] = 0.1 + (1 - progress) * 0.5
        base[4] = 0.05 + progress * 0.8
        base[5] = 0.1 + progress * 0.6
        base[6] = random.uniform(0.1, 0.9)
        base[7] = random.uniform(0.1, 0.9)
        base[8] = 0.0 + progress * 0.5
        base[9] = 0.1 + progress * 0.7
        base[10] = 0.2 + progress * 0.3
        base[11] = 0.1 + progress * 0.4
        return np.clip(base, 0, 1)

    def __len__(self):
        return self.num_samples

    def __getitem__(self, idx):
        return (
            torch.tensor(self.samples[idx], dtype=torch.float32),
            torch.tensor(self.cur_labels[idx], dtype=torch.long),
            torch.tensor(self.nxt_labels[idx], dtype=torch.long),
        )


class RealAttackDataset(Dataset):
    """Dataset from CICIDS2017 real network flow windows."""

    def __init__(self, windows, cur_labels, nxt_labels):
        self.windows = torch.tensor(windows, dtype=torch.float32)
        self.cur_labels = torch.tensor(cur_labels, dtype=torch.long)
        self.nxt_labels = torch.tensor(nxt_labels, dtype=torch.long)

    def __len__(self):
        return len(self.windows)

    def __getitem__(self, idx):
        return self.windows[idx], self.cur_labels[idx], self.nxt_labels[idx]


# ============================================================
# 4. MODEL DEFINITION
# ============================================================
class AttackForecasterLSTM(nn.Module):
    def __init__(self, feature_dim=FEATURE_DIM, hidden_dim=HIDDEN_DIM,
                 num_layers=NUM_LAYERS, num_classes=NUM_STAGES, dropout=DROPOUT):
        super().__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers

        self.input_proj = nn.Sequential(
            nn.Linear(feature_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
        )
        self.lstm = nn.LSTM(
            hidden_dim, hidden_dim, num_layers,
            batch_first=True, dropout=dropout if num_layers > 1 else 0.0,
        )
        self.attention = nn.MultiheadAttention(hidden_dim, 4, dropout=dropout, batch_first=True)
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim), nn.ReLU(), nn.Dropout(dropout),
            nn.Linear(hidden_dim, num_classes),
        )
        self.next_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2), nn.ReLU(), nn.Dropout(dropout),
            nn.Linear(hidden_dim // 2, num_classes),
        )
        self._init_weights()

    def _init_weights(self):
        for name, p in self.named_parameters():
            if "weight_ih" in name:
                nn.init.xavier_uniform_(p.data)
            elif "weight_hh" in name:
                nn.init.orthogonal_(p.data)
            elif "bias" in name:
                p.data.fill_(0)
                n = p.size(0)
                p.data[n // 4 : n // 2].fill_(1.0)

    def forward(self, x):
        proj = self.input_proj(x)
        lstm_out, _ = self.lstm(proj)
        attn_out, _ = self.attention(lstm_out, lstm_out, lstm_out)
        last = attn_out[:, -1, :]
        return self.classifier(last), self.next_head(last)


# ============================================================
# 5. TRAINING LOOP
# ============================================================
def train():
    print(f"Device: {DEVICE}")

    # Try to load real CICIDS2017 data
    csv_path = download_cicids2017()

    if csv_path and csv_path.exists():
        X, y = load_and_process_data(csv_path)
        windows, cur_labels, nxt_labels = create_windows(X, y)
        full_dataset = RealAttackDataset(windows, cur_labels, nxt_labels)
        data_source = "CICIDS2017 (Wednesday)"
    else:
        print("[data] Using synthetic dataset as fallback")
        full_dataset = SyntheticAttackDataset(num_samples=8000)
        data_source = "Synthetic"

    print(f"[data] Dataset: {data_source} | Samples: {len(full_dataset)}")

    val_size = int(len(full_dataset) * VAL_RATIO)
    train_size = len(full_dataset) - val_size
    train_ds, val_ds = torch.utils.data.random_split(full_dataset, [train_size, val_size])

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=2)

    model = AttackForecasterLSTM().to(DEVICE)
    optimizer = optim.AdamW(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)
    cur_criterion = nn.CrossEntropyLoss()
    nxt_criterion = nn.CrossEntropyLoss()

    best_val_loss = float("inf")
    print(f"Training on {DEVICE} for {EPOCHS} epochs...\n")

    for epoch in range(1, EPOCHS + 1):
        model.train()
        train_loss = 0
        correct_cur, correct_nxt, total = 0, 0, 0

        for windows_batch, cur_y, nxt_y in train_loader:
            windows_batch, cur_y, nxt_y = windows_batch.to(DEVICE), cur_y.to(DEVICE), nxt_y.to(DEVICE)
            cur_logits, nxt_logits = model(windows_batch)

            loss = cur_criterion(cur_logits, cur_y) + nxt_criterion(nxt_logits, nxt_y)
            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            train_loss += loss.item() * windows_batch.size(0)
            correct_cur += (cur_logits.argmax(1) == cur_y).sum().item()
            correct_nxt += (nxt_logits.argmax(1) == nxt_y).sum().item()
            total += windows_batch.size(0)

        scheduler.step()
        avg_loss = train_loss / total
        acc_cur = correct_cur / total * 100
        acc_nxt = correct_nxt / total * 100

        model.eval()
        val_loss, v_correct_cur, v_correct_nxt, v_total = 0, 0, 0, 0
        with torch.no_grad():
            for windows_batch, cur_y, nxt_y in val_loader:
                windows_batch, cur_y, nxt_y = windows_batch.to(DEVICE), cur_y.to(DEVICE), nxt_y.to(DEVICE)
                cur_logits, nxt_logits = model(windows_batch)
                loss = cur_criterion(cur_logits, cur_y) + nxt_criterion(nxt_logits, nxt_y)
                val_loss += loss.item() * windows_batch.size(0)
                v_correct_cur += (cur_logits.argmax(1) == cur_y).sum().item()
                v_correct_nxt += (nxt_logits.argmax(1) == nxt_y).sum().item()
                v_total += windows_batch.size(0)

        v_loss = val_loss / v_total
        v_acc_cur = v_correct_cur / v_total * 100
        v_acc_nxt = v_correct_nxt / v_total * 100

        marker = ""
        if v_loss < best_val_loss:
            best_val_loss = v_loss
            torch.save(model.state_dict(), OUTPUT_PATH)
            marker = " *saved*"

        print(
            f"Epoch {epoch:3d}/{EPOCHS} | "
            f"Train Loss: {avg_loss:.4f} CurAcc: {acc_cur:.1f}% NxtAcc: {acc_nxt:.1f}% | "
            f"Val Loss: {v_loss:.4f} CurAcc: {v_acc_cur:.1f}% NxtAcc: {v_acc_nxt:.1f}%{marker}"
        )

    print(f"\nTraining complete. Best model saved to {OUTPUT_PATH}")

    model.load_state_dict(torch.load(OUTPUT_PATH, map_location=DEVICE, weights_only=True))
    model.eval()
    dummy = torch.randn(1, WINDOW_SIZE, FEATURE_DIM).to(DEVICE)
    cur, nxt = model(dummy)
    print(f"Model sanity check: current={cur.shape}, next={nxt.shape}")

    # Export to ONNX for lightweight CPU inference
    onnx_path = "attack_forecaster.onnx"
    print(f"\nExporting to ONNX format -> {onnx_path}")
    torch.onnx.export(
        model,
        dummy,
        onnx_path,
        input_names=["input"],
        output_names=["current_stage", "next_stage"],
        dynamic_axes={
            "input": {0: "batch_size"},
            "current_stage": {0: "batch_size"},
            "next_stage": {0: "batch_size"},
        },
        opset_version=17,
    )
    import os
    onnx_size = os.path.getsize(onnx_path) / (1024 * 1024)
    print(f"ONNX model saved: {onnx_size:.2f} MB")
    print(f"\nFiles to copy to ai_engine/models/:")
    print(f"  - {OUTPUT_PATH} (PyTorch weights)")
    print(f"  - {onnx_path} (ONNX for deployment)")


if __name__ == "__main__":
    train()
