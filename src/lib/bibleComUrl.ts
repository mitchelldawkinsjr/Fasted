/** Bible Gateway — NLT. */
const BIBLE_GATEWAY_VERSION = 'NLT';

type BookMeta = { code: string; abbrev: string };

const BOOKS: Record<string, BookMeta> = {
  '1 Chronicles': { code: '1CH', abbrev: '1 Chr' },
  '1 Corinthians': { code: '1CO', abbrev: '1 Cor' },
  '1 John': { code: '1JN', abbrev: '1 Jn' },
  '1 Kings': { code: '1KI', abbrev: '1 Kgs' },
  '1 Peter': { code: '1PE', abbrev: '1 Pet' },
  '1 Samuel': { code: '1SA', abbrev: '1 Sam' },
  '1 Thessalonians': { code: '1TH', abbrev: '1 Thess' },
  '1 Timothy': { code: '1TI', abbrev: '1 Tim' },
  '2 Chronicles': { code: '2CH', abbrev: '2 Chr' },
  '2 Corinthians': { code: '2CO', abbrev: '2 Cor' },
  '2 John': { code: '2JN', abbrev: '2 Jn' },
  '2 Kings': { code: '2KI', abbrev: '2 Kgs' },
  '2 Peter': { code: '2PE', abbrev: '2 Pet' },
  '2 Samuel': { code: '2SA', abbrev: '2 Sam' },
  '2 Thessalonians': { code: '2TH', abbrev: '2 Thess' },
  '2 Timothy': { code: '2TI', abbrev: '2 Tim' },
  '3 John': { code: '3JN', abbrev: '3 Jn' },
  Acts: { code: 'ACT', abbrev: 'Acts' },
  Amos: { code: 'AMO', abbrev: 'Amos' },
  Colossians: { code: 'COL', abbrev: 'Col' },
  Daniel: { code: 'DAN', abbrev: 'Dan' },
  Deuteronomy: { code: 'DEU', abbrev: 'Deut' },
  Ecclesiastes: { code: 'ECC', abbrev: 'Eccl' },
  Ephesians: { code: 'EPH', abbrev: 'Eph' },
  Esther: { code: 'EST', abbrev: 'Est' },
  Exodus: { code: 'EXO', abbrev: 'Exod' },
  Ezekiel: { code: 'EZK', abbrev: 'Ezek' },
  Ezra: { code: 'EZR', abbrev: 'Ezra' },
  Galatians: { code: 'GAL', abbrev: 'Gal' },
  Genesis: { code: 'GEN', abbrev: 'Gen' },
  Habakkuk: { code: 'HAB', abbrev: 'Hab' },
  Haggai: { code: 'HAG', abbrev: 'Hag' },
  Hebrews: { code: 'HEB', abbrev: 'Heb' },
  Hosea: { code: 'HOS', abbrev: 'Hos' },
  Isaiah: { code: 'ISA', abbrev: 'Isa' },
  James: { code: 'JAS', abbrev: 'Jas' },
  Jeremiah: { code: 'JER', abbrev: 'Jer' },
  Job: { code: 'JOB', abbrev: 'Job' },
  Joel: { code: 'JOL', abbrev: 'Joel' },
  John: { code: 'JHN', abbrev: 'John' },
  Jonah: { code: 'JON', abbrev: 'Jonah' },
  Joshua: { code: 'JOS', abbrev: 'Josh' },
  Jude: { code: 'JUD', abbrev: 'Jude' },
  Judges: { code: 'JDG', abbrev: 'Judg' },
  Lamentations: { code: 'LAM', abbrev: 'Lam' },
  Leviticus: { code: 'LEV', abbrev: 'Lev' },
  Luke: { code: 'LUK', abbrev: 'Luke' },
  Malachi: { code: 'MAL', abbrev: 'Mal' },
  Mark: { code: 'MRK', abbrev: 'Mark' },
  Matthew: { code: 'MAT', abbrev: 'Matt' },
  Micah: { code: 'MIC', abbrev: 'Mic' },
  Nahum: { code: 'NAM', abbrev: 'Nah' },
  Nehemiah: { code: 'NEH', abbrev: 'Neh' },
  Numbers: { code: 'NUM', abbrev: 'Num' },
  Obadiah: { code: 'OBA', abbrev: 'Obad' },
  Philemon: { code: 'PHM', abbrev: 'Phlm' },
  Philippians: { code: 'PHP', abbrev: 'Phil' },
  Proverbs: { code: 'PRO', abbrev: 'Prov' },
  Psalm: { code: 'PSA', abbrev: 'Ps' },
  Psalms: { code: 'PSA', abbrev: 'Ps' },
  Revelation: { code: 'REV', abbrev: 'Rev' },
  Romans: { code: 'ROM', abbrev: 'Rom' },
  Ruth: { code: 'RUT', abbrev: 'Ruth' },
  'Song of Songs': { code: 'SNG', abbrev: 'Song' },
  Titus: { code: 'TIT', abbrev: 'Titus' },
  Zechariah: { code: 'ZEC', abbrev: 'Zech' },
  Zephaniah: { code: 'ZEP', abbrev: 'Zeph' },
};

const REFERENCE_PATTERN =
  /^(\d+\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+)(?::(\d+(?:-\d+)?))?$/;

function parseScriptureReference(reference: string) {
  const trimmed = reference.trim();
  if (!trimmed) return null;

  const match = trimmed.match(REFERENCE_PATTERN);
  if (!match) return null;

  const [, prefix, bookName, chapter, verses] = match;
  const fullBookName = prefix ? `${prefix.trim()} ${bookName}` : bookName;
  const book = BOOKS[fullBookName];
  if (!book) return null;

  return { fullBookName, bookCode: book.code, chapter, verses };
}

function scriptureReferenceToBibleGatewayUrl(reference: string, chapterOnly = false): string | null {
  const trimmed = reference.trim();
  if (!trimmed) return null;

  const parsed = parseScriptureReference(trimmed);
  const search = parsed
    ? parsed.verses && !chapterOnly
      ? `${parsed.fullBookName} ${parsed.chapter}:${parsed.verses}`
      : `${parsed.fullBookName} ${parsed.chapter}`
    : trimmed;

  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(search)}&version=${BIBLE_GATEWAY_VERSION}`;
}

/** Turn "Daniel 1:12" or "Psalm 23" into a Bible Gateway NLT URL. */
export function scriptureReferenceToBibleComUrl(reference: string): string | null {
  return scriptureReferenceToBibleGatewayUrl(reference);
}

/** Link to the full chapter on Bible Gateway (ignores verse numbers). */
export function scriptureReferenceToChapterUrl(reference: string): string | null {
  return scriptureReferenceToBibleGatewayUrl(reference, true);
}

/** Abbreviate "Genesis 1:1" to "Gen 1:1". */
export function abbreviateScriptureReference(reference: string): string {
  const parsed = parseScriptureReference(reference);
  if (!parsed) return reference.trim();

  const abbrev = BOOKS[parsed.fullBookName]?.abbrev ?? parsed.fullBookName;
  return parsed.verses
    ? `${abbrev} ${parsed.chapter}:${parsed.verses}`
    : `${abbrev} ${parsed.chapter}`;
}
