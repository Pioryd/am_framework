const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

/**
 * @description contains things related only to application as
 *  system application.
 */

/**
 * @param {Function} on_closing
 * @param {Function} on_force_closing
 */
function setup_exit_handlers(on_closing, on_force_closing) {
  process.stdin.resume(); //so the program will not close instantly

  this.exitHandler = (options, exitCode) => {
    if (options.cleanup) on_closing();
    else on_force_closing();

    if (exitCode || exitCode === 0) logger.info(exitCode);
    if (options.exit) process.exit();
  };

  //do something when app is closing
  process.on("exit", this.exitHandler.bind(null, { cleanup: true }));

  //catches ctrl+c event
  process.on("SIGINT", this.exitHandler.bind(null, { exit: true }));

  // catches "kill pid" (for example: nodemon restart)
  process.on("SIGUSR1", this.exitHandler.bind(null, { exit: true }));
  process.on("SIGUSR2", this.exitHandler.bind(null, { exit: true }));

  //catches uncaught exceptions
  process.on("uncaughtException", this.exitHandler.bind(null, { exit: true }));
}

module.exports = { setup_exit_handlers };
