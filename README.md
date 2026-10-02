# ⚡ VolumetricCore | BTC Order Flow + Volume Profile Terminal V1

An institutional-grade, real-time trading terminal designed for Bitcoin Order Flow analytics and Volume Profile execution. Built with high-performance native JavaScript, TradingView Lightweight Charts, and low-latency WebSocket data streaming.

---

## 🚀 Key Features

- **Live Candlestick Chart**: Ultra-responsive chart powered by TradingView Lightweight Charts.
- **Dynamic Volume Profile**:
  - Point of Control (**POC**)
  - Value Area High (**VAH**) & Value Area Low (**VAL**) (70% standard distribution)
  - High Volume Nodes (**HVN**) & Low Volume Nodes (**LVN**)
- **Order Flow & Tape Telemetry**:
  - Live Bid/Ask aggressive trade delta
  - Cumulative Volume Delta (**CVD**)
  - Delta divergence & absorption identification
- **Live Institutional Feeds**:
  - Real-time feeds from **Delta Exchange India** (BTCUSD Perpetual) & **Binance Futures** (`btcusdt@aggTrade`)
  - Automatic reconnection handling and fallback modes
- **Execution Strategy Engine & Backtester**:
  - VDD (Volume & Delta Divergence) setup monitoring
  - Value area breakout & mean-reversion signals
  - Built-in backtester for statistical edge validation
- **Cloud & Local Ready**:
  - 100% zero-dependency frontend
  - Fast, multi-threaded server launcher for both desktop and cloud hosts (Render, Heroku, etc.)

---

## 📂 Project Structure

```text
├── index.html            # Main terminal application UI
├── styles.css            # Dark institutional-grade theme & UI styles
├── app.js                # Core UI coordinator & event bus
├── chart/
│   ├── tvChart.js        # Lightweight Charts wrapper & drawing layer
│   ├── canvasChart.js    # Canvas-based order flow / profile renderer
│   └── lightweight-charts.standalone.production.js
├── engine/
│   ├── dataFeed.js       # Live WebSocket & REST manager (Delta India + Binance)
│   ├── orderFlow.js      # Footprint, delta, and tick aggregation logic
│   ├── volumeProfile.js  # POC, VAH, VAL distribution calculator
│   ├── strategyEngine.js # Algorithmic signal & condition evaluator
│   └── backtester.js     # Historical strategy backtesting engine
├── start.py              # Multi-threaded server with dynamic port support
├── start.bat             # Windows 1-click launch batch script
├── requirements.txt      # Python environment descriptor for cloud platforms
└── render.yaml           # Automated 1-click deployment blueprint for Render
```

---

## 💻 Running Locally

### Option 1: Windows Batch File
Double-click `start.bat`. Your default browser will launch automatically at `http://localhost:8080`.

### Option 2: Python Command Line
Ensure you have Python 3 installed, then run:

```bash
python start.py
```

Open your browser and navigate to:
```
http://localhost:8080
```

---

## 🌐 Deploying to Render (render.com)

This repository includes [`render.yaml`](render.yaml) and [`requirements.txt`](requirements.txt) pre-configured for seamless cloud deployment.

### Method 1: Using Render Blueprint (Automatic)
1. Push this repository to GitHub or GitLab.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** > **Blueprint**.
3. Select your repository. Render will automatically read `render.yaml` and configure the service.
4. Click **Apply**.

### Method 2: Manual Web Service Setup
1. In Render Dashboard, click **New +** > **Web Service**.
2. Connect your repository.
3. Configure the following settings:
   - **Environment / Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python start.py`
   - **Plan**: `Free`
4. Click **Deploy Web Service**.

> **Note**: `start.py` automatically binds to Render's dynamic `$PORT` (`10000`) and suppresses browser popup commands in headless cloud environments.

---

## ⚙️ Configuration & Customization

- **Timeframes**: Select between `1m`, `5m`, and `15m` directly from the terminal header.
- **Audio Alerts & Execution Modes**: Toggle audio chime cues and layout presets in the terminal control panel.
- **Port Override**: Set the `PORT` environment variable before running `start.py` to bind to a custom port:
  ```bash
  PORT=9000 python start.py
  ```

---

## 🛡️ License
MIT License. Created for institutional research and quantitative order flow analysis.
