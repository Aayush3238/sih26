import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from backend.routes import router, ws_telemetry_handler


@asynccontextmanager
async def lifespan(app: FastAPI):
    from ai_engine.inference import get_engine
    get_engine()
    yield


app = FastAPI(
    title="AI Network Attack Forecaster - SIH26153",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await ws_telemetry_handler(websocket)


@app.get("/")
async def root():
    return {
        "service": "AI Network Attack Forecaster",
        "version": "1.0.0",
        "endpoints": {
            "ws": "/ws/telemetry",
            "threats": "/api/threats/history",
            "mitigate": "/api/mitigate",
            "nodes": "/api/nodes",
            "docs": "/docs",
        },
    }


@app.get("/health")
async def health():
    from ai_engine.inference import get_engine
    engine = get_engine()
    return {
        "status": "healthy",
        "model_loaded": not engine.use_mock,
        "mode": "real_model" if not engine.use_mock else "mock_fallback",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
