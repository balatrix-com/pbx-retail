
#!/bin/bash
API="http://localhost:3000"
IDEM_KEY=$(uuidgen)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmOWFmOTU3OS0zNzBkLTRkMTQtYjRmNC01NDZmNDVjYzI0N2IiLCJlbWFpbCI6InNhbGVzQGV4YW1wbGUuY29tIiwicm9sZSI6IlNBTEVTIiwidGVuYW50SWQiOm51bGwsImlhdCI6MTc3MDgyNTcwNywiZXhwIjoxNzcwODI2NjA3fQ.fFK1Pvf8McklP46PbWu6LIx4XxpxsTfwRvcmKWI9vds"

echo "---------------------------------------------------"
echo "Starting Acceptance Tests for Transactional Integrity"
echo "---------------------------------------------------"

echo ""
echo "1. Testing Concurrent Asset Reservation (Locking)..."
echo "Sending 2 concurrent requests for the same inventory (+18005550201)..."

# Payload for Concurrency (targeting +18005550201)
PAYLOAD_CONCURRENCY='{"customerName":"Test C","customerEmail":"testc@example.com","planId":"plan_seed_123","telecomDetails":{"didCount":1,"selectedTfns":["+18005550201"]}}'

# We fire off two requests in background
# Use & to run in parallel
curl -s -X POST "$API/sales/quotes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD_CONCURRENCY" &

curl -s -X POST "$API/sales/quotes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD_CONCURRENCY" &

wait

echo "Concurrent requests finished. Check logs for locking behavior."

echo ""
echo "2. Testing Idempotency (+18005550202)..."
KEY=$(uuidgen)
# Payload for Idempotency (targeting +18005550202)
PAYLOAD_IDEMPOTENCY='{"customerName":"Test I","customerEmail":"testi@example.com","planId":"plan_seed_123","telecomDetails":{"didCount":1,"selectedTfns":["+18005550202"]}}'

echo "Sending Request A with Key $KEY..."

RESPONSE_A=$(curl -s -X POST "$API/sales/quotes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD_IDEMPOTENCY")

echo "Response A: $RESPONSE_A"

echo "Sending Request B (Retry) with same Key $KEY..."

RESPONSE_B=$(curl -s -X POST "$API/sales/quotes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD_IDEMPOTENCY")

echo "Response B: $RESPONSE_B"

if [ "$RESPONSE_A" == "$RESPONSE_B" ]; then
  echo "SUCCESS: Responses match exactly."
else
  echo "FAILURE: Responses differ."
fi

echo ""
echo "---------------------------------------------------"
echo "Acceptance Tests Completed"
echo "---------------------------------------------------"
