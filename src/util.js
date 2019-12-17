const fw_fs = require("fs");

class Util {
  static read_from_json(file_name) {
    const json = fw_fs.readFileSync(file_name, "utf8", err => {
      if (err) throw err;
    });

    return JSON.parse(json);
  }

  static write_to_json(file_name, data) {
    const json = JSON.stringify(data, null, 2);

    fw_fs.writeFileSync(file_name, json, "utf8", err => {
      if (err) throw err;
    });
  }

  static get_time_hms() {
    return new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "numeric",
      minute: "numeric",
      second: "numeric"
    });
  }

  static is_path_exist(path) {
    return fw_fs.existsSync(path);
  }

  static get_directories(path) {
    if (!this.is_path_exist(path)) {
      console.log(
        "Unable to get directories. Path does NOT not exist: " + path
      );
      return [];
    }
    return fw_fs
      .readdirSync(path, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  }

  /**
   * Returns a random number between min (inclusive) and max (exclusive)
   */
  static get_random_arbitrary(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Returns a random integer between min (inclusive) and max (inclusive).
   * The value is no lower than min (or the next integer greater than min
   * if min isn't an integer) and no greater than max (or the next integer
   * lower than max if max isn't an integer).
   * Using Math.round() will give you a non-uniform distribution!
   */
  static get_random_int(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

module.exports = { Util };
