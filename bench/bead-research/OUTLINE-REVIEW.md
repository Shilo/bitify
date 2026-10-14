# Independent outline investigation review

Research only. This reviewer owns this text report and does not implement or tune
the methods. Media and any per-pixel artifacts remain in ignored private storage.
The judgments below are reviewer assessments, not maker ground truth.

## Before methods and held-outs

The reviewer read the research scope, handoff, product instructions, design and
performance contracts. The required native character SHA-256 is
`638eac1fb9938856b468b9d600ccf9cdf2da74a098b790544119eaf8312cd233`.
It was verified before native and nearest-neighbor 8x inspection. Its private
location is `.tmp/bead-research-private/fixtures/outline-character-latest.png`.
The native file is 96x96; the 768x768 enlargement was decoded and compared with
the native RGBA using nearest-neighbor replication: zero differing channels.

Evaluation-only regions, recorded before viewing candidate results:

- **Keep:** eyelids/lashes and mouth; animal-hat eyes, nose and tuft; hand/finger
  separation; knee curves; hair-to-face boundary; transparent wedges separating
  garments or strands. These features communicate expression, pose or material.
- **Uncertain:** stepped hat silhouette and ear ends; tan/brown changes along the
  hair boundary; broad dark joins where hair overlaps sleeve; selective side
  border breaks; knee/clothing arcs. Local thickness can be intentional emphasis.
- **Possible repair:** visually inconsistent brown runs on outer hair/hat edges;
  thick joins along hair/sleeve or knee curves; apparent skipped dark pixels with
  opaque fill below. Each is a hypothesis for evaluation, not an annotated error.

These prose marks are not masks or algorithm inputs. No corrected artist target
exists. A pleasing change cannot be reported as recovery of the maker's intent.

## Initial challenge to the frozen candidate set

| Candidate | Potential benefit | Failure to challenge |
| --- | --- | --- |
| Exterior boundary-seeded dark-shade union | More consistent existing border color, unchanged alpha | A touching same-colored shadow, braid or eye can flood inward; an alpha boundary does not identify artistic outline ownership. Palette changes can also change the selected color. |
| Solid inner alpha border | Predictable opt-in silhouette styling with no canvas expansion | Narrow limbs and tiny components can become entirely border; intentional selective borders disappear; transparent holes must have an explicit exterior-only policy. |
| Conservative bridge plus topology thinning with majority fill | Some gaps and double-width runs may become more regular | Wanted and unwanted gaps can share geometry; topology says little about line weight; local fill votes can borrow a neighboring garment across an occlusion. |
| Silhouette topology-constrained one-pass regularization | A few isolated protrusions can disappear | One-pixel turns may describe anatomy or motion; preserved components/holes do not preserve a recognizable silhouette. Scan order is a potential hidden parameter. |
| Separate internal dark-line adjustment | Might reduce thick interior seams | Hair, folds, lashes, fingers and shading transitions share dark colors. The input needs segmentation the minimal interface does not supply. |

Color consolidation, border styling, closing gaps and thinning are separate artistic
operations. One setting that bundles them makes a successful color result depend
on accepting unrelated geometry edits. The clearest possible minimal contract is
an explicitly opt-in solid exterior border; success there would not validate repair
or internal-line detection. Existing Cleanup On must retain its current policy.

Acceptance should compare actual source appearance and correction effort against
unchanged, current Cleanup, cap16 and simple color union. Lower 2x2 counts or fewer
components alone cannot establish benefit. Facial damage repeated across samples,
very small improvements needing multiple controls, or masks required to rescue
results are grounds for no-go. Thresholds, color choice and candidate selection
must freeze before held-outs. Any post-held-out change needs a separately named
exploratory result and cannot replace the original result.

Metrics need the following interpretation limits. The existing `endpoints8`
statistic counts mask pixels of degree at most one; diagonally adjacent turns or
nearby strands can hide meaningful stroke endpoints. `blocks2x2` does not measure
width along diagonal runs, corners or curves. A width statistic computed on a
different selected-dark mask after recoloring conflates geometry and classification.
Report alpha changes and direct label changes independently. Pair foreground
8-connectivity with background 4-connectivity when claiming topology preservation;
pixel-art corner contacts have different meaning under other choices. A skeleton
length or distance-to-background estimate is a surrogate, not an artistic measure.

GIF acceptance cannot be inferred from stills. Fixed-coordinate agreement can
abstain on a moving defect, whereas framewise border-color selection can pump with
changing silhouettes or palette occupancy. Timing and full-source preview/export
identity need their own checks. A new remembered wall-wide setting would also act
on later imports and mixed opaque/transparent art; applicability or abstention
must be visible without requiring per-sprite expert adjustment.

## Review of the declared protocol

The reviewer read `OUTLINE-PLAN.md` before candidate outputs. Its actual Union is
boundary-only, which avoids the inward-flooding risk in the initial candidate
concept. That narrower behavior cannot repair line width or internal brown seams.
The fixed most-frequent boundary-dark seed needs scrutiny on clipped or opaque
images: the canvas edge counts as exterior even without useful transparency.

The planned held-outs exclude prior shading exploration and prior shading held-outs;
the split is fresh for this evaluation but still drawn from one correlated corpus.
The 12/24 clear-wins and at most two material-harms gate is a declared practical
judgment; it cannot be translated into a population reliability percentage.

The initial implementation recomputes seed/shade selection for output line metrics.
Those metrics can change by reclassification. Direct labels, alpha and the actual
fixed input mask are needed to interpret them. `Repair` calls the existing iterative
sequential `thinSimple`; one frozen fill pass is not one thinning pass. A global
foreground8/background4 check is needed for every claimed topology preservation,
particularly at canvas edges and under simultaneous proposals.

## Independent results and verdict

**Do not add an outline cleanup setting from this experiment.** No candidate gives
a clear, meaningful source-level win on the latest character and fails the declared
gate of twelve held-out improvements. The reviewer found **zero clear held-out wins for
each of the five candidates**; neutral and preference-dependent changes were not
promoted to wins. This is a subjective, conservative assessment of this corpus,
not an artistic accuracy score or a claim that all outline methods must fail.

The reviewer inspected all six raw/auto64 and all six bead24 nine-column sheets,
then made separate nearest-neighbor enlarged, common-crop comparisons for all 24
held-out sources. The reviewer inspected all 15 authored controls, the exact
latest character comparison and its enlarged face/hands crops. Source-level
ratings below consider both renderings but count each source once. Columns are
Union, Solid, Repair, Regularized and All lines. `N` means neutral/no useful gain,
`U` means uncertain or preference-dependent, `H` means a material visual harm.
There are no `W` clear-win ratings. Baselines inspected were unchanged, today's
Cleanup, cap16 and global color union, not only the unchanged thumbnail.

| Source | Union | Solid | Repair | Regularized | All lines | Most useful observation |
| --- | --- | --- | --- | --- | --- | --- |
| s142 | N | H | U | H | H | Dark shoulder/limb bands broaden or collapse; contour spikes lose shape. |
| s145 | N | N | N | N | H | Opaque icon gets little exterior work; internal decorative separations change. |
| s086 | N | U | U | U | H | Weak exterior changes; internal armor/trouser color boundaries collapse. |
| s092 | U | U | U | H | H | Darker border has no clear advantage; facial/hair and clothing detail is flattened. |
| s110 | N | U | N | U | H | Internal face and clothing marks change without a useful contour improvement. |
| s138 | H | H | H | H | H | Brown foot/beak seed contaminates the gray feather perimeter; solid adds a brown halo. |
| s059 | U | U | U | U | U | Darker/coarser aura rocks may be a preference; no demonstrated repair advantage. |
| s077 | N | U | H | U | H | Handle/cavity detail changes; All lines removes the inner cavity's original form. |
| s096 | N | N | N | U | U | Existing contour is already legible; joint/ear changes have no clear benefit. |
| s046 | H | H | H | H | H | Shared perimeter color suppresses differing cat palettes; internal edits alter expressions. |
| s053 | N | N | N | N | N | Flat opaque input offers no outline problem. |
| s155 | N | N | N | U | H | Interior neck/garment separation is lost; exterior work does not simplify placement meaningfully. |
| s057 | U | U | H | U | H | Thinning changes intended ring bands and their breaks; recoloring is only an aesthetic option. |
| s070 | N | N | N | H | H | All lines erases the mouth; alpha regularization changes hands/feet. |
| s130 | N | H | N | H | H | Opaque tiles get a canvas frame or altered teeth, contrary to the existing tile pattern. |
| s031 | U | U | N | H | H | Regularization blunts hair points; All lines flattens clothing shading/seams. |
| s058 | N | U | N | U | H | Armor/weapon bands change inside; weak exterior benefit. |
| s069 | N | U | H | U | H | Interior/near-contour edits disrupt helmet and garment detail. |
| s133 | U | H | U | H | H | Solid darkens the narrow silver staff; All lines changes robe/fold structure. |
| s097 | U | U | U | U | U | Darker chest contour is a plausible style preference; thinning changes material seams. |
| s030 | N | U | U | H | H | Thin skeleton joints/ribs are shape cues; repeated removal changes anatomy. |
| s143 | N | U | U | U | H | All lines changes eye surround and nose/muzzle, visibly changing expression. |
| s044 | N | H | U | H | H | Solid borders bright snow; All lines removes the brick pattern. |
| s118 | N | H | N | H | U | Solid/Regularized frame opaque grass texture rather than finding a sprite contour. |

| Candidate | Clear wins | Neutral | Uncertain | Material harms |
| --- | ---: | ---: | ---: | ---: |
| Union | 0 | 16 | 6 | 2 |
| Solid | 0 | 5 | 12 | 7 |
| Repair | 0 | 10 | 9 | 5 |
| Regularized | 0 | 2 | 11 | 11 |
| All lines | 0 | 1 | 4 | 19 |

Some neutral inputs are tiny, opaque, already outlined or near-identical after
the candidate. That limits the opportunity to help. It does not authorize
silently excluding them after evaluation: the intended setting acts on a mixed
wall. Several uncertain results could be preferred by a maker wanting a heavier
outline, but their preference was not supplied and they do not demonstrate gap,
double-pixel or jagged-run repair.

On the required latest character, current Cleanup changes zero cells. Union
changes 127 boundary colors, Solid 129, Repair 164 including 37 inside cells,
Regularized 132 including nine alpha additions, and All lines 693 including 566
inside cells. Boundary Union has a modest coherent-edge effect; it preserves
interior shading better than global color union's 565 inside changes, but leaves
the requested doubled/jagged and skipped runs unresolved. Solid is almost the
same result here. Repair changes only a little line geometry while preserving
the thick inner intersections that motivated the investigation. All lines
visibly changes the left eyelid/lash profile and the animal motif/garment lines.
Its fewer dark 2x2 blocks do not make that damage a correction. Regularized adds
occupied cells and can increase selected-dark 2x2 blocks; it is not a one-pixel
width solution. Cap16 changes 530 colors but keeps silhouette/pose; it also fails
to repair geometry, yet offers no need for the proposed new controls.

## Controls and interpretation

The paired accidental and intentional gaps are identical inputs with different
targets. All lines closes both, succeeding on one and harming the other. Repair
abstains on both because these lines lie outside its exterior band. All lines
changes ten cells on the authored double line, reducing its width, but matches
zero of ten requested replacements: it removes row 9 while the authored target
requests removal of row 10. Re-running the method on the procedural labels
confirmed both the row choice and the recorded 0/10 target counter. Width reduction
therefore does not establish preferred stroke placement. All lines also removes
eight of fourteen declared keep cells at the thick bend and damages two of nine
eye/glint/text keep cells.
Solid/Regularized correct the authored shade seam's seven cells but also replace
all seven intentional selective-border cells and darken the clipped sprite edge.
Union's fixed shade detector misses the authored shade seam entirely. None fixes
the authored spur. These are practical benefit/harm tradeoffs, not a semantic
intent detector hidden behind a topology test.

The reported global alpha component/hole checks support the bounded topology
claim for Regularized on these inputs. They do not support artistic width or
stroke-topology claims. Repair's reported selected-dark holes can change even
though simple thinning is topology-constrained: bridge additions and the subset
of accepted fill removals are different operations. This reviewer does not
interpret the output detector's holes, endpoints, pixel count or grid-distance
histogram as preservation of the original meaningful strokes.

## Animation, provenance and interface limits

The numerical temporal experiment uses common RGB label identities across real
GIF frames, so index renumbering is not the explanation for rejected edits.
On a003, fixed-coordinate agreement retains zero first-frame edits for Union,
Solid, Repair and Regularized; All lines retains two of 2,484. Framewise repairs
change hundreds or thousands of cells as the clip moves. The translated authored
All-lines example retains eight of ten first-frame changes because the long line
overlaps across translations; this does not mean it tracks a moving line. The
methods and this agreement rule have no validated motion-aware outline contract.
Numerical rejection is not a playback/timing validation.
The reviewer also inspected first/middle/last a003 panels at frames 0, 4 and 8.
Solid/Regularized draw conspicuous dark borders on pale/yellow effects, and the
internal methods change ring/flame patterns rather than recovering a single
shared contour style. This reinforces the styling/repair distinction; three
static frames do not establish visible flicker or a smooth playback result.

The exact latest source hash, protocol hash and algorithm hashes are recorded in
the result artifact. No old Snowie measurements were substituted. Reviewer marks
were prose only and were not fed into the implementation. No held-out output
prompted threshold tuning. The author corrected the local topology test on
procedural controls before corpus evaluation; that disclosed mechanical repair
does not constitute held-out tuning. Code/report provenance changes made after
the run must remain distinct from method changes. The corpus is purposive,
several sources are related, and one reviewer's ratings cannot establish maker
preference, mobile performance or population reliability.

A standalone Solid border could have an intelligible artistic contract: opt-in
inner silhouette recoloring, unchanged alpha/canvas, exterior background only,
explicit palette member as border color, no internal-line or one-pixel promise.
The automatic seed often chooses a material color, such as chicken feet, and
opaque/clipped sources need applicability behavior. A single remembered toggle
would act inconsistently across these assets; adding Exterior/All and Auto/Solid
plus repair knobs increases decisions without demonstrating benefit. This
experiment therefore does not justify adding even Solid as part of Cleanup.
It distinguishes a potentially understandable styling effect from evidence that
this particular effect deserves production UI now.

Keep existing Cleanup Off/On unchanged. Stop this candidate investigation with a
no-add decision. Desktop/phone live interaction, cancellation, full-resolution
preview/export identity and memory cost were not validated because the candidates
failed the declared benefit gate; the private precomputed sheets are visual
evidence, not production-browser/export validation. No production implementation,
deployment or new user setting follows from this review.

All comparison media are private under `.tmp/bead-research-private/outline/`.
The nine-column sheets are `heldout-{raw,bead24}-1.png` through `-6.png`; enlarged
reviewer sheets are `reviewer-{source}-{raw,auto64}.png`, and latest crops have
`latest-raw-{method}-{face,hat,hands}.png` names. These paths disclose no pixel data.
