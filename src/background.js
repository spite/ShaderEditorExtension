// chrome.extension calls
var connections = {};

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
//  console.log('incoming message from injected script');
 // console.log(request);

  // Messages from content scripts should have sender.tab set
  if (sender.tab) {
    var tabId = sender.tab.id;
    if (tabId in connections) {
      connections[tabId].postMessage(request);
    } else {
      console.log("Tab not found in connection list.");
    }
  } else {
    console.log("sender.tab not defined.");
  }
  return true;
});

chrome.runtime.onConnect.addListener(function( connection ) {

  // Listen to messages sent from the DevTools page
  var listener = function(message, sender, sendResponse) {
   // console.log('incoming message from dev tools page');

    // Register initial connection  
    if ( message.name === 'init') {
      console.log( 'init' );
      connections[ message.tabId ] = connection;
      connections[ message.tabId ].postMessage( { method: 'loaded' } );
    }

    if( message.name === 'readSettings' ) {
      console.log( 'read settings' );

      chrome.storage.sync.get( 'settings', function( obj ) {
        console.log( 'SETTINGS: ', obj );

        var settings = {
          highlight: true,
          tmpDisableHighlight: false,
          textures: false
        }

        if( obj.settings ) {
          obj = obj.settings;

          if( obj.highlight !== undefined ) {
            settings.highlight = obj.highlight;
          }

          if( obj.textures !== undefined ) {
            settings.textures = obj.textures;
          }

          if( obj.tmpDisableHighlight !== undefined ) {
            settings.tmpDisableHighlight = obj.tmpDisableHighlight;
          }
        }

        connections[ message.tabId ].postMessage( { method: 'settings', settings: settings } );
      } );

    }

    if( message.name === 'saveSettings' ) {
      console.log( 'save settings' );
      chrome.storage.sync.set( { 'settings': message.settings },  function() {
          console.log('Settings saved');
        });
    }

  }

  connection.onMessage.addListener( listener );

  connection.onDisconnect.addListener(function() {
    connection.onMessage.removeListener( listener );
  });


});
/*
chrome.webNavigation.onCommitted.addListener( function() {
  for( var j in connections ) {
    connections[ j ].postMessage( { method: 'onCommitted' } );
  }
} );

chrome.tabs.onUpdated.addListener( function( tabId ) {

    connections[ tabId ].postMessage( { method: 'onUpdated' } );

} );*/

chrome.webNavigation.onBeforeNavigate.addListener(function(data) 
{
        //console.log("onBeforeNavigate: " + data.url + ". Frame: " + data.frameId + ". Tab: " + data.tabId);
});

chrome.webNavigation.onCommitted.addListener(function(data) {
 
  //console.log("onCommitted: " + data.url + ". Frame: " + data.frameId + ". Tab: " + data.tabId);
 
  if( connections[ data.tabId ] ) {
    if( data.frameId === 0 ) {
      connections[ data.tabId ].postMessage( { method: 'inject' } );
    }
  }

});

chrome.webNavigation.onReferenceFragmentUpdated.addListener(function(data) 
{
       // console.log("onReferenceFragmentUpdated: " + data.url + ". Frame: " + data.frameId + ". Tab: " + data.tabId);
});

chrome.webNavigation.onErrorOccurred.addListener(function(data) 
{
      //  console.log("onErrorOccurred: " + data.url + ". Frame: " + data.frameId + ". Tab: " + data.tabId + ". Error: " + data.error);
});

chrome.webNavigation.onReferenceFragmentUpdated.addListener(function(data) 
{
      //  console.log("onReferenceFragmentUpdated: " + data.url + ". Frame: " + data.frameId + ". Tab: " + data.tabId);
});

/*chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) 
{
        console.log("tabs.onUpdated: " + changeInfo.url + ". Status: " + changeInfo.status + ". Tab: " + tabId);
});

chrome.history.onVisited.addListener(function(historyItem) 
{
        console.log("history.onVisited: " + historyItem.url);
});*/
/*
chrome.webNavigation.onCompleted.addListener(function(data) 
        {
              //  console.log("onCompleted: " + data.url + ". Frame: " + data.frameId + ". Tab: " + data.tabId);
        });
*/