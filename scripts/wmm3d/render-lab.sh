#!/bin/bash
# renders the four laboratory stills at full quality. usage: bash scripts/wmm3d/render-lab.sh [scene ...]
cd "$(dirname "$0")/../.."
for s in ${@:-shape la impact pi}; do
  SCENE=$s SAMPLES=${SAMPLES:-260} W=${W:-2200} "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup -P scripts/wmm3d/build-lab.py -- "$PWD" 2>&1 | grep -E "\[lab\] wrote|Traceback|Error:"
done
echo LABDONE
