terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region            = var.region
  s3_use_path_style = var.s3_use_path_style

  default_tags {
    tags = {
      Project   = "crm-platform"
      ManagedBy = "terraform"
      Component = "tfstate"
    }
  }
}

variable "region" {
  description = "AWS region for the state backend."
  type        = string
  default     = "us-east-1"
}

variable "s3_use_path_style" {
  description = "Use path-style S3 URLs. Needed for local emulators; false on real AWS."
  type        = bool
  default     = false
}

variable "state_bucket_name" {
  description = "Globally unique name of the bucket that stores Terraform state."
  type        = string
}

variable "lock_table_name" {
  description = "Name of the DynamoDB table used for state locking."
  type        = string
}

# One customer-managed key encrypts both the state and the lock table.
resource "aws_kms_key" "state" {
  description             = "Encrypts Terraform state for crm-platform"
  enable_key_rotation     = true
  deletion_window_in_days = 7
}

resource "aws_kms_alias" "state" {
  name          = "alias/crm-platform-tfstate"
  target_key_id = aws_kms_key.state.key_id
}

resource "aws_s3_bucket" "state" {
  bucket = var.state_bucket_name

  # Losing this bucket means Terraform forgets everything it manages.
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.state.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "lock" {
  name         = var.lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.state.arn
  }

  point_in_time_recovery {
    enabled = true
  }
}

output "state_bucket" {
  value = aws_s3_bucket.state.id
}

output "lock_table" {
  value = aws_dynamodb_table.lock.name
}

output "kms_key_arn" {
  value = aws_kms_key.state.arn
}