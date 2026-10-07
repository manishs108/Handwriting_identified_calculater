# CalcInk

CalcInk is a browser-based handwritten arithmetic calculator. Write an expression
on the canvas, finish it with `=`, and CalcInk recognizes the handwriting and
evaluates the result entirely on the device.

## Quick Start

### Prerequisites

- Node.js `20.19+` or `22.12+` (required by the checked-in Vite 8 dependency)
- npm

### Run locally

```bash
npm install
npm run dev
```

Vite prints the local URL when it starts (normally `http://localhost:5173`).
Open that URL in a browser.

### Production build

```bash
npm run build
npm run preview
```

The project also provides `npm test` and `npm run lint`.

## How it works

Canvas strokes are preprocessed and sent to a dedicated Web Worker. The worker
runs the local ONNX encoder and decoder, then returns handwritten-math output
to a strict normalization and safe arithmetic pipeline. Calculation uses a
tokenizer, parser, AST, and evaluator; it does not use `eval()` or `Function()`.

All application inference is client-side. The model assets are served from
`public/models/comer/`; CalcInk does not send handwriting to a cloud OCR or
calculation service.

## Model Attribution

- **Model family:** CoMER — *Modeling Coverage for Transformer-based
  Handwritten Mathematical Expression Recognition* (ECCV 2022).
- **Purpose in CalcInk:** recognition of handwritten mathematical expressions.
- **Integration/runtime:** [`ink-on` v0.1.0](https://github.com/kimseungdae/ink-on)
  supplies the browser integration used by CalcInk. It runs the CoMER-style
  INT8 ONNX encoder and decoder with ONNX Runtime Web/WASM in a Web Worker.
- **Model source:** the model family originates from the
  [official CoMER project](https://github.com/Green-Wood/CoMER). The `ink-on`
  project documents its CoMER-based browser runtime and publishes compatible
  model assets through its
  [GitHub releases](https://github.com/kimseungdae/ink-on/releases).
- **Architecture:** a DenseNet-plus-Transformer encoder produces image features;
  an autoregressive Transformer decoder generates the mathematical-expression
  tokens. CalcInk uses `beamWidth: 3` and restricts recognition to number-mode
  output before normalizing it for arithmetic evaluation.
- **License:** the installed `ink-on` integration is
  [Apache-2.0](https://github.com/kimseungdae/ink-on/blob/main/LICENSE).

### Bundled ONNX asset provenance

CalcInk includes `encoder_int8.onnx`, `decoder_int8.onnx`, and `vocab.json` in
`public/models/comer/`. These copied files do not include a source URL, release
identifier, checksum, or license notice in this repository. Therefore, the
Apache-2.0 statement above applies to the `ink-on` integration, **not** to an
unverified license claim for the bundled ONNX files. Before redistributing the
model assets beyond this project, record their exact upstream release/source and
applicable license.

## Further documentation

- [Recognition pipeline](docs/RECOGNITION_PIPELINE.md)
- [Math engine](docs/MATH_ENGINE.md)
- [UI and computational integration contract](docs/INTEGRATION_CONTRACT.md)
