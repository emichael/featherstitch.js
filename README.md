Featherstitch.js
================

Authors:
- Helga Gudmundsdottir
- Helgi Sigurbjarnarson
- Ellis Michael

How To Run
----------
Simply open `dist/app.html` in a web browser. For the best viewing experience,
zoom out a bit. In order to build the code from source, first run `npm install`
and then run `npm run-script build` or run `npm run-script server` to run the
dev server.

About
-----
Implements the core patch-based algorithm of
[Featherstitch](http://featherstitch.cs.ucla.edu/publications/featherstitch-sosp07.pdf).

The viewing area on the right displays patches currently sent to the kernel.
Advancing and of the example applications on the left will send patches to the
kernel (provided the file system has been initialized with mkfs).

The three data rows at the bottom display the current status of the kernel
buffer cache, the disk cache, and the disk (which we assume to all be the same
size for simplicity). The step buttons, flushing the kernel buffer, and playing
all advance the simulation.

Optimizations can be toggled above the patch viewing area.
