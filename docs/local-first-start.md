# Local First Start (cv)

Use this runbook when you are creating the `cv` local environment from scratch.
Complete `platform-ops/docs/local-first-start.md` first. `cv` depends on the shared local OpenBao, Tolgee, Redpanda, observability stack, and Docker network provided there.
The shared translation source-of-truth model is documented in `platform-ops/docs/local-first-start.md` under `Translation Workflow`.

## 1. What You Are Building

When this runbook is complete, you will have:

- the `cv` web app running on `http://localhost:3021`
- runtime translations loaded from Tolgee in EN and ES
- the contact form publishing to the shared platform Kafka broker
- optional email delivery through the separate `notifications` local stack

There is no `cv` API and no `cv` database. The app is stateless: delivery state and idempotency for contact emails live in the `notifications` service.

## 2. Prerequisites

Run every command in this document from the `cv` repo root.

Required:

- `platform-ops` local stack is already running
- OpenBao in `platform-ops` is initialized and unsealed
- `kv` v2 is enabled in OpenBao
- Docker
- `npm`
- `jq`

Optional but recommended:

- the `notifications` local stack, if you want actual local email delivery

## 3. Create The Tolgee Project And API Key

`cv` requires a Tolgee project and API key before the web container can start.

Open Tolgee:

- `http://localhost:8090`

Log in with the bootstrap credentials from `platform-ops/docker/.env.ops.local`.

Then:

1. create a project for `cv` if it does not already exist
2. confirm the project languages are `en` and `es` — the pull normalises region subtags, so a project tagged `es-ES` still lands as `es.json`
3. note the numeric project id
4. create an API key that the server-side runtime can use to read or export translations

You will need:

- the project id for `TOLGEE_PROJECT_ID` in `docker/.env.app.local`
- the API key for `TOLGEE_API_KEY` in OpenBao

Seed the project by pushing the tracked message files once:

```bash
npm run i18n:push -w @cv/web
```

After that, Tolgee is the source of truth. A key added locally and not pushed is overwritten by the next pull.

## 4. Store Secrets In OpenBao

`cv` reads its secrets from `kv/cv`. Both keys are required — the container refuses to start without them.

| Key                       | Purpose                                   |
| ------------------------- | ----------------------------------------- |
| `TOLGEE_API_KEY`          | Pulling translation snapshots at boot     |
| `CONTACT_RECIPIENT_EMAIL` | Where contact-form messages are delivered |

```bash
bao kv put kv/cv \
  TOLGEE_API_KEY='<tolgee api key>' \
  CONTACT_RECIPIENT_EMAIL='<your inbox>'
```

`CONTACT_RECIPIENT_EMAIL` is not secret in the cryptographic sense. It lives in OpenBao so a personal inbox address is never committed to the repository.

## 5. Create A Read-Only Policy For `cv`

Create an OpenBao ACL policy named `cv-local-read`.
This step requires the OpenBao root token saved during the `platform-ops` bootstrap:

```bash
ROOT_TOKEN='paste_root_token_here'

docker compose --env-file ../platform-ops/docker/.env.ops.local -f ../platform-ops/docker/compose.ops.local.yml exec -T \
  -e BAO_ADDR=http://127.0.0.1:8200 \
  -e BAO_TOKEN="$ROOT_TOKEN" \
  openbao bao policy write cv-local-read - <<'EOF'
path "kv/data/cv" { capabilities = ["read"] }
path "kv/metadata/cv" { capabilities = ["read"] }
EOF
```

This policy allows the app to read only `kv/cv`. It cannot read `kv/gpool`, `kv/kini`, or any other app's secrets.

## 6. Create The `cv` OpenBao Token

Use the OpenBao root token saved during the `platform-ops` bootstrap.

Create the app token:

```bash
ROOT_TOKEN='paste_root_token_here'

docker compose --env-file ../platform-ops/docker/.env.ops.local -f ../platform-ops/docker/compose.ops.local.yml exec -T \
  -e BAO_ADDR=http://127.0.0.1:8200 \
  -e BAO_TOKEN="$ROOT_TOKEN" \
  openbao bao token create -policy=cv-local-read -format=json \
  | jq -r '.auth.client_token'
```

Copy the printed token value and use it only for `cv`. It is the `OPENBAO_TOKEN` in the next step.

Never put the root token in `docker/.env.app.local` — the whole point of the policy above is that a leaked app token exposes one path, not the entire store.

## 7. Create The Local Env File

```bash
cp docker/.env.app.local.example docker/.env.app.local
```

Fill in:

- `OPENBAO_TOKEN` — the `cv-local-read` token from the previous step
- `TOLGEE_PROJECT_ID` — the numeric id from step 3

`docker/.env.app.local` is gitignored. Never commit it.

## 8. Start The Stack

```bash
npm ci
npm run local:up
```

`local:up` will:

1. create the shared `platform_ops_shared` network if it is missing
2. wait for OpenBao to be reachable, and fail clearly if it is sealed or uninitialized
3. verify `kv/cv` is readable and holds both required keys
4. pull Tolgee snapshots into `apps/ui/messages/`
5. build and start the `cv_web` container

The app is then on `http://localhost:3021`, with `http://localhost:3021/health` as the liveness probe.

## 9. Verify

```bash
curl -sf http://localhost:3021/health
```

Expect `{"status":"ok","release":"dev"}`.

Then in a browser:

- the CV renders with the sticky rail, project list and case-study modals
- the EN / ES switch changes the UI chrome and survives a reload
- `Download PDF` opens the print dialog with the rail and interactive controls stripped

## 10. Test The Contact Form

The form needs Redpanda from `platform-ops`, and the `notifications` local stack to actually deliver the mail.

Submit a message through the contact section, then check the topic:

```bash
docker exec -it platform-redpanda \
  rpk topic consume notification.email.requested.v1 --num 1
```

You should see an event with `"sourceApp":"cv"` and `"templateId":"cv.contact-received"`. The `recipient` is always `CONTACT_RECIPIENT_EMAIL`; the visitor's address appears in `replyTo`.

If the `notifications` stack is running, the mail arrives through its configured SMTP.

## 11. Working Without The Stack

The CV itself has no runtime dependency on OpenBao, Tolgee or Kafka — only the contact form does. For pure UI work:

```bash
npm run dev -w @cv/web
```

That serves on `http://localhost:3021` using the committed `messages/` snapshots. `POST /api/contact` returns `502` because no broker is configured, which is expected.

## 12. Stop And Reset

```bash
npm run local:down
npm run local:reset
```

`local:reset` forces a no-cache rebuild and brings the stack back up. There are no volumes to drop — the app is stateless.

## 13. Troubleshooting

`local:up` fails at "Waiting for OpenBao":

- the `platform-ops` local stack is not running
- OpenBao is sealed or uninitialized — the script distinguishes the two and says which

`local:up` fails with "OpenBao path kv/cv is not readable":

- `OPENBAO_TOKEN` in `docker/.env.app.local` is empty or still a placeholder
- the token was created against the wrong policy, or the policy does not grant `kv/data/cv`
- the token has expired — mint a new one with step 6

`local:up` fails with "missing required keys":

- `kv/cv` exists but is missing `TOLGEE_API_KEY` or `CONTACT_RECIPIENT_EMAIL` (step 4)

Tolgee pull fails:

- `platform-ops` is not running, so Tolgee is not reachable on `http://localhost:8090`
- `TOLGEE_PROJECT_ID` in `docker/.env.app.local` does not match a real project
- `TOLGEE_API_KEY` in `kv/cv` was revoked or belongs to a different project

The UI shows raw keys such as `nav.contact` instead of text:

- the key exists in the code but not in Tolgee, and the last pull overwrote the local file
- push the tracked snapshots once with `npm run i18n:push -w @cv/web`

The contact form returns 502:

- `platform-ops` is not running, so the shared Kafka broker does not exist
- `NOTIFICATIONS_KAFKA_BROKERS` points to the wrong broker
- expected when running `npm run dev` without the stack

The contact form returns 429:

- the per-IP rate limit (5 per hour) has been hit; restart the container to clear it

Sections appear blank when scrolling:

- only possible with JavaScript disabled mid-session; the server-rendered HTML
  contains every section, and the entrance animation has a timer fallback

## 14. Next Step

Deploying to AWS for the first time is covered in `docs/cloud-first-deploy.md`.
