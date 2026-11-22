#!/bin/bash
# renders every road-works still at full quality (about 3 minutes each on one OptiX GPU). usage: bash scripts/wmm3d/render-all.sh [stage ...]
cd "$(dirname "$0")/../.."
STAGES="${@:-transport spread roll check thin0 thin1 med0 med1 thick0 thick1 seg0 seg1 edge}"
for s in $STAGES; do
  STAGE=$s SAMPLES=${SAMPLES:-140} W=${W:-2000} "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup -P scripts/wmm3d/build-road.py -- "$PWD" 2>&1 | grep -E "wmm3d\] wrote|Traceback|Error:" 
done
echo ALLDONE
