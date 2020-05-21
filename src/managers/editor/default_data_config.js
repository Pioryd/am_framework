module.exports = {
  am_form: {
    db_data: { url: "mongodb://127.0.0.1:27017", name: "am_data" },
    actions: ["data", "update"],
    init: { id: "", rules: [], scripts: [] },
    validate: {
      properties: {
        id: {
          type: "string"
        },
        name: {
          type: "string"
        },
        rules: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string"
              },
              triggers: {
                type: "array"
              },
              actions: {
                type: "array"
              }
            },
            additionalProperties: false
          }
        },
        scripts: {
          type: "array",
          items: {
            type: "string"
          }
        }
      },
      required: ["id", "name", "rules", "scripts"],
      additionalProperties: false
    }
  },
  am_program: {
    db_data: { url: "mongodb://127.0.0.1:27017", name: "am_data" },
    actions: ["data", "update"],
    init: { id: "", rules: [], forms: [] },
    validate: {
      properties: {
        id: {
          type: "string"
        },
        name: {
          type: "string"
        },
        rules: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string"
              },
              triggers: {
                type: "array"
              },
              actions: {
                type: "array"
              }
            },
            additionalProperties: false
          }
        },
        forms: {
          type: "array",
          items: {
            type: "string"
          }
        }
      }
    },
    required: ["id", "name", "rules", "forms"],
    additionalProperties: false
  },
  am_system: {
    db_data: { url: "mongodb://127.0.0.1:27017", name: "am_data" },
    actions: ["data", "update"],
    init: { id: "", programs: [] },
    validate: {
      properties: {
        id: {
          type: "string"
        },
        name: {
          type: "string"
        },
        programs: {
          type: "array",
          items: {
            type: "string"
          }
        }
      },
      required: ["id", "name", "programs"],
      additionalProperties: false
    }
  },
  am_script: {
    db_data: { url: "mongodb://127.0.0.1:27017", name: "am_data" },
    actions: ["data", "update"],
    init: { id: "", source: `data\r\n` },
    validate: "aml"
  },
  admin_script: {
    db_data: { manager: "admin_scripts" },
    actions: ["data", "update", "process"],
    init: {
      id: "",
      type: "",
      desc: "",
      args: [],
      fn: `(app, args) => {}`
    },
    validate: "js"
  }
};
