// src/lib/listing-hashtags.ts
//
// The hashtags a listing gets when it is announced on Bluesky. Two accounts
// post about the same listing — the seller, from their own share, and the
// @openmkt.app bot — and they should reach the same tag feeds. The map used to
// live inside marketplace-client.ts, where the bot could not reach it, which is
// how the bot post ended up with no tags at all.

/** Two tags per category: the broad feed, then the one enthusiasts follow. */
const CATEGORY_HASHTAGS: Record<string, string> = {
  antiques: '#Antiques #Vintage',
  apparel: '#Fashion #Thrifting',
  auto: '#CarParts #ProjectCar',
  baby: '#BabyGear #Parenting',
  books: '#BookSky #Books',
  business: '#SmallBiz #Office',
  cameras: '#Photography #CameraGear',
  cell_phones: '#Tech #Mobile',
  collectibles: '#Collectibles #RareFinds',
  computers: '#Tech #HomeLab',
  digital: '#Software #DigitalGoods',
  digital_arts: '#ArtSky #Commissions',
  electronics: '#Tech #Gadgets',
  entertainment: '#BoardGames #Fun',
  free: '#FreeStuff #Giving',
  furniture: '#Furniture #InteriorDesign',
  garden: '#Gardening #PlantSky',
  health: '#Wellness #SelfCare',
  hobbies: '#Hobbies #Crafts',
  home_goods: '#HomeDecor #ThriftFinds',
  home_improvement: '#DIY #Renovation',
  kids: '#Kids #Toys',
  musical: '#Musicians #GearTalk',
  office: '#RemoteWork #Office',
  pets: '#PetSky #Pets',
  sporting: '#Sports #Outdoors',
  video_games: '#Gaming #RetroGaming',
  other: '#Misc',
};

export type HashtagOptions = {
  /** A price of zero. #ForSale on a giveaway sends buyers to the wrong place. */
  isFree?: boolean;
  /** A storefront item rather than someone clearing out a spare room. */
  isOnlineStore?: boolean;
};

/**
 * The tags for one listing, always led by #OpenMarket.
 *
 * Returned as an array so a caller can drop the tail if it runs out of room in
 * a post; the first entry is the one that must survive.
 */
export function buildListingHashtags(
  category: string | undefined,
  { isFree = false, isOnlineStore = false }: HashtagOptions = {},
): string[] {
  const tags = ['#OpenMarket'];

  const categoryTags = category ? CATEGORY_HASHTAGS[category] : undefined;
  if (categoryTags) tags.push(categoryTags);

  // A shop listing is already covered by its category tags, and #ForSale on a
  // storefront reads as a classified ad.
  if (!isFree && !isOnlineStore) tags.push('#ForSale');

  return tags;
}
