# 常用英文字彙 3,000 / 5,000 / 7,000

This dataset contains exactly 7,000 case-insensitive unique English dictionary entries with Traditional Chinese glosses. The 3,000 and 5,000 modes are cumulative prefixes of the same 7,000 list. These are application study ranges, **not CEEC official tiers, CEFR levels, Oxford lists, or guarantees of examination coverage**.

## Source and redistribution

Source: [skywind3000/ECDICT](https://github.com/skywind3000/ECDICT), `ecdict.csv`, retrieved 2026-10-25. Source revision observed: `ab22ad36302cafc6349a050e2b60894855208055`.

ECDICT publishes its database under the [MIT License](https://github.com/skywind3000/ECDICT/blob/ab22ad36302cafc6349a050e2b60894855208055/LICENSE). Copyright (c) 2025 Linwei. The full notice is retained in `LICENSE-ECDICT.txt`; distribute that file with this derived dataset. The MIT grant permits use, copying, modification, publication, distribution and sublicensing, subject to retaining the copyright and permission notice. The upstream project provides the data without warranty. Its README describes compilation from multiple dictionary sources; no independent audit of the provenance of every original entry has been performed.

## Selection and modifications

1. Accept single lowercase English headwords, optionally containing one hyphen, with a nonempty Chinese gloss and positive ECDICT `frq` rank.
2. Exclude entries explicitly marked as derived inflections by ECDICT's `exchange` lemma field (`0:`). No plurals or verb forms were generated to fill the count.
3. Require corroborating ECDICT BNC frequency, a dictionary importance flag, or a vocabulary tag. These are selection inputs only and are not presented as independent certifications.
4. Sort by ECDICT `frq` ascending (the upstream contemporary-corpus frequency ranking), then BNC and headword to break ties; retain the first 7,000 unique headwords. `rank` is the rank within this filtered study selection. `frequencyRank` retains upstream `frq`, so the two should not be confused. Frequency is an approximate usefulness proxy, not difficulty or learner level.
5. Remove redundant specialized bracketed abbreviation senses when ordinary senses exist. Convert Simplified Chinese to Taiwan Traditional Chinese using OpenCC's `s2twp` configuration. Add 33 short original editorial corrections to prominent errors and Taiwan usage. Corrections are marked `glossEdited: true`.
6. The complete 7,000 glosses have **not** been individually professionally reviewed. Automatic conversion does not guarantee perfect Taiwan terminology or contextual sense selection. Reported errors should be corrected rather than treating this as an authoritative examination dictionary.
7. No example sentences are supplied for this expansion. Existing curated example cards in the app are separate. Do not imply that every new word has an example sentence.

## Reference context, not imported material

[CEEC's official explanation of its current high-school vocabulary reference](https://www.ceec.edu.tw/xcepaper/cont?sid=0K227548677326460907&xsmsid=0J066588036013658199) describes six levels and approximately 6,000 entries for the version applicable from academic year 111. The older reference had 6,480 entries. This app's exact 3,000 / 5,000 / 7,000 counts are not those official lists. No CEEC word-list or gloss content is redistributed here.

## Files

- `data/common_frequency.js`: browser-ready array assigned to `window.COMMON_FREQUENCY`, wrapped without changing the previously validated 7,000-entry JSON selection. Fields: `id`, `word`, `meaning`, `phonetic`, `rank`, `tier`, `frequencyRank`, `source`, `glossEdited`. IDs are stable headword-based IDs; `tier` is the first inclusion threshold (3000, 5000, or 7000).
- `LICENSE-ECDICT.txt`: required upstream copyright and license notice.
- `qa/ranges-model.cjs`: cumulative counts, corpus preservation, storage and navigation model checks. The original selection was built with `opencc-python-reimplemented` version 0.1.7; no runtime conversion dependency is needed by this additional corpus.
- Original build script and validation evidence are retained in `provenance/` for reproducibility. The app does not load these files.

Display suggestion: 「常用字彙 3,000／5,000／7,000：依詞頻篩選、繁體中文釋義，非官方考試分級。擴充字庫目前不含逐字例句。」
