# WebGL GLSL Shader Editor Extension for Google Chrome

A Chrome DevTools extension to help you edit shaders live in the browser. Very much based on Firefox DevTools Shader Editor.

![Shader Editor](/about/snapshot.jpg)

[Install the extension from the Chrome Store](https://chrome.google.com/webstore/detail/shader-editor/ggeaidddejpbakgafapihjbgdlbbbpob)

Alternatively [download the extension (.crx)](/extension/ShaderEditor.crx)

Some more info about this project: [Creating a Plug'n Play Live WebGL Shader Editor](http://www.clicktorelease.com/blog/live-webgl-shader-editor)

### How to install ###

While in beta, you can load the extension from disk directly:
- Checkout the repo
- Open Chrome's Extensions page (Settings / More tools / Extensions)
- Enable Developer Mode
- Click on Load unpacked extension...
- Select the folder /src in the checked out project

Alternatively, you can pack the extension yourself and load by dropping the .crx file in the Extensions page.

### How to use ###

- Browse to a page with WebGL content (you can find many here http://threejs.org/, here https://www.chromeexperiments.com/webgl or here http://www.webgl.com/)
- Open DevTools
- Select the Shader Editor tab
- The extension needs to instrument WebGLRenderingContext, so the inspected tab has to be reloaded with the script injected. Hit the Reload button.
- If there are calls to .createProgram, the UI will show a list
- Select a program to see its vertex shader and fragment shader

### Stuff that works ###

You can expand the editor area by clicking the Fullscreen button on the bottom right corner.

If the shader code is obfuscated, you can click on the Autoformat button.

### Stuff that doesn't work ####

Changing stuff in several places probably isn't tracked correctly, so if you edit a shader and the JavaScript in the page also edits it, there'll be weird side-effects.

**More importantly: the shader compiling and testing is done with a separate WebGLRenderingContext, so is the page is using extensions, the shader won't compile.** The solution is either track the .getExtension method and reproduce it in the extension GL context, or pass the testing to the injected library.

### TO-DO ###

As always: forks, pull requests and code critiques are welcome!

- Highlight shaders when hovering over list item
- Check why some pages don't load (like http://david.li/flow/)
- Save to disk (?)
- Add uniform tracking to display values fed to the shader
- Integrating @zz85's GLSL Optimizer? (https://github.com/zz85/glsl-optimizer)

#### License ####

MIT licensed

Copyright (C) 2015 Jaume Sanchez Elias, http://www.clicktorelease.com