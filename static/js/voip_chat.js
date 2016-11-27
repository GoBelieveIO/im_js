
var IMService = gobelieve.IMService;
var VOIPSession = gobelieve.VOIPSession;

var configuration = {
    'iceServers': [{
        'url': 'stun:stun.counterpath.net:3478'
    }, {"url":"turn:turn.gobelieve.io:3478?transport=udp"}]
};


var pc;
var mediaStream;

var peer;//对方id
var uid;//当前用户id


var cameraView;
var remoteView;


var im;

var isCaller = true;


var sessionHandler = {
    onRefuse:function() {
        console.log("on refuse");
    },

    onHangUp:function() {
        console.log("on hangup");
        stopStream();
    },

    onTalking:function() {
        console.log("on talking");
    },

    onDialTimeout:function() {
        console.log("dial timeout");
    },

    onConnected:function() {
        console.log("on connected");
        startStream();
    },

    onRefuseFinished:function() {
        console.log("on refuse finished");
    },
}


var observer = {
    handleVOIPControl: function(msg) {    
        if (msg.sender != peer) {
            return;
        }

        isCaller = false;
        var voipSession = new VOIPSession(im, sessionHandler);
        voipSession.uid = sender;
        voipSession.peer = peer;

        im.voipObserver = voipSession;

        //todo 询问用户是否接听
        setTimeout(function() {
            voipSession.accept();
        }, 1000);
    },

    handleRTMessage:function(msg) {
        console.log("rt message...:", msg.content);
        var obj = JSON.parse(msg.content);
        if (obj.type == "candidate") {
            var m = {"sdpMid":obj.id, "sdpMLineIndex":obj.label, "candidate":obj.candidate}
            pc.addIceCandidate(new RTCIceCandidate(m));
        } else if (obj.type == "remove-candidates") {
            
        } else if (obj.type == "offer") {
            var sd = new RTCSessionDescription(obj);
            console.log("set remote offer description")
            pc.setRemoteDescription(sd, function() {
                pc.createAnswer(localDescCreated, logError);
            });
        } else if (obj.type == "answer") {
            var sd = new RTCSessionDescription(obj);
            console.log("set remote answer description");
            pc.setRemoteDescription(sd, function() {
          
            });
        }
    },
    onConnectState: function(state) {
        if (state == IMService.STATE_CONNECTED) {
            //console.log("im connected");
            // 连接成功
            //showChat();
        } else if (state == IMService.STATE_CONNECTING) {
            console.log("im connecting");
        } else if (state == IMService.STATE_CONNECTFAIL) {
            console.log("im connect fail");
        } else if (state == IMService.STATE_UNCONNECTED) {
            console.log("im unconnected");
        }
    }
};

function stopStream() {
    if (mediaStream) {
        mediaStream.getAudioTracks()[0].stop();
        mediaStream.getVideoTracks()[0].stop();
    }
    if (pc) {
        pc.close();
        pc = null;
    }
}

function startStream() {

    var kRTCICECandidateTypeKey = "type";
    var kRTCICECandidateTypeValue = "candidate";
    var kRTCICECandidateMidKey = "id";
    var kRTCICECandidateMLineIndexKey = "label";
    var kRTCICECandidateSdpKey = "candidate";
    var kRTCICECandidatesTypeKey = "candidates";

    var turnServer = configuration.iceServers[1];
    turnServer.username = "7_" + uid;
    turnServer.credential = token;

    pc = new RTCPeerConnection(configuration);

    // send any ice candidates to the other peer
    pc.onicecandidate = function (evt) {
        if (evt.candidate) {
            var candidate = {};
            console.log("origin candidate:" + JSON.stringify(evt.candidate));
            candidate[kRTCICECandidateTypeKey] = kRTCICECandidateTypeValue;

            candidate[kRTCICECandidateMLineIndexKey] = evt.candidate.sdpMLineIndex;
            candidate[kRTCICECandidateMidKey] = evt.candidate.sdpMid;
            candidate[kRTCICECandidateSdpKey] = evt.candidate.candidate;
            var content = JSON.stringify(candidate);
            console.log("candidate:" + content);

            msg = {sender:uid, receiver:peer, content:content};
            im.sendRTMessage(msg);
        }
    };

    // let the 'negotiationneeded' event trigger offer generation
    pc.onnegotiationneeded = function () {
   
    }

    // once remote stream arrives, show it in the remote video element
    pc.onaddstream = function (evt) {
        remoteView.src = URL.createObjectURL(evt.stream);
    };

    // get a local stream, show it in a self-view and add it to be sent
    navigator.getUserMedia({
        'audio': true,
        'video': true
    }, function (stream) {
        console.log("got media stream:" + stream);
        mediaStream = stream;
        cameraView.src = URL.createObjectURL(stream);
        pc.addStream(stream);

        if (isCaller) {
            console.log("create offer...");
            pc.createOffer(localDescCreated, logError);
        }
    }, logError);

  
}

function localDescCreated(desc) {
    console.log("set local description");
    pc.setLocalDescription(desc, function () {
        var obj = {};
        obj.sdp = pc.localDescription.sdp;
        obj.type = pc.localDescription.type;
        console.log("local desc:" + pc.localDescription)
        console.log("local desc:" + JSON.stringify(obj));

        var msg = {};
        msg.sender = uid;
        msg.receiver = peer;
        msg.content = JSON.stringify(obj);
        var r = im.sendRTMessage(msg);
        console.log("send rt message:" + r);

    }, logError);
}

function logError(error) {
    console.log(error.name + ': ' + error.message);
}

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

//呼叫对方
function onDialClick() {
    console.log("on dial click");

    isCaller = true;
    var voipSession = new VOIPSession(im, sessionHandler);
    voipSession.uid = sender;
    voipSession.peer = peer;
    voipSession.dial();

    im.voipObserver = voipSession;
}
