provider "aws" {
  region            = var.region
  s3_use_path_style = var.s3_use_path_style

  default_tags {
    tags = {
      Project     = "crm-platform"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}