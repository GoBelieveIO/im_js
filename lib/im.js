var Buffer = require('buffer/').Buffer;
var eio = require('engine.io-client');
var order = require('./byte_order');
var hton64 = order.hton64;
var ntoh64 = order.ntoh64;
var htonl = order.htonl;
var ntohl = order.ntohl;

module.exports = IMService;

function IMService() {
    this.host = "imnode2.gobelieve.io";
    if (global.location && 'https:' === location.protocol) {
        this.port = 14890;
    } else {
        this.port = 13890;
    }

    this.accessToken = "";
    this.syncKey = 0;
    this.groupSyncKeys = {};

    this.observer = null;
    this.voipObserver = null;

    this.socket = null;
    this.connectFailCount = 0;
    this.connectState = IMService.STATE_UNCONNECTED;
    this.seq = 0;
    this.stopped = true;
    this.roomID = 0;
    //sending message
    this.messages = {};
    this.groupMessages = {};
    this.customerMessages = {};
    this.isSyncing = false;
    this.syncTimestamp = 0;
    this.pendingSyncKey = 0;
    
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
IMService.MSG_GROUP_NOTIFICATION = 7;
IMService.MSG_GROUP_IM = 8;
IMService.MSG_PEER_ACK = 9;
IMService.MSG_AUTH_TOKEN = 15;
IMService.MSG_RT = 17;
IMService.MSG_ENTER_ROOM = 18;
IMService.MSG_LEAVE_ROOM = 19;
IMService.MSG_ROOM_IM = 20;
IMService.MSG_SYSTEM = 21;

IMService.MSG_CUSTOMER = 24;
IMService.MSG_CUSTOMER_SUPPORT = 25;

IMService.MSG_SYNC = 26;
IMService.MSG_SYNC_BEGIN = 27;
IMService.MSG_SYNC_END = 28;
IMService.MSG_SYNC_NOTIFY = 29;
IMService.MSG_SYNC_GROUP = 30;
IMService.MSG_SYNC_GROUP_BEGIN = 31;
IMService.MSG_SYNC_GROUP_END = 32;
IMService.MSG_SYNC_GROUP_NOTIFY = 33;
IMService.MSG_SYNC_KEY = 34;
IMService.MSG_GROUP_SYNC_KEY = 35;

IMService.MSG_NOTIFICATION = 36;

//消息标志
IMService.MESSAGE_FLAG_TEXT = 1;
IMService.MESSAGE_FLAG_UNPERSISTENT = 2;

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
    if (this.roomID > 0) {
        this.sendEnterRoom(this.roomID);
    }
    this.sendSync(this.syncKey);
    this.isSyncing = true;
    var now = new Date().getTime() / 1000;    
    this.syncTimestamp = now;
    this.pendingSyncKey = 0;
    
    for (var groupID in this.groupSyncKeys) {
        var s = this.groupSyncKeys[groupID];
        this.sendGroupSync(groupID, s);
    }

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
    var flag = buf[10];
    
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
    } else if (cmd == IMService.MSG_GROUP_IM) {
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

        if (this.observer != null && "handleGroupMessage" in this.observer) {
            this.observer.handleGroupMessage(msg);
        }

        this.sendACK(seq);
    } else if (cmd == IMService.MSG_GROUP_NOTIFICATION) {
        msg = buf.toString("utf8", IMService.HEADSIZE, IMService.HEADSIZE + len);    
        if (this.observer != null && "handleGroupNotification" in this.observer) {
            this.observer.handleGroupNotification(msg);
        }    
        this.sendACK(seq);
    } else if (cmd == IMService.MSG_CUSTOMER) {
        var msg = {}
        
        msg.flag = flag;
        
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
    } else if (cmd == IMService.MSG_ROOM_IM) {
        var msg = {}
        msg.sender = ntoh64(buf, pos);
        pos += 8;

        msg.receiver = ntoh64(buf, pos);
        pos += 8;

        msg.content = buf.toString("utf8", IMService.HEADSIZE + 16, IMService.HEADSIZE + len);

        console.log("room message sender:" + msg.sender +" receiver:" + msg.receiver + "content:" + msg.content);

        if (this.observer != null && "handleRoomMessage" in this.observer) {
            this.observer.handleRoomMessage(msg);
        }
    } else if (cmd == IMService.MSG_CUSTOMER_SUPPORT) {
        var msg = {}
        
        msg.flag = flag;
        
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
                this.observer.handleMessageACK(msg);
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

        for (ack in this.groupMessages) {
            var msg = this.groupMessages[ack];
            if (this.observer != null && "handleGroupMessageACK" in this.observer){
                this.observer.handleGroupMessageACK(msg);
            }
            delete this.groupMessages[ack];
        }

    } else if (cmd == IMService.MSG_SYNC_NOTIFY) {
        newSyncKey = ntoh64(buf, pos);
        pos += 8;
        console.log("sync notify:" + newSyncKey);

        var now = new Date().getTime() / 1000;
        var isSyncing = this.isSyncing && (now - this.syncTimestamp < 4);
        if (!isSyncing && this.syncKey < newSyncKey) {
            this.sendSync(this.syncKey);
            this.isSyncing = true;
            this.syncTimestamp = now;
            this.pendingSyncKey = 0;
        } else if (newSyncKey > this.pendingSyncKey) {
            this.pendingSyncKey = newSyncKey;
        }
    } else if (cmd == IMService.MSG_SYNC_BEGIN) {
        newSyncKey = ntoh64(buf, pos);
        pos += 8;

        console.log("sync begin:" + newSyncKey);

    } else if (cmd == IMService.MSG_SYNC_END) {
        newSyncKey = ntoh64(buf, pos);
        pos += 8;
        
        console.log("sync end:" + newSyncKey);
        if (newSyncKey != this.syncKey) {
            this.syncKey = newSyncKey;
            this.sendSyncKey(this.syncKey);

            if (this.observer != null &&
                "saveSyncKey" in this.observer){
                this.observer.saveSyncKey(this.syncKey);
            }
        }

        if (this.observer != null &&
            "handleSyncEnd" in this.observer) {
            this.observer.handleSyncEnd(this.syncKey);
        }

        var now = new Date().getTime() / 1000;
        this.isSyncing = false;
        if (this.pendingSyncKey > this.syncKey) {
            this.sendSync(this.syncKey);
            this.isSyncing = true;
            this.syncTimestamp = now;
            this.pendingSyncKey = 0;
        }
    } else if (cmd == IMService.MSG_SYNC_GROUP_NOTIFY) {
        var groupID = ntoh64(buf, pos)
        pos += 8;
        var newSyncKey = ntoh64(buf, pos);
        pos += 8;

        console.log("sync group notify:" + groupID + 
                    " sync key: " + newSyncKey);
        
        var groupSyncKey = 0;
        if (groupID in this.groupSyncKeys) {
            groupSyncKey = this.groupSyncKeys[groupID];
        }
        if (newSyncKey > groupSyncKey) {
            this.sendGroupSync(groupID, this.groupSyncKeys[groupID]);
        }
    } else if (cmd == IMService.MSG_SYNC_GROUP_BEGIN) {
        var groupID = ntoh64(buf, pos)
        pos += 8;
        var newSyncKey = ntoh64(buf, pos);
        pos += 8;

        console.log("sync group begin:" + groupID + 
                    " sync key: " + newSyncKey);
     
    } else if (cmd == IMService.MSG_SYNC_GROUP_END) {
        var groupID = ntoh64(buf, pos)
        pos += 8;
        var newSyncKey = ntoh64(buf, pos);
        pos += 8;

        console.log("sync group end:" + groupID + 
                    " sync key: " + newSyncKey);

        var groupSyncKey = 0;
        if (groupID in this.groupSyncKeys) {
            groupSyncKey = this.groupSyncKeys[groupID];
        }
        if (newSyncKey > groupSyncKey) {
            this.groupSyncKeys[groupID] = newSyncKey;
            this.sendGroupSyncKey(groupID, newSyncKey);
            if (this.observer != null &&
                "saveSuperGroupSyncKey" in this.observer) {
                this.observer.saveSuperGroupSyncKey(groupID, newSyncKey);
            }
        }
    } else if (cmd == IMService.MSG_SYSTEM) {
        var content = buf.toString("utf8", IMService.HEADSIZE, IMService.HEADSIZE + len);
        if (this.observer != null &&
            "handleSystemMessage" in this.observer) {
            this.observer.handleSystemMessage(content);
        }
    } else if (cmd == IMService.MSG_NOTIFICATION) {
        var content = buf.toString("utf8", IMService.HEADSIZE, IMService.HEADSIZE + len);
        if (this.observer != null &&
            "handleNotification" in this.observer) {
            this.observer.handleNotification(content);
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
            this.observer.handleMessageFailure(msg);
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

    for (var seq in this.groupMessages) {
        var msg = this.groupMessages[seq];
        if (this.observer != null && "handleGroupMessageFailure" in this.observer){
            this.observer.handleGroupMessageFailure(msg);
        }
    }
    this.groupMessages = {};

    var self = this;
    f = function() {
        self.connect();
    };
    setTimeout(f, 400);
};

IMService.prototype.sendSync = function(syncKey) {
    var buf = new Buffer(8);
    hton64(buf, 0, syncKey);
    this.send(IMService.MSG_SYNC, buf);
}


IMService.prototype.sendSyncKey = function(syncKey) {
    var buf = new Buffer(8);
    hton64(buf, 0, syncKey);
    this.send(IMService.MSG_SYNC_KEY, buf);
}

IMService.prototype.sendGroupSync = function(groupID, syncKey) {
    var buf = new Buffer(16);
    hton64(buf, 0, groupID);
    hton64(buf, 8, syncKey);
    this.send(IMService.MSG_SYNC_GROUP, buf);
}


IMService.prototype.sendGroupSyncKey = function(groupID, syncKey) {
    var buf = new Buffer(16);
    hton64(buf, 0, groupID);
    hton64(buf, 8, syncKey);
    this.send(IMService.MSG_GROUP_SYNC_KEY, buf);
}

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
IMService.prototype.send = function (cmd, body, nonpersistent) {
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

    if (nonpersistent) {
        buf[pos] = IMService.MESSAGE_FLAG_UNPERSISTENT;
    } else {
        buf[pos] = 0;
    }
    pos++;
    
    buf.fill(2, pos, pos + 1);
    pos++;

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



IMService.prototype.addSuperGroupSyncKey = function(groupID, syncKey) {
    this.groupSyncKeys[groupID] = syncKey;
};

IMService.prototype.removeSuperGroupSyncKey = function(groupID) {
    delete this.groupSyncKeys[groupID];  
};

IMService.prototype.clearSuperGroupSyncKey = function() {
    this.groupSyncKeys = {};
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


IMService.prototype.sendGroupMessage = function (msg) {
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


    var r = this.send(IMService.MSG_GROUP_IM, buf);
    if (!r) {
        return false;
    }

    this.groupMessages[this.seq] = msg;
    return true;
};



IMService.prototype.sendRTMessage = function (msg) {
    if (this.connectState != IMService.STATE_CONNECTED) {
        return false;
    }
    console.log("send rt message:" + msg.sender + " receiver:" + msg.receiver + "content:" + msg.content);
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

IMService.prototype.sendEnterRoom = function(roomID) {
    var buf = new Buffer(8);
    hton64(buf, 0, roomID);
    this.send(IMService.MSG_ENTER_ROOM, buf);
}

IMService.prototype.sendLeaveRoom = function(roomID) {
    var buf = new Buffer(8);
    hton64(buf, 0, roomID);
    this.send(IMService.MSG_LEAVE_ROOM, buf);
}

IMService.prototype.enterRoom = function(roomID) {
    if (roomID == 0) {
        return;
    }
    this.roomID = roomID;
    this.sendEnterRoom(this.roomID);
}

IMService.prototype.leaveRoom = function(roomID) {
    if (roomID != self.roomID || roomID == 0) {
        return;
    }

    this.sendLeaveRoom(this.roomID);
    this.roomID = 0;
}

IMService.prototype.sendRoomMessage = function (msg) {
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


    var r = this.send(IMService.MSG_ROOM_IM, buf);
    if (!r) {
        return false;
    }
    return true;
}

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
    var r = this.send(IMService.MSG_CUSTOMER_SUPPORT, buf, msg.nonpersistent);
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
    var r = this.send(IMService.MSG_CUSTOMER, buf, msg.nonpersistent);
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
