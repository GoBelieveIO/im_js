var Buffer = require('buffer/').Buffer;
var order = require('./byte_order');
var hton64 = order.hton64;
var ntoh64 = order.ntoh64;
var htonl = order.htonl;
var ntohl = order.ntohl;



function VOIPCommand() {
    this.cmd = 0;
    this.dialCount = 0;
}

VOIPCommand.prototype.fromData = function(content) {
    var pos = 0;
    this.cmd = ntohl(content, pos);
    pos += 4;
    if (this.cmd == VOIPCommand.VOIP_COMMAND_DIAL || 
        this.cmd == VOIPCommand.VOIP_COMMAND_DIAL_VIDEO) {
        this.dialCount = ntohl(content, pos);
        pos += 4;
    }
};

VOIPCommand.prototype.toData = function() {
    var buf = new Buffer(1024);
    var pos = 0;

    htonl(buf, pos, this.cmd);
    pos += 4;
    if (this.cmd == VOIPCommand.VOIP_COMMAND_DIAL || 
        this.cmd == VOIPCommand.VOIP_COMMAND_DIAL_VIDEO) {
        htonl(buf, pos, this.dialCount);
        pos += 4;
    } else if (this.cmd == VOIPCommand.VOIP_COMMAND_ACCEPT) {
        pos += 6;
    } else if (this.cmd == VOIPCommand.VOIP_COMMAND_CONNECTED) {
        pos += 10;
    }

    return buf.slice(0, pos);
};

//语音通话
VOIPCommand.VOIP_COMMAND_DIAL = 1;
VOIPCommand.VOIP_COMMAND_ACCEPT = 2;
VOIPCommand.VOIP_COMMAND_CONNECTED = 3;
VOIPCommand.VOIP_COMMAND_REFUSE = 4;
VOIPCommand.VOIP_COMMAND_REFUSED = 5;
VOIPCommand.VOIP_COMMAND_HANG_UP = 6;
VOIPCommand.VOIP_COMMAND_RESET = 7;
VOIPCommand.VOIP_COMMAND_TALKING = 8;
VOIPCommand.VOIP_COMMAND_DIAL_VIDEO = 9;

module.exports = VOIPCommand;
