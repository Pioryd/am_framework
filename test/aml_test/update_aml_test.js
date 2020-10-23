const { expect } = require("chai");
const path = require("path");
const Helper = require("./helper");

const helper = new Helper({
  json_full_name: path.join(__dirname, "update_aml_test.json")
});

describe("Update aml", () => {
  before(() => {
    helper.load_source();
  });
  it("Program only", () => {
    const root = helper.create_root();

    expect(root._program).to.equal(null);
    root.update_mirror({ aml: { program: "ID_Program_0" } });
    expect(root._program).to.not.equal(null);
  });
  it("Program only and then program, modules, scripts", () => {
    const root = helper.create_root();

    {
      root.update_mirror({
        aml: {
          program: "ID_Program_0",
          modules: {},
          scripts: {}
        }
      });
      const { _running_modules } = root._program;
      expect(root._program).to.not.equal(null);
      expect(Object.keys(_running_modules).length).to.equal(0);
    }

    {
      root.update_mirror({
        aml: {
          program: "ID_Program_1",
          modules: { Name_Module: "ID_Module_1" },
          scripts: { Name_Script: "ID_Script_1" }
        }
      });
      const { _running_modules } = root._program;
      const { _running_scripts } = _running_modules["Name_Module"];
      expect(Object.keys(_running_modules).length).to.equal(1);
      expect(Object.keys(_running_modules)[0]).to.equal("Name_Module");
      expect(Object.keys(_running_scripts).length).to.equal(1);
      expect(Object.keys(_running_scripts)[0]).to.equal("Name_Script");
    }
  });
  it("Full program and then update all start from scripts", () => {
    const root = helper.create_root();

    {
      root.update_mirror({
        aml: {
          program: "ID_Program_1",
          modules: { Name_Module: "ID_Module_1" },
          scripts: { Name_Script: "ID_Script_1" }
        }
      });
      const { _running_modules } = root._program;
      const { _running_scripts } = _running_modules["Name_Module"];
      expect(Object.keys(_running_modules).length).to.equal(1);
      expect(_running_modules["Name_Module"].get_id()).to.equal("ID_Module_1");
      expect(Object.keys(_running_scripts).length).to.equal(1);
      expect(_running_scripts["Name_Script"].get_id()).to.equal("ID_Script_1");
    }

    {
      root.update_mirror({
        aml: {
          program: "ID_Program_1",
          modules: { Name_Module: "ID_Module_1" },
          scripts: { Name_Script: "ID_Script_0" }
        }
      });
      const { _running_modules } = root._program;
      const { _running_scripts } = _running_modules["Name_Module"];
      expect(Object.keys(_running_modules).length).to.equal(1);
      expect(_running_modules["Name_Module"].get_id()).to.equal("ID_Module_1");
      expect(Object.keys(_running_scripts).length).to.equal(1);
      expect(_running_scripts["Name_Script"].get_id()).to.equal("ID_Script_0");
    }

    {
      root.update_mirror({
        aml: {
          program: "ID_Program_1",
          modules: { Name_Module: "ID_Module_0" },
          scripts: { Name_Script: "ID_Script_0" }
        }
      });
      const { _running_modules } = root._program;
      const { _running_scripts } = _running_modules["Name_Module"];
      expect(Object.keys(_running_modules).length).to.equal(1);
      expect(_running_modules["Name_Module"].get_id()).to.equal("ID_Module_0");
      expect(Object.keys(_running_scripts).length).to.equal(0);
    }

    {
      root.update_mirror({
        aml: {
          program: "ID_Program_0",
          modules: { Name_Module: "ID_Module_0" },
          scripts: { Name_Script: "ID_Script_0" }
        }
      });
      const { _running_modules } = root._program;
      expect(Object.keys(_running_modules).length).to.equal(0);
    }

    {
      root.update_mirror({
        aml: {
          program: "ID_Program_1",
          modules: { Name_Module: "ID_Module_0" },
          scripts: { Name_Script: "ID_Script_0" }
        }
      });
      const { _running_modules } = root._program;
      const { _running_scripts } = _running_modules["Name_Module"];
      expect(Object.keys(_running_modules).length).to.equal(1);
      expect(_running_modules["Name_Module"].get_id()).to.equal("ID_Module_0");
      expect(Object.keys(_running_scripts).length).to.equal(0);
    }
  });
});
