import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy — Open Market',
    description: 'Privacy Policy for Open Market (openmkt.app), the Bluesky commerce aggregator.',
    alternates: {
        canonical: '/privacy-policy',
    },
};

const EFFECTIVE_DATE = 'April 21, 2025';

const sections = [
    {
        number: '01',
        title: 'Introduction',
        content: (
            <p>
                This Privacy Policy describes how Open Market (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, and
                protects information when you use openmkt.app (&quot;the Service&quot;). Because Open Market is built on
                the{' '}
                <a href="https://atproto.com" target="_blank" rel="noopener noreferrer" className="text-primary-color hover:underline">
                    AT Protocol
                </a>
                , most of your data — including your listings — lives on your own Bluesky Personal Data Server (PDS),
                not ours.
            </p>
        ),
    },
    {
        number: '02',
        title: 'Information We Collect',
        content: (
            <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                        <p className="text-sm font-semibold text-red-700 mb-2">What we don&apos;t collect</p>
                        <ul className="text-sm text-text-secondary space-y-1 list-disc pl-4">
                            <li>Your Bluesky password</li>
                            <li>Payment or financial details</li>
                            <li>Private messages with other users</li>
                            <li>Data from your Bluesky PDS beyond public records</li>
                        </ul>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                        <p className="text-sm font-semibold text-green-700 mb-2">What we do collect</p>
                        <ul className="text-sm text-text-secondary space-y-1 list-disc pl-4">
                            <li>Your Bluesky handle and DID (from OAuth)</li>
                            <li>Session tokens (stored in your browser)</li>
                            <li>Aggregated usage analytics</li>
                            <li>Support communications</li>
                        </ul>
                    </div>
                </div>

                <h3 className="font-semibold text-text-primary mb-2">2.1 Identity & Authentication</h3>
                <p className="mb-4">
                    When you sign in, you are redirected to Bluesky&apos;s OAuth flow. We never receive or store your
                    password. Upon successful authentication, we receive your Bluesky handle, DID (Decentralized
                    Identifier), display name, and avatar URL. OAuth tokens are stored in your browser&apos;s
                    IndexedDB — not on our servers.
                </p>

                <h3 className="font-semibold text-text-primary mb-2">2.2 Listing & Storefront Content</h3>
                <p className="mb-4">
                    Listings you create through Open Market are published as public ATProto records to your Bluesky PDS.
                    We index those records to power the marketplace. This content is publicly accessible on the
                    AT Protocol network regardless of Open Market.
                </p>

                <h3 className="font-semibold text-text-primary mb-2">2.3 Usage Analytics</h3>
                <p className="mb-4">
                    We use Google Analytics (GA4) to understand how the Service is used. This includes page views,
                    listing views, interest interactions, and listing creation events. Analytics data is aggregated and
                    does not identify you personally, but Google&apos;s data collection is governed by the{' '}
                    <a
                        href="https://policies.google.com/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-color hover:underline"
                    >
                        Google Privacy Policy
                    </a>
                    . You can opt out using the{' '}
                    <a
                        href="https://tools.google.com/dlpage/gaoptout"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-color hover:underline"
                    >
                        Google Analytics Opt-out Browser Add-on
                    </a>
                    .
                </p>

                <h3 className="font-semibold text-text-primary mb-2">2.4 Support Communications</h3>
                <p>
                    If you contact us by email, we retain that correspondence to respond to and resolve your request.
                </p>
            </>
        ),
    },
    {
        number: '03',
        title: 'How We Use Information',
        content: (
            <>
                <div className="space-y-4">
                    {[
                        {
                            heading: '3.1 Operating the Service',
                            body: 'We use your Bluesky identity to authenticate you, associate listings with your account, and display your storefront to other users.',
                        },
                        {
                            heading: '3.2 Product improvement',
                            body: 'Aggregated analytics help us understand which features are used, identify issues, and decide what to build next.',
                        },
                        {
                            heading: '3.3 Customer support',
                            body: 'We use your contact information and correspondence to respond to support requests and troubleshoot issues.',
                        },
                        {
                            heading: '3.4 Safety & integrity',
                            body: 'We may review account or listing activity to detect fraud, abuse, or violations of our Terms of Service.',
                        },
                    ].map(({ heading, body }) => (
                        <div key={heading}>
                            <p className="font-semibold text-text-primary mb-1">{heading}</p>
                            <p>{body}</p>
                        </div>
                    ))}
                </div>
            </>
        ),
    },
    {
        number: '04',
        title: 'Data Storage & Security',
        content: (
            <>
                <p className="mb-4">
                    <strong className="text-text-primary">Your listing content</strong> is stored on the AT Protocol
                    network via your Bluesky PDS — not on our infrastructure. Removing a listing from Open Market
                    de-indexes it from our platform, but managing the underlying ATProto record is done through your
                    Bluesky account.
                </p>
                <p className="mb-4">
                    <strong className="text-text-primary">Session tokens</strong> are stored in your browser&apos;s
                    IndexedDB and are never transmitted to or held by our servers beyond what is required for the
                    OAuth handshake.
                </p>
                <p className="mb-4">
                    <strong className="text-text-primary">Operational data</strong> (analytics, support logs) is
                    stored on secure servers with encryption in transit (HTTPS/TLS). Access is limited to those who
                    need it to operate the Service.
                </p>
                <p>
                    We aim to delete inactive account and support data within a reasonable period after it is no
                    longer needed for its stated purpose.
                </p>
            </>
        ),
    },
    {
        number: '05',
        title: 'Third-Party Services',
        content: (
            <div className="space-y-4">
                {[
                    {
                        name: '5.1 Bluesky / AT Protocol',
                        body: 'Authentication and listing storage rely on Bluesky\'s OAuth service and the AT Protocol network. Your use of Bluesky is subject to their own privacy policy and terms.',
                    },
                    {
                        name: '5.2 Google Analytics (GA4)',
                        body: 'We use GA4 for usage analytics. Data is sent to Google\'s servers and governed by the Google Privacy Policy. No personally identifying information is deliberately included in analytics events.',
                    },
                    {
                        name: '5.3 Email',
                        body: 'Support communications are handled via email. We use a third-party email provider; messages are processed according to their privacy policy.',
                    },
                ].map(({ name, body }) => (
                    <div key={name}>
                        <p className="font-semibold text-text-primary mb-1">{name}</p>
                        <p>{body}</p>
                    </div>
                ))}
            </div>
        ),
    },
    {
        number: '06',
        title: 'Your Rights & Choices',
        content: (
            <div className="space-y-4">
                {[
                    {
                        heading: '6.1 Access your data',
                        body: 'You can request a summary of personal information we hold about you by emailing us.',
                    },
                    {
                        heading: '6.2 Delete your data',
                        body: 'You can delete your listings directly from your Bluesky account (which removes them from our index) or contact us to request deletion of any additional data we hold.',
                    },
                    {
                        heading: '6.3 Opt out of analytics',
                        body: 'Use the Google Analytics Opt-out Browser Add-on to prevent GA4 from collecting your usage data.',
                    },
                    {
                        heading: '6.4 Revoke access',
                        body: 'You can revoke Open Market\'s OAuth access at any time from your Bluesky account settings under Connected Apps. This will sign you out and prevent future access until you re-authenticate.',
                    },
                ].map(({ heading, body }) => (
                    <div key={heading}>
                        <p className="font-semibold text-text-primary mb-1">{heading}</p>
                        <p>{body}</p>
                    </div>
                ))}
            </div>
        ),
    },
    {
        number: '07',
        title: 'Cookies & Tracking',
        content: (
            <>
                <p className="mb-4">
                    We use essential cookies and browser storage to maintain your session. We do not use advertising
                    or cross-site tracking cookies.
                </p>
                <p>
                    Google Analytics sets its own cookies for usage measurement. These are analytics-only and are not
                    used for advertising targeting.
                </p>
            </>
        ),
    },
    {
        number: '08',
        title: 'Children\'s Privacy',
        content: (
            <p>
                Open Market is not directed at children under 13. We do not knowingly collect personal information
                from children under 13. If you believe we have inadvertently collected such information, please
                contact us immediately and we will delete it.
            </p>
        ),
    },
    {
        number: '09',
        title: 'International Data Transfers',
        content: (
            <p>
                Your data may be processed in countries other than your own. Where required, we rely on appropriate
                legal mechanisms for international transfers, including standard contractual clauses or adequacy
                decisions by relevant authorities.
            </p>
        ),
    },
    {
        number: '10',
        title: 'Legal Basis for Processing (GDPR)',
        content: (
            <>
                <p className="mb-4">For users in the European Union, our legal bases for processing are:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                        { basis: 'Contract', detail: 'Operating your account and displaying your listings' },
                        { basis: 'Legitimate interest', detail: 'Product improvement, analytics, and abuse prevention' },
                        { basis: 'Consent', detail: 'Analytics cookies (where consent is required)' },
                        { basis: 'Legal obligation', detail: 'Compliance with applicable law' },
                    ].map(({ basis, detail }) => (
                        <div key={basis} className="bg-blue-50 rounded-lg p-3">
                            <p className="text-sm font-semibold text-primary-color mb-1">{basis}</p>
                            <p className="text-sm text-text-secondary">{detail}</p>
                        </div>
                    ))}
                </div>
            </>
        ),
    },
    {
        number: '11',
        title: 'Changes to This Policy',
        content: (
            <p>
                We may update this Privacy Policy from time to time. For material changes, we will post a notice on
                the platform and announce the update via our{' '}
                <a href="https://bsky.app/profile/openmkt.app" target="_blank" rel="noopener noreferrer" className="text-primary-color hover:underline">
                    Bluesky account
                </a>{' '}
                at least 30 days before they take effect. The &quot;Effective date&quot; at the top of this page will always
                reflect the current version.
            </p>
        ),
    },
    {
        number: '12',
        title: 'Contact',
        content: (
            <>
                <p className="mb-3">
                    For privacy-related inquiries or data requests, contact us at{' '}
                    <a href="mailto:support@openmkt.app" className="text-primary-color hover:underline">
                        support@openmkt.app
                    </a>
                    . We aim to respond within 30 days.
                </p>
                <p>
                    If you are in the EU and have unresolved concerns, you have the right to lodge a complaint with
                    your local data protection supervisory authority.
                </p>
            </>
        ),
    },
];

export default function PrivacyPolicyPage() {
    return (
        <div className="container-custom py-12">
            <div className="max-w-3xl mx-auto">
                <div className="mb-10">
                    <Link href="/" className="text-text-secondary hover:text-primary-color text-sm mb-4 inline-block">
                        ← Back to Home
                    </Link>
                    <h1 className="text-3xl font-bold text-primary-color mb-3">Privacy Policy</h1>
                    <p className="text-text-secondary text-sm">Effective date: {EFFECTIVE_DATE}</p>
                    <div className="mt-5 bg-blue-50 border border-blue-100 rounded-lg p-5">
                        <p className="font-semibold text-text-primary mb-1">Your listings live on your Bluesky PDS — not our servers.</p>
                        <p className="text-text-secondary text-sm">
                            Because Open Market is built on the AT Protocol, the content you publish stays on your own
                            Personal Data Server. We index it for discovery, but we don&apos;t own it and can&apos;t hold it
                            hostage.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {sections.map((section) => (
                        <section
                            key={section.number}
                            className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light"
                        >
                            <div className="flex items-start gap-4">
                                <span className="text-2xl font-bold text-primary-color/30 leading-none mt-0.5 shrink-0 w-8">
                                    {section.number}
                                </span>
                                <div className="min-w-0">
                                    <h2 className="text-lg font-semibold text-text-primary mb-3">{section.title}</h2>
                                    <div className="text-text-secondary text-sm leading-relaxed">
                                        {section.content}
                                    </div>
                                </div>
                            </div>
                        </section>
                    ))}
                </div>

                <div className="mt-10 p-6 bg-blue-50 rounded-lg text-center">
                    <h3 className="text-lg font-semibold text-text-primary mb-2">Questions about your privacy?</h3>
                    <p className="text-text-secondary text-sm mb-4">
                        We&apos;re committed to transparency. If anything here is unclear, just ask.
                    </p>
                    <a
                        href="mailto:support@openmkt.app"
                        className="inline-block bg-white text-primary-color border border-neutral-light px-6 py-2 rounded-lg font-medium hover:bg-neutral-50 transition-colors text-sm"
                    >
                        Contact us
                    </a>
                </div>

                <div className="mt-6 text-center">
                    <Link href="/terms-of-service" className="text-sm font-medium text-primary-color hover:text-primary-light">
                        ← Read our Terms of Service
                    </Link>
                </div>
            </div>
        </div>
    );
}
