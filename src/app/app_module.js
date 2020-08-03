const EventEmitter = require("events");
const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

class AppModule extends EventEmitter {
  constructor({ event_emitter, config, data }) {
    super();

    this.event_emitter = event_emitter;
    this.application = event_emitter;
    this.config = config;
    this.data = data;
    this.managers = {};

    this._ready = false;
    this._terminated = false;

    this.__order = {};
  }

  // The order is important for logic
  setup_managers({ managers, order, black_list }) {
    // this.managers is used before setup_managers, object cannot be overwritten
    for (const [key, value] of Object.entries(managers)) {
      if (black_list != null && black_list.includes(key)) {
        logger.info(`Manager name [${key}] is blacklisted.`);
        order.initialize = order.initialize.filter((e) => e !== key);
        order.terminate = order.terminate.filter((e) => e !== key);
        order.poll = order.poll.filter((e) => e !== key);
        continue;
      }
      if (!order.initialize.includes(key))
        throw new Error(`Order[initialize] not include manager[${key}]`);
      if (!order.terminate.includes(key))
        throw new Error(`Order[terminate] not include manager[${key}]`);
      if (!order.poll.includes(key))
        throw new Error(`Order[poll] not include manager[${key}]`);

      this.managers[key] = value;
    }

    this.__order = order;
  }
  // Async
  on_initialize() {
    this._terminated = false;
    try {
      for (const manager_name of this.__order.initialize)
        this.managers[manager_name].initialize();
    } catch (e) {
      logger.error(e, e.stack);
    }

    this._ready = true;
  }

  // Async
  on_force_terminate() {
    if (this._terminated) return;

    logger.error(
      "Closing forced, unexpected behavior.\n" +
        "Check data before run module again."
    );

    this.on_terminate();
  }

  // Async
  on_terminate() {
    if (this._terminated) return;

    this._terminated = true;
  }

  on_run() {
    this._main_loop(this);
  }

  // Sync (self async)
  _main_loop(_this) {
    if (!_this._ready) return;

    try {
      if (_this._terminated) {
        _this._terminate(_this);
        return;
      }

      _this._poll(_this);
    } catch (e) {
      logger.error(e, e.stack);
    }

    setTimeout(() => {
      _this._main_loop(_this);
    }, 10);
  }

  _terminate(_this) {
    try {
      logger.info("Close module...");
      _this.event_emitter.removeAllListeners();

      for (const manager_name of this.__order.terminate)
        this.managers[manager_name].terminate();
    } catch (e) {
      logger.error(e, e.stack);
    }

    this._ready = false;
  }

  _poll(_this) {
    for (const manager_name of this.__order.poll) {
      try {
        this.managers[manager_name].poll();
      } catch (e) {
        logger.error({ manager_name }, e, e.stack);
      }
    }
  }
}

module.exports = { AppModule };
