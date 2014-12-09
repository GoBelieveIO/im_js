var STATE_UNCONNECTED = 0;
var STATE_CONNECTING = 1;
var STATE_CONNECTED = 2;
var STATE_CONNECTFAIL = 3;


var MSG_AUTH = 2;
var MSG_AUTH_STATUS = 3;
var MSG_IM = 4;
var MSG_ACK = 5;
var MSG_RST = 6;
var MSG_PEER_ACK = 9;

var PLATFORM_ID = 2

function IMService(host, port, uid, observer) {
    this.host = host;
    this.port = port;
    this.uid = uid;
    this.observer = observer;
    this.socket = null;
    this.observer = null;
    this.connectFailCount = 0;
    this.connectState = 0;
    this.seq = 0;
    this.stopped = true;
}

IMService.prototype.start = function () {
    if (!this.stopped) {
        console.log("im service already be started");
        return;
    }
    console.log("start im service");
    this.stopped = false;
    this.connect()
}

IMService.prototype.stop = function () {
    if (this.stopped) {
        console.log("im service already be stopped");
        return;
    }
    console.log("stop im service");
    if (this.socket == null) {
        return;
    }
    console.log("close socket");
    this.socket.close();
    this.socket = null;
}

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
    
    this.connectState = STATE_CONNECTING;
    this.socket = eio({hostname:this.host, port:this.port, transports:["websocket"]})

    self = this;
    this.socket.on('open', function() {
        self.onOpen();
    });

    this.socket.on('error', function(err) {
        self.onError(err);
    });
    console.log("this:" + typeof this);
}

IMService.prototype.onOpen = function () {
    console.log("socket opened:" + typeof this);
    self = this;
    this.socket.on('message', function(data) {
        self.onMessage(data)
    });
    this.socket.on('close', function() {
        self.onClose();
    });
    this.connectFailCount = 0;
    this.seq = 0;
    this.connectState = STATE_CONNECTED;
    this.send(MSG_AUTH, {"uid": this.uid, "platform_id": PLATFORM_ID});
}

function Utf8ArrayToStr(array) {
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
}

IMService.prototype.onMessage = function (data) {
    text = null;
    if (data instanceof ArrayBuffer) {
        text = Utf8ArrayToStr(new Int8Array(data));
    } else if (typeof data == "string") {
        text = data;
    } else {
        console.log("invalid data type:" + typeof data);
        return;
    }
    obj = JSON.parse(text);
    if (obj.cmd == MSG_IM) {
        msg = {}
        //msg.content = Base64.decode(obj.body.content)
        msg.content = obj.body.content
        msg.sender = obj.body.sender;
        msg.receiver = obj.body.receiver;
        console.log("im message sender:" + msg.sender + 
                    " receiver:" + msg.receiver);
        msg.timestamp = obj.body.timestamp;
        if (this.observer != null) {
            this.observer.handleMessage(msg);
        }
    } else if(obj.cmd == MSG_AUTH_STATUS) {
        console.log("auth status:" + obj.body.status);
    } else {
        console.log("message command:" + obj.cmd);
    }
}

IMService.prototype.onError = function (err) {
    console.log("err:" + err)
    this.connectFailCount++;
    this.connectState = STATE_CONNECTFAIL;
    setTimeout(this.connect, this.connectFailCount*1000);
}

IMService.prototype.onClose = function() {
    console.log("socket disconnect");
    this.socket = null;
    this.connectState = STATE_UNCONNECTED;
    self = this;
    f = function() {
        self.connect();
    }
    setTimeout(f, 100);
}

IMService.prototype.send = function (cmd, body) {
    this.seq++;
    obj = {"seq": this.seq, "cmd": cmd, "body": body};
    text = JSON.stringify(obj);
    this.socket.send(text);
}

IMService.prototype.sendPeerMessage = function (msg) {
    //content = Base64.encode(msg.content)
    content = msg.content
    this.send(MSG_IM, {"sender": msg.sender, "receiver": msg.receiver, "msgid": msg.msgLocalID, "content": content});
    
}


