function f() {

//			window.postMessage( { method: 'open', arguments: arguments }, '*');

	function b64EncodeUnicode(str) {
		return btoa( unescape( encodeURIComponent( str ) ) );
	}

	function b64DecodeUnicode(str) {
		return decodeURIComponent( escape( atob( str ) ) );
	}

	window.__Injected = true;

	//function log() { console.log( arguments ); }
	//function error() { console.error( arguments ); }
	function log() {}
	function error() {}

	function log( msg ) { logMsg( 'LOG: ' + msg )}
	function error( msg ) { logMsg( 'ERROR: ' + msg )}

	function logMsg() { 

		var args = [];
		for( var j = 0; j < arguments.length; j++ ) {
			args.push( arguments[ j ] );
		}

		window.postMessage( { source: 'WebGLShaderEditor', method: 'log', arguments: args }, '*');
	}

	programs = {};
	shaders = {};

	var methods = [
		'createProgram', 'linkProgram', 'useProgram',
		'createShader', 'shaderSource', 'compileShader', 'attachShader', 'detachShader',
		'getUniformLocation',
		'getAttribLocation', 'vertexAttribPointer', 'enableVertexAttribArray', 'bindAttribLocation',
		'bindBuffer'
	];

	this.references = {};
	methods.forEach( function( f ) {
		this.references[ f ] = WebGLRenderingContext.prototype[ f ];
	}.bind ( this ) );

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

	function createUUID() {

		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
		}

		return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();

	}

	function addProgram( gl, p ) {

		var el = {
			program: p,
			original: p,
			gl: gl,
			uniforms: [],
			attributes: []
		}

		programs[ p.__uuid ] = el;

		logMsg( 'addProgram', p.__uuid );
		window.postMessage( { source: 'WebGLShaderEditor', method: 'addProgram', uid: p.__uuid }, '*');

	}

	function setShaderName( id, type, name ) {

		window.postMessage( { source: 'WebGLShaderEditor', method: 'setShaderName', uid: id, type: type, name: name }, '*');

	}

	function addShader( shader, type ) {

		shaders[ shader.__uuid ] = { shader: shader, type: type };

		logMsg( 'addShader', shader.__uuid, type );

	}

	function findProgram( id ) {

		if( programs[ id ] ) {
			return programs[ id ];
		}

		return null;

	}

	function findOriginalProgram( id ) {

		for( var j in programs ) {
			if( programs[ j ].original.__uuid == id ) {
				return programs[ j ];
			}
		}

		return null;

	}

	function findProgramById( id ) {

		for( var j in programs ) {
			if( programs[ j ].program.__uuid == id ) {
				return programs[ j ];
			}
		}

		return null;

	}

	function findShader( s ) {

		if( shaders[ s.__uuid ] ) {
			return shaders[ s.__uuid ];
		}

		return null;

	}

	WebGLRenderingContext.prototype.createProgram = function() {
	
		var res = references.createProgram.apply( this, [] );
		res.__uuid = createUUID();
		res.version = 1;
		addProgram( this, res );

		return res;

	};

	WebGLRenderingContext.prototype.createShader = _h( 
		WebGLRenderingContext.prototype.createShader, 
		function( res, args ) {

			res.__uuid = createUUID();
			addShader( res, args[ 0 ] );

		} 
	);

	WebGLRenderingContext.prototype.shaderSource = _h( 
		WebGLRenderingContext.prototype.shaderSource, 
		function( res, args ) {

			var s = findShader( args[ 0 ] );
			s.source = args[ 1 ];
			s.name = extractShaderName( s.source );

			//debugger;
			//logMsg( 'shaderSource', s.source );

		} 
	);

	WebGLRenderingContext.prototype.attachShader = _h( 
		WebGLRenderingContext.prototype.attachShader, 
		function( res, args ) {

			var p = findProgram( args[ 0 ].__uuid );
			var s = findShader( args[ 1 ] );

			if( s.type == p.gl.VERTEX_SHADER ) {
				p.vertexShader = s;
				p.vertexShaderSource = s.source;
				setShaderName( p.original.__uuid, s.type, s.name );
			}
			if( s.type == p.gl.FRAGMENT_SHADER ) {
				p.fragmentShader = s;
				p.fragmentShaderSource = s.source;
				setShaderName( p.original.__uuid, s.type, s.name );
			}

		} 
	);

	var currentProgram = null;

	WebGLRenderingContext.prototype.useProgram = function( p ) {

		if( p && p.__uuid ) {
			var program = findOriginalProgram( p.__uuid );
			currentProgram = program;
			//logMsg( '>>> useProgram', p.__uuid )
			references.useProgram.apply( program.gl, [ program.program ] );
		} else {
			references.useProgram.apply( this, [ null ] );	
		}

	};

	WebGLRenderingContext.prototype.getUniformLocation = function( program, name ) {

		var p = findProgram( program.__uuid );

		for( var j = 0; j < p.uniforms.length; j++ ) {
			if( p.uniforms[ j ].name === name ) {
				return p.uniforms[ j ].originalLocation;
			}
		}

		var gl = p.gl;
		var res = references.getUniformLocation.apply( gl, [ p.program, name ] );
		if( res ) {
			res.__uuid = createUUID();
			
			p.uniforms.push( {
				name: name,
				value: null,
				type: null,
				location: res,
				originalLocation: res,
				gl: this
			} );

			logMsg( 'Added uniform location ' + name + ' ' + res.__uuid );
		}
		return res;

	};

	WebGLRenderingContext.prototype.bindBuffer = function( target, buffer ) {

		//logMsg( 'bindBuffer', target, buffer );
		return references.bindBuffer.apply( this, [ target, buffer ] );

	}

	WebGLRenderingContext.prototype.getAttribLocation = function( program, name ) {

		var p = findProgram( program.__uuid );

		for( var j = 0; j < p.attributes.length; j++ ) {
			if( p.attributes[ j ].name === name ) {
				return p.attributes[ j ].index;
			}
		}

		var gl = p.gl;
		var index = references.getAttribLocation.apply( gl, [ p.program, name ] );
		if( index != -1 ) {
						
			var el = {
				index: index, 
				originalIndex: index,
				name: name,
				gl: this
			};

			p.attributes.push( el );

			logMsg( 'Added attribute location ' + name + ': ' + index + ' to ' + program.__uuid );
		}
		return index;

	}

	WebGLRenderingContext.prototype.getExtension = _h( 
		WebGLRenderingContext.prototype.getExtension, 
		function( res, args ) {
			window.postMessage( { source: 'WebGLShaderEditor', method: 'getExtension', extension: args[ 0 ] }, '*' );	
		}
	);

	WebGLRenderingContext.prototype.bindAttribLocation = function( program, index, name ) {

		var p = findProgram( program.__uuid );

		var gl = p.gl;
		references.bindAttribLocation.apply( gl, [ p.program, index, name ] );
		var el = {
			index: index, 
			originalIndex: index,
			name: name,
			gl: this
		};

		p.attributes.push( el );

		//logMsg( 'Bind attribute location ' + name + ': ' + index );
	
	} 

	function findAttributeByIndex( program, index ) {

		for( var j = 0; j < program.attributes.length; j++ ) {
			var a = program.attributes[ j ];
			if( a.originalIndex === index ) {
				return a;
			}
		}

		return null;

	}

	WebGLRenderingContext.prototype.enableVertexAttribArray = function( index ) {

		var program = this.getParameter( this.CURRENT_PROGRAM );
		if( program ) {
			var p = findProgramById( program.__uuid );
			if( p ) {
				var a = findAttributeByIndex( p, index );
				if( a ) {
					index = a.index;
				}
			}
		}
		//logMsg( 'enableVertexAttribArray ', p.program.__uuid, a.index, ' (' + a.name + ')' )

		var res = references.enableVertexAttribArray.apply( this, [ index ] );
		return res;

	} 

	WebGLRenderingContext.prototype.vertexAttribPointer = function( index, size, type, normalized, stride, offset ) {

		var program = this.getParameter( this.CURRENT_PROGRAM );
		if( program ) {
			var p = findProgramById( program.__uuid );
			if( p ) {

				var a = findAttributeByIndex( p, index );
				if( a ) {

					a.size = size;
					a.type = type;
					a.normalized = normalized;
					a.stride = stride;
					a.offset = offset;

					index = a.index;

				}

			}
		
		}

		//logMsg( 'vertexAttribPointer ', p.program.__uuid, a.index, ' (' + a.name + ')' )

		var res = references.vertexAttribPointer.apply( this, [ index, size, type, normalized, stride, offset ] );
		return res;

	};

	var methods = [ 
		'uniform1f', 'uniform1fv', 'uniform1i', 'uniform1iv', 
		'uniform2f', 'uniform2fv', 'uniform2i', 'uniform2iv', 
		'uniform3f', 'uniform3fv', 'uniform3i', 'uniform3iv', 
		'uniform4f', 'uniform4fv', 'uniform4i', 'uniform4iv', 
		'uniformMatrix2fv', 'uniformMatrix3fv', 'uniformMatrix4fv'
	];

	methods.forEach( function( f ) {

		references[ f ] = WebGLRenderingContext.prototype[ f ];
		var count = 0;

		WebGLRenderingContext.prototype[ f ] = function() {

			var args = arguments;
			if( args[ 0 ] === null || args[ 0 ] === undefined ) return;
			
			var res = findProgramByLocation( args[ 0 ] );
			if( res ) {

				var gl = res.p.gl;
				var l = res.u.location;
				
				references.useProgram.apply( gl, [ res.p.program ] );
				var a = [], aa = [];
				a.push( l );
				for( var j = 1; j < args.length; j++ ) {
					a.push( args[ j ] );
					aa.push( args[ j ] );
				}
				references[ f ].apply( gl, a );

				/*if( count++ > 100 ) {
					logMsg( 'ORIG: ' + args[ 0 ].__uuid + ' ' + res.u.name + ' MAPS TO ' + res.u.location.__uuid + ' VAL: ' + args[ 1 ] );
					count = 0;
				}*/

				/*var err = gl.getError();
				if( err ) {
					debugger;
				}*/

				res.u.value = aa;
				res.u.type = f;
			} else {
				logMsg( 'Program by location ' + args[ 0 ].__uuid + ' not found' );
			}

		}

	} );

	function findProgramByLocation( location ) {

		if( location === null || location === undefined ) return null;

		for( var j in programs ) {

			var p = programs[ j ];

			for( var k = 0; k < p.uniforms.length; k++ ) {

				var u = p.uniforms[ k ];
				
				if( u.originalLocation.__uuid === location.__uuid ) {
					
					return { p: p, u: u };

				}
			
			}

		}

		return null;

	}


	function onSelectProgram( id ) {

		logMsg( id + ' selected' );
		var program = findProgram( id );
		//logMsg( program );
		window.postMessage( { source: 'WebGLShaderEditor', method: 'setVSSource', code: program.vertexShaderSource }, '*');
		window.postMessage( { source: 'WebGLShaderEditor', method: 'setFSSource', code: program.fragmentShaderSource }, '*');

	}

	function onUpdateVSource( id, source ) {

		var program = findProgram( id );
		program.vertexShaderSource = source;
		logMsg( 'vs update' );

	}

	function onUpdateFSource( id, source ) {

		var program = findProgram( id );
		program.fragmentShaderSource = source;
		logMsg( 'fs update' );
			
	}

	function extractShaderName( source ) {

		var name = '';

		var re = /#define[\s]+SHADER_NAME[\s]+([\S]+)(\n|$)/gi;
		if ((m = re.exec( source)) !== null) {
			if (m.index === re.lastIndex) {
				re.lastIndex++;
			}
			name = m[ 1 ];
		}

		if( name === '' ) {

			//#define SHADER_NAME_B64 44K344Kn44O844OA44O8
			//#define SHADER_NAME_B64 8J+YjvCfmIE=

			var re = /#define[\s]+SHADER_NAME_B64[\s]+([\S]+)(\n|$)/gi;
			if ((m = re.exec( source)) !== null) {
				if (m.index === re.lastIndex) {
					re.lastIndex++;
				}
				name = m[ 1 ];
			}

			if( name ) {
				name = b64DecodeUnicode( name );
			}
		}

		return name;

	}

	function onUpdateProgram( id, vSource, fSource ) {

		logMsg( 'update', id );

		var program = findProgram( id );

		var gl = program.gl;
		var p = references.createProgram.apply( gl );
		p.__uuid = createUUID();
		p.version = program.program.version + 1;

		var vs = references.createShader.apply( gl, [ gl.VERTEX_SHADER ] );
		var source = vSource != null ? vSource : program.vertexShaderSource;
		references.shaderSource.apply( gl, [ vs, source ] );
		references.compileShader.apply( gl, [ vs ] );
		if (!gl.getShaderParameter( vs, gl.COMPILE_STATUS ) ) {
			logMsg( gl.getShaderInfoLog( vs ) );
			return;
		}
		setShaderName( program.original.__uuid, gl.VERTEX_SHADER, extractShaderName( source ) );
		references.attachShader.apply( gl, [ p, vs ] );

		var fs = references.createShader.apply( gl, [ gl.FRAGMENT_SHADER ] );
		var source = fSource != null ? fSource : program.fragmentShaderSource;
		references.shaderSource.apply( gl, [ fs, fSource != null ? fSource : program.fragmentShaderSource ] );
		references.compileShader.apply( gl, [ fs ] );
		if (!gl.getShaderParameter( fs, gl.COMPILE_STATUS ) ) {
			logMsg( gl.getShaderInfoLog( fs ) );
			return;
		}
		setShaderName( program.original.__uuid, gl.FRAGMENT_SHADER, extractShaderName( source ) );
		references.attachShader.apply( gl, [ p, fs ] );

		references.linkProgram.apply( gl, [ p ] );
		var currentProgram = gl.getParameter( gl.CURRENT_PROGRAM );
		references.useProgram.apply( gl, [ p ] );

		program.program = p;
		
		for( var j = 0; j < program.uniforms.length; j++ ) {
			var u = program.uniforms[ j ];
			var original = u.location.__uuid;
			u.location = references.getUniformLocation.apply( u.gl, [ program.program, u.name ] );
			u.location.__uuid = createUUID();
			var args = [ u.location ]
			u.value.forEach( function( v ) { args.push( v ) } );
			references[ u.type ].apply( u.gl, args );
			/*var err = gl.getError();
			if( err ) {
				debugger;
			}*/
			logMsg( 'updated uniform location "' + u.name + '"" to ' + u.location.__uuid + ' (was ' + original + ')' );
		}

		/*
		All vertex attribute locations have to be the same in the re-linked program. In order to guarantee this, it's 
		necessary to call getActiveAttrib on the original program from 0..getProgramParameter(program, ACTIVE_ATTRIBUTES), 
		record the locations of those attributes, and then call bindAttribLocation on the program object for each of them, 
		to re-assign them before re-linking. Otherwise you're leaving it to chance that the OpenGL implementation 
		will assign the vertex attributes to the same locations.
		*/

		for( var j = 0; j < program.attributes.length; j++ ) {
			var u = program.attributes[ j ];
			u.index = references.getAttribLocation.apply( u.gl, [ program.program, u.name ] );

			references.bindAttribLocation.apply( gl, [ p, u.index, u.name ] );

			if( u.size ) {
				references.vertexAttribPointer.apply( u.gl, [ u.index, u.size, u.type, u.normalized, u.stride, u.offset ] );
				/*var err = gl.getError();
				if( err ) {
					debugger;
				}*/
			}

			references.enableVertexAttribArray.apply( u.gl, [ u.index ] );
			/*var err = gl.getError();
			if( err ) {
				debugger;
			}*/
		
			logMsg( 'updated attribute location ' + u.name );
		}

		this.references.useProgram.apply( gl, [ currentProgram ] );

		logMsg( 'updated Program', id );

	}

	window.UIProgramSelected = function( id ) {

		onSelectProgram( id );

	}

	window.UIProgramHovered = function( id ) {

		log( 'UIProgramHovered' );

		var p = findProgram( id );
		var vs = p.vertexShaderSource;
		var fs = p.fragmentShaderSource;

		fs = fs.replace( /\s+main\s*\(/, ' ShaderEditorInternalMain(' );
		fs += '\r\n' + 'void main() { ShaderEditorInternalMain(); gl_FragColor.rgb *= vec3(1.,0.,1.); }';
//		fs += '\r\n' + 'void main() { ShaderEditorInternalMain(); float c = smoothstep( .4, .6, mod( .01 * ( gl_FragCoord.x - gl_FragCoord.y ), 1. ) ); gl_FragColor.rgb = mix( gl_FragColor.rgb, gl_FragColor.rgb * vec3( 1.,0.,1. ), c ); }';
 
		onUpdateProgram( id, vs, fs );

	}

	window.UIProgramOut = function( id ) {

		log( 'UIProgramOut' );

		var p = findProgram( id );
		var vs = p.vertexShaderSource;
		var fs = p.fragmentShaderSource;

		onUpdateProgram( id, vs, fs );

	}

	window.UIProgramDisabled = function( id ) {

		log( 'UIProgramHovered' );

		var p = findProgram( id );
		var vs = p.vertexShaderSource;
		var fs = p.fragmentShaderSource;

//		fs = fs.replace( /\s+main\s*\(/, ' ShaderEditorInternalMain(' );
//		fs += '\r\n' + 'void main() { discard; }';
		fs = fs.replace( /\s+main\s*\(/, ' ShaderEditorInternalMain(' );
		fs += '\r\n' + 'void main() { ShaderEditorInternalMain(); discard; }';
 
		onUpdateProgram( id, vs, fs );

	}

	window.UIProgramEnabled = function( id ) {

		log( 'UIProgramOut' );

		var p = findProgram( id );
		var vs = p.vertexShaderSource;
		var fs = p.fragmentShaderSource;

		onUpdateProgram( id, vs, fs );

	}

	var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

	function decodeSource( input ) {

		var str = String(input).replace(/=+$/, '');
		if (str.length % 4 == 1) {
			throw new InvalidCharacterError("'atob' failed: The string to be decoded is not correctly encoded.");
		}
		for (
			var bc = 0, bs, buffer, idx = 0, output = '';
			buffer = str.charAt(idx++);
			~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
				bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
			) {
			buffer = chars.indexOf(buffer);
	}
	return output;

}

	window.UIVSUpdate = function( id, src ) {

		log( 'UPDATE VS' );
		onUpdateVSource( id, decodeSource( src ) );
		onUpdateProgram( id );

	}

	window.UIFSUpdate = function( id, src ) {

		log( 'UPDATE FS' );
		onUpdateFSource( id, decodeSource( src ) );
		onUpdateProgram( id );
	
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

var verbose = false;
if( verbose ) {
	log.style.left = '50%';
	log.style.display = 'block';
	container.style.right= '50%';

	log.addEventListener( 'click', function( e ) {
		this.innerHTML = '';
		e.preventDefault();
	} );
}

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
		//injectedScript: '(' + f.toString() + ')()'
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

var settings = {
	highlight: true
}
/*var stored = chrome.storage.sync.get( 'highlight', function( i ) {

	logMsg( 'retrieved' );
	logMsg( i );
	settings.highlight = i;
	document.getElementById( 'highlightButton' ).style.opacity = settings.highlight ? 1 : .5;

} );*/

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

var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function encodeSource(input) {
	var str = String(input);
	for (
		var block, charCode, idx = 0, map = chars, output = '';
		str.charAt(idx | 0) || (map = '=', idx % 1);
		output += map.charAt(63 & block >> 8 - idx % 1 * 8)
		) {
			charCode = str.charCodeAt(idx += 3/4);
		if (charCode > 0xFF) {
			throw new InvalidCharacterError("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
		}
		block = block << 8 | charCode;
	}
	return output;
}

function updateVSCode() {

	updateVSCount();
	var source = vSEditor.getValue();
	if( testShader( gl.VERTEX_SHADER, source, vSEditor ) ){
		vsPanel.classList.add( 'compiled' );
		vsPanel.classList.remove( 'not-compiled' );
		chrome.devtools.inspectedWindow.eval( 'UIVSUpdate( \'' + selectedProgram + '\', \'' + encodeSource( source ) + '\' )' );
	} else {
		vsPanel.classList.add( 'not-compiled' );
		vsPanel.classList.remove( 'compiled' );
	}

}

function updateFSCode() {

	updateFSCount();
	var source = fSEditor.getValue();
	if( testShader( gl.FRAGMENT_SHADER, source, fSEditor ) ){
		fsPanel.classList.add( 'compiled' );
		fsPanel.classList.remove( 'not-compiled' );
		chrome.devtools.inspectedWindow.eval( 'UIFSUpdate( \'' + selectedProgram + '\', \'' + encodeSource( source ) + '\' )' );

	} else {
		fsPanel.classList.add( 'not-compiled' );
		fsPanel.classList.remove( 'compiled' );
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

var selectedProgram = null;
var programs = {};

function updateProgramName( i, type, name ) {

	logMsg( ' >>>>>> ' + i.id + ' ' + type + ' ' + name );

	if( type === WebGLRenderingContext.VERTEX_SHADER ) {
		i.vSName = name;
	}
	if( type === WebGLRenderingContext.FRAGMENT_SHADER ) {
		i.fSName = name;
	}

	if( i.vSName === '' && i.fSName === '' ) {
		i.name = 'Program ' + i.number;
	} else {
		if( i.vSName === i.fSName ) {
			i.name = i.vSName;
		} else {
			i.name = i.vSName + ' / ' + i.fSName;
		}
	}

	i.nameSpan.textContent = i.name;

}

function tearDown() {

	selectedProgram = null;
	programs = [];
	vSEditor.setValue( '' );
	vsPanel.classList.remove( 'not-compiled' );
	vsPanel.classList.remove( 'compiled' );
	vSFooter.textContent = '';
	fSEditor.setValue( '' );
	fsPanel.classList.remove( 'not-compiled' );
	fsPanel.classList.remove( 'compiled' );
	fSFooter.textContent = '';
	while( list.firstChild ) list.removeChild( list.firstChild );

}

backgroundPageConnection.onMessage.addListener( function( msg ) {

	switch( msg.method ) {
		case 'inject':
			logMsg( 'inject' );
			tearDown();
			logMsg( chrome.devtools.inspectedWindow.eval( '(' + f.toString() + ')()' ) ); 
			break;
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
			onWindowResize();
			var li = document.createElement( 'li' );
			var span = document.createElement( 'span' );
			span.className = 'visibility';
			span.addEventListener( 'click', function( e ) {
				this.parentElement.classList.toggle( 'hidden' );
				if( this.parentElement.classList.contains( 'hidden' ) ) {
					chrome.devtools.inspectedWindow.eval( 'UIProgramDisabled( \'' + msg.uid + '\' )' );
				} else {
					chrome.devtools.inspectedWindow.eval( 'UIProgramEnabled( \'' + msg.uid + '\' )' );
				}
				e.preventDefault();
				e.stopPropagation();
				return false;
			} );
			var nameSpan = document.createElement( 'span' );
			nameSpan.className = 'name';
			li.appendChild( span );
			li.appendChild( nameSpan );
			li.addEventListener( 'click', function() {
				selectProgram( this );
				selectedProgram = msg.uid;
				chrome.devtools.inspectedWindow.eval( 'UIProgramSelected( \'' + msg.uid + '\' )' );
			} );
			li.addEventListener( 'mouseover', function() {
				if( settings.highlight && !this.classList.contains( 'hidden' ) ) {
					chrome.devtools.inspectedWindow.eval( 'UIProgramHovered( \'' + msg.uid + '\' )' );
				}
			} );
			li.addEventListener( 'mouseout', function() {
				if( settings.highlight && !this.classList.contains( 'hidden' ) ) {
					chrome.devtools.inspectedWindow.eval( 'UIProgramOut( \'' + msg.uid + '\' )' );
				}
			} );
			list.appendChild( li );
			var d = {
				id: msg.uid,
				li: li,
				nameSpan: nameSpan,
				vSName: '',
				fSName: '',
				name: '',
				number: list.children.length
			};
			programs[ msg.uid ] = d;
			updateProgramName( d );
			break;
		case 'setShaderName':
			//logMsg( msg.uid, msg.type, msg.name );
			updateProgramName( programs[ msg.uid ], msg.type, msg.name );
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

	if( source === '' ) {
		logMsg( 'NO SOURCE TO TEST' );
		return false;
	}

	while( code._errors.length > 0 ) {

		var mark = code._errors.pop();
		code.removeLineWidget( mark );

	}

	var s = gl.createShader( type );
	gl.shaderSource( s, source );
	gl.compileShader( s );

	var success = gl.getShaderParameter( s, gl.COMPILE_STATUS );
	var err = gl.getShaderInfoLog( s );
	logMsg( 'ERR:[' + err + ']' );

	if( !success || err !== '' ) {

		if( err ) {

			var lineOffset = 0;
			err = err.replace(/(\r\n|\n|\r)/gm, "" );

			var lines = [];
			var re = /(error|warning):/gi;
			var matches = [];
			while ((match = re.exec(err)) != null) {
				matches.push( match.index );
			}
			matches.push( err.length );
			for( var j = 0; j < matches.length - 1; j++ ) {
				var p = matches[ j ];
				lines.push( err.substr( p, matches[ j + 1 ] - p ) );
			}

			for( var j = 0; j < lines.length; j++ ) {
				logMsg( '[[' + lines[ j ] + ']]' );
			}

			for( var i=0; i<lines.length; i++ ) {

				var parts = lines[i].split(":");
				
				var isWarning = parts[0].toUpperCase() === "WARNING";

				if( parts.length===5 || parts.length===6 ) {

					var lineNumber = parseInt( parts[2] ) - lineOffset;
					if( isNaN( lineNumber ) ) lineNumber = 1;

					var msg = document.createElement("div");
					msg.appendChild(document.createTextNode( parts[3] + " : " + parts[4] ));
					msg.className = isWarning?'warningMessage':'errorMessage';
					var mark = code.addLineWidget( lineNumber - 1, msg, {coverGutter: false, noHScroll: true} );

					code._errors.push( mark );

				} else if( lines[i] != null && lines[i]!="" && lines[i].length>1 && parts[0].toUpperCase() != "WARNING") {

					logMsg( parts[ 0 ] );

					var txt = 'Unknown error';
					if( parts.length == 4 )
						txt = parts[ 2 ] + ' : ' + parts[ 3 ];
					
					var msg = document.createElement("div");
					msg.appendChild(document.createTextNode( txt ));
					msg.className = isWarning?'warningMessage':'errorMessage';
					var mark = code.addLineWidget( 0, msg, {coverGutter: false, noHScroll: true, above: true} );

					code._errors.push( mark );

				}

			}
		}
		
	}

	return success;

}

var optimize_glsl = Module.cwrap('optimize_glsl', 'string', ['string', 'number', 'number']);

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

document.getElementById( 'vs-optimise' ).addEventListener( 'click', function( e ) {

	logMsg( 'vs optimise' );
	var source = vSEditor.getValue();

	var res = optimize_glsl( source, 2, true );
	vSEditor.setValue( res );
	updateVSCode();

	e.preventDefault();

} );

document.getElementById( 'fs-optimise' ).addEventListener( 'click', function( e ) {

	logMsg( 'fs optimise' );
	var source = fSEditor.getValue();

	var res = optimize_glsl( source, 2, false );
	fSEditor.setValue( res );
	updateFSCode();

	e.preventDefault();

} );

document.getElementById( 'highlightButton' ).addEventListener( 'click', function( e ) {

	settings.highlight = !settings.highlight;
	/*chrome.storage.sync.set( { 'highlight': settings.highlight }, function() {
		logMsg( 'Saved' )
	} );*/

	this.style.opacity = settings.highlight ? 1 : .5;
	
	e.preventDefault();

} );

window.addEventListener( 'resize', onWindowResize );

function onWindowResize() {

	editorContainer.classList.toggle( 'vertical', editorContainer.clientWidth < editorContainer.clientHeight );
	
}