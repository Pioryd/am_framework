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
      print_warn: true,
      print_debug: false,
      ...options
    };
  }

  log(...args) {
    if (this.options.print_log) this.print("log", ...args);
  }

  info(...args) {
    if (this.options.print_info) this.print("info", ...args);
  }

  error(...args) {
    if (this.options.print_error) this.print("error", ...args);
  }

  warn(...args) {
    if (this.options.print_warn) this.print("warn", ...args);
  }

  debug(...args) {
    if (this.options.print_debug) this.print("debug", ...args);
  }

  print(message_type, ...args) {
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
      `[${time}]`,
      `(${type})`,
      `<${this.options.module_name}>`,
      `{${this.options.file_name}}`,
      "\n",
      ...args
    );
  }
}

function create_logger(...args) {
  return new Logger(...args);
}

module.exports = { create_logger };
