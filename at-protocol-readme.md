# AT Protocol Marketplace

A local marketplace application built on the AT Protocol, allowing users to buy and sell items within their communities.

## Project Overview

This project demonstrates how to build a marketplace application using the Authenticated Transfer Protocol (AT Protocol), the technology behind Bluesky. The application enables users to:

1. Create listings for items they want to sell
2. Browse listings by location (state, county, city/town/village)
3. Contact sellers about items
4. All while maintaining privacy and leveraging the decentralized nature of AT Protocol

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm (v8 or later)
- A Bluesky account (for testing)

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/at-marketplace.git
   cd at-marketplace
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file with your configuration:
   ```
   NEXT_PUBLIC_ATP_SERVICE=https://bsky.social
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) to view the application

## Project Structure

```
at-marketplace/
├── lexicons/               # AT Protocol custom lexicons
│   └── com/example/marketplace/
│       └── listing.json    # Marketplace listing lexicon
├── scripts/                # Helper scripts
│   └── validate-lexicon.js # Lexicon validation script
├── src/
│   ├── app/                # Next.js app router
│   ├── components/         # React components
│   ├── lib/                # Utility functions and client
│   │   └── marketplace-client.ts  # AT Protocol client
│   └── types/              # TypeScript type definitions
└── public/                 # Static assets
```

## Custom Lexicon

This project defines a custom AT Protocol lexicon for marketplace listings. The lexicon defines the schema for:

- Basic item information (title, description, price)
- Location data at the county and city/town level
- Image attachments
- Categories and condition information

The lexicon is defined in `lexicons/com/example/marketplace/listing.json`.

## Development Guide

### Understanding the AT Protocol

The AT Protocol is a decentralized social networking protocol with several key features relevant to our marketplace:

1. **Decentralized Identity (DID)**: Users have portable identities
2. **Repository (Repo)**: Each user has a repo containing their data
3. **Collections**: Different types of data are organized into collections
4. **Lexicons**: Schema definitions that describe data models
5. **Blobs**: Binary attachments like images

### Working with Custom Lexicons

To create a custom lexicon:

1. Define your lexicon JSON schema in the `lexicons` directory
2. Validate it with `npm run lexicon:validate`
3. Use it in your code to create and query records

### Creating Listings

The `MarketplaceClient` class handles creating listings:

```typescript
const client = new MarketplaceClient();
await client.login('username', 'password');

await client.createListing({
  title: 'Vintage Chair',
  description: 'Mid-century modern chair in excellent condition',
  price: '75',
  location: {
    state: 'California',
    county: 'Los Angeles',
    locality: 'Pasadena',
    zipPrefix: '910'
  },
  category: 'furniture',
  condition: 'good'
});
```

### Finding Listings by Location

```typescript
const listings = await client.getListingsByLocation(
  'California',
  'Los Angeles',
  'Pasadena'
);
```

## Limitations and Future Improvements

- **Search and Discovery**: The AT Protocol's current search capabilities are limited. This implementation uses a simplified approach that would need to be improved as the protocol evolves.
- **Messaging**: Direct messaging between users for negotiations would need to be implemented.
- **Trust Mechanisms**: Additional features for user ratings and verification could be added.
- **Notifications**: Real-time notifications for new listings or messages.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
