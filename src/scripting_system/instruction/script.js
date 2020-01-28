const parse = require("./parse");
const { Stopwatch } = require("../../stopwatch");
const { RETURN_CODE } = require("./return_code");

class Script {
  constructor({ name, source, root }) {
    const { data, root_scope } = source;

    this.root = root;
    this._source = source;
    this.name = name;
    this.data = JSON.parse(JSON.stringify(data));

    this._root_scope = parse(root_scope);

    this._sleep_timer = {
      enabled: false,
      stopwatch: new Stopwatch(0)
    };

    this._goto_find = { enabled: false, label_name: "" };
  }

  process(root) {
    // Internal:sleep
    if (this._sleep_timer.enabled) {
      if (this._sleep_timer.stopwatch.is_elapsed()) {
        this._sleep_timer.enabled = false;
      } else {
        return { return_code: RETURN_CODE.PROCESSING };
      }
    }

    // Internal:goto
    if (this._goto_find.enabled) {
      const { return_code } = this._root_scope.process(this, root);

      if (!this._goto_find.enabled) return { return_code };
      else if (return_code === RETURN_CODE.PROCESSED)
        throw "Unable to find [goto label]";
    }

    const { return_code, internal } = this._root_scope.process(this, root);

    if (internal === "goto") return { return_code: RETURN_CODE.PROCESSING };
    else return { return_code };
  }

  sleep(time) {
    this._sleep_timer.enabled = true;
    this._sleep_timer.stopwatch.reset(time);
  }

  goto(label_name) {
    this._goto_find.enabled = true;
    this._goto_find.label_name = label_name;
  }
}

module.exports = Script;
