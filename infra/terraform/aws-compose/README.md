# AWS Compose Module

Mirror module for app deploy-facing outputs consumed by `.github/workflows/deploy.yml`.

Expected output contract (usually emitted from `platform-ops` and copied into GitHub environment variables):

- `aws_region`
- `deploy_bucket`
- `deploy_instance_id`
- `ecr_web_repository_uri`
- `ssm_app_prefix`

`cv` declares no Terraform resources of its own. The host, deploy bucket, ingress
and observability stack are shared and owned by `platform-ops`; the only
`cv`-specific AWS resource is the `cv-web` ECR repository, created once as part of
`docs/cloud-first-deploy.md`.

Unlike `gpool` and `kini`, there is no `ecr_api_repository_uri` — `cv` ships a
single web image.

`ssm_app_prefix` is still required: the container reads its secrets from
OpenBao at `kv/cv`, but it needs an `OPENBAO_TOKEN` to do so, and that token is
stored at `${ssm_app_prefix}/OPENBAO_TOKEN` for the host deploy script to
resolve. See `docs/cloud-first-deploy.md`.
