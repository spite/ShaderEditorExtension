/*chrome.devtools.network.onNavigated.addListener( function() {

	//console.log( 'onNavigated' );
	//chrome.devtools.inspectedWindow.eval( '(' + f.toString() + ')()' ); // this gets appended AFTER the page
	chrome.devtools.inspectedWindow.reload( {
		ignoreCache: true, 
    	injectedScript: '(' + f.toString() + ')()'
	} );

} );*/

document.getElementById('reload').addEventListener('click', function(e) {
    chrome.devtools.inspectedWindow.reload({
        ignoreCache: true,
        //injectedScript: '(' + f.toString() + ')()'
    });
});

var backgroundPageConnection = chrome.runtime.connect({
    name: 'panel'
});

function readSettings() {

    backgroundPageConnection.postMessage({
        name: 'readSettings',
        tabId: chrome.devtools.inspectedWindow.tabId
    });

}

function saveSettings() {

    sendCodeToClient('UIUpdateSettings', JSON.stringify(settings));

    backgroundPageConnection.postMessage({
        name: 'saveSettings',
        settings: settings,
        tabId: chrome.devtools.inspectedWindow.tabId
    });

}

// version compatible with different kind of debug injection
// chrome, websocket, vorlonjs
function injectCodeToClient(func, param0) {

    var str = '(' + func + ')(' + param0 + ')';
    chrome.devtools.inspectedWindow.eval(str);

}

// version compatible with different kind of debug injection
// chrome, websocket, vorlonjs
function sendCodeToClient(func, param0, param1, param2) {

    
    var str = func + '( \'' + param0 + '\', \'' + param1 + '\', \'' + param2 + '\' )';
    chrome.devtools.inspectedWindow.eval(str);
    if(arguments.length > 4) console.error(' too much argument for sendCodeToClient');

}

function clientMessageListener(callback) {

    backgroundPageConnection.onMessage.addListener(callback);

}

backgroundPageConnection.postMessage({

    name: 'init',
    tabId: chrome.devtools.inspectedWindow.tabId

});