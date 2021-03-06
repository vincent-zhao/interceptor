/*!
 * Multi - Redis
 * Copyright(c) 2012 dead_horse <dead_horse@qq.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
var net = require('net');

/**
 * Interceptor constractor
 * @param {Object} options 
 * @constructor
 */
var Interceptor = function(target) {
  this.target = target.split(':');
  if (this.target.length !== 2) {
    throw new Error('target type error, must like 127.0.0.1:6379');
  }
  this.inStream = net.createServer(this._connectionHandler.bind(this));
  this.blocking = false;
  this.closed = false;
  this.outArr = [];
}

/**
 * listen port
 * @public
 */
Interceptor.prototype.listen = function() {
  this.connectInfo = arguments;
  this.inStream.listen.apply(this.inStream, arguments);
}

/**
 * instream connnection handler
 * @param  {net.Socket} socket 
 * @private
 */
Interceptor.prototype._connectionHandler = function(socket) {
  var outStream = net.connect(this.target[1], this.target[0]);
  this.outArr.push(outStream);
  outStream.on('data', function(data) {
    !this.blocking && socket.write(data);
  }.bind(this));

  outStream.on('end', function(data) {
    !this.blocking && socket.end(data);
  }.bind(this));

  outStream.on('error', function(err) {
    !this.blocking && socket.emit('error', err);
  }.bind(this));
  socket.on('data', function(data) {
    !this.blocking && outStream.write(data);
  }.bind(this));

  socket.on('end', function(data) {
    outStream.end(data);
    if (this.blocking && !this.closed) {
      this.inStream.close();
      this.closed = true;
    }
  }.bind(this));

  socket.on('error', function(err) {
    !this.blocking && outStream.emit('error', err);
  }.bind(this));
}

/**
 * block the net
 * @public
 */
Interceptor.prototype.block = function() {
  this.blocking = true;
}

/**
 * open the net
 * @public
 */
Interceptor.prototype.open = function() {
  this.blocking = false;
  this.closed && this.connectInfo && this.listen.apply(this, this.connectInfo);
  this.closed = false;
}

Interceptor.prototype.close = function() {
  this.outArr.forEach(function (c) {
    c.end();
  });
  if (!this.closed) {
    this.inStream && this.inStream.close();
    this.closed = true;
  }
}

exports.create = function(target) {
  return new Interceptor(target);
}
