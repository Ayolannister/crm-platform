resource "aws_eks_cluster" "this" {
  name     = local.cluster_name
  version  = var.cluster_version
  role_arn = aws_iam_role.eks_cluster.arn

  vpc_config {
    subnet_ids              = concat(module.network.private_subnet_ids, module.network.public_subnet_ids)
    endpoint_private_access = true
    endpoint_public_access  = false
  }

  access_config {
    authentication_mode                         = "API_AND_CONFIG_MAP"
    bootstrap_cluster_creator_admin_permissions = true
  }

  encryption_config {
    resources = ["secrets"]

    provider {
      key_arn = aws_kms_key.eks.arn
    }
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator"]

  lifecycle {
    # EKS cannot remove Secrets encryption once it is enabled, so the only possible
    # change here is re-adding it. Floci does not implement AssociateEncryptionConfig
    # and can drop encryptionConfig from DescribeCluster after a restart, which would
    # otherwise make every plan try (and fail) to re-associate it.
    ignore_changes = [encryption_config, enabled_cluster_log_types, ]
  }

  # The role must have its policy before EKS uses it, and must keep it until the cluster is gone.
  depends_on = [aws_iam_role_policy_attachment.eks_cluster]
}

resource "aws_eks_node_group" "default" {
  cluster_name    = aws_eks_cluster.this.name
  node_group_name = "default"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = module.network.private_subnet_ids
  instance_types  = var.node_instance_types
  capacity_type   = "ON_DEMAND"

  scaling_config {
    desired_size = var.node_desired_size
    min_size     = var.node_min_size
    max_size     = var.node_max_size
  }

  update_config {
    max_unavailable = 1
  }

  labels = {
    role = "general"
  }

  depends_on = [aws_iam_role_policy_attachment.eks_node]
}