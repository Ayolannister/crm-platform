# Local AWS with Floci

## Start the emulator

1. `docker --context default compose -f infra/floci/compose.yaml up -d`

## One-time profile setup

1. Dummy profile, used only to create the admin identity:
   `aws configure set aws_access_key_id test --profile floci`
   `aws configure set aws_secret_access_key test --profile floci`
   `aws configure set region us-east-1 --profile floci`
   `aws configure set endpoint_url http://localhost:4566 --profile floci`
2. Admin identity:
   `aws iam create-user --user-name crm-admin --profile floci`
   `aws iam attach-user-policy --user-name crm-admin --policy-arn arn:aws:iam::aws:policy/AdministratorAccess --profile floci`
   `KEY_JSON=$(aws iam create-access-key --user-name crm-admin --profile floci)`
   `aws configure set aws_access_key_id "$(echo "${KEY_JSON}" | jq -r .AccessKey.AccessKeyId)" --profile floci-admin`
   `aws configure set aws_secret_access_key "$(echo "${KEY_JSON}" | jq -r .AccessKey.SecretAccessKey)" --profile floci-admin`
   `aws configure set region us-east-1 --profile floci-admin`
   `aws configure set endpoint_url http://localhost:4566 --profile floci-admin`
   `unset KEY_JSON`

## Every terminal

1. `source infra/floci/env.sh`

## Targeting real AWS instead

Use your own AWS profile and do not source `env.sh`. The Terraform code is the same.