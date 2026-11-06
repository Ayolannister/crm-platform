#!/usr/bin/env bash
# Pull chart images on the host, then load them into a cluster node, so slow
# connections don't make the kubelet time out.
# Usage: helm template --skip-tests ... | scripts/preload-images.sh kind|floci
set -euo pipefail

target="${1:?usage: preload-images.sh kind|floci}"
images=$(grep -E '^\s+image:' | awk '{print $2}' | tr -d '"' | sort -u)

case "${target}" in
  kind) node=crm-control-plane ;;
  floci) node=$(docker ps --format '{{.Names}}' | grep -iE 'eks' | head -n 1) ;;
  *) echo "unknown target: ${target}" >&2; exit 1 ;;
esac

for img in ${images}; do
  echo "==> ${img}"
  docker pull --platform linux/amd64 "${img}"
  # Save only this machine's platform: multi-platform archives fail to import
  # when Docker's image store holds just one platform's layers.
  docker save --platform linux/amd64 "${img}" | docker exec -i "${node}" ctr -n k8s.io images import -
done
