#!/usr/bin/env bash
# Downloads the build-time word list inputs.
#
# Neither file ships. ENABLE decides what a player may score; the frequency counts
# decide which words the board generator treats as findable. Both are far too large to
# commit, so the packed output in src/content/dictionary/data/ is committed instead.
#
# See docs/adr/0003-two-word-lists.md.
set -euo pipefail

RAW="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/wordlists/raw"
mkdir -p "$RAW"

# ENABLE — Alan Beale, public domain. Also the list Words With Friends uses.
curl -sSfL -o "$RAW/enable1.txt" \
  https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt

# Google Web Trillion Word Corpus counts, via Peter Norvig. Freely redistributable;
# chosen over SUBTLEX to avoid ShareAlike terms — see ADR-0004.
curl -sSfL -o "$RAW/count_1w.txt" https://norvig.com/ngrams/count_1w.txt

echo "Downloaded to $RAW"
wc -l "$RAW/enable1.txt" "$RAW/count_1w.txt"
