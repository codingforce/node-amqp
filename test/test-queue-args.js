require('./harness');

connection.on('ready', function() {
  var qName = 'node-queue-args-queue';
  puts("connected to " + connection.serverProperties.product);

  cleanUp(connection, qName, doCheck);
});


function doCheck(conn, qName) {
  var args1 = {'x-expires': 30000};
  var q1 = conn.queue( qName, {'arguments': args1 }, function(q1) {
    puts("queue declared");
    assert.deepEqual(q1.options.arguments, args1, 'arguments to not match');
    var q2 = conn.queue(
      qName, {'arguments': {'x-expires': 30001}}, function() {
        puts("second queue declared");
      }
    );
    q2.on('error', function(err) {
      assert.equal(err.code, 406);
      assert.ok(err.message.indexOf('PRECONDITION_FAILED') == 0);
      puts('redeclaration with different arguments raised exception');
      conn.end();
    });
    q2.on('queueDeclareOk', function(event) {
      assert.ok(false, 'queue should not have been created');
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
