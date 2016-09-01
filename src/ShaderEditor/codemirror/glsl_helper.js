

// Smaller Number Printing - @P_Malin
// Creative Commons CC0 1.0 Universal (CC-0)

// Feel free to modify, distribute or use in commercial code, just don't hold me liable for anything bad that happens!
// If you use this code and want to give credit, that would be nice but you don't have to.

// I first made this number printing code in https://www.shadertoy.com/view/4sf3RN
// It started as a silly way of representing digits with rectangles.
// As people started actually using this in a number of places I thought I would try to condense the 
// useful function a little so that it can be dropped into other shaders more easily,
// just snip between the perforations below.
// Also, the licence on the previous shader was a bit restrictive for utility code.
//
// Disclaimer: The values printed may not be accurate!
// Accuracy improvement for fractional values taken from TimoKinnunen https://www.shadertoy.com/view/lt3GRj

// ---- 8< ---- GLSL Number Printing - @P_Malin ---- 8< ----
// Creative Commons CC0 1.0 Universal (CC-0) 
// https://www.shadertoy.com/view/4sBSWW

// vec3 printValue(vec3)

var glslPrintfShaderCode = `

// ---- 8< -------- 8< -------- 8< -------- 8< ----
uniform vec2 u_resolution;
uniform vec2 u_mouse;

float DigitBin( const int x )
{
    return x==0?480599.0:x==1?139810.0:x==2?476951.0:x==3?476999.0:x==4?350020.0:x==5?464711.0:x==6?464727.0:x==7?476228.0:x==8?481111.0:x==9?481095.0:0.0;
}

float PrintValue( const vec2 vStringCoords, const float fValue, const float fMaxDigits, const float fDecimalPlaces )
{
    if ((vStringCoords.y < 0.0) || (vStringCoords.y >= 1.0)) return 0.0;
    float fLog10Value = log2(abs(fValue)) / log2(10.0);
    float fBiggestIndex = max(floor(fLog10Value), 0.0);
    float fDigitIndex = fMaxDigits - floor(vStringCoords.x);
    float fCharBin = 0.0;
    if(fDigitIndex > (-fDecimalPlaces - 1.01)) {
        if(fDigitIndex > fBiggestIndex) {
            if((fValue < 0.0) && (fDigitIndex < (fBiggestIndex+1.5))) fCharBin = 1792.0;
        } else {        
            if(fDigitIndex == -1.0) {
                if(fDecimalPlaces > 0.0) fCharBin = 2.0;
            } else {
                float fReducedRangeValue = fValue;
                if(fDigitIndex < 0.0) { fReducedRangeValue = fract( fValue ); fDigitIndex += 1.0; }
                float fDigitValue = (abs(fReducedRangeValue / (pow(10.0, fDigitIndex))));
                fCharBin = DigitBin(int(floor(mod(fDigitValue, 10.0))));
            }
        }
    }
    return floor(mod((fCharBin / pow(2.0, floor(fract(vStringCoords.x) * 4.0) + (floor(vStringCoords.y * 5.0) * 4.0))), 2.0));
}



// Original interface
float PrintValue(const in vec2 fragCoord, const in vec2 vPixelCoords, const in vec2 vFontSize, const in float fValue, const in float fMaxDigits, const in float fDecimalPlaces)
{
    vec2 vStringCharCoords = (fragCoord.xy - vPixelCoords) / vFontSize;
    
    return PrintValue( vStringCharCoords, fValue, fMaxDigits, fDecimalPlaces );
}

vec3 printValue(vec4 value, int size, float decimals){
    
    vec3 vColour = vec3(0.0);
    // Multiples of 4x5 work best
    vec2 vFontSize = vec2(8.0, 15.0);

    if(u_mouse.x > 0.0)
    {
        // if (u_mouse.x> 0.5) left text
        // if (u_mouse.x> 0.5) bottom text
        
        float fDecimalPlaces = 2.0;
        float fDigits = 1.0;
        float width = 54.0;
        // Print X
        for (int i = 0; i < 4; i++){       
            
            vec2 vPixelCoord2 = u_mouse.xy + vec2(-54.0 + width*float(i), 6.0);        
            float fIsDigit2 = PrintValue( (gl_FragCoord.xy - vPixelCoord2) / vFontSize, value[i], fDigits, fDecimalPlaces);
            vColour = mix( vColour, vec3(0.0, 1.0, 0.0), fIsDigit2);
            if(i+1 == size) break;
            
        }
    }
    
    return vColour;
}

     // finish shader with
     // values, number of value in the vec4 to print, decimals number
    // vec3 valuePrinted = printValue(valueVec4(valueX, valueY, valueZ, valueW), 3, 3.0);    
    // gl_FragColor = gl_FragColor*0.25 + vec4(valuePrinted.xyz,1.0);
    // or
    // gl_FragColor.xyz =  mix( gl_FragColor.xyz, vec3(0.0, 1.0, 0.0), printValue(vec4(u_mouse.xy, u_resolution.xy), 3, 3.0);        
    
// ---- 8< -------- 8< -------- 8< -------- 8< ----`;





// Return all pattern matches with captured groups
RegExp.prototype.execAll = function(string) {
    var match = null;
    var matches = [];
    while (match = this.exec(string)) {
        var matchArray = [];
        for (var i in match) {
            if (parseInt(i) == i) {
                matchArray.push(match[i]);
            }
        }
        matchArray.index = match.index;
        matches.push(matchArray);
    }
    return matches;
};

function getMatch(cm, line) {
    var types = ['uniform'];
    
    // is it an uniform
        var matches = line.match( /uniform\s+\w+\s+\w+((\s)?\[(.*?)\])?/g );

    if ( matches !== null ) {
        for ( var i = 0, l = matches.length; i < l; i++ ) {

            var uniform = matches[ i ].match( /uniform\s+\w+\s+(\w+)/ )[ 1 ];
            var uniformName = matches[ i ].match( /uniform\s+\w+\s+(\w+)(\s?\[.*?\])?/ )[ 1 ];

            return uniformName;
        }
    }

    return;
}


function makeTooltip(x, y, node) {    

    node.style.left = x + "px";
    node.style.top = y + "px";

    node.style.position = 'absolute';
    node.style.background = "crimson";
    node.style.opacity = "0.75";
    node.style.color = "white";
    node.style.zIndex = 10000000;


    document.body.appendChild(node);
    return node;
}

var currentMatchGLSLDEF;
var currentMatchGLSLDEFToolTip;

function remove(node) {

    var p = node && node.parentNode;
    if (p) p.removeChild(node);
    currentMatchGLSLDEFToolTip = undefined;

}

function fadeOut(tooltip) {

    tooltip.style.opacity = "0";
    return setTimeout(function() { 

        remove(tooltip); 
        currentMatchGLSLDEF = undefined;

    }, 1100);

}




function tempTooltip(cm, content, x, y) {

    if (currentMatchGLSLDEFToolTip){        
        remove(currentMatchGLSLDEFToolTip);
    }

    var tip = currentMatchGLSLDEFToolTip =  makeTooltip(x + 1, y, content);
    
    function clear() {

      currentMatchGLSLDEFToolTip = null;

      if (!tip.parentNode) return;
      cm.off("cursorActivity", clear);
      cm.off('blur', clear);
      cm.off('scroll', clear);
      fadeOut(tip);

    }

    cm.on("cursorActivity", clear);
    cm.on('blur', clear);
    cm.on('scroll', clear);

    return tip;
}

function showContextInfo(cm, html, x ,y) {

  var p = document.createElement('div');
  p.innerHTML = html;
  
  return tempTooltip(cm, p, x, y);

}

var timeOUTGLSLDEF;

var mouseMoveEditor = function (cm, e){

    // bail out if we were doing a selection and not a click
    if (cm.somethingSelected()) {
        return;
    }
    
    var X = e.pageX - cm.getWrapperElement().offsetLeft; 
    var Y = e.pageY - cm.getWrapperElement().offsetTop;
    var pos = cm.coordsChar({left: X, top: Y});
    var token = cm.getTokenAt(pos);


    if ( token.type === 'builtin' || token.type === 'atom') {
        
        if (currentMatchGLSLDEF !== token.string){

            remove(currentMatchGLSLDEFToolTip);
            currentMatchGLSLDEF = token.string;

            //X = e.pageX;
            //Y = e.pageX;
            clearTimeout( timeOUTGLSLDEF );
            timeOUTGLSLDEF = setTimeout(function() { 

                var html = 'Learn more about: <a href="';
                if (token.type === 'builtin'){
                    html +='https://thebookofshaders.com/glossary/?search=';
                }else{
                    html +='http://docs.gl/el3/';
                }

                html += token.string + '" target="_blank">' + token.string + '</a>';        
                showContextInfo(cm, html, X, Y);
               
            }, 750);

        }

       return;

    } 

    var line = cm.getLine(pos.line);
    // see if there is a match on the cursor click
    var match = getMatch(cm, line);    
    if (match) {

        if (currentMatchGLSLDEF !== match){

            remove(currentMatchGLSLDEFToolTip);
            currentMatchGLSLDEF = match;
            //X = e.pageX;
            //Y = e.pageX;

            clearTimeout( timeOUTGLSLDEF );
            var value;

            timeOUTGLSLDEF = setTimeout(function() { 

                queryUniform( function(value){

                    var html = match + '  = '  + value;
                    showContextInfo(cm, html, X, Y);                

                }, 
                match);
                
            }, 750);

        }

        return;

    } 

    if (token.type === 'variable' && token.string && token.string.length > 0) {

        if (cm.mySettings && cm.mySettings.illuminate && !cm.mySettings.debugging && !cm.mySettings.breakpoints) {
            cm.mySettings.illuminate(cm, token.string, true);
        }

        return;
    }


    if (currentMatchGLSLDEFToolTip) remove(currentMatchGLSLDEFToolTip);
    clearTimeout( timeOUTGLSLDEF );
    currentMatchGLSLDEF = undefined;    
};
 
var mouseOutEditor = function (cm, e){

    if (currentMatchGLSLDEFToolTip) remove(currentMatchGLSLDEFToolTip);
    clearTimeout( timeOUTGLSLDEF );
    currentMatchGLSLDEF = undefined;   
      
}