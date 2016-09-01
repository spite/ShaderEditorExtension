//First Author Patricio Gonzalez Vivo https://github.com/patriciogonzalezvivo
//Special thanks to Lou Huang. glslEditor born from learned leassons on TangramPlay. His code and wizdom is all arround this project.
// adaptation tuan.kuranes https://twitter.com/tuan_kuranes
/*Licensed under the standard MIT license:

Copyright 2012 Ian Johnson.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/


var fragColorRE = new RegExp('(?:out)\\s+(?:vec4)\\s+\\b(.*(?:[C,c]ol){1}.*)\\b\\s*;');
var voidRE = new RegExp('void main\\s*\\(\\s*[void]*\\)', 'i');
var versionRE = new RegExp('(?:#version)\\s+\\b([1,3]00)\\b\\s+');

function getMainFragColor(cm, version) {

    var constructIN = false;
    var nLines = cm.getDoc().size;

    var versionIN;
    for (var i = 0; i < nLines; i++) {

        var lineString = cm.getLine(i).trim();                
        if (lineString.length === 0 || lineString[0] === '/') continue;

        if (!versionIN) {

            var versionMatch = versionRE.exec(lineString);
            if (versionMatch){
                if (versionMatch[1] === '300') {
                    shaderVersion = 2;
                    versionIN = true;
                }
                else if (versionMatch[1] === '100'){                    
                    return 'gl_FragColor';
                }
            }
        }   
        else{                    

            var fragColor = fragColorRE.exec(lineString);
            if (fragColor) {
                return fragColor[1];
            }

        }
    }

    return 'gl_FragColor';
}




var VisualDebug = (function() {


    /////////////////////////////////

    function makeMarker(simbol) {

        var marker = document.createElement('div');
        marker.setAttribute('class', 'ge_assing_marker');
        marker.innerHTML = simbol;
        return marker;

    }

    function isCommented(cm, nLine, match) {

        var token = cm.getTokenAt({
            line: nLine,
            ch: match.index
        });
        if (token && token.type) {
            return token.type === 'comment';
        }
        return false;

    }


    function searchOverlay(query, caseInsensitive) {

        if (typeof query === 'string') {
            query = new RegExp(query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&'), caseInsensitive ? 'gi' : 'g');
        } else if (!query.global) {
            query = new RegExp(query.source, query.ignoreCase ? 'gi' : 'g');
        }

        return {
            token: function(stream) {
                query.lastIndex = stream.pos;
                var match = query.exec(stream.string);
                if (match && match.index === stream.pos) {
                    stream.pos += match[0].length || 1;
                    return 'searching';
                } else if (match) {
                    stream.pos = match.index;
                } else {
                    stream.skipToEnd();
                }
            }
        };
    }

    var clean = function(editor, event, justIllum) {

        if (event && event.target && (event.target.className === 'ge_assing_marker' || event.target.className === 'ge_assing_marker_on')) {
            return;
        }

        var cm = editor;
        
        if (justIllum === undefined){
            
            cm.clearGutter('breakpoints');
            editor.mySettings.variable = null;
            editor.mySettings.type = null;        

            editor.mySettings.debugging = false;
            if (editor.mySettings.active) {
                editor.mySettings.active.setAttribute('class', 'ge_assing_marker');
            }
            editor.mySettings.active = false;
            editor.mySettings.breakpoints = false
        }

    
        if (editor.mySettings.overlay) {
            cm.removeOverlay(editor.mySettings.overlay, true);
        }
        
    };


    var illuminate = function(editor, value, justIllum) {

        if (editor.mySettings.debugging && editor.mySettings.variable === value) {
            return;
        }

        clean(editor, false, justIllum);

        var cm = editor;

        if (justIllum === undefined){

            var lineHandle;

            // Show line where the value of the value is been asigned
            var voidIN = false;
            
            var constructRE = new RegExp('(?:\\w)*\\s*\\b(float|vec\\d)\\b\\s+(' + value + ')\\s?', 'g');// no i

            var constructIN = false;
            var assignRE = new RegExp('\\s?(' + value + ')\\s*[\\.|x|y|z|w|r|g|b|a|s|t|p|q]*[\\*|\\+|\\-|\\/]?\\s*=', 'g');// no i

            var nLines = cm.getDoc().size;

            for (var i = 0; i < nLines; i++) {

                var lineString = cm.getLine(i).trim();                
                if (lineString.length === 0 || lineString[0] === '/') continue;

                if (!voidIN) {
                    // Do not start until being inside the main function
                    var voidMatch = voidRE.exec(lineString);
                    if (voidMatch) {

                        voidIN = true;

                    }
                } else {
                    if (!constructIN) {

                        // Search for the constructor
                        var constructMatch = constructRE.exec(lineString);

                        if (constructMatch && constructMatch[1] && !isCommented(cm, i, constructMatch)) {

                            editor.mySettings.type = constructMatch[1];
                            lineHandle = cm.getLineHandle(i);
                            cm.setGutterMarker(lineHandle, 'breakpoints', makeMarker('&#x2605;'));//'+')); //'&#x2605;'));
                            constructIN = true;
                            editor.mySettings.breakpoints = true;

                        }
                    } else {

                        // Search for changes on tha value using "="
                        // (miss usage of variable as function parameter... so why not all usage...?)
                        var assignMatch = assignRE.exec(lineString);
                        if (assignMatch && !isCommented(cm, i, assignMatch)) {
                        
                            lineHandle = cm.getLineHandle(i);
                            cm.setGutterMarker(lineHandle, 'breakpoints', makeMarker('&bull;')); // '<span style="padding-left: 3px;">●</span>'));
                            editor.mySettings.breakpoints = true;

                        }

                    }
                }
            }
        }
        // Highlight all calls to a variable

        editor.mySettings.overlay = searchOverlay(value, true);
        // this one set editor.display.viewTo viewFrom to 0, 
        // preventing any editor update afterwards
        cm.addOverlay(editor.mySettings.overlay);        

        if (cm.showMatchesOnScrollbar) {

            if (editor.mySettings.annotate) {
                editor.mySettings.annotate.clear();
                editor.mySettings.annotate = null;
            }
            editor.mySettings.annotate = cm.showMatchesOnScrollbar(value, true);
        }

        editor.mySettings.variable = value;

    };


    /////////////////////////////////
    var getDebugShader = function(cm, nLine, type, variableName, keep){

        var frag = '';
        for (var i = 0; i < nLine; i++) {
            frag += cm.getLine(i) + '\n';
        }
        // store the var
        frag += cm.getLine(i++);
        frag += ' \n shaderEditorVariableGlobal = ' + variableName + ';\n';
        
        if (keep){
            var nLines = cm.getDoc().size;
            for (; i <  nLines; i++) {
                frag += cm.getLine(i) + '\n';
            }
        }else{
            frag += '}';
        }

        var newVar = type + ' shaderEditorVariableGlobal;';

        //  TODO: if webgl2 out to detect shader nto using gl_FragColor like those using 
        // "out color"

        var fragColor = getMainFragColor(cm, currentVersion);
        var newFragColor= '\n\t' + fragColor + ' = ' + (keep ? fragColor + ' * 0.001 + ' : '');

        if (type === 'float') {
            newFragColor += 'vec4(vec3(shaderEditorVariableGlobal),1.)';
        } else if (type === 'vec2') {
            newFragColor += 'vec4(vec3(shaderEditorVariableGlobal,0.),1.)';
        } else if (type === 'vec3') {
            newFragColor += 'vec4(shaderEditorVariableGlobal,1.)';
        } else if (type === 'vec4') {
            newFragColor += 'shaderEditorVariableGlobal';
        }
        newFragColor += ';';

        var shaderFrag = frag.replace(/(\s*void\s*main\s*\()|(\s*main\s*\()/, '\n' + newVar +'\n void ShaderEditorInternalMain(');
        shaderFrag +=  '\n void main() { ShaderEditorInternalMain(); ' 
        shaderFrag += newFragColor ;
        shaderFrag += '}';

        return shaderFrag;
    };

    var debugLine = function(cm, nLine) {

        if (cm.mySettings.type && cm.mySettings.variable) {
            
            currentShaderTempReplace(undefined, getDebugShader(cm, nLine, cm.mySettings.type, cm.mySettings.variable, true));

            cm.mySettings.debugging = true;

        }
    };

    var doVisualDebug = function(cm) {

        if (!cm.mySettings) cm.mySettings = {};
        cm.mySettings.debugging = false;
        cm.mySettings.active = null;
        cm.mySettings.illuminate = illuminate;        
        cm.mySettings.getDebugShader = getDebugShader;
        cm.mySettings.isCommented = isCommented;
        cm.mySettings.makeMarker = makeMarker;

        cm.on('gutterClick', function(cm, n) {

            var info = cm.lineInfo(n);

            if (info) {

                var gutterMarkers = info.gutterMarkers;
                if (!gutterMarkers) gutterMarkers = info.handle && info.handle.gutterMarkers;
                if ( gutterMarkers && gutterMarkers.breakpoints) {

                    if (cm.mySettings.active) {
                        cm.mySettings.active.setAttribute('class', 'ge_assing_marker');
                    }

                    gutterMarkers.breakpoints.setAttribute('class', 'ge_assing_marker_on');
                    debugLine(cm, n);
                    cm.mySettings.active = gutterMarkers.breakpoints;

                } else {

                    var variableDebug;
                    var tokens = cm.getLineTokens(info.line);
                    for (var i = 0, l = tokens.length; i < l; i++) {

                        var data = tokens[i];

                        if (data.type !== 'variable') continue;

                        variableDebug= data.string.trim();
                        if (variableDebug.length === 0){
                            variableDebug = undefined;
                        }
                        else{
                            // break at first variable we find...
                            break;
                        }
                    }
                    if (variableDebug) {
                        illuminate(cm, variableDebug);
                    }
                }

            }
        });
    };

    return doVisualDebug;

})();