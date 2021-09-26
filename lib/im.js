var order = require('./byte_order');
var utf8 = require("./utf8");

var hton64 = order.hton64;
var ntoh64 = order.ntoh64;
var htonl = order.htonl;
var ntohl = order.ntohl;

    

function IMService() {
    this.host = "imnode2.gobelieve.io";
    if (global.location && 'https:' === location.protocol) {
        this.port = 14891;
    } else {
        this.port = 13891;
    }
    this.protocol = undefined;

    this.accessToken = "";
    this.syncKey = 0;
    this.groupSyncKeys = {};

    this.peerMessageObserver = null;
    this.groupMessageObserver = null;
    this.customerMessageObserver = null;
    this.rtMessageObserver = null;
    this.systemMessageObserver = null;
    this.roomMessageObserver = null;
    this.observer = null;

    this.socket = null;
    this.connectFailCount = 0;
    this.connectState = IMService.STATE_UNCONNECTED;
    this.seq = 0;
    this.stopped = true;
    this.suspended = true;
    this.reachable = true;
    this.isBackground = false;
    
    this.roomID = 0;
    //sending message
    this.messages = {};
    this.groupMessages = {};
    this.customerMessages = {};
    this.isSyncing = false;
    this.syncTimestamp = 0;
    this.pendingSyncKey = 0;

    this.pingTimer = null;
    this.pingTimestamp = 0;
    this.ping = this.ping.bind(this);
    this.platformID = IMService.PLATFORM_WEB;
    this.deviceID = IMService.guid();
}

IMService.HEADSIZE = 12;
IMService.VERSION = 1;

IMService.STATE_UNCONNECTED = 0;
IMService.STATE_CONNECTING = 1;
IMService.STATE_CONNECTED = 2;
IMService.STATE_CONNECTFAIL = 3;
IMService.STATE_AUTHENTICATION_FAIL = 4;

IMService.ACK_TIMEOUT = 5;//ack 超时5s,主动断开socket

IMService.MSG_AUTH_STATUS = 3;
IMService.MSG_IM = 4;
IMService.MSG_ACK = 5;
IMService.MSG_RST = 6;
IMService.MSG_GROUP_NOTIFICATION = 7;
IMService.MSG_GROUP_IM = 8;
IMService.MSG_PEER_ACK = 9;
IMService.MSG_PING = 13;
IMService.MSG_PONG = 14;
IMService.MSG_AUTH_TOKEN = 15;
IMService.MSG_RT = 17;
IMService.MSG_ENTER_ROOM = 18;
IMService.MSG_LEAVE_ROOM = 19;
IMService.MSG_ROOM_IM = 20;
IMService.MSG_SYSTEM = 21;

IMService.MSG_CUSTOMER_ = 24;
IMService.MSG_CUSTOMER_SUPPORT_ = 25;

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
IMService.MSG_METADATA = 37;

IMService.MSG_CUSTOMER = 64;


//消息标志
IMService.MESSAGE_FLAG_TEXT = 1;
IMService.MESSAGE_FLAG_UNPERSISTENT = 2;
IMService.MESSAGE_FLAG_SELF = 8;
IMService.MESSAGE_FLAG_PUSH = 16;
IMService.MESSAGE_FLAG_SUPER_GROUP = 32;

IMService.PLATFORM_IOS = 1;
IMService.PLATFORM_ANDROID = 2;
IMService.PLATFORM_WEB = 3;
IMService.PLATFORM_WIN = 4;
IMService.PLATFORM_OSX = 5;

IMService.HEARTBEAT = 60*3;



IMService.prototype.handleConnectivityChange = function(reach) {
    console.log("connectivity changed:" + reach);
    this.reachable = reach && (reach.toLowerCase() == 'wifi' || reach.toLowerCase() == 'cell');

    console.log("reachable:", reach, this.reachable);
    if (this.reachable) {
        if (!this.stopped && !this.isBackground) {
            console.log("reconnect im service");
            this.suspend();
            this.resume();
        }
    } else if (!this.reachable) {
        this.suspend();
    }
}


IMService.prototype.enterBackground = function() {
    this.isBackground = true;
    if (!this.stopped) {
        this.suspend();
    }
}

IMService.prototype.enterForeground = function() {
    this.isBackground = false;
    if (!this.stopped) {
        this.resume();
    }
}

IMService.prototype.suspend = function() {
    if (this.suspended) {
        return;
    }
    console.log("suspend im service");
    this.suspended = true;

    console.log("close socket");
    var sock = this.socket;
    if (sock) {
        //trigger socket onClose event
        sock.close();
    }
    clearInterval(this.pingTimer);
    this.pingTimer = null;
}

IMService.prototype.resume = function() {
    if (!this.suspended) {
        return;
    }
    console.log("resume im service");
    this.suspended = false;

    this.connect();
    this.pingTimer = setInterval(this.ping, IMService.HEARTBEAT*1000);
}

IMService.prototype.start = function () {
    if (!this.stopped) {
        console.log("im service already be started");
        return;
    }
    console.log("start im service");
    this.stopped = false;
    this.resume();
};

IMService.prototype.stop = function () {
    if (this.stopped) {
        console.log("im service already be stopped");
        return;
    }
    console.log("stop im service");
    this.stopped = true;
    this.suspend();
};

IMService.prototype.callStateObserver = function () {
    if (this.observer && "onConnectState" in this.observer) {
        this.observer.onConnectState(this.connectState)
    }
};

IMService.prototype.connect = function () {
    if (this.stopped || this.suspended)  {
        console.log("im service stopped||suspended");
        return;
    }
    if (this.socket != null) {
        console.log("socket is't null")
        return;
    }

    this.connectState = IMService.STATE_CONNECTING;
    this.callStateObserver();

    var protocol;
    if (this.protocol) {
        protocol = this.protocol;
    } else {
        protocol = ('https:' === location.protocol) ? "wss://" : "ws://";
    }
    var url = protocol + this.host + ":" + this.port.toString() + "/ws" ;
    console.log("connect protocol:", protocol, " host:", this.host, " port:", this.port);
    
    var BrowserWebSocket = global.WebSocket || global.MozWebSocket;    
    this.socket = new BrowserWebSocket(url);
    this.socket.binaryType = 'arraybuffer';
    
    var self = this;
    this.socket.onopen = function(evt) {
        self.onOpen();
    }

    this.socket.onerror = function(event) {
        self.onError(event);        
    };    
};

IMService.prototype.ping = function () {
    if (this.connectState != IMService.STATE_CONNECTED) {
        return false;
    }
    console.log("ping...");
    this.sendPing()
    if (this.pingTimestamp == 0) {
        this.pingTimestamp = Math.floor(new Date().getTime()/1000);
    }

    var self = this;
    setTimeout(function() {
        var now = Math.floor(new Date().getTime()/1000);
        if (self.pingTimestamp > 0 && now - self.pingTimestamp >= 3) {
            console.log("ping timeout");
            if (self.connectState == IMService.STATE_CONNECTED) {
                //trigger close event                
                self.socket.close();
                self.socket = null;
            }
        }
    }, 3100);
}

IMService.prototype.onOpen = function () {
    console.log("socket opened");
    var self = this;
    this.socket.onmessage = function(message) {
        self.onMessage(message.data)
    };
    this.socket.onclose = function(e) {
        console.log("socket disconnect:", e);
        self.onClose();
    };

    this.seq = 0;
    this.connectState = IMService.STATE_CONNECTED;
    this.metaMessage = undefined;
    
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

    this.callStateObserver();    
};

IMService.prototype.handleACK = function(msg) {
    var ack = msg.ack;
    if (ack in this.messages) {
        var m = this.messages[ack];
        delete(m.__sendTimestamp__);
        if (this.peerMessageObserver && "handlePeerMessageACK" in this.peerMessageObserver){
            this.peerMessageObserver.handlePeerMessageACK(m);
        }
        delete this.messages[ack];
    }
    if (ack in this.customerMessages) {
        var m = this.customerMessages[ack];
        delete(m.__sendTimestamp__);
        if (this.customerMessageObserver && "handleCustomerMessageACK" in this.customerMessageObserver){
            this.customerMessageObserver.handleCustomerMessageACK(m);
        }
        delete this.customerMessages[ack];
    }

    var groupMessage;
    for (ack in this.groupMessages) {
        var m = this.groupMessages[ack];
        delete(m.__sendTimestamp__);
        if (this.groupMessageObserver && "handleGroupMessageACK" in this.groupMessageObserver){
            this.groupMessageObserver.handleGroupMessageACK(m);
        }
        groupMessage = m;
        delete this.groupMessages[ack];
    }


    var metaMessage = this.metaMessage;
    var metadata;
    this.metaMessage = undefined;

    if (metaMessage && metaMessage.seq + 1 == msg.seq) {
        metadata = metaMessage;

        if (metadata.prevSyncKey == 0 || metadata.syncKey == 0) {
            return;
        }

        var newSyncKey = metadata.syncKey;

        if (msg.flag & IMService.MESSAGE_FLAG_SUPER_GROUP) {
            if (!groupMessage) {
                return;
            }
            var groupID = groupMessage.receiver;
            var groupSyncKey = 0;
            if (groupID in this.groupSyncKeys) {
                groupSyncKey = this.groupSyncKeys[groupID];
            }

            if (metadata.prevSyncKey == groupSyncKey && newSyncKey != groupSyncKey) {
                this.groupSyncKeys[groupID] = newSyncKey;
                this.sendGroupSyncKey(groupID, newSyncKey);
                if (this.observer &&
                    "saveSuperGroupSyncKey" in this.observer) {
                    this.observer.saveSuperGroupSyncKey(groupID, newSyncKey);
                }
            }
        } else {
            if (this.syncKey == metadata.prevSyncKey && newSyncKey != this.syncKey) {
                this.syncKey = newSyncKey;
                this.sendSyncKey(this.syncKey);

                if (this.observer &&
                    "saveSyncKey" in this.observer){
                    this.observer.saveSyncKey(this.syncKey);
                }                
            }
        }
    }    
};

IMService.prototype.handleMessage = function(msg) {
    var seq = msg.seq;
    var cmd = msg.cmd;

    console.log("handle message:", msg);
    //处理服务器推到客户端的消息
    if (msg.flag & IMService.MESSAGE_FLAG_PUSH) {
        var metaMessage =  this.metaMessage;
        this.metaMessage = undefined;
        var metadata;
        if (metaMessage && metaMessage.seq + 1 == msg.seq) {
            metadata = metaMessage;
        } else {
            return;
        }

        if (metadata.prevSyncKey == 0 || metadata.syncKey == 0) {
            return;
        }
        
        //校验metadata中的synckey是否连续        
        if (msg.flag & IMService.MESSAGE_FLAG_SUPER_GROUP) {
            var groupID;
            if (cmd == IMService.MSG_GROUP_IM) {
                groupID = msg.receiver;
            } else {
                return;
            }
            
            var groupSyncKey = 0;
            if (groupID in this.groupSyncKeys) {
                groupSyncKey = this.groupSyncKeys[groupID];
            }

            if (metadata.prevSyncKey != groupSyncKey) {
                console.log("sync key is not sequence:", metadata.prevSyncKey, "----", groupSyncKey);
                return;
            }
        } else {
            if (metadata.prevSyncKey != this.syncKey) {
                console.log("sync key is not sequence:", metadata.prevSyncKey, "----", this.syncKey);
                return;
            }
        }
    }
    
    if (cmd == IMService.MSG_IM) {
          console.log("im message sender:" + msg.sender +" receiver:" + msg.receiver + "content:" + msg.content);

        if (this.peerMessageObserver) {
            this.peerMessageObserver.handlePeerMessage(msg);
        }

        this.sendACK(seq);
    } else if (cmd == IMService.MSG_GROUP_IM) {
        console.log("im message sender:" + msg.sender +" receiver:" + msg.receiver + "content:" + msg.content);

        if (this.groupMessageObserver) {
            this.groupMessageObserver.handleGroupMessage(msg);
        }

        this.sendACK(seq);
    } else if (cmd == IMService.MSG_GROUP_NOTIFICATION) {
        if (this.groupMessageObserver && "handleGroupNotification" in this.groupMessageObserver) {
            this.groupMessageObserver.handleGroupNotification(msg.content);
        }    
        this.sendACK(seq);
    } else if (cmd == IMService.MSG_CUSTOMER) {
        console.log("customer message sender appid:" + msg.senderAppID +
            " sender id:" + msg.sender + " receiver appid:" + msg.receiverAppID + " receiver id:" +
            msg.receiver + "content:" + msg.content);

        if (this.customerMessageObserver && "handleCustomerMessage" in this.customerMessageObserver) {
            this.customerMessageObserver.handleCustomerMessage(msg);
        }

        this.sendACK(seq);
    } else if (cmd == IMService.MSG_RT) {
        console.log("rt message sender:" + msg.sender +" receiver:" + msg.receiver + "content:" + msg.content);

        if (this.rtMessageObserver) {
            this.rtMessageObserver.handleRTMessage(msg);
        }
    } else if (cmd == IMService.MSG_ROOM_IM) {
  
        console.log("room message sender:" + msg.sender +" receiver:" + msg.receiver + "content:" + msg.content);

        if (this.roomMessageObserver) {
            this.roomMessageObserver.handleRoomMessage(msg);
        }
    } else if (cmd == IMService.MSG_AUTH_STATUS) {
        var status = msg.status;
        console.log("auth status:" + status);
        if (status != 0) {
            this.connectState = IMService.STATE_AUTHENTICATION_FAIL;
            this.callStateObserver();
        } else {
            this.connectFailCount = 0;
        }
    } else if (cmd == IMService.MSG_ACK) {
        this.handleACK(msg);
    } else if (cmd == IMService.MSG_SYNC_NOTIFY) {
        var newSyncKey = msg.syncKey
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
        var newSyncKey = msg.syncKey;
        console.log("sync begin:" + newSyncKey);
        
    } else if (cmd == IMService.MSG_SYNC_END) {
        var newSyncKey = msg.syncKey;
        
        console.log("sync end:" + newSyncKey);
        if (newSyncKey != this.syncKey) {
            this.syncKey = newSyncKey;
            this.sendSyncKey(this.syncKey);

            if (this.observer &&
                "saveSyncKey" in this.observer){
                this.observer.saveSyncKey(this.syncKey);
            }
        }

        if (this.observer &&
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
        var groupID = msg.groupID;
        var newSyncKey = msg.syncKey;
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
        var groupID = msg.groupID;
        var newSyncKey = msg.syncKey;
        console.log("sync group begin:" + groupID + 
                    " sync key: " + newSyncKey);
        
    } else if (cmd == IMService.MSG_SYNC_GROUP_END) {
        var groupID = msg.groupID;
        var newSyncKey = msg.syncKey;        
        console.log("sync group end:" + groupID + 
                    " sync key: " + newSyncKey);

        var groupSyncKey = 0;
        if (groupID in this.groupSyncKeys) {
            groupSyncKey = this.groupSyncKeys[groupID];
        }
        if (newSyncKey != groupSyncKey) {
            this.groupSyncKeys[groupID] = newSyncKey;
            this.sendGroupSyncKey(groupID, newSyncKey);
            if (this.observer &&
                "saveSuperGroupSyncKey" in this.observer) {
                this.observer.saveSuperGroupSyncKey(groupID, newSyncKey);
            }
        }
    } else if (cmd == IMService.MSG_SYSTEM) {
        var content = msg.content;
        if (this.systemMessageObserver) {
            this.systemMessageObserver.handleSystemMessage(content);
        }
    } else if (cmd == IMService.MSG_NOTIFICATION) {
        var content = msg.content;
        if (this.observer &&
            "handleNotification" in this.observer) {
            this.observer.handleNotification(content);
        }
    } else if (cmd == IMService.MSG_METADATA) {
        this.metaMessage = msg;
    } else if (cmd == IMService.MSG_PONG) {
        console.log("pong");
        this.pingTimestamp = 0;
    } else {
        console.log("message command:" + cmd);
    }

    if (msg.flag & IMService.MESSAGE_FLAG_PUSH) {
        var newSyncKey = metadata.syncKey;
        if (msg.flag & IMService.MESSAGE_FLAG_SUPER_GROUP) {
            var groupID;
            if (cmd == IMService.MSG_GROUP_IM) {
                groupID = msg.receiver;
            } else {
                return;
            }

            this.groupSyncKeys[groupID] = newSyncKey;
            this.sendGroupSyncKey(groupID, newSyncKey);
            if (this.observer &&
                "saveSuperGroupSyncKey" in this.observer) {
                this.observer.saveSuperGroupSyncKey(groupID, newSyncKey);
            }
        } else {
            this.syncKey = newSyncKey;
            this.sendSyncKey(this.syncKey);

            if (this.observer &&
                "saveSyncKey" in this.observer){
                this.observer.saveSyncKey(this.syncKey);
            }            
        }
    }
};

IMService.prototype.onMessage = function (data) {
    var buf;
    if (global.ArrayBuffer && data instanceof ArrayBuffer) {
        buf = new Uint8Array(data);
    } else {
        console.log("invalid data type:" + typeof data);
        return;
    }

    var len = ntohl(buf, 0);
    var seq = ntohl(buf, 4);
    var cmd = buf[8];
    var flag = buf[10];
    var isSelf = !!(flag & IMService.MESSAGE_FLAG_SELF);
    
    if (len + IMService.HEADSIZE < buf.length) {
        console.log("invalid data length:" + buf.length + " " + len+IMService.HEADSIZE);
        return;
    }

    var pos = IMService.HEADSIZE;

    var msg = {}
    msg.seq = seq;
    msg.cmd = cmd;
    msg.flag = flag;
    if (cmd == IMService.MSG_IM) {
        msg.isSelf = isSelf;
        
        msg.sender = ntoh64(buf, pos);
        pos += 8;

        msg.receiver = ntoh64(buf, pos);
        pos += 8;
        
        msg.timestamp = ntohl(buf, pos);
        pos += 4;

        //msgid
        pos += 4;

        msg.content = utf8.decodeUTF8(buf.subarray(IMService.HEADSIZE + 24, IMService.HEADSIZE + len));
    } else if (cmd == IMService.MSG_GROUP_IM) {
        msg.isSelf = isSelf;
        
        msg.sender = ntoh64(buf, pos);
        pos += 8;

        msg.receiver = ntoh64(buf, pos);
        pos += 8;
        
        msg.timestamp = ntohl(buf, pos);
        pos += 4;

        //msgid
        pos += 4;

        msg.content = utf8.decodeUTF8(buf.subarray(IMService.HEADSIZE + 24, IMService.HEADSIZE + len));
    } else if (cmd == IMService.MSG_GROUP_NOTIFICATION) {
        msg.content = utf8.decodeUTF8(buf.subarray(IMService.HEADSIZE, IMService.HEADSIZE + len));
    } else if (cmd == IMService.MSG_CUSTOMER) {
        msg.isSelf = isSelf;
        
        msg.senderAppID = ntoh64(buf, pos);
        pos += 8;

        msg.sender = ntoh64(buf, pos);
        pos += 8;

        msg.receiverAppID = ntoh64(buf, pos);
        pos += 8;

        msg.receiver = ntoh64(buf, pos);
        pos += 8;

        msg.timestamp = ntohl(buf, pos);
        pos += 4;

        msg.content = utf8.decodeUTF8(buf.slice(IMService.HEADSIZE + 36, IMService.HEADSIZE + len));

    } else if (cmd == IMService.MSG_RT) {
        msg.sender = ntoh64(buf, pos);
        pos += 8;

        msg.receiver = ntoh64(buf, pos);
        pos += 8;

        msg.content = utf8.decodeUTF8(buf.subarray(IMService.HEADSIZE + 16, IMService.HEADSIZE + len));
    } else if (cmd == IMService.MSG_ROOM_IM) {
        msg.sender = ntoh64(buf, pos);
        pos += 8;

        msg.receiver = ntoh64(buf, pos);
        pos += 8;

        msg.content = utf8.decodeUTF8(buf.subarray(IMService.HEADSIZE + 16, IMService.HEADSIZE + len));
    } else if (cmd == IMService.MSG_AUTH_STATUS) {
        msg.status = ntohl(buf, pos);
    } else if (cmd == IMService.MSG_ACK) {
        msg.ack = ntohl(buf, pos);
    } else if (cmd == IMService.MSG_SYNC_NOTIFY) {
        msg.syncKey = ntoh64(buf, pos);
        pos += 8;
    } else if (cmd == IMService.MSG_SYNC_BEGIN) {
        msg.syncKey = ntoh64(buf, pos);
        pos += 8;
    } else if (cmd == IMService.MSG_SYNC_END) {
        msg.syncKey = ntoh64(buf, pos);
        pos += 8;
    } else if (cmd == IMService.MSG_SYNC_GROUP_NOTIFY) {
        msg.groupID = ntoh64(buf, pos)
        pos += 8;
        msg.syncKey = ntoh64(buf, pos);
        pos += 8;
    } else if (cmd == IMService.MSG_SYNC_GROUP_BEGIN) {
        msg.groupID = ntoh64(buf, pos);
        pos += 8;
        msg.syncKey = ntoh64(buf, pos);
        pos += 8;
    } else if (cmd == IMService.MSG_SYNC_GROUP_END) {
        msg.groupID = ntoh64(buf, pos);
        pos += 8;
        msg.syncKey = ntoh64(buf, pos);
        pos += 8;
    } else if (cmd == IMService.MSG_SYSTEM) {
        msg.content = utf8.decodeUTF8(buf.subarray(IMService.HEADSIZE, IMService.HEADSIZE + len));
    } else if (cmd == IMService.MSG_NOTIFICATION) {
        msg.content = utf8.decodeUTF8(buf.subarray(IMService.HEADSIZE, IMService.HEADSIZE + len));
    } else if (cmd == IMService.MSG_METADATA) {
        msg.syncKey = ntoh64(buf, pos)
        pos += 8;
        msg.prevSyncKey = ntoh64(buf, pos);
        pos += 8;
    } else {
        console.log("message command:" + cmd);
    }

    this.handleMessage(msg);
};

IMService.prototype.onError = function (err) {
    console.log("socket err:" + err);
    this.socket.close();
    this.socket = null;
    this.connectFailCount++;
    this.connectState = IMService.STATE_CONNECTFAIL;
    this.callStateObserver();

    var self = this;
    var f = function() {
        self.connect()
    };

    var timeout = this.connectFailCount*1000;
    if (this.connetFailCount > 60) {
        timeout = 60*1000;
    }
    setTimeout(f, timeout);
};

IMService.prototype.onClose = function() {
    console.log("on socket close");
    this.socket = null;
    this.connectState = IMService.STATE_UNCONNECTED;
    this.callStateObserver();

    if (this.metaMessage) {
        console.log("socket closed, meta message:", this.metaMessage);
        this.metaMessage = undefined;
    }
    
    for (let seq in this.messages) {
        let msg = this.messages[seq];
        delete(msg.__sendTimestamp__);
        if (this.peerMessageObserver && "handlePeerMessageFailure" in this.peerMessageObserver){
            this.peerMessageObserver.handlePeerMessageFailure(msg);
        }
    }
    this.messages = {};

    for (let seq in this.groupMessages) {
        let msg = this.groupMessages[seq];
        delete(msg.__sendTimestamp__);
        if (this.groupMessageObserver && "handleGroupMessageFailure" in this.groupMessageObserver){
            this.groupMessageObserver.handleGroupMessageFailure(msg);
        }
    }
    this.groupMessages = {};
    
    for (let seq in this.customerMessages) {
        let msg = this.customerMessages[seq];
        delete(msg.__sendTimestamp__);
        if (this.customerMessageObserver && "handleCustomerMessageFailure" in this.customerMessageObserver){
            this.customerMessageObserver.handleCustomerMessageFailure(msg);
        }
    }
    this.customerMessages = {};

    var self = this;
    var f = function() {
        self.connect();
    };
    
    var timeout = this.connectFailCount*1000;
    if (this.connetFailCount > 60) {
        timeout = 60*1000;
    } else if (this.connectFailCount == 0) {
        timeout = 400
    }
    setTimeout(f, timeout);
};

IMService.prototype.sendSync = function(syncKey) {
    var buf = new Uint8Array(8);
    hton64(buf, 0, syncKey);
    this.send(IMService.MSG_SYNC, buf);
}


IMService.prototype.sendSyncKey = function(syncKey) {
    var buf = new Uint8Array(8);
    hton64(buf, 0, syncKey);
    this.send(IMService.MSG_SYNC_KEY, buf);
}

IMService.prototype.sendGroupSync = function(groupID, syncKey) {
    var buf = new Uint8Array(16);
    hton64(buf, 0, groupID);
    hton64(buf, 8, syncKey);
    this.send(IMService.MSG_SYNC_GROUP, buf);
}


IMService.prototype.sendGroupSyncKey = function(groupID, syncKey) {
    var buf = new Uint8Array(16);
    hton64(buf, 0, groupID);
    hton64(buf, 8, syncKey);
    this.send(IMService.MSG_GROUP_SYNC_KEY, buf);
}

IMService.prototype.sendACK = function(ack) {
    var buf = new Uint8Array(4);
    htonl(buf, 0, ack);
    this.send(IMService.MSG_ACK, buf);
}

IMService.prototype.sendAuth = function() {
    var buf = new Uint8Array(1024);
    var pos = 0;
    var len = 0;

    buf[pos] = this.platformID;
    pos++;

    var accessToken = utf8.encodeUTF8(this.accessToken);
    len = accessToken.length;
    buf[pos] = len;
    pos++;
    buf.set(accessToken, pos);
    pos += len;

    var deviceId = utf8.encodeUTF8(this.deviceID);
    len = deviceId.length;
    buf[pos] = len;
    pos++;
    buf.set(deviceId, pos);
    pos += len;

    var body = buf.subarray(0, pos);

    this.send(IMService.MSG_AUTH_TOKEN, body);
}

IMService.prototype.sendPing = function() {
    var body = new Uint8Array(0);
    this.send(IMService.MSG_PING, body);
}


//typeof body == uint8array
IMService.prototype.send = function (cmd, body, nonpersistent) {
    if (this.socket == null) {
        return false;
    }
    if (this.connectState != IMService.STATE_CONNECTED) {
        return false;
    }
    
    this.seq++;

    var buf = new Uint8Array(IMService.HEADSIZE+body.length);

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

    buf[pos] = 0;
    pos++;

    buf.set(body, pos);
    pos += body.length;
    
    this.socket.send(buf.buffer);        
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

    var content = utf8.encodeUTF8(msg.content)
    var len = content.length;
    var buf = new Uint8Array(24+len);
    var pos = 0;
    var ts = msg.timestamp || 0;
    var msgId = msg.msgLocalID || 0;    

    hton64(buf, pos, msg.sender);
    pos += 8;
    hton64(buf, pos, msg.receiver);
    pos += 8;
    htonl(buf, pos, ts);
    pos += 4;
    htonl(buf, pos, msgId);
    pos += 4;

    buf.set(content, pos);
    pos += len;
    
    var r = this.send(IMService.MSG_IM, buf);
    if (!r) {
        return false;
    }

    var now = new Date().getTime() / 1000;
    msg.__sendTimestamp__ = now;
    this.messages[this.seq] = msg;
    
    var self = this;
    var t = IMService.ACK_TIMEOUT*1000+100;
    setTimeout(function() {
        self.checkAckTimeout();
    }, t);
    return true;
};


IMService.prototype.sendGroupMessage = function (msg) {
    if (this.connectState != IMService.STATE_CONNECTED) {
        return false;
    }

    var content = utf8.encodeUTF8(msg.content);
    var len = content.length;
    var buf = new Uint8Array(24+len);
    var pos = 0;
    var ts = msg.timestamp || 0;
    var msgId = msg.msgLocalID || 0;    

    hton64(buf, pos, msg.sender);
    pos += 8;
    hton64(buf, pos, msg.receiver);
    pos += 8;
    htonl(buf, pos, ts);
    pos += 4;
    htonl(buf, pos, msgId);
    pos += 4;

    len = buf.set(content, pos);
    pos += len;


    var r = this.send(IMService.MSG_GROUP_IM, buf);
    if (!r) {
        return false;
    }

    var now = new Date().getTime() / 1000;
    msg.__sendTimestamp__ = now;    
    this.groupMessages[this.seq] = msg;

    var self = this;
    var t = IMService.ACK_TIMEOUT*1000+100;
    setTimeout(function() {
        self.checkAckTimeout();
    }, t);
    
    return true;
};



IMService.prototype.sendRTMessage = function (msg) {
    if (this.connectState != IMService.STATE_CONNECTED) {
        return false;
    }
    console.log("send rt message:" + msg.sender + " receiver:" + msg.receiver + "content:" + msg.content);
    var content = utf8.encodeUTF8(msg.content);
    var len = content.length;
    var buf = new Uint8Array(16+len);
    var pos = 0;

    hton64(buf, pos, msg.sender);
    pos += 8;
    hton64(buf, pos, msg.receiver);
    pos += 8;

    len = buf.set(content, pos);
    pos += len;

    var r = this.send(IMService.MSG_RT, buf);
    if (!r) {
        return false;
    }
    return true;
};

IMService.prototype.sendEnterRoom = function(roomID) {
    var buf = new Uint8Array(8);
    hton64(buf, 0, roomID);
    this.send(IMService.MSG_ENTER_ROOM, buf);
}

IMService.prototype.sendLeaveRoom = function(roomID) {
    var buf = new Uint8Array(8);
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
    var content = utf8.encodeUTF8(msg.content);
    var len = content.length;
    var buf = new Uint8Array(16+len);
    var pos = 0;

    hton64(buf, pos, msg.sender);
    pos += 8;
    hton64(buf, pos, msg.receiver);
    pos += 8;

    len = buf.set(content, pos);
    pos += len;

    var r = this.send(IMService.MSG_ROOM_IM, buf);
    if (!r) {
        return false;
    }
    return true;
}

IMService.prototype.writeCustomerMessage = function(msg) {
    var content = utf8.encodeUTF8(msg.content);    
    var len = content.length;
    var buf = new Uint8Array(36+len);
    var pos = 0;

    hton64(buf, pos, msg.senderAppID);
    pos += 8;
    hton64(buf, pos, msg.sender);
    pos += 8;
    hton64(buf, pos, msg.receiverAppID);
    pos += 8;
    hton64(buf, pos, msg.receiver);
    pos += 8;
    var ts = msg.timestamp || 0;
    htonl(buf, pos, ts);
    pos += 4;
    buf.set(content, pos);
    pos += len;
    return buf
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
    
    var now = new Date().getTime() / 1000;
    msg.__sendTimestamp__ = now;    
    this.customerMessages[this.seq] = msg;
    
    var self = this;
    var t = IMService.ACK_TIMEOUT*1000+100;
    setTimeout(function() {
        self.checkAckTimeout();
    }, t);
    
    return true;
};

//检查是否有消息ack超时
IMService.prototype.checkAckTimeout = function() {
    var now = new Date().getTime() / 1000;
    var isTimeout = false;
    var ack;
    for (ack in this.messages) {
        var msg = this.messages[ack];
        if (now - msg.__sendTimestamp__ >= IMService.ACK_TIMEOUT) {
            isTimeout = true;
        }
    }
    for (ack in this.groupMessages) {
        var msg = this.groupMessages[ack];
        if (now - msg.__sendTimestamp__ >= IMService.ACK_TIMEOUT) {
            isTimeout = true;
        }
    }
    for (ack in this.customerMessages) {
        var msg = this.customerMessages[ack];
        if (now - msg.__sendTimestamp__ >= IMService.ACK_TIMEOUT) {
            isTimeout = true;
        }
    }

    if (isTimeout) {
        console.log("ack timeout, close socket");
        this.onClose();
    }
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

module.exports = IMService;
