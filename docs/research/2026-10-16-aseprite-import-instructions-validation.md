# Aseprite import instructions validation

October 16, 2026. Minimal UI copy change; no importer, renderer, clipboard access,
CSS or runtime dependency changes.

Image or file now mentions choosing/dropping a saved `.aseprite`/`.ase` file to
import its palette. Paste colors explains selecting Aseprite palette swatches,
using Edit > Copy, and pasting into the textarea. Existing controls and explicit
Review/Replace/Save behavior stay intact. The palette guide includes the native
clipboard/version qualification and first-frame/unused-swatch distinction.

## Production build and cold loading

The tested production output is `.tmp/aseprite-instructions-dist`, served only
on loopback. Codex browser requests were recorded by the external QA server;
the app contains no instrumentation or test-only assets.

- Startup, opening the editor, all three methods, browser clipboard HEX paste
  and Review, and PNG/GIF/HEX/GPL/PAL file imports made **zero native-parser
  requests**.
- The first actual native document import requested
  `palette-ase-CkPXNbLd.js`. Repeated native imports in that document made no
  further requests.
- Saving and reloading the imported palette did not request the parser again.
- Emitted parser: **2,497 bytes, 1,329 gzip bytes**. It remains a separate
  dynamically imported chunk. HTML has no preload/prefetch links; the checked
  static startup dependency graph does not contain the parser.
- The implementation files `palette-ase.js` and `palette-decode.js` are unchanged.
  No processing work has been added; these checks establish deferred loading,
  not a universal latency or memory guarantee for arbitrary native files.

`bench/aseprite-import-spike/check-lazy.mjs` checks the output graph and staged
request log. It self-checks minified named/star reexports, static imports,
side-effect imports and exclusion of dynamic imports, and follows JS preload
roots. Both build inspection and the independent server log support the result.

## Codex browser checks

All interactions used the Codex in-app browser against the production build.
Actual Aseprite 1.3.18.6 batch exports supplied the native and text/image files.

| Check | Result |
| --- | --- |
| Browser clipboard paste of newline-separated Aseprite HEX | Correct three ordered swatches after Review. |
| Native-generated opaque PNG, HEX, GPL and PAL | Same four unique ordered RGB colors. |
| Two-frame GIF | First frame's two colors and existing first-frame notice. |
| Full `.aseprite` artwork document | Embedded swatches, including unused colors; magenta artwork was not sampled. |
| Palette-only `.ase` and `.aseprite` | Correct order and RGB deduplication. |
| Alpha native palette/document | Zero-alpha entry omitted; positive-alpha green made opaque with notice. |
| Malformed native file and malformed text | Error visible; previous colors and entered name preserved. |
| Existing 255-color native fixture | All four review pages recovered; exact ordered entries checked independently. |
| Test-only synthetic native File drops | Document/palette/alpha files imported; selected method, typed text and name preserved; malformed drop retained draft. |
| Save and reload | Imported four-color palette remains selected and available. |
| Direct production tab console | No warning/error logs recorded. |

Both methods were inspected at 320×568, 390×844, 520×320, 844×390 and 1280×720.
No editor horizontal overflow appeared. At the settled 320×568 text layout,
the editor spans y=20.45–547.55 and the footer y=493.55–546.55. At 844×390,
the editor spans y=16–374 and the footer y=320–373. Short layouts scroll the body;
Review/Replace and Save remain reachable. Narrow and landscape screenshots
confirm readable hints and fixed actions.

The native Aseprite UI clipboard gesture was not physically automated. The
documented HEX payload was exercised through the browser's clipboard and paste
shortcut. File picker inputs used real native-generated files. The isolated
drop fixture dispatches File/DragEvent inputs, explicitly labelled synthetic;
it proves handler behavior, not physical OS drag integration. Its iframe briefly
triggered a browser-inspection MutationObserver error; the direct app tab had
no such errors. These viewport checks do not claim physical Android/iOS testing.

## Adversarial review and corrections

A separate reviewer inspected the scoped UI/documentation diff, guarded dynamic
import, emitted build, request log, fixtures, checker and screenshots. The
reviewer independently passed the 94 focused importer tests and found no product
code issue or reason to change the parser.

The reviewer challenged the graph checker because its first regex could miss
minified `import{a}from` syntax. That finding was accepted, fixed, self-tested and
independently rerun by the reviewer. JS preload roots were added to its traversal.
The reviewer also identified a mislabeled landscape screenshot: after opening
  the drop harness, viewport changes targeted the other selected tab. That image
  was superseded by actual 844×390 and 320×568 captures after layout settled. The
parent reviewed these findings against the implementation and reran the affected
checks; no UI or parser changes resulted from this review.
The invalid-file preservation check was also repeated using the input's actual
value rather than its absent HTML attribute. The reviewer rechecked the final
evidence and approved with no remaining must-fix findings; the parent agreed.

## Reproduction and evidence

```powershell
node bench/aseprite-import-spike/run.mjs
npm run build -- --outDir .tmp/aseprite-instructions-dist
node bench/aseprite-import-spike/serve.mjs
```

In a cold Codex tab at port 5189, exercise ordinary imports first; the server's
`/__requests` endpoint must contain no `palette-ase` request. Mark the boundary
at `/__mark?stage=first-native-import`, then import a native file and repeat.
Run `node bench/aseprite-import-spike/check-lazy.mjs` afterward, before a new
document imports native files again. The checker also accepts a captured request
log as its argument; the committed verification log preserves that cold sequence.
The separate synthetic drop page is `/__drop-qa.html`; open the palette editor in its iframe
before pressing its labelled test buttons. The app never links to this fixture.

Final full unit suite: **969 passed, 2 skipped, 63 files**, following the initial
965-pass run and concurrent unrelated test additions. Production build passed.
Native export compatibility harness and lazy-load assertions passed.

Evidence is in `bench/aseprite-import-spike/verification/`: browser checks,
network logs, graph-check result and corrected screenshots. The prior
[research spike](2026-10-16-aseprite-palette-import-spike.md) records format
coverage and the intentionally deferred integrations.

## Compact hint followup

The Aseprite guidance now shares each method's existing hint paragraph, removing
the extra paragraph and gap. At 320×568 with the same three-color draft, Image or
file shrank from 438.59 to 387.59px (51px saved), and Paste colors from 527.09 to
495.59px (31.5px saved). Both retain one hint, no horizontal overflow and a visible
Save footer. At 844×390 the text method remains bounded with body scrolling.
Codex clipboard HEX review and native-generated document import passed again;
the native parser still made no request before import and one on first import.
The new graph check, production build and full suite (969 passed, 2 skipped)
passed. Compact screenshots, checks and network evidence use the `compact-`
prefix in the verification directory. Import handlers, parser and CSS are unchanged.
