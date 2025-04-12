# AT Protocol Marketplace Project Tracker

## Project Overview
A local marketplace application built on the AT Protocol (Authenticated Transfer Protocol), allowing users to buy and sell items within their communities.

## Features to Implement

### Authentication
- [ ] Implement login functionality with AT Protocol credentials
- [ ] Create persistent session management
- [ ] Add logout functionality
- [ ] Display current user information in header/navbar
- [ ] Handle authentication errors appropriately
- [ ] Add registration guidance for new users

### Browsing Listings
- [ ] Create browsing interface with filters
- [ ] Implement location-based search (state, county, city)
- [ ] Add category filtering
- [ ] Create listing card components
- [ ] Implement pagination for listing results
- [ ] Add sorting options (price, date posted, etc.)
- [ ] Create loading states for async operations

### Listing Details
- [ ] Create detailed view for individual listings
- [ ] Display listing images in a gallery/carousel
- [ ] Show seller information
- [ ] Display location information
- [ ] Add condition and category badges
- [ ] Implement contact seller functionality
- [ ] Add share listing option

### User Profile
- [ ] Create profile page template
- [ ] Display user's active listings
- [ ] Allow editing of profile information
- [ ] Show user reputation/feedback (future)
- [ ] Implement user-specific settings
- [ ] Add listing management for user's posts

### Additional Features (Future)
- [ ] Image upload and management
- [ ] In-app messaging system
- [ ] Favorites/saved listings
- [ ] Notifications
- [ ] Mobile responsiveness improvements
- [ ] User reputation system

## Development Roadmap

### Phase 1: Core Authentication & Listing Creation
- Implement login/logout functionality
- Complete the listing creation form
- Set up basic navigation structure

### Phase 2: Browsing & Search
- Develop the browsing interface
- Implement location and category filters
- Create listing cards and results view

### Phase 3: Listing Details & User Profiles
- Build the listing detail view
- Implement user profiles
- Add contact functionality

### Phase 4: Polish & Additional Features
- Improve UI/UX throughout the application
- Add image management capabilities
- Implement optional features from the additional list

## AT Protocol Integration Notes

- Use BskyAgent from @atproto/api for authentication
- Store listings using com.example.marketplace.listing lexicon
- Implement location-based queries using available AT Protocol search methods
- Utilize repository pattern for data access

## Resources
- AT Protocol Documentation: https://atproto.com/docs
- Bluesky Social: https://bsky.app
- Custom Lexicon Reference: lexicons/com/example/marketplace/listing.json
