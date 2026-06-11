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

const REFERENCE_PATTERN =
  /^(\d+\s+)?([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+)(?::(\d+(?:-\d+)?))?$/;

/** Turn "Daniel 1:12" or "Psalm 23" into a Bible.com NLT URL. */
export function scriptureReferenceToBibleComUrl(reference: string): string | null {
  const trimmed = reference.trim();
  if (!trimmed) return null;

  const match = trimmed.match(REFERENCE_PATTERN);
  if (!match) return null;

  const [, prefix, bookName, chapter, verses] = match;
  const fullBookName = prefix ? `${prefix.trim()} ${bookName}` : bookName;
  const bookCode = BOOK_CODES[fullBookName];
  if (!bookCode) return null;

  const path = verses
    ? `${bookCode}.${chapter}.${verses}.${BIBLE_COM_VERSION_CODE}`
    : `${bookCode}.${chapter}.${BIBLE_COM_VERSION_CODE}`;

  return `https://www.bible.com/bible/${BIBLE_COM_VERSION_ID}/${path}`;
}

/** Split comma-separated references like "Isaiah 58, Psalm 103". */
export function splitScriptureReferences(reference: string): string[] {
  return reference
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}
