///////// glsl optimizer
var optimize_glsl = function() {
    console.log('not loaded yet!');
}

function postRun() {
    optimize_glsl = Module.cwrap('optimize_glsl', 'string', ['string', 'number', 'number']);
}

var Module = {

    preRun: [],

    postRun: [postRun],

    print: function(text) {
        console.log(text);
    },

    printErr: function(text) {

        text = Array.prototype.slice.call(arguments).join(' ');
        if (0) {
            // XXX disabled for safety typeof dump == 'function') {
            console.log('glsloptimizer::dump::' + (text + '\n')); // fast, straight to the real console
        } else {
            console.log('glsloptimizer::printErr::' + text);
        }

    },
    setStatus: function(text) {

        console.log('glsloptimizer::status::' + text);

    },

    totalDependencies: 0,

    monitorRunDependencies: function(left) {
        // console.error('monitorRunDependencies', left);
        this.totalDependencies = Math.max(this.totalDependencies, left);
        Module.setStatus(left ? 'glsloptimizer::Preparing... (' + (this.totalDependencies - left) + '/' + this.totalDependencies + ')' : 'glsloptimizer::All downloads complete.');

    },

    locateFile: function(hoho) {

        return './ShaderEditor/glsl/glsl-optimizer/glsl-optimizer.mem.js';

    }

};