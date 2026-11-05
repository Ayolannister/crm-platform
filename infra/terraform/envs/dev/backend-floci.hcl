bucket                      = "crm-platform-tfstate-dev"
key                         = "envs/dev/terraform.tfstate"
region                      = "us-east-1"
dynamodb_table              = "crm-platform-tf-locks"
encrypt                     = true
use_path_style              = true
skip_credentials_validation = true
skip_requesting_account_id  = true

endpoints = {
  s3       = "http://localhost:4566"
  dynamodb = "http://localhost:4566"
  sts      = "http://localhost:4566"
}