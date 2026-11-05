variable "region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type = string
}

variable "s3_use_path_style" {
  type    = bool
  default = false
}

variable "vpc_cidr" {
  type = string
}

variable "azs" {
  type = list(string)
}

variable "public_subnet_cidrs" {
  type = list(string)
}

variable "private_subnet_cidrs" {
  type = list(string)
}

variable "enable_nat_gateway" {
  type    = bool
  default = true
}

variable "cluster_version" {
  description = "Kubernetes version for EKS."
  type        = string
  default     = "1.34"
}

variable "node_instance_types" {
  description = "EC2 instance types for the default node group."
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_desired_size" {
  type    = number
  default = 1
}

variable "node_min_size" {
  type    = number
  default = 1
}

variable "node_max_size" {
  type    = number
  default = 2
}
variable "db_engine_version" {
  description = "PostgreSQL major version for RDS."
  type        = string
  default     = "17"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_multi_az" {
  description = "Standby replica in a second AZ. Doubles cost; use in prod."
  type        = bool
  default     = false
}

variable "db_deletion_protection" {
  description = "Refuse deletion and take a final snapshot. Use in prod."
  type        = bool
  default     = false
}
variable "secret_recovery_window_days" {
  description = "Days a deleted secret can be restored. 0 deletes immediately (dev only)."
  type        = number
  default     = 0
}