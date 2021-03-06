var interceptor = require('../');
var http = require('http');
var should = require('should');
var net = require('net');

describe('#interceptor', function() {
  describe('#net', function() {
    var _server;
    var proxy;
    var client;
    before(function() {
      _server = net.createServer(function(s) {
        s.pipe(s);
        s.on('error', function() {
          s.write(err.message);
        });
      });
      _server.listen(16789);
      proxy = interceptor.create('127.0.0.1:16789');
      proxy.listen(16788);
      client = net.connect(16788, '127.0.0.1');
    });

    after(function() {
      proxy.close();
      _server.close();
    });

    it('should ok at first', function(done) {
      client.once('data', function(data) {
        String(data).should.equal('ping');
        done();
      });
      client.write('ping');
    });

    it('should ok connect twice', function(done) {
      var count = 2;
      var client2 = net.connect(16788, '127.0.0.1');
      client2.once('data', function(data) {
        String(data).should.equal('ping');
        if (--count === 0){
          client2.end();
          setTimeout(function () {
            done();
          }, 100);
        }
      });
      client2.write('ping');

      client.once('data', function(data) {
        String(data).should.equal('ping');
        if (--count === 0){
          client2.end();
          setTimeout(function () {
            done();
          }, 100);
        }
      });
      client.write('ping');
    });

    it('should intercept by proxy', function(done) {
      proxy.block();
      var timer = setTimeout(function() {
        client.end();
        setTimeout(function() {
          _server._connections.should.equal(0);
          done();
        }, 100);
      }, 100);
      client.once('data', function(data) {
        clearTimeout(timer);
      });
      client.write('ping');
    });

    it('should reopen ok', function(done) {
      proxy.open();
      client = net.connect(16788, '127.0.0.1');
      client.once('data', function(data) {
        String(data).should.equal('ping');
        done();
      });
      client.write('ping');
    });

    it('should end ok', function(done) {
      client.end();
      setTimeout(function(){
        _server._connections.should.equal(0);
        done();
      },100);
    });
  });

  describe('#http', function() {
    var _server;
    var proxy;
    var client;
    before(function() {
      _server = http.createServer(function(req, res) {
        res.end(req.method + req.url);
      });
      _server.listen(16789);
      proxy = interceptor.create('127.0.0.1:16789');
      proxy.listen(16788);
    });

    after(function() {
      proxy.close();
      _server.close();
    });

    it('should ok at first', function(done) {
      http.get('http://127.0.0.1:16788/test', function(res) {
        res.statusCode.should.equal(200);
        res.on('data', function(data) {
          String(data).should.equal('GET/test');
          done();
        });
      });
    });

    it('should intercept by proxy', function(done) {
      proxy.block();
      var timer = setTimeout(function() {
        setTimeout(function() {
          done();
        }, 100);
      }, 100);
      http.get('http://127.0.0.1:16788/test', function(res) {
        res.on('data', function() {
          clearTimeout(timer);
        });
      });
    });

    it('should reopen ok', function(done) {
      proxy.open();
      http.get('http://127.0.0.1:16788/test', function(res) {
        res.statusCode.should.equal(200);
        res.on('data', function(data) {
          String(data).should.equal('GET/test');
          done();
        });
      });
    });
  });
});
