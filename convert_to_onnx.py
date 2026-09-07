import torch
import os
from ai_engine.model import AttackForecasterLSTM

model = AttackForecasterLSTM()
state = torch.load("ai_engine/models/attack_forecaster.pth", map_location="cpu", weights_only=True)
model.load_state_dict(state)
model.eval()

dummy = torch.randn(1, 30, 12)
onnx_path = "ai_engine/models/attack_forecaster.onnx"

torch.onnx.export(
    model, dummy, onnx_path,
    input_names=["input"],
    output_names=["current_stage", "next_stage"],
    dynamic_axes={
        "input": {0: "batch_size"},
        "current_stage": {0: "batch_size"},
        "next_stage": {0: "batch_size"},
    },
    opset_version=14,
)

size_kb = os.path.getsize(onnx_path) / 1024
print(f"ONNX model saved: {size_kb:.0f} KB")
print("Done. Upload ai_engine/models/attack_forecaster.onnx to your repo.")
