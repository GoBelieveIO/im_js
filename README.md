#IM JS SDK


## IMService Methods

- **constructor**
    - Initializes the client
    - **Parameters**
      - `observer` (`Object`): optional, im service observer

- accessToken
    - property must be set before start

- start
    - Start im service

- stop
    - Stop im service

- sendPeerMessage
    - Send a message to peer
    - **Parameters**
      - `msg` (`Object`): message property(sender, receiver, content, msgLocalID)

## IMService Observer

- onConnectState
    - callback when im service connection state changed
    - **Parameters**
      - `state`:im service's connect state

- onReset
    - callback when current uid logined in other place
    
- handlePeerMessage
    - callback when im service received a peer message
    - **Parameters**
      - `msg` (`Object`): message property(sender, receiver, content, timestamp)

- handleMessageACK
    - callback when im service received an ack of message
    - **Parameters**
      - `msgLocalID` (`Number`): message local id
      - `receiver` (`Number`): receiver's uid

- handleMessageFailure
    - callback when im service can't send out the message
    - **Parameters**
      - `msgLocalID` (`Number`): message local id
      - `receiver` (`Number`): receiver's uid


##example



    <script src="/engine.io.js"></script>
    <script src="/json2.js"></script>
    <script src="/im.js"></script>
    <script>
      var observer = {
          handlePeerMessage: function (msg) {
              console.log("msg sender:", msg.sender, " receiver:", msg.receiver, " content:", msg.content, " timestamp:", msg.timestamp)
          },
          handleMessageACK: function(msgLocalID, receiver) {
              console.log("message ack local id:", msgLocalID, " receiver:", receiver)
          },
          handleMessageFailure: function(msgLocalID, receiver) {
              console.log("message fail local id:", msgLocalID, " receiver:", receiver)
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
          },
          onReset: function() {
              console.log("reset");
          }
      }
      
      var im = new IMService(observer);
      im.accessToken = "????";
      im.start()

      var msg = {sender:100, receiver:200, content:"11", msgLocalID:1000}

      //connectState == STATE_CONNECTING
      var r = im.sendPeerMessage(msg);
      //r == false
      console.log("send message result:", r);

      function send() {
          var msg = {sender:100, receiver:100, content:"11", msgLocalID:1000}
          if (im.connectState == IMService.STATE_CONNECTED) {
              im.sendPeerMessage(msg);
          }
      }

      setTimeout(send, 2000)
    </script>



