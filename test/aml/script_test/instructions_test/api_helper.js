const path = require("path");
const { Util } = require("../../../../src/util");
const Root = require("../../../../src/aml/root");
const Script = require("../../../../src/aml/script");

const scripts_full_name = path.join(__dirname, "api_test.json");

class Helper {
  constructor() {
    this.root = new Root();
    this.api = {};
    this.scripts = Util.read_from_json(scripts_full_name);
    this.options = { manual_poll: false };
    this.received_data_list = [];
  }

  initialize() {
    this._setup_api();
    this._setup_root();
  }

  get_script(options) {
    this.options = options;
    return new Script(this.root, this.scripts[this.options.id]);
  }

  manual_poll() {
    if (this.options.manual_poll === false) return;
    while (this.received_data_list.length > 0)
      this.root.return_data.insert(this.received_data_list.pop());
  }

  _setup_root() {
    this.root = new Root();

    this.root.process_api = (
      fn_full_name,
      script_id,
      query_id,
      timeout,
      args
    ) => this.process_api({ fn_full_name, script_id, query_id, timeout, args });
    this.root.generate_unique_id = () => {
      return "1";
    };
  }

  process_api({ fn_full_name, script_id, query_id, timeout, args }) {
    let debug_fn = "Not found api fn";
    try {
      let api = null;
      eval(`api = this.api.${fn_full_name}`);
      if (api == null) throw new Error(`API[${fn_full_name}] not found`);

      api({ fn_full_name, script_id, query_id, timeout, args });
    } catch (e) {
      console.error(
        `API - unable to call function(${e.message}): ${debug_fn.toString()}.` +
          ` Args[${JSON.stringify({
            fn_full_name,
            script_id,
            query_id,
            timeout,
            args
          })}]` +
          `ApiMap[${JSON.stringify(this.api)}]`
      );
    }
  }

  _setup_api() {
    this.api = {
      add_min_max: ({ fn_full_name, script_id, query_id, timeout, args }) => {
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
    };
  }
}

module.exports = Helper;
