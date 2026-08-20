/**
 * Words the game will not accept.
 *
 * Applied at build time, so banned words are absent from the dictionary entirely:
 * they cannot be scored, and the board generator never counts them or builds a board
 * around one. A player who happens to trace one gets the ordinary "not a word"
 * response, with no acknowledgement that anything was blocked.
 *
 * Hand-authored rather than imported. A dependency would bring a licence question for
 * a list that ships only as an absence, and this one is tuned to a specific line:
 * clinical and anatomical terms stay, vulgar and abusive ones go.
 *
 * ---------------------------------------------------------------------------
 * How matching works
 *
 *   exact     - only the forms written here. For short terms whose inflections are
 *               ordinary English: "jap" must not take "japes", "spic" must not take
 *               "spices", "mong" must not take "monger", "prick" must not take
 *               "prickly".
 *
 *   stems     - the word itself plus real inflections: -s, -ed, -ing, -er, -ist and
 *               so on, including the spelling changes English makes (rape/raping,
 *               shag/shagged). A remainder only counts if it is a known suffix, so
 *               "grape" is not caught by "rape" and "rapier" is not caught either.
 *
 *   fragments - matched anywhere in a word, for terms that appear inside compounds
 *               ("motherfucker"). Use sparingly: this is where over-blocking comes
 *               from. Only fragments with no innocent host words belong here.
 *
 *   allow     - always permitted, whatever the rules above say. This is where
 *               collateral from `fragments` is pardoned.
 * ---------------------------------------------------------------------------
 */

/**
 * Terms matched as stems, with their inflections.
 *
 * Grouped only for readability; the build treats them as one list.
 */
export const stems = [
  // --- profanity -----------------------------------------------------------
  'arse', 'arsehole', 'asshole', 'badass', 'bastard', 'bitch', 'bollock', 'bollocks',
  'bugger', 'bullshit', 'crap', 'damn', 'dickhead', 'dipshit', 'douche', 'douchebag',
  'dumbass', 'fuck', 'goddamn', 'jackass', 'motherfucker', 'piss', 'shit',
  'shite', 'slut', 'twat', 'wanker', 'whore',

  // --- vulgar sexual terms -------------------------------------------------
  // Clinical equivalents are deliberately absent from this list: see `allow`.
  'blowjob', 'boner', 'buttplug', 'cocksucker', 'cum', 'cunnilingus', 'cunt',
  'deepthroat', 'dildo', 'fellatio', 'fingering', 'gangbang', 'handjob', 'horny',
  'jerkoff', 'jism', 'jizz', 'masturbate', 'masturbation', 'nutsack', 'orgasm',
  'pussy', 'queef', 'rimjob', 'schlong', 'screwing', 'sodomise',
  'sodomize', 'sodomy', 'threesome', 'titties', 'titty', 'wank', 'whorehouse',

  // --- sexual violence -----------------------------------------------------
  'incest', 'molest', 'molestation', 'pedophile', 'pedophilia', 'paedophile',
  'paedophilia', 'rape', 'rapist', 'statutory',

  // --- slurs ---------------------------------------------------------------
  // Racial, ethnic, religious, homophobic, transphobic and ableist terms. Also
  // covers reclaimed words, which a game cannot distinguish by context.
  'darkie', 'dyke', 'faggot', 'gypsy', 'honky', 'injun', 'kike', 'negress', 'negro',
  'nigger', 'octoroon', 'paki', 'pickaninny', 'quadroon', 'raghead', 'redskin',
  'retard', 'retarded', 'sambo', 'shemale', 'wetback',
]

/**
 * Banned exactly as written, with no inflection.
 *
 * Every entry here is a short word whose inflected forms are ordinary English. The
 * plural or participle is written out where it should also be blocked.
 */
export const exact = [
  // Profanity whose inflections are innocent: "pricked", "prickly", "cocked", "cocky".
  'prick', 'pricks', 'cock', 'cocks',

  // Slurs that collide with common words under inflection.
  'chink', 'chinks',
  'coon', 'coons',
  'cripple', 'cripples',
  'dago', 'dagos', 'dagoes',
  'gimp', 'gimps',
  'gook', 'gooks',
  'gyp', 'gyps', 'gypped', 'gypping',
  'heeb', 'heebs',
  'jap', 'japs',
  'kraut', 'krauts',
  'mick', 'micks',
  'mong', 'mongs',
  'mulatto', 'mulattos', 'mulattoes',
  'nonce', 'nonces',
  'spastic', 'spastics',
  'spic', 'spics',
  'squaw', 'squaws',
  'tranny', 'trannies',
  'wog', 'wogs',
  'wop', 'wops',
  'yid', 'yids',
]

/**
 * Matched anywhere inside a word.
 *
 * Reserved for terms with no innocent host word in the dictionary. Anything with a
 * plausible host belongs in `stems` instead.
 */
export const fragments = [
  'cunt',
  'fuck',
  'nigg',
  'niggr',
  'shit',
  'whore',
]

/**
 * Always allowed.
 *
 * Two kinds of entry: clinical and anatomical vocabulary, which the brief keeps in
 * play; and innocent words caught as collateral by a `fragments` rule.
 */
export const allow = [
  // Anatomy and clinical vocabulary. These stay in the game deliberately.
  'anus', 'anal', 'areola', 'breast', 'cervix', 'clitoris', 'coitus', 'copulate',
  'copulation', 'ejaculate', 'ejaculation', 'erection', 'fertilise', 'fertilize',
  'foreskin', 'gamete', 'genital', 'genitalia', 'gestation', 'gonad', 'labia',
  'lactate', 'libido', 'mammary', 'menstrual', 'menstruate', 'nipple', 'orifice',
  'ovary', 'ovulate', 'ovum', 'penis', 'perineum', 'prostate', 'pubic', 'puberty',
  'rectal', 'rectum', 'reproduce', 'scrotum', 'semen', 'seminal', 'sperm', 'testes',
  'testicle', 'testis', 'urethra', 'uterine', 'uterus', 'vagina', 'vaginal', 'vulva',
  'zygote',

  // Collateral pardoned from `fragments`. Obscure, but real.
  'shittah', 'shittim', 'shittahs', 'shittims',
]
