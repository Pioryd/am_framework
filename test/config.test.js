const assert = require("assert");
const fs = require("fs");
const { Config } = require("../src/config");
const { Util } = require("../src/util");
const path = require("path");

const config_path_dist_full_name = path.join(__dirname, "config.test.json");
const config_path_temp_full_name = path.join(
  __dirname,
  "config.test.json.temp"
);

let config = null;

describe("Config test", () => {
  function delay(interval) {
    return it("Delay", done => {
      setTimeout(() => done(), interval);
    }).timeout(interval + 100); // The extra 100ms should guarantee the test will not fail due to exceeded timeout
  }

  before(function() {
    fs.copyFileSync(
      config_path_dist_full_name,
      config_path_temp_full_name,
      err => {
        if (err) throw err;
      }
    );

    if (config != null) config.terminate();
    config = new Config(config_path_temp_full_name);
  });

  it("Is config.data null at start?", () => {
    assert.equal(config.data, null);
  });

  it("Load", () => {
    config.load();
    assert.equal(config.data.port, 3000);
    assert.equal(config.data.text, "hello");
  });

  it("Change data", () => {
    Util.write_to_json(config_path_temp_full_name, {
      port: 4000,
      text: "hi"
    });
  });

  it("Is file watch working?", () => {
    assert.equal(config.data.port, 4000);
  });

  it("Terminate config", () => {
    assert.doesNotThrow(() => {
      config.terminate();
    }, Error);

    fs.unlinkSync(config_path_temp_full_name);
  });
});
