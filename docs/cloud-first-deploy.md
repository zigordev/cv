# Cloud First Deploy (cv)

Use this runbook when you are deploying `cv` to AWS from scratch.
Complete `platform-ops/docs/cloud-first-deploy.md` first. `cv` depends on the shared production host, OpenBao, Tolgee, Redpanda, and ingress managed there.
The shared translation promotion model is documented in `platform-ops/docs/cloud-first-deploy.md` under `Translation Promotion Model`.

## 1. What You Are Building

When this runbook is complete, you will have:

- the `cv` web image published to ECR
- a `cv` application deployment running on the shared EC2 host
- runtime secrets stored in OpenBao
- the contact form publishing to the shared platform Kafka broker
- public routing handled by the shared `platform-ops` ingress

Only one image ships. There is no API image and no database to provision.

## 2. Prerequisites

Run every command in this document from the `cv` repo root unless stated otherwise.

Required:

- `platform-ops` production is already deployed
- OpenBao production is initialized, unsealed, and has `kv` v2 enabled
- Tolgee production is reachable, with the `cv` project's languages configured
- the `notifications` service is deployed, with the `cv.contact-received` template released
- AWS CLI with access to the target account
- `jq`
- GitHub access to configure repository environments

## 3. Provision The ECR Repository

`cv` needs one ECR repository. It is the only `cv`-specific AWS resource; the host, deploy bucket and ingress are all shared and owned by `platform-ops`.

```bash
aws ecr create-repository --repository-name cv-web --image-scanning-configuration scanOnPush=true
```

Note the returned `repositoryUri` for `AWS_ECR_WEB_REPOSITORY_URI`.

## 4. Store Production Secrets In OpenBao

At `kv/cv`:

| Key                       | Purpose                                   |
| ------------------------- | ----------------------------------------- |
| `TOLGEE_API_KEY`          | Pulling translation snapshots at boot     |
| `CONTACT_RECIPIENT_EMAIL` | Where contact-form messages are delivered |

The container enforces both at startup through `scripts/openbao-run.mjs` and exits if either is missing, so a misconfigured deploy fails fast rather than serving a broken contact form.

## 5. Configure The GitHub Environment

Create a `production` environment on the repository and set these variables. The values come from `platform-ops` outputs, except the ECR URI from step 3 — the contract is mirrored in `infra/terraform/aws-compose/README.md`.

| Variable                     | Source       |
| ---------------------------- | ------------ |
| `AWS_REGION`                 | platform-ops |
| `AWS_ECR_WEB_REPOSITORY_URI` | step 3       |
| `AWS_DEPLOY_BUCKET`          | platform-ops |
| `AWS_DEPLOY_INSTANCE_ID`     | platform-ops |
| `AWS_SSM_APP_PREFIX`         | platform-ops |

And one secret:

| Secret                | Source                                            |
| --------------------- | ------------------------------------------------- |
| `AWS_DEPLOY_ROLE_ARN` | platform-ops — the OIDC role the workflow assumes |

Deploys use GitHub OIDC. No long-lived AWS keys are stored.

## 6. Create The OpenBao Read Policy And App Token

The container reads its secrets from OpenBao, but it needs a token to do that. Create a narrow one scoped to `kv/cv` only.

Open an SSM shell on the production EC2 instance:

```bash
aws ssm start-session --profile platform-ops --target <AWS_DEPLOY_INSTANCE_ID> --region <AWS_REGION>
```

Inside that shell, resolve the latest `platform-ops` release directory:

```bash
OPS_DIR="$(ls -1dt /opt/platform-ops/releases/* | head -n1)"
echo "$OPS_DIR"
```

Create the narrow read policy:

```bash
ROOT_TOKEN='paste_openbao_root_token'

sudo docker compose --env-file "$OPS_DIR/docker/.env.ops.prod" -f "$OPS_DIR/docker/compose.ops.prod.yml" exec -T \
  -e BAO_ADDR=http://127.0.0.1:8200 \
  -e BAO_TOKEN="$ROOT_TOKEN" \
  openbao sh -lc "
cat > /tmp/cv-prod-read.hcl <<'EOF'
path \"kv/data/cv\" { capabilities = [\"read\"] }
path \"kv/metadata/cv\" { capabilities = [\"read\"] }
EOF
bao policy write cv-prod-read /tmp/cv-prod-read.hcl
"
```

Create the token:

```bash
CV_OPENBAO_TOKEN="$(
  sudo docker compose --env-file "$OPS_DIR/docker/.env.ops.prod" -f "$OPS_DIR/docker/compose.ops.prod.yml" exec -T \
    -e BAO_ADDR=http://127.0.0.1:8200 \
    -e BAO_TOKEN="$ROOT_TOKEN" \
    openbao bao token create -policy=cv-prod-read -format=json | jq -r '.auth.client_token'
)"
echo "$CV_OPENBAO_TOKEN"
```

Use this app token only for `cv`.

## 7. Store The App Token In SSM

The host deploy script reads `OPENBAO_TOKEN` from SSM and injects it into the container. Without this step the container cannot open `kv/cv` and will exit at startup.

```bash
aws ssm put-parameter \
  --profile platform-ops \
  --name "${AWS_SSM_APP_PREFIX}/OPENBAO_TOKEN" \
  --type SecureString \
  --value "$CV_OPENBAO_TOKEN" \
  --overwrite \
  --region <AWS_REGION>
```

The conventional prefix is `/cv/prod/app`, giving `/cv/prod/app/OPENBAO_TOKEN`.

## 8. Install The Host Deploy Script

`.github/workflows/deploy.yml` invokes `/opt/platform/deploy-cv.sh` on the shared host through SSM, mirroring how the other apps deploy. That script is owned by `platform-ops` and must exist before the first deploy.

It receives four arguments — deploy bucket, image tag, the fully qualified web image, and the SSM app prefix — and is expected to:

1. download `s3://<bucket>/cv/<tag>/bundle.tar.gz` and unpack it
2. `docker login` to ECR and pull the web image
3. read `OPENBAO_TOKEN` from `<ssm-prefix>/OPENBAO_TOKEN` with `--with-decryption`
4. run `docker compose -f compose.app.prod.yml --env-file .env.app.prod up -d` with `CV_WEB_IMAGE` and `OPENBAO_TOKEN` set
5. wait for `/health` on the container and roll back on failure

## 9. Deploy

Deploys are triggered by publishing a GitHub release. release-please raises the release PR from Conventional Commits on `main`; merging it tags the release and publishes it, which starts `deploy.yml`.

To deploy an existing tag by hand, run the `Deploy AWS App (EC2 Compose)` workflow with `release_tag`.

The workflow builds and pushes the web image, uploads a bundle of the prod compose file and env template to S3, then triggers the host script over SSM and fails the job if the SSM command does not report `Success`.

## 10. Verify

```bash
curl -sf https://<cv-hostname>/health
```

Expect `{"status":"ok","release":"v0.1.0"}` with the released tag, which confirms the deployed image is the one you expect.

Then in a browser:

- the CV renders and the language switch works
- a contact-form submission produces a `cv.contact-received` event and an email arrives

Check the ingress route in `platform-ops` if the host does not resolve.

## 11. Rollback

Re-run the deploy workflow with the previous `release_tag`. Images are immutable per tag and the app holds no state, so a rollback is just the previous image starting again.

## 12. Troubleshooting

The container restarts continuously right after deploy:

- `OPENBAO_TOKEN` is missing from `${AWS_SSM_APP_PREFIX}/OPENBAO_TOKEN`, or the host script could not decrypt it (`--with-decryption`, and the instance role needs `ssm:GetParameter` plus `kms:Decrypt`)
- the token was created against a policy that does not grant `kv/data/cv`
- `kv/cv` is missing `TOLGEE_API_KEY` or `CONTACT_RECIPIENT_EMAIL`

`scripts/openbao-run.mjs` names the missing key in the container logs, so start there:

```bash
sudo docker logs cv_web --tail 50
```

The deploy workflow fails at "Validate required deploy variables":

- one of the four `vars` is unset on the `production` GitHub environment

The deploy workflow fails at the SSM step:

- `/opt/platform/deploy-cv.sh` does not exist on the host yet (step 8)
- the instance is not registered with SSM, or the deploy role cannot call `ssm:SendCommand`

The app serves but shows raw translation keys:

- the prod Tolgee project has no `cv` keys yet — promote the snapshots
- `TOLGEE_API_KEY` in prod `kv/cv` belongs to the local Tolgee instance

The contact form returns 502 in production:

- the shared Redpanda broker is unreachable from the container
- `NOTIFICATIONS_KAFKA_BROKERS` in `docker/.env.app.prod` points at the wrong host

Contact emails never arrive:

- the `notifications` service is not consuming, or its SMTP is misconfigured
- the `cv.contact-received` template is not in the deployed `notifications` release — check its dead-letter table for `Unsupported templateId`

## 13. Rotating The App Token

Repeat step 6 to mint a replacement, overwrite the SSM parameter from step 7, then re-run the deploy workflow with the current `release_tag` so the container picks it up. Revoke the old token afterwards with `bao token revoke`.
