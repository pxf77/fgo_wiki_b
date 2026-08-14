#!/usr/bin/env bash
set -euo pipefail

: "${SNAPSHOT_DIR:?SNAPSHOT_DIR is required}"
: "${COS_URI:?COS_URI is required, for example cos://bucket/snapshots}"

VERSION=$(node -e "const f=require('${SNAPSHOT_DIR}/metadata.json'); process.stdout.write(f.datasetVersion)")

# Replace `coscmd` with the Tencent Cloud CLI used by the deployment environment.
coscmd upload -rs --skipmd5 "${SNAPSHOT_DIR}/" "${COS_URI}/${VERSION}/"
coscmd upload -r "${SNAPSHOT_DIR}/../latest.json" "${COS_URI}/latest.json"

echo "Published snapshot ${VERSION}"
