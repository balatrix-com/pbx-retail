# Testing Guide: Local Verification of Global Call Monitoring

Use this guide to test and verify the Super Admin Global Monitoring features locally.

---

## 🔑 Default Credentials & Setup
The database seed script automatically creates the Super Admin user and registers their extension globally in Kamailio.

1. **Super Admin Account:**
   - **Email:** `superadmin@example.com`
   - **Password:** `SuperAdmin123!`
2. **Super Admin Monitoring Extension:**
   - **Extension:** `999001`
   - **SIP Password:** `SuperSecret123!`
   *(Note: This extension is pre-registered in Kamailio by running the seed command `npx prisma db seed`).*

---

## 🛠️ Step 1: Register SIP Phones
1. **The Agent (Target):**
   - Register a softphone (e.g. MicroSIP) using an extension belonging to any tenant (e.g., `100101`).
2. **The Super Admin (Monitor):**
   - Register a second softphone (or another MicroSIP instance) using extension `999001` (Password: `SuperSecret123!`).

---

## 📞 Step 2: Establish a Live Call
1. Dial the tenant's TFN or Agent extension `100101` to trigger a call.
2. Answer the call on the Agent softphone. This creates an active call record in Redis.

---

## 🔌 Step 3: Test WebSockets in the Browser (Easiest Way)
We have created a lightweight visual testing client: **[test_monitor.html](file:///c:/Main%20balatrix%20Projects/pbx-whitelable/backend/test_monitor.html)**.

1. Open **[test_monitor.html](file:///c:/Main%20balatrix%20Projects/pbx-whitelable/backend/test_monitor.html)** in Google Chrome or Firefox.
2. Login as the Super Admin to get your JWT access token (`POST /api/auth/login`).
3. Paste the JWT token into the text field in the browser.
4. Click **Connect WebSockets**.
5. **Verification:**
   - The status indicator will turn green (**Connected**).
   - You will immediately see system-wide active call counts in the **Global Analytics Snapshot** cards.
   - Any live call status changes (ringing, answer, hangup) will instantly display in the **Live Active Calls Stream** table and socket logs.

---

## 🔒 Step 4: Test REST APIs via Postman/cURL

### 1. Get Active Calls (Global)
Retrieve active calls for all tenants in a single request:
- **Request:** `GET http://localhost:3000/api/monitor/active-calls?tenantId=all`
- **Header:** `Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>`
- **Verification:**
  - Verify that the response returns the active call object.
  - Copy the call's **`uuid`** and **`bUuid`**.

### 2. Trigger Barge / Listen
Have FreeSWITCH bridge the Super Admin into the call. The backend automatically defaults the admin extension to `999001` so you do **not** need to send it in the payload.
- **Request:** `POST http://localhost:3000/api/monitor/barge`
- **Header:** `Authorization: Bearer <SUPER_ADMIN_JWT_TOKEN>`
- **Body:**
  ```json
  {
    "uuid_in": "<PASTE_CALL_UUID>",
    "uuid_out": "<PASTE_CALL_BUUID>",
    "mode": "listen" // For Super Admin, only "listen" is allowed.
  }
  ```
- **Verification:**
  - The Super Admin softphone registered as `999001` will start **ringing**.
  - **Answer the call** on your `999001` softphone.
  - You will instantly hear the audio of the active target call.
