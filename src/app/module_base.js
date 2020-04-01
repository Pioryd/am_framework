const EventEmitter = require("events");
const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

class ModuleBase extends EventEmitter {
  constructor({ event_emitter, config, data }) {
    super();

    this.event_emitter = event_emitter;
    this.application = event_emitter;
    this.config = config;
    this.data = data;
    this.managers = {};

    this._ready = false;
    this._terminate = false;

    this.__order = {};
  }

  // The order is important for logic
  setup_managers({ managers, order }) {
    this.managers = managers;
    this.__order = order;
  }
  // Async
  on_initialize() {
    this._terminate = false;
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
    if (this._terminate) return;

    logger.error(
      "Closing forced, unexpected behavior.\n" +
        "Check data before run module again."
    );

    this.on_terminate();
  }

  // Async
  on_terminate() {
    if (this._terminate) return;

    this._terminate = true;
  }

  on_run() {
    this._main_loop(this);
  }

  // Sync (self async)
  _main_loop(_this) {
    if (!_this._ready) return;

    try {
      if (_this._terminate) {
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
    for (const manager_name of this.__order.poll)
      this.managers[manager_name].poll();
  }
}

module.exports = { ModuleBase };
