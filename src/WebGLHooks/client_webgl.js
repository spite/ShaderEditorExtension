function addWebglHooks(s) {

    var settings = {
        monitorTextures: false,
        debugShaderEditor: false,
        logShaderEditor: false
    };


    if (s) {
        if (s.monitorTextures) {
            logMsg('>>>' + s.monitorTextures);
            settings.monitorTextures = s.monitorTextures;
        }
        settings.debugShaderEditor = s.debugShaderEditor;
        settings.logShaderEditor = s.logShaderEditor;
    }


    ///////////////////////////////////
    //			doPostMessageClientShaderEditor( { method: 'open', arguments: arguments }, '*');

    function debug() {}

    // msg Utils 

    function b64EncodeUnicode(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    function b64DecodeUnicode(str) {
        return decodeURIComponent(escape(atob(str)));
    }

    window.__Injected = true;
    window.__InjectedShaderEditor = true;

    //function log() { console.log( arguments ); }
    //function error() { console.error( arguments ); }
    function log() {}

    function error() {}

    function log(msg) {
        logMsg('LOG: ' + msg)
    }

    function error(msg) {
        logMsg('ERROR: ' + msg)
    }

    function logMsg() {

        var args = [];
        for (var j = 0; j < arguments.length; j++) {
            args.push(arguments[j]);
        }

        doPostMessageClientShaderEditor({
            source: 'WebGLShaderEditor',
            method: 'log',
            arguments: args
        }, '*');
    }

    // msg Utils 


    ///////////////////////////////////
    /// Client webgl Override

    // webgl version

    // todo: store all that per CANVAS CONTEXT
    var canvasContext = new Map();

  
     // global

    var methods = [
        'createProgram', 'linkProgram', 'useProgram',

        'createShader', 'shaderSource', 'compileShader', 'attachShader', 'detachShader',

        'getUniformLocation',

        'getAttribLocation', 'vertexAttribPointer', 'enableVertexAttribArray', 'bindAttribLocation',
        
        'drawElements',
       
        'drawArrays',


        'createTexture', 'texImage2D', 'texSubImage2D', 'bindTexture', 'texParameteri', 'texParameterf',
        
        'getExtension', 'clear', 'bindFramebuffer',

        'bindBuffer', 'getQuery'
    ];

    var methodsUniforms = [
        'uniform1f', 'uniform1fv', 'uniform1i', 'uniform1iv',
        'uniform2f', 'uniform2fv', 'uniform2i', 'uniform2iv',
        'uniform3f', 'uniform3fv', 'uniform3i', 'uniform3iv',
        'uniform4f', 'uniform4fv', 'uniform4i', 'uniform4iv',
        'uniformMatrix2fv', 'uniformMatrix3fv', 'uniformMatrix4fv'
    ];

    this.referencesWebGL1 = {};
    methods.forEach(function(f) {
        this.referencesWebGL1[f] = WebGLRenderingContext.prototype[f];
    }.bind(this));   

    this.referencesWebGL1.enum_strings = { };
    for (var propertyName in WebGLRenderingContext) {
      if (typeof WebGLRenderingContext[propertyName] == "number") {
        this.referencesWebGL1.enum_strings[WebGLRenderingContext[propertyName]] = propertyName;
      }
    }

    // adds webgl2 only method to method array  
    var methods2 =   ['bindVertexArray', 'createVertexArray', 'transformFeedbackVaryings', 'getQueryParameter' ];
    methods2 = methods.concat(methods2);          
    this.referencesWebGL2 = {};
    methods2.forEach(function(f) {
        this.referencesWebGL2[f] = WebGL2RenderingContext.prototype[f];
    }.bind(this));
              
    this.referencesWebGL2.enum_strings = { };
    for (var propertyName in WebGL2RenderingContext) {
      if (typeof WebGL2RenderingContext[propertyName] == "number") {
       this.referencesWebGL2.enum_strings[WebGL2RenderingContext[propertyName]] = propertyName;
      }
    }



    ////////////////

            var uuidList = {};

            var currentProgramSelected;

//request
            var uniformTracker = undefined;
            var programTracker = undefined;
            var programTiming = undefined;

            var pixelRequest = false;
            var screenshotRequest = false;
            var requestContextGL = undefined;
            var framebufferRequest = null;

            var programsProxies = {};
            var programsReal = {};
            var shaders = {};
            var textures = {};

            var currentContextGL = false;
            var currentFrameBuffer = -1;

            // local to each context
            // TODO replace by getContext()...
            var currentProgram = false;
            var currentProgramID = false;
                
            var currentBoundTexture =null;
            var currentQuery= undefined;
            var currentQueryExt = undefined;
            var currentVersion = undefined;

    /////
    function getContext(gl, version){

       if (version !== undefined) currentVersion = version;

        var context = canvasContext.get(gl);
        if (context) return context;
               
            context = {
                
                canvas : gl,
                currentVersion: version,

                currentProgram : false,
                currentProgramID : false,

                currentBoundTexture :null,
                currentQuery: undefined,
                currentQueryExt : undefined,
                currentFrameBuffer : -1,

                width : gl.drawingBufferWidth,
                height : gl.drawingBufferHeight

            };
            canvasContext.set(gl, context);

            gl.canvas.addEventListener("mousemove", function(e) {
                    
                    var bRect = gl.canvas.getBoundingClientRect();
                    var canvasX = (e.clientX - bRect.left);
                    var canvasY = (e.clientY - bRect.top);

                    context.canvasX = Math.floor(canvasX) ;
                    context.canvasY = Math.floor(gl.canvas.clientHeight - canvasY) ;

                    // normalized on 0,1 
                    context.canvasXNDC = canvasX / gl.canvas.clientWidth;
                    context.canvasYNDC = (gl.canvas.clientHeight - canvasY) / gl.canvas.clientHeight;

/*
// check if changes
                    doPostMessageClientShaderEditor({
                                source: 'WebGLShaderEditor',
                                method: 'mousePosition',
                                x: context.canvasXNDC,
                                y: context.canvasYNDC
                    }, '*');
// check if changes
                    doPostMessageClientShaderEditor({
                                source: 'WebGLShaderEditor',
                                method: 'mousePosition',
                                w: gl.canvas.clientWidth,
                                h: gl.canvas.clientHeight 
                    }, '*');
  
                    */

            }, false);

        gl.shaderEditorContext = currentContextGL;
        currentContextGL =  gl;
       
        return context;
    }

    
    
    /////////////// Utils
    ///////////////
    function _h(f, c) {

        return function() {
            var res = f.apply(this, arguments);
            res = c.apply(this, [res, arguments]) || res;
            return res;
        }

    }

    function createUUID() {

        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }

        uuid = s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();

        while (uuidList[uuid] !== undefined) {
            uuid = s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
        }

        uuidList[uuid] = true;
        return uuid;

    }

    function addProgram(gl, p) {

        var el = {
            programReal: p,
            original: p,
            gl: gl,
            uniforms: [],
            attributes: []
        }

        programsProxies[p.__uuid] = el;

        logMsg('addProgram', p.__uuid);
        doPostMessageClientShaderEditor({
            source: 'WebGLShaderEditor',
            method: 'addProgram',
            uid: p.__uuid,
            webGLVersion: currentVersion
        }, '*');

    }

    function setShaderName(id, type, name) {

        doPostMessageClientShaderEditor({
            source: 'WebGLShaderEditor',
            method: 'setShaderName',
            uid: id,
            type: type,
            name: name,
            webGLVersion: currentVersion
        }, '*');

    }

    function addShader(shader, type) {

        shaders[shader.__uuid] = {
            shader: shader,
            type: type
        };

        //logMsg( 'addShader', shader.__uuid, type );

    }

    function findProgramProxyById(id) {

        if (programsProxies[id]) {
            return programsProxies[id];
        }

        return null;

    }

    function findProgramProxyByRealProgramId(id) {

        for (var j in programsProxies) {
            if (programsProxies[j].programReal.__uuid === id) {
                return programsProxies[j];
            }
        }

        return null;

    }

    function findShader(s) {

        if (shaders[s.__uuid]) {
            return shaders[s.__uuid];
        }

        return null;

    }


    function findAttributeByIndex(program, index) {

        for (var j = 0; j < program.attributes.length; j++) {
            var a = program.attributes[j];
            if (a.originalIndex === index) {
                return a;
            }
        }

        return null;

    }

    function findProgramProxyByIdByLocationProxy(locationProxy) {

        if (locationProxy === null || locationProxy === undefined) return null;

        for (var j in programsProxies) {

            var p = programsProxies[j];

            for (var k = 0; k < p.uniforms.length; k++) {

                var u = p.uniforms[k];

                if (u.locationProxy.__uuid === locationProxy.__uuid) {

                    return {
                        p: p,
                        u: u
                    };

                }

            }

        }


        return null;

    }

    function memcpy(src, srcOffset, dst, dstOffset, length) {
        var i;

        src = src.subarray || src.slice ? src : src.buffer;
        dst = dst.subarray || dst.slice ? dst : dst.buffer;

        src = srcOffset ? src.subarray ?
            src.subarray(srcOffset, length && srcOffset + length) :
            src.slice(srcOffset, length && srcOffset + length) : src;

        if (dst.set) {
            dst.set(src, dstOffset);
        } else {
            for (i = 0; i < src.length; i++) {
                dst[i + dstOffset] = src[i];
            }
        }

        return dst;
    }


    /////////////// HOOKS


    // TIMER HOOKS
    function newFrameEvent(){

    if (requestContextGL){

            if (pixelRequest){ 

                // multiple rAf breaks sync with the screenshot ?

                // different framebuffers
                var currentContext = getContext(requestContextGL);
                     
                    if(!(currentFrameBuffer === 0 || currentFrameBuffer === null)){
                       currentContextGL.bindFramebuffer(currentContextGL.FRAMEBUFFER);
                    }

                    // glReadPixel Value
                    if (!currentContext.colorPixel) currentContext.colorPixel = new Uint8Array(4);
                    
                    while ( currentContextGL.checkFramebufferStatus( currentContextGL.FRAMEBUFFER, currentFrameBuffer ) !== currentContextGL.FRAMEBUFFER_COMPLETE ) {}

                    currentContextGL.flush();
                    currentContextGL.finish();

                    // pixel store, flipY, etc ?
                    currentContextGL.readPixels(currentContext.canvasX, currentContext.canvasY, 1, 1, 
                                    currentContextGL.RGBA, currentContextGL.UNSIGNED_BYTE, 
                                    currentContext.colorPixel);

             
                                if (settings.logShaderEditor) {
                                    var err = currentContextGL.getError();
                                    if (err) {
                                        logMsg('cannot pick framebuffer Err');
                                        
                                        console.log(getWebglReferences().enum_strings[err]);

                                        if (settings.debugShaderEditor) debugger;
                                    }
                                }

                    doPostMessageClientShaderEditor({
                                    source: 'WebGLShaderEditor',
                                    method: 'pixelValue',
                                    value: currentContext.colorPixel.toString(),
                                    webGLVersion: 1
                    }, '*');

                
                //pixelRequest = false;
            } 

            if (screenshotRequest){

                // need preserverawbuffer===true
                var canvas = currentContextGL.canvas;        
                canvas.toBlob(function(blob) {
                    
                    var newImg = document.createElement('img'),
                    url = URL.createObjectURL(blob);
                    downloadFile(url, 'jpg');
                    
                }, 'image/jpeg', 0.95);            
        
                screenshotRequest = undefined;
               requestContextGL = undefined;
            }

        }
    }



    /*Copyright 2014, Ben Vanik.
        All rights reserved.

        Redistribution and use in source and binary forms, with or without
        modification, are permitted provided that the following conditions are
        met:

            * Redistributions of source code must retain the above copyright
        notice, this list of conditions and the following disclaimer.
            * Redistributions in binary form must reproduce the above
        copyright notice, this list of conditions and the following disclaimer
        in the documentation and/or other materials provided with the
        distribution.
            * Neither the name of Ben Vanik. nor the names of its
        contributors may be used to endorse or promote products derived from
        this software without specific prior written permission.

        THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
        "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
        LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
        A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
        OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
        SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
        LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
        DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
        THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
        (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
        OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
    */
    // This replaces setTimeout/setInterval with versions that, after the user code is called, try to end the frame
    var timerHijacking = {
        value: 0, // 0 = normal, N = ms between frames, Infinity = stopped
        activeIntervals: [],
        activeTimeouts: []
    };

    function hijackedDelay(delay) {
        var maxDelay = Math.max(isNaN(delay) ? 0 : delay, timerHijacking.value);
        if (!isFinite(maxDelay)) {
            maxDelay = 999999999;
        }
        return maxDelay;
    }

    // setFrameControl(0); play
    // setFrameControl(250); slow 
    // setFrameControl(Infinity); pause
    var setFrameControl = function(value) {
        timerHijacking.value = value;

        // Reset all intervals
        var intervals = timerHijacking.activeIntervals;
        for (var n = 0; n < intervals.length; n++) {
            var interval = intervals[n];
            original_clearInterval(interval.currentId);
            var maxDelay = hijackedDelay(interval.delay);
            interval.currentId = original_setInterval(interval.wrappedCode, maxDelay);
        }

        // Reset all timeouts
        var timeouts = timerHijacking.activeTimeouts;
        for (var n = 0; n < timeouts.length; n++) {
            var timeout = timeouts[n];
            original_clearTimeout(timeout.originalId);
            var maxDelay = hijackedDelay(timeout.delay);
            timeout.currentId = original_setTimeout(timeout.wrappedCode, maxDelay);
        }
    };

    function wrapCode(code, args) {
        args = args ? Array.prototype.slice.call(args, 2) : [];
        return function() {
            if (code) {
                if (glitypename(code) == "String") {
                    original_setInterval(code, 0);
                    //original_setInterval(host.frameTerminator.fire
                    //    .bind(host.frameTerminator), 0);
                } else {
                    try {
                        code.apply(window, args);
                    } finally {
                        //host.frameTerminator.fire();
                    }
                }
            }
        };
    };

    var original_setInterval = window.setInterval;
    window.setInterval = function(code, delay) {
        var maxDelay = hijackedDelay(delay);
        var wrappedCode = wrapCode(code, arguments);
        var intervalId = original_setInterval.apply(window, [wrappedCode, maxDelay]);
        timerHijacking.activeIntervals.push({
            originalId: intervalId,
            currentId: intervalId,
            code: code,
            wrappedCode: wrappedCode,
            delay: delay
        });
        return intervalId;
    };

    var original_clearInterval = window.clearInterval;
    window.clearInterval = function(intervalId) {
        for (var n = 0; n < timerHijacking.activeIntervals.length; n++) {
            if (timerHijacking.activeIntervals[n].originalId == intervalId) {
                var interval = timerHijacking.activeIntervals[n];
                timerHijacking.activeIntervals.splice(n, 1);
                return original_clearInterval.apply(window, [interval.currentId]);
            }
        }
        return original_clearInterval.apply(window, arguments);
    };

    var original_setTimeout = window.setTimeout;
    window.setTimeout = function(code, delay) {
        var maxDelay = hijackedDelay(delay);
        var wrappedCode = wrapCode(code, arguments);
        var cleanupCode = function() {
            // Need to remove from the active timeout list
            window.clearTimeout(timeoutId); // why is this here?
            wrappedCode();
        };
        var timeoutId = original_setTimeout.apply(window, [cleanupCode, maxDelay]);
        timerHijacking.activeTimeouts.push({
            originalId: timeoutId,
            currentId: timeoutId,
            code: code,
            wrappedCode: wrappedCode,
            delay: delay
        });
        return timeoutId;
    };

    var original_clearTimeout = window.clearTimeout;
    window.clearTimeout = function(timeoutId) {
        for (var n = 0; n < timerHijacking.activeTimeouts.length; n++) {
            if (timerHijacking.activeTimeouts[n].originalId == timeoutId) {
                var timeout = timerHijacking.activeTimeouts[n];
                timerHijacking.activeTimeouts.splice(n, 1);
                return original_clearTimeout.apply(window, [timeout.currentId]);
            }
        }
        return original_clearTimeout.apply(window, arguments);
    };

    // Support for requestAnimationFrame-like APIs
    var requestAnimationFrameNames = [
        "requestAnimationFrame",
        "webkitRequestAnimationFrame",
        "mozRequestAnimationFrame",
        "operaRequestAnimationFrame",
        "msAnimationFrame"
    ];
    for (var n = 0, len = requestAnimationFrameNames.length; n < len; ++n) {
        var name = requestAnimationFrameNames[n];
        if (window[name]) {
            (function(name) {

                var originalFn = window[name];
                var lastFrameTime = (new Date());                
                window[name] = function(callback, element) {
                    var time = (new Date());
                    var delta = (time - lastFrameTime);
                    if (delta > timerHijacking.value) {
                        lastFrameTime = time;

                        var wrappedCallback = function() {
                            try {

                                callback.apply(window, arguments);
                                // our frame event
                                newFrameEvent(window, arguments);

                            } finally {
                                //host.frameTerminator.fire();
                            }
                        };

                        return originalFn.call(window, wrappedCallback, element);
                    } else {
                        window.setTimeout(function() {
                            callback(Date.now());
                        }, delta);
                        return null;
                    }
                };

            })(name);
        }
    }

    // Everything in the inspector should use these instead of the global values
    window.setInterval = function() {
        return original_setInterval.apply(window, arguments);
    };
    window.clearInterval = function() {
        return original_clearInterval.apply(window, arguments);
    };
    window.setTimeout = function() {
        return original_setTimeout.apply(window, arguments);
    };
    window.clearTimeout = function() {
        return original_clearTimeout.apply(window, arguments);
    };

    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    // SHADER WEBGL1 HOOKS////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////


    WebGLRenderingContext.prototype.drawElements = function() {

        if (currentQuery) getQueryResult(this, query);

        if(programTiming !== currentProgramID || currentQuery !== undefined){
           return referencesWebGL1.drawElements.apply(this, arguments);
        }

        var ext = currentQueryExt ||this.getExtension('EXT_disjoint_timer_query');        
        currentQueryExt = ext;

        var query = ext.createQueryEXT();
        currentQuery = query;
        ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, query);
        var res = referencesWebGL1.drawElements.apply(this, arguments);
        ext.endQueryEXT(ext.TIME_ELAPSED_EXT);


        return res;

    };
    WebGLRenderingContext.prototype.drawArrays = function() {
        
        if (currentQuery) getQueryResult(this, query);

        if(programTiming !== currentProgramID || currentQuery !== undefined){
           return referencesWebGL1.drawArrays.apply(this, arguments);
        }

        var ext = currentQueryExt ||this.getExtension('EXT_disjoint_timer_query');        
        currentQueryExt = ext;        
        var query = ext.createQueryEXT();
        currentQuery = query;
        ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, query);
        var res = referencesWebGL1.drawArrays.apply(this, arguments);
        ext.endQueryEXT(ext.TIME_ELAPSED_EXT);

        return res;

    };

    WebGLRenderingContext.prototype.createProgram = function() {
        
        var res = referencesWebGL1.createProgram.apply(this, []);
        res.__uuid = createUUID();
        res.version = 1;

        addProgram(this, res);

        return res;

    };

    WebGLRenderingContext.prototype.createShader = _h(
        WebGLRenderingContext.prototype.createShader,
        function(res, args) {

            // set WEBGL VERSION
            getContext(this, 1);
            res.__uuid = createUUID();
            addShader(res, args[0]);

        }
    );

    WebGLRenderingContext.prototype.shaderSource = _h(
        WebGLRenderingContext.prototype.shaderSource,
        function(res, args) {

            var s = findShader(args[0]);
            s.source = args[1];
            s.name = extractShaderName(s.source);

            if (   s.pAttachedWithoutSource ){

                var p = s.pAttachedWithoutSource;

                if (s.type === p.gl.VERTEX_SHADER) {

                    p.vertexShaderSource = s.source;
                    setShaderName(p.original.__uuid, s.type, s.name);
                    p.name = s.name;

                }

                if (s.type === p.gl.FRAGMENT_SHADER) {

                    p.fragmentShaderSource = s.source;
                    setShaderName(p.original.__uuid, s.type, s.name);
                    p.name = s.name;                

                }

                s.pAttachedWithoutSource = undefined;
            }
            //logMsg( 'shaderSource', s.source );

        }
    );

    WebGLRenderingContext.prototype.attachShader = _h(
        WebGLRenderingContext.prototype.attachShader,
        function(res, args) {

            var p = findProgramProxyById(args[0].__uuid);
            var s = findShader(args[1]);
            
            if (s.type === p.gl.VERTEX_SHADER) {
                
                p.vertexShader = s;
                if (s.source){
                    p.vertexShaderSource = s.source;
                    setShaderName(p.original.__uuid, s.type, s.name);
                    p.name = s.name;
                }
                else{
                    s.pAttachedWithoutSource = p;
                }
            }
            if (s.type === p.gl.FRAGMENT_SHADER) {

                p.fragmentShader = s;
                if (s.source){
                    p.fragmentShaderSource = s.source;
                    setShaderName(p.original.__uuid, s.type, s.name);
                    p.name = s.name;
                }
                else{
                    s.pAttachedWithoutSource = p;
                }
            }

        }
    );


    WebGLRenderingContext.prototype.useProgram = function(p) {
        
        if (p && p.__uuid) {

            var program = findProgramProxyById(p.__uuid);

            if(program.scheduledUpdate){

                scheduledUpdateProgram(program.scheduledUpdateID, program.scheduledVSource, program.scheduledFSource);
                program.scheduledUpdate = false;
                program.scheduledUpdateID = undefined;
                program.scheduledVSource = undefined;
                program.scheduledFSource = undefined;
            }


            currentProgram = program.programReal;
            currentProgramID = p.__uuid;

            //logMsg( '>>> useProgram', p.__uuid )
            referencesWebGL1.useProgram.apply(program.gl, [program.programReal]);

            if (settings.logShaderEditor) {
                var err = program.gl.getError();
                if (err) {
                    logMsg('Shader' + program.name + ' Err: ' + getWebglReferences().enum_strings[err]);
                    if (settings.debugShaderEditor) debugger;
                }
            }

        } else {
            referencesWebGL1.useProgram.apply(this, [null]);
            currentProgram = false;
        }

    };

    WebGLRenderingContext.prototype.getUniformLocation = function(program, name) {

        var p = findProgramProxyById(program.__uuid);

        for (var j = 0; j < p.uniforms.length; j++) {
            if (p.uniforms[j].name === name) {
                return p.uniforms[j].locationProxy;
            }
        }

        var gl = p.gl;
        var res = referencesWebGL1.getUniformLocation.apply(gl, [p.programReal, name]);
        if (res) {
            res.__uuid = createUUID();

            res.__program__uuid = program.__uuid;
            res.__p__uuid = p.programReal.__uuid;

            p.uniforms.push({
                name: name,
                value: null,
                type: null,
                location: res,
                locationProxy: res,

                __program__uuid: program.__uuid,
                __p__uuid: p.programReal.__uuid,

                gl: this
            });

            logMsg('Added uniform location ' + name + ' ' + res.__uuid);
        }
        return res;

    };

    // UNIFORM Hooks

    methodsUniforms.forEach(function(f) {

        referencesWebGL1[f] = WebGLRenderingContext.prototype[f];
        var count = 0;

        WebGLRenderingContext.prototype[f] = function() {

     
            var args = arguments;
            if (args[0] === null || args[0] === undefined) return;

            var res = findProgramProxyByIdByLocationProxy(args[0]);

            if (res) {
     
     
                var gl = res.p.gl;
                var l = res.u.location;

                if (res.p.programReal !== currentProgram) {

                    logMsg('ShaderEditorClient: uniform on wrong Program ');
                    //console.log(currentProgram);
                    //console.log(res.p.programReal);
                    return;

                }

                // not used in this shader
                if (l === null || l.unbindable) return;

                var a = [],
                    aa = [];
                    aaa = '';
                a.push(l);
                for (var j = 1; j < args.length; j++) {
                    a.push(args[j]);
                    aa.push(args[j]);

                    if(args[j]) {
                       aaa += args[j].toString();
                       if (j < args.length - 1) aaa += ', ';
                    }
                }
                referencesWebGL1[f].apply(gl, a);

                if (settings.logShaderEditor) {
                    var err = gl.getError();
                    if (err) {
                        logMsg('Shader' + res.p.name + ' ORIG: ' + args[0].__uuid + ' ' + res.u.name + ' MAPS TO ' + res.u.location.__uuid + ' VAL: ' + args[1] + ' : ' + getWebglReferences().enum_strings[err]);
                        if (settings.debugShaderEditor) debugger;
                    }
                }
             
                if ( uniformTracker === res.u.name && programTracker === res.p._uuid && res.u.valueString !== aaa){

                     doPostMessageClientShaderEditor({
                        source: 'WebGLShaderEditor',
                        method: 'uniformValue',
                        value: aaa,
                        webGLVersion: 1
                    }, '*');

                    uniformTracker = undefined;

                    //logMsg('set uniform  "' + res.u.name + ' type '+ f +' " to ' + aaa);
                }   
                
                res.u.valueString = aaa;
                res.u.value = aa;
                res.u.type = f;                


            } else {
                logMsg('Program by location ' + args[0].__uuid + ' not found');
            }

        }

    });

    // VERTEX ATTRIB HOOKS
    WebGLRenderingContext.prototype.bindBuffer = function(target, buffer) {

        //logMsg( 'bindBuffer', target, buffer );
        return referencesWebGL1.bindBuffer.apply(this, [target, buffer]);

    }

    WebGLRenderingContext.prototype.getAttribLocation = function(program, name) {

        var p = findProgramProxyById(program.__uuid);

        for (var j = 0; j < p.attributes.length; j++) {
            if (p.attributes[j].name === name) {
                return p.attributes[j].index;
            }
        }

        var gl = p.gl;
        var index = referencesWebGL1.getAttribLocation.apply(gl, [p.programReal, name]);
        if (index != -1) {

            var el = {
                index: index,
                originalIndex: index,
                name: name,
                gl: this
            };

            p.attributes.push(el);

            //logMsg( 'Added attribute location ' + name + ': ' + index + ' to ' + program.__uuid );
        }
        return index;

    }

    WebGLRenderingContext.prototype.clear = function(mask){

    // main framebuffer get special case treatment for preservedrawbuffer
        if (pixelRequest && currentFrameBuffer !== 0 && currentFrameBuffer !== null){

                // glReadPixel Value
                var currentContext = getContext(this);

                if (!currentContext.colorPixel) currentContext.colorPixel = new Uint8Array(4);
                
                while ( this.checkFramebufferStatus( this.FRAMEBUFFER, currentFrameBuffer ) !== this.FRAMEBUFFER_COMPLETE ) {}

                this.flush();
                this.finish();

                // pixel store, flipY, etc ?
                this.readPixels(currentContext.canvasX, currentContext.canvasY, 1, 1, 
                                this.RGBA, this.UNSIGNED_BYTE, 
                                currentContext.colorPixel);

                if (settings.logShaderEditor) {
                    var err = this.getError();
                    if (err) {
                        logMsg('cannot pick framebuffer Err');
                        
                        console.log( getWebglReferences().enum_strings[err]);

                        if (settings.debugShaderEditor) debugger;
                    }
                }
                

            doPostMessageClientShaderEditor({
                source: 'WebGLShaderEditor',
                method: 'pixelValue',
                value: currentContext.colorPixel.toString(),
                webGLVersion: 1
            }, '*');

            //pixelRequest = undefined;

        } 

        referencesWebGL1.clear.apply(this, [mask]);

    }

    WebGLRenderingContext.prototype.bindFramebuffer = function(target, framebuffer){

            currentFrameBuffer = framebuffer;
            referencesWebGL1.bindFramebuffer.apply(this, [target, framebuffer]);

    }

    WebGLRenderingContext.prototype.getExtension = _h(

        WebGLRenderingContext.prototype.getExtension,

        function(res, args) {

            logMsg('Get Extension  ' + args[0]);
            
            doPostMessageClientShaderEditor({
                source: 'WebGLShaderEditor',
                method: 'getExtension',
                extension: args[0],
                webGLVersion: 1
            }, '*');

            // store only once the references
            var methodsExt;
            if (args[0] === 'EXT_disjoint_timer_query'){
                
                var methodsExt = [
                     'getQueryObjectEXT'
                ];

                methodsExt.forEach(function(f) {
                    if (!referencesWebGL1[f] && res[f]) referencesWebGL1[f] = res[f];
                }.bind(window));

                res.getQueryObjectEXT = function(){
                    return undefined;
                    //return referencesWebGL1.getQueryObjectEXT.apply(this, arguments);
                }
            
                //return undefined;
                
            }
            else if (args[0] === 'OES_vertex_array_object'){

                methodsExt = [
                     'bindVertexArrayOES', 'createVertexArrayOES', 'deleteVertexArrayOES',
                ];

                // 
                methodsExt.forEach(function(f) {
                    if (!referencesWebGL1[f] && res[f]) referencesWebGL1[f] = res[f];
                }.bind(window));


                res.bindVertexArrayOES = function(){

                    var program = currentProgram;
                    //var program = this.getParameter(this.CURRENT_PROGRAM);
                    if (program) {
                        var p = findProgramProxyByRealProgramId(program.__uuid);
                        if (p) {
                            //var a = findAttributeByIndex(p, index);
                            //if (a) {
                            //    index = a.index;
                            //}
                            //debugger;
                            p.vao = arguments[0];

                            // should now cache bindBuffer /index or vertexAttribPointer 
                            // calls until next bindVertexArrayOES
                            // gl.ARRAY_BUFFER: Buffer containing vertex attributes, such as vertex coordinates, texture coordinate data, or vertex color data.
                            // gl.ELEMENT_ARRAY_BUFFER: Buffer used for element indices.

                        }
                    }

                    return referencesWebGL1.bindVertexArrayOES.apply(this, arguments);
                }

                res.createVertexArrayOES = function(arguments){
                    return referencesWebGL1.createVertexArrayOES.apply(this, arguments);
                }

                res.deleteVertexArrayOES = function(arguments){
                    return referencesWebGL1.deleteVertexArrayOES.apply(this, arguments);
                }

                //return res;

            }
            
        }

    );

    WebGLRenderingContext.prototype.bindAttribLocation = function(program, index, name) {

        var p = findProgramProxyById(program.__uuid);

        var gl = p.gl;
        referencesWebGL1.bindAttribLocation.apply(gl, [p.programReal, index, name]);
        var el = {
            index: index,
            originalIndex: index,
            name: name,
            gl: this
        };

        p.attributes.push(el);

        //logMsg( 'Bind attribute location ' + name + ': ' + index );

    }

    WebGLRenderingContext.prototype.enableVertexAttribArray = function(index) {

        var program = currentProgram;
        //var program = this.getParameter(this.CURRENT_PROGRAM);
        if (program) {
            var p = findProgramProxyByRealProgramId(program.__uuid);
            if (p) {
                var a = findAttributeByIndex(p, index);
                if (a) {
                    index = a.index;
                }
            }
        }

        //logMsg( 'enableVertexAttribArray ', p.programReal.__uuid, a.index, ' (' + a.name + ')' )
        var res = referencesWebGL1.enableVertexAttribArray.apply(this, [index]);
        return res;

    }

    WebGLRenderingContext.prototype.vertexAttribPointer = function(index, size, type, normalized, stride, offset) {

        var program = currentProgram;
        //var program = this.getParameter(this.CURRENT_PROGRAM);
        if (program) {
            var p = findProgramProxyByRealProgramId(program.__uuid);
            if (p) {

                var a = findAttributeByIndex(p, index);
                if (a) {

                    a.size = size;
                    a.type = type;
                    a.normalized = normalized;
                    a.stride = stride;
                    a.offset = offset;

                    index = a.index;

                }

            }

        }

        //logMsg( 'vertexAttribPointer ', p.programReal.__uuid, a.index, ' (' + a.name + ')' )

        var res = referencesWebGL1.vertexAttribPointer.apply(this, [index, size, type, normalized, stride, offset]);
        return res;

    };


    /// TEXTURE HOOKS
    WebGLRenderingContext.prototype.createTexture = function() {

        var res = referencesWebGL1.createTexture.apply(this, []);

        if (!settings.monitorTextures) {
            return res;
        }

        res.__uuid = createUUID();
        res.version = 1;
        //addProgram( this, res );
        logMsg('TEXTURE CREATED: ' + res);

        var textSettings = {
            texture: res,
            gl: this,
            targets: {}
        };

        textSettings.targets[this.TEXTURE_2D] = {
            parametersi: {},
            parametersf: {}
        };
        textSettings.targets[this.TEXTURE_CUBE_MAP] = {
            parametersi: {},
            parametersf: {}
        };

        textures[res.__uuid] = textSettings;

        doPostMessageClientShaderEditor({
            source: 'WebGLShaderEditor',
            method: 'createTexture',
            uid: res.__uuid,
                webGLVersion: 1
        }, '*');

        return res;

    };

    

    WebGLRenderingContext.prototype.bindTexture = function() {

        var res = referencesWebGL1.bindTexture.apply(this, arguments);

        if (!settings.monitorTextures) {
            return res;
        }

        //logMsg( 'TEXTURE bindTexture ' + arguments[ 1 ] );

        if (arguments[1] !== undefined && arguments[1] !== null) {
            //			logMsg( 'TEXTURE bindTexture: ' + arguments[ 1 ].__uuid );
            currentBoundTexture = arguments[1];
        } else {
            //logMsg( 'TEXTURE bindTexture: null' );
            currentBoundTexture = null;
        }
        //	doPostMessageClientShaderEditor( { source: 'WebGLShaderEditor', method: 'bindTexture', uid: res.__uuid }, '*' );	

        return res;

    };


    /*
    	** SIGH **

    	void texImage2D(GLenum target, GLint level, GLenum internalformat, 
                        GLsizei width, GLsizei height, GLint border, GLenum format, 
                        GLenum type, ArrayBufferView? pixels);
        void texImage2D(GLenum target, GLint level, GLenum internalformat,
                        GLenum format, GLenum type, TexImageSource? source); // May throw DOMException

    */

    // https://gist.github.com/jussi-kalliokoski/3138956

    WebGLRenderingContext.prototype.texImage2D = function() {

        var res = referencesWebGL1.texImage2D.apply(this, arguments);

        if (!settings.monitorTextures) {
            return res;
        }

        // ImageData array, ArrayBufferView, HTMLCanvasElement, HTMLImageElement 
        logMsg('TEXTURE texImage2D level' + arguments[1]);

        var image = arguments[8];
        if (image !== null) {
            if (!image) image = arguments[5];
            if (currentBoundTexture) {
                logMsg('Current bound texture: ' + currentBoundTexture.__uuid)
                if (image instanceof Image || image instanceof HTMLImageElement) {
                    var c = document.createElement('canvas');
                    var ctx = c.getContext('2d');
                    c.width = image.width;
                    c.height = image.height;
                    ctx.drawImage(image, 0, 0);
                    currentBoundTexture.width = c.width;
                    currentBoundTexture.height = c.height;
                    doPostMessageClientShaderEditor({
                        source: 'WebGLShaderEditor',
                        method: 'uploadTexture',
                        uid: currentBoundTexture.__uuid,
                        image: c.toDataURL(),
                        webGLVersion: 1
                    }, '*');
                    logMsg('TEXTURE texImage2D Image/HTMLImageElement');
                } else if (image instanceof ImageData) {
                    debug();
                    logMsg('TEXTURE texImage2D ImageData');
                } else if (image instanceof ArrayBuffer) {
                    debug();
                    logMsg('TEXTURE texImage2D ArrayBuffer');
                } else if (image instanceof Uint8Array) {
                    debug();
                    var c = document.createElement('canvas');
                    var ctx = c.getContext('2d');
                    c.width = arguments[3];
                    c.height = arguments[4];
                    var d = ctx.createImageData(c.width, c.height);
                    memcpy(image, 0, d.data, 0, d.data.length);
                    ctx.putImageData(d, 0, 0);
                    currentBoundTexture.width = c.width;
                    currentBoundTexture.height = c.height;
                    doPostMessageClientShaderEditor({
                        source: 'WebGLShaderEditor',
                        method: 'uploadTexture',
                        uid: currentBoundTexture.__uuid,
                        image: c.toDataURL(),
                         webGLVersion: 1
                    }, '*');
                    logMsg('TEXTURE texImage2D Uint8Array');
                } else if (image instanceof HTMLCanvasElement) {
                    currentBoundTexture.width = arguments[3];
                    currentBoundTexture.height = arguments[4];
                    doPostMessageClientShaderEditor({
                        source: 'WebGLShaderEditor',
                        method: 'uploadTexture',
                        uid: currentBoundTexture.__uuid,
                        image: image.toDataURL(),
                                        webGLVersion: 1
                    }, '*');
                    logMsg('TEXTURE texImage2D HTMLCanvasElement');
                } else if (image instanceof Float32Array) {
                    logMsg('TEXTURE textImage2D Float32Array');
                } else if (image instanceof HTMLVideoElement) {
                    logMsg('TEXTURE textImage2D HTMLVideoElement');
                } else {
                    debug();
                    logMsg('TEXTURE texImage2D Unknown format');
                }
            } else {
                logMsg('TEXTURE texImage2D NO BOUND TEXTURE');
            }
        } else {
            logMsg('TEXTURE set to null');
        }

        return res;

    };

    WebGLRenderingContext.prototype.texParameteri = function() {

        if (settings.monitorTextures) {
            var t = textures[currentBoundTexture.__uuid];
            t.targets[arguments[0]].parametersi[arguments[1]] = arguments[2];
        }

        return referencesWebGL1.texParameteri.apply(this, arguments);

    };

    WebGLRenderingContext.prototype.texParameterf = function() {

        if (settings.monitorTextures) {
            var t = textures[currentBoundTexture.__uuid];
            t.targets[arguments[0]].parametersf[arguments[1]] = arguments[2];
        }

        referencesWebGL1.texParameterf.apply(this, arguments);

    };

    WebGLRenderingContext.prototype.texSubImage2D = function() {

        logMsg('TEXTURE texSubImage2D');

        return referencesWebGL1.texSubImage2D.apply(this, arguments);

    };


    
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    // SHADER WEBGL2 HOOKS////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////



    if (WebGL2RenderingContext){

        WebGL2RenderingContext.prototype.transformFeedbackVaryings = function() {
        
            var program = currentProgram;
            if (program) {
                var p = findProgramProxyByRealProgramId(program.__uuid);
                if (p) {
                    p.transformFeedbackVaryings = arguments;
                }
            }
            return referencesWebGL2.transformFeedbackVaryings.apply(this, arguments);
        }
        
        WebGL2RenderingContext.prototype.bindVertexArray = function() {

            var program = currentProgram;
            if (program) {
                var p = findProgramProxyByRealProgramId(program.__uuid);
                if (p) {
                    p.vao = arguments[0];
                }
            }
            return referencesWebGL2.bindVertexArray.apply(this, arguments);
        }
        
        
        
    WebGL2RenderingContext.prototype.drawElements = function() {
        
        if(programTiming !== currentProgramID){
           return referencesWebGL2.drawElements.apply(this, arguments);
        }

        var ext = getWebglReferences().getExtension('EXT_disjoint_timer_query');        
        var query = ext.createQueryEXT();
        ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, query);
        var res = referencesWebGL2.drawElements.apply(this, arguments);
        ext.endQueryEXT(ext.TIME_ELAPSED_EXT);


        getQueryResult(ext, query);
        
        return res;

    };

    WebGL2RenderingContext.prototype.drawArrays = function() {
        
        if(programTiming !== currentProgramID){
           return referencesWebGL2.drawArrays.apply(this, arguments);
        }
        var ext = getWebglReferences().getExtension('EXT_disjoint_timer_query');        
        var query = ext.createQueryEXT();
        ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, query);
        var res = referencesWebGL2.drawArrays.apply(this, arguments);
        ext.endQueryEXT(ext.TIME_ELAPSED_EXT);

        getQueryResult(ext, query);
        
        
        return res;

    };

    WebGL2RenderingContext.prototype.createProgram = function() {

        var res = referencesWebGL2.createProgram.apply(this, []);
        res.__uuid = createUUID();
        res.version = 1;
        addProgram(this, res);

        return res;

    };

    WebGL2RenderingContext.prototype.createShader = _h(
        WebGL2RenderingContext.prototype.createShader,
        function(res, args) {

            // set WEBGL VERSION
            getContext(this, 2);
            res.__uuid = createUUID();
            addShader(res, args[0]);

        }
    );

    WebGL2RenderingContext.prototype.shaderSource = _h(
        WebGL2RenderingContext.prototype.shaderSource,
        function(res, args) {

            var s = findShader(args[0]);
            s.source = args[1];
            s.name = extractShaderName(s.source);

            //debugger;
            //logMsg( 'shaderSource', s.source );

        }
    );

    WebGL2RenderingContext.prototype.attachShader = _h(
        WebGL2RenderingContext.prototype.attachShader,
        function(res, args) {

            var p = findProgramProxyById(args[0].__uuid);
            var s = findShader(args[1]);

            if (s.type == p.gl.VERTEX_SHADER) {
                p.vertexShader = s;
                p.vertexShaderSource = s.source;
                setShaderName(p.original.__uuid, s.type, s.name);
                p.name = s.name;
            }
            if (s.type == p.gl.FRAGMENT_SHADER) {
                p.fragmentShader = s;
                p.fragmentShaderSource = s.source;
                setShaderName(p.original.__uuid, s.type, s.name);
                p.name = s.name;
            }

        }
    );


    WebGL2RenderingContext.prototype.useProgram = function(p) {

        if (p && p.__uuid) {

            var program = findProgramProxyById(p.__uuid);

            if(program.scheduledUpdate){

                scheduledUpdateProgram(program.scheduledUpdateID, program.scheduledVSource, program.scheduledFSource);
                program.scheduledUpdate = false;
                program.scheduledUpdateID = undefined;
                program.scheduledVSource = undefined;
                program.scheduledFSource = undefined;
            }

            currentProgram = program.programReal;
            currentProgramID = p.__uuid;

            //logMsg( '>>> useProgram', p.__uuid )
            referencesWebGL2.useProgram.apply(program.gl, [program.programReal]);

            if (settings.logShaderEditor) {
                var err = program.gl.getError();
                if (err) {
                    logMsg('Shader' + program.name + ' Err' + ' : ' + getWebglReferences().enum_strings[err]);
                    if (settings.debugShaderEditor) debugger;
                }
            }

        } else {
            referencesWebGL2.useProgram.apply(this, [null]);
            currentProgram = false;
        }

    };

    WebGL2RenderingContext.prototype.getUniformLocation = function(program, name) {

        var p = findProgramProxyById(program.__uuid);

        for (var j = 0; j < p.uniforms.length; j++) {
            if (p.uniforms[j].name === name) {
                return p.uniforms[j].locationProxy;
            }
        }

        var gl = p.gl;
        var res = referencesWebGL2.getUniformLocation.apply(gl, [p.programReal, name]);
        if (res) {
            res.__uuid = createUUID();

            res.__program__uuid = program.__uuid;
            res.__p__uuid = p.programReal.__uuid;

            p.uniforms.push({
                name: name,
                value: null,
                type: null,
                location: res,
                locationProxy: res,

                __program__uuid: program.__uuid,
                __p__uuid: p.programReal.__uuid,

                gl: this
            });

            logMsg('Added uniform location ' + name + ' ' + res.__uuid);
        }
        return res;

    };

    // UNIFORM Hooks

    methodsUniforms.forEach(function(f) {

        referencesWebGL2[f] = WebGL2RenderingContext.prototype[f];
        var count = 0;

        WebGL2RenderingContext.prototype[f] = function() {

     
            var args = arguments;
            if (args[0] === null || args[0] === undefined) return;

            var res = findProgramProxyByIdByLocationProxy(args[0]);

            if (res) {
     
                var gl = res.p.gl;
                var l = res.u.location;

                if (res.p.programReal !== currentProgram) {

                    logMsg('ShaderEditorClient: uniform on wrong Program ');
                    //console.log(currentProgram);
                    //console.log(res.p.programReal);
                    return;

                }


                // not used in this shader
                if (l === null || l.unbindable) return;


                var a = [],
                    aa = [];
                    aaa = '';
                a.push(l);
                for (var j = 1; j < args.length; j++) {
                    a.push(args[j]);
                    aa.push(args[j]);
                    if(args[j]) {
                       aaa += args[j].toString();
                       if (j < args.length - 1) aaa += ', ';
                    }
                }
                referencesWebGL2[f].apply(gl, a);

                if (settings.logShaderEditor) {
                    var err = gl.getError();
                    if (err) {
                        debbugger;
                        logMsg('Shader' + res.p.name + ' ORIG: ' + args[0].__uuid + ' ' + res.u.name + ' MAPS TO ' + res.u.location.__uuid + ' VAL: ' + args[1] + ' : ' + getWebglReferences().enum_strings[err]);
                        if (settings.debugShaderEditor) debugger;
                    }
                }

                if ( uniformTracker === res.u.name && programTracker === res.p._uuid && res.u.valueString !== aaa){

                     doPostMessageClientShaderEditor({
                        source: 'WebGLShaderEditor',
                        method: 'uniformValue',
                        value: res.u.valueString,
                        webGLVersion: 2
                    }, '*');
                    
                    //uniformTracker = undefined;                     
                    //programTracker = undefined;
                    //logMsg('set uniform  "' + res.u.name + ' type '+ f +' " to ' + aaa);
                }   
                
                res.u.valueString = aaa;
                res.u.value = aa;
                res.u.type = f;                

            } else {
                logMsg('Program by location ' + args[0].__uuid + ' not found');
            }

        }

    });

    // VERTEX ATTRIB HOOKS
    WebGL2RenderingContext.prototype.bindBuffer = function(target, buffer) {

        //logMsg( 'bindBuffer', target, buffer );
        return referencesWebGL2.bindBuffer.apply(this, [target, buffer]);

    }

    WebGL2RenderingContext.prototype.getAttribLocation = function(program, name) {

        var p = findProgramProxyById(program.__uuid);

        for (var j = 0; j < p.attributes.length; j++) {
            if (p.attributes[j].name === name) {
                return p.attributes[j].index;
            }
        }

        var gl = p.gl;
        var index = referencesWebGL2.getAttribLocation.apply(gl, [p.programReal, name]);
        if (index != -1) {

            var el = {
                index: index,
                originalIndex: index,
                name: name,
                gl: this
            };

            p.attributes.push(el);

            //logMsg( 'Added attribute location ' + name + ': ' + index + ' to ' + program.__uuid );
        }
        return index;

    }

    WebGL2RenderingContext.prototype.clear = function(mask){

         // main framebuffer get special case treatment for preservedrawbuffer
        if (pixelRequest && currentFrameBuffer !== 0 && currentFrameBuffer !== null){

                // glReadPixel Value
                var currentContext = getContext(this);

                if (!currentContext.colorPixel) currentContext.colorPixel = new Uint8Array(4);
                
                while ( this.checkFramebufferStatus( this.FRAMEBUFFER, currentFrameBuffer ) !== this.FRAMEBUFFER_COMPLETE ) {}

                this.flush();
                this.finish();

                // pixel store, flipY, etc ?
                this.readPixels(currentContext.canvasX, currentContext.canvasY, 1, 1, 
                                this.RGBA, this.UNSIGNED_BYTE, 
                                currentContext.colorPixel);

                if (settings.logShaderEditor) {
                    var err = this.getError();
                    if (err) {
                        logMsg('cannot pick framebuffer Err');
                        
                        console.log( getWebglReferences().enum_strings[err]);

                        if (settings.debugShaderEditor) debugger;
                    }
                }
                

            doPostMessageClientShaderEditor({
                source: 'WebGLShaderEditor',
                method: 'pixelValue',
                value: currentContext.colorPixel.toString(),
                webGLVersion: 2
            }, '*');

            //pixelRequest = undefined;

        } 

        referencesWebGL2.clear.apply(this, [mask]);

    }

    WebGL2RenderingContext.prototype.bindFrameBuffer = function(target, framebuffer){

            currentFrameBuffer = framebuffer;
            referencesWebGL2.bindFrameBuffer.apply(this, [target, framebuffer]);

    }

    WebGL2RenderingContext.prototype.getExtension = _h(
        WebGL2RenderingContext.prototype.getExtension,
        function(res, args) {
            logMsg('Get Extension  ' + args[0]);
            doPostMessageClientShaderEditor({
                source: 'WebGLShaderEditor',
                method: 'getExtension',
                extension: args[0],
                                        webGLVersion: 2
            }, '*');
        }
    );

    WebGL2RenderingContext.prototype.bindAttribLocation = function(program, index, name) {

            var p = findProgramProxyById(program.__uuid);

        var gl = p.gl;
        referencesWebGL2.bindAttribLocation.apply(gl, [p.programReal, index, name]);
        var el = {
            index: index,
            originalIndex: index,
            name: name,
            gl: this
        };

        p.attributes.push(el);

        //logMsg( 'Bind attribute location ' + name + ': ' + index );

    }

    WebGL2RenderingContext.prototype.enableVertexAttribArray = function(index) {

        var program = currentProgram;
        //var program = this.getParameter(this.CURRENT_PROGRAM);
        if (program) {
            var p = findProgramProxyByRealProgramId(program.__uuid);
            if (p) {
                var a = findAttributeByIndex(p, index);
                if (a) {
                    index = a.index;
                }
            }
        }

        //logMsg( 'enableVertexAttribArray ', p.programReal.__uuid, a.index, ' (' + a.name + ')' )
        var res = referencesWebGL2.enableVertexAttribArray.apply(this, [index]);
        return res;

    }

    WebGL2RenderingContext.prototype.vertexAttribPointer = function(index, size, type, normalized, stride, offset) {

        var program = currentProgram;
        //var program = this.getParameter(this.CURRENT_PROGRAM);
        if (program) {
            var p = findProgramProxyByRealProgramId(program.__uuid);
            if (p) {

                var a = findAttributeByIndex(p, index);
                if (a) {

                    a.size = size;
                    a.type = type;
                    a.normalized = normalized;
                    a.stride = stride;
                    a.offset = offset;

                    index = a.index;

                }

            }

        }

        //logMsg( 'vertexAttribPointer ', p.programReal.__uuid, a.index, ' (' + a.name + ')' )

        var res = referencesWebGL2.vertexAttribPointer.apply(this, [index, size, type, normalized, stride, offset]);
        return res;

    };


    /// TEXTURE HOOKS
    WebGL2RenderingContext.prototype.createTexture = function() {

        var res = referencesWebGL2.createTexture.apply(this, []);

        if (!settings.monitorTextures) {
            return res;
        }

        res.__uuid = createUUID();
        res.version = 1;
        //addProgram( this, res );
        logMsg('TEXTURE CREATED: ' + res);

        var textSettings = {
            texture: res,
            gl: this,
            targets: {}
        };

        textSettings.targets[this.TEXTURE_2D] = {
            parametersi: {},
            parametersf: {}
        };
        textSettings.targets[this.TEXTURE_CUBE_MAP] = {
            parametersi: {},
            parametersf: {}
        };

        textures[res.__uuid] = textSettings;

        doPostMessageClientShaderEditor({
            source: 'WebGLShaderEditor',
            method: 'createTexture',
            uid: res.__uuid,
                                        webGLVersion: 2
        }, '*');

        return res;

    };

    

    WebGL2RenderingContext.prototype.bindTexture = function() {

        var res = referencesWebGL2.bindTexture.apply(this, arguments);

        if (!settings.monitorTextures) {
            return res;
        }

        //logMsg( 'TEXTURE bindTexture ' + arguments[ 1 ] );

        if (arguments[1] !== undefined && arguments[1] !== null) {
            //          logMsg( 'TEXTURE bindTexture: ' + arguments[ 1 ].__uuid );
            currentBoundTexture = arguments[1];
        } else {
            //logMsg( 'TEXTURE bindTexture: null' );
            currentBoundTexture = null;
        }
        //  doPostMessageClientShaderEditor( { source: 'WebGLShaderEditor', method: 'bindTexture', uid: res.__uuid }, '*' );    

        return res;

    };


    /*
        ** SIGH **

        void texImage2D(GLenum target, GLint level, GLenum internalformat, 
                        GLsizei width, GLsizei height, GLint border, GLenum format, 
                        GLenum type, ArrayBufferView? pixels);
        void texImage2D(GLenum target, GLint level, GLenum internalformat,
                        GLenum format, GLenum type, TexImageSource? source); // May throw DOMException

    */

    // https://gist.github.com/jussi-kalliokoski/3138956

    WebGL2RenderingContext.prototype.texImage2D = function() {

        var res = referencesWebGL2.texImage2D.apply(this, arguments);

        if (!settings.monitorTextures) {
            return res;
        }

        // ImageData array, ArrayBufferView, HTMLCanvasElement, HTMLImageElement 
        logMsg('TEXTURE texImage2D level' + arguments[1]);

        var image = arguments[8];
        if (image !== null) {
            if (!image) image = arguments[5];
            if (currentBoundTexture) {
                logMsg('Current bound texture: ' + currentBoundTexture.__uuid)
                if (image instanceof Image || image instanceof HTMLImageElement) {
                    var c = document.createElement('canvas');
                    var ctx = c.getContext('2d');
                    c.width = image.width;
                    c.height = image.height;
                    ctx.drawImage(image, 0, 0);
                    currentBoundTexture.width = c.width;
                    currentBoundTexture.height = c.height;
                    doPostMessageClientShaderEditor({
                        source: 'WebGLShaderEditor',
                        method: 'uploadTexture',
                        uid: currentBoundTexture.__uuid,
                        image: c.toDataURL(),
                                        webGLVersion: 2
                    }, '*');
                    logMsg('TEXTURE texImage2D Image/HTMLImageElement');
                } else if (image instanceof ImageData) {
                    debug();
                    logMsg('TEXTURE texImage2D ImageData');
                } else if (image instanceof ArrayBuffer) {
                    debug();
                    logMsg('TEXTURE texImage2D ArrayBuffer');
                } else if (image instanceof Uint8Array) {
                    debug();
                    var c = document.createElement('canvas');
                    var ctx = c.getContext('2d');
                    c.width = arguments[3];
                    c.height = arguments[4];
                    var d = ctx.createImageData(c.width, c.height);
                    memcpy(image, 0, d.data, 0, d.data.length);
                    ctx.putImageData(d, 0, 0);
                    currentBoundTexture.width = c.width;
                    currentBoundTexture.height = c.height;
                    doPostMessageClientShaderEditor({
                        source: 'WebGLShaderEditor',
                        method: 'uploadTexture',
                        uid: currentBoundTexture.__uuid,
                        image: c.toDataURL(),
                                        webGLVersion: 2
                    }, '*');
                    logMsg('TEXTURE texImage2D Uint8Array');
                } else if (image instanceof HTMLCanvasElement) {
                    currentBoundTexture.width = arguments[3];
                    currentBoundTexture.height = arguments[4];
                    doPostMessageClientShaderEditor({
                        source: 'WebGLShaderEditor',
                        method: 'uploadTexture',
                        uid: currentBoundTexture.__uuid,
                        image: image.toDataURL(),
                                        webGLVersion: 2
                    }, '*');
                    logMsg('TEXTURE texImage2D HTMLCanvasElement');
                } else if (image instanceof Float32Array) {
                    logMsg('TEXTURE textImage2D Float32Array');
                } else if (image instanceof HTMLVideoElement) {
                    logMsg('TEXTURE textImage2D HTMLVideoElement');
                } else {
                    debug();
                    logMsg('TEXTURE texImage2D Unknown format');
                }
            } else {
                logMsg('TEXTURE texImage2D NO BOUND TEXTURE');
            }
        } else {
            logMsg('TEXTURE set to null');
        }

        return res;

    };

    WebGL2RenderingContext.prototype.texParameteri = function() {

        if (settings.monitorTextures) {
            var t = textures[currentBoundTexture.__uuid];
            t.targets[arguments[0]].parametersi[arguments[1]] = arguments[2];
        }

        return referencesWebGL2.texParameteri.apply(this, arguments);

    };

    WebGL2RenderingContext.prototype.texParameterf = function() {

        if (settings.monitorTextures) {
            var t = textures[currentBoundTexture.__uuid];
            t.targets[arguments[0]].parametersf[arguments[1]] = arguments[2];
        }

        referencesWebGL2.texParameterf.apply(this, arguments);

    };

    WebGL2RenderingContext.prototype.texSubImage2D = function() {

        logMsg('TEXTURE texSubImage2D');

        return referencesWebGL2.texSubImage2D.apply(this, arguments);

    };
}

    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    // END HOOKS////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////

    function onSelectProgram(id) {

        var program = findProgramProxyById(id);
        logMsg('Shader ' + program.name + ' selected ' + id);

        //logMsg( program );

        doPostMessageClientShaderEditor({
            source: 'WebGLShaderEditor',
            method: 'setVSSource',
            code: program.vertexShaderSource
        }, '*');

        doPostMessageClientShaderEditor({
            source: 'WebGLShaderEditor',
            method: 'setFSSource',
            code: program.fragmentShaderSource
        }, '*');

    }

    function onUpdateVSource(id, source) {

        var program = findProgramProxyById(id);
        program.vertexShaderSource = source;
        logMsg('vs update');

    }

    function onUpdateFSource(id, source) {

        var program = findProgramProxyById(id);
        program.fragmentShaderSource = source;
        logMsg('fs update');

    }

    function extractShaderName(source) {

        var name = '';
        var m;

        var re = /#define[\s]+SHADER_NAME[\s]+([\S]+)(\n|$)/gi;
        if ((m = re.exec(source)) !== null) {
            if (m.index === re.lastIndex) {
                re.lastIndex++;
            }
            name = m[1];
        }

        if (name === '') {

            //#define SHADER_NAME_B64 44K344Kn44O844OA44O8
            //#define SHADER_NAME_B64 8J+YjvCfmIE=

            var re = /#define[\s]+SHADER_NAME_B64[\s]+([\S]+)(\n|$)/gi;
            if ((m = re.exec(source)) !== null) {
                if (m.index === re.lastIndex) {
                    re.lastIndex++;
                }
                name = m[1];
            }

            if (name) {
                name = b64DecodeUnicode(source);
            }
        }
/*
        if (name === '') {
            name = createUUID().toString().slice(0,6);
        }
*/
        return name;

    }

    var updateProgramTimeout;

    function onUpdateProgram(id, vSource, fSource) {
        
        var program = findProgramProxyById(id);
            
        program.scheduledUpdate = true;
        program.scheduledUpdateID = id;
        program.scheduledVSource = vSource;
        program.scheduledFSource = fSource;

    }

    function getWebglRenderingContext(){
        if (currentVersion === 1) return WebGLRenderingContext;
        if (currentVersion === 2) return WebGL2RenderingContext;
        logMsg('not ready yet');
    }
    function getWebglReferences(){
        if (currentVersion === 1) return referencesWebGL1;
        if (currentVersion === 2) return referencesWebGL2;
        logMsg('not ready yet');
    }

    function sendCompilationResult(id, result, name, log){
        
        if (id === programTracker){

            //logMsg("sendCompilationResult" + " " +  id + " tracked: " + programTracker + " results: " + (result ? "true" : "false"));

            doPostMessageClientShaderEditor({
                    source: 'WebGLShaderEditor',
                    method: 'programUsed',
                    name: name,
                    id: id,
                    result: result ? "true" : "false",
                    log: log
                }, '*');

            programTracker = undefined;
        }

    }

        
    var getQueryResult = function (glCtx, query){

        
        if (!currentQueryExt.getQueryObjectEXT(currentQuery, currentQueryExt.QUERY_RESULT_AVAILABLE_EXT) || glCtx.getParameter(currentQueryExt.GPU_DISJOINT_EXT)) {
            return;
        }

        var timeElapsedMs = currentQueryExt.getQueryObjectEXT(currentQuery, currentQueryExt.QUERY_RESULT_EXT) / 1000000.0;

        var p = findProgramProxyById(programTiming);

        //console.log('------------ timed: ' + timeElapsedMs + ' for ' +  programTiming);

        doPostMessageClientShaderEditor({
                    source: 'WebGLShaderEditor',
                    method: 'programTiming',
                    name: p.name,
                    result: timeElapsedMs
        }, '*');


        programTiming = undefined;
        currentQuery = undefined;
    }

    function scheduledUpdateProgram(id, vSource, fSource) {

        var validCompilation = true;

        var programOriginal = findProgramProxyById(id);

        logMsg('update ' + programOriginal.name, id);
        currentProgramSelected = id;
            
        var gl = programOriginal.gl;
        var p = getWebglReferences().createProgram.apply(gl);
        p.__uuid = createUUID();

        // create New Program and uniform and attribute
        // !!! if program used while we are change it, it breaks !!!
        var previousRealProgram = programOriginal.programReal;


        var source, name, err, log;

        var vs = getWebglReferences().createShader.apply(gl, [gl.VERTEX_SHADER]);
        source = vSource !== undefined ? vSource : programOriginal.vertexShaderSource;
        getWebglReferences().shaderSource.apply(gl, [vs, source]);
        getWebglReferences().compileShader.apply(gl, [vs]);

        name = extractShaderName(source);

        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            
            log = gl.getShaderInfoLog(vs);
            sendCompilationResult(id, false, name, log);
            logMsg(log);
            if (settings.debugShaderEditor) debugger;
            return;
        }
                
        setShaderName(programOriginal.original.__uuid, gl.VERTEX_SHADER, name);
        p.name = name;
        getWebglReferences().attachShader.apply(gl, [p, vs]);

        var fs = getWebglReferences().createShader.apply(gl, [gl.FRAGMENT_SHADER]);
        source = fSource !== undefined ? fSource : programOriginal.fragmentShaderSource;
        getWebglReferences().shaderSource.apply(gl, [fs, source]);
        getWebglReferences().compileShader.apply(gl, [fs]);

        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {

            log = gl.getShaderInfoLog(fs);
            sendCompilationResult(id, false, name, log);
            logMsg(gl.getShaderInfoLog(fs));
            if (settings.debugShaderEditor) debugger;
            return;

        }

        name = extractShaderName(source);
        setShaderName(programOriginal.original.__uuid, gl.FRAGMENT_SHADER, name);
        p.name = name;
        getWebglReferences().attachShader.apply(gl, [p, fs]);
        getWebglReferences().linkProgram.apply(gl, [p]);

        /// keep trace of previously binded
        var previousBindedProgram = currentProgram;
        if (previousBindedProgram === previousRealProgram) {
            previousBindedProgram = false;
        }


        var useProgramFail = false;
        getWebglReferences().useProgram.apply(gl, [p]);     
        err = gl.getError();
        if (err) {
                console.log(getWebglReferences().enum_strings[err]);
                var log = gl.getProgramInfoLog(p);
                useProgramFail = true;
               
                sendCompilationResult(id, false, name, log);
                if (settings.logShaderEditor) logMsg('Shader' + p.name + ' doesnt compile on client');
                if (settings.debugShaderEditor) debugger;
             
        }


        // get again all uniform location
        // use getWebglReferences().getActiveUniform() ?
        for (var j = 0; j < programOriginal.uniforms.length; j++) {

            var u = programOriginal.uniforms[j];

            var proxyID = u.locationProxy.__uuid;

            //var locationOld = getWebglReferences().getUniformLocation.apply(u.gl, [previousRealProgram, u.name]);
            //if (locationOld === null) continue;

            u.location = getWebglReferences().getUniformLocation.apply(u.gl, [p, u.name]);
            if (u.location === null)  u.location = {unbindable: true};                     

            u.location.__proxy__uuid = proxyID;
            u.location.__uuid = createUUID();

            u.location.__program__uuid = id;
            u.location.__p__uuid = p.__uuid;

            if (u.value !== null && !u.location.unbindable) {

                var args = [u.location]
                u.value.forEach(function(v) {
                    args.push(v)
                });
                getWebglReferences()[u.type].apply(u.gl, args);

                 
                err = u.gl.getError();
                if (err) {
                    sendCompilationResult(id, false, name, getWebglReferences().enum_strings[err]);
                    if (settings.logShaderEditor) logMsg('Shader' + p.name + ' ORIG: ' + proxyID + ' ' + u.name + ' MAPS TO ' + u.location.__uuid + ' : ' +  getWebglReferences().enum_strings[err]);
                    if (settings.debugShaderEditor) debugger;
                    return;
                }
                

            }
            //logMsg('updated uniform location "' + u.name + '"" to ' + u.location.__uuid + ' (was ' + proxyID + ')');

        }

        /*
        All vertex attribute locations have to be the same in the re-linked program. In order to guarantee this, it's 
        necessary to call getActiveAttrib on the original program from 0..getProgramParameter(program, ACTIVE_ATTRIBUTES), 
        record the locations of those attributes, and then call bindAttribLocation on the program object for each of them, 
        to re-assign them before re-linking. Otherwise you're leaving it to chance that the OpenGL implementation 
        will assign the vertex attributes to the same locations.
        */
        var lAttrib = gl.getProgramParameter(previousRealProgram, gl.ACTIVE_ATTRIBUTES);
        var attribMap = [];
        for (var r = 0; r < lAttrib; r++) {        
            var attribInfo = gl.getActiveAttrib(previousRealProgram, r);
            // {name, size, type }
            attribMap.push(attribInfo);
            
        }

        if (programOriginal.vao){
        
            var ctx = getContext(gl);
            if (ctx.currentVersion === 1){
                // WebGL: INVALID_OPERATION: drawElements: no buffer is bound to enabled attribute
                // to force it again, but doesn't seem to fix it
                var ext = gl.getExtension('OES_vertex_array_object');
                referencesWebGL1.bindVertexArrayOES.apply(ext, [programOriginal.vao]);
            }
            else{
                referencesWebGL2.bindVertexArray.apply(gl, [programOriginal.vao]);   
            }
        }

        if (programOriginal.transformFeedbackVaryings){

            var ctx = getContext(gl);
            referencesWebGL2.transformFeedbackVaryings.apply(gl, programOriginal.transformFeedbackVaryings);
            
        }

        for (var j = 0; j < programOriginal.attributes.length; j++) {

            var u = programOriginal.attributes[j];
            u.index = getWebglReferences().getAttribLocation.apply(u.gl, [previousRealProgram, u.name]);

            getWebglReferences().bindAttribLocation.apply(gl, [p, u.index, u.name]);

            if (u.size) {
                getWebglReferences().vertexAttribPointer.apply(u.gl, [u.index, u.size, u.type, u.normalized, u.stride, u.offset]);

                err = u.gl.getError();
                if (err) {
                    sendCompilationResult(id, false, name,  getWebglReferences().enum_strings[err]);
                    if (settings.logShaderEditor) logMsg('Shader' + p.name + ' vertexAttribPointer ');
                    if (settings.debugShaderEditor) debugger;
                    return;
                }
                

            }

            getWebglReferences().enableVertexAttribArray.apply(u.gl, [u.index]);

             
            err = u.gl.getError();
            if (err) {
                sendCompilationResult(id, false, name,  getWebglReferences().enum_strings[err]);
                if (settings.logShaderEditor) logMsg('Shader' + p.name + ' enableVertexAttribArray ');
                if (settings.debugShaderEditor) debugger;
                return;
            }
           

            //logMsg('updated attribute location ' + u.name);

        }

        if (useProgramFail){

            getWebglReferences().useProgram.apply(gl, [p]);     
            err = gl.getError();
            if (err) {

                var log = gl.getProgramInfoLog(p);
                sendCompilationResult(id, false, name, log);
                if (settings.logShaderEditor) logMsg('Shader' + p.name + ' doesnt compile on client' + log + ' err: ' +   getWebglReferences().enum_strings[err]);
                if (settings.debugShaderEditor) debugger;
                return;
            }

         }

        logMsg('updated Program ' + p.name + ' : ' + id);

        // PRGRAMM CHANGE
        programOriginal.programReal = p;
        p.version = previousRealProgram.version + 1;
        programOriginal.version = p.version;
        currentProgram = p;
        programOriginal.name = p.name;

        sendCompilationResult(id, true, name);

        if (previousBindedProgram) {

            //getWebglReferences().useProgram.apply(gl, [previousBindedProgram]);
            logMsg('not restored previous binded Program ' + previousBindedProgram.name );

        }

    }


    ////////////////////// Actions

    window.UIProgramSelected = function(id) {

        onSelectProgram(id);

    }

    window.UIProgramTimingRequest = function(id){

        //console.log('new timing Request: ' + id);
        log('UIProgramTimingRequest');
        programTiming = id;

    }


    window.UIProgramReplaced = function(id, shaderMain, useMain) {

        log('UIProgramReplaced');

        programTracker = id;
        var p = findProgramProxyById(id);
        var vs = p.vertexShaderSource;

        var fs;
        if ( useMain === "true" ){

                fs = p.fragmentShaderSource;
                fs = fs.replace(/\s*main\s*\(/, ' ShaderEditorInternalMain(');
                fs += '\r\n';
                fs += decodeSource(shaderMain);
        }
        else{

            fs = decodeSource(shaderMain);
        }        
        


        onUpdateProgram(id, vs, fs);

    }

    window.UIProgramOut = function(id) {

        log('UIProgramOut');

        var p = findProgramProxyById(id);
        var vs = p.vertexShaderSource;
        var fs = p.fragmentShaderSource;

        onUpdateProgram(id, vs, fs);

    }

    window.UIProgramDisabled = function(id) {

        log('UIProgramDisabled');

        var p = findProgramProxyById(id);
        var vs = p.vertexShaderSource;
        var fs = p.fragmentShaderSource;

        //		fs = fs.replace( /\s+main\s*\(/, ' ShaderEditorInternalMain(' );
        //		fs += '\r\n' + 'void main() { discard; }';
        fs = fs.replace(/\s+main\s*\(/, ' ShaderEditorInternalMain(');
        fs += '\r\n' + 'void main() { ShaderEditorInternalMain(); discard; }';

        onUpdateProgram(id, vs, fs);

    }

    window.UIProgramEnabled = function(id) {

        log('UIProgramOut');

        var p = findProgramProxyById(id);
        var vs = p.vertexShaderSource;
        var fs = p.fragmentShaderSource;

        onUpdateProgram(id, vs, fs);

    }

    window.UIUpdateImage = function(id, src) {

        var t = textures[id];
        if (t) {
            var img = new Image();
            img.src = src;
            getWebglReferences().bindTexture.apply(t.gl, [t.gl.TEXTURE_2D, t.texture]);
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = t.texture.width;
            canvas.height = t.texture.height;
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
            logMsg('UPDATE TEXTURE ', img.width, img.height, canvas.width, canvas.height);
            var res = getWebglReferences().texImage2D.apply(t.gl, [t.gl.TEXTURE_2D, 0, t.gl.RGBA, t.gl.RGBA, t.gl.UNSIGNED_BYTE, canvas]);
            //			var res = getWebglReferences().texSubImage2D.apply( t.gl, [ t.gl.TEXTURE_2D, 0, 0, 0, img.width, img.height, t.gl.RGBA, t.gl.UNSIGNED_BYTE, img ] );

            if (settings.logShaderEditor) {
                var err = t.gl.getError();
                if (err) {
                    logMsg(' texImage2D ' + getWebglReferences().enum_strings[err]);
                    if (settings.debugShaderEditor) debugger;
                }
            }
            t.gl.generateMipmap(t.gl.TEXTURE_2D);
            t.gl.getWebglReferences().bindTexture.apply(t.gl, [t.gl.TEXTURE_2D, null]);
        }

    }

    /*window.UISettingsChanged = function( setting, value ) {

    	doPostMessageClientShaderEditor( { source: 'WebGLShaderEditor', method: 'saveSetting', setting: setting, value: value }, '*');

    }*/

    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

    function decodeSource(input) {

        var str = String(input).replace(/=+$/, '');
        if (str.length % 4 == 1) {
            throw new InvalidCharacterError("'atob' failed: The string to be decoded is not correctly encoded.");
        }
        for (
            var bc = 0, bs, buffer, idx = 0, output = ''; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
                bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
        ) {
            buffer = chars.indexOf(buffer);
        }
        return output;

    }

    window.UIVSUpdate = function(id, src) {

        log('UPDATE VS');
        onUpdateVSource(id, decodeSource(src));
        onUpdateProgram(id);

    }

    window.UIFSUpdate = function(id, src) {

        log('UPDATE FS');
        onUpdateFSource(id, decodeSource(src));
        onUpdateProgram(id);

    }
    
    window.UIUpdateSettings = function(json) {

        log('UPDATE Settings');
        settings = JSON.parse(json)

    }

    window.UIUniformRequest = function(id, uniformName) {

        //uniformTracker = uniformName;        
        //programTracker = id;

        var p = findProgramProxyById(id);
        log('Uniform Request: ' + p.name + '::' + uniformName) ;

        if (!p) return;

        for (var k = 0; k < p.uniforms.length; k++) {

            var u = p.uniforms[k];

            if (u.name === uniformName) {
                        
                log('Uniform Send: ' + p.name + '::' + uniformName) ;

                doPostMessageClientShaderEditor({
                    source: 'WebGLShaderEditor',
                    method: 'uniformValue',
                    value: u.valueString,
                    webGLVersion: 1
                }, '*');
                return;
            }

        }

        doPostMessageClientShaderEditor({
            source: 'WebGLShaderEditor',
            method: 'uniformValue',
            value: ' Not used in this Shader',
            webGLVersion: 1
        }, '*');
    }


    window.UIPick = function() {

        if(!currentContextGL) return;    

        if (pixelRequest) {            
            pixelRequest = false;
            requestContextGL = undefined;
            return;
        }

        pixelRequest = true;
        requestContextGL = currentContextGL;

        var id = currentProgramSelected !== undefined ? currentProgramSelected : currentProgram;
        var p = findProgramProxyById(id);
        framebufferRequest = (p ? p.framebuffer : null);

    }

   var speed = 0;
    // setFrameControl(0); play
    // setFrameControl(250); slow 
    // setFrameControl(Infinity); pause

    window.UIPlayPause = function () {
        if (speed === 0) speed = Infinity;
        else speed = 0;

        setFrameControl(speed);   
    }
        
    window.UISlow = function () {
        if (speed === 250) speed = 0;
        else speed = 250;

        setFrameControl(speed);   
    }
   
    var getFileName = function(){
        
        var id = currentProgramSelected !== undefined ? currentProgramSelected : currentProgram;
        var p = findProgramProxyById(id);
        var name = (p ? p.name : 'Program');
        name += '_' + window.performance.now().toString();
        return name;
        
    };

    var downloadFile = function ( url, type ) {
                
            var dlLink = document.createElement('a');
            dlLink.download = getFileName() + '.' + type;         
            dlLink.href = url;
            document.body.appendChild(dlLink);
            dlLink.click();
            document.body.removeChild(dlLink);    
            
    };


    window.UIScreenshot = function () {
        
        if(!currentContextGL) return;        
        
        screenshotRequest = true;
        requestContextGL = currentContextGL;

        
        var id = currentProgramSelected !== undefined ? currentProgramSelected : currentProgram;
        var p = findProgramProxyById(id);
        framebufferRequest = (p ? p.framebuffer : null);

        /* need preservedrawbuffer true
        var canvas = currentContextGL.canvas;        
        canvas.toBlob(function(blob) {
            
            var newImg = document.createElement('img'),
            url = URL.createObjectURL(blob);
            downloadFile(url, 'jpg');
            
        }, 'image/jpeg', 0.95);
        */
    
    };
    
    var recorder;

    window.UIRecord =function () {
        
        if(!currentContextGL) return;  


        if ( recorder ) {
            recorder.stop();
            recorder = undefined;
        }
        else{
        
        var canvas = currentContextGL.canvas;        
        var elementToShare = canvas;
        var stream = elementToShare.captureStream( 25 ); // fps
        
        var options = {
            mimeType: 'video/webm; codecs=vp9'
        };
        
        recorder = new window.MediaRecorder( stream, options );
        
        var blobs = [];
        var download = function ( blob ) {
            var url = window.URL.createObjectURL( blob );
            
            downloadFile( url, 'webm' );
            
        }
        
        recorder.ondataavailable = function ( e ) {
            if ( e.data && e.data.size > 0 ) blobs.push( e.data );
        };
        
        recorder.onstop = function () {
            download( new Blob( blobs, {
                type: 'video/webm'
            } ) );
        }
        
        recorder.start();
        }
    };
    
    
    //window.addEventListener('load', function() {
        doPostMessageClientShaderEditor({
            source: 'WebGLShaderEditor',
            method: 'init'
        }, '*');
   // });

    console.log('shaderEditorExtension webgl hooked');


}
