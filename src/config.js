const fs = require("fs");
const path = require("path");
const _ = require("lodash");

const { Util } = require("./util");

const logger = require("./logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

const INIT_CONFIG = {
  modules: {
    module_example: {
      managers_order: {
        initialize: ["admin_server"],
        terminate: ["admin_server"],
        poll: ["admin_server"]
      },
      managers_map: {
        admin_server: {
          login: "admin",
          password: "123",
          options: {
            port: 3101,
            packet_timeout: 0
          },
          socket_io_options: {}
        }
      }
    }
  }
};
class Config {
  constructor({
    default_data = {},
    file_full_name,
    folder_full_name,
    on_update = () => {}
  }) {
    this.data = default_data || {};
    this.file_full_name = file_full_name;
    this.folder_full_name = folder_full_name;
    this.on_update = on_update;

    this.watcher = null;
  }

  _read_data_from_files() {
    if (this.folder_full_name != null && fs.existsSync(this.folder_full_name)) {
      for (const file of Util.get_files(this.folder_full_name))
        this.data = _.merge(
          Util.read_from_json(path.join(this.folder_full_name, file)),
          this.data
        );
    }

    this.data = _.merge(this.data, this.default_data);

    if (!fs.existsSync(this.file_full_name)) {
      logger.info("Not found config.json. Create new one.");
      Util.write_to_json(this.file_full_name, INIT_CONFIG);
      this.data = _.merge(this.data, INIT_CONFIG);
    } else {
      this.data = _.merge(this.data, Util.read_from_json(this.file_full_name));
    }
  }
  load() {
    this._read_data_from_files();

    this.watcher = fs.watch(this.file_full_name, (curr, prev) => {
      this.on_update();
      this._read_data_from_files();
    });
  }

  save() {
    if (this.data != null) Util.write_to_json(this.file_full_name, this.data);
  }

  terminate() {
    if (this.watcher != null) {
      this.watcher.close();
      this.watcher = null;
    }

    this.save();
  }
}

module.exports = { Config };
