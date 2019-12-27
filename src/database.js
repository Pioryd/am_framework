const mongoose = require("mongoose");
const log = require("simple-node-logger").createSimpleLogger();

class Database {
  constructor({ url, name }) {
    this.connection = null;
    this.url = url;
    this.name = name;
  }

  connect(callback) {
    const process_callback = db => {
      db.listCollections().toArray(function(err, collections) {
        callback(collections);
      });
    };

    if (this.connection != null && this.is_connected()) {
      process_callback(this.connection.db);
      return;
    }

    this.connection = mongoose.createConnection(
      this.get_connection_name(),
      {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true
      },
      (err, client) => {
        if (err) {
          log.info(err);
          return;
        }

        log.info("Connected to server:", this.get_connection_name());

        process_callback(client.db);
      }
    );
  }

  close() {
    log.info("Closing connection:", this.get_connection_name());
    this.connection.close();
  }

  get_connection_name() {
    return `${this.url}/${this.name}`;
  }

  is_connecting() {
    return this.connection.readyState === 2;
  }

  is_connected() {
    return this.connection.readyState === 1;
  }

  is_disconnecting() {
    return this.connection.readyState === 3;
  }

  is_disconnected() {
    return this.connection.readyState === 0;
  }

  get_ready_state() {
    return this.connection.readyState;
  }
}

module.exports = { Database };
