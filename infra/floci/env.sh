# Source this file to target the local Floci emulator:
#   source infra/floci/env.sh
#
# Credentials live in named profiles in ~/.aws (see infra/floci/README.md).
# This file only selects the profile and the endpoint.
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
export AWS_PROFILE=floci-admin
export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_REGION=us-east-1
export AWS_DEFAULT_REGION=us-east-1
export AWS_PAGER=""
export DOCKER_CONTEXT=default