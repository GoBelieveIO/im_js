export interface RTMessage {
    sender:number;
    receiver:number;
    content:string;
}

export interface IMMessage {
    sender:number;
    receiver:number;
    timestamp:number;
    content:string;
    isSelf?:boolean;
}

export interface CustomerMessage extends IMMessage {
    senderAppID:number;
    receiverAppID:number;
}

export interface PeerMessageObserver {
    handlePeerMessage(msg:any);
    handlePeerMessageACK?(msg);
    handlePeerMessageFailure?(msg);
}

export interface GroupMessageObserver {
    handleGroupMessage(msg);
    handleGroupMessageACK?(msg);
    handleGroupMessageFailure?(msg);
    handleGroupNotification?(msg);
}

export interface CustomerMessageObserver {
    handleCustomerMessage(msg);
    handleCustomerMessageACK?(msg);
    handleCustomerMessageFailure?(msg);
}

export interface RTMessageObserver {
    handleRTMessage(msg);
}

export interface SystemMessageObserver {
    handleSystemMessage(msg);
}

export interface RoomMessageObserver {
    handleRoomMessage(msg);
}

export interface Observer {
    onConnectState?(state:number);
    handleNotification?(msg);
    saveSyncKey?(syncKey);
}

export default class IMService {
    accessToken:string;
    protocol:string;
    host:string;
    port:number;
    syncKey:number;
    deviceID:string;
    platformID:number;
    peerMessageObserver?:PeerMessageObserver;
    groupMessageObserver?:GroupMessageObserver;
    customerMessageObserver?:CustomerMessageObserver;
    rtMessageObserver?:RTMessageObserver;
    systemMessageObserver?:SystemMessageObserver;
    roomMessageObserver?:RoomMessageObserver;
    observer?:Observer;

    connectState:number;
    sendPeerMessage(IMMessage);
    sendGroupMessage(IMMessage);
    sendRTMessage(RTMessage);
    sendCustomerMessage(msg:CustomerMessage);
    enterRoom(roomID:number);
    leaveRoom(roomID:number);
    handleConnectivityChange(reach:string);
    enterBackground();
    enterForeground();
    start();
    stop();
}

export const STATE_UNCONNECTED = 0;
export const STATE_CONNECTING = 1;
export const STATE_CONNECTED = 2;
export const STATE_CONNECTFAIL = 3;
export const STATE_AUTHENTICATION_FAIL = 4;