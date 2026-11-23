# Recover names for older voicemail greetings

Greetings selected before `20261123000000_voicemail_greeting_source` have a playable WAV copy but no saved Audio Library ID or name. After deploying that migration and regenerating Prisma Client, run this from the PBX backend directory on the server:

```bash
node --env-file=.env scripts/reconcile-voicemail-greetings.js
node --env-file=.env scripts/reconcile-voicemail-greetings.js --apply
```

The first command is a dry run. Review its matches before using `--apply`. The script compares decoded audio, never rewrites greeting files, and fills metadata only when exactly one Audio Library file matches. It skips missing or duplicate sources and mailboxes changed during the scan. The library audio files must be locally readable at their stored paths, and `ffmpeg` must be installed. If a greeting remains unmatched, preview it and select its source again in the portal. The page refreshes within 30 seconds.
