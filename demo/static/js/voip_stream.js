
var configuration = {
    'iceServers': [{
        'url': 'stun:stun.counterpath.net:3478'
    }, {"url":"turn:turn.gobelieve.io:3478?transport=udp"}]
};



function VOIPStream() {
    this.pc = null;
    this.mediaStream = null;

    this.isCaller = false;
    this.uid = 0;
    this.peer = 0;

    this.cameraView = null;
    this.remoteView = null;
    
    this.logError = this.logError.bind(this);
    this.localDescCreated = this.localDescCreated.bind(this);
}


VOIPStream.prototype.startStream = function() {
    console.log("stream stream...");
    var kRTCICECandidateTypeKey = "type";
    var kRTCICECandidateTypeValue = "candidate";
    var kRTCICECandidateMidKey = "id";
    var kRTCICECandidateMLineIndexKey = "label";
    var kRTCICECandidateSdpKey = "candidate";
    var kRTCICECandidatesTypeKey = "candidates";

    var turnServer = configuration.iceServers[1];
    turnServer.username = "7_" + uid;
    turnServer.credential = token;

    var pc = new RTCPeerConnection(configuration);

    var uid = this.uid;
    var peer = this.peer;
    // send any ice candidates to the other peer
    pc.onicecandidate = function (evt) {
        if (evt.candidate) {
            var candidate = {};
            console.log("origin candidate:" + JSON.stringify(evt.candidate));
            candidate[kRTCICECandidateTypeKey] = kRTCICECandidateTypeValue;

            candidate[kRTCICECandidateMLineIndexKey] = evt.candidate.sdpMLineIndex;
            candidate[kRTCICECandidateMidKey] = evt.candidate.sdpMid;
            candidate[kRTCICECandidateSdpKey] = evt.candidate.candidate;
            
            var content = JSON.stringify({p2p:candidate});
            console.log("candidate:" + content);

            msg = {sender:uid, receiver:peer, content:content};
            im.sendRTMessage(msg);
        }
    };

    // let the 'negotiationneeded' event trigger offer generation
    pc.onnegotiationneeded = function () {
        
    }

    var self = this;
    // once remote stream arrives, show it in the remote video element
    pc.onaddstream = function (evt) {
        self.remoteView.src = URL.createObjectURL(evt.stream);
    };
 
    // get a local stream, show it in a self-view and add it to be sent
    navigator.getUserMedia({
        'audio': true,
        'video': {width:640, height:480}
    },  function(stream) {
        console.log("got media stream:" + stream);
        self.mediaStream = stream;
        self.cameraView.src = URL.createObjectURL(stream);
        pc.addStream(stream);

        if (self.isCaller) {
            console.log("create offer...");
            pc.createOffer(self.localDescCreated, self.logError);
        }
    }, this.logError);

    this.pc = pc;
}


VOIPStream.prototype.stopStream = function() {

    if (this.mediaStream) {
        this.mediaStream.getAudioTracks()[0].stop();
        this.mediaStream.getVideoTracks()[0].stop();
        this.mediaStream = null;
    }
    if (this.pc) {
        this.pc.close();
        this.pc = null;
    }
}



VOIPStream.prototype.localDescCreated = function(desc) {
    console.log("set local description");
    
    var pc = this.pc;
    var peer = this.peer;
    var uid = this.uid;
    pc.setLocalDescription(desc, function () {
        var obj = {};
        obj.sdp = pc.localDescription.sdp;
        obj.type = pc.localDescription.type;
        console.log("local desc:" + pc.localDescription)
        console.log("local desc:" + JSON.stringify(obj));

        var msg = {};
        msg.sender = uid;
        msg.receiver = peer;
        msg.content = JSON.stringify({p2p:obj});
        var r = im.sendRTMessage(msg);
        console.log("send rt message:" + r);

    }, this.logError);
}

VOIPStream.prototype.logError = function(error) {
    console.log(error.name + ': ' + error.message);
}


VOIPStream.prototype.handleP2PMessage = function(obj) {
    if (!this.pc) {
        console.log("peer connection is null");
        return;
    }
    
    var pc = this.pc;
    if (obj.type == "candidate") {
        var m = {"sdpMid":obj.id, "sdpMLineIndex":obj.label, "candidate":obj.candidate}
        pc.addIceCandidate(new RTCIceCandidate(m));
    } else if (obj.type == "remove-candidates") {
        
    } else if (obj.type == "offer") {
        var sd = new RTCSessionDescription(obj);
        console.log("set remote offer description")
        var self = this;
        
        pc.setRemoteDescription(sd, function() {
            pc.createAnswer(self.localDescCreated, self.logError);
        });
    } else if (obj.type == "answer") {
        var sd = new RTCSessionDescription(obj);
        console.log("set remote answer description");
        pc.setRemoteDescription(sd, function() {
            
        });
    }
}
    
