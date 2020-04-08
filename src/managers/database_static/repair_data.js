const { create_logger } = require("../../logger");

const logger = create_logger({
  module_name: "am_framework",
  file_name: __filename
});

const repair_data = ({ manager }) => {
  logger.log("Repair data...");

  manager.root_module.data.settings.corrupted = false;
};

module.exports = { repair_data };
