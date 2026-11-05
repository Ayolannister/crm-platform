# One key for data at rest: RDS storage and the application secrets.
resource "aws_kms_key" "data" {
  description             = "Encrypts RDS storage and application secrets in ${local.name}"
  enable_key_rotation     = true
  deletion_window_in_days = 7
}

resource "aws_kms_alias" "data" {
  name          = "alias/${local.name}-data"
  target_key_id = aws_kms_key.data.key_id
}

# The database lives only in the private subnets.
resource "aws_db_subnet_group" "this" {
  name       = "${local.name}-db"
  subnet_ids = module.network.private_subnet_ids
}

resource "aws_security_group" "db" {
  name        = "${local.name}-db"
  description = "PostgreSQL access from the EKS cluster only"
  vpc_id      = module.network.vpc_id
}

# Only workloads in the EKS cluster's security group may connect.
resource "aws_vpc_security_group_ingress_rule" "db_from_eks" {
  security_group_id            = aws_security_group.db.id
  referenced_security_group_id = aws_eks_cluster.this.vpc_config[0].cluster_security_group_id
  ip_protocol                  = "tcp"
  from_port                    = aws_db_instance.this.port
  to_port                      = aws_db_instance.this.port
  description                  = "PostgreSQL from the EKS cluster"
}

# Letters and digits only, so the passwords are safe inside connection URLs.
resource "random_password" "db_master" {
  length  = 32
  special = false
}

resource "aws_db_instance" "this" {
  identifier     = "${local.name}-postgres"
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 50
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.data.arn

  db_name  = "crm"
  username = "crm_master"
  password = random_password.db_master.result

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false
  multi_az               = var.db_multi_az

  backup_retention_period    = 7
  copy_tags_to_snapshot      = true
  auto_minor_version_upgrade = true
  apply_immediately          = true

  deletion_protection = var.db_deletion_protection
  skip_final_snapshot = !var.db_deletion_protection
}