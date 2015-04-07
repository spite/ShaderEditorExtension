function f() {

//			window.postMessage( { method: 'open', arguments: arguments }, '*');

	//function log() { console.log( arguments ); }
	//function error() { console.error( arguments ); }
	function log() {}
	function error() {}

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

	function testShader( type, source, code ) {

		if( source === '' ) return;

		var s = _gl.createShader( type );
		_gl.shaderSource( s, source );
		_gl.compileShader( s );

 		while( code._errors.length > 0 ) {

			var mark = code._errors.pop();
			code.removeLineWidget( mark );

		}

		if ( _gl.getShaderParameter( s, _gl.COMPILE_STATUS ) === false ) {

			var err = _gl.getShaderInfoLog( s );
					
		    if( err==null )
		    {
		        /*this.mForceFrame = true;
		        if( fromScript==false )
		        {
		            eleWrapper.className = "errorNo";
		            setTimeout(function () { eleWrapper.className = ""; }, 500 );
		        }*/
		    }
		    else
		    {
		        //eleWrapper.className = "errorYes";

		        var lineOffset = 0;//this.mEffect.GetHeaderSize( this.mActiveDoc );
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
			error( 'Shader couldn\'t compile.' );
			return false;

		}

		if ( _gl.getShaderInfoLog( s ) !== '' ) {

			error( '_gl.getShaderInfoLog()', _gl.getShaderInfoLog( s ) );
			return false;

		}

		return true;

	}

	//init();

	var programs = {};
	var shaders = {};
	var uniforms = [];
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

		return f;	

	}

	function addProgram( gl, p ) {

		//this.shaderEditor.style.display = 'block';

		var li = document.createElement( 'li' );
		li.textContent = 'Program';

		var el = { gl: gl, program: p, shaders: [], li: li };

		li.addEventListener( 'click', function( e ) {
			selectProgram( el );
			e.preventDefault();
		} );

		programs[ p.__uuid ] = el;

		//this.programList.appendChild( li );
		window.postMessage( { source: 'WebGLShaderEditor', method: 'addProgram', uid: p.__uuid }, '*');

	}

	function selectProgram( p ) {

		currentProgram = p;
			
	}

	function update( vs, fs ) {

		if( !currentProgram ) return;
		log( 'UPDATE' );

		var gl = currentProgram.gl,
			program = currentProgram.program,
			vertexShader = currentProgram.shaders[ 0 ].shader,
			fragmentShader = currentProgram.shaders[ 1 ].shader;

			if( currentProgram.shaders[ 0 ].type === gl.VERTEX_SHADER ) vertexShader = currentProgram.shaders[ 0 ].shader;
			if( currentProgram.shaders[ 0 ].type === gl.FRAGMENT_SHADER ) fragmentShader = currentProgram.shaders[ 0 ].shader;
			if( currentProgram.shaders[ 1 ].type === gl.VERTEX_SHADER ) vertexShader = currentProgram.shaders[ 1 ].shader;
			if( currentProgram.shaders[ 1 ].type === gl.FRAGMENT_SHADER ) fragmentShader = currentProgram.shaders[ 1 ].shader;
			
		//gl.detachShader( program, vertexShader );
		//gl.detachShader( program, fragmentShader );

		//vertexShader = gl.createShader( gl.VERTEX_SHADER );
		//fragmentShader = gl.createShader( gl.FRAGMENT_SHADER );
		
		//if( !testShader( gl.VERTEX_SHADER, vsSource ) ) return false;
		//if( !testShader( gl.FRAGMENT_SHADER, fsSource ) ) return false;

		var lineBreak = "\r\n";
		
		if( vs ) { references.shaderSource.apply( gl, [ vertexShader, vs + lineBreak ] ); } else { gl.shaderSource( vertexShader, vsSource + lineBreak ); }
		if( fs ) { references.shaderSource.apply( gl, [ fragmentShader, fs + lineBreak ] ); } else { gl.shaderSource( fragmentShader, fsSource + lineBreak ); }

		gl.compileShader( vertexShader );

		if ( gl.getShaderParameter( vertexShader, gl.COMPILE_STATUS ) === false ) {

			error( 'THREE.WebGLShader: Shader couldn\'t compile.' );

		}

		if ( gl.getShaderInfoLog( vertexShader ) !== '' ) {

			error( 'THREE.WebGLShader:', 'gl.getShaderInfoLog()', gl.getShaderInfoLog( vertexShader ) );

		}

		gl.compileShader( fragmentShader );


		if ( gl.getShaderParameter( fragmentShader, gl.COMPILE_STATUS ) === false ) {

			error( 'Shader couldn\'t compile.' );

		}

		if ( gl.getShaderInfoLog( fragmentShader ) !== '' ) {

			error( 'gl.getShaderInfoLog()', gl.getShaderInfoLog( fragmentShader ) );

		}

		gl.attachShader( program, vertexShader );
		gl.attachShader( program, fragmentShader );

		gl.linkProgram( program );

		if( !gl.getProgramParameter(program,gl.LINK_STATUS) ) {
	        var infoLog = gl.getProgramInfoLog(program);
	        //gl.deleteProgram( program );
	        log( infoLog );
	    }

		log( 'update' );

	}

	WebGLRenderingContext.prototype.createShader = _h( 
		WebGLRenderingContext.prototype.createShader, 
		function( res, args ) {

			log( 'createShader', args );
			res.__uuid = guid();
			shaders[ res.__uuid ] = { shader: res, type: args[ 0 ] };

		} 
	);


	WebGLRenderingContext.prototype.shaderSource = _h( 
		WebGLRenderingContext.prototype.shaderSource, 
		function( res, args ) {

			log( 'shaderSource', args );
			var s = findShader( args[ 0 ] );
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

	WebGLRenderingContext.prototype.attachShader = _h( 
		WebGLRenderingContext.prototype.attachShader, 
		function( res, args ) {

			log( 'attachShader', args );
			var p = findProgram( args[ 0 ].__uuid );
			var s = findShader( args[ 1 ] );
			p.shaders.push( s );

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

			uniforms.push( {
				program: args[ 0 ],
				uniform: args[ 1 ],
				location: res,
				gl: this
			} );
			log( 'getUniformLocation', res, args );

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
				var a = [];
				a.push( l );
				for( var j = 1; j < args.length; j++ ) {
					a.push( args[ j ] );
				}
				references[ f ].apply( p.gl, a );
			}

		}

	} );

	window.UIProgramSelected = function( id ) {

		var p = findProgram( id );
		selectProgram( p );
		log( 'Selected', p );
		var gl = p.gl;

		var vertexShader, fragmentShader;

		if( p.shaders[ 0 ].type === gl.VERTEX_SHADER ) vertexShader = p.shaders[ 0 ];
		if( p.shaders[ 0 ].type === gl.FRAGMENT_SHADER ) fragmentShader = p.shaders[ 0 ];
		if( p.shaders[ 1 ].type === gl.VERTEX_SHADER ) vertexShader = p.shaders[ 1 ];
		if( p.shaders[ 1 ].type === gl.FRAGMENT_SHADER ) fragmentShader = p.shaders[ 1 ];

		vsSource = vertexShader.source;
		fsSource = fragmentShader.source;

		window.postMessage( { source: 'WebGLShaderEditor', method: 'setVSSource', code: vsSource }, '*');
		window.postMessage( { source: 'WebGLShaderEditor', method: 'setFSSource', code: fsSource }, '*');

	}

	window.UIProgramHovered = function( id ) {

		log( 'UIProgramHovered' );

		var p = findProgram( id );
		selectProgram( p );
		var gl = p.gl;

		var vertexShader, fragmentShader;

		if( p.shaders[ 0 ].type === gl.VERTEX_SHADER ) vertexShader = p.shaders[ 0 ];
		if( p.shaders[ 0 ].type === gl.FRAGMENT_SHADER ) fragmentShader = p.shaders[ 0 ];
		if( p.shaders[ 1 ].type === gl.VERTEX_SHADER ) vertexShader = p.shaders[ 1 ];
		if( p.shaders[ 1 ].type === gl.FRAGMENT_SHADER ) fragmentShader = p.shaders[ 1 ];

		var vs = vertexShader.source;
		var fs = fragmentShader.source;

		fs = fs.replace( /[ ]+main[ ]*\(/ig, ' ShaderEditorInternalMain(' );
		fs += '\r\n' + 'void main() { ShaderEditorInternalMain(); gl_FragColor.gb = vec2( 0. ); }';

		update( vs, fs );

	}

	window.UIProgramOut = function( id ) {

		log( 'UIProgramOut' );

		var p = findProgram( id );
		selectProgram( p );
		var gl = p.gl;

		var vertexShader, fragmentShader;

		if( p.shaders[ 0 ].type === gl.VERTEX_SHADER ) vertexShader = p.shaders[ 0 ];
		if( p.shaders[ 0 ].type === gl.FRAGMENT_SHADER ) fragmentShader = p.shaders[ 0 ];
		if( p.shaders[ 1 ].type === gl.VERTEX_SHADER ) vertexShader = p.shaders[ 1 ];
		if( p.shaders[ 1 ].type === gl.FRAGMENT_SHADER ) fragmentShader = p.shaders[ 1 ];

		var vs = vertexShader.source;
		var fs = fragmentShader.source;

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

	setTimeout( function() {
		window.postMessage( { source: 'WebGLShaderEditor', method: 'init' }, '*');
	}, 100 );

}

function log() {}
function error() {}

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
	list = document.getElementById( 'list' ),
	vSFooter = document.getElementById( 'vs-count' ),
	fSFooter = document.getElementById( 'fs-count' );

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
		chrome.devtools.inspectedWindow.eval( 'UIVSUpdate( \'' + btoa( source ) + '\' )' );
	}

}

function updateFSCode() {

	updateFSCount();
	var source = fSEditor.getValue();
	if( testShader( gl.FRAGMENT_SHADER, source, fSEditor ) ){
		chrome.devtools.inspectedWindow.eval( 'UIFSUpdate( \'' + btoa( source ) + '\' )' );
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
			info.style.display = 'none';
			container.style.display = 'block';
			break;
		case 'getExtension':
			gl.getExtension( msg.extension );
			break;
		case 'addProgram' :
			info.style.display = 'none';
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
			updateVSCount();
			break;
		case 'setFSSource' :
			fSEditor.setValue( msg.code );
			fSEditor.refresh();
			updateFSCount();
			break;
	}

} );

var keyTimeout = 500;
var vSTimeout;
function scheduleUpdateVS() {

	if( vSTimeout ) vSTimeout = clearTimeout( vSTimeout );
	vSTimeout = setTimeout( updateVSCode, keyTimeout );

}

var fSTimeout;
function scheduleUpdateFS() {

	if( fSTimeout ) fSTimeout = clearTimeout( fSTimeout );
	fSTimeout = setTimeout( updateFSCode, keyTimeout );
	
}

vSEditor.on( 'change', scheduleUpdateVS );
fSEditor.on( 'change', scheduleUpdateFS );

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