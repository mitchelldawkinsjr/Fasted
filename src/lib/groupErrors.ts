const GROUP_SCHEMA_UNAVAILABLE =
  'Group features are temporarily unavailable. The server database needs an update — please try again later or contact support.';
const GROUP_CREATE_FAILED = 'Could not create group. Please try again.';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message.trim();
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message).trim();
  }
  return '';
}

function getErrorCode(err: unknown): string | null {
  if (typeof err !== 'object' || err === null || !('code' in err)) return null;
  const code = (err as { code: unknown }).code;
  return typeof code === 'string' ? code : null;
}

function isMissingSchemaError(err: unknown): boolean {
  const code = getErrorCode(err);
  if (code === 'PGRST205' || code === '42P01') return true;

  const message = getErrorMessage(err).toLowerCase();
  return (
    message.includes('could not find the table') ||
    message.includes('relation') && message.includes('does not exist')
  );
}

export function formatGroupError(err: unknown, fallback = GROUP_CREATE_FAILED): string {
  if (isMissingSchemaError(err)) {
    return GROUP_SCHEMA_UNAVAILABLE;
  }

  const message = getErrorMessage(err);
  if (message) return message;

  return fallback;
}
