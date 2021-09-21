
var peer;//对方id
var uid;//当前用户id

var cameraView;
var remoteView;

var im;
var voipSession = null;


var observer = {

    handleRTMessage:function(msg) {
        console.log("rt message...:", msg.content);

        if (msg.receiver != uid) {
            return;
        }
        
        var rtObj = JSON.parse(msg.content);
        if (rtObj.p2p) {
            if (voipSession) {
                voipSession.handleP2PMessage(rtObj.p2p);
            }
        } else if (rtObj.voip) {
            var obj = rtObj.voip;

            var cmd = new VOIPCommand(obj);
            cmd.fromData(obj);
            if (cmd.cmd == VOIPCommand.VOIP_COMMAND_DIAL ||
                cmd.cmd == VOIPCommand.VOIP_COMMAND_DIAL_VIDEO) {
                if (!voipSession) {
                    voipSession = new VOIPSession(im);

                    voipSession.onConnected = onConnected;
                    voipSession.onRemoteHangUp = onRemoteHangUp;
                    
                    voipSession.uid = uid;
                    voipSession.peer = msg.sender;
                    voipSession.isCaller = false;
                    voipSession.token = token;
                    voipSession.channelID = cmd.channelID;
                    voipSession.cameraView = cameraView;
                    voipSession.remoteView = remoteView;
                    
                    document.getElementById('accept').style.display = 'inline';
                    document.getElementById('refuse').style.display = 'inline';
                    document.getElementById('dial').style.display = 'none';
                }
            }
            if (voipSession) {
                voipSession.handleVOIPMessage(obj, msg.sender);
            }
        }
    },
    
    onConnectState: function(state) {
        if (state == IMService.STATE_CONNECTED) {
            console.log("im connected");
        } else if (state == IMService.STATE_CONNECTING) {
            console.log("im connecting");
        } else if (state == IMService.STATE_CONNECTFAIL) {
            console.log("im connect fail");
        } else if (state == IMService.STATE_UNCONNECTED) {
            console.log("im unconnected");
        }
    }
};


util = {
    urlRE: /https?:\/\/([-\w\.]+)+(:\d+)?(\/([^\s]*(\?\S+)?)?)?/g,
    //  html sanitizer
    toStaticHTML: function (inputHtml) {
        inputHtml = inputHtml.toString();
        return inputHtml.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },
    //pads n with zeros on the left,
    //digits is minimum length of output
    //zeroPad(3, 5); returns "005"
    //zeroPad(2, 500); returns "500"
    zeroPad: function (digits, n) {
        n = n.toString();
        while (n.length < digits)
            n = '0' + n;
        return n;
    },
    //it is almost 8 o'clock PM here
    //timeString(new Date); returns "19:49"
    timeString: function (date) {
        var minutes = date.getMinutes().toString();
        var hours = date.getHours().toString();
        return this.zeroPad(2, hours) + ":" + this.zeroPad(2, minutes);
    },

    //does the argument only contain whitespace?
    isBlank: function (text) {
        var blank = /^\s*$/;
        return (text.match(blank) !== null);
    },


    getURLParameter: function(name, search) {
        search = search || location.search
        var param = search.match(
            RegExp(name + '=' + '(.+?)(&|$)'))
        return param ? decodeURIComponent(param[1]) : null
    },
    
    getCookie: function(c_name) {
        if (document.cookie.length>0) {
            c_start=document.cookie.indexOf(c_name + "=")
            if (c_start!=-1) { 
                c_start=c_start + c_name.length+1 
                c_end=document.cookie.indexOf(";",c_start)
                if (c_end==-1) c_end=document.cookie.length
                return unescape(document.cookie.substring(c_start,c_end))
            } 
        }
        return ""
    },

};


$(document).ready(function () {
    var r = util.getURLParameter('receiver', location.search);
    if (r) {
        peer = parseInt(r);
    } else {
        peer = 0;
    }
    console.log("peer:" + peer)

    r = util.getURLParameter('sender', location.search);
    if (r) {
        sender = parseInt(r);
    } else {
        sender = 0;
    }
    uid = sender;
    console.log("uid:" + sender)

    token = util.getCookie("token");
    console.log("token:" + token)

    im = new IMService();
    im.host = host

    im.accessToken = token
    im.start();

    im.observer = observer;
    im.voipObserver = observer;

    cameraView = document.getElementById('camera');
    remoteView = document.getElementById('remote');
    cameraView.muted = true;
});

function onConnected() {
    console.log("on connected");
    VOIPSession.prototype.onConnected.call(this);

    document.getElementById('accept').style.display = 'none';
    document.getElementById('refuse').style.display = 'none';
    document.getElementById('dial').style.display = 'none';
    document.getElementById('hangup').style.display = 'inline';    
}

function onRemoteHangUp() {
    VOIPSession.prototype.onRemoteHangUp.call(this);
    document.getElementById('accept').style.display = 'none';
    document.getElementById('refuse').style.display = 'none';
    document.getElementById('dial').style.display = 'inline';
    document.getElementById('hangup').style.display = 'none';

    voipSession = null;
}

//呼叫对方
function onDialClick() {
    console.log("on dial click");

    voipSession = new VOIPSession(im);

    voipSession.onConnected = onConnected;

    voipSession.onRemoteHangUp = onRemoteHangUp;
    
    voipSession.uid = sender;
    voipSession.peer = peer;
    voipSession.isCaller = true;
    voipSession.token = token;


    var timeInMs = Date.now();
    voipSession.channelID = "" + timeInMs;
    
    voipSession.cameraView = cameraView;
    voipSession.remoteView = remoteView;
    voipSession.dial();
}

function onAccept() {
    console.log("on accept");
    voipSession.accept();
}

function onRefuse() {
    console.log("on refuse");
    voipSession.refuse();
}

function onHangUp() {
    console.log("on hangup");
    voipSession.hangUp();
    voipSession = null;
    document.getElementById('accept').style.display = 'none';
    document.getElementById('refuse').style.display = 'none';
    document.getElementById('dial').style.display = 'inline';
    document.getElementById('hangup').style.display = 'none';
}
