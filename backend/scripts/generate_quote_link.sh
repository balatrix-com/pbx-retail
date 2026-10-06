#!/bin/bash
API="http://localhost:3000"
# Generate specific token dynamically
echo "Generating Sales Token..."
TOKEN=$(npx ts-node -T scripts/generate_token.ts 2>/dev/null | tail -n 1)

# Check if token is valid (basic check)
if [[ $TOKEN != eyJ* ]]; then
  echo "Error generating token: $TOKEN"
  # Fallback to hardcoded dev if script fails (unlikely if dev_secret is used)
  TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmOWFmOTU3OS0zNzBkLTRkMTQtYjRmNC01NDZmNDVjYzI0N2IiLCJlbWFpbCI6InNhbGVzQGV4YW1wbGUuY29tIiwicm9sZSI6IlNBTEVTIiwidGVuYW50SWQiOm51bGwsImlhdCI6MTc3MDgyNTcwNywiZXhwIjoxNzcwODI2NjA3fQ.fFK1Pvf8McklP46PbWu6LIx4XxpxsTfwRvcmKWI9vds"
  echo "Using fallback token..."
fi

echo "---------------------------------------------------"
echo "Generating Quote Link for Manual Frontend Testing"
echo "---------------------------------------------------"

# 1. Reset TFNs to ensure availability
echo "Resetting TFNs..."
npx ts-node scripts/reset_tfns.ts > /dev/null 2>&1

# 2. Create Quote
# Using specific TFN to ensure consistent testing
PAYLOAD='{"customerName":"Manual Test User","customerEmail":"testuser@example.com","planId":"plan_seed_123","telecomDetails":{"didCount":1,"selectedTfns":["+18005550201"]}}'

echo "Creating Quote via API..."
RESPONSE=$(curl -s -X POST "$API/sales/quotes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

# Check for error
if [[ $RESPONSE == *"error"* ]]; then
  echo "Error creating quote: $RESPONSE"
  exit 1
fi

# 3. Extract Token (using node as jq might not be present)
TOKEN=$(node -e "console.log(JSON.parse('$RESPONSE').token)")

if [ -z "$TOKEN" ] || [ "$TOKEN" == "undefined" ]; then
    echo "Failed to extract token from response: $RESPONSE"
    exit 1
fi

# 4. Print Link
ONBOARDING_URL="http://localhost:5173/onboarding/$TOKEN"

echo ""
echo "SUCCESS! Quote Created."
echo "---------------------------------------------------"
echo "Open this URL in your browser to start the Onboarding flow:"
echo ""
echo "  $ONBOARDING_URL"
echo ""
echo "---------------------------------------------------"
echo "Instructions:"
echo "1. Follow the onboarding steps."
echo "2. At the Payment step, use any mock card details or just click Pay (Mock Mode)."
echo "3. After success, you will be redirected to dashboard."
echo "4. Go to 'Subscription & Billing' to see your new Invoice."
echo "---------------------------------------------------"
