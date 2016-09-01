var createShaderEditorInstance = function(id, type, scheduleUpdate) {

    var options = {
        lineNumbers: true,
        matchBrackets: true,
        indentWithTabs: false,
        tabSize: 4,
        indentUnit: 4,
        mode: "text/x-essl",
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter", "breakpoints"],        
        extraKeys: {"Ctrl-Space": "autocomplete"},
        // To highlight on scrollbars as well, pass annotateScrollbar in options
        // as below.
        highlightSelectionMatches: {
            wordsOnly: true,
            //showToken: /\w/,
            delay: 150,
            annotateScrollbar: true
        }
    };

    var editorPanel = document.getElementById(id);
    var editor = CodeMirror(editorPanel, options);
    if (type === 'fs') VisualDebug(editor);
    Inlet(editor);
    editor.refresh();
    editor._errors = [];

    editor.getWrapperElement().setAttribute('id', type + 'Editor');
    editor.on('change', scheduleUpdate);


    function keyEventUpdate(cm, event) {
    
        scheduleUpdate(cm);

        if (cm.somethingSelected()) {
            return;
        }
    
        var cursor = cm.getCursor(true);
        var token = cm.getTokenAt(cursor);
        
        if (token && token.end - token.start > 3){
           if (event && !cm.state.completionActive && /*Enables keyboard navigation in autocomplete list*/
                [9, 13, 16, 17, 18, 33, 34, 35, 36, 37, 38, 39, 40 ].indexOf(event.keyCode) === -1) {        
                    /*cursor movements excluded*/ 
                  CodeMirror.commands.autocomplete(cm, null, {completeSingle: false});
            }
        }
    }

    editor.on('keyup', keyEventUpdate);

    //editor.on('mousemove', mouseMoveEditor);
    editor.getWrapperElement().addEventListener('mousemove', function(event){mouseMoveEditor(editor, event);});
    editor.getWrapperElement().addEventListener('mouseout', function(event){mouseOutEditor(editor, event);});

    return editor;

}


var regexNewLine = /(;|{|}|\*\/)/g;
var reformatString = function(match, c) {
    if (c !== undefined) {
        // single char
        return c + '\n';
    }
};

var ShaderEditorFormat = function(editor) {

    var source = editor.getValue();

    source = source.replace(regexNewLine, reformatString);
    editor.setValue(source);
    var totalLines = editor.lineCount();

    editor.autoFormatRange({
        line: 0,
        ch: 0
    }, {
        line: totalLines
    });
    editor.refresh();
    editor.setSelection({
        line: 0,
        ch: 0
    });

}

var ShaderEditorOptimize = function(editor) {

    var source = editor.getValue();
    var res = optimize_glsl(source, 2, true);
    editor.setValue(res);

}

var ShaderEditorPreProcess = function(editor) {

    var source = editor.getValue();
    var res = preProcessShader(source);
    editor.setValue(res);

}