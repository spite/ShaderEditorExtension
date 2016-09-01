var links = document.querySelectorAll('a[rel=external]');

for (var j = 0; j < links.length; j++) {
    var a = links[j];
    a.addEventListener('click', function(e) {
        window.open(this.href, '_blank');
        e.preventDefault();
    }, false);
}

var container = document.getElementById('container'),
    info = document.getElementById('info'),
    waiting = document.getElementById('waiting'),
    list = document.getElementById('list'),
    vSFooter = document.getElementById('vs-count'),
    fSFooter = document.getElementById('fs-count'),
    log = document.getElementById('log'),
    texturePanel = document.getElementById('textures'),
    vsPanel = document.getElementById('vs-panel'),
    fsPanel = document.getElementById('fs-panel'),
    editorContainer = document.getElementById('editorContainer');

var vSEditor, fSEditor;

var verbose = false;
if (verbose) {
    log.addEventListener('click', function(e) {
        this.innerHTML = '';
        e.preventDefault();
    });
}

function logMsg() {

    var args = [];
    for (var j = 0; j < arguments.length; j++) {
        args.push(arguments[j]);
    }
    var p = document.createElement('p');
    p.textContent = args.join(' ');
    log.appendChild(p);

}

logMsg('starting');

// Code Update/compile handle event
var keyTimeout = 250;
var vSTimeout;
var fSTimeout;

function scheduleUpdateVS() {

    vsPanel.classList.remove('compiled');
    vsPanel.classList.remove('not-compiled');

    if (vSTimeout) vSTimeout = clearTimeout(vSTimeout);
    vSTimeout = setTimeout(updateVSCode, keyTimeout);

}


function scheduleUpdateFS() {

    fsPanel.classList.remove('compiled');
    fsPanel.classList.remove('not-compiled');

    if (fSTimeout) fSTimeout = clearTimeout(fSTimeout);
    fSTimeout = setTimeout(updateFSCode, keyTimeout);

}
var settings = {
    highlight: false,
    tmpDisableHighlight: false,
    textures: false,
    theme: 46,
    logShaderEditor: false,
    debugShaderEditor: false
};

// code mirror theme user choice
var inputTheme = document.getElementById("selectCodeMirrorTheme");

function selectCodeMirrorTheme() {
    var theme = inputTheme.options[inputTheme.selectedIndex].textContent;
    vSEditor.setOption("theme", theme);
    fSEditor.setOption("theme", theme);

    settings.theme = inputTheme.selectedIndex;
    saveSettings();
}
inputTheme.addEventListener('change', selectCodeMirrorTheme, false);


/// Editors
vSEditor = createShaderEditorInstance('vs-panel', 'vs', scheduleUpdateVS, keyTimeout);
fSEditor = createShaderEditorInstance('fs-panel', 'fs', scheduleUpdateFS, keyTimeout);

// Editor code update
var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function encodeSource(input) {
    var str = String(input);
    for (
        var block, charCode, idx = 0, map = chars, output = ''; str.charAt(idx | 0) || (map = '=', idx % 1); output += map.charAt(63 & block >> 8 - idx % 1 * 8)
    ) {
        charCode = str.charCodeAt(idx += 3 / 4);
        if (charCode > 0xFF) {
            throw new InvalidCharacterError("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
        }
        block = block << 8 | charCode;
    }
    return output;
}

function updateVSCode() {

    if (selectedProgram === null || selectedProgram === undefined) return;

    var source = vSEditor.getValue();
    if (vertexShader[selectedProgram] && vertexShader[selectedProgram] == source) {
        //no changes
        return;
    }
    vertexShader[selectedProgram] = source;

    updateVSCount();
    if (testShader(gl.VERTEX_SHADER, source, vSEditor)) {
        vsPanel.classList.add('compiled');
        vsPanel.classList.remove('not-compiled');
        sendCodeToClient('UIVSUpdate', selectedProgram, encodeSource(source));
    } else {
        vsPanel.classList.add('not-compiled');
        vsPanel.classList.remove('compiled');
    }

}

function updateFSCode() {

    if (selectedProgram === null || selectedProgram === undefined) return;

    var source = fSEditor.getValue();

    if (fragmentShader[selectedProgram] && fragmentShader[selectedProgram] == source) {
        //no changes
        return;
    }
    fragmentShader[selectedProgram] = source;

    updateFSCount();
    if (testShader(gl.FRAGMENT_SHADER, source, fSEditor)) {
        fsPanel.classList.add('compiled');
        fsPanel.classList.remove('not-compiled');
        sendCodeToClient('UIFSUpdate', selectedProgram, encodeSource(source));

    } else {
        fsPanel.classList.add('not-compiled');
        fsPanel.classList.remove('compiled');
    }

}




function updateVSCount() {

    vSFooter.textContent = vSEditor.getValue().length + ' chars | ' + vSEditor.lineCount() + ' lines';

}

function updateFSCount() {

    fSFooter.textContent = fSEditor.getValue().length + ' chars | ' + fSEditor.lineCount() + ' lines';

}

function selectProgram(li) {

    var prev = list.querySelector('.active');
    if (prev) prev.classList.remove('active');
    li.classList.add('active');

}

var selectedProgram = null;
var programs = {};
var vertexShader = {};
var fragmentShader = {};
var textures = {};

// webgl VERSION
var currentVersion;

function updateProgramName(i, type, name) {

    if (i === undefined) return;

    //logMsg( ' >>>>>> ' + i.id + ' ' + type + ' ' + name );

    if (type === WebGLRenderingContext.VERTEX_SHADER || type === WebGL2RenderingContext.VERTEX_SHADER ) {
        i.vSName = name;
    }
    if (type === WebGLRenderingContext.FRAGMENT_SHADER  || type === WebGL2RenderingContext.FRAGMENT_SHADER ) {
        i.fSName = name;
    }

    if (i.vSName === '' && i.fSName === '') {
        i.name = 'Program ' + i.number;
    } else {
        if (i.vSName === i.fSName) {
            i.name = i.vSName;
        } else {
            i.name = i.vSName + ' / ' + i.fSName;
        }
    }

    i.nameSpan.textContent = i.name;

}

function tearDown() {

    selectedProgram = null;
    programs = {};
    textures = {};
    vertexShader = {};
    fragmentShader = {};
    vSEditor.setValue('');
    vsPanel.classList.remove('not-compiled');
    vsPanel.classList.remove('compiled');
    vSFooter.textContent = '';
    fSEditor.setValue('');
    fsPanel.classList.remove('not-compiled');
    fsPanel.classList.remove('compiled');
    fSFooter.textContent = '';
    while (list.firstChild) list.removeChild(list.firstChild);
    while (texturePanel.firstChild) texturePanel.removeChild(texturePanel.firstChild);

    document.getElementById('highlightButton').style.opacity = settings.tmpDisableHighlight ? .5 : 1;
    document.getElementById('textures-disabled').style.display = settings.textures ? 'none' : 'block';
    document.getElementById('textures').style.display = settings.textures ? 'block' : 'none';
    document.getElementById('monitorTextures').checked = settings.textures;
    document.getElementById('highlightShaders').checked = settings.highlight;
    document.getElementById('debugShaderEditor').checked = settings.debugShaderEditor;
    document.getElementById('logShaderEditor').checked = settings.logShaderEditor;


    document.getElementById('selectCodeMirrorTheme').selectedIndex = settings.theme;
    var theme = inputTheme.options[settings.theme].textContent;
    vSEditor.setOption("theme", theme);
    fSEditor.setOption("theme", theme);


}

var gl, supported, extList;

function checkOrCreateWebGLContext (version){
    
    if (gl !== undefined) return;

    currentVersion = version;
    var stringContext =  version === 1 ? 'webgl': 'webgl2';
    console.log('ShderExtension: hook ' + stringContext)
    gl = document.createElement('canvas').getContext(stringContext);
    supported = gl.getSupportedExtensions();
    extList = new Array(supported.length);
    /*
    for (var i = 0, len = supported.length; i < len; ++i) {
        var sup = supported[i];
        extList[sup] = gl.getExtension(sup);
    }
    */
}

var injected = false;

var uniformValueCallback = undefined;
var programCompiledCallback = undefined;
var programTimingCallback = undefined;

var currentShaderTimingRequest = function(callback, uid){

    var uidShader = uid;
    if (!uidShader) uidShader = selectedProgram;
    sendCodeToClient('UIProgramTimingRequest', uidShader);
    
    //handle compilation & run frame ack from hooked client then callback call
    programTimingCallback = callback;
}

var currentShaderTempReplace = function(callback, shaderReplacment, uid, useMain){

    var uidShader = uid;
    if (!uidShader) uidShader = selectedProgram;
    sendCodeToClient('UIProgramReplaced', uidShader, encodeSource(shaderReplacment), useMain);
    
    //handle compilation & run frame ack from hooked client then callback call
    programCompiledCallback = callback;
}

var queryUniform = function(callback, uniformName){

    sendCodeToClient('UIUniformRequest', selectedProgram, uniformName);
    uniformValueCallback = callback;

}

var pColorTip;
var tipTimerFade;

clientMessageListener(function(msg) {

    var callback;

    switch (msg.method) {

        case 'inject':

            //if (injected) return;
            info.style.display = 'none';
            waiting.style.display = 'flex';
            logMsg('Starting injection');
            tearDown();
            var jsonSettings = JSON.stringify(settings);
            logMsg(injectCodeToClient(addClientMessenger.toString(), jsonSettings));
            logMsg(injectCodeToClient(addWebglHooks.toString(), jsonSettings));
            injected = true;

            break;

        case 'onCommitted':
            //injectCodeToClient(  f.toString()  ); // this gets appended AFTER the page
            /*chrome.devtools.inspectedWindow.reload( {
				ignoreCache: true, 
		    	injectedScript: '(' + f.toString() + ')()'
			} );*/
            //console.log( 'onCommitted', Date.now() );
            break;

        case 'onUpdated':
            //injectCodeToClient(  f.toString()  ); // this gets appended AFTER the page
            /*chrome.devtools.inspectedWindow.reload( {
				ignoreCache: true, ''
		    	injectedScript: '(' + f.toString() + ')()'
			} );*/
            //console.log( 'onCommitted', Date.now() );
            break;

        case 'loaded':
            console.log('ready (received by server from client)');
            break;

        case 'settings':

            settings = msg.settings;
            logMsg(JSON.stringify(settings));            
            break;

        case 'init':

            logMsg('init: client finished injection');
            // 
            break;

        case 'getExtension':

            checkOrCreateWebGLContext(msg.webGLVersion);

            logMsg('addExtension server side', msg.extension);
            gl.getExtension(msg.extension);

            var err = gl.getError();
            if (err) {
                logMsg('addExtension' + msg.extension + ' Err');
                if (settings.debugShaderEditor) debugger;
            }

            break;

        case 'addProgram':

            checkOrCreateWebGLContext(msg.webGLVersion);

            //logMsg( 'addProgram' );

            info.style.display = 'none';
            waiting.style.display = 'none';
            container.style.display = 'block';
            onWindowResize();
            var li = document.createElement('li');
            var span = document.createElement('span');
            span.className = 'visibility';
            span.addEventListener('click', function(e) {
                this.parentElement.classList.toggle('hidden');
                if (this.parentElement.classList.contains('hidden')) {
                    sendCodeToClient('UIProgramDisabled', msg.uid);
                } else {
                    sendCodeToClient('UIProgramEnabled', msg.uid);
                }
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
            var nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            li.appendChild(span);
            li.appendChild(nameSpan);
            li.addEventListener('click', function() {
                selectProgram(this);
                selectedProgram = msg.uid;
                sendCodeToClient('UIProgramSelected', msg.uid);
            });

            li.addEventListener('mouseover', function() {

                if (settings.highlight && !settings.tmpDisableHighlight && !this.classList.contains('hidden')) {

                        var fragColor = getMainFragColor(fSEditor, currentVersion);
                        var shaderFrag = 'void main() { ShaderEditorInternalMain(); ' + fragColor + '.rgb *= vec3(1.,0.,1.); }';
                     
                       
                        currentShaderTempReplace( false, shaderFrag, msg.uid, true);

                }
            });

            li.addEventListener('mouseout', function() {
                if (settings.highlight && !settings.tmpDisableHighlight && !this.classList.contains('hidden')) {
                    sendCodeToClient('UIProgramOut', msg.uid);
                }
            });
            list.appendChild(li);
            var d = {
                id: msg.uid,
                li: li,
                nameSpan: nameSpan,
                vSName: '',
                fSName: '',
                name: '',
                number: list.children.length
            };
            programs[msg.uid] = d;
            updateProgramName(d);
            break;

        case 'createTexture':
            
            if (!settings.textures) return;

            checkOrCreateWebGLContext(msg.webGLVersion);

            var li = document.createElement('div');
            li.className = 'textureElement';
            var img = document.createElement('img');
            var d = {
                id: msg.uid,
                li: li,
                img: img
            }
            textures[msg.uid] = d;
            li.appendChild(img);
            var dZ = createDropZone(function(i) {
                sendCodeToClient('UIUpdateImage', msg.uid, i);
            });
            li.appendChild(dZ);
            texturePanel.appendChild(li);
            logMsg('>> Created texture ' + msg.uid);
            break;

        case 'uploadTexture':
            textures[msg.uid].img.src = msg.image;
            logMsg('>> Updated texture ' + msg.uid);
            break;

        case 'setShaderName':
            //logMsg( msg.uid, msg.type, msg.name );
            updateProgramName(programs[msg.uid], msg.type, msg.name);
            break;

        case 'setVSSource':

            vSEditor.setValue(msg.code);
            vSEditor.refresh();
            vsPanel.classList.remove('compiled');
            vsPanel.classList.remove('not-compiled');
            updateVSCount();
            break;

        case 'setFSSource':

            fSEditor.setValue(msg.code);
            fSEditor.refresh();
            fsPanel.classList.remove('compiled');
            fsPanel.classList.remove('not-compiled');
            updateFSCount();
            break;

        case 'log':
            logMsg(msg.arguments);
            break;

        case 'uniformValue':
            console.log(msg.value);
            if(uniformValueCallback) uniformValueCallback(msg.value);
            uniformValueCallback = undefined;
            break;

        case 'programUsed':

            callback = programCompiledCallback;
            programCompiledCallback = undefined;
            // now callback can set up a new programCompiledCallback if need be
            if(callback) callback(fSEditor, msg.result, msg.log);
            if (msg.log) {
                console.log(msg.log);                
                logMsg(msg.arguments);
            }

            break;

        case 'programTiming':
            callback = programTimingCallback;
            programTimingCallback = undefined;
            // now callback can set up a new programTimingCallback if need be
            if(callback) callback(fSEditor, msg.result);
            break;

        case 'pixelValue':

            console.log('pixelValue ' + msg.value);

            if (pColorTip) {

                pColorTip.innerHTML = 'value: ' + msg.value;

                
                clearTimeout( tipTimerFade );
                tipTimerFade = setTimeout(function() { 
                        pColorTip.style.opacity = "0";
                        remove(pColorTip); 
                        pColorTip = undefined;
                        tipTimerFade = undefined;

                }, 1100);

            }
            else{

                pColorTip = document.createElement('div');
                pColorTip.innerHTML = 'value: ' + msg.value;
                makeTooltip(0.0, 0.0, pColorTip);      

                tipTimerFade = setTimeout(function() { 
                        pColorTip.style.opacity = "0";
                        remove(pColorTip); 
                        tipTimerFade = undefined;
                        pColorTip = undefined;

                }, 1100);

            }
            break;

        case 'canvasSize':
            console.log('canvasSize' + msg.w + ' ' + msg.h);
            break;

        case 'mousePosition':
            console.log('mousePosition' + msg.x + ' ' + msg.y);
            break;
    }

});


function testShader(type, source, code) {

    if (source === '') {
        logMsg('NO SOURCE TO TEST');
        return false;
    }

    while (code._errors.length > 0) {

        var mark = code._errors.pop();
        code.removeLineWidget(mark);

    }

    var s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);

    var success = gl.getShaderParameter(s, gl.COMPILE_STATUS);
    var err = gl.getShaderInfoLog(s);
    if (err) logMsg('ERR editor ShaderInfoLog:[' + err + ']');

    if (!success || err !== '') {

        if (err) {

            var lineOffset = 0;
            err = err.replace(/(\r\n|\n|\r)/gm, "");

            var lines = [];
            var re = /(error|warning):/gi;
            var matches = [];
            while ((match = re.exec(err)) != null) {
                matches.push(match.index);
            }
            matches.push(err.length);
            for (var j = 0; j < matches.length - 1; j++) {
                var p = matches[j];
                lines.push(err.substr(p, matches[j + 1] - p));
            }

            for (var j = 0; j < lines.length; j++) {
                logMsg('[[' + lines[j] + ']]');
            }

            var msg, mark;
            for (var i = 0; i < lines.length; i++) {

                var parts = lines[i].split(":");

                var isWarning = parts[0].toUpperCase() === "WARNING";

                if (parts.length === 5 || parts.length === 6) {

                    var lineNumber = parseInt(parts[2]) - lineOffset;
                    if (isNaN(lineNumber)) lineNumber = 1;

                    msg = document.createElement("div");
                    msg.appendChild(document.createTextNode(parts[3] + " : " + parts[4]));
                    msg.className = isWarning ? 'warningMessage' : 'errorMessage';
                    mark = code.addLineWidget(lineNumber - 1, msg, {
                        coverGutter: false,
                        noHScroll: true
                    });

                    code._errors.push(mark);

                } else if (lines[i] != null && lines[i] != "" && lines[i].length > 1 && parts[0].toUpperCase() != "WARNING") {

                    logMsg(parts[0]);

                    var txt = 'Unknown error';
                    if (parts.length == 4)
                        txt = parts[2] + ' : ' + parts[3];

                    msg = document.createElement("div");
                    msg.appendChild(document.createTextNode(txt));
                    msg.className = isWarning ? 'warningMessage' : 'errorMessage';
                    mark = code.addLineWidget(0, msg, {
                        coverGutter: false,
                        noHScroll: true,
                        above: true
                    });

                    code._errors.push(mark);

                }

            }
        }

    }

    return success;

}


/// Editor Callbacks Toolbar

/// FORMAT
document.getElementById('vs-format').addEventListener('click', function(e) {
    ShaderEditorFormat(vSEditor);
    updateVSCode();
    e.preventDefault();
});

document.getElementById('fs-format').addEventListener('click', function(e) {
    ShaderEditorFormat(fSEditor);
    updateFSCode();
    e.preventDefault();
});

// take whole space
document.getElementById('vs-fullscreen').addEventListener('click', function(e) {
    vsPanel.classList.toggle('fullscreen');
    fsPanel.classList.toggle('hide');
    e.preventDefault();
});

document.getElementById('fs-fullscreen').addEventListener('click', function(e) {
    fsPanel.classList.toggle('fullscreen');
    vsPanel.classList.toggle('hide');
    e.preventDefault();
});

// glsl - optimizer
document.getElementById('vs-optimise').addEventListener('click', function(e) {
    logMsg('vs optimise');
    ShaderEditorOptimize(vSEditor);
    updateVSCode();
    e.preventDefault();
});
document.getElementById('fs-optimise').addEventListener('click', function(e) {
    logMsg('fs optimise');
    ShaderEditorOptimize(fSEditor);
    updateFSCode();
    e.preventDefault();
});

// preprocessor
document.getElementById('vs-preprocess').addEventListener('click', function(e) {
    logMsg('vs preprocess');
    ShaderEditorPreProcess(vSEditor);
    updateVSCode();
    e.preventDefault();
});

document.getElementById('fs-preprocess').addEventListener('click', function(e) {
    logMsg('fs preprocess');
    ShaderEditorPreProcess(fSEditor);
    updateFSCode();
    e.preventDefault();
});

document.getElementById('fs-benchmark').addEventListener('click', function(e) {
    logMsg('fs benchmark');
    benchmarkShader(fSEditor);
    e.preventDefault();
});


document.getElementById('fs-pick').addEventListener('click', function(e) {
    logMsg('fs pick');
    pickValue(fSEditor);
    e.preventDefault();
});


document.getElementById('fs-watch').addEventListener('click', function(e) {
    logMsg('fs watch');
    watchValue(fSEditor);
    e.preventDefault();
});


document.getElementById('fs-screenshot').addEventListener('click', function(e) {
    logMsg('fs screenshot');
    screenshot(fSEditor);
    e.preventDefault();
});

document.getElementById('fs-startrecord').addEventListener('click', function(e) {
    logMsg('fs startrecord');
    startrecord(fSEditor);
    e.preventDefault();
});


document.getElementById('fs-play').addEventListener('click', function(e) {
    logMsg('fs play');
    playPause(fSEditor);
    e.preventDefault();
});

document.getElementById('fs-slow').addEventListener('click', function(e) {
    logMsg('fs slow');
    slowDown(fSEditor);
    e.preventDefault();
});


/// Panel Callbacks Toolbar
// Highlight shader
document.getElementById('highlightButton').addEventListener('click', function(e) {
    settings.tmpDisableHighlight = !settings.tmpDisableHighlight;
    this.style.opacity = settings.tmpDisableHighlight ? .5 : 1;
    saveSettings();
    e.preventDefault();
});
document.getElementById('highlightShaders').addEventListener('change', function(e) {
    settings.highlight = this.checked;
    logMsg(this.checked);
    saveSettings();
    document.getElementById('highlightButton').style.opacity = settings.highlight ? 1 : .5;
    e.preventDefault();
});

// texture spy
document.getElementById('monitorTextures').addEventListener('change', function(e) {

    settings.textures = this.checked;
    saveSettings();
    e.preventDefault();

});
//logs
document.getElementById('logShaderEditor').addEventListener('change', function(e) {
    settings.logShaderEditor = this.checked;
    saveSettings();
    e.preventDefault();
});
//debug
document.getElementById('debugShaderEditor').addEventListener('change', function(e) {
    settings.debugShaderEditor = this.checked;
    saveSettings();
    e.preventDefault();
});

// resize
window.addEventListener('resize', onWindowResize);

function onWindowResize() {

    editorContainer.classList.toggle('vertical', editorContainer.clientWidth < editorContainer.clientHeight);

}


/// image drop 
function createDropZone(imgCallback) {

    var dropzone = document.createElement('div');
    dropzone.className = 'dropzone';

    dropzone.addEventListener('dragenter', function(event) {
        this.style.backgroundColor = 'rgba( 255,255,255,.2 )';
    }, true);

    dropzone.addEventListener('dragleave', function(event) {
        this.style.backgroundColor = 'transparent';
    }, true);

    dropzone.addEventListener('dragover', function(event) {
        this.style.backgroundColor = 'rgba( 255,255,255,.2 )';
        event.preventDefault();
    }, true);

    var input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.style.opacity = 0;

    dropzone.appendChild(input);

    function handleFileSelect(e) {

        var files = e.target.files; // FileList object
        loadFiles(files);

    }

    input.addEventListener('change', handleFileSelect, false);

    function loadFiles(files) {

        var reader = new FileReader();
        reader.onload = function(e) {
            try {

                var img = new Image();
                img.onload = function() {

                    var c = document.createElement('canvas');
                    var ctx = c.getContext('2d');
                    c.width = img.width;
                    c.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    imgCallback(c.toDataURL());

                }
                img.src = e.currentTarget.result;

                //showLoader( false );
            } catch (e) {
                alert('Couldn\'t read that file. Make sure it\'s an mp3 or ogg file (Chrome) or ogg file (Firefox).');
            }
        };
        reader.readAsDataURL(files[0]);

    }

    dropzone.addEventListener('drop', function(event) {

        //showLoader( true );

        this.style.backgroundColor = 'transparent';
        event.preventDefault();
        loadFiles(event.dataTransfer.files);

    }, true);

    return dropzone;

}



    function pickValue(fSEditor){
        sendCodeToClient('UIPick');
    }

    function watchValue(fSEditor){
        sendCodeToClient('UISlowDown');
    }
    
    function screenshot(fSEditor){
        sendCodeToClient('UIScreenshot');
    }
    function startrecord(fSEditor){
        sendCodeToClient('UIRecord');
    }
    function playPause(fSEditor){
        sendCodeToClient('UIPlayPause');
    }
    function slowDown(fSEditor){
        sendCodeToClient('UISlowDown');
    }







// ui TABS
var tabButtons = document.querySelectorAll('#tabs li');
var tabs = document.querySelectorAll('.tab');
[].forEach.call(tabButtons, function(button) {

    var id = button.getAttribute('data-tab');
    button.addEventListener('click', function() {

        [].forEach.call(tabs, function(tab) {

            tab.classList.toggle('active', tab.id === (id + '-tab'));

        });

        [].forEach.call(tabButtons, function(b) {

            b.classList.toggle('active', button === b);

        });

    });

});