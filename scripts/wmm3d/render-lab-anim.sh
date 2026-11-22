#!/bin/bash
# renders the laboratory motion loops (mp4) into _review/wmm3d/anim/. usage: bash scripts/wmm3d/render-lab-anim.sh [scene ...]
cd "$(dirname "$0")/../.."
for s in ${@:-shape impact pi la}; do
  ANIM=1 SCENE=$s FRAMES=${FRAMES:-96} SAMPLES=${SAMPLES:-32} W=${W:-1280} "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup -P scripts/wmm3d/build-lab.py -- "$PWD" 2>&1 | grep -E "\[lab\] wrote|Traceback|Error:"
done
echo LABANIMDONE
