# Envelope-encrypts Kubernetes Secrets stored in the cluster's etcd.
resource "aws_kms_key" "eks" {
  description             = "Encrypts Kubernetes Secrets in ${local.cluster_name}"
  enable_key_rotation     = true
  deletion_window_in_days = 7
}

resource "aws_kms_alias" "eks" {
  name          = "alias/${local.cluster_name}-eks"
  target_key_id = aws_kms_key.eks.key_id
}