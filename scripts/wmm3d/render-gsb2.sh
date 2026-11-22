#!/bin/bash
# renders the GSB figures with full Blender output logged for the live progress page (scripts/wmm3d/progress.js).
# usage: bash scripts/wmm3d/render-gsb2.sh [scene ...]      scenes: load filter drain drainoff
cd "$(dirname "$0")/../.."
B="C:/Program Files/Blender Foundation/Blender 5.2/blender.exe"
LOG=_review/wmm3d/progress; mkdir -p "$LOG"
for s in ${@:-load filter drain drainoff}; do
  if [ ! -s "_review/wmm3d/lab-gsb-$s-poster.png" ] || [ -n "$REPOSTER" ]; then
    POSTER=1 GSBSCENE=$s SAMPLES=${PSAMPLES:-64} W=${PW:-1800} "$B" -b --factory-startup -P scripts/wmm3d/build-gsb.py -- "$PWD" > "$LOG/$s.poster.log" 2>&1
  else echo "poster for $s already rendered" > "$LOG/$s.poster.log"; echo "[lab] wrote existing poster" >> "$LOG/$s.poster.log"; fi
  ANIM=1 GSBSCENE=$s FRAMES=${FRAMES:-72} SAMPLES=${SAMPLES:-28} W=${W:-1200} "$B" -b --factory-startup -P scripts/wmm3d/build-gsb.py -- "$PWD" > "$LOG/$s.anim.log" 2>&1
done
echo GSBDONE
