import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// The DID of the feed generator service (served at /.well-known/did.json)
const FEED_GENERATOR_DID = 'did:web:openmkt.app';

// The bot account DID — this is where the app.bsky.feed.generator records live
const BOT_ACCOUNT_DID = 'did:plc:ma37sd3y64o4j7pl57mwn7lb';

export async function GET() {
  return NextResponse.json(
    {
      did: FEED_GENERATOR_DID,
      feeds: [
        { uri: `at://${BOT_ACCOUNT_DID}/app.bsky.feed.generator/all` },
      ],
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
