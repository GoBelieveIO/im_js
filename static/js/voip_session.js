function VOIPSession(im) {
    VOIPStream.call(this);
    this.im = im;
    this.state = VOIPSession.VOIP_ACCEPTING;

    this.dialTimer = 0;
    this.pingTimer = 0;
    this.transferTimer = 0;
}

VOIPSession.VOIP_LISTENING = 1;
VOIPSession.VOIP_DIALING = 2;//呼叫对方
VOIPSession.VOIP_CONNECTED = 3;//通话连接成功
VOIPSession.VOIP_ACCEPTING = 4;//询问用户是否接听来电
VOIPSession.VOIP_ACCEPTED = 5;//用户接听来电
VOIPSession.VOIP_REFUSING = 6;//来电被拒
VOIPSession.VOIP_REFUSED = 7;//(来/去)电已被拒
VOIPSession.VOIP_HANGED_UP = 8;//通话被挂断
VOIPSession.VOIP_SHUTDOWN = 9;//对方正在通话中连接被终止


function getNow() {
    var d = new Date();
    return d.getTime()/1000;
}

//ECMAScript 5 Object.create(o)
function object(o) {
    var F = function () {};
    F.prototype = o;
    return new F();
}

VOIPSession.prototype = object(VOIPStream.prototype);
VOIPSession.prototype.constructor = VOIPSession;

VOIPSession.prototype.dial = function() {
    this.state = VOIPSession.VOIP_DIALING;

    this.dialBeginTimestamp = getNow();
    this.sendDial();

    var self = this;
    this.dialTimer = setInterval(function() {
        self.sendDial();
        var now = getNow();
        if (now - self.dialBeginTimestamp >= 60) {
            self.onDialTimeout();
            self.clearDialTimer();
        }
    }, 1000);  

    console.log("dial timer:", this.dialTimer);
};


VOIPSession.prototype.sendDial = function() {
    console.log("send dial...");
    var command = new VOIPCommand();
    command.cmd = VOIPCommand.VOIP_COMMAND_DIAL_VIDEO;
    command.channelID = this.channelID;

    this.sendCommand(command);
};

VOIPSession.prototype.ping = function() {
    var self = this;
    this.pingTimer = setInterval(function() {
        self.sendPing();
    }, 1000);
    this.sendPing();
}

VOIPSession.prototype.sendPing = function() {
    var command = new VOIPCommand();
    command.cmd = VOIPCommand.VOIP_COMMAND_PING;
    command.channelID = this.channelID;
    this.sendCommand(command);
};

VOIPSession.prototype.accept = function() {
    this.state = VOIPSession.VOIP_ACCEPTED;
    this.sendDialAccept();
};


VOIPSession.prototype.refuse = function() {
    this.state = VOIPSession.VOIP_REFUSED;
    this.sendDialRefuse();
};


//清空所有的定时器
VOIPSession.prototype.close = function() {
    if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = 0;
    }
    if (this.dialTimer) {
        clearInterval(this.dialTimer);
        this.dialTimer = 0;
    }
}

VOIPSession.prototype.hangUp = function() {
    if (this.state == VOIPSession.VOIP_DIALING) {
        this.clearDialTimer();
        this.sendHangUp();
        this.state = VOIPSession.VOIP_HANG_UP;
    } else if (this.state == VOIPSession.VOIP_CONNECTED) {
        this.sendHangUp();
        this.state = VOIPSession.VOIP_HANG_UP;

        this.stopStream(function() {
            console.log("on stream closed");
        });

        this.close();

    } else {
        console.log("invalid voip state:" + this.state);
    }
};

VOIPSession.prototype.sendCommand = function(command) {
    var msg = {};
    msg.sender = this.uid;
    msg.receiver = this.peer;
    msg.content = JSON.stringify({voip:command.toData()});
    var r = this.im.sendRTMessage(msg);
    return r;
};

VOIPSession.prototype.sendTalking = function(receiver) {
    var command = new VOIPCommand();
    command.cmd = VOIPCommand.VOIP_COMMAND_TALKING;
    command.channelID = this.channelID;
    var msg = {};
    msg.sender = this.uid;
    msg.receiver = receiver;
    msg.content = JSON.stringify({voip:command.toData()});
    this.im.sendRTMessage(msg);
};


VOIPSession.prototype.sendDialAccept = function(recveiver) {
    var command = new VOIPCommand();
    command.cmd = VOIPCommand.VOIP_COMMAND_ACCEPT;
    command.channelID = this.channelID;
    this.sendCommand(command);
};


VOIPSession.prototype.sendDialRefuse = function(receiver) {
    var command = new VOIPCommand();
    command.cmd = VOIPCommand.VOIP_COMMAND_REFUSE;
    command.channelID = this.channelID;
    this.sendCommand(command);
};


VOIPSession.prototype.sendConnected = function(receiver) {
    var command = new VOIPCommand();
    command.cmd = VOIPCommand.VOIP_COMMAND_CONNECTED;
    command.channelID = this.channelID;
    this.sendCommand(command);
};

VOIPSession.prototype.sendRefused = function(receiver) {
    var command = new VOIPCommand();
    command.cmd = VOIPCommand.VOIP_COMMAND_REFUSED;
    command.channelID = this.channelID;
    this.sendCommand(command);
};

VOIPSession.prototype.sendHangUp = function() {
    var command = new VOIPCommand();
    command.cmd = VOIPCommand.VOIP_COMMAND_HANG_UP;
    command.channelID = this.channelID;
    this.sendCommand(command);
};

VOIPSession.prototype.clearDialTimer = function() {
    console.log("clear dial timer....:", this.dialTimer);
    if (this.dialTimer > 0) {
        console.log("clear dial timer");
        clearInterval(this.dialTimer);
        this.dialTimer = 0;
    }    
};

VOIPSession.prototype.handleVOIPMessage = function(obj, sender) {

    console.log("handle voip message...");
    if (sender != this.peer) {
        this.sendTalking(sender);
        return;
    }

    var command = new VOIPCommand();
    command.fromData(obj);
    if (this.state == VOIPSession.VOIP_DIALING) {
        if (command.cmd == VOIPCommand.VOIP_COMMAND_ACCEPT) {
            this.sendConnected();
            this.clearDialTimer();
            this.onConnected();
            this.state = VOIPSession.VOIP_CONNECTED;
        } else if (command.cmd == VOIPCommand.VOIP_COMMAND_REFUSE) {
            this.sendRefused();
            this.clearDialTimer();
            this.onRemoteRefuse();
            this.state = VOIPSession.VOIP_REFUSED;
        } else if (command.cmd == VOIPCommand.VOIP_COMMAND_TALKING) {
            this.clearDialTimer();
            this.onTalking();
            this.state = VOIPSession.VOIP_SHUTDOWN;
        }
    } else if (this.state == VOIPSession.VOIP_ACCEPTING) {
        if (command.cmd == VOIPCommand.VOIP_COMMAND_HANG_UP) {
            this.onRemoteHangUp();
            this.state = VOIPSession.VOIP_HANGED_UP;
        }
    } else if (this.state == VOIPSession.VOIP_ACCEPTED) {
        if (command.cmd == VOIPCommand.VOIP_COMMAND_CONNECTED) {
            this.onConnected();
            this.state = VOIPSession.VOIP_CONNECTED;
        } else if (command.cmd == VOIPCommand.VOIP_COMMAND_DIAL||
                   command.cmd == VOIPCommand.VOIP_COMMAND_DIAL_VIDEO) {
            this.sendDialAccept();
        }
    } else if (this.state == VOIPSession.VOIP_CONNECTED) {
        if (command.cmd == VOIPCommand.VOIP_COMMAND_HANG_UP) {
            this.onRemoteHangUp();
            this.state = VOIPSession.VOIP_HANGED_UP;
        }
    }
};


VOIPSession.prototype.onRemoteRefuse = function() {
    console.log("on refuse");
};

VOIPSession.prototype.onRemoteHangUp = function() {
    console.log("on remote hangup");
    if (this.state == VOIPSession.VOIP_CONNECTED) {
        this.stopStream(function() {
            console.log("on stream closed");
        });
    }

    this.close();
};

VOIPSession.prototype.onTalking = function() {
    console.log("on talking");
};

VOIPSession.prototype.onDialTimeout = function() {
    console.log("dial timeout");
};

VOIPSession.prototype.onConnected = function() {
    console.log("on connected");
    this.startStream();
    this.ping();
};


