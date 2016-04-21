var username;
var receiver;
var users;
var base = 1000;
var msgLocalID=0;
var increase = 25;

var sellerID = 0;
var storeID = 0;
var appID = 7;

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

// add message on board
function addMessage(from, target, text, time) {
    var name = (target == '*' ? 'all' : target);
    if (text === null) return;
    if (time == null) {
        // if the time is null or undefined, use the current time.
        time = new Date();
    } else if ((time instanceof Date) === false) {
        // if it's a timestamp, interpret it
        time = new Date(time);
    }
    //every message you see is actually a table with 3 cols:
    //  the time,
    //  the person who caused the event,
    //  and the content
    var messageElement = $(document.createElement("table"));
    messageElement.addClass("message");
    // sanitize
    text = util.toStaticHTML(text);
    var content = '<tr>' + '  <td class="date">' + util.timeString(time) + '</td>' + '  <td class="nick">' + util.toStaticHTML(from) + ' says to ' + name + ': ' + '</td>' + '  <td class="msg-text">' + text + '</td>' + '</tr>';
    messageElement.html(content);
    //the log is the stream that we view
    $("#chatHistory").append(messageElement);
    base += increase;
    scrollDown(base);
}

// show tip
function tip(type, name) {
    var tip, title;
    switch (type) {
        case 'online':
            tip = name + ' is online now.';
            title = 'Online Notify';
            break;
        case 'offline':
            tip = name + ' is offline now.';
            title = 'Offline Notify';
            break;
        case 'message':
            tip = name + ' is saying now.';
            title = 'Message Notify';
            break;
    }
    var pop = new Pop(title, tip);
}

// init user list
function initUserList(data) {
    users = data.users;
    for (var i = 0; i < users.length; i++) {
        var slElement = $(document.createElement("option"));
        slElement.attr("value", users[i]);
        slElement.text(users[i]);
        $("#usersList").append(slElement);
    }
}

// add user in user list
function addUser(user) {
    var slElement = $(document.createElement("option"));
    slElement.attr("value", user);
    slElement.text(user);
    $("#usersList").append(slElement);
}

// remove user from user list
function removeUser(user) {
    $("#usersList option").each(
        function () {
            if ($(this).val() === user) $(this).remove();
        });
}

// set your name
function setName() {
    $("#name").text(username);
}

// show error
function showError(content) {
    $("#loginError").text(content);
    $("#loginError").show();
}

// show chat panel
function showChat() {
    $("#toolbar").show();
    $("entry").focus();
    scrollDown(base);
}


$(document).ready(function () {
    observer = {
        handlePeerMessage: function(msg) {
            //console.log("msg sender:", msg.sender, " receiver:", msg.receiver, " content:", msg.content, " timestamp:", msg.timestamp);
            addMessage(msg.sender, msg.receiver, msg.content);
            $("#chatHistory").show();
            //if (msg.sender !== username)
            //    tip('message', msg.sender);
        },
        handleMessageACK: function(msgLocalID, receiver) {
            //console.log("message ack local id:", msgLocalID, " receiver:", receiver)
        },
        handleMessageFailure: function(msgLocalID, receiver) {
            //console.log("message fail local id:", msgLocalID, " receiver:", receiver)
        },

        handleCustomerMessage: function(msg) {
            addMessage(msg.customerID, msg.storeID, msg.content);
            $("#chatHistory").show();            
        },
        handleCustomerSupportMessage: function(msg) {
            sellerID = msg.sellerID;
            addMessage(msg.storeID, msg.customerID, msg.content);
            $("#chatHistory").show();
        },
        handleCustomerMessageACK: function(msg) {
            console.log("handleCustomerMessageACK...");
        },
        handleCustomerMessageFailure: function(msg) {
            console.log("handleCustomerMessageFailure...");
        },

        onConnectState: function(state) {
            if (state == IMService.STATE_CONNECTED) {
                console.log("im connected");
                setName();
                showChat();
            } else if (state == IMService.STATE_CONNECTING) {
                console.log("im connecting");
            } else if (state == IMService.STATE_CONNECTFAIL) {
                console.log("im connect fail");
            } else if (state == IMService.STATE_UNCONNECTED) {
                console.log("im unconnected");
            }
        }
    };

    var im = new IMService(observer);
    im.host = host

    var r = util.getURLParameter('receiver', location.search);
    if (r) {
        receiver = parseInt(r);
    } else {
        receiver = 0;
    }
    console.log("receiver:" + receiver)
    storeID = receiver

    r = util.getURLParameter('sender', location.search);
    if (r) {
        sender = parseInt(r);
    } else {
        sender = 0;
    }
    username = sender;
    console.log("sender:" + sender)
    

    addUser(receiver);
    token = util.getCookie("token");
    console.log("token:" + token)
    im.accessToken = token
    im.start();

    //deal with chat mode.
    $("#entry").keypress(function (e) {
        var target = parseInt($("#usersList").val());
        if (e.keyCode != 13 /* Return */) return;
        var msg = $("#entry").val().replace("\n", "");
        if (!util.isBlank(msg)) {
            var obj = {"text": msg};
            var textMsg = JSON.stringify(obj);
            var message = {customerID:username, customerAppID: appID, storeID:storeID,
                           sellerID:sellerID, content: textMsg, msgLocalID:msgLocalID++};
            if (im.connectState == IMService.STATE_CONNECTED) {
                im.sendCustomerMessage(message);
                im.sendPeerMessage(message);
                $("#entry").val(""); // clear the entry field.
                if (target != '*' && target != username) {
                    addMessage(username, target, msg);
                    $("#chatHistory").show();
                }
            }
        }
    });
});
