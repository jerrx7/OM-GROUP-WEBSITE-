#!/bin/bash
# renders the road-works motion loops (mp4) into _review/wmm3d/anim/. usage: bash scripts/wmm3d/render-anim.sh [stage ...]   (about 8 minutes each on one OptiX GPU)
cd "$(dirname "$0")/../.."
for s in ${@:-med0 med1 roll spread transport check edge thin0 thin1 thick0 thick1}; do
  ANIM=1 STAGE=$s FRAMES=${FRAMES:-60} SAMPLES=${SAMPLES:-24} W=${W:-1200} "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup -P scripts/wmm3d/build-road.py -- "$PWD" 2>&1 | grep -E "wmm3d\] wrote|Traceback|Error:"
done
echo ANIMDONE
