//session state changed callback
//-(void)onRefuse;
//-(void)onHangUp;
//-(void)onTalking;
// 
//-(void)onDialTimeout;
//-(void)onAcceptTimeout;
//-(void)onConnected;
//-(void)onRefuseFinished;

var VOIPCommand = require('./voip_command');



function VOIPSession(im, handler) {
    this.sessionChangedHandler = handler;
    this.im = im;

    this.state = VOIPSession.VOIP_ACCEPTING;

    this.dialCount = 0;
    this.dialTimer = 0;
    this.uid = 0;
    this.peer = 0;
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

VOIPSession.prototype.dial = function() {
    this.state = VOIPSession.VOIP_DIALING;

    this.dialCount = 0;
    this.dialBeginTimestamp = getNow();
    this.sendDial();

    var self = this;
    this.dialTimer = setInterval(function() {
        self.sendDial();
        var now = getNow();
        if (now - self.dialBeginTimestamp >= 60) {
            self.sessionChangedHandler.onDialTimeout();
            self.clearDialTimer();
        }
    }, 1000);  

    console.log("dial timer:", this.dialTimer);
};


VOIPSession.prototype.sendDial = function() {
    console.log("send dial...");
    var command = new VOIPCommand();
    command.cmd = VOIPCommand.VOIP_COMMAND_DIAL_VIDEO;
    command.dialCount = this.dialCount + 1;

    var r = this.sendCommand(command);
    if (r) {
        this.dialCount = this.dialCount + 1;
    }
};


VOIPSession.prototype.accept = function() {
    this.state = VOIPSession.VOIP_ACCEPTED;
    this.sendDialAccept();
};


VOIPSession.prototype.refuse = function() {
    this.state = VOIPSession.VOIP_REFUSING;
    this.sendDialRefuse();
};


VOIPSession.prototype.hangUp = function() {
    if (this.state == VOIPSession.VOIP_DIALING) {
        this.clearDialTimer();
        this.sendHangUp();
        this.state = VOIPSession.VOIP_HANG_UP;
    } else if (this.state == VOIPSession.VOIP_CONNECTED) {
        this.sendHangUp();
        this.state = VOIPSession.VOIP_HANG_UP;
    } else {
        console.log("invalid voip state:" + this.state);
    }
};

VOIPSession.prototype.sendCommand = function(command) {
    var msg = {};
    msg.sender = this.uid;
    msg.receiver = this.peer;
    msg.content = command.toData();
    var r = this.im.sendVOIPControl(msg);
    return r;
};

VOIPSession.prototype.sendTalking = function(recveiver) {
    var command = new VOIPCommand();
    command.cmd = VOIPCommand.VOIP_COMMAND_TALKING;

    var msg = {};
    msg.sender = this.uid;
    msg.receiver = receiver;
    msg.content = command.toData();
    this.im.sendVOIPControl(msg);
};


VOIPSession.prototype.sendDialAccept = function(recveiver) {
    var command = new VOIPCommand();
    command.cmd = VOIPCommand.VOIP_COMMAND_ACCEPT;

    this.sendCommand(command);
};


VOIPSession.prototype.sendDialRefuse = function(recveiver) {
    var command = new VOIPCommand();
    command.cmd = VOIPCommand.VOIP_COMMAND_REFUSE;

    this.sendCommand(command);
};


VOIPSession.prototype.sendConnected = function(recveiver) {
    var command = new VOIPCommand();
    command.cmd = VOIPCommand.VOIP_COMMAND_CONNECTED;

    this.sendCommand(command);
};

VOIPSession.prototype.sendRefused = function(recveiver) {
    var command = new VOIPCommand();
    command.cmd = VOIPCommand.VOIP_COMMAND_REFUSED;

    this.sendCommand(command);
};

VOIPSession.prototype.clearDialTimer = function() {
    console.log("clear dial timer11....:", this.dialTimer);
    if (this.dialTimer > 0) {
        console.log("clear dial timer");
        clearInterval(this.dialTimer);
        this.dialTimer = 0;
    }    
};

VOIPSession.prototype.handleVOIPControl = function(msg) {
    if (msg.sender != this.peer) {
        this.sendTalking(msg.sender);
        return;
    }

    var command = new VOIPCommand();
    command.fromData(msg.content);
    if (this.state == VOIPSession.VOIP_DIALING) {
        if (command.cmd == VOIPCommand.VOIP_COMMAND_ACCEPT) {
            this.sendConnected();
            this.state = VOIPSession.VOIP_CONNECTED;
            this.clearDialTimer();

            this.sessionChangedHandler.onConnected();
        } else if (command.cmd == VOIPCommand.VOIP_COMMAND_REFUSE) {
            this.state = VOIPSession.VOIP_REFUSED;
            this.sendRefused();
            this.clearDialTimer();
            
            this.sessionChangedHandler.onRefuse();
        } else if (command.cmd == VOIPCommand.VOIP_COMMAND_TALKING) {
            this.state = VOIPSession.VOIP_SHUTDOWN;
            this.clearDialTimer();

            this.sessionChangedHandler.onTalking();
        }
    } else if (this.state == VOIPSession.VOIP_ACCEPTING) {
        if (command.cmd == VOIPCommand.VOIP_COMMAND_HANG_UP) {
            this.state = VOIPSession.VOIP_HANGED_UP;

            this.sessionChangedHandler.onHangUp();
        }
    } else if (this.state == VOIPSession.VOIP_ACCEPTED) {
        if (command.cmd == VOIPCommand.VOIP_COMMAND_CONNECTED) {
            this.state = VOIPSession.VOIP_CONNECTED;
            this.sessionChangedHandler.onConnected();
        } else if (command.cmd == VOIPCommand.VOIP_COMMAND_DIAL||
                   command.cmd == VOIPCommand.VOIP_COMMAND_DIAL_VIDEO) {
            this.sendDialAccept();
        }
    } else if (this.state == VOIPSession.VOIP_CONNECTED) {
        if (command.cmd == VOIPCommand.VOIP_COMMAND_HANG_UP) {
            this.state = VOIPSession.VOIP_HANGED_UP;
            this.sessionChangedHandler.onHangUp();
        }
    } else if (this.state == VOIPSession.VOIP_REFUSING) {
        if (command.cmd == VOIPCommand.VOIP_COMMAND_REFUSED) {
            this.state = VOIPSession.VOIP_REFUSED;
            this.sessionChangedHandler.onRefuseFinished();
        } else if (command.cmd == VOIPCommand.VOIP_COMMAND_DIAL||
                   command.cmd == VOIPCommand.VOIP_COMMAND_DIAL_VIDEO) {
            this.sendDialRefuse();
        }
    }
};


module.exports = VOIPSession;
