<p align="center">
  <img src="pigeon.png" alt="pigeon" width="180" />
</p>

<h1 align="center">Pigeon</h1>

<p align="center">
  Template-first messaging for Slack and more.
</p>

<p align="center">
  <a href="https://codecov.io/gh/cdaviis/pigeon"><img src="https://codecov.io/gh/cdaviis/pigeon/branch/main/graph/badge.svg" alt="Coverage" /></a>
</p>

---

Pigeon lets you define your messages as YAML or JSON templates — including the destination, formatting, and variables — and send them from the CLI or your Node.js code.

## Features

- **Template-first** — message structure, destination, and variables all live in one file
- **YAML or JSON** templates
- **CLI** for use in CI/CD pipelines
- **Programmatic API** for use in Node.js applications
- **Variable interpolation** with `{{var}}`, env vars (`{{MY_ENV_VAR}}`), and built-ins (`{{now}}`, `{{uuid}}`)
- Built-in adapter for **Slack** (Block Kit)

## Installation

```bash
npm install pigeon
```

For CLI use, install globally:

```bash
npm install -g pigeon
```

## Quick start

**1. Create a template** (`./templates/deploy.yml`):

```yaml
version: '1'
name: Deploy Notification
destination:
  service: slack
  channel: '#deployments'
variables:
  app_name:
    required: true
  version:
    required: true
  environment:
    default: production
message:
  blocks:
    - type: header
      text:
        type: plain_text
        text: ':rocket: {{app_name}} deployed to {{environment}}'
    - type: section
      fields:
        - type: mrkdwn
          text: '*Version:*\n`{{version}}`'
        - type: mrkdwn
          text: '*Status:*\n:large_green_circle: Success'
    - type: context
      elements:
        - type: mrkdwn
          text: 'Deployed at {{now}}'
```

**2. Set your credentials:**

```bash
export PIGEON_SLACK_TOKEN=xoxb-your-token
```

**3. Send it:**

```bash
pigeon send ./templates/deploy.yml --var app_name=api --var version=1.2.3
```

## CLI

```
pigeon send <path> [options]        Send a message
pigeon validate <path>              Validate a template
pigeon list <dir>                   List templates in a directory
```

### `pigeon send` options

| Flag | Description |
|---|---|
| `-v, --var <key=value>` | Set a template variable (repeatable) |
| `--dry-run` | Print resolved payload without sending |
| `--json` | Output result as JSON (for scripting) |
| `--config <file>` | Path to a credentials config file |
| `-e, --env-file <file>` | Load a `.env` file for credentials |

### Examples

```bash
# Send with variables
pigeon send ./templates/deploy.yml --var app_name=api --var version=2.0.0

# Preview the resolved payload
pigeon send ./templates/deploy.yml --var app_name=api --var version=2.0.0 --dry-run

# JSON output for CI/CD scripting
pigeon send ./templates/build-report.yml --var branch=main --var status=passing --json

# Validate a template
pigeon validate ./templates/slack-deploy.yml

# List templates in a directory
pigeon list ./templates
```

## Programmatic API

```typescript
import pigeon from 'pigeon';

// Send a message
await pigeon.send('./templates/deploy.yml', { app_name: 'api', version: '1.2.3' });

// With options
await pigeon.send('./templates/deploy.yml', { app_name: 'api', version: '2.0.0' }, {
  dryRun: true,
});
```

## Template DSL

All templates share this shape:

```yaml
version: '1'           # Required. Must be "1"
name: My Template      # Required. Human-readable name
description: ...       # Optional

destination:
  service: slack        # Required. Which adapter to use
  # ...service-specific keys (channel, database_id, etc.)

variables:             # Optional. Declare expected variables
  my_var:
    description: What this variable is for
    required: true      # true by default when no default is set
    default: fallback   # Used when var is not provided

message:               # Required. Service-native message shape
  # Slack: { blocks: [...] } or { text: "..." }
```

### Variable tokens

| Token | Resolved value |
|---|---|
| `{{my_var}}` | Value passed via `--var my_var=...` or `vars` option |
| `{{MY_ENV_VAR}}` | `process.env.MY_ENV_VAR` (ALL_CAPS triggers env lookup) |
| `{{now}}` | Current ISO 8601 timestamp |
| `{{timestamp}}` | Current Unix timestamp (ms) |
| `{{uuid}}` | Random UUID v4 |

Tokens work anywhere in the template — in strings, object keys, and destination config.

## Credentials

Credentials are resolved in this priority order (highest wins):

1. Programmatic `opts.credentials`
2. CLI `--config <file>`
3. Environment variables
4. `.pigeon.yml` in the current directory
5. `~/.pigeon/config.yml`

### Environment variables

```bash
PIGEON_SLACK_TOKEN=xoxb-...
```

### Config file (`.pigeon.yml` or `~/.pigeon/config.yml`)

```yaml
slack:
  botToken: xoxb-your-token
```

## License

MIT
