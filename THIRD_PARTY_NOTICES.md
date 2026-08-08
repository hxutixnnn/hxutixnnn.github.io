# Third-party notices

The original repository was based on the LekoArts Gatsby Minimal Blog starter. Its notice is preserved even though the Gatsby/theme implementation is no longer shipped:

> The BSD Zero Clause License (0BSD)
>
> Copyright (c) 2020 LekoArts
>
> Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

## Desktop interaction primitives

Tien OS uses the pinned [`@base-ui/react@1.6.0`](https://github.com/base-ui/react/tree/1.6.0) package (Copyright © 2023 Base UI Contributors) for menu and menubar primitives under the MIT License:

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: the above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Note: the earlier `@base-ui-components/react` package name was renamed by the upstream project to `@base-ui/react`; this repository depends on the current name.

## Wallpapers

The Light-mode wallpaper “assorted-color smoke” is Copyright Paweł Czerwiński and is distributed under the [Unsplash License](https://unsplash.com/license), which permits free commercial and non-commercial use, copying, modification, and distribution without attribution. The authoritative photo page is <https://unsplash.com/photos/assorted-color-smoke-3k9PGKWt7ik>. It was resized, cropped, and compressed for local web delivery; it is not sold or redistributed as a standalone stock-photo service.

## Interface icons

tienOS includes a subset of Font Awesome Pro 7.3.1 Classic Solid icons, copyright 2026 Fonticons, Inc., under the repository owner's Font Awesome Pro Commercial License. The required license material is distributed with the icons at [`public/fontawesome/LICENSE.txt`](public/fontawesome/LICENSE.txt).

Asset-specific rights and provenance are authoritative in [`src/assets/provenance.yml`](src/assets/provenance.yml). No code or assets from the macOS/Tahoe visual replicas or liquid-glass candidates surveyed in [`docs/visual-baseline.md`](docs/visual-baseline.md) are included.
