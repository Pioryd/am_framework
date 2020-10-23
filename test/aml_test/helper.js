const path = require("path");
const fs = require("fs");
const _ = require("lodash");
const Root = require("../../src/aml/root");
const { Util } = require("../../src/util");
const to_json = require("../../src/aml/script/to_json");

class Helper {
  constructor({ json_full_name, aml_full_path }) {
    this.config = { json_full_name, aml_full_path };
    this.source = {};
    this.simulation = {
      root: {},
      manual_poll: false,
      receive_lock: false,
      api: { add_min_max: (...args) => this._add_min_max(...args) },
      received_data_list: []
    };
  }

  load_source() {
    if (this.config.json_full_name != null) {
      Object.assign(
        this.source,
        Util.read_from_json(this.config.json_full_name)
      );
    }

    if (this.config.aml_full_path != null) {
      if (this.source.scripts == null) this.source.scripts = {};
      const aml_files_names = fs
        .readdirSync(this.config.aml_full_path)
        .filter((value) => value.includes(".aml"));

      for (const aml_file_name of aml_files_names) {
        const id = aml_file_name.split(".").slice(0, -1).join(".");
        this.source.scripts[id] = to_json(
          id,
          fs.readFileSync(
            path.join(this.config.aml_full_path, aml_file_name),
            "utf8",
            (err) => {
              if (err) throw new Error(err);
            }
          )
        );
      }
    }
  }

  create_root() {
    const root = new Root(
      (args) => this._process_api(args),
      ({ type, id }, callback) => callback(this.source[`${type}s`][id])
    );
    // root.options.debug_enabled = true;
    root.generate_unique_id = () => {
      return "1";
    };
    return root;
  }

  manual_poll() {
    if (this.simulation.manual_poll === false) return;

    while (this.simulation.received_data_list.length > 0)
      this.simulation.root.parse_return_data(
        this.simulation.received_data_list.pop()
      );
  }

  _process_api(data) {
    try {
      this.simulation.api[data.api](data);
    } catch (e) {
      console.error(
        `API - unable to call api_fn. Error(${e.message})` +
          `\nArgs[${JSON.stringify({ ...data, root: null })}]` +
          `\nApiMap[${JSON.stringify(this.simulation.api)}]`
      );
    }
  }

  _add_min_max({ root, api, module, query_id, timeout, args }) {
    if (this.simulation.receive_lock) return;

    // Send -> "process_api" (From [aml client] to [world server])
    // ...
    // Server api -> remote (From [world server] to [aml client])
    const value = args.min + args.max;
    // Parse -> "process_api" (aml)

    const received_data = {
      module,
      query_id,
      value
    };

    if (this.simulation.manual_poll === true)
      this.simulation.received_data_list.push(_.cloneDeep(received_data));
    else this.simulation.root.parse_return_data(received_data);
  }
}

module.exports = Helper;
