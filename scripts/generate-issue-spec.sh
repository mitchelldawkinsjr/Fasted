#!/usr/bin/env bash
# Generate and post issue spec. Returns 0 and sets DISPATCH_IMPLEMENT=1 when ready should queue.
# Env: ISSUE_NUMBER, REPO, GH_TOKEN, OPENAI_API_KEY
set -euo pipefail

if [ -z "${ISSUE_NUMBER:-}" ] || [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "Missing ISSUE_NUMBER or OPENAI_API_KEY"
  exit 1
fi

ISSUE_TITLE=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json title -q .title)
ISSUE_BODY=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json body -q .body)

CONTEXT=$(cat .github/ai-spec-context.md)

USER_PROMPT=$(cat <<PROMPT_EOF
Issue title: ${ISSUE_TITLE}

Issue body:
${ISSUE_BODY:-(no body)}

Generate a GitHub comment with Acceptance Criteria, Task Breakdown, Potential Fix Directions, and Notes from Issue / Images for this issue. Follow the output format and rules in your system context exactly. The Task Breakdown must use checkbox syntax and list only tasks relevant to this issue.
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
    temperature: 0.3
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

COMMENT=$(echo "$RESPONSE" | jq -r '.choices[0].message.content // empty')
if [ -z "$COMMENT" ]; then
  echo "::error::Empty response from OpenAI"
  exit 1
fi

printf '%s\n' "$COMMENT" > /tmp/spec-comment.md
gh issue comment "$ISSUE_NUMBER" --repo "$REPO" --body-file /tmp/spec-comment.md

gh label create spec-added --description "AI-generated acceptance criteria posted" --color "0E8A16" 2>/dev/null || true
gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --remove-label "needs-spec" --add-label "spec-added"

# Auto-queue (same logic as issue-spec.yml)
if [ "${AGENT_AUTO_READY_ENABLED:-true}" = "false" ]; then
  echo "dispatch_implement=false"
  exit 0
fi

LABELS=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json labels -q '[.labels[].name] | join(",")')
BODY=$(gh issue view "$ISSUE_NUMBER" --repo "$REPO" --json body,comments -q '[.body] + [.comments[].body] | join("\n")')

if echo "$LABELS" | grep -qE 'no-agent|agent-manual'; then
  gh issue comment "$ISSUE_NUMBER" --repo "$REPO" --body "Spec ready. Add \`ready\` when you want the implementation agent to start."
  echo "dispatch_implement=false"
  exit 0
fi

if echo "$LABELS" | grep -qE 'agent-working|pr-opened|ready|needs-architecture'; then
  echo "dispatch_implement=false"
  exit 0
fi

gh label create needs-architecture --description "Request architecture review before implementation" --color "C5DEF5" 2>/dev/null || true
gh label create ready --description "Trigger Cursor cloud agent implementation" --color "FBCA04" 2>/dev/null || true

if echo "$BODY" | grep -qiE 'supabase/migrations|```sql|new route|new page|/groups/|RLS polic|storage bucket|schema change'; then
  gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label needs-architecture
  gh issue comment "$ISSUE_NUMBER" --repo "$REPO" --body "🏗️ **Complex change detected** — \`needs-architecture\` applied. Architecture agent will review; implementation queues automatically after \`architecture-reviewed\`."
  echo "dispatch_implement=false"
else
  gh issue edit "$ISSUE_NUMBER" --repo "$REPO" --add-label ready
  gh issue comment "$ISSUE_NUMBER" --repo "$REPO" --body "✅ Spec complete — \`ready\` applied automatically. Implementation agent starting."
  echo "dispatch_implement=true"
fi
