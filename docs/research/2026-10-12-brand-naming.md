# Bitify naming and identity research

October 12, 2026. Discussion proposal based on the current working tree. The strongest direction is a suggestive name for exploring image color, paired with a literal product description and one recognizable pixel-art mark. **Swatchstep** is my leading creative recommendation; **PaletteHop** is the clearest alternative for a broader audience.

The five finalists are Swatchstep, PaletteHop, Chromabrim, Dapplegrid and Tintstride. They passed a limited indexed-web conflict screen, not trademark clearance. The 120-name pool below is creative exploration; most entries remain unscreened. No name, domain, handle or slogan is represented as available.

## Current product and documentation

A brief scan covered the 50 Markdown files present at its start across the root, guides, design records, specifications, implementation plans, research and benchmark notes, plus the titles and branding references of ten HTML prototypes and galleries. `docs/research.md` is empty. Historical documents were treated as history; the main specification's later additions, current palette documentation and current code establish the present scope.

The product recolors images, sprites and animated GIFs using an automatically generated shared palette, curated presets or custom palettes. Automatic generation is the fresh-visit default, historically called Generated 32 and now **Auto** in the current working tree. Users can import and edit palettes, limit colors, compare results and export PNG/GIF/ZIP. The separate 1-bit family retains eleven structural styles and two-color choices. Processing happens in the browser; installation does not imply offline operation. MP4 and Aseprite artwork rendering remain deferred, although Aseprite palette import exists.

The enduring promise is **exploring and controlling the color character of existing images**. Neither a fixed color count nor a particular mode should define the master brand. The app is a conversion tool; a name or description should not imply drawing, layers, animation authoring, upscaling or AI generation.

| Documentation area | Relevant finding |
| --- | --- |
| README and CLAUDE | Lead with 1-bit even though automatic palettes now lead the workflow. |
| Main specification | Preserves original two-color scope followed by superseding palette and layout additions. Keep historical intent distinct from current behavior. |
| Palette guide | Correctly identifies automatic generation at the top, but later passages still say first visits open on Glow, call ENDESGA 32 the default and describe reset restoring default 1-bit settings. Those passages need reconciliation. |
| Preset inventory | README says seven full-palette presets; current palette guide and code have nine curated presets plus Auto. |
| Automatic palette label | The current tree is updating Generated 32 to Auto. Use automatic palettes in durable brand copy rather than a fixed count. |
| Style guide and old plans | Detailed 1-bit documentation remains useful for that mode; its size should not determine product positioning. |
| Research and performance | Automatic colors and shared palettes are implemented. Cleanup and color reduction have detail-loss tradeoffs, so copy should avoid guarantees of preserving every detail. |
| HTML design prototypes | Ten historical mockups/galleries preserve earlier visual and brand treatments. Mark them as historical rather than replacing screenshots to simulate a new past. |

The logo assets also form two visual families: `src/assets/logo.png` and `logo.gif` depict the original gold coin; `public/favicon.svg` depicts a pixel B used to generate the installation icons. Help currently uses the static coin; the empty-wall demonstration uses the animated coin. The app has no current top-bar brand surface; old top-bar proposals are historical.

The view that 1-bit is a niche option is a reasonable product hypothesis. The documentation does not provide usage analytics proving how few people use it. The case for broader branding already follows from the implemented default and supported workflows.

Bitify itself is not inherently limited to two colors: bit can suggest digital imagery and the suffix suggests transformation. Its problem is the combined name, copy and imagery reinforcing the original scope. Include Bitify with updated copy as a control in name testing. A new name should justify the migration effort through better comprehension or a more distinctive identity, especially if the current brand has recognition.

## Naming principles

Professional naming is a structured decision about positioning, differentiation, language and practical use. There is no universal formula that makes a name successful. Igor's framework evaluates fit, sound, appearance and engagement; Catchword distinguishes descriptive, suggestive and invented strategies. Their useful shared lesson here is to establish the enduring promise before choosing a clever device. [Igor name evaluation](https://www.igorinternational.com/process/name-evaluation-brand-evaluate-names.php), [Catchword naming guide](https://catchwordbranding.com/wp-content/uploads/2016/03/CW_NamingGuide_100914.pdf).

**Use a suggestive compound as the primary territory.** Recognizable words can hint at color, transformation or craft without listing features. A purely descriptive name such as Image Palette Converter works well as a subtitle but offers little brand distinction. Invented words can differentiate, yet create a greater burden for spelling, pronunciation and explanation. USPTO distinguishes suggestive, arbitrary and fanciful marks from weaker descriptive/generic wording; that distinction does not determine whether a particular candidate is registrable. [USPTO strong trademarks](https://www.uspto.gov/trademarks/basics/strong-trademarks).

**Treat alliteration as an optional advantage.** It adds rhythm when the words already fit. It does not rescue generic or misleading wording. A study of 480 brands associated memory with semantic fit, wordplay and certain phonetic features, especially for less familiar brands; it did not establish alliteration as a universal winner. It was observational and concerned advertising, so its findings are useful direction rather than a predictive naming formula. [Lowrey, Shrum and Dubitsky](https://uploads.strikinglycdn.com/files/55a920cc-934e-4933-b75f-2fa2386a1fb6/Lowrey%20et%20al%202003%20JA%20Phonetic.pdf).

Alliteration repeats opening sounds, not written initials. Swatchstep, Tintstride and Chroma Cadence repeat an opening sound. Hue Hatch does not: English hue begins with a sound like "yoo," while hatch begins with /h/.

**Avoid artificial restrictions.** Bit, mono, binary, duo, 32, GIF and retro can make useful feature or campaign language, but constrain the master brand. AI would be an unsupported promise. Pixel can signal the audience, yet may lead people to expect a pixel-art generator or editor. Palette is accurate but easily confused with pallet and palate. Chroma sounds professional but is less familiar to casual users. Tint is accessible but technically narrower than recoloring into a whole palette.

**Keep the address practical without allowing it to dictate the brand.** A memorable URL matters for a browser product. Exact `.com` ownership is one consideration, not proof of brand quality. Lexicon emphasizes distinctive associations and familiar language components; its more categorical dismissal of URLs should not be adopted without considering this product's distribution. [Lexicon naming process](https://www.lexiconbranding.com/brand-naming-process/).

My proposed evaluation rubric is 25% enduring product fit, 25% differentiation, 20% pronunciation/spelling/recall, 15% future scope, 10% visual potential and 5% tone. These weights are judgment, not a validated scale. A demonstrated close conflict or a false product promise eliminates a name instead of merely lowering its score.

## Market context

| Product | Relevant offering | Implication |
| --- | --- | --- |
| [Dither it](https://github.com/alexharris/ditherit) | Browser dithering with palette and color-count controls | Dither-led names enter an established close category and understate other modes. |
| [Pixel Art Palette Swap](https://pixelpaletteswap.com/) | Image/GIF palette conversion and browser processing | Literal pixel/palette/swap combinations are already occupied. |
| [siutil Palette Swap](https://siutil.com/palette-swap/) | Fixed palettes, custom colors and recoloring | Palette swap is useful category language, with little inherent brand distinction. |
| [Color Crusher](https://recipeforsnak.itch.io/color-crusher-toolkit) | Palette and dithering toolkit for images and animation | Strong alliteration alone cannot differentiate; this appealing name is used by a close tool. |
| [Pixel Recolor](https://www.pixel-recolor.com/) | Online pixel-art palette editing | The simplest descriptive route is crowded. |
| [Lospec](https://lospec.com/palette-list) | Contemporary artist palettes as well as hardware-inspired palettes | Pixel-art color culture extends well beyond two-color nostalgia. |

Browser processing and custom presets are valuable benefits, but competitor evidence means they should not be presented as unique inventions. The opportunity is a memorable identity for a focused, approachable color workflow.

## Five recommended names

The ranking is editorial judgment informed by the research and preliminary searches. It is not measured consumer preference. Searches used exact spellings, spaced forms and color/software context as applicable. No obvious relevant indexed product surfaced for these five on October 12, 2026. This is a reason to continue evaluating them, not evidence of legal or domain availability.

| Rank | Name | Pronunciation | Why it belongs | Main weakness |
| --- | --- | --- | --- | --- |
| 1 | **Swatchstep** | swatch-step | Two beats, natural alliteration and a direct connection to choosing color. Step suggests exploration and controlled transformation. A stepped pixel ribbon provides a strong visual connection. | The consonant transition may be awkward for some users; swatch is design vocabulary and a familiar existing word/brand, so association and similarity checks matter. |
| 2 | **PaletteHop** | PAL-it-hop | Most immediately understandable. Suggests moving among looks, including the automatic starting point. Friendly without restricting color count or format. | Palette is commonly misspelled; hop gives a more playful than premium tone. |
| 3 | **Chromabrim** | KROH-muh-brim | More distinctive and polished. Chroma supplies color; brim suggests rich choice and abundance. Broad enough for future image-color workflows. | Needs a descriptor to explain function. The metaphor can feel manufactured, and chroma is less familiar to beginners. |
| 4 | **Dapplegrid** | DAP-ul-grid | Strong visual character: clusters of color and a pixel structure. Can support a memorable asymmetrical tile mark. | Dapple is not universal vocabulary; grid may imply tiling or mosaic creation. |
| 5 | **Tintstride** | tint-stride | Compact, energetic and easy to pronounce, with sound-based alliteration. Suggests a purposeful change of look. | Tint can imply a simple overlay or lighter color rather than full palette conversion; stride can suggest a fitness product without context. |

**Choose Swatchstep for a distinctive tool aimed at creative users. Choose PaletteHop if instant comprehension and a welcoming tone are the strongest priorities.** Chromabrim is the alternative worth testing for a more polished, less literal brand. Dapplegrid and Tintstride are weaker finalists, included to explore different associations rather than to imply equal strength.

Present each name first in the same neutral type with the same descriptor. Different logo polish should not influence the initial naming test. Ask target users what the app does, let them hear and spell the name, and check recall after an unrelated activity. For an initial diagnostic, five to eight relevant users can reveal comprehension problems; that sample cannot establish market-wide preference. Test casual creators as well as pixel artists if the intended audience includes both.

Before selecting a name for an international audience, ask native speakers in the intended markets about pronunciation and unwanted associations. These candidates have been evaluated as English-language names; their cross-language suitability is not established.

## Names removed or deprioritized after screening

| Name | Evidence | Decision |
| --- | --- | --- |
| SwatchSmith | [Existing palette generator](https://www.swatchsmith.com/) | Remove: exact adjacent product. |
| PixHue | [Existing color utility suite](https://pixhue.co/) | Remove: exact adjacent product. |
| ChromaCue | [Color identification app](https://apps.apple.com/pl/app/chromacue-what-color-is-it/id6799562760) | Remove: exact color-software name. |
| Huebound | [Existing color game](https://danhicks853.itch.io/huebound) | Remove: existing software use and additional game hits. |
| Palette Parade | [Art-related game documented by Live2D](https://www.live2d.com/en/business/interview/paletteparade/) | Remove: exact art/software use. |
| Hue Harbor | [Existing Android color-sort game](https://play.google.com/store/apps/details?id=com.drillstudy.hueharbor) | Remove from the shortlist. |
| ChromaFold | [Jenny Sabin Studio installation](https://www.jennysabin.com/chromafold) and an existing scientific model | Deprioritize: established exact-name uses. |
| Dotmuse | [Columbia multimedia research project](https://www.ee.columbia.edu/~xlx/research/DotMuse/index.html) | Deprioritize despite appealing sound: exact multimedia-related use. |
| Tintloom | [A color puzzle within Pocket Puzzle Games](https://apps.apple.com/ca/app/pocket-puzzle-games/id6812787236), plus retail uses | Deprioritize: crowded exact wording. |
| ChromaCove | Existing lighting company and a third-party trademark record surfaced | Deprioritize; current registry status was not established. |
| Hueweft | No obvious relevant product surfaced | Deprioritize for unfamiliar vocabulary and spelling, rather than conflict. |
| TintSpark | No verified close software product; weak concatenated-text and generated-name-list hits | Reserve: understandable but generic and tint-led. |

Other research flagged Chroma Loom through a third-party Android listing, Palettide through a design-company profile and Chromapatch through a medtech-company statement. These are not treated as verified current registry findings, but none improves the shortlist enough to justify more work now.

## The 120 name exploration pool

Each territory contains 15 names. This pool illustrates different strategies, not 120 recommendations. Apart from the five finalists and specifically discussed reserves, names are unscreened and may have existing uses. Listed names do not have endorsed slogans or ownership claims attached to them.

### Palette exploration

PaletteHop, Palette Path, Palette Passage, Palette Roam, Palette Rally, Palette Landing, Palette Folio, Palette Playground, Palette Loop, Palette Voyage, Palette Pick, Palette Atlas, Palette Lane, Palette Switchboard, Palette Field.

### Sound and rhythm

Swatchstep, Swatch Sprint, Swatch Shuttle, Swatch Symphony, Chroma Cadence, Chroma Current, Chroma Caravan, Color Cadence, Color Compass, Palette Pivot, Palette Pollen, Prism Plume, Tintstride, Tint Tumble, Tile Tone.

### Color craft

Swatchloom, Swatchwing, Swatchwright, Swatchcraft, Swatchfold, Swatchstitch, Swatchmosaic, Swatchnest, Chromabrim, Chroma Quilt, Chroma Thread, Huewright, Hueweave, Tint Tinker, Tintweave.

### Transformation and motion

Huepivot, Hueflip, Hueglide, Hueshift, Hueturn, Huepass, Tintshift, Tintglide, Tintturn, Chromaturn, Chromaroll, Chromaflow, Palette Relay, Palette Passageway, Swatchswitch.

### Pixels and image texture

Dapplegrid, Pixel Plume, Pixel Patchwork, Pixel Pollen, Pixel Orchard, Pixel Ribbon, Pixel Rove, Gridglow, Gridwoven, Tinttile, Dotwoven, Dotdawn, Dotgrove, Huegrain, Color Cluster.

### Natural and expressive metaphors

Swatchbloom, Tintbloom, Tintfern, Tintflock, Hueorchard, Huegrove, Hueleaf, Chromabloom, Chromaflora, Palette Petal, Prism Orchard, Prism Fern, Dapplewing, Dapplepath, Dapplemuse.

### Light and color metaphors

TintSpark, Prismspark, Prismtrail, Prismstep, Prismnest, Prismribbon, Prismfield, Lumaribbon, Lumatint, Lumaweft, Luma Orchard, Chroma Gleam, Chromaflare, Hueglimmer, Hueflare.

### Invented and blended names

Paletrail, Paletora, Paletune, Paletivo, Chromaro, Chromora, Chromivo, Chromelio, Tintora, Tintivo, Tintella, Swatchora, Swatchio, Huevia, Huevora.

The literal palette names are easiest to explain but weakest in differentiation. Craft compounds are the best creative territory here. Organic metaphors offer stronger personality at the cost of clarity. Invented names should survive a spoken spelling test before further work. Luma-led names emphasize brightness rather than hue and are consequently weaker for this product. Several sound appealing in isolation while having poor product fit; that is exactly why screening follows generation.

## Product descriptions and slogans

A new brand should explain its category immediately. NN/g's homepage guidance favors clearly communicating what an unfamiliar organization offers. The descriptive line and the memorable line can perform different jobs. [NN/g homepage principles](https://www.nngroup.com/articles/homepage-design-principles/).

| Placement | Recommended copy |
| --- | --- |
| Category descriptor | **Image and GIF palette converter** |
| Main headline | **Give your images a new palette.** |
| Concise product description | **Recolor images and GIFs with automatic, preset, or custom palettes.** |
| Supporting line | **Start with colors drawn from your images, explore curated palettes, or create your own.** |
| Privacy line | **Images stay on your device.** |
| Feature copy for the secondary mode | **Explore 1-bit styles when you want a two-color look.** |
| Search/social description | **Recolor images and animated GIFs with automatic, preset, or custom palettes. Images stay on your device.** |
| Optional brand slogan | **Color with character.** |

Automatic colors are drawn from the collection, including animation frames, rather than independently fixed per image. The supporting line uses plural images for that reason. Preset popularity should be described as curated or familiar, not a universal "most popular" claim.

For a Swatchstep example, the opening reads:

**Swatchstep**  
**Give your images a new palette.**  
Recolor images and GIFs with automatic, preset, or custom palettes. Images stay on your device.

The expressive slogan is optional. Do not put a clever slogan in the only place where an unfamiliar visitor expects the function to be explained.

### Slogan techniques

A multi-method study of more than 800 slogans found a tradeoff between liking and memory: fluent language tended to improve liking while less fluent, more concrete wording and brand inclusion could improve recall. A separate field study associated clarity, benefits, rhyme and creativity with liking without finding a systematic benefit from brevity. Neither establishes the best slogan for this particular app. [Hodges, Estes and Warren](https://doi.org/10.1093/jcr/ucad034), [Dass and colleagues](https://www.sciencedirect.com/science/article/pii/S0148296314001775).

Use parallelism for rhythm, a concrete color benefit for clarity and alliteration where it stays natural. Avoid forcing a rhyme, overstating detail preservation or treating a three-word phrase as necessarily superior to a clear sentence.

| Candidate | Technique | Assessment |
| --- | --- | --- |
| **Color with character.** | Alliteration and double meaning | Best compact expressive line, paired with a literal descriptor. Not screened for exclusive ownership. |
| **Choose a palette. Change the mood.** | Parallel verbs and benefit | Best action-led alternative. |
| **Your images. Your colors.** | Repetition and ownership | Clearest friendly option; less distinctive. |
| **Small palettes. Big possibilities.** | Contrast and rhythm | Useful if limited palettes remain the core story; familiar phrasing. |
| **A new palette. A fresh perspective.** | Parallelism | Broader creative message. |
| Give your pixels a new palette. | Repeated sounds and function | Strong headline for pixel artists; narrower than images. |
| Find a fresh look in every palette. | Benefit | Clear and inviting. |
| Pick your palette. | Alliteration | Catchy, but makes the automatic workflow less visible. |
| A fresh palette for every picture. | Alliteration | Friendly; deemphasizes animation. |
| One palette. Many possibilities. | Contrast | Good batch-color story; generic. |
| New colors. New possibilities. | Parallelism | Flexible but less ownable. |
| Let your colors lead. | Agency | Works with automatic or chosen colors. |
| Every palette changes the story. | Metaphor | More expressive than explanatory. |
| Make room for new colors. | Invitation | Good campaign line. |
| Find your next color story. | Discovery | Campaign language rather than product description. |
| Color outside the usual. | Wordplay | Distinctive tone, but implies rule-breaking rather than palette control. |
| A different palette. A different mood. | Parallelism | Accurate, slightly longer. |
| More ways to color your pixels. | Benefit | Communicates breadth. |
| Pixels with personality. | Alliteration | Memorable but easily mistaken for a generator. |
| New colors. Same character. | Contrast | Appealing but risky: color limits, cleanup and 1-bit styles can remove detail. Do not use as a fidelity promise. |

## Pixel art identity

Use one master symbol with a wordmark and a horizontal lockup. A consistent logo does not require the identical file dimensions everywhere. Color, monochrome, favicon and maskable versions should derive from the same identifying geometry. A slogan should remain separate from small icons.

Apple's icon guidance supports a simple central concept and recognizable shapes. IBM's icon system demonstrates consistent grids and spacing, while Google's identity case study demonstrates compact and full forms belonging to one system. These principles inform the proposals; they do not prove any sketch is distinctive or recognizable. [Apple app icons](https://developer.apple.com/design/human-interface-guidelines/app-icons), [IBM icon design](https://www.ibm.com/design/language/iconography/ui-icons/design/), [Google identity](https://design.google/library/evolving-google-identity).

### Three concept sketches

| Concept | Construction | Why it fits | Risk |
| --- | --- | --- | --- |
| **Pixel ribbon** | A connected stepped ribbon with three broad color regions and two alternating notches | Best choice: color transformation, an identifiable silhouette and a subtle S association for Swatchstep. Still usable with another name. | It can read as an S monogram; avoid reducing it to a generic stacked-bar symbol. |
| **Palette portal** | A pixel image frame whose right edge becomes a stepped strip of colors | Connects existing artwork with color choices and fits PaletteHop. | More generic; tiny gaps can disappear. |
| **Swatch bloom** | Four asymmetric pixel clusters surround a square opening | Communicates variety and discovery, especially with Dapplegrid or an organic name. | Multicolor blooms are crowded; resembles a flower or decorative motif. |

Original geometric SVG sketches and a [rendered comparison board](brand-concepts/logo-directions.png) are in `brand-concepts/`. They demonstrate directions, not a finished cleared identity. The board includes color and monochrome views, small-size samples and a provisional Swatchstep wordmark. The three concepts are alternatives; choose one for production rather than mixing them across surfaces.

**Recommend the pixel ribbon.** It retains the medium's pixel character without a binary split, an old B initial or a coin that can suggest currency. Begin with three solid colors rather than a rainbow of thin strips. The brand mark should have a fixed palette; the live empty-wall demo can show the same shape recolored by current settings and should be clearly treated as example artwork.

### Production rules

- The sketches use a 16 by 16 logical grid, integer coordinates and filled square geometry. Three colors, transparent background and no blur or gradient in the identifying mark.
- Keep the monochrome silhouette identical. Test light and dark surroundings; recognition must not depend on hue.
- Use the same master geometry for transparent PNGs, favicon SVG, installation icons, Help, README and social cards. A social card can include the wordmark and description at readable sizes.
- Enlarge raster exports by integer multiples with nearest-neighbor sampling. At a CSS size such as 24px, a 16px logical grid scales fractionally; test device pixel ratios and use an optical variant only where necessary. Browser pixelated rendering helps, but is not a guarantee of even pixels under every scaling condition. [MDN crisp pixel art](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look).
- Treat the existing 28px coin animation's replacement as a separate animation task derived from the chosen master. Prefer stable geometry with restrained color changes. Respect reduced motion and retain a static canonical mark.
- Keep at least two logical pixels of clear space around the prototype silhouette. Confirm minimum sizes through recognition testing rather than assuming that the working grid establishes a brand standard.
- Supply the existing 192px/512px PWA sizes and 180px Apple-touch size, plus an opaque maskable icon. Fit its identifying mark within the centered safe circle of radius 40% of icon width. [web.dev maskable icons](https://web.dev/articles/maskable-icon).
- Maintain a stable favicon URL; Google's current search guidance recommends square assets larger than 48px. A pixel SVG and suitable larger raster can share the same geometry. [Google favicon guidance](https://developers.google.com/search/docs/appearance/favicon-in-search).

Small rendered samples provide a visual sanity check, not a measured recognition result. Test the top two name/mark combinations in the actual Help dialog and install icon before finalizing. Show tiny symbols without their names and check whether users can distinguish and later recognize them.

## Rebrand implementation map

The immediate decision is the name and identity direction. After that, a rebrand should be one coherent change across current surfaces.

| Surface | Required change |
| --- | --- |
| `index.html` | Title, description, Open Graph/Twitter names and copy, image/alt text and canonical/public URLs as applicable. |
| `public/manifest.webmanifest` | Installed name and icons; optional short name after testing. |
| `public/` and `pwa-assets.config.js` | One master mark and generated favicon, PWA, Apple-touch and maskable assets. |
| `src/assets/logo.png` and `logo.gif` | Replace static and demo artwork with derivatives of the approved symbol. |
| `src/App.svelte` | Help/welcome name, description, palette-first steps, example name, errors and download notices. Make mode-specific instructions follow actual current controls. |
| `src/lib/save.js` | User-visible ZIP name. Internal identifiers do not need cosmetic renaming to achieve a user-facing rebrand. |
| README, CLAUDE and current guides | Lead with automatic/curated/custom palettes; reconcile preset counts and defaults; explain 1-bit as a supported secondary mode. |
| Main specification | Update current identity and Help/empty-state behavior; preserve historical records explicitly as history. |
| Hosting/repository identity | Decide whether to keep `/bitify/` or change the repository/address. Prepare redirects and links if the public address changes. |
| Persistent settings | Preserve `bitify` and `bitify-palettes-v1` storage or migrate deliberately. Cosmetic replacement can erase the appearance of saved settings and palettes if keys change without migration. |

Before adopting a finalist, check similar names and related goods in the relevant trademark registries, then current domains, package/repository names and handles. Exact web searches are only an initial filter: USPTO considers sound, appearance, meaning and overall commercial impression with related goods/services. Different spelling and an empty Google result do not settle that question. [USPTO likelihood of confusion](https://www.uspto.gov/trademarks/search/likelihood-confusion).

The practical selection order is name comprehension and recall, deeper conflict screening, then refinement of the chosen mark and copy, followed by the complete implementation map. My preferred package to test first is **Swatchstep + the pixel ribbon + “Recolor images and GIFs with automatic, preset, or custom palettes.”**
