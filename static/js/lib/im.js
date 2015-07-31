function IMService(observer) {
    this.host = "imnode.gobelieve.io";
    this.port = 13890;
    this.accessToken = "";
    if (observer == undefined) {
        this.observer = null;
    } else {
        this.observer = observer;
    }

    this.socket = null;
    this.connectFailCount = 0;
    this.connectState = IMService.STATE_UNCONNECTED;
    this.seq = 0;
    this.stopped = true;
    //sending message
    this.messages = {}
}

IMService.STATE_UNCONNECTED = 0;
IMService.STATE_CONNECTING = 1;
IMService.STATE_CONNECTED = 2;
IMService.STATE_CONNECTFAIL = 3;


IMService.MSG_AUTH_STATUS = 3;
IMService.MSG_IM = 4;
IMService.MSG_ACK = 5;
IMService.MSG_RST = 6;
IMService.MSG_PEER_ACK = 9;
IMService.MSG_AUTH_TOKEN = 15;


IMService.PLATFORM_ID = 3;


IMService.prototype.start = function () {
    if (!this.stopped) {
        console.log("im service already be started");
        return;
    }
    console.log("start im service");
    this.stopped = false;
    this.connect()
};

IMService.prototype.stop = function () {
    if (this.stopped) {
        console.log("im service already be stopped");
        return;
    }
    console.log("stop im service");
    this.stopped = true;
    if (this.socket == null) {
        return;
    }
    console.log("close socket");
    this.socket.close();
    this.socket = null;
};

IMService.prototype.callStateObserver = function () {
    if (this.observer != null && "onConnectState" in this.observer) {
        this.observer.onConnectState(this.connectState)
    }
};

IMService.prototype.connect = function () {
    if (this.stopped) {
        console.log("im service stopped");
        return;
    }
    if (this.socket != null) {
        console.log("socket is't null")
        return;
    }

    console.log("connect host:" + this.host + " port:" + this.port);
    this.connectState = IMService.STATE_CONNECTING;
    this.callStateObserver();

    if ("WebSocket" in window) {
        this.socket = eio({hostname:this.host, port:this.port, transports:["websocket"]});
    } else {
        this.socket = eio({hostname:this.host, port:this.port, transports:["polling"]});
    }

    var self = this;
    this.socket.on('open', function() {
        self.onOpen();
    });

    this.socket.on('error', function(err) {
        self.onError(err);
    });
    console.log("this:" + typeof this);
};

IMService.prototype.guid = function () {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

IMService.prototype.onOpen = function () {
    console.log("socket opened");
    var self = this;
    this.socket.on('message', function(data) {
        self.onMessage(data)
    });
    this.socket.on('close', function() {
        self.onClose();
    });
    this.send(IMService.MSG_AUTH_TOKEN, {"access_token": this.accessToken, "platform_id": IMService.PLATFORM_ID, "device_id": this.guid()});
    this.connectFailCount = 0;
    this.seq = 0;
    this.connectState = IMService.STATE_CONNECTED;
    this.callStateObserver();
};

IMService.prototype.onMessage = function (data) {
    var text = null;
    if (typeof data == "string") {
        text = data;
    } else {
        console.log("invalid data type:" + typeof data);
        return;
    }
    var obj = JSON.parse(text);
    if (obj.cmd == IMService.MSG_IM) {
        var msg = {}
        msg.content = obj.body.content
        msg.sender = obj.body.sender;
        msg.receiver = obj.body.receiver;
        console.log("im message sender:" + msg.sender +" receiver:" + msg.receiver);
        msg.timestamp = obj.body.timestamp;
        if (this.observer != null && "handlePeerMessage" in this.observer) {
            this.observer.handlePeerMessage(msg);
        }

        this.send(IMService.MSG_ACK, obj.seq);
        
    } else if(obj.cmd == IMService.MSG_AUTH_STATUS) {
        console.log("auth status:" + obj.body.status);
    } else if (obj.cmd == IMService.MSG_ACK) {
        var ack = obj.body;
        if (ack in this.messages) {
            var msg = this.messages[ack];
            if (this.observer != null && "handleMessageACK" in this.observer){
                this.observer.handleMessageACK(msg.msgLocalID, msg.receiver)
            }
            delete this.messages[ack]
        }
    } else if (obj.cmd == IMService.MSG_PEER_ACK) {
        var msg = obj.body;
        if (this.observer != null && "handleMessageRemoteACK" in this.observer){
            this.observer.handleMessageRemoteACK(msg.msgid, msg.sender)
        }
    } else {
        console.log("message command:" + obj.cmd);
    }
};

IMService.prototype.onError = function (err) {
    console.log("err:" + err);
    this.socket.close();
    this.socket = null;
    this.connectFailCount++;
    this.connectState = IMService.STATE_CONNECTFAIL;
    this.callStateObserver();

    var self = this;
    f = function() {
        self.connect()
    };
    setTimeout(f, this.connectFailCount*1000);
};

IMService.prototype.onClose = function() {
    console.log("socket disconnect");
    this.socket = null;
    this.connectState = IMService.STATE_UNCONNECTED;
    this.callStateObserver();
    
    for (var seq in this.messages) {
        var msg = this.messages[seq];
        if (this.observer != null && "handleMessageFailure" in this.observer){
            this.observer.handleMessageFailure(msg.msgLocalID, msg.receiver)
        }
    }
    this.messages = {};

    var self = this;
    f = function() {
        self.connect();
    };
    setTimeout(f, 400);
};

IMService.prototype.send = function (cmd, body) {
    if (this.socket == null) {
        return false;
    }
    this.seq++;
    var obj = {"seq": this.seq, "cmd": cmd, "body": body};
    var text = JSON.stringify(obj);
    this.socket.send(text);
    return true
};

IMService.prototype.sendPeerMessage = function (msg) {
    if (this.connectState != IMService.STATE_CONNECTED) {
        return false;
    }
    var obj = {"sender": msg.sender, "receiver": msg.receiver, 
               "msgid": msg.msgLocalID, "content": msg.content};
    var r = this.send(IMService.MSG_IM, obj);
    if (!r) {
        return false;
    }

    this.messages[this.seq] = msg;
    return true;
};

IMService.Utf8ArrayToStr = function (array) {
    var out, i, len, c;
    var char2, char3;

    out = "";
    len = array.length;
    i = 0;
    while(i < len) {
        c = array[i++];
        switch(c >> 4)
        { 
        case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
            // 0xxxxxxx
            out += String.fromCharCode(c);
            break;
        case 12: case 13:
            // 110x xxxx   10xx xxxx
            char2 = array[i++];
            out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
            break;
        case 14:
            // 1110 xxxx  10xx xxxx  10xx xxxx
            char2 = array[i++];
            char3 = array[i++];
            out += String.fromCharCode(((c & 0x0F) << 12) |
                                       ((char2 & 0x3F) << 6) |
                                       ((char3 & 0x3F) << 0));
            break;
        }
    }

    return out;
};
