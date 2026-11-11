# CRM Platform — Disaster Recovery Runbook

## 1. Purpose

This runbook documents the procedures for backing up, validating, and recovering the CRM platform's PostgreSQL database and Terraform infrastructure state.

The development environment uses Floci to emulate AWS services, including RDS, S3, and EKS.

**Environment:** Development  
**Kubernetes context:** `floci-crm-dev`  
**Kubernetes namespace:** `crm`  
**Terraform workspace:** `default`

## 2. Recovery Objectives

The following objectives are provisional and must be agreed upon before a production deployment.

| Component | Recovery approach | Current recovery status |
|---|---|---|
| Application source code | Restore from GitHub | Source versioned |
| Container images | Retrieve immutable images from GHCR | Image digest verification tested |
| Kubernetes workloads | Reconcile through Argo CD | GitOps reconciliation previously tested |
| PostgreSQL | Restore a verified `pg_dump` backup | Isolated restore tested |
| Terraform state | Retrieve versioned state from S3 | Historical version retrieval tested |
| Application secrets | Recover from an authorized secrets backup or secure secret store | Complete recovery not tested |

Recovery Time Objective (RTO) and Recovery Point Objective (RPO) have not yet been formally established.

## 3. PostgreSQL Backup

**Database:** `crm`  
**Database administrator:** `crm_master`  
**PostgreSQL major version:** 17

The active development database runs in a Floci-managed PostgreSQL container backed by a named Docker volume.

A logical backup was created using PostgreSQL's custom archive format.

Backup location:

`~/crm-backups/postgres/`

Backup files contain database schema and application data and must not be committed to Git.

A backup must be checked for archive readability and accompanied by a SHA256 checksum.

## 4. PostgreSQL Recovery

Recovery must first be tested against an isolated PostgreSQL instance.

Procedure:

1. Select a known-good backup.
2. Validate its SHA256 checksum.
3. Start an isolated PostgreSQL 17 container.
4. Create a new recovery database.
5. Restore the archive using `pg_restore`.
6. Verify the expected tables, indexes, constraints, and row-level security policies.
7. Compare restored data against the available source or backup-time evidence.
8. Record the recovery results.
9. Remove the temporary recovery environment after successful verification.

**Never restore over the active CRM database without an approved recovery plan.**

### Verified recovery test — November 11, 2026

The CRM database was restored into an isolated PostgreSQL 17 container.

| Table | Source records | Restored records |
|---|---:|---:|
| contacts | 2 | 2 |
| memberships | 2 | 2 |
| organizations | 2 | 2 |
| users | 2 | 2 |
| drizzle migrations | 3 | 3 |

All five expected tables were present.

The restore also recreated schema objects, constraints, indexes, and the contacts row-level security policy.

**Result:** Isolated database restore successful.

**Limitation:** Database roles, original ownership, privileges, and application connectivity to the recovered instance were not fully tested.

## 5. Terraform State Backup

**Backend:** S3-compatible Floci storage  
**Bucket:** `crm-platform-tfstate-dev`

State object keys:

- `bootstrap/terraform.tfstate`
- `envs/dev/terraform.tfstate`

Bucket versioning is enabled.

Terraform state may contain sensitive credentials. Backups must have restricted permissions and must never be committed to Git.

### Backup procedure

1. Identify the active backend and workspace.
2. Confirm the current S3 state object version.
3. Download the state object to a restricted backup directory.
4. Validate the JSON structure.
5. Calculate and verify its SHA256 checksum.
6. Record its state serial, Terraform version, and object version ID.
7. Store an encrypted recovery copy outside the source infrastructure's failure domain.

### Verified state recovery test — November 11, 2026

Current development state:

- Terraform version: 1.15.8
- State serial: 28
- Managed resource groups: 40
- S3 object version: `e0511802-ecd0-45b3-a701-11a50c0909ab`

Historical state:

- Terraform version: 1.15.8
- State serial: 27
- Managed resource groups: 37
- S3 object version: `dd1150ee-b79c-481f-9b7d-5c631e3e7d1c`

Both state files passed JSON and checksum validation.

**Result:** Historical Terraform state successfully retrieved and validated.

**Limitation:** Restoring state into an active Terraform backend was deliberately not attempted.

## 6. Infrastructure Recovery Precautions

Before recovering infrastructure:

1. Confirm the incident scope.
2. Protect available database and Terraform state backups.
3. Identify the last known-good infrastructure configuration.
4. Verify the relevant Git commit and Terraform workspace.
5. Review differences between current and historical Terraform state.
6. Determine whether infrastructure resources already exist.
7. Obtain approval before performing state replacement or destructive operations.
8. Perform recovery in an isolated environment wherever possible.

Avoid running `terraform destroy`, `terraform state push`, or an unreviewed `terraform apply` during initial diagnosis.

## 7. Kubernetes Recovery

The CRM API is deployed using Helm and reconciled through Argo CD.

Initial recovery checks:

```bash
kubectl --context floci-crm-dev get nodes

kubectl --context floci-crm-dev get pods -n crm

kubectl --context floci-crm-dev get deployments -n crm

kubectl --context floci-crm-dev get applications -n argocd
```

Once the cluster is accessible, run:

```bash
cd ~/crm-platform

./scripts/verify-aws-dev.sh
```

A successful verification confirms Argo CD synchronization, application health, the expected image digest, and the CRM API health endpoints.

**Limitation:** A complete recreation of the Floci EKS environment has not been tested.

## 8. Current Risks

- Backups are stored on the same Ubuntu machine as the development infrastructure.
- Off-machine encrypted backup restoration has not been tested.
- PostgreSQL roles and privileges require a separate recovery procedure.
- Floci RDS snapshot support has not been established.
- The database backup process is not yet automated.
- Recovery objectives and backup retention policies require formal definition.
- Complete infrastructure recovery has not yet been demonstrated.
- Local monitoring depends on the Ubuntu machine and its systemd user manager remaining available.

## 9. Future Improvements

1. Automate PostgreSQL logical backups.
2. Introduce encrypted off-machine backup storage.
3. Define backup retention and deletion policies.
4. Test restoration using an independently stored backup.
5. Document database role and privilege recovery.
6. Test application connectivity to a restored database.
7. Implement periodic recovery drills.
8. Establish measurable RTO and RPO targets.

## 10. Recovery Principles

A backup is not considered verified solely because a file exists.

Recovery procedures should demonstrate that backup contents are readable, required data can be restored, and the recovered system behaves as expected.

Any destructive recovery operation must be reviewed before execution.
