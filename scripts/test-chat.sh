#!/usr/bin/env bash
# Simple test helper for the /api/chat endpoint
# Usage: ./scripts/test-chat.sh "Hello Swasthai" [API_BASE] [USER_ID]

MSG=${1:-"Hello Swasthai"}
API_BASE=${2:-"http://localhost:3000"}
USER_ID=${3:-"dev_test_user_$(date +%s)"}

echo "Sending message to $API_BASE/api/chat as $USER_ID"

curl -sSf -X POST "$API_BASE/api/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_ID" \
  -d "{ \"message\": \"$MSG\" }" | jq .
