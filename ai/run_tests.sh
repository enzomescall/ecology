#!/usr/bin/env bash
# Run the AI test suite. Fast tests by default; pass --all for slow ones
# (ISMCTS strength, TS/Python parity, Node integration).
set -uo pipefail
cd "$(dirname "$0")"

PASS=0; FAIL=0
run() {
  echo "=== $1 ==="
  if OMP_NUM_THREADS="${OMP_NUM_THREADS:-3}" python3 "$2"; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
  echo
}

run "smoke (full random games 2-6p)"      tests/test_smoke.py
run "encoding / action-space soundness"   tests/test_encode.py
run "baselines (greedy >> random)"        tests/test_baselines.py

if [[ "${1:-}" == "--all" ]]; then
  run "ISMCTS >= greedy (slow)"           tests/test_ismcts.py
  run "serve CLI all difficulties (slow)" tests/test_serve_cli.py
  echo "=== TS/Python scoring parity (needs server deps) ==="
  if python3 tests/test_parity.py; then PASS=$((PASS+1)); else FAIL=$((FAIL+1)); fi
  echo
  echo "Node integration: run from server/ ->"
  echo "  AI_DIR=../ai node_modules/.bin/tsx ../ai/tests/integration_node.ts"
fi

echo "------------------------------------"
echo "PASSED: $PASS   FAILED: $FAIL"
[[ $FAIL -eq 0 ]]
