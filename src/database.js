const mongoose = require("mongoose");
const log = require("simple-node-logger").createSimpleLogger();

class Database {
  constructor({ url, name, setup_models }) {
    this.connection = null;
    this.url = url;
    this.name = name;
    this.setup_models = setup_models;
  }

  connect(callback = () => {}) {
    const process_callback = db => {
      db.listCollections().toArray((error, collections) => {
        try {
          if (error) log.error(error);

          this.setup_models(this.connection);
          callback(collections);
        } catch (e) {
          console.log(e);
        }
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
      (error, client) => {
        try {
          if (error) {
            log.error(error);
            return;
          }

          log.info("Connected to server:", this.get_connection_name());

          process_callback(client.db);
        } catch (e) {
          console.log(e);
        }
      }
    );
  }

  close() {
    if (this.connection == null) return;
    log.info("Closing connection:", this.get_connection_name());
    this.connection.close();
  }

  get_connection_name() {
    return `${this.url}/${this.name}`;
  }

  is_connecting() {
    if (this.connection == null) return;
    return this.connection.readyState === 2;
  }

  is_connected() {
    if (this.connection == null) return;
    return this.connection.readyState === 1;
  }

  is_disconnecting() {
    if (this.connection == null) return;
    return this.connection.readyState === 3;
  }

  is_disconnected() {
    if (this.connection == null) return;
    return this.connection.readyState === 0;
  }

  get_ready_state() {
    if (this.connection == null) return;
    return this.connection.readyState;
  }
}

module.exports = { Database };