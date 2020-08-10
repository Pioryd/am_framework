const ObjectID = require("bson-objectid");
const logger = require("./logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

class Action {
  constructor(parent) {
    this._parent = parent;
    this._id = ObjectID().toHexString();
    this._active = false;
    this._uid = null;
    this._timeout = 0;
    this._timeout_id = null;
    this._interval_id = null;
    this._rules = { start: () => {}, stop: () => {} };
    this._events = { start: () => {}, stop: () => {}, timeout: () => {} };
    this._map = {};

    this.data = {};
  }

  create({ uid, rules, events, timeout, interval, data }) {
    if (uid != null) {
      for (const action of Object.values(this._map))
        if (action._uid === uid) return;
    }

    const action = new Action(this);
    if (uid != null) action._uid = uid;
    if (timeout != null) action._timeout = timeout || this._timeout;
    if (rules != null && rules.start != null) action._rules.start = rules.start;
    if (rules != null && rules.stop != null) action._rules.stop = rules.stop;
    if (events != null && events.start != null)
      action._events.start = events.start;
    if (events != null && events.stop != null)
      action._events.stop = events.stop;
    if (events != null && events.timeout != null)
      action._events.timeout = events.timeout;
    if (data != null) action.data = data;

    this._map[action._id] = action;

    if (timeout > 0) {
      action._timeout_id = setTimeout(() => {
        action.stop();
        action._events.timeout(this);
        logger.debug(
          `Action id[${action._id}] uid[${action._uid}]` +
            ` data[${JSON.stringify(action.data)}] timeout.`
        );
      }, timeout);
    }

    if (rules != null && Object.keys(rules).length > 0) {
      action._interval_id = setInterval(() => {
        if (
          !action.is_active() &&
          action._rules.start != null &&
          action._rules.start(action) === true
        ) {
          action.start();
        }
        if (
          action.is_active() &&
          action._rules.stop != null &&
          action._rules.stop(action) === true
        ) {
          action.stop();
        }
      }, interval || 10);
    }

    if (rules == null || rules.start == null) {
      setTimeout(() => {
        action.start();
      });
    }

    return action;
  }

  start() {
    this._active = true;
    this._events.start(this);
  }

  stop() {
    if (!this.is_active()) return;

    if (this._timeout_id != null) clearTimeout(this._timeout_id);
    if (this._interval_id != null) clearInterval(this._interval_id);
    this._active = false;
    for (const child_action of Object.values(this._map)) child_action.stop();
    delete this._parent._map[this._id];

    this._events.stop(this);
  }

  is_active() {
    return this._active;
  }
}

module.exports = { Action };
