class Stopper {
  constructor() {
    this.start_time = null;
    this.diff_time = 0;
  }

  _reset() {
    this.start_time = 0;
    this.diff_time = 0;
  }

  start() {
    this._reset();
    this.start_time = new Date();
  }

  stop() {
    this.diff_time = new Date() - this.start_time;
  }

  get_elapsed_milliseconds() {
    return this.diff_time;
  }

  get_elapsed_seconds() {
    return this.diff_time / 1000;
  }

  get_elapsed_hours() {
    return this.diff_time / 1000 / 60;
  }
}

module.exports = { Stopper };
