#!/bin/zsh
# Converts the PNGs from `shoot.ts` into the WebP set the tutorial page serves.
# Needs cwebp (`brew install webp`).
# Run: pnpm tutorial:webp
set -e

HERE="${0:A:h}"
SRC="$HERE/.shots"
DEST="$HERE/../../public/tutorial"

if [[ ! -d "$SRC" ]]; then
  echo "No captures in $SRC — run 'pnpm tutorial:shoot' first." >&2
  exit 1
fi

rm -rf "$DEST"
mkdir -p "$DEST"

for dir in "$SRC"/*(/); do
  name="${dir:t}"
  mkdir -p "$DEST/$name"
  # Phone shots render at ~230px wide on the page, desktop ones at ~800px.
  if [[ "$name" == *mobile ]]; then width=586; else width=1280; fi
  for png in "$dir"/*.png; do
    cwebp -quiet -q 76 -resize $width 0 "$png" -o "$DEST/$name/${png:t:r}.webp"
  done
done

echo "$(find "$DEST" -name '*.webp' | wc -l | tr -d ' ') images — $(du -sh "$DEST" | cut -f1)"
