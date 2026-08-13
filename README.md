# Micro Playnite

My own personal web viewer synced to my Playnite library.

A simple way to browse my games online, check ratings, filter through the library, and make quick rating changes without opening Playnite.

Used alongside my MicroPlaynite Sync Addon.

## Features

* View your Playnite game library with search, sorting, and filtering
* Edit game ratings directly from the web app
* Keep ratings in sync between the web app and Playnite
* Automatically picks up new games added from Playnite
* Uses your existing game cover images stored in Cloudflare R2

## Self Hosting

Micro Playnite is designed to be self-hosted using:

* **Vercel** for the web app
* **Neon PostgreSQL** for the game database
* **Cloudflare R2** for game cover images
* **Playnite** with the Micro Playnite sync extension

### Basic Setup

1. Create a Neon PostgreSQL database.
2. Create a Cloudflare R2 bucket and make the cover images publicly accessible.
3. Install and configure the Micro Playnite extension in Playnite.
4. Run a Playnite sync so your games are uploaded to Neon and your covers are sent to R2.
5. Deploy this web app to Vercel.
6. Add these environment variables to your Vercel project:

```env
DATABASE_URL=your_neon_connection_string
MASTER_PASSWORD=your_master_password
EDIT_SESSION_SECRET=your_random_secret
```

7. Deploy the project and open your Vercel URL.

Once everything is connected, Playnite, Neon, R2, and the web app will work together automatically.

## Sync

The basic flow is:

```text
Playnite
   ↕
Neon PostgreSQL
   ↓
Micro Playnite

Game Covers
   ↓
Cloudflare R2
```

New games added in Playnite are pushed to the cloud, while rating changes made through Micro Playnite can be synced back into Playnite.

## Personal Project

Micro Playnite is mainly built as a personal game library viewer rather than a full Playnite replacement.

It keeps things simple: browse the collection, find a game, check your ratings, and make quick updates from anywhere.
