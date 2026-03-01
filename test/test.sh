#!/bin/bash
# ---------------------------------------------------------------------------
# Run HTTP/SSE tests — starts the server, runs tests, always kills the server
# ---------------------------------------------------------------------------

# Kill any existing process on port 3000
kill $(lsof -t -i:3000) 2>/dev/null

# Start server in background and capture PID
PORT=3000 MCP_TRANSPORT=sse node dist/index.js &
SERVER_PID=$!

echo "Server started with PID $SERVER_PID"

# Run tests
node test/test.http.js
TEST_EXIT=$?

# Always kill the server
echo "Stopping server (PID $SERVER_PID)..."
kill -- -$SERVER_PID 2>/dev/null || kill -9 $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo "Server stopped."
exit $TEST_EXIT
