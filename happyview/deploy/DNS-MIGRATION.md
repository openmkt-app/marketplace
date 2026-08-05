# Moving openmkt.app DNS from Netlify to Cloudflare

Needed so a Cloudflare named tunnel can serve `appview.openmkt.app` from the
NAS. A tunnel requires the whole zone at Cloudflare — you cannot CNAME to
`cfargotunnel.com` from external DNS, because that name only resolves through
Cloudflare's proxy.

Namecheap is only the registrar. DNS is currently served by Netlify (NS1).

## Current records — snapshot taken 2026-08-05

Verify every one of these exists at Cloudflare **before** switching nameservers.
Cloudflare's onboarding scan usually finds them, but it is not guaranteed.

| Name | Type | Value | Why it matters |
|---|---|---|---|
| `@` | A | `18.208.88.157`, `98.84.224.111` | The live site. Netlify's shared load balancers — replace with a CNAME, see below |
| `www` | A | same two IPs | Same |
| `@` | MX | `10 mx1.improvmx.com`, `10 mx2.improvmx.com` | **Email forwarding.** Miss this and mail to the domain silently stops |
| `@` | TXT | `v=spf1 include:spf.improvmx.com ~all` | SPF. Miss it and forwarded mail starts failing authentication |
| `@` | TXT | `google-site-verification=UbxM-0jRZOMG65PEHtbTSWJqxAYb96e95cOSu5W9pM4` | Search Console ownership |
| `_atproto` | TXT | `did=did:plc:ma37sd3y64o4j7pl57mwn7lb` | **The bot's handle verification.** Lose it and `openmkt.app` stops resolving as an atproto handle — seller registration, the follow graph, and the feed generator identity all break |

No DKIM, no DMARC, no other subdomains. The zone is small.

The two records people actually lose are **MX** and **`_atproto`**. Neither
fails loudly: email just stops arriving, and the handle just stops resolving.

## Improve the apex while migrating

Do not copy the A records. Those are Netlify's shared IPs and can change without
notice. Use Cloudflare's CNAME flattening at the apex instead:

```
@     CNAME  <your-site>.netlify.app   (DNS only)
www   CNAME  <your-site>.netlify.app   (DNS only)
```

Get `<your-site>` from the Netlify dashboard. This is what Netlify recommends
for external DNS and it survives their infrastructure changes.

## Proxy settings — this catches people out

| Record | Cloudflare mode |
|---|---|
| `@`, `www` (Netlify) | **DNS only** (grey cloud) |
| `appview` (tunnel) | **Proxied** (orange cloud) — required, a tunnel cannot work unproxied |

Leave the Netlify records unproxied. Proxying puts Cloudflare's CDN in front of
Netlify's, which is redundant and can interfere with Netlify's automatic
Let's Encrypt renewal (HTTP-01 validation).

## Steps

1. **Add the zone at Cloudflare.** Free plan. Let it scan, then check every row
   in the snapshot table above is present. Add anything missing by hand.

2. **Replace the apex/www A records with CNAMEs** as above. Set both to DNS only.

3. **Verify against Cloudflare's nameservers before switching anything.** This
   is the step that makes the migration safe — you are testing the new config
   while the old one is still authoritative:

   ```bash
   NS=<one of the cloudflare nameservers>
   dig @$NS openmkt.app A
   dig @$NS openmkt.app MX
   dig @$NS openmkt.app TXT
   dig @$NS _atproto.openmkt.app TXT
   dig @$NS www.openmkt.app
   ```

   Every answer must match the snapshot. Do not proceed until they do.

4. **Switch nameservers at Namecheap** to the two Cloudflare ones. Propagation
   is usually minutes, occasionally hours.

5. **Do not delete the Netlify DNS zone for at least a week.** While resolvers
   still hold the old nameservers, Netlify keeps answering. Deleting it early is
   what turns a slow propagation into an outage.

6. **Confirm afterwards:**

   ```bash
   dig +short NS openmkt.app                    # cloudflare
   curl -sI https://openmkt.app | head -1       # 200
   dig +short TXT _atproto.openmkt.app          # the bot DID, unchanged
   dig +short MX openmkt.app                    # improvmx
   ```

   Also send a test email to an address on the domain — SPF and MX problems do
   not show up any other way.

## Then: the tunnel

Once DNS is at Cloudflare:

1. Zero Trust → Networks → Tunnels → create a tunnel, copy the token.
2. Public hostname: `appview.openmkt.app` → `http://happyview:3000`
   (the service name inside the compose network).
3. Put the token in `.env` as `CLOUDFLARE_TUNNEL_TOKEN` and start the stack.

No port forwarding, and the NAS's IP is never exposed.

## Rollback

Change the nameservers at Namecheap back to:

```
dns1.p08.nsone.net
dns2.p08.nsone.net
dns3.p08.nsone.net
dns4.p08.nsone.net
```

This works only while the Netlify DNS zone still exists — which is the reason
for step 5.
