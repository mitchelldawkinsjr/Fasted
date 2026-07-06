import { LegalDocumentPage } from '../components/LegalDocumentPage';

const CONTACT_EMAIL = 'privacy@360web.cloud';

export function DataDeletionPage() {
  return (
    <LegalDocumentPage
      title="Data Deletion Instructions"
      intro={
        <>
          You can delete your Fasted data at any time. These instructions explain what is removed
          and how to request deletion if you cannot access the app.
        </>
      }
      sections={[
        {
          title: 'Delete your data in the app',
          content: (
            <>
              <p>If you are signed in, follow these steps:</p>
              <ol className="list-inside list-decimal space-y-2">
                <li>
                  Open{' '}
                  <a
                    href="https://fasted.360web.cloud/settings"
                    className="text-secondary underline underline-offset-2"
                  >
                    fasted.360web.cloud/settings
                  </a>{' '}
                  and sign in if needed.
                </li>
                <li>
                  Scroll to the <strong>Danger Zone</strong> section.
                </li>
                <li>
                  Tap <strong>Delete Account Data</strong> and confirm.
                </li>
              </ol>
              <p>This removes:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>Cloud-synced fasting progress and journal data for your account</li>
                <li>Meal photos stored in private cloud storage</li>
                <li>Local progress stored on the current device</li>
              </ul>
              <p>
                You will be signed out after deletion completes. Data on other devices may remain
                until you sign in there and repeat deletion, or clear that browser&apos;s site
                data.
              </p>
            </>
          ),
        },
        {
          title: 'Delete local data only',
          content: (
            <p>
              If you are not signed in, or you only want to clear this device, use{' '}
              <strong>Reset All Progress</strong> in Settings → Danger Zone. This clears local
              storage on the current device but does not remove cloud data for a signed-in account.
            </p>
          ),
        },
        {
          title: 'Facebook sign-in users',
          content: (
            <>
              <p>
                If you signed in with Facebook, deleting your Fasted data through the steps above
                removes the app data we store for your account. To remove Fasted from your Facebook
                account&apos;s connected apps, visit Facebook Settings → Apps and Websites and
                remove Fasted Calendar.
              </p>
              <p>
                To revoke Facebook login access separately, use Facebook&apos;s security settings
                for connected apps.
              </p>
            </>
          ),
        },
        {
          title: 'If you cannot access the app',
          content: (
            <p>
              Email{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=Fasted%20data%20deletion%20request`}
                className="text-secondary underline underline-offset-2"
              >
                {CONTACT_EMAIL}
              </a>{' '}
              from the email address linked to your account (or the email on your Facebook/Google
              profile used to sign in). Include &ldquo;Data deletion request&rdquo; in the subject
              line. We will verify ownership and delete associated cloud data within 30 days.
            </p>
          ),
        },
        {
          title: 'What may remain',
          content: (
            <p>
              Deleting account data removes app progress and photos as described above. Your
              authentication record with our sign-in provider may remain until removed through a
              verified deletion request. Anonymous group activity may persist in aggregate form
              when your group uses anonymous mode.
            </p>
          ),
        },
      ]}
      relatedLinks={[
        { to: '/privacy', label: 'Privacy Policy' },
        { to: '/settings', label: 'Settings' },
      ]}
    />
  );
}
