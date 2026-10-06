# Redis Frontend Integration Guide - React & Node.js

## Overview

This monitoring system stores real-time call data in Redis for easy frontend consumption. Data is organized by customer ID for efficient querying and includes real-time pub/sub updates.

---

## Redis Connection Details

```javascript
// Node.js Connection
const redis = require('redis');

const client = redis.createClient({
  host: 'localhost',
  port: 6379,
  password: 'OnidaMaruti1)',
  db: 0
});

client.on('error', (err) => console.error('Redis Error:', err));
client.on('connect', () => console.log('Connected to Redis'));
```

```python
# Python Connection
import redis

redis_client = redis.Redis(
    host='localhost',
    port=6379,
    password='OnidaMaruti1)',
    db=0,
    decode_responses=True
)
```

---

## Data Structure

### 1. Call Data (Hash)

Each call is stored as a Redis Hash with the following structure:

**Key Pattern:** `customer:{customer_id}:call:{uuid}`

**Example Key:** `customer:5d09f9b9-4313-4ab7-b86c-28bd05fcdf92:call:a8d56ed3-e9d2-46bf-af84-da032912fb2b`

**Fields:**
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `uuid` | String | A-leg (inbound) call unique ID | `a8d56ed3-e9d2-46bf-af84-da032912fb2b` |
| `b_uuid` | String | B-leg (outbound to agent) UUID | `1d4bf462-7dd8-4699-b1e7-53ad4646febf` |
| `caller` | String | Caller phone number | `+14042327573` |
| `callee` | String | Called toll-free number | `8886343114` |
| `customer_id` | String (UUID) | Customer identifier | `5d09f9b9-4313-4ab7-b86c-28bd05fcdf92` |
| `call_status` | String | Current status | `new`, `ringing`, `answered`, `hangup`, `busy`, `declined`, `no_answer`, `failed` |
| `dest_type` | String | Destination type | `extension`, `queue`, `ivr`, `external` |
| `dest_value` | String | Destination value | `100201` (extension number) |
| `direction` | String | Call direction | `inbound` |
| `start_ts` | Integer | Unix timestamp (seconds) | `1764078165` |
| `answer_ts` | Integer | Unix timestamp (seconds) | `1764078167` |
| `hangup_ts` | Integer | Unix timestamp (seconds) | `1764078183` |
| `duration` | Integer | Total call duration (seconds) | `18` |
| `billsec` | Integer | Billable seconds (answer to hangup) | `16` |
| `hangup_cause` | String | FreeSWITCH hangup cause | `NORMAL_CLEARING`, `USER_BUSY`, etc. |

### 2. Active Calls Set

**Key:** `active_calls`

**Type:** Set (SADD/SREM)

Contains UUIDs of all currently active calls (new, ringing, answered status).

### 3. Real-time Stream (Pub/Sub)

**Channel:** `calls_stream`

**Type:** Pub/Sub

Publishes JSON objects with complete call data on every status change.

---

## Frontend Use Cases

### 1. Get All Active Calls for a Customer

**Node.js Example:**

```javascript
async function getCustomerActiveCalls(customerId) {
  const pattern = `customer:${customerId}:call:*`;
  const keys = await client.keys(pattern);
  
  const calls = [];
  for (const key of keys) {
    const callData = await client.hGetAll(key);
    
    // Filter only active calls
    if (['new', 'ringing', 'answered'].includes(callData.call_status)) {
      calls.push({
        uuid: callData.uuid,
        bUuid: callData.b_uuid,
        caller: callData.caller,
        callee: callData.callee,
        status: callData.call_status,
        destType: callData.dest_type,
        destValue: callData.dest_value,
        startTime: new Date(parseInt(callData.start_ts) * 1000),
        answerTime: callData.answer_ts ? new Date(parseInt(callData.answer_ts) * 1000) : null,
        duration: callData.duration ? parseInt(callData.duration) : 0
      });
    }
  }
  
  return calls;
}

// Usage
const customerId = '5d09f9b9-4313-4ab7-b86c-28bd05fcdf92';
const activeCalls = await getCustomerActiveCalls(customerId);
console.log(`Customer has ${activeCalls.length} active calls`);
```

**React Component Example:**

```jsx
import { useState, useEffect } from 'react';

function ActiveCallsPanel({ customerId }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCalls() {
      try {
        const response = await fetch(`/api/calls/active?customerId=${customerId}`);
        const data = await response.json();
        setCalls(data.calls);
      } catch (error) {
        console.error('Error fetching calls:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCalls();
    const interval = setInterval(fetchCalls, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [customerId]);

  if (loading) return <div>Loading calls...</div>;

  return (
    <div className="active-calls">
      <h2>Active Calls ({calls.length})</h2>
      {calls.map(call => (
        <div key={call.uuid} className="call-card">
          <div><strong>From:</strong> {call.caller}</div>
          <div><strong>Status:</strong> {call.status}</div>
          <div><strong>Destination:</strong> {call.destType} - {call.destValue}</div>
          <div><strong>Duration:</strong> {call.duration}s</div>
        </div>
      ))}
    </div>
  );
}
```

### 2. Real-time Updates with Pub/Sub

**Node.js Backend (Socket.io Server):**

```javascript
const io = require('socket.io')(server);
const redis = require('redis');

// Create subscriber client
const subscriber = redis.createClient({
  host: 'localhost',
  port: 6379,
  password: 'OnidaMaruti1)'
});

// Subscribe to call events
subscriber.subscribe('calls_stream');

subscriber.on('message', (channel, message) => {
  try {
    const callData = JSON.parse(message);
    
    // Emit to specific customer room
    io.to(`customer:${callData.customer_id}`).emit('call_update', {
      uuid: callData.uuid,
      caller: callData.caller,
      status: callData.call_status,
      destType: callData.dest_type,
      destValue: callData.dest_value,
      duration: callData.duration || 0
    });
    
    // Also emit to admin dashboard
    io.to('admin').emit('call_update', callData);
    
  } catch (error) {
    console.error('Error processing call update:', error);
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  socket.on('join_customer', (customerId) => {
    socket.join(`customer:${customerId}`);
    console.log(`Socket joined customer room: ${customerId}`);
  });
  
  socket.on('join_admin', () => {
    socket.join('admin');
    console.log('Socket joined admin room');
  });
});
```

**React Component with Real-time Updates:**

```jsx
import { useState, useEffect } from 'react';
import io from 'socket.io-client';

function RealTimeCallMonitor({ customerId }) {
  const [calls, setCalls] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to Socket.io server
    const newSocket = io('http://your-backend-server:3000');
    setSocket(newSocket);

    // Join customer-specific room
    newSocket.emit('join_customer', customerId);

    // Listen for call updates
    newSocket.on('call_update', (callData) => {
      setCalls(prevCalls => {
        const existingIndex = prevCalls.findIndex(c => c.uuid === callData.uuid);
        
        if (existingIndex >= 0) {
          // Update existing call
          const updated = [...prevCalls];
          updated[existingIndex] = callData;
          return updated;
        } else {
          // Add new call
          return [...prevCalls, callData];
        }
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [customerId]);

  return (
    <div className="realtime-monitor">
      <h2>Live Calls - Customer {customerId.substring(0, 8)}...</h2>
      <div className="calls-grid">
        {calls.map(call => (
          <CallCard key={call.uuid} call={call} />
        ))}
      </div>
    </div>
  );
}

function CallCard({ call }) {
  const getStatusColor = (status) => {
    switch(status) {
      case 'new': return 'blue';
      case 'ringing': return 'yellow';
      case 'answered': return 'green';
      case 'hangup': return 'gray';
      default: return 'red';
    }
  };

  return (
    <div className="call-card" style={{ borderColor: getStatusColor(call.status) }}>
      <div className="call-header">
        <span className="status-badge" style={{ backgroundColor: getStatusColor(call.status) }}>
          {call.status}
        </span>
        <span className="call-time">{call.duration}s</span>
      </div>
      <div className="call-body">
        <p><strong>From:</strong> {call.caller}</p>
        <p><strong>To:</strong> {call.destType} {call.destValue}</p>
      </div>
    </div>
  );
}
```

### 3. Get Specific Call Details

**Node.js API Endpoint:**

```javascript
app.get('/api/calls/:uuid', async (req, res) => {
  const { uuid } = req.params;
  const { customerId } = req.query;
  
  try {
    const key = `customer:${customerId}:call:${uuid}`;
    const callData = await client.hGetAll(key);
    
    if (!callData || Object.keys(callData).length === 0) {
      return res.status(404).json({ error: 'Call not found' });
    }
    
    res.json({
      uuid: callData.uuid,
      bUuid: callData.b_uuid,
      caller: callData.caller,
      callee: callData.callee,
      customerId: callData.customer_id,
      status: callData.call_status,
      destType: callData.dest_type,
      destValue: callData.dest_value,
      direction: callData.direction,
      startTime: new Date(parseInt(callData.start_ts) * 1000).toISOString(),
      answerTime: callData.answer_ts ? new Date(parseInt(callData.answer_ts) * 1000).toISOString() : null,
      hangupTime: callData.hangup_ts ? new Date(parseInt(callData.hangup_ts) * 1000).toISOString() : null,
      duration: parseInt(callData.duration) || 0,
      billsec: parseInt(callData.billsec) || 0,
      hangupCause: callData.hangup_cause
    });
  } catch (error) {
    console.error('Error fetching call:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 4. Get Call Statistics

**Node.js Backend:**

```javascript
async function getCustomerCallStats(customerId) {
  const pattern = `customer:${customerId}:call:*`;
  const keys = await client.keys(pattern);
  
  let totalCalls = 0;
  let activeCalls = 0;
  let answeredCalls = 0;
  let totalDuration = 0;
  let totalBillsec = 0;
  
  for (const key of keys) {
    const callData = await client.hGetAll(key);
    totalCalls++;
    
    if (['new', 'ringing', 'answered'].includes(callData.call_status)) {
      activeCalls++;
    }
    
    if (callData.call_status === 'answered' || callData.answer_ts) {
      answeredCalls++;
    }
    
    if (callData.duration) {
      totalDuration += parseInt(callData.duration);
    }
    
    if (callData.billsec) {
      totalBillsec += parseInt(callData.billsec);
    }
  }
  
  return {
    totalCalls,
    activeCalls,
    answeredCalls,
    avgDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
    totalBillsec,
    answerRate: totalCalls > 0 ? ((answeredCalls / totalCalls) * 100).toFixed(1) : 0
  };
}

// Express endpoint
app.get('/api/stats/:customerId', async (req, res) => {
  try {
    const stats = await getCustomerCallStats(req.params.customerId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Complete Node.js Backend Example

```javascript
const express = require('express');
const redis = require('redis');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Redis clients
const client = redis.createClient({
  host: 'localhost',
  port: 6379,
  password: 'OnidaMaruti1)'
});

const subscriber = redis.createClient({
  host: 'localhost',
  port: 6379,
  password: 'OnidaMaruti1)'
});

// Connect to Redis
Promise.all([client.connect(), subscriber.connect()])
  .then(() => console.log('Connected to Redis'))
  .catch(err => console.error('Redis connection error:', err));

// Subscribe to call events
subscriber.subscribe('calls_stream', (message) => {
  try {
    const callData = JSON.parse(message);
    io.to(`customer:${callData.customer_id}`).emit('call_update', callData);
  } catch (error) {
    console.error('Error processing call update:', error);
  }
});

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join_customer', (customerId) => {
    socket.join(`customer:${customerId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// REST API Endpoints
app.get('/api/customers/:customerId/calls/active', async (req, res) => {
  try {
    const { customerId } = req.params;
    const pattern = `customer:${customerId}:call:*`;
    const keys = await client.keys(pattern);
    
    const calls = [];
    for (const key of keys) {
      const callData = await client.hGetAll(key);
      if (['new', 'ringing', 'answered'].includes(callData.call_status)) {
        calls.push(callData);
      }
    }
    
    res.json({ calls });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

---

## Important Notes

### Data Retention
- **Redis**: 24 hours (86400 seconds TTL)
- **PostgreSQL**: Permanent storage in `live_call_events` table

### Call Status Flow
```
new → ringing → answered → hangup
     ↓         ↓         ↓
   busy    declined  no_answer
```

### Security Recommendations

1. **Don't expose Redis directly**: Always use a backend API layer
2. **Validate customer IDs**: Ensure users can only access their own data
3. **Use environment variables**: Store credentials securely
4. **Implement rate limiting**: Prevent API abuse

---

## Testing

```bash
# Test Redis connection
redis-cli -h localhost -p 6379 -a "OnidaMaruti1)"

# Get all customer keys
KEYS customer:*

# Get specific call
HGETALL customer:5d09f9b9-4313-4ab7-b86c-28bd05fcdf92:call:a8d56ed3-e9d2-46bf-af84-da032912fb2b

# Get active calls
SMEMBERS active_calls

# Subscribe to real-time updates
SUBSCRIBE calls_stream
```
