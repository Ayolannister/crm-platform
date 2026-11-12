# Metrics Server for Kind

This directory contains a reproducible Metrics Server installation
for the local CRM Kind Kubernetes cluster.

## Version

Metrics Server: v0.9.1

## Installation

From the repository root:

```bash
kubectl apply -k deploy/observability/metrics-server
