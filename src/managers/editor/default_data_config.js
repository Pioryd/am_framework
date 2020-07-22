module.exports = {
  am_module: {
    db_data: { url: "mongodb://127.0.0.1:27017", name: "am_data" },
    actions: ["data", "update"],
    init: { id: "", name: "", rules: [] },
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
        ai: {
          type: "string"
        }
      },
      required: ["id", "name", "rules", "ai"],
      additionalProperties: false
    }
  },
  am_program: {
    db_data: { url: "mongodb://127.0.0.1:27017", name: "am_data" },
    actions: ["data", "update"],
    init: { id: "", name: "", rules: [] },
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
        connections: {
          type: "object"
        }
      },
      required: ["id", "name", "rules", "connections"],
      additionalProperties: false
    }
  },
  am_system: {
    db_data: { url: "mongodb://127.0.0.1:27017", name: "am_data" },
    actions: ["data", "update"],
    init: { id: "", name: "", rules: [] },
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
        }
      },
      required: ["id", "name", "rules"],
      additionalProperties: false
    }
  },
  am_script: {
    db_data: { url: "mongodb://127.0.0.1:27017", name: "am_data" },
    actions: ["data", "update"],
    init: { id: "", source: `name\r\ndata\r\n` },
    validate: "script"
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
