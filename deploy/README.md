# CI on Argo Events + Argo Workflows

Runs the repo's Dagger checks (`dagger check -l`) on a local [kind](https://kind.sigs.k8s.io/) cluster:

```
GitHub push/PR ─▶ EventSource github ─┐
                                     ├─▶ EventBus ─▶ Sensor ci ─▶ Workflow (from WorkflowTemplate dagger-checks)
curl POST /ci  ─▶ EventSource webhook ┘                              ├─ check(lint)        ┐
                                                                     ├─ check(build)       │ dagger check --check=<name>
                                                                     ├─ check(…)           │ against the node's Dagger engine
                                                                     └─ check(stale)       ┘ (shared pnpm/turbo cache)
```

Each check is its own node in the Argo UI. Checks run in parallel and all of them report, even when one fails.

| Path | What |
| --- | --- |
| `bootstrap.sh` | Creates the cluster and installs Argo Workflows, Argo Events, the Dagger engine (Helm) and `argo/` |
| `kind.yaml` | Cluster + host ports: 2746 Argo UI, 12000 GitHub webhook, 12001 manual webhook |
| `dagger/values.yaml` | Dagger engine DaemonSet; version must match the CLI image in the WorkflowTemplate |
| `argo/workflowtemplate.yaml` | `dagger-checks`: clones `repo@revision`, one DAG node per check |
| `argo/eventsource-*.yaml`, `argo/sensor.yaml` | Triggers |

## Setup

Needs Docker (Colima works; give it ≥ 8 GB RAM), `kind`, `kubectl`, `helm`, and optionally the `argo` CLI:

```sh
brew install kind helm argo
deploy/bootstrap.sh            # re-run any time to apply changes
```

Argo UI: http://localhost:2746/workflows/ci (no login; local only).

Checks run against a git URL the cluster can reach, so the repo has to be pushed somewhere (e.g. GitHub) first.

## Triggering

**Manually** (webhook, port 12001):

```sh
curl -X POST localhost:12001/ci -H 'Content-Type: application/json' \
  -d '{"repo":"https://github.com/jtmthf/dagger-argo.git","revision":"main"}'

# subset of checks
curl -X POST localhost:12001/ci -H 'Content-Type: application/json' \
  -d '{"repo":"https://github.com/jtmthf/dagger-argo.git","revision":"<sha>","checks":["lint","test"]}'
```

**Directly**, without Argo Events:

```sh
argo submit -n ci --from workflowtemplate/dagger-checks \
  -p repo=https://github.com/jtmthf/dagger-argo.git -p revision=main --watch
```

**From GitHub** (push and pull_request, port 12000). GitHub can't reach localhost, so relay through [smee.io](https://smee.io):

1. Open https://smee.io/new and copy the channel URL.
2. `npx smee-client -u <smee url> -t http://localhost:12000/push`
3. In the repo's *Settings → Webhooks*: payload URL = smee URL, content type `application/json`, secret = the value `bootstrap.sh` printed (or `$GITHUB_WEBHOOK_SECRET` you exported before running it), events *Pushes* and *Pull requests*.

Pushes run on `after` SHA (branch deletions are ignored); PRs run on the head SHA for `opened`, `synchronize` and `reopened`. A different repo owner/name goes in `argo/eventsource-github.yaml`.

## Watching

```sh
argo list -n ci
argo watch -n ci @latest
argo logs -n ci @latest --follow
```

## Notes

- The Dagger engine runs as a privileged DaemonSet; workflow steps reach it through the node socket at `/run/dagger-dagger-engine/engine.sock`. Its state lives on the node, so pnpm store and Turborepo cache volumes persist across runs, and identical work across parallel checks is deduplicated.
- Bump the Dagger version in three places together: `dagger/values.yaml`, `argo/workflowtemplate.yaml`, and the `DAGGER_CHART_VERSION` in `bootstrap.sh`.
- Teardown: `kind delete cluster --name dagger-argo`.
