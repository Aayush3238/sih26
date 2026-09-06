"""
colab_train.py - Standalone PyTorch training script for Google Colab GPU
=========================================================================
Copied directly into Colab. No local project dependencies required.
Produces: attack_forecaster.pth (place into ai_engine/models/)

Usage in Colab:
  !python colab_train.py
  # or run each cell interactively
"""

import os
import math
import random
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

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
NUM_SAMPLES = 8000
VAL_RATIO = 0.15
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
OUTPUT_PATH = "attack_forecaster.pth"

ATTACK_STAGES = [
    "Reconnaissance", "Resource Development", "Initial Access", "Execution",
    "Persistence", "Privilege Escalation", "Defense Evasion", "Credential Access",
    "Discovery", "Lateral Movement", "Collection", "Command and Control",
    "Exfiltration", "Impact",
]

# Stage transition probabilities (higher index = later in kill chain)
TRANSITION_PROBS = {
    i: {j: max(0, 0.6 - abs(i - j) * 0.08) for j in range(NUM_STAGES)}
    for i in range(NUM_STAGES)
}
for i in TRANSITION_PROBS:
    total = sum(TRANSITION_PROBS[i].values())
    TRANSITION_PROBS[i] = {k: v / total for k, v in TRANSITION_PROBS[i].items()}


# ============================================================
# 2. MODEL DEFINITION
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
# 3. SYNTHETIC DATASET
# ============================================================
class SyntheticAttackDataset(Dataset):
    """Generates realistic synthetic network flow windows with attack stage labels."""

    def __init__(self, num_samples=NUM_SAMPLES, window_size=WINDOW_SIZE):
        self.num_samples = num_samples
        self.window_size = window_size
        self.samples, self.cur_labels, self.nxt_labels = self._generate()

    def _generate(self):
        samples, cur_labels, nxt_labels = [], [], []
        for _ in range(self.num_samples):
            stage = random.choices(range(NUM_STAGES), weights=[1.5] * 4 + [1.0] * 6 + [0.5] * 4)[0]
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


# ============================================================
# 4. TRAINING LOOP
# ============================================================
def train():
    print(f"Device: {DEVICE}")
    print(f"Generating {NUM_SAMPLES} synthetic samples...")

    full_dataset = SyntheticAttackDataset()
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

        for windows, cur_y, nxt_y in train_loader:
            windows, cur_y, nxt_y = windows.to(DEVICE), cur_y.to(DEVICE), nxt_y.to(DEVICE)
            cur_logits, nxt_logits = model(windows)

            loss = cur_criterion(cur_logits, cur_y) + nxt_criterion(nxt_logits, nxt_y)
            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            train_loss += loss.item() * windows.size(0)
            correct_cur += (cur_logits.argmax(1) == cur_y).sum().item()
            correct_nxt += (nxt_logits.argmax(1) == nxt_y).sum().item()
            total += windows.size(0)

        scheduler.step()
        avg_loss = train_loss / total
        acc_cur = correct_cur / total * 100
        acc_nxt = correct_nxt / total * 100

        model.eval()
        val_loss, v_correct_cur, v_correct_nxt, v_total = 0, 0, 0, 0
        with torch.no_grad():
            for windows, cur_y, nxt_y in val_loader:
                windows, cur_y, nxt_y = windows.to(DEVICE), cur_y.to(DEVICE), nxt_y.to(DEVICE)
                cur_logits, nxt_logits = model(windows)
                loss = cur_criterion(cur_logits, cur_y) + nxt_criterion(nxt_logits, nxt_y)
                val_loss += loss.item() * windows.size(0)
                v_correct_cur += (cur_logits.argmax(1) == cur_y).sum().item()
                v_correct_nxt += (nxt_logits.argmax(1) == nxt_y).sum().item()
                v_total += windows.size(0)

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
    print(f"Copy {OUTPUT_PATH} to ai_engine/models/ in your project directory.")

    model.load_state_dict(torch.load(OUTPUT_PATH, map_location=DEVICE, weights_only=True))
    model.eval()
    dummy = torch.randn(1, WINDOW_SIZE, FEATURE_DIM).to(DEVICE)
    cur, nxt = model(dummy)
    print(f"Model sanity check: current={cur.shape}, next={nxt.shape}")


if __name__ == "__main__":
    train()
