const fs = require("fs");
const path = require("path");
const _ = require("lodash");

const { Util } = require("./util");

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
    if (this.folder_full_name != null) {
      for (const file of Util.get_files(this.folder_full_name))
        this.data = _.merge(
          Util.read_from_json(path.join(this.folder_full_name, file)),
          this.data
        );
    }

    this.data = _.merge(this.data, this.default_data);
    this.data = _.merge(this.data, Util.read_from_json(this.file_full_name));
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
