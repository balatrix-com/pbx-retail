# Call Barge API Documentation

## Overview

The Call Barge API allows administrators to monitor and interact with active calls in real-time. This API provides three modes: **Barge** (3-way call), **Listen** (silent monitoring), and **Whisper** (coach mode).

---

## Base URL

```
http://your-server-ip:8003
```

---

## Authentication

Currently no authentication required (add JWT/API keys in production).

---

## Endpoints

### 1. GET `/` - API Information

Returns API details and usage instructions.

**Response:**
```json
{
  "service": "FreeSWITCH Barge API",
  "version": "1.0.0",
  "description": "Standalone barge API - no database required",
  "endpoints": {
    "POST /barge": "Initiate barge operation (barge/listen/whisper)",
    "GET /health": "Health check"
  }
}
```

### 2. GET `/health` - Health Check

Check if the API is running.

**Response:**
```json
{
  "status": "healthy",
  "service": "barge_api",
  "kamailio_host": "localhost"
}
```

### 3. POST `/barge` - Initiate Barge Operation ⭐

Main endpoint to start monitoring/coaching calls.

**Request Body:**
```json
{
  "uuid_in": "a1b2c3d4-1234-5678-90ab-cdef12345678",
  "uuid_out": "b2c3d4e5-5678-90ab-cdef-123456789012",
  "admin_extension": "100601",
  "mode": "whisper"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uuid_in` | String | ✅ Yes | Inbound UUID (A-leg, caller side) - from Redis `uuid` field |
| `uuid_out` | String | ✅ Yes | Outbound UUID (B-leg, agent side) - from Redis `b_uuid` field |
| `admin_extension` | String | ✅ Yes | Admin's extension number (e.g., "100601") |
| `mode` | String | ✅ Yes | One of: `barge`, `listen`, or `whisper` |

**Modes Explained:**

| Mode | Description | Who Can Hear Admin | Admin Can Hear | Use Case |
|------|-------------|-------------------|----------------|----------|
| **barge** | Full 3-way call | Caller + Agent | Caller + Agent | Join conversation, resolve issues |
| **listen** | Silent monitoring | Nobody | Caller + Agent | Quality assurance, training |
| **whisper** | Coach mode | Agent only | Caller + Agent | Coach agent during call |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully initiated whisper mode",
  "call_uuid": "a1b2c3d4-1234-5678-90ab-cdef12345678",
  "target_uuid": "b2c3d4e5-5678-90ab-cdef-123456789012",
  "mode": "whisper",
  "admin_endpoint": "sofia/internal/100601@localhost",
  "esl_response": "+OK"
}
```

**Error Response (400 - Invalid Mode):**
```json
{
  "detail": "Invalid mode 'invalid'. Must be one of: barge, listen, whisper"
}
```

**Error Response (500 - ESL Failure):**
```json
{
  "detail": "Failed to execute barge command: Connection refused"
}
```

---

## Integration Guide

### Node.js/Express Backend Example

```javascript
const axios = require('axios');

const BARGE_API_URL = 'http://your-server-ip:8003';

async function initiateBarge(callData, adminExtension, mode) {
  try {
    const response = await axios.post(`${BARGE_API_URL}/barge`, {
      uuid_in: callData.uuid,        // From Redis
      uuid_out: callData.b_uuid,     // From Redis
      admin_extension: adminExtension,
      mode: mode  // 'barge', 'listen', or 'whisper'
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Barge API error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.detail || 'Failed to initiate barge'
    };
  }
}

// Express endpoint
app.post('/api/calls/barge', async (req, res) => {
  const { uuid, bUuid, adminExtension, mode } = req.body;
  
  const result = await initiateBarge(
    { uuid, b_uuid: bUuid },
    adminExtension,
    mode
  );
  
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(500).json({ error: result.error });
  }
});
```

### React Component Example

```jsx
import { useState } from 'react';
import axios from 'axios';

function CallBargeControls({ call, adminExtension }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleBarge = async (mode) => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await axios.post('/api/calls/barge', {
        uuid: call.uuid,
        bUuid: call.bUuid,
        adminExtension: adminExtension,
        mode: mode
      });
      
      setMessage(`✓ ${mode} mode activated successfully`);
      console.log('Barge response:', response.data);
      
    } catch (error) {
      setMessage(`✗ Failed: ${error.response?.data?.error || error.message}`);
      console.error('Barge error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="barge-controls">
      <h3>Call Monitoring</h3>
      <div className="call-info">
        <p><strong>Caller:</strong> {call.caller}</p>
        <p><strong>Agent:</strong> Extension {call.destValue}</p>
        <p><strong>Status:</strong> {call.status}</p>
      </div>
      
      <div className="barge-buttons">
        <button 
          onClick={() => handleBarge('listen')}
          disabled={loading}
          className="btn-listen"
        >
          👂 Listen (Silent)
        </button>
        
        <button 
          onClick={() => handleBarge('whisper')}
          disabled={loading}
          className="btn-whisper"
        >
          💬 Whisper (Coach Agent)
        </button>
        
        <button 
          onClick={() => handleBarge('barge')}
          disabled={loading}
          className="btn-barge"
        >
          📞 Barge (Join Call)
        </button>
      </div>
      
      {message && (
        <div className={`message ${message.includes('✓') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  );
}

export default CallBargeControls;
```

### Python Example

```python
import requests

BARGE_API_URL = 'http://your-server-ip:8003'

def initiate_barge(uuid_in, uuid_out, admin_extension, mode):
    """
    Initiate barge operation on a call
    
    Args:
        uuid_in: Inbound UUID (A-leg)
        uuid_out: Outbound UUID (B-leg)
        admin_extension: Admin's extension number
        mode: 'barge', 'listen', or 'whisper'
    
    Returns:
        dict: Response from API
    """
    try:
        response = requests.post(
            f'{BARGE_API_URL}/barge',
            json={
                'uuid_in': uuid_in,
                'uuid_out': uuid_out,
                'admin_extension': admin_extension,
                'mode': mode
            },
            timeout=5
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return {'success': False, 'error': str(e)}

# Usage
result = initiate_barge(
    uuid_in='a1b2c3d4-1234-5678-90ab-cdef12345678',
    uuid_out='b2c3d4e5-5678-90ab-cdef-123456789012',
    admin_extension='100601',
    mode='whisper'
)

if result.get('success'):
    print(f"Barge successful: {result['message']}")
else:
    print(f"Barge failed: {result.get('error')}")
```

---

## Getting UUIDs from Redis

To use the barge API, you need both `uuid` (A-leg) and `b_uuid` (B-leg) from the Redis call data:

```javascript
// Node.js: Get call data from Redis
const redis = require('redis');
const client = redis.createClient({
  host: 'localhost',
  port: 6379,
  password: 'OnidaMaruti1)'
});

async function getCallForBarge(customerId, uuid) {
  const key = `customer:${customerId}:call:${uuid}`;
  const callData = await client.hGetAll(key);
  
  return {
    uuid: callData.uuid,           // A-leg (inbound)
    bUuid: callData.b_uuid,        // B-leg (outbound to agent)
    caller: callData.caller,
    status: callData.call_status,
    destValue: callData.dest_value
  };
}

// Usage
const call = await getCallForBarge(customerId, callUuid);

// Now use for barge
await initiateBarge(call, adminExtension, 'whisper');
```

---

## Complete Flow Diagram

```
┌─────────────┐
│  Frontend   │
│  (React)    │
└──────┬──────┘
       │ 1. User clicks "Whisper" button
       │
       ▼
┌─────────────────────┐
│  Backend API        │
│  (Node.js/Express)  │
└──────┬──────────────┘
       │ 2. Get uuid + b_uuid from Redis
       │
       ▼
┌─────────────────────┐
│  Redis              │
│  localhost:6379     │
└──────┬──────────────┘
       │ 3. Returns call data with both UUIDs
       │
       ▼
┌─────────────────────┐
│  Backend API        │
│  (Node.js/Express)  │
└──────┬──────────────┘
       │ 4. POST to Barge API
       │
       ▼
┌─────────────────────┐
│  Barge API          │
│  Port 8003          │
└──────┬──────────────┘
       │ 5. Sends ESL command
       │
       ▼
┌─────────────────────┐
│  FreeSWITCH ESL     │
│  localhost:8021 │
└──────┬──────────────┘
       │ 6. Executes eavesdrop command
       │
       ▼
┌─────────────────────┐
│  Admin's Phone      │
│  Rings & Connects   │
└─────────────────────┘
```

---

## Error Handling

### Common Errors:

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid mode` | Wrong mode parameter | Use 'barge', 'listen', or 'whisper' |
| `Connection refused` | Barge API not running | Start API: `python api_calls.py` |
| `Failed to execute` | ESL connection issue | Check FreeSWITCH is running |
| `UUID not found` | Call already ended | Check call is still active |
| `Extension not registered` | Admin not logged in | Admin must register SIP extension |

---

## Testing

### Using cURL:

```bash
# Test API health
curl http://your-server-ip:8003/health

# Initiate whisper mode
curl -X POST http://your-server-ip:8003/barge \
  -H "Content-Type: application/json" \
  -d '{
    "uuid_in": "a1b2c3d4-1234-5678-90ab-cdef12345678",
    "uuid_out": "b2c3d4e5-5678-90ab-cdef-123456789012",
    "admin_extension": "100601",
    "mode": "whisper"
  }'
```

### Using Postman:

1. **Method**: POST
2. **URL**: `http://your-server-ip:8003/barge`
3. **Headers**: `Content-Type: application/json`
4. **Body** (raw JSON):
```json
{
  "uuid_in": "a1b2c3d4-1234-5678-90ab-cdef12345678",
  "uuid_out": "b2c3d4e5-5678-90ab-cdef-123456789012",
  "admin_extension": "100601",
  "mode": "whisper"
}
```

---

## Running the API

### Start the Barge API:

```bash
cd D:\PBX1\ESL
python api_calls.py
```

**Output:**
```
🚀 API Server starting on port 8003
📡 Kamailio host: localhost
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8003
```

### Environment Variables (Optional):

```bash
# Windows PowerShell
$env:API_PORT="8003"
$env:KAMAILIO_HOST="localhost"
python api_calls.py

# Linux
export API_PORT=8003
export KAMAILIO_HOST=localhost
python api_calls.py
```

---

## Security Recommendations

1. **Add Authentication**: Implement JWT tokens or API keys
2. **Validate Admin Extension**: Check if user is authorized to barge
3. **Rate Limiting**: Prevent API abuse
4. **HTTPS**: Use SSL/TLS in production
5. **CORS**: Restrict to your frontend domain only

```javascript
// Example: Add API key authentication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],  # Specific domain
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)
```

---

## FAQ

**Q: Can I barge multiple calls simultaneously?**  
A: Yes, each barge operation is independent. Admin can barge call A, then barge call B.

**Q: What happens if admin hangs up?**  
A: Only the admin disconnects. Original call (caller ↔ agent) continues normally.

**Q: Can multiple admins barge the same call?**  
A: Yes, multiple admins can monitor/coach the same call simultaneously.

**Q: Does barge work with external calls?**  
A: Yes, as long as you have both UUIDs (uuid_in and uuid_out).

**Q: How do I know if barge was successful?**  
A: Check the response `success: true` and the admin's phone will ring.

---

## Support

For issues or questions, contact your backend development team.

**API Server**: Port 8003  
**FreeSWITCH ESL**: localhost:8021  
**Kamailio**: localhost
