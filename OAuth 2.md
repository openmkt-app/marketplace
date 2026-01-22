OAuth 2.1 Authentication Implementation Plan
Overview
Migrate from direct username/password authentication to OAuth 2.1 with PKCE (Proof Key for Code Exchange) for enhanced security and better user experience.

Background
Current System:

Direct login via agent.login(username, password)
Session tokens stored in localStorage
Users enter passwords directly in the app
Target System:

OAuth 2.1 Authorization Code flow with PKCE
Users authenticate on Bluesky's official domain
App never handles passwords
Enhanced security with DPoP (Demonstrating Proof-of-Possession)
Pushed Authorization Requests (PAR) for additional security
User Review Required
IMPORTANT

Breaking Change for Existing Users Users will need to re-authenticate using the new OAuth flow. Existing sessions will be invalidated.

WARNING

Client Metadata Hosting We need to host a public JSON file at https://openmkt.app/.well-known/oauth-client-metadata.json. This requires the file to be accessible via HTTPS.

AT Protocol OAuth Requirements
Based on research, AT Protocol OAuth requires:

Client Metadata Document - Publicly hosted JSON at a well-known URL
PKCE - Mandatory for all clients (RFC 7636)
DPoP - Demonstrating Proof-of-Possession for token requests
PAR - Pushed Authorization Requests for enhanced security
OAuth 2.1 Profile - Authorization Code grant type only
Proposed Changes
Phase 1: Client Metadata Setup
[NEW] .well-known/oauth-client-metadata.json
Create public metadata file describing our OAuth client:

{
  "client_id": "https://openmkt.app/.well-known/oauth-client-metadata.json",
  "client_name": "Open Market",
  "client_uri": "https://openmkt.app",
  "logo_uri": "https://openmkt.app/icon.png",
  "redirect_uris": [
    "https://openmkt.app/oauth/callback"
  ],
  "scope": "atproto transition:generic",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "application_type": "web",
  "dpop_bound_access_tokens": true
}
Implementation:

Host as static file in public/.well-known/ directory
Ensure accessible via HTTPS
Verify CORS headers allow cross-origin access
Phase 2: OAuth Flow Implementation
[NEW] src/lib/oauth-client.ts
New OAuth client to handle:

PKCE code verifier/challenge generation
Authorization URL construction
Token exchange
DPoP proof generation
Token refresh
Key functions:

generatePKCE() - Create code verifier and challenge
getAuthorizationUrl(handle) - Build OAuth authorization URL
exchangeCodeForToken(code, codeVerifier) - Exchange auth code for tokens
refreshAccessToken(refreshToken) - Refresh expired access tokens
generateDPoPProof(url, method) - Create DPoP proof for requests
[NEW] src/app/oauth/callback/page.tsx
OAuth callback handler page:

Receives authorization code from redirect
Retrieves code verifier from sessionStorage
Exchanges code for tokens
Stores tokens securely
Redirects to original destination
[MODIFY] 
src/contexts/AuthContext.tsx
Update authentication context to support both flows:

Add loginWithOAuth(handle) method
Keep existing 
login(username, password)
 for backward compatibility
Update 
resumeSession()
 to handle OAuth tokens
Add token refresh logic
Changes:

// Add OAuth state
const [oauthState, setOAuthState] = useState<{
  codeVerifier?: string;
  state?: string;
  returnTo?: string;
} | null>(null);
// New OAuth login method
const loginWithOAuth = async (handle: string) => {
  const { authUrl, codeVerifier, state } = await oauthClient.getAuthorizationUrl(handle);
  
  // Store PKCE verifier and state in sessionStorage
  sessionStorage.setItem('oauth_verifier', codeVerifier);
  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('oauth_return_to', window.location.pathname);
  
  // Redirect to authorization URL
  window.location.href = authUrl;
};
[MODIFY] 
src/app/login/page.tsx
Update login UI to support OAuth:

Add "Sign in with Bluesky" button (primary)
Keep username/password form (fallback, marked as legacy)
Show OAuth flow explanation
UI Changes:

<button onClick={() => loginWithOAuth(handle)}>
  Sign in with Bluesky (Recommended)
</button>
<details>
  <summary>Or use app password (legacy)</summary>
  {/* Existing username/password form */}
</details>
Phase 3: Token Management
[MODIFY] 
src/lib/marketplace-client.ts
Update to use OAuth tokens:

Accept OAuth access token instead of session data
Add DPoP proof to authenticated requests
Handle token expiration and refresh
Maintain backward compatibility with old session format
Changes:

// Support both auth methods
constructor(
  serviceUrl: string = 'https://bsky.social',
  authToken?: { accessToken: string; tokenType: 'Bearer' | 'DPoP' }
) {
  // Initialize with OAuth token if provided
}
// Add DPoP proof to requests
private async makeAuthenticatedRequest(url: string, options: RequestInit) {
  if (this.tokenType === 'DPoP') {
    const dpopProof = await generateDPoPProof(url, options.method || 'GET');
    options.headers = {
      ...options.headers,
      'DPoP': dpopProof
    };
  }
  return fetch(url, options);
}
Phase 4: Security Enhancements
[NEW] src/lib/dpop.ts
DPoP proof generation utilities:

Generate JWK (JSON Web Key) for DPoP
Create DPoP proof JWT
Sign with private key
Store key pair securely
[NEW] src/lib/crypto-utils.ts
Cryptographic utilities:

PKCE code verifier generation (random 43-128 char string)
Code challenge generation (SHA-256 hash, base64url encoded)
Secure random state generation
JWK generation for DPoP
Verification Plan
Automated Tests
OAuth Flow Test

# Test PKCE generation
npm run test -- oauth-client.test.ts
Client Metadata Validation

# Verify metadata is accessible
curl https://openmkt.app/.well-known/oauth-client-metadata.json
Token Refresh Test

# Test token refresh logic
npm run test -- auth-context.test.ts
Manual Verification
OAuth Login Flow

Click "Sign in with Bluesky"
Verify redirect to bsky.social/oauth/authorize
Authorize the app
Verify successful callback and token storage
Confirm user is logged in
Session Persistence

Log in with OAuth
Refresh the page
Verify session is maintained
Check token refresh works after expiration
Backward Compatibility

Test existing app password login still works
Verify old sessions can be migrated
Chat Notifications

Create a listing with OAuth session
Verify buyer can send DM
Confirm seller receives notification
Migration Strategy
Phase 1: Dual Support (Recommended)
Support both OAuth and password login
Encourage OAuth with UI messaging
Gradually deprecate password login
Phase 2: OAuth Only
After 90 days, remove password login
Force re-authentication for old sessions
Show migration notice
Resources & Documentation
AT Protocol OAuth Docs:

https://atproto.com/specs/oauth
https://github.com/bluesky-social/atproto/tree/main/packages/oauth
Client Metadata Spec:

OAuth 2.0 Dynamic Client Registration Protocol
AT Protocol Client Metadata Extensions
Example Implementation:

Smoke Signal Events: https://auth.smokesignal.events/oauth-client-metadata.json
Next Steps
⏳ Create feature branch
⏳ Research OAuth requirements
⏳ Create client metadata file
⏳ Implement OAuth client library
⏳ Update AuthContext for OAuth
⏳ Create OAuth callback handler
⏳ Update login UI
⏳ Test OAuth flow
⏳ Deploy and verify