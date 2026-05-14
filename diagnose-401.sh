#!/bin/bash

echo "🔍 401 Error Diagnostic Tool"
echo "============================"
echo ""

# Check if server is running
echo "1️⃣ Checking if backend server is running..."
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "   ✅ Server is running on port 3000"
    PID=$(lsof -ti:3000)
    echo "   📍 Process ID: $PID"
    echo "   ⚠️  You need to RESTART this process for code changes to take effect!"
    echo ""
    echo "   To restart:"
    echo "   kill -9 $PID && npm run dev"
else
    echo "   ❌ No server running on port 3000"
    echo "   Start it with: npm run dev"
fi

echo ""
echo "2️⃣ Checking .env file..."
if [ -f ".env" ]; then
    echo "   ✅ .env file exists"
    
    if grep -q "API_BEARER_TOKEN=" .env; then
        echo "   ✅ API_BEARER_TOKEN is defined"
        
        # Check token value
        TOKEN=$(grep "API_BEARER_TOKEN=" .env | cut -d'=' -f2)
        TOKEN_LENGTH=${#TOKEN}
        
        echo "   📏 Token length: $TOKEN_LENGTH characters"
        
        if [ $TOKEN_LENGTH -eq 48 ]; then
            echo "   ✅ Token length is correct (48 characters)"
        else
            echo "   ⚠️  Token length is incorrect (expected 48, got $TOKEN_LENGTH)"
        fi
        
        # Check for expected token
        EXPECTED="eyJhbGciOiJIUIsInRbaDas2344rr308ohagn0wer4XVCJ9."
        if [ "$TOKEN" = "$EXPECTED" ]; then
            echo "   ✅ Token matches expected value"
        else
            echo "   ❌ Token does NOT match expected value"
            echo "   Expected: $EXPECTED"
            echo "   Got:      $TOKEN"
        fi
    else
        echo "   ❌ API_BEARER_TOKEN is NOT defined in .env"
    fi
else
    echo "   ❌ .env file not found!"
fi

echo ""
echo "3️⃣ Checking mobile app configuration..."
MOBILE_APP_PATH="../Xsite/utils/axiosConfig.ts"
if [ -f "$MOBILE_APP_PATH" ]; then
    echo "   ✅ axiosConfig.ts exists"
    
    if grep -q "BEARER_TOKEN = 'eyJhbGciOiJIUIsInRbaDas2344rr308ohagn0wer4XVCJ9.'" "$MOBILE_APP_PATH"; then
        echo "   ✅ Mobile app has correct bearer token"
    else
        echo "   ⚠️  Mobile app bearer token may be incorrect"
    fi
else
    echo "   ⚠️  Cannot find mobile app config file"
fi

echo ""
echo "4️⃣ Checking auth.ts file..."
if [ -f "lib/auth.ts" ]; then
    echo "   ✅ lib/auth.ts exists"
    
    if grep -q "checkValidClient" lib/auth.ts; then
        echo "   ✅ checkValidClient function exists"
    else
        echo "   ❌ checkValidClient function NOT found"
    fi
    
    if grep -q "DEBUG:" lib/auth.ts; then
        echo "   ✅ Debug logging is enabled"
    else
        echo "   ⚠️  Debug logging is NOT enabled"
    fi
else
    echo "   ❌ lib/auth.ts not found!"
fi

echo ""
echo "5️⃣ Checking API endpoints..."
UPDATED_COUNT=$(grep -l "checkValidClient" app/api/**/route.ts 2>/dev/null | wc -l | tr -d ' ')
OLD_COUNT=$(grep -l "withBearerAuth" app/api/**/route.ts 2>/dev/null | wc -l | tr -d ' ')

echo "   📊 Endpoints using checkValidClient: $UPDATED_COUNT"
echo "   📊 Endpoints still using withBearerAuth: $OLD_COUNT"

if [ $OLD_COUNT -eq 0 ]; then
    echo "   ✅ All endpoints have been updated"
else
    echo "   ⚠️  Some endpoints still need updating"
fi

echo ""
echo "============================"
echo "📋 DIAGNOSIS SUMMARY"
echo "============================"

if lsof -ti:3000 > /dev/null 2>&1; then
    echo ""
    echo "🚨 ACTION REQUIRED:"
    echo "   Your server is running but needs to be RESTARTED"
    echo "   to load the updated code."
    echo ""
    echo "   Run these commands:"
    echo "   1. lsof -ti:3000 | xargs kill -9"
    echo "   2. npm run dev"
    echo ""
else
    echo ""
    echo "🚨 ACTION REQUIRED:"
    echo "   Start your backend server:"
    echo "   npm run dev"
    echo ""
fi

echo "After restarting, test with:"
echo "  node test-bearer-auth.js"
echo ""
