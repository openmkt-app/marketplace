# AT Protocol Marketplace Project Tracker

## Project Overview
A local marketplace application built on the AT Protocol (Authenticated Transfer Protocol), allowing users to buy and sell items within their communities.

## Features to Implement

### Authentication
- [x] Implement login functionality with AT Protocol credentials
- [x] Create persistent session management
- [x] Add logout functionality
- [x] Display current user information in header/navbar
- [x] Handle authentication errors appropriately
- [x] Add registration guidance for new users

### Browsing Listings
- [x] Create browsing interface with filters
- [x] Implement location-based search (state, county, city)
- [x] Add category filtering
- [x] Create listing card components
- [ ] Implement pagination for listing results
- [ ] Add sorting options (price, date posted, etc.)
- [x] Create loading states for async operations

### Listing Details
- [x] Create detailed view for individual listings
- [x] Display listing images in a gallery/carousel
- [x] Show seller information
- [x] Display location information
- [x] Add condition and category badges
- [x] Implement contact seller functionality
- [ ] Add share listing option

### User Profile
- [x] Create profile page template
- [x] Display user's active listings
- [ ] Allow editing of profile information
- [ ] Show user reputation/feedback (future)
- [ ] Implement user-specific settings
- [x] Add listing management for user's posts

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
