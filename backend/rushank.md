# 🚀 Super Admin Call Monitoring integration (For Rushank)

This cheatsheet explains how to connect the new global Call Monitoring features on the frontend.

---

## 🔑 1. Super Admin Extension
- The Super Admin has a hardcoded monitoring extension **`999001`** (Secret: `SuperSecret123!`).
- This extension is automatically configured on the backend. You do **not** need to prompt the user or save this extension in the frontend state for Super Admin.

---

## 🌐 2. REST API Endpoints

### Get Active Calls (Global)
- **Endpoint:** `GET /api/monitor/active-calls?tenantId=all`
- **Header:** `Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>`
- **Response Format:**
  ```json
  {
    "calls": [
      {
        "uuid": "a8d56ed3-e9d2-46bf-af84-da032912fb2b", // A-Leg (Caller)
        "bUuid": "1d4bf462-7dd8-4699-b1e7-53ad4646febf", // B-Leg (Agent)
        "caller": "+14042327573", // Caller Phone
        "callee": "100101", // Dialed extension/TFN
        "status": "answered", // "new" | "ringing" | "answered"
        "destType": "extension",
        "destValue": "100101",
        "direction": "inbound",
        "startTime": "2026-07-23T18:05:00.000Z",
        "answerTime": "2026-07-23T18:05:02.000Z",
        "duration": 18,
        "tenantId": "5d09f9b9-4313-4ab7-b86c-28bd05fcdf92" // Belongs to this tenant
      }
    ]
  }
  ```

### Start Barge / Listen (Global)
- **Endpoint:** `POST /api/monitor/barge`
- **Header:** `Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>`
- **Payload Schema:**
  ```json
  {
    "uuid_in": "a8d56ed3-e9d2-46bf-af84-da032912fb2b",
    "uuid_out": "1d4bf462-7dd8-4699-b1e7-53ad4646febf",
    "mode": "listen" // For Super Admin, only "listen" is allowed. "whisper" and "barge" will return 400 Bad Request.
  }
  ```
  *(Note: `adminExtension` is **not required** in the payload for Super Admin; the backend defaults it to `999001` automatically).*

---

## 🔌 3. WebSockets (Socket.IO Namespace: `/monitor`)

### Connection & Join
1. Connect to namespace `monitor` with the token:
   `wss://<domain>/api/socket.io/?EIO=4&transport=websocket&token=<SUPER_ADMIN_JWT>`
2. Join the global room:
   ```javascript
   socket.emit('join_room', 'all');
   ```

### Event: `call_update` (Real-Time Streams)
Triggered whenever any call status changes across **any** tenant.
```json
{
  "uuid": "a8d56ed3-e9d2-46bf-af84-da032912fb2b",
  "bUuid": "1d4bf462-7dd8-4699-b1e7-53ad4646febf",
  "caller": "+14042327573",
  "callee": "100101",
  "status": "answered", // "new" | "ringing" | "answered" | "hangup"
  "destType": "extension",
  "destValue": "100101",
  "direction": "inbound",
  "startTime": 1764078165,
  "answerTime": 1764078167,
  "duration": 18,
  "tenantId": "5d09f9b9-4313-4ab7-b86c-28bd05fcdf92"
}
```

### Event: `analytics_snapshot` (Counters)
Aggregated global counters received immediately on connect and then every 30 seconds.
```json
{
  "tenantId": "all",
  "activeCalls": 12,  // System-wide active call count
  "ringing": 3,      // System-wide ringing calls
  "answered": 9,     // System-wide active conversations
  "inbound": 8,
  "outbound": 4,
  "timestamp": 1764078195000
}

---

## 🌐 4. Integrating the Dropdown (Tenant-Wise Selection)

When the Super Admin selects a tenant from the dropdown, you should switch both the REST queries and WebSocket room to target the specific tenant:

### 1. Selected "All Tenants" (Global)
- **REST Request:** `GET /api/monitor/active-calls?tenantId=all`
- **Socket Join:**
  ```javascript
  // Leave previous room if any
  socket.emit('join_room', 'all');
  ```
- **Result:** Receives active calls and WebSocket events for **all** tenants system-wide.

### 2. Selected A Specific Tenant (e.g., "WalterAssociates" with UUID `5d09f9b9-4313-4ab7-b86c-28bd05fcdf92`)
- **REST Request:** `GET /api/monitor/active-calls?tenantId=5d09f9b9-4313-4ab7-b86c-28bd05fcdf92`
- **Socket Join:**
  ```javascript
  // Leave previous room if any
  socket.emit('join_room', '5d09f9b9-4313-4ab7-b86c-28bd05fcdf92');
  ```
- **Result:** Backend will automatically filter calls and WebSocket events to return **only** those belonging to the selected tenant. Super Admin credentials bypass tenant checks so they can safely query any UUID.

```
