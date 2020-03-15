const { expect, config } = require("chai");
const path = require("path");
const { Util } = require("../../src/util");
const Validator = require("../../src/scripting_system/validator");

const validator_rules_full_name = path.join(
  __dirname,
  "validator_rules_test.json"
);
const validator_data_full_name = path.join(
  __dirname,
  "validator_data_test.json"
);

let rules_source = null;
let data_source = null;

function validate(number_rules, number_data) {
  if (number_data == null) number_data = number_rules;
  new Validator(rules_source[number_rules]).validate(data_source[number_data]);
}
describe("Validator", () => {
  before(() => {
    rules_source = Util.read_from_json(validator_rules_full_name);
    data_source = Util.read_from_json(validator_data_full_name);
  });
  describe("Validator object - string/number/boolean", () => {
    it("01", () =>
      expect(() => validate("01")).to.throw(
        Error,
        'Value of object[{"key":"id","value":""}]' +
          " cannot be empty. of key[:id]."
      ));
    it("02", () =>
      expect(() => validate("02")).to.not.throw(
        Error,
        "Value of key[:id] cannot be empty."
      ));
    it("03", () => expect(() => validate("03")).to.not.throw(Error));
    it("04", () => expect(() => validate("04")).to.not.throw(Error));
    it("05", () =>
      expect(() => validate("05")).to.throw(
        Error,
        'Value of object[{"key":"name","value":""}]' +
          " cannot be empty. of key[:name]."
      ));
    it("06", () => expect(() => validate("06")).to.not.throw(Error));
    it("07", () =>
      expect(() => validate("07")).to.throw(
        Error,
        'Value of object[{"key":"id","value":2}]' +
          " must be type[string]. Rule key[:id]."
      ));
    it("08", () => expect(() => validate("08")).to.not.throw(Error));
    it("09", () =>
      expect(() => validate("09")).to.not.throw(
        Error,
        "Value of key[:id] must be type[string]."
      ));
    it("10", () => expect(() => validate("10")).to.not.throw(Error));
  });
  describe("Validator array - string", () => {
    it("11", () => expect(() => validate("11")).to.not.throw(Error));
    it("12", () =>
      expect(() => validate("12")).to.throw(
        Error,
        'Value of object[{"key":"scripts","value":true}]' +
          " must be type[string]. Rule key[:scripts]."
      ));
    it("13", () =>
      expect(() => validate("13")).to.throw(
        Error,
        "Value of key[:scripts] cannot be empty."
      ));
    it("14", () =>
      expect(() => validate("14")).to.throw(
        Error,
        'Value of object[{"key":"scripts","value":""}]' +
          " cannot be empty. of key[:scripts]."
      ));
  });
  describe("Validator array - object", () => {
    it("15a", () => expect(() => validate("15", "15a")).to.not.throw(Error));
    it("15b", () =>
      expect(() => validate("15", "15b")).to.throw(
        Error,
        'Value of object[{"key":"value","value":2}] must be type[string].' +
          " Rule key[:trigger_action:value]."
      ));
    it("15c", () =>
      expect(() => validate("15", "15c")).to.throw(
        Error,
        "Rule[:trigger_action] doesn't contains object key[date]."
      ));
    it("15d", () =>
      expect(() => validate("15", "15d")).to.throw(
        Error,
        "Object of array object[form_dest] of rule key[:trigger_action]" +
          " cannot be empty."
      ));
    it("15e", () =>
      expect(() => validate("15", "15e")).to.throw(
        Error,
        "Wrong array object format (empty). Correct is" +
          ' {"key": {value_1: "data...", (n)}}. Rule key[:trigger_action].'
      ));
  });
  describe("Allowed/Disallowed values ", () => {
    it("16a", () => expect(() => validate("16", "16a")).to.not.throw(Error));
    it("16b", () =>
      expect(() => validate("16", "16b")).to.throw(
        Error,
        'Object[{"key":"id","value":"hi"}] with of rule key[:id]' +
          " contains disallowed value."
      ));
    it("17a", () => expect(() => validate("17", "17a")).to.not.throw(Error));
    it("17b", () =>
      expect(() => validate("17", "17b")).to.throw(
        Error,
        'Object[{"key":"id","value":5}] with of rule key[:id]' +
          " contains disallowed value. [disallowed_values]"
      ));
    it("18a", () => expect(() => validate("18", "18a")).to.not.throw(Error));
    it("18b", () =>
      expect(() => validate("18", "18b")).to.throw(
        Error,
        'Object[{"key":"arr","value":4}] with of rule key[:arr]' +
          " contains disallowed value. [disallowed_values]"
      ));
    it("18c", () =>
      expect(() => validate("18", "18c")).to.throw(
        Error,
        'Object[{"key":"arr","value":12}] with of rule key[:arr]' +
          " contains disallowed value. [allowed_values]"
      ));
    it("19a", () => expect(() => validate("19", "19a")).to.not.throw(Error));
    it("19b", () =>
      expect(() => validate("19", "19b")).to.throw(
        Error,
        'Object[{"key":"id","value":7}] with of rule key[:arr:id]' +
          " contains disallowed value. [disallowed_values]"
      ));
    it("19c", () =>
      expect(() => validate("19", "19c")).to.throw(
        Error,
        'Object[{"key":"value","value":"new_text"}]' +
          " with of rule key[:arr:value] contains disallowed value." +
          " [allowed_values]"
      ));
  });
});
