#!/bin/bash
set -e
SRC="/Users/alikemaltopak/Desktop/ev-takim-sitesi/cad-assets/ev-assembly-keyed"
DST="/Users/alikemaltopak/Desktop/ev-takim-sitesi/public/frames/ev-assembly"

count=$(ls "$SRC"/*.png 2>/dev/null | wc -l | tr -d ' ')
echo "keyed frames ready: $count"

if [ "$count" -ne 240 ]; then
  echo "expected 240 frames, found $count -- aborting"
  exit 1
fi

rm -f "$DST"/*.jpg
cp "$SRC"/*.png "$DST"/
echo "swapped. dst now:"
ls "$DST" | wc -l
du -sh "$DST"
