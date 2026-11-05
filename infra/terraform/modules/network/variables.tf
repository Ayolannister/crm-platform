variable "name" {
  description = "Prefix for resource names, e.g. crm-dev."
  type        = string
}

variable "cidr" {
  description = "CIDR block for the VPC."
  type        = string
}

variable "azs" {
  description = "Availability Zones to spread subnets across."
  type        = list(string)
}

variable "public_subnet_cidrs" {
  description = "One public subnet CIDR per AZ, in the same order as azs."
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "One private subnet CIDR per AZ, in the same order as azs."
  type        = list(string)
}

variable "cluster_name" {
  description = "EKS cluster name, used to tag subnets for Kubernetes load balancer discovery."
  type        = string
}

variable "enable_nat_gateway" {
  description = "Create a NAT gateway so private subnets can reach the internet. Costs money on real AWS."
  type        = bool
  default     = true
}