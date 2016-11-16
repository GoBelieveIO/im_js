var base = 1000;
var msgLocalID=0;
var increase = 25;

var sellerID = 0;
var storeID = 0;
var appID = 7;
var uid = 0;

var IMService = gobelieve.IMService;

String.format = function() {
    if( arguments.length == 0 )
        return null;

    var str = arguments[0]; 
    for(var i=1;i<arguments.length;i++) {
        var re = new RegExp('\\{' + (i-1) + '\\}','gm');
        str = str.replace(re, arguments[i]);
    }
    return str;
};

var helper = {
    toTime: function (ts) {
        //时间戳取时间
        var d = ts ? new Date(ts) : new Date();
        var H = d.getHours();
        var m = d.getMinutes();
        return H + ':' + (m < 10 ? '0' + m : m);
    },
    getUserName: function (user) {
        if (user.name) {
            return user.name;
        } else {
            return "匿名("+user.uid+")";
        }
    },
    getUserAvatar: function (user) {
        if (user.avatar) {
            var parser = document.createElement('a');
            parser.href = user.avatar;
            return parser.pathname;
        } else {
            return '';
        }
    },
};

var htmlLoyout = {
    buildText: function (msg) {
        var html = [];
        html.push('<li class="chat-item" data-id="' + msg.id + '">');
        html.push('    <div class="message ' + msg.cls + '">');
        html.push('        <div class="bubble"><p class="pre">' + msg.text + '</p>');
        html.push('           <span class="time">' + helper.toTime(msg.timestamp * 1000) + '</span>');

        if (msg.ack) {
            html.push('   <span class="ack"></span>');
        }

        html.push('        </div>');
        html.push('    </div>');
        html.push('</li>');
        return html.join('');
    },
    buildImage: function (msg) {
        var html = [];
        html.push('<li class="chat-item"  data-id="' + msg.id + '">');
        html.push('    <div class="message">');
        html.push('        <div class="bubble"><p class="pre"><a href="' + msg.image + '" target="_blank">' +
            '<img class="image-thumb-body" src="' + msg.image + '" /></p></a>');
        html.push('           <span class="time">' + helper.toTime(msg.timestamp * 1000) + '</span>');

        if (msg.ack) {
            html.push('   <span class="ack"></span>');
        }

        html.push('        </div>');
        html.push('    </div>');
        html.push('</li>');
        return html.join('');
    },
    buildAudio: function (msg) {
        var html = [];
        html.push('<li class="chat-item"  data-id="' + msg.id + '">');
        var audio_url = msg.audio.url + ".mp3";
        html.push('<li class="chat-item">');
        html.push('  <div class="message ' + msg.cls + '">');
        html.push('     <div class="bubble">');
        html.push('       <p class="pre"><audio  controls="controls" src="' + audio_url + '"></audio></p>');
        html.push('       <span class="time">' + helper.toTime(msg.timestamp * 1000) + '</span>');
   
        if (msg.ack) {
            html.push('   <span class="ack"></span>');
        }

        html.push('     </div>');
        html.push('  </div>');
        html.push('</li>');
        return html.join('');
    },
    buildACK: function () {
        return '<span class="ack"></span>';
    },
};

var node = {
    chatHistory: $("#chatHistory ul"),
};

var process = {
    playAudio: function () {

    },
    appendAudio: function (m) {
        node.chatHistory.append(htmlLoyout.buildAudio(m));
    },
    appendText: function (m) {
        node.chatHistory.append(htmlLoyout.buildText(m));
    },
    appendImage: function (m) {
        node.chatHistory.append(htmlLoyout.buildImage(m));
    },
    msgACK: function (msgID) {
        node.chatHistory.find('li[data-id="' + msgID + '"] .bubble').append(htmlLoyout.buildACK());
    },
};

function scrollDown() {
    $('#chatHistory').scrollTop($('#chatHistory ul').outerHeight());
    $("#entry").text('').focus();
}

function appendMessage(msg) {
    var time = new Date();
    var m = {};
    m.id = msg.msgLocalID;
    if (msg.timestamp) {
        time.setTime(msg.timestamp * 1000);
        m.timestamp = msg.timestamp;
    }
    m.ack = msg.ack;

    if (msg.outgoing) {
        m.cls = "message-out";
    } else {
        m.cls = "message-in";
    }
    if (msg.contentObj.text) {
        m.text = util.toStaticHTML(msg.contentObj.text);
        process.appendText(m);
    } else if (msg.contentObj.audio) {
        m.audio = msg.contentObj.audio;
        process.appendAudio(m);
    } else if (msg.contentObj.image) {
        m.image = msg.contentObj.image;
        process.appendImage(m);
    }
}

// add message on board
function addMessage(msg) {
    appendMessage(msg);
    scrollDown();
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

//always view the most recent message when it is added
function scrollDown(base) {
    window.scrollTo(0, base);
    $("#entry").focus();
}

observer = {
    handleCustomerMessage: function(msg) {
        if (msg.customerID != uid || msg.customerAppID != appID) {
            return;
        }
        try {
            msg.contentObj = JSON.parse(msg.content)
        } catch (e) {
            console.log("json parse exception:", e);
            return
        }

        sellerID = msg.sellerID;
        msg.outgoing = true;
        msg.msgLocalID = msgLocalID++;
        addMessage(msg);
    },
    handleCustomerSupportMessage: function(msg) {
        if (msg.customerID != uid || msg.customerAppID != appID) {
            return;
        }
        try {
            msg.contentObj = JSON.parse(msg.content)
        } catch (e) {
            console.log("json parse exception:", e);
            return
        }

        sellerID = msg.sellerID;
        msg.outgoing = false;
        msg.msgLocalID = msgLocalID++;
        addMessage(msg)
    },
    handleCustomerMessageACK: function(msg) {
        console.log("handleCustomerMessageACK...");
        var msgLocalID = msg.msgLocalID;
        process.msgACK(msgLocalID);
    },
    handleCustomerMessageFailure: function(msg) {
        console.log("handleCustomerMessageFailure...");
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

var im = new IMService();
im.observer = observer;


$(document).ready(function () {

    var receiver;
    var r = util.getURLParameter('receiver', location.search);
    if (r) {
        receiver = parseInt(r);
    } else {
        receiver = 0;
    }
    storeID = receiver;

    r = util.getURLParameter('sender', location.search);
    if (r) {
        sender = parseInt(r);
    } else {
        sender = 0;
    }
    uid = sender;
    console.log("appid:", appID);
    console.log("uid:", sender);
    console.log("store id:", storeID);

    token = util.getCookie("token");
    console.log("token:" + token)

    im.host = host
    im.accessToken = token
    im.start();

    $("#entry").keypress(function (e) {
        if (e.keyCode != 13) return;
        var msg = $("#entry").val().replace("\n", "");
        if (!util.isBlank(msg)) {
            var now = new Date();
            var obj = {"text": msg};
            var textMsg = JSON.stringify(obj);
            var message = {
                customerID:uid, 
                customerAppID:appID, 
                storeID:storeID,
                sellerID:sellerID, 
                content: textMsg, 
                contentObj: obj,
                msgLocalID:msgLocalID++
            };
            message.outgoing = true;
            message.timestamp = (now.getTime() / 1000);

            if (im.connectState == IMService.STATE_CONNECTED) {
                im.sendCustomerMessage(message);
                $("#entry").val("");
                addMessage(message);
            }
        }
    });
});
