function VOIPCommand() {
    this.cmd = 0;
    this.channelID = "";
}

VOIPCommand.prototype.fromData = function(obj) {
    this.cmd = obj.command;
    this.channelID = obj.channel_id;
};

VOIPCommand.prototype.toData = function() {
    var obj = {
        command:this.cmd,
        channel_id:this.channelID
    };
    return obj;
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
VOIPCommand.VOIP_COMMAND_PING = 10;


