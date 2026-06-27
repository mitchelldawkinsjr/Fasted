/** YouVersion Bible.com — NLT (version id 116). */
const BIBLE_COM_VERSION_ID = 116;
const BIBLE_COM_VERSION_CODE = 'NLT';

const BOOK_CODES: Record<string, string> = {
  '1 Chronicles': '1CH',
  '1 Corinthians': '1CO',
  '1 John': '1JN',
  '1 Kings': '1KI',
  '1 Peter': '1PE',
  '1 Samuel': '1SA',
  '1 Thessalonians': '1TH',
  '1 Timothy': '1TI',
  '2 Chronicles': '2CH',
  '2 Corinthians': '2CO',
  '2 John': '2JN',
  '2 Kings': '2KI',
  '2 Peter': '2PE',
  '2 Samuel': '2SA',
  '2 Thessalonians': '2TH',
  '2 Timothy': '2TI',
  '3 John': '3JN',
  Acts: 'ACT',
  Amos: 'AMO',
  Colossians: 'COL',
  Daniel: 'DAN',
  Deuteronomy: 'DEU',
  Ecclesiastes: 'ECC',
  Ephesians: 'EPH',
  Esther: 'EST',
  Exodus: 'EXO',
  Ezekiel: 'EZK',
  Ezra: 'EZR',
  Galatians: 'GAL',
  Genesis: 'GEN',
  Habakkuk: 'HAB',
  Haggai: 'HAG',
  Hebrews: 'HEB',
  Hosea: 'HOS',
  Isaiah: 'ISA',
  James: 'JAS',
  Jeremiah: 'JER',
  Job: 'JOB',
  Joel: 'JOL',
  John: 'JHN',
  Jonah: 'JON',
  Joshua: 'JOS',
  Jude: 'JUD',
  Judges: 'JDG',
  Lamentations: 'LAM',
  Leviticus: 'LEV',
  Luke: 'LUK',
  Malachi: 'MAL',
  Mark: 'MRK',
  Matthew: 'MAT',
  Micah: 'MIC',
  Nahum: 'NAM',
  Nehemiah: 'NEH',
  Numbers: 'NUM',
  Obadiah: 'OBA',
  Philemon: 'PHM',
  Philippians: 'PHP',
  Proverbs: 'PRO',
  Psalm: 'PSA',
  Psalms: 'PSA',
  Revelation: 'REV',
  Romans: 'ROM',
  Ruth: 'RUT',
  'Song of Songs': 'SNG',
  Titus: 'TIT',
  Zechariah: 'ZEC',
  Zephaniah: 'ZEP',
};

const BOOK_ABBREVIATIONS: Record<string, string> = {
  '1 Chronicles': '1 Chr',
  '1 Corinthians': '1 Cor',
  '1 John': '1 Jn',
  '1 Kings': '1 Kgs',
  '1 Peter': '1 Pet',
  '1 Samuel': '1 Sam',
  '1 Thessalonians': '1 Thess',
  '1 Timothy': '1 Tim',
  '2 Chronicles': '2 Chr',
  '2 Corinthians': '2 Cor',
  '2 John': '2 Jn',
  '2 Kings': '2 Kgs',
  '2 Peter': '2 Pet',
  '2 Samuel': '2 Sam',
  '2 Thessalonians': '2 Thess',
  '2 Timothy': '2 Tim',
  '3 John': '3 Jn',
  Acts: 'Acts',
  Amos: 'Amos',
  Colossians: 'Col',
  Daniel: 'Dan',
  Deuteronomy: 'Deut',
  Ecclesiastes: 'Eccl',
  Ephesians: 'Eph',
  Esther: 'Est',
  Exodus: 'Exod',
  Ezekiel: 'Ezek',
  Ezra: 'Ezra',
  Galatians: 'Gal',
  Genesis: 'Gen',
  Habakkuk: 'Hab',
  Haggai: 'Hag',
  Hebrews: 'Heb',
  Hosea: 'Hos',
  Isaiah: 'Isa',
  James: 'Jas',
  Jeremiah: 'Jer',
  Job: 'Job',
  Joel: 'Joel',
  John: 'John',
  Jonah: 'Jonah',
  Joshua: 'Josh',
  Jude: 'Jude',
  Judges: 'Judg',
  Lamentations: 'Lam',
  Leviticus: 'Lev',
  Luke: 'Luke',
  Malachi: 'Mal',
  Mark: 'Mark',
  Matthew: 'Matt',
  Micah: 'Mic',
  Nahum: 'Nah',
  Nehemiah: 'Neh',
  Numbers: 'Num',
  Obadiah: 'Obad',
  Philemon: 'Phlm',
  Philippians: 'Phil',
  Proverbs: 'Prov',
  Psalm: 'Ps',
  Psalms: 'Ps',
  Revelation: 'Rev',
  Romans: 'Rom',
  Ruth: 'Ruth',
  'Song of Songs': 'Song',
  Titus: 'Titus',
  Zechariah: 'Zech',
  Zephaniah: 'Zeph',
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
  const bookCode = BOOK_CODES[fullBookName];
  if (!bookCode) return null;

  return { fullBookName, bookCode, chapter, verses };
}

/** Turn "Daniel 1:12" or "Psalm 23" into a Bible.com NLT URL. */
export function scriptureReferenceToBibleComUrl(reference: string): string | null {
  const parsed = parseScriptureReference(reference);
  if (!parsed) return null;

  const { bookCode, chapter, verses } = parsed;
  const path = verses
    ? `${bookCode}.${chapter}.${verses}.${BIBLE_COM_VERSION_CODE}`
    : `${bookCode}.${chapter}.${BIBLE_COM_VERSION_CODE}`;

  return `https://www.bible.com/bible/${BIBLE_COM_VERSION_ID}/${path}`;
}

/** Link to the full chapter on Bible.com (ignores verse numbers). */
export function scriptureReferenceToChapterUrl(reference: string): string | null {
  const parsed = parseScriptureReference(reference);
  if (!parsed) return null;

  const { bookCode, chapter } = parsed;
  return `https://www.bible.com/bible/${BIBLE_COM_VERSION_ID}/${bookCode}.${chapter}.${BIBLE_COM_VERSION_CODE}`;
}

/** Abbreviate "Genesis 1:1" to "Gen 1:1". */
export function abbreviateScriptureReference(reference: string): string {
  const parsed = parseScriptureReference(reference);
  if (!parsed) return reference.trim();

  const abbrev = BOOK_ABBREVIATIONS[parsed.fullBookName] ?? parsed.fullBookName;
  return parsed.verses
    ? `${abbrev} ${parsed.chapter}:${parsed.verses}`
    : `${abbrev} ${parsed.chapter}`;
}

/** Split comma-separated references like "Isaiah 58, Psalm 103". */
export function splitScriptureReferences(reference: string): string[] {
  return reference
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}
