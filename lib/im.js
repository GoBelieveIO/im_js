var Buffer = require('buffer/').Buffer;
var eio = require('engine.io-client');
var order = require('./byte_order');
var hton64 = order.hton64;
var ntoh64 = order.ntoh64;
var htonl = order.htonl;
var ntohl = order.ntohl;

module.exports = IMService;

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
    this.customerMessages = {}

    this.device_id = IMService.guid();
}

IMService.HEADSIZE = 12;
IMService.VERSION = 1;

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
IMService.MSG_RT = 17;

IMService.MSG_CUSTOMER = 24
IMService.MSG_CUSTOMER_SUPPORT = 25


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

    var BrowserWebSocket = global.WebSocket || global.MozWebSocket;
    if (BrowserWebSocket) {
        this.socket = eio({hostname:this.host, port:this.port, transports:["websocket"]});
    } else {
        this.socket = eio({hostname:this.host, port:this.port, enablesXDR:true, transports:["polling"]});
    }

    var self = this;
    this.socket.on('open', function() {
        self.onOpen();
    });

    this.socket.on('error', function(err) {
        self.onError(err);
    });
};

IMService.prototype.onOpen = function () {
    console.log("socket opened");
    var self = this;
    this.socket.on('message', function(data) {
        self.onMessage(data)
    });
    this.socket.on('close', function() {
        self.onClose();
    });

    this.sendAuth();
    this.connectFailCount = 0;
    this.seq = 0;
    this.connectState = IMService.STATE_CONNECTED;
    this.callStateObserver();
};

IMService.prototype.onMessage = function (data) {
    var buf;
    if (global.ArrayBuffer && data instanceof ArrayBuffer) {
        buf = new Buffer(data);
    } else if (data && data.base64) {
        buf = new Buffer(data.data, 'base64');
    } else {
        console.log("invalid data type:" + typeof data);
        return;
    }

    var len = ntohl(buf, 0);
    var seq = ntohl(buf, 4);
    var cmd = buf[8];

    if (len + IMService.HEADSIZE < buf.length) {
        console.log("invalid data length:" + buf.length + " " + len+IMService.HEADSIZE);
        return;
    }

    var pos = IMService.HEADSIZE;
    if (cmd == IMService.MSG_IM) {
        var msg = {}

        msg.sender = ntoh64(buf, pos);
        pos += 8;

        msg.receiver = ntoh64(buf, pos);
        pos += 8;
        
        msg.timestamp = ntohl(buf, pos);
        pos += 4;

        //msgid
        pos += 4;

        msg.content = buf.toString("utf8", IMService.HEADSIZE + 24, IMService.HEADSIZE + len);

        console.log("im message sender:" + msg.sender +" receiver:" + msg.receiver + "content:" + msg.content);

        if (this.observer != null && "handlePeerMessage" in this.observer) {
            this.observer.handlePeerMessage(msg);
        }

        this.sendACK(seq);
    } else if (cmd == IMService.MSG_CUSTOMER) {
        var msg = {}
        msg.customerAppID = ntoh64(buf, pos);
        pos += 8;

        msg.customerID = ntoh64(buf, pos);
        pos += 8;

        msg.storeID = ntoh64(buf, pos);
        pos += 8;

        msg.sellerID = ntoh64(buf, pos);
        pos += 8;

        msg.timestamp = ntohl(buf, pos);
        pos += 4;

        msg.content = buf.toString('utf8', IMService.HEADSIZE + 36, IMService.HEADSIZE + len);

        console.log("customer message customer appid:" + msg.customerAppID + 
                    " customer id:" + msg.customerID + " store id:" + msg.storeID + " seller id:" + 
                    msg.sellerID + "content:" + msg.content);

        if (this.observer != null && "handleCustomerMessage" in this.observer) {
            this.observer.handleCustomerMessage(msg);
        }

        this.sendACK(seq);
    } else if (cmd == IMService.MSG_RT) {
        var msg = {}
        msg.sender = ntoh64(buf, pos);
        pos += 8;

        msg.receiver = ntoh64(buf, pos);
        pos += 8;

        msg.content = buf.toString("utf8", IMService.HEADSIZE + 16, IMService.HEADSIZE + len);

        console.log("rt message sender:" + msg.sender +" receiver:" + msg.receiver + "content:" + msg.content);

        if (this.observer != null && "handleRTMessage" in this.observer) {
            this.observer.handleRTMessage(msg);
        }
    } else if (cmd == IMService.MSG_CUSTOMER_SUPPORT) {
        var msg = {}
        msg.customerAppID = ntoh64(buf, pos);
        pos += 8;

        msg.customerID = ntoh64(buf, pos);
        pos += 8;

        msg.storeID = ntoh64(buf, pos);
        pos += 8;

        msg.sellerID = ntoh64(buf, pos);
        pos += 8;

        msg.timestamp = ntohl(buf, pos);
        pos += 4;

        msg.content = buf.toString('utf8', IMService.HEADSIZE + 36, IMService.HEADSIZE + len);

        console.log("customer support message customer appid:" + msg.customerAppID + 
                    " customer id:" + msg.customerID + " store id:" + msg.storeID + 
                    " seller id:" + msg.sellerID + "content:" + msg.content);

        if (this.observer != null && "handleCustomerSupportMessage" in this.observer) {
            this.observer.handleCustomerSupportMessage(msg);
        }

        this.sendACK(seq);
    } else if (cmd == IMService.MSG_AUTH_STATUS) {
        var status = ntohl(buf, pos);
        console.log("auth status:" + status);
    } else if (cmd == IMService.MSG_ACK) {
        var ack = ntohl(buf, pos);
        if (ack in this.messages) {
            var msg = this.messages[ack];
            if (this.observer != null && "handleMessageACK" in this.observer){
                this.observer.handleMessageACK(msg.msgLocalID, msg.receiver);
            }
            delete this.messages[ack];
        }
        if (ack in this.customerMessages) {
            var msg = this.customerMessages[ack];
            if (this.observer != null && "handleCustomerMessageACK" in this.observer){
                this.observer.handleCustomerMessageACK(msg);
            }
            delete this.customerMessages[ack];

        }
    } else {
        console.log("message command:" + cmd);
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
            this.observer.handleMessageFailure(msg.msgLocalID, msg.receiver);
        }
    }
    this.messages = {};

    for (var seq in this.customerMessages) {
        var msg = this.customerMessages[seq];
        if (this.observer != null && "handleCustomerMessageFailure" in this.observer){
            this.observer.handleCustomerMessageFailure(msg);
        }
    }
    this.customerMessages = {};

    var self = this;
    f = function() {
        self.connect();
    };
    setTimeout(f, 400);
};

IMService.prototype.sendACK = function(ack) {
    var buf = new Buffer(4);
    htonl(buf, 0, ack);
    this.send(IMService.MSG_ACK, buf);
}

IMService.prototype.sendAuth = function() {
    var buf = new Buffer(1024);
    var pos = 0;
    var len = 0;

    buf[pos] = IMService.PLATFORM_ID;
    pos++;

    len = Buffer.byteLength(this.accessToken);
    buf[pos] = len;
    pos++;
    buf.write(this.accessToken, pos);
    pos += len;

    len = Buffer.byteLength(this.device_id);
    buf[pos] = len;
    pos++;
    buf.write(this.device_id, pos);
    pos += len;

    var body = buf.slice(0, pos);

    this.send(IMService.MSG_AUTH_TOKEN, body);
}

//typeof body == uint8array
IMService.prototype.send = function (cmd, body) {
    if (this.socket == null) {
        return false;
    }
    this.seq++;

    var buf = Buffer(IMService.HEADSIZE+body.length)

    var pos = 0;
    htonl(buf, pos, body.length);
    pos += 4;

    htonl(buf, pos, this.seq);
    pos += 4;
    
    buf[pos] = cmd;
    pos++;
    buf[pos] = IMService.VERSION;
    pos++;
    
    buf.fill(2, pos, pos + 2);
    pos += 2;

    body.copy(buf, pos);
    pos += body.length;

    if (global.ArrayBuffer && buf instanceof ArrayBuffer) {
        this.socket.send(buf);
    } else {
        var dataAsBase64String = buf.toString('base64');
        var data = {base64:true, data:dataAsBase64String};
        this.socket.send(data);
    }
    return true
};

IMService.prototype.sendPeerMessage = function (msg) {
    if (this.connectState != IMService.STATE_CONNECTED) {
        return false;
    }

    var len = Buffer.byteLength(msg.content);
    var buf = new Buffer(24+len);
    var pos = 0;

    hton64(buf, pos, msg.sender);
    pos += 8;
    hton64(buf, pos, msg.receiver);
    pos += 8;
    htonl(buf, pos, msg.timestamp)
    pos += 4;
    htonl(buf, pos, msg.msgLocalID);
    pos += 4;

    len = buf.write(msg.content, pos);
    pos += len;


    var r = this.send(IMService.MSG_IM, buf);
    if (!r) {
        return false;
    }

    this.messages[this.seq] = msg;
    return true;
};


IMService.prototype.sendRTMessage = function (msg) {
    if (this.connectState != IMService.STATE_CONNECTED) {
        return false;
    }

    var len = Buffer.byteLength(msg.content);
    var buf = new Buffer(16+len);
    var pos = 0;

    hton64(buf, pos, msg.sender);
    pos += 8;
    hton64(buf, pos, msg.receiver);
    pos += 8;

    len = buf.write(msg.content, pos);
    pos += len;


    var r = this.send(IMService.MSG_RT, buf);
    if (!r) {
        return false;
    }
    return true;
};


IMService.prototype.writeCustomerMessage = function(msg) {
    var len = Buffer.byteLength(msg.content);
    var buf = new Buffer(36+len);
    var pos = 0;

    hton64(buf, pos, msg.customerAppID);
    pos += 8;
    hton64(buf, pos, msg.customerID);
    pos += 8;
    hton64(buf, pos, msg.storeID);
    pos += 8;
    hton64(buf, pos, msg.sellerID);
    pos += 8;
    htonl(buf, pos, msg.timestamp)
    pos += 4;
    buf.write(msg.content, pos);
    pos += len;
    return buf
};

IMService.prototype.sendCustomerSupportMessage = function (msg) {
    if (this.connectState != IMService.STATE_CONNECTED) {
        return false;
    }

    var buf = this.writeCustomerMessage(msg);
    var r = this.send(IMService.MSG_CUSTOMER_SUPPORT, buf);
    if (!r) {
        return false;
    }

    this.customerMessages[this.seq] = msg;
    return true;
};

IMService.prototype.sendCustomerMessage = function (msg) {
    if (this.connectState != IMService.STATE_CONNECTED) {
        return false;
    }

    var buf = this.writeCustomerMessage(msg);
    var r = this.send(IMService.MSG_CUSTOMER, buf);
    if (!r) {
        return false;
    }

    this.customerMessages[this.seq] = msg;
    return true;
};


IMService.guid = function () {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}
