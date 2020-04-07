const path = require("path");
const { Util } = require("../../src/util");
const { Stopper } = require("../../src/stopper");
const { Stopwatch } = require("../../src/stopwatch");
const Root = require("../../src/scripting_system/root");
const parse = require("../../src/scripting_system/instruction/parse");

const scripts_full_name = path.join(__dirname, "api_test.json");

class Helper {
  constructor() {
    this.root = new Root();
    this.api = {};
    this.options = { manual_poll: false };
    this.received_data_list = [];
  }

  initialize() {
    this._setup_api();
    this._setup_root();
  }

  get_script(options) {
    this.options = options;
    return parse(
      this.root.source.forms["Test_form"],
      this._get_script_by_name(this.options.name)
    );
  }

  manual_poll() {
    if (this.options.manual_poll === false) return;
    while (this.received_data_list.length > 0)
      this.root.return_data.insert(this.received_data_list.pop());
  }

  _get_script_by_name(name) {
    for (const script of this.root.source.forms["Test_form"]._source.scripts)
      if (script.name === name) return script;
    throw new Error(`Script[${name}] not found.`);
  }

  _setup_root() {
    this.root = new Root();
    const scripts_source = Util.read_from_json(scripts_full_name);

    this.root.source.forms = {
      Test_form: { _source: { scripts: [] }, _root: this.root }
    };
    this.root.api_map = this.api;
    this.root.generate_unique_id = () => {
      return "1";
    };

    for (const script of Object.values(scripts_source))
      this.root.source.forms["Test_form"]._source.scripts.push(script);
  }

  _setup_api() {
    this.api = {
      local: {
        add_min_max: {
          local_fn: ({ root, timeout, args }) => {
            return args.min + args.max;
          }
        }
      },
      remote: {
        add_min_max: {
          remote_fn: ({ fn_full_name, script_id, query_id, timeout, args }) => {
            if (this.options.receive_lock) return;

            // Send -> "process_api" (From MAM to ServerApi)
            // ...
            // Server api -> remote (From ServerApi to MAM)
            const value = args.min + args.max;
            // Parse -> "process_api" (MAM)
            //const { script_id, query_id, value } = data;

            const received_data = {
              script_id,
              query_id,
              value
            };

            if (this.options.manual_poll === true)
              this.received_data_list.push(
                JSON.parse(JSON.stringify(received_data))
              );
            else this.root.return_data.insert(received_data);
          }
        }
      }
    };
  }
}

module.exports = Helper;
