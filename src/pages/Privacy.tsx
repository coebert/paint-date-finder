import { InfoPage } from '@/components/InfoPage';

export default function Privacy() {
  return (
    <InfoPage title="Privacy Policy" description="How Find A Walk-On collects, uses and protects your information.">
      <p>Last updated: 01/11/2026</p>
      <p>Find A Walk-On helps UK paintball players find walk-on games, teams and CPPS results. We collect as little as possible.</p>
      <h2>What we collect</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Account details</strong>: your email address, if you create an account.</li>
        <li><strong>Things you submit</strong>: events, flyers, game recaps, "Looking for a game" posts and replies.</li>
        <li><strong>Location</strong>: only when you tap "Near me". It is used on your device to sort venues and is not stored.</li>
        <li><strong>Basic usage</strong>: anonymous page visits, to help us improve the app.</li>
      </ul>
      <h2>How we use it</h2>
      <p>Only to run the app: showing events, sending replies to posts, and keeping the service safe from abuse. We never sell your data or use it for advertising.</p>
      <h2>Sharing</h2>
      <p>Replies to player posts are passed on by email without showing the poster's address. We use trusted providers for hosting and email delivery.</p>
      <h2>Your rights</h2>
      <p>You can delete your account and data at any time from the <a href="/account">Account</a> page. You can also contact us via the <a href="/support">Support</a> page to ask for a copy of your data or for corrections.</p>
    </InfoPage>
  );
}
