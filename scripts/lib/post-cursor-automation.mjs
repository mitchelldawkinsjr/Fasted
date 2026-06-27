/**
 * POST a JSON payload to the Fasted Cursor Automation webhook.
 * Requires CURSOR_AUTOMATION_WEBHOOK_URL; optional CURSOR_AUTOMATION_WEBHOOK_AUTH.
 */
export async function postCursorAutomation(payload) {
  const webhookUrl = process.env.CURSOR_AUTOMATION_WEBHOOK_URL;
  const webhookAuth = process.env.CURSOR_AUTOMATION_WEBHOOK_AUTH;

  if (!webhookUrl) {
    console.error(
      "CURSOR_AUTOMATION_WEBHOOK_URL is not configured. Save the Cursor Automation and add the webhook URL under Settings → Secrets → Actions."
    );
    process.exit(1);
  }

  const headers = { "Content-Type": "application/json" };
  if (webhookAuth) {
    headers.Authorization = webhookAuth.startsWith("Bearer ")
      ? webhookAuth
      : `Bearer ${webhookAuth}`;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error(
      `Webhook failed: HTTP ${response.status} ${response.statusText}`,
      text.slice(0, 500)
    );
    process.exit(1);
  }

  console.log("Cursor Automation webhook accepted:", response.status);
}
