var { expect } = require("chai");
const fs = require("fs");
const { Config } = require("../../src/config");
const { Util } = require("../../src/util");
const path = require("path");

const config_path_dist_full_name = path.join(__dirname, "config.test.json");
const config_path_temp_full_name = path.join(
  __dirname,
  "config.test.json.temp"
);

let config = null;

describe("Config test", () => {
  before(function() {
    fs.copyFileSync(
      config_path_dist_full_name,
      config_path_temp_full_name,
      err => {
        if (err) throw err;
      }
    );

    if (config != null) config.terminate();
    config = new Config({ file_full_name: config_path_temp_full_name });
  });

  it("Is config.data null at start?", () => {
    expect(config.data).to.equal(null);
  });

  it("Load", () => {
    config.load();
    expect(config.data.port).to.equal(3000);
    expect(config.data.text).to.equal("hello");
  });

  it("Change data", () => {
    Util.write_to_json(config_path_temp_full_name, {
      port: 4000,
      text: "hi"
    });
  });

  it("Is file watch working?", () => {
    expect(config.data.port).to.equal(4000);
  });

  it("Terminate config", () => {
    expect(() => {
      config.terminate();
    }).to.not.throw(Error);

    if (fs.existsSync(config_path_temp_full_name))
      fs.unlinkSync(config_path_temp_full_name);
  });
});
