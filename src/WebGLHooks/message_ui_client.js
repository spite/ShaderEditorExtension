function addClientMessenger() {

    window.doPostMessageClientShaderEditor = function(data, src) {
        return window.postMessage(data, src);
    };

}