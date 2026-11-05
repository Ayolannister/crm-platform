locals {
  oidc_issuer = aws_eks_cluster.this.identity[0].oidc[0].issuer
  oidc_host   = replace(local.oidc_issuer, "https://", "")
}

# Registers the cluster's token issuer with IAM, so STS can trust tokens it signs.
resource "aws_iam_openid_connect_provider" "eks" {
  url            = local.oidc_issuer
  client_id_list = ["sts.amazonaws.com"]
}

# Only the crm-secrets-reader service account in the crm namespace may assume this role.
data "aws_iam_policy_document" "external_secrets_assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.eks.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:sub"
      values   = ["system:serviceaccount:crm:crm-secrets-reader"]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "external_secrets" {
  name               = "${local.name}-external-secrets"
  assume_role_policy = data.aws_iam_policy_document.external_secrets_assume.json
}

# Read exactly the three CRM secrets, and decrypt them. Nothing else.
data "aws_iam_policy_document" "external_secrets" {
  statement {
    sid     = "ReadCrmSecrets"
    actions = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
    resources = [
      aws_secretsmanager_secret.api.arn,
      aws_secretsmanager_secret.migrate.arn,
      aws_secretsmanager_secret.db_bootstrap.arn,
    ]
  }

  statement {
    sid       = "DecryptWithDataKey"
    actions   = ["kms:Decrypt"]
    resources = [aws_kms_key.data.arn]
  }
}

resource "aws_iam_role_policy" "external_secrets" {
  name   = "read-crm-secrets"
  role   = aws_iam_role.external_secrets.id
  policy = data.aws_iam_policy_document.external_secrets.json
}