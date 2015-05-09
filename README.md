# WebGL GLSL Shader Editor Extension for Google Chrome

A Chrome DevTools extension to help you edit shaders live in the browser. Very much based on Firefox DevTools Shader Editor. [Here's a video showing it in action](http://www.youtube.com/watch?v=nPcUH3b3pFY)

Twin project of [Web Audio API Editor Extension for Google Chrome](https://github.com/spite/WebAudioExtension)

![Shader Editor](/about/snapshot.jpg)

[Install the extension from the Chrome Store](https://chrome.google.com/webstore/detail/shader-editor/ggeaidddejpbakgafapihjbgdlbbbpob)

Some more info about this project: [Creating a Plug'n Play Live WebGL Shader Editor](http://www.clicktorelease.com/blog/live-webgl-shader-editor)

### How to install ###

While in beta, you can load the extension from disk directly:
- Checkout the repo
- Open Chrome's Extensions page (``Settings / More tools / Extensions``)
- Enable ``Developer Mode``
- Click on ``Load unpacked extension`...
- Select the folder /src in the checked out project

Alternatively, you can pack the extension yourself and load by dropping the .crx file in the Extensions page.

### How to use ###

- Browse to a page with WebGL content (you can find many here http://threejs.org/, here https://www.chromeexperiments.com/webgl or here http://www.webgl.com/)
- Open DevTools
- Select the ``Shader Editor`` tab
- The extension needs to instrument ``WebGLRenderingContext``, so the inspected tab has to be reloaded with the script injected. Hit the ``Reload`` button.
- If there are calls to ``.createProgram``, the UI will show a list
- Select a program to see its vertex shader and fragment shader

### Stuff that works ###

You can expand the editor area by clicking the Fullscreen button on the bottom right corner.

If the shader code is obfuscated, you can click on the Autoformat button.

Enabling extensions is mirrored in the environment to test shaders.

### Stuff that doesn't work ####

Changing stuff in several places probably isn't tracked correctly, so if you edit a shader and the JavaScript in the page also edits it, there'll be weird side-effects.

~~**More importantly: the shader compiling and testing is done with a separate ``WebGLRenderingContext``, so is the page is using extensions, the shader won't compile.** The solution is either track the ``.getExtension`` method and reproduce it in the extension GL context, or pass the testing to the injected library.~~

### TO-DO ###

As always: forks, pull requests and code critiques are welcome!

- Detect when the page is reloaded or changed [Issue #1](https://github.com/spite/ShaderEditorExtension/issues/1)
- ~~Highlight shaders when hovering over list item [Issue #3](https://github.com/spite/ShaderEditorExtension/issues/3)~~
- Check why some pages don't load (like http://david.li/flow/) [Issue #4](https://github.com/spite/ShaderEditorExtension/issues/4)
- Figure out why it doesn't .postMessage the first time it's injected [Issue #5](https://github.com/spite/ShaderEditorExtension/issues/5)
- Figure out why it doesn't work on Android over remote debugging [Issue #6](https://github.com/spite/ShaderEditorExtension/issues/6)

Nice to have:

- Save to disk (?)
- Add uniform tracking to display values fed to the shader
- Integrating @zz85's GLSL Optimizer? (https://github.com/zz85/glsl-optimizer)

#### Changelog ####

- v1.0.0 initial release
- v1.0.1 fix extensions not being enabled 
- v1.0.2 added colour highlighting for hover
- v1.0.3 rolled back, colouring introducing bugs
- v1.0.4 fixed some shaders not compiling (issue #4)
- v1.0.5 fixes and compiler status
- v1.0.6 redone main code, highlight brough back
- v1.0.7 error checks for attributes (possible bug?)
- v1.0.8 new icon (thanks @ebraminio & @markusfisch), restored extension support

#### License ####

MIT licensed

Copyright (C) 2015 Jaume Sanchez Elias, http://www.clicktorelease.com