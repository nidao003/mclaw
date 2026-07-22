#!/bin/bash
# 并行 OCR 17 张 slide，限并发 4
set -u
mkdir -p /tmp/mclaw_pptx/ocr
max=4
for f in /tmp/mclaw_pptx/slide-*.jpg; do
  name=$(basename "$f" .jpg)
  (
    python3 ~/.claude/skills/ocr/scripts/paddle_ocr.py "$f" \
      --output-dir /tmp/mclaw_pptx/ocr/"$name" \
      > /tmp/mclaw_pptx/ocr/"$name".md \
      2> /tmp/mclaw_pptx/ocr/"$name".err
    printf "%s exit=%d chars=%s\n" "$name" "$?" "$(wc -m < /tmp/mclaw_pptx/ocr/"$name".md | tr -d ' ')"
  ) &
  while [ "$(jobs -p 2>/dev/null | wc -l)" -ge "$max" ]; do sleep 0.5; done
done
wait
echo "=== ALL DONE ==="
