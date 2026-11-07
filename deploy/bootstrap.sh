#!/usr/bin/env bash
# Creates (or updates) a local kind cluster running Argo Workflows, Argo Events
# and a Dagger engine, then applies the CI manifests in deploy/argo.
# Idempotent: safe to re-run after editing manifests.
set -euo pipefail

CLUSTER=dagger-argo
ARGO_WORKFLOWS_VERSION=v4.1.6
ARGO_EVENTS_VERSION=v1.9.11
DAGGER_CHART_VERSION=1.0.0-beta.25

here="$(cd "$(dirname "$0")" && pwd)"

for bin in kind kubectl helm; do
  command -v "$bin" >/dev/null || { echo "missing '$bin' (brew install $bin)" >&2; exit 1; }
done

if ! kind get clusters | grep -qx "$CLUSTER"; then
  kind create cluster --config "$here/kind.yaml"
fi
kubectl config use-context "kind-$CLUSTER" >/dev/null

echo "==> Argo Workflows $ARGO_WORKFLOWS_VERSION"
kubectl create namespace argo --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argo --server-side --force-conflicts \
  -f "https://github.com/argoproj/argo-workflows/releases/download/$ARGO_WORKFLOWS_VERSION/install.yaml"
# Local demo only: plain-HTTP UI without login, exposed on host port 2746 (see kind.yaml).
kubectl -n argo patch deployment argo-server --type=json -p='[
  {"op":"replace","path":"/spec/template/spec/containers/0/args","value":["server","--auth-mode=server","--secure=false"]},
  {"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/scheme","value":"HTTP"}
]'
kubectl -n argo patch service argo-server --type=merge -p='{
  "spec":{"type":"NodePort","ports":[{"name":"web","port":2746,"targetPort":2746,"nodePort":30746}]}
}'

echo "==> Argo Events $ARGO_EVENTS_VERSION"
kubectl create namespace argo-events --dry-run=client -o yaml | kubectl apply -f -
kubectl apply --server-side --force-conflicts \
  -f "https://github.com/argoproj/argo-events/releases/download/$ARGO_EVENTS_VERSION/install.yaml"

echo "==> Dagger engine $DAGGER_CHART_VERSION"
helm upgrade --install dagger oci://registry.dagger.io/dagger-helm \
  --version "$DAGGER_CHART_VERSION" \
  --namespace dagger --create-namespace \
  --values "$here/dagger/values.yaml" \
  --wait --timeout 5m

echo "==> Waiting for controllers"
kubectl -n argo rollout status deployment/workflow-controller --timeout=5m
kubectl -n argo rollout status deployment/argo-server --timeout=5m
kubectl -n argo-events rollout status deployment/controller-manager --timeout=5m

echo "==> CI manifests"
kubectl apply -k "$here/argo"
if ! kubectl -n ci get secret github-webhook-secret >/dev/null 2>&1; then
  secret="${GITHUB_WEBHOOK_SECRET:-$(openssl rand -hex 20)}"
  kubectl -n ci create secret generic github-webhook-secret --from-literal=secret="$secret"
  [ -n "${GITHUB_WEBHOOK_SECRET:-}" ] || echo "Generated GitHub webhook secret (use it in the GitHub webhook): $secret"
fi

cat <<MSG

Ready.
  Argo UI:          http://localhost:2746/workflows/ci
  Manual trigger:   curl -X POST localhost:12001/ci -H 'Content-Type: application/json' \\
                      -d '{"repo":"https://github.com/<owner>/dagger-argo.git","revision":"<sha>"}'
  GitHub webhook:   http://localhost:12000/push (expose via smee, see deploy/README.md)
MSG
