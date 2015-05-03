function f() {

//			window.postMessage( { method: 'open', arguments: arguments }, '*');

	window.__Injected = true;

	//function log() { console.log( arguments ); }
	//function error() { console.error( arguments ); }
	function log() {}
	function error() {}

	//function log( msg ) { logMsg( 'LOG: ' + msg )}
	//function error( msg ) { logMsg( 'ERROR: ' + msg )}

	function logMsg() { 

		var args = [];
		for( var j = 0; j < arguments.length; j++ ) {
			args.push( arguments[ j ] );
		}

		window.postMessage( { source: 'WebGLShaderEditor', method: 'log', arguments: args }, '*');
	}

	function guid() {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
		}
		return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
	}

	function _h( f, c ) {
		return function() {
			var res = f.apply( this, arguments );
			res = c.apply( this, [ res, arguments ] ) || res;
			return res;
		}
	}

	function _h2( f, c ) {
		return function() {
			return c.apply( this, arguments );
		}
	}

	var references = {};

	function keepReference( f ) {

		references[ f ] = WebGLRenderingContext.prototype[ f ];

	}

	var _gl = document.createElement( 'canvas' ).getContext( 'webgl' );

	keepReference( 'getUniformLocation' );
	keepReference( 'shaderSource' );
	keepReference( 'createShader' );
	keepReference( 'compileShader' );
	keepReference( 'attachShader' );
	keepReference( 'detachShader' );
	keepReference( 'linkProgram' );

	//init();

	var programs = {};
	var shaders = {};
	var uniforms = [];
	var attributes = [];
	var currentProgram = null;
	var fsSource = '';
	var vsSource = '';

	function findProgram( id ) {

		if( programs[ id ] ) {
			return programs[ id ];			
		}
		
		return null;

	}

	function findShader( s ) {

		if( shaders[ s.__uuid ] ) {
			return shaders[ s.__uuid ];
		}

		return null;	

	}

	function addProgram( gl, p ) {

		var el = { 
			gl: gl, 
			program: p, 
			vertexShader: null, 
			vertexShaderSource: '',
			fragmentShader: null,
			fragmentShaderSource: ''
		};

		programs[ p.__uuid ] = el;

		window.postMessage( { source: 'WebGLShaderEditor', method: 'addProgram', uid: p.__uuid }, '*');

	}

	function selectProgram( p ) {

		currentProgram = p;
		logMsg( 'Selected program ' + p.program.__uuid );
			
	}

	function update( vs, fs ) {

		if( !currentProgram ) return;
		logMsg( 'Update' );

		var gl = currentProgram.gl,
			program = currentProgram.program,
			vertexShader = null,
			fragmentShader = null;

		if( currentProgram.vertexShader ) {
			vertexShader = currentProgram.vertexShader.shader;
		}

		if( !vertexShader ) {
			vertexShader = gl.createShader( gl.VERTEX_SHADER );
		}

		if( vs ) { references.shaderSource.apply( gl, [ vertexShader, vs ] ); } else { gl.shaderSource( vertexShader, vsSource ); }
		gl.compileShader( vertexShader );

		if( !gl.getShaderParameter( vertexShader, gl.COMPILE_STATUS ) ) {

			error( 'VS gl.getShaderInfoLog() ' + gl.getShaderInfoLog( vertexShader ) );
			return;

		}

		references.attachShader.apply( gl, [ program, vertexShader ] );
	    gl.deleteShader( vertexShader );

		if( currentProgram.fragmentShader ) {
			fragmentShader = currentProgram.fragmentShader.shader;
		}

		if( !fragmentShader ) {
			fragmentShader = gl.createShader( gl.FRAGMENT_SHADER );
		}

		if( fs ) { references.shaderSource.apply( gl, [ fragmentShader, fs ] );  } else { gl.shaderSource( fragmentShader, fsSource );  }
		gl.compileShader( fragmentShader );

		if( !gl.getShaderParameter( fragmentShader, gl.COMPILE_STATUS ) ) {

			error( 'FS gl.getShaderInfoLog() ' + gl.getShaderInfoLog( fragmentShader ) );
			return;

		}

		references.attachShader.apply( gl, [ program, fragmentShader ] );
	    gl.deleteShader( fragmentShader );

		gl.linkProgram( program );

		if( !gl.getProgramParameter( program, gl.LINK_STATUS ) ) {
	        var infoLog = gl.getProgramInfoLog( program );
	        //gl.deleteProgram( program );
	        error( infoLog );
	        return;
	    }

	    //gl.useProgram( program );

	    /*for( var p in uniforms ) {

	    	var u = uniforms[ p ];
	    	if( u.program.__uuid === program.__uuid ) {
	    		if( u.value ) {
	    			u.location = references.getUniformLocation.apply( u.gl, [ u.program, u.uniform ] );
					var args = [ u.location ];
		    		for( var j = 0; j < u.value.length; j++ ) {
		    			args.push( u.value[ j ] );
		    		}
		    		references[ u.type ].apply( u.gl, args );
		    		var err = p.gl.getError();
	    			if( err ) {
						debugger;
					}
		    		logMsg( u.type + ' (' + u.uniform + ', ' + args + ')' );
		    	}
	    	}
	    }*/

		if( !vs ) currentProgram.vertexShaderSource = vsSource;
		if( !fs ) currentProgram.fragmentShaderSource = fsSource;

		logMsg( 'Updated successfully' );

	}

	WebGLRenderingContext.prototype.createShader = _h( 
		WebGLRenderingContext.prototype.createShader, 
		function( res, args ) {

			log( 'createShader', args );
			res.__uuid = guid();
			shaders[ res.__uuid ] = { shader: res, type: args[ 0 ] };

			if( args[ 0 ] == _gl.VERTEX_SHADER ) {
				log( 'Vertex shader created' );
			}
			if( args[ 0 ] == _gl.FRAGMENT_SHADER ) {
				log( 'Fragment shader created' );
			}

		} 
	);

	/*WebGLRenderingContext.prototype.deleteShader = _h( 
		WebGLRenderingContext.prototype.deleteShader, 
		function( res, args ) {

			log( 'deleteShader', args );
			return;
			var s = findShader( args[ 0 ] );

			for( var j in programs ) {
				var p = programs[ j ];
				if( p.vertexShader && p.vertexShader.shader.__uuid == s.shader.__uuid ) {
					p.vertexShader = null;
					log( 'Vertex shader deleted' );
				}
				if( p.fragmentShader && p.fragmentShader.shader.__uuid == s.shader.__uuid ) {
					p.fragmentShader = null;
					log( 'Fragment shader deleted' );
				}
			}

			shaders[ args[ 0 ].__uuid ] = null;
			delete shaders[ args[ 0 ].__uuid ];

		} 
	);*/

	WebGLRenderingContext.prototype.shaderSource = _h( 
		WebGLRenderingContext.prototype.shaderSource, 
		function( res, args ) {

			log( 'shaderSource', args );
			var s = findShader( args[ 0 ] );
			//s.source = '#define SHADERID ' + s.shader.__uuid + "\r\n" + args[ 1 ];
			s.source = args[ 1 ];

		} 
	);

	WebGLRenderingContext.prototype.compileShader = _h( 
		WebGLRenderingContext.prototype.compileShader, 
		function( res, args ) {

			log( 'compileShader', args );

		} 
	);

	WebGLRenderingContext.prototype.createProgram = _h( 
		WebGLRenderingContext.prototype.createProgram, 
		function( res, args ) {

			res.__uuid = guid();

			log( 'createProgram', res, args );
			addProgram( this, res );

		} 
	);

	/*WebGLRenderingContext.prototype.useProgram = _h( 
		WebGLRenderingContext.prototype.useProgram, 
		function( res, args ) {

			log( 'useProgram', res, args );

		} 
	);*/

	WebGLRenderingContext.prototype.deleteProgram = _h( 
		WebGLRenderingContext.prototype.deleteProgram, 
		function( res, args ) {

			log( 'deleteProgram', res, args );
			//addProgram( this, res );

		} 
	);

	WebGLRenderingContext.prototype.attachShader = _h( 
		WebGLRenderingContext.prototype.attachShader, 
		function( res, args ) {

			log( 'attachShader', args );
			var p = findProgram( args[ 0 ].__uuid );
			var s = findShader( args[ 1 ] );

			if( s.type == _gl.VERTEX_SHADER ) {
				p.vertexShader = s;
				p.vertexShaderSource = s.source;
			}
			if( s.type == _gl.FRAGMENT_SHADER ) {
				p.fragmentShader = s;
				p.fragmentShaderSource = s.source;
			}
			
		} 
	);

	WebGLRenderingContext.prototype.detachShader = _h( 
		WebGLRenderingContext.prototype.detachShader, 
		function( res, args ) {

			log( 'detachShader', args );
			/*var p = findProgram( args[ 0 ].__uuid );
			var s = findShader( args[ 1 ] );

			if( s.type == _gl.VERTEX_SHADER ) p.vertexShader = s;
			if( s.type == _gl.FRAGMENT_SHADER ) p.fragmentShader = s;*/
			
		} 
	);

	WebGLRenderingContext.prototype.linkProgram = _h( 
		WebGLRenderingContext.prototype.linkProgram, 
		function( res, args ) {

			log( 'linkProgram', args );

		} 
	);

	WebGLRenderingContext.prototype.getUniformLocation = _h( 
		WebGLRenderingContext.prototype.getUniformLocation, 
		function( res, args ) {

			for( var j = 0; j < uniforms.length; j++ ) {
				var u = uniforms[ j ];
				if( u.program.__uuid === args[ 0 ].__uuid ){
					if( u.uniform === args[ 1 ] ) {
						u.location = res;
						return;
					}
				}
			}

			/*if( !res ) {
				var p = findProgram( args[ 0 ].__uuid );
				var err = p.gl.getError();
			}*/

			uniforms.push( {
				program: args[ 0 ],
				uniform: args[ 1 ],
				value: null,
				type: null,
				location: res,
				gl: this
			} );
			log( 'Added uniform location ' + args[ 1 ] );

		} 
	);

	WebGLRenderingContext.prototype.getAttribLocation = _h( 
		WebGLRenderingContext.prototype.getAttribLocation, 
		function( res, args ) {

			/*attributes.push( {
				program: args[ 0 ],
				uniform: args[ 1 ],
				location: res,
				gl: this
			} );*/
			//debugger;
			//log( 'getAttribLocation ' + args[ 1 ] );

		} 
	);

	WebGLRenderingContext.prototype.enableVertexAttribArray = _h(
		WebGLRenderingContext.prototype.enableVertexAttribArray,
		function( res, args ) {

			//logMsg( 'enableVertexAttribArray ' + args[ 1 ] );
		}
	);

	WebGLRenderingContext.prototype.vertexAttribPointer = _h(
		WebGLRenderingContext.prototype.vertexAttribPointer,
		function( res, args ) {

			//logMsg( 'vertexAttribPointer ' + args[ 1 ] );
		}
	);

	WebGLRenderingContext.prototype.bindAttribLocation = _h( 
		WebGLRenderingContext.prototype.bindAttribLocation, 
		function( res, args ) {

			/*uniforms.push( {
				program: args[ 0 ],
				uniform: args[ 1 ],
				location: res,
				gl: this
			} );*/
			//debugger;
			//log( 'bindAttribLocation ' + args[ 1 ] + ' ' + args[ 2 ] );

		} 
	);

	WebGLRenderingContext.prototype.getExtension = _h( 
		WebGLRenderingContext.prototype.getExtension, 
		function( res, args ) {

			window.postMessage( { source: 'WebGLShaderEditor', method: 'getExtension', extension: args[ 0 ] }, '*');	

		} 
	);

	function findProgramByLocation( location ) {

		var f = null;

		uniforms.forEach( function( e ) {
			if( e.location === location ) {
				f = e;
			}
		} );
	
		return f;	

	}

	var methods = [ 
		'uniform1f', 'uniform1fv', 'uniform1i', 'uniform1iv', 
		'uniform2f', 'uniform2fv', 'uniform2i', 'uniform2iv', 
		'uniform3f', 'uniform3fv', 'uniform3i', 'uniform3iv', 
		'uniform4f', 'uniform4fv', 'uniform4i', 'uniform4iv', 
		'uniformMatrix2fv', 'uniformMatrix3fv', 'uniformMatrix4fv'
	];

	methods.forEach( function( f ) {

		keepReference( f );

		WebGLRenderingContext.prototype[ f ] = function() {

			var args = arguments;
			var p = findProgramByLocation( args[ 0 ] );
			if( p ) {
				var l = references.getUniformLocation.apply( p.gl, [ p.program, p.uniform ] );
				//var l = p.location;
				var a = [], aa = [];
				a.push( l );
				for( var j = 1; j < args.length; j++ ) {
					a.push( args[ j ] );
					aa.push( args[ j ] );
				}
				references[ f ].apply( p.gl, a );

				/*var err = p.gl.getError();
				if( err ) {
					logMsg( 'ERROR with ' + p.uniform );
				}*/

				p.value = aa;
				p.type = f;

				//log( f + ' ' + p.uniform + ' ' + a[ 1 ])

			}

		}

	} );

	window.UIProgramSelected = function( id ) {

		var p = findProgram( id );
		selectProgram( p );
		log( 'Selected', p );

		vsSource = p.vertexShaderSource;
		fsSource = p.fragmentShaderSource;

		window.postMessage( { source: 'WebGLShaderEditor', method: 'setVSSource', code: vsSource }, '*');
		window.postMessage( { source: 'WebGLShaderEditor', method: 'setFSSource', code: fsSource }, '*');

	}

	window.UIProgramHovered = function( id ) {

		log( 'UIProgramHovered' );

		var p = findProgram( id );
		selectProgram( p );

		var vs = p.vertexShaderSource;
		var fs = p.fragmentShaderSource;

		fs = fs.replace( /\s+main\s*\(/, ' ShaderEditorInternalMain(' );
		fs += '\r\n' + 'void main() { ShaderEditorInternalMain(); gl_FragColor.rgb *= vec3(1.,0.,1.); }';

		update( vs, fs );

	}

	window.UIProgramOut = function( id ) {

		log( 'UIProgramOut' );

		var p = findProgram( id );
		selectProgram( p );

		var vs = p.vertexShaderSource;
		var fs = p.fragmentShaderSource;

		update( vs, fs );

	}

	window.UIVSUpdate = function( src ) {

		log( 'UPDATE VS' );
		vsSource = atob( src );
		update();

	}

	window.UIFSUpdate = function( src ) {

		log( 'UPDATE FS' );
		fsSource = atob( src );
		update();
		
	}

	window.addEventListener( 'load', function() {
		window.postMessage( { source: 'WebGLShaderEditor', method: 'init' }, '*');
	} );

}

var links = document.querySelectorAll( 'a[rel=external]' );
for( var j = 0; j < links.length; j++ ) {
	var a = links[ j ];
	a.addEventListener( 'click', function( e ) {
		window.open( this.href, '_blank' );
		e.preventDefault();
	}, false );
}

var button = document.getElementById( 'reload' ),
	container = document.getElementById( 'container' ),
	info = document.getElementById( 'info' ),
	waiting = document.getElementById( 'waiting' ),
	list = document.getElementById( 'list' ),
	vSFooter = document.getElementById( 'vs-count' ),
	fSFooter = document.getElementById( 'fs-count' ),
	log = document.getElementById( 'log' );

function logMsg() {

	var args = [];
	for( var j = 0; j < arguments.length; j++ ) {
		args.push( arguments[ j ] );
	}
	var p = document.createElement( 'p' );
	p.textContent = args.join( ' ' );
	log.appendChild( p );

}

logMsg( 'starting' );

/*chrome.devtools.network.onNavigated.addListener( function() {

	//console.log( 'onNavigated' );
	//chrome.devtools.inspectedWindow.eval( '(' + f.toString() + ')()' ); // this gets appended AFTER the page
	chrome.devtools.inspectedWindow.reload( {
		ignoreCache: true, 
    	injectedScript: '(' + f.toString() + ')()'
	} );

} );*/

button.addEventListener( 'click', function( e ) {
	chrome.devtools.inspectedWindow.reload( {
		ignoreCache: true, 
    	injectedScript: '(' + f.toString() + ')()'
	} );
} );

var backgroundPageConnection = chrome.runtime.connect({
	name: 'panel'
});

backgroundPageConnection.postMessage({
	name: 'init',
	tabId: chrome.devtools.inspectedWindow.tabId
});

var options = { 
	lineNumbers: true,
	matchBrackets: true,
	indentWithTabs: false,
	tabSize: 4,
	indentUnit: 4,
	mode: "text/x-glsl",
	foldGutter: true,
	gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
};

var editorContainer = document.getElementById( 'editorContainer' );
var vsPanel = document.getElementById( 'vs-panel' );
var fsPanel = document.getElementById( 'fs-panel' );

var vSEditor = CodeMirror( vsPanel, options );
var fSEditor = CodeMirror( fsPanel, options );
vSEditor.refresh();
fSEditor.refresh();
vSEditor._errors = [];
fSEditor._errors = [];

vSEditor.getWrapperElement().setAttribute( 'id', 'vsEditor' );
fSEditor.getWrapperElement().setAttribute( 'id', 'fsEditor' );

function updateVSCode() {

	updateVSCount();
	var source = vSEditor.getValue();
	if( testShader( gl.VERTEX_SHADER, source, vSEditor ) ){
		vsPanel.classList.add( 'compiled' );
		vsPanel.classList.remove( 'not-compiled' );
		chrome.devtools.inspectedWindow.eval( 'UIVSUpdate( \'' + btoa( source ) + '\' )' );
	} else {
		vsPanel.classList.remove( 'compiled' );
		vsPanel.classList.add( 'not-compiled' );
	}

}

function updateFSCode() {

	updateFSCount();
	var source = fSEditor.getValue();
	if( testShader( gl.FRAGMENT_SHADER, source, fSEditor ) ){
		fsPanel.classList.add( 'compiled' );
		fsPanel.classList.remove( 'not-compiled' );
		chrome.devtools.inspectedWindow.eval( 'UIFSUpdate( \'' + btoa( source ) + '\' )' );
	} else {
		fsPanel.classList.add( 'compiled' );
		fsPanel.classList.remove( 'not-compiled' );
	}

}

function updateVSCount() {

	vSFooter.textContent = vSEditor.getValue().length + ' chars | ' + vSEditor.lineCount() + ' lines';

}

function updateFSCount() {

	fSFooter.textContent = fSEditor.getValue().length + ' chars | ' + fSEditor.lineCount() + ' lines';

}

function selectProgram( li ) {

	var prev = list.querySelector( '.active' );
	if( prev ) prev.classList.remove( 'active' );
	li.classList.add( 'active' );

}

backgroundPageConnection.onMessage.addListener( function( msg ) {

	switch( msg.method ) {
		case 'onCommitted':
			//chrome.devtools.inspectedWindow.eval( '(' + f.toString() + ')()' ); // this gets appended AFTER the page
			/*chrome.devtools.inspectedWindow.reload( {
				ignoreCache: true, 
		    	injectedScript: '(' + f.toString() + ')()'
			} );*/
			//console.log( 'onCommitted', Date.now() );
			break;
		case 'onUpdated':
			//chrome.devtools.inspectedWindow.eval( '(' + f.toString() + ')()' ); // this gets appended AFTER the page
			/*chrome.devtools.inspectedWindow.reload( {
				ignoreCache: true, 
		    	injectedScript: '(' + f.toString() + ')()'
			} );*/
			//console.log( 'onCommitted', Date.now() );
			break;
		case 'init':
			logMsg( 'init' );
			info.style.display = 'none';
			waiting.style.display = 'flex';
			break;
		case 'getExtension':
			logMsg( 'addExtension', msg.extension );
			gl.getExtension( msg.extension );
			break;
		case 'addProgram' :
			logMsg( 'addProgram' );
			info.style.display = 'none';
			waiting.style.display = 'none';
			container.style.display = 'block';
			var li = document.createElement( 'li' );
			li.textContent = 'Program ' + list.children.length;//msg.uid;
			li.addEventListener( 'click', function() {
				selectProgram( this );
				chrome.devtools.inspectedWindow.eval( 'UIProgramSelected( \'' + msg.uid + '\' )' );
			} );
			/*li.addEventListener( 'mouseover', function() {
				chrome.devtools.inspectedWindow.eval( 'UIProgramHovered( \'' + msg.uid + '\' )' );
			} );
			li.addEventListener( 'mouseout', function() {
				chrome.devtools.inspectedWindow.eval( 'UIProgramOut( \'' + msg.uid + '\' )' );
			} );*/
			list.appendChild( li );
			break;
		case 'setVSSource' :
			vSEditor.setValue( msg.code );
			vSEditor.refresh();
			vsPanel.classList.remove( 'compiled' );
			vsPanel.classList.remove( 'not-compiled' );
			updateVSCount();
			break;
		case 'setFSSource' :
			fSEditor.setValue( msg.code );
			fSEditor.refresh();
			fsPanel.classList.remove( 'compiled' );
			fsPanel.classList.remove( 'not-compiled' );
			updateFSCount();
			break;
		case 'log':
			logMsg( msg.arguments );
			break;
	}

} );

var keyTimeout = 500;
var vSTimeout;
function scheduleUpdateVS() {

	vsPanel.classList.remove( 'compiled' );
	vsPanel.classList.remove( 'not-compiled' );

	if( vSTimeout ) vSTimeout = clearTimeout( vSTimeout );
	vSTimeout = setTimeout( updateVSCode, keyTimeout );

}

var fSTimeout;
function scheduleUpdateFS() {

	fsPanel.classList.remove( 'compiled' );
	fsPanel.classList.remove( 'not-compiled' );

	if( fSTimeout ) fSTimeout = clearTimeout( fSTimeout );
	fSTimeout = setTimeout( updateFSCode, keyTimeout );
	
}

//vSEditor.on( 'change', scheduleUpdateVS );
//fSEditor.on( 'change', scheduleUpdateFS );

vSEditor.on( 'keyup', scheduleUpdateVS );
fSEditor.on( 'keyup', scheduleUpdateFS );

var gl = document.createElement( 'canvas' ).getContext( 'webgl' );

function testShader( type, source, code ) {

	if( source === '' ) return;

	var s = gl.createShader( type );
	gl.shaderSource( s, source + "\r\n" );
	gl.compileShader( s );

	while( code._errors.length > 0 ) {

		var mark = code._errors.pop();
		code.removeLineWidget( mark );

	}

	if ( gl.getShaderParameter( s, gl.COMPILE_STATUS ) === false ) {

		var err = gl.getShaderInfoLog( s );

		if( err==null ) {
		}
		else
		{

			var lineOffset = 0;
			var lines = err.match(/^.*((\r\n|\n|\r)|$)/gm);
			for( var i=0; i<lines.length; i++ )
			{
				var parts = lines[i].split(":");
				if( parts.length===5 || parts.length===6 )
				{
					var lineNumber = parseInt( parts[2] ) - lineOffset;
					var msg = document.createElement("div");
					msg.appendChild(document.createTextNode( parts[3] + " : " + parts[4] ));
					msg.className = "errorMessage";
					var mark = code.addLineWidget( lineNumber - 1, msg, {coverGutter: false, noHScroll: true} );

					code._errors.push( mark );
				}
				else if( lines[i] != null && lines[i]!="" && lines[i].length>1 && parts[0]!="Warning")
				{
					log( parts.length + " **" + lines[i] );

					var txt = "";
					if( parts.length==4 )
						txt = parts[2] + " : " + parts[3];
					else
						txt = "Unknown error";

					var msg = document.createElement("div");
					msg.appendChild(document.createTextNode( txt ));
					msg.className = "errorMessage";
					var mark = code.addLineWidget( 0, msg, {coverGutter: false, noHScroll: true, above: true} );
					code._errors.push( mark );

				}
			}
		}
		return false;

	}

	if ( gl.getShaderInfoLog( s ) !== '' ) {

		error( 'gl.getShaderInfoLog()', gl.getShaderInfoLog( s ) );
		return false;

	}

	return true;

}

document.getElementById( 'vs-format' ).addEventListener( 'click', function( e ) {

	var source = vSEditor.getValue();
	source = source.replace( /;/g, ";\n" );
	source = source.replace( /{/g, "{\n" );
	source = source.replace( /}/g, "}\n" );
	source = source.replace( /\*\//g, "*/\n" );
	vSEditor.setValue( source );
	
	var totalLines = vSEditor.lineCount();  
	vSEditor.autoFormatRange({line:0, ch:0}, {line:totalLines});
	vSEditor.refresh();
	vSEditor.setSelection( {line:0, ch:0} );

	updateVSCode();

	e.preventDefault();

} );

document.getElementById( 'fs-format' ).addEventListener( 'click', function( e ) {

	var source = fSEditor.getValue();
	source = source.replace( /;/g, ";\n" );
	source = source.replace( /{/g, "{\n" );
	source = source.replace( /}/g, "}\n" );
	source = source.replace( /\*\//g, "*/\n" );
	fSEditor.setValue( source );

	var totalLines = fSEditor.lineCount();  
	fSEditor.autoFormatRange({line:0, ch:0}, {line:totalLines});
	fSEditor.refresh();
	fSEditor.setSelection( {line:0, ch:0} );

	updateFSCode();

	e.preventDefault();

} );

document.getElementById( 'vs-fullscreen' ).addEventListener( 'click', function( e ) {

	vsPanel.classList.toggle( 'fullscreen' );
	fsPanel.classList.toggle( 'hide' );
	e.preventDefault();

} );

document.getElementById( 'fs-fullscreen' ).addEventListener( 'click', function( e ) {

	fsPanel.classList.toggle( 'fullscreen' );
	vsPanel.classList.toggle( 'hide' );
	e.preventDefault();

} );