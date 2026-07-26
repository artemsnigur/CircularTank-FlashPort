Audio decisions: go with your recommendations on all three — preload SFX/lazy music, keep frame-dedup as-is, drop the broken channel cap (go polyphonic). Leave music re-encoding as a separate task for later, don't bundle it into this session. Leave the 8 orphan MP3s out of the manifest as planned — I'll listen to them manually later, no need to guess now.

Go ahead with SoundManager next, as you suggested.

Before diving into the 1178 lines, two things first:

1. **Spot-check the N/A call on the snd*/Music* classes.** You marked ~115
   of them not applicable on the assumption they're empty `[Embed]` wrappers
   with no real logic. Open 3-4 of them for real — pick a couple at random
   plus any that sound like they might carry gameplay-relevant behavior (loop
   points, pitch/volume randomization, anything beyond a bare `[Embed]` +
   `extends Sound`). If they're all as empty as expected, fine, keep the N/A
   calls as they are. If even one of them has actual logic in it, flag which
   ones and downgrade just those back to `not started` rather than silently
   fixing the rest of the batch.

2. **Tell me the scope before you start porting**, not after: are you
   planning to port SoundManager's core playback/manifest logic only, or
   also the `fl.transitions` fade/crossfade behavior verbatim? Those are
   pretty different amounts of work and I want to know which one I'm
   getting before you spend the session on it.

Once that's settled, go ahead — same rules as before: AS3-origin comments on
lifted constants, PROGRESS.md status updates + `npm run progress`, don't
touch third-party classes. Let me know if the keyed audio manifest ends up
needing decisions I should weigh in on (e.g. lazy-loading vs. preloading all
115 sounds).