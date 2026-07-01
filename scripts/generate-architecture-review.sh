#!/usr/bin/env bash
# Generate and post architecture review on a GitHub issue.
# Returns dispatch_implement=true when verdict is ready and labels were updated.
# Env: ISSUE_NUMBER, REPO, GH_TOKEN, OPENAI_API_KEY
set -euo pipefail

if [ -z "${ISSUE_NUMBER:-}" ] || [ -z "${OPENAI_API_KEY:-}" ] || [ -z "${REPO:-}" ]; then
  echo "Missing ISSUE_NUMBER, REPO, or OPENAI_API_KEY"
  exit 1
fi

LABELS=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json labels -q '[.labels[].name] | join(",")')
if ! echo "$LABELS" | grep -q 'needs-architecture'; then
  echo "dispatch_implement=false"
  exit 0
fi

ISSUE_TITLE=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json title -q .title)
ISSUE_BODY=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json body -q .body)
COMMENTS=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json comments -q '[.comments[].body] | join("\n\n---\n\n")')

CONTEXT=$(cat .github/ai-architecture-review-context.md)

REPO_EXCERPT=$(cat <<'FILES'
### Relevant repo files (survey these)

FILES
)
if [ -d supabase/migrations ]; then
  REPO_EXCERPT+=$'\n**Migrations:**\n'
  REPO_EXCERPT+=$(ls -1 supabase/migrations 2>/dev/null | sed 's/^/- /' || true)
fi
for f in src/lib/groups.ts src/lib/supabase.ts docker/SETUP.md; do
  if [ -f "$f" ]; then
    REPO_EXCERPT+=$'\n\n**'"$f"'** (first 120 lines):\n```\n'
    REPO_EXCERPT+=$(head -n 120 "$f")
    REPO_EXCERPT+=$'\n```'
  fi
done

USER_PROMPT=$(cat <<PROMPT_EOF
Issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}

## Issue body
${ISSUE_BODY:-(no body)}

## Comments (includes spec)
${COMMENTS:-(none)}

${REPO_EXCERPT}

Post the architecture review comment for this issue. End with VERDICT line per your instructions.
PROMPT_EOF
)

PAYLOAD=$(jq -n \
  --arg model "gpt-4o-mini" \
  --arg system "$CONTEXT" \
  --arg user "$USER_PROMPT" \
  '{
    model: $model,
    messages: [
      {role: "system", content: $system},
      {role: "user", content: $user}
    ],
    temperature: 0.2
  }')

RESPONSE=$(curl -sS https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer ${OPENAI_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

ERROR=$(echo "$RESPONSE" | jq -r '.error.message // empty')
if [ -n "$ERROR" ]; then
  echo "::error::OpenAI API error: $ERROR"
  echo "$RESPONSE" | jq .
  exit 1
fi

RAW=$(echo "$RESPONSE" | jq -r '.choices[0].message.content // empty')
if [ -z "$RAW" ]; then
  echo "::error::Empty response from OpenAI"
  exit 1
fi

VERDICT=$(printf '%s\n' "$RAW" | rg -i 'VERDICT:\s*(.+)$' -m1 -r '$1' | tail -1 | tr -d '\r' || true)
COMMENT=$(printf '%s\n' "$RAW" | sed '/^VERDICT:/Id' | sed -e :a -e '/^\n*$/{$d;N;ba' -e '}')
# Strip accidental markdown fences from model output
COMMENT=$(printf '%s\n' "$COMMENT" | sed '1{/^```markdown$/d;}' | sed '${/^```$/d;}')
if [ -z "$COMMENT" ]; then
  COMMENT="$RAW"
fi

printf '%s\n' "$COMMENT" > /tmp/arch-review-comment.md
gh issue comment "$ISSUE_NUMBER" --repo "$REPO" --body-file /tmp/arch-review-comment.md

gh label create architecture-reviewed --description "Architecture review posted" --color "0E8A16" 2>/dev/null || true

if echo "$VERDICT" | grep -qi 'needs spec clarification'; then
  gh issue comment "$ISSUE_NUMBER" --repo "$REPO" --body "🏗️ Architecture review posted — verdict is **needs spec clarification**. Add details to the issue, then re-add \`needs-architecture\` to re-run review."
  echo "dispatch_implement=false"
  exit 0
fi

gh issue edit "$ISSUE_NUMBER" --repo "$REPO" \
  --remove-label needs-architecture \
  --add-label architecture-reviewed

if echo "$LABELS" | grep -qE 'no-agent|agent-manual'; then
  gh issue comment "$ISSUE_NUMBER" --repo "$REPO" --body "🏗️ Architecture review complete. Add \`ready\` when you want implementation to start."
  echo "dispatch_implement=false"
  exit 0
fi

if echo "$LABELS" | grep -qE 'agent-working|pr-opened'; then
  echo "dispatch_implement=false"
  exit 0
fi

gh label create ready --description "Trigger Cursor cloud agent implementation" --color "FBCA04" 2>/dev/null || true
if ! echo "$LABELS" | grep -q 'ready'; then
  gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label ready
  gh issue comment "$ISSUE_NUMBER" --repo "$REPO" --body "🏗️ Architecture reviewed — implementation agent starting."
fi

echo "dispatch_implement=true"
