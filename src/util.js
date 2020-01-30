const fs = require("fs");
const logger = require("./logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});
class Util {
  static read_from_json(file_name) {
    const json = fs.readFileSync(file_name, "utf8", err => {
      if (err) throw err;
    });

    return JSON.parse(json);
  }

  static write_to_json(file_name, data) {
    const json = JSON.stringify(data, null, 2);

    fs.writeFileSync(file_name, json, "utf8", err => {
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
    return fs.existsSync(path);
  }

  static get_directories(path) {
    if (!this.is_path_exist(path)) {
      logger.info(
        "Unable to get directories. Path does NOT not exist: " + path
      );
      return [];
    }
    return fs
      .readdirSync(path, { withFileTypes: true })
      .filter(dir => dir.isDirectory())
      .map(dir => dir.name);
  }

  static get_files(path) {
    if (!this.is_path_exist(path)) {
      logger.info(
        "Unable to get directories. Path does NOT not exist: " + path
      );
      return [];
    }
    return fs
      .readdirSync(path, { withFileTypes: true })
      .filter(dir => dir.isFile())
      .map(dir => dir.name);
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

  /**
   * @description Convert function in any string format to Function object
   */
  static string_to_function(string) {
    const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
    const ARGUMENT_NAMES = /([^\s,]+)/g;
    string = string.replace(STRIP_COMMENTS, "");

    let params_names = string
      .slice(string.indexOf("(") + 1, string.indexOf(")"))
      .match(ARGUMENT_NAMES);
    if (params_names === null) params_names = [];

    let body = string.substring(
      string.indexOf("{") + 1,
      string.lastIndexOf("}")
    );

    try {
      return new Function(...params_names, body);
    } catch (e) {
      console.log({ ...params_names, body }, "Exception:", e);
    }
  }
}

module.exports = { Util };
