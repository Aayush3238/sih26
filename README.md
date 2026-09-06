# AI-Based Network Attack Forecasting Platform (SIH26153)

A full-stack cybersecurity platform that ingests live network flow telemetry, predicts multi-stage attack progressions using a PyTorch LSTM model (mapped to MITRE ATT&CK stages), displays real-time alerts on a dark-themed SOC dashboard, and triggers automated firewall mitigations.

---

## Architecture

```
┌──────────────┐     WebSocket      ┌──────────────┐     AI Inference     ┌──────────────┐
│   Sniffer    │ ──────────────────▶ │   FastAPI    │ ──────────────────▶  │  LSTM Model  │
│   (Scapy)    │   /ws/telemetry    │   Backend    │   attack_forecaster  │  or Mock     │
└──────────────┘                    └──────┬───────┘                      └──────────────┘
                                           │
                                    ┌──────▼───────┐
                                    │   Next.js    │
                                    │   Dashboard  │
                                    └──────────────┘
```

## Quick Start

### 1. Backend (FastAPI)

```bash
cd sih26153-attack-forecaster
pip install -r requirements.txt

# Start the backend server
python -m backend.main
# or
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend runs at `http://localhost:8000`. API docs at `/docs`.

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

The dashboard runs at `http://localhost:3000`.

### 3. Network Agent (optional, for live packet capture)

```bash
# Requires root/admin for real packet sniffing
python -m agent.sniffer ws://localhost:8000/ws/telemetry
```

Without root, the sniffer falls back to generating mock telemetry automatically.

---

## Training the AI Model (Google Colab)

The system works out-of-the-box with a deterministic mock fallback. To use the real trained LSTM model:

1. **Open Google Colab** and upload `colab_train.py`

2. **Enable GPU**: Runtime → Change runtime type → T4 GPU

3. **Run the training script**:
   ```python
   !python colab_train.py
   ```

4. **Download the trained weights**:
   ```python
   from google.colab import files
   files.download('attack_forecaster.pth')
   ```

5. **Place the file** in `ai_engine/models/attack_forecaster.pth`

6. **Restart the backend** - it will automatically detect and load the model

---

## Project Structure

```
sih26153-attack-forecaster/
├── colab_train.py              # Standalone Colab training script
├── requirements.txt            # Python dependencies
├── agent/
│   ├── sniffer.py              # Packet capture / mock telemetry generator
│   └── mitigation_executor.py  # IPTables firewall enforcement
├── ai_engine/
│   ├── model.py                # PyTorch LSTM model definition
│   ├── inference.py            # Inference engine with mock fallback
│   └── models/                 # Place attack_forecaster.pth here
├── backend/
│   ├── main.py                 # FastAPI app with WebSocket + REST
│   ├── routes.py               # API route handlers
│   └── schemas.py              # Pydantic models
└── frontend/
    ├── app/
    │   ├── page.tsx            # SOC Dashboard main page
    │   ├── layout.tsx          # Root layout
    │   └── globals.css         # Tailwind base styles
    ├── components/
    │   ├── ThreatGauge.tsx     # Animated threat level gauge
    │   ├── KillChainTimeline.tsx  # MITRE ATT&CK stage timeline
    │   ├── NetworkTopology.tsx # Network node status
    │   └── MitigationPanel.tsx # Threat mitigation controls
    ├── lib/
    │   └── websocket.ts        # WebSocket client
    ├── package.json
    ├── tailwind.config.js
    └── tsconfig.json
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `WS` | `/ws/telemetry` | Real-time telemetry streaming |
| `GET` | `/api/threats/history` | Recent threat predictions |
| `POST` | `/api/mitigate` | Trigger firewall rule |
| `GET` | `/api/nodes` | Monitored endpoint status |
| `GET` | `/health` | Service health check |
| `GET` | `/docs` | Swagger API documentation |

## Tech Stack

- **AI/ML**: PyTorch LSTM + Multi-Head Attention
- **Backend**: FastAPI + WebSocket + Pydantic
- **Agent**: Scapy (real) / Mock telemetry
- **Frontend**: Next.js 14 + React + Tailwind CSS
- **Theme**: Dark cybersecurity SOC aesthetic
