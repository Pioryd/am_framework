const fs = require("fs");
const { Util } = require("./util");

// Config i async
class Config {
  constructor({ file_full_name, on_update = () => {} }) {
    this.file_full_name = file_full_name;
    this.on_update = on_update;
    this.data = null;
    this.watcher = null;
  }

  _read_data_from_file() {
    this.data = Util.read_from_json(this.file_full_name);
  }

  load() {
    this._read_data_from_file();

    this.watcher = fs.watch(this.file_full_name, (curr, prev) => {
      this.on_update();
      this._read_data_from_file();
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
