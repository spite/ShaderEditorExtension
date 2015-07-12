window.addEventListener('message', function(event) {

	if (event.source !== window) {
		return;
	}

	/*if( event.data && event.data.method ) {

		if( event.data.method === 'saveSetting' ) {
			var s = event.data.setting;
			var v = event.data.value;
			var obj = {};
			obj[ s ] = v;
			chrome.storage.sync.set( obj, function() {
			} );
			return;
		}

		if( event.data.method === 'loadSetting' ) {
			var s = event.data.setting;
			chrome.storage.sync.get( event.data.setting, function( i ) { 
				chrome.runtime.sendMessage( { 
					source: 'WebGLShaderEditor', 
					method: 'loadSetting', 
					setting: s, 
					value: i[ s ]
				} );
			} );
			return;
		}

	}*/

	//console.log( 'message ', event );

	var message = event.data;

	// Only accept messages that we know are ours
	if (typeof message !== 'object' || message === null ) {
		return;
	}

	chrome.runtime.sendMessage(message);
});