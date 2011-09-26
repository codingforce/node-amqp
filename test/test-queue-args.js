require('./harness');

connection.on('ready', function() {
  var qName = 'node-queue-args-queue';
  puts("connected to " + connection.serverProperties.product);

  cleanUp(connection, qName, doCheck);
});


function doCheck(conn1, qName) {
  var args1 = {};
  conn1.queue( qName, {'arguments': args1 }, function(q1) {
    puts("queue declared");
    assert.deepEqual(q1.options.arguments, args1, 'arguments to not match');
    var conn2 = makeConnection({});
    conn2.on('ready', function() {
      var q2 = conn2.queue(
        qName, {'arguments': {'x-ha-policy': 'all'}}, function() {
          puts("second queue declared");
        }
      );
      q2.on('error', function(err) {
        assert.equal(err.code, 406);
        assert.ok(err.message.indexOf('PRECONDITION_FAILED') == 0);
        conn1.end();
        conn2.end();
      });
      q2.on('queueDeclareOk', function(event) {
        assert.ok(false, 'queue should not have been created');
      });
    });
  });
};

function cleanUp(conn, qName, actualTest) {
  // start with a clean slate: make sure queue doesn't exist
  var q = connection.queue(qName, {passive: true}, function () {
    q.destroy();
    q.on('queueDeleteOk', function() { return actualTest(connection, qName) });
  });

  q.on('error', function (err) {
    if (err.code == 404) {
      // ok, queue doesn't exist
      return actualTest(connection, qName);
    }
    throw err;
  });
}
