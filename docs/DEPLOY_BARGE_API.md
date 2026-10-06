# Barge API Deployment Guide

## Overview
Deploy the production-ready barge API to your server at `/opt/pbx_app/`.

**Features:**
- 🔐 API Key authentication
- 📁 .env configuration file
- 📝 Log rotation (prevents disk fill)
- ⚡ Optimized for 24/7 operation

---

## Files to Deploy

Upload the entire `barger/` folder from `d:\PBX1\ESL\` to `/opt/pbx_app/`:

```
/opt/pbx_app/
├── barger/                      # Complete package
│   ├── .env                     # Configuration (API key, ports, etc.)
│   ├── api_calls_production.py  # Main API server
│   ├── __init__.py              # Package init
│   ├── config.py                # FreeSWITCH config
│   └── esl_client.py            # ESL client functions
└── requirements_api.txt         # Dependencies
```

---

## 🔐 API Key Security

### Your API Key (in `.env` file)
```
J2vDWrxu9dhJGc9VCxL30mJP2TVvnGI99YVba6FSEyA
```

### How Security Works
| Endpoint | Security | Description |
|----------|----------|-------------|
| `GET /` | Public | API status |
| `GET /health` | Public | Health check |
| `POST /barge` | **API Key Required** | Barge operations |

### Frontend Must Include Header
```
X-API-Key: J2vDWrxu9dhJGc9VCxL30mJP2TVvnGI99YVba6FSEyA
```

---

## Configuration (.env file)

All configuration is in `barger/.env`:

```env
# API Security
BARGE_API_KEY=J2vDWrxu9dhJGc9VCxL30mJP2TVvnGI99YVba6FSEyA

# API Server Settings
API_PORT=8003
LOG_LEVEL=INFO

# FreeSWITCH ESL Settings
FS_HOST=localhost
FS_PORT=8021
FS_PASSWORD=ClueCon

# Kamailio Settings
KAMAILIO_HOST=localhost
```

### Generate New API Key
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```
Then update the `BARGE_API_KEY` in `.env` file.

---

## Step-by-Step Deployment

### 1. Upload Files to Server
```bash
# Upload entire barger folder and requirements file
# Using scp, WinSCP, or FileZilla:
# - barger/ (entire directory with .env)
# - requirements_api.txt

# On server, create directory if needed:
mkdir -p /opt/pbx_app/barger
```

### 2. Install Dependencies
```bash
ssh root@your-server-ip
cd /opt/pbx_app
source venv/bin/activate
pip install -r requirements_api.txt
```

### 3. Verify Files
```bash
ls -la /opt/pbx_app/barger/
# Should show:
# .env
# api_calls_production.py
# __init__.py
# config.py
# esl_client.py
```

### 4. Test Import
```bash
cd /opt/pbx_app
python3 -c "from barger.esl_client import barge_eavesdrop; print('✓ Import successful!')"
```

### 5. Run the API
```bash
# Option 1: Run as module (recommended)
cd /opt/pbx_app
python3 -m barger.api_calls_production

# Option 2: Run directly
cd /opt/pbx_app/barger
python3 api_calls_production.py

# Option 3: Background with tmux
tmux new -s barge_api
cd /opt/pbx_app && python3 -m barger.api_calls_production
# Press Ctrl+B then D to detach
```

### 6. Test the API

**Test public endpoints:**
```bash
curl http://localhost:8003/
curl http://localhost:8003/health
```

**Test barge WITH API Key (✅ Works):**
```bash
curl -X POST http://localhost:8003/barge \
  -H "Content-Type: application/json" \
  -H "X-API-Key: J2vDWrxu9dhJGc9VCxL30mJP2TVvnGI99YVba6FSEyA" \
  -d '{
    "uuid_in": "a1b2c3d4-1234-5678-90ab-cdef12345678",
    "uuid_out": "b2c3d4e5-5678-90ab-cdef-123456789012",
    "admin_extension": "100601",
    "mode": "whisper"
  }'
```

**Test barge WITHOUT API Key (❌ Blocked):**
```bash
curl -X POST http://localhost:8003/barge \
  -H "Content-Type: application/json" \
  -d '{"uuid_in":"test","uuid_out":"test","admin_extension":"100601","mode":"barge"}'
# Response: {"detail":"Missing API key"}
```

---

## Production Features

### Log Rotation
- **Location:** `barger/barge_api.log`
- **Max Size:** 10 MB per file
- **Backups:** Keeps 5 rotated files
- **No disk fill!**

### Graceful Shutdown
- Handles SIGTERM/SIGINT properly
- Clean shutdown for systemd

### Optimizations
- uvloop for faster async (Linux)
- Minimal memory footprint
- Access logs disabled (custom logging)

---

## Frontend Integration

### JavaScript/React Example
```javascript
const BARGE_API_URL = 'http://your-server:8003';
const API_KEY = 'J2vDWrxu9dhJGc9VCxL30mJP2TVvnGI99YVba6FSEyA';

async function bargeCall(uuid_in, uuid_out, adminExtension, mode) {
  const response = await fetch(`${BARGE_API_URL}/barge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({
      uuid_in,
      uuid_out,
      admin_extension: adminExtension,
      mode  // 'barge', 'listen', or 'whisper'
    })
  });
  
  if (response.status === 401) throw new Error('Missing API key');
  if (response.status === 403) throw new Error('Invalid API key');
  
  return await response.json();
}

// Usage
bargeCall('uuid-in-123', 'uuid-out-456', '100601', 'whisper')
  .then(result => console.log('Success:', result))
  .catch(err => console.error('Failed:', err));
```

### Node.js/Express Example
```javascript
const axios = require('axios');

const BARGE_API = 'http://localhost:8003';
const API_KEY = 'J2vDWrxu9dhJGc9VCxL30mJP2TVvnGI99YVba6FSEyA';

async function initiateWhisper(uuid_in, uuid_out, adminExt) {
  const response = await axios.post(`${BARGE_API}/barge`, {
    uuid_in,
    uuid_out,
    admin_extension: adminExt,
    mode: 'whisper'
  }, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    }
  });
  return response.data;
}
```

---

## Production Deployment with Systemd

```bash
sudo nano /etc/systemd/system/barge-api.service
```

```ini
[Unit]
Description=FreeSWITCH Barge API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/pbx_app
Environment="PATH=/opt/pbx_app/venv/bin"
ExecStart=/opt/pbx_app/venv/bin/python3 -m barger.api_calls_production
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable barge-api
sudo systemctl start barge-api
sudo systemctl status barge-api
```

View logs:
```bash
# Application logs (with rotation)
tail -f /opt/pbx_app/barger/barge_api.log

# Systemd logs
sudo journalctl -u barge-api -f
```

---

## Troubleshooting

### ModuleNotFoundError: No module named 'barger'
```bash
# Run from correct directory:
cd /opt/pbx_app
python3 -m barger.api_calls_production

# Or ensure all files exist:
ls -la /opt/pbx_app/barger/
```

### ERROR: BARGE_API_KEY not set
```bash
# Check .env file exists and has the key:
cat /opt/pbx_app/barger/.env
# Must have: BARGE_API_KEY=your-key-here
```

### 401 Unauthorized
```bash
# Frontend must include header:
# X-API-Key: J2vDWrxu9dhJGc9VCxL30mJP2TVvnGI99YVba6FSEyA
```

### 403 Forbidden
```bash
# API key doesn't match. Check:
grep BARGE_API_KEY /opt/pbx_app/barger/.env
```

### API not accessible from outside
```bash
sudo ufw allow 8003/tcp
```

---

## Quick Reference

```bash
# Start API
cd /opt/pbx_app && python3 -m barger.api_calls_production

# Start with tmux
tmux new -s barge_api -d "cd /opt/pbx_app && python3 -m barger.api_calls_production"

# Check health
curl http://localhost:8003/health

# Test barge
curl -X POST http://localhost:8003/barge \
  -H "Content-Type: application/json" \
  -H "X-API-Key: J2vDWrxu9dhJGc9VCxL30mJP2TVvnGI99YVba6FSEyA" \
  -d '{"uuid_in":"a1b2c3d4-1234-5678-90ab-cdef12345678","uuid_out":"b2c3d4e5-5678-90ab-cdef-123456789012","admin_extension":"100601","mode":"whisper"}'

# View logs
tail -f /opt/pbx_app/barger/barge_api.log

# Restart service
sudo systemctl restart barge-api
```

---

## Files Summary

| Local Path | Server Path |
|------------|-------------|
| `barger/.env` | `/opt/pbx_app/barger/.env` |
| `barger/api_calls_production.py` | `/opt/pbx_app/barger/api_calls_production.py` |
| `barger/__init__.py` | `/opt/pbx_app/barger/__init__.py` |
| `barger/config.py` | `/opt/pbx_app/barger/config.py` |
| `barger/esl_client.py` | `/opt/pbx_app/barger/esl_client.py` |
| `requirements_api.txt` | `/opt/pbx_app/requirements_api.txt` |
