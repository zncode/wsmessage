var server = require('http').createServer(function(req, res){
    console.log('http call!');
});
var WsMessage = require('./wsmessage').listen(server);
var path = require("path");

var port = 5000;
server.listen(port);


WsMessage.msg.on('new_connect', function(socket) {
    console.log('创建新连接:' + socket.id );
});
WsMessage.msg.on('register', function(socket) {
    //console.log('新用户userid:' + socket.uid  + " socketid:" + socket.id + " sessionid: " + socket.session_id);
    console.log('新用户userid:' + socket.uid  + " socketid:" + socket.id);
});
WsMessage.msg.on('remove_peer', function(socket) {
    console.log("用户" + socket.uid + "用户关闭连接:" + socket.id);
});
WsMessage.msg.on('bye', function(socket) {
    console.log("用户离开" + socket.uid );
});

WsMessage.msg.on('new_peer', function(socket, room) {
    console.log("新用户" + socket.uid + "加入房间" + room);
});

WsMessage.msg.on('socket_message', function(socket, msg) {
    console.log("接收到来自" + socket.uid + "的新消息：" + msg);
});

WsMessage.msg.on('ice_candidate', function(socket, ice_candidate) {
    console.log("接收到来自" + socket.uid + "的ICE Candidate" + JSON.stringify(ice_candidate));
});

WsMessage.msg.on('offer', function(socket, offer) {
    console.log("接收到来自" + socket.uid + "的Offer" + JSON.stringify(offer) );
});

WsMessage.msg.on('answer', function(socket, answer) {
    console.log("接收到来自" + socket.uid + "的Answer:" + JSON.stringify(answer) );
});

WsMessage.msg.on('error', function(error) {
    console.log("发生错误：" + error.message);
});
