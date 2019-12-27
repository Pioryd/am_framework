class Stopwatch {
  constructor(countdown_time) {
    this.countdown_time = countdown_time;
    this.state_start_time = new Date();
  }

  reset() {
    this.state_start_time = new Date();
  }

  is_elapsed() {
    return this.countdown_time < this.get_elapsed_milliseconds();
  }

  get_elapsed_milliseconds() {
    return new Date() - this.state_start_time;
  }

  get_elapsed_seconds() {
    return (new Date() - this.state_start_time) / 1000;
  }

  get_elapsed_hours() {
    return (new Date() - this.state_start_time) / 1000 / 60;
  }
}

module.exports = { Stopwatch };
