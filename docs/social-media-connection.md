# Social Media Connection — Manager Brief

## Purpose

This document explains how our product uses social media and advertising platform connections. It is written for sharing with leadership — what the feature does, how it works for customers, what is live today, and what is still upcoming.

---

## What this feature is (and is not)

**It is:** a way for each organisation to connect their advertising accounts so paid leads from social platforms flow automatically into our CRM, with source and campaign details attached.

**It is not:** a social media posting tool, inbox, or chat manager. We do not publish posts or handle DMs through this module.

In simple terms:

1. Customer connects their Facebook / Instagram / WhatsApp / Google Ads account
2. System stores the connection securely for that organisation
3. When someone fills a Lead Ad form, the lead appears in our Lead Center
4. Marketing screens show which sources and campaigns those leads came from

---

## Platforms we support

| Platform | Can customer connect? | Do leads enter CRM automatically? | Campaign spend / metrics sync? |
| --- | --- | --- | --- |
| Facebook (Meta) | Yes | Yes — fully working | Not yet (connection health only) |
| Instagram | Yes (same Meta login) | Same Facebook lead path today | Not yet |
| WhatsApp | Yes (same Meta login) | Connection only for now | Not yet |
| Google Ads | Yes | Not yet | Not yet (login only) |

Platforms can be turned on or off per organisation by Super Admin, so we control who gets which integrations.

---

## How it works for the customer

### Step 1 — Connect

- Customer goes to **Marketing → Connected Apps**
- Clicks **Connect** on Facebook, Instagram, WhatsApp, or Google Ads
- Completes the platform’s official login/permission screen
- Their Facebook Pages (for Meta family) are linked to the organisation

There is also a manual fallback: paste a Page access token if OAuth cannot be used (useful for local or restricted setups).

### Step 2 — Optional project mapping

- After connect, customer can link the connection to a default project
- New leads from that Page can then be auto-assigned to sales agents on that project

### Step 3 — Lead arrives automatically

When someone submits a Facebook / Instagram Lead Ad form on a connected Page:

1. Meta notifies our system in real time
2. We securely verify the notification
3. We fetch the lead details (name, phone, email, form answers, campaign/ad info)
4. We create a CRM lead (no duplicates if the same lead is sent twice)
5. The lead shows Source = Facebook, Medium = Paid Social, plus campaign / ad set / ad names when available

Website forms separately capture UTM and click IDs (Facebook click ID, Google click ID), so organic and paid web leads also keep attribution.

---

## Where customers see this in the product

| Area | What they use it for |
| --- | --- |
| Marketing dashboard | High-level view of connected apps and lead performance |
| Connected Apps | Connect, sync, disconnect platforms |
| Platform detail screen | Manage tokens, project mapping, connection status |
| Sync logs | See connection and sync activity |
| Campaigns / Sources / UTM screens | Reporting and guidance on attribution |
| Lead Center | Actual leads with source, platform, campaign fields |
| Settings → CRM (and project Integrations) | Older Meta Lead Ads card (still available; Connected Apps is preferred) |
| Super Admin Marketing / Attribution | Enable platforms, manage org access, rename attribution labels |

---

## What is live today

- Facebook Lead Ads connect via official login or manual token
- Automatic lead capture into CRM with campaign attribution
- Duplicate protection (same Meta lead is not created twice)
- Optional project linking and sales assignment
- Instagram and WhatsApp appear as connectable apps (share Meta login)
- Google Ads login/connect (stores connection; no lead or spend sync yet)
- Super Admin control over which platforms each org can use
- Periodic health sync (keeps Meta lead subscription active)

---

## What is not live yet (important for expectations)

- No import of old/historical leads after first connect (only new leads from the moment of connection)
- No in-app picker to choose a specific Page or Lead Form (all authorised Pages are linked)
- Instagram and WhatsApp leads are not yet labelled separately — they currently appear under Facebook / Meta attribution
- WhatsApp is not a messaging inbox in this module
- Google Ads does not yet pull campaigns, spend, or Google lead forms
- Marketing campaign spend / impressions are not filled automatically yet

These limits should be stated clearly in demos and sales conversations so we do not over-promise.

---

## Business value

- Removes manual copy-paste of Facebook Lead Ad submissions into CRM
- Gives sales teams leads in near real time with correct source tagging
- Gives marketing teams a single place to see connected ad platforms
- Lets platform ops (Super Admin) control rollout per organisation
- Builds the foundation for Google Ads and richer campaign analytics later

---

## How we run / verify it (ops checklist)

1. Configure Meta App credentials in the environment (App ID, App Secret, webhook verify token)
2. Ensure the backend is publicly reachable by Meta (production host, or a tunnel for local testing)
3. Super Admin enables the platforms for the organisation if access is restricted
4. Organisation connects Facebook (or Instagram / WhatsApp) from **Marketing → Connected Apps**
5. Confirm the Page shows as connected; optionally set a default project
6. Send a Meta test lead or run a real Lead Ad → confirm the lead appears in Lead Center with Facebook attribution
7. Use **Sync Now** after connect to re-subscribe leadgen and import recent form
   leads into Lead Center so you can verify attribution data immediately.

See also **Local development notes → Facebook Lead Ads** for engineer setup details.

---

## Suggested next phase (if we continue investment)

Priority order for product/engineering follow-up:

1. Label Instagram Instant Form leads as Instagram (not only Facebook)
2. Backfill / pull recent historical leads after connect
3. Let customers pick which Pages (and later forms) to connect
4. Complete Google Ads: choose Ads account, sync campaigns and spend
5. Clean up older Meta settings UI so connect/disconnect behaves the same everywhere

---

## One-line summary for leadership

**Customers connect Facebook (and related Meta apps) once; new Lead Ad submissions flow automatically into our CRM with source and campaign details. Instagram/WhatsApp connect today on the same Meta login; Google Ads connect is ready but lead and metrics sync are the next build.**
