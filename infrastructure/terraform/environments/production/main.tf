terraform {
  required_version = ">= 1.8.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.13"
    }
  }
  backend "s3" {
    bucket         = "vaic-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "vaic-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "VAIC"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ─── Variables ────────────────────────────────────────────────
variable "aws_region" {
  default = "us-east-1"
}
variable "environment" {
  default = "production"
}
variable "vpc_cidr" {
  default = "10.0.0.0/16"
}
variable "cluster_name" {
  default = "vaic-production"
}
variable "db_password" {
  sensitive = true
}
variable "agora_app_id" {
  sensitive = true
}

# ─── VPC ─────────────────────────────────────────────────────
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.8"

  name = "vaic-${var.environment}"
  cidr = var.vpc_cidr

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = var.environment != "production"
  enable_dns_hostnames   = true
  enable_dns_support     = true

  # Required tags for EKS
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"                         = "1"
    "kubernetes.io/cluster/${var.cluster_name}"               = "shared"
  }
  public_subnet_tags = {
    "kubernetes.io/role/elb"                                  = "1"
    "kubernetes.io/cluster/${var.cluster_name}"               = "shared"
  }
}

# ─── EKS Cluster ──────────────────────────────────────────────
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.10"

  cluster_name    = var.cluster_name
  cluster_version = "1.30"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets

  cluster_endpoint_public_access = true
  enable_irsa                    = true

  # Node groups
  eks_managed_node_groups = {
    # ── App Nodes (TypeScript/Python services) ──────────────
    app = {
      name           = "app-nodes"
      instance_types = ["m5.2xlarge"]
      min_size       = 3
      max_size       = 10
      desired_size   = 3
      disk_size      = 50

      labels = { workload = "app" }
      taints = []
    }

    # ── GPU Nodes (Whisper ASR + pyannote diarization) ──────
    gpu = {
      name           = "gpu-nodes"
      instance_types = ["g5.xlarge"]
      min_size       = 1
      max_size       = 6
      desired_size   = 2
      disk_size      = 100
      ami_type       = "AL2_x86_64_GPU"

      labels = {
        workload                        = "ml"
        "nvidia.com/gpu"                = "true"
        "k8s.amazonaws.com/accelerator" = "nvidia-tesla-a10g"
      }
      taints = [{
        key    = "nvidia.com/gpu"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }
}

# ─── RDS PostgreSQL 15 (Multi-AZ) ────────────────────────────
module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.6"

  identifier           = "vaic-${var.environment}"
  engine               = "postgres"
  engine_version       = "15.6"
  instance_class       = "db.r6g.xlarge"
  allocated_storage    = 100
  max_allocated_storage = 500

  db_name  = "vaic"
  username = "vaic"
  password = var.db_password
  port     = "5432"

  multi_az               = var.environment == "production"
  db_subnet_group_name   = aws_db_subnet_group.vaic.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  deletion_protection = var.environment == "production"
  skip_final_snapshot = var.environment != "production"

  performance_insights_enabled = true
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
}

resource "aws_db_subnet_group" "vaic" {
  name       = "vaic-${var.environment}"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "rds" {
  name   = "vaic-rds-${var.environment}"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }
}

# ─── ElastiCache Redis 7 (Cluster Mode) ──────────────────────
resource "aws_elasticache_replication_group" "vaic" {
  replication_group_id = "vaic-${var.environment}"
  description          = "VAIC Redis cluster — incident state + context windows"

  node_type            = "cache.r7g.large"
  num_cache_clusters   = var.environment == "production" ? 6 : 2  # 3 shards × 2 replicas in prod
  port                 = 6379

  subnet_group_name    = aws_elasticache_subnet_group.vaic.name
  security_group_ids   = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth.result

  snapshot_retention_limit = 3
  snapshot_window          = "02:00-03:00"

  automatic_failover_enabled = var.environment == "production"
  multi_az_enabled           = var.environment == "production"
}

resource "random_password" "redis_auth" {
  length  = 32
  special = false
}

resource "aws_elasticache_subnet_group" "vaic" {
  name       = "vaic-${var.environment}"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "redis" {
  name   = "vaic-redis-${var.environment}"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }
}

# ─── MSK Kafka 3.5 (3-broker cluster) ────────────────────────
resource "aws_msk_cluster" "vaic" {
  cluster_name           = "vaic-${var.environment}"
  kafka_version          = "3.5.1"
  number_of_broker_nodes = 3

  broker_node_group_info {
    instance_type   = "kafka.m5.2xlarge"
    client_subnets  = module.vpc.private_subnets
    storage_info {
      ebs_storage_info { volume_size = 1000 }
    }
    security_groups = [aws_security_group.msk.id]
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  configuration_info {
    arn      = aws_msk_configuration.vaic.arn
    revision = aws_msk_configuration.vaic.latest_revision
  }
}

resource "aws_msk_configuration" "vaic" {
  name              = "vaic-${var.environment}"
  kafka_versions    = ["3.5.1"]
  server_properties = <<-EOT
    auto.create.topics.enable=false
    delete.topic.enable=true
    log.retention.hours=168
    log.segment.bytes=1073741824
    num.partitions=6
    default.replication.factor=3
    min.insync.replicas=2
    message.max.bytes=10485760
  EOT
}

resource "aws_security_group" "msk" {
  name   = "vaic-msk-${var.environment}"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port       = 9096
    to_port         = 9096
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }
}

# ─── S3 Buckets ───────────────────────────────────────────────
resource "aws_s3_bucket" "audio" {
  bucket = "vaic-audio-${var.environment}"
}

resource "aws_s3_bucket_lifecycle_configuration" "audio" {
  bucket = aws_s3_bucket.audio.id
  rule {
    id     = "expire-raw-audio"
    status = "Enabled"
    filter { prefix = "" }
    expiration { days = 30 }
  }
}

resource "aws_s3_bucket" "reports" {
  bucket = "vaic-reports-${var.environment}"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ─── Secrets Manager ──────────────────────────────────────────
resource "aws_secretsmanager_secret" "vaic" {
  name                    = "vaic/${var.environment}/env"
  recovery_window_in_days = var.environment == "production" ? 30 : 0
}

# ─── ECR Repositories ─────────────────────────────────────────
locals {
  services = [
    "api", "incident-state-manager", "websocket-gateway",
    "audio-ingestion", "tool-integration-gateway", "classification-engine",
    "conflict-detector", "transcription-engine", "voice-synthesis-engine",
    "report-generator", "frontend"
  ]
}

resource "aws_ecr_repository" "services" {
  for_each             = toset(local.services)
  name                 = "vaic/${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "AES256" }
}

resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name
  policy     = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection    = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 10 }
      action       = { type = "expire" }
    }]
  })
}

# ─── Outputs ─────────────────────────────────────────────────
output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}
output "rds_endpoint" {
  value     = module.rds.db_instance_endpoint
  sensitive = true
}
output "redis_endpoint" {
  value     = aws_elasticache_replication_group.vaic.primary_endpoint_address
  sensitive = true
}
output "msk_bootstrap_brokers_tls" {
  value     = aws_msk_cluster.vaic.bootstrap_brokers_tls
  sensitive = true
}
output "ecr_registry" {
  value = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

data "aws_caller_identity" "current" {}
