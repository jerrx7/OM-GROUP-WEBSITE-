#!/bin/bash
# renders the GSB figures: a poster still and a motion loop for each scene. usage: bash scripts/wmm3d/render-gsb.sh [scene ...]   (scenes: load filter drain drainoff)
cd "$(dirname "$0")/../.."
B="C:/Program Files/Blender Foundation/Blender 5.2/blender.exe"
for s in ${@:-load filter drain drainoff}; do
  POSTER=1 GSBSCENE=$s SAMPLES=${PSAMPLES:-64} W=${PW:-1800} "$B" -b --factory-startup -P scripts/wmm3d/build-gsb.py -- "$PWD" 2>&1 | grep -E "\[lab\] wrote|Traceback|Error:"
  ANIM=1 GSBSCENE=$s FRAMES=${FRAMES:-72} SAMPLES=${SAMPLES:-28} W=${W:-1200} "$B" -b --factory-startup -P scripts/wmm3d/build-gsb.py -- "$PWD" 2>&1 | grep -E "\[lab\] wrote|Traceback|Error:"
done
echo GSBDONE
