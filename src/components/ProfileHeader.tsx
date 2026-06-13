import { Icon } from './Icon';
import { useAuth } from '../hooks/useAuth';

function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function ProfileHeader() {
  const { isLoggedIn, name, email, memberSince } = useAuth();

  if (!isLoggedIn) return null;

  const displayName = name?.trim() || email || 'Your profile';

  return (
    <section className="flex flex-col items-center text-center">
      <div className="mb-stack-md flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-secondary-container bg-surface-container-low shadow-grace">
        <Icon name="account_circle" size={56} className="text-secondary" />
      </div>
      <h2 className="font-display text-headline-md text-primary">{displayName}</h2>
      {email && name?.trim() && (
        <p className="mt-1 text-body-md text-on-surface-variant">{email}</p>
      )}
      {memberSince && (
        <p className="mt-1 text-label-caps text-on-surface-variant">
          Faithful since {formatMemberSince(memberSince)}
        </p>
      )}
    </section>
  );
}
