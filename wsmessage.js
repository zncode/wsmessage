//wsmessage.js

var WebSocketServer = require('ws').Server;
var UUID            = require('node-uuid');
var events          = require('events');
var util            = require('util');
var mysql           = require('mysql');

var errorCb         = function(msg){
    return function(error){
        if(error){
            msg.emit("error", error);
        }
    };
};


function WsMessage(){
    this.socket = [];
    this.rooms = {};
    this.users = {};
    
    var connection = mysql.createConnection({
        host: 'rdsmcaz1q7ij010idl7kpublic.mysql.rds.aliyuncs.com',
        user: 'realusion',
        password: 'A1@3785abc9#1',
        port: '3306',
    });
    
    connection.connect(function(error){
        if(error)
        {
            console.log('[query] - :' + error);
            return;
        }
        console.log('[connection connect] succeed!');
    });
   
    this.on('__register', function(data, socket){
        //记录用户userid
        socket.uid              = data.uid;
        socket.appid            = data.appid;
        socket.thumbnail        = data.thumbnail
        socket.nickname         = data.nickname;

        this.users[data.uid] = socket;

        socket.send(JSON.stringify({
            "eventName": "__register",
            "data": {
                "code": 200,
                "you": socket.id
            }
        }), errorCb);

        this.emit("register", socket, data);
    });

    this.on('__connect', function(data, socket){
        var sSessionKey = data.sessionid;

        connection.query("select * from vcdata_session.realusion_session where sSessionKey = '" + sSessionKey + "'", function(err, rows, fields){
            if(!rows){
                console.log('[query] - : 没有数据');
                    socket.send(JSON.stringify({
                        "eventName": "__connect",
                        "data": {
                            "code":         1,
                            "socketid":     socket.id,
                            'msg':          "没有数据!"
                        }
                    }), errorCb);
                    return;
            }
            var sValue = rows[0].sSessionValue;
            console.log('The sSessionValue is: ', sValue);

            socket.uid              = '123';
            socket.appid            = '123456';
            socket.thumbnail        = '1.jpg'
            socket.nickname         = 'nickname';

            console.log("连接成功!");

            socket.send(JSON.stringify({
                "eventName": "__connect",
                "data": {
                    "code":         0,
                    "socketid":     socket.id,
                    "uid":          socket.uid,
                    "appid":        socket.appid,
                    "thumbnail":    socket.thumbnail,
                    "nickname":     socket.nickname,
                    'msg':          "连接成功!"
                }
            }), errorCb);
        });

        this.users[socket.uid] = socket;
        
        connection.end(function(err){
            if(err)
            {
                return;
            }
            console.log('[connection end] succeed!');
        });
    });

    this.on('__ping', function(data, socket){
        //记录用户userid
        socket.uid              = data.uid;
        socket.appid            = data.appid;
        
        console.log("Ping成功!");

        socket.send(JSON.stringify({
            "eventName": "__ping",
            "data": {
                "code": 0,
                "you": socket.id,
                'msg': "Ping成功!"
            }
        }), errorCb);
    });

    this.on('__logout', function(data, socket){
        
        console.log("Logout成功!");

        socket.send(JSON.stringify({
            "eventName": "__logout",
            "data": {
                "code": 0,
                "you": socket.id,
                'msg': "logout成功!"
            }
        }), errorCb);
    });

    this.on('__createRoom', function(data, socket){
        var identifier = 4;
        //var roomId = (new Date().getTime()) ^ Math.random();
        var roomid = 'chatroom';
        var userIdx = 30;
        var sql = "select * from realusion_data.v_showalbum where user_idx = ? AND idx = ? AND chtype = 'PVLF';";
        var sqlParams = [userIdx, identifier];
        connection.query(sql, sqlParams, function(err, rows, fields){
            if(!rows){
                console.log('[query] - : 没有数据');
                    socket.send(JSON.stringify({
                        "eventName": "__connect",
                        "data": {
                            "code":         1,
                            "socketid":     socket.id,
                            'msg':          "没有数据!"
                        }
                    }), errorCb);
                    return;
            }
            else
            {
                var sqlUpdate = "update from realusion_data.v_showalbum set chatting_key = ?";
                var sqlUpdateParams = roomid;
                connection.query(sqlUpdate, sqlUpdateParams);
            }

            socket.roomid           = roomid;

            console.log("创建房间成功!");

            socket.send(JSON.stringify({
                "eventName": "__createRoom",
                "data": {
                    "code":     0,
                    "roomid":   socket.roomid,
                    'msg':      "创建房间成功!"
                }
            }), errorCb);
        });
    });

    //取得在线用户列表
    this.on('__get_contacts', function(data, socket) {
        var i,
        curSocket,
        users = [];

        for (i = this.sockets.length; i--;) {
            if( socket.uid === this.sockets[i].uid ) {
                continue;
            }
            users.push(this.sockets[i].uid);
        }

        //返回自己的标识socketid
        socket.send(JSON.stringify({
            "eventName": "__get_contacts",
            "data": {
                "users": users
            }
        }), errorCb);
        console.log("取得在线用户__get_contacts:" + users );
    });

    //主动加入聊天室处理
    this.on('__join', function(data, socket) {
        var ids = [],i, m,room = data.room ,curSocket,curRoom;

        //查找此房间
        curRoom = this.rooms[room];
        if( !curRoom ) {
            //返回房间信息
            socket.send(JSON.stringify({
                "eventName": "__join",
                "data": {
                    "code": 404,
                }
            }), errorCb);
            return;
        }

        console.log("聊天室目前人数:" + curRoom.length );
        
        //通知房间里的其他人 有新人加入
        for (i = 0, m = curRoom.length; i < m; i++) {
            curSocket = curRoom[i];
            if (curSocket.id === socket.id) {
                continue;
            }
            ids.push(curSocket.uid);

            curSocket.send(JSON.stringify({
                "eventName": "_new_peer",
                "data": {
                    "from": socket.uid,
                    "room": room
                }
            }), errorCb);
            console.log( "发送_new_peer消息:" + JSON.stringify({
                "eventName": "_new_peer",
                "data": {
                    "from": socket.uid,
                    "room": room
                }
            }) );
        }

        //房间里添加新用户
        curRoom.push(socket);
        //记录用户所属房间
        socket.room = room;	

        //返回房间信息
        socket.send(JSON.stringify({
            "eventName": "_peers",
            "data": {
                "connections": ids,
            }
        }), errorCb);
        console.log( "发送_peers消息:" + JSON.stringify({
            "eventName": "_peers",
            "data": {
                "connections": ids,
            }
        }) );
        this.emit('new_peer', socket, room);
    });

    //退出聊天处理
    this.on('__bye', function(data, socket)  {
        var i, m,
        room = data.room,
        curRoom;
        if (room) {
            curRoom = this.rooms[room];
            //给聊天室其他成员发通知
            if(!curRoom) {
                console.log( "该聊天室不存在:" + room );
                return;
            }
            for (i = curRoom.length; i--;) {
                if (curRoom[i].uid === socket.uid && "active" === data.action ) {
                    continue;
                }
                curRoom[i].send(JSON.stringify({
                    "eventName": "_bye_peer",
                    "data": {
                        "room": data.room || "",
                        "action": data.action || "",
                        "to": data.to || "",
                        "from": socket.uid
                    }
                }), errorCb);
                console.log( "发送bye:" + curRoom[i].uid );
            }				
            //从聊天室里删除
            i = this.rooms[room].indexOf(socket);
            this.rooms[room].splice(i, 1);
            if (this.rooms[room].length === 0) {
                console.log( "删除聊天室:" + room );
                delete this.rooms[room];
            }
            socket.room = "";

            this.emit('bye', socket);
        }
    });

}

util.inherits(WsMessage, events.EventEmitter);

WsMessage.prototype.addSocket = function(socket){
    this.socket.push(socket);
};

WsMessage.prototype.removeSocket = function(socket){
    var i = this.socket.indexOf(socket);
   // this.sockets.splice(i,1);
    //TODO remove room
};

WsMessage.prototype.broadcast = function(data, errorCb) {
    var i;
    for (i = this.sockets.length; i--;) {
        this.sockets[i].send(data, errorCb);
    }
};

WsMessage.prototype.broadcastInRoom = function(room, data, errorCb) {
    var curRoom = this.rooms[room],
    i;
    if (curRoom) {
        for (i = curRoom.length; i--;) {
            curRoom[i].send(data, errorCb);
        }
    }
    console.log( "广播broadcastInRoom:" + rooms );
};

WsMessage.prototype.getRooms = function() {
    var rooms = [],
    room;
    for (room in this.rooms) {
        rooms.push(room);
    }
    console.log( "取房间getRooms:" + rooms );
    return rooms;
};

WsMessage.prototype.getSocket = function(id) {
    var i,
    curSocket;
    if (!this.sockets) {
        return;
    }
    for (i = this.sockets.length; i--;) {
        curSocket = this.sockets[i];
        if (id === curSocket.id) {
            return curSocket;
        }
    }
    return;
};

WsMessage.prototype.sendMessage = function(message, userid) {
    this.socket.send(JSON.stringify({
        "eventName": "__sendMessage",
        "data": {
            "message": message,
            "from": this.userid,
            "to": userid
        }
    }));	
    console.log( "发送消息:" + message );
}

WsMessage.prototype.receiveMessage = function(message, fromid) {
    this.socket.send(JSON.stringify({
        "eventName": "__receiveMessage",
        "data": {
            "message": message,
            "from": fromid,
        }
    }));	
    console.log( "接收消息:" + message );
}


WsMessage.prototype.init = function(socket) {
    var that = this;
    socket.id = UUID.v4();

    that.addSocket(socket);
    
    //添加事件处理器
    socket.on('message', function(data){
        var json = JSON.parse(data);
        if(json.eventName){
            console.log("绑定事件处理器: "+ json.eventName + ":" + JSON.stringify(data));
            that.emit(json.eventName, json.data, socket);
        }else{
            that.emit("socket_message", socket, data);
        }
    });

    //连接关闭后，处理
    socket.on('close', function(){
        that.removeSocket(socket);
        socket.close();
    });

    that.emit('new_connect', socket);
};

module.exports.listen = function(server){
    var WsMessageServer;
    if(typeof server === 'number'){
        WsMessageServer = new WebSocketServer({
            port: server
        });
    }else{
        WsMessageServer = new WebSocketServer({
            server: server
        });
    }
    
    WsMessageServer.msg = new WsMessage();
    errorCb = errorCb(WsMessageServer.msg);
    WsMessageServer.on('connection', function(socket){
        this.msg.init(socket);
    });

    return WsMessageServer;
};

