import { InfoPage } from '@/components/InfoPage';

export default function Support() {
  return (
    <InfoPage title="Support" description="Get help with Find A Walk-On: report wrong event details, ask questions or request account help.">
      <p>Spotted a wrong date, a cancelled game or a missing venue? Open the event and use <strong>Report a problem</strong>. Every event is checked by hand.</p>
      <h2>Contact us</h2>
      <p>Email <a href="mailto:support@findawalkon.com">support@findawalkon.com</a>. We aim to reply within 2 working days.</p>
      <h2>Common questions</h2>
      <p><strong>How do I add an event?</strong> Tap "Submit event" at the top of the page. It will appear once it has been checked.</p>
      <p><strong>How do I delete my account?</strong> Sign in, open the account menu and choose <a href="/account">Account</a>.</p>
      <p><strong>Read our</strong> <a href="/privacy">Privacy Policy</a>.</p>
    </InfoPage>
  );
}
