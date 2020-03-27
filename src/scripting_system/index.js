const Root = require("./root");
const Validator = require("./instruction/validator");
const AML = require("./aml");
module.exports = {
  ScriptingSystem: {
    Root,
    Instruction: { Validator },
    AML
  }
};
