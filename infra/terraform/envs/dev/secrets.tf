resource "random_password" "db_owner" {
  length  = 32
  special = false
}

resource "random_password" "db_app" {
  length  = 32
  special = false
}

resource "random_password" "jwt" {
  length  = 64
  special = false
}

locals {
  db_endpoint = "${aws_db_instance.this.address}:${aws_db_instance.this.port}"
  db_name     = aws_db_instance.this.db_name
}

# ---- Setup: master credentials and the passwords for the roles it creates ----

resource "aws_secretsmanager_secret" "db_bootstrap" {
  name                    = "crm/${var.environment}/db-bootstrap"
  description             = "Master credentials and new role passwords for the database setup Job"
  kms_key_id              = aws_kms_key.data.arn
  recovery_window_in_days = var.secret_recovery_window_days
}

resource "aws_secretsmanager_secret_version" "db_bootstrap" {
  secret_id = aws_secretsmanager_secret.db_bootstrap.id
  secret_string = jsonencode({
    MASTER_URL     = "postgres://crm_master:${random_password.db_master.result}@${local.db_endpoint}/${local.db_name}"
    OWNER_PASSWORD = random_password.db_owner.result
    APP_PASSWORD   = random_password.db_app.result
  })
}

# ---- Migrations: the owner role, which may change the schema ----

resource "aws_secretsmanager_secret" "migrate" {
  name                    = "crm/${var.environment}/migrate"
  description             = "Schema owner connection for database migrations"
  kms_key_id              = aws_kms_key.data.arn
  recovery_window_in_days = var.secret_recovery_window_days
}

resource "aws_secretsmanager_secret_version" "migrate" {
  secret_id = aws_secretsmanager_secret.migrate.id
  secret_string = jsonencode({
    MIGRATION_DATABASE_URL = "postgres://crm_owner:${random_password.db_owner.result}@${local.db_endpoint}/${local.db_name}"
  })
}

# ---- API: the restricted app role (RLS applies) and the JWT signing key ----

resource "aws_secretsmanager_secret" "api" {
  name                    = "crm/${var.environment}/api"
  description             = "Runtime secrets for the CRM API"
  kms_key_id              = aws_kms_key.data.arn
  recovery_window_in_days = var.secret_recovery_window_days
}

resource "aws_secretsmanager_secret_version" "api" {
  secret_id = aws_secretsmanager_secret.api.id
  secret_string = jsonencode({
    DATABASE_URL = "postgres://crm_app:${random_password.db_app.result}@${local.db_endpoint}/${local.db_name}"
    JWT_SECRET   = random_password.jwt.result
  })
}