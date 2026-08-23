import {
  parseDuration,
  parseIso8601Duration,
  parseInnerTubeSearch,
  parseInvidiousSearch,
  parseDataApiSearch,
} from '../../src/lib/youtube.ts'

let failures = 0
const check = (label: string, actual: any, expected: any) => {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    console.log(`  ok: ${label}`)
  } else {
    failures++
    console.error(`  FAIL: ${label}\n    expected: ${e}\n    actual:   ${a}`)
  }
}

console.log('parseDuration')
check('mm:ss', parseDuration('4:09'), 249)
check('h:mm:ss', parseDuration('1:02:03'), 3723)
check('seconds only', parseDuration('45'), 45)
check('empty', parseDuration(''), 0)
check('null', parseDuration(null), 0)
check('live label', parseDuration('EN DIRECT'), 0)
check('too many parts', parseDuration('1:2:3:4'), 0)

console.log('parseIso8601Duration')
check('PT4M9S', parseIso8601Duration('PT4M9S'), 249)
check('PT1H2M3S', parseIso8601Duration('PT1H2M3S'), 3723)
check('PT45S', parseIso8601Duration('PT45S'), 45)
check('P0D live', parseIso8601Duration('P0D'), 0)
check('garbage', parseIso8601Duration('nope'), 0)

console.log('parseInnerTubeSearch')
const innertube = {
  contents: {
    twoColumnSearchResultsRenderer: {
      primaryContents: {
        sectionListRenderer: {
          contents: [
            {
              itemSectionRenderer: {
                contents: [
                  {
                    videoRenderer: {
                      videoId: '5NV6Rdv1a3I',
                      title: { runs: [{ text: 'Daft Punk - Get Lucky' }] },
                      lengthText: { simpleText: '4:09' },
                      ownerText: { runs: [{ text: 'Daft Punk' }] },
                    },
                  },
                  // Live stream: no lengthText, must be dropped.
                  {
                    videoRenderer: {
                      videoId: 'liveaaaaaaa',
                      title: { runs: [{ text: 'Lofi radio' }] },
                      ownerText: { runs: [{ text: 'Some Channel' }] },
                    },
                  },
                  // Nested shelf item.
                  {
                    richItemRenderer: {
                      content: {
                        videoRenderer: {
                          videoId: 'nested00001',
                          title: { simpleText: 'Nested track' },
                          lengthText: { simpleText: '3:00' },
                          shortBylineText: { runs: [{ text: 'Fallback Artist' }] },
                        },
                      },
                    },
                  },
                  // Non-video item, ignored.
                  { channelRenderer: { channelId: 'UC123' } },
                ],
              },
            },
            { continuationItemRenderer: {} },
          ],
        },
      },
    },
  },
}
check('innertube results', parseInnerTubeSearch(innertube), [
  { videoId: '5NV6Rdv1a3I', title: 'Daft Punk - Get Lucky', artist: 'Daft Punk', duration: 249 },
  { videoId: 'nested00001', title: 'Nested track', artist: 'Fallback Artist', duration: 180 },
])
check('innertube empty payload', parseInnerTubeSearch({}), [])
check('innertube null payload', parseInnerTubeSearch(null), [])

console.log('parseInvidiousSearch')
check(
  'invidious results',
  parseInvidiousSearch([
    { videoId: 'abc', title: 'T', author: 'A', lengthSeconds: 100 },
    { videoId: 'dead', title: 'D', author: 'A', lengthSeconds: 0 },
  ]),
  [{ videoId: 'abc', title: 'T', artist: 'A', duration: 100 }],
)
check('invidious non-array', parseInvidiousSearch({ error: 'nope' }), [])

console.log('parseDataApiSearch')
check(
  'dataapi merge',
  parseDataApiSearch(
    {
      items: [
        { id: { videoId: 'abc' }, snippet: { title: 'T', channelTitle: 'A' } },
        { id: { videoId: 'live' }, snippet: { title: 'L', channelTitle: 'A' } },
      ],
    },
    {
      items: [
        { id: 'abc', contentDetails: { duration: 'PT4M9S' } },
        { id: 'live', contentDetails: { duration: 'P0D' } },
      ],
    },
  ),
  [{ videoId: 'abc', title: 'T', artist: 'A', duration: 249 }],
)
check('dataapi empty', parseDataApiSearch({}, {}), [])

if (failures > 0) {
  console.error(`\n${failures} failure(s)`)
  process.exit(1)
}
console.log('\nall youtube parser tests passed')
