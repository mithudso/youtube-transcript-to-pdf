import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseVideoId, parseWatchPage, pickTrack, watchUrl } from '../src/lib/youtube.js';

test('parseVideoId accepts every common YouTube URL shape', () => {
  const cases = {
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ': 'dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s': 'dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?si=abc': 'dQw4w9WgXcQ',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ': 'dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ': 'dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ': 'dQw4w9WgXcQ',
    'https://www.youtube.com/live/dQw4w9WgXcQ': 'dQw4w9WgXcQ',
    'youtube.com/watch?v=dQw4w9WgXcQ': 'dQw4w9WgXcQ',
    dQw4w9WgXcQ: 'dQw4w9WgXcQ',
  };

  for (const [input, expected] of Object.entries(cases)) {
    assert.equal(parseVideoId(input), expected, input);
  }
});

test('parseVideoId rejects non-YouTube and malformed input', () => {
  for (const input of ['', '   ', null, undefined, 'https://vimeo.com/12345', 'not a url', 'https://www.youtube.com/watch?v=tooshort']) {
    assert.equal(parseVideoId(input), null, String(input));
  }
});

test('parseVideoId does not accept lookalike hostnames', () => {
  assert.equal(parseVideoId('https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ'), null);
});

test('watchUrl builds the canonical desktop URL', () => {
  assert.equal(watchUrl('dQw4w9WgXcQ'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
});

test('parseWatchPage reads tracks and metadata from a player response', () => {
  const player = {
    videoDetails: { title: 'A Talk', author: 'Some Channel' },
    playabilityStatus: { status: 'OK' },
    captions: {
      playerCaptionsTracklistRenderer: {
        captionTracks: [
          { baseUrl: 'https://x.test/a', languageCode: 'en', name: { simpleText: 'English' }, kind: 'asr' },
          { baseUrl: 'https://x.test/b', languageCode: 'de', name: { simpleText: 'German' } },
        ],
      },
    },
  };
  const html = `<script>var ytInitialPlayerResponse = ${JSON.stringify(player)};</script>`;

  const page = parseWatchPage(html);
  assert.equal(page.title, 'A Talk');
  assert.equal(page.author, 'Some Channel');
  assert.equal(page.isPlayable, true);
  assert.equal(page.tracks.length, 2);
  assert.equal(page.tracks[0].isGenerated, true);
  assert.equal(page.tracks[1].isGenerated, false);
});

test('parseWatchPage falls back to a bare captionTracks array', () => {
  const html = '{"captionTracks":[{"baseUrl":"https://x.test/a\\u0026lang=en","languageCode":"en","name":{"simpleText":"English"}}]}';

  const page = parseWatchPage(html);
  assert.equal(page.tracks.length, 1);
  assert.equal(page.tracks[0].baseUrl, 'https://x.test/a&lang=en');
});

test('parseWatchPage surfaces an unplayable video', () => {
  const player = { playabilityStatus: { status: 'LOGIN_REQUIRED', reason: 'Sign in to confirm your age' } };
  const page = parseWatchPage(`var ytInitialPlayerResponse = ${JSON.stringify(player)};`);

  assert.equal(page.isPlayable, false);
  assert.equal(page.reason, 'Sign in to confirm your age');
});

test('parseWatchPage survives HTML with no player response', () => {
  const page = parseWatchPage('<html><body>nothing here</body></html>');
  assert.deepEqual(page.tracks, []);
  assert.equal(page.title, null);
});

test('pickTrack prefers exact language, then base language, then human captions', () => {
  const tracks = [
    { languageCode: 'en-GB', name: 'English (UK)', isGenerated: true, baseUrl: 'a' },
    { languageCode: 'de', name: 'German', isGenerated: false, baseUrl: 'b' },
  ];

  assert.equal(pickTrack(tracks, 'de').languageCode, 'de');
  assert.equal(pickTrack(tracks, 'en').languageCode, 'en-GB');
  assert.equal(pickTrack(tracks, 'auto').languageCode, 'de');
  assert.equal(pickTrack(tracks, 'fr').languageCode, 'de');
  assert.equal(pickTrack([], 'en'), null);
});
