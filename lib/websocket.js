function WebSocket(url) {
  this.url = url;
  this.binaryType = 'arraybuffer';
  this.bufferedAmount = 0;
  this.readyState = '';

  console.log("websocket url:", url);
  this.socket = wx.connectSocket({url:this.url});

  var self = this;

  this.socket.onOpen(function() {
    console.log("websocket on open");
    if (self.onopen) {
      self.onopen();
    }
  });

  this.socket.onClose(function() {
    console.log("websocket on close");
    if (self.onclose) {
      self.onclose();
    }
  });

  this.socket.onError(function(err) {
    console.log("websocket on err:", err);
    if (self.onerror) {
      self.onerror(err);
    }
  });

  this.socket.onMessage(function(msg) {
    console.log("websocket on message:", msg, typeof(msg));
    if (self.onmessage) {
      self.onmessage(msg);
    }
  });
}

WebSocket.prototype.close = function() {
  if (!this.socket) {
    return;
  }
  this.socket.close();
  this.socket = null;
}

WebSocket.prototype.send = function(data) {
  if (!this.socket) {
    return;
  }
  console.log("websocket send message:", typeof(data), data);
  this.socket.send({data:data, function() {
    console.log("websocket send success")
  }}, function() {
    console.log("websocket send error");
  }, function() {
    console.log("websocket send complete");
  });
}
module.exports = WebSocket;