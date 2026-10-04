# chernoff-face

A [Chernoff face](https://en.wikipedia.org/wiki/Chernoff_face): a face
whose features show data. Each feature is a number from **0 to 1**, with
0.5 neutral, so you map each variable of a data set onto one feature
(revenue → smile, risk → brow slant, size → face width) and read a row of
faces at a glance. The drawing is an SVG in the light DOM, styled with
CSS.

## Usage

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@johnhenry/data-plot/src/chernoff-face/global.mjs"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@johnhenry/data-plot/src/chernoff-face/index.css" />

<chernoff-face smile="0.9" eye-size="0.7" aria-label="Q3: well ahead of plan"></chernoff-face>
<chernoff-face smile="0.2" brow-slant="0.1" aria-label="Q4: behind"></chernoff-face>
```

## Features

| Attribute | 0 | 1 |
|---|---|---|
| `face-width` | narrow face | wide face |
| `eye-size` | small eyes | large eyes |
| `eye-spacing` | close-set eyes | far-apart eyes |
| `pupil-size` | small pupils | large pupils |
| `gaze` | looking left | looking right |
| `brow-slant` | angry brows | worried brows |
| `nose-length` | short nose | long nose |
| `mouth-width` | narrow mouth | wide mouth |
| `smile` | frown | smile |
| `mouth-open` | closed mouth | open mouth |

Values outside 0–1 are clamped, and missing or non-numeric ones are 0.5.
Map your data with something like `(value - min) / (max - min)`. In
script, the `features` property reads all of them at once in camelCase
(`{ eyeSize: 0.5, smile: 0.9, … }`), and setting it writes the attributes
you include. `FEATURES` (a named export) lists them with what 0 and 1
mean.

## Faces as plot marks

In a `<data-plot>`, a face can be the mark: `x` and `y` place it, and
`:attr` bindings map fields onto features, each scaled to 0–1 across the
data.

```html
<data-plot aria-label="Teams: velocity against morale">
  <datalist>
    <option label="Team A" data-velocity="2" data-morale="7" data-risk="0.2"></option>
    <option label="Team B" data-velocity="8" data-morale="3" data-risk="0.9"></option>
  </datalist>
  <plot-marks x="velocity" y="morale">
    <template><chernoff-face :smile="morale" :brow-slant="risk" aria-label="{label}"></chernoff-face></template>
  </plot-marks>
</data-plot>
```

## API

<!-- api:start (generated from custom-elements.json by `npm run manifest`; edit the JSDoc instead) -->

### Attributes

| Attribute | Property | Type | Description |
|---|---|---|---|
| `face-width` |  | `number` | 0 narrow … 1 wide. Default 0.5, like every feature. |
| `eye-size` |  | `number` | 0 small … 1 large eyes. |
| `eye-spacing` |  | `number` | 0 close … 1 far-apart eyes. |
| `pupil-size` |  | `number` | 0 small … 1 large pupils. |
| `gaze` |  | `number` | 0 looking left … 1 looking right. |
| `brow-slant` |  | `number` | 0 angry … 1 worried brows. |
| `nose-length` |  | `number` | 0 short … 1 long nose. |
| `mouth-width` |  | `number` | 0 narrow … 1 wide mouth. |
| `smile` |  | `number` | 0 frown … 1 smile. |
| `mouth-open` |  | `number` | 0 closed … 1 open mouth. |

### Properties

| Property | Type | Description |
|---|---|---|
| `features` | `Record<string, number>` | Every feature's current value (0–1), keyed in camelCase (`{ eyeSize: 0.5, smile: 0.9, … }`). Setting it writes the matching attributes; keys you leave out are unchanged. |

### CSS custom properties

| Property | Description |
|---|---|
| `--chernoff-face-fill` | Fill of the face (index.css). |
| `--chernoff-face-stroke` | Line color (index.css; defaults to currentColor). |

<!-- api:end -->

## Styling

| Selector | Matches |
|---|---|
| `chernoff-face svg` | The drawing (its `fill`/`stroke` are inherited by the parts) |
| `.face`, `.eye`, `.pupil`, `.brow`, `.nose`, `.mouth` | The parts |
| `.mouth[data-open]` | The mouth when it's open (a closed shape you can fill) |

Without any CSS it's a line drawing in `currentColor`, an inline block
4em square. `index.css` fills the face with a tint of its line color,
and the eyes with the page background (`Canvas`). Adjust it with `--chernoff-face-fill` and `--chernoff-face-stroke`.

## Notes

- It's `role="img"`. Without an `aria-label`, it labels itself with the
  features that aren't neutral ("Face: smile 0.9, eye size 0.7"), kept up
  to date. Write your own label for what the face *means*.
- Changing a feature updates the existing SVG in place; nothing is
  re-parsed.
- In a plot, map fields onto features with `:attr` bindings:
  `<plot-marks x="revenue" y="growth"><template><chernoff-face
  :smile="morale" :brow-slant="risk"></chernoff-face></template></plot-marks>`
  scales each field to 0–1 across the data.
- Formerly in `@johnhenry/domkit` (and before that its
  `experimental/chernoff-face`, whose features were raw SVG coordinates:
  `upperlip`, `irisoffset`, …).
