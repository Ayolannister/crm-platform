# Runbook: CrmApiErrorBudgetFastBurn / SlowBurn

The share of failed (5xx) user requests is high enough to threaten the 99.5% SLO.

## Check

1. Grafana, dashboard "CRM API": which route is failing, since when?
2. Did a release just go out? `kubectl -n argocd get applications`, then the latest release PR.
3. Is the database reachable? `kubectl -n crm get pods`, then `/health/ready`.

## Act

- Caused by a release: revert the release PR; Argo CD rolls back.
- Caused by a dependency: fix the dependency; the budget recovers on its own.
- Fast burn is a page; slow burn is a ticket for the next working day.
