import { Link } from 'react-router-dom';
import { LegalDocumentPage } from '../components/LegalDocumentPage';

const CONTACT_EMAIL = 'privacy@360web.cloud';

export function PrivacyPolicyPage() {
  return (
    <LegalDocumentPage
      title="Privacy Policy"
      intro={
        <>
          Fasted Calendar (&ldquo;Fasted&rdquo;) helps you track fasting journeys, journal, and
          optional group participation. This policy describes what we collect, how we use it, and
          the choices you have.
        </>
      }
      sections={[
        {
          title: 'Information we collect',
          content: (
            <>
              <p>
                <strong>On your device.</strong> Journals, check-ins, fasting progress, settings,
                and optional meal photos are stored locally in your browser (localStorage and
                IndexedDB) so the app works offline.
              </p>
              <p>
                <strong>When you sign in.</strong> If you create an account or sign in with Google
                or Facebook, we store your progress in cloud storage tied to your account. Meal
                photos you attach to journal entries may upload to private cloud storage. Sign-in
                providers may share basic profile information such as your name and email address.
              </p>
              <p>
                <strong>Groups.</strong> If you join or create a group, we store membership,
                display preferences, and shared journal activity according to the group&apos;s
                privacy mode (anonymous or named).
              </p>
            </>
          ),
        },
        {
          title: 'How we use information',
          content: (
            <>
              <p>We use your information to:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>Provide fasting plans, journaling, and progress tracking</li>
                <li>Sync your data across devices when you are signed in</li>
                <li>Enable optional group features you choose to join</li>
                <li>Maintain and improve the app</li>
              </ul>
              <p>We do not sell your personal information.</p>
            </>
          ),
        },
        {
          title: 'Where data is stored',
          content: (
            <p>
              Local data stays on your device. Cloud data for signed-in users is stored on
              self-hosted infrastructure operated for Fasted. Sign-in is handled through Supabase
              Auth with Google and Facebook as identity providers.
            </p>
          ),
        },
        {
          title: 'Third-party services',
          content: (
            <>
              <p>
                If you choose Google or Facebook sign-in, those providers process authentication
                according to their own privacy policies. Fasted receives only the profile details
                needed to create and maintain your account.
              </p>
              <p>
                Optional analytics may use Google Analytics in production to understand app usage in
                aggregate.
              </p>
            </>
          ),
        },
        {
          title: 'Your choices',
          content: (
            <>
              <p>
                You can use Fasted without signing in; your data remains on your device. You can
                export a copy of your journal from Settings.
              </p>
              <p>
                Signed-in users can delete cloud progress, meal photos, and local data from{' '}
                <Link to="/settings" className="text-secondary underline underline-offset-2">
                  Settings
                </Link>
                . See our{' '}
                <Link to="/data-deletion" className="text-secondary underline underline-offset-2">
                  Data Deletion Instructions
                </Link>{' '}
                for step-by-step guidance.
              </p>
            </>
          ),
        },
        {
          title: 'Contact',
          content: (
            <p>
              Questions about this policy or your data:{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-secondary underline underline-offset-2"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          ),
        },
      ]}
      relatedLinks={[
        { to: '/data-deletion', label: 'Data Deletion Instructions' },
        { to: '/settings', label: 'Settings' },
      ]}
    />
  );
}
