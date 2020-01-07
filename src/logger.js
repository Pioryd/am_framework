class Logger {
  constructor({
    module_name = "",
    file_name = "",
    show_time = true,
    show_type = true
  }) {
    this.options = { module_name, file_name, show_time, show_type };
  }

  log(...args) {
    this.print("log", ...args);
  }

  info(...args) {
    this.print("info", ...args);
  }

  error(...args) {
    this.print("error", ...args);
  }

  warn(...args) {
    this.print("warn", ...args);
  }

  debug(...args) {
    this.print("debug", ...args);
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
