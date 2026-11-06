# Runbook: CrmApiDown

Prometheus cannot scrape any healthy CRM API instance.

## Check

1. `kubectl -n crm get pods -l app.kubernetes.io/component=api`
2. `kubectl -n crm describe pods -l app.kubernetes.io/component=api | tail -n 30`
3. `kubectl -n crm logs -l app.kubernetes.io/component=api --tail=50`
4. `kubectl -n argocd get applications` (a failed sync can block a rollout)

## Common causes

- Image pull failure after a release: roll back with `git revert` of the release PR.
- Crash on start, such as a missing secret: the logs name it.
- Readiness failing because the database is down: check the database pod.
