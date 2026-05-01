#!/bin/bash
# Hook PreToolUse - bloquea aislamiento David
INPUT=$(cat)

if echo "$INPUT" | grep -qE "(#B01D23|#1e2233|#e8f442|#484f66)"; then
  echo "ABORT: detectado token Streat Lab en repo David. Aislamiento violado." >&2
  exit 1
fi

if echo "$INPUT" | grep -qiE "(escandallo|rushour|uber.eats|glovo|just.eat)"; then
  echo "ABORT: detectada logica Binagre en repo David." >&2
  exit 1
fi

exit 0
