class Logger {
  constructor(options) {
    this.options = {
      module_name: "",
      file_name: "",
      show_time: true,
      show_type: true,
      print_log: true,
      print_info: true,
      print_error: true,
      print_trace: true,
      print_warn: true,
      print_debug: true,
      ...options
    };
  }

  log(...args) {
    if (this.options.print_log) this.print("log", "\x1b[30m\x1b[107m", ...args);
  }

  info(...args) {
    if (this.options.print_info)
      this.print("info", "\x1b[97m\x1b[44m", ...args);
  }

  error(...args) {
    if (this.options.print_error)
      this.print("error", "\x1b[31m\x1b[107m", ...args);
  }

  trace(...args) {
    if (this.options.print_trace)
      this.print("trace", "\x1b[34m\x1b[107m", ...args);
  }

  warn(...args) {
    if (this.options.print_warn)
      this.print("warn", "\x1b[30m\x1b[43m", ...args);
  }

  debug(...args) {
    if (this.options.print_debug)
      this.print("debug", "\x1b[32m\x1b[40m", ...args);
  }

  print(message_type, color, ...args) {
    let time = "";
    let type = "";
    if (this.options.show_time)
      time = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "numeric",
        minute: "numeric",
        second: "numeric"
      });
    if (this.options.show_type) type = message_type.toUpperCase();

    console[message_type](
      color,
      `${time}`,
      "(",
      type,
      ")",
      `<${this.options.module_name}>`,
      `{${this.options.file_name}}`,
      "\x1b[0m\x1b[0m",
      "\n",
      ...args
    );
  }
}

function create_logger(...args) {
  return new Logger(...args);
}

module.exports = { create_logger };
