import torch
import torch.nn as nn
import math

# MITRE ATT&CK Stages
ATTACK_STAGES = [
    "Reconnaissance",
    "Resource Development",
    "Initial Access",
    "Execution",
    "Persistence",
    "Privilege Escalation",
    "Defense Evasion",
    "Credential Access",
    "Discovery",
    "Lateral Movement",
    "Collection",
    "Command and Control",
    "Exfiltration",
    "Impact",
]

NUM_STAGES = len(ATTACK_STAGES)
FEATURE_DIM = 12  # Flow Duration, Total Packets, Fwd/Bwd Packets, Ports, etc.
WINDOW_SIZE = 30  # Sliding window of 30 time steps


class AttackForecasterLSTM(nn.Module):
    """
    LSTM-based multi-stage attack forecasting model.
    
    Input:  (batch, WINDOW_SIZE, FEATURE_DIM) - sliding window of network flow features
    Output: (batch, NUM_STAGES) - logits for current stage prediction
            (batch, NUM_STAGES) - logits for next stage prediction
    """

    def __init__(
        self,
        feature_dim: int = FEATURE_DIM,
        hidden_dim: int = 128,
        num_layers: int = 2,
        num_classes: int = NUM_STAGES,
        dropout: float = 0.3,
    ):
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
            input_size=hidden_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
            bidirectional=False,
        )

        self.attention = nn.MultiheadAttention(
            embed_dim=hidden_dim, num_heads=4, dropout=dropout, batch_first=True
        )

        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, num_classes),
        )

        self.next_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim // 2, num_classes),
        )

        self._init_weights()

    def _init_weights(self):
        for name, param in self.named_parameters():
            if "weight_ih" in name:
                nn.init.xavier_uniform_(param.data)
            elif "weight_hh" in name:
                nn.init.orthogonal_(param.data)
            elif "bias" in name:
                param.data.fill_(0)
                n = param.size(0)
                param.data[n // 4 : n // 2].fill_(1.0)

    def forward(self, x: torch.Tensor):
        batch_size = x.size(0)

        projected = self.input_proj(x)  # (B, W, H)

        lstm_out, (h_n, c_n) = self.lstm(projected)  # (B, W, H)

        attn_out, _ = self.attention(lstm_out, lstm_out, lstm_out)  # (B, W, H)

        last_hidden = attn_out[:, -1, :]  # (B, H)

        current_stage_logits = self.classifier(last_hidden)  # (B, NUM_STAGES)
        next_stage_logits = self.next_head(last_hidden)  # (B, NUM_STAGES)

        return current_stage_logits, next_stage_logits


if __name__ == "__main__":
    model = AttackForecasterLSTM()
    dummy = torch.randn(4, WINDOW_SIZE, FEATURE_DIM)
    cur, nxt = model(dummy)
    print(f"Current stage logits:  {cur.shape}")
    print(f"Next stage logits:     {nxt.shape}")
    print(f"Total parameters:      {sum(p.numel() for p in model.parameters()):,}")
