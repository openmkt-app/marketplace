/* eslint-disable @next/next/no-img-element -- This file is not rendered by a
   browser. satori turns the JSX below into a raster image on the server, and it
   understands a plain <img> and nothing else; next/image would emit markup it
   cannot read. The rule's advice about LCP does not apply to a PNG being drawn
   in a server function. */
// src/lib/og/listing-card.tsx
//
// The branded card image the bot attaches to an announcement.
//
// Bluesky renders an external embed's thumbnail large and above the fold, and
// that image is the only part of the card we control completely — the AppView
// decides everything else. A raw product photo wastes it: it says nothing about
// price, nothing about where the link goes, and nothing about Open Market.
//
// The layout is a split: product on the left, facts on the right. Two other
// layouts were built and rejected against real listings — both put type over
// the photo, and neither survived a portrait phone shot and a square logo. The
// panel is why this one does: nothing legible depends on what was photographed.

import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fetchListingById } from '@/lib/server/fetch-listing';
import { formatPrice } from '@/lib/price-utils';
import { formatConditionForDisplay } from '@/lib/condition-utils';
import { getCategoryName } from '@/lib/category-utils';

// 3:2. Taller than the 1.91:1 OG default on purpose — Bluesky honours the
// aspect ratio, so a taller card simply occupies more of the timeline.
const WIDTH = 1200;
const HEIGHT = 800;
const PANEL = 580;
const PHOTO = WIDTH - PANEL;

const BRAND = '#0A6EA6';
const CANVAS = '#EFF5FF';
const INK = '#111827';
const MUTED = '#4B5563';

const assetDir = process.cwd();

async function fonts() {
  const [regular, bold] = await Promise.all([
    readFile(join(assetDir, 'src/lib/og/fonts/Inter-Regular.ttf')),
    readFile(join(assetDir, 'src/lib/og/fonts/Inter-Bold.ttf')),
  ]);
  return [
    { name: 'Inter', data: regular, weight: 400 as const, style: 'normal' as const },
    { name: 'Inter', data: bold, weight: 700 as const, style: 'normal' as const },
  ];
}

/** The app icon, inlined — satori cannot reach a relative URL. */
async function markDataUri() {
  const bytes = await readFile(join(assetDir, 'public/icon-512.png'));
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

type CardData = {
  title: string;
  description: string;
  price: string;
  originalPrice?: string;
  category: string;
  condition: string;
  image?: string;
  /** Aspect ratio of the source image, so the layout can avoid cropping art. */
  imageAspect?: number;
  cta: string;
};

function truncate(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Width and height straight out of the file header.
 *
 * A product photo fills its frame beautifully; a logo or a piece of artwork
 * cropped to the same frame loses its edges and reads as a mistake. Knowing the
 * real aspect ratio is what lets the layout choose. Returns undefined on
 * anything it cannot parse, and the caller falls back to filling the frame.
 */
async function imageAspectRatio(url: string): Promise<number | undefined> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());

    // PNG: IHDR is always the first chunk, width/height at a fixed offset.
    if (buf.length > 24 && buf.toString('ascii', 1, 4) === 'PNG') {
      return buf.readUInt32BE(16) / buf.readUInt32BE(20);
    }

    // JPEG: walk the marker segments to the start-of-frame, which carries the
    // dimensions. Everything else is skipped by its own length field.
    if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i < buf.length - 9) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        // SOF0..SOF15, excluding the markers in that range that are not frames.
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return buf.readUInt16BE(i + 7) / buf.readUInt16BE(i + 5);
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
  } catch {
    // Unreadable header — fill the frame, as before.
  }
  return undefined;
}

/**
 * Fill the frame when the image is close to the frame's shape, letterbox when
 * it is not. 0.2 rather than something looser because a square image in this
 * frame is off by 0.33, and squares are exactly the case worth letterboxing —
 * logos and artwork arrive square.
 */
function fitFor(aspect: number | undefined, frameAspect: number): 'cover' | 'contain' {
  if (!aspect) return 'cover';
  return Math.abs(aspect - frameAspect) / frameAspect > 0.2 ? 'contain' : 'cover';
}

async function loadCard(uri: string): Promise<CardData> {
  const listing = await fetchListingById(uri);
  if (!listing || listing === 'removed') throw new Error('listing not found');

  const l = listing as typeof listing & {
    noPrice?: boolean;
    acceptingOffers?: boolean;
    condition?: string;
  };

  const amount = parseFloat(l.price || '0');
  const isFree = !l.noPrice && !l.acceptingOffers && amount === 0;
  const price = l.noPrice
    ? 'Make an offer'
    : isFree
      ? 'Free'
      : formatPrice(l.price, l.currency || 'USD');

  // Condition is worth saying about a used bicycle and says nothing about a
  // software licence, which is never anything but new.
  const showCondition =
    l.type !== 'digital' && l.type !== 'service' && l.condition && l.condition !== 'new';

  const image = l.formattedImages?.[0]?.fullsize;

  return {
    title: truncate(l.title || 'Listing', 90),
    description: truncate((l.description || '').replace(/\s+/g, ' ').trim(), 140),
    price,
    originalPrice:
      l.isOnSale && l.originalPrice ? formatPrice(l.originalPrice, l.currency || 'USD') : undefined,
    category: getCategoryName(l.category || ''),
    condition: showCondition ? formatConditionForDisplay(l.condition as string) : '',
    image,
    imageAspect: image ? await imageAspectRatio(image) : undefined,
    cta: l.noPrice ? 'Make an offer' : isFree ? 'Get it free' : 'Buy now',
  };
}

function Card({ d, mark }: { d: CardData; mark: string }) {
  return (
    <div style={{ display: 'flex', width: WIDTH, height: HEIGHT, background: '#FFFFFF' }}>
      <div
        style={{
          display: 'flex',
          width: PHOTO,
          height: HEIGHT,
          background: CANVAS,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {d.image ? (
          <img
            src={d.image}
            width={PHOTO}
            height={HEIGHT}
            style={{ objectFit: fitFor(d.imageAspect, PHOTO / HEIGHT) }}
          />
        ) : (
          <img src={mark} width={200} height={200} style={{ opacity: 0.4, borderRadius: 32 }} />
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: PANEL,
          height: HEIGHT,
          padding: 54,
          justifyContent: 'space-between',
        }}
      >
        {/* Centred rather than top-aligned: a listing with nothing to say under
            the price left a hole above the button when this block was pinned up. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, flex: 1, justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src={mark} width={44} height={44} style={{ borderRadius: 11 }} />
            <span style={{ fontSize: 24, fontWeight: 700, color: BRAND, letterSpacing: 2 }}>OPEN MARKET</span>
          </div>

          <span style={{ fontSize: 22, fontWeight: 700, color: MUTED, letterSpacing: 1.5 }}>
            {d.category.toUpperCase()}
          </span>

          <span style={{ fontSize: 44, fontWeight: 700, color: INK, lineHeight: 1.15 }}>
            {truncate(d.title, 70)}
          </span>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <span style={{ fontSize: 64, fontWeight: 700, color: BRAND }}>{d.price}</span>
            {d.originalPrice && (
              <span style={{ fontSize: 30, color: MUTED, textDecoration: 'line-through' }}>
                {d.originalPrice}
              </span>
            )}
          </div>

          {d.condition && <span style={{ fontSize: 26, color: MUTED }}>{d.condition}</span>}

          {/* The description exists to fill the panel when a listing is thin on
              facts, not to compete for it. A title past two lines already fills
              the space, and printing both ran the text under the button. */}
          {d.description && d.title.length <= 34 && (
            <span style={{ fontSize: 25, color: MUTED, lineHeight: 1.35 }}>
              {truncate(d.description, 110)}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              background: BRAND,
              borderRadius: 16,
              padding: '24px 0',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 30, fontWeight: 700, color: '#FFFFFF' }}>{d.cta} →</span>
          </div>
          <span style={{ fontSize: 24, color: MUTED, textAlign: 'center' }}>openmkt.app</span>
        </div>
      </div>
    </div>
  );
}

/**
 * The rendered card as a JPEG, ready to upload as a blob.
 *
 * The renderer only emits PNG, and half this card is a photograph — the guitar
 * listing came out at 1.39MB, well past the 1MB an embed thumbnail is allowed.
 * Shrinking the canvas is not a fix: it drops the same photo to 646KB, which
 * one busier photo would blow through. Re-encoding holds the full 1200x800 at
 * around 120–200KB, so the cap stops being something to worry about.
 */
export async function renderListingCard(uri: string): Promise<Uint8Array> {
  const [d, mark, fontList] = await Promise.all([loadCard(uri), markDataUri(), fonts()]);

  const response = new ImageResponse(<Card d={d} mark={mark} />, {
    width: WIDTH,
    height: HEIGHT,
    fonts: fontList,
  });

  const png = Buffer.from(await response.arrayBuffer());

  // Imported here rather than at module scope so that the rest of this file —
  // and anything that imports it — does not pull in a native binary it may not
  // need. The caller falls back to the product photo if this throws.
  const { default: sharp } = await import('sharp');
  const jpeg = await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toBuffer();

  return new Uint8Array(jpeg);
}
