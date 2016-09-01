
var benchmarkingResults;



function getVariableType(cm, sVariable) {

    var nLines = cm.getDoc().size;

    // Show line where the value of the variable is been asigned
    var voidIN = false;
    var uniformRE = new RegExp('\\s*uniform\\s+(float|vec2|vec3|vec4)\\s+' + sVariable + '\\s*;');
    var constructRE = new RegExp('(float|vec\\d)\\s+(' + sVariable + ')\\s*[;]?', 'i');
    for (var i = 0; i < nLines; i++) {

        var lineString = cm.getLine(i).trim();              
        if (lineString.length === 0 || lineString[0] === '/') continue;

        if (!voidIN) {
            // Do not start until being inside the main function
            var voidMatch = voidRE.exec(lineString);
            if (voidMatch) {
                voidIN = true;
            } else {
                var uniformMatch = uniformRE.exec(lineString);
                if (uniformMatch && !cm.mySettings.isCommented(cm, i, uniformMatch)) {
                    return uniformMatch[1];
                }
            }
        }
        else {
            var constructMatch = constructRE.exec(lineString);
            if (constructMatch && constructMatch[1] && !cm.mySettings.isCommented(cm, i, constructMatch)) {
                return constructMatch[1];
            }
        }
    }
    return 'none';
}


function isLineAfterMain(cm, nLine) {
    var totalLines = cm.getDoc().size;
    var voidRE = new RegExp('void main\\s*\\(\\s*[void]*\\)', 'i');
    for (var i = 0; i < nLine && i < totalLines; i++) {
        var voidMatch = voidRE.exec(cm.getLine(i));
        if (voidMatch) {
            return true;
        }
    }
    return false;
}

 function getResultRange(test_results) {

    var min_ms = '10000000.0';
    var min_line = 0;
    var max_ms = '0.0';
    var max_line = 0;
    for (var i in test_results) {
        if (test_results[i].ms < min_ms) {
            min_ms = test_results[i].ms;
            min_line = test_results[i].line;
        }
        if (test_results[i].ms > max_ms) {
            max_ms = test_results[i].ms;
            max_line = test_results[i].line;
        }
    }
    return { min:{line: min_line, ms: min_ms}, max:{line: max_line, ms: max_ms} };

}

 function getMedian(values) {

    values.sort( function(a,b) {return a - b;} );

    var half = Math.floor(values.length/2);

    if(values.length % 2)
        return values[half];
    else
        return (values[half-1] + values[half]) / 2.0;

}

 function getDeltaSum(test_results) {

    var total = 0.0;
    for (var i in test_results) {
        if (test_results[i].delta > 0) {
            total += test_results[i].delta;
        }
    }
    return total;

}

 function getHits(test_results) {

    var total = 0;
    for (var i in test_results) {
        if (test_results[i].delta > 0) {
            total++;
        }
    }    
    return total;

}

function benchmarkLine(cm, nLine) {


    var settings = cm.mySettings;
    settings.benchmarkingLine = nLine;

    console.log('benchmark ' + nLine +'/' + cm.getDoc().size);


    var lineString = '';
    // until a meaningfull line
    if (nLine < cm.getDoc().size){
        lineString = cm.getLine(nLine).trim();              
        while (lineString.length === 0 || lineString[0] === '/') {
            
            nLine++;
            if (nLine >= cm.getDoc().size) break;
            lineString = cm.getLine(nLine).trim();         

        }
    }

    settings.benchmarkingLine = nLine;

     // If is done benchmarking...
    if (nLine >= cm.getDoc().size) {

        settings.benchmarkingLine = 0;
        settings.benchmarking = false;

        var results = settings.benchmarkingResults;

        var range = getResultRange(results);
        var sum = getDeltaSum(results);
        var hits = getHits(results)

        console.log('Test: ',range.max.ms+'ms', results);
        cm.clearGutter('breakpoints');

        for (var i in results) {

            var pct = (results[i].delta/sum)*100;
            var size = (results[i].delta/sum)*30;
            var marker_html = '<div>' +results[i].ms.toFixed(2);
            if (results[i].delta > 0.) {
                marker_html += '<span class="ge_assing_marker_pct ';
                if ( pct > (100.0/hits) ) {
                    marker_html += 'ge_assing_marker_slower';
                }
                marker_html += '" style="width: '+size.toFixed(0)+'px;" data="'+pct.toFixed(0)+'%"></span>'
            }
            
            cm.setGutterMarker(results[i].line, 'breakpoints', settings.makeMarker(marker_html+'</div>'));

        }

        console.log('eof on: '  + nLine);
        return;
    }

    if (lineString === '') benchmarkLine(cm, nLine+1);

    // Check for an active variable (a variable that have been declare or modify in this line)
    var variableRE = new RegExp('\\s*[float|vec2|vec3|vec4]?\\s+([\\w|\\_]*)[\\.\\w]*?\\s+[\\+|\\-|\\\\|\\*]?\\=', 'i');
    var match = variableRE.exec(cm.getLine(nLine));

    if (!match) {
        console.log('no match: '  + nLine);
        benchmarkLine(cm, nLine+1); 
        return;
    }

    console.log('check: '  + nLine);
    // if there is an active variable, get what type is
    var variable = match[1];
    //////////////////////////////
    var type = getVariableType(cm, variable);

    if (type === 'none') {
        console.log('no type: '  + nLine);
        // If it fails on finding the type keep going with the test on another line
        benchmarkLine(cm, nLine+1);
        return;
    }

    console.log('bench: '  + nLine);

    // Prepare 
    settings.benchmarking = true;
    settings.benchmarkingLine = nLine;
    settings.benchmarkingFrag = settings.getDebugShader(cm, nLine, type, variable, false);
    settings.benchmarkingSamples = [];

    //unfocusAll(cm);
    //focusLine(cm, nLine);
    settings.debugging = true;
    
    currentShaderTempReplace(onBenchmark, settings.benchmarkingFrag);
    currentShaderTimingRequest(onBenchmark);

}

var N_SAMPLES = 30;

function onBenchmark (cm, wasValid) {

    var settings = cm.mySettings;

    // If the test shader compiled...
    if (wasValid === "true") {

        console.log('compiled');
        return;
    }

    // If the test shader failed to compile...    
    if (wasValid == "false") {

        console.log('ignored');
        // ignore and Test next line        
        benchmarkLine(cm, settings.benchmarkingLine+1);

    }

    // get data, process and store.
    var elapsedMs = wasValid;

    //console.log('timed' + elapsedMs);
    settings.benchmarkingSamples.push (elapsedMs);

    if (settings.benchmarkingSamples.length < N_SAMPLES-1){


        // TODO not work because same shader ?
        //currentShaderTempReplace(onBenchmark, settings.benchmarkingFrag);
        //console.log('new timing Request' );
        currentShaderTimingRequest(onBenchmark);

    } else {

        //focusAll(cm);


        settings.debugging = false;
        elapsedMs = getMedian(settings.benchmarkingSamples);

        console.log('timing sampling done: ' + elapsedMs);

        var range = getResultRange(settings.benchmarkingResults);
        var delta = elapsedMs - range.max.ms;            
        if (settings.benchmarkingResults.length === 0) {
            delta = 0.0;
        }

        settings.benchmarkingResults.push(
            { 
                line:settings.benchmarkingLine, 
                ms: elapsedMs, 
                delta:delta
            });

        // console.log('benchmarking line:', settings.benchmarkingLine, elapsedMs, delta, range);

        // Create gutter marker
        cm.setGutterMarker( settings.benchmarkingLine, 
                            'breakpoints', 
                            settings.makeMarker(elapsedMs.toFixed(2)));

        // Test next line
        console.log('Test next line');
        benchmarkLine(cm, settings.benchmarkingLine+1);
    }
        
}


function benchmarkShader(cm) {

    // Clean previus records
    cm.mySettings.benchmarkingResults = [];

    var nLines = cm.getDoc().size;

    var mainStartsAt = 0;
    for (var i = 0; i < nLines; i++) {
        if (isLineAfterMain(cm, i)) {
            mainStartsAt = i;
            break;
        }
    }
        
    benchmarkLine(cm, mainStartsAt+1);

}