import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Terms of Service — Open Market',
    description: 'Terms of Service for Open Market (openmkt.app), the Bluesky commerce aggregator.',
    alternates: {
        canonical: '/terms-of-service',
    },
};

const EFFECTIVE_DATE = 'April 21, 2025';

const sections = [
    {
        number: '01',
        title: 'Acceptance of Terms',
        content: (
            <p>
                By accessing or using Open Market at openmkt.app (&quot;the Service&quot;), you agree to be bound by these
                Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, do not use the Service. These Terms
                apply to all visitors, registered users, buyers, and sellers.
            </p>
        ),
    },
    {
        number: '02',
        title: 'Description of Service',
        content: (
            <>
                <p className="mb-4">
                    Open Market is a free, decentralized commerce discovery platform built on the{' '}
                    <a href="https://atproto.com" target="_blank" rel="noopener noreferrer" className="text-primary-color hover:underline">
                        AT Protocol
                    </a>
                    . It allows users with a Bluesky account to create and browse marketplace listings, run storefronts,
                    and connect with buyers and sellers in the Bluesky community.
                </p>
                <p className="mb-4">
                    Key characteristics of the Service:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-text-secondary">
                    <li>Listings are published as ATProto records to your Personal Data Server (PDS) — your data remains under your control.</li>
                    <li>Open Market indexes and displays those records as a discovery layer; it does not own or warehouse your listings.</li>
                    <li>The Service does not process payments. All transactions happen directly between buyers and sellers.</li>
                    <li>Authentication is handled entirely by Bluesky&apos;s OAuth flow. We never receive or store your password.</li>
                    <li>The Gallery feature allows artists to advertise commission services through their Bluesky-linked storefront.</li>
                </ul>
            </>
        ),
    },
    {
        number: '03',
        title: 'Eligibility & Account',
        content: (
            <>
                <p className="mb-4">
                    To create listings or manage a storefront, you must have a valid Bluesky account. You are responsible
                    for maintaining the security of your Bluesky credentials and for all activity that occurs under your
                    account. You must be of legal age in your jurisdiction to enter into binding agreements.
                </p>
                <p>
                    We reserve the right to suspend or terminate access for any account that violates these Terms or
                    engages in harmful, fraudulent, or illegal activity on the platform.
                </p>
            </>
        ),
    },
    {
        number: '04',
        title: 'Listings & Content',
        content: (
            <>
                <p className="mb-4">
                    You are solely responsible for the content of your listings, storefront, and any communications with
                    other users. By publishing content through Open Market you represent that:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-text-secondary mb-4">
                    <li>You have the right to sell or advertise the item or service described.</li>
                    <li>The listing is accurate, not misleading, and complies with applicable laws.</li>
                    <li>The content does not infringe on any third-party intellectual property rights.</li>
                    <li>The content does not contain illegal, hateful, or explicitly adult material.</li>
                </ul>
                <p>
                    We reserve the right to remove or de-index any listing that violates these Terms or our community
                    guidelines, without prior notice.
                </p>
            </>
        ),
    },
    {
        number: '05',
        title: 'Transactions & Payments',
        content: (
            <>
                <p className="mb-4">
                    Open Market is a discovery and listing platform only. We are not a party to any transaction between
                    buyers and sellers. We do not process, hold, escrow, or guarantee any payment.
                </p>
                <p className="mb-4">
                    All payment arrangements, shipping, delivery, returns, and dispute resolution are the sole
                    responsibility of the buyer and seller involved. We strongly encourage reviewing our{' '}
                    <Link href="/community/safety" className="text-primary-color hover:underline">
                        Safety Tips
                    </Link>{' '}
                    and{' '}
                    <Link href="/community/seller-guide" className="text-primary-color hover:underline">
                        Seller Guide
                    </Link>{' '}
                    before completing any transaction.
                </p>
                <p>
                    We are not liable for any loss, fraud, or dispute arising from transactions facilitated through the
                    platform.
                </p>
            </>
        ),
    },
    {
        number: '06',
        title: 'Data & Privacy',
        content: (
            <>
                <p className="mb-4">
                    Because Open Market is built on the AT Protocol, listing content is published to and stored on your
                    Bluesky PDS — not on our servers. Deleting a listing from Open Market removes it from our index; the
                    underlying ATProto record on your PDS is managed through your Bluesky account.
                </p>
                <p className="mb-4">
                    We collect minimal operational data necessary to run the Service, such as session information and
                    aggregate usage analytics. We do not sell your personal data to third parties.
                </p>
                <p>
                    Our full collection and use practices are described in our{' '}
                    <Link href="/privacy-policy" className="text-primary-color hover:underline">
                        Privacy Policy
                    </Link>
                    .
                </p>
            </>
        ),
    },
    {
        number: '07',
        title: 'AT Protocol Dependency',
        content: (
            <p>
                The Service depends on the AT Protocol and Bluesky infrastructure. We are not affiliated with or
                endorsed by Bluesky PBLLC. Availability of the Service may be affected by changes to the AT Protocol,
                Bluesky&apos;s PDS infrastructure, or their terms of service. We will make reasonable efforts to communicate
                any material disruptions, but we cannot guarantee uninterrupted access.
            </p>
        ),
    },
    {
        number: '08',
        title: 'Prohibited Conduct',
        content: (
            <>
                <p className="mb-4">You agree not to:</p>
                <ul className="list-disc pl-5 space-y-2 text-text-secondary">
                    <li>Post fraudulent, deceptive, or counterfeit listings.</li>
                    <li>Scrape, harvest, or otherwise extract data from the platform in bulk without permission.</li>
                    <li>Attempt to circumvent, disable, or interfere with security features of the Service.</li>
                    <li>Use the Service to spam, harass, or threaten other users.</li>
                    <li>Impersonate another person or entity.</li>
                    <li>Use the Service for any unlawful purpose or in violation of any applicable regulation.</li>
                </ul>
            </>
        ),
    },
    {
        number: '09',
        title: 'Intellectual Property',
        content: (
            <p>
                The Open Market name, logo, and site design are our intellectual property. Content you publish through
                the Service remains yours. By using the Service, you grant us a limited, non-exclusive license to
                display, index, and cache your public listing content for the purpose of operating the platform. This
                license ends when you remove the listing.
            </p>
        ),
    },
    {
        number: '10',
        title: 'Disclaimer of Warranties',
        content: (
            <p className="uppercase text-sm leading-relaxed">
                The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranty of any kind. We disclaim all
                warranties, express or implied, including but not limited to warranties of merchantability, fitness for
                a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted,
                error-free, or free of harmful components.
            </p>
        ),
    },
    {
        number: '11',
        title: 'Limitation of Liability',
        content: (
            <p className="uppercase text-sm leading-relaxed">
                To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special,
                consequential, or punitive damages, including but not limited to loss of data, loss of profits, or
                losses arising from transactions between users, arising out of or related to your use of the Service.
            </p>
        ),
    },
    {
        number: '12',
        title: 'Indemnification',
        content: (
            <p>
                You agree to indemnify and hold harmless Open Market and its operators from any claims, damages,
                losses, or expenses (including reasonable legal fees) arising from your use of the Service, your
                listings or content, your transactions with other users, or your violation of these Terms.
            </p>
        ),
    },
    {
        number: '13',
        title: 'Termination',
        content: (
            <p>
                You may stop using the Service at any time. Because your listing data is stored on the AT Protocol,
                deleting your Bluesky account or removing your records will remove your content from our index. We may
                suspend or terminate your access to the Service immediately if you violate these Terms, with or without
                notice.
            </p>
        ),
    },
    {
        number: '14',
        title: 'Governing Law',
        content: (
            <p>
                These Terms are governed by applicable law, without regard to conflict of law principles. Any disputes
                arising under these Terms shall be resolved in accordance with applicable jurisdiction.
            </p>
        ),
    },
    {
        number: '15',
        title: 'Changes to Terms',
        content: (
            <p>
                We reserve the right to update these Terms at any time. For material changes, we will post a notice on
                the platform and, where reasonably possible, announce the change via our{' '}
                <a href="https://bsky.app/profile/openmkt.app" target="_blank" rel="noopener noreferrer" className="text-primary-color hover:underline">
                    Bluesky account
                </a>
                . Continued use of the Service after the effective date of changes constitutes acceptance of the
                updated Terms.
            </p>
        ),
    },
    {
        number: '16',
        title: 'Contact',
        content: (
            <p>
                Questions about these Terms? Reach us at{' '}
                <a href="mailto:support@openmkt.app" className="text-primary-color hover:underline">
                    support@openmkt.app
                </a>
                .
            </p>
        ),
    },
];

export default function TermsOfServicePage() {
    return (
        <div className="container-custom py-12">
            <div className="max-w-3xl mx-auto">
                <div className="mb-10">
                    <Link href="/" className="text-text-secondary hover:text-primary-color text-sm mb-4 inline-block">
                        ← Back to Home
                    </Link>
                    <h1 className="text-3xl font-bold text-primary-color mb-3">Terms of Service</h1>
                    <p className="text-text-secondary text-sm">Effective date: {EFFECTIVE_DATE}</p>
                    <p className="text-text-secondary text-lg mt-4">
                        These Terms govern your use of Open Market, the free and decentralized commerce discovery
                        platform built on the AT Protocol. Please read them carefully.
                    </p>
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
                    <h3 className="text-lg font-semibold text-text-primary mb-2">Have a question or concern?</h3>
                    <p className="text-text-secondary text-sm mb-4">
                        We&apos;re a small, open project and we take your questions seriously.
                    </p>
                    <a
                        href="mailto:support@openmkt.app"
                        className="inline-block bg-white text-primary-color border border-neutral-light px-6 py-2 rounded-lg font-medium hover:bg-neutral-50 transition-colors text-sm"
                    >
                        Contact us
                    </a>
                </div>

                <div className="mt-6 text-center">
                    <Link href="/privacy-policy" className="text-sm font-medium text-primary-color hover:text-primary-light">
                        Read our Privacy Policy →
                    </Link>
                </div>
            </div>
        </div>
    );
}
