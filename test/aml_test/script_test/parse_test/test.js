const { expect } = require("chai");
const path = require("path");
const _ = require("lodash");
const Helper = require("../../helper");

const helper_1 = new Helper({
  aml_full_path: __dirname
});
const helper_2 = new Helper({
  json_full_name: path.join(__dirname, "test.json")
});

describe("Script Parser", () => {
  before(() => {
    helper_1.load_source();
    helper_2.load_source();
  });
  describe("parse", () => {
    it("1", () => {
      expect(
        _.isEqual(
          helper_1.source.scripts["ID_1"],
          helper_2.source.scripts["ID_1"]
        )
      ).to.be.true;
    });
    it("2", () => {
      expect(
        _.isEqual(
          helper_1.source.scripts["ID_2"],
          helper_2.source.scripts["ID_2"]
        )
      ).to.be.true;
    });
    it("3", () => {
      expect(
        _.isEqual(
          helper_1.source.scripts["ID_3"],
          helper_2.source.scripts["ID_3"]
        )
      ).to.be.true;
    });
    it("4", () => {
      expect(
        _.isEqual(
          helper_1.source.scripts["ID_4"],
          helper_2.source.scripts["ID_4"]
        )
      ).to.be.true;
    });
  });
});
