/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/hypha-rpc/dist/hypha-rpc-websocket.js":
/*!************************************************************!*\
  !*** ./node_modules/hypha-rpc/dist/hypha-rpc-websocket.js ***!
  \************************************************************/
/***/ (function(module) {

(function webpackUniversalModuleDefinition(root, factory) {
	if(true)
		module.exports = factory();
	else // removed by dead control flow
{}
})(this, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/rpc.js":
/*!********************!*\
  !*** ./src/rpc.js ***!
  \********************/
/***/ ((__unused_webpack_module, __nested_webpack_exports__, __nested_webpack_require_667__) => {

__nested_webpack_require_667__.r(__nested_webpack_exports__);
/* harmony export */ __nested_webpack_require_667__.d(__nested_webpack_exports__, {
/* harmony export */   API_VERSION: () => (/* binding */ API_VERSION),
/* harmony export */   RPC: () => (/* binding */ RPC)
/* harmony export */ });
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_0__ = __nested_webpack_require_667__(/*! ./utils */ "./src/utils/index.js");
/* harmony import */ var _utils_schema__WEBPACK_IMPORTED_MODULE_1__ = __nested_webpack_require_667__(/*! ./utils/schema */ "./src/utils/schema.js");
/* harmony import */ var _msgpack_msgpack__WEBPACK_IMPORTED_MODULE_2__ = __nested_webpack_require_667__(/*! @msgpack/msgpack */ "./node_modules/@msgpack/msgpack/dist.es5+esm/decode.mjs");
/* harmony import */ var _msgpack_msgpack__WEBPACK_IMPORTED_MODULE_3__ = __nested_webpack_require_667__(/*! @msgpack/msgpack */ "./node_modules/@msgpack/msgpack/dist.es5+esm/encode.mjs");
/**
 * Contains the RPC object used both by the application
 * site, and by each plugin
 */





const API_VERSION = 3;
const CHUNK_SIZE = 1024 * 256;
const CONCURRENCY_LIMIT = 30;

const ArrayBufferView = Object.getPrototypeOf(
  Object.getPrototypeOf(new Uint8Array()),
).constructor;

function _appendBuffer(buffer1, buffer2) {
  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
}

function indexObject(obj, is) {
  if (!is) throw new Error("undefined index");
  if (typeof is === "string") return indexObject(obj, is.split("."));
  else if (is.length === 0) return obj;
  else return indexObject(obj[is[0]], is.slice(1));
}

function _get_schema(obj, name = null, skipContext = false) {
  if (Array.isArray(obj)) {
    return obj.map((v, i) => _get_schema(v, null, skipContext));
  } else if (typeof obj === "object" && obj !== null) {
    let schema = {};
    for (let k in obj) {
      schema[k] = _get_schema(obj[k], k, skipContext);
    }
    return schema;
  } else if (typeof obj === "function") {
    if (obj.__schema__) {
      const schema = JSON.parse(JSON.stringify(obj.__schema__));
      if (name) {
        schema.name = name;
        obj.__schema__.name = name;
      }
      if (skipContext) {
        if (schema.parameters && schema.parameters.properties) {
          delete schema.parameters.properties["context"];
        }
      }
      return { type: "function", function: schema };
    } else {
      return { type: "function" };
    }
  } else if (typeof obj === "number") {
    return { type: "number" };
  } else if (typeof obj === "string") {
    return { type: "string" };
  } else if (typeof obj === "boolean") {
    return { type: "boolean" };
  } else if (obj === null) {
    return { type: "null" };
  } else {
    return {};
  }
}

function _annotate_service(service, serviceTypeInfo) {
  function validateKeys(serviceDict, schemaDict, path = "root") {
    // Validate that all keys in schemaDict exist in serviceDict
    for (let key in schemaDict) {
      if (!serviceDict.hasOwnProperty(key)) {
        throw new Error(`Missing key '${key}' in service at path '${path}'`);
      }
    }

    // Check for any unexpected keys in serviceDict
    for (let key in serviceDict) {
      if (key !== "type" && !schemaDict.hasOwnProperty(key)) {
        throw new Error(`Unexpected key '${key}' in service at path '${path}'`);
      }
    }
  }

  function annotateRecursive(newService, schemaInfo, path = "root") {
    if (typeof newService === "object" && !Array.isArray(newService)) {
      validateKeys(newService, schemaInfo, path);
      for (let k in newService) {
        let v = newService[k];
        let newPath = `${path}.${k}`;
        if (typeof v === "object" && !Array.isArray(v)) {
          annotateRecursive(v, schemaInfo[k], newPath);
        } else if (typeof v === "function") {
          if (schemaInfo.hasOwnProperty(k)) {
            newService[k] = (0,_utils_schema__WEBPACK_IMPORTED_MODULE_1__.schemaFunction)(v, {
              name: schemaInfo[k]["name"],
              description: schemaInfo[k].description || "",
              parameters: schemaInfo[k]["parameters"],
            });
          } else {
            throw new Error(
              `Missing schema for function '${k}' at path '${newPath}'`,
            );
          }
        }
      }
    } else if (Array.isArray(newService)) {
      if (newService.length !== schemaInfo.length) {
        throw new Error(`Length mismatch at path '${path}'`);
      }
      newService.forEach((v, i) => {
        let newPath = `${path}[${i}]`;
        if (typeof v === "object" && !Array.isArray(v)) {
          annotateRecursive(v, schemaInfo[i], newPath);
        } else if (typeof v === "function") {
          if (schemaInfo.hasOwnProperty(i)) {
            newService[i] = (0,_utils_schema__WEBPACK_IMPORTED_MODULE_1__.schemaFunction)(v, {
              name: schemaInfo[i]["name"],
              description: schemaInfo[i].description || "",
              parameters: schemaInfo[i]["parameters"],
            });
          } else {
            throw new Error(
              `Missing schema for function at index ${i} in path '${newPath}'`,
            );
          }
        }
      });
    }
  }

  validateKeys(service, serviceTypeInfo["definition"]);
  annotateRecursive(service, serviceTypeInfo["definition"]);
  return service;
}

function getFunctionInfo(func) {
  const funcString = func.toString();

  // Extract function name
  const nameMatch = funcString.match(/function\s*(\w*)/);
  const name = (nameMatch && nameMatch[1]) || "";

  // Extract function parameters, excluding comments
  const paramsMatch = funcString.match(/\(([^)]*)\)/);
  let params = "";
  if (paramsMatch) {
    params = paramsMatch[1]
      .split(",")
      .map((p) =>
        p
          .replace(/\/\*.*?\*\//g, "") // Remove block comments
          .replace(/\/\/.*$/g, ""),
      ) // Remove line comments
      .filter((p) => p.trim().length > 0) // Remove empty strings after removing comments
      .map((p) => p.trim()) // Trim remaining whitespace
      .join(", ");
  }

  // Extract function docstring (block comment)
  let docMatch = funcString.match(/\)\s*\{\s*\/\*([\s\S]*?)\*\//);
  const docstringBlock = (docMatch && docMatch[1].trim()) || "";

  // Extract function docstring (line comment)
  docMatch = funcString.match(/\)\s*\{\s*(\/\/[\s\S]*?)\n\s*[^\s\/]/);
  const docstringLine =
    (docMatch &&
      docMatch[1]
        .split("\n")
        .map((s) => s.replace(/^\/\/\s*/, "").trim())
        .join("\n")) ||
    "";

  const docstring = docstringBlock || docstringLine;
  return (
    name &&
    params.length > 0 && {
      name: name,
      sig: params,
      doc: docstring,
    }
  );
}

function concatArrayBuffers(buffers) {
  var buffersLengths = buffers.map(function (b) {
      return b.byteLength;
    }),
    totalBufferlength = buffersLengths.reduce(function (p, c) {
      return p + c;
    }, 0),
    unit8Arr = new Uint8Array(totalBufferlength);
  buffersLengths.reduce(function (p, c, i) {
    unit8Arr.set(new Uint8Array(buffers[i]), p);
    return p + c;
  }, 0);
  return unit8Arr.buffer;
}

class Timer {
  constructor(timeout, callback, args, label) {
    this._timeout = timeout;
    this._callback = callback;
    this._args = args;
    this._label = label || "timer";
    this._task = null;
    this.started = false;
  }

  start() {
    if (this.started) {
      this.reset();
    } else {
      this._task = setTimeout(() => {
        this._callback.apply(this, this._args);
      }, this._timeout * 1000);
      this.started = true;
    }
  }

  clear() {
    if (this._task && this.started) {
      clearTimeout(this._task);
      this._task = null;
      this.started = false;
    } else {
      console.warn(`Clearing a timer (${this._label}) which is not started`);
    }
  }

  reset() {
    if (this._task) {
      clearTimeout(this._task);
    }
    this._task = setTimeout(() => {
      this._callback.apply(this, this._args);
    }, this._timeout * 1000);
    this.started = true;
  }
}

class RemoteService extends Object {}

/**
 * RPC object represents a single site in the
 * communication protocol between the application and the plugin
 *
 * @param {Object} connection a special object allowing to send
 * and receive messages from the opposite site (basically it
 * should only provide send() and onMessage() methods)
 */
class RPC extends _utils__WEBPACK_IMPORTED_MODULE_0__.MessageEmitter {
  constructor(
    connection,
    {
      client_id = null,
      default_context = null,
      name = null,
      codecs = null,
      method_timeout = null,
      max_message_buffer_size = 0,
      debug = false,
      workspace = null,
      silent = false,
      app_id = null,
      server_base_url = null,
      long_message_chunk_size = null,
    },
  ) {
    super(debug);
    this._codecs = codecs || {};
    (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(client_id && typeof client_id === "string");
    (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(client_id, "client_id is required");
    this._client_id = client_id;
    this._name = name;
    this._app_id = app_id || "*";
    this._local_workspace = workspace;
    this._silent = silent;
    this.default_context = default_context || {};
    this._method_annotations = new WeakMap();
    this._max_message_buffer_size = max_message_buffer_size;
    this._chunk_store = {};
    this._method_timeout = method_timeout || 30;
    this._server_base_url = server_base_url;
    this._long_message_chunk_size = long_message_chunk_size || CHUNK_SIZE;

    // make sure there is an execute function
    this._services = {};
    this._object_store = {
      services: this._services,
    };

    if (connection) {
      this.add_service({
        id: "built-in",
        type: "built-in",
        name: `Built-in services for ${this._local_workspace}/${this._client_id}`,
        config: {
          require_context: true,
          visibility: "public",
          api_version: API_VERSION,
        },
        ping: this._ping.bind(this),
        get_service: this.get_local_service.bind(this),
        message_cache: {
          create: this._create_message.bind(this),
          append: this._append_message.bind(this),
          set: this._set_message.bind(this),
          process: this._process_message.bind(this),
          remove: this._remove_message.bind(this),
        },
      });
      this.on("method", this._handle_method.bind(this));
      this.on("error", console.error);

      (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(connection.emit_message && connection.on_message);
      (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(
        connection.manager_id !== undefined,
        "Connection must have manager_id",
      );
      this._emit_message = connection.emit_message.bind(connection);
      connection.on_message(this._on_message.bind(this));
      this._connection = connection;
      const onConnected = async (connectionInfo) => {
        if (!this._silent && this._connection.manager_id) {
          console.debug("Connection established, reporting services...");
          try {
            const manager = await this.get_manager_service({
              timeout: 10,
              case_conversion: "camel",
            });
            const services = Object.values(this._services);
            const servicesCount = services.length;
            let registeredCount = 0;

            for (let service of services) {
              try {
                const serviceInfo = this._extract_service_info(service);
                await manager.registerService(serviceInfo);
                registeredCount++;
              } catch (serviceError) {
                console.error(
                  `Failed to register service ${service.id || "unknown"}: ${serviceError}`,
                );
              }
            }

            if (registeredCount === servicesCount) {
              console.info(
                `Successfully registered all ${registeredCount} services with the server`,
              );
            } else {
              console.warn(
                `Only registered ${registeredCount} out of ${servicesCount} services with the server`,
              );
            }
          } catch (managerError) {
            console.error(
              `Failed to get manager service for registering services: ${managerError}`,
            );
          }
        } else {
          // console.debug("Connection established", connectionInfo);
        }
        if (connectionInfo) {
          if (connectionInfo.public_base_url) {
            this._server_base_url = connectionInfo.public_base_url;
          }
          this._fire("connected", connectionInfo);
        }
      };
      connection.on_connected(onConnected);
      onConnected();
    } else {
      this._emit_message = function () {
        console.log("No connection to emit message");
      };
    }
  }

  register_codec(config) {
    if (!config["name"] || (!config["encoder"] && !config["decoder"])) {
      throw new Error(
        "Invalid codec format, please make sure you provide a name, type, encoder and decoder.",
      );
    } else {
      if (config.type) {
        for (let k of Object.keys(this._codecs)) {
          if (this._codecs[k].type === config.type || k === config.name) {
            delete this._codecs[k];
            console.warn("Remove duplicated codec: " + k);
          }
        }
      }
      this._codecs[config["name"]] = config;
    }
  }

  async _ping(msg, context) {
    (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(msg == "ping");
    return "pong";
  }

  async ping(client_id, timeout) {
    let method = this._generate_remote_method({
      _rserver: this._server_base_url,
      _rtarget: client_id,
      _rmethod: "services.built-in.ping",
      _rpromise: true,
      _rdoc: "Ping a remote client",
    });
    (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)((await method("ping", timeout)) == "pong");
  }

  _create_message(key, heartbeat, overwrite, context) {
    if (heartbeat) {
      if (!this._object_store[key]) {
        throw new Error(`session does not exist anymore: ${key}`);
      }
      this._object_store[key]["timer"].reset();
    }

    if (!this._object_store["message_cache"]) {
      this._object_store["message_cache"] = {};
    }
    if (!overwrite && this._object_store["message_cache"][key]) {
      throw new Error(
        `Message with the same key (${key}) already exists in the cache store, please use overwrite=true or remove it first.`,
      );
    }
    this._object_store["message_cache"][key] = [];
  }

  _append_message(key, data, heartbeat, context) {
    if (heartbeat) {
      if (!this._object_store[key]) {
        throw new Error(`session does not exist anymore: ${key}`);
      }
      this._object_store[key]["timer"].reset();
    }
    const cache = this._object_store["message_cache"];
    if (!cache[key]) {
      throw new Error(`Message with key ${key} does not exists.`);
    }
    (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(data instanceof ArrayBufferView);
    cache[key].push(data);
  }

  _set_message(key, index, data, heartbeat, context) {
    if (heartbeat) {
      if (!this._object_store[key]) {
        throw new Error(`session does not exist anymore: ${key}`);
      }
      this._object_store[key]["timer"].reset();
    }
    const cache = this._object_store["message_cache"];
    if (!cache[key]) {
      throw new Error(`Message with key ${key} does not exists.`);
    }
    (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(data instanceof ArrayBufferView);
    cache[key][index] = data;
  }

  _remove_message(key, context) {
    const cache = this._object_store["message_cache"];
    if (!cache[key]) {
      throw new Error(`Message with key ${key} does not exists.`);
    }
    delete cache[key];
  }

  _process_message(key, heartbeat, context) {
    if (heartbeat) {
      if (!this._object_store[key]) {
        throw new Error(`session does not exist anymore: ${key}`);
      }
      this._object_store[key]["timer"].reset();
    }
    const cache = this._object_store["message_cache"];
    (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(!!context, "Context is required");
    if (!cache[key]) {
      throw new Error(`Message with key ${key} does not exists.`);
    }
    cache[key] = concatArrayBuffers(cache[key]);
    // console.debug(`Processing message ${key} (bytes=${cache[key].byteLength})`);
    let unpacker = (0,_msgpack_msgpack__WEBPACK_IMPORTED_MODULE_2__.decodeMulti)(cache[key]);
    const { done, value } = unpacker.next();
    const main = value;
    // Make sure the fields are from trusted source
    Object.assign(main, {
      from: context.from,
      to: context.to,
      ws: context.ws,
      user: context.user,
    });
    main["ctx"] = JSON.parse(JSON.stringify(main));
    Object.assign(main["ctx"], this.default_context);
    if (!done) {
      let extra = unpacker.next();
      Object.assign(main, extra.value);
    }
    this._fire(main["type"], main);
    // console.debug(
    //   this._client_id,
    //   `Processed message ${key} (bytes=${cache[key].byteLength})`,
    // );
    delete cache[key];
  }

  _on_message(message) {
    if (typeof message === "string") {
      const main = JSON.parse(message);
      this._fire(main["type"], main);
    } else if (message instanceof ArrayBuffer) {
      let unpacker = (0,_msgpack_msgpack__WEBPACK_IMPORTED_MODULE_2__.decodeMulti)(message);
      const { done, value } = unpacker.next();
      const main = value;
      // Add trusted context to the method call
      main["ctx"] = JSON.parse(JSON.stringify(main));
      Object.assign(main["ctx"], this.default_context);
      if (!done) {
        let extra = unpacker.next();
        Object.assign(main, extra.value);
      }
      this._fire(main["type"], main);
    } else if (typeof message === "object") {
      this._fire(message["type"], message);
    } else {
      throw new Error("Invalid message format");
    }
  }

  reset() {
    this._event_handlers = {};
    this._services = {};
  }

  async disconnect() {
    this._fire("disconnected");
    await this._connection.disconnect();
  }

  async get_manager_service(config) {
    config = config || {};

    // Add retry logic
    const maxRetries = 20;
    const retryDelay = 500; // 500ms

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (!this._connection.manager_id) {
        if (attempt < maxRetries - 1) {
          console.warn(
            `Manager ID not set, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${maxRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        } else {
          throw new Error("Manager ID not set after maximum retries");
        }
      }

      try {
        const svc = await this.get_remote_service(
          `*/${this._connection.manager_id}:default`,
          config,
        );
        return svc;
      } catch (e) {
        if (attempt < maxRetries - 1) {
          console.warn(
            `Failed to get manager service, retrying in ${retryDelay}ms: ${e.message}`,
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        } else {
          throw e;
        }
      }
    }
  }

  get_all_local_services() {
    return this._services;
  }
  get_local_service(service_id, context) {
    (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(service_id);
    const [ws, client_id] = context["to"].split("/");
    (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(
      client_id === this._client_id,
      "Services can only be accessed locally",
    );

    const service = this._services[service_id];
    if (!service) {
      throw new Error("Service not found: " + service_id);
    }

    service.config["workspace"] = context["ws"];
    // allow access for the same workspace
    if (service.config.visibility == "public") {
      return service;
    }

    // allow access for the same workspace
    if (context["ws"] === ws) {
      return service;
    }

    throw new Error(
      `Permission denied for getting protected service: ${service_id}, workspace mismatch: ${ws} != ${context["ws"]}`,
    );
  }
  async get_remote_service(service_uri, config) {
    let { timeout, case_conversion, kwargs_expansion } = config || {};
    timeout = timeout === undefined ? this._method_timeout : timeout;
    if (!service_uri && this._connection.manager_id) {
      service_uri = "*/" + this._connection.manager_id;
    } else if (!service_uri.includes(":")) {
      service_uri = this._client_id + ":" + service_uri;
    }
    const provider = service_uri.split(":")[0];
    let service_id = service_uri.split(":")[1];
    if (service_id.includes("@")) {
      service_id = service_id.split("@")[0];
      const app_id = service_uri.split("@")[1];
      if (this._app_id && this._app_id !== "*")
        (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(
          app_id === this._app_id,
          `Invalid app id: ${app_id} != ${this._app_id}`,
        );
    }
    (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(provider, `Invalid service uri: ${service_uri}`);

    try {
      const method = this._generate_remote_method({
        _rserver: this._server_base_url,
        _rtarget: provider,
        _rmethod: "services.built-in.get_service",
        _rpromise: true,
        _rdoc: "Get a remote service",
      });
      let svc = await (0,_utils__WEBPACK_IMPORTED_MODULE_0__.waitFor)(
        method(service_id),
        timeout,
        "Timeout Error: Failed to get remote service: " + service_uri,
      );
      svc.id = `${provider}:${service_id}`;
      if (kwargs_expansion) {
        svc = (0,_utils__WEBPACK_IMPORTED_MODULE_0__.expandKwargs)(svc);
      }
      if (case_conversion)
        return Object.assign(
          new RemoteService(),
          (0,_utils__WEBPACK_IMPORTED_MODULE_0__.convertCase)(svc, case_conversion),
        );
      else return Object.assign(new RemoteService(), svc);
    } catch (e) {
      console.warn("Failed to get remote service: " + service_uri, e);
      throw e;
    }
  }
  _annotate_service_methods(
    aObject,
    object_id,
    require_context,
    run_in_executor,
    visibility,
  ) {
    if (typeof aObject === "function") {
      // mark the method as a remote method that requires context
      let method_name = object_id.split(".")[1];
      this._method_annotations.set(aObject, {
        require_context: Array.isArray(require_context)
          ? require_context.includes(method_name)
          : !!require_context,
        run_in_executor: run_in_executor,
        method_id: "services." + object_id,
        visibility: visibility,
      });
    } else if (aObject instanceof Array || aObject instanceof Object) {
      for (let key of Object.keys(aObject)) {
        let val = aObject[key];
        if (typeof val === "function" && val.__rpc_object__) {
          let client_id = val.__rpc_object__._rtarget;
          if (client_id.includes("/")) {
            client_id = client_id.split("/")[1];
          }
          if (this._client_id === client_id) {
            if (aObject instanceof Array) {
              aObject = aObject.slice();
            }
            // recover local method
            aObject[key] = indexObject(
              this._object_store,
              val.__rpc_object__._rmethod,
            );
            val = aObject[key]; // make sure it's annotated later
          } else {
            throw new Error(
              `Local method not found: ${val.__rpc_object__._rmethod}, client id mismatch ${this._client_id} != ${client_id}`,
            );
          }
        }
        this._annotate_service_methods(
          val,
          object_id + "." + key,
          require_context,
          run_in_executor,
          visibility,
        );
      }
    }
  }
  add_service(api, overwrite) {
    if (!api || Array.isArray(api)) throw new Error("Invalid service object");
    if (api.constructor === Object) {
      api = Object.assign({}, api);
    } else {
      const normApi = {};
      const props = Object.getOwnPropertyNames(api).concat(
        Object.getOwnPropertyNames(Object.getPrototypeOf(api)),
      );
      for (let k of props) {
        if (k !== "constructor") {
          if (typeof api[k] === "function") normApi[k] = api[k].bind(api);
          else normApi[k] = api[k];
        }
      }
      // For class instance, we need set a default id
      api.id = api.id || "default";
      api = normApi;
    }
    (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(
      api.id && typeof api.id === "string",
      `Service id not found: ${api}`,
    );
    if (!api.name) {
      api.name = api.id;
    }
    if (!api.config) {
      api.config = {};
    }
    if (!api.type) {
      api.type = "generic";
    }
    // require_context only applies to the top-level functions
    let require_context = false,
      run_in_executor = false;
    if (api.config.require_context)
      require_context = api.config.require_context;
    if (api.config.run_in_executor) run_in_executor = true;
    const visibility = api.config.visibility || "protected";
    (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(["protected", "public"].includes(visibility));
    this._annotate_service_methods(
      api,
      api["id"],
      require_context,
      run_in_executor,
      visibility,
    );

    if (this._services[api.id]) {
      if (overwrite) {
        delete this._services[api.id];
      } else {
        throw new Error(
          `Service already exists: ${api.id}, please specify a different id (not ${api.id}) or overwrite=true`,
        );
      }
    }
    this._services[api.id] = api;
    return api;
  }

  _extract_service_info(service) {
    const config = service.config || {};
    config.workspace =
      config.workspace || this._local_workspace || this._connection.workspace;
    const skipContext = config.require_context;
    const serviceSchema = _get_schema(service, null, skipContext);
    const serviceInfo = {
      config: config,
      id: `${config.workspace}/${this._client_id}:${service["id"]}`,
      name: service.name || service["id"],
      description: service.description || "",
      type: service.type || "generic",
      docs: service.docs || null,
      app_id: this._app_id,
      service_schema: serviceSchema,
    };
    return serviceInfo;
  }

  async get_service_schema(service) {
    const skipContext = service.config.require_context;
    return _get_schema(service, null, skipContext);
  }

  async register_service(api, config) {
    let { check_type, notify, overwrite } = config || {};
    notify = notify === undefined ? true : notify;
    let manager;
    if (check_type && api.type) {
      try {
        manager = await this.get_manager_service({
          timeout: 10,
          case_conversion: "camel",
        });
        const type_info = await manager.get_service_type(api.type);
        api = _annotate_service(api, type_info);
      } catch (e) {
        throw new Error(`Failed to get service type ${api.type}, error: ${e}`);
      }
    }

    const service = this.add_service(api, overwrite);
    const serviceInfo = this._extract_service_info(service);
    if (notify) {
      try {
        manager =
          manager ||
          (await this.get_manager_service({
            timeout: 10,
            case_conversion: "camel",
          }));
        await manager.registerService(serviceInfo);
      } catch (e) {
        throw new Error(`Failed to notify workspace manager: ${e}`);
      }
    }
    return serviceInfo;
  }

  async unregister_service(service, notify) {
    notify = notify === undefined ? true : notify;
    let service_id;
    if (typeof service === "string") {
      service_id = service;
    } else {
      service_id = service.id;
    }
    (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(
      service_id && typeof service_id === "string",
      `Invalid service id: ${service_id}`,
    );
    if (service_id.includes(":")) {
      service_id = service_id.split(":")[1];
    }
    if (service_id.includes("@")) {
      service_id = service_id.split("@")[0];
    }
    if (!this._services[service_id]) {
      throw new Error(`Service not found: ${service_id}`);
    }
    if (notify) {
      const manager = await this.get_manager_service({
        timeout: 10,
        case_conversion: "camel",
      });
      await manager.unregisterService(service_id);
    }
    delete this._services[service_id];
  }

  _ndarray(typedArray, shape, dtype) {
    const _dtype = (0,_utils__WEBPACK_IMPORTED_MODULE_0__.typedArrayToDtype)(typedArray);
    if (dtype && dtype !== _dtype) {
      throw (
        "dtype doesn't match the type of the array: " + _dtype + " != " + dtype
      );
    }
    shape = shape || [typedArray.length];
    return {
      _rtype: "ndarray",
      _rvalue: typedArray.buffer,
      _rshape: shape,
      _rdtype: _dtype,
    };
  }

  _encode_callback(
    name,
    callback,
    session_id,
    clear_after_called,
    timer,
    local_workspace,
    description,
  ) {
    let method_id = `${session_id}.${name}`;
    let encoded = {
      _rtype: "method",
      _rtarget: local_workspace
        ? `${local_workspace}/${this._client_id}`
        : this._client_id,
      _rmethod: method_id,
      _rpromise: false,
    };

    const self = this;
    let wrapped_callback = function () {
      try {
        callback.apply(null, Array.prototype.slice.call(arguments));
      } catch (error) {
        console.error(
          `Error in callback(${method_id}, ${description}): ${error}`,
        );
      } finally {
        if (timer && timer.started) {
          timer.clear();
        }
        if (clear_after_called && self._object_store[session_id]) {
          // console.log("Deleting session", session_id, "from", self._client_id);
          delete self._object_store[session_id];
        }
      }
    };
    wrapped_callback.__name__ = `callback(${method_id})`;
    return [encoded, wrapped_callback];
  }

  async _encode_promise(
    resolve,
    reject,
    session_id,
    clear_after_called,
    timer,
    local_workspace,
    description,
  ) {
    let store = this._get_session_store(session_id, true);
    (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(
      store,
      `Failed to create session store ${session_id} due to invalid parent`,
    );
    let encoded = {};

    if (timer && reject && this._method_timeout) {
      [encoded.heartbeat, store.heartbeat] = this._encode_callback(
        "heartbeat",
        timer.reset.bind(timer),
        session_id,
        false,
        null,
        local_workspace,
        // `heartbeat (${description})`,
      );
      store.timer = timer;
      encoded.interval = this._method_timeout / 2;
    } else {
      timer = null;
    }

    [encoded.resolve, store.resolve] = this._encode_callback(
      "resolve",
      resolve,
      session_id,
      clear_after_called,
      timer,
      local_workspace,
      `resolve (${description})`,
    );
    [encoded.reject, store.reject] = this._encode_callback(
      "reject",
      reject,
      session_id,
      clear_after_called,
      timer,
      local_workspace,
      `reject (${description})`,
    );
    return encoded;
  }

  async _send_chunks(data, target_id, session_id) {
    // 1) Get the remote service
    const remote_services = await this.get_remote_service(
      `${target_id}:built-in`,
    );
    if (!remote_services.message_cache) {
      throw new Error(
        "Remote client does not support message caching for large messages.",
      );
    }

    const message_cache = remote_services.message_cache;
    const message_id = session_id || (0,_utils__WEBPACK_IMPORTED_MODULE_0__.randId)();
    const total_size = data.length;
    const start_time = Date.now(); // measure time
    const chunk_num = Math.ceil(total_size / this._long_message_chunk_size);
    if (remote_services.config.api_version >= 3) {
      await message_cache.create(message_id, !!session_id);
      const semaphore = new _utils__WEBPACK_IMPORTED_MODULE_0__.Semaphore(CONCURRENCY_LIMIT);

      const tasks = [];
      for (let idx = 0; idx < chunk_num; idx++) {
        const startByte = idx * this._long_message_chunk_size;
        const chunk = data.slice(
          startByte,
          startByte + this._long_message_chunk_size,
        );

        const taskFn = async () => {
          await message_cache.set(message_id, idx, chunk, !!session_id);
          console.debug(
            `Sending chunk ${idx + 1}/${chunk_num} (total=${total_size} bytes)`,
          );
        };

        // Push into an array, each one runs under the semaphore
        tasks.push(semaphore.run(taskFn));
      }

      // Wait for all chunk uploads to finish
      await Promise.all(tasks);
    } else {
      // 3) Legacy version (sequential appends):
      await message_cache.create(message_id, !!session_id);
      for (let idx = 0; idx < chunk_num; idx++) {
        const startByte = idx * this._long_message_chunk_size;
        const chunk = data.slice(
          startByte,
          startByte + this._long_message_chunk_size,
        );
        await message_cache.append(message_id, chunk, !!session_id);
        console.debug(
          `Sending chunk ${idx + 1}/${chunk_num} (total=${total_size} bytes)`,
        );
      }
    }
    await message_cache.process(message_id, !!session_id);
    const durationSec = ((Date.now() - start_time) / 1000).toFixed(2);
    console.debug(`All chunks (${total_size} bytes) sent in ${durationSec} s`);
  }

  emit(main_message, extra_data) {
    (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(
      typeof main_message === "object" && main_message.type,
      "Invalid message, must be an object with a `type` fields.",
    );
    if (!main_message.to) {
      this._fire(main_message.type, main_message);
      return;
    }
    let message_package = (0,_msgpack_msgpack__WEBPACK_IMPORTED_MODULE_3__.encode)(main_message);
    if (extra_data) {
      const extra = (0,_msgpack_msgpack__WEBPACK_IMPORTED_MODULE_3__.encode)(extra_data);
      message_package = new Uint8Array([...message_package, ...extra]);
    }
    const total_size = message_package.length;
    if (total_size > this._long_message_chunk_size + 1024) {
      console.warn(`Sending large message (size=${total_size})`);
    }
    return this._emit_message(message_package);
  }

  _generate_remote_method(
    encoded_method,
    remote_parent,
    local_parent,
    remote_workspace,
    local_workspace,
  ) {
    let target_id = encoded_method._rtarget;
    if (remote_workspace && !target_id.includes("/")) {
      if (remote_workspace !== target_id) {
        target_id = remote_workspace + "/" + target_id;
      }
      // Fix the target id to be an absolute id
      encoded_method._rtarget = target_id;
    }
    let method_id = encoded_method._rmethod;
    let with_promise = encoded_method._rpromise || false;
    const description = `method: ${method_id}, docs: ${encoded_method._rdoc}`;
    const self = this;

    function remote_method() {
      return new Promise(async (resolve, reject) => {
        let local_session_id = (0,_utils__WEBPACK_IMPORTED_MODULE_0__.randId)();
        if (local_parent) {
          // Store the children session under the parent
          local_session_id = local_parent + "." + local_session_id;
        }
        let store = self._get_session_store(local_session_id, true);
        if (!store) {
          reject(
            new Error(
              `Runtime Error: Failed to get session store ${local_session_id} (context: ${description})`,
            ),
          );
          return;
        }
        store["target_id"] = target_id;
        const args = await self._encode(
          Array.prototype.slice.call(arguments),
          local_session_id,
          local_workspace,
        );
        const argLength = args.length;
        // if the last argument is an object, mark it as kwargs
        const withKwargs =
          argLength > 0 &&
          typeof args[argLength - 1] === "object" &&
          args[argLength - 1] !== null &&
          args[argLength - 1]._rkwargs;
        if (withKwargs) delete args[argLength - 1]._rkwargs;

        let from_client;
        if (!self._local_workspace) {
          from_client = self._client_id;
        } else {
          from_client = self._local_workspace + "/" + self._client_id;
        }

        let main_message = {
          type: "method",
          from: from_client,
          to: target_id,
          method: method_id,
        };
        let extra_data = {};
        if (args) {
          extra_data["args"] = args;
        }
        if (withKwargs) {
          extra_data["with_kwargs"] = withKwargs;
        }

        // console.log(
        //   `Calling remote method ${target_id}:${method_id}, session: ${local_session_id}`
        // );
        if (remote_parent) {
          // Set the parent session
          // Note: It's a session id for the remote, not the current client
          main_message["parent"] = remote_parent;
        }

        let timer = null;
        if (with_promise) {
          // Only pass the current session id to the remote
          // if we want to received the result
          // I.e. the session id won't be passed for promises themselves
          main_message["session"] = local_session_id;
          let method_name = `${target_id}:${method_id}`;
          timer = new Timer(
            self._method_timeout,
            reject,
            [`Method call time out: ${method_name}, context: ${description}`],
            method_name,
          );
          // By default, hypha will clear the session after the method is called
          // However, if the args contains _rintf === true, we will not clear the session
          let clear_after_called = true;
          for (let arg of args) {
            if (typeof arg === "object" && arg._rintf === true) {
              clear_after_called = false;
              break;
            }
          }
          const promiseData = await self._encode_promise(
            resolve,
            reject,
            local_session_id,
            clear_after_called,
            timer,
            local_workspace,
            description,
          );

          if (with_promise === true) {
            extra_data["promise"] = promiseData;
          } else if (with_promise === "*") {
            extra_data["promise"] = "*";
            extra_data["t"] = self._method_timeout / 2;
          } else {
            throw new Error(`Unsupported promise type: ${with_promise}`);
          }
        }
        // The message consists of two segments, the main message and extra data
        let message_package = (0,_msgpack_msgpack__WEBPACK_IMPORTED_MODULE_3__.encode)(main_message);
        if (extra_data) {
          const extra = (0,_msgpack_msgpack__WEBPACK_IMPORTED_MODULE_3__.encode)(extra_data);
          message_package = new Uint8Array([...message_package, ...extra]);
        }
        const total_size = message_package.length;
        if (
          total_size <= self._long_message_chunk_size + 1024 ||
          remote_method.__no_chunk__
        ) {
          self
            ._emit_message(message_package)
            .then(function () {
              if (timer) {
                // If resolved successfully, reset the timer
                timer.reset();
              }
            })
            .catch(function (err) {
              console.error("Failed to send message", err);
              reject(err);
              if (timer) {
                timer.clear();
              }
            });
        } else {
          // send chunk by chunk
          self
            ._send_chunks(message_package, target_id, remote_parent)
            .then(function () {
              if (timer) {
                // If resolved successfully, reset the timer
                timer.reset();
              }
            })
            .catch(function (err) {
              console.error("Failed to send message", err);
              reject(err);
              if (timer) {
                timer.clear();
              }
            });
        }
      });
    }

    // Generate debugging information for the method
    remote_method.__rpc_object__ = encoded_method;
    const parts = method_id.split(".");

    remote_method.__name__ = encoded_method._rname || parts[parts.length - 1];
    if (remote_method.__name__.includes("#")) {
      remote_method.__name__ = remote_method.__name__.split("#")[1];
    }
    remote_method.__doc__ =
      encoded_method._rdoc || `Remote method: ${method_id}`;
    remote_method.__schema__ = encoded_method._rschema;
    // Prevent circular chunk sending
    remote_method.__no_chunk__ =
      encoded_method._rmethod === "services.built-in.message_cache.append";
    return remote_method;
  }

  get_client_info() {
    const services = [];
    for (let service of Object.values(this._services)) {
      services.push(this._extract_service_info(service));
    }

    return {
      id: this._client_id,
      services: services,
    };
  }

  async _handle_method(data) {
    let reject = null;
    let heartbeat_task = null;
    try {
      (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(data.method && data.ctx && data.from);
      const method_name = data.from + ":" + data.method;
      const remote_workspace = data.from.split("/")[0];
      const remote_client_id = data.from.split("/")[1];
      // Make sure the target id is an absolute id
      data["to"] = data["to"].includes("/")
        ? data["to"]
        : remote_workspace + "/" + data["to"];
      data["ctx"]["to"] = data["to"];
      let local_workspace;
      if (!this._local_workspace) {
        local_workspace = data["to"].split("/")[0];
      } else {
        if (this._local_workspace && this._local_workspace !== "*") {
          (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(
            data["to"].split("/")[0] === this._local_workspace,
            "Workspace mismatch: " +
              data["to"].split("/")[0] +
              " != " +
              this._local_workspace,
          );
        }
        local_workspace = this._local_workspace;
      }
      const local_parent = data.parent;

      let resolve, reject;
      if (data.promise) {
        // Decode the promise with the remote session id
        // Such that the session id will be passed to the remote as a parent session id
        const promise = await this._decode(
          data.promise === "*" ? this._expand_promise(data) : data.promise,
          data.session,
          local_parent,
          remote_workspace,
          local_workspace,
        );
        resolve = promise.resolve;
        reject = promise.reject;
        if (promise.heartbeat && promise.interval) {
          async function heartbeat() {
            try {
              // console.debug("Reset heartbeat timer: " + data.method);
              await promise.heartbeat();
            } catch (err) {
              console.error(err);
            }
          }
          heartbeat_task = setInterval(heartbeat, promise.interval * 1000);
        }
      }

      let method;

      try {
        method = indexObject(this._object_store, data["method"]);
      } catch (e) {
        // console.debug("Failed to find method", method_name, this._client_id, e);
        throw new Error(
          `Method not found: ${method_name} at ${this._client_id}`,
        );
      }

      (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(
        method && typeof method === "function",
        "Invalid method: " + method_name,
      );

      // Check permission
      if (this._method_annotations.has(method)) {
        // For services, it should not be protected
        if (this._method_annotations.get(method).visibility === "protected") {
          if (
            local_workspace !== remote_workspace &&
            (remote_workspace !== "*" ||
              remote_client_id !== this._connection.manager_id)
          ) {
            throw new Error(
              "Permission denied for invoking protected method " +
                method_name +
                ", workspace mismatch: " +
                local_workspace +
                " != " +
                remote_workspace,
            );
          }
        }
      } else {
        // For sessions, the target_id should match exactly
        let session_target_id =
          this._object_store[data.method.split(".")[0]].target_id;
        if (
          local_workspace === remote_workspace &&
          session_target_id &&
          session_target_id.indexOf("/") === -1
        ) {
          session_target_id = local_workspace + "/" + session_target_id;
        }
        if (session_target_id !== data.from) {
          throw new Error(
            "Access denied for method call (" +
              method_name +
              ") from " +
              data.from +
              " to target " +
              session_target_id,
          );
        }
      }

      // Make sure the parent session is still open
      if (local_parent) {
        // The parent session should be a session that generate the current method call
        (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(
          this._get_session_store(local_parent, true) !== null,
          "Parent session was closed: " + local_parent,
        );
      }
      let args;
      if (data.args) {
        args = await this._decode(
          data.args,
          data.session,
          null,
          remote_workspace,
          null,
        );
      } else {
        args = [];
      }
      if (
        this._method_annotations.has(method) &&
        this._method_annotations.get(method).require_context
      ) {
        // if args.length + 1 is less than the required number of arguments we will pad with undefined
        // so we make sure the last argument is the context
        if (args.length + 1 < method.length) {
          for (let i = args.length; i < method.length - 1; i++) {
            args.push(undefined);
          }
        }
        args.push(data.ctx);
        (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(
          args.length === method.length,
          `Runtime Error: Invalid number of arguments for method ${method_name}, expected ${method.length} but got ${args.length}`,
        );
      }
      // console.debug(`Executing method: ${method_name} (${data.method})`);
      if (data.promise) {
        const result = method.apply(null, args);
        if (result instanceof Promise) {
          result
            .then((result) => {
              resolve(result);
              clearInterval(heartbeat_task);
            })
            .catch((err) => {
              reject(err);
              clearInterval(heartbeat_task);
            });
        } else {
          resolve(result);
          clearInterval(heartbeat_task);
        }
      } else {
        method.apply(null, args);
        clearInterval(heartbeat_task);
      }
    } catch (err) {
      if (reject) {
        reject(err);
        // console.debug("Error during calling method: ", err);
      } else {
        console.error("Error during calling method: ", err);
      }
      // make sure we clear the heartbeat timer
      clearInterval(heartbeat_task);
    }
  }

  encode(aObject, session_id) {
    return this._encode(aObject, session_id);
  }

  _get_session_store(session_id, create) {
    let store = this._object_store;
    const levels = session_id.split(".");
    if (create) {
      const last_index = levels.length - 1;
      for (let level of levels.slice(0, last_index)) {
        if (!store[level]) {
          return null;
        }
        store = store[level];
      }
      // Create the last level
      if (!store[levels[last_index]]) {
        store[levels[last_index]] = {};
      }
      return store[levels[last_index]];
    } else {
      for (let level of levels) {
        if (!store[level]) {
          return null;
        }
        store = store[level];
      }
      return store;
    }
  }

  /**
   * Prepares the provided set of remote method arguments for
   * sending to the remote site, replaces all the callbacks with
   * identifiers
   *
   * @param {Array} args to wrap
   *
   * @returns {Array} wrapped arguments
   */
  async _encode(aObject, session_id, local_workspace) {
    const aType = typeof aObject;
    if (
      aType === "number" ||
      aType === "string" ||
      aType === "boolean" ||
      aObject === null ||
      aObject === undefined ||
      aObject instanceof Uint8Array
    ) {
      return aObject;
    }
    if (aObject instanceof ArrayBuffer) {
      return {
        _rtype: "memoryview",
        _rvalue: new Uint8Array(aObject),
      };
    }
    // Reuse the remote object
    if (aObject.__rpc_object__) {
      const _server = aObject.__rpc_object__._rserver || this._server_base_url;
      if (_server === this._server_base_url) {
        return aObject.__rpc_object__;
      } // else {
      //   console.debug(
      //     `Encoding remote function from a different server ${_server}, current server: ${this._server_base_url}`,
      //   );
      // }
    }

    let bObject;

    // skip if already encoded
    if (aObject.constructor instanceof Object && aObject._rtype) {
      // make sure the interface functions are encoded
      const temp = aObject._rtype;
      delete aObject._rtype;
      bObject = await this._encode(aObject, session_id, local_workspace);
      bObject._rtype = temp;
      return bObject;
    }

    if ((0,_utils__WEBPACK_IMPORTED_MODULE_0__.isGenerator)(aObject) || (0,_utils__WEBPACK_IMPORTED_MODULE_0__.isAsyncGenerator)(aObject)) {
      // Handle generator functions and generator objects
      (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(
        session_id && typeof session_id === "string",
        "Session ID is required for generator encoding",
      );
      const object_id = (0,_utils__WEBPACK_IMPORTED_MODULE_0__.randId)();

      // Get the session store
      const store = this._get_session_store(session_id, true);
      (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(
        store !== null,
        `Failed to create session store ${session_id} due to invalid parent`,
      );

      // Check if it's an async generator
      const isAsync = (0,_utils__WEBPACK_IMPORTED_MODULE_0__.isAsyncGenerator)(aObject);

      // Define method to get next item from the generator
      const nextItemMethod = async () => {
        if (isAsync) {
          const iterator = aObject;
          const result = await iterator.next();
          if (result.done) {
            delete store[object_id];
            return { _rtype: "stop_iteration" };
          }
          return result.value;
        } else {
          const iterator = aObject;
          const result = iterator.next();
          if (result.done) {
            delete store[object_id];
            return { _rtype: "stop_iteration" };
          }
          return result.value;
        }
      };

      // Store the next_item method in the session
      store[object_id] = nextItemMethod;

      // Create a method that will be used to fetch the next item from the generator
      bObject = {
        _rtype: "generator",
        _rserver: this._server_base_url,
        _rtarget: this._client_id,
        _rmethod: `${session_id}.${object_id}`,
        _rpromise: "*",
        _rdoc: "Remote generator",
      };
      return bObject;
    } else if (typeof aObject === "function") {
      if (this._method_annotations.has(aObject)) {
        let annotation = this._method_annotations.get(aObject);
        bObject = {
          _rtype: "method",
          _rserver: this._server_base_url,
          _rtarget: this._client_id,
          _rmethod: annotation.method_id,
          _rpromise: "*",
          _rname: aObject.name,
        };
      } else {
        (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(typeof session_id === "string");
        let object_id;
        if (aObject.__name__) {
          object_id = `${(0,_utils__WEBPACK_IMPORTED_MODULE_0__.randId)()}#${aObject.__name__}`;
        } else {
          object_id = (0,_utils__WEBPACK_IMPORTED_MODULE_0__.randId)();
        }
        bObject = {
          _rtype: "method",
          _rserver: this._server_base_url,
          _rtarget: this._client_id,
          _rmethod: `${session_id}.${object_id}`,
          _rpromise: "*",
          _rname: aObject.name,
        };
        let store = this._get_session_store(session_id, true);
        (0,_utils__WEBPACK_IMPORTED_MODULE_0__.assert)(
          store !== null,
          `Failed to create session store ${session_id} due to invalid parent`,
        );
        store[object_id] = aObject;
      }
      bObject._rdoc = aObject.__doc__;
      if (!bObject._rdoc) {
        try {
          const funcInfo = getFunctionInfo(aObject);
          if (funcInfo && !bObject._rdoc) {
            bObject._rdoc = `${funcInfo.doc}`;
          }
        } catch (e) {
          console.error("Failed to extract function docstring:", aObject);
        }
      }
      bObject._rschema = aObject.__schema__;
      return bObject;
    }
    const isarray = Array.isArray(aObject);

    for (let tp of Object.keys(this._codecs)) {
      const codec = this._codecs[tp];
      if (codec.encoder && aObject instanceof codec.type) {
        // TODO: what if multiple encoders found
        let encodedObj = await Promise.resolve(codec.encoder(aObject));
        if (encodedObj && !encodedObj._rtype) encodedObj._rtype = codec.name;
        // encode the functions in the interface object
        if (typeof encodedObj === "object") {
          const temp = encodedObj._rtype;
          delete encodedObj._rtype;
          encodedObj = await this._encode(
            encodedObj,
            session_id,
            local_workspace,
          );
          encodedObj._rtype = temp;
        }
        bObject = encodedObj;
        return bObject;
      }
    }

    if (
      /*global tf*/
      typeof tf !== "undefined" &&
      tf.Tensor &&
      aObject instanceof tf.Tensor
    ) {
      const v_buffer = aObject.dataSync();
      bObject = {
        _rtype: "ndarray",
        _rvalue: new Uint8Array(v_buffer.buffer),
        _rshape: aObject.shape,
        _rdtype: aObject.dtype,
      };
    } else if (
      /*global nj*/
      typeof nj !== "undefined" &&
      nj.NdArray &&
      aObject instanceof nj.NdArray
    ) {
      const dtype = (0,_utils__WEBPACK_IMPORTED_MODULE_0__.typedArrayToDtype)(aObject.selection.data);
      bObject = {
        _rtype: "ndarray",
        _rvalue: new Uint8Array(aObject.selection.data.buffer),
        _rshape: aObject.shape,
        _rdtype: dtype,
      };
    } else if (aObject instanceof Error) {
      console.error(aObject);
      bObject = {
        _rtype: "error",
        _rvalue: aObject.toString(),
        _rtrace: aObject.stack,
      };
    }
    // send objects supported by structure clone algorithm
    // https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
    else if (
      aObject !== Object(aObject) ||
      aObject instanceof Boolean ||
      aObject instanceof String ||
      aObject instanceof Date ||
      aObject instanceof RegExp ||
      aObject instanceof ImageData ||
      (typeof FileList !== "undefined" && aObject instanceof FileList) ||
      (typeof FileSystemDirectoryHandle !== "undefined" &&
        aObject instanceof FileSystemDirectoryHandle) ||
      (typeof FileSystemFileHandle !== "undefined" &&
        aObject instanceof FileSystemFileHandle) ||
      (typeof FileSystemHandle !== "undefined" &&
        aObject instanceof FileSystemHandle) ||
      (typeof FileSystemWritableFileStream !== "undefined" &&
        aObject instanceof FileSystemWritableFileStream)
    ) {
      bObject = aObject;
      // TODO: avoid object such as DynamicPlugin instance.
    } else if (aObject instanceof Blob) {
      let _current_pos = 0;
      async function read(length) {
        let blob;
        if (length) {
          blob = aObject.slice(_current_pos, _current_pos + length);
        } else {
          blob = aObject.slice(_current_pos);
        }
        const ret = new Uint8Array(await blob.arrayBuffer());
        _current_pos = _current_pos + ret.byteLength;
        return ret;
      }
      function seek(pos) {
        _current_pos = pos;
      }
      bObject = {
        _rtype: "iostream",
        _rnative: "js:blob",
        type: aObject.type,
        name: aObject.name,
        size: aObject.size,
        path: aObject._path || aObject.webkitRelativePath,
        read: await this._encode(read, session_id, local_workspace),
        seek: await this._encode(seek, session_id, local_workspace),
      };
    } else if (aObject instanceof ArrayBufferView) {
      const dtype = (0,_utils__WEBPACK_IMPORTED_MODULE_0__.typedArrayToDtype)(aObject);
      bObject = {
        _rtype: "typedarray",
        _rvalue: new Uint8Array(aObject.buffer),
        _rdtype: dtype,
      };
    } else if (aObject instanceof DataView) {
      bObject = {
        _rtype: "memoryview",
        _rvalue: new Uint8Array(aObject.buffer),
      };
    } else if (aObject instanceof Set) {
      bObject = {
        _rtype: "set",
        _rvalue: await this._encode(
          Array.from(aObject),
          session_id,
          local_workspace,
        ),
      };
    } else if (aObject instanceof Map) {
      bObject = {
        _rtype: "orderedmap",
        _rvalue: await this._encode(
          Array.from(aObject),
          session_id,
          local_workspace,
        ),
      };
    } else if (
      aObject.constructor instanceof Object ||
      Array.isArray(aObject)
    ) {
      bObject = isarray ? [] : {};
      const keys = Object.keys(aObject);
      for (let k of keys) {
        bObject[k] = await this._encode(
          aObject[k],
          session_id,
          local_workspace,
        );
      }
    } else {
      throw `hypha-rpc: Unsupported data type: ${aObject}, you can register a custom codec to encode/decode the object.`;
    }

    if (!bObject) {
      throw new Error("Failed to encode object");
    }
    return bObject;
  }

  async decode(aObject) {
    return await this._decode(aObject);
  }

  async _decode(
    aObject,
    remote_parent,
    local_parent,
    remote_workspace,
    local_workspace,
  ) {
    if (!aObject) {
      return aObject;
    }
    let bObject;
    if (aObject._rtype) {
      if (
        this._codecs[aObject._rtype] &&
        this._codecs[aObject._rtype].decoder
      ) {
        const temp = aObject._rtype;
        delete aObject._rtype;
        aObject = await this._decode(
          aObject,
          remote_parent,
          local_parent,
          remote_workspace,
          local_workspace,
        );
        aObject._rtype = temp;

        bObject = await Promise.resolve(
          this._codecs[aObject._rtype].decoder(aObject),
        );
      } else if (aObject._rtype === "method") {
        bObject = this._generate_remote_method(
          aObject,
          remote_parent,
          local_parent,
          remote_workspace,
          local_workspace,
        );
      } else if (aObject._rtype === "generator") {
        // Create a method to fetch next items from the remote generator
        const gen_method = this._generate_remote_method(
          aObject,
          remote_parent,
          local_parent,
          remote_workspace,
          local_workspace,
        );

        // Create an async generator proxy
        async function* asyncGeneratorProxy() {
          try {
            while (true) {
              try {
                const next_item = await gen_method();
                // Check for StopIteration signal
                if (next_item && next_item._rtype === "stop_iteration") {
                  break;
                }
                yield next_item;
              } catch (error) {
                console.error("Error in generator:", error);
                throw error;
              }
            }
          } catch (error) {
            console.error("Error in generator:", error);
            throw error;
          }
        }
        bObject = asyncGeneratorProxy();
      } else if (aObject._rtype === "ndarray") {
        /*global nj tf*/
        //create build array/tensor if used in the plugin
        if (typeof nj !== "undefined" && nj.array) {
          if (Array.isArray(aObject._rvalue)) {
            aObject._rvalue = aObject._rvalue.reduce(_appendBuffer);
          }
          bObject = nj
            .array(new Uint8(aObject._rvalue), aObject._rdtype)
            .reshape(aObject._rshape);
        } else if (typeof tf !== "undefined" && tf.Tensor) {
          if (Array.isArray(aObject._rvalue)) {
            aObject._rvalue = aObject._rvalue.reduce(_appendBuffer);
          }
          const arraytype = _utils__WEBPACK_IMPORTED_MODULE_0__.dtypeToTypedArray[aObject._rdtype];
          bObject = tf.tensor(
            new arraytype(aObject._rvalue),
            aObject._rshape,
            aObject._rdtype,
          );
        } else {
          //keep it as regular if transfered to the main app
          bObject = aObject;
        }
      } else if (aObject._rtype === "error") {
        bObject = new Error(
          "RemoteError: " + aObject._rvalue + "\n" + (aObject._rtrace || ""),
        );
      } else if (aObject._rtype === "typedarray") {
        const arraytype = _utils__WEBPACK_IMPORTED_MODULE_0__.dtypeToTypedArray[aObject._rdtype];
        if (!arraytype)
          throw new Error("unsupported dtype: " + aObject._rdtype);
        const buffer = aObject._rvalue.buffer.slice(
          aObject._rvalue.byteOffset,
          aObject._rvalue.byteOffset + aObject._rvalue.byteLength,
        );
        bObject = new arraytype(buffer);
      } else if (aObject._rtype === "memoryview") {
        bObject = aObject._rvalue.buffer.slice(
          aObject._rvalue.byteOffset,
          aObject._rvalue.byteOffset + aObject._rvalue.byteLength,
        ); // ArrayBuffer
      } else if (aObject._rtype === "iostream") {
        if (aObject._rnative === "js:blob") {
          const read = await this._generate_remote_method(
            aObject.read,
            remote_parent,
            local_parent,
            remote_workspace,
            local_workspace,
          );
          const bytes = await read();
          bObject = new Blob([bytes], {
            type: aObject.type,
            name: aObject.name,
          });
        } else {
          bObject = {};
          for (let k of Object.keys(aObject)) {
            if (!k.startsWith("_")) {
              bObject[k] = await this._decode(
                aObject[k],
                remote_parent,
                local_parent,
                remote_workspace,
                local_workspace,
              );
            }
          }
        }
        bObject["__rpc_object__"] = aObject;
      } else if (aObject._rtype === "orderedmap") {
        bObject = new Map(
          await this._decode(
            aObject._rvalue,
            remote_parent,
            local_parent,
            remote_workspace,
            local_workspace,
          ),
        );
      } else if (aObject._rtype === "set") {
        bObject = new Set(
          await this._decode(
            aObject._rvalue,
            remote_parent,
            local_parent,
            remote_workspace,
            local_workspace,
          ),
        );
      } else {
        const temp = aObject._rtype;
        delete aObject._rtype;
        bObject = await this._decode(
          aObject,
          remote_parent,
          local_parent,
          remote_workspace,
          local_workspace,
        );
        bObject._rtype = temp;
      }
    } else if (aObject.constructor === Object || Array.isArray(aObject)) {
      const isarray = Array.isArray(aObject);
      bObject = isarray ? [] : {};
      for (let k of Object.keys(aObject)) {
        if (isarray || aObject.hasOwnProperty(k)) {
          const v = aObject[k];
          bObject[k] = await this._decode(
            v,
            remote_parent,
            local_parent,
            remote_workspace,
            local_workspace,
          );
        }
      }
    } else {
      bObject = aObject;
    }
    if (bObject === undefined) {
      throw new Error("Failed to decode object");
    }
    return bObject;
  }

  _expand_promise(data) {
    return {
      heartbeat: {
        _rtype: "method",
        _rtarget: data.from.split("/")[1],
        _rmethod: data.session + ".heartbeat",
        _rdoc: `heartbeat callback for method: ${data.method}`,
      },
      resolve: {
        _rtype: "method",
        _rtarget: data.from.split("/")[1],
        _rmethod: data.session + ".resolve",
        _rdoc: `resolve callback for method: ${data.method}`,
      },
      reject: {
        _rtype: "method",
        _rtarget: data.from.split("/")[1],
        _rmethod: data.session + ".reject",
        _rdoc: `reject callback for method: ${data.method}`,
      },
      interval: data.t,
    };
  }
}


/***/ }),

/***/ "./src/utils/index.js":
/*!****************************!*\
  !*** ./src/utils/index.js ***!
  \****************************/
/***/ ((__unused_webpack_module, __nested_webpack_exports__, __nested_webpack_require_66189__) => {

__nested_webpack_require_66189__.r(__nested_webpack_exports__);
/* harmony export */ __nested_webpack_require_66189__.d(__nested_webpack_exports__, {
/* harmony export */   MessageEmitter: () => (/* binding */ MessageEmitter),
/* harmony export */   Semaphore: () => (/* binding */ Semaphore),
/* harmony export */   assert: () => (/* binding */ assert),
/* harmony export */   cacheRequirements: () => (/* binding */ cacheRequirements),
/* harmony export */   convertCase: () => (/* binding */ convertCase),
/* harmony export */   dtypeToTypedArray: () => (/* binding */ dtypeToTypedArray),
/* harmony export */   expandKwargs: () => (/* binding */ expandKwargs),
/* harmony export */   isAsyncGenerator: () => (/* binding */ isAsyncGenerator),
/* harmony export */   isGenerator: () => (/* binding */ isGenerator),
/* harmony export */   loadRequirements: () => (/* binding */ loadRequirements),
/* harmony export */   loadRequirementsInWebworker: () => (/* binding */ loadRequirementsInWebworker),
/* harmony export */   loadRequirementsInWindow: () => (/* binding */ loadRequirementsInWindow),
/* harmony export */   normalizeConfig: () => (/* binding */ normalizeConfig),
/* harmony export */   parseServiceUrl: () => (/* binding */ parseServiceUrl),
/* harmony export */   randId: () => (/* binding */ randId),
/* harmony export */   toCamelCase: () => (/* binding */ toCamelCase),
/* harmony export */   toSnakeCase: () => (/* binding */ toSnakeCase),
/* harmony export */   typedArrayToDtype: () => (/* binding */ typedArrayToDtype),
/* harmony export */   typedArrayToDtypeMapping: () => (/* binding */ typedArrayToDtypeMapping),
/* harmony export */   urlJoin: () => (/* binding */ urlJoin),
/* harmony export */   waitFor: () => (/* binding */ waitFor)
/* harmony export */ });
function randId() {
  return Math.random().toString(36).substr(2, 10) + new Date().getTime();
}

function toCamelCase(str) {
  // Check if the string is already in camelCase
  if (!str.includes("_")) {
    return str;
  }
  // Convert from snake_case to camelCase
  return str.replace(/_./g, (match) => match[1].toUpperCase());
}

function toSnakeCase(str) {
  // Convert from camelCase to snake_case
  return str.replace(/([A-Z])/g, "_$1").toLowerCase();
}

function expandKwargs(obj) {
  if (typeof obj !== "object" || obj === null) {
    return obj; // Return the value if obj is not an object
  }

  const newObj = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === "function") {
        newObj[key] = (...args) => {
          if (args.length === 0) {
            throw new Error(`Function "${key}" expects at least one argument.`);
          }

          // Check if the last argument is an object
          const lastArg = args[args.length - 1];
          let kwargs = {};

          if (
            typeof lastArg === "object" &&
            lastArg !== null &&
            !Array.isArray(lastArg)
          ) {
            // Extract kwargs from the last argument
            kwargs = { ...lastArg, _rkwarg: true };
            args = args.slice(0, -1); // Remove the last argument from args
          }

          // Call the original function with positional args followed by kwargs
          return value(...args, kwargs);
        };

        // Preserve metadata like __name__ and __schema__
        newObj[key].__name__ = key;
        if (value.__schema__) {
          newObj[key].__schema__ = { ...value.__schema__ };
          newObj[key].__schema__.name = key;
        }
      } else {
        newObj[key] = expandKwargs(value); // Recursively process nested objects
      }
    }
  }

  return newObj;
}

function convertCase(obj, caseType) {
  if (typeof obj !== "object" || obj === null || !caseType) {
    return obj; // Return the value if obj is not an object
  }

  const newObj = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const camelKey = toCamelCase(key);
      const snakeKey = toSnakeCase(key);

      if (caseType === "camel") {
        newObj[camelKey] = convertCase(value, caseType);
        if (typeof value === "function") {
          newObj[camelKey].__name__ = camelKey;
          if (value.__schema__) {
            newObj[camelKey].__schema__ = { ...value.__schema__ };
            newObj[camelKey].__schema__.name = camelKey;
          }
        }
      } else if (caseType === "snake") {
        newObj[snakeKey] = convertCase(value, caseType);
        if (typeof value === "function") {
          newObj[snakeKey].__name__ = snakeKey;
          if (value.__schema__) {
            newObj[snakeKey].__schema__ = { ...value.__schema__ };
            newObj[snakeKey].__schema__.name = snakeKey;
          }
        }
      } else {
        // TODO handle schema for camel + snake
        if (caseType.includes("camel")) {
          newObj[camelKey] = convertCase(value, "camel");
        }
        if (caseType.includes("snake")) {
          newObj[snakeKey] = convertCase(value, "snake");
        }
      }
    }
  }

  return newObj;
}

function parseServiceUrl(url) {
  // Ensure no trailing slash
  url = url.replace(/\/$/, "");

  // Regex pattern to match the URL structure
  const pattern = new RegExp(
    "^(https?:\\/\\/[^/]+)" + // server_url (http or https followed by domain)
      "\\/([a-z0-9_-]+)" + // workspace (lowercase letters, numbers, - or _)
      "\\/services\\/" + // static part of the URL
      "(?:(?<clientId>[a-zA-Z0-9_-]+):)?" + // optional client_id
      "(?<serviceId>[a-zA-Z0-9_-]+)" + // service_id
      "(?:@(?<appId>[a-zA-Z0-9_-]+))?", // optional app_id
  );

  const match = url.match(pattern);
  if (!match) {
    throw new Error("URL does not match the expected pattern");
  }

  const serverUrl = match[1];
  const workspace = match[2];
  const clientId = match.groups?.clientId || "*";
  const serviceId = match.groups?.serviceId;
  const appId = match.groups?.appId || "*";

  return { serverUrl, workspace, clientId, serviceId, appId };
}

const dtypeToTypedArray = {
  int8: Int8Array,
  int16: Int16Array,
  int32: Int32Array,
  uint8: Uint8Array,
  uint16: Uint16Array,
  uint32: Uint32Array,
  float32: Float32Array,
  float64: Float64Array,
  array: Array,
};

async function loadRequirementsInWindow(requirements) {
  function _importScript(url) {
    //url is URL of external file, implementationCode is the code
    //to be called from the file, location is the location to
    //insert the <script> element
    return new Promise((resolve, reject) => {
      var scriptTag = document.createElement("script");
      scriptTag.src = url;
      scriptTag.type = "text/javascript";
      scriptTag.onload = resolve;
      scriptTag.onreadystatechange = function () {
        if (this.readyState === "loaded" || this.readyState === "complete") {
          resolve();
        }
      };
      scriptTag.onerror = reject;
      document.head.appendChild(scriptTag);
    });
  }

  // support importScripts outside web worker
  async function importScripts() {
    var args = Array.prototype.slice.call(arguments),
      len = args.length,
      i = 0;
    for (; i < len; i++) {
      await _importScript(args[i]);
    }
  }

  if (
    requirements &&
    (Array.isArray(requirements) || typeof requirements === "string")
  ) {
    try {
      var link_node;
      requirements =
        typeof requirements === "string" ? [requirements] : requirements;
      if (Array.isArray(requirements)) {
        for (var i = 0; i < requirements.length; i++) {
          if (
            requirements[i].toLowerCase().endsWith(".css") ||
            requirements[i].startsWith("css:")
          ) {
            if (requirements[i].startsWith("css:")) {
              requirements[i] = requirements[i].slice(4);
            }
            link_node = document.createElement("link");
            link_node.rel = "stylesheet";
            link_node.href = requirements[i];
            document.head.appendChild(link_node);
          } else if (
            requirements[i].toLowerCase().endsWith(".mjs") ||
            requirements[i].startsWith("mjs:")
          ) {
            // import esmodule
            if (requirements[i].startsWith("mjs:")) {
              requirements[i] = requirements[i].slice(4);
            }
            await import(/* webpackIgnore: true */ requirements[i]);
          } else if (
            requirements[i].toLowerCase().endsWith(".js") ||
            requirements[i].startsWith("js:")
          ) {
            if (requirements[i].startsWith("js:")) {
              requirements[i] = requirements[i].slice(3);
            }
            await importScripts(requirements[i]);
          } else if (requirements[i].startsWith("http")) {
            await importScripts(requirements[i]);
          } else if (requirements[i].startsWith("cache:")) {
            //ignore cache
          } else {
            console.log("Unprocessed requirements url: " + requirements[i]);
          }
        }
      } else {
        throw "unsupported requirements definition";
      }
    } catch (e) {
      throw "failed to import required scripts: " + requirements.toString();
    }
  }
}

async function loadRequirementsInWebworker(requirements) {
  if (
    requirements &&
    (Array.isArray(requirements) || typeof requirements === "string")
  ) {
    try {
      if (!Array.isArray(requirements)) {
        requirements = [requirements];
      }
      for (var i = 0; i < requirements.length; i++) {
        if (
          requirements[i].toLowerCase().endsWith(".css") ||
          requirements[i].startsWith("css:")
        ) {
          throw "unable to import css in a webworker";
        } else if (
          requirements[i].toLowerCase().endsWith(".js") ||
          requirements[i].startsWith("js:")
        ) {
          if (requirements[i].startsWith("js:")) {
            requirements[i] = requirements[i].slice(3);
          }
          importScripts(requirements[i]);
        } else if (requirements[i].startsWith("http")) {
          importScripts(requirements[i]);
        } else if (requirements[i].startsWith("cache:")) {
          //ignore cache
        } else {
          console.log("Unprocessed requirements url: " + requirements[i]);
        }
      }
    } catch (e) {
      throw "failed to import required scripts: " + requirements.toString();
    }
  }
}

function loadRequirements(requirements) {
  if (
    typeof WorkerGlobalScope !== "undefined" &&
    self instanceof WorkerGlobalScope
  ) {
    return loadRequirementsInWebworker(requirements);
  } else {
    return loadRequirementsInWindow(requirements);
  }
}

function normalizeConfig(config) {
  config.version = config.version || "0.1.0";
  config.description =
    config.description || `[TODO: add description for ${config.name} ]`;
  config.type = config.type || "rpc-window";
  config.id = config.id || randId();
  config.target_origin = config.target_origin || "*";
  config.allow_execution = config.allow_execution || false;
  // remove functions
  config = Object.keys(config).reduce((p, c) => {
    if (typeof config[c] !== "function") p[c] = config[c];
    return p;
  }, {});
  return config;
}
const typedArrayToDtypeMapping = {
  Int8Array: "int8",
  Int16Array: "int16",
  Int32Array: "int32",
  Uint8Array: "uint8",
  Uint16Array: "uint16",
  Uint32Array: "uint32",
  Float32Array: "float32",
  Float64Array: "float64",
  Array: "array",
};

const typedArrayToDtypeKeys = [];
for (const arrType of Object.keys(typedArrayToDtypeMapping)) {
  typedArrayToDtypeKeys.push(eval(arrType));
}

function typedArrayToDtype(obj) {
  let dtype = typedArrayToDtypeMapping[obj.constructor.name];
  if (!dtype) {
    const pt = Object.getPrototypeOf(obj);
    for (const arrType of typedArrayToDtypeKeys) {
      if (pt instanceof arrType) {
        dtype = typedArrayToDtypeMapping[arrType.name];
        break;
      }
    }
  }
  return dtype;
}

function cacheUrlInServiceWorker(url) {
  return new Promise(function (resolve, reject) {
    const message = {
      command: "add",
      url: url,
    };
    if (!navigator.serviceWorker || !navigator.serviceWorker.register) {
      reject("Service worker is not supported.");
      return;
    }
    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = function (event) {
      if (event.data && event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data && event.data.result);
      }
    };

    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message, [
        messageChannel.port2,
      ]);
    } else {
      reject("Service worker controller is not available");
    }
  });
}

async function cacheRequirements(requirements) {
  requirements = requirements || [];
  if (!Array.isArray(requirements)) {
    requirements = [requirements];
  }
  for (let req of requirements) {
    //remove prefix
    if (req.startsWith("js:")) req = req.slice(3);
    if (req.startsWith("css:")) req = req.slice(4);
    if (req.startsWith("cache:")) req = req.slice(6);
    if (!req.startsWith("http")) continue;

    await cacheUrlInServiceWorker(req).catch((e) => {
      console.error(e);
    });
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

//#Source https://bit.ly/2neWfJ2
function urlJoin(...args) {
  return args
    .join("/")
    .replace(/[\/]+/g, "/")
    .replace(/^(.+):\//, "$1://")
    .replace(/^file:/, "file:/")
    .replace(/\/(\?|&|#[^!])/g, "$1")
    .replace(/\?/g, "&")
    .replace("&", "?");
}

function waitFor(prom, time, error) {
  let timer;
  return Promise.race([
    prom,
    new Promise(
      (_r, rej) =>
        (timer = setTimeout(() => {
          rej(error || "Timeout Error");
        }, time * 1000)),
    ),
  ]).finally(() => clearTimeout(timer));
}

class MessageEmitter {
  constructor(debug) {
    this._event_handlers = {};
    this._once_handlers = {};
    this._debug = debug;
  }
  emit() {
    throw new Error("emit is not implemented");
  }
  on(event, handler) {
    if (!this._event_handlers[event]) {
      this._event_handlers[event] = [];
    }
    this._event_handlers[event].push(handler);
  }
  once(event, handler) {
    handler.___event_run_once = true;
    this.on(event, handler);
  }
  off(event, handler) {
    if (!event && !handler) {
      // remove all events handlers
      this._event_handlers = {};
    } else if (event && !handler) {
      // remove all hanlders for the event
      if (this._event_handlers[event]) this._event_handlers[event] = [];
    } else {
      // remove a specific handler
      if (this._event_handlers[event]) {
        const idx = this._event_handlers[event].indexOf(handler);
        if (idx >= 0) {
          this._event_handlers[event].splice(idx, 1);
        }
      }
    }
  }
  _fire(event, data) {
    if (this._event_handlers[event]) {
      var i = this._event_handlers[event].length;
      while (i--) {
        const handler = this._event_handlers[event][i];
        try {
          handler(data);
        } catch (e) {
          console.error(e);
        } finally {
          if (handler.___event_run_once) {
            this._event_handlers[event].splice(i, 1);
          }
        }
      }
    } else {
      if (this._debug) {
        console.warn("unhandled event", event, data);
      }
    }
  }

  waitFor(event, timeout) {
    return new Promise((resolve, reject) => {
      const handler = (data) => {
        clearTimeout(timer);
        resolve(data);
      };
      this.once(event, handler);
      const timer = setTimeout(() => {
        this.off(event, handler);
        reject(new Error("Timeout"));
      }, timeout);
    });
  }
}

class Semaphore {
  constructor(max) {
    this.max = max;
    this.queue = [];
    this.current = 0;
  }
  async run(task) {
    if (this.current >= this.max) {
      // Wait until a slot is free
      await new Promise((resolve) => this.queue.push(resolve));
    }
    this.current++;
    try {
      return await task();
    } finally {
      this.current--;
      if (this.queue.length > 0) {
        // release one waiter
        this.queue.shift()();
      }
    }
  }
}

/**
 * Check if the object is a generator
 * @param {Object} obj - Object to check
 * @returns {boolean} - True if the object is a generator
 */
function isGenerator(obj) {
  if (!obj) return false;

  return (
    typeof obj === "object" &&
    typeof obj.next === "function" &&
    typeof obj.throw === "function" &&
    typeof obj.return === "function"
  );
}

/**
 * Check if an object is an async generator object
 * @param {any} obj - Object to check
 * @returns {boolean} True if object is an async generator object
 */
function isAsyncGenerator(obj) {
  if (!obj) return false;
  // Check if it's an async generator object
  return (
    typeof obj === "object" &&
    typeof obj.next === "function" &&
    typeof obj.throw === "function" &&
    typeof obj.return === "function" &&
    Symbol.asyncIterator in Object(obj) &&
    obj[Symbol.toStringTag] === "AsyncGenerator"
  );
}


/***/ }),

/***/ "./src/utils/schema.js":
/*!*****************************!*\
  !*** ./src/utils/schema.js ***!
  \*****************************/
/***/ ((__unused_webpack_module, __nested_webpack_exports__, __nested_webpack_require_83640__) => {

__nested_webpack_require_83640__.r(__nested_webpack_exports__);
/* harmony export */ __nested_webpack_require_83640__.d(__nested_webpack_exports__, {
/* harmony export */   schemaFunction: () => (/* binding */ schemaFunction)
/* harmony export */ });
/* harmony import */ var ___WEBPACK_IMPORTED_MODULE_0__ = __nested_webpack_require_83640__(/*! . */ "./src/utils/index.js");


function schemaFunction(
  func,
  { schema_type = "auto", name = null, description = null, parameters = null },
) {
  if (!func || typeof func !== "function") {
    throw Error("func should be a function");
  }
  (0,___WEBPACK_IMPORTED_MODULE_0__.assert)(schema_type === "auto", "schema_type should be auto");
  (0,___WEBPACK_IMPORTED_MODULE_0__.assert)(name, "name should not be null");
  (0,___WEBPACK_IMPORTED_MODULE_0__.assert)(
    parameters && parameters.type === "object",
    "parameters should be an object",
  );
  func.__schema__ = {
    name: name,
    description: description,
    parameters: parameters || [],
  };
  return func;
}


/***/ }),

/***/ "./src/webrtc-client.js":
/*!******************************!*\
  !*** ./src/webrtc-client.js ***!
  \******************************/
/***/ ((__unused_webpack_module, __nested_webpack_exports__, __nested_webpack_require_84847__) => {

__nested_webpack_require_84847__.r(__nested_webpack_exports__);
/* harmony export */ __nested_webpack_require_84847__.d(__nested_webpack_exports__, {
/* harmony export */   getRTCService: () => (/* binding */ getRTCService),
/* harmony export */   registerRTCService: () => (/* binding */ registerRTCService)
/* harmony export */ });
/* harmony import */ var _rpc_js__WEBPACK_IMPORTED_MODULE_0__ = __nested_webpack_require_84847__(/*! ./rpc.js */ "./src/rpc.js");
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_1__ = __nested_webpack_require_84847__(/*! ./utils */ "./src/utils/index.js");
/* harmony import */ var _utils_schema_js__WEBPACK_IMPORTED_MODULE_2__ = __nested_webpack_require_84847__(/*! ./utils/schema.js */ "./src/utils/schema.js");




class WebRTCConnection {
  constructor(channel) {
    this._data_channel = channel;
    this._handle_message = null;
    this._reconnection_token = null;
    this._handle_disconnected = null;
    this._handle_connected = () => {};
    this.manager_id = null;
    this._last_message = null;
    this._data_channel.onopen = async () => {
      if (this._last_message) {
        console.info("Resending last message after connection established");
        this._data_channel.send(this._last_message);
        this._last_message = null;
      }
      this._handle_connected &&
        this._handle_connected({ channel: this._data_channel });
    };
    this._data_channel.onmessage = async (event) => {
      let data = event.data;
      if (data instanceof Blob) {
        data = await data.arrayBuffer();
      }
      this._handle_message(data);
    };
    const self = this;
    this._data_channel.onclose = function () {
      if (this._handle_disconnected) this._handle_disconnected("closed");
      console.log("websocket closed");
      self._data_channel = null;
    };
  }

  on_disconnected(handler) {
    this._handle_disconnected = handler;
  }

  on_connected(handler) {
    this._handle_connected = handler;
  }

  on_message(handler) {
    (0,_utils__WEBPACK_IMPORTED_MODULE_1__.assert)(handler, "handler is required");
    this._handle_message = handler;
  }

  async emit_message(data) {
    (0,_utils__WEBPACK_IMPORTED_MODULE_1__.assert)(this._handle_message, "No handler for message");
    try {
      this._last_message = data;
      this._data_channel.send(data);
      this._last_message = null;
    } catch (exp) {
      console.error(`Failed to send data, error: ${exp}`);
      throw exp;
    }
  }

  async disconnect(reason) {
    this._last_message = null;
    this._data_channel = null;
    console.info(`data channel connection disconnected (${reason})`);
  }
}

async function _setupRPC(config) {
  (0,_utils__WEBPACK_IMPORTED_MODULE_1__.assert)(config.channel, "No channel provided");
  (0,_utils__WEBPACK_IMPORTED_MODULE_1__.assert)(config.workspace, "No workspace provided");
  const channel = config.channel;
  const clientId = config.client_id || (0,_utils__WEBPACK_IMPORTED_MODULE_1__.randId)();
  const connection = new WebRTCConnection(channel);
  config.context = config.context || {};
  config.context.connection_type = "webrtc";
  config.context.ws = config.workspace;
  const rpc = new _rpc_js__WEBPACK_IMPORTED_MODULE_0__.RPC(connection, {
    client_id: clientId,
    default_context: config.context,
    name: config.name,
    method_timeout: config.method_timeout || 10.0,
    workspace: config.workspace,
    app_id: config.app_id,
    long_message_chunk_size: config.long_message_chunk_size,
  });
  return rpc;
}

async function _createOffer(params, server, config, onInit, context) {
  config = config || {};
  let offer = new RTCSessionDescription({
    sdp: params.sdp,
    type: params.type,
  });

  let pc = new RTCPeerConnection({
    iceServers: config.ice_servers || [
      { urls: ["stun:stun.l.google.com:19302"] },
    ],
    sdpSemantics: "unified-plan",
  });

  if (server) {
    pc.addEventListener("datachannel", async (event) => {
      const channel = event.channel;
      let ctx = null;
      if (context && context.user) ctx = { user: context.user, ws: context.ws };
      const rpc = await _setupRPC({
        channel: channel,
        client_id: channel.label,
        workspace: server.config.workspace,
        context: ctx,
      });
      // Map all the local services to the webrtc client
      rpc._services = server.rpc._services;
    });
  }

  if (onInit) {
    await onInit(pc);
  }

  await pc.setRemoteDescription(offer);

  let answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  return {
    sdp: pc.localDescription.sdp,
    type: pc.localDescription.type,
    workspace: server.config.workspace,
  };
}

async function getRTCService(server, service_id, config) {
  config = config || {};
  config.peer_id = config.peer_id || (0,_utils__WEBPACK_IMPORTED_MODULE_1__.randId)();

  const pc = new RTCPeerConnection({
    iceServers: config.ice_servers || [
      { urls: ["stun:stun.l.google.com:19302"] },
    ],
    sdpSemantics: "unified-plan",
  });

  return new Promise(async (resolve, reject) => {
    try {
      pc.addEventListener(
        "connectionstatechange",
        () => {
          if (pc.connectionState === "failed") {
            pc.close();
            reject(new Error("WebRTC Connection failed"));
          } else if (pc.connectionState === "closed") {
            reject(new Error("WebRTC Connection closed"));
          } else {
            console.log("WebRTC Connection state: ", pc.connectionState);
          }
        },
        false,
      );

      if (config.on_init) {
        await config.on_init(pc);
        delete config.on_init;
      }
      let channel = pc.createDataChannel(config.peer_id, { ordered: true });
      channel.binaryType = "arraybuffer";
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const svc = await server.getService(service_id);
      const answer = await svc.offer({
        sdp: pc.localDescription.sdp,
        type: pc.localDescription.type,
      });

      channel.onopen = () => {
        config.channel = channel;
        config.workspace = answer.workspace;
        // Wait for the channel to be open before returning the rpc
        // This is needed for safari to work
        setTimeout(async () => {
          const rpc = await _setupRPC(config);
          pc.rpc = rpc;
          async function get_service(name, ...args) {
            (0,_utils__WEBPACK_IMPORTED_MODULE_1__.assert)(
              !name.includes(":"),
              "WebRTC service name should not contain ':'",
            );
            (0,_utils__WEBPACK_IMPORTED_MODULE_1__.assert)(
              !name.includes("/"),
              "WebRTC service name should not contain '/'",
            );
            return await rpc.get_remote_service(
              config.workspace + "/" + config.peer_id + ":" + name,
              ...args,
            );
          }
          async function disconnect() {
            await rpc.disconnect();
            pc.close();
          }
          pc.getService = (0,_utils_schema_js__WEBPACK_IMPORTED_MODULE_2__.schemaFunction)(get_service, {
            name: "getService",
            description: "Get a remote service via webrtc",
            parameters: {
              type: "object",
              properties: {
                service_id: {
                  type: "string",
                  description:
                    "Service ID. This should be a service id in the format: 'workspace/service_id', 'workspace/client_id:service_id' or 'workspace/client_id:service_id@app_id'",
                },
                config: {
                  type: "object",
                  description: "Options for the service",
                },
              },
              required: ["id"],
            },
          });
          pc.disconnect = (0,_utils_schema_js__WEBPACK_IMPORTED_MODULE_2__.schemaFunction)(disconnect, {
            name: "disconnect",
            description: "Disconnect from the webrtc connection via webrtc",
            parameters: { type: "object", properties: {} },
          });
          pc.registerCodec = (0,_utils_schema_js__WEBPACK_IMPORTED_MODULE_2__.schemaFunction)(rpc.register_codec, {
            name: "registerCodec",
            description: "Register a codec for the webrtc connection",
            parameters: {
              type: "object",
              properties: {
                codec: {
                  type: "object",
                  description: "Codec to register",
                  properties: {
                    name: { type: "string" },
                    type: {},
                    encoder: { type: "function" },
                    decoder: { type: "function" },
                  },
                },
              },
            },
          });
          resolve(pc);
        }, 500);
      };

      channel.onclose = () => reject(new Error("Data channel closed"));

      await pc.setRemoteDescription(
        new RTCSessionDescription({
          sdp: answer.sdp,
          type: answer.type,
        }),
      );
    } catch (e) {
      reject(e);
    }
  });
}

async function registerRTCService(server, service_id, config) {
  config = config || {
    visibility: "protected",
    require_context: true,
  };
  const onInit = config.on_init;
  delete config.on_init;
  return await server.registerService({
    id: service_id,
    config,
    offer: (params, context) =>
      _createOffer(params, server, config, onInit, context),
  });
}




/***/ }),

/***/ "./node_modules/@msgpack/msgpack/dist.es5+esm/CachedKeyDecoder.mjs":
/*!*************************************************************************!*\
  !*** ./node_modules/@msgpack/msgpack/dist.es5+esm/CachedKeyDecoder.mjs ***!
  \*************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __nested_webpack_exports__, __nested_webpack_require_94718__) => {

__nested_webpack_require_94718__.r(__nested_webpack_exports__);
/* harmony export */ __nested_webpack_require_94718__.d(__nested_webpack_exports__, {
/* harmony export */   CachedKeyDecoder: () => (/* binding */ CachedKeyDecoder)
/* harmony export */ });
/* harmony import */ var _utils_utf8_mjs__WEBPACK_IMPORTED_MODULE_0__ = __nested_webpack_require_94718__(/*! ./utils/utf8.mjs */ "./node_modules/@msgpack/msgpack/dist.es5+esm/utils/utf8.mjs");

var DEFAULT_MAX_KEY_LENGTH = 16;
var DEFAULT_MAX_LENGTH_PER_KEY = 16;
var CachedKeyDecoder = /** @class */ (function () {
    function CachedKeyDecoder(maxKeyLength, maxLengthPerKey) {
        if (maxKeyLength === void 0) { maxKeyLength = DEFAULT_MAX_KEY_LENGTH; }
        if (maxLengthPerKey === void 0) { maxLengthPerKey = DEFAULT_MAX_LENGTH_PER_KEY; }
        this.maxKeyLength = maxKeyLength;
        this.maxLengthPerKey = maxLengthPerKey;
        this.hit = 0;
        this.miss = 0;
        // avoid `new Array(N)`, which makes a sparse array,
        // because a sparse array is typically slower than a non-sparse array.
        this.caches = [];
        for (var i = 0; i < this.maxKeyLength; i++) {
            this.caches.push([]);
        }
    }
    CachedKeyDecoder.prototype.canBeCached = function (byteLength) {
        return byteLength > 0 && byteLength <= this.maxKeyLength;
    };
    CachedKeyDecoder.prototype.find = function (bytes, inputOffset, byteLength) {
        var records = this.caches[byteLength - 1];
        FIND_CHUNK: for (var _i = 0, records_1 = records; _i < records_1.length; _i++) {
            var record = records_1[_i];
            var recordBytes = record.bytes;
            for (var j = 0; j < byteLength; j++) {
                if (recordBytes[j] !== bytes[inputOffset + j]) {
                    continue FIND_CHUNK;
                }
            }
            return record.str;
        }
        return null;
    };
    CachedKeyDecoder.prototype.store = function (bytes, value) {
        var records = this.caches[bytes.length - 1];
        var record = { bytes: bytes, str: value };
        if (records.length >= this.maxLengthPerKey) {
            // `records` are full!
            // Set `record` to an arbitrary position.
            records[(Math.random() * records.length) | 0] = record;
        }
        else {
            records.push(record);
        }
    };
    CachedKeyDecoder.prototype.decode = function (bytes, inputOffset, byteLength) {
        var cachedValue = this.find(bytes, inputOffset, byteLength);
        if (cachedValue != null) {
            this.hit++;
            return cachedValue;
        }
        this.miss++;
        var str = (0,_utils_utf8_mjs__WEBPACK_IMPORTED_MODULE_0__.utf8DecodeJs)(bytes, inputOffset, byteLength);
        // Ensure to copy a slice of bytes because the byte may be NodeJS Buffer and Buffer#slice() returns a reference to its internal ArrayBuffer.
        var slicedCopyOfBytes = Uint8Array.prototype.slice.call(bytes, inputOffset, inputOffset + byteLength);
        this.store(slicedCopyOfBytes, str);
        return str;
    };
    return CachedKeyDecoder;
}());

//# sourceMappingURL=CachedKeyDecoder.mjs.map

/***/ }),

/***/ "./node_modules/@msgpack/msgpack/dist.es5+esm/DecodeError.mjs":
/*!********************************************************************!*\
  !*** ./node_modules/@msgpack/msgpack/dist.es5+esm/DecodeError.mjs ***!
  \********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __nested_webpack_exports__, __nested_webpack_require_98233__) => {

__nested_webpack_require_98233__.r(__nested_webpack_exports__);
/* harmony export */ __nested_webpack_require_98233__.d(__nested_webpack_exports__, {
/* harmony export */   DecodeError: () => (/* binding */ DecodeError)
/* harmony export */ });
var __extends = ( false) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var DecodeError = /** @class */ (function (_super) {
    __extends(DecodeError, _super);
    function DecodeError(message) {
        var _this = _super.call(this, message) || this;
        // fix the prototype chain in a cross-platform way
        var proto = Object.create(DecodeError.prototype);
        Object.setPrototypeOf(_this, proto);
        Object.defineProperty(_this, "name", {
            configurable: true,
            enumerable: false,
            value: DecodeError.name,
        });
        return _this;
    }
    return DecodeError;
}(Error));

//# sourceMappingURL=DecodeError.mjs.map

/***/ }),

/***/ "./node_modules/@msgpack/msgpack/dist.es5+esm/Decoder.mjs":
/*!****************************************************************!*\
  !*** ./node_modules/@msgpack/msgpack/dist.es5+esm/Decoder.mjs ***!
  \****************************************************************/
/***/ ((__unused_webpack___webpack_module__, __nested_webpack_exports__, __nested_webpack_require_100198__) => {

__nested_webpack_require_100198__.r(__nested_webpack_exports__);
/* harmony export */ __nested_webpack_require_100198__.d(__nested_webpack_exports__, {
/* harmony export */   DataViewIndexOutOfBoundsError: () => (/* binding */ DataViewIndexOutOfBoundsError),
/* harmony export */   Decoder: () => (/* binding */ Decoder)
/* harmony export */ });
/* harmony import */ var _utils_prettyByte_mjs__WEBPACK_IMPORTED_MODULE_4__ = __nested_webpack_require_100198__(/*! ./utils/prettyByte.mjs */ "./node_modules/@msgpack/msgpack/dist.es5+esm/utils/prettyByte.mjs");
/* harmony import */ var _ExtensionCodec_mjs__WEBPACK_IMPORTED_MODULE_1__ = __nested_webpack_require_100198__(/*! ./ExtensionCodec.mjs */ "./node_modules/@msgpack/msgpack/dist.es5+esm/ExtensionCodec.mjs");
/* harmony import */ var _utils_int_mjs__WEBPACK_IMPORTED_MODULE_2__ = __nested_webpack_require_100198__(/*! ./utils/int.mjs */ "./node_modules/@msgpack/msgpack/dist.es5+esm/utils/int.mjs");
/* harmony import */ var _utils_utf8_mjs__WEBPACK_IMPORTED_MODULE_6__ = __nested_webpack_require_100198__(/*! ./utils/utf8.mjs */ "./node_modules/@msgpack/msgpack/dist.es5+esm/utils/utf8.mjs");
/* harmony import */ var _utils_typedArrays_mjs__WEBPACK_IMPORTED_MODULE_3__ = __nested_webpack_require_100198__(/*! ./utils/typedArrays.mjs */ "./node_modules/@msgpack/msgpack/dist.es5+esm/utils/typedArrays.mjs");
/* harmony import */ var _CachedKeyDecoder_mjs__WEBPACK_IMPORTED_MODULE_0__ = __nested_webpack_require_100198__(/*! ./CachedKeyDecoder.mjs */ "./node_modules/@msgpack/msgpack/dist.es5+esm/CachedKeyDecoder.mjs");
/* harmony import */ var _DecodeError_mjs__WEBPACK_IMPORTED_MODULE_5__ = __nested_webpack_require_100198__(/*! ./DecodeError.mjs */ "./node_modules/@msgpack/msgpack/dist.es5+esm/DecodeError.mjs");
var __awaiter = ( false) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = ( false) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = ( false) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = ( false) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = ( false) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};







var isValidMapKeyType = function (key) {
    var keyType = typeof key;
    return keyType === "string" || keyType === "number";
};
var HEAD_BYTE_REQUIRED = -1;
var EMPTY_VIEW = new DataView(new ArrayBuffer(0));
var EMPTY_BYTES = new Uint8Array(EMPTY_VIEW.buffer);
// IE11: Hack to support IE11.
// IE11: Drop this hack and just use RangeError when IE11 is obsolete.
var DataViewIndexOutOfBoundsError = (function () {
    try {
        // IE11: The spec says it should throw RangeError,
        // IE11: but in IE11 it throws TypeError.
        EMPTY_VIEW.getInt8(0);
    }
    catch (e) {
        return e.constructor;
    }
    throw new Error("never reached");
})();
var MORE_DATA = new DataViewIndexOutOfBoundsError("Insufficient data");
var sharedCachedKeyDecoder = new _CachedKeyDecoder_mjs__WEBPACK_IMPORTED_MODULE_0__.CachedKeyDecoder();
var Decoder = /** @class */ (function () {
    function Decoder(extensionCodec, context, maxStrLength, maxBinLength, maxArrayLength, maxMapLength, maxExtLength, keyDecoder) {
        if (extensionCodec === void 0) { extensionCodec = _ExtensionCodec_mjs__WEBPACK_IMPORTED_MODULE_1__.ExtensionCodec.defaultCodec; }
        if (context === void 0) { context = undefined; }
        if (maxStrLength === void 0) { maxStrLength = _utils_int_mjs__WEBPACK_IMPORTED_MODULE_2__.UINT32_MAX; }
        if (maxBinLength === void 0) { maxBinLength = _utils_int_mjs__WEBPACK_IMPORTED_MODULE_2__.UINT32_MAX; }
        if (maxArrayLength === void 0) { maxArrayLength = _utils_int_mjs__WEBPACK_IMPORTED_MODULE_2__.UINT32_MAX; }
        if (maxMapLength === void 0) { maxMapLength = _utils_int_mjs__WEBPACK_IMPORTED_MODULE_2__.UINT32_MAX; }
        if (maxExtLength === void 0) { maxExtLength = _utils_int_mjs__WEBPACK_IMPORTED_MODULE_2__.UINT32_MAX; }
        if (keyDecoder === void 0) { keyDecoder = sharedCachedKeyDecoder; }
        this.extensionCodec = extensionCodec;
        this.context = context;
        this.maxStrLength = maxStrLength;
        this.maxBinLength = maxBinLength;
        this.maxArrayLength = maxArrayLength;
        this.maxMapLength = maxMapLength;
        this.maxExtLength = maxExtLength;
        this.keyDecoder = keyDecoder;
        this.totalPos = 0;
        this.pos = 0;
        this.view = EMPTY_VIEW;
        this.bytes = EMPTY_BYTES;
        this.headByte = HEAD_BYTE_REQUIRED;
        this.stack = [];
    }
    Decoder.prototype.reinitializeState = function () {
        this.totalPos = 0;
        this.headByte = HEAD_BYTE_REQUIRED;
        this.stack.length = 0;
        // view, bytes, and pos will be re-initialized in setBuffer()
    };
    Decoder.prototype.setBuffer = function (buffer) {
        this.bytes = (0,_utils_typedArrays_mjs__WEBPACK_IMPORTED_MODULE_3__.ensureUint8Array)(buffer);
        this.view = (0,_utils_typedArrays_mjs__WEBPACK_IMPORTED_MODULE_3__.createDataView)(this.bytes);
        this.pos = 0;
    };
    Decoder.prototype.appendBuffer = function (buffer) {
        if (this.headByte === HEAD_BYTE_REQUIRED && !this.hasRemaining(1)) {
            this.setBuffer(buffer);
        }
        else {
            var remainingData = this.bytes.subarray(this.pos);
            var newData = (0,_utils_typedArrays_mjs__WEBPACK_IMPORTED_MODULE_3__.ensureUint8Array)(buffer);
            // concat remainingData + newData
            var newBuffer = new Uint8Array(remainingData.length + newData.length);
            newBuffer.set(remainingData);
            newBuffer.set(newData, remainingData.length);
            this.setBuffer(newBuffer);
        }
    };
    Decoder.prototype.hasRemaining = function (size) {
        return this.view.byteLength - this.pos >= size;
    };
    Decoder.prototype.createExtraByteError = function (posToShow) {
        var _a = this, view = _a.view, pos = _a.pos;
        return new RangeError("Extra ".concat(view.byteLength - pos, " of ").concat(view.byteLength, " byte(s) found at buffer[").concat(posToShow, "]"));
    };
    /**
     * @throws {@link DecodeError}
     * @throws {@link RangeError}
     */
    Decoder.prototype.decode = function (buffer) {
        this.reinitializeState();
        this.setBuffer(buffer);
        var object = this.doDecodeSync();
        if (this.hasRemaining(1)) {
            throw this.createExtraByteError(this.pos);
        }
        return object;
    };
    Decoder.prototype.decodeMulti = function (buffer) {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    this.reinitializeState();
                    this.setBuffer(buffer);
                    _a.label = 1;
                case 1:
                    if (!this.hasRemaining(1)) return [3 /*break*/, 3];
                    return [4 /*yield*/, this.doDecodeSync()];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 1];
                case 3: return [2 /*return*/];
            }
        });
    };
    Decoder.prototype.decodeAsync = function (stream) {
        var stream_1, stream_1_1;
        var e_1, _a;
        return __awaiter(this, void 0, void 0, function () {
            var decoded, object, buffer, e_1_1, _b, headByte, pos, totalPos;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        decoded = false;
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 6, 7, 12]);
                        stream_1 = __asyncValues(stream);
                        _c.label = 2;
                    case 2: return [4 /*yield*/, stream_1.next()];
                    case 3:
                        if (!(stream_1_1 = _c.sent(), !stream_1_1.done)) return [3 /*break*/, 5];
                        buffer = stream_1_1.value;
                        if (decoded) {
                            throw this.createExtraByteError(this.totalPos);
                        }
                        this.appendBuffer(buffer);
                        try {
                            object = this.doDecodeSync();
                            decoded = true;
                        }
                        catch (e) {
                            if (!(e instanceof DataViewIndexOutOfBoundsError)) {
                                throw e; // rethrow
                            }
                            // fallthrough
                        }
                        this.totalPos += this.pos;
                        _c.label = 4;
                    case 4: return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 12];
                    case 6:
                        e_1_1 = _c.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 12];
                    case 7:
                        _c.trys.push([7, , 10, 11]);
                        if (!(stream_1_1 && !stream_1_1.done && (_a = stream_1.return))) return [3 /*break*/, 9];
                        return [4 /*yield*/, _a.call(stream_1)];
                    case 8:
                        _c.sent();
                        _c.label = 9;
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        if (e_1) throw e_1.error;
                        return [7 /*endfinally*/];
                    case 11: return [7 /*endfinally*/];
                    case 12:
                        if (decoded) {
                            if (this.hasRemaining(1)) {
                                throw this.createExtraByteError(this.totalPos);
                            }
                            return [2 /*return*/, object];
                        }
                        _b = this, headByte = _b.headByte, pos = _b.pos, totalPos = _b.totalPos;
                        throw new RangeError("Insufficient data in parsing ".concat((0,_utils_prettyByte_mjs__WEBPACK_IMPORTED_MODULE_4__.prettyByte)(headByte), " at ").concat(totalPos, " (").concat(pos, " in the current buffer)"));
                }
            });
        });
    };
    Decoder.prototype.decodeArrayStream = function (stream) {
        return this.decodeMultiAsync(stream, true);
    };
    Decoder.prototype.decodeStream = function (stream) {
        return this.decodeMultiAsync(stream, false);
    };
    Decoder.prototype.decodeMultiAsync = function (stream, isArray) {
        return __asyncGenerator(this, arguments, function decodeMultiAsync_1() {
            var isArrayHeaderRequired, arrayItemsLeft, stream_2, stream_2_1, buffer, e_2, e_3_1;
            var e_3, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        isArrayHeaderRequired = isArray;
                        arrayItemsLeft = -1;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 13, 14, 19]);
                        stream_2 = __asyncValues(stream);
                        _b.label = 2;
                    case 2: return [4 /*yield*/, __await(stream_2.next())];
                    case 3:
                        if (!(stream_2_1 = _b.sent(), !stream_2_1.done)) return [3 /*break*/, 12];
                        buffer = stream_2_1.value;
                        if (isArray && arrayItemsLeft === 0) {
                            throw this.createExtraByteError(this.totalPos);
                        }
                        this.appendBuffer(buffer);
                        if (isArrayHeaderRequired) {
                            arrayItemsLeft = this.readArraySize();
                            isArrayHeaderRequired = false;
                            this.complete();
                        }
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 9, , 10]);
                        _b.label = 5;
                    case 5:
                        if (false) // removed by dead control flow
{}
                        return [4 /*yield*/, __await(this.doDecodeSync())];
                    case 6: return [4 /*yield*/, _b.sent()];
                    case 7:
                        _b.sent();
                        if (--arrayItemsLeft === 0) {
                            return [3 /*break*/, 8];
                        }
                        return [3 /*break*/, 5];
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        e_2 = _b.sent();
                        if (!(e_2 instanceof DataViewIndexOutOfBoundsError)) {
                            throw e_2; // rethrow
                        }
                        return [3 /*break*/, 10];
                    case 10:
                        this.totalPos += this.pos;
                        _b.label = 11;
                    case 11: return [3 /*break*/, 2];
                    case 12: return [3 /*break*/, 19];
                    case 13:
                        e_3_1 = _b.sent();
                        e_3 = { error: e_3_1 };
                        return [3 /*break*/, 19];
                    case 14:
                        _b.trys.push([14, , 17, 18]);
                        if (!(stream_2_1 && !stream_2_1.done && (_a = stream_2.return))) return [3 /*break*/, 16];
                        return [4 /*yield*/, __await(_a.call(stream_2))];
                    case 15:
                        _b.sent();
                        _b.label = 16;
                    case 16: return [3 /*break*/, 18];
                    case 17:
                        if (e_3) throw e_3.error;
                        return [7 /*endfinally*/];
                    case 18: return [7 /*endfinally*/];
                    case 19: return [2 /*return*/];
                }
            });
        });
    };
    Decoder.prototype.doDecodeSync = function () {
        DECODE: while (true) {
            var headByte = this.readHeadByte();
            var object = void 0;
            if (headByte >= 0xe0) {
                // negative fixint (111x xxxx) 0xe0 - 0xff
                object = headByte - 0x100;
            }
            else if (headByte < 0xc0) {
                if (headByte < 0x80) {
                    // positive fixint (0xxx xxxx) 0x00 - 0x7f
                    object = headByte;
                }
                else if (headByte < 0x90) {
                    // fixmap (1000 xxxx) 0x80 - 0x8f
                    var size = headByte - 0x80;
                    if (size !== 0) {
                        this.pushMapState(size);
                        this.complete();
                        continue DECODE;
                    }
                    else {
                        object = {};
                    }
                }
                else if (headByte < 0xa0) {
                    // fixarray (1001 xxxx) 0x90 - 0x9f
                    var size = headByte - 0x90;
                    if (size !== 0) {
                        this.pushArrayState(size);
                        this.complete();
                        continue DECODE;
                    }
                    else {
                        object = [];
                    }
                }
                else {
                    // fixstr (101x xxxx) 0xa0 - 0xbf
                    var byteLength = headByte - 0xa0;
                    object = this.decodeUtf8String(byteLength, 0);
                }
            }
            else if (headByte === 0xc0) {
                // nil
                object = null;
            }
            else if (headByte === 0xc2) {
                // false
                object = false;
            }
            else if (headByte === 0xc3) {
                // true
                object = true;
            }
            else if (headByte === 0xca) {
                // float 32
                object = this.readF32();
            }
            else if (headByte === 0xcb) {
                // float 64
                object = this.readF64();
            }
            else if (headByte === 0xcc) {
                // uint 8
                object = this.readU8();
            }
            else if (headByte === 0xcd) {
                // uint 16
                object = this.readU16();
            }
            else if (headByte === 0xce) {
                // uint 32
                object = this.readU32();
            }
            else if (headByte === 0xcf) {
                // uint 64
                object = this.readU64();
            }
            else if (headByte === 0xd0) {
                // int 8
                object = this.readI8();
            }
            else if (headByte === 0xd1) {
                // int 16
                object = this.readI16();
            }
            else if (headByte === 0xd2) {
                // int 32
                object = this.readI32();
            }
            else if (headByte === 0xd3) {
                // int 64
                object = this.readI64();
            }
            else if (headByte === 0xd9) {
                // str 8
                var byteLength = this.lookU8();
                object = this.decodeUtf8String(byteLength, 1);
            }
            else if (headByte === 0xda) {
                // str 16
                var byteLength = this.lookU16();
                object = this.decodeUtf8String(byteLength, 2);
            }
            else if (headByte === 0xdb) {
                // str 32
                var byteLength = this.lookU32();
                object = this.decodeUtf8String(byteLength, 4);
            }
            else if (headByte === 0xdc) {
                // array 16
                var size = this.readU16();
                if (size !== 0) {
                    this.pushArrayState(size);
                    this.complete();
                    continue DECODE;
                }
                else {
                    object = [];
                }
            }
            else if (headByte === 0xdd) {
                // array 32
                var size = this.readU32();
                if (size !== 0) {
                    this.pushArrayState(size);
                    this.complete();
                    continue DECODE;
                }
                else {
                    object = [];
                }
            }
            else if (headByte === 0xde) {
                // map 16
                var size = this.readU16();
                if (size !== 0) {
                    this.pushMapState(size);
                    this.complete();
                    continue DECODE;
                }
                else {
                    object = {};
                }
            }
            else if (headByte === 0xdf) {
                // map 32
                var size = this.readU32();
                if (size !== 0) {
                    this.pushMapState(size);
                    this.complete();
                    continue DECODE;
                }
                else {
                    object = {};
                }
            }
            else if (headByte === 0xc4) {
                // bin 8
                var size = this.lookU8();
                object = this.decodeBinary(size, 1);
            }
            else if (headByte === 0xc5) {
                // bin 16
                var size = this.lookU16();
                object = this.decodeBinary(size, 2);
            }
            else if (headByte === 0xc6) {
                // bin 32
                var size = this.lookU32();
                object = this.decodeBinary(size, 4);
            }
            else if (headByte === 0xd4) {
                // fixext 1
                object = this.decodeExtension(1, 0);
            }
            else if (headByte === 0xd5) {
                // fixext 2
                object = this.decodeExtension(2, 0);
            }
            else if (headByte === 0xd6) {
                // fixext 4
                object = this.decodeExtension(4, 0);
            }
            else if (headByte === 0xd7) {
                // fixext 8
                object = this.decodeExtension(8, 0);
            }
            else if (headByte === 0xd8) {
                // fixext 16
                object = this.decodeExtension(16, 0);
            }
            else if (headByte === 0xc7) {
                // ext 8
                var size = this.lookU8();
                object = this.decodeExtension(size, 1);
            }
            else if (headByte === 0xc8) {
                // ext 16
                var size = this.lookU16();
                object = this.decodeExtension(size, 2);
            }
            else if (headByte === 0xc9) {
                // ext 32
                var size = this.lookU32();
                object = this.decodeExtension(size, 4);
            }
            else {
                throw new _DecodeError_mjs__WEBPACK_IMPORTED_MODULE_5__.DecodeError("Unrecognized type byte: ".concat((0,_utils_prettyByte_mjs__WEBPACK_IMPORTED_MODULE_4__.prettyByte)(headByte)));
            }
            this.complete();
            var stack = this.stack;
            while (stack.length > 0) {
                // arrays and maps
                var state = stack[stack.length - 1];
                if (state.type === 0 /* State.ARRAY */) {
                    state.array[state.position] = object;
                    state.position++;
                    if (state.position === state.size) {
                        stack.pop();
                        object = state.array;
                    }
                    else {
                        continue DECODE;
                    }
                }
                else if (state.type === 1 /* State.MAP_KEY */) {
                    if (!isValidMapKeyType(object)) {
                        throw new _DecodeError_mjs__WEBPACK_IMPORTED_MODULE_5__.DecodeError("The type of key must be string or number but " + typeof object);
                    }
                    if (object === "__proto__") {
                        throw new _DecodeError_mjs__WEBPACK_IMPORTED_MODULE_5__.DecodeError("The key __proto__ is not allowed");
                    }
                    state.key = object;
                    state.type = 2 /* State.MAP_VALUE */;
                    continue DECODE;
                }
                else {
                    // it must be `state.type === State.MAP_VALUE` here
                    state.map[state.key] = object;
                    state.readCount++;
                    if (state.readCount === state.size) {
                        stack.pop();
                        object = state.map;
                    }
                    else {
                        state.key = null;
                        state.type = 1 /* State.MAP_KEY */;
                        continue DECODE;
                    }
                }
            }
            return object;
        }
    };
    Decoder.prototype.readHeadByte = function () {
        if (this.headByte === HEAD_BYTE_REQUIRED) {
            this.headByte = this.readU8();
            // console.log("headByte", prettyByte(this.headByte));
        }
        return this.headByte;
    };
    Decoder.prototype.complete = function () {
        this.headByte = HEAD_BYTE_REQUIRED;
    };
    Decoder.prototype.readArraySize = function () {
        var headByte = this.readHeadByte();
        switch (headByte) {
            case 0xdc:
                return this.readU16();
            case 0xdd:
                return this.readU32();
            default: {
                if (headByte < 0xa0) {
                    return headByte - 0x90;
                }
                else {
                    throw new _DecodeError_mjs__WEBPACK_IMPORTED_MODULE_5__.DecodeError("Unrecognized array type byte: ".concat((0,_utils_prettyByte_mjs__WEBPACK_IMPORTED_MODULE_4__.prettyByte)(headByte)));
                }
            }
        }
    };
    Decoder.prototype.pushMapState = function (size) {
        if (size > this.maxMapLength) {
            throw new _DecodeError_mjs__WEBPACK_IMPORTED_MODULE_5__.DecodeError("Max length exceeded: map length (".concat(size, ") > maxMapLengthLength (").concat(this.maxMapLength, ")"));
        }
        this.stack.push({
            type: 1 /* State.MAP_KEY */,
            size: size,
            key: null,
            readCount: 0,
            map: {},
        });
    };
    Decoder.prototype.pushArrayState = function (size) {
        if (size > this.maxArrayLength) {
            throw new _DecodeError_mjs__WEBPACK_IMPORTED_MODULE_5__.DecodeError("Max length exceeded: array length (".concat(size, ") > maxArrayLength (").concat(this.maxArrayLength, ")"));
        }
        this.stack.push({
            type: 0 /* State.ARRAY */,
            size: size,
            array: new Array(size),
            position: 0,
        });
    };
    Decoder.prototype.decodeUtf8String = function (byteLength, headerOffset) {
        var _a;
        if (byteLength > this.maxStrLength) {
            throw new _DecodeError_mjs__WEBPACK_IMPORTED_MODULE_5__.DecodeError("Max length exceeded: UTF-8 byte length (".concat(byteLength, ") > maxStrLength (").concat(this.maxStrLength, ")"));
        }
        if (this.bytes.byteLength < this.pos + headerOffset + byteLength) {
            throw MORE_DATA;
        }
        var offset = this.pos + headerOffset;
        var object;
        if (this.stateIsMapKey() && ((_a = this.keyDecoder) === null || _a === void 0 ? void 0 : _a.canBeCached(byteLength))) {
            object = this.keyDecoder.decode(this.bytes, offset, byteLength);
        }
        else if (byteLength > _utils_utf8_mjs__WEBPACK_IMPORTED_MODULE_6__.TEXT_DECODER_THRESHOLD) {
            object = (0,_utils_utf8_mjs__WEBPACK_IMPORTED_MODULE_6__.utf8DecodeTD)(this.bytes, offset, byteLength);
        }
        else {
            object = (0,_utils_utf8_mjs__WEBPACK_IMPORTED_MODULE_6__.utf8DecodeJs)(this.bytes, offset, byteLength);
        }
        this.pos += headerOffset + byteLength;
        return object;
    };
    Decoder.prototype.stateIsMapKey = function () {
        if (this.stack.length > 0) {
            var state = this.stack[this.stack.length - 1];
            return state.type === 1 /* State.MAP_KEY */;
        }
        return false;
    };
    Decoder.prototype.decodeBinary = function (byteLength, headOffset) {
        if (byteLength > this.maxBinLength) {
            throw new _DecodeError_mjs__WEBPACK_IMPORTED_MODULE_5__.DecodeError("Max length exceeded: bin length (".concat(byteLength, ") > maxBinLength (").concat(this.maxBinLength, ")"));
        }
        if (!this.hasRemaining(byteLength + headOffset)) {
            throw MORE_DATA;
        }
        var offset = this.pos + headOffset;
        var object = this.bytes.subarray(offset, offset + byteLength);
        this.pos += headOffset + byteLength;
        return object;
    };
    Decoder.prototype.decodeExtension = function (size, headOffset) {
        if (size > this.maxExtLength) {
            throw new _DecodeError_mjs__WEBPACK_IMPORTED_MODULE_5__.DecodeError("Max length exceeded: ext length (".concat(size, ") > maxExtLength (").concat(this.maxExtLength, ")"));
        }
        var extType = this.view.getInt8(this.pos + headOffset);
        var data = this.decodeBinary(size, headOffset + 1 /* extType */);
        return this.extensionCodec.decode(data, extType, this.context);
    };
    Decoder.prototype.lookU8 = function () {
        return this.view.getUint8(this.pos);
    };
    Decoder.prototype.lookU16 = function () {
        return this.view.getUint16(this.pos);
    };
    Decoder.prototype.lookU32 = function () {
        return this.view.getUint32(this.pos);
    };
    Decoder.prototype.readU8 = function () {
        var value = this.view.getUint8(this.pos);
        this.pos++;
        return value;
    };
    Decoder.prototype.readI8 = function () {
        var value = this.view.getInt8(this.pos);
        this.pos++;
        return value;
    };
    Decoder.prototype.readU16 = function () {
        var value = this.view.getUint16(this.pos);
        this.pos += 2;
        return value;
    };
    Decoder.prototype.readI16 = function () {
        var value = this.view.getInt16(this.pos);
        this.pos += 2;
        return value;
    };
    Decoder.prototype.readU32 = function () {
        var value = this.view.getUint32(this.pos);
        this.pos += 4;
        return value;
    };
    Decoder.prototype.readI32 = function () {
        var value = this.view.getInt32(this.pos);
        this.pos += 4;
        return value;
    };
    Decoder.prototype.readU64 = function () {
        var value = (0,_utils_int_mjs__WEBPACK_IMPORTED_MODULE_2__.getUint64)(this.view, this.pos);
        this.pos += 8;
        return value;
    };
    Decoder.prototype.readI64 = function () {
        var value = (0,_utils_int_mjs__WEBPACK_IMPORTED_MODULE_2__.getInt64)(this.view, this.pos);
        this.pos += 8;
        return value;
    };
    Decoder.prototype.readF32 = function () {
        var value = this.view.getFloat32(this.pos);
        this.pos += 4;
        return value;
    };
    Decoder.prototype.readF64 = function () {
        var value = this.view.getFloat64(this.pos);
        this.pos += 8;
        return value;
    };
    return Decoder;
}());

//# sourceMappingURL=Decoder.mjs.map

/***/ }),

/***/ "./node_modules/@msgpack/msgpack/dist.es5+esm/Encoder.mjs":
/*!****************************************************************!*\
  !*** ./node_modules/@msgpack/msgpack/dist.es5+esm/Encoder.mjs ***!
  \****************************************************************/
/***/ ((__unused_webpack___webpack_module__, __nested_webpack_exports__, __nested_webpack_require_133924__) => {

__nested_webpack_require_133924__.r(__nested_webpack_exports__);
/* harmony export */ __nested_webpack_require_133924__.d(__nested_webpack_exports__, {
/* harmony export */   DEFAULT_INITIAL_BUFFER_SIZE: () => (/* binding */ DEFAULT_INITIAL_BUFFER_SIZE),
/* harmony export */   DEFAULT_MAX_DEPTH: () => (/* binding */ DEFAULT_MAX_DEPTH),
/* harmony export */   Encoder: () => (/* binding */ Encoder)
/* harmony export */ });
/* harmony import */ var _utils_utf8_mjs__WEBPACK_IMPORTED_MODULE_1__ = __nested_webpack_require_133924__(/*! ./utils/utf8.mjs */ "./node_modules/@msgpack/msgpack/dist.es5+esm/utils/utf8.mjs");
/* harmony import */ var _ExtensionCodec_mjs__WEBPACK_IMPORTED_MODULE_0__ = __nested_webpack_require_133924__(/*! ./ExtensionCodec.mjs */ "./node_modules/@msgpack/msgpack/dist.es5+esm/ExtensionCodec.mjs");
/* harmony import */ var _utils_int_mjs__WEBPACK_IMPORTED_MODULE_3__ = __nested_webpack_require_133924__(/*! ./utils/int.mjs */ "./node_modules/@msgpack/msgpack/dist.es5+esm/utils/int.mjs");
/* harmony import */ var _utils_typedArrays_mjs__WEBPACK_IMPORTED_MODULE_2__ = __nested_webpack_require_133924__(/*! ./utils/typedArrays.mjs */ "./node_modules/@msgpack/msgpack/dist.es5+esm/utils/typedArrays.mjs");




var DEFAULT_MAX_DEPTH = 100;
var DEFAULT_INITIAL_BUFFER_SIZE = 2048;
var Encoder = /** @class */ (function () {
    function Encoder(extensionCodec, context, maxDepth, initialBufferSize, sortKeys, forceFloat32, ignoreUndefined, forceIntegerToFloat) {
        if (extensionCodec === void 0) { extensionCodec = _ExtensionCodec_mjs__WEBPACK_IMPORTED_MODULE_0__.ExtensionCodec.defaultCodec; }
        if (context === void 0) { context = undefined; }
        if (maxDepth === void 0) { maxDepth = DEFAULT_MAX_DEPTH; }
        if (initialBufferSize === void 0) { initialBufferSize = DEFAULT_INITIAL_BUFFER_SIZE; }
        if (sortKeys === void 0) { sortKeys = false; }
        if (forceFloat32 === void 0) { forceFloat32 = false; }
        if (ignoreUndefined === void 0) { ignoreUndefined = false; }
        if (forceIntegerToFloat === void 0) { forceIntegerToFloat = false; }
        this.extensionCodec = extensionCodec;
        this.context = context;
        this.maxDepth = maxDepth;
        this.initialBufferSize = initialBufferSize;
        this.sortKeys = sortKeys;
        this.forceFloat32 = forceFloat32;
        this.ignoreUndefined = ignoreUndefined;
        this.forceIntegerToFloat = forceIntegerToFloat;
        this.pos = 0;
        this.view = new DataView(new ArrayBuffer(this.initialBufferSize));
        this.bytes = new Uint8Array(this.view.buffer);
    }
    Encoder.prototype.reinitializeState = function () {
        this.pos = 0;
    };
    /**
     * This is almost equivalent to {@link Encoder#encode}, but it returns an reference of the encoder's internal buffer and thus much faster than {@link Encoder#encode}.
     *
     * @returns Encodes the object and returns a shared reference the encoder's internal buffer.
     */
    Encoder.prototype.encodeSharedRef = function (object) {
        this.reinitializeState();
        this.doEncode(object, 1);
        return this.bytes.subarray(0, this.pos);
    };
    /**
     * @returns Encodes the object and returns a copy of the encoder's internal buffer.
     */
    Encoder.prototype.encode = function (object) {
        this.reinitializeState();
        this.doEncode(object, 1);
        return this.bytes.slice(0, this.pos);
    };
    Encoder.prototype.doEncode = function (object, depth) {
        if (depth > this.maxDepth) {
            throw new Error("Too deep objects in depth ".concat(depth));
        }
        if (object == null) {
            this.encodeNil();
        }
        else if (typeof object === "boolean") {
            this.encodeBoolean(object);
        }
        else if (typeof object === "number") {
            this.encodeNumber(object);
        }
        else if (typeof object === "string") {
            this.encodeString(object);
        }
        else {
            this.encodeObject(object, depth);
        }
    };
    Encoder.prototype.ensureBufferSizeToWrite = function (sizeToWrite) {
        var requiredSize = this.pos + sizeToWrite;
        if (this.view.byteLength < requiredSize) {
            this.resizeBuffer(requiredSize * 2);
        }
    };
    Encoder.prototype.resizeBuffer = function (newSize) {
        var newBuffer = new ArrayBuffer(newSize);
        var newBytes = new Uint8Array(newBuffer);
        var newView = new DataView(newBuffer);
        newBytes.set(this.bytes);
        this.view = newView;
        this.bytes = newBytes;
    };
    Encoder.prototype.encodeNil = function () {
        this.writeU8(0xc0);
    };
    Encoder.prototype.encodeBoolean = function (object) {
        if (object === false) {
            this.writeU8(0xc2);
        }
        else {
            this.writeU8(0xc3);
        }
    };
    Encoder.prototype.encodeNumber = function (object) {
        if (Number.isSafeInteger(object) && !this.forceIntegerToFloat) {
            if (object >= 0) {
                if (object < 0x80) {
                    // positive fixint
                    this.writeU8(object);
                }
                else if (object < 0x100) {
                    // uint 8
                    this.writeU8(0xcc);
                    this.writeU8(object);
                }
                else if (object < 0x10000) {
                    // uint 16
                    this.writeU8(0xcd);
                    this.writeU16(object);
                }
                else if (object < 0x100000000) {
                    // uint 32
                    this.writeU8(0xce);
                    this.writeU32(object);
                }
                else {
                    // uint 64
                    this.writeU8(0xcf);
                    this.writeU64(object);
                }
            }
            else {
                if (object >= -0x20) {
                    // negative fixint
                    this.writeU8(0xe0 | (object + 0x20));
                }
                else if (object >= -0x80) {
                    // int 8
                    this.writeU8(0xd0);
                    this.writeI8(object);
                }
                else if (object >= -0x8000) {
                    // int 16
                    this.writeU8(0xd1);
                    this.writeI16(object);
                }
                else if (object >= -0x80000000) {
                    // int 32
                    this.writeU8(0xd2);
                    this.writeI32(object);
                }
                else {
                    // int 64
                    this.writeU8(0xd3);
                    this.writeI64(object);
                }
            }
        }
        else {
            // non-integer numbers
            if (this.forceFloat32) {
                // float 32
                this.writeU8(0xca);
                this.writeF32(object);
            }
            else {
                // float 64
                this.writeU8(0xcb);
                this.writeF64(object);
            }
        }
    };
    Encoder.prototype.writeStringHeader = function (byteLength) {
        if (byteLength < 32) {
            // fixstr
            this.writeU8(0xa0 + byteLength);
        }
        else if (byteLength < 0x100) {
            // str 8
            this.writeU8(0xd9);
            this.writeU8(byteLength);
        }
        else if (byteLength < 0x10000) {
            // str 16
            this.writeU8(0xda);
            this.writeU16(byteLength);
        }
        else if (byteLength < 0x100000000) {
            // str 32
            this.writeU8(0xdb);
            this.writeU32(byteLength);
        }
        else {
            throw new Error("Too long string: ".concat(byteLength, " bytes in UTF-8"));
        }
    };
    Encoder.prototype.encodeString = function (object) {
        var maxHeaderSize = 1 + 4;
        var strLength = object.length;
        if (strLength > _utils_utf8_mjs__WEBPACK_IMPORTED_MODULE_1__.TEXT_ENCODER_THRESHOLD) {
            var byteLength = (0,_utils_utf8_mjs__WEBPACK_IMPORTED_MODULE_1__.utf8Count)(object);
            this.ensureBufferSizeToWrite(maxHeaderSize + byteLength);
            this.writeStringHeader(byteLength);
            (0,_utils_utf8_mjs__WEBPACK_IMPORTED_MODULE_1__.utf8EncodeTE)(object, this.bytes, this.pos);
            this.pos += byteLength;
        }
        else {
            var byteLength = (0,_utils_utf8_mjs__WEBPACK_IMPORTED_MODULE_1__.utf8Count)(object);
            this.ensureBufferSizeToWrite(maxHeaderSize + byteLength);
            this.writeStringHeader(byteLength);
            (0,_utils_utf8_mjs__WEBPACK_IMPORTED_MODULE_1__.utf8EncodeJs)(object, this.bytes, this.pos);
            this.pos += byteLength;
        }
    };
    Encoder.prototype.encodeObject = function (object, depth) {
        // try to encode objects with custom codec first of non-primitives
        var ext = this.extensionCodec.tryToEncode(object, this.context);
        if (ext != null) {
            this.encodeExtension(ext);
        }
        else if (Array.isArray(object)) {
            this.encodeArray(object, depth);
        }
        else if (ArrayBuffer.isView(object)) {
            this.encodeBinary(object);
        }
        else if (typeof object === "object") {
            this.encodeMap(object, depth);
        }
        else {
            // symbol, function and other special object come here unless extensionCodec handles them.
            throw new Error("Unrecognized object: ".concat(Object.prototype.toString.apply(object)));
        }
    };
    Encoder.prototype.encodeBinary = function (object) {
        var size = object.byteLength;
        if (size < 0x100) {
            // bin 8
            this.writeU8(0xc4);
            this.writeU8(size);
        }
        else if (size < 0x10000) {
            // bin 16
            this.writeU8(0xc5);
            this.writeU16(size);
        }
        else if (size < 0x100000000) {
            // bin 32
            this.writeU8(0xc6);
            this.writeU32(size);
        }
        else {
            throw new Error("Too large binary: ".concat(size));
        }
        var bytes = (0,_utils_typedArrays_mjs__WEBPACK_IMPORTED_MODULE_2__.ensureUint8Array)(object);
        this.writeU8a(bytes);
    };
    Encoder.prototype.encodeArray = function (object, depth) {
        var size = object.length;
        if (size < 16) {
            // fixarray
            this.writeU8(0x90 + size);
        }
        else if (size < 0x10000) {
            // array 16
            this.writeU8(0xdc);
            this.writeU16(size);
        }
        else if (size < 0x100000000) {
            // array 32
            this.writeU8(0xdd);
            this.writeU32(size);
        }
        else {
            throw new Error("Too large array: ".concat(size));
        }
        for (var _i = 0, object_1 = object; _i < object_1.length; _i++) {
            var item = object_1[_i];
            this.doEncode(item, depth + 1);
        }
    };
    Encoder.prototype.countWithoutUndefined = function (object, keys) {
        var count = 0;
        for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
            var key = keys_1[_i];
            if (object[key] !== undefined) {
                count++;
            }
        }
        return count;
    };
    Encoder.prototype.encodeMap = function (object, depth) {
        var keys = Object.keys(object);
        if (this.sortKeys) {
            keys.sort();
        }
        var size = this.ignoreUndefined ? this.countWithoutUndefined(object, keys) : keys.length;
        if (size < 16) {
            // fixmap
            this.writeU8(0x80 + size);
        }
        else if (size < 0x10000) {
            // map 16
            this.writeU8(0xde);
            this.writeU16(size);
        }
        else if (size < 0x100000000) {
            // map 32
            this.writeU8(0xdf);
            this.writeU32(size);
        }
        else {
            throw new Error("Too large map object: ".concat(size));
        }
        for (var _i = 0, keys_2 = keys; _i < keys_2.length; _i++) {
            var key = keys_2[_i];
            var value = object[key];
            if (!(this.ignoreUndefined && value === undefined)) {
                this.encodeString(key);
                this.doEncode(value, depth + 1);
            }
        }
    };
    Encoder.prototype.encodeExtension = function (ext) {
        var size = ext.data.length;
        if (size === 1) {
            // fixext 1
            this.writeU8(0xd4);
        }
        else if (size === 2) {
            // fixext 2
            this.writeU8(0xd5);
        }
        else if (size === 4) {
            // fixext 4
            this.writeU8(0xd6);
        }
        else if (size === 8) {
            // fixext 8
            this.writeU8(0xd7);
        }
        else if (size === 16) {
            // fixext 16
            this.writeU8(0xd8);
        }
        else if (size < 0x100) {
            // ext 8
            this.writeU8(0xc7);
            this.writeU8(size);
        }
        else if (size < 0x10000) {
            // ext 16
            this.writeU8(0xc8);
            this.writeU16(size);
        }
        else if (size < 0x100000000) {
            // ext 32
            this.writeU8(0xc9);
            this.writeU32(size);
        }
        else {
            throw new Error("Too large extension object: ".concat(size));
        }
        this.writeI8(ext.type);
        this.writeU8a(ext.data);
    };
    Encoder.prototype.writeU8 = function (value) {
        this.ensureBufferSizeToWrite(1);
        this.view.setUint8(this.pos, value);
        this.pos++;
    };
    Encoder.prototype.writeU8a = function (values) {
        var size = values.length;
        this.ensureBufferSizeToWrite(size);
        this.bytes.set(values, this.pos);
        this.pos += size;
    };
    Encoder.prototype.writeI8 = function (value) {
        this.ensureBufferSizeToWrite(1);
        this.view.setInt8(this.pos, value);
        this.pos++;
    };
    Encoder.prototype.writeU16 = function (value) {
        this.ensureBufferSizeToWrite(2);
        this.view.setUint16(this.pos, value);
        this.pos += 2;
    };
    Encoder.prototype.writeI16 = function (value) {
        this.ensureBufferSizeToWrite(2);
        this.view.setInt16(this.pos, value);
        this.pos += 2;
    };
    Encoder.prototype.writeU32 = function (value) {
        this.ensureBufferSizeToWrite(4);
        this.view.setUint32(this.pos, value);
        this.pos += 4;
    };
    Encoder.prototype.writeI32 = function (value) {
        this.ensureBufferSizeToWrite(4);
        this.view.setInt32(this.pos, value);
        this.pos += 4;
    };
    Encoder.prototype.writeF32 = function (value) {
        this.ensureBufferSizeToWrite(4);
        this.view.setFloat32(this.pos, value);
        this.pos += 4;
    };
    Encoder.prototype.writeF64 = function (value) {
        this.ensureBufferSizeToWrite(8);
        this.view.setFloat64(this.pos, value);
        this.pos += 8;
    };
    Encoder.prototype.writeU64 = function (value) {
        this.ensureBufferSizeToWrite(8);
        (0,_utils_int_mjs__WEBPACK_IMPORTED_MODULE_3__.setUint64)(this.view, this.pos, value);
        this.pos += 8;
    };
    Encoder.prototype.writeI64 = function (value) {
        this.ensureBufferSizeToWrite(8);
        (0,_utils_int_mjs__WEBPACK_IMPORTED_MODULE_3__.setInt64)(this.view, this.pos, value);
        this.pos += 8;
    };
    return Encoder;
}());

//# sourceMappingURL=Encoder.mjs.map

/***/ }),

/***/ "./node_modules/@msgpack/msgpack/dist.es5+esm/ExtData.mjs":
/*!****************************************************************!*\
  !*** ./node_modules/@msgpack/msgpack/dist.es5+esm/ExtData.mjs ***!
  \****************************************************************/
/***/ ((__unused_webpack___webpack_module__, __nested_webpack_exports__, __nested_webpack_require_149849__) => {

__nested_webpack_require_149849__.r(__nested_webpack_exports__);
/* harmony export */ __nested_webpack_require_149849__.d(__nested_webpack_exports__, {
/* harmony export */   ExtData: () => (/* binding */ ExtData)
/* harmony export */ });
/**
 * ExtData is used to handle Extension Types that are not registered to ExtensionCodec.
 */
var ExtData = /** @class */ (function () {
    function ExtData(type, data) {
        this.type = type;
        this.data = data;
    }
    return ExtData;
}());

//# sourceMappingURL=ExtData.mjs.map

/***/ }),

/***/ "./node_modules/@msgpack/msgpack/dist.es5+esm/ExtensionCodec.mjs":
/*!***********************************************************************!*\
  !*** ./node_modules/@msgpack/msgpack/dist.es5+esm/ExtensionCodec.mjs ***!
  \***********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __nested_webpack_exports__, __nested_webpack_require_150750__) => {

__nested_webpack_require_150750__.r(__nested_webpack_exports__);
/* harmony export */ __nested_webpack_require_150750__.d(__nested_webpack_exports__, {
/* harmony export */   ExtensionCodec: () => (/* binding */ ExtensionCodec)
/* harmony export */ });
/* harmony import */ var _ExtData_mjs__WEBPACK_IMPORTED_MODULE_1__ = __nested_webpack_require_150750__(/*! ./ExtData.mjs */ "./node_modules/@msgpack/msgpack/dist.es5+esm/ExtData.mjs");
/* harmony import */ var _timestamp_mjs__WEBPACK_IMPORTED_MODULE_0__ = __nested_webpack_require_150750__(/*! ./timestamp.mjs */ "./node_modules/@msgpack/msgpack/dist.es5+esm/timestamp.mjs");
// ExtensionCodec to handle MessagePack extensions


var ExtensionCodec = /** @class */ (function () {
    function ExtensionCodec() {
        // built-in extensions
        this.builtInEncoders = [];
        this.builtInDecoders = [];
        // custom extensions
        this.encoders = [];
        this.decoders = [];
        this.register(_timestamp_mjs__WEBPACK_IMPORTED_MODULE_0__.timestampExtension);
    }
    ExtensionCodec.prototype.register = function (_a) {
        var type = _a.type, encode = _a.encode, decode = _a.decode;
        if (type >= 0) {
            // custom extensions
            this.encoders[type] = encode;
            this.decoders[type] = decode;
        }
        else {
            // built-in extensions
            var index = 1 + type;
            this.builtInEncoders[index] = encode;
            this.builtInDecoders[index] = decode;
        }
    };
    ExtensionCodec.prototype.tryToEncode = function (object, context) {
        // built-in extensions
        for (var i = 0; i < this.builtInEncoders.length; i++) {
            var encodeExt = this.builtInEncoders[i];
            if (encodeExt != null) {
                var data = encodeExt(object, context);
                if (data != null) {
                    var type = -1 - i;
                    return new _ExtData_mjs__WEBPACK_IMPORTED_MODULE_1__.ExtData(type, data);
                }
            }
        }
        // custom extensions
        for (var i = 0; i < this.encoders.length; i++) {
            var encodeExt = this.encoders[i];
            if (encodeExt != null) {
                var data = encodeExt(object, context);
                if (data != null) {
                    var type = i;
                    return new _ExtData_mjs__WEBPACK_IMPORTED_MODULE_1__.ExtData(type, data);
                }
            }
        }
        if (object instanceof _ExtData_mjs__WEBPACK_IMPORTED_MODULE_1__.ExtData) {
            // to keep ExtData as is
            return object;
        }
        return null;
    };
    ExtensionCodec.prototype.decode = function (data, type, context) {
        var decodeExt = type < 0 ? this.builtInDecoders[-1 - type] : this.decoders[type];
        if (decodeExt) {
            return decodeExt(data, type, context);
        }
        else {
            // decode() does not fail, returns ExtData instead.
            return new _ExtData_mjs__WEBPACK_IMPORTED_MODULE_1__.ExtData(type, data);
        }
    };
    ExtensionCodec.defaultCodec = new ExtensionCodec();
    return ExtensionCodec;
}());

//# sourceMappingURL=ExtensionCodec.mjs.map

/***/ }),

/***/ "./node_modules/@msgpack/msgpack/dist.es5+esm/decode.mjs":
/*!***************************************************************!*\
  !*** ./node_modules/@msgpack/msgpack/dist.es5+esm/decode.mjs ***!
  \***************************************************************/
/***/ ((__unused_webpack___webpack_module__, __nested_webpack_exports__, __nested_webpack_require_154277__) => {

__nested_webpack_require_154277__.r(__nested_webpack_exports__);
/* harmony export */ __nested_webpack_require_154277__.d(__nested_webpack_exports__, {
/* harmony export */   decode: () => (/* binding */ decode),
/* harmony export */   decodeMulti: () => (/* binding */ decodeMulti),
/* harmony export */   defaultDecodeOptions: () => (/* binding */ defaultDecodeOptions)
/* harmony export */ });
/* harmony import */ var _Decoder_mjs__WEBPACK_IMPORTED_MODULE_0__ = __nested_webpack_require_154277__(/*! ./Decoder.mjs */ "./node_modules/@msgpack/msgpack/dist.es5+esm/Decoder.mjs");

var defaultDecodeOptions = {};
/**
 * It decodes a single MessagePack object in a buffer.
 *
 * This is a synchronous decoding function.
 * See other variants for asynchronous decoding: {@link decodeAsync()}, {@link decodeStream()}, or {@link decodeArrayStream()}.
 *
 * @throws {@link RangeError} if the buffer is incomplete, including the case where the buffer is empty.
 * @throws {@link DecodeError} if the buffer contains invalid data.
 */
function decode(buffer, options) {
    if (options === void 0) { options = defaultDecodeOptions; }
    var decoder = new _Decoder_mjs__WEBPACK_IMPORTED_MODULE_0__.Decoder(options.extensionCodec, options.context, options.maxStrLength, options.maxBinLength, options.maxArrayLength, options.maxMapLength, options.maxExtLength);
    return decoder.decode(buffer);
}
/**
 * It decodes multiple MessagePack objects in a buffer.
 * This is corresponding to {@link decodeMultiStream()}.
 *
 * @throws {@link RangeError} if the buffer is incomplete, including the case where the buffer is empty.
 * @throws {@link DecodeError} if the buffer contains invalid data.
 */
function decodeMulti(buffer, options) {
    if (options === void 0) { options = defaultDecodeOptions; }
    var decoder = new _Decoder_mjs__WEBPACK_IMPORTED_MODULE_0__.Decoder(options.extensionCodec, options.context, options.maxStrLength, options.maxBinLength, options.maxArrayLength, options.maxMapLength, options.maxExtLength);
    return decoder.decodeMulti(buffer);
}
//# sourceMappingURL=decode.mjs.map

/***/ }),

/***/ "./node_modules/@msgpack/msgpack/dist.es5+esm/encode.mjs":
/*!***************************************************************!*\
  !*** ./node_modules/@msgpack/msgpack/dist.es5+esm/encode.mjs ***!
  \***************************************************************/
/***/ ((__unused_webpack___webpack_module__, __nested_webpack_exports__, __nested_webpack_require_156692__) => {

__nested_webpack_require_156692__.r(__nested_webpack_exports__);
/* harmony export */ __nested_webpack_require_156692__.d(__nested_webpack_exports__, {
/* harmony export */   encode: () => (/* binding */ encode)
/* harmony export */ });
/* harmony import */ var _Encoder_mjs__WEBPACK_IMPORTED_MODULE_0__ = __nested_webpack_require_156692__(/*! ./Encoder.mjs */ "./node_modules/@msgpack/msgpack/dist.es5+esm/Encoder.mjs");

var defaultEncodeOptions = {};
/**
 * It encodes `value` in the MessagePack format and
 * returns a byte buffer.
 *
 * The returned buffer is a slice of a larger `ArrayBuffer`, so you have to use its `#byteOffset` and `#byteLength` in order to convert it to another typed arrays including NodeJS `Buffer`.
 */
function encode(value, options) {
    if (options === void 0) { options = defaultEncodeOptions; }
    var encoder = new _Encoder_mjs__WEBPACK_IMPORTED_MODULE_0__.Encoder(options.extensionCodec, options.context, options.maxDepth, options.initialBufferSize, options.sortKeys, options.forceFloat32, options.ignoreUndefined, options.forceIntegerToFloat);
    return encoder.encodeSharedRef(value);
}
//# sourceMappingURL=encode.mjs.map

/***/ }),

/***/ "./node_modules/@msgpack/msgpack/dist.es5+esm/timestamp.mjs":
/*!******************************************************************!*\
  !*** ./node_modules/@msgpack/msgpack/dist.es5+esm/timestamp.mjs ***!
  \******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __nested_webpack_exports__, __nested_webpack_require_158189__) => {

__nested_webpack_require_158189__.r(__nested_webpack_exports__);
/* harmony export */ __nested_webpack_require_158189__.d(__nested_webpack_exports__, {
/* harmony export */   EXT_TIMESTAMP: () => (/* binding */ EXT_TIMESTAMP),
/* harmony export */   decodeTimestampExtension: () => (/* binding */ decodeTimestampExtension),
/* harmony export */   decodeTimestampToTimeSpec: () => (/* binding */ decodeTimestampToTimeSpec),
/* harmony export */   encodeDateToTimeSpec: () => (/* binding */ encodeDateToTimeSpec),
/* harmony export */   encodeTimeSpecToTimestamp: () => (/* binding */ encodeTimeSpecToTimestamp),
/* harmony export */   encodeTimestampExtension: () => (/* binding */ encodeTimestampExtension),
/* harmony export */   timestampExtension: () => (/* binding */ timestampExtension)
/* harmony export */ });
/* harmony import */ var _DecodeError_mjs__WEBPACK_IMPORTED_MODULE_1__ = __nested_webpack_require_158189__(/*! ./DecodeError.mjs */ "./node_modules/@msgpack/msgpack/dist.es5+esm/DecodeError.mjs");
/* harmony import */ var _utils_int_mjs__WEBPACK_IMPORTED_MODULE_0__ = __nested_webpack_require_158189__(/*! ./utils/int.mjs */ "./node_modules/@msgpack/msgpack/dist.es5+esm/utils/int.mjs");
// https://github.com/msgpack/msgpack/blob/master/spec.md#timestamp-extension-type


var EXT_TIMESTAMP = -1;
var TIMESTAMP32_MAX_SEC = 0x100000000 - 1; // 32-bit unsigned int
var TIMESTAMP64_MAX_SEC = 0x400000000 - 1; // 34-bit unsigned int
function encodeTimeSpecToTimestamp(_a) {
    var sec = _a.sec, nsec = _a.nsec;
    if (sec >= 0 && nsec >= 0 && sec <= TIMESTAMP64_MAX_SEC) {
        // Here sec >= 0 && nsec >= 0
        if (nsec === 0 && sec <= TIMESTAMP32_MAX_SEC) {
            // timestamp 32 = { sec32 (unsigned) }
            var rv = new Uint8Array(4);
            var view = new DataView(rv.buffer);
            view.setUint32(0, sec);
            return rv;
        }
        else {
            // timestamp 64 = { nsec30 (unsigned), sec34 (unsigned) }
            var secHigh = sec / 0x100000000;
            var secLow = sec & 0xffffffff;
            var rv = new Uint8Array(8);
            var view = new DataView(rv.buffer);
            // nsec30 | secHigh2
            view.setUint32(0, (nsec << 2) | (secHigh & 0x3));
            // secLow32
            view.setUint32(4, secLow);
            return rv;
        }
    }
    else {
        // timestamp 96 = { nsec32 (unsigned), sec64 (signed) }
        var rv = new Uint8Array(12);
        var view = new DataView(rv.buffer);
        view.setUint32(0, nsec);
        (0,_utils_int_mjs__WEBPACK_IMPORTED_MODULE_0__.setInt64)(view, 4, sec);
        return rv;
    }
}
function encodeDateToTimeSpec(date) {
    var msec = date.getTime();
    var sec = Math.floor(msec / 1e3);
    var nsec = (msec - sec * 1e3) * 1e6;
    // Normalizes { sec, nsec } to ensure nsec is unsigned.
    var nsecInSec = Math.floor(nsec / 1e9);
    return {
        sec: sec + nsecInSec,
        nsec: nsec - nsecInSec * 1e9,
    };
}
function encodeTimestampExtension(object) {
    if (object instanceof Date) {
        var timeSpec = encodeDateToTimeSpec(object);
        return encodeTimeSpecToTimestamp(timeSpec);
    }
    else {
        return null;
    }
}
function decodeTimestampToTimeSpec(data) {
    var view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    // data may be 32, 64, or 96 bits
    switch (data.byteLength) {
        case 4: {
            // timestamp 32 = { sec32 }
            var sec = view.getUint32(0);
            var nsec = 0;
            return { sec: sec, nsec: nsec };
        }
        case 8: {
            // timestamp 64 = { nsec30, sec34 }
            var nsec30AndSecHigh2 = view.getUint32(0);
            var secLow32 = view.getUint32(4);
            var sec = (nsec30AndSecHigh2 & 0x3) * 0x100000000 + secLow32;
            var nsec = nsec30AndSecHigh2 >>> 2;
            return { sec: sec, nsec: nsec };
        }
        case 12: {
            // timestamp 96 = { nsec32 (unsigned), sec64 (signed) }
            var sec = (0,_utils_int_mjs__WEBPACK_IMPORTED_MODULE_0__.getInt64)(view, 4);
            var nsec = view.getUint32(0);
            return { sec: sec, nsec: nsec };
        }
        default:
            throw new _DecodeError_mjs__WEBPACK_IMPORTED_MODULE_1__.DecodeError("Unrecognized data size for timestamp (expected 4, 8, or 12): ".concat(data.length));
    }
}
function decodeTimestampExtension(data) {
    var timeSpec = decodeTimestampToTimeSpec(data);
    return new Date(timeSpec.sec * 1e3 + timeSpec.nsec / 1e6);
}
var timestampExtension = {
    type: EXT_TIMESTAMP,
    encode: encodeTimestampExtension,
    decode: decodeTimestampExtension,
};
//# sourceMappingURL=timestamp.mjs.map

/***/ }),

/***/ "./node_modules/@msgpack/msgpack/dist.es5+esm/utils/int.mjs":
/*!******************************************************************!*\
  !*** ./node_modules/@msgpack/msgpack/dist.es5+esm/utils/int.mjs ***!
  \******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __nested_webpack_exports__, __nested_webpack_require_163227__) => {

__nested_webpack_require_163227__.r(__nested_webpack_exports__);
/* harmony export */ __nested_webpack_require_163227__.d(__nested_webpack_exports__, {
/* harmony export */   UINT32_MAX: () => (/* binding */ UINT32_MAX),
/* harmony export */   getInt64: () => (/* binding */ getInt64),
/* harmony export */   getUint64: () => (/* binding */ getUint64),
/* harmony export */   setInt64: () => (/* binding */ setInt64),
/* harmony export */   setUint64: () => (/* binding */ setUint64)
/* harmony export */ });
// Integer Utility
var UINT32_MAX = 4294967295;
// DataView extension to handle int64 / uint64,
// where the actual range is 53-bits integer (a.k.a. safe integer)
function setUint64(view, offset, value) {
    var high = value / 4294967296;
    var low = value; // high bits are truncated by DataView
    view.setUint32(offset, high);
    view.setUint32(offset + 4, low);
}
function setInt64(view, offset, value) {
    var high = Math.floor(value / 4294967296);
    var low = value; // high bits are truncated by DataView
    view.setUint32(offset, high);
    view.setUint32(offset + 4, low);
}
function getInt64(view, offset) {
    var high = view.getInt32(offset);
    var low = view.getUint32(offset + 4);
    return high * 4294967296 + low;
}
function getUint64(view, offset) {
    var high = view.getUint32(offset);
    var low = view.getUint32(offset + 4);
    return high * 4294967296 + low;
}
//# sourceMappingURL=int.mjs.map

/***/ }),

/***/ "./node_modules/@msgpack/msgpack/dist.es5+esm/utils/prettyByte.mjs":
/*!*************************************************************************!*\
  !*** ./node_modules/@msgpack/msgpack/dist.es5+esm/utils/prettyByte.mjs ***!
  \*************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __nested_webpack_exports__, __nested_webpack_require_165043__) => {

__nested_webpack_require_165043__.r(__nested_webpack_exports__);
/* harmony export */ __nested_webpack_require_165043__.d(__nested_webpack_exports__, {
/* harmony export */   prettyByte: () => (/* binding */ prettyByte)
/* harmony export */ });
function prettyByte(byte) {
    return "".concat(byte < 0 ? "-" : "", "0x").concat(Math.abs(byte).toString(16).padStart(2, "0"));
}
//# sourceMappingURL=prettyByte.mjs.map

/***/ }),

/***/ "./node_modules/@msgpack/msgpack/dist.es5+esm/utils/typedArrays.mjs":
/*!**************************************************************************!*\
  !*** ./node_modules/@msgpack/msgpack/dist.es5+esm/utils/typedArrays.mjs ***!
  \**************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __nested_webpack_exports__, __nested_webpack_require_165838__) => {

__nested_webpack_require_165838__.r(__nested_webpack_exports__);
/* harmony export */ __nested_webpack_require_165838__.d(__nested_webpack_exports__, {
/* harmony export */   createDataView: () => (/* binding */ createDataView),
/* harmony export */   ensureUint8Array: () => (/* binding */ ensureUint8Array)
/* harmony export */ });
function ensureUint8Array(buffer) {
    if (buffer instanceof Uint8Array) {
        return buffer;
    }
    else if (ArrayBuffer.isView(buffer)) {
        return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    }
    else if (buffer instanceof ArrayBuffer) {
        return new Uint8Array(buffer);
    }
    else {
        // ArrayLike<number>
        return Uint8Array.from(buffer);
    }
}
function createDataView(buffer) {
    if (buffer instanceof ArrayBuffer) {
        return new DataView(buffer);
    }
    var bufferView = ensureUint8Array(buffer);
    return new DataView(bufferView.buffer, bufferView.byteOffset, bufferView.byteLength);
}
//# sourceMappingURL=typedArrays.mjs.map

/***/ }),

/***/ "./node_modules/@msgpack/msgpack/dist.es5+esm/utils/utf8.mjs":
/*!*******************************************************************!*\
  !*** ./node_modules/@msgpack/msgpack/dist.es5+esm/utils/utf8.mjs ***!
  \*******************************************************************/
/***/ ((__unused_webpack___webpack_module__, __nested_webpack_exports__, __nested_webpack_require_167237__) => {

__nested_webpack_require_167237__.r(__nested_webpack_exports__);
/* harmony export */ __nested_webpack_require_167237__.d(__nested_webpack_exports__, {
/* harmony export */   TEXT_DECODER_THRESHOLD: () => (/* binding */ TEXT_DECODER_THRESHOLD),
/* harmony export */   TEXT_ENCODER_THRESHOLD: () => (/* binding */ TEXT_ENCODER_THRESHOLD),
/* harmony export */   utf8Count: () => (/* binding */ utf8Count),
/* harmony export */   utf8DecodeJs: () => (/* binding */ utf8DecodeJs),
/* harmony export */   utf8DecodeTD: () => (/* binding */ utf8DecodeTD),
/* harmony export */   utf8EncodeJs: () => (/* binding */ utf8EncodeJs),
/* harmony export */   utf8EncodeTE: () => (/* binding */ utf8EncodeTE)
/* harmony export */ });
/* harmony import */ var _int_mjs__WEBPACK_IMPORTED_MODULE_0__ = __nested_webpack_require_167237__(/*! ./int.mjs */ "./node_modules/@msgpack/msgpack/dist.es5+esm/utils/int.mjs");
var _a, _b, _c;
/* eslint-disable @typescript-eslint/no-unnecessary-condition */

var TEXT_ENCODING_AVAILABLE = (typeof process === "undefined" || ((_a = process === null || process === void 0 ? void 0 : process.env) === null || _a === void 0 ? void 0 : _a["TEXT_ENCODING"]) !== "never") &&
    typeof TextEncoder !== "undefined" &&
    typeof TextDecoder !== "undefined";
function utf8Count(str) {
    var strLength = str.length;
    var byteLength = 0;
    var pos = 0;
    while (pos < strLength) {
        var value = str.charCodeAt(pos++);
        if ((value & 0xffffff80) === 0) {
            // 1-byte
            byteLength++;
            continue;
        }
        else if ((value & 0xfffff800) === 0) {
            // 2-bytes
            byteLength += 2;
        }
        else {
            // handle surrogate pair
            if (value >= 0xd800 && value <= 0xdbff) {
                // high surrogate
                if (pos < strLength) {
                    var extra = str.charCodeAt(pos);
                    if ((extra & 0xfc00) === 0xdc00) {
                        ++pos;
                        value = ((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000;
                    }
                }
            }
            if ((value & 0xffff0000) === 0) {
                // 3-byte
                byteLength += 3;
            }
            else {
                // 4-byte
                byteLength += 4;
            }
        }
    }
    return byteLength;
}
function utf8EncodeJs(str, output, outputOffset) {
    var strLength = str.length;
    var offset = outputOffset;
    var pos = 0;
    while (pos < strLength) {
        var value = str.charCodeAt(pos++);
        if ((value & 0xffffff80) === 0) {
            // 1-byte
            output[offset++] = value;
            continue;
        }
        else if ((value & 0xfffff800) === 0) {
            // 2-bytes
            output[offset++] = ((value >> 6) & 0x1f) | 0xc0;
        }
        else {
            // handle surrogate pair
            if (value >= 0xd800 && value <= 0xdbff) {
                // high surrogate
                if (pos < strLength) {
                    var extra = str.charCodeAt(pos);
                    if ((extra & 0xfc00) === 0xdc00) {
                        ++pos;
                        value = ((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000;
                    }
                }
            }
            if ((value & 0xffff0000) === 0) {
                // 3-byte
                output[offset++] = ((value >> 12) & 0x0f) | 0xe0;
                output[offset++] = ((value >> 6) & 0x3f) | 0x80;
            }
            else {
                // 4-byte
                output[offset++] = ((value >> 18) & 0x07) | 0xf0;
                output[offset++] = ((value >> 12) & 0x3f) | 0x80;
                output[offset++] = ((value >> 6) & 0x3f) | 0x80;
            }
        }
        output[offset++] = (value & 0x3f) | 0x80;
    }
}
var sharedTextEncoder = TEXT_ENCODING_AVAILABLE ? new TextEncoder() : undefined;
var TEXT_ENCODER_THRESHOLD = !TEXT_ENCODING_AVAILABLE
    ? _int_mjs__WEBPACK_IMPORTED_MODULE_0__.UINT32_MAX
    : typeof process !== "undefined" && ((_b = process === null || process === void 0 ? void 0 : process.env) === null || _b === void 0 ? void 0 : _b["TEXT_ENCODING"]) !== "force"
        ? 200
        : 0;
function utf8EncodeTEencode(str, output, outputOffset) {
    output.set(sharedTextEncoder.encode(str), outputOffset);
}
function utf8EncodeTEencodeInto(str, output, outputOffset) {
    sharedTextEncoder.encodeInto(str, output.subarray(outputOffset));
}
var utf8EncodeTE = (sharedTextEncoder === null || sharedTextEncoder === void 0 ? void 0 : sharedTextEncoder.encodeInto) ? utf8EncodeTEencodeInto : utf8EncodeTEencode;
var CHUNK_SIZE = 4096;
function utf8DecodeJs(bytes, inputOffset, byteLength) {
    var offset = inputOffset;
    var end = offset + byteLength;
    var units = [];
    var result = "";
    while (offset < end) {
        var byte1 = bytes[offset++];
        if ((byte1 & 0x80) === 0) {
            // 1 byte
            units.push(byte1);
        }
        else if ((byte1 & 0xe0) === 0xc0) {
            // 2 bytes
            var byte2 = bytes[offset++] & 0x3f;
            units.push(((byte1 & 0x1f) << 6) | byte2);
        }
        else if ((byte1 & 0xf0) === 0xe0) {
            // 3 bytes
            var byte2 = bytes[offset++] & 0x3f;
            var byte3 = bytes[offset++] & 0x3f;
            units.push(((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3);
        }
        else if ((byte1 & 0xf8) === 0xf0) {
            // 4 bytes
            var byte2 = bytes[offset++] & 0x3f;
            var byte3 = bytes[offset++] & 0x3f;
            var byte4 = bytes[offset++] & 0x3f;
            var unit = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
            if (unit > 0xffff) {
                unit -= 0x10000;
                units.push(((unit >>> 10) & 0x3ff) | 0xd800);
                unit = 0xdc00 | (unit & 0x3ff);
            }
            units.push(unit);
        }
        else {
            units.push(byte1);
        }
        if (units.length >= CHUNK_SIZE) {
            result += String.fromCharCode.apply(String, units);
            units.length = 0;
        }
    }
    if (units.length > 0) {
        result += String.fromCharCode.apply(String, units);
    }
    return result;
}
var sharedTextDecoder = TEXT_ENCODING_AVAILABLE ? new TextDecoder() : null;
var TEXT_DECODER_THRESHOLD = !TEXT_ENCODING_AVAILABLE
    ? _int_mjs__WEBPACK_IMPORTED_MODULE_0__.UINT32_MAX
    : typeof process !== "undefined" && ((_c = process === null || process === void 0 ? void 0 : process.env) === null || _c === void 0 ? void 0 : _c["TEXT_DECODER"]) !== "force"
        ? 200
        : 0;
function utf8DecodeTD(bytes, inputOffset, byteLength) {
    var stringBytes = bytes.subarray(inputOffset, inputOffset + byteLength);
    return sharedTextDecoder.decode(stringBytes);
}
//# sourceMappingURL=utf8.mjs.map

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nested_webpack_require_174356__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __nested_webpack_require_174356__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__nested_webpack_require_174356__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__nested_webpack_require_174356__.o(definition, key) && !__nested_webpack_require_174356__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__nested_webpack_require_174356__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__nested_webpack_require_174356__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __nested_webpack_exports__ = {};
/*!*********************************!*\
  !*** ./src/websocket-client.js ***!
  \*********************************/
__nested_webpack_require_174356__.r(__nested_webpack_exports__);
/* harmony export */ __nested_webpack_require_174356__.d(__nested_webpack_exports__, {
/* harmony export */   API_VERSION: () => (/* reexport safe */ _rpc_js__WEBPACK_IMPORTED_MODULE_0__.API_VERSION),
/* harmony export */   LocalWebSocket: () => (/* binding */ LocalWebSocket),
/* harmony export */   RPC: () => (/* reexport safe */ _rpc_js__WEBPACK_IMPORTED_MODULE_0__.RPC),
/* harmony export */   connectToServer: () => (/* binding */ connectToServer),
/* harmony export */   getRTCService: () => (/* reexport safe */ _webrtc_client_js__WEBPACK_IMPORTED_MODULE_3__.getRTCService),
/* harmony export */   getRemoteService: () => (/* binding */ getRemoteService),
/* harmony export */   loadRequirements: () => (/* reexport safe */ _utils__WEBPACK_IMPORTED_MODULE_1__.loadRequirements),
/* harmony export */   login: () => (/* binding */ login),
/* harmony export */   registerRTCService: () => (/* reexport safe */ _webrtc_client_js__WEBPACK_IMPORTED_MODULE_3__.registerRTCService),
/* harmony export */   schemaFunction: () => (/* reexport safe */ _utils_schema_js__WEBPACK_IMPORTED_MODULE_2__.schemaFunction),
/* harmony export */   setupLocalClient: () => (/* binding */ setupLocalClient)
/* harmony export */ });
/* harmony import */ var _rpc_js__WEBPACK_IMPORTED_MODULE_0__ = __nested_webpack_require_174356__(/*! ./rpc.js */ "./src/rpc.js");
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_1__ = __nested_webpack_require_174356__(/*! ./utils */ "./src/utils/index.js");
/* harmony import */ var _utils_schema_js__WEBPACK_IMPORTED_MODULE_2__ = __nested_webpack_require_174356__(/*! ./utils/schema.js */ "./src/utils/schema.js");
/* harmony import */ var _webrtc_client_js__WEBPACK_IMPORTED_MODULE_3__ = __nested_webpack_require_174356__(/*! ./webrtc-client.js */ "./src/webrtc-client.js");









const MAX_RETRY = 1000000;

class WebsocketRPCConnection {
  constructor(
    server_url,
    client_id,
    workspace,
    token,
    reconnection_token = null,
    timeout = 60,
    WebSocketClass = null,
    token_refresh_interval = 2 * 60 * 60,
  ) {
    (0,_utils__WEBPACK_IMPORTED_MODULE_1__.assert)(server_url && client_id, "server_url and client_id are required");
    this._server_url = server_url;
    this._client_id = client_id;
    this._workspace = workspace;
    this._token = token;
    this._reconnection_token = reconnection_token;
    this._websocket = null;
    this._handle_message = null;
    this._handle_connected = null; // Connection open event handler
    this._handle_disconnected = null; // Disconnection event handler
    this._timeout = timeout;
    this._WebSocketClass = WebSocketClass || WebSocket; // Allow overriding the WebSocket class
    this._closed = false;
    this._legacy_auth = null;
    this.connection_info = null;
    this._enable_reconnect = false;
    this._token_refresh_interval = token_refresh_interval;
    this.manager_id = null;
    this._refresh_token_task = null;
    this._last_message = null; // Store the last sent message
  }

  on_message(handler) {
    (0,_utils__WEBPACK_IMPORTED_MODULE_1__.assert)(handler, "handler is required");
    this._handle_message = handler;
  }

  on_connected(handler) {
    this._handle_connected = handler;
  }

  on_disconnected(handler) {
    this._handle_disconnected = handler;
  }

  async _attempt_connection(server_url, attempt_fallback = true) {
    return new Promise((resolve, reject) => {
      this._legacy_auth = false;
      const websocket = new this._WebSocketClass(server_url);
      websocket.binaryType = "arraybuffer";

      websocket.onopen = () => {
        console.info("WebSocket connection established");
        resolve(websocket);
      };

      websocket.onerror = (event) => {
        console.error("WebSocket connection error:", event);
        reject(new Error(`WebSocket connection error: ${event}`));
      };

      websocket.onclose = (event) => {
        if (event.code === 1003 && attempt_fallback) {
          console.info(
            "Received 1003 error, attempting connection with query parameters.",
          );
          this._legacy_auth = true;
          this._attempt_connection_with_query_params(server_url)
            .then(resolve)
            .catch(reject);
        } else if (this._handle_disconnected) {
          this._handle_disconnected(event.reason);
        }
      };
    });
  }

  async _attempt_connection_with_query_params(server_url) {
    // Initialize an array to hold parts of the query string
    const queryParamsParts = [];

    // Conditionally add each parameter if it has a non-empty value
    if (this._client_id)
      queryParamsParts.push(`client_id=${encodeURIComponent(this._client_id)}`);
    if (this._workspace)
      queryParamsParts.push(`workspace=${encodeURIComponent(this._workspace)}`);
    if (this._token)
      queryParamsParts.push(`token=${encodeURIComponent(this._token)}`);
    if (this._reconnection_token)
      queryParamsParts.push(
        `reconnection_token=${encodeURIComponent(this._reconnection_token)}`,
      );

    // Join the parts with '&' to form the final query string, prepend '?' if there are any parameters
    const queryString =
      queryParamsParts.length > 0 ? `?${queryParamsParts.join("&")}` : "";

    // Construct the full URL by appending the query string if it exists
    const full_url = server_url + queryString;

    return await this._attempt_connection(full_url, false);
  }

  _establish_connection() {
    return new Promise((resolve, reject) => {
      this._websocket.onmessage = (event) => {
        const data = event.data;
        const first_message = JSON.parse(data);
        if (first_message.type == "connection_info") {
          this.connection_info = first_message;
          if (this._workspace) {
            (0,_utils__WEBPACK_IMPORTED_MODULE_1__.assert)(
              this.connection_info.workspace === this._workspace,
              `Connected to the wrong workspace: ${this.connection_info.workspace}, expected: ${this._workspace}`,
            );
          }
          if (this.connection_info.reconnection_token) {
            this._reconnection_token = this.connection_info.reconnection_token;
          }
          if (this.connection_info.reconnection_token_life_time) {
            // make sure the token refresh interval is less than the token life time
            if (
              this.token_refresh_interval >
              this.connection_info.reconnection_token_life_time / 1.5
            ) {
              console.warn(
                `Token refresh interval is too long (${this.token_refresh_interval}), setting it to 1.5 times of the token life time(${this.connection_info.reconnection_token_life_time}).`,
              );
              this.token_refresh_interval =
                this.connection_info.reconnection_token_life_time / 1.5;
            }
          }
          this.manager_id = this.connection_info.manager_id || null;
          console.log(
            `Successfully connected to the server, workspace: ${this.connection_info.workspace}, manager_id: ${this.manager_id}`,
          );
          if (this.connection_info.announcement) {
            console.log(`${this.connection_info.announcement}`);
          }
          resolve(this.connection_info);
        } else if (first_message.type == "error") {
          const error = "ConnectionAbortedError: " + first_message.message;
          console.error("Failed to connect, " + error);
          reject(new Error(error));
          return;
        } else {
          console.error(
            "ConnectionAbortedError: Unexpected message received from the server:",
            data,
          );
          reject(
            new Error(
              "ConnectionAbortedError: Unexpected message received from the server",
            ),
          );
          return;
        }
      };
    });
  }

  async open() {
    console.log(
      "Creating a new websocket connection to",
      this._server_url.split("?")[0],
    );
    try {
      this._websocket = await this._attempt_connection(this._server_url);
      if (this._legacy_auth) {
        throw new Error(
          "NotImplementedError: Legacy authentication is not supported",
        );
      }
      // Send authentication info as the first message if connected without query params
      const authInfo = JSON.stringify({
        client_id: this._client_id,
        workspace: this._workspace,
        token: this._token,
        reconnection_token: this._reconnection_token,
      });
      this._websocket.send(authInfo);
      // Wait for the first message from the server
      await (0,_utils__WEBPACK_IMPORTED_MODULE_1__.waitFor)(
        this._establish_connection(),
        this._timeout,
        "Failed to receive the first message from the server",
      );
      if (this._token_refresh_interval > 0) {
        setTimeout(() => {
          this._send_refresh_token();
          this._refresh_token_task = setInterval(() => {
            this._send_refresh_token();
          }, this._token_refresh_interval * 1000);
        }, 2000);
      }
      // Listen to messages from the server
      this._enable_reconnect = true;
      this._closed = false;
      this._websocket.onmessage = (event) => {
        if (typeof event.data === "string") {
          const parsedData = JSON.parse(event.data);
          // Check if the message is a reconnection token
          if (parsedData.type === "reconnection_token") {
            this._reconnection_token = parsedData.reconnection_token;
            console.log("Reconnection token received");
          } else {
            console.log("Received message from the server:", parsedData);
          }
        } else {
          this._handle_message(event.data);
        }
      };

      this._websocket.onerror = (event) => {
        console.error("WebSocket connection error:", event);
      };

      this._websocket.onclose = this._handle_close.bind(this);

      if (this._handle_connected) {
        this._handle_connected(this.connection_info);
      }
      return this.connection_info;
    } catch (error) {
      console.error(
        "Failed to connect to",
        this._server_url.split("?")[0],
        error,
      );
      throw error;
    }
  }

  _send_refresh_token() {
    if (this._websocket && this._websocket.readyState === WebSocket.OPEN) {
      const refreshMessage = JSON.stringify({ type: "refresh_token" });
      this._websocket.send(refreshMessage);
      console.log("Requested refresh token");
    }
  }

  _handle_close(event) {
    if (
      !this._closed &&
      this._websocket &&
      this._websocket.readyState === WebSocket.CLOSED
    ) {
      if ([1000, 1001].includes(event.code)) {
        console.info(
          `Websocket connection closed (code: ${event.code}): ${event.reason}`,
        );
        if (this._handle_disconnected) {
          this._handle_disconnected(event.reason);
        }
        this._closed = true;
      } else if (this._enable_reconnect) {
        console.warn(
          "Websocket connection closed unexpectedly (code: %s): %s",
          event.code,
          event.reason,
        );
        let retry = 0;
        const reconnect = async () => {
          try {
            console.warn(
              `Reconnecting to ${this._server_url.split("?")[0]} (attempt #${retry})`,
            );
            // Open the connection, this will trigger the on_connected callback
            await this.open();

            // Wait a short time for services to be registered
            // This gives time for the on_connected callback to complete
            // which includes re-registering all services to the server
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Resend last message if there was one
            if (this._last_message) {
              console.info("Resending last message after reconnection");
              this._websocket.send(this._last_message);
              this._last_message = null;
            }
            console.warn(
              `Successfully reconnected to server ${this._server_url} (services re-registered)`,
            );
          } catch (e) {
            if (`${e}`.includes("ConnectionAbortedError:")) {
              console.warn("Failed to reconnect, connection aborted:", e);
              return;
            } else if (`${e}`.includes("NotImplementedError:")) {
              console.error(
                `${e}\nIt appears that you are trying to connect to a hypha server that is older than 0.20.0, please upgrade the hypha server or use the websocket client in imjoy-rpc(https://www.npmjs.com/package/imjoy-rpc) instead`,
              );
              return;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
            if (
              this._websocket &&
              this._websocket.readyState === WebSocket.CONNECTED
            ) {
              return;
            }
            retry += 1;
            if (retry < MAX_RETRY) {
              await reconnect();
            } else {
              console.error("Failed to reconnect after", MAX_RETRY, "attempts");
            }
          }
        };
        reconnect();
      }
    } else {
      if (this._handle_disconnected) {
        this._handle_disconnected(event.reason);
      }
    }
  }

  async emit_message(data) {
    if (this._closed) {
      throw new Error("Connection is closed");
    }
    if (!this._websocket || this._websocket.readyState !== WebSocket.OPEN) {
      await this.open();
    }
    try {
      this._last_message = data; // Store the message before sending
      this._websocket.send(data);
      this._last_message = null; // Clear after successful send
    } catch (exp) {
      console.error(`Failed to send data, error: ${exp}`);
      throw exp;
    }
  }

  disconnect(reason) {
    this._closed = true;
    this._last_message = null; // Clear last message on disconnect
    // Ensure websocket is closed if it exists and is not already closed or closing
    if (
      this._websocket &&
      this._websocket.readyState !== WebSocket.CLOSED &&
      this._websocket.readyState !== WebSocket.CLOSING
    ) {
      this._websocket.close(1000, reason);
    }
    if (this._refresh_token_task) {
      clearInterval(this._refresh_token_task);
    }
    console.info(`WebSocket connection disconnected (${reason})`);
  }
}

function normalizeServerUrl(server_url) {
  if (!server_url) throw new Error("server_url is required");
  if (server_url.startsWith("http://")) {
    server_url =
      server_url.replace("http://", "ws://").replace(/\/$/, "") + "/ws";
  } else if (server_url.startsWith("https://")) {
    server_url =
      server_url.replace("https://", "wss://").replace(/\/$/, "") + "/ws";
  }
  return server_url;
}

async function login(config) {
  const service_id = config.login_service_id || "public/hypha-login";
  const workspace = config.workspace;
  const expires_in = config.expires_in;
  const timeout = config.login_timeout || 60;
  const callback = config.login_callback;
  const profile = config.profile;

  const server = await connectToServer({
    name: "initial login client",
    server_url: config.server_url,
  });
  try {
    const svc = await server.getService(service_id);
    (0,_utils__WEBPACK_IMPORTED_MODULE_1__.assert)(svc, `Failed to get the login service: ${service_id}`);
    let context;
    if (workspace) {
      context = await svc.start({ workspace, expires_in, _rkwargs: true });
    } else {
      context = await svc.start();
    }
    if (callback) {
      await callback(context);
    } else {
      console.log(`Please open your browser and login at ${context.login_url}`);
    }
    return await svc.check(context.key, { timeout, profile, _rkwargs: true });
  } catch (error) {
    throw error;
  } finally {
    await server.disconnect();
  }
}

async function webrtcGetService(wm, rtc_service_id, query, config) {
  config = config || {};
  const webrtc = config.webrtc;
  const webrtc_config = config.webrtc_config;
  if (config.webrtc !== undefined) delete config.webrtc;
  if (config.webrtc_config !== undefined) delete config.webrtc_config;
  (0,_utils__WEBPACK_IMPORTED_MODULE_1__.assert)(
    [undefined, true, false, "auto"].includes(webrtc),
    "webrtc must be true, false or 'auto'",
  );

  const svc = await wm.getService(query, config);
  if (webrtc === true || webrtc === "auto") {
    if (svc.id.includes(":") && svc.id.includes("/")) {
      try {
        // Assuming that the client registered a webrtc service with the client_id + "-rtc"
        const peer = await (0,_webrtc_client_js__WEBPACK_IMPORTED_MODULE_3__.getRTCService)(wm, rtc_service_id, webrtc_config);
        const rtcSvc = await peer.getService(svc.id.split(":")[1], config);
        rtcSvc._webrtc = true;
        rtcSvc._peer = peer;
        rtcSvc._service = svc;
        return rtcSvc;
      } catch (e) {
        console.warn(
          "Failed to get webrtc service, using websocket connection",
          e,
        );
      }
    }
    if (webrtc === true) {
      throw new Error("Failed to get the service via webrtc");
    }
  }
  return svc;
}

async function connectToServer(config) {
  if (config.server) {
    config.server_url = config.server_url || config.server.url;
    config.WebSocketClass =
      config.WebSocketClass || config.server.WebSocketClass;
  }
  let clientId = config.client_id;
  if (!clientId) {
    clientId = (0,_utils__WEBPACK_IMPORTED_MODULE_1__.randId)();
    config.client_id = clientId;
  }

  let server_url = normalizeServerUrl(config.server_url);

  let connection = new WebsocketRPCConnection(
    server_url,
    clientId,
    config.workspace,
    config.token,
    config.reconnection_token,
    config.method_timeout || 60,
    config.WebSocketClass,
  );
  const connection_info = await connection.open();
  (0,_utils__WEBPACK_IMPORTED_MODULE_1__.assert)(
    connection_info,
    "Failed to connect to the server, no connection info obtained. This issue is most likely due to an outdated Hypha server version. Please use `imjoy-rpc` for compatibility, or upgrade the Hypha server to the latest version.",
  );
  // wait for 0.5 seconds
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Ensure manager_id is set before proceeding
  if (!connection.manager_id) {
    console.warn("Manager ID not set immediately, waiting...");

    // Wait for manager_id to be set with timeout
    const maxWaitTime = 5000; // 5 seconds
    const checkInterval = 100; // 100ms
    const startTime = Date.now();

    while (!connection.manager_id && Date.now() - startTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    if (!connection.manager_id) {
      console.error("Manager ID still not set after waiting");
      throw new Error("Failed to get manager ID from server");
    } else {
      console.info(`Manager ID set after waiting: ${connection.manager_id}`);
    }
  }
  if (config.workspace && connection_info.workspace !== config.workspace) {
    throw new Error(
      `Connected to the wrong workspace: ${connection_info.workspace}, expected: ${config.workspace}`,
    );
  }

  const workspace = connection_info.workspace;
  const rpc = new _rpc_js__WEBPACK_IMPORTED_MODULE_0__.RPC(connection, {
    client_id: clientId,
    workspace,
    default_context: { connection_type: "websocket" },
    name: config.name,
    method_timeout: config.method_timeout,
    app_id: config.app_id,
    server_base_url: connection_info.public_base_url,
    long_message_chunk_size: config.long_message_chunk_size,
  });
  const wm = await rpc.get_manager_service({
    timeout: config.method_timeout,
    case_conversion: "camel",
    kwargs_expansion: config.kwargs_expansion || false,
  });
  wm.rpc = rpc;

  async function _export(api) {
    api.id = "default";
    api.name = api.name || config.name || api.id;
    api.description = api.description || config.description;
    await rpc.register_service(api, { overwrite: true });
  }

  async function getApp(clientId) {
    clientId = clientId || "*";
    (0,_utils__WEBPACK_IMPORTED_MODULE_1__.assert)(!clientId.includes(":"), "clientId should not contain ':'");
    if (!clientId.includes("/")) {
      clientId = connection_info.workspace + "/" + clientId;
    }
    (0,_utils__WEBPACK_IMPORTED_MODULE_1__.assert)(
      clientId.split("/").length === 2,
      "clientId should match pattern workspace/clientId",
    );
    return await wm.getService(`${clientId}:default`);
  }

  async function listApps(ws) {
    ws = ws || workspace;
    (0,_utils__WEBPACK_IMPORTED_MODULE_1__.assert)(!ws.includes(":"), "workspace should not contain ':'");
    (0,_utils__WEBPACK_IMPORTED_MODULE_1__.assert)(!ws.includes("/"), "workspace should not contain '/'");
    const query = { workspace: ws, service_id: "default" };
    return await wm.listServices(query);
  }

  if (connection_info) {
    wm.config = Object.assign(wm.config, connection_info);
  }
  wm.export = (0,_utils_schema_js__WEBPACK_IMPORTED_MODULE_2__.schemaFunction)(_export, {
    name: "export",
    description: "Export the api.",
    parameters: {
      properties: { api: { description: "The api to export", type: "object" } },
      required: ["api"],
      type: "object",
    },
  });
  wm.getApp = (0,_utils_schema_js__WEBPACK_IMPORTED_MODULE_2__.schemaFunction)(getApp, {
    name: "getApp",
    description: "Get the app.",
    parameters: {
      properties: {
        clientId: { default: "*", description: "The clientId", type: "string" },
      },
      type: "object",
    },
  });
  wm.listApps = (0,_utils_schema_js__WEBPACK_IMPORTED_MODULE_2__.schemaFunction)(listApps, {
    name: "listApps",
    description: "List the apps.",
    parameters: {
      properties: {
        workspace: {
          default: workspace,
          description: "The workspace",
          type: "string",
        },
      },
      type: "object",
    },
  });
  wm.disconnect = (0,_utils_schema_js__WEBPACK_IMPORTED_MODULE_2__.schemaFunction)(rpc.disconnect.bind(rpc), {
    name: "disconnect",
    description: "Disconnect from the server.",
    parameters: { type: "object", properties: {}, required: [] },
  });
  wm.registerCodec = (0,_utils_schema_js__WEBPACK_IMPORTED_MODULE_2__.schemaFunction)(rpc.register_codec.bind(rpc), {
    name: "registerCodec",
    description: "Register a codec for the webrtc connection",
    parameters: {
      type: "object",
      properties: {
        codec: {
          type: "object",
          description: "Codec to register",
          properties: {
            name: { type: "string" },
            type: {},
            encoder: { type: "function" },
            decoder: { type: "function" },
          },
        },
      },
    },
  });

  wm.emit = (0,_utils_schema_js__WEBPACK_IMPORTED_MODULE_2__.schemaFunction)(rpc.emit.bind(rpc), {
    name: "emit",
    description: "Emit a message.",
    parameters: {
      properties: { data: { description: "The data to emit", type: "object" } },
      required: ["data"],
      type: "object",
    },
  });

  wm.on = (0,_utils_schema_js__WEBPACK_IMPORTED_MODULE_2__.schemaFunction)(rpc.on.bind(rpc), {
    name: "on",
    description: "Register a message handler.",
    parameters: {
      properties: {
        event: { description: "The event to listen to", type: "string" },
        handler: { description: "The handler function", type: "function" },
      },
      required: ["event", "handler"],
      type: "object",
    },
  });

  wm.off = (0,_utils_schema_js__WEBPACK_IMPORTED_MODULE_2__.schemaFunction)(rpc.off.bind(rpc), {
    name: "off",
    description: "Remove a message handler.",
    parameters: {
      properties: {
        event: { description: "The event to remove", type: "string" },
        handler: { description: "The handler function", type: "function" },
      },
      required: ["event", "handler"],
      type: "object",
    },
  });

  wm.once = (0,_utils_schema_js__WEBPACK_IMPORTED_MODULE_2__.schemaFunction)(rpc.once.bind(rpc), {
    name: "once",
    description: "Register a one-time message handler.",
    parameters: {
      properties: {
        event: { description: "The event to listen to", type: "string" },
        handler: { description: "The handler function", type: "function" },
      },
      required: ["event", "handler"],
      type: "object",
    },
  });

  wm.getServiceSchema = (0,_utils_schema_js__WEBPACK_IMPORTED_MODULE_2__.schemaFunction)(rpc.get_service_schema, {
    name: "getServiceSchema",
    description: "Get the service schema.",
    parameters: {
      properties: {
        service: {
          description: "The service to extract schema",
          type: "object",
        },
      },
      required: ["service"],
      type: "object",
    },
  });

  wm.registerService = (0,_utils_schema_js__WEBPACK_IMPORTED_MODULE_2__.schemaFunction)(rpc.register_service.bind(rpc), {
    name: "registerService",
    description: "Register a service.",
    parameters: {
      properties: {
        service: { description: "The service to register", type: "object" },
        force: {
          default: false,
          description: "Force to register the service",
          type: "boolean",
        },
      },
      required: ["service"],
      type: "object",
    },
  });
  wm.unregisterService = (0,_utils_schema_js__WEBPACK_IMPORTED_MODULE_2__.schemaFunction)(rpc.unregister_service.bind(rpc), {
    name: "unregisterService",
    description: "Unregister a service.",
    parameters: {
      properties: {
        service: {
          description: "The service id to unregister",
          type: "string",
        },
        notify: {
          default: true,
          description: "Notify the workspace manager",
          type: "boolean",
        },
      },
      required: ["service"],
      type: "object",
    },
  });
  if (connection.manager_id) {
    rpc.on("force-exit", async (message) => {
      if (message.from === "*/" + connection.manager_id) {
        console.log("Disconnecting from server, reason:", message.reason);
        await rpc.disconnect();
      }
    });
  }
  if (config.webrtc) {
    await (0,_webrtc_client_js__WEBPACK_IMPORTED_MODULE_3__.registerRTCService)(wm, `${clientId}-rtc`, config.webrtc_config);
    // make a copy of wm, so webrtc can use the original wm.getService
    const _wm = Object.assign({}, wm);
    const description = _wm.getService.__schema__.description;
    // TODO: Fix the schema for adding options for webrtc
    const parameters = _wm.getService.__schema__.parameters;
    wm.getService = (0,_utils_schema_js__WEBPACK_IMPORTED_MODULE_2__.schemaFunction)(
      webrtcGetService.bind(null, _wm, `${workspace}/${clientId}-rtc`),
      {
        name: "getService",
        description,
        parameters,
      },
    );

    wm.getRTCService = (0,_utils_schema_js__WEBPACK_IMPORTED_MODULE_2__.schemaFunction)(_webrtc_client_js__WEBPACK_IMPORTED_MODULE_3__.getRTCService.bind(null, wm), {
      name: "getRTCService",
      description: "Get the webrtc connection, returns a peer connection.",
      parameters: {
        properties: {
          config: {
            description: "The config for the webrtc service",
            type: "object",
          },
        },
        required: ["config"],
        type: "object",
      },
    });
  } else {
    const _getService = wm.getService;
    wm.getService = (query, config) => {
      config = config || {};
      return _getService(query, config);
    };
    wm.getService.__schema__ = _getService.__schema__;
  }

  async function registerProbes(probes) {
    probes.id = "probes";
    probes.name = "Probes";
    probes.config = { visibility: "public" };
    probes.type = "probes";
    probes.description = `Probes Service, visit ${server_url}/${workspace}services/probes for the available probes.`;
    return await wm.registerService(probes, { overwrite: true });
  }

  wm.registerProbes = (0,_utils_schema_js__WEBPACK_IMPORTED_MODULE_2__.schemaFunction)(registerProbes, {
    name: "registerProbes",
    description: "Register probes service",
    parameters: {
      properties: {
        probes: {
          description:
            "The probes to register, e.g. {'liveness': {'type': 'function', 'description': 'Check the liveness of the service'}}",
          type: "object",
        },
      },
      required: ["probes"],
      type: "object",
    },
  });

  return wm;
}

async function getRemoteService(serviceUri, config = {}) {
  const { serverUrl, workspace, clientId, serviceId, appId } =
    (0,_utils__WEBPACK_IMPORTED_MODULE_1__.parseServiceUrl)(serviceUri);
  const fullServiceId = `${workspace}/${clientId}:${serviceId}@${appId}`;

  if (config.serverUrl) {
    if (config.serverUrl !== serverUrl) {
      throw new Error(
        "server_url in config does not match the server_url in the url",
      );
    }
  }
  config.serverUrl = serverUrl;
  const server = await connectToServer(config);
  return await server.getService(fullServiceId);
}

class LocalWebSocket {
  constructor(url, client_id, workspace) {
    this.url = url;
    this.onopen = () => {};
    this.onmessage = () => {};
    this.onclose = () => {};
    this.onerror = () => {};
    this.client_id = client_id;
    this.workspace = workspace;
    const context = typeof window !== "undefined" ? window : self;
    const isWindow = typeof window !== "undefined";
    this.postMessage = (message) => {
      if (isWindow) {
        window.parent.postMessage(message, "*");
      } else {
        self.postMessage(message);
      }
    };

    this.readyState = WebSocket.CONNECTING;
    context.addEventListener(
      "message",
      (event) => {
        const { type, data, to } = event.data;
        if (to !== this.client_id) {
          // console.debug("message not for me", to, this.client_id);
          return;
        }
        switch (type) {
          case "message":
            if (this.readyState === WebSocket.OPEN && this.onmessage) {
              this.onmessage({ data: data });
            }
            break;
          case "connected":
            this.readyState = WebSocket.OPEN;
            this.onopen(event);
            break;
          case "closed":
            this.readyState = WebSocket.CLOSED;
            this.onclose(event);
            break;
          default:
            break;
        }
      },
      false,
    );

    if (!this.client_id) throw new Error("client_id is required");
    if (!this.workspace) throw new Error("workspace is required");
    this.postMessage({
      type: "connect",
      url: this.url,
      from: this.client_id,
      workspace: this.workspace,
    });
  }

  send(data) {
    if (this.readyState === WebSocket.OPEN) {
      this.postMessage({
        type: "message",
        data: data,
        from: this.client_id,
        workspace: this.workspace,
      });
    }
  }

  close() {
    this.readyState = WebSocket.CLOSING;
    this.postMessage({
      type: "close",
      from: this.client_id,
      workspace: this.workspace,
    });
    this.onclose();
  }

  addEventListener(type, listener) {
    if (type === "message") {
      this.onmessage = listener;
    }
    if (type === "open") {
      this.onopen = listener;
    }
    if (type === "close") {
      this.onclose = listener;
    }
    if (type === "error") {
      this.onerror = listener;
    }
  }
}

function setupLocalClient({
  enable_execution = false,
  on_ready = null,
}) {
  return new Promise((resolve, reject) => {
    const context = typeof window !== "undefined" ? window : self;
    const isWindow = typeof window !== "undefined";
    context.addEventListener(
      "message",
      (event) => {
        const {
          type,
          server_url,
          workspace,
          client_id,
          token,
          method_timeout,
          name,
          config,
        } = event.data;

        if (type === "initializeHyphaClient") {
          if (!server_url || !workspace || !client_id) {
            console.error("server_url, workspace, and client_id are required.");
            return;
          }

          if (!server_url.startsWith("https://local-hypha-server:")) {
            console.error(
              "server_url should start with https://local-hypha-server:",
            );
            return;
          }

          class FixedLocalWebSocket extends LocalWebSocket {
            constructor(url) {
              // Call the parent class's constructor with fixed values
              super(url, client_id, workspace);
            }
          }
          connectToServer({
            server_url,
            workspace,
            client_id,
            token,
            method_timeout,
            name,
            WebSocketClass: FixedLocalWebSocket,
          }).then(async (server) => {
            globalThis.api = server;
            try {
              // for iframe
              if (isWindow && enable_execution) {
                function loadScript(script) {
                  return new Promise((resolve, reject) => {
                    const scriptElement = document.createElement("script");
                    scriptElement.innerHTML = script.content;
                    scriptElement.lang = script.lang;

                    scriptElement.onload = () => resolve();
                    scriptElement.onerror = (e) => reject(e);

                    document.head.appendChild(scriptElement);
                  });
                }
                if (config.styles && config.styles.length > 0) {
                  for (const style of config.styles) {
                    const styleElement = document.createElement("style");
                    styleElement.innerHTML = style.content;
                    styleElement.lang = style.lang;
                    document.head.appendChild(styleElement);
                  }
                }
                if (config.links && config.links.length > 0) {
                  for (const link of config.links) {
                    const linkElement = document.createElement("a");
                    linkElement.href = link.url;
                    linkElement.innerText = link.text;
                    document.body.appendChild(linkElement);
                  }
                }
                if (config.windows && config.windows.length > 0) {
                  for (const w of config.windows) {
                    document.body.innerHTML = w.content;
                    break;
                  }
                }
                if (config.scripts && config.scripts.length > 0) {
                  for (const script of config.scripts) {
                    if (script.lang !== "javascript")
                      throw new Error("Only javascript scripts are supported");
                    await loadScript(script); // Await the loading of each script
                  }
                }
              }
              // for web worker
              else if (
                !isWindow &&
                enable_execution &&
                config.scripts &&
                config.scripts.length > 0
              ) {
                for (const script of config.scripts) {
                  if (script.lang !== "javascript")
                    throw new Error("Only javascript scripts are supported");
                  eval(script.content);
                }
              }

              if (on_ready) {
                await on_ready(server, config);
              }
              resolve(server);
            } catch (e) {
              reject(e);
            }
          });
        }
      },
      false,
    );
    if (isWindow) {
      window.parent.postMessage({ type: "hyphaClientReady" }, "*");
    } else {
      self.postMessage({ type: "hyphaClientReady" });
    }
  });
}

/******/ 	return __nested_webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=hypha-rpc-websocket.js.map

/***/ }),

/***/ "./node_modules/hypha-rpc/index.js":
/*!*****************************************!*\
  !*** ./node_modules/hypha-rpc/index.js ***!
  \*****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = { hyphaWebsocketClient: __webpack_require__(/*! ./dist/hypha-rpc-websocket.js */ "./node_modules/hypha-rpc/dist/hypha-rpc-websocket.js")};

/***/ }),

/***/ "./src/components/WelcomePage.ts":
/*!***************************************!*\
  !*** ./src/components/WelcomePage.ts ***!
  \***************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.showWelcomePage = void 0;
const vscode = __importStar(__webpack_require__(/*! vscode */ "vscode"));
function showWelcomePage(context, authProvider) {
    const panel = vscode.window.createWebviewPanel('hypha-workspace-welcome', 'Welcome to Hypha Workspace', vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true
    });
    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
            case 'login':
                console.log('🔐 Webview login request received');
                const success = await authProvider.login();
                if (success) {
                    console.log('✅ Webview login successful');
                    panel.webview.postMessage({ command: 'loginSuccess', user: authProvider.getUser() });
                }
                else {
                    console.log('❌ Webview login failed');
                    panel.webview.postMessage({ command: 'loginError', error: 'Login failed' });
                }
                break;
            case 'logout':
                console.log('🔓 Webview logout request received');
                await authProvider.logout();
                console.log('✅ Webview logout completed');
                panel.webview.postMessage({ command: 'logoutSuccess' });
                break;
            case 'connectHypha':
                console.log('📁 Webview connect to Hypha request received');
                try {
                    // Use hypha:// scheme consistently  
                    const uri = vscode.Uri.parse('hypha://agent-lab-projects');
                    console.log('📁 Opening folder with URI:', uri.toString());
                    await vscode.commands.executeCommand('vscode.openFolder', uri);
                    console.log('✅ Folder opened successfully from webview');
                }
                catch (error) {
                    console.error('❌ Failed to open folder from webview:', error);
                    panel.webview.postMessage({ command: 'error', error: `Failed to open projects: ${error}` });
                }
                break;
        }
    }, undefined, context.subscriptions);
    // Set initial HTML content
    updateWebviewContent(panel, authProvider);
    // Update content reactively when auth state changes
    const authStateSubscription = authProvider.onAuthStateChanged((authState) => {
        console.log('🔄 Auth state changed, updating webview content');
        updateWebviewContent(panel, authProvider);
    });
    panel.onDidDispose(() => {
        console.log('🗑️ Disposing welcome page resources');
        authStateSubscription.dispose();
    });
    return panel;
}
exports.showWelcomePage = showWelcomePage;
function updateWebviewContent(panel, authProvider) {
    const isAuthenticated = authProvider.isAuthenticated();
    const user = authProvider.getUser();
    panel.webview.html = getWebviewContent(isAuthenticated, user);
}
function getWebviewContent(isAuthenticated, user) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Hypha Workspace</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            line-height: 1.6;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            color: var(--vscode-textLink-foreground);
        }
        .header p {
            font-size: 1.2em;
            opacity: 0.8;
        }
        .login-section {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
        }
        .user-info {
            background-color: var(--vscode-inputValidation-infoBackground);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid var(--vscode-inputValidation-infoBorder);
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .feature {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 20px;
            border-radius: 8px;
        }
        .feature h3 {
            color: var(--vscode-textLink-foreground);
            margin-bottom: 10px;
        }
        .btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin: 5px;
            transition: background-color 0.2s;
        }
        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .status {
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .status.success {
            background-color: var(--vscode-inputValidation-infoBackground);
            color: var(--vscode-inputValidation-infoForeground);
        }
        .status.error {
            background-color: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Hypha Workspace</h1>
            <p>Your tailored VS Code environment for Hypha server integration</p>
        </div>

        ${isAuthenticated ? `
            <div class="user-info">
                <h3>✅ Connected to Hypha Server</h3>
                <p><strong>Logged in as:</strong> ${user?.email || 'Unknown'}</p>
                <button class="btn btn-secondary" onclick="logout()">Logout</button>
                <button class="btn" onclick="connectHypha()">Browse Hypha Projects</button>
            </div>
        ` : `
            <div class="login-section">
                <h3>🔐 Connect to Hypha Server</h3>
                <p>Login to access your projects and collaborate with the Hypha ecosystem</p>
                <button class="btn" onclick="login()">Login to Hypha</button>
                <div id="status"></div>
            </div>
        `}

        <div class="features">
            <div class="feature">
                <h3>🗂️ Project Management</h3>
                <p>Access and manage your Hypha projects directly from VS Code. Browse, edit, and sync files seamlessly.</p>
            </div>
            <div class="feature">
                <h3>🔄 Real-time Sync</h3>
                <p>Changes are automatically synchronized with the Hypha server, enabling collaborative development.</p>
            </div>
            <div class="feature">
                <h3>🛠️ Artifact Manager</h3>
                <p>Leverage the Hypha Artifact Manager for managing datasets, models, and applications.</p>
            </div>
        </div>

        <div style="text-align: center; opacity: 0.7; font-size: 0.9em;">
            <p>Hypha Workspace v1.0.0 | Powered by Hypha</p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function login() {
            const statusEl = document.getElementById('status');
            if (statusEl) {
                statusEl.innerHTML = '<div class="status">Initiating login...</div>';
            }
            vscode.postMessage({ command: 'login' });
        }

        function logout() {
            vscode.postMessage({ command: 'logout' });
        }

        function connectHypha() {
            vscode.postMessage({ command: 'connectHypha' });
        }

        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            const statusEl = document.getElementById('status');
            
            switch (message.command) {
                case 'loginSuccess':
                    if (statusEl) {
                        statusEl.innerHTML = '<div class="status success">Login successful! Reloading...</div>';
                    }
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                    break;
                case 'loginError':
                    if (statusEl) {
                        statusEl.innerHTML = '<div class="status error">Login failed: ' + message.error + '</div>';
                    }
                    break;
                case 'logoutSuccess':
                    location.reload();
                    break;
            }
        });
    </script>
</body>
</html>`;
}


/***/ }),

/***/ "./src/extension.ts":
/*!**************************!*\
  !*** ./src/extension.ts ***!
  \**************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(__webpack_require__(/*! vscode */ "vscode"));
const HyphaFileSystemProvider_1 = __webpack_require__(/*! ./providers/HyphaFileSystemProvider */ "./src/providers/HyphaFileSystemProvider.ts");
const HyphaAuthProvider_1 = __webpack_require__(/*! ./providers/HyphaAuthProvider */ "./src/providers/HyphaAuthProvider.ts");
const WelcomePage_1 = __webpack_require__(/*! ./components/WelcomePage */ "./src/components/WelcomePage.ts");
function activate(context) {
    console.log('🚀 Hypha Workspace extension is now active!');
    // Initialize authentication provider
    const authProvider = new HyphaAuthProvider_1.HyphaAuthProvider(context);
    console.log('✅ Auth provider initialized');
    // Initialize filesystem provider
    const fileSystemProvider = new HyphaFileSystemProvider_1.HyphaFileSystemProvider(authProvider);
    console.log('✅ File system provider initialized');
    // Register filesystem provider
    const disposable = vscode.workspace.registerFileSystemProvider('hypha', fileSystemProvider, {
        isCaseSensitive: true,
        isReadonly: false
    });
    context.subscriptions.push(disposable);
    console.log('✅ File system provider registered for hypha:// scheme');
    // Register commands
    const welcomeCommand = vscode.commands.registerCommand('hypha-workspace.welcome', () => {
        console.log('💡 Welcome command executed');
        (0, WelcomePage_1.showWelcomePage)(context, authProvider);
    });
    const loginCommand = vscode.commands.registerCommand('hypha-workspace.login', async () => {
        console.log('🔐 Login command executed');
        const success = await authProvider.login();
        if (success) {
            console.log('✅ Login successful');
        }
        else {
            console.log('❌ Login failed');
        }
    });
    const logoutCommand = vscode.commands.registerCommand('hypha-workspace.logout', async () => {
        console.log('🔓 Logout command executed');
        await authProvider.logout();
        console.log('✅ Logout completed');
    });
    const browseProjectsCommand = vscode.commands.registerCommand('hypha-workspace.browseProjects', async () => {
        console.log('📁 Browse projects command executed');
        try {
            // Use hypha:// scheme consistently
            const uri = vscode.Uri.parse('hypha://agent-lab-projects');
            console.log('📁 Opening folder with URI:', uri.toString());
            await vscode.commands.executeCommand('vscode.openFolder', uri);
            console.log('✅ Folder opened successfully');
        }
        catch (error) {
            console.error('❌ Failed to open folder:', error);
            vscode.window.showErrorMessage(`Failed to open Hypha projects: ${error}`);
        }
    });
    // Add commands to subscriptions
    context.subscriptions.push(welcomeCommand, loginCommand, logoutCommand, browseProjectsCommand);
    console.log('✅ Commands registered');
    // Add providers to subscriptions for proper cleanup
    context.subscriptions.push(authProvider);
    // Show welcome page on first activation
    console.log('📄 Showing welcome page');
    (0, WelcomePage_1.showWelcomePage)(context, authProvider);
    console.log('🎉 Hypha Workspace extension activation complete!');
}
exports.activate = activate;
function deactivate() {
    console.log('👋 Hypha Workspace extension is deactivated');
}
exports.deactivate = deactivate;


/***/ }),

/***/ "./src/providers/HyphaAuthProvider.ts":
/*!********************************************!*\
  !*** ./src/providers/HyphaAuthProvider.ts ***!
  \********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HyphaAuthProvider = void 0;
const vscode = __importStar(__webpack_require__(/*! vscode */ "vscode"));
class HyphaAuthProvider {
    constructor(context) {
        this.token = null;
        this.user = null;
        this.client = null;
        this.server = null;
        this.serverUrl = "https://hypha.aicell.io";
        this.isConnecting = false;
        this.connectionPromise = null;
        // Event emitters for reactive updates
        this._onAuthStateChanged = new vscode.EventEmitter();
        this.onAuthStateChanged = this._onAuthStateChanged.event;
        console.log('🔐 Initializing HyphaAuthProvider');
        this.context = context;
        this.loadSavedAuth();
    }
    loadSavedAuth() {
        console.log('📥 Loading saved authentication data');
        // Load token from workspace state
        this.token = this.context.workspaceState.get('hyphaToken') || null;
        this.user = this.context.workspaceState.get('hyphaUser') || null;
        console.log('📥 Token loaded:', this.token ? 'Yes' : 'No');
        console.log('📥 User loaded:', this.user?.email || 'None');
        if (this.token && this.isTokenValid()) {
            console.log('🔄 Token is valid, attempting auto-connect');
            this.autoConnect();
        }
        else if (this.token) {
            console.log('⚠️ Token exists but is expired');
        }
        else {
            console.log('ℹ️ No saved token found');
        }
    }
    isTokenValid() {
        const tokenExpiry = this.context.workspaceState.get('hyphaTokenExpiry');
        const isValid = tokenExpiry && new Date(tokenExpiry) > new Date();
        console.log('🕒 Token validity check - Expires:', tokenExpiry, 'Valid:', !!isValid);
        return !!isValid;
    }
    async saveAuth(token, user) {
        console.log('💾 Saving authentication data for user:', user?.email || 'unknown');
        this.token = token;
        this.user = user || null;
        await this.context.workspaceState.update('hyphaToken', token);
        await this.context.workspaceState.update('hyphaUser', user);
        await this.context.workspaceState.update('hyphaTokenExpiry', new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString());
        console.log('💾 Authentication data saved successfully');
        // Fire auth state changed event
        this.fireAuthStateChanged();
    }
    async clearAuth() {
        console.log('🗑️ Clearing authentication data');
        this.token = null;
        this.user = null;
        this.client = null;
        this.server = null;
        this.isConnecting = false;
        this.connectionPromise = null;
        await this.context.workspaceState.update('hyphaToken', undefined);
        await this.context.workspaceState.update('hyphaUser', undefined);
        await this.context.workspaceState.update('hyphaTokenExpiry', undefined);
        console.log('🗑️ Authentication data cleared');
        // Fire auth state changed event
        this.fireAuthStateChanged();
    }
    async login() {
        console.log('🔐 Starting login process to:', this.serverUrl);
        try {
            // Import hypha-rpc dynamically
            console.log('📦 Importing hypha-rpc module');
            const { hyphaWebsocketClient } = await Promise.resolve().then(() => __importStar(__webpack_require__(/*! hypha-rpc */ "./node_modules/hypha-rpc/index.js")));
            console.log('📦 hypha-rpc module imported successfully');
            const config = {
                server_url: this.serverUrl,
                login_callback: (context) => {
                    console.log('🌐 Opening login URL:', context.login_url);
                    vscode.env.openExternal(vscode.Uri.parse(context.login_url));
                },
            };
            console.log('🔐 Requesting login token from server');
            const token = await hyphaWebsocketClient.login(config);
            if (token) {
                console.log('✅ Login token received, establishing connection');
                await this.connect(token);
                console.log('✅ Login successful');
                vscode.window.showInformationMessage('Successfully logged into Hypha server');
                return true;
            }
            else {
                console.log('❌ Failed to obtain authentication token');
                vscode.window.showErrorMessage('Failed to obtain authentication token');
                return false;
            }
        }
        catch (error) {
            console.error('❌ Login failed:', error);
            vscode.window.showErrorMessage(`Login failed: ${error}`);
            return false;
        }
    }
    async connect(token) {
        console.log('🔗 Establishing connection to Hypha server');
        try {
            const { hyphaWebsocketClient } = await Promise.resolve().then(() => __importStar(__webpack_require__(/*! hypha-rpc */ "./node_modules/hypha-rpc/index.js")));
            console.log('🔗 Connecting with token to:', this.serverUrl);
            this.server = await hyphaWebsocketClient.connectToServer({
                server_url: this.serverUrl,
                token: token,
                method_timeout: 180000,
            });
            const user = this.server.config.user;
            console.log('🔗 Connection established for user:', user?.email || 'unknown');
            await this.saveAuth(token, user);
            console.log("✅ Connected to Hypha server as:", user);
        }
        catch (error) {
            console.error('❌ Connection failed:', error);
            throw error;
        }
    }
    async autoConnect() {
        console.log('🔄 Attempting auto-connect with saved token');
        if (this.token && this.isTokenValid()) {
            try {
                await this.connect(this.token);
                console.log('✅ Auto-connect successful');
            }
            catch (error) {
                console.error('❌ Auto-connect failed:', error);
                console.log('🗑️ Clearing invalid authentication data');
                await this.clearAuth();
            }
        }
    }
    async logout() {
        console.log('🔓 Starting logout process');
        try {
            await this.clearAuth();
            console.log('✅ Logout successful');
            vscode.window.showInformationMessage('Logged out from Hypha server');
        }
        catch (error) {
            console.error('❌ Logout error:', error);
            vscode.window.showErrorMessage(`Logout failed: ${error}`);
        }
    }
    isAuthenticated() {
        const authenticated = this.token !== null && this.isTokenValid();
        console.log('🔍 Authentication check - Authenticated:', authenticated, 'Has token:', !!this.token, 'Token valid:', this.token ? this.isTokenValid() : false);
        return authenticated;
    }
    getUser() {
        return this.user;
    }
    getToken() {
        return this.token;
    }
    async getServer() {
        // If we already have a server connection, return it
        if (this.server) {
            console.log('🔗 Server connection already available');
            return this.server;
        }
        // If we're already in the process of connecting, wait for that to complete
        if (this.isConnecting && this.connectionPromise) {
            console.log('🔄 Connection already in progress, waiting...');
            try {
                await this.connectionPromise;
                return this.server;
            }
            catch (error) {
                console.error('❌ Connection in progress failed:', error);
                throw error;
            }
        }
        // If we have a valid token but no server connection, attempt to connect
        if (this.token && this.isTokenValid()) {
            console.log('🔄 No server connection but valid token available, attempting to connect');
            this.isConnecting = true;
            this.connectionPromise = this.connectWithExistingToken();
            try {
                await this.connectionPromise;
                return this.server;
            }
            catch (error) {
                console.error('❌ Failed to connect with existing token:', error);
                await this.clearAuth();
                throw new Error('Failed to establish server connection with existing token');
            }
            finally {
                this.isConnecting = false;
                this.connectionPromise = null;
            }
        }
        // No valid token available, need to authenticate
        console.log('❌ No server connection and no valid token - authentication required');
        throw new Error('No server connection available - authentication required. Please login first.');
    }
    async connectWithExistingToken() {
        if (!this.token) {
            throw new Error('No token available for connection');
        }
        try {
            await this.connect(this.token);
            console.log('✅ Successfully connected with existing token');
        }
        catch (error) {
            console.error('❌ Failed to connect with existing token:', error);
            throw error;
        }
    }
    async ensureConnection() {
        try {
            return await this.getServer();
        }
        catch (error) {
            console.log('🔐 Connection failed, prompting for login');
            vscode.window.showWarningMessage('Hypha server connection required. Please login to continue.', 'Login').then(selection => {
                if (selection === 'Login') {
                    vscode.commands.executeCommand('hypha.login');
                }
            });
            throw error;
        }
    }
    async getArtifactManager() {
        console.log('🎯 Getting artifact manager service');
        const server = await this.getServer();
        try {
            console.log('🎯 Requesting artifact manager service from server');
            const artifactManager = await server.getService("public/artifact-manager");
            console.log('🎯 Artifact manager service obtained successfully');
            return artifactManager;
        }
        catch (error) {
            console.error('❌ Failed to get artifact manager:', error);
            throw error;
        }
    }
    fireAuthStateChanged() {
        const isAuthenticated = this.isAuthenticated();
        console.log('🔄 Firing auth state changed event - authenticated:', isAuthenticated, 'user:', this.user?.email || 'none');
        this._onAuthStateChanged.fire({ isAuthenticated, user: this.user });
    }
    dispose() {
        console.log('🗑️ Disposing HyphaAuthProvider');
        this._onAuthStateChanged.dispose();
    }
}
exports.HyphaAuthProvider = HyphaAuthProvider;


/***/ }),

/***/ "./src/providers/HyphaFileSystemProvider.ts":
/*!**************************************************!*\
  !*** ./src/providers/HyphaFileSystemProvider.ts ***!
  \**************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HyphaFileSystemProvider = void 0;
const vscode = __importStar(__webpack_require__(/*! vscode */ "vscode"));
class HyphaFileSystemProvider {
    constructor(authProvider) {
        this._emitter = new vscode.EventEmitter();
        this._cache = new Map();
        this.artifactManager = null;
        this.isInitializing = false;
        this.initializationPromise = null;
        this.lastInitAttempt = 0;
        this.initCooldown = 5000; // 5 seconds cooldown between init attempts
        this.artifactCache = new Map();
        this.cacheTimeout = 300000; // 5 minutes cache for artifacts
        // New caches for optimization
        this.pathResolutionCache = new Map();
        this.fileListingCache = new Map();
        this.childArtifactsCache = new Map();
        this.shortCacheTimeout = 30000; // 30 seconds for path/file listings
        // Request deduplication
        this.pendingRequests = new Map();
        this.onDidChangeFile = this._emitter.event;
        this.authProvider = authProvider;
        console.log('🗂️ HyphaFileSystemProvider initialized, starting artifact manager initialization');
        this.initializeArtifactManager();
    }
    generateCacheKey(...parts) {
        return parts.join('::');
    }
    isValidCacheEntry(timestamp, timeout = this.shortCacheTimeout) {
        return (Date.now() - timestamp) < timeout;
    }
    async deduplicateRequest(key, requestFn) {
        // If there's already a pending request for this key, return it
        if (this.pendingRequests.has(key)) {
            console.log('🔄 Deduplicating request for:', key);
            return this.pendingRequests.get(key);
        }
        // Create new request and cache the promise
        const promise = requestFn().finally(() => {
            // Clean up when request completes
            this.pendingRequests.delete(key);
        });
        this.pendingRequests.set(key, promise);
        return promise;
    }
    async resolveArtifactPathCached(path) {
        const cached = this.pathResolutionCache.get(path);
        if (cached && this.isValidCacheEntry(cached.timestamp)) {
            console.log('🎯 Using cached path resolution for:', path);
            return { artifactId: cached.artifactId, filePath: cached.filePath };
        }
        const requestKey = `resolveArtifactPath:${path}`;
        return this.deduplicateRequest(requestKey, async () => {
            console.log('🔍 Resolving artifact path:', path);
            const result = await this.resolveArtifactPath(path);
            // Cache the result
            this.pathResolutionCache.set(path, {
                artifactId: result.artifactId,
                filePath: result.filePath,
                timestamp: Date.now()
            });
            return result;
        });
    }
    async listChildArtifactsCached(parentId) {
        const cached = this.childArtifactsCache.get(parentId);
        if (cached && this.isValidCacheEntry(cached.timestamp)) {
            console.log('🎯 Using cached child artifacts for:', parentId);
            return cached.children;
        }
        const requestKey = `listChildArtifacts:${parentId}`;
        return this.deduplicateRequest(requestKey, async () => {
            console.log('📋 Listing child artifacts for parent:', parentId);
            try {
                const artifactManager = await this.ensureArtifactManager();
                console.log('📋 Listing artifacts with parent:', parentId);
                const projectsList = await artifactManager.list({
                    parent_id: parentId,
                    stage: 'all',
                    _rkwargs: true
                });
                const result = projectsList.map((project) => {
                    console.log('📋 Processing child artifact:', {
                        originalId: project.id,
                        parentId: parentId,
                        projectType: project.type,
                        projectManifest: project.manifest
                    });
                    // Use the ID as returned by the server - don't modify it
                    const artifactId = project.id;
                    console.log('📋 Child artifact processed:', project.id, '-> final ID:', artifactId);
                    return {
                        id: artifactId,
                        manifest: project.manifest || {
                            name: project.id,
                            description: '',
                            version: '1.0.0',
                            type: 'project',
                            created_at: new Date().toISOString()
                        }
                    };
                });
                // Cache the result
                this.childArtifactsCache.set(parentId, {
                    children: result,
                    timestamp: Date.now()
                });
                console.log('📋 Found', result.length, 'child artifacts');
                return result;
            }
            catch (error) {
                console.error('❌ Failed to list child artifacts:', error);
                return [];
            }
        });
    }
    async listFilesCached(artifactId, dirPath) {
        const cacheKey = this.generateCacheKey(artifactId, dirPath);
        const cached = this.fileListingCache.get(cacheKey);
        if (cached && this.isValidCacheEntry(cached.timestamp)) {
            console.log('🎯 Using cached file listing for:', artifactId, 'dir:', dirPath || '(root)');
            return cached.files;
        }
        const requestKey = `listFiles:${cacheKey}`;
        return this.deduplicateRequest(requestKey, async () => {
            console.log('📄 Listing files for artifact:', artifactId, 'in directory:', dirPath || '(root)');
            try {
                const artifactManager = await this.ensureArtifactManager();
                console.log('📄 Listing files with artifact_id:', artifactId, 'dir_path:', dirPath || '');
                const files = await artifactManager.list_files({
                    artifact_id: artifactId,
                    version: "stage",
                    dir_path: dirPath || '',
                    _rkwargs: true
                });
                const result = files.map((file) => ({
                    name: file.name,
                    path: file.path,
                    type: file.type,
                    size: file.size,
                    created_at: file.created_at,
                    modified_at: file.modified_at
                }));
                // Cache the result
                this.fileListingCache.set(cacheKey, {
                    files: result,
                    timestamp: Date.now()
                });
                console.log('📄 Found', result.length, 'files');
                return result;
            }
            catch (error) {
                console.error(`❌ Failed to list files for ${artifactId}:`, error);
                return [];
            }
        });
    }
    invalidateCache(artifactId) {
        if (artifactId) {
            console.log('🗑️ Invalidating caches for artifact:', artifactId);
            // Invalidate artifact cache
            this.artifactCache.delete(artifactId);
            // Invalidate child artifacts cache for this artifact as parent
            this.childArtifactsCache.delete(artifactId);
            // Invalidate file listing cache for this artifact
            for (const [key, _] of this.fileListingCache.entries()) {
                if (key.startsWith(`${artifactId}::`)) {
                    this.fileListingCache.delete(key);
                }
            }
            // Invalidate path resolution cache that might reference this artifact
            for (const [path, cached] of this.pathResolutionCache.entries()) {
                if (cached.artifactId === artifactId) {
                    this.pathResolutionCache.delete(path);
                }
            }
        }
        else {
            console.log('🗑️ Clearing all caches');
            this.artifactCache.clear();
            this.pathResolutionCache.clear();
            this.fileListingCache.clear();
            this.childArtifactsCache.clear();
        }
    }
    clearExpiredCaches() {
        const now = Date.now();
        // Clear expired artifact cache
        const expiredArtifacts = [];
        for (const [key, cached] of this.artifactCache.entries()) {
            if (now - cached.timestamp >= this.cacheTimeout) {
                expiredArtifacts.push(key);
            }
        }
        // Clear expired path resolution cache
        const expiredPaths = [];
        for (const [key, cached] of this.pathResolutionCache.entries()) {
            if (now - cached.timestamp >= this.shortCacheTimeout) {
                expiredPaths.push(key);
            }
        }
        // Clear expired file listing cache
        const expiredFileListings = [];
        for (const [key, cached] of this.fileListingCache.entries()) {
            if (now - cached.timestamp >= this.shortCacheTimeout) {
                expiredFileListings.push(key);
            }
        }
        // Clear expired child artifacts cache
        const expiredChildArtifacts = [];
        for (const [key, cached] of this.childArtifactsCache.entries()) {
            if (now - cached.timestamp >= this.shortCacheTimeout) {
                expiredChildArtifacts.push(key);
            }
        }
        const totalExpired = expiredArtifacts.length + expiredPaths.length + expiredFileListings.length + expiredChildArtifacts.length;
        if (totalExpired > 0) {
            console.log('🗑️ Clearing', totalExpired, 'expired cache entries');
            expiredArtifacts.forEach(key => this.artifactCache.delete(key));
            expiredPaths.forEach(key => this.pathResolutionCache.delete(key));
            expiredFileListings.forEach(key => this.fileListingCache.delete(key));
            expiredChildArtifacts.forEach(key => this.childArtifactsCache.delete(key));
        }
    }
    async getArtifactCached(artifactId) {
        const now = Date.now();
        const cached = this.artifactCache.get(artifactId);
        if (cached && (now - cached.timestamp) < this.cacheTimeout) {
            console.log('🎯 Using cached artifact for', artifactId, ':', cached.artifact?.manifest?.name || 'null');
            return cached.artifact;
        }
        const requestKey = `getArtifact:${artifactId}`;
        return this.deduplicateRequest(requestKey, async () => {
            try {
                console.log('🔄 Fetching fresh artifact data for', artifactId);
                const artifact = await this.getArtifact(artifactId);
                // Cache the result (including null results)
                this.artifactCache.set(artifactId, { artifact, timestamp: now });
                if (artifact) {
                    console.log('🎯 Cached artifact for', artifactId, ':', artifact.manifest?.name, 'type:', artifact.type);
                }
                else {
                    console.log('🎯 Cached not-found result for', artifactId);
                }
                return artifact;
            }
            catch (error) {
                console.error('❌ Failed to get artifact for', artifactId, ':', error);
                // Cache error results to avoid repeated attempts
                this.artifactCache.set(artifactId, { artifact: null, timestamp: now });
                return null;
            }
        });
    }
    async getArtifactTypeCached(artifactId) {
        const artifact = await this.getArtifactCached(artifactId);
        if (artifact) {
            const type = artifact.type || 'artifact';
            console.log('🎯 Extracted type from cached artifact', artifactId, ':', type);
            return type;
        }
        else {
            console.log('🎯 No artifact found for type extraction:', artifactId);
            return null;
        }
    }
    async resolveArtifactPath(path) {
        console.log('🔍 Resolving artifact path:', path);
        // Remove leading slash and split into segments
        const segments = path.substring(1).split('/').filter(s => s);
        if (segments.length === 0) {
            // Root path - this should be handled by the workspace root logic
            throw new Error('Cannot resolve empty path');
        }
        let currentArtifactId = '';
        // Traverse segments to find the deepest artifact
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            if (i === 0) {
                // First segment - test as root artifact
                console.log('🔍 Testing root artifact ID:', segment);
                const artifactType = await this.getArtifactTypeCached(segment);
                if (artifactType) {
                    currentArtifactId = segment;
                    console.log('✅ Found root artifact:', currentArtifactId, 'type:', artifactType);
                    if (artifactType !== 'collection') {
                        // Not a collection, remaining segments are file path
                        const remainingSegments = segments.slice(i + 1);
                        const filePath = remainingSegments.length > 0 ? remainingSegments.join('/') : undefined;
                        console.log('🎯 Final resolution - Artifact:', currentArtifactId, 'FilePath:', filePath);
                        return { artifactId: currentArtifactId, filePath };
                    }
                    // Continue to check if next segment is a child artifact
                }
                else {
                    console.log('❌ Root artifact not found:', segment);
                    throw new Error(`Root artifact '${segment}' not found`);
                }
            }
            else {
                // For subsequent segments, if current artifact is a collection,
                // check if this segment is a direct child artifact
                if (currentArtifactId) {
                    console.log('🔍 Testing child artifact:', segment, 'of parent:', currentArtifactId);
                    // First check if the current artifact is a collection
                    const parentType = await this.getArtifactTypeCached(currentArtifactId);
                    if (parentType === 'collection') {
                        // Get child artifacts to see if this segment matches
                        const childArtifacts = await this.listChildArtifactsCached(currentArtifactId);
                        const matchingChild = childArtifacts.find(child => {
                            const childName = child.id.includes('/') ?
                                child.id.split('/').pop() :
                                child.id;
                            return childName === segment;
                        });
                        if (matchingChild) {
                            // Found matching child artifact
                            currentArtifactId = matchingChild.id;
                            console.log('✅ Found child artifact:', currentArtifactId);
                            // Check if this child is also a collection or has remaining segments
                            const childType = await this.getArtifactTypeCached(matchingChild.id);
                            if (childType !== 'collection') {
                                // Not a collection, remaining segments are file path
                                const remainingSegments = segments.slice(i + 1);
                                const filePath = remainingSegments.length > 0 ? remainingSegments.join('/') : undefined;
                                console.log('🎯 Final resolution - Artifact:', currentArtifactId, 'FilePath:', filePath);
                                return { artifactId: currentArtifactId, filePath };
                            }
                            // Continue to check next segment
                        }
                        else {
                            // Segment is not a child artifact, so it's part of file path
                            const remainingSegments = segments.slice(i);
                            const filePath = remainingSegments.length > 0 ? remainingSegments.join('/') : undefined;
                            console.log('🎯 Final resolution - Artifact:', currentArtifactId, 'FilePath:', filePath);
                            return { artifactId: currentArtifactId, filePath };
                        }
                    }
                    else {
                        // Parent is not a collection, remaining segments are file path
                        const remainingSegments = segments.slice(i);
                        const filePath = remainingSegments.length > 0 ? remainingSegments.join('/') : undefined;
                        console.log('🎯 Final resolution - Artifact:', currentArtifactId, 'FilePath:', filePath);
                        return { artifactId: currentArtifactId, filePath };
                    }
                }
            }
        }
        // All segments were traversed, currentArtifactId is the final artifact
        console.log('🎯 Final resolution - Artifact:', currentArtifactId, 'FilePath: none');
        return { artifactId: currentArtifactId };
    }
    async initializeArtifactManager() {
        const now = Date.now();
        // Add cooldown to prevent rapid successive calls
        if (now - this.lastInitAttempt < this.initCooldown) {
            console.log('🔄 Initialization cooldown active, skipping attempt');
            return this.initializationPromise || Promise.resolve();
        }
        if (this.isInitializing || this.artifactManager) {
            console.log('🔄 Initialization already in progress or completed');
            return this.initializationPromise || Promise.resolve();
        }
        this.lastInitAttempt = now;
        this.isInitializing = true;
        this.initializationPromise = this.performInitialization();
        return this.initializationPromise;
    }
    async performInitialization() {
        try {
            console.log('🔄 Initializing artifact manager...');
            // Just try to get the server connection directly
            // Authentication will be handled by getServer() if needed
            const server = await this.authProvider.getServer();
            if (server) {
                console.log('✅ Server connection established during initialization');
                this.artifactManager = await server.getService("public/artifact-manager");
                console.log('✅ Artifact manager initialized successfully');
            }
            else {
                console.log('❌ No server connection available');
            }
        }
        catch (error) {
            console.log('⚠️ Could not establish server connection:', error.message);
            console.log('⚠️ Authentication required - artifact manager will be unavailable');
        }
        finally {
            this.isInitializing = false;
        }
    }
    async ensureArtifactManager() {
        console.log('🔍 ensureArtifactManager called - current state:', {
            hasArtifactManager: !!this.artifactManager,
            isInitializing: this.isInitializing,
            lastInitAttempt: this.lastInitAttempt,
            timeSinceLastInit: Date.now() - this.lastInitAttempt
        });
        // Clean up expired cache entries periodically
        this.clearExpiredCaches();
        if (!this.artifactManager) {
            console.log('🔄 No artifact manager, attempting initialization...');
            await this.initializeArtifactManager();
        }
        // If still no artifact manager, try to get server connection reactively
        if (!this.artifactManager) {
            console.log('🔄 Still no artifact manager, trying reactive approach...');
            try {
                console.log('🔄 Attempting to get server connection reactively');
                const server = await this.authProvider.getServer();
                this.artifactManager = await server.getService("public/artifact-manager");
                console.log('✅ Artifact manager obtained reactively');
            }
            catch (error) {
                console.error('❌ Failed to get artifact manager reactively:', error.message);
                throw new Error('Artifact manager not available - authentication required. Please login first.');
            }
        }
        return this.artifactManager;
    }
    watch(uri, options) {
        console.log('👁️ Watching URI:', uri.toString());
        return new vscode.Disposable(() => {
            console.log('👁️ Stopped watching URI:', uri.toString());
        });
    }
    async stat(uri) {
        console.log('📊 Getting stat for URI:', uri.toString());
        const path = this.uriToPath(uri);
        console.log('📊 Converted to path:', path);
        try {
            const { artifactId, filePath } = await this.resolveArtifactPathCached(path);
            console.log('📊 Resolved - artifactId:', artifactId, 'filePath:', filePath);
            if (!filePath) {
                // This is an artifact directory
                const artifact = await this.getArtifactCached(artifactId);
                if (artifact) {
                    console.log('📊 Artifact found:', artifact.manifest?.name || artifactId, 'type:', artifact.type);
                    return {
                        type: vscode.FileType.Directory,
                        ctime: new Date(artifact.manifest?.created_at || Date.now()).getTime(),
                        mtime: new Date(artifact.manifest?.created_at || Date.now()).getTime(),
                        size: 0
                    };
                }
            }
            else {
                // This is a file within an artifact
                console.log('📊 Getting file stat for:', filePath, 'in artifact:', artifactId);
                const file = await this.getFileInfo(artifactId, filePath);
                if (file) {
                    console.log('📊 File found:', file.name, 'type:', file.type);
                    return {
                        type: file.type === 'directory' ? vscode.FileType.Directory : vscode.FileType.File,
                        ctime: file.created_at ? new Date(file.created_at).getTime() : Date.now(),
                        mtime: file.modified_at ? new Date(file.modified_at).getTime() : Date.now(),
                        size: file.size || 0
                    };
                }
            }
        }
        catch (error) {
            console.error('❌ Error in stat:', error);
        }
        console.log('❌ File not found for URI:', uri.toString());
        throw vscode.FileSystemError.FileNotFound(uri);
    }
    async readDirectory(uri) {
        const path = this.uriToPath(uri);
        console.log('📁 Reading directory - URI:', uri.toString(), 'Path:', path);
        // Prevent infinite loops by checking for excessively long paths
        if (path.length > 1000) {
            console.error('❌ Path too long, possible infinite loop detected:', path.substring(0, 100) + '...');
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        try {
            const { artifactId, filePath } = await this.resolveArtifactPathCached(path);
            console.log('📁 Resolved - artifactId:', artifactId, 'filePath:', filePath);
            // Get the artifact to determine its type
            const artifact = await this.getArtifactCached(artifactId);
            if (!artifact) {
                console.log('❌ Artifact not found:', artifactId);
                throw vscode.FileSystemError.FileNotFound(uri);
            }
            if (artifact.type === 'collection') {
                // List child artifacts using cached method
                console.log('📁 Artifact is collection, listing child artifacts');
                const childArtifacts = await this.listChildArtifactsCached(artifactId);
                // Better handling of child artifact names
                const result = childArtifacts.map(child => {
                    // Extract just the last segment of the child ID
                    const childName = child.id.includes('/') ?
                        child.id.split('/').pop() || child.id :
                        child.id;
                    console.log('📁 Child artifact:', child.id, '-> display name:', childName);
                    return [childName, vscode.FileType.Directory];
                });
                console.log('📁 Found', result.length, 'child artifacts');
                return result;
            }
            else {
                // List files in the artifact using cached method
                console.log('📁 Artifact has files, listing files in path:', filePath || '(root)');
                const files = await this.listFilesCached(artifactId, filePath || '');
                const result = files.map(file => [
                    file.name,
                    file.type === 'directory' ? vscode.FileType.Directory : vscode.FileType.File
                ]);
                console.log('📁 Found', result.length, 'files');
                return result;
            }
        }
        catch (error) {
            console.error('❌ Error in readDirectory:', error);
            throw vscode.FileSystemError.FileNotFound(uri);
        }
    }
    async createDirectory(uri) {
        const path = this.uriToPath(uri);
        try {
            const { artifactId, filePath } = await this.resolveArtifactPathCached(path);
            if (!filePath) {
                // Creating a new artifact (project folder)
                const pathSegments = path.split('/').filter(s => s);
                const folderName = pathSegments[pathSegments.length - 1];
                const parentPath = pathSegments.slice(0, -1).join('/');
                const parentArtifactId = parentPath || 'root';
                await this.createChildArtifact(parentArtifactId, folderName);
            }
            else {
                // For regular directories within an artifact, they are created implicitly when files are written
                // We don't need to explicitly create directories in the file system
            }
        }
        catch (error) {
            console.error('❌ Failed to create directory:', error);
            throw vscode.FileSystemError.NoPermissions(uri);
        }
    }
    async readFile(uri) {
        const path = this.uriToPath(uri);
        console.log('📖 Reading file - URI:', uri.toString(), 'Path:', path);
        const cached = this._cache.get(path);
        if (cached) {
            console.log('📖 File found in cache');
            return cached;
        }
        try {
            const { artifactId, filePath } = await this.resolveArtifactPathCached(path);
            console.log('📖 Resolved - artifactId:', artifactId, 'filePath:', filePath);
            if (!filePath) {
                console.log('❌ Cannot read file: no file path specified');
                throw vscode.FileSystemError.FileNotFound(uri);
            }
            console.log('📖 Getting file content from Hypha server');
            const content = await this.getFileContent(artifactId, filePath);
            const data = new TextEncoder().encode(content);
            this._cache.set(path, data);
            console.log('📖 File content retrieved and cached, size:', data.length, 'bytes');
            return data;
        }
        catch (error) {
            // console.error('❌ Failed to read file:', error);
            throw vscode.FileSystemError.FileNotFound(uri);
        }
    }
    async writeFile(uri, content, options) {
        const path = this.uriToPath(uri);
        console.log('✏️ Writing file - URI:', uri.toString(), 'Path:', path, 'Size:', content.length, 'bytes');
        try {
            const { artifactId, filePath } = await this.resolveArtifactPathCached(path);
            console.log('✏️ Resolved - artifactId:', artifactId, 'filePath:', filePath);
            if (!filePath) {
                console.log('❌ Cannot write file: no file path specified');
                throw vscode.FileSystemError.NoPermissions(uri);
            }
            console.log('✏️ Saving file to Hypha server');
            await this.saveFile(artifactId, filePath, content);
            this._cache.set(path, content);
            // Invalidate all caches for this artifact since the artifact content changed
            this.invalidateCache(artifactId);
            console.log('✏️ File saved successfully, firing change event');
            this._emitter.fire([{
                    type: vscode.FileChangeType.Changed,
                    uri: uri
                }]);
        }
        catch (error) {
            console.error('❌ Failed to write file:', error);
            throw vscode.FileSystemError.Unavailable(uri);
        }
    }
    async delete(uri, options) {
        const path = this.uriToPath(uri);
        try {
            const { artifactId, filePath } = await this.resolveArtifactPathCached(path);
            if (!filePath) {
                // Deleting an artifact itself
                this.invalidateCache(artifactId);
                throw vscode.FileSystemError.NoPermissions(uri);
            }
            await this.deleteFile(artifactId, filePath);
            this._cache.delete(path);
            // Invalidate all caches for this artifact since the artifact content changed
            this.invalidateCache(artifactId);
            this._emitter.fire([{
                    type: vscode.FileChangeType.Deleted,
                    uri: uri
                }]);
        }
        catch (error) {
            console.error('Failed to delete file:', error);
            throw vscode.FileSystemError.Unavailable(uri);
        }
    }
    async rename(oldUri, newUri, options) {
        const oldPath = this.uriToPath(oldUri);
        const newPath = this.uriToPath(newUri);
        try {
            const { artifactId: oldArtifactId, filePath: oldFilePath } = await this.resolveArtifactPathCached(oldPath);
            const { artifactId: newArtifactId, filePath: newFilePath } = await this.resolveArtifactPathCached(newPath);
            if (!oldFilePath || !newFilePath || oldArtifactId !== newArtifactId) {
                throw vscode.FileSystemError.NoPermissions(oldUri);
            }
            await this.renameFile(oldArtifactId, oldFilePath, newFilePath);
            const content = this._cache.get(oldPath);
            if (content) {
                this._cache.delete(oldPath);
                this._cache.set(newPath, content);
            }
            // Invalidate all caches for this artifact since the artifact content changed
            this.invalidateCache(oldArtifactId);
            this._emitter.fire([
                { type: vscode.FileChangeType.Deleted, uri: oldUri },
                { type: vscode.FileChangeType.Created, uri: newUri }
            ]);
        }
        catch (error) {
            console.error('Failed to rename file:', error);
            throw vscode.FileSystemError.Unavailable(oldUri);
        }
    }
    uriToPath(uri) {
        let path = uri.path;
        console.log('🔗 URI to Path conversion - Original URI:', uri.toString(), 'Scheme:', uri.scheme, 'Authority:', uri.authority, 'Path:', uri.path, 'Final path:', path);
        return path;
    }
    // Hypha API methods
    async getArtifact(artifactId) {
        console.log('🔍 Getting artifact:', artifactId);
        try {
            const artifactManager = await this.ensureArtifactManager();
            console.log('🔍 Artifact manager obtained, reading artifact');
            const artifact = await artifactManager.read({
                artifact_id: artifactId,
                _rkwargs: true
            });
            console.log('🔍 Artifact read successfully:', artifact?.manifest?.name || artifactId);
            return artifact;
        }
        catch (error) {
            console.error(`❌ Failed to get artifact ${artifactId}:`, error);
            return null;
        }
    }
    async listChildArtifacts(parentId) {
        // This method is now replaced by listChildArtifactsCached
        return this.listChildArtifactsCached(parentId);
    }
    async listFiles(artifactId, dirPath) {
        // This method is now replaced by listFilesCached
        return this.listFilesCached(artifactId, dirPath);
    }
    async getFileInfo(artifactId, filePath) {
        try {
            // Get the directory containing this file
            const dirPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';
            const fileName = filePath.includes('/') ? filePath.substring(filePath.lastIndexOf('/') + 1) : filePath;
            const files = await this.listFilesCached(artifactId, dirPath);
            return files.find(file => file.name === fileName) || null;
        }
        catch (error) {
            console.error(`Failed to get file info ${filePath} in artifact ${artifactId}:`, error);
            return null;
        }
    }
    async getFileContent(artifactId, filePath) {
        console.log('📥 Getting file content for:', filePath, 'in artifact:', artifactId);
        try {
            const artifactManager = await this.ensureArtifactManager();
            console.log('📥 Getting file URL from artifact manager');
            const url = await artifactManager.get_file({
                artifact_id: artifactId,
                file_path: filePath,
                version: 'stage',
                _rkwargs: true
            });
            console.log('📥 Fetching file content from URL');
            const response = await fetch(url);
            if (!response.ok) {
                console.log('❌ HTTP error:', response.status, response.statusText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const content = await response.text();
            console.log('📥 File content retrieved, size:', content.length, 'characters');
            return content;
        }
        catch (error) {
            // console.debug(`❌ Failed to get file content for ${filePath}:`, error);
            throw error;
        }
    }
    async saveFile(artifactId, filePath, content) {
        try {
            const artifactManager = await this.ensureArtifactManager();
            // await artifactManager.edit({
            //     artifact_id: artifactId,
            //     version: "latest",
            //     stage: true,
            //     _rkwargs: true
            // })
            const presignedUrl = await artifactManager.put_file({
                artifact_id: artifactId,
                file_path: filePath,
                _rkwargs: true
            });
            const response = await fetch(presignedUrl, {
                method: 'PUT',
                body: content,
                headers: {
                    'Content-Type': '' // important for s3
                }
            });
            // await artifactManager.commit({
            //     artifact_id: artifactId,
            //     _rkwargs: true
            // })
            if (!response.ok) {
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }
            console.log(`File saved: ${filePath}`);
        }
        catch (error) {
            console.error(`Failed to save file ${filePath}:`, error);
            throw error;
        }
    }
    async deleteFile(artifactId, filePath) {
        try {
            const artifactManager = await this.ensureArtifactManager();
            await artifactManager.remove_file({
                artifact_id: artifactId,
                file_path: filePath,
                _rkwargs: true
            });
            console.log(`File deleted: ${filePath}`);
        }
        catch (error) {
            console.error(`Failed to delete file ${filePath}:`, error);
            throw error;
        }
    }
    async renameFile(artifactId, oldPath, newPath) {
        try {
            const artifactManager = await this.ensureArtifactManager();
            // 1. Get file content from old path
            const url = await artifactManager.get_file({
                artifact_id: artifactId,
                file_path: oldPath,
                version: 'stage',
                _rkwargs: true
            });
            // 2. Fetch the content
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch file content for rename: ${response.statusText}`);
            }
            // 3. Get the content blob
            const contentBlob = await response.blob();
            // 4. Get presigned URL for new path
            const presignedUrl = await artifactManager.put_file({
                artifact_id: artifactId,
                file_path: newPath,
                _rkwargs: true
            });
            // 5. Upload content to new path
            const uploadResponse = await fetch(presignedUrl, {
                method: 'PUT',
                body: contentBlob,
                headers: {
                    'Content-Type': '' // important for s3
                }
            });
            if (!uploadResponse.ok) {
                throw new Error(`Upload of renamed file failed with status: ${uploadResponse.status}`);
            }
            // 6. Delete the old file
            await artifactManager.remove_file({
                artifact_id: artifactId,
                file_path: oldPath,
                _rkwargs: true
            });
            // 7. Add a small delay before returning to ensure server-side propagation
            await new Promise(resolve => setTimeout(resolve, 300));
            console.log(`File renamed from ${oldPath} to ${newPath}`);
        }
        catch (error) {
            console.error(`Failed to rename file from ${oldPath} to ${newPath}:`, error);
            throw error;
        }
    }
    async createChildArtifact(parentId, folderName) {
        try {
            const artifactManager = await this.ensureArtifactManager();
            await artifactManager.create({
                parent_id: parentId,
                alias: folderName,
                type: "project",
                manifest: {
                    name: folderName,
                    description: `Project folder: ${folderName}`,
                    version: "0.1.0",
                    type: "project"
                },
                _rkwargs: true
            });
            // Invalidate cache for parent artifact since it now has a new child
            this.invalidateCache(parentId);
            console.log(`Created child artifact: ${folderName}`);
        }
        catch (error) {
            console.error(`Failed to create child artifact ${folderName}:`, error);
            throw error;
        }
    }
}
exports.HyphaFileSystemProvider = HyphaFileSystemProvider;


/***/ }),

/***/ "vscode":
/*!*************************!*\
  !*** external "vscode" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("vscode");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/extension.ts");
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsMkRBQTJELElBQUk7QUFDL0Q7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxzQ0FBc0MsSUFBSTtBQUMxQztBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSwyREFBMkQsSUFBSTtBQUMvRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsMENBQTBDLEtBQUs7QUFDL0M7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsMkRBQTJELElBQUk7QUFDL0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDBDQUEwQyxLQUFLO0FBQy9DO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLDBDQUEwQyxLQUFLO0FBQy9DO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSwyREFBMkQsSUFBSTtBQUMvRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwwQ0FBMEMsS0FBSztBQUMvQztBQUNBO0FBQ0EsMkNBQTJDLEtBQUssU0FBUyxzQkFBc0I7QUFDL0U7QUFDQSxZQUFZLGNBQWM7QUFDMUI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsOEJBQThCLEtBQUssU0FBUyxzQkFBc0I7QUFDbEU7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0EsY0FBYyxjQUFjO0FBQzVCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFD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Q0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ04saURBQWlELFFBQVE7QUFDekQ7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0JBQWdCO0FBQ2hCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYLFFBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1gsVUFBVTtB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QUc7QUFDSDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUCxLQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLFdBQVcsUUFBUTtBQUNuQixhQUFhLFNBQVM7QUFDdEI7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxXQUFXLEtBQUs7QUFDaEIsYUFBYSxTQUFTO0FBQ3RCO0FB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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnQkFBZ0I7QUFDaEIsZ0JBQWdCO0FBQ2hCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5Q0FBeUM7QUFDekM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0NBQWdDO0FBQ2hDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2IsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDRCQUE0QixLQUFLLEVBQUU7QUFBQSxFQUFFO0FBQ3JDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHVDQUF1QztBQUN2QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnQ0FBZ0M7QUFDaEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsbUJBQW1CO0FBQ25CLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDs7QUFFQSxPQUFPOztBQUVQO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNkNBQTZDLDBCQUFtQixFQUFFLGlDQUFtQjs7QUFFckYsaUNBQW1CLEdBQUcsMEJBQW1CO0FBQ3pDLHFCQUFxQixpQ0FBbUIsR0FBRywwQkFBbUI7QUFDOUQ7QUFDQTtBQUNBO0FBQ0Esc0JBQXNCO0FBQ3RCLHdFQUF3RSxpQ0FBbUI7QUFDM0YsNEVBQTRFLGlDQUFtQjtBQUMvRix1RUFBdUUsaUNBQW1CO0FBQzFGLCtFQUErRSxpQ0FBbUI7Ozs7O0FBS2xHO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseUNBQXlDO0FBQ3pDLGtDQUFrQztBQUNsQyxtQ0FBbUM7QUFDbkMsNENBQTRDO0FBQzVDLG1DQUFtQztBQUNuQyx1Q0FBdUM7QUFDdkMsMENBQTBDO0FBQzFDLDhDQUE4QztBQUM5QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFDQUFxQyxxQkFBcUIsMEZBQTBGLHFCQUFxQjtBQUN6SztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw0Q0FBNEMsc0JBQXNCO0FBQ2xFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHdDQUF3QyxvQkFBb0I7QUFDNUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esd0NBQXdDLG9CQUFvQjtBQUM1RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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LEVBQUUsUUFBUTtnQkFDbkIsS0FBSyxFQUFFLFVBQVU7Z0JBQ2pCLElBQUksRUFBRSxTQUFTO2dCQUNmLFFBQVEsRUFBRTtvQkFDTixJQUFJLEVBQUUsVUFBVTtvQkFDaEIsV0FBVyxFQUFFLG1CQUFtQixVQUFVLEVBQUU7b0JBQzVDLE9BQU8sRUFBRSxPQUFPO29CQUNoQixJQUFJLEVBQUUsU0FBUztpQkFDbEI7Z0JBQ0QsUUFBUSxFQUFFLElBQUk7YUFDakIsQ0FBQyxDQUFDO1lBRUgsb0VBQW9FO1lBQ3BFLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFL0IsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsVUFBVSxFQUFFLENBQUMsQ0FBQztTQUN4RDtRQUFDLE9BQU8sS0FBSyxFQUFFO1lBQ1osT0FBTyxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsVUFBVSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdkUsTUFBTSxLQUFLLENBQUM7U0FDZjtJQUNMLENBQUM7Q0FDSjtBQW43QkQsMERBbTdCQzs7Ozs7Ozs7Ozs7O0FDNzlCRDs7Ozs7O1VDQUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTs7VUFFQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTs7OztVRXRCQTtVQUNBO1VBQ0E7VUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL3N2YW1wLXN0dWRpby8uL25vZGVfbW9kdWxlcy9oeXBoYS1ycGMvZGlzdC9oeXBoYS1ycGMtd2Vic29ja2V0LmpzIiwid2VicGFjazovL3N2YW1wLXN0dWRpby8uL25vZGVfbW9kdWxlcy9oeXBoYS1ycGMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vc3ZhbXAtc3R1ZGlvLy4vc3JjL2NvbXBvbmVudHMvV2VsY29tZVBhZ2UudHMiLCJ3ZWJwYWNrOi8vc3ZhbXAtc3R1ZGlvLy4vc3JjL2V4dGVuc2lvbi50cyIsIndlYnBhY2s6Ly9zdmFtcC1zdHVkaW8vLi9zcmMvcHJvdmlkZXJzL0h5cGhhQXV0aFByb3ZpZGVyLnRzIiwid2VicGFjazovL3N2YW1wLXN0dWRpby8uL3NyYy9wcm92aWRlcnMvSHlwaGFGaWxlU3lzdGVtUHJvdmlkZXIudHMiLCJ3ZWJwYWNrOi8vc3ZhbXAtc3R1ZGlvL2V4dGVybmFsIGNvbW1vbmpzIFwidnNjb2RlXCIiLCJ3ZWJwYWNrOi8vc3ZhbXAtc3R1ZGlvL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3N2YW1wLXN0dWRpby93ZWJwYWNrL2JlZm9yZS1zdGFydHVwIiwid2VicGFjazovL3N2YW1wLXN0dWRpby93ZWJwYWNrL3N0YXJ0dXAiLCJ3ZWJwYWNrOi8vc3ZhbXAtc3R1ZGlvL3dlYnBhY2svYWZ0ZXItc3RhcnR1cCJdLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gd2VicGFja1VuaXZlcnNhbE1vZHVsZURlZmluaXRpb24ocm9vdCwgZmFjdG9yeSkge1xuXHRpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcpXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG5cdGVsc2UgaWYodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKVxuXHRcdGRlZmluZShcImh5cGhhV2Vic29ja2V0Q2xpZW50XCIsIFtdLCBmYWN0b3J5KTtcblx0ZWxzZSBpZih0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpXG5cdFx0ZXhwb3J0c1tcImh5cGhhV2Vic29ja2V0Q2xpZW50XCJdID0gZmFjdG9yeSgpO1xuXHRlbHNlXG5cdFx0cm9vdFtcImh5cGhhV2Vic29ja2V0Q2xpZW50XCJdID0gZmFjdG9yeSgpO1xufSkodGhpcywgKCkgPT4ge1xucmV0dXJuIC8qKioqKiovICgoKSA9PiB7IC8vIHdlYnBhY2tCb290c3RyYXBcbi8qKioqKiovIFx0XCJ1c2Ugc3RyaWN0XCI7XG4vKioqKioqLyBcdHZhciBfX3dlYnBhY2tfbW9kdWxlc19fID0gKHtcblxuLyoqKi8gXCIuL3NyYy9ycGMuanNcIjpcbi8qISoqKioqKioqKioqKioqKioqKioqISpcXFxuICAhKioqIC4vc3JjL3JwYy5qcyAqKiohXG4gIFxcKioqKioqKioqKioqKioqKioqKiovXG4vKioqLyAoKF9fdW51c2VkX3dlYnBhY2tfbW9kdWxlLCBfX3dlYnBhY2tfZXhwb3J0c19fLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSA9PiB7XG5cbl9fd2VicGFja19yZXF1aXJlX18ucihfX3dlYnBhY2tfZXhwb3J0c19fKTtcbi8qIGhhcm1vbnkgZXhwb3J0ICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCB7XG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIEFQSV9WRVJTSU9OOiAoKSA9PiAoLyogYmluZGluZyAqLyBBUElfVkVSU0lPTiksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIFJQQzogKCkgPT4gKC8qIGJpbmRpbmcgKi8gUlBDKVxuLyogaGFybW9ueSBleHBvcnQgKi8gfSk7XG4vKiBoYXJtb255IGltcG9ydCAqLyB2YXIgX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL3V0aWxzICovIFwiLi9zcmMvdXRpbHMvaW5kZXguanNcIik7XG4vKiBoYXJtb255IGltcG9ydCAqLyB2YXIgX3V0aWxzX3NjaGVtYV9fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgLi91dGlscy9zY2hlbWEgKi8gXCIuL3NyYy91dGlscy9zY2hlbWEuanNcIik7XG4vKiBoYXJtb255IGltcG9ydCAqLyB2YXIgX21zZ3BhY2tfbXNncGFja19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgQG1zZ3BhY2svbXNncGFjayAqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL2RlY29kZS5tanNcIik7XG4vKiBoYXJtb255IGltcG9ydCAqLyB2YXIgX21zZ3BhY2tfbXNncGFja19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfM19fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgQG1zZ3BhY2svbXNncGFjayAqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL2VuY29kZS5tanNcIik7XG4vKipcbiAqIENvbnRhaW5zIHRoZSBSUEMgb2JqZWN0IHVzZWQgYm90aCBieSB0aGUgYXBwbGljYXRpb25cbiAqIHNpdGUsIGFuZCBieSBlYWNoIHBsdWdpblxuICovXG5cblxuXG5cblxuY29uc3QgQVBJX1ZFUlNJT04gPSAzO1xuY29uc3QgQ0hVTktfU0laRSA9IDEwMjQgKiAyNTY7XG5jb25zdCBDT05DVVJSRU5DWV9MSU1JVCA9IDMwO1xuXG5jb25zdCBBcnJheUJ1ZmZlclZpZXcgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoXG4gIE9iamVjdC5nZXRQcm90b3R5cGVPZihuZXcgVWludDhBcnJheSgpKSxcbikuY29uc3RydWN0b3I7XG5cbmZ1bmN0aW9uIF9hcHBlbmRCdWZmZXIoYnVmZmVyMSwgYnVmZmVyMikge1xuICBjb25zdCB0bXAgPSBuZXcgVWludDhBcnJheShidWZmZXIxLmJ5dGVMZW5ndGggKyBidWZmZXIyLmJ5dGVMZW5ndGgpO1xuICB0bXAuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZmZlcjEpLCAwKTtcbiAgdG1wLnNldChuZXcgVWludDhBcnJheShidWZmZXIyKSwgYnVmZmVyMS5ieXRlTGVuZ3RoKTtcbiAgcmV0dXJuIHRtcC5idWZmZXI7XG59XG5cbmZ1bmN0aW9uIGluZGV4T2JqZWN0KG9iaiwgaXMpIHtcbiAgaWYgKCFpcykgdGhyb3cgbmV3IEVycm9yKFwidW5kZWZpbmVkIGluZGV4XCIpO1xuICBpZiAodHlwZW9mIGlzID09PSBcInN0cmluZ1wiKSByZXR1cm4gaW5kZXhPYmplY3Qob2JqLCBpcy5zcGxpdChcIi5cIikpO1xuICBlbHNlIGlmIChpcy5sZW5ndGggPT09IDApIHJldHVybiBvYmo7XG4gIGVsc2UgcmV0dXJuIGluZGV4T2JqZWN0KG9ialtpc1swXV0sIGlzLnNsaWNlKDEpKTtcbn1cblxuZnVuY3Rpb24gX2dldF9zY2hlbWEob2JqLCBuYW1lID0gbnVsbCwgc2tpcENvbnRleHQgPSBmYWxzZSkge1xuICBpZiAoQXJyYXkuaXNBcnJheShvYmopKSB7XG4gICAgcmV0dXJuIG9iai5tYXAoKHYsIGkpID0+IF9nZXRfc2NoZW1hKHYsIG51bGwsIHNraXBDb250ZXh0KSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG9iaiA9PT0gXCJvYmplY3RcIiAmJiBvYmogIT09IG51bGwpIHtcbiAgICBsZXQgc2NoZW1hID0ge307XG4gICAgZm9yIChsZXQgayBpbiBvYmopIHtcbiAgICAgIHNjaGVtYVtrXSA9IF9nZXRfc2NoZW1hKG9ialtrXSwgaywgc2tpcENvbnRleHQpO1xuICAgIH1cbiAgICByZXR1cm4gc2NoZW1hO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBvYmogPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGlmIChvYmouX19zY2hlbWFfXykge1xuICAgICAgY29uc3Qgc2NoZW1hID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShvYmouX19zY2hlbWFfXykpO1xuICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgc2NoZW1hLm5hbWUgPSBuYW1lO1xuICAgICAgICBvYmouX19zY2hlbWFfXy5uYW1lID0gbmFtZTtcbiAgICAgIH1cbiAgICAgIGlmIChza2lwQ29udGV4dCkge1xuICAgICAgICBpZiAoc2NoZW1hLnBhcmFtZXRlcnMgJiYgc2NoZW1hLnBhcmFtZXRlcnMucHJvcGVydGllcykge1xuICAgICAgICAgIGRlbGV0ZSBzY2hlbWEucGFyYW1ldGVycy5wcm9wZXJ0aWVzW1wiY29udGV4dFwiXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHsgdHlwZTogXCJmdW5jdGlvblwiLCBmdW5jdGlvbjogc2NoZW1hIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB7IHR5cGU6IFwiZnVuY3Rpb25cIiB9O1xuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlb2Ygb2JqID09PSBcIm51bWJlclwiKSB7XG4gICAgcmV0dXJuIHsgdHlwZTogXCJudW1iZXJcIiB9O1xuICB9IGVsc2UgaWYgKHR5cGVvZiBvYmogPT09IFwic3RyaW5nXCIpIHtcbiAgICByZXR1cm4geyB0eXBlOiBcInN0cmluZ1wiIH07XG4gIH0gZWxzZSBpZiAodHlwZW9mIG9iaiA9PT0gXCJib29sZWFuXCIpIHtcbiAgICByZXR1cm4geyB0eXBlOiBcImJvb2xlYW5cIiB9O1xuICB9IGVsc2UgaWYgKG9iaiA9PT0gbnVsbCkge1xuICAgIHJldHVybiB7IHR5cGU6IFwibnVsbFwiIH07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG59XG5cbmZ1bmN0aW9uIF9hbm5vdGF0ZV9zZXJ2aWNlKHNlcnZpY2UsIHNlcnZpY2VUeXBlSW5mbykge1xuICBmdW5jdGlvbiB2YWxpZGF0ZUtleXMoc2VydmljZURpY3QsIHNjaGVtYURpY3QsIHBhdGggPSBcInJvb3RcIikge1xuICAgIC8vIFZhbGlkYXRlIHRoYXQgYWxsIGtleXMgaW4gc2NoZW1hRGljdCBleGlzdCBpbiBzZXJ2aWNlRGljdFxuICAgIGZvciAobGV0IGtleSBpbiBzY2hlbWFEaWN0KSB7XG4gICAgICBpZiAoIXNlcnZpY2VEaWN0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGtleSAnJHtrZXl9JyBpbiBzZXJ2aWNlIGF0IHBhdGggJyR7cGF0aH0nYCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGFueSB1bmV4cGVjdGVkIGtleXMgaW4gc2VydmljZURpY3RcbiAgICBmb3IgKGxldCBrZXkgaW4gc2VydmljZURpY3QpIHtcbiAgICAgIGlmIChrZXkgIT09IFwidHlwZVwiICYmICFzY2hlbWFEaWN0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIGtleSAnJHtrZXl9JyBpbiBzZXJ2aWNlIGF0IHBhdGggJyR7cGF0aH0nYCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYW5ub3RhdGVSZWN1cnNpdmUobmV3U2VydmljZSwgc2NoZW1hSW5mbywgcGF0aCA9IFwicm9vdFwiKSB7XG4gICAgaWYgKHR5cGVvZiBuZXdTZXJ2aWNlID09PSBcIm9iamVjdFwiICYmICFBcnJheS5pc0FycmF5KG5ld1NlcnZpY2UpKSB7XG4gICAgICB2YWxpZGF0ZUtleXMobmV3U2VydmljZSwgc2NoZW1hSW5mbywgcGF0aCk7XG4gICAgICBmb3IgKGxldCBrIGluIG5ld1NlcnZpY2UpIHtcbiAgICAgICAgbGV0IHYgPSBuZXdTZXJ2aWNlW2tdO1xuICAgICAgICBsZXQgbmV3UGF0aCA9IGAke3BhdGh9LiR7a31gO1xuICAgICAgICBpZiAodHlwZW9mIHYgPT09IFwib2JqZWN0XCIgJiYgIUFycmF5LmlzQXJyYXkodikpIHtcbiAgICAgICAgICBhbm5vdGF0ZVJlY3Vyc2l2ZSh2LCBzY2hlbWFJbmZvW2tdLCBuZXdQYXRoKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgaWYgKHNjaGVtYUluZm8uaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICAgIG5ld1NlcnZpY2Vba10gPSAoMCxfdXRpbHNfc2NoZW1hX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18uc2NoZW1hRnVuY3Rpb24pKHYsIHtcbiAgICAgICAgICAgICAgbmFtZTogc2NoZW1hSW5mb1trXVtcIm5hbWVcIl0sXG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBzY2hlbWFJbmZvW2tdLmRlc2NyaXB0aW9uIHx8IFwiXCIsXG4gICAgICAgICAgICAgIHBhcmFtZXRlcnM6IHNjaGVtYUluZm9ba11bXCJwYXJhbWV0ZXJzXCJdLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgYE1pc3Npbmcgc2NoZW1hIGZvciBmdW5jdGlvbiAnJHtrfScgYXQgcGF0aCAnJHtuZXdQYXRofSdgLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkobmV3U2VydmljZSkpIHtcbiAgICAgIGlmIChuZXdTZXJ2aWNlLmxlbmd0aCAhPT0gc2NoZW1hSW5mby5sZW5ndGgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBMZW5ndGggbWlzbWF0Y2ggYXQgcGF0aCAnJHtwYXRofSdgKTtcbiAgICAgIH1cbiAgICAgIG5ld1NlcnZpY2UuZm9yRWFjaCgodiwgaSkgPT4ge1xuICAgICAgICBsZXQgbmV3UGF0aCA9IGAke3BhdGh9WyR7aX1dYDtcbiAgICAgICAgaWYgKHR5cGVvZiB2ID09PSBcIm9iamVjdFwiICYmICFBcnJheS5pc0FycmF5KHYpKSB7XG4gICAgICAgICAgYW5ub3RhdGVSZWN1cnNpdmUodiwgc2NoZW1hSW5mb1tpXSwgbmV3UGF0aCk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHYgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgIGlmIChzY2hlbWFJbmZvLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgICAgICBuZXdTZXJ2aWNlW2ldID0gKDAsX3V0aWxzX3NjaGVtYV9fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLnNjaGVtYUZ1bmN0aW9uKSh2LCB7XG4gICAgICAgICAgICAgIG5hbWU6IHNjaGVtYUluZm9baV1bXCJuYW1lXCJdLFxuICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogc2NoZW1hSW5mb1tpXS5kZXNjcmlwdGlvbiB8fCBcIlwiLFxuICAgICAgICAgICAgICBwYXJhbWV0ZXJzOiBzY2hlbWFJbmZvW2ldW1wicGFyYW1ldGVyc1wiXSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgIGBNaXNzaW5nIHNjaGVtYSBmb3IgZnVuY3Rpb24gYXQgaW5kZXggJHtpfSBpbiBwYXRoICcke25ld1BhdGh9J2AsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgdmFsaWRhdGVLZXlzKHNlcnZpY2UsIHNlcnZpY2VUeXBlSW5mb1tcImRlZmluaXRpb25cIl0pO1xuICBhbm5vdGF0ZVJlY3Vyc2l2ZShzZXJ2aWNlLCBzZXJ2aWNlVHlwZUluZm9bXCJkZWZpbml0aW9uXCJdKTtcbiAgcmV0dXJuIHNlcnZpY2U7XG59XG5cbmZ1bmN0aW9uIGdldEZ1bmN0aW9uSW5mbyhmdW5jKSB7XG4gIGNvbnN0IGZ1bmNTdHJpbmcgPSBmdW5jLnRvU3RyaW5nKCk7XG5cbiAgLy8gRXh0cmFjdCBmdW5jdGlvbiBuYW1lXG4gIGNvbnN0IG5hbWVNYXRjaCA9IGZ1bmNTdHJpbmcubWF0Y2goL2Z1bmN0aW9uXFxzKihcXHcqKS8pO1xuICBjb25zdCBuYW1lID0gKG5hbWVNYXRjaCAmJiBuYW1lTWF0Y2hbMV0pIHx8IFwiXCI7XG5cbiAgLy8gRXh0cmFjdCBmdW5jdGlvbiBwYXJhbWV0ZXJzLCBleGNsdWRpbmcgY29tbWVudHNcbiAgY29uc3QgcGFyYW1zTWF0Y2ggPSBmdW5jU3RyaW5nLm1hdGNoKC9cXCgoW14pXSopXFwpLyk7XG4gIGxldCBwYXJhbXMgPSBcIlwiO1xuICBpZiAocGFyYW1zTWF0Y2gpIHtcbiAgICBwYXJhbXMgPSBwYXJhbXNNYXRjaFsxXVxuICAgICAgLnNwbGl0KFwiLFwiKVxuICAgICAgLm1hcCgocCkgPT5cbiAgICAgICAgcFxuICAgICAgICAgIC5yZXBsYWNlKC9cXC9cXCouKj9cXCpcXC8vZywgXCJcIikgLy8gUmVtb3ZlIGJsb2NrIGNvbW1lbnRzXG4gICAgICAgICAgLnJlcGxhY2UoL1xcL1xcLy4qJC9nLCBcIlwiKSxcbiAgICAgICkgLy8gUmVtb3ZlIGxpbmUgY29tbWVudHNcbiAgICAgIC5maWx0ZXIoKHApID0+IHAudHJpbSgpLmxlbmd0aCA+IDApIC8vIFJlbW92ZSBlbXB0eSBzdHJpbmdzIGFmdGVyIHJlbW92aW5nIGNvbW1lbnRzXG4gICAgICAubWFwKChwKSA9PiBwLnRyaW0oKSkgLy8gVHJpbSByZW1haW5pbmcgd2hpdGVzcGFjZVxuICAgICAgLmpvaW4oXCIsIFwiKTtcbiAgfVxuXG4gIC8vIEV4dHJhY3QgZnVuY3Rpb24gZG9jc3RyaW5nIChibG9jayBjb21tZW50KVxuICBsZXQgZG9jTWF0Y2ggPSBmdW5jU3RyaW5nLm1hdGNoKC9cXClcXHMqXFx7XFxzKlxcL1xcKihbXFxzXFxTXSo/KVxcKlxcLy8pO1xuICBjb25zdCBkb2NzdHJpbmdCbG9jayA9IChkb2NNYXRjaCAmJiBkb2NNYXRjaFsxXS50cmltKCkpIHx8IFwiXCI7XG5cbiAgLy8gRXh0cmFjdCBmdW5jdGlvbiBkb2NzdHJpbmcgKGxpbmUgY29tbWVudClcbiAgZG9jTWF0Y2ggPSBmdW5jU3RyaW5nLm1hdGNoKC9cXClcXHMqXFx7XFxzKihcXC9cXC9bXFxzXFxTXSo/KVxcblxccypbXlxcc1xcL10vKTtcbiAgY29uc3QgZG9jc3RyaW5nTGluZSA9XG4gICAgKGRvY01hdGNoICYmXG4gICAgICBkb2NNYXRjaFsxXVxuICAgICAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAgICAgLm1hcCgocykgPT4gcy5yZXBsYWNlKC9eXFwvXFwvXFxzKi8sIFwiXCIpLnRyaW0oKSlcbiAgICAgICAgLmpvaW4oXCJcXG5cIikpIHx8XG4gICAgXCJcIjtcblxuICBjb25zdCBkb2NzdHJpbmcgPSBkb2NzdHJpbmdCbG9jayB8fCBkb2NzdHJpbmdMaW5lO1xuICByZXR1cm4gKFxuICAgIG5hbWUgJiZcbiAgICBwYXJhbXMubGVuZ3RoID4gMCAmJiB7XG4gICAgICBuYW1lOiBuYW1lLFxuICAgICAgc2lnOiBwYXJhbXMsXG4gICAgICBkb2M6IGRvY3N0cmluZyxcbiAgICB9XG4gICk7XG59XG5cbmZ1bmN0aW9uIGNvbmNhdEFycmF5QnVmZmVycyhidWZmZXJzKSB7XG4gIHZhciBidWZmZXJzTGVuZ3RocyA9IGJ1ZmZlcnMubWFwKGZ1bmN0aW9uIChiKSB7XG4gICAgICByZXR1cm4gYi5ieXRlTGVuZ3RoO1xuICAgIH0pLFxuICAgIHRvdGFsQnVmZmVybGVuZ3RoID0gYnVmZmVyc0xlbmd0aHMucmVkdWNlKGZ1bmN0aW9uIChwLCBjKSB7XG4gICAgICByZXR1cm4gcCArIGM7XG4gICAgfSwgMCksXG4gICAgdW5pdDhBcnIgPSBuZXcgVWludDhBcnJheSh0b3RhbEJ1ZmZlcmxlbmd0aCk7XG4gIGJ1ZmZlcnNMZW5ndGhzLnJlZHVjZShmdW5jdGlvbiAocCwgYywgaSkge1xuICAgIHVuaXQ4QXJyLnNldChuZXcgVWludDhBcnJheShidWZmZXJzW2ldKSwgcCk7XG4gICAgcmV0dXJuIHAgKyBjO1xuICB9LCAwKTtcbiAgcmV0dXJuIHVuaXQ4QXJyLmJ1ZmZlcjtcbn1cblxuY2xhc3MgVGltZXIge1xuICBjb25zdHJ1Y3Rvcih0aW1lb3V0LCBjYWxsYmFjaywgYXJncywgbGFiZWwpIHtcbiAgICB0aGlzLl90aW1lb3V0ID0gdGltZW91dDtcbiAgICB0aGlzLl9jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIHRoaXMuX2FyZ3MgPSBhcmdzO1xuICAgIHRoaXMuX2xhYmVsID0gbGFiZWwgfHwgXCJ0aW1lclwiO1xuICAgIHRoaXMuX3Rhc2sgPSBudWxsO1xuICAgIHRoaXMuc3RhcnRlZCA9IGZhbHNlO1xuICB9XG5cbiAgc3RhcnQoKSB7XG4gICAgaWYgKHRoaXMuc3RhcnRlZCkge1xuICAgICAgdGhpcy5yZXNldCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl90YXNrID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMuX2NhbGxiYWNrLmFwcGx5KHRoaXMsIHRoaXMuX2FyZ3MpO1xuICAgICAgfSwgdGhpcy5fdGltZW91dCAqIDEwMDApO1xuICAgICAgdGhpcy5zdGFydGVkID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBjbGVhcigpIHtcbiAgICBpZiAodGhpcy5fdGFzayAmJiB0aGlzLnN0YXJ0ZWQpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLl90YXNrKTtcbiAgICAgIHRoaXMuX3Rhc2sgPSBudWxsO1xuICAgICAgdGhpcy5zdGFydGVkID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybihgQ2xlYXJpbmcgYSB0aW1lciAoJHt0aGlzLl9sYWJlbH0pIHdoaWNoIGlzIG5vdCBzdGFydGVkYCk7XG4gICAgfVxuICB9XG5cbiAgcmVzZXQoKSB7XG4gICAgaWYgKHRoaXMuX3Rhc2spIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLl90YXNrKTtcbiAgICB9XG4gICAgdGhpcy5fdGFzayA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5fY2FsbGJhY2suYXBwbHkodGhpcywgdGhpcy5fYXJncyk7XG4gICAgfSwgdGhpcy5fdGltZW91dCAqIDEwMDApO1xuICAgIHRoaXMuc3RhcnRlZCA9IHRydWU7XG4gIH1cbn1cblxuY2xhc3MgUmVtb3RlU2VydmljZSBleHRlbmRzIE9iamVjdCB7fVxuXG4vKipcbiAqIFJQQyBvYmplY3QgcmVwcmVzZW50cyBhIHNpbmdsZSBzaXRlIGluIHRoZVxuICogY29tbXVuaWNhdGlvbiBwcm90b2NvbCBiZXR3ZWVuIHRoZSBhcHBsaWNhdGlvbiBhbmQgdGhlIHBsdWdpblxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25uZWN0aW9uIGEgc3BlY2lhbCBvYmplY3QgYWxsb3dpbmcgdG8gc2VuZFxuICogYW5kIHJlY2VpdmUgbWVzc2FnZXMgZnJvbSB0aGUgb3Bwb3NpdGUgc2l0ZSAoYmFzaWNhbGx5IGl0XG4gKiBzaG91bGQgb25seSBwcm92aWRlIHNlbmQoKSBhbmQgb25NZXNzYWdlKCkgbWV0aG9kcylcbiAqL1xuY2xhc3MgUlBDIGV4dGVuZHMgX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uTWVzc2FnZUVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihcbiAgICBjb25uZWN0aW9uLFxuICAgIHtcbiAgICAgIGNsaWVudF9pZCA9IG51bGwsXG4gICAgICBkZWZhdWx0X2NvbnRleHQgPSBudWxsLFxuICAgICAgbmFtZSA9IG51bGwsXG4gICAgICBjb2RlY3MgPSBudWxsLFxuICAgICAgbWV0aG9kX3RpbWVvdXQgPSBudWxsLFxuICAgICAgbWF4X21lc3NhZ2VfYnVmZmVyX3NpemUgPSAwLFxuICAgICAgZGVidWcgPSBmYWxzZSxcbiAgICAgIHdvcmtzcGFjZSA9IG51bGwsXG4gICAgICBzaWxlbnQgPSBmYWxzZSxcbiAgICAgIGFwcF9pZCA9IG51bGwsXG4gICAgICBzZXJ2ZXJfYmFzZV91cmwgPSBudWxsLFxuICAgICAgbG9uZ19tZXNzYWdlX2NodW5rX3NpemUgPSBudWxsLFxuICAgIH0sXG4gICkge1xuICAgIHN1cGVyKGRlYnVnKTtcbiAgICB0aGlzLl9jb2RlY3MgPSBjb2RlY3MgfHwge307XG4gICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KShjbGllbnRfaWQgJiYgdHlwZW9mIGNsaWVudF9pZCA9PT0gXCJzdHJpbmdcIik7XG4gICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KShjbGllbnRfaWQsIFwiY2xpZW50X2lkIGlzIHJlcXVpcmVkXCIpO1xuICAgIHRoaXMuX2NsaWVudF9pZCA9IGNsaWVudF9pZDtcbiAgICB0aGlzLl9uYW1lID0gbmFtZTtcbiAgICB0aGlzLl9hcHBfaWQgPSBhcHBfaWQgfHwgXCIqXCI7XG4gICAgdGhpcy5fbG9jYWxfd29ya3NwYWNlID0gd29ya3NwYWNlO1xuICAgIHRoaXMuX3NpbGVudCA9IHNpbGVudDtcbiAgICB0aGlzLmRlZmF1bHRfY29udGV4dCA9IGRlZmF1bHRfY29udGV4dCB8fCB7fTtcbiAgICB0aGlzLl9tZXRob2RfYW5ub3RhdGlvbnMgPSBuZXcgV2Vha01hcCgpO1xuICAgIHRoaXMuX21heF9tZXNzYWdlX2J1ZmZlcl9zaXplID0gbWF4X21lc3NhZ2VfYnVmZmVyX3NpemU7XG4gICAgdGhpcy5fY2h1bmtfc3RvcmUgPSB7fTtcbiAgICB0aGlzLl9tZXRob2RfdGltZW91dCA9IG1ldGhvZF90aW1lb3V0IHx8IDMwO1xuICAgIHRoaXMuX3NlcnZlcl9iYXNlX3VybCA9IHNlcnZlcl9iYXNlX3VybDtcbiAgICB0aGlzLl9sb25nX21lc3NhZ2VfY2h1bmtfc2l6ZSA9IGxvbmdfbWVzc2FnZV9jaHVua19zaXplIHx8IENIVU5LX1NJWkU7XG5cbiAgICAvLyBtYWtlIHN1cmUgdGhlcmUgaXMgYW4gZXhlY3V0ZSBmdW5jdGlvblxuICAgIHRoaXMuX3NlcnZpY2VzID0ge307XG4gICAgdGhpcy5fb2JqZWN0X3N0b3JlID0ge1xuICAgICAgc2VydmljZXM6IHRoaXMuX3NlcnZpY2VzLFxuICAgIH07XG5cbiAgICBpZiAoY29ubmVjdGlvbikge1xuICAgICAgdGhpcy5hZGRfc2VydmljZSh7XG4gICAgICAgIGlkOiBcImJ1aWx0LWluXCIsXG4gICAgICAgIHR5cGU6IFwiYnVpbHQtaW5cIixcbiAgICAgICAgbmFtZTogYEJ1aWx0LWluIHNlcnZpY2VzIGZvciAke3RoaXMuX2xvY2FsX3dvcmtzcGFjZX0vJHt0aGlzLl9jbGllbnRfaWR9YCxcbiAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgcmVxdWlyZV9jb250ZXh0OiB0cnVlLFxuICAgICAgICAgIHZpc2liaWxpdHk6IFwicHVibGljXCIsXG4gICAgICAgICAgYXBpX3ZlcnNpb246IEFQSV9WRVJTSU9OLFxuICAgICAgICB9LFxuICAgICAgICBwaW5nOiB0aGlzLl9waW5nLmJpbmQodGhpcyksXG4gICAgICAgIGdldF9zZXJ2aWNlOiB0aGlzLmdldF9sb2NhbF9zZXJ2aWNlLmJpbmQodGhpcyksXG4gICAgICAgIG1lc3NhZ2VfY2FjaGU6IHtcbiAgICAgICAgICBjcmVhdGU6IHRoaXMuX2NyZWF0ZV9tZXNzYWdlLmJpbmQodGhpcyksXG4gICAgICAgICAgYXBwZW5kOiB0aGlzLl9hcHBlbmRfbWVzc2FnZS5iaW5kKHRoaXMpLFxuICAgICAgICAgIHNldDogdGhpcy5fc2V0X21lc3NhZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgICBwcm9jZXNzOiB0aGlzLl9wcm9jZXNzX21lc3NhZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgICByZW1vdmU6IHRoaXMuX3JlbW92ZV9tZXNzYWdlLmJpbmQodGhpcyksXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICAgIHRoaXMub24oXCJtZXRob2RcIiwgdGhpcy5faGFuZGxlX21ldGhvZC5iaW5kKHRoaXMpKTtcbiAgICAgIHRoaXMub24oXCJlcnJvclwiLCBjb25zb2xlLmVycm9yKTtcblxuICAgICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KShjb25uZWN0aW9uLmVtaXRfbWVzc2FnZSAmJiBjb25uZWN0aW9uLm9uX21lc3NhZ2UpO1xuICAgICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KShcbiAgICAgICAgY29ubmVjdGlvbi5tYW5hZ2VyX2lkICE9PSB1bmRlZmluZWQsXG4gICAgICAgIFwiQ29ubmVjdGlvbiBtdXN0IGhhdmUgbWFuYWdlcl9pZFwiLFxuICAgICAgKTtcbiAgICAgIHRoaXMuX2VtaXRfbWVzc2FnZSA9IGNvbm5lY3Rpb24uZW1pdF9tZXNzYWdlLmJpbmQoY29ubmVjdGlvbik7XG4gICAgICBjb25uZWN0aW9uLm9uX21lc3NhZ2UodGhpcy5fb25fbWVzc2FnZS5iaW5kKHRoaXMpKTtcbiAgICAgIHRoaXMuX2Nvbm5lY3Rpb24gPSBjb25uZWN0aW9uO1xuICAgICAgY29uc3Qgb25Db25uZWN0ZWQgPSBhc3luYyAoY29ubmVjdGlvbkluZm8pID0+IHtcbiAgICAgICAgaWYgKCF0aGlzLl9zaWxlbnQgJiYgdGhpcy5fY29ubmVjdGlvbi5tYW5hZ2VyX2lkKSB7XG4gICAgICAgICAgY29uc29sZS5kZWJ1ZyhcIkNvbm5lY3Rpb24gZXN0YWJsaXNoZWQsIHJlcG9ydGluZyBzZXJ2aWNlcy4uLlwiKTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgbWFuYWdlciA9IGF3YWl0IHRoaXMuZ2V0X21hbmFnZXJfc2VydmljZSh7XG4gICAgICAgICAgICAgIHRpbWVvdXQ6IDEwLFxuICAgICAgICAgICAgICBjYXNlX2NvbnZlcnNpb246IFwiY2FtZWxcIixcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc3Qgc2VydmljZXMgPSBPYmplY3QudmFsdWVzKHRoaXMuX3NlcnZpY2VzKTtcbiAgICAgICAgICAgIGNvbnN0IHNlcnZpY2VzQ291bnQgPSBzZXJ2aWNlcy5sZW5ndGg7XG4gICAgICAgICAgICBsZXQgcmVnaXN0ZXJlZENvdW50ID0gMDtcblxuICAgICAgICAgICAgZm9yIChsZXQgc2VydmljZSBvZiBzZXJ2aWNlcykge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlcnZpY2VJbmZvID0gdGhpcy5fZXh0cmFjdF9zZXJ2aWNlX2luZm8oc2VydmljZSk7XG4gICAgICAgICAgICAgICAgYXdhaXQgbWFuYWdlci5yZWdpc3RlclNlcnZpY2Uoc2VydmljZUluZm8pO1xuICAgICAgICAgICAgICAgIHJlZ2lzdGVyZWRDb3VudCsrO1xuICAgICAgICAgICAgICB9IGNhdGNoIChzZXJ2aWNlRXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICAgICAgICAgYEZhaWxlZCB0byByZWdpc3RlciBzZXJ2aWNlICR7c2VydmljZS5pZCB8fCBcInVua25vd25cIn06ICR7c2VydmljZUVycm9yfWAsXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocmVnaXN0ZXJlZENvdW50ID09PSBzZXJ2aWNlc0NvdW50KSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcbiAgICAgICAgICAgICAgICBgU3VjY2Vzc2Z1bGx5IHJlZ2lzdGVyZWQgYWxsICR7cmVnaXN0ZXJlZENvdW50fSBzZXJ2aWNlcyB3aXRoIHRoZSBzZXJ2ZXJgLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgICAgIGBPbmx5IHJlZ2lzdGVyZWQgJHtyZWdpc3RlcmVkQ291bnR9IG91dCBvZiAke3NlcnZpY2VzQ291bnR9IHNlcnZpY2VzIHdpdGggdGhlIHNlcnZlcmAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAobWFuYWdlckVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICAgICBgRmFpbGVkIHRvIGdldCBtYW5hZ2VyIHNlcnZpY2UgZm9yIHJlZ2lzdGVyaW5nIHNlcnZpY2VzOiAke21hbmFnZXJFcnJvcn1gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gY29uc29sZS5kZWJ1ZyhcIkNvbm5lY3Rpb24gZXN0YWJsaXNoZWRcIiwgY29ubmVjdGlvbkluZm8pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb25uZWN0aW9uSW5mbykge1xuICAgICAgICAgIGlmIChjb25uZWN0aW9uSW5mby5wdWJsaWNfYmFzZV91cmwpIHtcbiAgICAgICAgICAgIHRoaXMuX3NlcnZlcl9iYXNlX3VybCA9IGNvbm5lY3Rpb25JbmZvLnB1YmxpY19iYXNlX3VybDtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5fZmlyZShcImNvbm5lY3RlZFwiLCBjb25uZWN0aW9uSW5mbyk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBjb25uZWN0aW9uLm9uX2Nvbm5lY3RlZChvbkNvbm5lY3RlZCk7XG4gICAgICBvbkNvbm5lY3RlZCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9lbWl0X21lc3NhZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiTm8gY29ubmVjdGlvbiB0byBlbWl0IG1lc3NhZ2VcIik7XG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHJlZ2lzdGVyX2NvZGVjKGNvbmZpZykge1xuICAgIGlmICghY29uZmlnW1wibmFtZVwiXSB8fCAoIWNvbmZpZ1tcImVuY29kZXJcIl0gJiYgIWNvbmZpZ1tcImRlY29kZXJcIl0pKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIFwiSW52YWxpZCBjb2RlYyBmb3JtYXQsIHBsZWFzZSBtYWtlIHN1cmUgeW91IHByb3ZpZGUgYSBuYW1lLCB0eXBlLCBlbmNvZGVyIGFuZCBkZWNvZGVyLlwiLFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGNvbmZpZy50eXBlKSB7XG4gICAgICAgIGZvciAobGV0IGsgb2YgT2JqZWN0LmtleXModGhpcy5fY29kZWNzKSkge1xuICAgICAgICAgIGlmICh0aGlzLl9jb2RlY3Nba10udHlwZSA9PT0gY29uZmlnLnR5cGUgfHwgayA9PT0gY29uZmlnLm5hbWUpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9jb2RlY3Nba107XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCJSZW1vdmUgZHVwbGljYXRlZCBjb2RlYzogXCIgKyBrKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuX2NvZGVjc1tjb25maWdbXCJuYW1lXCJdXSA9IGNvbmZpZztcbiAgICB9XG4gIH1cblxuICBhc3luYyBfcGluZyhtc2csIGNvbnRleHQpIHtcbiAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKG1zZyA9PSBcInBpbmdcIik7XG4gICAgcmV0dXJuIFwicG9uZ1wiO1xuICB9XG5cbiAgYXN5bmMgcGluZyhjbGllbnRfaWQsIHRpbWVvdXQpIHtcbiAgICBsZXQgbWV0aG9kID0gdGhpcy5fZ2VuZXJhdGVfcmVtb3RlX21ldGhvZCh7XG4gICAgICBfcnNlcnZlcjogdGhpcy5fc2VydmVyX2Jhc2VfdXJsLFxuICAgICAgX3J0YXJnZXQ6IGNsaWVudF9pZCxcbiAgICAgIF9ybWV0aG9kOiBcInNlcnZpY2VzLmJ1aWx0LWluLnBpbmdcIixcbiAgICAgIF9ycHJvbWlzZTogdHJ1ZSxcbiAgICAgIF9yZG9jOiBcIlBpbmcgYSByZW1vdGUgY2xpZW50XCIsXG4gICAgfSk7XG4gICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KSgoYXdhaXQgbWV0aG9kKFwicGluZ1wiLCB0aW1lb3V0KSkgPT0gXCJwb25nXCIpO1xuICB9XG5cbiAgX2NyZWF0ZV9tZXNzYWdlKGtleSwgaGVhcnRiZWF0LCBvdmVyd3JpdGUsIGNvbnRleHQpIHtcbiAgICBpZiAoaGVhcnRiZWF0KSB7XG4gICAgICBpZiAoIXRoaXMuX29iamVjdF9zdG9yZVtrZXldKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgc2Vzc2lvbiBkb2VzIG5vdCBleGlzdCBhbnltb3JlOiAke2tleX1gKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX29iamVjdF9zdG9yZVtrZXldW1widGltZXJcIl0ucmVzZXQoKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX29iamVjdF9zdG9yZVtcIm1lc3NhZ2VfY2FjaGVcIl0pIHtcbiAgICAgIHRoaXMuX29iamVjdF9zdG9yZVtcIm1lc3NhZ2VfY2FjaGVcIl0gPSB7fTtcbiAgICB9XG4gICAgaWYgKCFvdmVyd3JpdGUgJiYgdGhpcy5fb2JqZWN0X3N0b3JlW1wibWVzc2FnZV9jYWNoZVwiXVtrZXldKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBNZXNzYWdlIHdpdGggdGhlIHNhbWUga2V5ICgke2tleX0pIGFscmVhZHkgZXhpc3RzIGluIHRoZSBjYWNoZSBzdG9yZSwgcGxlYXNlIHVzZSBvdmVyd3JpdGU9dHJ1ZSBvciByZW1vdmUgaXQgZmlyc3QuYCxcbiAgICAgICk7XG4gICAgfVxuICAgIHRoaXMuX29iamVjdF9zdG9yZVtcIm1lc3NhZ2VfY2FjaGVcIl1ba2V5XSA9IFtdO1xuICB9XG5cbiAgX2FwcGVuZF9tZXNzYWdlKGtleSwgZGF0YSwgaGVhcnRiZWF0LCBjb250ZXh0KSB7XG4gICAgaWYgKGhlYXJ0YmVhdCkge1xuICAgICAgaWYgKCF0aGlzLl9vYmplY3Rfc3RvcmVba2V5XSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHNlc3Npb24gZG9lcyBub3QgZXhpc3QgYW55bW9yZTogJHtrZXl9YCk7XG4gICAgICB9XG4gICAgICB0aGlzLl9vYmplY3Rfc3RvcmVba2V5XVtcInRpbWVyXCJdLnJlc2V0KCk7XG4gICAgfVxuICAgIGNvbnN0IGNhY2hlID0gdGhpcy5fb2JqZWN0X3N0b3JlW1wibWVzc2FnZV9jYWNoZVwiXTtcbiAgICBpZiAoIWNhY2hlW2tleV0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTWVzc2FnZSB3aXRoIGtleSAke2tleX0gZG9lcyBub3QgZXhpc3RzLmApO1xuICAgIH1cbiAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKGRhdGEgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlclZpZXcpO1xuICAgIGNhY2hlW2tleV0ucHVzaChkYXRhKTtcbiAgfVxuXG4gIF9zZXRfbWVzc2FnZShrZXksIGluZGV4LCBkYXRhLCBoZWFydGJlYXQsIGNvbnRleHQpIHtcbiAgICBpZiAoaGVhcnRiZWF0KSB7XG4gICAgICBpZiAoIXRoaXMuX29iamVjdF9zdG9yZVtrZXldKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgc2Vzc2lvbiBkb2VzIG5vdCBleGlzdCBhbnltb3JlOiAke2tleX1gKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX29iamVjdF9zdG9yZVtrZXldW1widGltZXJcIl0ucmVzZXQoKTtcbiAgICB9XG4gICAgY29uc3QgY2FjaGUgPSB0aGlzLl9vYmplY3Rfc3RvcmVbXCJtZXNzYWdlX2NhY2hlXCJdO1xuICAgIGlmICghY2FjaGVba2V5XSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNZXNzYWdlIHdpdGgga2V5ICR7a2V5fSBkb2VzIG5vdCBleGlzdHMuYCk7XG4gICAgfVxuICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLmFzc2VydCkoZGF0YSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyVmlldyk7XG4gICAgY2FjaGVba2V5XVtpbmRleF0gPSBkYXRhO1xuICB9XG5cbiAgX3JlbW92ZV9tZXNzYWdlKGtleSwgY29udGV4dCkge1xuICAgIGNvbnN0IGNhY2hlID0gdGhpcy5fb2JqZWN0X3N0b3JlW1wibWVzc2FnZV9jYWNoZVwiXTtcbiAgICBpZiAoIWNhY2hlW2tleV0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTWVzc2FnZSB3aXRoIGtleSAke2tleX0gZG9lcyBub3QgZXhpc3RzLmApO1xuICAgIH1cbiAgICBkZWxldGUgY2FjaGVba2V5XTtcbiAgfVxuXG4gIF9wcm9jZXNzX21lc3NhZ2Uoa2V5LCBoZWFydGJlYXQsIGNvbnRleHQpIHtcbiAgICBpZiAoaGVhcnRiZWF0KSB7XG4gICAgICBpZiAoIXRoaXMuX29iamVjdF9zdG9yZVtrZXldKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgc2Vzc2lvbiBkb2VzIG5vdCBleGlzdCBhbnltb3JlOiAke2tleX1gKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX29iamVjdF9zdG9yZVtrZXldW1widGltZXJcIl0ucmVzZXQoKTtcbiAgICB9XG4gICAgY29uc3QgY2FjaGUgPSB0aGlzLl9vYmplY3Rfc3RvcmVbXCJtZXNzYWdlX2NhY2hlXCJdO1xuICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLmFzc2VydCkoISFjb250ZXh0LCBcIkNvbnRleHQgaXMgcmVxdWlyZWRcIik7XG4gICAgaWYgKCFjYWNoZVtrZXldKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1lc3NhZ2Ugd2l0aCBrZXkgJHtrZXl9IGRvZXMgbm90IGV4aXN0cy5gKTtcbiAgICB9XG4gICAgY2FjaGVba2V5XSA9IGNvbmNhdEFycmF5QnVmZmVycyhjYWNoZVtrZXldKTtcbiAgICAvLyBjb25zb2xlLmRlYnVnKGBQcm9jZXNzaW5nIG1lc3NhZ2UgJHtrZXl9IChieXRlcz0ke2NhY2hlW2tleV0uYnl0ZUxlbmd0aH0pYCk7XG4gICAgbGV0IHVucGFja2VyID0gKDAsX21zZ3BhY2tfbXNncGFja19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLmRlY29kZU11bHRpKShjYWNoZVtrZXldKTtcbiAgICBjb25zdCB7IGRvbmUsIHZhbHVlIH0gPSB1bnBhY2tlci5uZXh0KCk7XG4gICAgY29uc3QgbWFpbiA9IHZhbHVlO1xuICAgIC8vIE1ha2Ugc3VyZSB0aGUgZmllbGRzIGFyZSBmcm9tIHRydXN0ZWQgc291cmNlXG4gICAgT2JqZWN0LmFzc2lnbihtYWluLCB7XG4gICAgICBmcm9tOiBjb250ZXh0LmZyb20sXG4gICAgICB0bzogY29udGV4dC50byxcbiAgICAgIHdzOiBjb250ZXh0LndzLFxuICAgICAgdXNlcjogY29udGV4dC51c2VyLFxuICAgIH0pO1xuICAgIG1haW5bXCJjdHhcIl0gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG1haW4pKTtcbiAgICBPYmplY3QuYXNzaWduKG1haW5bXCJjdHhcIl0sIHRoaXMuZGVmYXVsdF9jb250ZXh0KTtcbiAgICBpZiAoIWRvbmUpIHtcbiAgICAgIGxldCBleHRyYSA9IHVucGFja2VyLm5leHQoKTtcbiAgICAgIE9iamVjdC5hc3NpZ24obWFpbiwgZXh0cmEudmFsdWUpO1xuICAgIH1cbiAgICB0aGlzLl9maXJlKG1haW5bXCJ0eXBlXCJdLCBtYWluKTtcbiAgICAvLyBjb25zb2xlLmRlYnVnKFxuICAgIC8vICAgdGhpcy5fY2xpZW50X2lkLFxuICAgIC8vICAgYFByb2Nlc3NlZCBtZXNzYWdlICR7a2V5fSAoYnl0ZXM9JHtjYWNoZVtrZXldLmJ5dGVMZW5ndGh9KWAsXG4gICAgLy8gKTtcbiAgICBkZWxldGUgY2FjaGVba2V5XTtcbiAgfVxuXG4gIF9vbl9tZXNzYWdlKG1lc3NhZ2UpIHtcbiAgICBpZiAodHlwZW9mIG1lc3NhZ2UgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIGNvbnN0IG1haW4gPSBKU09OLnBhcnNlKG1lc3NhZ2UpO1xuICAgICAgdGhpcy5fZmlyZShtYWluW1widHlwZVwiXSwgbWFpbik7XG4gICAgfSBlbHNlIGlmIChtZXNzYWdlIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgIGxldCB1bnBhY2tlciA9ICgwLF9tc2dwYWNrX21zZ3BhY2tfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXy5kZWNvZGVNdWx0aSkobWVzc2FnZSk7XG4gICAgICBjb25zdCB7IGRvbmUsIHZhbHVlIH0gPSB1bnBhY2tlci5uZXh0KCk7XG4gICAgICBjb25zdCBtYWluID0gdmFsdWU7XG4gICAgICAvLyBBZGQgdHJ1c3RlZCBjb250ZXh0IHRvIHRoZSBtZXRob2QgY2FsbFxuICAgICAgbWFpbltcImN0eFwiXSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkobWFpbikpO1xuICAgICAgT2JqZWN0LmFzc2lnbihtYWluW1wiY3R4XCJdLCB0aGlzLmRlZmF1bHRfY29udGV4dCk7XG4gICAgICBpZiAoIWRvbmUpIHtcbiAgICAgICAgbGV0IGV4dHJhID0gdW5wYWNrZXIubmV4dCgpO1xuICAgICAgICBPYmplY3QuYXNzaWduKG1haW4sIGV4dHJhLnZhbHVlKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2ZpcmUobWFpbltcInR5cGVcIl0sIG1haW4pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1lc3NhZ2UgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgIHRoaXMuX2ZpcmUobWVzc2FnZVtcInR5cGVcIl0sIG1lc3NhZ2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIG1lc3NhZ2UgZm9ybWF0XCIpO1xuICAgIH1cbiAgfVxuXG4gIHJlc2V0KCkge1xuICAgIHRoaXMuX2V2ZW50X2hhbmRsZXJzID0ge307XG4gICAgdGhpcy5fc2VydmljZXMgPSB7fTtcbiAgfVxuXG4gIGFzeW5jIGRpc2Nvbm5lY3QoKSB7XG4gICAgdGhpcy5fZmlyZShcImRpc2Nvbm5lY3RlZFwiKTtcbiAgICBhd2FpdCB0aGlzLl9jb25uZWN0aW9uLmRpc2Nvbm5lY3QoKTtcbiAgfVxuXG4gIGFzeW5jIGdldF9tYW5hZ2VyX3NlcnZpY2UoY29uZmlnKSB7XG4gICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xuXG4gICAgLy8gQWRkIHJldHJ5IGxvZ2ljXG4gICAgY29uc3QgbWF4UmV0cmllcyA9IDIwO1xuICAgIGNvbnN0IHJldHJ5RGVsYXkgPSA1MDA7IC8vIDUwMG1zXG5cbiAgICBmb3IgKGxldCBhdHRlbXB0ID0gMDsgYXR0ZW1wdCA8IG1heFJldHJpZXM7IGF0dGVtcHQrKykge1xuICAgICAgaWYgKCF0aGlzLl9jb25uZWN0aW9uLm1hbmFnZXJfaWQpIHtcbiAgICAgICAgaWYgKGF0dGVtcHQgPCBtYXhSZXRyaWVzIC0gMSkge1xuICAgICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAgIGBNYW5hZ2VyIElEIG5vdCBzZXQsIHJldHJ5aW5nIGluICR7cmV0cnlEZWxheX1tcyAoYXR0ZW1wdCAke2F0dGVtcHQgKyAxfS8ke21heFJldHJpZXN9KWAsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCByZXRyeURlbGF5KSk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTWFuYWdlciBJRCBub3Qgc2V0IGFmdGVyIG1heGltdW0gcmV0cmllc1wiKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBzdmMgPSBhd2FpdCB0aGlzLmdldF9yZW1vdGVfc2VydmljZShcbiAgICAgICAgICBgKi8ke3RoaXMuX2Nvbm5lY3Rpb24ubWFuYWdlcl9pZH06ZGVmYXVsdGAsXG4gICAgICAgICAgY29uZmlnLFxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gc3ZjO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBpZiAoYXR0ZW1wdCA8IG1heFJldHJpZXMgLSAxKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgYEZhaWxlZCB0byBnZXQgbWFuYWdlciBzZXJ2aWNlLCByZXRyeWluZyBpbiAke3JldHJ5RGVsYXl9bXM6ICR7ZS5tZXNzYWdlfWAsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCByZXRyeURlbGF5KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldF9hbGxfbG9jYWxfc2VydmljZXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3NlcnZpY2VzO1xuICB9XG4gIGdldF9sb2NhbF9zZXJ2aWNlKHNlcnZpY2VfaWQsIGNvbnRleHQpIHtcbiAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKHNlcnZpY2VfaWQpO1xuICAgIGNvbnN0IFt3cywgY2xpZW50X2lkXSA9IGNvbnRleHRbXCJ0b1wiXS5zcGxpdChcIi9cIik7XG4gICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KShcbiAgICAgIGNsaWVudF9pZCA9PT0gdGhpcy5fY2xpZW50X2lkLFxuICAgICAgXCJTZXJ2aWNlcyBjYW4gb25seSBiZSBhY2Nlc3NlZCBsb2NhbGx5XCIsXG4gICAgKTtcblxuICAgIGNvbnN0IHNlcnZpY2UgPSB0aGlzLl9zZXJ2aWNlc1tzZXJ2aWNlX2lkXTtcbiAgICBpZiAoIXNlcnZpY2UpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlNlcnZpY2Ugbm90IGZvdW5kOiBcIiArIHNlcnZpY2VfaWQpO1xuICAgIH1cblxuICAgIHNlcnZpY2UuY29uZmlnW1wid29ya3NwYWNlXCJdID0gY29udGV4dFtcIndzXCJdO1xuICAgIC8vIGFsbG93IGFjY2VzcyBmb3IgdGhlIHNhbWUgd29ya3NwYWNlXG4gICAgaWYgKHNlcnZpY2UuY29uZmlnLnZpc2liaWxpdHkgPT0gXCJwdWJsaWNcIikge1xuICAgICAgcmV0dXJuIHNlcnZpY2U7XG4gICAgfVxuXG4gICAgLy8gYWxsb3cgYWNjZXNzIGZvciB0aGUgc2FtZSB3b3Jrc3BhY2VcbiAgICBpZiAoY29udGV4dFtcIndzXCJdID09PSB3cykge1xuICAgICAgcmV0dXJuIHNlcnZpY2U7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYFBlcm1pc3Npb24gZGVuaWVkIGZvciBnZXR0aW5nIHByb3RlY3RlZCBzZXJ2aWNlOiAke3NlcnZpY2VfaWR9LCB3b3Jrc3BhY2UgbWlzbWF0Y2g6ICR7d3N9ICE9ICR7Y29udGV4dFtcIndzXCJdfWAsXG4gICAgKTtcbiAgfVxuICBhc3luYyBnZXRfcmVtb3RlX3NlcnZpY2Uoc2VydmljZV91cmksIGNvbmZpZykge1xuICAgIGxldCB7IHRpbWVvdXQsIGNhc2VfY29udmVyc2lvbiwga3dhcmdzX2V4cGFuc2lvbiB9ID0gY29uZmlnIHx8IHt9O1xuICAgIHRpbWVvdXQgPSB0aW1lb3V0ID09PSB1bmRlZmluZWQgPyB0aGlzLl9tZXRob2RfdGltZW91dCA6IHRpbWVvdXQ7XG4gICAgaWYgKCFzZXJ2aWNlX3VyaSAmJiB0aGlzLl9jb25uZWN0aW9uLm1hbmFnZXJfaWQpIHtcbiAgICAgIHNlcnZpY2VfdXJpID0gXCIqL1wiICsgdGhpcy5fY29ubmVjdGlvbi5tYW5hZ2VyX2lkO1xuICAgIH0gZWxzZSBpZiAoIXNlcnZpY2VfdXJpLmluY2x1ZGVzKFwiOlwiKSkge1xuICAgICAgc2VydmljZV91cmkgPSB0aGlzLl9jbGllbnRfaWQgKyBcIjpcIiArIHNlcnZpY2VfdXJpO1xuICAgIH1cbiAgICBjb25zdCBwcm92aWRlciA9IHNlcnZpY2VfdXJpLnNwbGl0KFwiOlwiKVswXTtcbiAgICBsZXQgc2VydmljZV9pZCA9IHNlcnZpY2VfdXJpLnNwbGl0KFwiOlwiKVsxXTtcbiAgICBpZiAoc2VydmljZV9pZC5pbmNsdWRlcyhcIkBcIikpIHtcbiAgICAgIHNlcnZpY2VfaWQgPSBzZXJ2aWNlX2lkLnNwbGl0KFwiQFwiKVswXTtcbiAgICAgIGNvbnN0IGFwcF9pZCA9IHNlcnZpY2VfdXJpLnNwbGl0KFwiQFwiKVsxXTtcbiAgICAgIGlmICh0aGlzLl9hcHBfaWQgJiYgdGhpcy5fYXBwX2lkICE9PSBcIipcIilcbiAgICAgICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KShcbiAgICAgICAgICBhcHBfaWQgPT09IHRoaXMuX2FwcF9pZCxcbiAgICAgICAgICBgSW52YWxpZCBhcHAgaWQ6ICR7YXBwX2lkfSAhPSAke3RoaXMuX2FwcF9pZH1gLFxuICAgICAgICApO1xuICAgIH1cbiAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKHByb3ZpZGVyLCBgSW52YWxpZCBzZXJ2aWNlIHVyaTogJHtzZXJ2aWNlX3VyaX1gKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBtZXRob2QgPSB0aGlzLl9nZW5lcmF0ZV9yZW1vdGVfbWV0aG9kKHtcbiAgICAgICAgX3JzZXJ2ZXI6IHRoaXMuX3NlcnZlcl9iYXNlX3VybCxcbiAgICAgICAgX3J0YXJnZXQ6IHByb3ZpZGVyLFxuICAgICAgICBfcm1ldGhvZDogXCJzZXJ2aWNlcy5idWlsdC1pbi5nZXRfc2VydmljZVwiLFxuICAgICAgICBfcnByb21pc2U6IHRydWUsXG4gICAgICAgIF9yZG9jOiBcIkdldCBhIHJlbW90ZSBzZXJ2aWNlXCIsXG4gICAgICB9KTtcbiAgICAgIGxldCBzdmMgPSBhd2FpdCAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy53YWl0Rm9yKShcbiAgICAgICAgbWV0aG9kKHNlcnZpY2VfaWQpLFxuICAgICAgICB0aW1lb3V0LFxuICAgICAgICBcIlRpbWVvdXQgRXJyb3I6IEZhaWxlZCB0byBnZXQgcmVtb3RlIHNlcnZpY2U6IFwiICsgc2VydmljZV91cmksXG4gICAgICApO1xuICAgICAgc3ZjLmlkID0gYCR7cHJvdmlkZXJ9OiR7c2VydmljZV9pZH1gO1xuICAgICAgaWYgKGt3YXJnc19leHBhbnNpb24pIHtcbiAgICAgICAgc3ZjID0gKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uZXhwYW5kS3dhcmdzKShzdmMpO1xuICAgICAgfVxuICAgICAgaWYgKGNhc2VfY29udmVyc2lvbilcbiAgICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oXG4gICAgICAgICAgbmV3IFJlbW90ZVNlcnZpY2UoKSxcbiAgICAgICAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5jb252ZXJ0Q2FzZSkoc3ZjLCBjYXNlX2NvbnZlcnNpb24pLFxuICAgICAgICApO1xuICAgICAgZWxzZSByZXR1cm4gT2JqZWN0LmFzc2lnbihuZXcgUmVtb3RlU2VydmljZSgpLCBzdmMpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUud2FybihcIkZhaWxlZCB0byBnZXQgcmVtb3RlIHNlcnZpY2U6IFwiICsgc2VydmljZV91cmksIGUpO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH1cbiAgX2Fubm90YXRlX3NlcnZpY2VfbWV0aG9kcyhcbiAgICBhT2JqZWN0LFxuICAgIG9iamVjdF9pZCxcbiAgICByZXF1aXJlX2NvbnRleHQsXG4gICAgcnVuX2luX2V4ZWN1dG9yLFxuICAgIHZpc2liaWxpdHksXG4gICkge1xuICAgIGlmICh0eXBlb2YgYU9iamVjdCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAvLyBtYXJrIHRoZSBtZXRob2QgYXMgYSByZW1vdGUgbWV0aG9kIHRoYXQgcmVxdWlyZXMgY29udGV4dFxuICAgICAgbGV0IG1ldGhvZF9uYW1lID0gb2JqZWN0X2lkLnNwbGl0KFwiLlwiKVsxXTtcbiAgICAgIHRoaXMuX21ldGhvZF9hbm5vdGF0aW9ucy5zZXQoYU9iamVjdCwge1xuICAgICAgICByZXF1aXJlX2NvbnRleHQ6IEFycmF5LmlzQXJyYXkocmVxdWlyZV9jb250ZXh0KVxuICAgICAgICAgID8gcmVxdWlyZV9jb250ZXh0LmluY2x1ZGVzKG1ldGhvZF9uYW1lKVxuICAgICAgICAgIDogISFyZXF1aXJlX2NvbnRleHQsXG4gICAgICAgIHJ1bl9pbl9leGVjdXRvcjogcnVuX2luX2V4ZWN1dG9yLFxuICAgICAgICBtZXRob2RfaWQ6IFwic2VydmljZXMuXCIgKyBvYmplY3RfaWQsXG4gICAgICAgIHZpc2liaWxpdHk6IHZpc2liaWxpdHksXG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGFPYmplY3QgaW5zdGFuY2VvZiBBcnJheSB8fCBhT2JqZWN0IGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgICBmb3IgKGxldCBrZXkgb2YgT2JqZWN0LmtleXMoYU9iamVjdCkpIHtcbiAgICAgICAgbGV0IHZhbCA9IGFPYmplY3Rba2V5XTtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWwgPT09IFwiZnVuY3Rpb25cIiAmJiB2YWwuX19ycGNfb2JqZWN0X18pIHtcbiAgICAgICAgICBsZXQgY2xpZW50X2lkID0gdmFsLl9fcnBjX29iamVjdF9fLl9ydGFyZ2V0O1xuICAgICAgICAgIGlmIChjbGllbnRfaWQuaW5jbHVkZXMoXCIvXCIpKSB7XG4gICAgICAgICAgICBjbGllbnRfaWQgPSBjbGllbnRfaWQuc3BsaXQoXCIvXCIpWzFdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodGhpcy5fY2xpZW50X2lkID09PSBjbGllbnRfaWQpIHtcbiAgICAgICAgICAgIGlmIChhT2JqZWN0IGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgYU9iamVjdCA9IGFPYmplY3Quc2xpY2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIHJlY292ZXIgbG9jYWwgbWV0aG9kXG4gICAgICAgICAgICBhT2JqZWN0W2tleV0gPSBpbmRleE9iamVjdChcbiAgICAgICAgICAgICAgdGhpcy5fb2JqZWN0X3N0b3JlLFxuICAgICAgICAgICAgICB2YWwuX19ycGNfb2JqZWN0X18uX3JtZXRob2QsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgdmFsID0gYU9iamVjdFtrZXldOyAvLyBtYWtlIHN1cmUgaXQncyBhbm5vdGF0ZWQgbGF0ZXJcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBgTG9jYWwgbWV0aG9kIG5vdCBmb3VuZDogJHt2YWwuX19ycGNfb2JqZWN0X18uX3JtZXRob2R9LCBjbGllbnQgaWQgbWlzbWF0Y2ggJHt0aGlzLl9jbGllbnRfaWR9ICE9ICR7Y2xpZW50X2lkfWAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9hbm5vdGF0ZV9zZXJ2aWNlX21ldGhvZHMoXG4gICAgICAgICAgdmFsLFxuICAgICAgICAgIG9iamVjdF9pZCArIFwiLlwiICsga2V5LFxuICAgICAgICAgIHJlcXVpcmVfY29udGV4dCxcbiAgICAgICAgICBydW5faW5fZXhlY3V0b3IsXG4gICAgICAgICAgdmlzaWJpbGl0eSxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgYWRkX3NlcnZpY2UoYXBpLCBvdmVyd3JpdGUpIHtcbiAgICBpZiAoIWFwaSB8fCBBcnJheS5pc0FycmF5KGFwaSkpIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgc2VydmljZSBvYmplY3RcIik7XG4gICAgaWYgKGFwaS5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KSB7XG4gICAgICBhcGkgPSBPYmplY3QuYXNzaWduKHt9LCBhcGkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBub3JtQXBpID0ge307XG4gICAgICBjb25zdCBwcm9wcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGFwaSkuY29uY2F0KFxuICAgICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhPYmplY3QuZ2V0UHJvdG90eXBlT2YoYXBpKSksXG4gICAgICApO1xuICAgICAgZm9yIChsZXQgayBvZiBwcm9wcykge1xuICAgICAgICBpZiAoayAhPT0gXCJjb25zdHJ1Y3RvclwiKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBhcGlba10gPT09IFwiZnVuY3Rpb25cIikgbm9ybUFwaVtrXSA9IGFwaVtrXS5iaW5kKGFwaSk7XG4gICAgICAgICAgZWxzZSBub3JtQXBpW2tdID0gYXBpW2tdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBGb3IgY2xhc3MgaW5zdGFuY2UsIHdlIG5lZWQgc2V0IGEgZGVmYXVsdCBpZFxuICAgICAgYXBpLmlkID0gYXBpLmlkIHx8IFwiZGVmYXVsdFwiO1xuICAgICAgYXBpID0gbm9ybUFwaTtcbiAgICB9XG4gICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KShcbiAgICAgIGFwaS5pZCAmJiB0eXBlb2YgYXBpLmlkID09PSBcInN0cmluZ1wiLFxuICAgICAgYFNlcnZpY2UgaWQgbm90IGZvdW5kOiAke2FwaX1gLFxuICAgICk7XG4gICAgaWYgKCFhcGkubmFtZSkge1xuICAgICAgYXBpLm5hbWUgPSBhcGkuaWQ7XG4gICAgfVxuICAgIGlmICghYXBpLmNvbmZpZykge1xuICAgICAgYXBpLmNvbmZpZyA9IHt9O1xuICAgIH1cbiAgICBpZiAoIWFwaS50eXBlKSB7XG4gICAgICBhcGkudHlwZSA9IFwiZ2VuZXJpY1wiO1xuICAgIH1cbiAgICAvLyByZXF1aXJlX2NvbnRleHQgb25seSBhcHBsaWVzIHRvIHRoZSB0b3AtbGV2ZWwgZnVuY3Rpb25zXG4gICAgbGV0IHJlcXVpcmVfY29udGV4dCA9IGZhbHNlLFxuICAgICAgcnVuX2luX2V4ZWN1dG9yID0gZmFsc2U7XG4gICAgaWYgKGFwaS5jb25maWcucmVxdWlyZV9jb250ZXh0KVxuICAgICAgcmVxdWlyZV9jb250ZXh0ID0gYXBpLmNvbmZpZy5yZXF1aXJlX2NvbnRleHQ7XG4gICAgaWYgKGFwaS5jb25maWcucnVuX2luX2V4ZWN1dG9yKSBydW5faW5fZXhlY3V0b3IgPSB0cnVlO1xuICAgIGNvbnN0IHZpc2liaWxpdHkgPSBhcGkuY29uZmlnLnZpc2liaWxpdHkgfHwgXCJwcm90ZWN0ZWRcIjtcbiAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKFtcInByb3RlY3RlZFwiLCBcInB1YmxpY1wiXS5pbmNsdWRlcyh2aXNpYmlsaXR5KSk7XG4gICAgdGhpcy5fYW5ub3RhdGVfc2VydmljZV9tZXRob2RzKFxuICAgICAgYXBpLFxuICAgICAgYXBpW1wiaWRcIl0sXG4gICAgICByZXF1aXJlX2NvbnRleHQsXG4gICAgICBydW5faW5fZXhlY3V0b3IsXG4gICAgICB2aXNpYmlsaXR5LFxuICAgICk7XG5cbiAgICBpZiAodGhpcy5fc2VydmljZXNbYXBpLmlkXSkge1xuICAgICAgaWYgKG92ZXJ3cml0ZSkge1xuICAgICAgICBkZWxldGUgdGhpcy5fc2VydmljZXNbYXBpLmlkXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgU2VydmljZSBhbHJlYWR5IGV4aXN0czogJHthcGkuaWR9LCBwbGVhc2Ugc3BlY2lmeSBhIGRpZmZlcmVudCBpZCAobm90ICR7YXBpLmlkfSkgb3Igb3ZlcndyaXRlPXRydWVgLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLl9zZXJ2aWNlc1thcGkuaWRdID0gYXBpO1xuICAgIHJldHVybiBhcGk7XG4gIH1cblxuICBfZXh0cmFjdF9zZXJ2aWNlX2luZm8oc2VydmljZSkge1xuICAgIGNvbnN0IGNvbmZpZyA9IHNlcnZpY2UuY29uZmlnIHx8IHt9O1xuICAgIGNvbmZpZy53b3Jrc3BhY2UgPVxuICAgICAgY29uZmlnLndvcmtzcGFjZSB8fCB0aGlzLl9sb2NhbF93b3Jrc3BhY2UgfHwgdGhpcy5fY29ubmVjdGlvbi53b3Jrc3BhY2U7XG4gICAgY29uc3Qgc2tpcENvbnRleHQgPSBjb25maWcucmVxdWlyZV9jb250ZXh0O1xuICAgIGNvbnN0IHNlcnZpY2VTY2hlbWEgPSBfZ2V0X3NjaGVtYShzZXJ2aWNlLCBudWxsLCBza2lwQ29udGV4dCk7XG4gICAgY29uc3Qgc2VydmljZUluZm8gPSB7XG4gICAgICBjb25maWc6IGNvbmZpZyxcbiAgICAgIGlkOiBgJHtjb25maWcud29ya3NwYWNlfS8ke3RoaXMuX2NsaWVudF9pZH06JHtzZXJ2aWNlW1wiaWRcIl19YCxcbiAgICAgIG5hbWU6IHNlcnZpY2UubmFtZSB8fCBzZXJ2aWNlW1wiaWRcIl0sXG4gICAgICBkZXNjcmlwdGlvbjogc2VydmljZS5kZXNjcmlwdGlvbiB8fCBcIlwiLFxuICAgICAgdHlwZTogc2VydmljZS50eXBlIHx8IFwiZ2VuZXJpY1wiLFxuICAgICAgZG9jczogc2VydmljZS5kb2NzIHx8IG51bGwsXG4gICAgICBhcHBfaWQ6IHRoaXMuX2FwcF9pZCxcbiAgICAgIHNlcnZpY2Vfc2NoZW1hOiBzZXJ2aWNlU2NoZW1hLFxuICAgIH07XG4gICAgcmV0dXJuIHNlcnZpY2VJbmZvO1xuICB9XG5cbiAgYXN5bmMgZ2V0X3NlcnZpY2Vfc2NoZW1hKHNlcnZpY2UpIHtcbiAgICBjb25zdCBza2lwQ29udGV4dCA9IHNlcnZpY2UuY29uZmlnLnJlcXVpcmVfY29udGV4dDtcbiAgICByZXR1cm4gX2dldF9zY2hlbWEoc2VydmljZSwgbnVsbCwgc2tpcENvbnRleHQpO1xuICB9XG5cbiAgYXN5bmMgcmVnaXN0ZXJfc2VydmljZShhcGksIGNvbmZpZykge1xuICAgIGxldCB7IGNoZWNrX3R5cGUsIG5vdGlmeSwgb3ZlcndyaXRlIH0gPSBjb25maWcgfHwge307XG4gICAgbm90aWZ5ID0gbm90aWZ5ID09PSB1bmRlZmluZWQgPyB0cnVlIDogbm90aWZ5O1xuICAgIGxldCBtYW5hZ2VyO1xuICAgIGlmIChjaGVja190eXBlICYmIGFwaS50eXBlKSB7XG4gICAgICB0cnkge1xuICAgICAgICBtYW5hZ2VyID0gYXdhaXQgdGhpcy5nZXRfbWFuYWdlcl9zZXJ2aWNlKHtcbiAgICAgICAgICB0aW1lb3V0OiAxMCxcbiAgICAgICAgICBjYXNlX2NvbnZlcnNpb246IFwiY2FtZWxcIixcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IHR5cGVfaW5mbyA9IGF3YWl0IG1hbmFnZXIuZ2V0X3NlcnZpY2VfdHlwZShhcGkudHlwZSk7XG4gICAgICAgIGFwaSA9IF9hbm5vdGF0ZV9zZXJ2aWNlKGFwaSwgdHlwZV9pbmZvKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gZ2V0IHNlcnZpY2UgdHlwZSAke2FwaS50eXBlfSwgZXJyb3I6ICR7ZX1gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzZXJ2aWNlID0gdGhpcy5hZGRfc2VydmljZShhcGksIG92ZXJ3cml0ZSk7XG4gICAgY29uc3Qgc2VydmljZUluZm8gPSB0aGlzLl9leHRyYWN0X3NlcnZpY2VfaW5mbyhzZXJ2aWNlKTtcbiAgICBpZiAobm90aWZ5KSB7XG4gICAgICB0cnkge1xuICAgICAgICBtYW5hZ2VyID1cbiAgICAgICAgICBtYW5hZ2VyIHx8XG4gICAgICAgICAgKGF3YWl0IHRoaXMuZ2V0X21hbmFnZXJfc2VydmljZSh7XG4gICAgICAgICAgICB0aW1lb3V0OiAxMCxcbiAgICAgICAgICAgIGNhc2VfY29udmVyc2lvbjogXCJjYW1lbFwiLFxuICAgICAgICAgIH0pKTtcbiAgICAgICAgYXdhaXQgbWFuYWdlci5yZWdpc3RlclNlcnZpY2Uoc2VydmljZUluZm8pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBub3RpZnkgd29ya3NwYWNlIG1hbmFnZXI6ICR7ZX1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHNlcnZpY2VJbmZvO1xuICB9XG5cbiAgYXN5bmMgdW5yZWdpc3Rlcl9zZXJ2aWNlKHNlcnZpY2UsIG5vdGlmeSkge1xuICAgIG5vdGlmeSA9IG5vdGlmeSA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IG5vdGlmeTtcbiAgICBsZXQgc2VydmljZV9pZDtcbiAgICBpZiAodHlwZW9mIHNlcnZpY2UgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIHNlcnZpY2VfaWQgPSBzZXJ2aWNlO1xuICAgIH0gZWxzZSB7XG4gICAgICBzZXJ2aWNlX2lkID0gc2VydmljZS5pZDtcbiAgICB9XG4gICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KShcbiAgICAgIHNlcnZpY2VfaWQgJiYgdHlwZW9mIHNlcnZpY2VfaWQgPT09IFwic3RyaW5nXCIsXG4gICAgICBgSW52YWxpZCBzZXJ2aWNlIGlkOiAke3NlcnZpY2VfaWR9YCxcbiAgICApO1xuICAgIGlmIChzZXJ2aWNlX2lkLmluY2x1ZGVzKFwiOlwiKSkge1xuICAgICAgc2VydmljZV9pZCA9IHNlcnZpY2VfaWQuc3BsaXQoXCI6XCIpWzFdO1xuICAgIH1cbiAgICBpZiAoc2VydmljZV9pZC5pbmNsdWRlcyhcIkBcIikpIHtcbiAgICAgIHNlcnZpY2VfaWQgPSBzZXJ2aWNlX2lkLnNwbGl0KFwiQFwiKVswXTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLl9zZXJ2aWNlc1tzZXJ2aWNlX2lkXSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBTZXJ2aWNlIG5vdCBmb3VuZDogJHtzZXJ2aWNlX2lkfWApO1xuICAgIH1cbiAgICBpZiAobm90aWZ5KSB7XG4gICAgICBjb25zdCBtYW5hZ2VyID0gYXdhaXQgdGhpcy5nZXRfbWFuYWdlcl9zZXJ2aWNlKHtcbiAgICAgICAgdGltZW91dDogMTAsXG4gICAgICAgIGNhc2VfY29udmVyc2lvbjogXCJjYW1lbFwiLFxuICAgICAgfSk7XG4gICAgICBhd2FpdCBtYW5hZ2VyLnVucmVnaXN0ZXJTZXJ2aWNlKHNlcnZpY2VfaWQpO1xuICAgIH1cbiAgICBkZWxldGUgdGhpcy5fc2VydmljZXNbc2VydmljZV9pZF07XG4gIH1cblxuICBfbmRhcnJheSh0eXBlZEFycmF5LCBzaGFwZSwgZHR5cGUpIHtcbiAgICBjb25zdCBfZHR5cGUgPSAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy50eXBlZEFycmF5VG9EdHlwZSkodHlwZWRBcnJheSk7XG4gICAgaWYgKGR0eXBlICYmIGR0eXBlICE9PSBfZHR5cGUpIHtcbiAgICAgIHRocm93IChcbiAgICAgICAgXCJkdHlwZSBkb2Vzbid0IG1hdGNoIHRoZSB0eXBlIG9mIHRoZSBhcnJheTogXCIgKyBfZHR5cGUgKyBcIiAhPSBcIiArIGR0eXBlXG4gICAgICApO1xuICAgIH1cbiAgICBzaGFwZSA9IHNoYXBlIHx8IFt0eXBlZEFycmF5Lmxlbmd0aF07XG4gICAgcmV0dXJuIHtcbiAgICAgIF9ydHlwZTogXCJuZGFycmF5XCIsXG4gICAgICBfcnZhbHVlOiB0eXBlZEFycmF5LmJ1ZmZlcixcbiAgICAgIF9yc2hhcGU6IHNoYXBlLFxuICAgICAgX3JkdHlwZTogX2R0eXBlLFxuICAgIH07XG4gIH1cblxuICBfZW5jb2RlX2NhbGxiYWNrKFxuICAgIG5hbWUsXG4gICAgY2FsbGJhY2ssXG4gICAgc2Vzc2lvbl9pZCxcbiAgICBjbGVhcl9hZnRlcl9jYWxsZWQsXG4gICAgdGltZXIsXG4gICAgbG9jYWxfd29ya3NwYWNlLFxuICAgIGRlc2NyaXB0aW9uLFxuICApIHtcbiAgICBsZXQgbWV0aG9kX2lkID0gYCR7c2Vzc2lvbl9pZH0uJHtuYW1lfWA7XG4gICAgbGV0IGVuY29kZWQgPSB7XG4gICAgICBfcnR5cGU6IFwibWV0aG9kXCIsXG4gICAgICBfcnRhcmdldDogbG9jYWxfd29ya3NwYWNlXG4gICAgICAgID8gYCR7bG9jYWxfd29ya3NwYWNlfS8ke3RoaXMuX2NsaWVudF9pZH1gXG4gICAgICAgIDogdGhpcy5fY2xpZW50X2lkLFxuICAgICAgX3JtZXRob2Q6IG1ldGhvZF9pZCxcbiAgICAgIF9ycHJvbWlzZTogZmFsc2UsXG4gICAgfTtcblxuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGxldCB3cmFwcGVkX2NhbGxiYWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgIGBFcnJvciBpbiBjYWxsYmFjaygke21ldGhvZF9pZH0sICR7ZGVzY3JpcHRpb259KTogJHtlcnJvcn1gLFxuICAgICAgICApO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgaWYgKHRpbWVyICYmIHRpbWVyLnN0YXJ0ZWQpIHtcbiAgICAgICAgICB0aW1lci5jbGVhcigpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjbGVhcl9hZnRlcl9jYWxsZWQgJiYgc2VsZi5fb2JqZWN0X3N0b3JlW3Nlc3Npb25faWRdKSB7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coXCJEZWxldGluZyBzZXNzaW9uXCIsIHNlc3Npb25faWQsIFwiZnJvbVwiLCBzZWxmLl9jbGllbnRfaWQpO1xuICAgICAgICAgIGRlbGV0ZSBzZWxmLl9vYmplY3Rfc3RvcmVbc2Vzc2lvbl9pZF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICAgIHdyYXBwZWRfY2FsbGJhY2suX19uYW1lX18gPSBgY2FsbGJhY2soJHttZXRob2RfaWR9KWA7XG4gICAgcmV0dXJuIFtlbmNvZGVkLCB3cmFwcGVkX2NhbGxiYWNrXTtcbiAgfVxuXG4gIGFzeW5jIF9lbmNvZGVfcHJvbWlzZShcbiAgICByZXNvbHZlLFxuICAgIHJlamVjdCxcbiAgICBzZXNzaW9uX2lkLFxuICAgIGNsZWFyX2FmdGVyX2NhbGxlZCxcbiAgICB0aW1lcixcbiAgICBsb2NhbF93b3Jrc3BhY2UsXG4gICAgZGVzY3JpcHRpb24sXG4gICkge1xuICAgIGxldCBzdG9yZSA9IHRoaXMuX2dldF9zZXNzaW9uX3N0b3JlKHNlc3Npb25faWQsIHRydWUpO1xuICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLmFzc2VydCkoXG4gICAgICBzdG9yZSxcbiAgICAgIGBGYWlsZWQgdG8gY3JlYXRlIHNlc3Npb24gc3RvcmUgJHtzZXNzaW9uX2lkfSBkdWUgdG8gaW52YWxpZCBwYXJlbnRgLFxuICAgICk7XG4gICAgbGV0IGVuY29kZWQgPSB7fTtcblxuICAgIGlmICh0aW1lciAmJiByZWplY3QgJiYgdGhpcy5fbWV0aG9kX3RpbWVvdXQpIHtcbiAgICAgIFtlbmNvZGVkLmhlYXJ0YmVhdCwgc3RvcmUuaGVhcnRiZWF0XSA9IHRoaXMuX2VuY29kZV9jYWxsYmFjayhcbiAgICAgICAgXCJoZWFydGJlYXRcIixcbiAgICAgICAgdGltZXIucmVzZXQuYmluZCh0aW1lciksXG4gICAgICAgIHNlc3Npb25faWQsXG4gICAgICAgIGZhbHNlLFxuICAgICAgICBudWxsLFxuICAgICAgICBsb2NhbF93b3Jrc3BhY2UsXG4gICAgICAgIC8vIGBoZWFydGJlYXQgKCR7ZGVzY3JpcHRpb259KWAsXG4gICAgICApO1xuICAgICAgc3RvcmUudGltZXIgPSB0aW1lcjtcbiAgICAgIGVuY29kZWQuaW50ZXJ2YWwgPSB0aGlzLl9tZXRob2RfdGltZW91dCAvIDI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRpbWVyID0gbnVsbDtcbiAgICB9XG5cbiAgICBbZW5jb2RlZC5yZXNvbHZlLCBzdG9yZS5yZXNvbHZlXSA9IHRoaXMuX2VuY29kZV9jYWxsYmFjayhcbiAgICAgIFwicmVzb2x2ZVwiLFxuICAgICAgcmVzb2x2ZSxcbiAgICAgIHNlc3Npb25faWQsXG4gICAgICBjbGVhcl9hZnRlcl9jYWxsZWQsXG4gICAgICB0aW1lcixcbiAgICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgICAgIGByZXNvbHZlICgke2Rlc2NyaXB0aW9ufSlgLFxuICAgICk7XG4gICAgW2VuY29kZWQucmVqZWN0LCBzdG9yZS5yZWplY3RdID0gdGhpcy5fZW5jb2RlX2NhbGxiYWNrKFxuICAgICAgXCJyZWplY3RcIixcbiAgICAgIHJlamVjdCxcbiAgICAgIHNlc3Npb25faWQsXG4gICAgICBjbGVhcl9hZnRlcl9jYWxsZWQsXG4gICAgICB0aW1lcixcbiAgICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgICAgIGByZWplY3QgKCR7ZGVzY3JpcHRpb259KWAsXG4gICAgKTtcbiAgICByZXR1cm4gZW5jb2RlZDtcbiAgfVxuXG4gIGFzeW5jIF9zZW5kX2NodW5rcyhkYXRhLCB0YXJnZXRfaWQsIHNlc3Npb25faWQpIHtcbiAgICAvLyAxKSBHZXQgdGhlIHJlbW90ZSBzZXJ2aWNlXG4gICAgY29uc3QgcmVtb3RlX3NlcnZpY2VzID0gYXdhaXQgdGhpcy5nZXRfcmVtb3RlX3NlcnZpY2UoXG4gICAgICBgJHt0YXJnZXRfaWR9OmJ1aWx0LWluYCxcbiAgICApO1xuICAgIGlmICghcmVtb3RlX3NlcnZpY2VzLm1lc3NhZ2VfY2FjaGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgXCJSZW1vdGUgY2xpZW50IGRvZXMgbm90IHN1cHBvcnQgbWVzc2FnZSBjYWNoaW5nIGZvciBsYXJnZSBtZXNzYWdlcy5cIixcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29uc3QgbWVzc2FnZV9jYWNoZSA9IHJlbW90ZV9zZXJ2aWNlcy5tZXNzYWdlX2NhY2hlO1xuICAgIGNvbnN0IG1lc3NhZ2VfaWQgPSBzZXNzaW9uX2lkIHx8ICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLnJhbmRJZCkoKTtcbiAgICBjb25zdCB0b3RhbF9zaXplID0gZGF0YS5sZW5ndGg7XG4gICAgY29uc3Qgc3RhcnRfdGltZSA9IERhdGUubm93KCk7IC8vIG1lYXN1cmUgdGltZVxuICAgIGNvbnN0IGNodW5rX251bSA9IE1hdGguY2VpbCh0b3RhbF9zaXplIC8gdGhpcy5fbG9uZ19tZXNzYWdlX2NodW5rX3NpemUpO1xuICAgIGlmIChyZW1vdGVfc2VydmljZXMuY29uZmlnLmFwaV92ZXJzaW9uID49IDMpIHtcbiAgICAgIGF3YWl0IG1lc3NhZ2VfY2FjaGUuY3JlYXRlKG1lc3NhZ2VfaWQsICEhc2Vzc2lvbl9pZCk7XG4gICAgICBjb25zdCBzZW1hcGhvcmUgPSBuZXcgX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uU2VtYXBob3JlKENPTkNVUlJFTkNZX0xJTUlUKTtcblxuICAgICAgY29uc3QgdGFza3MgPSBbXTtcbiAgICAgIGZvciAobGV0IGlkeCA9IDA7IGlkeCA8IGNodW5rX251bTsgaWR4KyspIHtcbiAgICAgICAgY29uc3Qgc3RhcnRCeXRlID0gaWR4ICogdGhpcy5fbG9uZ19tZXNzYWdlX2NodW5rX3NpemU7XG4gICAgICAgIGNvbnN0IGNodW5rID0gZGF0YS5zbGljZShcbiAgICAgICAgICBzdGFydEJ5dGUsXG4gICAgICAgICAgc3RhcnRCeXRlICsgdGhpcy5fbG9uZ19tZXNzYWdlX2NodW5rX3NpemUsXG4gICAgICAgICk7XG5cbiAgICAgICAgY29uc3QgdGFza0ZuID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGF3YWl0IG1lc3NhZ2VfY2FjaGUuc2V0KG1lc3NhZ2VfaWQsIGlkeCwgY2h1bmssICEhc2Vzc2lvbl9pZCk7XG4gICAgICAgICAgY29uc29sZS5kZWJ1ZyhcbiAgICAgICAgICAgIGBTZW5kaW5nIGNodW5rICR7aWR4ICsgMX0vJHtjaHVua19udW19ICh0b3RhbD0ke3RvdGFsX3NpemV9IGJ5dGVzKWAsXG4gICAgICAgICAgKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBQdXNoIGludG8gYW4gYXJyYXksIGVhY2ggb25lIHJ1bnMgdW5kZXIgdGhlIHNlbWFwaG9yZVxuICAgICAgICB0YXNrcy5wdXNoKHNlbWFwaG9yZS5ydW4odGFza0ZuKSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFdhaXQgZm9yIGFsbCBjaHVuayB1cGxvYWRzIHRvIGZpbmlzaFxuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwodGFza3MpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyAzKSBMZWdhY3kgdmVyc2lvbiAoc2VxdWVudGlhbCBhcHBlbmRzKTpcbiAgICAgIGF3YWl0IG1lc3NhZ2VfY2FjaGUuY3JlYXRlKG1lc3NhZ2VfaWQsICEhc2Vzc2lvbl9pZCk7XG4gICAgICBmb3IgKGxldCBpZHggPSAwOyBpZHggPCBjaHVua19udW07IGlkeCsrKSB7XG4gICAgICAgIGNvbnN0IHN0YXJ0Qnl0ZSA9IGlkeCAqIHRoaXMuX2xvbmdfbWVzc2FnZV9jaHVua19zaXplO1xuICAgICAgICBjb25zdCBjaHVuayA9IGRhdGEuc2xpY2UoXG4gICAgICAgICAgc3RhcnRCeXRlLFxuICAgICAgICAgIHN0YXJ0Qnl0ZSArIHRoaXMuX2xvbmdfbWVzc2FnZV9jaHVua19zaXplLFxuICAgICAgICApO1xuICAgICAgICBhd2FpdCBtZXNzYWdlX2NhY2hlLmFwcGVuZChtZXNzYWdlX2lkLCBjaHVuaywgISFzZXNzaW9uX2lkKTtcbiAgICAgICAgY29uc29sZS5kZWJ1ZyhcbiAgICAgICAgICBgU2VuZGluZyBjaHVuayAke2lkeCArIDF9LyR7Y2h1bmtfbnVtfSAodG90YWw9JHt0b3RhbF9zaXplfSBieXRlcylgLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgICBhd2FpdCBtZXNzYWdlX2NhY2hlLnByb2Nlc3MobWVzc2FnZV9pZCwgISFzZXNzaW9uX2lkKTtcbiAgICBjb25zdCBkdXJhdGlvblNlYyA9ICgoRGF0ZS5ub3coKSAtIHN0YXJ0X3RpbWUpIC8gMTAwMCkudG9GaXhlZCgyKTtcbiAgICBjb25zb2xlLmRlYnVnKGBBbGwgY2h1bmtzICgke3RvdGFsX3NpemV9IGJ5dGVzKSBzZW50IGluICR7ZHVyYXRpb25TZWN9IHNgKTtcbiAgfVxuXG4gIGVtaXQobWFpbl9tZXNzYWdlLCBleHRyYV9kYXRhKSB7XG4gICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KShcbiAgICAgIHR5cGVvZiBtYWluX21lc3NhZ2UgPT09IFwib2JqZWN0XCIgJiYgbWFpbl9tZXNzYWdlLnR5cGUsXG4gICAgICBcIkludmFsaWQgbWVzc2FnZSwgbXVzdCBiZSBhbiBvYmplY3Qgd2l0aCBhIGB0eXBlYCBmaWVsZHMuXCIsXG4gICAgKTtcbiAgICBpZiAoIW1haW5fbWVzc2FnZS50bykge1xuICAgICAgdGhpcy5fZmlyZShtYWluX21lc3NhZ2UudHlwZSwgbWFpbl9tZXNzYWdlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbGV0IG1lc3NhZ2VfcGFja2FnZSA9ICgwLF9tc2dwYWNrX21zZ3BhY2tfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzNfXy5lbmNvZGUpKG1haW5fbWVzc2FnZSk7XG4gICAgaWYgKGV4dHJhX2RhdGEpIHtcbiAgICAgIGNvbnN0IGV4dHJhID0gKDAsX21zZ3BhY2tfbXNncGFja19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfM19fLmVuY29kZSkoZXh0cmFfZGF0YSk7XG4gICAgICBtZXNzYWdlX3BhY2thZ2UgPSBuZXcgVWludDhBcnJheShbLi4ubWVzc2FnZV9wYWNrYWdlLCAuLi5leHRyYV0pO1xuICAgIH1cbiAgICBjb25zdCB0b3RhbF9zaXplID0gbWVzc2FnZV9wYWNrYWdlLmxlbmd0aDtcbiAgICBpZiAodG90YWxfc2l6ZSA+IHRoaXMuX2xvbmdfbWVzc2FnZV9jaHVua19zaXplICsgMTAyNCkge1xuICAgICAgY29uc29sZS53YXJuKGBTZW5kaW5nIGxhcmdlIG1lc3NhZ2UgKHNpemU9JHt0b3RhbF9zaXplfSlgKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2VtaXRfbWVzc2FnZShtZXNzYWdlX3BhY2thZ2UpO1xuICB9XG5cbiAgX2dlbmVyYXRlX3JlbW90ZV9tZXRob2QoXG4gICAgZW5jb2RlZF9tZXRob2QsXG4gICAgcmVtb3RlX3BhcmVudCxcbiAgICBsb2NhbF9wYXJlbnQsXG4gICAgcmVtb3RlX3dvcmtzcGFjZSxcbiAgICBsb2NhbF93b3Jrc3BhY2UsXG4gICkge1xuICAgIGxldCB0YXJnZXRfaWQgPSBlbmNvZGVkX21ldGhvZC5fcnRhcmdldDtcbiAgICBpZiAocmVtb3RlX3dvcmtzcGFjZSAmJiAhdGFyZ2V0X2lkLmluY2x1ZGVzKFwiL1wiKSkge1xuICAgICAgaWYgKHJlbW90ZV93b3Jrc3BhY2UgIT09IHRhcmdldF9pZCkge1xuICAgICAgICB0YXJnZXRfaWQgPSByZW1vdGVfd29ya3NwYWNlICsgXCIvXCIgKyB0YXJnZXRfaWQ7XG4gICAgICB9XG4gICAgICAvLyBGaXggdGhlIHRhcmdldCBpZCB0byBiZSBhbiBhYnNvbHV0ZSBpZFxuICAgICAgZW5jb2RlZF9tZXRob2QuX3J0YXJnZXQgPSB0YXJnZXRfaWQ7XG4gICAgfVxuICAgIGxldCBtZXRob2RfaWQgPSBlbmNvZGVkX21ldGhvZC5fcm1ldGhvZDtcbiAgICBsZXQgd2l0aF9wcm9taXNlID0gZW5jb2RlZF9tZXRob2QuX3Jwcm9taXNlIHx8IGZhbHNlO1xuICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gYG1ldGhvZDogJHttZXRob2RfaWR9LCBkb2NzOiAke2VuY29kZWRfbWV0aG9kLl9yZG9jfWA7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICBmdW5jdGlvbiByZW1vdGVfbWV0aG9kKCkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgbGV0IGxvY2FsX3Nlc3Npb25faWQgPSAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5yYW5kSWQpKCk7XG4gICAgICAgIGlmIChsb2NhbF9wYXJlbnQpIHtcbiAgICAgICAgICAvLyBTdG9yZSB0aGUgY2hpbGRyZW4gc2Vzc2lvbiB1bmRlciB0aGUgcGFyZW50XG4gICAgICAgICAgbG9jYWxfc2Vzc2lvbl9pZCA9IGxvY2FsX3BhcmVudCArIFwiLlwiICsgbG9jYWxfc2Vzc2lvbl9pZDtcbiAgICAgICAgfVxuICAgICAgICBsZXQgc3RvcmUgPSBzZWxmLl9nZXRfc2Vzc2lvbl9zdG9yZShsb2NhbF9zZXNzaW9uX2lkLCB0cnVlKTtcbiAgICAgICAgaWYgKCFzdG9yZSkge1xuICAgICAgICAgIHJlamVjdChcbiAgICAgICAgICAgIG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgYFJ1bnRpbWUgRXJyb3I6IEZhaWxlZCB0byBnZXQgc2Vzc2lvbiBzdG9yZSAke2xvY2FsX3Nlc3Npb25faWR9IChjb250ZXh0OiAke2Rlc2NyaXB0aW9ufSlgLFxuICAgICAgICAgICAgKSxcbiAgICAgICAgICApO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzdG9yZVtcInRhcmdldF9pZFwiXSA9IHRhcmdldF9pZDtcbiAgICAgICAgY29uc3QgYXJncyA9IGF3YWl0IHNlbGYuX2VuY29kZShcbiAgICAgICAgICBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLFxuICAgICAgICAgIGxvY2FsX3Nlc3Npb25faWQsXG4gICAgICAgICAgbG9jYWxfd29ya3NwYWNlLFxuICAgICAgICApO1xuICAgICAgICBjb25zdCBhcmdMZW5ndGggPSBhcmdzLmxlbmd0aDtcbiAgICAgICAgLy8gaWYgdGhlIGxhc3QgYXJndW1lbnQgaXMgYW4gb2JqZWN0LCBtYXJrIGl0IGFzIGt3YXJnc1xuICAgICAgICBjb25zdCB3aXRoS3dhcmdzID1cbiAgICAgICAgICBhcmdMZW5ndGggPiAwICYmXG4gICAgICAgICAgdHlwZW9mIGFyZ3NbYXJnTGVuZ3RoIC0gMV0gPT09IFwib2JqZWN0XCIgJiZcbiAgICAgICAgICBhcmdzW2FyZ0xlbmd0aCAtIDFdICE9PSBudWxsICYmXG4gICAgICAgICAgYXJnc1thcmdMZW5ndGggLSAxXS5fcmt3YXJncztcbiAgICAgICAgaWYgKHdpdGhLd2FyZ3MpIGRlbGV0ZSBhcmdzW2FyZ0xlbmd0aCAtIDFdLl9ya3dhcmdzO1xuXG4gICAgICAgIGxldCBmcm9tX2NsaWVudDtcbiAgICAgICAgaWYgKCFzZWxmLl9sb2NhbF93b3Jrc3BhY2UpIHtcbiAgICAgICAgICBmcm9tX2NsaWVudCA9IHNlbGYuX2NsaWVudF9pZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmcm9tX2NsaWVudCA9IHNlbGYuX2xvY2FsX3dvcmtzcGFjZSArIFwiL1wiICsgc2VsZi5fY2xpZW50X2lkO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IG1haW5fbWVzc2FnZSA9IHtcbiAgICAgICAgICB0eXBlOiBcIm1ldGhvZFwiLFxuICAgICAgICAgIGZyb206IGZyb21fY2xpZW50LFxuICAgICAgICAgIHRvOiB0YXJnZXRfaWQsXG4gICAgICAgICAgbWV0aG9kOiBtZXRob2RfaWQsXG4gICAgICAgIH07XG4gICAgICAgIGxldCBleHRyYV9kYXRhID0ge307XG4gICAgICAgIGlmIChhcmdzKSB7XG4gICAgICAgICAgZXh0cmFfZGF0YVtcImFyZ3NcIl0gPSBhcmdzO1xuICAgICAgICB9XG4gICAgICAgIGlmICh3aXRoS3dhcmdzKSB7XG4gICAgICAgICAgZXh0cmFfZGF0YVtcIndpdGhfa3dhcmdzXCJdID0gd2l0aEt3YXJncztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFxuICAgICAgICAvLyAgIGBDYWxsaW5nIHJlbW90ZSBtZXRob2QgJHt0YXJnZXRfaWR9OiR7bWV0aG9kX2lkfSwgc2Vzc2lvbjogJHtsb2NhbF9zZXNzaW9uX2lkfWBcbiAgICAgICAgLy8gKTtcbiAgICAgICAgaWYgKHJlbW90ZV9wYXJlbnQpIHtcbiAgICAgICAgICAvLyBTZXQgdGhlIHBhcmVudCBzZXNzaW9uXG4gICAgICAgICAgLy8gTm90ZTogSXQncyBhIHNlc3Npb24gaWQgZm9yIHRoZSByZW1vdGUsIG5vdCB0aGUgY3VycmVudCBjbGllbnRcbiAgICAgICAgICBtYWluX21lc3NhZ2VbXCJwYXJlbnRcIl0gPSByZW1vdGVfcGFyZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHRpbWVyID0gbnVsbDtcbiAgICAgICAgaWYgKHdpdGhfcHJvbWlzZSkge1xuICAgICAgICAgIC8vIE9ubHkgcGFzcyB0aGUgY3VycmVudCBzZXNzaW9uIGlkIHRvIHRoZSByZW1vdGVcbiAgICAgICAgICAvLyBpZiB3ZSB3YW50IHRvIHJlY2VpdmVkIHRoZSByZXN1bHRcbiAgICAgICAgICAvLyBJLmUuIHRoZSBzZXNzaW9uIGlkIHdvbid0IGJlIHBhc3NlZCBmb3IgcHJvbWlzZXMgdGhlbXNlbHZlc1xuICAgICAgICAgIG1haW5fbWVzc2FnZVtcInNlc3Npb25cIl0gPSBsb2NhbF9zZXNzaW9uX2lkO1xuICAgICAgICAgIGxldCBtZXRob2RfbmFtZSA9IGAke3RhcmdldF9pZH06JHttZXRob2RfaWR9YDtcbiAgICAgICAgICB0aW1lciA9IG5ldyBUaW1lcihcbiAgICAgICAgICAgIHNlbGYuX21ldGhvZF90aW1lb3V0LFxuICAgICAgICAgICAgcmVqZWN0LFxuICAgICAgICAgICAgW2BNZXRob2QgY2FsbCB0aW1lIG91dDogJHttZXRob2RfbmFtZX0sIGNvbnRleHQ6ICR7ZGVzY3JpcHRpb259YF0sXG4gICAgICAgICAgICBtZXRob2RfbmFtZSxcbiAgICAgICAgICApO1xuICAgICAgICAgIC8vIEJ5IGRlZmF1bHQsIGh5cGhhIHdpbGwgY2xlYXIgdGhlIHNlc3Npb24gYWZ0ZXIgdGhlIG1ldGhvZCBpcyBjYWxsZWRcbiAgICAgICAgICAvLyBIb3dldmVyLCBpZiB0aGUgYXJncyBjb250YWlucyBfcmludGYgPT09IHRydWUsIHdlIHdpbGwgbm90IGNsZWFyIHRoZSBzZXNzaW9uXG4gICAgICAgICAgbGV0IGNsZWFyX2FmdGVyX2NhbGxlZCA9IHRydWU7XG4gICAgICAgICAgZm9yIChsZXQgYXJnIG9mIGFyZ3MpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYXJnID09PSBcIm9iamVjdFwiICYmIGFyZy5fcmludGYgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgY2xlYXJfYWZ0ZXJfY2FsbGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBwcm9taXNlRGF0YSA9IGF3YWl0IHNlbGYuX2VuY29kZV9wcm9taXNlKFxuICAgICAgICAgICAgcmVzb2x2ZSxcbiAgICAgICAgICAgIHJlamVjdCxcbiAgICAgICAgICAgIGxvY2FsX3Nlc3Npb25faWQsXG4gICAgICAgICAgICBjbGVhcl9hZnRlcl9jYWxsZWQsXG4gICAgICAgICAgICB0aW1lcixcbiAgICAgICAgICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICAgICk7XG5cbiAgICAgICAgICBpZiAod2l0aF9wcm9taXNlID09PSB0cnVlKSB7XG4gICAgICAgICAgICBleHRyYV9kYXRhW1wicHJvbWlzZVwiXSA9IHByb21pc2VEYXRhO1xuICAgICAgICAgIH0gZWxzZSBpZiAod2l0aF9wcm9taXNlID09PSBcIipcIikge1xuICAgICAgICAgICAgZXh0cmFfZGF0YVtcInByb21pc2VcIl0gPSBcIipcIjtcbiAgICAgICAgICAgIGV4dHJhX2RhdGFbXCJ0XCJdID0gc2VsZi5fbWV0aG9kX3RpbWVvdXQgLyAyO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIHByb21pc2UgdHlwZTogJHt3aXRoX3Byb21pc2V9YCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFRoZSBtZXNzYWdlIGNvbnNpc3RzIG9mIHR3byBzZWdtZW50cywgdGhlIG1haW4gbWVzc2FnZSBhbmQgZXh0cmEgZGF0YVxuICAgICAgICBsZXQgbWVzc2FnZV9wYWNrYWdlID0gKDAsX21zZ3BhY2tfbXNncGFja19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfM19fLmVuY29kZSkobWFpbl9tZXNzYWdlKTtcbiAgICAgICAgaWYgKGV4dHJhX2RhdGEpIHtcbiAgICAgICAgICBjb25zdCBleHRyYSA9ICgwLF9tc2dwYWNrX21zZ3BhY2tfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzNfXy5lbmNvZGUpKGV4dHJhX2RhdGEpO1xuICAgICAgICAgIG1lc3NhZ2VfcGFja2FnZSA9IG5ldyBVaW50OEFycmF5KFsuLi5tZXNzYWdlX3BhY2thZ2UsIC4uLmV4dHJhXSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdG90YWxfc2l6ZSA9IG1lc3NhZ2VfcGFja2FnZS5sZW5ndGg7XG4gICAgICAgIGlmIChcbiAgICAgICAgICB0b3RhbF9zaXplIDw9IHNlbGYuX2xvbmdfbWVzc2FnZV9jaHVua19zaXplICsgMTAyNCB8fFxuICAgICAgICAgIHJlbW90ZV9tZXRob2QuX19ub19jaHVua19fXG4gICAgICAgICkge1xuICAgICAgICAgIHNlbGZcbiAgICAgICAgICAgIC5fZW1pdF9tZXNzYWdlKG1lc3NhZ2VfcGFja2FnZSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgaWYgKHRpbWVyKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgcmVzb2x2ZWQgc3VjY2Vzc2Z1bGx5LCByZXNldCB0aGUgdGltZXJcbiAgICAgICAgICAgICAgICB0aW1lci5yZXNldCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBzZW5kIG1lc3NhZ2VcIiwgZXJyKTtcbiAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgIGlmICh0aW1lcikge1xuICAgICAgICAgICAgICAgIHRpbWVyLmNsZWFyKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHNlbmQgY2h1bmsgYnkgY2h1bmtcbiAgICAgICAgICBzZWxmXG4gICAgICAgICAgICAuX3NlbmRfY2h1bmtzKG1lc3NhZ2VfcGFja2FnZSwgdGFyZ2V0X2lkLCByZW1vdGVfcGFyZW50KVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICBpZiAodGltZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiByZXNvbHZlZCBzdWNjZXNzZnVsbHksIHJlc2V0IHRoZSB0aW1lclxuICAgICAgICAgICAgICAgIHRpbWVyLnJlc2V0KCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHNlbmQgbWVzc2FnZVwiLCBlcnIpO1xuICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgaWYgKHRpbWVyKSB7XG4gICAgICAgICAgICAgICAgdGltZXIuY2xlYXIoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEdlbmVyYXRlIGRlYnVnZ2luZyBpbmZvcm1hdGlvbiBmb3IgdGhlIG1ldGhvZFxuICAgIHJlbW90ZV9tZXRob2QuX19ycGNfb2JqZWN0X18gPSBlbmNvZGVkX21ldGhvZDtcbiAgICBjb25zdCBwYXJ0cyA9IG1ldGhvZF9pZC5zcGxpdChcIi5cIik7XG5cbiAgICByZW1vdGVfbWV0aG9kLl9fbmFtZV9fID0gZW5jb2RlZF9tZXRob2QuX3JuYW1lIHx8IHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdO1xuICAgIGlmIChyZW1vdGVfbWV0aG9kLl9fbmFtZV9fLmluY2x1ZGVzKFwiI1wiKSkge1xuICAgICAgcmVtb3RlX21ldGhvZC5fX25hbWVfXyA9IHJlbW90ZV9tZXRob2QuX19uYW1lX18uc3BsaXQoXCIjXCIpWzFdO1xuICAgIH1cbiAgICByZW1vdGVfbWV0aG9kLl9fZG9jX18gPVxuICAgICAgZW5jb2RlZF9tZXRob2QuX3Jkb2MgfHwgYFJlbW90ZSBtZXRob2Q6ICR7bWV0aG9kX2lkfWA7XG4gICAgcmVtb3RlX21ldGhvZC5fX3NjaGVtYV9fID0gZW5jb2RlZF9tZXRob2QuX3JzY2hlbWE7XG4gICAgLy8gUHJldmVudCBjaXJjdWxhciBjaHVuayBzZW5kaW5nXG4gICAgcmVtb3RlX21ldGhvZC5fX25vX2NodW5rX18gPVxuICAgICAgZW5jb2RlZF9tZXRob2QuX3JtZXRob2QgPT09IFwic2VydmljZXMuYnVpbHQtaW4ubWVzc2FnZV9jYWNoZS5hcHBlbmRcIjtcbiAgICByZXR1cm4gcmVtb3RlX21ldGhvZDtcbiAgfVxuXG4gIGdldF9jbGllbnRfaW5mbygpIHtcbiAgICBjb25zdCBzZXJ2aWNlcyA9IFtdO1xuICAgIGZvciAobGV0IHNlcnZpY2Ugb2YgT2JqZWN0LnZhbHVlcyh0aGlzLl9zZXJ2aWNlcykpIHtcbiAgICAgIHNlcnZpY2VzLnB1c2godGhpcy5fZXh0cmFjdF9zZXJ2aWNlX2luZm8oc2VydmljZSkpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBpZDogdGhpcy5fY2xpZW50X2lkLFxuICAgICAgc2VydmljZXM6IHNlcnZpY2VzLFxuICAgIH07XG4gIH1cblxuICBhc3luYyBfaGFuZGxlX21ldGhvZChkYXRhKSB7XG4gICAgbGV0IHJlamVjdCA9IG51bGw7XG4gICAgbGV0IGhlYXJ0YmVhdF90YXNrID0gbnVsbDtcbiAgICB0cnkge1xuICAgICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KShkYXRhLm1ldGhvZCAmJiBkYXRhLmN0eCAmJiBkYXRhLmZyb20pO1xuICAgICAgY29uc3QgbWV0aG9kX25hbWUgPSBkYXRhLmZyb20gKyBcIjpcIiArIGRhdGEubWV0aG9kO1xuICAgICAgY29uc3QgcmVtb3RlX3dvcmtzcGFjZSA9IGRhdGEuZnJvbS5zcGxpdChcIi9cIilbMF07XG4gICAgICBjb25zdCByZW1vdGVfY2xpZW50X2lkID0gZGF0YS5mcm9tLnNwbGl0KFwiL1wiKVsxXTtcbiAgICAgIC8vIE1ha2Ugc3VyZSB0aGUgdGFyZ2V0IGlkIGlzIGFuIGFic29sdXRlIGlkXG4gICAgICBkYXRhW1widG9cIl0gPSBkYXRhW1widG9cIl0uaW5jbHVkZXMoXCIvXCIpXG4gICAgICAgID8gZGF0YVtcInRvXCJdXG4gICAgICAgIDogcmVtb3RlX3dvcmtzcGFjZSArIFwiL1wiICsgZGF0YVtcInRvXCJdO1xuICAgICAgZGF0YVtcImN0eFwiXVtcInRvXCJdID0gZGF0YVtcInRvXCJdO1xuICAgICAgbGV0IGxvY2FsX3dvcmtzcGFjZTtcbiAgICAgIGlmICghdGhpcy5fbG9jYWxfd29ya3NwYWNlKSB7XG4gICAgICAgIGxvY2FsX3dvcmtzcGFjZSA9IGRhdGFbXCJ0b1wiXS5zcGxpdChcIi9cIilbMF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5fbG9jYWxfd29ya3NwYWNlICYmIHRoaXMuX2xvY2FsX3dvcmtzcGFjZSAhPT0gXCIqXCIpIHtcbiAgICAgICAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKFxuICAgICAgICAgICAgZGF0YVtcInRvXCJdLnNwbGl0KFwiL1wiKVswXSA9PT0gdGhpcy5fbG9jYWxfd29ya3NwYWNlLFxuICAgICAgICAgICAgXCJXb3Jrc3BhY2UgbWlzbWF0Y2g6IFwiICtcbiAgICAgICAgICAgICAgZGF0YVtcInRvXCJdLnNwbGl0KFwiL1wiKVswXSArXG4gICAgICAgICAgICAgIFwiICE9IFwiICtcbiAgICAgICAgICAgICAgdGhpcy5fbG9jYWxfd29ya3NwYWNlLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgbG9jYWxfd29ya3NwYWNlID0gdGhpcy5fbG9jYWxfd29ya3NwYWNlO1xuICAgICAgfVxuICAgICAgY29uc3QgbG9jYWxfcGFyZW50ID0gZGF0YS5wYXJlbnQ7XG5cbiAgICAgIGxldCByZXNvbHZlLCByZWplY3Q7XG4gICAgICBpZiAoZGF0YS5wcm9taXNlKSB7XG4gICAgICAgIC8vIERlY29kZSB0aGUgcHJvbWlzZSB3aXRoIHRoZSByZW1vdGUgc2Vzc2lvbiBpZFxuICAgICAgICAvLyBTdWNoIHRoYXQgdGhlIHNlc3Npb24gaWQgd2lsbCBiZSBwYXNzZWQgdG8gdGhlIHJlbW90ZSBhcyBhIHBhcmVudCBzZXNzaW9uIGlkXG4gICAgICAgIGNvbnN0IHByb21pc2UgPSBhd2FpdCB0aGlzLl9kZWNvZGUoXG4gICAgICAgICAgZGF0YS5wcm9taXNlID09PSBcIipcIiA/IHRoaXMuX2V4cGFuZF9wcm9taXNlKGRhdGEpIDogZGF0YS5wcm9taXNlLFxuICAgICAgICAgIGRhdGEuc2Vzc2lvbixcbiAgICAgICAgICBsb2NhbF9wYXJlbnQsXG4gICAgICAgICAgcmVtb3RlX3dvcmtzcGFjZSxcbiAgICAgICAgICBsb2NhbF93b3Jrc3BhY2UsXG4gICAgICAgICk7XG4gICAgICAgIHJlc29sdmUgPSBwcm9taXNlLnJlc29sdmU7XG4gICAgICAgIHJlamVjdCA9IHByb21pc2UucmVqZWN0O1xuICAgICAgICBpZiAocHJvbWlzZS5oZWFydGJlYXQgJiYgcHJvbWlzZS5pbnRlcnZhbCkge1xuICAgICAgICAgIGFzeW5jIGZ1bmN0aW9uIGhlYXJ0YmVhdCgpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIC8vIGNvbnNvbGUuZGVidWcoXCJSZXNldCBoZWFydGJlYXQgdGltZXI6IFwiICsgZGF0YS5tZXRob2QpO1xuICAgICAgICAgICAgICBhd2FpdCBwcm9taXNlLmhlYXJ0YmVhdCgpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaGVhcnRiZWF0X3Rhc2sgPSBzZXRJbnRlcnZhbChoZWFydGJlYXQsIHByb21pc2UuaW50ZXJ2YWwgKiAxMDAwKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBsZXQgbWV0aG9kO1xuXG4gICAgICB0cnkge1xuICAgICAgICBtZXRob2QgPSBpbmRleE9iamVjdCh0aGlzLl9vYmplY3Rfc3RvcmUsIGRhdGFbXCJtZXRob2RcIl0pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBjb25zb2xlLmRlYnVnKFwiRmFpbGVkIHRvIGZpbmQgbWV0aG9kXCIsIG1ldGhvZF9uYW1lLCB0aGlzLl9jbGllbnRfaWQsIGUpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYE1ldGhvZCBub3QgZm91bmQ6ICR7bWV0aG9kX25hbWV9IGF0ICR7dGhpcy5fY2xpZW50X2lkfWAsXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLmFzc2VydCkoXG4gICAgICAgIG1ldGhvZCAmJiB0eXBlb2YgbWV0aG9kID09PSBcImZ1bmN0aW9uXCIsXG4gICAgICAgIFwiSW52YWxpZCBtZXRob2Q6IFwiICsgbWV0aG9kX25hbWUsXG4gICAgICApO1xuXG4gICAgICAvLyBDaGVjayBwZXJtaXNzaW9uXG4gICAgICBpZiAodGhpcy5fbWV0aG9kX2Fubm90YXRpb25zLmhhcyhtZXRob2QpKSB7XG4gICAgICAgIC8vIEZvciBzZXJ2aWNlcywgaXQgc2hvdWxkIG5vdCBiZSBwcm90ZWN0ZWRcbiAgICAgICAgaWYgKHRoaXMuX21ldGhvZF9hbm5vdGF0aW9ucy5nZXQobWV0aG9kKS52aXNpYmlsaXR5ID09PSBcInByb3RlY3RlZFwiKSB7XG4gICAgICAgICAgaWYgKFxuICAgICAgICAgICAgbG9jYWxfd29ya3NwYWNlICE9PSByZW1vdGVfd29ya3NwYWNlICYmXG4gICAgICAgICAgICAocmVtb3RlX3dvcmtzcGFjZSAhPT0gXCIqXCIgfHxcbiAgICAgICAgICAgICAgcmVtb3RlX2NsaWVudF9pZCAhPT0gdGhpcy5fY29ubmVjdGlvbi5tYW5hZ2VyX2lkKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBcIlBlcm1pc3Npb24gZGVuaWVkIGZvciBpbnZva2luZyBwcm90ZWN0ZWQgbWV0aG9kIFwiICtcbiAgICAgICAgICAgICAgICBtZXRob2RfbmFtZSArXG4gICAgICAgICAgICAgICAgXCIsIHdvcmtzcGFjZSBtaXNtYXRjaDogXCIgK1xuICAgICAgICAgICAgICAgIGxvY2FsX3dvcmtzcGFjZSArXG4gICAgICAgICAgICAgICAgXCIgIT0gXCIgK1xuICAgICAgICAgICAgICAgIHJlbW90ZV93b3Jrc3BhY2UsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRm9yIHNlc3Npb25zLCB0aGUgdGFyZ2V0X2lkIHNob3VsZCBtYXRjaCBleGFjdGx5XG4gICAgICAgIGxldCBzZXNzaW9uX3RhcmdldF9pZCA9XG4gICAgICAgICAgdGhpcy5fb2JqZWN0X3N0b3JlW2RhdGEubWV0aG9kLnNwbGl0KFwiLlwiKVswXV0udGFyZ2V0X2lkO1xuICAgICAgICBpZiAoXG4gICAgICAgICAgbG9jYWxfd29ya3NwYWNlID09PSByZW1vdGVfd29ya3NwYWNlICYmXG4gICAgICAgICAgc2Vzc2lvbl90YXJnZXRfaWQgJiZcbiAgICAgICAgICBzZXNzaW9uX3RhcmdldF9pZC5pbmRleE9mKFwiL1wiKSA9PT0gLTFcbiAgICAgICAgKSB7XG4gICAgICAgICAgc2Vzc2lvbl90YXJnZXRfaWQgPSBsb2NhbF93b3Jrc3BhY2UgKyBcIi9cIiArIHNlc3Npb25fdGFyZ2V0X2lkO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZXNzaW9uX3RhcmdldF9pZCAhPT0gZGF0YS5mcm9tKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgXCJBY2Nlc3MgZGVuaWVkIGZvciBtZXRob2QgY2FsbCAoXCIgK1xuICAgICAgICAgICAgICBtZXRob2RfbmFtZSArXG4gICAgICAgICAgICAgIFwiKSBmcm9tIFwiICtcbiAgICAgICAgICAgICAgZGF0YS5mcm9tICtcbiAgICAgICAgICAgICAgXCIgdG8gdGFyZ2V0IFwiICtcbiAgICAgICAgICAgICAgc2Vzc2lvbl90YXJnZXRfaWQsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBNYWtlIHN1cmUgdGhlIHBhcmVudCBzZXNzaW9uIGlzIHN0aWxsIG9wZW5cbiAgICAgIGlmIChsb2NhbF9wYXJlbnQpIHtcbiAgICAgICAgLy8gVGhlIHBhcmVudCBzZXNzaW9uIHNob3VsZCBiZSBhIHNlc3Npb24gdGhhdCBnZW5lcmF0ZSB0aGUgY3VycmVudCBtZXRob2QgY2FsbFxuICAgICAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKFxuICAgICAgICAgIHRoaXMuX2dldF9zZXNzaW9uX3N0b3JlKGxvY2FsX3BhcmVudCwgdHJ1ZSkgIT09IG51bGwsXG4gICAgICAgICAgXCJQYXJlbnQgc2Vzc2lvbiB3YXMgY2xvc2VkOiBcIiArIGxvY2FsX3BhcmVudCxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIGxldCBhcmdzO1xuICAgICAgaWYgKGRhdGEuYXJncykge1xuICAgICAgICBhcmdzID0gYXdhaXQgdGhpcy5fZGVjb2RlKFxuICAgICAgICAgIGRhdGEuYXJncyxcbiAgICAgICAgICBkYXRhLnNlc3Npb24sXG4gICAgICAgICAgbnVsbCxcbiAgICAgICAgICByZW1vdGVfd29ya3NwYWNlLFxuICAgICAgICAgIG51bGwsXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhcmdzID0gW107XG4gICAgICB9XG4gICAgICBpZiAoXG4gICAgICAgIHRoaXMuX21ldGhvZF9hbm5vdGF0aW9ucy5oYXMobWV0aG9kKSAmJlxuICAgICAgICB0aGlzLl9tZXRob2RfYW5ub3RhdGlvbnMuZ2V0KG1ldGhvZCkucmVxdWlyZV9jb250ZXh0XG4gICAgICApIHtcbiAgICAgICAgLy8gaWYgYXJncy5sZW5ndGggKyAxIGlzIGxlc3MgdGhhbiB0aGUgcmVxdWlyZWQgbnVtYmVyIG9mIGFyZ3VtZW50cyB3ZSB3aWxsIHBhZCB3aXRoIHVuZGVmaW5lZFxuICAgICAgICAvLyBzbyB3ZSBtYWtlIHN1cmUgdGhlIGxhc3QgYXJndW1lbnQgaXMgdGhlIGNvbnRleHRcbiAgICAgICAgaWYgKGFyZ3MubGVuZ3RoICsgMSA8IG1ldGhvZC5sZW5ndGgpIHtcbiAgICAgICAgICBmb3IgKGxldCBpID0gYXJncy5sZW5ndGg7IGkgPCBtZXRob2QubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzLnB1c2godW5kZWZpbmVkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYXJncy5wdXNoKGRhdGEuY3R4KTtcbiAgICAgICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KShcbiAgICAgICAgICBhcmdzLmxlbmd0aCA9PT0gbWV0aG9kLmxlbmd0aCxcbiAgICAgICAgICBgUnVudGltZSBFcnJvcjogSW52YWxpZCBudW1iZXIgb2YgYXJndW1lbnRzIGZvciBtZXRob2QgJHttZXRob2RfbmFtZX0sIGV4cGVjdGVkICR7bWV0aG9kLmxlbmd0aH0gYnV0IGdvdCAke2FyZ3MubGVuZ3RofWAsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICAvLyBjb25zb2xlLmRlYnVnKGBFeGVjdXRpbmcgbWV0aG9kOiAke21ldGhvZF9uYW1lfSAoJHtkYXRhLm1ldGhvZH0pYCk7XG4gICAgICBpZiAoZGF0YS5wcm9taXNlKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IG1ldGhvZC5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgICByZXN1bHRcbiAgICAgICAgICAgIC50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICBjbGVhckludGVydmFsKGhlYXJ0YmVhdF90YXNrKTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChoZWFydGJlYXRfdGFzayk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgY2xlYXJJbnRlcnZhbChoZWFydGJlYXRfdGFzayk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1ldGhvZC5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChoZWFydGJlYXRfdGFzayk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAocmVqZWN0KSB7XG4gICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAvLyBjb25zb2xlLmRlYnVnKFwiRXJyb3IgZHVyaW5nIGNhbGxpbmcgbWV0aG9kOiBcIiwgZXJyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBkdXJpbmcgY2FsbGluZyBtZXRob2Q6IFwiLCBlcnIpO1xuICAgICAgfVxuICAgICAgLy8gbWFrZSBzdXJlIHdlIGNsZWFyIHRoZSBoZWFydGJlYXQgdGltZXJcbiAgICAgIGNsZWFySW50ZXJ2YWwoaGVhcnRiZWF0X3Rhc2spO1xuICAgIH1cbiAgfVxuXG4gIGVuY29kZShhT2JqZWN0LCBzZXNzaW9uX2lkKSB7XG4gICAgcmV0dXJuIHRoaXMuX2VuY29kZShhT2JqZWN0LCBzZXNzaW9uX2lkKTtcbiAgfVxuXG4gIF9nZXRfc2Vzc2lvbl9zdG9yZShzZXNzaW9uX2lkLCBjcmVhdGUpIHtcbiAgICBsZXQgc3RvcmUgPSB0aGlzLl9vYmplY3Rfc3RvcmU7XG4gICAgY29uc3QgbGV2ZWxzID0gc2Vzc2lvbl9pZC5zcGxpdChcIi5cIik7XG4gICAgaWYgKGNyZWF0ZSkge1xuICAgICAgY29uc3QgbGFzdF9pbmRleCA9IGxldmVscy5sZW5ndGggLSAxO1xuICAgICAgZm9yIChsZXQgbGV2ZWwgb2YgbGV2ZWxzLnNsaWNlKDAsIGxhc3RfaW5kZXgpKSB7XG4gICAgICAgIGlmICghc3RvcmVbbGV2ZWxdKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgc3RvcmUgPSBzdG9yZVtsZXZlbF07XG4gICAgICB9XG4gICAgICAvLyBDcmVhdGUgdGhlIGxhc3QgbGV2ZWxcbiAgICAgIGlmICghc3RvcmVbbGV2ZWxzW2xhc3RfaW5kZXhdXSkge1xuICAgICAgICBzdG9yZVtsZXZlbHNbbGFzdF9pbmRleF1dID0ge307XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RvcmVbbGV2ZWxzW2xhc3RfaW5kZXhdXTtcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChsZXQgbGV2ZWwgb2YgbGV2ZWxzKSB7XG4gICAgICAgIGlmICghc3RvcmVbbGV2ZWxdKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgc3RvcmUgPSBzdG9yZVtsZXZlbF07XG4gICAgICB9XG4gICAgICByZXR1cm4gc3RvcmU7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFByZXBhcmVzIHRoZSBwcm92aWRlZCBzZXQgb2YgcmVtb3RlIG1ldGhvZCBhcmd1bWVudHMgZm9yXG4gICAqIHNlbmRpbmcgdG8gdGhlIHJlbW90ZSBzaXRlLCByZXBsYWNlcyBhbGwgdGhlIGNhbGxiYWNrcyB3aXRoXG4gICAqIGlkZW50aWZpZXJzXG4gICAqXG4gICAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgdG8gd3JhcFxuICAgKlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IHdyYXBwZWQgYXJndW1lbnRzXG4gICAqL1xuICBhc3luYyBfZW5jb2RlKGFPYmplY3QsIHNlc3Npb25faWQsIGxvY2FsX3dvcmtzcGFjZSkge1xuICAgIGNvbnN0IGFUeXBlID0gdHlwZW9mIGFPYmplY3Q7XG4gICAgaWYgKFxuICAgICAgYVR5cGUgPT09IFwibnVtYmVyXCIgfHxcbiAgICAgIGFUeXBlID09PSBcInN0cmluZ1wiIHx8XG4gICAgICBhVHlwZSA9PT0gXCJib29sZWFuXCIgfHxcbiAgICAgIGFPYmplY3QgPT09IG51bGwgfHxcbiAgICAgIGFPYmplY3QgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgYU9iamVjdCBpbnN0YW5jZW9mIFVpbnQ4QXJyYXlcbiAgICApIHtcbiAgICAgIHJldHVybiBhT2JqZWN0O1xuICAgIH1cbiAgICBpZiAoYU9iamVjdCBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBfcnR5cGU6IFwibWVtb3J5dmlld1wiLFxuICAgICAgICBfcnZhbHVlOiBuZXcgVWludDhBcnJheShhT2JqZWN0KSxcbiAgICAgIH07XG4gICAgfVxuICAgIC8vIFJldXNlIHRoZSByZW1vdGUgb2JqZWN0XG4gICAgaWYgKGFPYmplY3QuX19ycGNfb2JqZWN0X18pIHtcbiAgICAgIGNvbnN0IF9zZXJ2ZXIgPSBhT2JqZWN0Ll9fcnBjX29iamVjdF9fLl9yc2VydmVyIHx8IHRoaXMuX3NlcnZlcl9iYXNlX3VybDtcbiAgICAgIGlmIChfc2VydmVyID09PSB0aGlzLl9zZXJ2ZXJfYmFzZV91cmwpIHtcbiAgICAgICAgcmV0dXJuIGFPYmplY3QuX19ycGNfb2JqZWN0X187XG4gICAgICB9IC8vIGVsc2Uge1xuICAgICAgLy8gICBjb25zb2xlLmRlYnVnKFxuICAgICAgLy8gICAgIGBFbmNvZGluZyByZW1vdGUgZnVuY3Rpb24gZnJvbSBhIGRpZmZlcmVudCBzZXJ2ZXIgJHtfc2VydmVyfSwgY3VycmVudCBzZXJ2ZXI6ICR7dGhpcy5fc2VydmVyX2Jhc2VfdXJsfWAsXG4gICAgICAvLyAgICk7XG4gICAgICAvLyB9XG4gICAgfVxuXG4gICAgbGV0IGJPYmplY3Q7XG5cbiAgICAvLyBza2lwIGlmIGFscmVhZHkgZW5jb2RlZFxuICAgIGlmIChhT2JqZWN0LmNvbnN0cnVjdG9yIGluc3RhbmNlb2YgT2JqZWN0ICYmIGFPYmplY3QuX3J0eXBlKSB7XG4gICAgICAvLyBtYWtlIHN1cmUgdGhlIGludGVyZmFjZSBmdW5jdGlvbnMgYXJlIGVuY29kZWRcbiAgICAgIGNvbnN0IHRlbXAgPSBhT2JqZWN0Ll9ydHlwZTtcbiAgICAgIGRlbGV0ZSBhT2JqZWN0Ll9ydHlwZTtcbiAgICAgIGJPYmplY3QgPSBhd2FpdCB0aGlzLl9lbmNvZGUoYU9iamVjdCwgc2Vzc2lvbl9pZCwgbG9jYWxfd29ya3NwYWNlKTtcbiAgICAgIGJPYmplY3QuX3J0eXBlID0gdGVtcDtcbiAgICAgIHJldHVybiBiT2JqZWN0O1xuICAgIH1cblxuICAgIGlmICgoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5pc0dlbmVyYXRvcikoYU9iamVjdCkgfHwgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uaXNBc3luY0dlbmVyYXRvcikoYU9iamVjdCkpIHtcbiAgICAgIC8vIEhhbmRsZSBnZW5lcmF0b3IgZnVuY3Rpb25zIGFuZCBnZW5lcmF0b3Igb2JqZWN0c1xuICAgICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KShcbiAgICAgICAgc2Vzc2lvbl9pZCAmJiB0eXBlb2Ygc2Vzc2lvbl9pZCA9PT0gXCJzdHJpbmdcIixcbiAgICAgICAgXCJTZXNzaW9uIElEIGlzIHJlcXVpcmVkIGZvciBnZW5lcmF0b3IgZW5jb2RpbmdcIixcbiAgICAgICk7XG4gICAgICBjb25zdCBvYmplY3RfaWQgPSAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5yYW5kSWQpKCk7XG5cbiAgICAgIC8vIEdldCB0aGUgc2Vzc2lvbiBzdG9yZVxuICAgICAgY29uc3Qgc3RvcmUgPSB0aGlzLl9nZXRfc2Vzc2lvbl9zdG9yZShzZXNzaW9uX2lkLCB0cnVlKTtcbiAgICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLmFzc2VydCkoXG4gICAgICAgIHN0b3JlICE9PSBudWxsLFxuICAgICAgICBgRmFpbGVkIHRvIGNyZWF0ZSBzZXNzaW9uIHN0b3JlICR7c2Vzc2lvbl9pZH0gZHVlIHRvIGludmFsaWQgcGFyZW50YCxcbiAgICAgICk7XG5cbiAgICAgIC8vIENoZWNrIGlmIGl0J3MgYW4gYXN5bmMgZ2VuZXJhdG9yXG4gICAgICBjb25zdCBpc0FzeW5jID0gKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uaXNBc3luY0dlbmVyYXRvcikoYU9iamVjdCk7XG5cbiAgICAgIC8vIERlZmluZSBtZXRob2QgdG8gZ2V0IG5leHQgaXRlbSBmcm9tIHRoZSBnZW5lcmF0b3JcbiAgICAgIGNvbnN0IG5leHRJdGVtTWV0aG9kID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICBpZiAoaXNBc3luYykge1xuICAgICAgICAgIGNvbnN0IGl0ZXJhdG9yID0gYU9iamVjdDtcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgICAgaWYgKHJlc3VsdC5kb25lKSB7XG4gICAgICAgICAgICBkZWxldGUgc3RvcmVbb2JqZWN0X2lkXTtcbiAgICAgICAgICAgIHJldHVybiB7IF9ydHlwZTogXCJzdG9wX2l0ZXJhdGlvblwiIH07XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByZXN1bHQudmFsdWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgaXRlcmF0b3IgPSBhT2JqZWN0O1xuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgICBpZiAocmVzdWx0LmRvbmUpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdG9yZVtvYmplY3RfaWRdO1xuICAgICAgICAgICAgcmV0dXJuIHsgX3J0eXBlOiBcInN0b3BfaXRlcmF0aW9uXCIgfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdC52YWx1ZTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgLy8gU3RvcmUgdGhlIG5leHRfaXRlbSBtZXRob2QgaW4gdGhlIHNlc3Npb25cbiAgICAgIHN0b3JlW29iamVjdF9pZF0gPSBuZXh0SXRlbU1ldGhvZDtcblxuICAgICAgLy8gQ3JlYXRlIGEgbWV0aG9kIHRoYXQgd2lsbCBiZSB1c2VkIHRvIGZldGNoIHRoZSBuZXh0IGl0ZW0gZnJvbSB0aGUgZ2VuZXJhdG9yXG4gICAgICBiT2JqZWN0ID0ge1xuICAgICAgICBfcnR5cGU6IFwiZ2VuZXJhdG9yXCIsXG4gICAgICAgIF9yc2VydmVyOiB0aGlzLl9zZXJ2ZXJfYmFzZV91cmwsXG4gICAgICAgIF9ydGFyZ2V0OiB0aGlzLl9jbGllbnRfaWQsXG4gICAgICAgIF9ybWV0aG9kOiBgJHtzZXNzaW9uX2lkfS4ke29iamVjdF9pZH1gLFxuICAgICAgICBfcnByb21pc2U6IFwiKlwiLFxuICAgICAgICBfcmRvYzogXCJSZW1vdGUgZ2VuZXJhdG9yXCIsXG4gICAgICB9O1xuICAgICAgcmV0dXJuIGJPYmplY3Q7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgYU9iamVjdCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBpZiAodGhpcy5fbWV0aG9kX2Fubm90YXRpb25zLmhhcyhhT2JqZWN0KSkge1xuICAgICAgICBsZXQgYW5ub3RhdGlvbiA9IHRoaXMuX21ldGhvZF9hbm5vdGF0aW9ucy5nZXQoYU9iamVjdCk7XG4gICAgICAgIGJPYmplY3QgPSB7XG4gICAgICAgICAgX3J0eXBlOiBcIm1ldGhvZFwiLFxuICAgICAgICAgIF9yc2VydmVyOiB0aGlzLl9zZXJ2ZXJfYmFzZV91cmwsXG4gICAgICAgICAgX3J0YXJnZXQ6IHRoaXMuX2NsaWVudF9pZCxcbiAgICAgICAgICBfcm1ldGhvZDogYW5ub3RhdGlvbi5tZXRob2RfaWQsXG4gICAgICAgICAgX3Jwcm9taXNlOiBcIipcIixcbiAgICAgICAgICBfcm5hbWU6IGFPYmplY3QubmFtZSxcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLmFzc2VydCkodHlwZW9mIHNlc3Npb25faWQgPT09IFwic3RyaW5nXCIpO1xuICAgICAgICBsZXQgb2JqZWN0X2lkO1xuICAgICAgICBpZiAoYU9iamVjdC5fX25hbWVfXykge1xuICAgICAgICAgIG9iamVjdF9pZCA9IGAkeygwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLnJhbmRJZCkoKX0jJHthT2JqZWN0Ll9fbmFtZV9ffWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb2JqZWN0X2lkID0gKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18ucmFuZElkKSgpO1xuICAgICAgICB9XG4gICAgICAgIGJPYmplY3QgPSB7XG4gICAgICAgICAgX3J0eXBlOiBcIm1ldGhvZFwiLFxuICAgICAgICAgIF9yc2VydmVyOiB0aGlzLl9zZXJ2ZXJfYmFzZV91cmwsXG4gICAgICAgICAgX3J0YXJnZXQ6IHRoaXMuX2NsaWVudF9pZCxcbiAgICAgICAgICBfcm1ldGhvZDogYCR7c2Vzc2lvbl9pZH0uJHtvYmplY3RfaWR9YCxcbiAgICAgICAgICBfcnByb21pc2U6IFwiKlwiLFxuICAgICAgICAgIF9ybmFtZTogYU9iamVjdC5uYW1lLFxuICAgICAgICB9O1xuICAgICAgICBsZXQgc3RvcmUgPSB0aGlzLl9nZXRfc2Vzc2lvbl9zdG9yZShzZXNzaW9uX2lkLCB0cnVlKTtcbiAgICAgICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KShcbiAgICAgICAgICBzdG9yZSAhPT0gbnVsbCxcbiAgICAgICAgICBgRmFpbGVkIHRvIGNyZWF0ZSBzZXNzaW9uIHN0b3JlICR7c2Vzc2lvbl9pZH0gZHVlIHRvIGludmFsaWQgcGFyZW50YCxcbiAgICAgICAgKTtcbiAgICAgICAgc3RvcmVbb2JqZWN0X2lkXSA9IGFPYmplY3Q7XG4gICAgICB9XG4gICAgICBiT2JqZWN0Ll9yZG9jID0gYU9iamVjdC5fX2RvY19fO1xuICAgICAgaWYgKCFiT2JqZWN0Ll9yZG9jKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgZnVuY0luZm8gPSBnZXRGdW5jdGlvbkluZm8oYU9iamVjdCk7XG4gICAgICAgICAgaWYgKGZ1bmNJbmZvICYmICFiT2JqZWN0Ll9yZG9jKSB7XG4gICAgICAgICAgICBiT2JqZWN0Ll9yZG9jID0gYCR7ZnVuY0luZm8uZG9jfWA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBleHRyYWN0IGZ1bmN0aW9uIGRvY3N0cmluZzpcIiwgYU9iamVjdCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGJPYmplY3QuX3JzY2hlbWEgPSBhT2JqZWN0Ll9fc2NoZW1hX187XG4gICAgICByZXR1cm4gYk9iamVjdDtcbiAgICB9XG4gICAgY29uc3QgaXNhcnJheSA9IEFycmF5LmlzQXJyYXkoYU9iamVjdCk7XG5cbiAgICBmb3IgKGxldCB0cCBvZiBPYmplY3Qua2V5cyh0aGlzLl9jb2RlY3MpKSB7XG4gICAgICBjb25zdCBjb2RlYyA9IHRoaXMuX2NvZGVjc1t0cF07XG4gICAgICBpZiAoY29kZWMuZW5jb2RlciAmJiBhT2JqZWN0IGluc3RhbmNlb2YgY29kZWMudHlwZSkge1xuICAgICAgICAvLyBUT0RPOiB3aGF0IGlmIG11bHRpcGxlIGVuY29kZXJzIGZvdW5kXG4gICAgICAgIGxldCBlbmNvZGVkT2JqID0gYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGNvZGVjLmVuY29kZXIoYU9iamVjdCkpO1xuICAgICAgICBpZiAoZW5jb2RlZE9iaiAmJiAhZW5jb2RlZE9iai5fcnR5cGUpIGVuY29kZWRPYmouX3J0eXBlID0gY29kZWMubmFtZTtcbiAgICAgICAgLy8gZW5jb2RlIHRoZSBmdW5jdGlvbnMgaW4gdGhlIGludGVyZmFjZSBvYmplY3RcbiAgICAgICAgaWYgKHR5cGVvZiBlbmNvZGVkT2JqID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgY29uc3QgdGVtcCA9IGVuY29kZWRPYmouX3J0eXBlO1xuICAgICAgICAgIGRlbGV0ZSBlbmNvZGVkT2JqLl9ydHlwZTtcbiAgICAgICAgICBlbmNvZGVkT2JqID0gYXdhaXQgdGhpcy5fZW5jb2RlKFxuICAgICAgICAgICAgZW5jb2RlZE9iaixcbiAgICAgICAgICAgIHNlc3Npb25faWQsXG4gICAgICAgICAgICBsb2NhbF93b3Jrc3BhY2UsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBlbmNvZGVkT2JqLl9ydHlwZSA9IHRlbXA7XG4gICAgICAgIH1cbiAgICAgICAgYk9iamVjdCA9IGVuY29kZWRPYmo7XG4gICAgICAgIHJldHVybiBiT2JqZWN0O1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChcbiAgICAgIC8qZ2xvYmFsIHRmKi9cbiAgICAgIHR5cGVvZiB0ZiAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgICAgdGYuVGVuc29yICYmXG4gICAgICBhT2JqZWN0IGluc3RhbmNlb2YgdGYuVGVuc29yXG4gICAgKSB7XG4gICAgICBjb25zdCB2X2J1ZmZlciA9IGFPYmplY3QuZGF0YVN5bmMoKTtcbiAgICAgIGJPYmplY3QgPSB7XG4gICAgICAgIF9ydHlwZTogXCJuZGFycmF5XCIsXG4gICAgICAgIF9ydmFsdWU6IG5ldyBVaW50OEFycmF5KHZfYnVmZmVyLmJ1ZmZlciksXG4gICAgICAgIF9yc2hhcGU6IGFPYmplY3Quc2hhcGUsXG4gICAgICAgIF9yZHR5cGU6IGFPYmplY3QuZHR5cGUsXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICAvKmdsb2JhbCBuaiovXG4gICAgICB0eXBlb2YgbmogIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICAgIG5qLk5kQXJyYXkgJiZcbiAgICAgIGFPYmplY3QgaW5zdGFuY2VvZiBuai5OZEFycmF5XG4gICAgKSB7XG4gICAgICBjb25zdCBkdHlwZSA9ICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLnR5cGVkQXJyYXlUb0R0eXBlKShhT2JqZWN0LnNlbGVjdGlvbi5kYXRhKTtcbiAgICAgIGJPYmplY3QgPSB7XG4gICAgICAgIF9ydHlwZTogXCJuZGFycmF5XCIsXG4gICAgICAgIF9ydmFsdWU6IG5ldyBVaW50OEFycmF5KGFPYmplY3Quc2VsZWN0aW9uLmRhdGEuYnVmZmVyKSxcbiAgICAgICAgX3JzaGFwZTogYU9iamVjdC5zaGFwZSxcbiAgICAgICAgX3JkdHlwZTogZHR5cGUsXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoYU9iamVjdCBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGFPYmplY3QpO1xuICAgICAgYk9iamVjdCA9IHtcbiAgICAgICAgX3J0eXBlOiBcImVycm9yXCIsXG4gICAgICAgIF9ydmFsdWU6IGFPYmplY3QudG9TdHJpbmcoKSxcbiAgICAgICAgX3J0cmFjZTogYU9iamVjdC5zdGFjayxcbiAgICAgIH07XG4gICAgfVxuICAgIC8vIHNlbmQgb2JqZWN0cyBzdXBwb3J0ZWQgYnkgc3RydWN0dXJlIGNsb25lIGFsZ29yaXRobVxuICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9XZWJfV29ya2Vyc19BUEkvU3RydWN0dXJlZF9jbG9uZV9hbGdvcml0aG1cbiAgICBlbHNlIGlmIChcbiAgICAgIGFPYmplY3QgIT09IE9iamVjdChhT2JqZWN0KSB8fFxuICAgICAgYU9iamVjdCBpbnN0YW5jZW9mIEJvb2xlYW4gfHxcbiAgICAgIGFPYmplY3QgaW5zdGFuY2VvZiBTdHJpbmcgfHxcbiAgICAgIGFPYmplY3QgaW5zdGFuY2VvZiBEYXRlIHx8XG4gICAgICBhT2JqZWN0IGluc3RhbmNlb2YgUmVnRXhwIHx8XG4gICAgICBhT2JqZWN0IGluc3RhbmNlb2YgSW1hZ2VEYXRhIHx8XG4gICAgICAodHlwZW9mIEZpbGVMaXN0ICE9PSBcInVuZGVmaW5lZFwiICYmIGFPYmplY3QgaW5zdGFuY2VvZiBGaWxlTGlzdCkgfHxcbiAgICAgICh0eXBlb2YgRmlsZVN5c3RlbURpcmVjdG9yeUhhbmRsZSAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgICAgICBhT2JqZWN0IGluc3RhbmNlb2YgRmlsZVN5c3RlbURpcmVjdG9yeUhhbmRsZSkgfHxcbiAgICAgICh0eXBlb2YgRmlsZVN5c3RlbUZpbGVIYW5kbGUgIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICAgICAgYU9iamVjdCBpbnN0YW5jZW9mIEZpbGVTeXN0ZW1GaWxlSGFuZGxlKSB8fFxuICAgICAgKHR5cGVvZiBGaWxlU3lzdGVtSGFuZGxlICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICAgIGFPYmplY3QgaW5zdGFuY2VvZiBGaWxlU3lzdGVtSGFuZGxlKSB8fFxuICAgICAgKHR5cGVvZiBGaWxlU3lzdGVtV3JpdGFibGVGaWxlU3RyZWFtICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICAgIGFPYmplY3QgaW5zdGFuY2VvZiBGaWxlU3lzdGVtV3JpdGFibGVGaWxlU3RyZWFtKVxuICAgICkge1xuICAgICAgYk9iamVjdCA9IGFPYmplY3Q7XG4gICAgICAvLyBUT0RPOiBhdm9pZCBvYmplY3Qgc3VjaCBhcyBEeW5hbWljUGx1Z2luIGluc3RhbmNlLlxuICAgIH0gZWxzZSBpZiAoYU9iamVjdCBpbnN0YW5jZW9mIEJsb2IpIHtcbiAgICAgIGxldCBfY3VycmVudF9wb3MgPSAwO1xuICAgICAgYXN5bmMgZnVuY3Rpb24gcmVhZChsZW5ndGgpIHtcbiAgICAgICAgbGV0IGJsb2I7XG4gICAgICAgIGlmIChsZW5ndGgpIHtcbiAgICAgICAgICBibG9iID0gYU9iamVjdC5zbGljZShfY3VycmVudF9wb3MsIF9jdXJyZW50X3BvcyArIGxlbmd0aCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYmxvYiA9IGFPYmplY3Quc2xpY2UoX2N1cnJlbnRfcG9zKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXQgPSBuZXcgVWludDhBcnJheShhd2FpdCBibG9iLmFycmF5QnVmZmVyKCkpO1xuICAgICAgICBfY3VycmVudF9wb3MgPSBfY3VycmVudF9wb3MgKyByZXQuYnl0ZUxlbmd0aDtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH1cbiAgICAgIGZ1bmN0aW9uIHNlZWsocG9zKSB7XG4gICAgICAgIF9jdXJyZW50X3BvcyA9IHBvcztcbiAgICAgIH1cbiAgICAgIGJPYmplY3QgPSB7XG4gICAgICAgIF9ydHlwZTogXCJpb3N0cmVhbVwiLFxuICAgICAgICBfcm5hdGl2ZTogXCJqczpibG9iXCIsXG4gICAgICAgIHR5cGU6IGFPYmplY3QudHlwZSxcbiAgICAgICAgbmFtZTogYU9iamVjdC5uYW1lLFxuICAgICAgICBzaXplOiBhT2JqZWN0LnNpemUsXG4gICAgICAgIHBhdGg6IGFPYmplY3QuX3BhdGggfHwgYU9iamVjdC53ZWJraXRSZWxhdGl2ZVBhdGgsXG4gICAgICAgIHJlYWQ6IGF3YWl0IHRoaXMuX2VuY29kZShyZWFkLCBzZXNzaW9uX2lkLCBsb2NhbF93b3Jrc3BhY2UpLFxuICAgICAgICBzZWVrOiBhd2FpdCB0aGlzLl9lbmNvZGUoc2Vlaywgc2Vzc2lvbl9pZCwgbG9jYWxfd29ya3NwYWNlKSxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChhT2JqZWN0IGluc3RhbmNlb2YgQXJyYXlCdWZmZXJWaWV3KSB7XG4gICAgICBjb25zdCBkdHlwZSA9ICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLnR5cGVkQXJyYXlUb0R0eXBlKShhT2JqZWN0KTtcbiAgICAgIGJPYmplY3QgPSB7XG4gICAgICAgIF9ydHlwZTogXCJ0eXBlZGFycmF5XCIsXG4gICAgICAgIF9ydmFsdWU6IG5ldyBVaW50OEFycmF5KGFPYmplY3QuYnVmZmVyKSxcbiAgICAgICAgX3JkdHlwZTogZHR5cGUsXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoYU9iamVjdCBpbnN0YW5jZW9mIERhdGFWaWV3KSB7XG4gICAgICBiT2JqZWN0ID0ge1xuICAgICAgICBfcnR5cGU6IFwibWVtb3J5dmlld1wiLFxuICAgICAgICBfcnZhbHVlOiBuZXcgVWludDhBcnJheShhT2JqZWN0LmJ1ZmZlciksXG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoYU9iamVjdCBpbnN0YW5jZW9mIFNldCkge1xuICAgICAgYk9iamVjdCA9IHtcbiAgICAgICAgX3J0eXBlOiBcInNldFwiLFxuICAgICAgICBfcnZhbHVlOiBhd2FpdCB0aGlzLl9lbmNvZGUoXG4gICAgICAgICAgQXJyYXkuZnJvbShhT2JqZWN0KSxcbiAgICAgICAgICBzZXNzaW9uX2lkLFxuICAgICAgICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgICAgICAgKSxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChhT2JqZWN0IGluc3RhbmNlb2YgTWFwKSB7XG4gICAgICBiT2JqZWN0ID0ge1xuICAgICAgICBfcnR5cGU6IFwib3JkZXJlZG1hcFwiLFxuICAgICAgICBfcnZhbHVlOiBhd2FpdCB0aGlzLl9lbmNvZGUoXG4gICAgICAgICAgQXJyYXkuZnJvbShhT2JqZWN0KSxcbiAgICAgICAgICBzZXNzaW9uX2lkLFxuICAgICAgICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgICAgICAgKSxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIGFPYmplY3QuY29uc3RydWN0b3IgaW5zdGFuY2VvZiBPYmplY3QgfHxcbiAgICAgIEFycmF5LmlzQXJyYXkoYU9iamVjdClcbiAgICApIHtcbiAgICAgIGJPYmplY3QgPSBpc2FycmF5ID8gW10gOiB7fTtcbiAgICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhhT2JqZWN0KTtcbiAgICAgIGZvciAobGV0IGsgb2Yga2V5cykge1xuICAgICAgICBiT2JqZWN0W2tdID0gYXdhaXQgdGhpcy5fZW5jb2RlKFxuICAgICAgICAgIGFPYmplY3Rba10sXG4gICAgICAgICAgc2Vzc2lvbl9pZCxcbiAgICAgICAgICBsb2NhbF93b3Jrc3BhY2UsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IGBoeXBoYS1ycGM6IFVuc3VwcG9ydGVkIGRhdGEgdHlwZTogJHthT2JqZWN0fSwgeW91IGNhbiByZWdpc3RlciBhIGN1c3RvbSBjb2RlYyB0byBlbmNvZGUvZGVjb2RlIHRoZSBvYmplY3QuYDtcbiAgICB9XG5cbiAgICBpZiAoIWJPYmplY3QpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBlbmNvZGUgb2JqZWN0XCIpO1xuICAgIH1cbiAgICByZXR1cm4gYk9iamVjdDtcbiAgfVxuXG4gIGFzeW5jIGRlY29kZShhT2JqZWN0KSB7XG4gICAgcmV0dXJuIGF3YWl0IHRoaXMuX2RlY29kZShhT2JqZWN0KTtcbiAgfVxuXG4gIGFzeW5jIF9kZWNvZGUoXG4gICAgYU9iamVjdCxcbiAgICByZW1vdGVfcGFyZW50LFxuICAgIGxvY2FsX3BhcmVudCxcbiAgICByZW1vdGVfd29ya3NwYWNlLFxuICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgKSB7XG4gICAgaWYgKCFhT2JqZWN0KSB7XG4gICAgICByZXR1cm4gYU9iamVjdDtcbiAgICB9XG4gICAgbGV0IGJPYmplY3Q7XG4gICAgaWYgKGFPYmplY3QuX3J0eXBlKSB7XG4gICAgICBpZiAoXG4gICAgICAgIHRoaXMuX2NvZGVjc1thT2JqZWN0Ll9ydHlwZV0gJiZcbiAgICAgICAgdGhpcy5fY29kZWNzW2FPYmplY3QuX3J0eXBlXS5kZWNvZGVyXG4gICAgICApIHtcbiAgICAgICAgY29uc3QgdGVtcCA9IGFPYmplY3QuX3J0eXBlO1xuICAgICAgICBkZWxldGUgYU9iamVjdC5fcnR5cGU7XG4gICAgICAgIGFPYmplY3QgPSBhd2FpdCB0aGlzLl9kZWNvZGUoXG4gICAgICAgICAgYU9iamVjdCxcbiAgICAgICAgICByZW1vdGVfcGFyZW50LFxuICAgICAgICAgIGxvY2FsX3BhcmVudCxcbiAgICAgICAgICByZW1vdGVfd29ya3NwYWNlLFxuICAgICAgICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgICAgICAgKTtcbiAgICAgICAgYU9iamVjdC5fcnR5cGUgPSB0ZW1wO1xuXG4gICAgICAgIGJPYmplY3QgPSBhd2FpdCBQcm9taXNlLnJlc29sdmUoXG4gICAgICAgICAgdGhpcy5fY29kZWNzW2FPYmplY3QuX3J0eXBlXS5kZWNvZGVyKGFPYmplY3QpLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIGlmIChhT2JqZWN0Ll9ydHlwZSA9PT0gXCJtZXRob2RcIikge1xuICAgICAgICBiT2JqZWN0ID0gdGhpcy5fZ2VuZXJhdGVfcmVtb3RlX21ldGhvZChcbiAgICAgICAgICBhT2JqZWN0LFxuICAgICAgICAgIHJlbW90ZV9wYXJlbnQsXG4gICAgICAgICAgbG9jYWxfcGFyZW50LFxuICAgICAgICAgIHJlbW90ZV93b3Jrc3BhY2UsXG4gICAgICAgICAgbG9jYWxfd29ya3NwYWNlLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIGlmIChhT2JqZWN0Ll9ydHlwZSA9PT0gXCJnZW5lcmF0b3JcIikge1xuICAgICAgICAvLyBDcmVhdGUgYSBtZXRob2QgdG8gZmV0Y2ggbmV4dCBpdGVtcyBmcm9tIHRoZSByZW1vdGUgZ2VuZXJhdG9yXG4gICAgICAgIGNvbnN0IGdlbl9tZXRob2QgPSB0aGlzLl9nZW5lcmF0ZV9yZW1vdGVfbWV0aG9kKFxuICAgICAgICAgIGFPYmplY3QsXG4gICAgICAgICAgcmVtb3RlX3BhcmVudCxcbiAgICAgICAgICBsb2NhbF9wYXJlbnQsXG4gICAgICAgICAgcmVtb3RlX3dvcmtzcGFjZSxcbiAgICAgICAgICBsb2NhbF93b3Jrc3BhY2UsXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGFuIGFzeW5jIGdlbmVyYXRvciBwcm94eVxuICAgICAgICBhc3luYyBmdW5jdGlvbiogYXN5bmNHZW5lcmF0b3JQcm94eSgpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXh0X2l0ZW0gPSBhd2FpdCBnZW5fbWV0aG9kKCk7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIFN0b3BJdGVyYXRpb24gc2lnbmFsXG4gICAgICAgICAgICAgICAgaWYgKG5leHRfaXRlbSAmJiBuZXh0X2l0ZW0uX3J0eXBlID09PSBcInN0b3BfaXRlcmF0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB5aWVsZCBuZXh0X2l0ZW07XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIGluIGdlbmVyYXRvcjpcIiwgZXJyb3IpO1xuICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBpbiBnZW5lcmF0b3I6XCIsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBiT2JqZWN0ID0gYXN5bmNHZW5lcmF0b3JQcm94eSgpO1xuICAgICAgfSBlbHNlIGlmIChhT2JqZWN0Ll9ydHlwZSA9PT0gXCJuZGFycmF5XCIpIHtcbiAgICAgICAgLypnbG9iYWwgbmogdGYqL1xuICAgICAgICAvL2NyZWF0ZSBidWlsZCBhcnJheS90ZW5zb3IgaWYgdXNlZCBpbiB0aGUgcGx1Z2luXG4gICAgICAgIGlmICh0eXBlb2YgbmogIT09IFwidW5kZWZpbmVkXCIgJiYgbmouYXJyYXkpIHtcbiAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShhT2JqZWN0Ll9ydmFsdWUpKSB7XG4gICAgICAgICAgICBhT2JqZWN0Ll9ydmFsdWUgPSBhT2JqZWN0Ll9ydmFsdWUucmVkdWNlKF9hcHBlbmRCdWZmZXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBiT2JqZWN0ID0gbmpcbiAgICAgICAgICAgIC5hcnJheShuZXcgVWludDgoYU9iamVjdC5fcnZhbHVlKSwgYU9iamVjdC5fcmR0eXBlKVxuICAgICAgICAgICAgLnJlc2hhcGUoYU9iamVjdC5fcnNoYXBlKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdGYgIT09IFwidW5kZWZpbmVkXCIgJiYgdGYuVGVuc29yKSB7XG4gICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoYU9iamVjdC5fcnZhbHVlKSkge1xuICAgICAgICAgICAgYU9iamVjdC5fcnZhbHVlID0gYU9iamVjdC5fcnZhbHVlLnJlZHVjZShfYXBwZW5kQnVmZmVyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgYXJyYXl0eXBlID0gX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uZHR5cGVUb1R5cGVkQXJyYXlbYU9iamVjdC5fcmR0eXBlXTtcbiAgICAgICAgICBiT2JqZWN0ID0gdGYudGVuc29yKFxuICAgICAgICAgICAgbmV3IGFycmF5dHlwZShhT2JqZWN0Ll9ydmFsdWUpLFxuICAgICAgICAgICAgYU9iamVjdC5fcnNoYXBlLFxuICAgICAgICAgICAgYU9iamVjdC5fcmR0eXBlLFxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy9rZWVwIGl0IGFzIHJlZ3VsYXIgaWYgdHJhbnNmZXJlZCB0byB0aGUgbWFpbiBhcHBcbiAgICAgICAgICBiT2JqZWN0ID0gYU9iamVjdDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChhT2JqZWN0Ll9ydHlwZSA9PT0gXCJlcnJvclwiKSB7XG4gICAgICAgIGJPYmplY3QgPSBuZXcgRXJyb3IoXG4gICAgICAgICAgXCJSZW1vdGVFcnJvcjogXCIgKyBhT2JqZWN0Ll9ydmFsdWUgKyBcIlxcblwiICsgKGFPYmplY3QuX3J0cmFjZSB8fCBcIlwiKSxcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSBpZiAoYU9iamVjdC5fcnR5cGUgPT09IFwidHlwZWRhcnJheVwiKSB7XG4gICAgICAgIGNvbnN0IGFycmF5dHlwZSA9IF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLmR0eXBlVG9UeXBlZEFycmF5W2FPYmplY3QuX3JkdHlwZV07XG4gICAgICAgIGlmICghYXJyYXl0eXBlKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInVuc3VwcG9ydGVkIGR0eXBlOiBcIiArIGFPYmplY3QuX3JkdHlwZSk7XG4gICAgICAgIGNvbnN0IGJ1ZmZlciA9IGFPYmplY3QuX3J2YWx1ZS5idWZmZXIuc2xpY2UoXG4gICAgICAgICAgYU9iamVjdC5fcnZhbHVlLmJ5dGVPZmZzZXQsXG4gICAgICAgICAgYU9iamVjdC5fcnZhbHVlLmJ5dGVPZmZzZXQgKyBhT2JqZWN0Ll9ydmFsdWUuYnl0ZUxlbmd0aCxcbiAgICAgICAgKTtcbiAgICAgICAgYk9iamVjdCA9IG5ldyBhcnJheXR5cGUoYnVmZmVyKTtcbiAgICAgIH0gZWxzZSBpZiAoYU9iamVjdC5fcnR5cGUgPT09IFwibWVtb3J5dmlld1wiKSB7XG4gICAgICAgIGJPYmplY3QgPSBhT2JqZWN0Ll9ydmFsdWUuYnVmZmVyLnNsaWNlKFxuICAgICAgICAgIGFPYmplY3QuX3J2YWx1ZS5ieXRlT2Zmc2V0LFxuICAgICAgICAgIGFPYmplY3QuX3J2YWx1ZS5ieXRlT2Zmc2V0ICsgYU9iamVjdC5fcnZhbHVlLmJ5dGVMZW5ndGgsXG4gICAgICAgICk7IC8vIEFycmF5QnVmZmVyXG4gICAgICB9IGVsc2UgaWYgKGFPYmplY3QuX3J0eXBlID09PSBcImlvc3RyZWFtXCIpIHtcbiAgICAgICAgaWYgKGFPYmplY3QuX3JuYXRpdmUgPT09IFwianM6YmxvYlwiKSB7XG4gICAgICAgICAgY29uc3QgcmVhZCA9IGF3YWl0IHRoaXMuX2dlbmVyYXRlX3JlbW90ZV9tZXRob2QoXG4gICAgICAgICAgICBhT2JqZWN0LnJlYWQsXG4gICAgICAgICAgICByZW1vdGVfcGFyZW50LFxuICAgICAgICAgICAgbG9jYWxfcGFyZW50LFxuICAgICAgICAgICAgcmVtb3RlX3dvcmtzcGFjZSxcbiAgICAgICAgICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgICAgICAgICApO1xuICAgICAgICAgIGNvbnN0IGJ5dGVzID0gYXdhaXQgcmVhZCgpO1xuICAgICAgICAgIGJPYmplY3QgPSBuZXcgQmxvYihbYnl0ZXNdLCB7XG4gICAgICAgICAgICB0eXBlOiBhT2JqZWN0LnR5cGUsXG4gICAgICAgICAgICBuYW1lOiBhT2JqZWN0Lm5hbWUsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYk9iamVjdCA9IHt9O1xuICAgICAgICAgIGZvciAobGV0IGsgb2YgT2JqZWN0LmtleXMoYU9iamVjdCkpIHtcbiAgICAgICAgICAgIGlmICghay5zdGFydHNXaXRoKFwiX1wiKSkge1xuICAgICAgICAgICAgICBiT2JqZWN0W2tdID0gYXdhaXQgdGhpcy5fZGVjb2RlKFxuICAgICAgICAgICAgICAgIGFPYmplY3Rba10sXG4gICAgICAgICAgICAgICAgcmVtb3RlX3BhcmVudCxcbiAgICAgICAgICAgICAgICBsb2NhbF9wYXJlbnQsXG4gICAgICAgICAgICAgICAgcmVtb3RlX3dvcmtzcGFjZSxcbiAgICAgICAgICAgICAgICBsb2NhbF93b3Jrc3BhY2UsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJPYmplY3RbXCJfX3JwY19vYmplY3RfX1wiXSA9IGFPYmplY3Q7XG4gICAgICB9IGVsc2UgaWYgKGFPYmplY3QuX3J0eXBlID09PSBcIm9yZGVyZWRtYXBcIikge1xuICAgICAgICBiT2JqZWN0ID0gbmV3IE1hcChcbiAgICAgICAgICBhd2FpdCB0aGlzLl9kZWNvZGUoXG4gICAgICAgICAgICBhT2JqZWN0Ll9ydmFsdWUsXG4gICAgICAgICAgICByZW1vdGVfcGFyZW50LFxuICAgICAgICAgICAgbG9jYWxfcGFyZW50LFxuICAgICAgICAgICAgcmVtb3RlX3dvcmtzcGFjZSxcbiAgICAgICAgICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgICAgICAgICApLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIGlmIChhT2JqZWN0Ll9ydHlwZSA9PT0gXCJzZXRcIikge1xuICAgICAgICBiT2JqZWN0ID0gbmV3IFNldChcbiAgICAgICAgICBhd2FpdCB0aGlzLl9kZWNvZGUoXG4gICAgICAgICAgICBhT2JqZWN0Ll9ydmFsdWUsXG4gICAgICAgICAgICByZW1vdGVfcGFyZW50LFxuICAgICAgICAgICAgbG9jYWxfcGFyZW50LFxuICAgICAgICAgICAgcmVtb3RlX3dvcmtzcGFjZSxcbiAgICAgICAgICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgICAgICAgICApLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3QgdGVtcCA9IGFPYmplY3QuX3J0eXBlO1xuICAgICAgICBkZWxldGUgYU9iamVjdC5fcnR5cGU7XG4gICAgICAgIGJPYmplY3QgPSBhd2FpdCB0aGlzLl9kZWNvZGUoXG4gICAgICAgICAgYU9iamVjdCxcbiAgICAgICAgICByZW1vdGVfcGFyZW50LFxuICAgICAgICAgIGxvY2FsX3BhcmVudCxcbiAgICAgICAgICByZW1vdGVfd29ya3NwYWNlLFxuICAgICAgICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgICAgICAgKTtcbiAgICAgICAgYk9iamVjdC5fcnR5cGUgPSB0ZW1wO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoYU9iamVjdC5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0IHx8IEFycmF5LmlzQXJyYXkoYU9iamVjdCkpIHtcbiAgICAgIGNvbnN0IGlzYXJyYXkgPSBBcnJheS5pc0FycmF5KGFPYmplY3QpO1xuICAgICAgYk9iamVjdCA9IGlzYXJyYXkgPyBbXSA6IHt9O1xuICAgICAgZm9yIChsZXQgayBvZiBPYmplY3Qua2V5cyhhT2JqZWN0KSkge1xuICAgICAgICBpZiAoaXNhcnJheSB8fCBhT2JqZWN0Lmhhc093blByb3BlcnR5KGspKSB7XG4gICAgICAgICAgY29uc3QgdiA9IGFPYmplY3Rba107XG4gICAgICAgICAgYk9iamVjdFtrXSA9IGF3YWl0IHRoaXMuX2RlY29kZShcbiAgICAgICAgICAgIHYsXG4gICAgICAgICAgICByZW1vdGVfcGFyZW50LFxuICAgICAgICAgICAgbG9jYWxfcGFyZW50LFxuICAgICAgICAgICAgcmVtb3RlX3dvcmtzcGFjZSxcbiAgICAgICAgICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGJPYmplY3QgPSBhT2JqZWN0O1xuICAgIH1cbiAgICBpZiAoYk9iamVjdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGYWlsZWQgdG8gZGVjb2RlIG9iamVjdFwiKTtcbiAgICB9XG4gICAgcmV0dXJuIGJPYmplY3Q7XG4gIH1cblxuICBfZXhwYW5kX3Byb21pc2UoZGF0YSkge1xuICAgIHJldHVybiB7XG4gICAgICBoZWFydGJlYXQ6IHtcbiAgICAgICAgX3J0eXBlOiBcIm1ldGhvZFwiLFxuICAgICAgICBfcnRhcmdldDogZGF0YS5mcm9tLnNwbGl0KFwiL1wiKVsxXSxcbiAgICAgICAgX3JtZXRob2Q6IGRhdGEuc2Vzc2lvbiArIFwiLmhlYXJ0YmVhdFwiLFxuICAgICAgICBfcmRvYzogYGhlYXJ0YmVhdCBjYWxsYmFjayBmb3IgbWV0aG9kOiAke2RhdGEubWV0aG9kfWAsXG4gICAgICB9LFxuICAgICAgcmVzb2x2ZToge1xuICAgICAgICBfcnR5cGU6IFwibWV0aG9kXCIsXG4gICAgICAgIF9ydGFyZ2V0OiBkYXRhLmZyb20uc3BsaXQoXCIvXCIpWzFdLFxuICAgICAgICBfcm1ldGhvZDogZGF0YS5zZXNzaW9uICsgXCIucmVzb2x2ZVwiLFxuICAgICAgICBfcmRvYzogYHJlc29sdmUgY2FsbGJhY2sgZm9yIG1ldGhvZDogJHtkYXRhLm1ldGhvZH1gLFxuICAgICAgfSxcbiAgICAgIHJlamVjdDoge1xuICAgICAgICBfcnR5cGU6IFwibWV0aG9kXCIsXG4gICAgICAgIF9ydGFyZ2V0OiBkYXRhLmZyb20uc3BsaXQoXCIvXCIpWzFdLFxuICAgICAgICBfcm1ldGhvZDogZGF0YS5zZXNzaW9uICsgXCIucmVqZWN0XCIsXG4gICAgICAgIF9yZG9jOiBgcmVqZWN0IGNhbGxiYWNrIGZvciBtZXRob2Q6ICR7ZGF0YS5tZXRob2R9YCxcbiAgICAgIH0sXG4gICAgICBpbnRlcnZhbDogZGF0YS50LFxuICAgIH07XG4gIH1cbn1cblxuXG4vKioqLyB9KSxcblxuLyoqKi8gXCIuL3NyYy91dGlscy9pbmRleC5qc1wiOlxuLyohKioqKioqKioqKioqKioqKioqKioqKioqKioqKiEqXFxcbiAgISoqKiAuL3NyYy91dGlscy9pbmRleC5qcyAqKiohXG4gIFxcKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qKiovICgoX191bnVzZWRfd2VicGFja19tb2R1bGUsIF9fd2VicGFja19leHBvcnRzX18sIF9fd2VicGFja19yZXF1aXJlX18pID0+IHtcblxuX193ZWJwYWNrX3JlcXVpcmVfXy5yKF9fd2VicGFja19leHBvcnRzX18pO1xuLyogaGFybW9ueSBleHBvcnQgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIHtcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgTWVzc2FnZUVtaXR0ZXI6ICgpID0+ICgvKiBiaW5kaW5nICovIE1lc3NhZ2VFbWl0dGVyKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgU2VtYXBob3JlOiAoKSA9PiAoLyogYmluZGluZyAqLyBTZW1hcGhvcmUpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBhc3NlcnQ6ICgpID0+ICgvKiBiaW5kaW5nICovIGFzc2VydCksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIGNhY2hlUmVxdWlyZW1lbnRzOiAoKSA9PiAoLyogYmluZGluZyAqLyBjYWNoZVJlcXVpcmVtZW50cyksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIGNvbnZlcnRDYXNlOiAoKSA9PiAoLyogYmluZGluZyAqLyBjb252ZXJ0Q2FzZSksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIGR0eXBlVG9UeXBlZEFycmF5OiAoKSA9PiAoLyogYmluZGluZyAqLyBkdHlwZVRvVHlwZWRBcnJheSksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIGV4cGFuZEt3YXJnczogKCkgPT4gKC8qIGJpbmRpbmcgKi8gZXhwYW5kS3dhcmdzKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgaXNBc3luY0dlbmVyYXRvcjogKCkgPT4gKC8qIGJpbmRpbmcgKi8gaXNBc3luY0dlbmVyYXRvciksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIGlzR2VuZXJhdG9yOiAoKSA9PiAoLyogYmluZGluZyAqLyBpc0dlbmVyYXRvciksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIGxvYWRSZXF1aXJlbWVudHM6ICgpID0+ICgvKiBiaW5kaW5nICovIGxvYWRSZXF1aXJlbWVudHMpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBsb2FkUmVxdWlyZW1lbnRzSW5XZWJ3b3JrZXI6ICgpID0+ICgvKiBiaW5kaW5nICovIGxvYWRSZXF1aXJlbWVudHNJbldlYndvcmtlciksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIGxvYWRSZXF1aXJlbWVudHNJbldpbmRvdzogKCkgPT4gKC8qIGJpbmRpbmcgKi8gbG9hZFJlcXVpcmVtZW50c0luV2luZG93KSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgbm9ybWFsaXplQ29uZmlnOiAoKSA9PiAoLyogYmluZGluZyAqLyBub3JtYWxpemVDb25maWcpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBwYXJzZVNlcnZpY2VVcmw6ICgpID0+ICgvKiBiaW5kaW5nICovIHBhcnNlU2VydmljZVVybCksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIHJhbmRJZDogKCkgPT4gKC8qIGJpbmRpbmcgKi8gcmFuZElkKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgdG9DYW1lbENhc2U6ICgpID0+ICgvKiBiaW5kaW5nICovIHRvQ2FtZWxDYXNlKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgdG9TbmFrZUNhc2U6ICgpID0+ICgvKiBiaW5kaW5nICovIHRvU25ha2VDYXNlKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgdHlwZWRBcnJheVRvRHR5cGU6ICgpID0+ICgvKiBiaW5kaW5nICovIHR5cGVkQXJyYXlUb0R0eXBlKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgdHlwZWRBcnJheVRvRHR5cGVNYXBwaW5nOiAoKSA9PiAoLyogYmluZGluZyAqLyB0eXBlZEFycmF5VG9EdHlwZU1hcHBpbmcpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICB1cmxKb2luOiAoKSA9PiAoLyogYmluZGluZyAqLyB1cmxKb2luKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgd2FpdEZvcjogKCkgPT4gKC8qIGJpbmRpbmcgKi8gd2FpdEZvcilcbi8qIGhhcm1vbnkgZXhwb3J0ICovIH0pO1xuZnVuY3Rpb24gcmFuZElkKCkge1xuICByZXR1cm4gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyKDIsIDEwKSArIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xufVxuXG5mdW5jdGlvbiB0b0NhbWVsQ2FzZShzdHIpIHtcbiAgLy8gQ2hlY2sgaWYgdGhlIHN0cmluZyBpcyBhbHJlYWR5IGluIGNhbWVsQ2FzZVxuICBpZiAoIXN0ci5pbmNsdWRlcyhcIl9cIikpIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG4gIC8vIENvbnZlcnQgZnJvbSBzbmFrZV9jYXNlIHRvIGNhbWVsQ2FzZVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL18uL2csIChtYXRjaCkgPT4gbWF0Y2hbMV0udG9VcHBlckNhc2UoKSk7XG59XG5cbmZ1bmN0aW9uIHRvU25ha2VDYXNlKHN0cikge1xuICAvLyBDb252ZXJ0IGZyb20gY2FtZWxDYXNlIHRvIHNuYWtlX2Nhc2VcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC8oW0EtWl0pL2csIFwiXyQxXCIpLnRvTG93ZXJDYXNlKCk7XG59XG5cbmZ1bmN0aW9uIGV4cGFuZEt3YXJncyhvYmopIHtcbiAgaWYgKHR5cGVvZiBvYmogIT09IFwib2JqZWN0XCIgfHwgb2JqID09PSBudWxsKSB7XG4gICAgcmV0dXJuIG9iajsgLy8gUmV0dXJuIHRoZSB2YWx1ZSBpZiBvYmogaXMgbm90IGFuIG9iamVjdFxuICB9XG5cbiAgY29uc3QgbmV3T2JqID0gQXJyYXkuaXNBcnJheShvYmopID8gW10gOiB7fTtcblxuICBmb3IgKGNvbnN0IGtleSBpbiBvYmopIHtcbiAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gb2JqW2tleV07XG5cbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBuZXdPYmpba2V5XSA9ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZ1bmN0aW9uIFwiJHtrZXl9XCIgZXhwZWN0cyBhdCBsZWFzdCBvbmUgYXJndW1lbnQuYCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGxhc3QgYXJndW1lbnQgaXMgYW4gb2JqZWN0XG4gICAgICAgICAgY29uc3QgbGFzdEFyZyA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXTtcbiAgICAgICAgICBsZXQga3dhcmdzID0ge307XG5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICB0eXBlb2YgbGFzdEFyZyA9PT0gXCJvYmplY3RcIiAmJlxuICAgICAgICAgICAgbGFzdEFyZyAhPT0gbnVsbCAmJlxuICAgICAgICAgICAgIUFycmF5LmlzQXJyYXkobGFzdEFyZylcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIC8vIEV4dHJhY3Qga3dhcmdzIGZyb20gdGhlIGxhc3QgYXJndW1lbnRcbiAgICAgICAgICAgIGt3YXJncyA9IHsgLi4ubGFzdEFyZywgX3Jrd2FyZzogdHJ1ZSB9O1xuICAgICAgICAgICAgYXJncyA9IGFyZ3Muc2xpY2UoMCwgLTEpOyAvLyBSZW1vdmUgdGhlIGxhc3QgYXJndW1lbnQgZnJvbSBhcmdzXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gQ2FsbCB0aGUgb3JpZ2luYWwgZnVuY3Rpb24gd2l0aCBwb3NpdGlvbmFsIGFyZ3MgZm9sbG93ZWQgYnkga3dhcmdzXG4gICAgICAgICAgcmV0dXJuIHZhbHVlKC4uLmFyZ3MsIGt3YXJncyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUHJlc2VydmUgbWV0YWRhdGEgbGlrZSBfX25hbWVfXyBhbmQgX19zY2hlbWFfX1xuICAgICAgICBuZXdPYmpba2V5XS5fX25hbWVfXyA9IGtleTtcbiAgICAgICAgaWYgKHZhbHVlLl9fc2NoZW1hX18pIHtcbiAgICAgICAgICBuZXdPYmpba2V5XS5fX3NjaGVtYV9fID0geyAuLi52YWx1ZS5fX3NjaGVtYV9fIH07XG4gICAgICAgICAgbmV3T2JqW2tleV0uX19zY2hlbWFfXy5uYW1lID0ga2V5O1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXdPYmpba2V5XSA9IGV4cGFuZEt3YXJncyh2YWx1ZSk7IC8vIFJlY3Vyc2l2ZWx5IHByb2Nlc3MgbmVzdGVkIG9iamVjdHNcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3T2JqO1xufVxuXG5mdW5jdGlvbiBjb252ZXJ0Q2FzZShvYmosIGNhc2VUeXBlKSB7XG4gIGlmICh0eXBlb2Ygb2JqICE9PSBcIm9iamVjdFwiIHx8IG9iaiA9PT0gbnVsbCB8fCAhY2FzZVR5cGUpIHtcbiAgICByZXR1cm4gb2JqOyAvLyBSZXR1cm4gdGhlIHZhbHVlIGlmIG9iaiBpcyBub3QgYW4gb2JqZWN0XG4gIH1cblxuICBjb25zdCBuZXdPYmogPSBBcnJheS5pc0FycmF5KG9iaikgPyBbXSA6IHt9O1xuXG4gIGZvciAoY29uc3Qga2V5IGluIG9iaikge1xuICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgY29uc3QgdmFsdWUgPSBvYmpba2V5XTtcbiAgICAgIGNvbnN0IGNhbWVsS2V5ID0gdG9DYW1lbENhc2Uoa2V5KTtcbiAgICAgIGNvbnN0IHNuYWtlS2V5ID0gdG9TbmFrZUNhc2Uoa2V5KTtcblxuICAgICAgaWYgKGNhc2VUeXBlID09PSBcImNhbWVsXCIpIHtcbiAgICAgICAgbmV3T2JqW2NhbWVsS2V5XSA9IGNvbnZlcnRDYXNlKHZhbHVlLCBjYXNlVHlwZSk7XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgIG5ld09ialtjYW1lbEtleV0uX19uYW1lX18gPSBjYW1lbEtleTtcbiAgICAgICAgICBpZiAodmFsdWUuX19zY2hlbWFfXykge1xuICAgICAgICAgICAgbmV3T2JqW2NhbWVsS2V5XS5fX3NjaGVtYV9fID0geyAuLi52YWx1ZS5fX3NjaGVtYV9fIH07XG4gICAgICAgICAgICBuZXdPYmpbY2FtZWxLZXldLl9fc2NoZW1hX18ubmFtZSA9IGNhbWVsS2V5O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChjYXNlVHlwZSA9PT0gXCJzbmFrZVwiKSB7XG4gICAgICAgIG5ld09ialtzbmFrZUtleV0gPSBjb252ZXJ0Q2FzZSh2YWx1ZSwgY2FzZVR5cGUpO1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICBuZXdPYmpbc25ha2VLZXldLl9fbmFtZV9fID0gc25ha2VLZXk7XG4gICAgICAgICAgaWYgKHZhbHVlLl9fc2NoZW1hX18pIHtcbiAgICAgICAgICAgIG5ld09ialtzbmFrZUtleV0uX19zY2hlbWFfXyA9IHsgLi4udmFsdWUuX19zY2hlbWFfXyB9O1xuICAgICAgICAgICAgbmV3T2JqW3NuYWtlS2V5XS5fX3NjaGVtYV9fLm5hbWUgPSBzbmFrZUtleTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRPRE8gaGFuZGxlIHNjaGVtYSBmb3IgY2FtZWwgKyBzbmFrZVxuICAgICAgICBpZiAoY2FzZVR5cGUuaW5jbHVkZXMoXCJjYW1lbFwiKSkge1xuICAgICAgICAgIG5ld09ialtjYW1lbEtleV0gPSBjb252ZXJ0Q2FzZSh2YWx1ZSwgXCJjYW1lbFwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2FzZVR5cGUuaW5jbHVkZXMoXCJzbmFrZVwiKSkge1xuICAgICAgICAgIG5ld09ialtzbmFrZUtleV0gPSBjb252ZXJ0Q2FzZSh2YWx1ZSwgXCJzbmFrZVwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXdPYmo7XG59XG5cbmZ1bmN0aW9uIHBhcnNlU2VydmljZVVybCh1cmwpIHtcbiAgLy8gRW5zdXJlIG5vIHRyYWlsaW5nIHNsYXNoXG4gIHVybCA9IHVybC5yZXBsYWNlKC9cXC8kLywgXCJcIik7XG5cbiAgLy8gUmVnZXggcGF0dGVybiB0byBtYXRjaCB0aGUgVVJMIHN0cnVjdHVyZVxuICBjb25zdCBwYXR0ZXJuID0gbmV3IFJlZ0V4cChcbiAgICBcIl4oaHR0cHM/OlxcXFwvXFxcXC9bXi9dKylcIiArIC8vIHNlcnZlcl91cmwgKGh0dHAgb3IgaHR0cHMgZm9sbG93ZWQgYnkgZG9tYWluKVxuICAgICAgXCJcXFxcLyhbYS16MC05Xy1dKylcIiArIC8vIHdvcmtzcGFjZSAobG93ZXJjYXNlIGxldHRlcnMsIG51bWJlcnMsIC0gb3IgXylcbiAgICAgIFwiXFxcXC9zZXJ2aWNlc1xcXFwvXCIgKyAvLyBzdGF0aWMgcGFydCBvZiB0aGUgVVJMXG4gICAgICBcIig/Oig/PGNsaWVudElkPlthLXpBLVowLTlfLV0rKTopP1wiICsgLy8gb3B0aW9uYWwgY2xpZW50X2lkXG4gICAgICBcIig/PHNlcnZpY2VJZD5bYS16QS1aMC05Xy1dKylcIiArIC8vIHNlcnZpY2VfaWRcbiAgICAgIFwiKD86QCg/PGFwcElkPlthLXpBLVowLTlfLV0rKSk/XCIsIC8vIG9wdGlvbmFsIGFwcF9pZFxuICApO1xuXG4gIGNvbnN0IG1hdGNoID0gdXJsLm1hdGNoKHBhdHRlcm4pO1xuICBpZiAoIW1hdGNoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiVVJMIGRvZXMgbm90IG1hdGNoIHRoZSBleHBlY3RlZCBwYXR0ZXJuXCIpO1xuICB9XG5cbiAgY29uc3Qgc2VydmVyVXJsID0gbWF0Y2hbMV07XG4gIGNvbnN0IHdvcmtzcGFjZSA9IG1hdGNoWzJdO1xuICBjb25zdCBjbGllbnRJZCA9IG1hdGNoLmdyb3Vwcz8uY2xpZW50SWQgfHwgXCIqXCI7XG4gIGNvbnN0IHNlcnZpY2VJZCA9IG1hdGNoLmdyb3Vwcz8uc2VydmljZUlkO1xuICBjb25zdCBhcHBJZCA9IG1hdGNoLmdyb3Vwcz8uYXBwSWQgfHwgXCIqXCI7XG5cbiAgcmV0dXJuIHsgc2VydmVyVXJsLCB3b3Jrc3BhY2UsIGNsaWVudElkLCBzZXJ2aWNlSWQsIGFwcElkIH07XG59XG5cbmNvbnN0IGR0eXBlVG9UeXBlZEFycmF5ID0ge1xuICBpbnQ4OiBJbnQ4QXJyYXksXG4gIGludDE2OiBJbnQxNkFycmF5LFxuICBpbnQzMjogSW50MzJBcnJheSxcbiAgdWludDg6IFVpbnQ4QXJyYXksXG4gIHVpbnQxNjogVWludDE2QXJyYXksXG4gIHVpbnQzMjogVWludDMyQXJyYXksXG4gIGZsb2F0MzI6IEZsb2F0MzJBcnJheSxcbiAgZmxvYXQ2NDogRmxvYXQ2NEFycmF5LFxuICBhcnJheTogQXJyYXksXG59O1xuXG5hc3luYyBmdW5jdGlvbiBsb2FkUmVxdWlyZW1lbnRzSW5XaW5kb3cocmVxdWlyZW1lbnRzKSB7XG4gIGZ1bmN0aW9uIF9pbXBvcnRTY3JpcHQodXJsKSB7XG4gICAgLy91cmwgaXMgVVJMIG9mIGV4dGVybmFsIGZpbGUsIGltcGxlbWVudGF0aW9uQ29kZSBpcyB0aGUgY29kZVxuICAgIC8vdG8gYmUgY2FsbGVkIGZyb20gdGhlIGZpbGUsIGxvY2F0aW9uIGlzIHRoZSBsb2NhdGlvbiB0b1xuICAgIC8vaW5zZXJ0IHRoZSA8c2NyaXB0PiBlbGVtZW50XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHZhciBzY3JpcHRUYWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuICAgICAgc2NyaXB0VGFnLnNyYyA9IHVybDtcbiAgICAgIHNjcmlwdFRhZy50eXBlID0gXCJ0ZXh0L2phdmFzY3JpcHRcIjtcbiAgICAgIHNjcmlwdFRhZy5vbmxvYWQgPSByZXNvbHZlO1xuICAgICAgc2NyaXB0VGFnLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PT0gXCJsb2FkZWRcIiB8fCB0aGlzLnJlYWR5U3RhdGUgPT09IFwiY29tcGxldGVcIikge1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHNjcmlwdFRhZy5vbmVycm9yID0gcmVqZWN0O1xuICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzY3JpcHRUYWcpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gc3VwcG9ydCBpbXBvcnRTY3JpcHRzIG91dHNpZGUgd2ViIHdvcmtlclxuICBhc3luYyBmdW5jdGlvbiBpbXBvcnRTY3JpcHRzKCkge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSxcbiAgICAgIGxlbiA9IGFyZ3MubGVuZ3RoLFxuICAgICAgaSA9IDA7XG4gICAgZm9yICg7IGkgPCBsZW47IGkrKykge1xuICAgICAgYXdhaXQgX2ltcG9ydFNjcmlwdChhcmdzW2ldKTtcbiAgICB9XG4gIH1cblxuICBpZiAoXG4gICAgcmVxdWlyZW1lbnRzICYmXG4gICAgKEFycmF5LmlzQXJyYXkocmVxdWlyZW1lbnRzKSB8fCB0eXBlb2YgcmVxdWlyZW1lbnRzID09PSBcInN0cmluZ1wiKVxuICApIHtcbiAgICB0cnkge1xuICAgICAgdmFyIGxpbmtfbm9kZTtcbiAgICAgIHJlcXVpcmVtZW50cyA9XG4gICAgICAgIHR5cGVvZiByZXF1aXJlbWVudHMgPT09IFwic3RyaW5nXCIgPyBbcmVxdWlyZW1lbnRzXSA6IHJlcXVpcmVtZW50cztcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlcXVpcmVtZW50cykpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXF1aXJlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICByZXF1aXJlbWVudHNbaV0udG9Mb3dlckNhc2UoKS5lbmRzV2l0aChcIi5jc3NcIikgfHxcbiAgICAgICAgICAgIHJlcXVpcmVtZW50c1tpXS5zdGFydHNXaXRoKFwiY3NzOlwiKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgaWYgKHJlcXVpcmVtZW50c1tpXS5zdGFydHNXaXRoKFwiY3NzOlwiKSkge1xuICAgICAgICAgICAgICByZXF1aXJlbWVudHNbaV0gPSByZXF1aXJlbWVudHNbaV0uc2xpY2UoNCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsaW5rX25vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlua1wiKTtcbiAgICAgICAgICAgIGxpbmtfbm9kZS5yZWwgPSBcInN0eWxlc2hlZXRcIjtcbiAgICAgICAgICAgIGxpbmtfbm9kZS5ocmVmID0gcmVxdWlyZW1lbnRzW2ldO1xuICAgICAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChsaW5rX25vZGUpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICByZXF1aXJlbWVudHNbaV0udG9Mb3dlckNhc2UoKS5lbmRzV2l0aChcIi5tanNcIikgfHxcbiAgICAgICAgICAgIHJlcXVpcmVtZW50c1tpXS5zdGFydHNXaXRoKFwibWpzOlwiKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgLy8gaW1wb3J0IGVzbW9kdWxlXG4gICAgICAgICAgICBpZiAocmVxdWlyZW1lbnRzW2ldLnN0YXJ0c1dpdGgoXCJtanM6XCIpKSB7XG4gICAgICAgICAgICAgIHJlcXVpcmVtZW50c1tpXSA9IHJlcXVpcmVtZW50c1tpXS5zbGljZSg0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGF3YWl0IGltcG9ydCgvKiB3ZWJwYWNrSWdub3JlOiB0cnVlICovIHJlcXVpcmVtZW50c1tpXSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgIHJlcXVpcmVtZW50c1tpXS50b0xvd2VyQ2FzZSgpLmVuZHNXaXRoKFwiLmpzXCIpIHx8XG4gICAgICAgICAgICByZXF1aXJlbWVudHNbaV0uc3RhcnRzV2l0aChcImpzOlwiKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgaWYgKHJlcXVpcmVtZW50c1tpXS5zdGFydHNXaXRoKFwianM6XCIpKSB7XG4gICAgICAgICAgICAgIHJlcXVpcmVtZW50c1tpXSA9IHJlcXVpcmVtZW50c1tpXS5zbGljZSgzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGF3YWl0IGltcG9ydFNjcmlwdHMocmVxdWlyZW1lbnRzW2ldKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHJlcXVpcmVtZW50c1tpXS5zdGFydHNXaXRoKFwiaHR0cFwiKSkge1xuICAgICAgICAgICAgYXdhaXQgaW1wb3J0U2NyaXB0cyhyZXF1aXJlbWVudHNbaV0pO1xuICAgICAgICAgIH0gZWxzZSBpZiAocmVxdWlyZW1lbnRzW2ldLnN0YXJ0c1dpdGgoXCJjYWNoZTpcIikpIHtcbiAgICAgICAgICAgIC8vaWdub3JlIGNhY2hlXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVW5wcm9jZXNzZWQgcmVxdWlyZW1lbnRzIHVybDogXCIgKyByZXF1aXJlbWVudHNbaV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgXCJ1bnN1cHBvcnRlZCByZXF1aXJlbWVudHMgZGVmaW5pdGlvblwiO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRocm93IFwiZmFpbGVkIHRvIGltcG9ydCByZXF1aXJlZCBzY3JpcHRzOiBcIiArIHJlcXVpcmVtZW50cy50b1N0cmluZygpO1xuICAgIH1cbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBsb2FkUmVxdWlyZW1lbnRzSW5XZWJ3b3JrZXIocmVxdWlyZW1lbnRzKSB7XG4gIGlmIChcbiAgICByZXF1aXJlbWVudHMgJiZcbiAgICAoQXJyYXkuaXNBcnJheShyZXF1aXJlbWVudHMpIHx8IHR5cGVvZiByZXF1aXJlbWVudHMgPT09IFwic3RyaW5nXCIpXG4gICkge1xuICAgIHRyeSB7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkocmVxdWlyZW1lbnRzKSkge1xuICAgICAgICByZXF1aXJlbWVudHMgPSBbcmVxdWlyZW1lbnRzXTtcbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVxdWlyZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICByZXF1aXJlbWVudHNbaV0udG9Mb3dlckNhc2UoKS5lbmRzV2l0aChcIi5jc3NcIikgfHxcbiAgICAgICAgICByZXF1aXJlbWVudHNbaV0uc3RhcnRzV2l0aChcImNzczpcIilcbiAgICAgICAgKSB7XG4gICAgICAgICAgdGhyb3cgXCJ1bmFibGUgdG8gaW1wb3J0IGNzcyBpbiBhIHdlYndvcmtlclwiO1xuICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgIHJlcXVpcmVtZW50c1tpXS50b0xvd2VyQ2FzZSgpLmVuZHNXaXRoKFwiLmpzXCIpIHx8XG4gICAgICAgICAgcmVxdWlyZW1lbnRzW2ldLnN0YXJ0c1dpdGgoXCJqczpcIilcbiAgICAgICAgKSB7XG4gICAgICAgICAgaWYgKHJlcXVpcmVtZW50c1tpXS5zdGFydHNXaXRoKFwianM6XCIpKSB7XG4gICAgICAgICAgICByZXF1aXJlbWVudHNbaV0gPSByZXF1aXJlbWVudHNbaV0uc2xpY2UoMyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGltcG9ydFNjcmlwdHMocmVxdWlyZW1lbnRzW2ldKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZXF1aXJlbWVudHNbaV0uc3RhcnRzV2l0aChcImh0dHBcIikpIHtcbiAgICAgICAgICBpbXBvcnRTY3JpcHRzKHJlcXVpcmVtZW50c1tpXSk7XG4gICAgICAgIH0gZWxzZSBpZiAocmVxdWlyZW1lbnRzW2ldLnN0YXJ0c1dpdGgoXCJjYWNoZTpcIikpIHtcbiAgICAgICAgICAvL2lnbm9yZSBjYWNoZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiVW5wcm9jZXNzZWQgcmVxdWlyZW1lbnRzIHVybDogXCIgKyByZXF1aXJlbWVudHNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhyb3cgXCJmYWlsZWQgdG8gaW1wb3J0IHJlcXVpcmVkIHNjcmlwdHM6IFwiICsgcmVxdWlyZW1lbnRzLnRvU3RyaW5nKCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGxvYWRSZXF1aXJlbWVudHMocmVxdWlyZW1lbnRzKSB7XG4gIGlmIChcbiAgICB0eXBlb2YgV29ya2VyR2xvYmFsU2NvcGUgIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICBzZWxmIGluc3RhbmNlb2YgV29ya2VyR2xvYmFsU2NvcGVcbiAgKSB7XG4gICAgcmV0dXJuIGxvYWRSZXF1aXJlbWVudHNJbldlYndvcmtlcihyZXF1aXJlbWVudHMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBsb2FkUmVxdWlyZW1lbnRzSW5XaW5kb3cocmVxdWlyZW1lbnRzKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBub3JtYWxpemVDb25maWcoY29uZmlnKSB7XG4gIGNvbmZpZy52ZXJzaW9uID0gY29uZmlnLnZlcnNpb24gfHwgXCIwLjEuMFwiO1xuICBjb25maWcuZGVzY3JpcHRpb24gPVxuICAgIGNvbmZpZy5kZXNjcmlwdGlvbiB8fCBgW1RPRE86IGFkZCBkZXNjcmlwdGlvbiBmb3IgJHtjb25maWcubmFtZX0gXWA7XG4gIGNvbmZpZy50eXBlID0gY29uZmlnLnR5cGUgfHwgXCJycGMtd2luZG93XCI7XG4gIGNvbmZpZy5pZCA9IGNvbmZpZy5pZCB8fCByYW5kSWQoKTtcbiAgY29uZmlnLnRhcmdldF9vcmlnaW4gPSBjb25maWcudGFyZ2V0X29yaWdpbiB8fCBcIipcIjtcbiAgY29uZmlnLmFsbG93X2V4ZWN1dGlvbiA9IGNvbmZpZy5hbGxvd19leGVjdXRpb24gfHwgZmFsc2U7XG4gIC8vIHJlbW92ZSBmdW5jdGlvbnNcbiAgY29uZmlnID0gT2JqZWN0LmtleXMoY29uZmlnKS5yZWR1Y2UoKHAsIGMpID0+IHtcbiAgICBpZiAodHlwZW9mIGNvbmZpZ1tjXSAhPT0gXCJmdW5jdGlvblwiKSBwW2NdID0gY29uZmlnW2NdO1xuICAgIHJldHVybiBwO1xuICB9LCB7fSk7XG4gIHJldHVybiBjb25maWc7XG59XG5jb25zdCB0eXBlZEFycmF5VG9EdHlwZU1hcHBpbmcgPSB7XG4gIEludDhBcnJheTogXCJpbnQ4XCIsXG4gIEludDE2QXJyYXk6IFwiaW50MTZcIixcbiAgSW50MzJBcnJheTogXCJpbnQzMlwiLFxuICBVaW50OEFycmF5OiBcInVpbnQ4XCIsXG4gIFVpbnQxNkFycmF5OiBcInVpbnQxNlwiLFxuICBVaW50MzJBcnJheTogXCJ1aW50MzJcIixcbiAgRmxvYXQzMkFycmF5OiBcImZsb2F0MzJcIixcbiAgRmxvYXQ2NEFycmF5OiBcImZsb2F0NjRcIixcbiAgQXJyYXk6IFwiYXJyYXlcIixcbn07XG5cbmNvbnN0IHR5cGVkQXJyYXlUb0R0eXBlS2V5cyA9IFtdO1xuZm9yIChjb25zdCBhcnJUeXBlIG9mIE9iamVjdC5rZXlzKHR5cGVkQXJyYXlUb0R0eXBlTWFwcGluZykpIHtcbiAgdHlwZWRBcnJheVRvRHR5cGVLZXlzLnB1c2goZXZhbChhcnJUeXBlKSk7XG59XG5cbmZ1bmN0aW9uIHR5cGVkQXJyYXlUb0R0eXBlKG9iaikge1xuICBsZXQgZHR5cGUgPSB0eXBlZEFycmF5VG9EdHlwZU1hcHBpbmdbb2JqLmNvbnN0cnVjdG9yLm5hbWVdO1xuICBpZiAoIWR0eXBlKSB7XG4gICAgY29uc3QgcHQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqKTtcbiAgICBmb3IgKGNvbnN0IGFyclR5cGUgb2YgdHlwZWRBcnJheVRvRHR5cGVLZXlzKSB7XG4gICAgICBpZiAocHQgaW5zdGFuY2VvZiBhcnJUeXBlKSB7XG4gICAgICAgIGR0eXBlID0gdHlwZWRBcnJheVRvRHR5cGVNYXBwaW5nW2FyclR5cGUubmFtZV07XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZHR5cGU7XG59XG5cbmZ1bmN0aW9uIGNhY2hlVXJsSW5TZXJ2aWNlV29ya2VyKHVybCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSB7XG4gICAgICBjb21tYW5kOiBcImFkZFwiLFxuICAgICAgdXJsOiB1cmwsXG4gICAgfTtcbiAgICBpZiAoIW5hdmlnYXRvci5zZXJ2aWNlV29ya2VyIHx8ICFuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3Rlcikge1xuICAgICAgcmVqZWN0KFwiU2VydmljZSB3b3JrZXIgaXMgbm90IHN1cHBvcnRlZC5cIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG1lc3NhZ2VDaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgbWVzc2FnZUNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICBpZiAoZXZlbnQuZGF0YSAmJiBldmVudC5kYXRhLmVycm9yKSB7XG4gICAgICAgIHJlamVjdChldmVudC5kYXRhLmVycm9yKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUoZXZlbnQuZGF0YSAmJiBldmVudC5kYXRhLnJlc3VsdCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmIChuYXZpZ2F0b3Iuc2VydmljZVdvcmtlciAmJiBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5jb250cm9sbGVyKSB7XG4gICAgICBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5jb250cm9sbGVyLnBvc3RNZXNzYWdlKG1lc3NhZ2UsIFtcbiAgICAgICAgbWVzc2FnZUNoYW5uZWwucG9ydDIsXG4gICAgICBdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVqZWN0KFwiU2VydmljZSB3b3JrZXIgY29udHJvbGxlciBpcyBub3QgYXZhaWxhYmxlXCIpO1xuICAgIH1cbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNhY2hlUmVxdWlyZW1lbnRzKHJlcXVpcmVtZW50cykge1xuICByZXF1aXJlbWVudHMgPSByZXF1aXJlbWVudHMgfHwgW107XG4gIGlmICghQXJyYXkuaXNBcnJheShyZXF1aXJlbWVudHMpKSB7XG4gICAgcmVxdWlyZW1lbnRzID0gW3JlcXVpcmVtZW50c107XG4gIH1cbiAgZm9yIChsZXQgcmVxIG9mIHJlcXVpcmVtZW50cykge1xuICAgIC8vcmVtb3ZlIHByZWZpeFxuICAgIGlmIChyZXEuc3RhcnRzV2l0aChcImpzOlwiKSkgcmVxID0gcmVxLnNsaWNlKDMpO1xuICAgIGlmIChyZXEuc3RhcnRzV2l0aChcImNzczpcIikpIHJlcSA9IHJlcS5zbGljZSg0KTtcbiAgICBpZiAocmVxLnN0YXJ0c1dpdGgoXCJjYWNoZTpcIikpIHJlcSA9IHJlcS5zbGljZSg2KTtcbiAgICBpZiAoIXJlcS5zdGFydHNXaXRoKFwiaHR0cFwiKSkgY29udGludWU7XG5cbiAgICBhd2FpdCBjYWNoZVVybEluU2VydmljZVdvcmtlcihyZXEpLmNhdGNoKChlKSA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFzc2VydChjb25kaXRpb24sIG1lc3NhZ2UpIHtcbiAgaWYgKCFjb25kaXRpb24pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSB8fCBcIkFzc2VydGlvbiBmYWlsZWRcIik7XG4gIH1cbn1cblxuLy8jU291cmNlIGh0dHBzOi8vYml0Lmx5LzJuZVdmSjJcbmZ1bmN0aW9uIHVybEpvaW4oLi4uYXJncykge1xuICByZXR1cm4gYXJnc1xuICAgIC5qb2luKFwiL1wiKVxuICAgIC5yZXBsYWNlKC9bXFwvXSsvZywgXCIvXCIpXG4gICAgLnJlcGxhY2UoL14oLispOlxcLy8sIFwiJDE6Ly9cIilcbiAgICAucmVwbGFjZSgvXmZpbGU6LywgXCJmaWxlOi9cIilcbiAgICAucmVwbGFjZSgvXFwvKFxcP3wmfCNbXiFdKS9nLCBcIiQxXCIpXG4gICAgLnJlcGxhY2UoL1xcPy9nLCBcIiZcIilcbiAgICAucmVwbGFjZShcIiZcIiwgXCI/XCIpO1xufVxuXG5mdW5jdGlvbiB3YWl0Rm9yKHByb20sIHRpbWUsIGVycm9yKSB7XG4gIGxldCB0aW1lcjtcbiAgcmV0dXJuIFByb21pc2UucmFjZShbXG4gICAgcHJvbSxcbiAgICBuZXcgUHJvbWlzZShcbiAgICAgIChfciwgcmVqKSA9PlxuICAgICAgICAodGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICByZWooZXJyb3IgfHwgXCJUaW1lb3V0IEVycm9yXCIpO1xuICAgICAgICB9LCB0aW1lICogMTAwMCkpLFxuICAgICksXG4gIF0pLmZpbmFsbHkoKCkgPT4gY2xlYXJUaW1lb3V0KHRpbWVyKSk7XG59XG5cbmNsYXNzIE1lc3NhZ2VFbWl0dGVyIHtcbiAgY29uc3RydWN0b3IoZGVidWcpIHtcbiAgICB0aGlzLl9ldmVudF9oYW5kbGVycyA9IHt9O1xuICAgIHRoaXMuX29uY2VfaGFuZGxlcnMgPSB7fTtcbiAgICB0aGlzLl9kZWJ1ZyA9IGRlYnVnO1xuICB9XG4gIGVtaXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiZW1pdCBpcyBub3QgaW1wbGVtZW50ZWRcIik7XG4gIH1cbiAgb24oZXZlbnQsIGhhbmRsZXIpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50X2hhbmRsZXJzW2V2ZW50XSkge1xuICAgICAgdGhpcy5fZXZlbnRfaGFuZGxlcnNbZXZlbnRdID0gW107XG4gICAgfVxuICAgIHRoaXMuX2V2ZW50X2hhbmRsZXJzW2V2ZW50XS5wdXNoKGhhbmRsZXIpO1xuICB9XG4gIG9uY2UoZXZlbnQsIGhhbmRsZXIpIHtcbiAgICBoYW5kbGVyLl9fX2V2ZW50X3J1bl9vbmNlID0gdHJ1ZTtcbiAgICB0aGlzLm9uKGV2ZW50LCBoYW5kbGVyKTtcbiAgfVxuICBvZmYoZXZlbnQsIGhhbmRsZXIpIHtcbiAgICBpZiAoIWV2ZW50ICYmICFoYW5kbGVyKSB7XG4gICAgICAvLyByZW1vdmUgYWxsIGV2ZW50cyBoYW5kbGVyc1xuICAgICAgdGhpcy5fZXZlbnRfaGFuZGxlcnMgPSB7fTtcbiAgICB9IGVsc2UgaWYgKGV2ZW50ICYmICFoYW5kbGVyKSB7XG4gICAgICAvLyByZW1vdmUgYWxsIGhhbmxkZXJzIGZvciB0aGUgZXZlbnRcbiAgICAgIGlmICh0aGlzLl9ldmVudF9oYW5kbGVyc1tldmVudF0pIHRoaXMuX2V2ZW50X2hhbmRsZXJzW2V2ZW50XSA9IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyByZW1vdmUgYSBzcGVjaWZpYyBoYW5kbGVyXG4gICAgICBpZiAodGhpcy5fZXZlbnRfaGFuZGxlcnNbZXZlbnRdKSB7XG4gICAgICAgIGNvbnN0IGlkeCA9IHRoaXMuX2V2ZW50X2hhbmRsZXJzW2V2ZW50XS5pbmRleE9mKGhhbmRsZXIpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICB0aGlzLl9ldmVudF9oYW5kbGVyc1tldmVudF0uc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgX2ZpcmUoZXZlbnQsIGRhdGEpIHtcbiAgICBpZiAodGhpcy5fZXZlbnRfaGFuZGxlcnNbZXZlbnRdKSB7XG4gICAgICB2YXIgaSA9IHRoaXMuX2V2ZW50X2hhbmRsZXJzW2V2ZW50XS5sZW5ndGg7XG4gICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSB0aGlzLl9ldmVudF9oYW5kbGVyc1tldmVudF1baV07XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaGFuZGxlcihkYXRhKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgaWYgKGhhbmRsZXIuX19fZXZlbnRfcnVuX29uY2UpIHtcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50X2hhbmRsZXJzW2V2ZW50XS5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0aGlzLl9kZWJ1Zykge1xuICAgICAgICBjb25zb2xlLndhcm4oXCJ1bmhhbmRsZWQgZXZlbnRcIiwgZXZlbnQsIGRhdGEpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHdhaXRGb3IoZXZlbnQsIHRpbWVvdXQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgaGFuZGxlciA9IChkYXRhKSA9PiB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgIHJlc29sdmUoZGF0YSk7XG4gICAgICB9O1xuICAgICAgdGhpcy5vbmNlKGV2ZW50LCBoYW5kbGVyKTtcbiAgICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMub2ZmKGV2ZW50LCBoYW5kbGVyKTtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihcIlRpbWVvdXRcIikpO1xuICAgICAgfSwgdGltZW91dCk7XG4gICAgfSk7XG4gIH1cbn1cblxuY2xhc3MgU2VtYXBob3JlIHtcbiAgY29uc3RydWN0b3IobWF4KSB7XG4gICAgdGhpcy5tYXggPSBtYXg7XG4gICAgdGhpcy5xdWV1ZSA9IFtdO1xuICAgIHRoaXMuY3VycmVudCA9IDA7XG4gIH1cbiAgYXN5bmMgcnVuKHRhc2spIHtcbiAgICBpZiAodGhpcy5jdXJyZW50ID49IHRoaXMubWF4KSB7XG4gICAgICAvLyBXYWl0IHVudGlsIGEgc2xvdCBpcyBmcmVlXG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gdGhpcy5xdWV1ZS5wdXNoKHJlc29sdmUpKTtcbiAgICB9XG4gICAgdGhpcy5jdXJyZW50Kys7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBhd2FpdCB0YXNrKCk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMuY3VycmVudC0tO1xuICAgICAgaWYgKHRoaXMucXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAvLyByZWxlYXNlIG9uZSB3YWl0ZXJcbiAgICAgICAgdGhpcy5xdWV1ZS5zaGlmdCgpKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgdGhlIG9iamVjdCBpcyBhIGdlbmVyYXRvclxuICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIE9iamVjdCB0byBjaGVja1xuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgb2JqZWN0IGlzIGEgZ2VuZXJhdG9yXG4gKi9cbmZ1bmN0aW9uIGlzR2VuZXJhdG9yKG9iaikge1xuICBpZiAoIW9iaikgcmV0dXJuIGZhbHNlO1xuXG4gIHJldHVybiAoXG4gICAgdHlwZW9mIG9iaiA9PT0gXCJvYmplY3RcIiAmJlxuICAgIHR5cGVvZiBvYmoubmV4dCA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgdHlwZW9mIG9iai50aHJvdyA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgdHlwZW9mIG9iai5yZXR1cm4gPT09IFwiZnVuY3Rpb25cIlxuICApO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGFuIG9iamVjdCBpcyBhbiBhc3luYyBnZW5lcmF0b3Igb2JqZWN0XG4gKiBAcGFyYW0ge2FueX0gb2JqIC0gT2JqZWN0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBvYmplY3QgaXMgYW4gYXN5bmMgZ2VuZXJhdG9yIG9iamVjdFxuICovXG5mdW5jdGlvbiBpc0FzeW5jR2VuZXJhdG9yKG9iaikge1xuICBpZiAoIW9iaikgcmV0dXJuIGZhbHNlO1xuICAvLyBDaGVjayBpZiBpdCdzIGFuIGFzeW5jIGdlbmVyYXRvciBvYmplY3RcbiAgcmV0dXJuIChcbiAgICB0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiICYmXG4gICAgdHlwZW9mIG9iai5uZXh0ID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICB0eXBlb2Ygb2JqLnRocm93ID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICB0eXBlb2Ygb2JqLnJldHVybiA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgU3ltYm9sLmFzeW5jSXRlcmF0b3IgaW4gT2JqZWN0KG9iaikgJiZcbiAgICBvYmpbU3ltYm9sLnRvU3RyaW5nVGFnXSA9PT0gXCJBc3luY0dlbmVyYXRvclwiXG4gICk7XG59XG5cblxuLyoqKi8gfSksXG5cbi8qKiovIFwiLi9zcmMvdXRpbHMvc2NoZW1hLmpzXCI6XG4vKiEqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiEqXFxcbiAgISoqKiAuL3NyYy91dGlscy9zY2hlbWEuanMgKioqIVxuICBcXCoqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuLyoqKi8gKChfX3VudXNlZF93ZWJwYWNrX21vZHVsZSwgX193ZWJwYWNrX2V4cG9ydHNfXywgX193ZWJwYWNrX3JlcXVpcmVfXykgPT4ge1xuXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIoX193ZWJwYWNrX2V4cG9ydHNfXyk7XG4vKiBoYXJtb255IGV4cG9ydCAqLyBfX3dlYnBhY2tfcmVxdWlyZV9fLmQoX193ZWJwYWNrX2V4cG9ydHNfXywge1xuLyogaGFybW9ueSBleHBvcnQgKi8gICBzY2hlbWFGdW5jdGlvbjogKCkgPT4gKC8qIGJpbmRpbmcgKi8gc2NoZW1hRnVuY3Rpb24pXG4vKiBoYXJtb255IGV4cG9ydCAqLyB9KTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuICovIFwiLi9zcmMvdXRpbHMvaW5kZXguanNcIik7XG5cblxuZnVuY3Rpb24gc2NoZW1hRnVuY3Rpb24oXG4gIGZ1bmMsXG4gIHsgc2NoZW1hX3R5cGUgPSBcImF1dG9cIiwgbmFtZSA9IG51bGwsIGRlc2NyaXB0aW9uID0gbnVsbCwgcGFyYW1ldGVycyA9IG51bGwgfSxcbikge1xuICBpZiAoIWZ1bmMgfHwgdHlwZW9mIGZ1bmMgIT09IFwiZnVuY3Rpb25cIikge1xuICAgIHRocm93IEVycm9yKFwiZnVuYyBzaG91bGQgYmUgYSBmdW5jdGlvblwiKTtcbiAgfVxuICAoMCxfX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KShzY2hlbWFfdHlwZSA9PT0gXCJhdXRvXCIsIFwic2NoZW1hX3R5cGUgc2hvdWxkIGJlIGF1dG9cIik7XG4gICgwLF9fX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKG5hbWUsIFwibmFtZSBzaG91bGQgbm90IGJlIG51bGxcIik7XG4gICgwLF9fX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKFxuICAgIHBhcmFtZXRlcnMgJiYgcGFyYW1ldGVycy50eXBlID09PSBcIm9iamVjdFwiLFxuICAgIFwicGFyYW1ldGVycyBzaG91bGQgYmUgYW4gb2JqZWN0XCIsXG4gICk7XG4gIGZ1bmMuX19zY2hlbWFfXyA9IHtcbiAgICBuYW1lOiBuYW1lLFxuICAgIGRlc2NyaXB0aW9uOiBkZXNjcmlwdGlvbixcbiAgICBwYXJhbWV0ZXJzOiBwYXJhbWV0ZXJzIHx8IFtdLFxuICB9O1xuICByZXR1cm4gZnVuYztcbn1cblxuXG4vKioqLyB9KSxcblxuLyoqKi8gXCIuL3NyYy93ZWJydGMtY2xpZW50LmpzXCI6XG4vKiEqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiohKlxcXG4gICEqKiogLi9zcmMvd2VicnRjLWNsaWVudC5qcyAqKiohXG4gIFxcKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuLyoqKi8gKChfX3VudXNlZF93ZWJwYWNrX21vZHVsZSwgX193ZWJwYWNrX2V4cG9ydHNfXywgX193ZWJwYWNrX3JlcXVpcmVfXykgPT4ge1xuXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIoX193ZWJwYWNrX2V4cG9ydHNfXyk7XG4vKiBoYXJtb255IGV4cG9ydCAqLyBfX3dlYnBhY2tfcmVxdWlyZV9fLmQoX193ZWJwYWNrX2V4cG9ydHNfXywge1xuLyogaGFybW9ueSBleHBvcnQgKi8gICBnZXRSVENTZXJ2aWNlOiAoKSA9PiAoLyogYmluZGluZyAqLyBnZXRSVENTZXJ2aWNlKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgcmVnaXN0ZXJSVENTZXJ2aWNlOiAoKSA9PiAoLyogYmluZGluZyAqLyByZWdpc3RlclJUQ1NlcnZpY2UpXG4vKiBoYXJtb255IGV4cG9ydCAqLyB9KTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfcnBjX2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL3JwYy5qcyAqLyBcIi4vc3JjL3JwYy5qc1wiKTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vdXRpbHMgKi8gXCIuL3NyYy91dGlscy9pbmRleC5qc1wiKTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfdXRpbHNfc2NoZW1hX2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL3V0aWxzL3NjaGVtYS5qcyAqLyBcIi4vc3JjL3V0aWxzL3NjaGVtYS5qc1wiKTtcblxuXG5cblxuY2xhc3MgV2ViUlRDQ29ubmVjdGlvbiB7XG4gIGNvbnN0cnVjdG9yKGNoYW5uZWwpIHtcbiAgICB0aGlzLl9kYXRhX2NoYW5uZWwgPSBjaGFubmVsO1xuICAgIHRoaXMuX2hhbmRsZV9tZXNzYWdlID0gbnVsbDtcbiAgICB0aGlzLl9yZWNvbm5lY3Rpb25fdG9rZW4gPSBudWxsO1xuICAgIHRoaXMuX2hhbmRsZV9kaXNjb25uZWN0ZWQgPSBudWxsO1xuICAgIHRoaXMuX2hhbmRsZV9jb25uZWN0ZWQgPSAoKSA9PiB7fTtcbiAgICB0aGlzLm1hbmFnZXJfaWQgPSBudWxsO1xuICAgIHRoaXMuX2xhc3RfbWVzc2FnZSA9IG51bGw7XG4gICAgdGhpcy5fZGF0YV9jaGFubmVsLm9ub3BlbiA9IGFzeW5jICgpID0+IHtcbiAgICAgIGlmICh0aGlzLl9sYXN0X21lc3NhZ2UpIHtcbiAgICAgICAgY29uc29sZS5pbmZvKFwiUmVzZW5kaW5nIGxhc3QgbWVzc2FnZSBhZnRlciBjb25uZWN0aW9uIGVzdGFibGlzaGVkXCIpO1xuICAgICAgICB0aGlzLl9kYXRhX2NoYW5uZWwuc2VuZCh0aGlzLl9sYXN0X21lc3NhZ2UpO1xuICAgICAgICB0aGlzLl9sYXN0X21lc3NhZ2UgPSBudWxsO1xuICAgICAgfVxuICAgICAgdGhpcy5faGFuZGxlX2Nvbm5lY3RlZCAmJlxuICAgICAgICB0aGlzLl9oYW5kbGVfY29ubmVjdGVkKHsgY2hhbm5lbDogdGhpcy5fZGF0YV9jaGFubmVsIH0pO1xuICAgIH07XG4gICAgdGhpcy5fZGF0YV9jaGFubmVsLm9ubWVzc2FnZSA9IGFzeW5jIChldmVudCkgPT4ge1xuICAgICAgbGV0IGRhdGEgPSBldmVudC5kYXRhO1xuICAgICAgaWYgKGRhdGEgaW5zdGFuY2VvZiBCbG9iKSB7XG4gICAgICAgIGRhdGEgPSBhd2FpdCBkYXRhLmFycmF5QnVmZmVyKCk7XG4gICAgICB9XG4gICAgICB0aGlzLl9oYW5kbGVfbWVzc2FnZShkYXRhKTtcbiAgICB9O1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuX2RhdGFfY2hhbm5lbC5vbmNsb3NlID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHRoaXMuX2hhbmRsZV9kaXNjb25uZWN0ZWQpIHRoaXMuX2hhbmRsZV9kaXNjb25uZWN0ZWQoXCJjbG9zZWRcIik7XG4gICAgICBjb25zb2xlLmxvZyhcIndlYnNvY2tldCBjbG9zZWRcIik7XG4gICAgICBzZWxmLl9kYXRhX2NoYW5uZWwgPSBudWxsO1xuICAgIH07XG4gIH1cblxuICBvbl9kaXNjb25uZWN0ZWQoaGFuZGxlcikge1xuICAgIHRoaXMuX2hhbmRsZV9kaXNjb25uZWN0ZWQgPSBoYW5kbGVyO1xuICB9XG5cbiAgb25fY29ubmVjdGVkKGhhbmRsZXIpIHtcbiAgICB0aGlzLl9oYW5kbGVfY29ubmVjdGVkID0gaGFuZGxlcjtcbiAgfVxuXG4gIG9uX21lc3NhZ2UoaGFuZGxlcikge1xuICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLmFzc2VydCkoaGFuZGxlciwgXCJoYW5kbGVyIGlzIHJlcXVpcmVkXCIpO1xuICAgIHRoaXMuX2hhbmRsZV9tZXNzYWdlID0gaGFuZGxlcjtcbiAgfVxuXG4gIGFzeW5jIGVtaXRfbWVzc2FnZShkYXRhKSB7XG4gICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18uYXNzZXJ0KSh0aGlzLl9oYW5kbGVfbWVzc2FnZSwgXCJObyBoYW5kbGVyIGZvciBtZXNzYWdlXCIpO1xuICAgIHRyeSB7XG4gICAgICB0aGlzLl9sYXN0X21lc3NhZ2UgPSBkYXRhO1xuICAgICAgdGhpcy5fZGF0YV9jaGFubmVsLnNlbmQoZGF0YSk7XG4gICAgICB0aGlzLl9sYXN0X21lc3NhZ2UgPSBudWxsO1xuICAgIH0gY2F0Y2ggKGV4cCkge1xuICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIHNlbmQgZGF0YSwgZXJyb3I6ICR7ZXhwfWApO1xuICAgICAgdGhyb3cgZXhwO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGRpc2Nvbm5lY3QocmVhc29uKSB7XG4gICAgdGhpcy5fbGFzdF9tZXNzYWdlID0gbnVsbDtcbiAgICB0aGlzLl9kYXRhX2NoYW5uZWwgPSBudWxsO1xuICAgIGNvbnNvbGUuaW5mbyhgZGF0YSBjaGFubmVsIGNvbm5lY3Rpb24gZGlzY29ubmVjdGVkICgke3JlYXNvbn0pYCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gX3NldHVwUlBDKGNvbmZpZykge1xuICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5hc3NlcnQpKGNvbmZpZy5jaGFubmVsLCBcIk5vIGNoYW5uZWwgcHJvdmlkZWRcIik7XG4gICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLmFzc2VydCkoY29uZmlnLndvcmtzcGFjZSwgXCJObyB3b3Jrc3BhY2UgcHJvdmlkZWRcIik7XG4gIGNvbnN0IGNoYW5uZWwgPSBjb25maWcuY2hhbm5lbDtcbiAgY29uc3QgY2xpZW50SWQgPSBjb25maWcuY2xpZW50X2lkIHx8ICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLnJhbmRJZCkoKTtcbiAgY29uc3QgY29ubmVjdGlvbiA9IG5ldyBXZWJSVENDb25uZWN0aW9uKGNoYW5uZWwpO1xuICBjb25maWcuY29udGV4dCA9IGNvbmZpZy5jb250ZXh0IHx8IHt9O1xuICBjb25maWcuY29udGV4dC5jb25uZWN0aW9uX3R5cGUgPSBcIndlYnJ0Y1wiO1xuICBjb25maWcuY29udGV4dC53cyA9IGNvbmZpZy53b3Jrc3BhY2U7XG4gIGNvbnN0IHJwYyA9IG5ldyBfcnBjX2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uUlBDKGNvbm5lY3Rpb24sIHtcbiAgICBjbGllbnRfaWQ6IGNsaWVudElkLFxuICAgIGRlZmF1bHRfY29udGV4dDogY29uZmlnLmNvbnRleHQsXG4gICAgbmFtZTogY29uZmlnLm5hbWUsXG4gICAgbWV0aG9kX3RpbWVvdXQ6IGNvbmZpZy5tZXRob2RfdGltZW91dCB8fCAxMC4wLFxuICAgIHdvcmtzcGFjZTogY29uZmlnLndvcmtzcGFjZSxcbiAgICBhcHBfaWQ6IGNvbmZpZy5hcHBfaWQsXG4gICAgbG9uZ19tZXNzYWdlX2NodW5rX3NpemU6IGNvbmZpZy5sb25nX21lc3NhZ2VfY2h1bmtfc2l6ZSxcbiAgfSk7XG4gIHJldHVybiBycGM7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIF9jcmVhdGVPZmZlcihwYXJhbXMsIHNlcnZlciwgY29uZmlnLCBvbkluaXQsIGNvbnRleHQpIHtcbiAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xuICBsZXQgb2ZmZXIgPSBuZXcgUlRDU2Vzc2lvbkRlc2NyaXB0aW9uKHtcbiAgICBzZHA6IHBhcmFtcy5zZHAsXG4gICAgdHlwZTogcGFyYW1zLnR5cGUsXG4gIH0pO1xuXG4gIGxldCBwYyA9IG5ldyBSVENQZWVyQ29ubmVjdGlvbih7XG4gICAgaWNlU2VydmVyczogY29uZmlnLmljZV9zZXJ2ZXJzIHx8IFtcbiAgICAgIHsgdXJsczogW1wic3R1bjpzdHVuLmwuZ29vZ2xlLmNvbToxOTMwMlwiXSB9LFxuICAgIF0sXG4gICAgc2RwU2VtYW50aWNzOiBcInVuaWZpZWQtcGxhblwiLFxuICB9KTtcblxuICBpZiAoc2VydmVyKSB7XG4gICAgcGMuYWRkRXZlbnRMaXN0ZW5lcihcImRhdGFjaGFubmVsXCIsIGFzeW5jIChldmVudCkgPT4ge1xuICAgICAgY29uc3QgY2hhbm5lbCA9IGV2ZW50LmNoYW5uZWw7XG4gICAgICBsZXQgY3R4ID0gbnVsbDtcbiAgICAgIGlmIChjb250ZXh0ICYmIGNvbnRleHQudXNlcikgY3R4ID0geyB1c2VyOiBjb250ZXh0LnVzZXIsIHdzOiBjb250ZXh0LndzIH07XG4gICAgICBjb25zdCBycGMgPSBhd2FpdCBfc2V0dXBSUEMoe1xuICAgICAgICBjaGFubmVsOiBjaGFubmVsLFxuICAgICAgICBjbGllbnRfaWQ6IGNoYW5uZWwubGFiZWwsXG4gICAgICAgIHdvcmtzcGFjZTogc2VydmVyLmNvbmZpZy53b3Jrc3BhY2UsXG4gICAgICAgIGNvbnRleHQ6IGN0eCxcbiAgICAgIH0pO1xuICAgICAgLy8gTWFwIGFsbCB0aGUgbG9jYWwgc2VydmljZXMgdG8gdGhlIHdlYnJ0YyBjbGllbnRcbiAgICAgIHJwYy5fc2VydmljZXMgPSBzZXJ2ZXIucnBjLl9zZXJ2aWNlcztcbiAgICB9KTtcbiAgfVxuXG4gIGlmIChvbkluaXQpIHtcbiAgICBhd2FpdCBvbkluaXQocGMpO1xuICB9XG5cbiAgYXdhaXQgcGMuc2V0UmVtb3RlRGVzY3JpcHRpb24ob2ZmZXIpO1xuXG4gIGxldCBhbnN3ZXIgPSBhd2FpdCBwYy5jcmVhdGVBbnN3ZXIoKTtcbiAgYXdhaXQgcGMuc2V0TG9jYWxEZXNjcmlwdGlvbihhbnN3ZXIpO1xuXG4gIHJldHVybiB7XG4gICAgc2RwOiBwYy5sb2NhbERlc2NyaXB0aW9uLnNkcCxcbiAgICB0eXBlOiBwYy5sb2NhbERlc2NyaXB0aW9uLnR5cGUsXG4gICAgd29ya3NwYWNlOiBzZXJ2ZXIuY29uZmlnLndvcmtzcGFjZSxcbiAgfTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0UlRDU2VydmljZShzZXJ2ZXIsIHNlcnZpY2VfaWQsIGNvbmZpZykge1xuICBjb25maWcgPSBjb25maWcgfHwge307XG4gIGNvbmZpZy5wZWVyX2lkID0gY29uZmlnLnBlZXJfaWQgfHwgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18ucmFuZElkKSgpO1xuXG4gIGNvbnN0IHBjID0gbmV3IFJUQ1BlZXJDb25uZWN0aW9uKHtcbiAgICBpY2VTZXJ2ZXJzOiBjb25maWcuaWNlX3NlcnZlcnMgfHwgW1xuICAgICAgeyB1cmxzOiBbXCJzdHVuOnN0dW4ubC5nb29nbGUuY29tOjE5MzAyXCJdIH0sXG4gICAgXSxcbiAgICBzZHBTZW1hbnRpY3M6IFwidW5pZmllZC1wbGFuXCIsXG4gIH0pO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIHBjLmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICAgIFwiY29ubmVjdGlvbnN0YXRlY2hhbmdlXCIsXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICBpZiAocGMuY29ubmVjdGlvblN0YXRlID09PSBcImZhaWxlZFwiKSB7XG4gICAgICAgICAgICBwYy5jbG9zZSgpO1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihcIldlYlJUQyBDb25uZWN0aW9uIGZhaWxlZFwiKSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChwYy5jb25uZWN0aW9uU3RhdGUgPT09IFwiY2xvc2VkXCIpIHtcbiAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoXCJXZWJSVEMgQ29ubmVjdGlvbiBjbG9zZWRcIikpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIldlYlJUQyBDb25uZWN0aW9uIHN0YXRlOiBcIiwgcGMuY29ubmVjdGlvblN0YXRlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGZhbHNlLFxuICAgICAgKTtcblxuICAgICAgaWYgKGNvbmZpZy5vbl9pbml0KSB7XG4gICAgICAgIGF3YWl0IGNvbmZpZy5vbl9pbml0KHBjKTtcbiAgICAgICAgZGVsZXRlIGNvbmZpZy5vbl9pbml0O1xuICAgICAgfVxuICAgICAgbGV0IGNoYW5uZWwgPSBwYy5jcmVhdGVEYXRhQ2hhbm5lbChjb25maWcucGVlcl9pZCwgeyBvcmRlcmVkOiB0cnVlIH0pO1xuICAgICAgY2hhbm5lbC5iaW5hcnlUeXBlID0gXCJhcnJheWJ1ZmZlclwiO1xuICAgICAgY29uc3Qgb2ZmZXIgPSBhd2FpdCBwYy5jcmVhdGVPZmZlcigpO1xuICAgICAgYXdhaXQgcGMuc2V0TG9jYWxEZXNjcmlwdGlvbihvZmZlcik7XG4gICAgICBjb25zdCBzdmMgPSBhd2FpdCBzZXJ2ZXIuZ2V0U2VydmljZShzZXJ2aWNlX2lkKTtcbiAgICAgIGNvbnN0IGFuc3dlciA9IGF3YWl0IHN2Yy5vZmZlcih7XG4gICAgICAgIHNkcDogcGMubG9jYWxEZXNjcmlwdGlvbi5zZHAsXG4gICAgICAgIHR5cGU6IHBjLmxvY2FsRGVzY3JpcHRpb24udHlwZSxcbiAgICAgIH0pO1xuXG4gICAgICBjaGFubmVsLm9ub3BlbiA9ICgpID0+IHtcbiAgICAgICAgY29uZmlnLmNoYW5uZWwgPSBjaGFubmVsO1xuICAgICAgICBjb25maWcud29ya3NwYWNlID0gYW5zd2VyLndvcmtzcGFjZTtcbiAgICAgICAgLy8gV2FpdCBmb3IgdGhlIGNoYW5uZWwgdG8gYmUgb3BlbiBiZWZvcmUgcmV0dXJuaW5nIHRoZSBycGNcbiAgICAgICAgLy8gVGhpcyBpcyBuZWVkZWQgZm9yIHNhZmFyaSB0byB3b3JrXG4gICAgICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJwYyA9IGF3YWl0IF9zZXR1cFJQQyhjb25maWcpO1xuICAgICAgICAgIHBjLnJwYyA9IHJwYztcbiAgICAgICAgICBhc3luYyBmdW5jdGlvbiBnZXRfc2VydmljZShuYW1lLCAuLi5hcmdzKSB7XG4gICAgICAgICAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5hc3NlcnQpKFxuICAgICAgICAgICAgICAhbmFtZS5pbmNsdWRlcyhcIjpcIiksXG4gICAgICAgICAgICAgIFwiV2ViUlRDIHNlcnZpY2UgbmFtZSBzaG91bGQgbm90IGNvbnRhaW4gJzonXCIsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18uYXNzZXJ0KShcbiAgICAgICAgICAgICAgIW5hbWUuaW5jbHVkZXMoXCIvXCIpLFxuICAgICAgICAgICAgICBcIldlYlJUQyBzZXJ2aWNlIG5hbWUgc2hvdWxkIG5vdCBjb250YWluICcvJ1wiLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCBycGMuZ2V0X3JlbW90ZV9zZXJ2aWNlKFxuICAgICAgICAgICAgICBjb25maWcud29ya3NwYWNlICsgXCIvXCIgKyBjb25maWcucGVlcl9pZCArIFwiOlwiICsgbmFtZSxcbiAgICAgICAgICAgICAgLi4uYXJncyxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGFzeW5jIGZ1bmN0aW9uIGRpc2Nvbm5lY3QoKSB7XG4gICAgICAgICAgICBhd2FpdCBycGMuZGlzY29ubmVjdCgpO1xuICAgICAgICAgICAgcGMuY2xvc2UoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcGMuZ2V0U2VydmljZSA9ICgwLF91dGlsc19zY2hlbWFfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXy5zY2hlbWFGdW5jdGlvbikoZ2V0X3NlcnZpY2UsIHtcbiAgICAgICAgICAgIG5hbWU6IFwiZ2V0U2VydmljZVwiLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiR2V0IGEgcmVtb3RlIHNlcnZpY2UgdmlhIHdlYnJ0Y1wiLFxuICAgICAgICAgICAgcGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgc2VydmljZV9pZDoge1xuICAgICAgICAgICAgICAgICAgdHlwZTogXCJzdHJpbmdcIixcbiAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICAgICAgICAgICBcIlNlcnZpY2UgSUQuIFRoaXMgc2hvdWxkIGJlIGEgc2VydmljZSBpZCBpbiB0aGUgZm9ybWF0OiAnd29ya3NwYWNlL3NlcnZpY2VfaWQnLCAnd29ya3NwYWNlL2NsaWVudF9pZDpzZXJ2aWNlX2lkJyBvciAnd29ya3NwYWNlL2NsaWVudF9pZDpzZXJ2aWNlX2lkQGFwcF9pZCdcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGNvbmZpZzoge1xuICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcbiAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk9wdGlvbnMgZm9yIHRoZSBzZXJ2aWNlXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtcImlkXCJdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBwYy5kaXNjb25uZWN0ID0gKDAsX3V0aWxzX3NjaGVtYV9qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLnNjaGVtYUZ1bmN0aW9uKShkaXNjb25uZWN0LCB7XG4gICAgICAgICAgICBuYW1lOiBcImRpc2Nvbm5lY3RcIixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkRpc2Nvbm5lY3QgZnJvbSB0aGUgd2VicnRjIGNvbm5lY3Rpb24gdmlhIHdlYnJ0Y1wiLFxuICAgICAgICAgICAgcGFyYW1ldGVyczogeyB0eXBlOiBcIm9iamVjdFwiLCBwcm9wZXJ0aWVzOiB7fSB9LFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHBjLnJlZ2lzdGVyQ29kZWMgPSAoMCxfdXRpbHNfc2NoZW1hX2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18uc2NoZW1hRnVuY3Rpb24pKHJwYy5yZWdpc3Rlcl9jb2RlYywge1xuICAgICAgICAgICAgbmFtZTogXCJyZWdpc3RlckNvZGVjXCIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJSZWdpc3RlciBhIGNvZGVjIGZvciB0aGUgd2VicnRjIGNvbm5lY3Rpb25cIixcbiAgICAgICAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcbiAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgIGNvZGVjOiB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQ29kZWMgdG8gcmVnaXN0ZXJcIixcbiAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogeyB0eXBlOiBcInN0cmluZ1wiIH0sXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHt9LFxuICAgICAgICAgICAgICAgICAgICBlbmNvZGVyOiB7IHR5cGU6IFwiZnVuY3Rpb25cIiB9LFxuICAgICAgICAgICAgICAgICAgICBkZWNvZGVyOiB7IHR5cGU6IFwiZnVuY3Rpb25cIiB9LFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXNvbHZlKHBjKTtcbiAgICAgICAgfSwgNTAwKTtcbiAgICAgIH07XG5cbiAgICAgIGNoYW5uZWwub25jbG9zZSA9ICgpID0+IHJlamVjdChuZXcgRXJyb3IoXCJEYXRhIGNoYW5uZWwgY2xvc2VkXCIpKTtcblxuICAgICAgYXdhaXQgcGMuc2V0UmVtb3RlRGVzY3JpcHRpb24oXG4gICAgICAgIG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24oe1xuICAgICAgICAgIHNkcDogYW5zd2VyLnNkcCxcbiAgICAgICAgICB0eXBlOiBhbnN3ZXIudHlwZSxcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJlamVjdChlKTtcbiAgICB9XG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiByZWdpc3RlclJUQ1NlcnZpY2Uoc2VydmVyLCBzZXJ2aWNlX2lkLCBjb25maWcpIHtcbiAgY29uZmlnID0gY29uZmlnIHx8IHtcbiAgICB2aXNpYmlsaXR5OiBcInByb3RlY3RlZFwiLFxuICAgIHJlcXVpcmVfY29udGV4dDogdHJ1ZSxcbiAgfTtcbiAgY29uc3Qgb25Jbml0ID0gY29uZmlnLm9uX2luaXQ7XG4gIGRlbGV0ZSBjb25maWcub25faW5pdDtcbiAgcmV0dXJuIGF3YWl0IHNlcnZlci5yZWdpc3RlclNlcnZpY2Uoe1xuICAgIGlkOiBzZXJ2aWNlX2lkLFxuICAgIGNvbmZpZyxcbiAgICBvZmZlcjogKHBhcmFtcywgY29udGV4dCkgPT5cbiAgICAgIF9jcmVhdGVPZmZlcihwYXJhbXMsIHNlcnZlciwgY29uZmlnLCBvbkluaXQsIGNvbnRleHQpLFxuICB9KTtcbn1cblxuXG5cblxuLyoqKi8gfSksXG5cbi8qKiovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vQ2FjaGVkS2V5RGVjb2Rlci5tanNcIjpcbi8qISoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiohKlxcXG4gICEqKiogLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vQ2FjaGVkS2V5RGVjb2Rlci5tanMgKioqIVxuICBcXCoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKioqLyAoKF9fdW51c2VkX3dlYnBhY2tfX193ZWJwYWNrX21vZHVsZV9fLCBfX3dlYnBhY2tfZXhwb3J0c19fLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSA9PiB7XG5cbl9fd2VicGFja19yZXF1aXJlX18ucihfX3dlYnBhY2tfZXhwb3J0c19fKTtcbi8qIGhhcm1vbnkgZXhwb3J0ICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCB7XG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIENhY2hlZEtleURlY29kZXI6ICgpID0+ICgvKiBiaW5kaW5nICovIENhY2hlZEtleURlY29kZXIpXG4vKiBoYXJtb255IGV4cG9ydCAqLyB9KTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfdXRpbHNfdXRmOF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vdXRpbHMvdXRmOC5tanMgKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS91dGlscy91dGY4Lm1qc1wiKTtcblxudmFyIERFRkFVTFRfTUFYX0tFWV9MRU5HVEggPSAxNjtcbnZhciBERUZBVUxUX01BWF9MRU5HVEhfUEVSX0tFWSA9IDE2O1xudmFyIENhY2hlZEtleURlY29kZXIgPSAvKiogQGNsYXNzICovIChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ2FjaGVkS2V5RGVjb2RlcihtYXhLZXlMZW5ndGgsIG1heExlbmd0aFBlcktleSkge1xuICAgICAgICBpZiAobWF4S2V5TGVuZ3RoID09PSB2b2lkIDApIHsgbWF4S2V5TGVuZ3RoID0gREVGQVVMVF9NQVhfS0VZX0xFTkdUSDsgfVxuICAgICAgICBpZiAobWF4TGVuZ3RoUGVyS2V5ID09PSB2b2lkIDApIHsgbWF4TGVuZ3RoUGVyS2V5ID0gREVGQVVMVF9NQVhfTEVOR1RIX1BFUl9LRVk7IH1cbiAgICAgICAgdGhpcy5tYXhLZXlMZW5ndGggPSBtYXhLZXlMZW5ndGg7XG4gICAgICAgIHRoaXMubWF4TGVuZ3RoUGVyS2V5ID0gbWF4TGVuZ3RoUGVyS2V5O1xuICAgICAgICB0aGlzLmhpdCA9IDA7XG4gICAgICAgIHRoaXMubWlzcyA9IDA7XG4gICAgICAgIC8vIGF2b2lkIGBuZXcgQXJyYXkoTilgLCB3aGljaCBtYWtlcyBhIHNwYXJzZSBhcnJheSxcbiAgICAgICAgLy8gYmVjYXVzZSBhIHNwYXJzZSBhcnJheSBpcyB0eXBpY2FsbHkgc2xvd2VyIHRoYW4gYSBub24tc3BhcnNlIGFycmF5LlxuICAgICAgICB0aGlzLmNhY2hlcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubWF4S2V5TGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuY2FjaGVzLnB1c2goW10pO1xuICAgICAgICB9XG4gICAgfVxuICAgIENhY2hlZEtleURlY29kZXIucHJvdG90eXBlLmNhbkJlQ2FjaGVkID0gZnVuY3Rpb24gKGJ5dGVMZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGJ5dGVMZW5ndGggPiAwICYmIGJ5dGVMZW5ndGggPD0gdGhpcy5tYXhLZXlMZW5ndGg7XG4gICAgfTtcbiAgICBDYWNoZWRLZXlEZWNvZGVyLnByb3RvdHlwZS5maW5kID0gZnVuY3Rpb24gKGJ5dGVzLCBpbnB1dE9mZnNldCwgYnl0ZUxlbmd0aCkge1xuICAgICAgICB2YXIgcmVjb3JkcyA9IHRoaXMuY2FjaGVzW2J5dGVMZW5ndGggLSAxXTtcbiAgICAgICAgRklORF9DSFVOSzogZm9yICh2YXIgX2kgPSAwLCByZWNvcmRzXzEgPSByZWNvcmRzOyBfaSA8IHJlY29yZHNfMS5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIHZhciByZWNvcmQgPSByZWNvcmRzXzFbX2ldO1xuICAgICAgICAgICAgdmFyIHJlY29yZEJ5dGVzID0gcmVjb3JkLmJ5dGVzO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBieXRlTGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBpZiAocmVjb3JkQnl0ZXNbal0gIT09IGJ5dGVzW2lucHV0T2Zmc2V0ICsgal0pIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWUgRklORF9DSFVOSztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVjb3JkLnN0cjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9O1xuICAgIENhY2hlZEtleURlY29kZXIucHJvdG90eXBlLnN0b3JlID0gZnVuY3Rpb24gKGJ5dGVzLCB2YWx1ZSkge1xuICAgICAgICB2YXIgcmVjb3JkcyA9IHRoaXMuY2FjaGVzW2J5dGVzLmxlbmd0aCAtIDFdO1xuICAgICAgICB2YXIgcmVjb3JkID0geyBieXRlczogYnl0ZXMsIHN0cjogdmFsdWUgfTtcbiAgICAgICAgaWYgKHJlY29yZHMubGVuZ3RoID49IHRoaXMubWF4TGVuZ3RoUGVyS2V5KSB7XG4gICAgICAgICAgICAvLyBgcmVjb3Jkc2AgYXJlIGZ1bGwhXG4gICAgICAgICAgICAvLyBTZXQgYHJlY29yZGAgdG8gYW4gYXJiaXRyYXJ5IHBvc2l0aW9uLlxuICAgICAgICAgICAgcmVjb3Jkc1soTWF0aC5yYW5kb20oKSAqIHJlY29yZHMubGVuZ3RoKSB8IDBdID0gcmVjb3JkO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVjb3Jkcy5wdXNoKHJlY29yZCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIENhY2hlZEtleURlY29kZXIucHJvdG90eXBlLmRlY29kZSA9IGZ1bmN0aW9uIChieXRlcywgaW5wdXRPZmZzZXQsIGJ5dGVMZW5ndGgpIHtcbiAgICAgICAgdmFyIGNhY2hlZFZhbHVlID0gdGhpcy5maW5kKGJ5dGVzLCBpbnB1dE9mZnNldCwgYnl0ZUxlbmd0aCk7XG4gICAgICAgIGlmIChjYWNoZWRWYWx1ZSAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLmhpdCsrO1xuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubWlzcysrO1xuICAgICAgICB2YXIgc3RyID0gKDAsX3V0aWxzX3V0ZjhfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18udXRmOERlY29kZUpzKShieXRlcywgaW5wdXRPZmZzZXQsIGJ5dGVMZW5ndGgpO1xuICAgICAgICAvLyBFbnN1cmUgdG8gY29weSBhIHNsaWNlIG9mIGJ5dGVzIGJlY2F1c2UgdGhlIGJ5dGUgbWF5IGJlIE5vZGVKUyBCdWZmZXIgYW5kIEJ1ZmZlciNzbGljZSgpIHJldHVybnMgYSByZWZlcmVuY2UgdG8gaXRzIGludGVybmFsIEFycmF5QnVmZmVyLlxuICAgICAgICB2YXIgc2xpY2VkQ29weU9mQnl0ZXMgPSBVaW50OEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGJ5dGVzLCBpbnB1dE9mZnNldCwgaW5wdXRPZmZzZXQgKyBieXRlTGVuZ3RoKTtcbiAgICAgICAgdGhpcy5zdG9yZShzbGljZWRDb3B5T2ZCeXRlcywgc3RyKTtcbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9O1xuICAgIHJldHVybiBDYWNoZWRLZXlEZWNvZGVyO1xufSgpKTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Q2FjaGVkS2V5RGVjb2Rlci5tanMubWFwXG5cbi8qKiovIH0pLFxuXG4vKioqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL0RlY29kZUVycm9yLm1qc1wiOlxuLyohKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiohKlxcXG4gICEqKiogLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vRGVjb2RlRXJyb3IubWpzICoqKiFcbiAgXFwqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qKiovICgoX191bnVzZWRfd2VicGFja19fX3dlYnBhY2tfbW9kdWxlX18sIF9fd2VicGFja19leHBvcnRzX18sIF9fd2VicGFja19yZXF1aXJlX18pID0+IHtcblxuX193ZWJwYWNrX3JlcXVpcmVfXy5yKF9fd2VicGFja19leHBvcnRzX18pO1xuLyogaGFybW9ueSBleHBvcnQgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIHtcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgRGVjb2RlRXJyb3I6ICgpID0+ICgvKiBiaW5kaW5nICovIERlY29kZUVycm9yKVxuLyogaGFybW9ueSBleHBvcnQgKi8gfSk7XG52YXIgX19leHRlbmRzID0gKHVuZGVmaW5lZCAmJiB1bmRlZmluZWQuX19leHRlbmRzKSB8fCAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24gKGQsIGIpIHtcbiAgICAgICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxuICAgICAgICAgICAgKHsgX19wcm90b19fOiBbXSB9IGluc3RhbmNlb2YgQXJyYXkgJiYgZnVuY3Rpb24gKGQsIGIpIHsgZC5fX3Byb3RvX18gPSBiOyB9KSB8fFxuICAgICAgICAgICAgZnVuY3Rpb24gKGQsIGIpIHsgZm9yICh2YXIgcCBpbiBiKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGIsIHApKSBkW3BdID0gYltwXTsgfTtcbiAgICAgICAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XG4gICAgfTtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGQsIGIpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBiICE9PSBcImZ1bmN0aW9uXCIgJiYgYiAhPT0gbnVsbClcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDbGFzcyBleHRlbmRzIHZhbHVlIFwiICsgU3RyaW5nKGIpICsgXCIgaXMgbm90IGEgY29uc3RydWN0b3Igb3IgbnVsbFwiKTtcbiAgICAgICAgZXh0ZW5kU3RhdGljcyhkLCBiKTtcbiAgICAgICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbiAgICB9O1xufSkoKTtcbnZhciBEZWNvZGVFcnJvciA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoRGVjb2RlRXJyb3IsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gRGVjb2RlRXJyb3IobWVzc2FnZSkge1xuICAgICAgICB2YXIgX3RoaXMgPSBfc3VwZXIuY2FsbCh0aGlzLCBtZXNzYWdlKSB8fCB0aGlzO1xuICAgICAgICAvLyBmaXggdGhlIHByb3RvdHlwZSBjaGFpbiBpbiBhIGNyb3NzLXBsYXRmb3JtIHdheVxuICAgICAgICB2YXIgcHJvdG8gPSBPYmplY3QuY3JlYXRlKERlY29kZUVycm9yLnByb3RvdHlwZSk7XG4gICAgICAgIE9iamVjdC5zZXRQcm90b3R5cGVPZihfdGhpcywgcHJvdG8pO1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoX3RoaXMsIFwibmFtZVwiLCB7XG4gICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHZhbHVlOiBEZWNvZGVFcnJvci5uYW1lLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIF90aGlzO1xuICAgIH1cbiAgICByZXR1cm4gRGVjb2RlRXJyb3I7XG59KEVycm9yKSk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPURlY29kZUVycm9yLm1qcy5tYXBcblxuLyoqKi8gfSksXG5cbi8qKiovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vRGVjb2Rlci5tanNcIjpcbi8qISoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiohKlxcXG4gICEqKiogLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vRGVjb2Rlci5tanMgKioqIVxuICBcXCoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKioqLyAoKF9fdW51c2VkX3dlYnBhY2tfX193ZWJwYWNrX21vZHVsZV9fLCBfX3dlYnBhY2tfZXhwb3J0c19fLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSA9PiB7XG5cbl9fd2VicGFja19yZXF1aXJlX18ucihfX3dlYnBhY2tfZXhwb3J0c19fKTtcbi8qIGhhcm1vbnkgZXhwb3J0ICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCB7XG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIERhdGFWaWV3SW5kZXhPdXRPZkJvdW5kc0Vycm9yOiAoKSA9PiAoLyogYmluZGluZyAqLyBEYXRhVmlld0luZGV4T3V0T2ZCb3VuZHNFcnJvciksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIERlY29kZXI6ICgpID0+ICgvKiBiaW5kaW5nICovIERlY29kZXIpXG4vKiBoYXJtb255IGV4cG9ydCAqLyB9KTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfdXRpbHNfcHJldHR5Qnl0ZV9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzRfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vdXRpbHMvcHJldHR5Qnl0ZS5tanMgKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS91dGlscy9wcmV0dHlCeXRlLm1qc1wiKTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfRXh0ZW5zaW9uQ29kZWNfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL0V4dGVuc2lvbkNvZGVjLm1qcyAqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL0V4dGVuc2lvbkNvZGVjLm1qc1wiKTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfdXRpbHNfaW50X21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgLi91dGlscy9pbnQubWpzICovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vdXRpbHMvaW50Lm1qc1wiKTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfdXRpbHNfdXRmOF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzZfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vdXRpbHMvdXRmOC5tanMgKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS91dGlscy91dGY4Lm1qc1wiKTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfdXRpbHNfdHlwZWRBcnJheXNfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8zX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL3V0aWxzL3R5cGVkQXJyYXlzLm1qcyAqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL3V0aWxzL3R5cGVkQXJyYXlzLm1qc1wiKTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfQ2FjaGVkS2V5RGVjb2Rlcl9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vQ2FjaGVkS2V5RGVjb2Rlci5tanMgKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS9DYWNoZWRLZXlEZWNvZGVyLm1qc1wiKTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfRGVjb2RlRXJyb3JfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV81X18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL0RlY29kZUVycm9yLm1qcyAqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL0RlY29kZUVycm9yLm1qc1wiKTtcbnZhciBfX2F3YWl0ZXIgPSAodW5kZWZpbmVkICYmIHVuZGVmaW5lZC5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICBmdW5jdGlvbiBhZG9wdCh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgaW5zdGFuY2VvZiBQID8gdmFsdWUgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHZhbHVlKTsgfSk7IH1cbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbnZhciBfX2dlbmVyYXRvciA9ICh1bmRlZmluZWQgJiYgdW5kZWZpbmVkLl9fZ2VuZXJhdG9yKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgYm9keSkge1xuICAgIHZhciBfID0geyBsYWJlbDogMCwgc2VudDogZnVuY3Rpb24oKSB7IGlmICh0WzBdICYgMSkgdGhyb3cgdFsxXTsgcmV0dXJuIHRbMV07IH0sIHRyeXM6IFtdLCBvcHM6IFtdIH0sIGYsIHksIHQsIGc7XG4gICAgcmV0dXJuIGcgPSB7IG5leHQ6IHZlcmIoMCksIFwidGhyb3dcIjogdmVyYigxKSwgXCJyZXR1cm5cIjogdmVyYigyKSB9LCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XG4gICAgZnVuY3Rpb24gc3RlcChvcCkge1xuICAgICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XG4gICAgICAgIHdoaWxlIChfKSB0cnkge1xuICAgICAgICAgICAgaWYgKGYgPSAxLCB5ICYmICh0ID0gb3BbMF0gJiAyID8geVtcInJldHVyblwiXSA6IG9wWzBdID8geVtcInRocm93XCJdIHx8ICgodCA9IHlbXCJyZXR1cm5cIl0pICYmIHQuY2FsbCh5KSwgMCkgOiB5Lm5leHQpICYmICEodCA9IHQuY2FsbCh5LCBvcFsxXSkpLmRvbmUpIHJldHVybiB0O1xuICAgICAgICAgICAgaWYgKHkgPSAwLCB0KSBvcCA9IFtvcFswXSAmIDIsIHQudmFsdWVdO1xuICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xuICAgICAgICAgICAgICAgIGNhc2UgMDogY2FzZSAxOiB0ID0gb3A7IGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNDogXy5sYWJlbCsrOyByZXR1cm4geyB2YWx1ZTogb3BbMV0sIGRvbmU6IGZhbHNlIH07XG4gICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGNhc2UgNzogb3AgPSBfLm9wcy5wb3AoKTsgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSAzICYmICghdCB8fCAob3BbMV0gPiB0WzBdICYmIG9wWzFdIDwgdFszXSkpKSB7IF8ubGFiZWwgPSBvcFsxXTsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSA2ICYmIF8ubGFiZWwgPCB0WzFdKSB7IF8ubGFiZWwgPSB0WzFdOyB0ID0gb3A7IGJyZWFrOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRbMl0pIF8ub3BzLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3AgPSBib2R5LmNhbGwodGhpc0FyZywgXyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHsgb3AgPSBbNiwgZV07IHkgPSAwOyB9IGZpbmFsbHkgeyBmID0gdCA9IDA7IH1cbiAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XG4gICAgfVxufTtcbnZhciBfX2FzeW5jVmFsdWVzID0gKHVuZGVmaW5lZCAmJiB1bmRlZmluZWQuX19hc3luY1ZhbHVlcykgfHwgZnVuY3Rpb24gKG8pIHtcbiAgICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xuICAgIHZhciBtID0gb1tTeW1ib2wuYXN5bmNJdGVyYXRvcl0sIGk7XG4gICAgcmV0dXJuIG0gPyBtLmNhbGwobykgOiAobyA9IHR5cGVvZiBfX3ZhbHVlcyA9PT0gXCJmdW5jdGlvblwiID8gX192YWx1ZXMobykgOiBvW1N5bWJvbC5pdGVyYXRvcl0oKSwgaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGkpO1xuICAgIGZ1bmN0aW9uIHZlcmIobikgeyBpW25dID0gb1tuXSAmJiBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkgeyB2ID0gb1tuXSh2KSwgc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgdi5kb25lLCB2LnZhbHVlKTsgfSk7IH07IH1cbiAgICBmdW5jdGlvbiBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCBkLCB2KSB7IFByb21pc2UucmVzb2x2ZSh2KS50aGVuKGZ1bmN0aW9uKHYpIHsgcmVzb2x2ZSh7IHZhbHVlOiB2LCBkb25lOiBkIH0pOyB9LCByZWplY3QpOyB9XG59O1xudmFyIF9fYXdhaXQgPSAodW5kZWZpbmVkICYmIHVuZGVmaW5lZC5fX2F3YWl0KSB8fCBmdW5jdGlvbiAodikgeyByZXR1cm4gdGhpcyBpbnN0YW5jZW9mIF9fYXdhaXQgPyAodGhpcy52ID0gdiwgdGhpcykgOiBuZXcgX19hd2FpdCh2KTsgfVxudmFyIF9fYXN5bmNHZW5lcmF0b3IgPSAodW5kZWZpbmVkICYmIHVuZGVmaW5lZC5fX2FzeW5jR2VuZXJhdG9yKSB8fCBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgZ2VuZXJhdG9yKSB7XG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcbiAgICB2YXIgZyA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSwgaSwgcSA9IFtdO1xuICAgIHJldHVybiBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaWYgKGdbbl0pIGlbbl0gPSBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKGEsIGIpIHsgcS5wdXNoKFtuLCB2LCBhLCBiXSkgPiAxIHx8IHJlc3VtZShuLCB2KTsgfSk7IH07IH1cbiAgICBmdW5jdGlvbiByZXN1bWUobiwgdikgeyB0cnkgeyBzdGVwKGdbbl0odikpOyB9IGNhdGNoIChlKSB7IHNldHRsZShxWzBdWzNdLCBlKTsgfSB9XG4gICAgZnVuY3Rpb24gc3RlcChyKSB7IHIudmFsdWUgaW5zdGFuY2VvZiBfX2F3YWl0ID8gUHJvbWlzZS5yZXNvbHZlKHIudmFsdWUudikudGhlbihmdWxmaWxsLCByZWplY3QpIDogc2V0dGxlKHFbMF1bMl0sIHIpOyB9XG4gICAgZnVuY3Rpb24gZnVsZmlsbCh2YWx1ZSkgeyByZXN1bWUoXCJuZXh0XCIsIHZhbHVlKTsgfVxuICAgIGZ1bmN0aW9uIHJlamVjdCh2YWx1ZSkgeyByZXN1bWUoXCJ0aHJvd1wiLCB2YWx1ZSk7IH1cbiAgICBmdW5jdGlvbiBzZXR0bGUoZiwgdikgeyBpZiAoZih2KSwgcS5zaGlmdCgpLCBxLmxlbmd0aCkgcmVzdW1lKHFbMF1bMF0sIHFbMF1bMV0pOyB9XG59O1xuXG5cblxuXG5cblxuXG52YXIgaXNWYWxpZE1hcEtleVR5cGUgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgdmFyIGtleVR5cGUgPSB0eXBlb2Yga2V5O1xuICAgIHJldHVybiBrZXlUeXBlID09PSBcInN0cmluZ1wiIHx8IGtleVR5cGUgPT09IFwibnVtYmVyXCI7XG59O1xudmFyIEhFQURfQllURV9SRVFVSVJFRCA9IC0xO1xudmFyIEVNUFRZX1ZJRVcgPSBuZXcgRGF0YVZpZXcobmV3IEFycmF5QnVmZmVyKDApKTtcbnZhciBFTVBUWV9CWVRFUyA9IG5ldyBVaW50OEFycmF5KEVNUFRZX1ZJRVcuYnVmZmVyKTtcbi8vIElFMTE6IEhhY2sgdG8gc3VwcG9ydCBJRTExLlxuLy8gSUUxMTogRHJvcCB0aGlzIGhhY2sgYW5kIGp1c3QgdXNlIFJhbmdlRXJyb3Igd2hlbiBJRTExIGlzIG9ic29sZXRlLlxudmFyIERhdGFWaWV3SW5kZXhPdXRPZkJvdW5kc0Vycm9yID0gKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICAvLyBJRTExOiBUaGUgc3BlYyBzYXlzIGl0IHNob3VsZCB0aHJvdyBSYW5nZUVycm9yLFxuICAgICAgICAvLyBJRTExOiBidXQgaW4gSUUxMSBpdCB0aHJvd3MgVHlwZUVycm9yLlxuICAgICAgICBFTVBUWV9WSUVXLmdldEludDgoMCk7XG4gICAgfVxuICAgIGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBlLmNvbnN0cnVjdG9yO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJuZXZlciByZWFjaGVkXCIpO1xufSkoKTtcbnZhciBNT1JFX0RBVEEgPSBuZXcgRGF0YVZpZXdJbmRleE91dE9mQm91bmRzRXJyb3IoXCJJbnN1ZmZpY2llbnQgZGF0YVwiKTtcbnZhciBzaGFyZWRDYWNoZWRLZXlEZWNvZGVyID0gbmV3IF9DYWNoZWRLZXlEZWNvZGVyX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLkNhY2hlZEtleURlY29kZXIoKTtcbnZhciBEZWNvZGVyID0gLyoqIEBjbGFzcyAqLyAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIERlY29kZXIoZXh0ZW5zaW9uQ29kZWMsIGNvbnRleHQsIG1heFN0ckxlbmd0aCwgbWF4QmluTGVuZ3RoLCBtYXhBcnJheUxlbmd0aCwgbWF4TWFwTGVuZ3RoLCBtYXhFeHRMZW5ndGgsIGtleURlY29kZXIpIHtcbiAgICAgICAgaWYgKGV4dGVuc2lvbkNvZGVjID09PSB2b2lkIDApIHsgZXh0ZW5zaW9uQ29kZWMgPSBfRXh0ZW5zaW9uQ29kZWNfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18uRXh0ZW5zaW9uQ29kZWMuZGVmYXVsdENvZGVjOyB9XG4gICAgICAgIGlmIChjb250ZXh0ID09PSB2b2lkIDApIHsgY29udGV4dCA9IHVuZGVmaW5lZDsgfVxuICAgICAgICBpZiAobWF4U3RyTGVuZ3RoID09PSB2b2lkIDApIHsgbWF4U3RyTGVuZ3RoID0gX3V0aWxzX2ludF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXy5VSU5UMzJfTUFYOyB9XG4gICAgICAgIGlmIChtYXhCaW5MZW5ndGggPT09IHZvaWQgMCkgeyBtYXhCaW5MZW5ndGggPSBfdXRpbHNfaW50X21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLlVJTlQzMl9NQVg7IH1cbiAgICAgICAgaWYgKG1heEFycmF5TGVuZ3RoID09PSB2b2lkIDApIHsgbWF4QXJyYXlMZW5ndGggPSBfdXRpbHNfaW50X21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLlVJTlQzMl9NQVg7IH1cbiAgICAgICAgaWYgKG1heE1hcExlbmd0aCA9PT0gdm9pZCAwKSB7IG1heE1hcExlbmd0aCA9IF91dGlsc19pbnRfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18uVUlOVDMyX01BWDsgfVxuICAgICAgICBpZiAobWF4RXh0TGVuZ3RoID09PSB2b2lkIDApIHsgbWF4RXh0TGVuZ3RoID0gX3V0aWxzX2ludF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXy5VSU5UMzJfTUFYOyB9XG4gICAgICAgIGlmIChrZXlEZWNvZGVyID09PSB2b2lkIDApIHsga2V5RGVjb2RlciA9IHNoYXJlZENhY2hlZEtleURlY29kZXI7IH1cbiAgICAgICAgdGhpcy5leHRlbnNpb25Db2RlYyA9IGV4dGVuc2lvbkNvZGVjO1xuICAgICAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICB0aGlzLm1heFN0ckxlbmd0aCA9IG1heFN0ckxlbmd0aDtcbiAgICAgICAgdGhpcy5tYXhCaW5MZW5ndGggPSBtYXhCaW5MZW5ndGg7XG4gICAgICAgIHRoaXMubWF4QXJyYXlMZW5ndGggPSBtYXhBcnJheUxlbmd0aDtcbiAgICAgICAgdGhpcy5tYXhNYXBMZW5ndGggPSBtYXhNYXBMZW5ndGg7XG4gICAgICAgIHRoaXMubWF4RXh0TGVuZ3RoID0gbWF4RXh0TGVuZ3RoO1xuICAgICAgICB0aGlzLmtleURlY29kZXIgPSBrZXlEZWNvZGVyO1xuICAgICAgICB0aGlzLnRvdGFsUG9zID0gMDtcbiAgICAgICAgdGhpcy5wb3MgPSAwO1xuICAgICAgICB0aGlzLnZpZXcgPSBFTVBUWV9WSUVXO1xuICAgICAgICB0aGlzLmJ5dGVzID0gRU1QVFlfQllURVM7XG4gICAgICAgIHRoaXMuaGVhZEJ5dGUgPSBIRUFEX0JZVEVfUkVRVUlSRUQ7XG4gICAgICAgIHRoaXMuc3RhY2sgPSBbXTtcbiAgICB9XG4gICAgRGVjb2Rlci5wcm90b3R5cGUucmVpbml0aWFsaXplU3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMudG90YWxQb3MgPSAwO1xuICAgICAgICB0aGlzLmhlYWRCeXRlID0gSEVBRF9CWVRFX1JFUVVJUkVEO1xuICAgICAgICB0aGlzLnN0YWNrLmxlbmd0aCA9IDA7XG4gICAgICAgIC8vIHZpZXcsIGJ5dGVzLCBhbmQgcG9zIHdpbGwgYmUgcmUtaW5pdGlhbGl6ZWQgaW4gc2V0QnVmZmVyKClcbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLnNldEJ1ZmZlciA9IGZ1bmN0aW9uIChidWZmZXIpIHtcbiAgICAgICAgdGhpcy5ieXRlcyA9ICgwLF91dGlsc190eXBlZEFycmF5c19tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzNfXy5lbnN1cmVVaW50OEFycmF5KShidWZmZXIpO1xuICAgICAgICB0aGlzLnZpZXcgPSAoMCxfdXRpbHNfdHlwZWRBcnJheXNfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8zX18uY3JlYXRlRGF0YVZpZXcpKHRoaXMuYnl0ZXMpO1xuICAgICAgICB0aGlzLnBvcyA9IDA7XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5hcHBlbmRCdWZmZXIgPSBmdW5jdGlvbiAoYnVmZmVyKSB7XG4gICAgICAgIGlmICh0aGlzLmhlYWRCeXRlID09PSBIRUFEX0JZVEVfUkVRVUlSRUQgJiYgIXRoaXMuaGFzUmVtYWluaW5nKDEpKSB7XG4gICAgICAgICAgICB0aGlzLnNldEJ1ZmZlcihidWZmZXIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIHJlbWFpbmluZ0RhdGEgPSB0aGlzLmJ5dGVzLnN1YmFycmF5KHRoaXMucG9zKTtcbiAgICAgICAgICAgIHZhciBuZXdEYXRhID0gKDAsX3V0aWxzX3R5cGVkQXJyYXlzX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfM19fLmVuc3VyZVVpbnQ4QXJyYXkpKGJ1ZmZlcik7XG4gICAgICAgICAgICAvLyBjb25jYXQgcmVtYWluaW5nRGF0YSArIG5ld0RhdGFcbiAgICAgICAgICAgIHZhciBuZXdCdWZmZXIgPSBuZXcgVWludDhBcnJheShyZW1haW5pbmdEYXRhLmxlbmd0aCArIG5ld0RhdGEubGVuZ3RoKTtcbiAgICAgICAgICAgIG5ld0J1ZmZlci5zZXQocmVtYWluaW5nRGF0YSk7XG4gICAgICAgICAgICBuZXdCdWZmZXIuc2V0KG5ld0RhdGEsIHJlbWFpbmluZ0RhdGEubGVuZ3RoKTtcbiAgICAgICAgICAgIHRoaXMuc2V0QnVmZmVyKG5ld0J1ZmZlcik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLmhhc1JlbWFpbmluZyA9IGZ1bmN0aW9uIChzaXplKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXcuYnl0ZUxlbmd0aCAtIHRoaXMucG9zID49IHNpemU7XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5jcmVhdGVFeHRyYUJ5dGVFcnJvciA9IGZ1bmN0aW9uIChwb3NUb1Nob3cpIHtcbiAgICAgICAgdmFyIF9hID0gdGhpcywgdmlldyA9IF9hLnZpZXcsIHBvcyA9IF9hLnBvcztcbiAgICAgICAgcmV0dXJuIG5ldyBSYW5nZUVycm9yKFwiRXh0cmEgXCIuY29uY2F0KHZpZXcuYnl0ZUxlbmd0aCAtIHBvcywgXCIgb2YgXCIpLmNvbmNhdCh2aWV3LmJ5dGVMZW5ndGgsIFwiIGJ5dGUocykgZm91bmQgYXQgYnVmZmVyW1wiKS5jb25jYXQocG9zVG9TaG93LCBcIl1cIikpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQHRocm93cyB7QGxpbmsgRGVjb2RlRXJyb3J9XG4gICAgICogQHRocm93cyB7QGxpbmsgUmFuZ2VFcnJvcn1cbiAgICAgKi9cbiAgICBEZWNvZGVyLnByb3RvdHlwZS5kZWNvZGUgPSBmdW5jdGlvbiAoYnVmZmVyKSB7XG4gICAgICAgIHRoaXMucmVpbml0aWFsaXplU3RhdGUoKTtcbiAgICAgICAgdGhpcy5zZXRCdWZmZXIoYnVmZmVyKTtcbiAgICAgICAgdmFyIG9iamVjdCA9IHRoaXMuZG9EZWNvZGVTeW5jKCk7XG4gICAgICAgIGlmICh0aGlzLmhhc1JlbWFpbmluZygxKSkge1xuICAgICAgICAgICAgdGhyb3cgdGhpcy5jcmVhdGVFeHRyYUJ5dGVFcnJvcih0aGlzLnBvcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLmRlY29kZU11bHRpID0gZnVuY3Rpb24gKGJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gX19nZW5lcmF0b3IodGhpcywgZnVuY3Rpb24gKF9hKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKF9hLmxhYmVsKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlaW5pdGlhbGl6ZVN0YXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QnVmZmVyKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgICAgIF9hLmxhYmVsID0gMTtcbiAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5oYXNSZW1haW5pbmcoMSkpIHJldHVybiBbMyAvKmJyZWFrKi8sIDNdO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzQgLyp5aWVsZCovLCB0aGlzLmRvRGVjb2RlU3luYygpXTtcbiAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgIF9hLnNlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFszIC8qYnJlYWsqLywgMV07XG4gICAgICAgICAgICAgICAgY2FzZSAzOiByZXR1cm4gWzIgLypyZXR1cm4qL107XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUuZGVjb2RlQXN5bmMgPSBmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgICAgIHZhciBzdHJlYW1fMSwgc3RyZWFtXzFfMTtcbiAgICAgICAgdmFyIGVfMSwgX2E7XG4gICAgICAgIHJldHVybiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBkZWNvZGVkLCBvYmplY3QsIGJ1ZmZlciwgZV8xXzEsIF9iLCBoZWFkQnl0ZSwgcG9zLCB0b3RhbFBvcztcbiAgICAgICAgICAgIHJldHVybiBfX2dlbmVyYXRvcih0aGlzLCBmdW5jdGlvbiAoX2MpIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKF9jLmxhYmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlY29kZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9jLmxhYmVsID0gMTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICAgICAgX2MudHJ5cy5wdXNoKFsxLCA2LCA3LCAxMl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyZWFtXzEgPSBfX2FzeW5jVmFsdWVzKHN0cmVhbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBfYy5sYWJlbCA9IDI7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMjogcmV0dXJuIFs0IC8qeWllbGQqLywgc3RyZWFtXzEubmV4dCgpXTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEoc3RyZWFtXzFfMSA9IF9jLnNlbnQoKSwgIXN0cmVhbV8xXzEuZG9uZSkpIHJldHVybiBbMyAvKmJyZWFrKi8sIDVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gc3RyZWFtXzFfMS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZWNvZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgdGhpcy5jcmVhdGVFeHRyYUJ5dGVFcnJvcih0aGlzLnRvdGFsUG9zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYXBwZW5kQnVmZmVyKGJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdCA9IHRoaXMuZG9EZWNvZGVTeW5jKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVjb2RlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghKGUgaW5zdGFuY2VvZiBEYXRhVmlld0luZGV4T3V0T2ZCb3VuZHNFcnJvcikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgZTsgLy8gcmV0aHJvd1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBmYWxsdGhyb3VnaFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b3RhbFBvcyArPSB0aGlzLnBvcztcbiAgICAgICAgICAgICAgICAgICAgICAgIF9jLmxhYmVsID0gNDtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0OiByZXR1cm4gWzMgLypicmVhayovLCAyXTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1OiByZXR1cm4gWzMgLypicmVhayovLCAxMl07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGVfMV8xID0gX2Muc2VudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZV8xID0geyBlcnJvcjogZV8xXzEgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbMyAvKmJyZWFrKi8sIDEyXTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA3OlxuICAgICAgICAgICAgICAgICAgICAgICAgX2MudHJ5cy5wdXNoKFs3LCAsIDEwLCAxMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEoc3RyZWFtXzFfMSAmJiAhc3RyZWFtXzFfMS5kb25lICYmIChfYSA9IHN0cmVhbV8xLnJldHVybikpKSByZXR1cm4gWzMgLypicmVhayovLCA5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbNCAvKnlpZWxkKi8sIF9hLmNhbGwoc3RyZWFtXzEpXTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA4OlxuICAgICAgICAgICAgICAgICAgICAgICAgX2Muc2VudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgX2MubGFiZWwgPSA5O1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDk6IHJldHVybiBbMyAvKmJyZWFrKi8sIDExXTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxMDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlXzEpIHRocm93IGVfMS5lcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbNyAvKmVuZGZpbmFsbHkqL107XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTE6IHJldHVybiBbNyAvKmVuZGZpbmFsbHkqL107XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTI6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGVjb2RlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmhhc1JlbWFpbmluZygxKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyB0aGlzLmNyZWF0ZUV4dHJhQnl0ZUVycm9yKHRoaXMudG90YWxQb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzIgLypyZXR1cm4qLywgb2JqZWN0XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF9iID0gdGhpcywgaGVhZEJ5dGUgPSBfYi5oZWFkQnl0ZSwgcG9zID0gX2IucG9zLCB0b3RhbFBvcyA9IF9iLnRvdGFsUG9zO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoXCJJbnN1ZmZpY2llbnQgZGF0YSBpbiBwYXJzaW5nIFwiLmNvbmNhdCgoMCxfdXRpbHNfcHJldHR5Qnl0ZV9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzRfXy5wcmV0dHlCeXRlKShoZWFkQnl0ZSksIFwiIGF0IFwiKS5jb25jYXQodG90YWxQb3MsIFwiIChcIikuY29uY2F0KHBvcywgXCIgaW4gdGhlIGN1cnJlbnQgYnVmZmVyKVwiKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUuZGVjb2RlQXJyYXlTdHJlYW0gPSBmdW5jdGlvbiAoc3RyZWFtKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRlY29kZU11bHRpQXN5bmMoc3RyZWFtLCB0cnVlKTtcbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLmRlY29kZVN0cmVhbSA9IGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGVjb2RlTXVsdGlBc3luYyhzdHJlYW0sIGZhbHNlKTtcbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLmRlY29kZU11bHRpQXN5bmMgPSBmdW5jdGlvbiAoc3RyZWFtLCBpc0FycmF5KSB7XG4gICAgICAgIHJldHVybiBfX2FzeW5jR2VuZXJhdG9yKHRoaXMsIGFyZ3VtZW50cywgZnVuY3Rpb24gZGVjb2RlTXVsdGlBc3luY18xKCkge1xuICAgICAgICAgICAgdmFyIGlzQXJyYXlIZWFkZXJSZXF1aXJlZCwgYXJyYXlJdGVtc0xlZnQsIHN0cmVhbV8yLCBzdHJlYW1fMl8xLCBidWZmZXIsIGVfMiwgZV8zXzE7XG4gICAgICAgICAgICB2YXIgZV8zLCBfYTtcbiAgICAgICAgICAgIHJldHVybiBfX2dlbmVyYXRvcih0aGlzLCBmdW5jdGlvbiAoX2IpIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKF9iLmxhYmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzQXJyYXlIZWFkZXJSZXF1aXJlZCA9IGlzQXJyYXk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcnJheUl0ZW1zTGVmdCA9IC0xO1xuICAgICAgICAgICAgICAgICAgICAgICAgX2IubGFiZWwgPSAxO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgICAgICBfYi50cnlzLnB1c2goWzEsIDEzLCAxNCwgMTldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmVhbV8yID0gX19hc3luY1ZhbHVlcyhzdHJlYW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgX2IubGFiZWwgPSAyO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDI6IHJldHVybiBbNCAvKnlpZWxkKi8sIF9fYXdhaXQoc3RyZWFtXzIubmV4dCgpKV07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghKHN0cmVhbV8yXzEgPSBfYi5zZW50KCksICFzdHJlYW1fMl8xLmRvbmUpKSByZXR1cm4gWzMgLypicmVhayovLCAxMl07XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSBzdHJlYW1fMl8xLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQXJyYXkgJiYgYXJyYXlJdGVtc0xlZnQgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyB0aGlzLmNyZWF0ZUV4dHJhQnl0ZUVycm9yKHRoaXMudG90YWxQb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRCdWZmZXIoYnVmZmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0FycmF5SGVhZGVyUmVxdWlyZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcnJheUl0ZW1zTGVmdCA9IHRoaXMucmVhZEFycmF5U2l6ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQXJyYXlIZWFkZXJSZXF1aXJlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29tcGxldGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF9iLmxhYmVsID0gNDtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgICAgICAgICAgICAgX2IudHJ5cy5wdXNoKFs0LCA5LCAsIDEwXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBfYi5sYWJlbCA9IDU7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNTpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmYWxzZSkge31cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbNCAvKnlpZWxkKi8sIF9fYXdhaXQodGhpcy5kb0RlY29kZVN5bmMoKSldO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDY6IHJldHVybiBbNCAvKnlpZWxkKi8sIF9iLnNlbnQoKV07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNzpcbiAgICAgICAgICAgICAgICAgICAgICAgIF9iLnNlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgtLWFycmF5SXRlbXNMZWZ0ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFszIC8qYnJlYWsqLywgOF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzMgLypicmVhayovLCA1XTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA4OiByZXR1cm4gWzMgLypicmVhayovLCAxMF07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgOTpcbiAgICAgICAgICAgICAgICAgICAgICAgIGVfMiA9IF9iLnNlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghKGVfMiBpbnN0YW5jZW9mIERhdGFWaWV3SW5kZXhPdXRPZkJvdW5kc0Vycm9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGVfMjsgLy8gcmV0aHJvd1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFszIC8qYnJlYWsqLywgMTBdO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDEwOlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b3RhbFBvcyArPSB0aGlzLnBvcztcbiAgICAgICAgICAgICAgICAgICAgICAgIF9iLmxhYmVsID0gMTE7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTE6IHJldHVybiBbMyAvKmJyZWFrKi8sIDJdO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDEyOiByZXR1cm4gWzMgLypicmVhayovLCAxOV07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTM6XG4gICAgICAgICAgICAgICAgICAgICAgICBlXzNfMSA9IF9iLnNlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVfMyA9IHsgZXJyb3I6IGVfM18xIH07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzMgLypicmVhayovLCAxOV07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBfYi50cnlzLnB1c2goWzE0LCAsIDE3LCAxOF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEoc3RyZWFtXzJfMSAmJiAhc3RyZWFtXzJfMS5kb25lICYmIChfYSA9IHN0cmVhbV8yLnJldHVybikpKSByZXR1cm4gWzMgLypicmVhayovLCAxNl07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzQgLyp5aWVsZCovLCBfX2F3YWl0KF9hLmNhbGwoc3RyZWFtXzIpKV07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTU6XG4gICAgICAgICAgICAgICAgICAgICAgICBfYi5zZW50KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBfYi5sYWJlbCA9IDE2O1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDE2OiByZXR1cm4gWzMgLypicmVhayovLCAxOF07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZV8zKSB0aHJvdyBlXzMuZXJyb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzcgLyplbmRmaW5hbGx5Ki9dO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDE4OiByZXR1cm4gWzcgLyplbmRmaW5hbGx5Ki9dO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDE5OiByZXR1cm4gWzIgLypyZXR1cm4qL107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUuZG9EZWNvZGVTeW5jID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBERUNPREU6IHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICB2YXIgaGVhZEJ5dGUgPSB0aGlzLnJlYWRIZWFkQnl0ZSgpO1xuICAgICAgICAgICAgdmFyIG9iamVjdCA9IHZvaWQgMDtcbiAgICAgICAgICAgIGlmIChoZWFkQnl0ZSA+PSAweGUwKSB7XG4gICAgICAgICAgICAgICAgLy8gbmVnYXRpdmUgZml4aW50ICgxMTF4IHh4eHgpIDB4ZTAgLSAweGZmXG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gaGVhZEJ5dGUgLSAweDEwMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlIDwgMHhjMCkge1xuICAgICAgICAgICAgICAgIGlmIChoZWFkQnl0ZSA8IDB4ODApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcG9zaXRpdmUgZml4aW50ICgweHh4IHh4eHgpIDB4MDAgLSAweDdmXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdCA9IGhlYWRCeXRlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA8IDB4OTApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZml4bWFwICgxMDAwIHh4eHgpIDB4ODAgLSAweDhmXG4gICAgICAgICAgICAgICAgICAgIHZhciBzaXplID0gaGVhZEJ5dGUgLSAweDgwO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2l6ZSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoTWFwU3RhdGUoc2l6ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZSBERUNPREU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA8IDB4YTApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZml4YXJyYXkgKDEwMDEgeHh4eCkgMHg5MCAtIDB4OWZcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNpemUgPSBoZWFkQnl0ZSAtIDB4OTA7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzaXplICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hBcnJheVN0YXRlKHNpemUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWUgREVDT0RFO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0ID0gW107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGZpeHN0ciAoMTAxeCB4eHh4KSAweGEwIC0gMHhiZlxuICAgICAgICAgICAgICAgICAgICB2YXIgYnl0ZUxlbmd0aCA9IGhlYWRCeXRlIC0gMHhhMDtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5kZWNvZGVVdGY4U3RyaW5nKGJ5dGVMZW5ndGgsIDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlID09PSAweGMwKSB7XG4gICAgICAgICAgICAgICAgLy8gbmlsXG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlID09PSAweGMyKSB7XG4gICAgICAgICAgICAgICAgLy8gZmFsc2VcbiAgICAgICAgICAgICAgICBvYmplY3QgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlID09PSAweGMzKSB7XG4gICAgICAgICAgICAgICAgLy8gdHJ1ZVxuICAgICAgICAgICAgICAgIG9iamVjdCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhjYSkge1xuICAgICAgICAgICAgICAgIC8vIGZsb2F0IDMyXG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5yZWFkRjMyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhjYikge1xuICAgICAgICAgICAgICAgIC8vIGZsb2F0IDY0XG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5yZWFkRjY0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhjYykge1xuICAgICAgICAgICAgICAgIC8vIHVpbnQgOFxuICAgICAgICAgICAgICAgIG9iamVjdCA9IHRoaXMucmVhZFU4KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhjZCkge1xuICAgICAgICAgICAgICAgIC8vIHVpbnQgMTZcbiAgICAgICAgICAgICAgICBvYmplY3QgPSB0aGlzLnJlYWRVMTYoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlID09PSAweGNlKSB7XG4gICAgICAgICAgICAgICAgLy8gdWludCAzMlxuICAgICAgICAgICAgICAgIG9iamVjdCA9IHRoaXMucmVhZFUzMigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4Y2YpIHtcbiAgICAgICAgICAgICAgICAvLyB1aW50IDY0XG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5yZWFkVTY0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhkMCkge1xuICAgICAgICAgICAgICAgIC8vIGludCA4XG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5yZWFkSTgoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlID09PSAweGQxKSB7XG4gICAgICAgICAgICAgICAgLy8gaW50IDE2XG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5yZWFkSTE2KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhkMikge1xuICAgICAgICAgICAgICAgIC8vIGludCAzMlxuICAgICAgICAgICAgICAgIG9iamVjdCA9IHRoaXMucmVhZEkzMigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4ZDMpIHtcbiAgICAgICAgICAgICAgICAvLyBpbnQgNjRcbiAgICAgICAgICAgICAgICBvYmplY3QgPSB0aGlzLnJlYWRJNjQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlID09PSAweGQ5KSB7XG4gICAgICAgICAgICAgICAgLy8gc3RyIDhcbiAgICAgICAgICAgICAgICB2YXIgYnl0ZUxlbmd0aCA9IHRoaXMubG9va1U4KCk7XG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5kZWNvZGVVdGY4U3RyaW5nKGJ5dGVMZW5ndGgsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4ZGEpIHtcbiAgICAgICAgICAgICAgICAvLyBzdHIgMTZcbiAgICAgICAgICAgICAgICB2YXIgYnl0ZUxlbmd0aCA9IHRoaXMubG9va1UxNigpO1xuICAgICAgICAgICAgICAgIG9iamVjdCA9IHRoaXMuZGVjb2RlVXRmOFN0cmluZyhieXRlTGVuZ3RoLCAyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlID09PSAweGRiKSB7XG4gICAgICAgICAgICAgICAgLy8gc3RyIDMyXG4gICAgICAgICAgICAgICAgdmFyIGJ5dGVMZW5ndGggPSB0aGlzLmxvb2tVMzIoKTtcbiAgICAgICAgICAgICAgICBvYmplY3QgPSB0aGlzLmRlY29kZVV0ZjhTdHJpbmcoYnl0ZUxlbmd0aCwgNCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhkYykge1xuICAgICAgICAgICAgICAgIC8vIGFycmF5IDE2XG4gICAgICAgICAgICAgICAgdmFyIHNpemUgPSB0aGlzLnJlYWRVMTYoKTtcbiAgICAgICAgICAgICAgICBpZiAoc2l6ZSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hBcnJheVN0YXRlKHNpemUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIERFQ09ERTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdCA9IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlID09PSAweGRkKSB7XG4gICAgICAgICAgICAgICAgLy8gYXJyYXkgMzJcbiAgICAgICAgICAgICAgICB2YXIgc2l6ZSA9IHRoaXMucmVhZFUzMigpO1xuICAgICAgICAgICAgICAgIGlmIChzaXplICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEFycmF5U3RhdGUoc2l6ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29tcGxldGUoKTtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWUgREVDT0RFO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0ID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4ZGUpIHtcbiAgICAgICAgICAgICAgICAvLyBtYXAgMTZcbiAgICAgICAgICAgICAgICB2YXIgc2l6ZSA9IHRoaXMucmVhZFUxNigpO1xuICAgICAgICAgICAgICAgIGlmIChzaXplICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaE1hcFN0YXRlKHNpemUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIERFQ09ERTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdCA9IHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlID09PSAweGRmKSB7XG4gICAgICAgICAgICAgICAgLy8gbWFwIDMyXG4gICAgICAgICAgICAgICAgdmFyIHNpemUgPSB0aGlzLnJlYWRVMzIoKTtcbiAgICAgICAgICAgICAgICBpZiAoc2l6ZSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hNYXBTdGF0ZShzaXplKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZSBERUNPREU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvYmplY3QgPSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhjNCkge1xuICAgICAgICAgICAgICAgIC8vIGJpbiA4XG4gICAgICAgICAgICAgICAgdmFyIHNpemUgPSB0aGlzLmxvb2tVOCgpO1xuICAgICAgICAgICAgICAgIG9iamVjdCA9IHRoaXMuZGVjb2RlQmluYXJ5KHNpemUsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4YzUpIHtcbiAgICAgICAgICAgICAgICAvLyBiaW4gMTZcbiAgICAgICAgICAgICAgICB2YXIgc2l6ZSA9IHRoaXMubG9va1UxNigpO1xuICAgICAgICAgICAgICAgIG9iamVjdCA9IHRoaXMuZGVjb2RlQmluYXJ5KHNpemUsIDIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4YzYpIHtcbiAgICAgICAgICAgICAgICAvLyBiaW4gMzJcbiAgICAgICAgICAgICAgICB2YXIgc2l6ZSA9IHRoaXMubG9va1UzMigpO1xuICAgICAgICAgICAgICAgIG9iamVjdCA9IHRoaXMuZGVjb2RlQmluYXJ5KHNpemUsIDQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4ZDQpIHtcbiAgICAgICAgICAgICAgICAvLyBmaXhleHQgMVxuICAgICAgICAgICAgICAgIG9iamVjdCA9IHRoaXMuZGVjb2RlRXh0ZW5zaW9uKDEsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4ZDUpIHtcbiAgICAgICAgICAgICAgICAvLyBmaXhleHQgMlxuICAgICAgICAgICAgICAgIG9iamVjdCA9IHRoaXMuZGVjb2RlRXh0ZW5zaW9uKDIsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4ZDYpIHtcbiAgICAgICAgICAgICAgICAvLyBmaXhleHQgNFxuICAgICAgICAgICAgICAgIG9iamVjdCA9IHRoaXMuZGVjb2RlRXh0ZW5zaW9uKDQsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4ZDcpIHtcbiAgICAgICAgICAgICAgICAvLyBmaXhleHQgOFxuICAgICAgICAgICAgICAgIG9iamVjdCA9IHRoaXMuZGVjb2RlRXh0ZW5zaW9uKDgsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4ZDgpIHtcbiAgICAgICAgICAgICAgICAvLyBmaXhleHQgMTZcbiAgICAgICAgICAgICAgICBvYmplY3QgPSB0aGlzLmRlY29kZUV4dGVuc2lvbigxNiwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhjNykge1xuICAgICAgICAgICAgICAgIC8vIGV4dCA4XG4gICAgICAgICAgICAgICAgdmFyIHNpemUgPSB0aGlzLmxvb2tVOCgpO1xuICAgICAgICAgICAgICAgIG9iamVjdCA9IHRoaXMuZGVjb2RlRXh0ZW5zaW9uKHNpemUsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4YzgpIHtcbiAgICAgICAgICAgICAgICAvLyBleHQgMTZcbiAgICAgICAgICAgICAgICB2YXIgc2l6ZSA9IHRoaXMubG9va1UxNigpO1xuICAgICAgICAgICAgICAgIG9iamVjdCA9IHRoaXMuZGVjb2RlRXh0ZW5zaW9uKHNpemUsIDIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4YzkpIHtcbiAgICAgICAgICAgICAgICAvLyBleHQgMzJcbiAgICAgICAgICAgICAgICB2YXIgc2l6ZSA9IHRoaXMubG9va1UzMigpO1xuICAgICAgICAgICAgICAgIG9iamVjdCA9IHRoaXMuZGVjb2RlRXh0ZW5zaW9uKHNpemUsIDQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IF9EZWNvZGVFcnJvcl9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzVfXy5EZWNvZGVFcnJvcihcIlVucmVjb2duaXplZCB0eXBlIGJ5dGU6IFwiLmNvbmNhdCgoMCxfdXRpbHNfcHJldHR5Qnl0ZV9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzRfXy5wcmV0dHlCeXRlKShoZWFkQnl0ZSkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY29tcGxldGUoKTtcbiAgICAgICAgICAgIHZhciBzdGFjayA9IHRoaXMuc3RhY2s7XG4gICAgICAgICAgICB3aGlsZSAoc3RhY2subGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIGFycmF5cyBhbmQgbWFwc1xuICAgICAgICAgICAgICAgIHZhciBzdGF0ZSA9IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgIGlmIChzdGF0ZS50eXBlID09PSAwIC8qIFN0YXRlLkFSUkFZICovKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLmFycmF5W3N0YXRlLnBvc2l0aW9uXSA9IG9iamVjdDtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUucG9zaXRpb24rKztcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXRlLnBvc2l0aW9uID09PSBzdGF0ZS5zaXplKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFjay5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdCA9IHN0YXRlLmFycmF5O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWUgREVDT0RFO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHN0YXRlLnR5cGUgPT09IDEgLyogU3RhdGUuTUFQX0tFWSAqLykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWlzVmFsaWRNYXBLZXlUeXBlKG9iamVjdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBfRGVjb2RlRXJyb3JfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV81X18uRGVjb2RlRXJyb3IoXCJUaGUgdHlwZSBvZiBrZXkgbXVzdCBiZSBzdHJpbmcgb3IgbnVtYmVyIGJ1dCBcIiArIHR5cGVvZiBvYmplY3QpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChvYmplY3QgPT09IFwiX19wcm90b19fXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBfRGVjb2RlRXJyb3JfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV81X18uRGVjb2RlRXJyb3IoXCJUaGUga2V5IF9fcHJvdG9fXyBpcyBub3QgYWxsb3dlZFwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5rZXkgPSBvYmplY3Q7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLnR5cGUgPSAyIC8qIFN0YXRlLk1BUF9WQUxVRSAqLztcbiAgICAgICAgICAgICAgICAgICAgY29udGludWUgREVDT0RFO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaXQgbXVzdCBiZSBgc3RhdGUudHlwZSA9PT0gU3RhdGUuTUFQX1ZBTFVFYCBoZXJlXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLm1hcFtzdGF0ZS5rZXldID0gb2JqZWN0O1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5yZWFkQ291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXRlLnJlYWRDb3VudCA9PT0gc3RhdGUuc2l6ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhY2sucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QgPSBzdGF0ZS5tYXA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5rZXkgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUudHlwZSA9IDEgLyogU3RhdGUuTUFQX0tFWSAqLztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIERFQ09ERTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLnJlYWRIZWFkQnl0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuaGVhZEJ5dGUgPT09IEhFQURfQllURV9SRVFVSVJFRCkge1xuICAgICAgICAgICAgdGhpcy5oZWFkQnl0ZSA9IHRoaXMucmVhZFU4KCk7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImhlYWRCeXRlXCIsIHByZXR0eUJ5dGUodGhpcy5oZWFkQnl0ZSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmhlYWRCeXRlO1xuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUuY29tcGxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuaGVhZEJ5dGUgPSBIRUFEX0JZVEVfUkVRVUlSRUQ7XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5yZWFkQXJyYXlTaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaGVhZEJ5dGUgPSB0aGlzLnJlYWRIZWFkQnl0ZSgpO1xuICAgICAgICBzd2l0Y2ggKGhlYWRCeXRlKSB7XG4gICAgICAgICAgICBjYXNlIDB4ZGM6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVhZFUxNigpO1xuICAgICAgICAgICAgY2FzZSAweGRkOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJlYWRVMzIoKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgICAgICAgICBpZiAoaGVhZEJ5dGUgPCAweGEwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBoZWFkQnl0ZSAtIDB4OTA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgX0RlY29kZUVycm9yX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfNV9fLkRlY29kZUVycm9yKFwiVW5yZWNvZ25pemVkIGFycmF5IHR5cGUgYnl0ZTogXCIuY29uY2F0KCgwLF91dGlsc19wcmV0dHlCeXRlX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfNF9fLnByZXR0eUJ5dGUpKGhlYWRCeXRlKSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUucHVzaE1hcFN0YXRlID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgICAgICAgaWYgKHNpemUgPiB0aGlzLm1heE1hcExlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IF9EZWNvZGVFcnJvcl9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzVfXy5EZWNvZGVFcnJvcihcIk1heCBsZW5ndGggZXhjZWVkZWQ6IG1hcCBsZW5ndGggKFwiLmNvbmNhdChzaXplLCBcIikgPiBtYXhNYXBMZW5ndGhMZW5ndGggKFwiKS5jb25jYXQodGhpcy5tYXhNYXBMZW5ndGgsIFwiKVwiKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zdGFjay5wdXNoKHtcbiAgICAgICAgICAgIHR5cGU6IDEgLyogU3RhdGUuTUFQX0tFWSAqLyxcbiAgICAgICAgICAgIHNpemU6IHNpemUsXG4gICAgICAgICAgICBrZXk6IG51bGwsXG4gICAgICAgICAgICByZWFkQ291bnQ6IDAsXG4gICAgICAgICAgICBtYXA6IHt9LFxuICAgICAgICB9KTtcbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLnB1c2hBcnJheVN0YXRlID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgICAgICAgaWYgKHNpemUgPiB0aGlzLm1heEFycmF5TGVuZ3RoKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgX0RlY29kZUVycm9yX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfNV9fLkRlY29kZUVycm9yKFwiTWF4IGxlbmd0aCBleGNlZWRlZDogYXJyYXkgbGVuZ3RoIChcIi5jb25jYXQoc2l6ZSwgXCIpID4gbWF4QXJyYXlMZW5ndGggKFwiKS5jb25jYXQodGhpcy5tYXhBcnJheUxlbmd0aCwgXCIpXCIpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN0YWNrLnB1c2goe1xuICAgICAgICAgICAgdHlwZTogMCAvKiBTdGF0ZS5BUlJBWSAqLyxcbiAgICAgICAgICAgIHNpemU6IHNpemUsXG4gICAgICAgICAgICBhcnJheTogbmV3IEFycmF5KHNpemUpLFxuICAgICAgICAgICAgcG9zaXRpb246IDAsXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUuZGVjb2RlVXRmOFN0cmluZyA9IGZ1bmN0aW9uIChieXRlTGVuZ3RoLCBoZWFkZXJPZmZzZXQpIHtcbiAgICAgICAgdmFyIF9hO1xuICAgICAgICBpZiAoYnl0ZUxlbmd0aCA+IHRoaXMubWF4U3RyTGVuZ3RoKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgX0RlY29kZUVycm9yX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfNV9fLkRlY29kZUVycm9yKFwiTWF4IGxlbmd0aCBleGNlZWRlZDogVVRGLTggYnl0ZSBsZW5ndGggKFwiLmNvbmNhdChieXRlTGVuZ3RoLCBcIikgPiBtYXhTdHJMZW5ndGggKFwiKS5jb25jYXQodGhpcy5tYXhTdHJMZW5ndGgsIFwiKVwiKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuYnl0ZXMuYnl0ZUxlbmd0aCA8IHRoaXMucG9zICsgaGVhZGVyT2Zmc2V0ICsgYnl0ZUxlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgTU9SRV9EQVRBO1xuICAgICAgICB9XG4gICAgICAgIHZhciBvZmZzZXQgPSB0aGlzLnBvcyArIGhlYWRlck9mZnNldDtcbiAgICAgICAgdmFyIG9iamVjdDtcbiAgICAgICAgaWYgKHRoaXMuc3RhdGVJc01hcEtleSgpICYmICgoX2EgPSB0aGlzLmtleURlY29kZXIpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5jYW5CZUNhY2hlZChieXRlTGVuZ3RoKSkpIHtcbiAgICAgICAgICAgIG9iamVjdCA9IHRoaXMua2V5RGVjb2Rlci5kZWNvZGUodGhpcy5ieXRlcywgb2Zmc2V0LCBieXRlTGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChieXRlTGVuZ3RoID4gX3V0aWxzX3V0ZjhfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV82X18uVEVYVF9ERUNPREVSX1RIUkVTSE9MRCkge1xuICAgICAgICAgICAgb2JqZWN0ID0gKDAsX3V0aWxzX3V0ZjhfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV82X18udXRmOERlY29kZVREKSh0aGlzLmJ5dGVzLCBvZmZzZXQsIGJ5dGVMZW5ndGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgb2JqZWN0ID0gKDAsX3V0aWxzX3V0ZjhfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV82X18udXRmOERlY29kZUpzKSh0aGlzLmJ5dGVzLCBvZmZzZXQsIGJ5dGVMZW5ndGgpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucG9zICs9IGhlYWRlck9mZnNldCArIGJ5dGVMZW5ndGg7XG4gICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5zdGF0ZUlzTWFwS2V5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5zdGFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YXIgc3RhdGUgPSB0aGlzLnN0YWNrW3RoaXMuc3RhY2subGVuZ3RoIC0gMV07XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUudHlwZSA9PT0gMSAvKiBTdGF0ZS5NQVBfS0VZICovO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLmRlY29kZUJpbmFyeSA9IGZ1bmN0aW9uIChieXRlTGVuZ3RoLCBoZWFkT2Zmc2V0KSB7XG4gICAgICAgIGlmIChieXRlTGVuZ3RoID4gdGhpcy5tYXhCaW5MZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBfRGVjb2RlRXJyb3JfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV81X18uRGVjb2RlRXJyb3IoXCJNYXggbGVuZ3RoIGV4Y2VlZGVkOiBiaW4gbGVuZ3RoIChcIi5jb25jYXQoYnl0ZUxlbmd0aCwgXCIpID4gbWF4QmluTGVuZ3RoIChcIikuY29uY2F0KHRoaXMubWF4QmluTGVuZ3RoLCBcIilcIikpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGhpcy5oYXNSZW1haW5pbmcoYnl0ZUxlbmd0aCArIGhlYWRPZmZzZXQpKSB7XG4gICAgICAgICAgICB0aHJvdyBNT1JFX0RBVEE7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG9mZnNldCA9IHRoaXMucG9zICsgaGVhZE9mZnNldDtcbiAgICAgICAgdmFyIG9iamVjdCA9IHRoaXMuYnl0ZXMuc3ViYXJyYXkob2Zmc2V0LCBvZmZzZXQgKyBieXRlTGVuZ3RoKTtcbiAgICAgICAgdGhpcy5wb3MgKz0gaGVhZE9mZnNldCArIGJ5dGVMZW5ndGg7XG4gICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5kZWNvZGVFeHRlbnNpb24gPSBmdW5jdGlvbiAoc2l6ZSwgaGVhZE9mZnNldCkge1xuICAgICAgICBpZiAoc2l6ZSA+IHRoaXMubWF4RXh0TGVuZ3RoKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgX0RlY29kZUVycm9yX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfNV9fLkRlY29kZUVycm9yKFwiTWF4IGxlbmd0aCBleGNlZWRlZDogZXh0IGxlbmd0aCAoXCIuY29uY2F0KHNpemUsIFwiKSA+IG1heEV4dExlbmd0aCAoXCIpLmNvbmNhdCh0aGlzLm1heEV4dExlbmd0aCwgXCIpXCIpKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZXh0VHlwZSA9IHRoaXMudmlldy5nZXRJbnQ4KHRoaXMucG9zICsgaGVhZE9mZnNldCk7XG4gICAgICAgIHZhciBkYXRhID0gdGhpcy5kZWNvZGVCaW5hcnkoc2l6ZSwgaGVhZE9mZnNldCArIDEgLyogZXh0VHlwZSAqLyk7XG4gICAgICAgIHJldHVybiB0aGlzLmV4dGVuc2lvbkNvZGVjLmRlY29kZShkYXRhLCBleHRUeXBlLCB0aGlzLmNvbnRleHQpO1xuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUubG9va1U4ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy52aWV3LmdldFVpbnQ4KHRoaXMucG9zKTtcbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLmxvb2tVMTYgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXcuZ2V0VWludDE2KHRoaXMucG9zKTtcbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLmxvb2tVMzIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXcuZ2V0VWludDMyKHRoaXMucG9zKTtcbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLnJlYWRVOCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gdGhpcy52aWV3LmdldFVpbnQ4KHRoaXMucG9zKTtcbiAgICAgICAgdGhpcy5wb3MrKztcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUucmVhZEk4ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLnZpZXcuZ2V0SW50OCh0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zKys7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLnJlYWRVMTYgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHRoaXMudmlldy5nZXRVaW50MTYodGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSAyO1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5yZWFkSTE2ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLnZpZXcuZ2V0SW50MTYodGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSAyO1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5yZWFkVTMyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLnZpZXcuZ2V0VWludDMyKHRoaXMucG9zKTtcbiAgICAgICAgdGhpcy5wb3MgKz0gNDtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUucmVhZEkzMiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gdGhpcy52aWV3LmdldEludDMyKHRoaXMucG9zKTtcbiAgICAgICAgdGhpcy5wb3MgKz0gNDtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUucmVhZFU2NCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gKDAsX3V0aWxzX2ludF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXy5nZXRVaW50NjQpKHRoaXMudmlldywgdGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSA4O1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5yZWFkSTY0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSAoMCxfdXRpbHNfaW50X21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLmdldEludDY0KSh0aGlzLnZpZXcsIHRoaXMucG9zKTtcbiAgICAgICAgdGhpcy5wb3MgKz0gODtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUucmVhZEYzMiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gdGhpcy52aWV3LmdldEZsb2F0MzIodGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSA0O1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5yZWFkRjY0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLnZpZXcuZ2V0RmxvYXQ2NCh0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IDg7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuICAgIHJldHVybiBEZWNvZGVyO1xufSgpKTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9RGVjb2Rlci5tanMubWFwXG5cbi8qKiovIH0pLFxuXG4vKioqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL0VuY29kZXIubWpzXCI6XG4vKiEqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqISpcXFxuICAhKioqIC4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL0VuY29kZXIubWpzICoqKiFcbiAgXFwqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuLyoqKi8gKChfX3VudXNlZF93ZWJwYWNrX19fd2VicGFja19tb2R1bGVfXywgX193ZWJwYWNrX2V4cG9ydHNfXywgX193ZWJwYWNrX3JlcXVpcmVfXykgPT4ge1xuXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIoX193ZWJwYWNrX2V4cG9ydHNfXyk7XG4vKiBoYXJtb255IGV4cG9ydCAqLyBfX3dlYnBhY2tfcmVxdWlyZV9fLmQoX193ZWJwYWNrX2V4cG9ydHNfXywge1xuLyogaGFybW9ueSBleHBvcnQgKi8gICBERUZBVUxUX0lOSVRJQUxfQlVGRkVSX1NJWkU6ICgpID0+ICgvKiBiaW5kaW5nICovIERFRkFVTFRfSU5JVElBTF9CVUZGRVJfU0laRSksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIERFRkFVTFRfTUFYX0RFUFRIOiAoKSA9PiAoLyogYmluZGluZyAqLyBERUZBVUxUX01BWF9ERVBUSCksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIEVuY29kZXI6ICgpID0+ICgvKiBiaW5kaW5nICovIEVuY29kZXIpXG4vKiBoYXJtb255IGV4cG9ydCAqLyB9KTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfdXRpbHNfdXRmOF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vdXRpbHMvdXRmOC5tanMgKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS91dGlscy91dGY4Lm1qc1wiKTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfRXh0ZW5zaW9uQ29kZWNfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL0V4dGVuc2lvbkNvZGVjLm1qcyAqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL0V4dGVuc2lvbkNvZGVjLm1qc1wiKTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfdXRpbHNfaW50X21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfM19fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgLi91dGlscy9pbnQubWpzICovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vdXRpbHMvaW50Lm1qc1wiKTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfdXRpbHNfdHlwZWRBcnJheXNfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL3V0aWxzL3R5cGVkQXJyYXlzLm1qcyAqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL3V0aWxzL3R5cGVkQXJyYXlzLm1qc1wiKTtcblxuXG5cblxudmFyIERFRkFVTFRfTUFYX0RFUFRIID0gMTAwO1xudmFyIERFRkFVTFRfSU5JVElBTF9CVUZGRVJfU0laRSA9IDIwNDg7XG52YXIgRW5jb2RlciA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBFbmNvZGVyKGV4dGVuc2lvbkNvZGVjLCBjb250ZXh0LCBtYXhEZXB0aCwgaW5pdGlhbEJ1ZmZlclNpemUsIHNvcnRLZXlzLCBmb3JjZUZsb2F0MzIsIGlnbm9yZVVuZGVmaW5lZCwgZm9yY2VJbnRlZ2VyVG9GbG9hdCkge1xuICAgICAgICBpZiAoZXh0ZW5zaW9uQ29kZWMgPT09IHZvaWQgMCkgeyBleHRlbnNpb25Db2RlYyA9IF9FeHRlbnNpb25Db2RlY19tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5FeHRlbnNpb25Db2RlYy5kZWZhdWx0Q29kZWM7IH1cbiAgICAgICAgaWYgKGNvbnRleHQgPT09IHZvaWQgMCkgeyBjb250ZXh0ID0gdW5kZWZpbmVkOyB9XG4gICAgICAgIGlmIChtYXhEZXB0aCA9PT0gdm9pZCAwKSB7IG1heERlcHRoID0gREVGQVVMVF9NQVhfREVQVEg7IH1cbiAgICAgICAgaWYgKGluaXRpYWxCdWZmZXJTaXplID09PSB2b2lkIDApIHsgaW5pdGlhbEJ1ZmZlclNpemUgPSBERUZBVUxUX0lOSVRJQUxfQlVGRkVSX1NJWkU7IH1cbiAgICAgICAgaWYgKHNvcnRLZXlzID09PSB2b2lkIDApIHsgc29ydEtleXMgPSBmYWxzZTsgfVxuICAgICAgICBpZiAoZm9yY2VGbG9hdDMyID09PSB2b2lkIDApIHsgZm9yY2VGbG9hdDMyID0gZmFsc2U7IH1cbiAgICAgICAgaWYgKGlnbm9yZVVuZGVmaW5lZCA9PT0gdm9pZCAwKSB7IGlnbm9yZVVuZGVmaW5lZCA9IGZhbHNlOyB9XG4gICAgICAgIGlmIChmb3JjZUludGVnZXJUb0Zsb2F0ID09PSB2b2lkIDApIHsgZm9yY2VJbnRlZ2VyVG9GbG9hdCA9IGZhbHNlOyB9XG4gICAgICAgIHRoaXMuZXh0ZW5zaW9uQ29kZWMgPSBleHRlbnNpb25Db2RlYztcbiAgICAgICAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgICAgICAgdGhpcy5tYXhEZXB0aCA9IG1heERlcHRoO1xuICAgICAgICB0aGlzLmluaXRpYWxCdWZmZXJTaXplID0gaW5pdGlhbEJ1ZmZlclNpemU7XG4gICAgICAgIHRoaXMuc29ydEtleXMgPSBzb3J0S2V5cztcbiAgICAgICAgdGhpcy5mb3JjZUZsb2F0MzIgPSBmb3JjZUZsb2F0MzI7XG4gICAgICAgIHRoaXMuaWdub3JlVW5kZWZpbmVkID0gaWdub3JlVW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmZvcmNlSW50ZWdlclRvRmxvYXQgPSBmb3JjZUludGVnZXJUb0Zsb2F0O1xuICAgICAgICB0aGlzLnBvcyA9IDA7XG4gICAgICAgIHRoaXMudmlldyA9IG5ldyBEYXRhVmlldyhuZXcgQXJyYXlCdWZmZXIodGhpcy5pbml0aWFsQnVmZmVyU2l6ZSkpO1xuICAgICAgICB0aGlzLmJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkodGhpcy52aWV3LmJ1ZmZlcik7XG4gICAgfVxuICAgIEVuY29kZXIucHJvdG90eXBlLnJlaW5pdGlhbGl6ZVN0YXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnBvcyA9IDA7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBUaGlzIGlzIGFsbW9zdCBlcXVpdmFsZW50IHRvIHtAbGluayBFbmNvZGVyI2VuY29kZX0sIGJ1dCBpdCByZXR1cm5zIGFuIHJlZmVyZW5jZSBvZiB0aGUgZW5jb2RlcidzIGludGVybmFsIGJ1ZmZlciBhbmQgdGh1cyBtdWNoIGZhc3RlciB0aGFuIHtAbGluayBFbmNvZGVyI2VuY29kZX0uXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyBFbmNvZGVzIHRoZSBvYmplY3QgYW5kIHJldHVybnMgYSBzaGFyZWQgcmVmZXJlbmNlIHRoZSBlbmNvZGVyJ3MgaW50ZXJuYWwgYnVmZmVyLlxuICAgICAqL1xuICAgIEVuY29kZXIucHJvdG90eXBlLmVuY29kZVNoYXJlZFJlZiA9IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgdGhpcy5yZWluaXRpYWxpemVTdGF0ZSgpO1xuICAgICAgICB0aGlzLmRvRW5jb2RlKG9iamVjdCwgMSk7XG4gICAgICAgIHJldHVybiB0aGlzLmJ5dGVzLnN1YmFycmF5KDAsIHRoaXMucG9zKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEByZXR1cm5zIEVuY29kZXMgdGhlIG9iamVjdCBhbmQgcmV0dXJucyBhIGNvcHkgb2YgdGhlIGVuY29kZXIncyBpbnRlcm5hbCBidWZmZXIuXG4gICAgICovXG4gICAgRW5jb2Rlci5wcm90b3R5cGUuZW5jb2RlID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICB0aGlzLnJlaW5pdGlhbGl6ZVN0YXRlKCk7XG4gICAgICAgIHRoaXMuZG9FbmNvZGUob2JqZWN0LCAxKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYnl0ZXMuc2xpY2UoMCwgdGhpcy5wb3MpO1xuICAgIH07XG4gICAgRW5jb2Rlci5wcm90b3R5cGUuZG9FbmNvZGUgPSBmdW5jdGlvbiAob2JqZWN0LCBkZXB0aCkge1xuICAgICAgICBpZiAoZGVwdGggPiB0aGlzLm1heERlcHRoKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUb28gZGVlcCBvYmplY3RzIGluIGRlcHRoIFwiLmNvbmNhdChkZXB0aCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvYmplY3QgPT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5lbmNvZGVOaWwoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0ID09PSBcImJvb2xlYW5cIikge1xuICAgICAgICAgICAgdGhpcy5lbmNvZGVCb29sZWFuKG9iamVjdCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdCA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgdGhpcy5lbmNvZGVOdW1iZXIob2JqZWN0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICB0aGlzLmVuY29kZVN0cmluZyhvYmplY3QpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5lbmNvZGVPYmplY3Qob2JqZWN0LCBkZXB0aCk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEVuY29kZXIucHJvdG90eXBlLmVuc3VyZUJ1ZmZlclNpemVUb1dyaXRlID0gZnVuY3Rpb24gKHNpemVUb1dyaXRlKSB7XG4gICAgICAgIHZhciByZXF1aXJlZFNpemUgPSB0aGlzLnBvcyArIHNpemVUb1dyaXRlO1xuICAgICAgICBpZiAodGhpcy52aWV3LmJ5dGVMZW5ndGggPCByZXF1aXJlZFNpemUpIHtcbiAgICAgICAgICAgIHRoaXMucmVzaXplQnVmZmVyKHJlcXVpcmVkU2l6ZSAqIDIpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBFbmNvZGVyLnByb3RvdHlwZS5yZXNpemVCdWZmZXIgPSBmdW5jdGlvbiAobmV3U2l6ZSkge1xuICAgICAgICB2YXIgbmV3QnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKG5ld1NpemUpO1xuICAgICAgICB2YXIgbmV3Qnl0ZXMgPSBuZXcgVWludDhBcnJheShuZXdCdWZmZXIpO1xuICAgICAgICB2YXIgbmV3VmlldyA9IG5ldyBEYXRhVmlldyhuZXdCdWZmZXIpO1xuICAgICAgICBuZXdCeXRlcy5zZXQodGhpcy5ieXRlcyk7XG4gICAgICAgIHRoaXMudmlldyA9IG5ld1ZpZXc7XG4gICAgICAgIHRoaXMuYnl0ZXMgPSBuZXdCeXRlcztcbiAgICB9O1xuICAgIEVuY29kZXIucHJvdG90eXBlLmVuY29kZU5pbCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy53cml0ZVU4KDB4YzApO1xuICAgIH07XG4gICAgRW5jb2Rlci5wcm90b3R5cGUuZW5jb2RlQm9vbGVhbiA9IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgaWYgKG9iamVjdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGMyKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGMzKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgRW5jb2Rlci5wcm90b3R5cGUuZW5jb2RlTnVtYmVyID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICBpZiAoTnVtYmVyLmlzU2FmZUludGVnZXIob2JqZWN0KSAmJiAhdGhpcy5mb3JjZUludGVnZXJUb0Zsb2F0KSB7XG4gICAgICAgICAgICBpZiAob2JqZWN0ID49IDApIHtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0IDwgMHg4MCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwb3NpdGl2ZSBmaXhpbnRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53cml0ZVU4KG9iamVjdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG9iamVjdCA8IDB4MTAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHVpbnQgOFxuICAgICAgICAgICAgICAgICAgICB0aGlzLndyaXRlVTgoMHhjYyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGVVOChvYmplY3QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChvYmplY3QgPCAweDEwMDAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHVpbnQgMTZcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4Y2QpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLndyaXRlVTE2KG9iamVjdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG9iamVjdCA8IDB4MTAwMDAwMDAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHVpbnQgMzJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4Y2UpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLndyaXRlVTMyKG9iamVjdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyB1aW50IDY0XG4gICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGNmKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53cml0ZVU2NChvYmplY3QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChvYmplY3QgPj0gLTB4MjApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbmVnYXRpdmUgZml4aW50XG4gICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGUwIHwgKG9iamVjdCArIDB4MjApKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAob2JqZWN0ID49IC0weDgwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGludCA4XG4gICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGQwKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53cml0ZUk4KG9iamVjdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG9iamVjdCA+PSAtMHg4MDAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGludCAxNlxuICAgICAgICAgICAgICAgICAgICB0aGlzLndyaXRlVTgoMHhkMSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGVJMTYob2JqZWN0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAob2JqZWN0ID49IC0weDgwMDAwMDAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGludCAzMlxuICAgICAgICAgICAgICAgICAgICB0aGlzLndyaXRlVTgoMHhkMik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGVJMzIob2JqZWN0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGludCA2NFxuICAgICAgICAgICAgICAgICAgICB0aGlzLndyaXRlVTgoMHhkMyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGVJNjQob2JqZWN0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBub24taW50ZWdlciBudW1iZXJzXG4gICAgICAgICAgICBpZiAodGhpcy5mb3JjZUZsb2F0MzIpIHtcbiAgICAgICAgICAgICAgICAvLyBmbG9hdCAzMlxuICAgICAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGNhKTtcbiAgICAgICAgICAgICAgICB0aGlzLndyaXRlRjMyKG9iamVjdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBmbG9hdCA2NFxuICAgICAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGNiKTtcbiAgICAgICAgICAgICAgICB0aGlzLndyaXRlRjY0KG9iamVjdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEVuY29kZXIucHJvdG90eXBlLndyaXRlU3RyaW5nSGVhZGVyID0gZnVuY3Rpb24gKGJ5dGVMZW5ndGgpIHtcbiAgICAgICAgaWYgKGJ5dGVMZW5ndGggPCAzMikge1xuICAgICAgICAgICAgLy8gZml4c3RyXG4gICAgICAgICAgICB0aGlzLndyaXRlVTgoMHhhMCArIGJ5dGVMZW5ndGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGJ5dGVMZW5ndGggPCAweDEwMCkge1xuICAgICAgICAgICAgLy8gc3RyIDhcbiAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGQ5KTtcbiAgICAgICAgICAgIHRoaXMud3JpdGVVOChieXRlTGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChieXRlTGVuZ3RoIDwgMHgxMDAwMCkge1xuICAgICAgICAgICAgLy8gc3RyIDE2XG4gICAgICAgICAgICB0aGlzLndyaXRlVTgoMHhkYSk7XG4gICAgICAgICAgICB0aGlzLndyaXRlVTE2KGJ5dGVMZW5ndGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGJ5dGVMZW5ndGggPCAweDEwMDAwMDAwMCkge1xuICAgICAgICAgICAgLy8gc3RyIDMyXG4gICAgICAgICAgICB0aGlzLndyaXRlVTgoMHhkYik7XG4gICAgICAgICAgICB0aGlzLndyaXRlVTMyKGJ5dGVMZW5ndGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVG9vIGxvbmcgc3RyaW5nOiBcIi5jb25jYXQoYnl0ZUxlbmd0aCwgXCIgYnl0ZXMgaW4gVVRGLThcIikpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBFbmNvZGVyLnByb3RvdHlwZS5lbmNvZGVTdHJpbmcgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHZhciBtYXhIZWFkZXJTaXplID0gMSArIDQ7XG4gICAgICAgIHZhciBzdHJMZW5ndGggPSBvYmplY3QubGVuZ3RoO1xuICAgICAgICBpZiAoc3RyTGVuZ3RoID4gX3V0aWxzX3V0ZjhfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18uVEVYVF9FTkNPREVSX1RIUkVTSE9MRCkge1xuICAgICAgICAgICAgdmFyIGJ5dGVMZW5ndGggPSAoMCxfdXRpbHNfdXRmOF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy51dGY4Q291bnQpKG9iamVjdCk7XG4gICAgICAgICAgICB0aGlzLmVuc3VyZUJ1ZmZlclNpemVUb1dyaXRlKG1heEhlYWRlclNpemUgKyBieXRlTGVuZ3RoKTtcbiAgICAgICAgICAgIHRoaXMud3JpdGVTdHJpbmdIZWFkZXIoYnl0ZUxlbmd0aCk7XG4gICAgICAgICAgICAoMCxfdXRpbHNfdXRmOF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy51dGY4RW5jb2RlVEUpKG9iamVjdCwgdGhpcy5ieXRlcywgdGhpcy5wb3MpO1xuICAgICAgICAgICAgdGhpcy5wb3MgKz0gYnl0ZUxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBieXRlTGVuZ3RoID0gKDAsX3V0aWxzX3V0ZjhfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18udXRmOENvdW50KShvYmplY3QpO1xuICAgICAgICAgICAgdGhpcy5lbnN1cmVCdWZmZXJTaXplVG9Xcml0ZShtYXhIZWFkZXJTaXplICsgYnl0ZUxlbmd0aCk7XG4gICAgICAgICAgICB0aGlzLndyaXRlU3RyaW5nSGVhZGVyKGJ5dGVMZW5ndGgpO1xuICAgICAgICAgICAgKDAsX3V0aWxzX3V0ZjhfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18udXRmOEVuY29kZUpzKShvYmplY3QsIHRoaXMuYnl0ZXMsIHRoaXMucG9zKTtcbiAgICAgICAgICAgIHRoaXMucG9zICs9IGJ5dGVMZW5ndGg7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEVuY29kZXIucHJvdG90eXBlLmVuY29kZU9iamVjdCA9IGZ1bmN0aW9uIChvYmplY3QsIGRlcHRoKSB7XG4gICAgICAgIC8vIHRyeSB0byBlbmNvZGUgb2JqZWN0cyB3aXRoIGN1c3RvbSBjb2RlYyBmaXJzdCBvZiBub24tcHJpbWl0aXZlc1xuICAgICAgICB2YXIgZXh0ID0gdGhpcy5leHRlbnNpb25Db2RlYy50cnlUb0VuY29kZShvYmplY3QsIHRoaXMuY29udGV4dCk7XG4gICAgICAgIGlmIChleHQgIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5lbmNvZGVFeHRlbnNpb24oZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChBcnJheS5pc0FycmF5KG9iamVjdCkpIHtcbiAgICAgICAgICAgIHRoaXMuZW5jb2RlQXJyYXkob2JqZWN0LCBkZXB0aCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KG9iamVjdCkpIHtcbiAgICAgICAgICAgIHRoaXMuZW5jb2RlQmluYXJ5KG9iamVjdCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdCA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgdGhpcy5lbmNvZGVNYXAob2JqZWN0LCBkZXB0aCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBzeW1ib2wsIGZ1bmN0aW9uIGFuZCBvdGhlciBzcGVjaWFsIG9iamVjdCBjb21lIGhlcmUgdW5sZXNzIGV4dGVuc2lvbkNvZGVjIGhhbmRsZXMgdGhlbS5cbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVucmVjb2duaXplZCBvYmplY3Q6IFwiLmNvbmNhdChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmFwcGx5KG9iamVjdCkpKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgRW5jb2Rlci5wcm90b3R5cGUuZW5jb2RlQmluYXJ5ID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICB2YXIgc2l6ZSA9IG9iamVjdC5ieXRlTGVuZ3RoO1xuICAgICAgICBpZiAoc2l6ZSA8IDB4MTAwKSB7XG4gICAgICAgICAgICAvLyBiaW4gOFxuICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4YzQpO1xuICAgICAgICAgICAgdGhpcy53cml0ZVU4KHNpemUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHNpemUgPCAweDEwMDAwKSB7XG4gICAgICAgICAgICAvLyBiaW4gMTZcbiAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGM1KTtcbiAgICAgICAgICAgIHRoaXMud3JpdGVVMTYoc2l6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc2l6ZSA8IDB4MTAwMDAwMDAwKSB7XG4gICAgICAgICAgICAvLyBiaW4gMzJcbiAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGM2KTtcbiAgICAgICAgICAgIHRoaXMud3JpdGVVMzIoc2l6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUb28gbGFyZ2UgYmluYXJ5OiBcIi5jb25jYXQoc2l6ZSkpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBieXRlcyA9ICgwLF91dGlsc190eXBlZEFycmF5c19tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXy5lbnN1cmVVaW50OEFycmF5KShvYmplY3QpO1xuICAgICAgICB0aGlzLndyaXRlVThhKGJ5dGVzKTtcbiAgICB9O1xuICAgIEVuY29kZXIucHJvdG90eXBlLmVuY29kZUFycmF5ID0gZnVuY3Rpb24gKG9iamVjdCwgZGVwdGgpIHtcbiAgICAgICAgdmFyIHNpemUgPSBvYmplY3QubGVuZ3RoO1xuICAgICAgICBpZiAoc2l6ZSA8IDE2KSB7XG4gICAgICAgICAgICAvLyBmaXhhcnJheVxuICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4OTAgKyBzaXplKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzaXplIDwgMHgxMDAwMCkge1xuICAgICAgICAgICAgLy8gYXJyYXkgMTZcbiAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGRjKTtcbiAgICAgICAgICAgIHRoaXMud3JpdGVVMTYoc2l6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc2l6ZSA8IDB4MTAwMDAwMDAwKSB7XG4gICAgICAgICAgICAvLyBhcnJheSAzMlxuICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4ZGQpO1xuICAgICAgICAgICAgdGhpcy53cml0ZVUzMihzaXplKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRvbyBsYXJnZSBhcnJheTogXCIuY29uY2F0KHNpemUpKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBfaSA9IDAsIG9iamVjdF8xID0gb2JqZWN0OyBfaSA8IG9iamVjdF8xLmxlbmd0aDsgX2krKykge1xuICAgICAgICAgICAgdmFyIGl0ZW0gPSBvYmplY3RfMVtfaV07XG4gICAgICAgICAgICB0aGlzLmRvRW5jb2RlKGl0ZW0sIGRlcHRoICsgMSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEVuY29kZXIucHJvdG90eXBlLmNvdW50V2l0aG91dFVuZGVmaW5lZCA9IGZ1bmN0aW9uIChvYmplY3QsIGtleXMpIHtcbiAgICAgICAgdmFyIGNvdW50ID0gMDtcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwLCBrZXlzXzEgPSBrZXlzOyBfaSA8IGtleXNfMS5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBrZXlzXzFbX2ldO1xuICAgICAgICAgICAgaWYgKG9iamVjdFtrZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb3VudDtcbiAgICB9O1xuICAgIEVuY29kZXIucHJvdG90eXBlLmVuY29kZU1hcCA9IGZ1bmN0aW9uIChvYmplY3QsIGRlcHRoKSB7XG4gICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqZWN0KTtcbiAgICAgICAgaWYgKHRoaXMuc29ydEtleXMpIHtcbiAgICAgICAgICAgIGtleXMuc29ydCgpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzaXplID0gdGhpcy5pZ25vcmVVbmRlZmluZWQgPyB0aGlzLmNvdW50V2l0aG91dFVuZGVmaW5lZChvYmplY3QsIGtleXMpIDoga2V5cy5sZW5ndGg7XG4gICAgICAgIGlmIChzaXplIDwgMTYpIHtcbiAgICAgICAgICAgIC8vIGZpeG1hcFxuICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4ODAgKyBzaXplKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzaXplIDwgMHgxMDAwMCkge1xuICAgICAgICAgICAgLy8gbWFwIDE2XG4gICAgICAgICAgICB0aGlzLndyaXRlVTgoMHhkZSk7XG4gICAgICAgICAgICB0aGlzLndyaXRlVTE2KHNpemUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHNpemUgPCAweDEwMDAwMDAwMCkge1xuICAgICAgICAgICAgLy8gbWFwIDMyXG4gICAgICAgICAgICB0aGlzLndyaXRlVTgoMHhkZik7XG4gICAgICAgICAgICB0aGlzLndyaXRlVTMyKHNpemUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVG9vIGxhcmdlIG1hcCBvYmplY3Q6IFwiLmNvbmNhdChzaXplKSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgX2kgPSAwLCBrZXlzXzIgPSBrZXlzOyBfaSA8IGtleXNfMi5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBrZXlzXzJbX2ldO1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gb2JqZWN0W2tleV07XG4gICAgICAgICAgICBpZiAoISh0aGlzLmlnbm9yZVVuZGVmaW5lZCAmJiB2YWx1ZSA9PT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZW5jb2RlU3RyaW5nKGtleSk7XG4gICAgICAgICAgICAgICAgdGhpcy5kb0VuY29kZSh2YWx1ZSwgZGVwdGggKyAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgRW5jb2Rlci5wcm90b3R5cGUuZW5jb2RlRXh0ZW5zaW9uID0gZnVuY3Rpb24gKGV4dCkge1xuICAgICAgICB2YXIgc2l6ZSA9IGV4dC5kYXRhLmxlbmd0aDtcbiAgICAgICAgaWYgKHNpemUgPT09IDEpIHtcbiAgICAgICAgICAgIC8vIGZpeGV4dCAxXG4gICAgICAgICAgICB0aGlzLndyaXRlVTgoMHhkNCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc2l6ZSA9PT0gMikge1xuICAgICAgICAgICAgLy8gZml4ZXh0IDJcbiAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGQ1KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzaXplID09PSA0KSB7XG4gICAgICAgICAgICAvLyBmaXhleHQgNFxuICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4ZDYpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHNpemUgPT09IDgpIHtcbiAgICAgICAgICAgIC8vIGZpeGV4dCA4XG4gICAgICAgICAgICB0aGlzLndyaXRlVTgoMHhkNyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc2l6ZSA9PT0gMTYpIHtcbiAgICAgICAgICAgIC8vIGZpeGV4dCAxNlxuICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4ZDgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHNpemUgPCAweDEwMCkge1xuICAgICAgICAgICAgLy8gZXh0IDhcbiAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGM3KTtcbiAgICAgICAgICAgIHRoaXMud3JpdGVVOChzaXplKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzaXplIDwgMHgxMDAwMCkge1xuICAgICAgICAgICAgLy8gZXh0IDE2XG4gICAgICAgICAgICB0aGlzLndyaXRlVTgoMHhjOCk7XG4gICAgICAgICAgICB0aGlzLndyaXRlVTE2KHNpemUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHNpemUgPCAweDEwMDAwMDAwMCkge1xuICAgICAgICAgICAgLy8gZXh0IDMyXG4gICAgICAgICAgICB0aGlzLndyaXRlVTgoMHhjOSk7XG4gICAgICAgICAgICB0aGlzLndyaXRlVTMyKHNpemUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVG9vIGxhcmdlIGV4dGVuc2lvbiBvYmplY3Q6IFwiLmNvbmNhdChzaXplKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy53cml0ZUk4KGV4dC50eXBlKTtcbiAgICAgICAgdGhpcy53cml0ZVU4YShleHQuZGF0YSk7XG4gICAgfTtcbiAgICBFbmNvZGVyLnByb3RvdHlwZS53cml0ZVU4ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlQnVmZmVyU2l6ZVRvV3JpdGUoMSk7XG4gICAgICAgIHRoaXMudmlldy5zZXRVaW50OCh0aGlzLnBvcywgdmFsdWUpO1xuICAgICAgICB0aGlzLnBvcysrO1xuICAgIH07XG4gICAgRW5jb2Rlci5wcm90b3R5cGUud3JpdGVVOGEgPSBmdW5jdGlvbiAodmFsdWVzKSB7XG4gICAgICAgIHZhciBzaXplID0gdmFsdWVzLmxlbmd0aDtcbiAgICAgICAgdGhpcy5lbnN1cmVCdWZmZXJTaXplVG9Xcml0ZShzaXplKTtcbiAgICAgICAgdGhpcy5ieXRlcy5zZXQodmFsdWVzLCB0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IHNpemU7XG4gICAgfTtcbiAgICBFbmNvZGVyLnByb3RvdHlwZS53cml0ZUk4ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlQnVmZmVyU2l6ZVRvV3JpdGUoMSk7XG4gICAgICAgIHRoaXMudmlldy5zZXRJbnQ4KHRoaXMucG9zLCB2YWx1ZSk7XG4gICAgICAgIHRoaXMucG9zKys7XG4gICAgfTtcbiAgICBFbmNvZGVyLnByb3RvdHlwZS53cml0ZVUxNiA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLmVuc3VyZUJ1ZmZlclNpemVUb1dyaXRlKDIpO1xuICAgICAgICB0aGlzLnZpZXcuc2V0VWludDE2KHRoaXMucG9zLCB2YWx1ZSk7XG4gICAgICAgIHRoaXMucG9zICs9IDI7XG4gICAgfTtcbiAgICBFbmNvZGVyLnByb3RvdHlwZS53cml0ZUkxNiA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLmVuc3VyZUJ1ZmZlclNpemVUb1dyaXRlKDIpO1xuICAgICAgICB0aGlzLnZpZXcuc2V0SW50MTYodGhpcy5wb3MsIHZhbHVlKTtcbiAgICAgICAgdGhpcy5wb3MgKz0gMjtcbiAgICB9O1xuICAgIEVuY29kZXIucHJvdG90eXBlLndyaXRlVTMyID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlQnVmZmVyU2l6ZVRvV3JpdGUoNCk7XG4gICAgICAgIHRoaXMudmlldy5zZXRVaW50MzIodGhpcy5wb3MsIHZhbHVlKTtcbiAgICAgICAgdGhpcy5wb3MgKz0gNDtcbiAgICB9O1xuICAgIEVuY29kZXIucHJvdG90eXBlLndyaXRlSTMyID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlQnVmZmVyU2l6ZVRvV3JpdGUoNCk7XG4gICAgICAgIHRoaXMudmlldy5zZXRJbnQzMih0aGlzLnBvcywgdmFsdWUpO1xuICAgICAgICB0aGlzLnBvcyArPSA0O1xuICAgIH07XG4gICAgRW5jb2Rlci5wcm90b3R5cGUud3JpdGVGMzIgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVCdWZmZXJTaXplVG9Xcml0ZSg0KTtcbiAgICAgICAgdGhpcy52aWV3LnNldEZsb2F0MzIodGhpcy5wb3MsIHZhbHVlKTtcbiAgICAgICAgdGhpcy5wb3MgKz0gNDtcbiAgICB9O1xuICAgIEVuY29kZXIucHJvdG90eXBlLndyaXRlRjY0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlQnVmZmVyU2l6ZVRvV3JpdGUoOCk7XG4gICAgICAgIHRoaXMudmlldy5zZXRGbG9hdDY0KHRoaXMucG9zLCB2YWx1ZSk7XG4gICAgICAgIHRoaXMucG9zICs9IDg7XG4gICAgfTtcbiAgICBFbmNvZGVyLnByb3RvdHlwZS53cml0ZVU2NCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLmVuc3VyZUJ1ZmZlclNpemVUb1dyaXRlKDgpO1xuICAgICAgICAoMCxfdXRpbHNfaW50X21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfM19fLnNldFVpbnQ2NCkodGhpcy52aWV3LCB0aGlzLnBvcywgdmFsdWUpO1xuICAgICAgICB0aGlzLnBvcyArPSA4O1xuICAgIH07XG4gICAgRW5jb2Rlci5wcm90b3R5cGUud3JpdGVJNjQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVCdWZmZXJTaXplVG9Xcml0ZSg4KTtcbiAgICAgICAgKDAsX3V0aWxzX2ludF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzNfXy5zZXRJbnQ2NCkodGhpcy52aWV3LCB0aGlzLnBvcywgdmFsdWUpO1xuICAgICAgICB0aGlzLnBvcyArPSA4O1xuICAgIH07XG4gICAgcmV0dXJuIEVuY29kZXI7XG59KCkpO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1FbmNvZGVyLm1qcy5tYXBcblxuLyoqKi8gfSksXG5cbi8qKiovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vRXh0RGF0YS5tanNcIjpcbi8qISoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiohKlxcXG4gICEqKiogLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vRXh0RGF0YS5tanMgKioqIVxuICBcXCoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKioqLyAoKF9fdW51c2VkX3dlYnBhY2tfX193ZWJwYWNrX21vZHVsZV9fLCBfX3dlYnBhY2tfZXhwb3J0c19fLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSA9PiB7XG5cbl9fd2VicGFja19yZXF1aXJlX18ucihfX3dlYnBhY2tfZXhwb3J0c19fKTtcbi8qIGhhcm1vbnkgZXhwb3J0ICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCB7XG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIEV4dERhdGE6ICgpID0+ICgvKiBiaW5kaW5nICovIEV4dERhdGEpXG4vKiBoYXJtb255IGV4cG9ydCAqLyB9KTtcbi8qKlxuICogRXh0RGF0YSBpcyB1c2VkIHRvIGhhbmRsZSBFeHRlbnNpb24gVHlwZXMgdGhhdCBhcmUgbm90IHJlZ2lzdGVyZWQgdG8gRXh0ZW5zaW9uQ29kZWMuXG4gKi9cbnZhciBFeHREYXRhID0gLyoqIEBjbGFzcyAqLyAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEV4dERhdGEodHlwZSwgZGF0YSkge1xuICAgICAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgICAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgIH1cbiAgICByZXR1cm4gRXh0RGF0YTtcbn0oKSk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUV4dERhdGEubWpzLm1hcFxuXG4vKioqLyB9KSxcblxuLyoqKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS9FeHRlbnNpb25Db2RlYy5tanNcIjpcbi8qISoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqISpcXFxuICAhKioqIC4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL0V4dGVuc2lvbkNvZGVjLm1qcyAqKiohXG4gIFxcKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKioqLyAoKF9fdW51c2VkX3dlYnBhY2tfX193ZWJwYWNrX21vZHVsZV9fLCBfX3dlYnBhY2tfZXhwb3J0c19fLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSA9PiB7XG5cbl9fd2VicGFja19yZXF1aXJlX18ucihfX3dlYnBhY2tfZXhwb3J0c19fKTtcbi8qIGhhcm1vbnkgZXhwb3J0ICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCB7XG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIEV4dGVuc2lvbkNvZGVjOiAoKSA9PiAoLyogYmluZGluZyAqLyBFeHRlbnNpb25Db2RlYylcbi8qIGhhcm1vbnkgZXhwb3J0ICovIH0pO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF9FeHREYXRhX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgLi9FeHREYXRhLm1qcyAqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL0V4dERhdGEubWpzXCIpO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF90aW1lc3RhbXBfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL3RpbWVzdGFtcC5tanMgKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS90aW1lc3RhbXAubWpzXCIpO1xuLy8gRXh0ZW5zaW9uQ29kZWMgdG8gaGFuZGxlIE1lc3NhZ2VQYWNrIGV4dGVuc2lvbnNcblxuXG52YXIgRXh0ZW5zaW9uQ29kZWMgPSAvKiogQGNsYXNzICovIChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRXh0ZW5zaW9uQ29kZWMoKSB7XG4gICAgICAgIC8vIGJ1aWx0LWluIGV4dGVuc2lvbnNcbiAgICAgICAgdGhpcy5idWlsdEluRW5jb2RlcnMgPSBbXTtcbiAgICAgICAgdGhpcy5idWlsdEluRGVjb2RlcnMgPSBbXTtcbiAgICAgICAgLy8gY3VzdG9tIGV4dGVuc2lvbnNcbiAgICAgICAgdGhpcy5lbmNvZGVycyA9IFtdO1xuICAgICAgICB0aGlzLmRlY29kZXJzID0gW107XG4gICAgICAgIHRoaXMucmVnaXN0ZXIoX3RpbWVzdGFtcF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy50aW1lc3RhbXBFeHRlbnNpb24pO1xuICAgIH1cbiAgICBFeHRlbnNpb25Db2RlYy5wcm90b3R5cGUucmVnaXN0ZXIgPSBmdW5jdGlvbiAoX2EpIHtcbiAgICAgICAgdmFyIHR5cGUgPSBfYS50eXBlLCBlbmNvZGUgPSBfYS5lbmNvZGUsIGRlY29kZSA9IF9hLmRlY29kZTtcbiAgICAgICAgaWYgKHR5cGUgPj0gMCkge1xuICAgICAgICAgICAgLy8gY3VzdG9tIGV4dGVuc2lvbnNcbiAgICAgICAgICAgIHRoaXMuZW5jb2RlcnNbdHlwZV0gPSBlbmNvZGU7XG4gICAgICAgICAgICB0aGlzLmRlY29kZXJzW3R5cGVdID0gZGVjb2RlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gYnVpbHQtaW4gZXh0ZW5zaW9uc1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gMSArIHR5cGU7XG4gICAgICAgICAgICB0aGlzLmJ1aWx0SW5FbmNvZGVyc1tpbmRleF0gPSBlbmNvZGU7XG4gICAgICAgICAgICB0aGlzLmJ1aWx0SW5EZWNvZGVyc1tpbmRleF0gPSBkZWNvZGU7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEV4dGVuc2lvbkNvZGVjLnByb3RvdHlwZS50cnlUb0VuY29kZSA9IGZ1bmN0aW9uIChvYmplY3QsIGNvbnRleHQpIHtcbiAgICAgICAgLy8gYnVpbHQtaW4gZXh0ZW5zaW9uc1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuYnVpbHRJbkVuY29kZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgZW5jb2RlRXh0ID0gdGhpcy5idWlsdEluRW5jb2RlcnNbaV07XG4gICAgICAgICAgICBpZiAoZW5jb2RlRXh0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IGVuY29kZUV4dChvYmplY3QsIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgIGlmIChkYXRhICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHR5cGUgPSAtMSAtIGk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgX0V4dERhdGFfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18uRXh0RGF0YSh0eXBlLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY3VzdG9tIGV4dGVuc2lvbnNcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmVuY29kZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgZW5jb2RlRXh0ID0gdGhpcy5lbmNvZGVyc1tpXTtcbiAgICAgICAgICAgIGlmIChlbmNvZGVFeHQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHZhciBkYXRhID0gZW5jb2RlRXh0KG9iamVjdCwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IGk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgX0V4dERhdGFfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18uRXh0RGF0YSh0eXBlLCBkYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mIF9FeHREYXRhX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLkV4dERhdGEpIHtcbiAgICAgICAgICAgIC8vIHRvIGtlZXAgRXh0RGF0YSBhcyBpc1xuICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9O1xuICAgIEV4dGVuc2lvbkNvZGVjLnByb3RvdHlwZS5kZWNvZGUgPSBmdW5jdGlvbiAoZGF0YSwgdHlwZSwgY29udGV4dCkge1xuICAgICAgICB2YXIgZGVjb2RlRXh0ID0gdHlwZSA8IDAgPyB0aGlzLmJ1aWx0SW5EZWNvZGVyc1stMSAtIHR5cGVdIDogdGhpcy5kZWNvZGVyc1t0eXBlXTtcbiAgICAgICAgaWYgKGRlY29kZUV4dCkge1xuICAgICAgICAgICAgcmV0dXJuIGRlY29kZUV4dChkYXRhLCB0eXBlLCBjb250ZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIGRlY29kZSgpIGRvZXMgbm90IGZhaWwsIHJldHVybnMgRXh0RGF0YSBpbnN0ZWFkLlxuICAgICAgICAgICAgcmV0dXJuIG5ldyBfRXh0RGF0YV9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5FeHREYXRhKHR5cGUsIGRhdGEpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBFeHRlbnNpb25Db2RlYy5kZWZhdWx0Q29kZWMgPSBuZXcgRXh0ZW5zaW9uQ29kZWMoKTtcbiAgICByZXR1cm4gRXh0ZW5zaW9uQ29kZWM7XG59KCkpO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1FeHRlbnNpb25Db2RlYy5tanMubWFwXG5cbi8qKiovIH0pLFxuXG4vKioqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL2RlY29kZS5tanNcIjpcbi8qISoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiEqXFxcbiAgISoqKiAuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS9kZWNvZGUubWpzICoqKiFcbiAgXFwqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKioqLyAoKF9fdW51c2VkX3dlYnBhY2tfX193ZWJwYWNrX21vZHVsZV9fLCBfX3dlYnBhY2tfZXhwb3J0c19fLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSA9PiB7XG5cbl9fd2VicGFja19yZXF1aXJlX18ucihfX3dlYnBhY2tfZXhwb3J0c19fKTtcbi8qIGhhcm1vbnkgZXhwb3J0ICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCB7XG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIGRlY29kZTogKCkgPT4gKC8qIGJpbmRpbmcgKi8gZGVjb2RlKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgZGVjb2RlTXVsdGk6ICgpID0+ICgvKiBiaW5kaW5nICovIGRlY29kZU11bHRpKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgZGVmYXVsdERlY29kZU9wdGlvbnM6ICgpID0+ICgvKiBiaW5kaW5nICovIGRlZmF1bHREZWNvZGVPcHRpb25zKVxuLyogaGFybW9ueSBleHBvcnQgKi8gfSk7XG4vKiBoYXJtb255IGltcG9ydCAqLyB2YXIgX0RlY29kZXJfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL0RlY29kZXIubWpzICovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vRGVjb2Rlci5tanNcIik7XG5cbnZhciBkZWZhdWx0RGVjb2RlT3B0aW9ucyA9IHt9O1xuLyoqXG4gKiBJdCBkZWNvZGVzIGEgc2luZ2xlIE1lc3NhZ2VQYWNrIG9iamVjdCBpbiBhIGJ1ZmZlci5cbiAqXG4gKiBUaGlzIGlzIGEgc3luY2hyb25vdXMgZGVjb2RpbmcgZnVuY3Rpb24uXG4gKiBTZWUgb3RoZXIgdmFyaWFudHMgZm9yIGFzeW5jaHJvbm91cyBkZWNvZGluZzoge0BsaW5rIGRlY29kZUFzeW5jKCl9LCB7QGxpbmsgZGVjb2RlU3RyZWFtKCl9LCBvciB7QGxpbmsgZGVjb2RlQXJyYXlTdHJlYW0oKX0uXG4gKlxuICogQHRocm93cyB7QGxpbmsgUmFuZ2VFcnJvcn0gaWYgdGhlIGJ1ZmZlciBpcyBpbmNvbXBsZXRlLCBpbmNsdWRpbmcgdGhlIGNhc2Ugd2hlcmUgdGhlIGJ1ZmZlciBpcyBlbXB0eS5cbiAqIEB0aHJvd3Mge0BsaW5rIERlY29kZUVycm9yfSBpZiB0aGUgYnVmZmVyIGNvbnRhaW5zIGludmFsaWQgZGF0YS5cbiAqL1xuZnVuY3Rpb24gZGVjb2RlKGJ1ZmZlciwgb3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zID09PSB2b2lkIDApIHsgb3B0aW9ucyA9IGRlZmF1bHREZWNvZGVPcHRpb25zOyB9XG4gICAgdmFyIGRlY29kZXIgPSBuZXcgX0RlY29kZXJfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uRGVjb2RlcihvcHRpb25zLmV4dGVuc2lvbkNvZGVjLCBvcHRpb25zLmNvbnRleHQsIG9wdGlvbnMubWF4U3RyTGVuZ3RoLCBvcHRpb25zLm1heEJpbkxlbmd0aCwgb3B0aW9ucy5tYXhBcnJheUxlbmd0aCwgb3B0aW9ucy5tYXhNYXBMZW5ndGgsIG9wdGlvbnMubWF4RXh0TGVuZ3RoKTtcbiAgICByZXR1cm4gZGVjb2Rlci5kZWNvZGUoYnVmZmVyKTtcbn1cbi8qKlxuICogSXQgZGVjb2RlcyBtdWx0aXBsZSBNZXNzYWdlUGFjayBvYmplY3RzIGluIGEgYnVmZmVyLlxuICogVGhpcyBpcyBjb3JyZXNwb25kaW5nIHRvIHtAbGluayBkZWNvZGVNdWx0aVN0cmVhbSgpfS5cbiAqXG4gKiBAdGhyb3dzIHtAbGluayBSYW5nZUVycm9yfSBpZiB0aGUgYnVmZmVyIGlzIGluY29tcGxldGUsIGluY2x1ZGluZyB0aGUgY2FzZSB3aGVyZSB0aGUgYnVmZmVyIGlzIGVtcHR5LlxuICogQHRocm93cyB7QGxpbmsgRGVjb2RlRXJyb3J9IGlmIHRoZSBidWZmZXIgY29udGFpbnMgaW52YWxpZCBkYXRhLlxuICovXG5mdW5jdGlvbiBkZWNvZGVNdWx0aShidWZmZXIsIG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7IG9wdGlvbnMgPSBkZWZhdWx0RGVjb2RlT3B0aW9uczsgfVxuICAgIHZhciBkZWNvZGVyID0gbmV3IF9EZWNvZGVyX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLkRlY29kZXIob3B0aW9ucy5leHRlbnNpb25Db2RlYywgb3B0aW9ucy5jb250ZXh0LCBvcHRpb25zLm1heFN0ckxlbmd0aCwgb3B0aW9ucy5tYXhCaW5MZW5ndGgsIG9wdGlvbnMubWF4QXJyYXlMZW5ndGgsIG9wdGlvbnMubWF4TWFwTGVuZ3RoLCBvcHRpb25zLm1heEV4dExlbmd0aCk7XG4gICAgcmV0dXJuIGRlY29kZXIuZGVjb2RlTXVsdGkoYnVmZmVyKTtcbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRlY29kZS5tanMubWFwXG5cbi8qKiovIH0pLFxuXG4vKioqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL2VuY29kZS5tanNcIjpcbi8qISoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiEqXFxcbiAgISoqKiAuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS9lbmNvZGUubWpzICoqKiFcbiAgXFwqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKioqLyAoKF9fdW51c2VkX3dlYnBhY2tfX193ZWJwYWNrX21vZHVsZV9fLCBfX3dlYnBhY2tfZXhwb3J0c19fLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSA9PiB7XG5cbl9fd2VicGFja19yZXF1aXJlX18ucihfX3dlYnBhY2tfZXhwb3J0c19fKTtcbi8qIGhhcm1vbnkgZXhwb3J0ICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCB7XG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIGVuY29kZTogKCkgPT4gKC8qIGJpbmRpbmcgKi8gZW5jb2RlKVxuLyogaGFybW9ueSBleHBvcnQgKi8gfSk7XG4vKiBoYXJtb255IGltcG9ydCAqLyB2YXIgX0VuY29kZXJfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL0VuY29kZXIubWpzICovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vRW5jb2Rlci5tanNcIik7XG5cbnZhciBkZWZhdWx0RW5jb2RlT3B0aW9ucyA9IHt9O1xuLyoqXG4gKiBJdCBlbmNvZGVzIGB2YWx1ZWAgaW4gdGhlIE1lc3NhZ2VQYWNrIGZvcm1hdCBhbmRcbiAqIHJldHVybnMgYSBieXRlIGJ1ZmZlci5cbiAqXG4gKiBUaGUgcmV0dXJuZWQgYnVmZmVyIGlzIGEgc2xpY2Ugb2YgYSBsYXJnZXIgYEFycmF5QnVmZmVyYCwgc28geW91IGhhdmUgdG8gdXNlIGl0cyBgI2J5dGVPZmZzZXRgIGFuZCBgI2J5dGVMZW5ndGhgIGluIG9yZGVyIHRvIGNvbnZlcnQgaXQgdG8gYW5vdGhlciB0eXBlZCBhcnJheXMgaW5jbHVkaW5nIE5vZGVKUyBgQnVmZmVyYC5cbiAqL1xuZnVuY3Rpb24gZW5jb2RlKHZhbHVlLCBvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMgPT09IHZvaWQgMCkgeyBvcHRpb25zID0gZGVmYXVsdEVuY29kZU9wdGlvbnM7IH1cbiAgICB2YXIgZW5jb2RlciA9IG5ldyBfRW5jb2Rlcl9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5FbmNvZGVyKG9wdGlvbnMuZXh0ZW5zaW9uQ29kZWMsIG9wdGlvbnMuY29udGV4dCwgb3B0aW9ucy5tYXhEZXB0aCwgb3B0aW9ucy5pbml0aWFsQnVmZmVyU2l6ZSwgb3B0aW9ucy5zb3J0S2V5cywgb3B0aW9ucy5mb3JjZUZsb2F0MzIsIG9wdGlvbnMuaWdub3JlVW5kZWZpbmVkLCBvcHRpb25zLmZvcmNlSW50ZWdlclRvRmxvYXQpO1xuICAgIHJldHVybiBlbmNvZGVyLmVuY29kZVNoYXJlZFJlZih2YWx1ZSk7XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD1lbmNvZGUubWpzLm1hcFxuXG4vKioqLyB9KSxcblxuLyoqKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS90aW1lc3RhbXAubWpzXCI6XG4vKiEqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiohKlxcXG4gICEqKiogLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vdGltZXN0YW1wLm1qcyAqKiohXG4gIFxcKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuLyoqKi8gKChfX3VudXNlZF93ZWJwYWNrX19fd2VicGFja19tb2R1bGVfXywgX193ZWJwYWNrX2V4cG9ydHNfXywgX193ZWJwYWNrX3JlcXVpcmVfXykgPT4ge1xuXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIoX193ZWJwYWNrX2V4cG9ydHNfXyk7XG4vKiBoYXJtb255IGV4cG9ydCAqLyBfX3dlYnBhY2tfcmVxdWlyZV9fLmQoX193ZWJwYWNrX2V4cG9ydHNfXywge1xuLyogaGFybW9ueSBleHBvcnQgKi8gICBFWFRfVElNRVNUQU1QOiAoKSA9PiAoLyogYmluZGluZyAqLyBFWFRfVElNRVNUQU1QKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgZGVjb2RlVGltZXN0YW1wRXh0ZW5zaW9uOiAoKSA9PiAoLyogYmluZGluZyAqLyBkZWNvZGVUaW1lc3RhbXBFeHRlbnNpb24pLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBkZWNvZGVUaW1lc3RhbXBUb1RpbWVTcGVjOiAoKSA9PiAoLyogYmluZGluZyAqLyBkZWNvZGVUaW1lc3RhbXBUb1RpbWVTcGVjKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgZW5jb2RlRGF0ZVRvVGltZVNwZWM6ICgpID0+ICgvKiBiaW5kaW5nICovIGVuY29kZURhdGVUb1RpbWVTcGVjKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgZW5jb2RlVGltZVNwZWNUb1RpbWVzdGFtcDogKCkgPT4gKC8qIGJpbmRpbmcgKi8gZW5jb2RlVGltZVNwZWNUb1RpbWVzdGFtcCksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIGVuY29kZVRpbWVzdGFtcEV4dGVuc2lvbjogKCkgPT4gKC8qIGJpbmRpbmcgKi8gZW5jb2RlVGltZXN0YW1wRXh0ZW5zaW9uKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgdGltZXN0YW1wRXh0ZW5zaW9uOiAoKSA9PiAoLyogYmluZGluZyAqLyB0aW1lc3RhbXBFeHRlbnNpb24pXG4vKiBoYXJtb255IGV4cG9ydCAqLyB9KTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfRGVjb2RlRXJyb3JfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL0RlY29kZUVycm9yLm1qcyAqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL0RlY29kZUVycm9yLm1qc1wiKTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfdXRpbHNfaW50X21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgLi91dGlscy9pbnQubWpzICovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vdXRpbHMvaW50Lm1qc1wiKTtcbi8vIGh0dHBzOi8vZ2l0aHViLmNvbS9tc2dwYWNrL21zZ3BhY2svYmxvYi9tYXN0ZXIvc3BlYy5tZCN0aW1lc3RhbXAtZXh0ZW5zaW9uLXR5cGVcblxuXG52YXIgRVhUX1RJTUVTVEFNUCA9IC0xO1xudmFyIFRJTUVTVEFNUDMyX01BWF9TRUMgPSAweDEwMDAwMDAwMCAtIDE7IC8vIDMyLWJpdCB1bnNpZ25lZCBpbnRcbnZhciBUSU1FU1RBTVA2NF9NQVhfU0VDID0gMHg0MDAwMDAwMDAgLSAxOyAvLyAzNC1iaXQgdW5zaWduZWQgaW50XG5mdW5jdGlvbiBlbmNvZGVUaW1lU3BlY1RvVGltZXN0YW1wKF9hKSB7XG4gICAgdmFyIHNlYyA9IF9hLnNlYywgbnNlYyA9IF9hLm5zZWM7XG4gICAgaWYgKHNlYyA+PSAwICYmIG5zZWMgPj0gMCAmJiBzZWMgPD0gVElNRVNUQU1QNjRfTUFYX1NFQykge1xuICAgICAgICAvLyBIZXJlIHNlYyA+PSAwICYmIG5zZWMgPj0gMFxuICAgICAgICBpZiAobnNlYyA9PT0gMCAmJiBzZWMgPD0gVElNRVNUQU1QMzJfTUFYX1NFQykge1xuICAgICAgICAgICAgLy8gdGltZXN0YW1wIDMyID0geyBzZWMzMiAodW5zaWduZWQpIH1cbiAgICAgICAgICAgIHZhciBydiA9IG5ldyBVaW50OEFycmF5KDQpO1xuICAgICAgICAgICAgdmFyIHZpZXcgPSBuZXcgRGF0YVZpZXcocnYuYnVmZmVyKTtcbiAgICAgICAgICAgIHZpZXcuc2V0VWludDMyKDAsIHNlYyk7XG4gICAgICAgICAgICByZXR1cm4gcnY7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyB0aW1lc3RhbXAgNjQgPSB7IG5zZWMzMCAodW5zaWduZWQpLCBzZWMzNCAodW5zaWduZWQpIH1cbiAgICAgICAgICAgIHZhciBzZWNIaWdoID0gc2VjIC8gMHgxMDAwMDAwMDA7XG4gICAgICAgICAgICB2YXIgc2VjTG93ID0gc2VjICYgMHhmZmZmZmZmZjtcbiAgICAgICAgICAgIHZhciBydiA9IG5ldyBVaW50OEFycmF5KDgpO1xuICAgICAgICAgICAgdmFyIHZpZXcgPSBuZXcgRGF0YVZpZXcocnYuYnVmZmVyKTtcbiAgICAgICAgICAgIC8vIG5zZWMzMCB8IHNlY0hpZ2gyXG4gICAgICAgICAgICB2aWV3LnNldFVpbnQzMigwLCAobnNlYyA8PCAyKSB8IChzZWNIaWdoICYgMHgzKSk7XG4gICAgICAgICAgICAvLyBzZWNMb3czMlxuICAgICAgICAgICAgdmlldy5zZXRVaW50MzIoNCwgc2VjTG93KTtcbiAgICAgICAgICAgIHJldHVybiBydjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgLy8gdGltZXN0YW1wIDk2ID0geyBuc2VjMzIgKHVuc2lnbmVkKSwgc2VjNjQgKHNpZ25lZCkgfVxuICAgICAgICB2YXIgcnYgPSBuZXcgVWludDhBcnJheSgxMik7XG4gICAgICAgIHZhciB2aWV3ID0gbmV3IERhdGFWaWV3KHJ2LmJ1ZmZlcik7XG4gICAgICAgIHZpZXcuc2V0VWludDMyKDAsIG5zZWMpO1xuICAgICAgICAoMCxfdXRpbHNfaW50X21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLnNldEludDY0KSh2aWV3LCA0LCBzZWMpO1xuICAgICAgICByZXR1cm4gcnY7XG4gICAgfVxufVxuZnVuY3Rpb24gZW5jb2RlRGF0ZVRvVGltZVNwZWMoZGF0ZSkge1xuICAgIHZhciBtc2VjID0gZGF0ZS5nZXRUaW1lKCk7XG4gICAgdmFyIHNlYyA9IE1hdGguZmxvb3IobXNlYyAvIDFlMyk7XG4gICAgdmFyIG5zZWMgPSAobXNlYyAtIHNlYyAqIDFlMykgKiAxZTY7XG4gICAgLy8gTm9ybWFsaXplcyB7IHNlYywgbnNlYyB9IHRvIGVuc3VyZSBuc2VjIGlzIHVuc2lnbmVkLlxuICAgIHZhciBuc2VjSW5TZWMgPSBNYXRoLmZsb29yKG5zZWMgLyAxZTkpO1xuICAgIHJldHVybiB7XG4gICAgICAgIHNlYzogc2VjICsgbnNlY0luU2VjLFxuICAgICAgICBuc2VjOiBuc2VjIC0gbnNlY0luU2VjICogMWU5LFxuICAgIH07XG59XG5mdW5jdGlvbiBlbmNvZGVUaW1lc3RhbXBFeHRlbnNpb24ob2JqZWN0KSB7XG4gICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgICAgdmFyIHRpbWVTcGVjID0gZW5jb2RlRGF0ZVRvVGltZVNwZWMob2JqZWN0KTtcbiAgICAgICAgcmV0dXJuIGVuY29kZVRpbWVTcGVjVG9UaW1lc3RhbXAodGltZVNwZWMpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuZnVuY3Rpb24gZGVjb2RlVGltZXN0YW1wVG9UaW1lU3BlYyhkYXRhKSB7XG4gICAgdmFyIHZpZXcgPSBuZXcgRGF0YVZpZXcoZGF0YS5idWZmZXIsIGRhdGEuYnl0ZU9mZnNldCwgZGF0YS5ieXRlTGVuZ3RoKTtcbiAgICAvLyBkYXRhIG1heSBiZSAzMiwgNjQsIG9yIDk2IGJpdHNcbiAgICBzd2l0Y2ggKGRhdGEuYnl0ZUxlbmd0aCkge1xuICAgICAgICBjYXNlIDQ6IHtcbiAgICAgICAgICAgIC8vIHRpbWVzdGFtcCAzMiA9IHsgc2VjMzIgfVxuICAgICAgICAgICAgdmFyIHNlYyA9IHZpZXcuZ2V0VWludDMyKDApO1xuICAgICAgICAgICAgdmFyIG5zZWMgPSAwO1xuICAgICAgICAgICAgcmV0dXJuIHsgc2VjOiBzZWMsIG5zZWM6IG5zZWMgfTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIDg6IHtcbiAgICAgICAgICAgIC8vIHRpbWVzdGFtcCA2NCA9IHsgbnNlYzMwLCBzZWMzNCB9XG4gICAgICAgICAgICB2YXIgbnNlYzMwQW5kU2VjSGlnaDIgPSB2aWV3LmdldFVpbnQzMigwKTtcbiAgICAgICAgICAgIHZhciBzZWNMb3czMiA9IHZpZXcuZ2V0VWludDMyKDQpO1xuICAgICAgICAgICAgdmFyIHNlYyA9IChuc2VjMzBBbmRTZWNIaWdoMiAmIDB4MykgKiAweDEwMDAwMDAwMCArIHNlY0xvdzMyO1xuICAgICAgICAgICAgdmFyIG5zZWMgPSBuc2VjMzBBbmRTZWNIaWdoMiA+Pj4gMjtcbiAgICAgICAgICAgIHJldHVybiB7IHNlYzogc2VjLCBuc2VjOiBuc2VjIH07XG4gICAgICAgIH1cbiAgICAgICAgY2FzZSAxMjoge1xuICAgICAgICAgICAgLy8gdGltZXN0YW1wIDk2ID0geyBuc2VjMzIgKHVuc2lnbmVkKSwgc2VjNjQgKHNpZ25lZCkgfVxuICAgICAgICAgICAgdmFyIHNlYyA9ICgwLF91dGlsc19pbnRfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uZ2V0SW50NjQpKHZpZXcsIDQpO1xuICAgICAgICAgICAgdmFyIG5zZWMgPSB2aWV3LmdldFVpbnQzMigwKTtcbiAgICAgICAgICAgIHJldHVybiB7IHNlYzogc2VjLCBuc2VjOiBuc2VjIH07XG4gICAgICAgIH1cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBfRGVjb2RlRXJyb3JfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18uRGVjb2RlRXJyb3IoXCJVbnJlY29nbml6ZWQgZGF0YSBzaXplIGZvciB0aW1lc3RhbXAgKGV4cGVjdGVkIDQsIDgsIG9yIDEyKTogXCIuY29uY2F0KGRhdGEubGVuZ3RoKSk7XG4gICAgfVxufVxuZnVuY3Rpb24gZGVjb2RlVGltZXN0YW1wRXh0ZW5zaW9uKGRhdGEpIHtcbiAgICB2YXIgdGltZVNwZWMgPSBkZWNvZGVUaW1lc3RhbXBUb1RpbWVTcGVjKGRhdGEpO1xuICAgIHJldHVybiBuZXcgRGF0ZSh0aW1lU3BlYy5zZWMgKiAxZTMgKyB0aW1lU3BlYy5uc2VjIC8gMWU2KTtcbn1cbnZhciB0aW1lc3RhbXBFeHRlbnNpb24gPSB7XG4gICAgdHlwZTogRVhUX1RJTUVTVEFNUCxcbiAgICBlbmNvZGU6IGVuY29kZVRpbWVzdGFtcEV4dGVuc2lvbixcbiAgICBkZWNvZGU6IGRlY29kZVRpbWVzdGFtcEV4dGVuc2lvbixcbn07XG4vLyMgc291cmNlTWFwcGluZ1VSTD10aW1lc3RhbXAubWpzLm1hcFxuXG4vKioqLyB9KSxcblxuLyoqKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS91dGlscy9pbnQubWpzXCI6XG4vKiEqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiohKlxcXG4gICEqKiogLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vdXRpbHMvaW50Lm1qcyAqKiohXG4gIFxcKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuLyoqKi8gKChfX3VudXNlZF93ZWJwYWNrX19fd2VicGFja19tb2R1bGVfXywgX193ZWJwYWNrX2V4cG9ydHNfXywgX193ZWJwYWNrX3JlcXVpcmVfXykgPT4ge1xuXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIoX193ZWJwYWNrX2V4cG9ydHNfXyk7XG4vKiBoYXJtb255IGV4cG9ydCAqLyBfX3dlYnBhY2tfcmVxdWlyZV9fLmQoX193ZWJwYWNrX2V4cG9ydHNfXywge1xuLyogaGFybW9ueSBleHBvcnQgKi8gICBVSU5UMzJfTUFYOiAoKSA9PiAoLyogYmluZGluZyAqLyBVSU5UMzJfTUFYKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgZ2V0SW50NjQ6ICgpID0+ICgvKiBiaW5kaW5nICovIGdldEludDY0KSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgZ2V0VWludDY0OiAoKSA9PiAoLyogYmluZGluZyAqLyBnZXRVaW50NjQpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBzZXRJbnQ2NDogKCkgPT4gKC8qIGJpbmRpbmcgKi8gc2V0SW50NjQpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBzZXRVaW50NjQ6ICgpID0+ICgvKiBiaW5kaW5nICovIHNldFVpbnQ2NClcbi8qIGhhcm1vbnkgZXhwb3J0ICovIH0pO1xuLy8gSW50ZWdlciBVdGlsaXR5XG52YXIgVUlOVDMyX01BWCA9IDQyOTQ5NjcyOTU7XG4vLyBEYXRhVmlldyBleHRlbnNpb24gdG8gaGFuZGxlIGludDY0IC8gdWludDY0LFxuLy8gd2hlcmUgdGhlIGFjdHVhbCByYW5nZSBpcyA1My1iaXRzIGludGVnZXIgKGEuay5hLiBzYWZlIGludGVnZXIpXG5mdW5jdGlvbiBzZXRVaW50NjQodmlldywgb2Zmc2V0LCB2YWx1ZSkge1xuICAgIHZhciBoaWdoID0gdmFsdWUgLyA0Mjk0OTY3Mjk2O1xuICAgIHZhciBsb3cgPSB2YWx1ZTsgLy8gaGlnaCBiaXRzIGFyZSB0cnVuY2F0ZWQgYnkgRGF0YVZpZXdcbiAgICB2aWV3LnNldFVpbnQzMihvZmZzZXQsIGhpZ2gpO1xuICAgIHZpZXcuc2V0VWludDMyKG9mZnNldCArIDQsIGxvdyk7XG59XG5mdW5jdGlvbiBzZXRJbnQ2NCh2aWV3LCBvZmZzZXQsIHZhbHVlKSB7XG4gICAgdmFyIGhpZ2ggPSBNYXRoLmZsb29yKHZhbHVlIC8gNDI5NDk2NzI5Nik7XG4gICAgdmFyIGxvdyA9IHZhbHVlOyAvLyBoaWdoIGJpdHMgYXJlIHRydW5jYXRlZCBieSBEYXRhVmlld1xuICAgIHZpZXcuc2V0VWludDMyKG9mZnNldCwgaGlnaCk7XG4gICAgdmlldy5zZXRVaW50MzIob2Zmc2V0ICsgNCwgbG93KTtcbn1cbmZ1bmN0aW9uIGdldEludDY0KHZpZXcsIG9mZnNldCkge1xuICAgIHZhciBoaWdoID0gdmlldy5nZXRJbnQzMihvZmZzZXQpO1xuICAgIHZhciBsb3cgPSB2aWV3LmdldFVpbnQzMihvZmZzZXQgKyA0KTtcbiAgICByZXR1cm4gaGlnaCAqIDQyOTQ5NjcyOTYgKyBsb3c7XG59XG5mdW5jdGlvbiBnZXRVaW50NjQodmlldywgb2Zmc2V0KSB7XG4gICAgdmFyIGhpZ2ggPSB2aWV3LmdldFVpbnQzMihvZmZzZXQpO1xuICAgIHZhciBsb3cgPSB2aWV3LmdldFVpbnQzMihvZmZzZXQgKyA0KTtcbiAgICByZXR1cm4gaGlnaCAqIDQyOTQ5NjcyOTYgKyBsb3c7XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbnQubWpzLm1hcFxuXG4vKioqLyB9KSxcblxuLyoqKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS91dGlscy9wcmV0dHlCeXRlLm1qc1wiOlxuLyohKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiEqXFxcbiAgISoqKiAuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS91dGlscy9wcmV0dHlCeXRlLm1qcyAqKiohXG4gIFxcKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qKiovICgoX191bnVzZWRfd2VicGFja19fX3dlYnBhY2tfbW9kdWxlX18sIF9fd2VicGFja19leHBvcnRzX18sIF9fd2VicGFja19yZXF1aXJlX18pID0+IHtcblxuX193ZWJwYWNrX3JlcXVpcmVfXy5yKF9fd2VicGFja19leHBvcnRzX18pO1xuLyogaGFybW9ueSBleHBvcnQgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIHtcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgcHJldHR5Qnl0ZTogKCkgPT4gKC8qIGJpbmRpbmcgKi8gcHJldHR5Qnl0ZSlcbi8qIGhhcm1vbnkgZXhwb3J0ICovIH0pO1xuZnVuY3Rpb24gcHJldHR5Qnl0ZShieXRlKSB7XG4gICAgcmV0dXJuIFwiXCIuY29uY2F0KGJ5dGUgPCAwID8gXCItXCIgOiBcIlwiLCBcIjB4XCIpLmNvbmNhdChNYXRoLmFicyhieXRlKS50b1N0cmluZygxNikucGFkU3RhcnQoMiwgXCIwXCIpKTtcbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXByZXR0eUJ5dGUubWpzLm1hcFxuXG4vKioqLyB9KSxcblxuLyoqKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS91dGlscy90eXBlZEFycmF5cy5tanNcIjpcbi8qISoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqISpcXFxuICAhKioqIC4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL3V0aWxzL3R5cGVkQXJyYXlzLm1qcyAqKiohXG4gIFxcKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKioqLyAoKF9fdW51c2VkX3dlYnBhY2tfX193ZWJwYWNrX21vZHVsZV9fLCBfX3dlYnBhY2tfZXhwb3J0c19fLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSA9PiB7XG5cbl9fd2VicGFja19yZXF1aXJlX18ucihfX3dlYnBhY2tfZXhwb3J0c19fKTtcbi8qIGhhcm1vbnkgZXhwb3J0ICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCB7XG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIGNyZWF0ZURhdGFWaWV3OiAoKSA9PiAoLyogYmluZGluZyAqLyBjcmVhdGVEYXRhVmlldyksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIGVuc3VyZVVpbnQ4QXJyYXk6ICgpID0+ICgvKiBiaW5kaW5nICovIGVuc3VyZVVpbnQ4QXJyYXkpXG4vKiBoYXJtb255IGV4cG9ydCAqLyB9KTtcbmZ1bmN0aW9uIGVuc3VyZVVpbnQ4QXJyYXkoYnVmZmVyKSB7XG4gICAgaWYgKGJ1ZmZlciBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIGJ1ZmZlcjtcbiAgICB9XG4gICAgZWxzZSBpZiAoQXJyYXlCdWZmZXIuaXNWaWV3KGJ1ZmZlcikpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGJ1ZmZlci5idWZmZXIsIGJ1ZmZlci5ieXRlT2Zmc2V0LCBidWZmZXIuYnl0ZUxlbmd0aCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKGJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICAgIHJldHVybiBuZXcgVWludDhBcnJheShidWZmZXIpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgLy8gQXJyYXlMaWtlPG51bWJlcj5cbiAgICAgICAgcmV0dXJuIFVpbnQ4QXJyYXkuZnJvbShidWZmZXIpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGNyZWF0ZURhdGFWaWV3KGJ1ZmZlcikge1xuICAgIGlmIChidWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgICByZXR1cm4gbmV3IERhdGFWaWV3KGJ1ZmZlcik7XG4gICAgfVxuICAgIHZhciBidWZmZXJWaWV3ID0gZW5zdXJlVWludDhBcnJheShidWZmZXIpO1xuICAgIHJldHVybiBuZXcgRGF0YVZpZXcoYnVmZmVyVmlldy5idWZmZXIsIGJ1ZmZlclZpZXcuYnl0ZU9mZnNldCwgYnVmZmVyVmlldy5ieXRlTGVuZ3RoKTtcbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXR5cGVkQXJyYXlzLm1qcy5tYXBcblxuLyoqKi8gfSksXG5cbi8qKiovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vdXRpbHMvdXRmOC5tanNcIjpcbi8qISoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiohKlxcXG4gICEqKiogLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vdXRpbHMvdXRmOC5tanMgKioqIVxuICBcXCoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKioqLyAoKF9fdW51c2VkX3dlYnBhY2tfX193ZWJwYWNrX21vZHVsZV9fLCBfX3dlYnBhY2tfZXhwb3J0c19fLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSA9PiB7XG5cbl9fd2VicGFja19yZXF1aXJlX18ucihfX3dlYnBhY2tfZXhwb3J0c19fKTtcbi8qIGhhcm1vbnkgZXhwb3J0ICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCB7XG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIFRFWFRfREVDT0RFUl9USFJFU0hPTEQ6ICgpID0+ICgvKiBiaW5kaW5nICovIFRFWFRfREVDT0RFUl9USFJFU0hPTEQpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBURVhUX0VOQ09ERVJfVEhSRVNIT0xEOiAoKSA9PiAoLyogYmluZGluZyAqLyBURVhUX0VOQ09ERVJfVEhSRVNIT0xEKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgdXRmOENvdW50OiAoKSA9PiAoLyogYmluZGluZyAqLyB1dGY4Q291bnQpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICB1dGY4RGVjb2RlSnM6ICgpID0+ICgvKiBiaW5kaW5nICovIHV0ZjhEZWNvZGVKcyksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIHV0ZjhEZWNvZGVURDogKCkgPT4gKC8qIGJpbmRpbmcgKi8gdXRmOERlY29kZVREKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgdXRmOEVuY29kZUpzOiAoKSA9PiAoLyogYmluZGluZyAqLyB1dGY4RW5jb2RlSnMpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICB1dGY4RW5jb2RlVEU6ICgpID0+ICgvKiBiaW5kaW5nICovIHV0ZjhFbmNvZGVURSlcbi8qIGhhcm1vbnkgZXhwb3J0ICovIH0pO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF9pbnRfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL2ludC5tanMgKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS91dGlscy9pbnQubWpzXCIpO1xudmFyIF9hLCBfYiwgX2M7XG4vKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5uZWNlc3NhcnktY29uZGl0aW9uICovXG5cbnZhciBURVhUX0VOQ09ESU5HX0FWQUlMQUJMRSA9ICh0eXBlb2YgcHJvY2VzcyA9PT0gXCJ1bmRlZmluZWRcIiB8fCAoKF9hID0gcHJvY2VzcyA9PT0gbnVsbCB8fCBwcm9jZXNzID09PSB2b2lkIDAgPyB2b2lkIDAgOiBwcm9jZXNzLmVudikgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hW1wiVEVYVF9FTkNPRElOR1wiXSkgIT09IFwibmV2ZXJcIikgJiZcbiAgICB0eXBlb2YgVGV4dEVuY29kZXIgIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICB0eXBlb2YgVGV4dERlY29kZXIgIT09IFwidW5kZWZpbmVkXCI7XG5mdW5jdGlvbiB1dGY4Q291bnQoc3RyKSB7XG4gICAgdmFyIHN0ckxlbmd0aCA9IHN0ci5sZW5ndGg7XG4gICAgdmFyIGJ5dGVMZW5ndGggPSAwO1xuICAgIHZhciBwb3MgPSAwO1xuICAgIHdoaWxlIChwb3MgPCBzdHJMZW5ndGgpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gc3RyLmNoYXJDb2RlQXQocG9zKyspO1xuICAgICAgICBpZiAoKHZhbHVlICYgMHhmZmZmZmY4MCkgPT09IDApIHtcbiAgICAgICAgICAgIC8vIDEtYnl0ZVxuICAgICAgICAgICAgYnl0ZUxlbmd0aCsrO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoKHZhbHVlICYgMHhmZmZmZjgwMCkgPT09IDApIHtcbiAgICAgICAgICAgIC8vIDItYnl0ZXNcbiAgICAgICAgICAgIGJ5dGVMZW5ndGggKz0gMjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIGhhbmRsZSBzdXJyb2dhdGUgcGFpclxuICAgICAgICAgICAgaWYgKHZhbHVlID49IDB4ZDgwMCAmJiB2YWx1ZSA8PSAweGRiZmYpIHtcbiAgICAgICAgICAgICAgICAvLyBoaWdoIHN1cnJvZ2F0ZVxuICAgICAgICAgICAgICAgIGlmIChwb3MgPCBzdHJMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGV4dHJhID0gc3RyLmNoYXJDb2RlQXQocG9zKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChleHRyYSAmIDB4ZmMwMCkgPT09IDB4ZGMwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytwb3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9ICgodmFsdWUgJiAweDNmZikgPDwgMTApICsgKGV4dHJhICYgMHgzZmYpICsgMHgxMDAwMDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgodmFsdWUgJiAweGZmZmYwMDAwKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIC8vIDMtYnl0ZVxuICAgICAgICAgICAgICAgIGJ5dGVMZW5ndGggKz0gMztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIDQtYnl0ZVxuICAgICAgICAgICAgICAgIGJ5dGVMZW5ndGggKz0gNDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYnl0ZUxlbmd0aDtcbn1cbmZ1bmN0aW9uIHV0ZjhFbmNvZGVKcyhzdHIsIG91dHB1dCwgb3V0cHV0T2Zmc2V0KSB7XG4gICAgdmFyIHN0ckxlbmd0aCA9IHN0ci5sZW5ndGg7XG4gICAgdmFyIG9mZnNldCA9IG91dHB1dE9mZnNldDtcbiAgICB2YXIgcG9zID0gMDtcbiAgICB3aGlsZSAocG9zIDwgc3RyTGVuZ3RoKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHN0ci5jaGFyQ29kZUF0KHBvcysrKTtcbiAgICAgICAgaWYgKCh2YWx1ZSAmIDB4ZmZmZmZmODApID09PSAwKSB7XG4gICAgICAgICAgICAvLyAxLWJ5dGVcbiAgICAgICAgICAgIG91dHB1dFtvZmZzZXQrK10gPSB2YWx1ZTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKCh2YWx1ZSAmIDB4ZmZmZmY4MDApID09PSAwKSB7XG4gICAgICAgICAgICAvLyAyLWJ5dGVzXG4gICAgICAgICAgICBvdXRwdXRbb2Zmc2V0KytdID0gKCh2YWx1ZSA+PiA2KSAmIDB4MWYpIHwgMHhjMDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIGhhbmRsZSBzdXJyb2dhdGUgcGFpclxuICAgICAgICAgICAgaWYgKHZhbHVlID49IDB4ZDgwMCAmJiB2YWx1ZSA8PSAweGRiZmYpIHtcbiAgICAgICAgICAgICAgICAvLyBoaWdoIHN1cnJvZ2F0ZVxuICAgICAgICAgICAgICAgIGlmIChwb3MgPCBzdHJMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGV4dHJhID0gc3RyLmNoYXJDb2RlQXQocG9zKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChleHRyYSAmIDB4ZmMwMCkgPT09IDB4ZGMwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytwb3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9ICgodmFsdWUgJiAweDNmZikgPDwgMTApICsgKGV4dHJhICYgMHgzZmYpICsgMHgxMDAwMDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgodmFsdWUgJiAweGZmZmYwMDAwKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIC8vIDMtYnl0ZVxuICAgICAgICAgICAgICAgIG91dHB1dFtvZmZzZXQrK10gPSAoKHZhbHVlID4+IDEyKSAmIDB4MGYpIHwgMHhlMDtcbiAgICAgICAgICAgICAgICBvdXRwdXRbb2Zmc2V0KytdID0gKCh2YWx1ZSA+PiA2KSAmIDB4M2YpIHwgMHg4MDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIDQtYnl0ZVxuICAgICAgICAgICAgICAgIG91dHB1dFtvZmZzZXQrK10gPSAoKHZhbHVlID4+IDE4KSAmIDB4MDcpIHwgMHhmMDtcbiAgICAgICAgICAgICAgICBvdXRwdXRbb2Zmc2V0KytdID0gKCh2YWx1ZSA+PiAxMikgJiAweDNmKSB8IDB4ODA7XG4gICAgICAgICAgICAgICAgb3V0cHV0W29mZnNldCsrXSA9ICgodmFsdWUgPj4gNikgJiAweDNmKSB8IDB4ODA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgb3V0cHV0W29mZnNldCsrXSA9ICh2YWx1ZSAmIDB4M2YpIHwgMHg4MDtcbiAgICB9XG59XG52YXIgc2hhcmVkVGV4dEVuY29kZXIgPSBURVhUX0VOQ09ESU5HX0FWQUlMQUJMRSA/IG5ldyBUZXh0RW5jb2RlcigpIDogdW5kZWZpbmVkO1xudmFyIFRFWFRfRU5DT0RFUl9USFJFU0hPTEQgPSAhVEVYVF9FTkNPRElOR19BVkFJTEFCTEVcbiAgICA/IF9pbnRfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uVUlOVDMyX01BWFxuICAgIDogdHlwZW9mIHByb2Nlc3MgIT09IFwidW5kZWZpbmVkXCIgJiYgKChfYiA9IHByb2Nlc3MgPT09IG51bGwgfHwgcHJvY2VzcyA9PT0gdm9pZCAwID8gdm9pZCAwIDogcHJvY2Vzcy5lbnYpID09PSBudWxsIHx8IF9iID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYltcIlRFWFRfRU5DT0RJTkdcIl0pICE9PSBcImZvcmNlXCJcbiAgICAgICAgPyAyMDBcbiAgICAgICAgOiAwO1xuZnVuY3Rpb24gdXRmOEVuY29kZVRFZW5jb2RlKHN0ciwgb3V0cHV0LCBvdXRwdXRPZmZzZXQpIHtcbiAgICBvdXRwdXQuc2V0KHNoYXJlZFRleHRFbmNvZGVyLmVuY29kZShzdHIpLCBvdXRwdXRPZmZzZXQpO1xufVxuZnVuY3Rpb24gdXRmOEVuY29kZVRFZW5jb2RlSW50byhzdHIsIG91dHB1dCwgb3V0cHV0T2Zmc2V0KSB7XG4gICAgc2hhcmVkVGV4dEVuY29kZXIuZW5jb2RlSW50byhzdHIsIG91dHB1dC5zdWJhcnJheShvdXRwdXRPZmZzZXQpKTtcbn1cbnZhciB1dGY4RW5jb2RlVEUgPSAoc2hhcmVkVGV4dEVuY29kZXIgPT09IG51bGwgfHwgc2hhcmVkVGV4dEVuY29kZXIgPT09IHZvaWQgMCA/IHZvaWQgMCA6IHNoYXJlZFRleHRFbmNvZGVyLmVuY29kZUludG8pID8gdXRmOEVuY29kZVRFZW5jb2RlSW50byA6IHV0ZjhFbmNvZGVURWVuY29kZTtcbnZhciBDSFVOS19TSVpFID0gNDA5NjtcbmZ1bmN0aW9uIHV0ZjhEZWNvZGVKcyhieXRlcywgaW5wdXRPZmZzZXQsIGJ5dGVMZW5ndGgpIHtcbiAgICB2YXIgb2Zmc2V0ID0gaW5wdXRPZmZzZXQ7XG4gICAgdmFyIGVuZCA9IG9mZnNldCArIGJ5dGVMZW5ndGg7XG4gICAgdmFyIHVuaXRzID0gW107XG4gICAgdmFyIHJlc3VsdCA9IFwiXCI7XG4gICAgd2hpbGUgKG9mZnNldCA8IGVuZCkge1xuICAgICAgICB2YXIgYnl0ZTEgPSBieXRlc1tvZmZzZXQrK107XG4gICAgICAgIGlmICgoYnl0ZTEgJiAweDgwKSA9PT0gMCkge1xuICAgICAgICAgICAgLy8gMSBieXRlXG4gICAgICAgICAgICB1bml0cy5wdXNoKGJ5dGUxKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICgoYnl0ZTEgJiAweGUwKSA9PT0gMHhjMCkge1xuICAgICAgICAgICAgLy8gMiBieXRlc1xuICAgICAgICAgICAgdmFyIGJ5dGUyID0gYnl0ZXNbb2Zmc2V0KytdICYgMHgzZjtcbiAgICAgICAgICAgIHVuaXRzLnB1c2goKChieXRlMSAmIDB4MWYpIDw8IDYpIHwgYnl0ZTIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKChieXRlMSAmIDB4ZjApID09PSAweGUwKSB7XG4gICAgICAgICAgICAvLyAzIGJ5dGVzXG4gICAgICAgICAgICB2YXIgYnl0ZTIgPSBieXRlc1tvZmZzZXQrK10gJiAweDNmO1xuICAgICAgICAgICAgdmFyIGJ5dGUzID0gYnl0ZXNbb2Zmc2V0KytdICYgMHgzZjtcbiAgICAgICAgICAgIHVuaXRzLnB1c2goKChieXRlMSAmIDB4MWYpIDw8IDEyKSB8IChieXRlMiA8PCA2KSB8IGJ5dGUzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICgoYnl0ZTEgJiAweGY4KSA9PT0gMHhmMCkge1xuICAgICAgICAgICAgLy8gNCBieXRlc1xuICAgICAgICAgICAgdmFyIGJ5dGUyID0gYnl0ZXNbb2Zmc2V0KytdICYgMHgzZjtcbiAgICAgICAgICAgIHZhciBieXRlMyA9IGJ5dGVzW29mZnNldCsrXSAmIDB4M2Y7XG4gICAgICAgICAgICB2YXIgYnl0ZTQgPSBieXRlc1tvZmZzZXQrK10gJiAweDNmO1xuICAgICAgICAgICAgdmFyIHVuaXQgPSAoKGJ5dGUxICYgMHgwNykgPDwgMHgxMikgfCAoYnl0ZTIgPDwgMHgwYykgfCAoYnl0ZTMgPDwgMHgwNikgfCBieXRlNDtcbiAgICAgICAgICAgIGlmICh1bml0ID4gMHhmZmZmKSB7XG4gICAgICAgICAgICAgICAgdW5pdCAtPSAweDEwMDAwO1xuICAgICAgICAgICAgICAgIHVuaXRzLnB1c2goKCh1bml0ID4+PiAxMCkgJiAweDNmZikgfCAweGQ4MDApO1xuICAgICAgICAgICAgICAgIHVuaXQgPSAweGRjMDAgfCAodW5pdCAmIDB4M2ZmKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHVuaXRzLnB1c2godW5pdCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB1bml0cy5wdXNoKGJ5dGUxKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodW5pdHMubGVuZ3RoID49IENIVU5LX1NJWkUpIHtcbiAgICAgICAgICAgIHJlc3VsdCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgdW5pdHMpO1xuICAgICAgICAgICAgdW5pdHMubGVuZ3RoID0gMDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAodW5pdHMubGVuZ3RoID4gMCkge1xuICAgICAgICByZXN1bHQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIHVuaXRzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cbnZhciBzaGFyZWRUZXh0RGVjb2RlciA9IFRFWFRfRU5DT0RJTkdfQVZBSUxBQkxFID8gbmV3IFRleHREZWNvZGVyKCkgOiBudWxsO1xudmFyIFRFWFRfREVDT0RFUl9USFJFU0hPTEQgPSAhVEVYVF9FTkNPRElOR19BVkFJTEFCTEVcbiAgICA/IF9pbnRfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uVUlOVDMyX01BWFxuICAgIDogdHlwZW9mIHByb2Nlc3MgIT09IFwidW5kZWZpbmVkXCIgJiYgKChfYyA9IHByb2Nlc3MgPT09IG51bGwgfHwgcHJvY2VzcyA9PT0gdm9pZCAwID8gdm9pZCAwIDogcHJvY2Vzcy5lbnYpID09PSBudWxsIHx8IF9jID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfY1tcIlRFWFRfREVDT0RFUlwiXSkgIT09IFwiZm9yY2VcIlxuICAgICAgICA/IDIwMFxuICAgICAgICA6IDA7XG5mdW5jdGlvbiB1dGY4RGVjb2RlVEQoYnl0ZXMsIGlucHV0T2Zmc2V0LCBieXRlTGVuZ3RoKSB7XG4gICAgdmFyIHN0cmluZ0J5dGVzID0gYnl0ZXMuc3ViYXJyYXkoaW5wdXRPZmZzZXQsIGlucHV0T2Zmc2V0ICsgYnl0ZUxlbmd0aCk7XG4gICAgcmV0dXJuIHNoYXJlZFRleHREZWNvZGVyLmRlY29kZShzdHJpbmdCeXRlcyk7XG59XG4vLyMgc291cmNlTWFwcGluZ1VSTD11dGY4Lm1qcy5tYXBcblxuLyoqKi8gfSlcblxuLyoqKioqKi8gXHR9KTtcbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKioqKioqLyBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbi8qKioqKiovIFx0dmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuLyoqKioqKi8gXHRcbi8qKioqKiovIFx0Ly8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbi8qKioqKiovIFx0ZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuLyoqKioqKi8gXHRcdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuLyoqKioqKi8gXHRcdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuLyoqKioqKi8gXHRcdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuLyoqKioqKi8gXHRcdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuLyoqKioqKi8gXHRcdH1cbi8qKioqKiovIFx0XHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuLyoqKioqKi8gXHRcdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuLyoqKioqKi8gXHRcdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuLyoqKioqKi8gXHRcdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcbi8qKioqKiovIFx0XHRcdGV4cG9ydHM6IHt9XG4vKioqKioqLyBcdFx0fTtcbi8qKioqKiovIFx0XG4vKioqKioqLyBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4vKioqKioqLyBcdFx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG4vKioqKioqLyBcdFxuLyoqKioqKi8gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4vKioqKioqLyBcdFx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuLyoqKioqKi8gXHR9XG4vKioqKioqLyBcdFxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qKioqKiovIFx0Lyogd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzICovXG4vKioqKioqLyBcdCgoKSA9PiB7XG4vKioqKioqLyBcdFx0Ly8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuLyoqKioqKi8gXHRcdF9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG4vKioqKioqLyBcdFx0XHRmb3IodmFyIGtleSBpbiBkZWZpbml0aW9uKSB7XG4vKioqKioqLyBcdFx0XHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuLyoqKioqKi8gXHRcdFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG4vKioqKioqLyBcdFx0XHRcdH1cbi8qKioqKiovIFx0XHRcdH1cbi8qKioqKiovIFx0XHR9O1xuLyoqKioqKi8gXHR9KSgpO1xuLyoqKioqKi8gXHRcbi8qKioqKiovIFx0Lyogd2VicGFjay9ydW50aW1lL2hhc093blByb3BlcnR5IHNob3J0aGFuZCAqL1xuLyoqKioqKi8gXHQoKCkgPT4ge1xuLyoqKioqKi8gXHRcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IChvYmosIHByb3ApID0+IChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSlcbi8qKioqKiovIFx0fSkoKTtcbi8qKioqKiovIFx0XG4vKioqKioqLyBcdC8qIHdlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QgKi9cbi8qKioqKiovIFx0KCgpID0+IHtcbi8qKioqKiovIFx0XHQvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG4vKioqKioqLyBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcbi8qKioqKiovIFx0XHRcdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuLyoqKioqKi8gXHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcbi8qKioqKiovIFx0XHRcdH1cbi8qKioqKiovIFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG4vKioqKioqLyBcdFx0fTtcbi8qKioqKiovIFx0fSkoKTtcbi8qKioqKiovIFx0XG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xudmFyIF9fd2VicGFja19leHBvcnRzX18gPSB7fTtcbi8qISoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiEqXFxcbiAgISoqKiAuL3NyYy93ZWJzb2NrZXQtY2xpZW50LmpzICoqKiFcbiAgXFwqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIoX193ZWJwYWNrX2V4cG9ydHNfXyk7XG4vKiBoYXJtb255IGV4cG9ydCAqLyBfX3dlYnBhY2tfcmVxdWlyZV9fLmQoX193ZWJwYWNrX2V4cG9ydHNfXywge1xuLyogaGFybW9ueSBleHBvcnQgKi8gICBBUElfVkVSU0lPTjogKCkgPT4gKC8qIHJlZXhwb3J0IHNhZmUgKi8gX3JwY19qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLkFQSV9WRVJTSU9OKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgTG9jYWxXZWJTb2NrZXQ6ICgpID0+ICgvKiBiaW5kaW5nICovIExvY2FsV2ViU29ja2V0KSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgUlBDOiAoKSA9PiAoLyogcmVleHBvcnQgc2FmZSAqLyBfcnBjX2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uUlBDKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgY29ubmVjdFRvU2VydmVyOiAoKSA9PiAoLyogYmluZGluZyAqLyBjb25uZWN0VG9TZXJ2ZXIpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBnZXRSVENTZXJ2aWNlOiAoKSA9PiAoLyogcmVleHBvcnQgc2FmZSAqLyBfd2VicnRjX2NsaWVudF9qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfM19fLmdldFJUQ1NlcnZpY2UpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBnZXRSZW1vdGVTZXJ2aWNlOiAoKSA9PiAoLyogYmluZGluZyAqLyBnZXRSZW1vdGVTZXJ2aWNlKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgbG9hZFJlcXVpcmVtZW50czogKCkgPT4gKC8qIHJlZXhwb3J0IHNhZmUgKi8gX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18ubG9hZFJlcXVpcmVtZW50cyksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIGxvZ2luOiAoKSA9PiAoLyogYmluZGluZyAqLyBsb2dpbiksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIHJlZ2lzdGVyUlRDU2VydmljZTogKCkgPT4gKC8qIHJlZXhwb3J0IHNhZmUgKi8gX3dlYnJ0Y19jbGllbnRfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzNfXy5yZWdpc3RlclJUQ1NlcnZpY2UpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBzY2hlbWFGdW5jdGlvbjogKCkgPT4gKC8qIHJlZXhwb3J0IHNhZmUgKi8gX3V0aWxzX3NjaGVtYV9qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLnNjaGVtYUZ1bmN0aW9uKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgc2V0dXBMb2NhbENsaWVudDogKCkgPT4gKC8qIGJpbmRpbmcgKi8gc2V0dXBMb2NhbENsaWVudClcbi8qIGhhcm1vbnkgZXhwb3J0ICovIH0pO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF9ycGNfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vcnBjLmpzICovIFwiLi9zcmMvcnBjLmpzXCIpO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgLi91dGlscyAqLyBcIi4vc3JjL3V0aWxzL2luZGV4LmpzXCIpO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF91dGlsc19zY2hlbWFfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vdXRpbHMvc2NoZW1hLmpzICovIFwiLi9zcmMvdXRpbHMvc2NoZW1hLmpzXCIpO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF93ZWJydGNfY2xpZW50X2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8zX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL3dlYnJ0Yy1jbGllbnQuanMgKi8gXCIuL3NyYy93ZWJydGMtY2xpZW50LmpzXCIpO1xuXG5cblxuXG5cblxuXG5cblxuY29uc3QgTUFYX1JFVFJZID0gMTAwMDAwMDtcblxuY2xhc3MgV2Vic29ja2V0UlBDQ29ubmVjdGlvbiB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHNlcnZlcl91cmwsXG4gICAgY2xpZW50X2lkLFxuICAgIHdvcmtzcGFjZSxcbiAgICB0b2tlbixcbiAgICByZWNvbm5lY3Rpb25fdG9rZW4gPSBudWxsLFxuICAgIHRpbWVvdXQgPSA2MCxcbiAgICBXZWJTb2NrZXRDbGFzcyA9IG51bGwsXG4gICAgdG9rZW5fcmVmcmVzaF9pbnRlcnZhbCA9IDIgKiA2MCAqIDYwLFxuICApIHtcbiAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5hc3NlcnQpKHNlcnZlcl91cmwgJiYgY2xpZW50X2lkLCBcInNlcnZlcl91cmwgYW5kIGNsaWVudF9pZCBhcmUgcmVxdWlyZWRcIik7XG4gICAgdGhpcy5fc2VydmVyX3VybCA9IHNlcnZlcl91cmw7XG4gICAgdGhpcy5fY2xpZW50X2lkID0gY2xpZW50X2lkO1xuICAgIHRoaXMuX3dvcmtzcGFjZSA9IHdvcmtzcGFjZTtcbiAgICB0aGlzLl90b2tlbiA9IHRva2VuO1xuICAgIHRoaXMuX3JlY29ubmVjdGlvbl90b2tlbiA9IHJlY29ubmVjdGlvbl90b2tlbjtcbiAgICB0aGlzLl93ZWJzb2NrZXQgPSBudWxsO1xuICAgIHRoaXMuX2hhbmRsZV9tZXNzYWdlID0gbnVsbDtcbiAgICB0aGlzLl9oYW5kbGVfY29ubmVjdGVkID0gbnVsbDsgLy8gQ29ubmVjdGlvbiBvcGVuIGV2ZW50IGhhbmRsZXJcbiAgICB0aGlzLl9oYW5kbGVfZGlzY29ubmVjdGVkID0gbnVsbDsgLy8gRGlzY29ubmVjdGlvbiBldmVudCBoYW5kbGVyXG4gICAgdGhpcy5fdGltZW91dCA9IHRpbWVvdXQ7XG4gICAgdGhpcy5fV2ViU29ja2V0Q2xhc3MgPSBXZWJTb2NrZXRDbGFzcyB8fCBXZWJTb2NrZXQ7IC8vIEFsbG93IG92ZXJyaWRpbmcgdGhlIFdlYlNvY2tldCBjbGFzc1xuICAgIHRoaXMuX2Nsb3NlZCA9IGZhbHNlO1xuICAgIHRoaXMuX2xlZ2FjeV9hdXRoID0gbnVsbDtcbiAgICB0aGlzLmNvbm5lY3Rpb25faW5mbyA9IG51bGw7XG4gICAgdGhpcy5fZW5hYmxlX3JlY29ubmVjdCA9IGZhbHNlO1xuICAgIHRoaXMuX3Rva2VuX3JlZnJlc2hfaW50ZXJ2YWwgPSB0b2tlbl9yZWZyZXNoX2ludGVydmFsO1xuICAgIHRoaXMubWFuYWdlcl9pZCA9IG51bGw7XG4gICAgdGhpcy5fcmVmcmVzaF90b2tlbl90YXNrID0gbnVsbDtcbiAgICB0aGlzLl9sYXN0X21lc3NhZ2UgPSBudWxsOyAvLyBTdG9yZSB0aGUgbGFzdCBzZW50IG1lc3NhZ2VcbiAgfVxuXG4gIG9uX21lc3NhZ2UoaGFuZGxlcikge1xuICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLmFzc2VydCkoaGFuZGxlciwgXCJoYW5kbGVyIGlzIHJlcXVpcmVkXCIpO1xuICAgIHRoaXMuX2hhbmRsZV9tZXNzYWdlID0gaGFuZGxlcjtcbiAgfVxuXG4gIG9uX2Nvbm5lY3RlZChoYW5kbGVyKSB7XG4gICAgdGhpcy5faGFuZGxlX2Nvbm5lY3RlZCA9IGhhbmRsZXI7XG4gIH1cblxuICBvbl9kaXNjb25uZWN0ZWQoaGFuZGxlcikge1xuICAgIHRoaXMuX2hhbmRsZV9kaXNjb25uZWN0ZWQgPSBoYW5kbGVyO1xuICB9XG5cbiAgYXN5bmMgX2F0dGVtcHRfY29ubmVjdGlvbihzZXJ2ZXJfdXJsLCBhdHRlbXB0X2ZhbGxiYWNrID0gdHJ1ZSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLl9sZWdhY3lfYXV0aCA9IGZhbHNlO1xuICAgICAgY29uc3Qgd2Vic29ja2V0ID0gbmV3IHRoaXMuX1dlYlNvY2tldENsYXNzKHNlcnZlcl91cmwpO1xuICAgICAgd2Vic29ja2V0LmJpbmFyeVR5cGUgPSBcImFycmF5YnVmZmVyXCI7XG5cbiAgICAgIHdlYnNvY2tldC5vbm9wZW4gPSAoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUuaW5mbyhcIldlYlNvY2tldCBjb25uZWN0aW9uIGVzdGFibGlzaGVkXCIpO1xuICAgICAgICByZXNvbHZlKHdlYnNvY2tldCk7XG4gICAgICB9O1xuXG4gICAgICB3ZWJzb2NrZXQub25lcnJvciA9IChldmVudCkgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiV2ViU29ja2V0IGNvbm5lY3Rpb24gZXJyb3I6XCIsIGV2ZW50KTtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgV2ViU29ja2V0IGNvbm5lY3Rpb24gZXJyb3I6ICR7ZXZlbnR9YCkpO1xuICAgICAgfTtcblxuICAgICAgd2Vic29ja2V0Lm9uY2xvc2UgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgaWYgKGV2ZW50LmNvZGUgPT09IDEwMDMgJiYgYXR0ZW1wdF9mYWxsYmFjaykge1xuICAgICAgICAgIGNvbnNvbGUuaW5mbyhcbiAgICAgICAgICAgIFwiUmVjZWl2ZWQgMTAwMyBlcnJvciwgYXR0ZW1wdGluZyBjb25uZWN0aW9uIHdpdGggcXVlcnkgcGFyYW1ldGVycy5cIixcbiAgICAgICAgICApO1xuICAgICAgICAgIHRoaXMuX2xlZ2FjeV9hdXRoID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLl9hdHRlbXB0X2Nvbm5lY3Rpb25fd2l0aF9xdWVyeV9wYXJhbXMoc2VydmVyX3VybClcbiAgICAgICAgICAgIC50aGVuKHJlc29sdmUpXG4gICAgICAgICAgICAuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9oYW5kbGVfZGlzY29ubmVjdGVkKSB7XG4gICAgICAgICAgdGhpcy5faGFuZGxlX2Rpc2Nvbm5lY3RlZChldmVudC5yZWFzb24pO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgX2F0dGVtcHRfY29ubmVjdGlvbl93aXRoX3F1ZXJ5X3BhcmFtcyhzZXJ2ZXJfdXJsKSB7XG4gICAgLy8gSW5pdGlhbGl6ZSBhbiBhcnJheSB0byBob2xkIHBhcnRzIG9mIHRoZSBxdWVyeSBzdHJpbmdcbiAgICBjb25zdCBxdWVyeVBhcmFtc1BhcnRzID0gW107XG5cbiAgICAvLyBDb25kaXRpb25hbGx5IGFkZCBlYWNoIHBhcmFtZXRlciBpZiBpdCBoYXMgYSBub24tZW1wdHkgdmFsdWVcbiAgICBpZiAodGhpcy5fY2xpZW50X2lkKVxuICAgICAgcXVlcnlQYXJhbXNQYXJ0cy5wdXNoKGBjbGllbnRfaWQ9JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5fY2xpZW50X2lkKX1gKTtcbiAgICBpZiAodGhpcy5fd29ya3NwYWNlKVxuICAgICAgcXVlcnlQYXJhbXNQYXJ0cy5wdXNoKGB3b3Jrc3BhY2U9JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5fd29ya3NwYWNlKX1gKTtcbiAgICBpZiAodGhpcy5fdG9rZW4pXG4gICAgICBxdWVyeVBhcmFtc1BhcnRzLnB1c2goYHRva2VuPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuX3Rva2VuKX1gKTtcbiAgICBpZiAodGhpcy5fcmVjb25uZWN0aW9uX3Rva2VuKVxuICAgICAgcXVlcnlQYXJhbXNQYXJ0cy5wdXNoKFxuICAgICAgICBgcmVjb25uZWN0aW9uX3Rva2VuPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuX3JlY29ubmVjdGlvbl90b2tlbil9YCxcbiAgICAgICk7XG5cbiAgICAvLyBKb2luIHRoZSBwYXJ0cyB3aXRoICcmJyB0byBmb3JtIHRoZSBmaW5hbCBxdWVyeSBzdHJpbmcsIHByZXBlbmQgJz8nIGlmIHRoZXJlIGFyZSBhbnkgcGFyYW1ldGVyc1xuICAgIGNvbnN0IHF1ZXJ5U3RyaW5nID1cbiAgICAgIHF1ZXJ5UGFyYW1zUGFydHMubGVuZ3RoID4gMCA/IGA/JHtxdWVyeVBhcmFtc1BhcnRzLmpvaW4oXCImXCIpfWAgOiBcIlwiO1xuXG4gICAgLy8gQ29uc3RydWN0IHRoZSBmdWxsIFVSTCBieSBhcHBlbmRpbmcgdGhlIHF1ZXJ5IHN0cmluZyBpZiBpdCBleGlzdHNcbiAgICBjb25zdCBmdWxsX3VybCA9IHNlcnZlcl91cmwgKyBxdWVyeVN0cmluZztcblxuICAgIHJldHVybiBhd2FpdCB0aGlzLl9hdHRlbXB0X2Nvbm5lY3Rpb24oZnVsbF91cmwsIGZhbHNlKTtcbiAgfVxuXG4gIF9lc3RhYmxpc2hfY29ubmVjdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5fd2Vic29ja2V0Lm9ubWVzc2FnZSA9IChldmVudCkgPT4ge1xuICAgICAgICBjb25zdCBkYXRhID0gZXZlbnQuZGF0YTtcbiAgICAgICAgY29uc3QgZmlyc3RfbWVzc2FnZSA9IEpTT04ucGFyc2UoZGF0YSk7XG4gICAgICAgIGlmIChmaXJzdF9tZXNzYWdlLnR5cGUgPT0gXCJjb25uZWN0aW9uX2luZm9cIikge1xuICAgICAgICAgIHRoaXMuY29ubmVjdGlvbl9pbmZvID0gZmlyc3RfbWVzc2FnZTtcbiAgICAgICAgICBpZiAodGhpcy5fd29ya3NwYWNlKSB7XG4gICAgICAgICAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5hc3NlcnQpKFxuICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb25faW5mby53b3Jrc3BhY2UgPT09IHRoaXMuX3dvcmtzcGFjZSxcbiAgICAgICAgICAgICAgYENvbm5lY3RlZCB0byB0aGUgd3Jvbmcgd29ya3NwYWNlOiAke3RoaXMuY29ubmVjdGlvbl9pbmZvLndvcmtzcGFjZX0sIGV4cGVjdGVkOiAke3RoaXMuX3dvcmtzcGFjZX1gLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHRoaXMuY29ubmVjdGlvbl9pbmZvLnJlY29ubmVjdGlvbl90b2tlbikge1xuICAgICAgICAgICAgdGhpcy5fcmVjb25uZWN0aW9uX3Rva2VuID0gdGhpcy5jb25uZWN0aW9uX2luZm8ucmVjb25uZWN0aW9uX3Rva2VuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodGhpcy5jb25uZWN0aW9uX2luZm8ucmVjb25uZWN0aW9uX3Rva2VuX2xpZmVfdGltZSkge1xuICAgICAgICAgICAgLy8gbWFrZSBzdXJlIHRoZSB0b2tlbiByZWZyZXNoIGludGVydmFsIGlzIGxlc3MgdGhhbiB0aGUgdG9rZW4gbGlmZSB0aW1lXG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIHRoaXMudG9rZW5fcmVmcmVzaF9pbnRlcnZhbCA+XG4gICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbl9pbmZvLnJlY29ubmVjdGlvbl90b2tlbl9saWZlX3RpbWUgLyAxLjVcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgICAgICAgYFRva2VuIHJlZnJlc2ggaW50ZXJ2YWwgaXMgdG9vIGxvbmcgKCR7dGhpcy50b2tlbl9yZWZyZXNoX2ludGVydmFsfSksIHNldHRpbmcgaXQgdG8gMS41IHRpbWVzIG9mIHRoZSB0b2tlbiBsaWZlIHRpbWUoJHt0aGlzLmNvbm5lY3Rpb25faW5mby5yZWNvbm5lY3Rpb25fdG9rZW5fbGlmZV90aW1lfSkuYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgdGhpcy50b2tlbl9yZWZyZXNoX2ludGVydmFsID1cbiAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb25faW5mby5yZWNvbm5lY3Rpb25fdG9rZW5fbGlmZV90aW1lIC8gMS41O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLm1hbmFnZXJfaWQgPSB0aGlzLmNvbm5lY3Rpb25faW5mby5tYW5hZ2VyX2lkIHx8IG51bGw7XG4gICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICBgU3VjY2Vzc2Z1bGx5IGNvbm5lY3RlZCB0byB0aGUgc2VydmVyLCB3b3Jrc3BhY2U6ICR7dGhpcy5jb25uZWN0aW9uX2luZm8ud29ya3NwYWNlfSwgbWFuYWdlcl9pZDogJHt0aGlzLm1hbmFnZXJfaWR9YCxcbiAgICAgICAgICApO1xuICAgICAgICAgIGlmICh0aGlzLmNvbm5lY3Rpb25faW5mby5hbm5vdW5jZW1lbnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGAke3RoaXMuY29ubmVjdGlvbl9pbmZvLmFubm91bmNlbWVudH1gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZSh0aGlzLmNvbm5lY3Rpb25faW5mbyk7XG4gICAgICAgIH0gZWxzZSBpZiAoZmlyc3RfbWVzc2FnZS50eXBlID09IFwiZXJyb3JcIikge1xuICAgICAgICAgIGNvbnN0IGVycm9yID0gXCJDb25uZWN0aW9uQWJvcnRlZEVycm9yOiBcIiArIGZpcnN0X21lc3NhZ2UubWVzc2FnZTtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGNvbm5lY3QsIFwiICsgZXJyb3IpO1xuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoZXJyb3IpKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAgIFwiQ29ubmVjdGlvbkFib3J0ZWRFcnJvcjogVW5leHBlY3RlZCBtZXNzYWdlIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlcjpcIixcbiAgICAgICAgICAgIGRhdGEsXG4gICAgICAgICAgKTtcbiAgICAgICAgICByZWplY3QoXG4gICAgICAgICAgICBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgIFwiQ29ubmVjdGlvbkFib3J0ZWRFcnJvcjogVW5leHBlY3RlZCBtZXNzYWdlIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlclwiLFxuICAgICAgICAgICAgKSxcbiAgICAgICAgICApO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIG9wZW4oKSB7XG4gICAgY29uc29sZS5sb2coXG4gICAgICBcIkNyZWF0aW5nIGEgbmV3IHdlYnNvY2tldCBjb25uZWN0aW9uIHRvXCIsXG4gICAgICB0aGlzLl9zZXJ2ZXJfdXJsLnNwbGl0KFwiP1wiKVswXSxcbiAgICApO1xuICAgIHRyeSB7XG4gICAgICB0aGlzLl93ZWJzb2NrZXQgPSBhd2FpdCB0aGlzLl9hdHRlbXB0X2Nvbm5lY3Rpb24odGhpcy5fc2VydmVyX3VybCk7XG4gICAgICBpZiAodGhpcy5fbGVnYWN5X2F1dGgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIFwiTm90SW1wbGVtZW50ZWRFcnJvcjogTGVnYWN5IGF1dGhlbnRpY2F0aW9uIGlzIG5vdCBzdXBwb3J0ZWRcIixcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIC8vIFNlbmQgYXV0aGVudGljYXRpb24gaW5mbyBhcyB0aGUgZmlyc3QgbWVzc2FnZSBpZiBjb25uZWN0ZWQgd2l0aG91dCBxdWVyeSBwYXJhbXNcbiAgICAgIGNvbnN0IGF1dGhJbmZvID0gSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBjbGllbnRfaWQ6IHRoaXMuX2NsaWVudF9pZCxcbiAgICAgICAgd29ya3NwYWNlOiB0aGlzLl93b3Jrc3BhY2UsXG4gICAgICAgIHRva2VuOiB0aGlzLl90b2tlbixcbiAgICAgICAgcmVjb25uZWN0aW9uX3Rva2VuOiB0aGlzLl9yZWNvbm5lY3Rpb25fdG9rZW4sXG4gICAgICB9KTtcbiAgICAgIHRoaXMuX3dlYnNvY2tldC5zZW5kKGF1dGhJbmZvKTtcbiAgICAgIC8vIFdhaXQgZm9yIHRoZSBmaXJzdCBtZXNzYWdlIGZyb20gdGhlIHNlcnZlclxuICAgICAgYXdhaXQgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18ud2FpdEZvcikoXG4gICAgICAgIHRoaXMuX2VzdGFibGlzaF9jb25uZWN0aW9uKCksXG4gICAgICAgIHRoaXMuX3RpbWVvdXQsXG4gICAgICAgIFwiRmFpbGVkIHRvIHJlY2VpdmUgdGhlIGZpcnN0IG1lc3NhZ2UgZnJvbSB0aGUgc2VydmVyXCIsXG4gICAgICApO1xuICAgICAgaWYgKHRoaXMuX3Rva2VuX3JlZnJlc2hfaW50ZXJ2YWwgPiAwKSB7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMuX3NlbmRfcmVmcmVzaF90b2tlbigpO1xuICAgICAgICAgIHRoaXMuX3JlZnJlc2hfdG9rZW5fdGFzayA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3NlbmRfcmVmcmVzaF90b2tlbigpO1xuICAgICAgICAgIH0sIHRoaXMuX3Rva2VuX3JlZnJlc2hfaW50ZXJ2YWwgKiAxMDAwKTtcbiAgICAgICAgfSwgMjAwMCk7XG4gICAgICB9XG4gICAgICAvLyBMaXN0ZW4gdG8gbWVzc2FnZXMgZnJvbSB0aGUgc2VydmVyXG4gICAgICB0aGlzLl9lbmFibGVfcmVjb25uZWN0ID0gdHJ1ZTtcbiAgICAgIHRoaXMuX2Nsb3NlZCA9IGZhbHNlO1xuICAgICAgdGhpcy5fd2Vic29ja2V0Lm9ubWVzc2FnZSA9IChldmVudCkgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIGV2ZW50LmRhdGEgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICBjb25zdCBwYXJzZWREYXRhID0gSlNPTi5wYXJzZShldmVudC5kYXRhKTtcbiAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgbWVzc2FnZSBpcyBhIHJlY29ubmVjdGlvbiB0b2tlblxuICAgICAgICAgIGlmIChwYXJzZWREYXRhLnR5cGUgPT09IFwicmVjb25uZWN0aW9uX3Rva2VuXCIpIHtcbiAgICAgICAgICAgIHRoaXMuX3JlY29ubmVjdGlvbl90b2tlbiA9IHBhcnNlZERhdGEucmVjb25uZWN0aW9uX3Rva2VuO1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJSZWNvbm5lY3Rpb24gdG9rZW4gcmVjZWl2ZWRcIik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVjZWl2ZWQgbWVzc2FnZSBmcm9tIHRoZSBzZXJ2ZXI6XCIsIHBhcnNlZERhdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9oYW5kbGVfbWVzc2FnZShldmVudC5kYXRhKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgdGhpcy5fd2Vic29ja2V0Lm9uZXJyb3IgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIldlYlNvY2tldCBjb25uZWN0aW9uIGVycm9yOlwiLCBldmVudCk7XG4gICAgICB9O1xuXG4gICAgICB0aGlzLl93ZWJzb2NrZXQub25jbG9zZSA9IHRoaXMuX2hhbmRsZV9jbG9zZS5iaW5kKHRoaXMpO1xuXG4gICAgICBpZiAodGhpcy5faGFuZGxlX2Nvbm5lY3RlZCkge1xuICAgICAgICB0aGlzLl9oYW5kbGVfY29ubmVjdGVkKHRoaXMuY29ubmVjdGlvbl9pbmZvKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmNvbm5lY3Rpb25faW5mbztcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgXCJGYWlsZWQgdG8gY29ubmVjdCB0b1wiLFxuICAgICAgICB0aGlzLl9zZXJ2ZXJfdXJsLnNwbGl0KFwiP1wiKVswXSxcbiAgICAgICAgZXJyb3IsXG4gICAgICApO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgX3NlbmRfcmVmcmVzaF90b2tlbigpIHtcbiAgICBpZiAodGhpcy5fd2Vic29ja2V0ICYmIHRoaXMuX3dlYnNvY2tldC5yZWFkeVN0YXRlID09PSBXZWJTb2NrZXQuT1BFTikge1xuICAgICAgY29uc3QgcmVmcmVzaE1lc3NhZ2UgPSBKU09OLnN0cmluZ2lmeSh7IHR5cGU6IFwicmVmcmVzaF90b2tlblwiIH0pO1xuICAgICAgdGhpcy5fd2Vic29ja2V0LnNlbmQocmVmcmVzaE1lc3NhZ2UpO1xuICAgICAgY29uc29sZS5sb2coXCJSZXF1ZXN0ZWQgcmVmcmVzaCB0b2tlblwiKTtcbiAgICB9XG4gIH1cblxuICBfaGFuZGxlX2Nsb3NlKGV2ZW50KSB7XG4gICAgaWYgKFxuICAgICAgIXRoaXMuX2Nsb3NlZCAmJlxuICAgICAgdGhpcy5fd2Vic29ja2V0ICYmXG4gICAgICB0aGlzLl93ZWJzb2NrZXQucmVhZHlTdGF0ZSA9PT0gV2ViU29ja2V0LkNMT1NFRFxuICAgICkge1xuICAgICAgaWYgKFsxMDAwLCAxMDAxXS5pbmNsdWRlcyhldmVudC5jb2RlKSkge1xuICAgICAgICBjb25zb2xlLmluZm8oXG4gICAgICAgICAgYFdlYnNvY2tldCBjb25uZWN0aW9uIGNsb3NlZCAoY29kZTogJHtldmVudC5jb2RlfSk6ICR7ZXZlbnQucmVhc29ufWAsXG4gICAgICAgICk7XG4gICAgICAgIGlmICh0aGlzLl9oYW5kbGVfZGlzY29ubmVjdGVkKSB7XG4gICAgICAgICAgdGhpcy5faGFuZGxlX2Rpc2Nvbm5lY3RlZChldmVudC5yZWFzb24pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2Nsb3NlZCA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2VuYWJsZV9yZWNvbm5lY3QpIHtcbiAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgIFwiV2Vic29ja2V0IGNvbm5lY3Rpb24gY2xvc2VkIHVuZXhwZWN0ZWRseSAoY29kZTogJXMpOiAlc1wiLFxuICAgICAgICAgIGV2ZW50LmNvZGUsXG4gICAgICAgICAgZXZlbnQucmVhc29uLFxuICAgICAgICApO1xuICAgICAgICBsZXQgcmV0cnkgPSAwO1xuICAgICAgICBjb25zdCByZWNvbm5lY3QgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAgICAgYFJlY29ubmVjdGluZyB0byAke3RoaXMuX3NlcnZlcl91cmwuc3BsaXQoXCI/XCIpWzBdfSAoYXR0ZW1wdCAjJHtyZXRyeX0pYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAvLyBPcGVuIHRoZSBjb25uZWN0aW9uLCB0aGlzIHdpbGwgdHJpZ2dlciB0aGUgb25fY29ubmVjdGVkIGNhbGxiYWNrXG4gICAgICAgICAgICBhd2FpdCB0aGlzLm9wZW4oKTtcblxuICAgICAgICAgICAgLy8gV2FpdCBhIHNob3J0IHRpbWUgZm9yIHNlcnZpY2VzIHRvIGJlIHJlZ2lzdGVyZWRcbiAgICAgICAgICAgIC8vIFRoaXMgZ2l2ZXMgdGltZSBmb3IgdGhlIG9uX2Nvbm5lY3RlZCBjYWxsYmFjayB0byBjb21wbGV0ZVxuICAgICAgICAgICAgLy8gd2hpY2ggaW5jbHVkZXMgcmUtcmVnaXN0ZXJpbmcgYWxsIHNlcnZpY2VzIHRvIHRoZSBzZXJ2ZXJcbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDUwMCkpO1xuXG4gICAgICAgICAgICAvLyBSZXNlbmQgbGFzdCBtZXNzYWdlIGlmIHRoZXJlIHdhcyBvbmVcbiAgICAgICAgICAgIGlmICh0aGlzLl9sYXN0X21lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFwiUmVzZW5kaW5nIGxhc3QgbWVzc2FnZSBhZnRlciByZWNvbm5lY3Rpb25cIik7XG4gICAgICAgICAgICAgIHRoaXMuX3dlYnNvY2tldC5zZW5kKHRoaXMuX2xhc3RfbWVzc2FnZSk7XG4gICAgICAgICAgICAgIHRoaXMuX2xhc3RfbWVzc2FnZSA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgICAgIGBTdWNjZXNzZnVsbHkgcmVjb25uZWN0ZWQgdG8gc2VydmVyICR7dGhpcy5fc2VydmVyX3VybH0gKHNlcnZpY2VzIHJlLXJlZ2lzdGVyZWQpYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGAke2V9YC5pbmNsdWRlcyhcIkNvbm5lY3Rpb25BYm9ydGVkRXJyb3I6XCIpKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkZhaWxlZCB0byByZWNvbm5lY3QsIGNvbm5lY3Rpb24gYWJvcnRlZDpcIiwgZSk7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYCR7ZX1gLmluY2x1ZGVzKFwiTm90SW1wbGVtZW50ZWRFcnJvcjpcIikpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAgICAgICBgJHtlfVxcbkl0IGFwcGVhcnMgdGhhdCB5b3UgYXJlIHRyeWluZyB0byBjb25uZWN0IHRvIGEgaHlwaGEgc2VydmVyIHRoYXQgaXMgb2xkZXIgdGhhbiAwLjIwLjAsIHBsZWFzZSB1cGdyYWRlIHRoZSBoeXBoYSBzZXJ2ZXIgb3IgdXNlIHRoZSB3ZWJzb2NrZXQgY2xpZW50IGluIGltam95LXJwYyhodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9pbWpveS1ycGMpIGluc3RlYWRgLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDAwKSk7XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIHRoaXMuX3dlYnNvY2tldCAmJlxuICAgICAgICAgICAgICB0aGlzLl93ZWJzb2NrZXQucmVhZHlTdGF0ZSA9PT0gV2ViU29ja2V0LkNPTk5FQ1RFRFxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHJ5ICs9IDE7XG4gICAgICAgICAgICBpZiAocmV0cnkgPCBNQVhfUkVUUlkpIHtcbiAgICAgICAgICAgICAgYXdhaXQgcmVjb25uZWN0KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHJlY29ubmVjdCBhZnRlclwiLCBNQVhfUkVUUlksIFwiYXR0ZW1wdHNcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZWNvbm5lY3QoKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuX2hhbmRsZV9kaXNjb25uZWN0ZWQpIHtcbiAgICAgICAgdGhpcy5faGFuZGxlX2Rpc2Nvbm5lY3RlZChldmVudC5yZWFzb24pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGVtaXRfbWVzc2FnZShkYXRhKSB7XG4gICAgaWYgKHRoaXMuX2Nsb3NlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ29ubmVjdGlvbiBpcyBjbG9zZWRcIik7XG4gICAgfVxuICAgIGlmICghdGhpcy5fd2Vic29ja2V0IHx8IHRoaXMuX3dlYnNvY2tldC5yZWFkeVN0YXRlICE9PSBXZWJTb2NrZXQuT1BFTikge1xuICAgICAgYXdhaXQgdGhpcy5vcGVuKCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICB0aGlzLl9sYXN0X21lc3NhZ2UgPSBkYXRhOyAvLyBTdG9yZSB0aGUgbWVzc2FnZSBiZWZvcmUgc2VuZGluZ1xuICAgICAgdGhpcy5fd2Vic29ja2V0LnNlbmQoZGF0YSk7XG4gICAgICB0aGlzLl9sYXN0X21lc3NhZ2UgPSBudWxsOyAvLyBDbGVhciBhZnRlciBzdWNjZXNzZnVsIHNlbmRcbiAgICB9IGNhdGNoIChleHApIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBzZW5kIGRhdGEsIGVycm9yOiAke2V4cH1gKTtcbiAgICAgIHRocm93IGV4cDtcbiAgICB9XG4gIH1cblxuICBkaXNjb25uZWN0KHJlYXNvbikge1xuICAgIHRoaXMuX2Nsb3NlZCA9IHRydWU7XG4gICAgdGhpcy5fbGFzdF9tZXNzYWdlID0gbnVsbDsgLy8gQ2xlYXIgbGFzdCBtZXNzYWdlIG9uIGRpc2Nvbm5lY3RcbiAgICAvLyBFbnN1cmUgd2Vic29ja2V0IGlzIGNsb3NlZCBpZiBpdCBleGlzdHMgYW5kIGlzIG5vdCBhbHJlYWR5IGNsb3NlZCBvciBjbG9zaW5nXG4gICAgaWYgKFxuICAgICAgdGhpcy5fd2Vic29ja2V0ICYmXG4gICAgICB0aGlzLl93ZWJzb2NrZXQucmVhZHlTdGF0ZSAhPT0gV2ViU29ja2V0LkNMT1NFRCAmJlxuICAgICAgdGhpcy5fd2Vic29ja2V0LnJlYWR5U3RhdGUgIT09IFdlYlNvY2tldC5DTE9TSU5HXG4gICAgKSB7XG4gICAgICB0aGlzLl93ZWJzb2NrZXQuY2xvc2UoMTAwMCwgcmVhc29uKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuX3JlZnJlc2hfdG9rZW5fdGFzaykge1xuICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLl9yZWZyZXNoX3Rva2VuX3Rhc2spO1xuICAgIH1cbiAgICBjb25zb2xlLmluZm8oYFdlYlNvY2tldCBjb25uZWN0aW9uIGRpc2Nvbm5lY3RlZCAoJHtyZWFzb259KWApO1xuICB9XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVNlcnZlclVybChzZXJ2ZXJfdXJsKSB7XG4gIGlmICghc2VydmVyX3VybCkgdGhyb3cgbmV3IEVycm9yKFwic2VydmVyX3VybCBpcyByZXF1aXJlZFwiKTtcbiAgaWYgKHNlcnZlcl91cmwuc3RhcnRzV2l0aChcImh0dHA6Ly9cIikpIHtcbiAgICBzZXJ2ZXJfdXJsID1cbiAgICAgIHNlcnZlcl91cmwucmVwbGFjZShcImh0dHA6Ly9cIiwgXCJ3czovL1wiKS5yZXBsYWNlKC9cXC8kLywgXCJcIikgKyBcIi93c1wiO1xuICB9IGVsc2UgaWYgKHNlcnZlcl91cmwuc3RhcnRzV2l0aChcImh0dHBzOi8vXCIpKSB7XG4gICAgc2VydmVyX3VybCA9XG4gICAgICBzZXJ2ZXJfdXJsLnJlcGxhY2UoXCJodHRwczovL1wiLCBcIndzczovL1wiKS5yZXBsYWNlKC9cXC8kLywgXCJcIikgKyBcIi93c1wiO1xuICB9XG4gIHJldHVybiBzZXJ2ZXJfdXJsO1xufVxuXG5hc3luYyBmdW5jdGlvbiBsb2dpbihjb25maWcpIHtcbiAgY29uc3Qgc2VydmljZV9pZCA9IGNvbmZpZy5sb2dpbl9zZXJ2aWNlX2lkIHx8IFwicHVibGljL2h5cGhhLWxvZ2luXCI7XG4gIGNvbnN0IHdvcmtzcGFjZSA9IGNvbmZpZy53b3Jrc3BhY2U7XG4gIGNvbnN0IGV4cGlyZXNfaW4gPSBjb25maWcuZXhwaXJlc19pbjtcbiAgY29uc3QgdGltZW91dCA9IGNvbmZpZy5sb2dpbl90aW1lb3V0IHx8IDYwO1xuICBjb25zdCBjYWxsYmFjayA9IGNvbmZpZy5sb2dpbl9jYWxsYmFjaztcbiAgY29uc3QgcHJvZmlsZSA9IGNvbmZpZy5wcm9maWxlO1xuXG4gIGNvbnN0IHNlcnZlciA9IGF3YWl0IGNvbm5lY3RUb1NlcnZlcih7XG4gICAgbmFtZTogXCJpbml0aWFsIGxvZ2luIGNsaWVudFwiLFxuICAgIHNlcnZlcl91cmw6IGNvbmZpZy5zZXJ2ZXJfdXJsLFxuICB9KTtcbiAgdHJ5IHtcbiAgICBjb25zdCBzdmMgPSBhd2FpdCBzZXJ2ZXIuZ2V0U2VydmljZShzZXJ2aWNlX2lkKTtcbiAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5hc3NlcnQpKHN2YywgYEZhaWxlZCB0byBnZXQgdGhlIGxvZ2luIHNlcnZpY2U6ICR7c2VydmljZV9pZH1gKTtcbiAgICBsZXQgY29udGV4dDtcbiAgICBpZiAod29ya3NwYWNlKSB7XG4gICAgICBjb250ZXh0ID0gYXdhaXQgc3ZjLnN0YXJ0KHsgd29ya3NwYWNlLCBleHBpcmVzX2luLCBfcmt3YXJnczogdHJ1ZSB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29udGV4dCA9IGF3YWl0IHN2Yy5zdGFydCgpO1xuICAgIH1cbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIGF3YWl0IGNhbGxiYWNrKGNvbnRleHQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyhgUGxlYXNlIG9wZW4geW91ciBicm93c2VyIGFuZCBsb2dpbiBhdCAke2NvbnRleHQubG9naW5fdXJsfWApO1xuICAgIH1cbiAgICByZXR1cm4gYXdhaXQgc3ZjLmNoZWNrKGNvbnRleHQua2V5LCB7IHRpbWVvdXQsIHByb2ZpbGUsIF9ya3dhcmdzOiB0cnVlIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IGVycm9yO1xuICB9IGZpbmFsbHkge1xuICAgIGF3YWl0IHNlcnZlci5kaXNjb25uZWN0KCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gd2VicnRjR2V0U2VydmljZSh3bSwgcnRjX3NlcnZpY2VfaWQsIHF1ZXJ5LCBjb25maWcpIHtcbiAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xuICBjb25zdCB3ZWJydGMgPSBjb25maWcud2VicnRjO1xuICBjb25zdCB3ZWJydGNfY29uZmlnID0gY29uZmlnLndlYnJ0Y19jb25maWc7XG4gIGlmIChjb25maWcud2VicnRjICE9PSB1bmRlZmluZWQpIGRlbGV0ZSBjb25maWcud2VicnRjO1xuICBpZiAoY29uZmlnLndlYnJ0Y19jb25maWcgIT09IHVuZGVmaW5lZCkgZGVsZXRlIGNvbmZpZy53ZWJydGNfY29uZmlnO1xuICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5hc3NlcnQpKFxuICAgIFt1bmRlZmluZWQsIHRydWUsIGZhbHNlLCBcImF1dG9cIl0uaW5jbHVkZXMod2VicnRjKSxcbiAgICBcIndlYnJ0YyBtdXN0IGJlIHRydWUsIGZhbHNlIG9yICdhdXRvJ1wiLFxuICApO1xuXG4gIGNvbnN0IHN2YyA9IGF3YWl0IHdtLmdldFNlcnZpY2UocXVlcnksIGNvbmZpZyk7XG4gIGlmICh3ZWJydGMgPT09IHRydWUgfHwgd2VicnRjID09PSBcImF1dG9cIikge1xuICAgIGlmIChzdmMuaWQuaW5jbHVkZXMoXCI6XCIpICYmIHN2Yy5pZC5pbmNsdWRlcyhcIi9cIikpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIEFzc3VtaW5nIHRoYXQgdGhlIGNsaWVudCByZWdpc3RlcmVkIGEgd2VicnRjIHNlcnZpY2Ugd2l0aCB0aGUgY2xpZW50X2lkICsgXCItcnRjXCJcbiAgICAgICAgY29uc3QgcGVlciA9IGF3YWl0ICgwLF93ZWJydGNfY2xpZW50X2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8zX18uZ2V0UlRDU2VydmljZSkod20sIHJ0Y19zZXJ2aWNlX2lkLCB3ZWJydGNfY29uZmlnKTtcbiAgICAgICAgY29uc3QgcnRjU3ZjID0gYXdhaXQgcGVlci5nZXRTZXJ2aWNlKHN2Yy5pZC5zcGxpdChcIjpcIilbMV0sIGNvbmZpZyk7XG4gICAgICAgIHJ0Y1N2Yy5fd2VicnRjID0gdHJ1ZTtcbiAgICAgICAgcnRjU3ZjLl9wZWVyID0gcGVlcjtcbiAgICAgICAgcnRjU3ZjLl9zZXJ2aWNlID0gc3ZjO1xuICAgICAgICByZXR1cm4gcnRjU3ZjO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgXCJGYWlsZWQgdG8gZ2V0IHdlYnJ0YyBzZXJ2aWNlLCB1c2luZyB3ZWJzb2NrZXQgY29ubmVjdGlvblwiLFxuICAgICAgICAgIGUsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh3ZWJydGMgPT09IHRydWUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBnZXQgdGhlIHNlcnZpY2UgdmlhIHdlYnJ0Y1wiKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN2Yztcbn1cblxuYXN5bmMgZnVuY3Rpb24gY29ubmVjdFRvU2VydmVyKGNvbmZpZykge1xuICBpZiAoY29uZmlnLnNlcnZlcikge1xuICAgIGNvbmZpZy5zZXJ2ZXJfdXJsID0gY29uZmlnLnNlcnZlcl91cmwgfHwgY29uZmlnLnNlcnZlci51cmw7XG4gICAgY29uZmlnLldlYlNvY2tldENsYXNzID1cbiAgICAgIGNvbmZpZy5XZWJTb2NrZXRDbGFzcyB8fCBjb25maWcuc2VydmVyLldlYlNvY2tldENsYXNzO1xuICB9XG4gIGxldCBjbGllbnRJZCA9IGNvbmZpZy5jbGllbnRfaWQ7XG4gIGlmICghY2xpZW50SWQpIHtcbiAgICBjbGllbnRJZCA9ICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLnJhbmRJZCkoKTtcbiAgICBjb25maWcuY2xpZW50X2lkID0gY2xpZW50SWQ7XG4gIH1cblxuICBsZXQgc2VydmVyX3VybCA9IG5vcm1hbGl6ZVNlcnZlclVybChjb25maWcuc2VydmVyX3VybCk7XG5cbiAgbGV0IGNvbm5lY3Rpb24gPSBuZXcgV2Vic29ja2V0UlBDQ29ubmVjdGlvbihcbiAgICBzZXJ2ZXJfdXJsLFxuICAgIGNsaWVudElkLFxuICAgIGNvbmZpZy53b3Jrc3BhY2UsXG4gICAgY29uZmlnLnRva2VuLFxuICAgIGNvbmZpZy5yZWNvbm5lY3Rpb25fdG9rZW4sXG4gICAgY29uZmlnLm1ldGhvZF90aW1lb3V0IHx8IDYwLFxuICAgIGNvbmZpZy5XZWJTb2NrZXRDbGFzcyxcbiAgKTtcbiAgY29uc3QgY29ubmVjdGlvbl9pbmZvID0gYXdhaXQgY29ubmVjdGlvbi5vcGVuKCk7XG4gICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLmFzc2VydCkoXG4gICAgY29ubmVjdGlvbl9pbmZvLFxuICAgIFwiRmFpbGVkIHRvIGNvbm5lY3QgdG8gdGhlIHNlcnZlciwgbm8gY29ubmVjdGlvbiBpbmZvIG9idGFpbmVkLiBUaGlzIGlzc3VlIGlzIG1vc3QgbGlrZWx5IGR1ZSB0byBhbiBvdXRkYXRlZCBIeXBoYSBzZXJ2ZXIgdmVyc2lvbi4gUGxlYXNlIHVzZSBgaW1qb3ktcnBjYCBmb3IgY29tcGF0aWJpbGl0eSwgb3IgdXBncmFkZSB0aGUgSHlwaGEgc2VydmVyIHRvIHRoZSBsYXRlc3QgdmVyc2lvbi5cIixcbiAgKTtcbiAgLy8gd2FpdCBmb3IgMC41IHNlY29uZHNcbiAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwKSk7XG4gIC8vIEVuc3VyZSBtYW5hZ2VyX2lkIGlzIHNldCBiZWZvcmUgcHJvY2VlZGluZ1xuICBpZiAoIWNvbm5lY3Rpb24ubWFuYWdlcl9pZCkge1xuICAgIGNvbnNvbGUud2FybihcIk1hbmFnZXIgSUQgbm90IHNldCBpbW1lZGlhdGVseSwgd2FpdGluZy4uLlwiKTtcblxuICAgIC8vIFdhaXQgZm9yIG1hbmFnZXJfaWQgdG8gYmUgc2V0IHdpdGggdGltZW91dFxuICAgIGNvbnN0IG1heFdhaXRUaW1lID0gNTAwMDsgLy8gNSBzZWNvbmRzXG4gICAgY29uc3QgY2hlY2tJbnRlcnZhbCA9IDEwMDsgLy8gMTAwbXNcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuXG4gICAgd2hpbGUgKCFjb25uZWN0aW9uLm1hbmFnZXJfaWQgJiYgRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSA8IG1heFdhaXRUaW1lKSB7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCBjaGVja0ludGVydmFsKSk7XG4gICAgfVxuXG4gICAgaWYgKCFjb25uZWN0aW9uLm1hbmFnZXJfaWQpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJNYW5hZ2VyIElEIHN0aWxsIG5vdCBzZXQgYWZ0ZXIgd2FpdGluZ1wiKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBnZXQgbWFuYWdlciBJRCBmcm9tIHNlcnZlclwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5pbmZvKGBNYW5hZ2VyIElEIHNldCBhZnRlciB3YWl0aW5nOiAke2Nvbm5lY3Rpb24ubWFuYWdlcl9pZH1gKTtcbiAgICB9XG4gIH1cbiAgaWYgKGNvbmZpZy53b3Jrc3BhY2UgJiYgY29ubmVjdGlvbl9pbmZvLndvcmtzcGFjZSAhPT0gY29uZmlnLndvcmtzcGFjZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBDb25uZWN0ZWQgdG8gdGhlIHdyb25nIHdvcmtzcGFjZTogJHtjb25uZWN0aW9uX2luZm8ud29ya3NwYWNlfSwgZXhwZWN0ZWQ6ICR7Y29uZmlnLndvcmtzcGFjZX1gLFxuICAgICk7XG4gIH1cblxuICBjb25zdCB3b3Jrc3BhY2UgPSBjb25uZWN0aW9uX2luZm8ud29ya3NwYWNlO1xuICBjb25zdCBycGMgPSBuZXcgX3JwY19qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLlJQQyhjb25uZWN0aW9uLCB7XG4gICAgY2xpZW50X2lkOiBjbGllbnRJZCxcbiAgICB3b3Jrc3BhY2UsXG4gICAgZGVmYXVsdF9jb250ZXh0OiB7IGNvbm5lY3Rpb25fdHlwZTogXCJ3ZWJzb2NrZXRcIiB9LFxuICAgIG5hbWU6IGNvbmZpZy5uYW1lLFxuICAgIG1ldGhvZF90aW1lb3V0OiBjb25maWcubWV0aG9kX3RpbWVvdXQsXG4gICAgYXBwX2lkOiBjb25maWcuYXBwX2lkLFxuICAgIHNlcnZlcl9iYXNlX3VybDogY29ubmVjdGlvbl9pbmZvLnB1YmxpY19iYXNlX3VybCxcbiAgICBsb25nX21lc3NhZ2VfY2h1bmtfc2l6ZTogY29uZmlnLmxvbmdfbWVzc2FnZV9jaHVua19zaXplLFxuICB9KTtcbiAgY29uc3Qgd20gPSBhd2FpdCBycGMuZ2V0X21hbmFnZXJfc2VydmljZSh7XG4gICAgdGltZW91dDogY29uZmlnLm1ldGhvZF90aW1lb3V0LFxuICAgIGNhc2VfY29udmVyc2lvbjogXCJjYW1lbFwiLFxuICAgIGt3YXJnc19leHBhbnNpb246IGNvbmZpZy5rd2FyZ3NfZXhwYW5zaW9uIHx8IGZhbHNlLFxuICB9KTtcbiAgd20ucnBjID0gcnBjO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIF9leHBvcnQoYXBpKSB7XG4gICAgYXBpLmlkID0gXCJkZWZhdWx0XCI7XG4gICAgYXBpLm5hbWUgPSBhcGkubmFtZSB8fCBjb25maWcubmFtZSB8fCBhcGkuaWQ7XG4gICAgYXBpLmRlc2NyaXB0aW9uID0gYXBpLmRlc2NyaXB0aW9uIHx8IGNvbmZpZy5kZXNjcmlwdGlvbjtcbiAgICBhd2FpdCBycGMucmVnaXN0ZXJfc2VydmljZShhcGksIHsgb3ZlcndyaXRlOiB0cnVlIH0pO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gZ2V0QXBwKGNsaWVudElkKSB7XG4gICAgY2xpZW50SWQgPSBjbGllbnRJZCB8fCBcIipcIjtcbiAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5hc3NlcnQpKCFjbGllbnRJZC5pbmNsdWRlcyhcIjpcIiksIFwiY2xpZW50SWQgc2hvdWxkIG5vdCBjb250YWluICc6J1wiKTtcbiAgICBpZiAoIWNsaWVudElkLmluY2x1ZGVzKFwiL1wiKSkge1xuICAgICAgY2xpZW50SWQgPSBjb25uZWN0aW9uX2luZm8ud29ya3NwYWNlICsgXCIvXCIgKyBjbGllbnRJZDtcbiAgICB9XG4gICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18uYXNzZXJ0KShcbiAgICAgIGNsaWVudElkLnNwbGl0KFwiL1wiKS5sZW5ndGggPT09IDIsXG4gICAgICBcImNsaWVudElkIHNob3VsZCBtYXRjaCBwYXR0ZXJuIHdvcmtzcGFjZS9jbGllbnRJZFwiLFxuICAgICk7XG4gICAgcmV0dXJuIGF3YWl0IHdtLmdldFNlcnZpY2UoYCR7Y2xpZW50SWR9OmRlZmF1bHRgKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGxpc3RBcHBzKHdzKSB7XG4gICAgd3MgPSB3cyB8fCB3b3Jrc3BhY2U7XG4gICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18uYXNzZXJ0KSghd3MuaW5jbHVkZXMoXCI6XCIpLCBcIndvcmtzcGFjZSBzaG91bGQgbm90IGNvbnRhaW4gJzonXCIpO1xuICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLmFzc2VydCkoIXdzLmluY2x1ZGVzKFwiL1wiKSwgXCJ3b3Jrc3BhY2Ugc2hvdWxkIG5vdCBjb250YWluICcvJ1wiKTtcbiAgICBjb25zdCBxdWVyeSA9IHsgd29ya3NwYWNlOiB3cywgc2VydmljZV9pZDogXCJkZWZhdWx0XCIgfTtcbiAgICByZXR1cm4gYXdhaXQgd20ubGlzdFNlcnZpY2VzKHF1ZXJ5KTtcbiAgfVxuXG4gIGlmIChjb25uZWN0aW9uX2luZm8pIHtcbiAgICB3bS5jb25maWcgPSBPYmplY3QuYXNzaWduKHdtLmNvbmZpZywgY29ubmVjdGlvbl9pbmZvKTtcbiAgfVxuICB3bS5leHBvcnQgPSAoMCxfdXRpbHNfc2NoZW1hX2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18uc2NoZW1hRnVuY3Rpb24pKF9leHBvcnQsIHtcbiAgICBuYW1lOiBcImV4cG9ydFwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIkV4cG9ydCB0aGUgYXBpLlwiLFxuICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgIHByb3BlcnRpZXM6IHsgYXBpOiB7IGRlc2NyaXB0aW9uOiBcIlRoZSBhcGkgdG8gZXhwb3J0XCIsIHR5cGU6IFwib2JqZWN0XCIgfSB9LFxuICAgICAgcmVxdWlyZWQ6IFtcImFwaVwiXSxcbiAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgfSxcbiAgfSk7XG4gIHdtLmdldEFwcCA9ICgwLF91dGlsc19zY2hlbWFfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXy5zY2hlbWFGdW5jdGlvbikoZ2V0QXBwLCB7XG4gICAgbmFtZTogXCJnZXRBcHBcIixcbiAgICBkZXNjcmlwdGlvbjogXCJHZXQgdGhlIGFwcC5cIixcbiAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGNsaWVudElkOiB7IGRlZmF1bHQ6IFwiKlwiLCBkZXNjcmlwdGlvbjogXCJUaGUgY2xpZW50SWRcIiwgdHlwZTogXCJzdHJpbmdcIiB9LFxuICAgICAgfSxcbiAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgfSxcbiAgfSk7XG4gIHdtLmxpc3RBcHBzID0gKDAsX3V0aWxzX3NjaGVtYV9qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLnNjaGVtYUZ1bmN0aW9uKShsaXN0QXBwcywge1xuICAgIG5hbWU6IFwibGlzdEFwcHNcIixcbiAgICBkZXNjcmlwdGlvbjogXCJMaXN0IHRoZSBhcHBzLlwiLFxuICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgd29ya3NwYWNlOiB7XG4gICAgICAgICAgZGVmYXVsdDogd29ya3NwYWNlLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlRoZSB3b3Jrc3BhY2VcIixcbiAgICAgICAgICB0eXBlOiBcInN0cmluZ1wiLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgfSxcbiAgfSk7XG4gIHdtLmRpc2Nvbm5lY3QgPSAoMCxfdXRpbHNfc2NoZW1hX2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18uc2NoZW1hRnVuY3Rpb24pKHJwYy5kaXNjb25uZWN0LmJpbmQocnBjKSwge1xuICAgIG5hbWU6IFwiZGlzY29ubmVjdFwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIkRpc2Nvbm5lY3QgZnJvbSB0aGUgc2VydmVyLlwiLFxuICAgIHBhcmFtZXRlcnM6IHsgdHlwZTogXCJvYmplY3RcIiwgcHJvcGVydGllczoge30sIHJlcXVpcmVkOiBbXSB9LFxuICB9KTtcbiAgd20ucmVnaXN0ZXJDb2RlYyA9ICgwLF91dGlsc19zY2hlbWFfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXy5zY2hlbWFGdW5jdGlvbikocnBjLnJlZ2lzdGVyX2NvZGVjLmJpbmQocnBjKSwge1xuICAgIG5hbWU6IFwicmVnaXN0ZXJDb2RlY1wiLFxuICAgIGRlc2NyaXB0aW9uOiBcIlJlZ2lzdGVyIGEgY29kZWMgZm9yIHRoZSB3ZWJydGMgY29ubmVjdGlvblwiLFxuICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGNvZGVjOiB7XG4gICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcbiAgICAgICAgICBkZXNjcmlwdGlvbjogXCJDb2RlYyB0byByZWdpc3RlclwiLFxuICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgIG5hbWU6IHsgdHlwZTogXCJzdHJpbmdcIiB9LFxuICAgICAgICAgICAgdHlwZToge30sXG4gICAgICAgICAgICBlbmNvZGVyOiB7IHR5cGU6IFwiZnVuY3Rpb25cIiB9LFxuICAgICAgICAgICAgZGVjb2RlcjogeyB0eXBlOiBcImZ1bmN0aW9uXCIgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9KTtcblxuICB3bS5lbWl0ID0gKDAsX3V0aWxzX3NjaGVtYV9qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLnNjaGVtYUZ1bmN0aW9uKShycGMuZW1pdC5iaW5kKHJwYyksIHtcbiAgICBuYW1lOiBcImVtaXRcIixcbiAgICBkZXNjcmlwdGlvbjogXCJFbWl0IGEgbWVzc2FnZS5cIixcbiAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICBwcm9wZXJ0aWVzOiB7IGRhdGE6IHsgZGVzY3JpcHRpb246IFwiVGhlIGRhdGEgdG8gZW1pdFwiLCB0eXBlOiBcIm9iamVjdFwiIH0gfSxcbiAgICAgIHJlcXVpcmVkOiBbXCJkYXRhXCJdLFxuICAgICAgdHlwZTogXCJvYmplY3RcIixcbiAgICB9LFxuICB9KTtcblxuICB3bS5vbiA9ICgwLF91dGlsc19zY2hlbWFfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXy5zY2hlbWFGdW5jdGlvbikocnBjLm9uLmJpbmQocnBjKSwge1xuICAgIG5hbWU6IFwib25cIixcbiAgICBkZXNjcmlwdGlvbjogXCJSZWdpc3RlciBhIG1lc3NhZ2UgaGFuZGxlci5cIixcbiAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGV2ZW50OiB7IGRlc2NyaXB0aW9uOiBcIlRoZSBldmVudCB0byBsaXN0ZW4gdG9cIiwgdHlwZTogXCJzdHJpbmdcIiB9LFxuICAgICAgICBoYW5kbGVyOiB7IGRlc2NyaXB0aW9uOiBcIlRoZSBoYW5kbGVyIGZ1bmN0aW9uXCIsIHR5cGU6IFwiZnVuY3Rpb25cIiB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbXCJldmVudFwiLCBcImhhbmRsZXJcIl0sXG4gICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgIH0sXG4gIH0pO1xuXG4gIHdtLm9mZiA9ICgwLF91dGlsc19zY2hlbWFfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXy5zY2hlbWFGdW5jdGlvbikocnBjLm9mZi5iaW5kKHJwYyksIHtcbiAgICBuYW1lOiBcIm9mZlwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIlJlbW92ZSBhIG1lc3NhZ2UgaGFuZGxlci5cIixcbiAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIGV2ZW50OiB7IGRlc2NyaXB0aW9uOiBcIlRoZSBldmVudCB0byByZW1vdmVcIiwgdHlwZTogXCJzdHJpbmdcIiB9LFxuICAgICAgICBoYW5kbGVyOiB7IGRlc2NyaXB0aW9uOiBcIlRoZSBoYW5kbGVyIGZ1bmN0aW9uXCIsIHR5cGU6IFwiZnVuY3Rpb25cIiB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbXCJldmVudFwiLCBcImhhbmRsZXJcIl0sXG4gICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgIH0sXG4gIH0pO1xuXG4gIHdtLm9uY2UgPSAoMCxfdXRpbHNfc2NoZW1hX2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18uc2NoZW1hRnVuY3Rpb24pKHJwYy5vbmNlLmJpbmQocnBjKSwge1xuICAgIG5hbWU6IFwib25jZVwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIlJlZ2lzdGVyIGEgb25lLXRpbWUgbWVzc2FnZSBoYW5kbGVyLlwiLFxuICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgZXZlbnQ6IHsgZGVzY3JpcHRpb246IFwiVGhlIGV2ZW50IHRvIGxpc3RlbiB0b1wiLCB0eXBlOiBcInN0cmluZ1wiIH0sXG4gICAgICAgIGhhbmRsZXI6IHsgZGVzY3JpcHRpb246IFwiVGhlIGhhbmRsZXIgZnVuY3Rpb25cIiwgdHlwZTogXCJmdW5jdGlvblwiIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFtcImV2ZW50XCIsIFwiaGFuZGxlclwiXSxcbiAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgfSxcbiAgfSk7XG5cbiAgd20uZ2V0U2VydmljZVNjaGVtYSA9ICgwLF91dGlsc19zY2hlbWFfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXy5zY2hlbWFGdW5jdGlvbikocnBjLmdldF9zZXJ2aWNlX3NjaGVtYSwge1xuICAgIG5hbWU6IFwiZ2V0U2VydmljZVNjaGVtYVwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIkdldCB0aGUgc2VydmljZSBzY2hlbWEuXCIsXG4gICAgcGFyYW1ldGVyczoge1xuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBzZXJ2aWNlOiB7XG4gICAgICAgICAgZGVzY3JpcHRpb246IFwiVGhlIHNlcnZpY2UgdG8gZXh0cmFjdCBzY2hlbWFcIixcbiAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbXCJzZXJ2aWNlXCJdLFxuICAgICAgdHlwZTogXCJvYmplY3RcIixcbiAgICB9LFxuICB9KTtcblxuICB3bS5yZWdpc3RlclNlcnZpY2UgPSAoMCxfdXRpbHNfc2NoZW1hX2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18uc2NoZW1hRnVuY3Rpb24pKHJwYy5yZWdpc3Rlcl9zZXJ2aWNlLmJpbmQocnBjKSwge1xuICAgIG5hbWU6IFwicmVnaXN0ZXJTZXJ2aWNlXCIsXG4gICAgZGVzY3JpcHRpb246IFwiUmVnaXN0ZXIgYSBzZXJ2aWNlLlwiLFxuICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgc2VydmljZTogeyBkZXNjcmlwdGlvbjogXCJUaGUgc2VydmljZSB0byByZWdpc3RlclwiLCB0eXBlOiBcIm9iamVjdFwiIH0sXG4gICAgICAgIGZvcmNlOiB7XG4gICAgICAgICAgZGVmYXVsdDogZmFsc2UsXG4gICAgICAgICAgZGVzY3JpcHRpb246IFwiRm9yY2UgdG8gcmVnaXN0ZXIgdGhlIHNlcnZpY2VcIixcbiAgICAgICAgICB0eXBlOiBcImJvb2xlYW5cIixcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogW1wic2VydmljZVwiXSxcbiAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgfSxcbiAgfSk7XG4gIHdtLnVucmVnaXN0ZXJTZXJ2aWNlID0gKDAsX3V0aWxzX3NjaGVtYV9qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLnNjaGVtYUZ1bmN0aW9uKShycGMudW5yZWdpc3Rlcl9zZXJ2aWNlLmJpbmQocnBjKSwge1xuICAgIG5hbWU6IFwidW5yZWdpc3RlclNlcnZpY2VcIixcbiAgICBkZXNjcmlwdGlvbjogXCJVbnJlZ2lzdGVyIGEgc2VydmljZS5cIixcbiAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHNlcnZpY2U6IHtcbiAgICAgICAgICBkZXNjcmlwdGlvbjogXCJUaGUgc2VydmljZSBpZCB0byB1bnJlZ2lzdGVyXCIsXG4gICAgICAgICAgdHlwZTogXCJzdHJpbmdcIixcbiAgICAgICAgfSxcbiAgICAgICAgbm90aWZ5OiB7XG4gICAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogXCJOb3RpZnkgdGhlIHdvcmtzcGFjZSBtYW5hZ2VyXCIsXG4gICAgICAgICAgdHlwZTogXCJib29sZWFuXCIsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFtcInNlcnZpY2VcIl0sXG4gICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgIH0sXG4gIH0pO1xuICBpZiAoY29ubmVjdGlvbi5tYW5hZ2VyX2lkKSB7XG4gICAgcnBjLm9uKFwiZm9yY2UtZXhpdFwiLCBhc3luYyAobWVzc2FnZSkgPT4ge1xuICAgICAgaWYgKG1lc3NhZ2UuZnJvbSA9PT0gXCIqL1wiICsgY29ubmVjdGlvbi5tYW5hZ2VyX2lkKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRGlzY29ubmVjdGluZyBmcm9tIHNlcnZlciwgcmVhc29uOlwiLCBtZXNzYWdlLnJlYXNvbik7XG4gICAgICAgIGF3YWl0IHJwYy5kaXNjb25uZWN0KCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgaWYgKGNvbmZpZy53ZWJydGMpIHtcbiAgICBhd2FpdCAoMCxfd2VicnRjX2NsaWVudF9qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfM19fLnJlZ2lzdGVyUlRDU2VydmljZSkod20sIGAke2NsaWVudElkfS1ydGNgLCBjb25maWcud2VicnRjX2NvbmZpZyk7XG4gICAgLy8gbWFrZSBhIGNvcHkgb2Ygd20sIHNvIHdlYnJ0YyBjYW4gdXNlIHRoZSBvcmlnaW5hbCB3bS5nZXRTZXJ2aWNlXG4gICAgY29uc3QgX3dtID0gT2JqZWN0LmFzc2lnbih7fSwgd20pO1xuICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gX3dtLmdldFNlcnZpY2UuX19zY2hlbWFfXy5kZXNjcmlwdGlvbjtcbiAgICAvLyBUT0RPOiBGaXggdGhlIHNjaGVtYSBmb3IgYWRkaW5nIG9wdGlvbnMgZm9yIHdlYnJ0Y1xuICAgIGNvbnN0IHBhcmFtZXRlcnMgPSBfd20uZ2V0U2VydmljZS5fX3NjaGVtYV9fLnBhcmFtZXRlcnM7XG4gICAgd20uZ2V0U2VydmljZSA9ICgwLF91dGlsc19zY2hlbWFfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXy5zY2hlbWFGdW5jdGlvbikoXG4gICAgICB3ZWJydGNHZXRTZXJ2aWNlLmJpbmQobnVsbCwgX3dtLCBgJHt3b3Jrc3BhY2V9LyR7Y2xpZW50SWR9LXJ0Y2ApLFxuICAgICAge1xuICAgICAgICBuYW1lOiBcImdldFNlcnZpY2VcIixcbiAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgIHBhcmFtZXRlcnMsXG4gICAgICB9LFxuICAgICk7XG5cbiAgICB3bS5nZXRSVENTZXJ2aWNlID0gKDAsX3V0aWxzX3NjaGVtYV9qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLnNjaGVtYUZ1bmN0aW9uKShfd2VicnRjX2NsaWVudF9qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfM19fLmdldFJUQ1NlcnZpY2UuYmluZChudWxsLCB3bSksIHtcbiAgICAgIG5hbWU6IFwiZ2V0UlRDU2VydmljZVwiLFxuICAgICAgZGVzY3JpcHRpb246IFwiR2V0IHRoZSB3ZWJydGMgY29ubmVjdGlvbiwgcmV0dXJucyBhIHBlZXIgY29ubmVjdGlvbi5cIixcbiAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgIGNvbmZpZzoge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiVGhlIGNvbmZpZyBmb3IgdGhlIHdlYnJ0YyBzZXJ2aWNlXCIsXG4gICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHJlcXVpcmVkOiBbXCJjb25maWdcIl0sXG4gICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgICB9LFxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IF9nZXRTZXJ2aWNlID0gd20uZ2V0U2VydmljZTtcbiAgICB3bS5nZXRTZXJ2aWNlID0gKHF1ZXJ5LCBjb25maWcpID0+IHtcbiAgICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcbiAgICAgIHJldHVybiBfZ2V0U2VydmljZShxdWVyeSwgY29uZmlnKTtcbiAgICB9O1xuICAgIHdtLmdldFNlcnZpY2UuX19zY2hlbWFfXyA9IF9nZXRTZXJ2aWNlLl9fc2NoZW1hX187XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiByZWdpc3RlclByb2Jlcyhwcm9iZXMpIHtcbiAgICBwcm9iZXMuaWQgPSBcInByb2Jlc1wiO1xuICAgIHByb2Jlcy5uYW1lID0gXCJQcm9iZXNcIjtcbiAgICBwcm9iZXMuY29uZmlnID0geyB2aXNpYmlsaXR5OiBcInB1YmxpY1wiIH07XG4gICAgcHJvYmVzLnR5cGUgPSBcInByb2Jlc1wiO1xuICAgIHByb2Jlcy5kZXNjcmlwdGlvbiA9IGBQcm9iZXMgU2VydmljZSwgdmlzaXQgJHtzZXJ2ZXJfdXJsfS8ke3dvcmtzcGFjZX1zZXJ2aWNlcy9wcm9iZXMgZm9yIHRoZSBhdmFpbGFibGUgcHJvYmVzLmA7XG4gICAgcmV0dXJuIGF3YWl0IHdtLnJlZ2lzdGVyU2VydmljZShwcm9iZXMsIHsgb3ZlcndyaXRlOiB0cnVlIH0pO1xuICB9XG5cbiAgd20ucmVnaXN0ZXJQcm9iZXMgPSAoMCxfdXRpbHNfc2NoZW1hX2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18uc2NoZW1hRnVuY3Rpb24pKHJlZ2lzdGVyUHJvYmVzLCB7XG4gICAgbmFtZTogXCJyZWdpc3RlclByb2Jlc1wiLFxuICAgIGRlc2NyaXB0aW9uOiBcIlJlZ2lzdGVyIHByb2JlcyBzZXJ2aWNlXCIsXG4gICAgcGFyYW1ldGVyczoge1xuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBwcm9iZXM6IHtcbiAgICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgIFwiVGhlIHByb2JlcyB0byByZWdpc3RlciwgZS5nLiB7J2xpdmVuZXNzJzogeyd0eXBlJzogJ2Z1bmN0aW9uJywgJ2Rlc2NyaXB0aW9uJzogJ0NoZWNrIHRoZSBsaXZlbmVzcyBvZiB0aGUgc2VydmljZSd9fVwiLFxuICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFtcInByb2Jlc1wiXSxcbiAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgfSxcbiAgfSk7XG5cbiAgcmV0dXJuIHdtO1xufVxuXG5hc3luYyBmdW5jdGlvbiBnZXRSZW1vdGVTZXJ2aWNlKHNlcnZpY2VVcmksIGNvbmZpZyA9IHt9KSB7XG4gIGNvbnN0IHsgc2VydmVyVXJsLCB3b3Jrc3BhY2UsIGNsaWVudElkLCBzZXJ2aWNlSWQsIGFwcElkIH0gPVxuICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLnBhcnNlU2VydmljZVVybCkoc2VydmljZVVyaSk7XG4gIGNvbnN0IGZ1bGxTZXJ2aWNlSWQgPSBgJHt3b3Jrc3BhY2V9LyR7Y2xpZW50SWR9OiR7c2VydmljZUlkfUAke2FwcElkfWA7XG5cbiAgaWYgKGNvbmZpZy5zZXJ2ZXJVcmwpIHtcbiAgICBpZiAoY29uZmlnLnNlcnZlclVybCAhPT0gc2VydmVyVXJsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIFwic2VydmVyX3VybCBpbiBjb25maWcgZG9lcyBub3QgbWF0Y2ggdGhlIHNlcnZlcl91cmwgaW4gdGhlIHVybFwiLFxuICAgICAgKTtcbiAgICB9XG4gIH1cbiAgY29uZmlnLnNlcnZlclVybCA9IHNlcnZlclVybDtcbiAgY29uc3Qgc2VydmVyID0gYXdhaXQgY29ubmVjdFRvU2VydmVyKGNvbmZpZyk7XG4gIHJldHVybiBhd2FpdCBzZXJ2ZXIuZ2V0U2VydmljZShmdWxsU2VydmljZUlkKTtcbn1cblxuY2xhc3MgTG9jYWxXZWJTb2NrZXQge1xuICBjb25zdHJ1Y3Rvcih1cmwsIGNsaWVudF9pZCwgd29ya3NwYWNlKSB7XG4gICAgdGhpcy51cmwgPSB1cmw7XG4gICAgdGhpcy5vbm9wZW4gPSAoKSA9PiB7fTtcbiAgICB0aGlzLm9ubWVzc2FnZSA9ICgpID0+IHt9O1xuICAgIHRoaXMub25jbG9zZSA9ICgpID0+IHt9O1xuICAgIHRoaXMub25lcnJvciA9ICgpID0+IHt9O1xuICAgIHRoaXMuY2xpZW50X2lkID0gY2xpZW50X2lkO1xuICAgIHRoaXMud29ya3NwYWNlID0gd29ya3NwYWNlO1xuICAgIGNvbnN0IGNvbnRleHQgPSB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDogc2VsZjtcbiAgICBjb25zdCBpc1dpbmRvdyA9IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCI7XG4gICAgdGhpcy5wb3N0TWVzc2FnZSA9IChtZXNzYWdlKSA9PiB7XG4gICAgICBpZiAoaXNXaW5kb3cpIHtcbiAgICAgICAgd2luZG93LnBhcmVudC5wb3N0TWVzc2FnZShtZXNzYWdlLCBcIipcIik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZWxmLnBvc3RNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB0aGlzLnJlYWR5U3RhdGUgPSBXZWJTb2NrZXQuQ09OTkVDVElORztcbiAgICBjb250ZXh0LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBcIm1lc3NhZ2VcIixcbiAgICAgIChldmVudCkgPT4ge1xuICAgICAgICBjb25zdCB7IHR5cGUsIGRhdGEsIHRvIH0gPSBldmVudC5kYXRhO1xuICAgICAgICBpZiAodG8gIT09IHRoaXMuY2xpZW50X2lkKSB7XG4gICAgICAgICAgLy8gY29uc29sZS5kZWJ1ZyhcIm1lc3NhZ2Ugbm90IGZvciBtZVwiLCB0bywgdGhpcy5jbGllbnRfaWQpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICBjYXNlIFwibWVzc2FnZVwiOlxuICAgICAgICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PT0gV2ViU29ja2V0Lk9QRU4gJiYgdGhpcy5vbm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgdGhpcy5vbm1lc3NhZ2UoeyBkYXRhOiBkYXRhIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSBcImNvbm5lY3RlZFwiOlxuICAgICAgICAgICAgdGhpcy5yZWFkeVN0YXRlID0gV2ViU29ja2V0Lk9QRU47XG4gICAgICAgICAgICB0aGlzLm9ub3BlbihldmVudCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIFwiY2xvc2VkXCI6XG4gICAgICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSBXZWJTb2NrZXQuQ0xPU0VEO1xuICAgICAgICAgICAgdGhpcy5vbmNsb3NlKGV2ZW50KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGZhbHNlLFxuICAgICk7XG5cbiAgICBpZiAoIXRoaXMuY2xpZW50X2lkKSB0aHJvdyBuZXcgRXJyb3IoXCJjbGllbnRfaWQgaXMgcmVxdWlyZWRcIik7XG4gICAgaWYgKCF0aGlzLndvcmtzcGFjZSkgdGhyb3cgbmV3IEVycm9yKFwid29ya3NwYWNlIGlzIHJlcXVpcmVkXCIpO1xuICAgIHRoaXMucG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogXCJjb25uZWN0XCIsXG4gICAgICB1cmw6IHRoaXMudXJsLFxuICAgICAgZnJvbTogdGhpcy5jbGllbnRfaWQsXG4gICAgICB3b3Jrc3BhY2U6IHRoaXMud29ya3NwYWNlLFxuICAgIH0pO1xuICB9XG5cbiAgc2VuZChkYXRhKSB7XG4gICAgaWYgKHRoaXMucmVhZHlTdGF0ZSA9PT0gV2ViU29ja2V0Lk9QRU4pIHtcbiAgICAgIHRoaXMucG9zdE1lc3NhZ2Uoe1xuICAgICAgICB0eXBlOiBcIm1lc3NhZ2VcIixcbiAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgZnJvbTogdGhpcy5jbGllbnRfaWQsXG4gICAgICAgIHdvcmtzcGFjZTogdGhpcy53b3Jrc3BhY2UsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBjbG9zZSgpIHtcbiAgICB0aGlzLnJlYWR5U3RhdGUgPSBXZWJTb2NrZXQuQ0xPU0lORztcbiAgICB0aGlzLnBvc3RNZXNzYWdlKHtcbiAgICAgIHR5cGU6IFwiY2xvc2VcIixcbiAgICAgIGZyb206IHRoaXMuY2xpZW50X2lkLFxuICAgICAgd29ya3NwYWNlOiB0aGlzLndvcmtzcGFjZSxcbiAgICB9KTtcbiAgICB0aGlzLm9uY2xvc2UoKTtcbiAgfVxuXG4gIGFkZEV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpIHtcbiAgICBpZiAodHlwZSA9PT0gXCJtZXNzYWdlXCIpIHtcbiAgICAgIHRoaXMub25tZXNzYWdlID0gbGlzdGVuZXI7XG4gICAgfVxuICAgIGlmICh0eXBlID09PSBcIm9wZW5cIikge1xuICAgICAgdGhpcy5vbm9wZW4gPSBsaXN0ZW5lcjtcbiAgICB9XG4gICAgaWYgKHR5cGUgPT09IFwiY2xvc2VcIikge1xuICAgICAgdGhpcy5vbmNsb3NlID0gbGlzdGVuZXI7XG4gICAgfVxuICAgIGlmICh0eXBlID09PSBcImVycm9yXCIpIHtcbiAgICAgIHRoaXMub25lcnJvciA9IGxpc3RlbmVyO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzZXR1cExvY2FsQ2xpZW50KHtcbiAgZW5hYmxlX2V4ZWN1dGlvbiA9IGZhbHNlLFxuICBvbl9yZWFkeSA9IG51bGwsXG59KSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgY29udGV4dCA9IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiBzZWxmO1xuICAgIGNvbnN0IGlzV2luZG93ID0gdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIjtcbiAgICBjb250ZXh0LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBcIm1lc3NhZ2VcIixcbiAgICAgIChldmVudCkgPT4ge1xuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgdHlwZSxcbiAgICAgICAgICBzZXJ2ZXJfdXJsLFxuICAgICAgICAgIHdvcmtzcGFjZSxcbiAgICAgICAgICBjbGllbnRfaWQsXG4gICAgICAgICAgdG9rZW4sXG4gICAgICAgICAgbWV0aG9kX3RpbWVvdXQsXG4gICAgICAgICAgbmFtZSxcbiAgICAgICAgICBjb25maWcsXG4gICAgICAgIH0gPSBldmVudC5kYXRhO1xuXG4gICAgICAgIGlmICh0eXBlID09PSBcImluaXRpYWxpemVIeXBoYUNsaWVudFwiKSB7XG4gICAgICAgICAgaWYgKCFzZXJ2ZXJfdXJsIHx8ICF3b3Jrc3BhY2UgfHwgIWNsaWVudF9pZCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcInNlcnZlcl91cmwsIHdvcmtzcGFjZSwgYW5kIGNsaWVudF9pZCBhcmUgcmVxdWlyZWQuXCIpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghc2VydmVyX3VybC5zdGFydHNXaXRoKFwiaHR0cHM6Ly9sb2NhbC1oeXBoYS1zZXJ2ZXI6XCIpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICAgICBcInNlcnZlcl91cmwgc2hvdWxkIHN0YXJ0IHdpdGggaHR0cHM6Ly9sb2NhbC1oeXBoYS1zZXJ2ZXI6XCIsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNsYXNzIEZpeGVkTG9jYWxXZWJTb2NrZXQgZXh0ZW5kcyBMb2NhbFdlYlNvY2tldCB7XG4gICAgICAgICAgICBjb25zdHJ1Y3Rvcih1cmwpIHtcbiAgICAgICAgICAgICAgLy8gQ2FsbCB0aGUgcGFyZW50IGNsYXNzJ3MgY29uc3RydWN0b3Igd2l0aCBmaXhlZCB2YWx1ZXNcbiAgICAgICAgICAgICAgc3VwZXIodXJsLCBjbGllbnRfaWQsIHdvcmtzcGFjZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbm5lY3RUb1NlcnZlcih7XG4gICAgICAgICAgICBzZXJ2ZXJfdXJsLFxuICAgICAgICAgICAgd29ya3NwYWNlLFxuICAgICAgICAgICAgY2xpZW50X2lkLFxuICAgICAgICAgICAgdG9rZW4sXG4gICAgICAgICAgICBtZXRob2RfdGltZW91dCxcbiAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICBXZWJTb2NrZXRDbGFzczogRml4ZWRMb2NhbFdlYlNvY2tldCxcbiAgICAgICAgICB9KS50aGVuKGFzeW5jIChzZXJ2ZXIpID0+IHtcbiAgICAgICAgICAgIGdsb2JhbFRoaXMuYXBpID0gc2VydmVyO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgLy8gZm9yIGlmcmFtZVxuICAgICAgICAgICAgICBpZiAoaXNXaW5kb3cgJiYgZW5hYmxlX2V4ZWN1dGlvbikge1xuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGxvYWRTY3JpcHQoc2NyaXB0KSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzY3JpcHRFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtcbiAgICAgICAgICAgICAgICAgICAgc2NyaXB0RWxlbWVudC5pbm5lckhUTUwgPSBzY3JpcHQuY29udGVudDtcbiAgICAgICAgICAgICAgICAgICAgc2NyaXB0RWxlbWVudC5sYW5nID0gc2NyaXB0Lmxhbmc7XG5cbiAgICAgICAgICAgICAgICAgICAgc2NyaXB0RWxlbWVudC5vbmxvYWQgPSAoKSA9PiByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgICAgIHNjcmlwdEVsZW1lbnQub25lcnJvciA9IChlKSA9PiByZWplY3QoZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzY3JpcHRFbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLnN0eWxlcyAmJiBjb25maWcuc3R5bGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc3R5bGUgb2YgY29uZmlnLnN0eWxlcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdHlsZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG4gICAgICAgICAgICAgICAgICAgIHN0eWxlRWxlbWVudC5pbm5lckhUTUwgPSBzdHlsZS5jb250ZW50O1xuICAgICAgICAgICAgICAgICAgICBzdHlsZUVsZW1lbnQubGFuZyA9IHN0eWxlLmxhbmc7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGVFbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpZy5saW5rcyAmJiBjb25maWcubGlua3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBsaW5rIG9mIGNvbmZpZy5saW5rcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsaW5rRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuICAgICAgICAgICAgICAgICAgICBsaW5rRWxlbWVudC5ocmVmID0gbGluay51cmw7XG4gICAgICAgICAgICAgICAgICAgIGxpbmtFbGVtZW50LmlubmVyVGV4dCA9IGxpbmsudGV4dDtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChsaW5rRWxlbWVudCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjb25maWcud2luZG93cyAmJiBjb25maWcud2luZG93cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHcgb2YgY29uZmlnLndpbmRvd3MpIHtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5pbm5lckhUTUwgPSB3LmNvbnRlbnQ7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLnNjcmlwdHMgJiYgY29uZmlnLnNjcmlwdHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBzY3JpcHQgb2YgY29uZmlnLnNjcmlwdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjcmlwdC5sYW5nICE9PSBcImphdmFzY3JpcHRcIilcbiAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IGphdmFzY3JpcHQgc2NyaXB0cyBhcmUgc3VwcG9ydGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBsb2FkU2NyaXB0KHNjcmlwdCk7IC8vIEF3YWl0IHRoZSBsb2FkaW5nIG9mIGVhY2ggc2NyaXB0XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIGZvciB3ZWIgd29ya2VyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKFxuICAgICAgICAgICAgICAgICFpc1dpbmRvdyAmJlxuICAgICAgICAgICAgICAgIGVuYWJsZV9leGVjdXRpb24gJiZcbiAgICAgICAgICAgICAgICBjb25maWcuc2NyaXB0cyAmJlxuICAgICAgICAgICAgICAgIGNvbmZpZy5zY3JpcHRzLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzY3JpcHQgb2YgY29uZmlnLnNjcmlwdHMpIHtcbiAgICAgICAgICAgICAgICAgIGlmIChzY3JpcHQubGFuZyAhPT0gXCJqYXZhc2NyaXB0XCIpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk9ubHkgamF2YXNjcmlwdCBzY3JpcHRzIGFyZSBzdXBwb3J0ZWRcIik7XG4gICAgICAgICAgICAgICAgICBldmFsKHNjcmlwdC5jb250ZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBpZiAob25fcmVhZHkpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBvbl9yZWFkeShzZXJ2ZXIsIGNvbmZpZyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzb2x2ZShzZXJ2ZXIpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBmYWxzZSxcbiAgICApO1xuICAgIGlmIChpc1dpbmRvdykge1xuICAgICAgd2luZG93LnBhcmVudC5wb3N0TWVzc2FnZSh7IHR5cGU6IFwiaHlwaGFDbGllbnRSZWFkeVwiIH0sIFwiKlwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2VsZi5wb3N0TWVzc2FnZSh7IHR5cGU6IFwiaHlwaGFDbGllbnRSZWFkeVwiIH0pO1xuICAgIH1cbiAgfSk7XG59XG5cbi8qKioqKiovIFx0cmV0dXJuIF9fd2VicGFja19leHBvcnRzX187XG4vKioqKioqLyB9KSgpXG47XG59KTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWh5cGhhLXJwYy13ZWJzb2NrZXQuanMubWFwIiwibW9kdWxlLmV4cG9ydHMgPSB7IGh5cGhhV2Vic29ja2V0Q2xpZW50OiByZXF1aXJlKFwiLi9kaXN0L2h5cGhhLXJwYy13ZWJzb2NrZXQuanNcIil9OyIsImltcG9ydCAqIGFzIHZzY29kZSBmcm9tICd2c2NvZGUnO1xuaW1wb3J0IHsgSHlwaGFBdXRoUHJvdmlkZXIgfSBmcm9tICcuLi9wcm92aWRlcnMvSHlwaGFBdXRoUHJvdmlkZXInO1xuXG5leHBvcnQgZnVuY3Rpb24gc2hvd1dlbGNvbWVQYWdlKGNvbnRleHQ6IHZzY29kZS5FeHRlbnNpb25Db250ZXh0LCBhdXRoUHJvdmlkZXI6IEh5cGhhQXV0aFByb3ZpZGVyKSB7XG4gICAgY29uc3QgcGFuZWwgPSB2c2NvZGUud2luZG93LmNyZWF0ZVdlYnZpZXdQYW5lbChcbiAgICAgICAgJ2h5cGhhLXdvcmtzcGFjZS13ZWxjb21lJyxcbiAgICAgICAgJ1dlbGNvbWUgdG8gSHlwaGEgV29ya3NwYWNlJyxcbiAgICAgICAgdnNjb2RlLlZpZXdDb2x1bW4uT25lLFxuICAgICAgICB7XG4gICAgICAgICAgICBlbmFibGVTY3JpcHRzOiB0cnVlLFxuICAgICAgICAgICAgcmV0YWluQ29udGV4dFdoZW5IaWRkZW46IHRydWVcbiAgICAgICAgfVxuICAgICk7XG5cbiAgICAvLyBIYW5kbGUgbWVzc2FnZXMgZnJvbSB0aGUgd2Vidmlld1xuICAgIHBhbmVsLndlYnZpZXcub25EaWRSZWNlaXZlTWVzc2FnZShcbiAgICAgICAgYXN5bmMgbWVzc2FnZSA9PiB7XG4gICAgICAgICAgICBzd2l0Y2ggKG1lc3NhZ2UuY29tbWFuZCkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ2xvZ2luJzpcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflJAgV2VidmlldyBsb2dpbiByZXF1ZXN0IHJlY2VpdmVkJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN1Y2Nlc3MgPSBhd2FpdCBhdXRoUHJvdmlkZXIubG9naW4oKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgV2VidmlldyBsb2dpbiBzdWNjZXNzZnVsJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYW5lbC53ZWJ2aWV3LnBvc3RNZXNzYWdlKHsgY29tbWFuZDogJ2xvZ2luU3VjY2VzcycsIHVzZXI6IGF1dGhQcm92aWRlci5nZXRVc2VyKCkgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn4p2MIFdlYnZpZXcgbG9naW4gZmFpbGVkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYW5lbC53ZWJ2aWV3LnBvc3RNZXNzYWdlKHsgY29tbWFuZDogJ2xvZ2luRXJyb3InLCBlcnJvcjogJ0xvZ2luIGZhaWxlZCcgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnbG9nb3V0JzpcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflJMgV2VidmlldyBsb2dvdXQgcmVxdWVzdCByZWNlaXZlZCcpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBhdXRoUHJvdmlkZXIubG9nb3V0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgV2VidmlldyBsb2dvdXQgY29tcGxldGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIHBhbmVsLndlYnZpZXcucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAnbG9nb3V0U3VjY2VzcycgfSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2Nvbm5lY3RIeXBoYSc6XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OBIFdlYnZpZXcgY29ubmVjdCB0byBIeXBoYSByZXF1ZXN0IHJlY2VpdmVkJyk7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBVc2UgaHlwaGE6Ly8gc2NoZW1lIGNvbnNpc3RlbnRseSAgXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmkgPSB2c2NvZGUuVXJpLnBhcnNlKCdoeXBoYTovL2FnZW50LWxhYi1wcm9qZWN0cycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4EgT3BlbmluZyBmb2xkZXIgd2l0aCBVUkk6JywgdXJpLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB2c2NvZGUuY29tbWFuZHMuZXhlY3V0ZUNvbW1hbmQoJ3ZzY29kZS5vcGVuRm9sZGVyJywgdXJpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgRm9sZGVyIG9wZW5lZCBzdWNjZXNzZnVsbHkgZnJvbSB3ZWJ2aWV3Jyk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRmFpbGVkIHRvIG9wZW4gZm9sZGVyIGZyb20gd2VidmlldzonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYW5lbC53ZWJ2aWV3LnBvc3RNZXNzYWdlKHsgY29tbWFuZDogJ2Vycm9yJywgZXJyb3I6IGBGYWlsZWQgdG8gb3BlbiBwcm9qZWN0czogJHtlcnJvcn1gIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgIGNvbnRleHQuc3Vic2NyaXB0aW9uc1xuICAgICk7XG5cbiAgICAvLyBTZXQgaW5pdGlhbCBIVE1MIGNvbnRlbnRcbiAgICB1cGRhdGVXZWJ2aWV3Q29udGVudChwYW5lbCwgYXV0aFByb3ZpZGVyKTtcbiAgICBcbiAgICAvLyBVcGRhdGUgY29udGVudCByZWFjdGl2ZWx5IHdoZW4gYXV0aCBzdGF0ZSBjaGFuZ2VzXG4gICAgY29uc3QgYXV0aFN0YXRlU3Vic2NyaXB0aW9uID0gYXV0aFByb3ZpZGVyLm9uQXV0aFN0YXRlQ2hhbmdlZCgoYXV0aFN0YXRlKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5SEIEF1dGggc3RhdGUgY2hhbmdlZCwgdXBkYXRpbmcgd2VidmlldyBjb250ZW50Jyk7XG4gICAgICAgIHVwZGF0ZVdlYnZpZXdDb250ZW50KHBhbmVsLCBhdXRoUHJvdmlkZXIpO1xuICAgIH0pO1xuXG4gICAgcGFuZWwub25EaWREaXNwb3NlKCgpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfl5HvuI8gRGlzcG9zaW5nIHdlbGNvbWUgcGFnZSByZXNvdXJjZXMnKTtcbiAgICAgICAgYXV0aFN0YXRlU3Vic2NyaXB0aW9uLmRpc3Bvc2UoKTtcbiAgICB9KTtcblxuICAgIHJldHVybiBwYW5lbDtcbn1cblxuZnVuY3Rpb24gdXBkYXRlV2Vidmlld0NvbnRlbnQocGFuZWw6IHZzY29kZS5XZWJ2aWV3UGFuZWwsIGF1dGhQcm92aWRlcjogSHlwaGFBdXRoUHJvdmlkZXIpIHtcbiAgICBjb25zdCBpc0F1dGhlbnRpY2F0ZWQgPSBhdXRoUHJvdmlkZXIuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgY29uc3QgdXNlciA9IGF1dGhQcm92aWRlci5nZXRVc2VyKCk7XG5cbiAgICBwYW5lbC53ZWJ2aWV3Lmh0bWwgPSBnZXRXZWJ2aWV3Q29udGVudChpc0F1dGhlbnRpY2F0ZWQsIHVzZXIpO1xufVxuXG5mdW5jdGlvbiBnZXRXZWJ2aWV3Q29udGVudChpc0F1dGhlbnRpY2F0ZWQ6IGJvb2xlYW4sIHVzZXI6IGFueSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGA8IURPQ1RZUEUgaHRtbD5cbjxodG1sIGxhbmc9XCJlblwiPlxuPGhlYWQ+XG4gICAgPG1ldGEgY2hhcnNldD1cIlVURi04XCI+XG4gICAgPG1ldGEgbmFtZT1cInZpZXdwb3J0XCIgY29udGVudD1cIndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjBcIj5cbiAgICA8dGl0bGU+V2VsY29tZSB0byBIeXBoYSBXb3Jrc3BhY2U8L3RpdGxlPlxuICAgIDxzdHlsZT5cbiAgICAgICAgYm9keSB7XG4gICAgICAgICAgICBmb250LWZhbWlseTogLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCAnU2Vnb2UgVUknLCAnUm9ib3RvJywgc2Fucy1zZXJpZjtcbiAgICAgICAgICAgIHBhZGRpbmc6IDIwcHg7XG4gICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS12c2NvZGUtZWRpdG9yLWJhY2tncm91bmQpO1xuICAgICAgICAgICAgY29sb3I6IHZhcigtLXZzY29kZS1lZGl0b3ItZm9yZWdyb3VuZCk7XG4gICAgICAgICAgICBsaW5lLWhlaWdodDogMS42O1xuICAgICAgICB9XG4gICAgICAgIC5jb250YWluZXIge1xuICAgICAgICAgICAgbWF4LXdpZHRoOiA4MDBweDtcbiAgICAgICAgICAgIG1hcmdpbjogMCBhdXRvO1xuICAgICAgICB9XG4gICAgICAgIC5oZWFkZXIge1xuICAgICAgICAgICAgdGV4dC1hbGlnbjogY2VudGVyO1xuICAgICAgICAgICAgbWFyZ2luLWJvdHRvbTogNDBweDtcbiAgICAgICAgfVxuICAgICAgICAuaGVhZGVyIGgxIHtcbiAgICAgICAgICAgIGZvbnQtc2l6ZTogMi41ZW07XG4gICAgICAgICAgICBtYXJnaW4tYm90dG9tOiAxMHB4O1xuICAgICAgICAgICAgY29sb3I6IHZhcigtLXZzY29kZS10ZXh0TGluay1mb3JlZ3JvdW5kKTtcbiAgICAgICAgfVxuICAgICAgICAuaGVhZGVyIHAge1xuICAgICAgICAgICAgZm9udC1zaXplOiAxLjJlbTtcbiAgICAgICAgICAgIG9wYWNpdHk6IDAuODtcbiAgICAgICAgfVxuICAgICAgICAubG9naW4tc2VjdGlvbiB7XG4gICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS12c2NvZGUtZWRpdG9yLWluYWN0aXZlU2VsZWN0aW9uQmFja2dyb3VuZCk7XG4gICAgICAgICAgICBwYWRkaW5nOiAzMHB4O1xuICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogOHB4O1xuICAgICAgICAgICAgbWFyZ2luLWJvdHRvbTogMzBweDtcbiAgICAgICAgICAgIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgICAgICAgfVxuICAgICAgICAudXNlci1pbmZvIHtcbiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6IHZhcigtLXZzY29kZS1pbnB1dFZhbGlkYXRpb24taW5mb0JhY2tncm91bmQpO1xuICAgICAgICAgICAgcGFkZGluZzogMjBweDtcbiAgICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDhweDtcbiAgICAgICAgICAgIG1hcmdpbi1ib3R0b206IDMwcHg7XG4gICAgICAgICAgICBib3JkZXItbGVmdDogNHB4IHNvbGlkIHZhcigtLXZzY29kZS1pbnB1dFZhbGlkYXRpb24taW5mb0JvcmRlcik7XG4gICAgICAgIH1cbiAgICAgICAgLmZlYXR1cmVzIHtcbiAgICAgICAgICAgIGRpc3BsYXk6IGdyaWQ7XG4gICAgICAgICAgICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IHJlcGVhdChhdXRvLWZpdCwgbWlubWF4KDI1MHB4LCAxZnIpKTtcbiAgICAgICAgICAgIGdhcDogMjBweDtcbiAgICAgICAgICAgIG1hcmdpbi1ib3R0b206IDQwcHg7XG4gICAgICAgIH1cbiAgICAgICAgLmZlYXR1cmUge1xuICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogdmFyKC0tdnNjb2RlLWVkaXRvci1pbmFjdGl2ZVNlbGVjdGlvbkJhY2tncm91bmQpO1xuICAgICAgICAgICAgcGFkZGluZzogMjBweDtcbiAgICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDhweDtcbiAgICAgICAgfVxuICAgICAgICAuZmVhdHVyZSBoMyB7XG4gICAgICAgICAgICBjb2xvcjogdmFyKC0tdnNjb2RlLXRleHRMaW5rLWZvcmVncm91bmQpO1xuICAgICAgICAgICAgbWFyZ2luLWJvdHRvbTogMTBweDtcbiAgICAgICAgfVxuICAgICAgICAuYnRuIHtcbiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6IHZhcigtLXZzY29kZS1idXR0b24tYmFja2dyb3VuZCk7XG4gICAgICAgICAgICBjb2xvcjogdmFyKC0tdnNjb2RlLWJ1dHRvbi1mb3JlZ3JvdW5kKTtcbiAgICAgICAgICAgIGJvcmRlcjogbm9uZTtcbiAgICAgICAgICAgIHBhZGRpbmc6IDEycHggMjRweDtcbiAgICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDRweDtcbiAgICAgICAgICAgIGN1cnNvcjogcG9pbnRlcjtcbiAgICAgICAgICAgIGZvbnQtc2l6ZTogMTRweDtcbiAgICAgICAgICAgIG1hcmdpbjogNXB4O1xuICAgICAgICAgICAgdHJhbnNpdGlvbjogYmFja2dyb3VuZC1jb2xvciAwLjJzO1xuICAgICAgICB9XG4gICAgICAgIC5idG46aG92ZXIge1xuICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogdmFyKC0tdnNjb2RlLWJ1dHRvbi1ob3ZlckJhY2tncm91bmQpO1xuICAgICAgICB9XG4gICAgICAgIC5idG4tc2Vjb25kYXJ5IHtcbiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6IHZhcigtLXZzY29kZS1idXR0b24tc2Vjb25kYXJ5QmFja2dyb3VuZCk7XG4gICAgICAgICAgICBjb2xvcjogdmFyKC0tdnNjb2RlLWJ1dHRvbi1zZWNvbmRhcnlGb3JlZ3JvdW5kKTtcbiAgICAgICAgfVxuICAgICAgICAuYnRuLXNlY29uZGFyeTpob3ZlciB7XG4gICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS12c2NvZGUtYnV0dG9uLXNlY29uZGFyeUhvdmVyQmFja2dyb3VuZCk7XG4gICAgICAgIH1cbiAgICAgICAgLnN0YXR1cyB7XG4gICAgICAgICAgICBwYWRkaW5nOiAxMHB4O1xuICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogNHB4O1xuICAgICAgICAgICAgbWFyZ2luOiAxMHB4IDA7XG4gICAgICAgIH1cbiAgICAgICAgLnN0YXR1cy5zdWNjZXNzIHtcbiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6IHZhcigtLXZzY29kZS1pbnB1dFZhbGlkYXRpb24taW5mb0JhY2tncm91bmQpO1xuICAgICAgICAgICAgY29sb3I6IHZhcigtLXZzY29kZS1pbnB1dFZhbGlkYXRpb24taW5mb0ZvcmVncm91bmQpO1xuICAgICAgICB9XG4gICAgICAgIC5zdGF0dXMuZXJyb3Ige1xuICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogdmFyKC0tdnNjb2RlLWlucHV0VmFsaWRhdGlvbi1lcnJvckJhY2tncm91bmQpO1xuICAgICAgICAgICAgY29sb3I6IHZhcigtLXZzY29kZS1pbnB1dFZhbGlkYXRpb24tZXJyb3JGb3JlZ3JvdW5kKTtcbiAgICAgICAgfVxuICAgIDwvc3R5bGU+XG48L2hlYWQ+XG48Ym9keT5cbiAgICA8ZGl2IGNsYXNzPVwiY29udGFpbmVyXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5cbiAgICAgICAgICAgIDxoMT7wn6eqIEh5cGhhIFdvcmtzcGFjZTwvaDE+XG4gICAgICAgICAgICA8cD5Zb3VyIHRhaWxvcmVkIFZTIENvZGUgZW52aXJvbm1lbnQgZm9yIEh5cGhhIHNlcnZlciBpbnRlZ3JhdGlvbjwvcD5cbiAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgJHtpc0F1dGhlbnRpY2F0ZWQgPyBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidXNlci1pbmZvXCI+XG4gICAgICAgICAgICAgICAgPGgzPuKchSBDb25uZWN0ZWQgdG8gSHlwaGEgU2VydmVyPC9oMz5cbiAgICAgICAgICAgICAgICA8cD48c3Ryb25nPkxvZ2dlZCBpbiBhczo8L3N0cm9uZz4gJHt1c2VyPy5lbWFpbCB8fCAnVW5rbm93bid9PC9wPlxuICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJidG4gYnRuLXNlY29uZGFyeVwiIG9uY2xpY2s9XCJsb2dvdXQoKVwiPkxvZ291dDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJidG5cIiBvbmNsaWNrPVwiY29ubmVjdEh5cGhhKClcIj5Ccm93c2UgSHlwaGEgUHJvamVjdHM8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgIDogYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxvZ2luLXNlY3Rpb25cIj5cbiAgICAgICAgICAgICAgICA8aDM+8J+UkCBDb25uZWN0IHRvIEh5cGhhIFNlcnZlcjwvaDM+XG4gICAgICAgICAgICAgICAgPHA+TG9naW4gdG8gYWNjZXNzIHlvdXIgcHJvamVjdHMgYW5kIGNvbGxhYm9yYXRlIHdpdGggdGhlIEh5cGhhIGVjb3N5c3RlbTwvcD5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiYnRuXCIgb25jbGljaz1cImxvZ2luKClcIj5Mb2dpbiB0byBIeXBoYTwvYnV0dG9uPlxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJzdGF0dXNcIj48L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgfVxuXG4gICAgICAgIDxkaXYgY2xhc3M9XCJmZWF0dXJlc1wiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZlYXR1cmVcIj5cbiAgICAgICAgICAgICAgICA8aDM+8J+Xgu+4jyBQcm9qZWN0IE1hbmFnZW1lbnQ8L2gzPlxuICAgICAgICAgICAgICAgIDxwPkFjY2VzcyBhbmQgbWFuYWdlIHlvdXIgSHlwaGEgcHJvamVjdHMgZGlyZWN0bHkgZnJvbSBWUyBDb2RlLiBCcm93c2UsIGVkaXQsIGFuZCBzeW5jIGZpbGVzIHNlYW1sZXNzbHkuPC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmVhdHVyZVwiPlxuICAgICAgICAgICAgICAgIDxoMz7wn5SEIFJlYWwtdGltZSBTeW5jPC9oMz5cbiAgICAgICAgICAgICAgICA8cD5DaGFuZ2VzIGFyZSBhdXRvbWF0aWNhbGx5IHN5bmNocm9uaXplZCB3aXRoIHRoZSBIeXBoYSBzZXJ2ZXIsIGVuYWJsaW5nIGNvbGxhYm9yYXRpdmUgZGV2ZWxvcG1lbnQuPC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmVhdHVyZVwiPlxuICAgICAgICAgICAgICAgIDxoMz7wn5ug77iPIEFydGlmYWN0IE1hbmFnZXI8L2gzPlxuICAgICAgICAgICAgICAgIDxwPkxldmVyYWdlIHRoZSBIeXBoYSBBcnRpZmFjdCBNYW5hZ2VyIGZvciBtYW5hZ2luZyBkYXRhc2V0cywgbW9kZWxzLCBhbmQgYXBwbGljYXRpb25zLjwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjogY2VudGVyOyBvcGFjaXR5OiAwLjc7IGZvbnQtc2l6ZTogMC45ZW07XCI+XG4gICAgICAgICAgICA8cD5IeXBoYSBXb3Jrc3BhY2UgdjEuMC4wIHwgUG93ZXJlZCBieSBIeXBoYTwvcD5cbiAgICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG5cbiAgICA8c2NyaXB0PlxuICAgICAgICBjb25zdCB2c2NvZGUgPSBhY3F1aXJlVnNDb2RlQXBpKCk7XG5cbiAgICAgICAgZnVuY3Rpb24gbG9naW4oKSB7XG4gICAgICAgICAgICBjb25zdCBzdGF0dXNFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzdGF0dXMnKTtcbiAgICAgICAgICAgIGlmIChzdGF0dXNFbCkge1xuICAgICAgICAgICAgICAgIHN0YXR1c0VsLmlubmVySFRNTCA9ICc8ZGl2IGNsYXNzPVwic3RhdHVzXCI+SW5pdGlhdGluZyBsb2dpbi4uLjwvZGl2Pic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2c2NvZGUucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAnbG9naW4nIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gbG9nb3V0KCkge1xuICAgICAgICAgICAgdnNjb2RlLnBvc3RNZXNzYWdlKHsgY29tbWFuZDogJ2xvZ291dCcgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBjb25uZWN0SHlwaGEoKSB7XG4gICAgICAgICAgICB2c2NvZGUucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAnY29ubmVjdEh5cGhhJyB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIExpc3RlbiBmb3IgbWVzc2FnZXMgZnJvbSB0aGUgZXh0ZW5zaW9uXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZXZlbnQgPT4ge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGV2ZW50LmRhdGE7XG4gICAgICAgICAgICBjb25zdCBzdGF0dXNFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzdGF0dXMnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc3dpdGNoIChtZXNzYWdlLmNvbW1hbmQpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdsb2dpblN1Y2Nlc3MnOlxuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHVzRWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1c0VsLmlubmVySFRNTCA9ICc8ZGl2IGNsYXNzPVwic3RhdHVzIHN1Y2Nlc3NcIj5Mb2dpbiBzdWNjZXNzZnVsISBSZWxvYWRpbmcuLi48L2Rpdj4nO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdsb2dpbkVycm9yJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXR1c0VsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNFbC5pbm5lckhUTUwgPSAnPGRpdiBjbGFzcz1cInN0YXR1cyBlcnJvclwiPkxvZ2luIGZhaWxlZDogJyArIG1lc3NhZ2UuZXJyb3IgKyAnPC9kaXY+JztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdsb2dvdXRTdWNjZXNzJzpcbiAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICA8L3NjcmlwdD5cbjwvYm9keT5cbjwvaHRtbD5gO1xufSAiLCJpbXBvcnQgKiBhcyB2c2NvZGUgZnJvbSAndnNjb2RlJztcbmltcG9ydCB7IEh5cGhhRmlsZVN5c3RlbVByb3ZpZGVyIH0gZnJvbSAnLi9wcm92aWRlcnMvSHlwaGFGaWxlU3lzdGVtUHJvdmlkZXInO1xuaW1wb3J0IHsgSHlwaGFBdXRoUHJvdmlkZXIgfSBmcm9tICcuL3Byb3ZpZGVycy9IeXBoYUF1dGhQcm92aWRlcic7XG5pbXBvcnQgeyBzaG93V2VsY29tZVBhZ2UgfSBmcm9tICcuL2NvbXBvbmVudHMvV2VsY29tZVBhZ2UnO1xuXG5leHBvcnQgZnVuY3Rpb24gYWN0aXZhdGUoY29udGV4dDogdnNjb2RlLkV4dGVuc2lvbkNvbnRleHQpIHtcbiAgICBjb25zb2xlLmxvZygn8J+agCBIeXBoYSBXb3Jrc3BhY2UgZXh0ZW5zaW9uIGlzIG5vdyBhY3RpdmUhJyk7XG5cbiAgICAvLyBJbml0aWFsaXplIGF1dGhlbnRpY2F0aW9uIHByb3ZpZGVyXG4gICAgY29uc3QgYXV0aFByb3ZpZGVyID0gbmV3IEh5cGhhQXV0aFByb3ZpZGVyKGNvbnRleHQpO1xuICAgIGNvbnNvbGUubG9nKCfinIUgQXV0aCBwcm92aWRlciBpbml0aWFsaXplZCcpO1xuICAgIFxuICAgIC8vIEluaXRpYWxpemUgZmlsZXN5c3RlbSBwcm92aWRlclxuICAgIGNvbnN0IGZpbGVTeXN0ZW1Qcm92aWRlciA9IG5ldyBIeXBoYUZpbGVTeXN0ZW1Qcm92aWRlcihhdXRoUHJvdmlkZXIpO1xuICAgIGNvbnNvbGUubG9nKCfinIUgRmlsZSBzeXN0ZW0gcHJvdmlkZXIgaW5pdGlhbGl6ZWQnKTtcbiAgICBcbiAgICAvLyBSZWdpc3RlciBmaWxlc3lzdGVtIHByb3ZpZGVyXG4gICAgY29uc3QgZGlzcG9zYWJsZSA9IHZzY29kZS53b3Jrc3BhY2UucmVnaXN0ZXJGaWxlU3lzdGVtUHJvdmlkZXIoJ2h5cGhhJywgZmlsZVN5c3RlbVByb3ZpZGVyLCB7XG4gICAgICAgIGlzQ2FzZVNlbnNpdGl2ZTogdHJ1ZSxcbiAgICAgICAgaXNSZWFkb25seTogZmFsc2VcbiAgICB9KTtcbiAgICBcbiAgICBjb250ZXh0LnN1YnNjcmlwdGlvbnMucHVzaChkaXNwb3NhYmxlKTtcbiAgICBjb25zb2xlLmxvZygn4pyFIEZpbGUgc3lzdGVtIHByb3ZpZGVyIHJlZ2lzdGVyZWQgZm9yIGh5cGhhOi8vIHNjaGVtZScpO1xuXG4gICAgLy8gUmVnaXN0ZXIgY29tbWFuZHNcbiAgICBjb25zdCB3ZWxjb21lQ29tbWFuZCA9IHZzY29kZS5jb21tYW5kcy5yZWdpc3RlckNvbW1hbmQoJ2h5cGhhLXdvcmtzcGFjZS53ZWxjb21lJywgKCkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+SoSBXZWxjb21lIGNvbW1hbmQgZXhlY3V0ZWQnKTtcbiAgICAgICAgc2hvd1dlbGNvbWVQYWdlKGNvbnRleHQsIGF1dGhQcm92aWRlcik7XG4gICAgfSk7XG5cbiAgICBjb25zdCBsb2dpbkNvbW1hbmQgPSB2c2NvZGUuY29tbWFuZHMucmVnaXN0ZXJDb21tYW5kKCdoeXBoYS13b3Jrc3BhY2UubG9naW4nLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5SQIExvZ2luIGNvbW1hbmQgZXhlY3V0ZWQnKTtcbiAgICAgICAgY29uc3Qgc3VjY2VzcyA9IGF3YWl0IGF1dGhQcm92aWRlci5sb2dpbigpO1xuICAgICAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ+KchSBMb2dpbiBzdWNjZXNzZnVsJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn4p2MIExvZ2luIGZhaWxlZCcpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBsb2dvdXRDb21tYW5kID0gdnNjb2RlLmNvbW1hbmRzLnJlZ2lzdGVyQ29tbWFuZCgnaHlwaGEtd29ya3NwYWNlLmxvZ291dCcsIGFzeW5jICgpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ/CflJMgTG9nb3V0IGNvbW1hbmQgZXhlY3V0ZWQnKTtcbiAgICAgICAgYXdhaXQgYXV0aFByb3ZpZGVyLmxvZ291dCgpO1xuICAgICAgICBjb25zb2xlLmxvZygn4pyFIExvZ291dCBjb21wbGV0ZWQnKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IGJyb3dzZVByb2plY3RzQ29tbWFuZCA9IHZzY29kZS5jb21tYW5kcy5yZWdpc3RlckNvbW1hbmQoJ2h5cGhhLXdvcmtzcGFjZS5icm93c2VQcm9qZWN0cycsIGFzeW5jICgpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfk4EgQnJvd3NlIHByb2plY3RzIGNvbW1hbmQgZXhlY3V0ZWQnKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFVzZSBoeXBoYTovLyBzY2hlbWUgY29uc2lzdGVudGx5XG4gICAgICAgICAgICBjb25zdCB1cmkgPSB2c2NvZGUuVXJpLnBhcnNlKCdoeXBoYTovL2FnZW50LWxhYi1wcm9qZWN0cycpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4EgT3BlbmluZyBmb2xkZXIgd2l0aCBVUkk6JywgdXJpLnRvU3RyaW5nKCkpO1xuICAgICAgICBhd2FpdCB2c2NvZGUuY29tbWFuZHMuZXhlY3V0ZUNvbW1hbmQoJ3ZzY29kZS5vcGVuRm9sZGVyJywgdXJpKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgRm9sZGVyIG9wZW5lZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBGYWlsZWQgdG8gb3BlbiBmb2xkZXI6JywgZXJyb3IpO1xuICAgICAgICAgICAgdnNjb2RlLndpbmRvdy5zaG93RXJyb3JNZXNzYWdlKGBGYWlsZWQgdG8gb3BlbiBIeXBoYSBwcm9qZWN0czogJHtlcnJvcn1gKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQWRkIGNvbW1hbmRzIHRvIHN1YnNjcmlwdGlvbnNcbiAgICBjb250ZXh0LnN1YnNjcmlwdGlvbnMucHVzaCh3ZWxjb21lQ29tbWFuZCwgbG9naW5Db21tYW5kLCBsb2dvdXRDb21tYW5kLCBicm93c2VQcm9qZWN0c0NvbW1hbmQpO1xuICAgIGNvbnNvbGUubG9nKCfinIUgQ29tbWFuZHMgcmVnaXN0ZXJlZCcpO1xuXG4gICAgLy8gQWRkIHByb3ZpZGVycyB0byBzdWJzY3JpcHRpb25zIGZvciBwcm9wZXIgY2xlYW51cFxuICAgIGNvbnRleHQuc3Vic2NyaXB0aW9ucy5wdXNoKGF1dGhQcm92aWRlcik7XG5cbiAgICAvLyBTaG93IHdlbGNvbWUgcGFnZSBvbiBmaXJzdCBhY3RpdmF0aW9uXG4gICAgY29uc29sZS5sb2coJ/Cfk4QgU2hvd2luZyB3ZWxjb21lIHBhZ2UnKTtcbiAgICBzaG93V2VsY29tZVBhZ2UoY29udGV4dCwgYXV0aFByb3ZpZGVyKTtcbiAgICBcbiAgICBjb25zb2xlLmxvZygn8J+OiSBIeXBoYSBXb3Jrc3BhY2UgZXh0ZW5zaW9uIGFjdGl2YXRpb24gY29tcGxldGUhJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWFjdGl2YXRlKCkge1xuICAgIGNvbnNvbGUubG9nKCfwn5GLIEh5cGhhIFdvcmtzcGFjZSBleHRlbnNpb24gaXMgZGVhY3RpdmF0ZWQnKTtcbn0gIiwiaW1wb3J0ICogYXMgdnNjb2RlIGZyb20gJ3ZzY29kZSc7XG5cbmludGVyZmFjZSBMb2dpbkNvbmZpZyB7XG4gICAgc2VydmVyX3VybDogc3RyaW5nO1xuICAgIGxvZ2luX2NhbGxiYWNrOiAoY29udGV4dDogeyBsb2dpbl91cmw6IHN0cmluZyB9KSA9PiB2b2lkO1xufVxuXG5pbnRlcmZhY2UgSHlwaGFVc2VyIHtcbiAgICBlbWFpbDogc3RyaW5nO1xuICAgIGlkOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBIeXBoYUF1dGhQcm92aWRlciB7XG4gICAgcHJpdmF0ZSBjb250ZXh0OiB2c2NvZGUuRXh0ZW5zaW9uQ29udGV4dDtcbiAgICBwcml2YXRlIHRva2VuOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIHVzZXI6IEh5cGhhVXNlciB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgY2xpZW50OiBhbnkgPSBudWxsO1xuICAgIHByaXZhdGUgc2VydmVyOiBhbnkgPSBudWxsO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgc2VydmVyVXJsID0gXCJodHRwczovL2h5cGhhLmFpY2VsbC5pb1wiO1xuICAgIHByaXZhdGUgaXNDb25uZWN0aW5nID0gZmFsc2U7XG4gICAgcHJpdmF0ZSBjb25uZWN0aW9uUHJvbWlzZTogUHJvbWlzZTxhbnk+IHwgbnVsbCA9IG51bGw7XG4gICAgXG4gICAgLy8gRXZlbnQgZW1pdHRlcnMgZm9yIHJlYWN0aXZlIHVwZGF0ZXNcbiAgICBwcml2YXRlIF9vbkF1dGhTdGF0ZUNoYW5nZWQgPSBuZXcgdnNjb2RlLkV2ZW50RW1pdHRlcjx7IGlzQXV0aGVudGljYXRlZDogYm9vbGVhbjsgdXNlcjogSHlwaGFVc2VyIHwgbnVsbCB9PigpO1xuICAgIHJlYWRvbmx5IG9uQXV0aFN0YXRlQ2hhbmdlZCA9IHRoaXMuX29uQXV0aFN0YXRlQ2hhbmdlZC5ldmVudDtcblxuICAgIGNvbnN0cnVjdG9yKGNvbnRleHQ6IHZzY29kZS5FeHRlbnNpb25Db250ZXh0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5SQIEluaXRpYWxpemluZyBIeXBoYUF1dGhQcm92aWRlcicpO1xuICAgICAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICB0aGlzLmxvYWRTYXZlZEF1dGgoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGxvYWRTYXZlZEF1dGgoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5OlIExvYWRpbmcgc2F2ZWQgYXV0aGVudGljYXRpb24gZGF0YScpO1xuICAgICAgICAvLyBMb2FkIHRva2VuIGZyb20gd29ya3NwYWNlIHN0YXRlXG4gICAgICAgIHRoaXMudG9rZW4gPSB0aGlzLmNvbnRleHQud29ya3NwYWNlU3RhdGUuZ2V0KCdoeXBoYVRva2VuJykgfHwgbnVsbDtcbiAgICAgICAgdGhpcy51c2VyID0gdGhpcy5jb250ZXh0LndvcmtzcGFjZVN0YXRlLmdldCgnaHlwaGFVc2VyJykgfHwgbnVsbDtcbiAgICAgICAgXG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5OlIFRva2VuIGxvYWRlZDonLCB0aGlzLnRva2VuID8gJ1llcycgOiAnTm8nKTtcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfk6UgVXNlciBsb2FkZWQ6JywgdGhpcy51c2VyPy5lbWFpbCB8fCAnTm9uZScpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMudG9rZW4gJiYgdGhpcy5pc1Rva2VuVmFsaWQoKSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflIQgVG9rZW4gaXMgdmFsaWQsIGF0dGVtcHRpbmcgYXV0by1jb25uZWN0Jyk7XG4gICAgICAgICAgICB0aGlzLmF1dG9Db25uZWN0KCk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy50b2tlbikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ+KaoO+4jyBUb2tlbiBleGlzdHMgYnV0IGlzIGV4cGlyZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfihLnvuI8gTm8gc2F2ZWQgdG9rZW4gZm91bmQnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgaXNUb2tlblZhbGlkKCk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCB0b2tlbkV4cGlyeSA9IHRoaXMuY29udGV4dC53b3Jrc3BhY2VTdGF0ZS5nZXQoJ2h5cGhhVG9rZW5FeHBpcnknKTtcbiAgICAgICAgY29uc3QgaXNWYWxpZCA9IHRva2VuRXhwaXJ5ICYmIG5ldyBEYXRlKHRva2VuRXhwaXJ5IGFzIHN0cmluZykgPiBuZXcgRGF0ZSgpO1xuICAgICAgICBjb25zb2xlLmxvZygn8J+VkiBUb2tlbiB2YWxpZGl0eSBjaGVjayAtIEV4cGlyZXM6JywgdG9rZW5FeHBpcnksICdWYWxpZDonLCAhIWlzVmFsaWQpO1xuICAgICAgICByZXR1cm4gISFpc1ZhbGlkO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2F2ZUF1dGgodG9rZW46IHN0cmluZywgdXNlcj86IEh5cGhhVXNlcikge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+SviBTYXZpbmcgYXV0aGVudGljYXRpb24gZGF0YSBmb3IgdXNlcjonLCB1c2VyPy5lbWFpbCB8fCAndW5rbm93bicpO1xuICAgICAgICB0aGlzLnRva2VuID0gdG9rZW47XG4gICAgICAgIHRoaXMudXNlciA9IHVzZXIgfHwgbnVsbDtcbiAgICAgICAgXG4gICAgICAgIGF3YWl0IHRoaXMuY29udGV4dC53b3Jrc3BhY2VTdGF0ZS51cGRhdGUoJ2h5cGhhVG9rZW4nLCB0b2tlbik7XG4gICAgICAgIGF3YWl0IHRoaXMuY29udGV4dC53b3Jrc3BhY2VTdGF0ZS51cGRhdGUoJ2h5cGhhVXNlcicsIHVzZXIpO1xuICAgICAgICBhd2FpdCB0aGlzLmNvbnRleHQud29ya3NwYWNlU3RhdGUudXBkYXRlKCdoeXBoYVRva2VuRXhwaXJ5JywgXG4gICAgICAgICAgICBuZXcgRGF0ZShEYXRlLm5vdygpICsgMyAqIDYwICogNjAgKiAxMDAwKS50b0lTT1N0cmluZygpKTtcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfkr4gQXV0aGVudGljYXRpb24gZGF0YSBzYXZlZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZpcmUgYXV0aCBzdGF0ZSBjaGFuZ2VkIGV2ZW50XG4gICAgICAgIHRoaXMuZmlyZUF1dGhTdGF0ZUNoYW5nZWQoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNsZWFyQXV0aCgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfl5HvuI8gQ2xlYXJpbmcgYXV0aGVudGljYXRpb24gZGF0YScpO1xuICAgICAgICB0aGlzLnRva2VuID0gbnVsbDtcbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcbiAgICAgICAgdGhpcy5jbGllbnQgPSBudWxsO1xuICAgICAgICB0aGlzLnNlcnZlciA9IG51bGw7XG4gICAgICAgIHRoaXMuaXNDb25uZWN0aW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY29ubmVjdGlvblByb21pc2UgPSBudWxsO1xuICAgICAgICBcbiAgICAgICAgYXdhaXQgdGhpcy5jb250ZXh0LndvcmtzcGFjZVN0YXRlLnVwZGF0ZSgnaHlwaGFUb2tlbicsIHVuZGVmaW5lZCk7XG4gICAgICAgIGF3YWl0IHRoaXMuY29udGV4dC53b3Jrc3BhY2VTdGF0ZS51cGRhdGUoJ2h5cGhhVXNlcicsIHVuZGVmaW5lZCk7XG4gICAgICAgIGF3YWl0IHRoaXMuY29udGV4dC53b3Jrc3BhY2VTdGF0ZS51cGRhdGUoJ2h5cGhhVG9rZW5FeHBpcnknLCB1bmRlZmluZWQpO1xuICAgICAgICBjb25zb2xlLmxvZygn8J+Xke+4jyBBdXRoZW50aWNhdGlvbiBkYXRhIGNsZWFyZWQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZpcmUgYXV0aCBzdGF0ZSBjaGFuZ2VkIGV2ZW50XG4gICAgICAgIHRoaXMuZmlyZUF1dGhTdGF0ZUNoYW5nZWQoKTtcbiAgICB9XG5cbiAgICBhc3luYyBsb2dpbigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ/CflJAgU3RhcnRpbmcgbG9naW4gcHJvY2VzcyB0bzonLCB0aGlzLnNlcnZlclVybCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBJbXBvcnQgaHlwaGEtcnBjIGR5bmFtaWNhbGx5XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+TpiBJbXBvcnRpbmcgaHlwaGEtcnBjIG1vZHVsZScpO1xuICAgICAgICAgICAgY29uc3QgeyBoeXBoYVdlYnNvY2tldENsaWVudCB9ID0gYXdhaXQgaW1wb3J0KCdoeXBoYS1ycGMnKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OmIGh5cGhhLXJwYyBtb2R1bGUgaW1wb3J0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGNvbmZpZzogTG9naW5Db25maWcgPSB7XG4gICAgICAgICAgICAgICAgc2VydmVyX3VybDogdGhpcy5zZXJ2ZXJVcmwsXG4gICAgICAgICAgICAgICAgbG9naW5fY2FsbGJhY2s6IChjb250ZXh0OiB7IGxvZ2luX3VybDogc3RyaW5nIH0pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/CfjJAgT3BlbmluZyBsb2dpbiBVUkw6JywgY29udGV4dC5sb2dpbl91cmwpO1xuICAgICAgICAgICAgICAgICAgICB2c2NvZGUuZW52Lm9wZW5FeHRlcm5hbCh2c2NvZGUuVXJpLnBhcnNlKGNvbnRleHQubG9naW5fdXJsKSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5SQIFJlcXVlc3RpbmcgbG9naW4gdG9rZW4gZnJvbSBzZXJ2ZXInKTtcbiAgICAgICAgICAgIGNvbnN0IHRva2VuID0gYXdhaXQgaHlwaGFXZWJzb2NrZXRDbGllbnQubG9naW4oY29uZmlnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRva2VuKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KchSBMb2dpbiB0b2tlbiByZWNlaXZlZCwgZXN0YWJsaXNoaW5nIGNvbm5lY3Rpb24nKTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmNvbm5lY3QodG9rZW4pO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgTG9naW4gc3VjY2Vzc2Z1bCcpO1xuICAgICAgICAgICAgICAgIHZzY29kZS53aW5kb3cuc2hvd0luZm9ybWF0aW9uTWVzc2FnZSgnU3VjY2Vzc2Z1bGx5IGxvZ2dlZCBpbnRvIEh5cGhhIHNlcnZlcicpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn4p2MIEZhaWxlZCB0byBvYnRhaW4gYXV0aGVudGljYXRpb24gdG9rZW4nKTtcbiAgICAgICAgICAgICAgICB2c2NvZGUud2luZG93LnNob3dFcnJvck1lc3NhZ2UoJ0ZhaWxlZCB0byBvYnRhaW4gYXV0aGVudGljYXRpb24gdG9rZW4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgTG9naW4gZmFpbGVkOicsIGVycm9yKTtcbiAgICAgICAgICAgIHZzY29kZS53aW5kb3cuc2hvd0Vycm9yTWVzc2FnZShgTG9naW4gZmFpbGVkOiAke2Vycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBjb25uZWN0KHRva2VuOiBzdHJpbmcpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ/CflJcgRXN0YWJsaXNoaW5nIGNvbm5lY3Rpb24gdG8gSHlwaGEgc2VydmVyJyk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGh5cGhhV2Vic29ja2V0Q2xpZW50IH0gPSBhd2FpdCBpbXBvcnQoJ2h5cGhhLXJwYycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UlyBDb25uZWN0aW5nIHdpdGggdG9rZW4gdG86JywgdGhpcy5zZXJ2ZXJVcmwpO1xuICAgICAgICAgICAgdGhpcy5zZXJ2ZXIgPSBhd2FpdCBoeXBoYVdlYnNvY2tldENsaWVudC5jb25uZWN0VG9TZXJ2ZXIoe1xuICAgICAgICAgICAgICAgIHNlcnZlcl91cmw6IHRoaXMuc2VydmVyVXJsLFxuICAgICAgICAgICAgICAgIHRva2VuOiB0b2tlbixcbiAgICAgICAgICAgICAgICBtZXRob2RfdGltZW91dDogMTgwMDAwLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IHVzZXIgPSB0aGlzLnNlcnZlci5jb25maWcudXNlcjtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5SXIENvbm5lY3Rpb24gZXN0YWJsaXNoZWQgZm9yIHVzZXI6JywgdXNlcj8uZW1haWwgfHwgJ3Vua25vd24nKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUF1dGgodG9rZW4sIHVzZXIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIuKchSBDb25uZWN0ZWQgdG8gSHlwaGEgc2VydmVyIGFzOlwiLCB1c2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBDb25uZWN0aW9uIGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYXV0b0Nvbm5lY3QoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5SEIEF0dGVtcHRpbmcgYXV0by1jb25uZWN0IHdpdGggc2F2ZWQgdG9rZW4nKTtcbiAgICAgICAgaWYgKHRoaXMudG9rZW4gJiYgdGhpcy5pc1Rva2VuVmFsaWQoKSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmNvbm5lY3QodGhpcy50b2tlbik7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KchSBBdXRvLWNvbm5lY3Qgc3VjY2Vzc2Z1bCcpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgQXV0by1jb25uZWN0IGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfl5HvuI8gQ2xlYXJpbmcgaW52YWxpZCBhdXRoZW50aWNhdGlvbiBkYXRhJyk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5jbGVhckF1dGgoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGxvZ291dCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ/CflJMgU3RhcnRpbmcgbG9nb3V0IHByb2Nlc3MnKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY2xlYXJBdXRoKCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIExvZ291dCBzdWNjZXNzZnVsJyk7XG4gICAgICAgICAgICB2c2NvZGUud2luZG93LnNob3dJbmZvcm1hdGlvbk1lc3NhZ2UoJ0xvZ2dlZCBvdXQgZnJvbSBIeXBoYSBzZXJ2ZXInKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBMb2dvdXQgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgICAgICAgdnNjb2RlLndpbmRvdy5zaG93RXJyb3JNZXNzYWdlKGBMb2dvdXQgZmFpbGVkOiAke2Vycm9yfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaXNBdXRoZW50aWNhdGVkKCk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBhdXRoZW50aWNhdGVkID0gdGhpcy50b2tlbiAhPT0gbnVsbCAmJiB0aGlzLmlzVG9rZW5WYWxpZCgpO1xuICAgICAgICBjb25zb2xlLmxvZygn8J+UjSBBdXRoZW50aWNhdGlvbiBjaGVjayAtIEF1dGhlbnRpY2F0ZWQ6JywgYXV0aGVudGljYXRlZCwgJ0hhcyB0b2tlbjonLCAhIXRoaXMudG9rZW4sICdUb2tlbiB2YWxpZDonLCB0aGlzLnRva2VuID8gdGhpcy5pc1Rva2VuVmFsaWQoKSA6IGZhbHNlKTtcbiAgICAgICAgcmV0dXJuIGF1dGhlbnRpY2F0ZWQ7XG4gICAgfVxuXG4gICAgZ2V0VXNlcigpOiBIeXBoYVVzZXIgfCBudWxsIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudXNlcjtcbiAgICB9XG5cbiAgICBnZXRUb2tlbigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9rZW47XG4gICAgfVxuXG4gICAgYXN5bmMgZ2V0U2VydmVyKCk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIC8vIElmIHdlIGFscmVhZHkgaGF2ZSBhIHNlcnZlciBjb25uZWN0aW9uLCByZXR1cm4gaXRcbiAgICAgICAgaWYgKHRoaXMuc2VydmVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UlyBTZXJ2ZXIgY29ubmVjdGlvbiBhbHJlYWR5IGF2YWlsYWJsZScpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VydmVyO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgd2UncmUgYWxyZWFkeSBpbiB0aGUgcHJvY2VzcyBvZiBjb25uZWN0aW5nLCB3YWl0IGZvciB0aGF0IHRvIGNvbXBsZXRlXG4gICAgICAgIGlmICh0aGlzLmlzQ29ubmVjdGluZyAmJiB0aGlzLmNvbm5lY3Rpb25Qcm9taXNlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBDb25uZWN0aW9uIGFscmVhZHkgaW4gcHJvZ3Jlc3MsIHdhaXRpbmcuLi4nKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5jb25uZWN0aW9uUHJvbWlzZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zZXJ2ZXI7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBDb25uZWN0aW9uIGluIHByb2dyZXNzIGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgdmFsaWQgdG9rZW4gYnV0IG5vIHNlcnZlciBjb25uZWN0aW9uLCBhdHRlbXB0IHRvIGNvbm5lY3RcbiAgICAgICAgaWYgKHRoaXMudG9rZW4gJiYgdGhpcy5pc1Rva2VuVmFsaWQoKSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflIQgTm8gc2VydmVyIGNvbm5lY3Rpb24gYnV0IHZhbGlkIHRva2VuIGF2YWlsYWJsZSwgYXR0ZW1wdGluZyB0byBjb25uZWN0Jyk7XG4gICAgICAgICAgICB0aGlzLmlzQ29ubmVjdGluZyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb25Qcm9taXNlID0gdGhpcy5jb25uZWN0V2l0aEV4aXN0aW5nVG9rZW4oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmNvbm5lY3Rpb25Qcm9taXNlO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnNlcnZlcjtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEZhaWxlZCB0byBjb25uZWN0IHdpdGggZXhpc3RpbmcgdG9rZW46JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuY2xlYXJBdXRoKCk7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gZXN0YWJsaXNoIHNlcnZlciBjb25uZWN0aW9uIHdpdGggZXhpc3RpbmcgdG9rZW4nKTtcbiAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pc0Nvbm5lY3RpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbm5lY3Rpb25Qcm9taXNlID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5vIHZhbGlkIHRva2VuIGF2YWlsYWJsZSwgbmVlZCB0byBhdXRoZW50aWNhdGVcbiAgICAgICAgY29uc29sZS5sb2coJ+KdjCBObyBzZXJ2ZXIgY29ubmVjdGlvbiBhbmQgbm8gdmFsaWQgdG9rZW4gLSBhdXRoZW50aWNhdGlvbiByZXF1aXJlZCcpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHNlcnZlciBjb25uZWN0aW9uIGF2YWlsYWJsZSAtIGF1dGhlbnRpY2F0aW9uIHJlcXVpcmVkLiBQbGVhc2UgbG9naW4gZmlyc3QuJyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBjb25uZWN0V2l0aEV4aXN0aW5nVG9rZW4oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICghdGhpcy50b2tlbikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyB0b2tlbiBhdmFpbGFibGUgZm9yIGNvbm5lY3Rpb24nKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuY29ubmVjdCh0aGlzLnRva2VuKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgU3VjY2Vzc2Z1bGx5IGNvbm5lY3RlZCB3aXRoIGV4aXN0aW5nIHRva2VuJyk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRmFpbGVkIHRvIGNvbm5lY3Qgd2l0aCBleGlzdGluZyB0b2tlbjonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGVuc3VyZUNvbm5lY3Rpb24oKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFNlcnZlcigpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflJAgQ29ubmVjdGlvbiBmYWlsZWQsIHByb21wdGluZyBmb3IgbG9naW4nKTtcbiAgICAgICAgICAgIHZzY29kZS53aW5kb3cuc2hvd1dhcm5pbmdNZXNzYWdlKFxuICAgICAgICAgICAgICAgICdIeXBoYSBzZXJ2ZXIgY29ubmVjdGlvbiByZXF1aXJlZC4gUGxlYXNlIGxvZ2luIHRvIGNvbnRpbnVlLicsXG4gICAgICAgICAgICAgICAgJ0xvZ2luJ1xuICAgICAgICAgICAgKS50aGVuKHNlbGVjdGlvbiA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdGlvbiA9PT0gJ0xvZ2luJykge1xuICAgICAgICAgICAgICAgICAgICB2c2NvZGUuY29tbWFuZHMuZXhlY3V0ZUNvbW1hbmQoJ2h5cGhhLmxvZ2luJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGdldEFydGlmYWN0TWFuYWdlcigpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+OryBHZXR0aW5nIGFydGlmYWN0IG1hbmFnZXIgc2VydmljZScpO1xuICAgICAgICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCB0aGlzLmdldFNlcnZlcigpO1xuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn46vIFJlcXVlc3RpbmcgYXJ0aWZhY3QgbWFuYWdlciBzZXJ2aWNlIGZyb20gc2VydmVyJyk7XG4gICAgICAgICAgICBjb25zdCBhcnRpZmFjdE1hbmFnZXIgPSBhd2FpdCBzZXJ2ZXIuZ2V0U2VydmljZShcInB1YmxpYy9hcnRpZmFjdC1tYW5hZ2VyXCIpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfjq8gQXJ0aWZhY3QgbWFuYWdlciBzZXJ2aWNlIG9idGFpbmVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgICAgICAgcmV0dXJuIGFydGlmYWN0TWFuYWdlcjtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBGYWlsZWQgdG8gZ2V0IGFydGlmYWN0IG1hbmFnZXI6JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGZpcmVBdXRoU3RhdGVDaGFuZ2VkKCkge1xuICAgICAgICBjb25zdCBpc0F1dGhlbnRpY2F0ZWQgPSB0aGlzLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBGaXJpbmcgYXV0aCBzdGF0ZSBjaGFuZ2VkIGV2ZW50IC0gYXV0aGVudGljYXRlZDonLCBpc0F1dGhlbnRpY2F0ZWQsICd1c2VyOicsIHRoaXMudXNlcj8uZW1haWwgfHwgJ25vbmUnKTtcbiAgICAgICAgdGhpcy5fb25BdXRoU3RhdGVDaGFuZ2VkLmZpcmUoeyBpc0F1dGhlbnRpY2F0ZWQsIHVzZXI6IHRoaXMudXNlciB9KTtcbiAgICB9XG5cbiAgICBkaXNwb3NlKCkge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+Xke+4jyBEaXNwb3NpbmcgSHlwaGFBdXRoUHJvdmlkZXInKTtcbiAgICAgICAgdGhpcy5fb25BdXRoU3RhdGVDaGFuZ2VkLmRpc3Bvc2UoKTtcbiAgICB9XG59ICIsImltcG9ydCAqIGFzIHZzY29kZSBmcm9tICd2c2NvZGUnO1xuaW1wb3J0IHsgSHlwaGFBdXRoUHJvdmlkZXIgfSBmcm9tICcuL0h5cGhhQXV0aFByb3ZpZGVyJztcblxuaW50ZXJmYWNlIFByb2plY3RGaWxlIHtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgcGF0aDogc3RyaW5nO1xuICAgIHR5cGU6ICdmaWxlJyB8ICdkaXJlY3RvcnknO1xuICAgIGNvbnRlbnQ/OiBzdHJpbmc7XG4gICAgY3JlYXRlZF9hdD86IHN0cmluZztcbiAgICBtb2RpZmllZF9hdD86IHN0cmluZztcbiAgICBzaXplPzogbnVtYmVyO1xufVxuXG5pbnRlcmZhY2UgUHJvamVjdCB7XG4gICAgaWQ6IHN0cmluZztcbiAgICBtYW5pZmVzdDoge1xuICAgICAgICBuYW1lOiBzdHJpbmc7XG4gICAgICAgIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gICAgICAgIHZlcnNpb246IHN0cmluZztcbiAgICAgICAgdHlwZTogc3RyaW5nO1xuICAgICAgICBjcmVhdGVkX2F0OiBzdHJpbmc7XG4gICAgfTtcbiAgICBmaWxlcz86IFByb2plY3RGaWxlW107XG59XG5cbi8vIENhY2hlIGludGVyZmFjZXNcbmludGVyZmFjZSBQYXRoUmVzb2x1dGlvbkNhY2hlIHtcbiAgICBhcnRpZmFjdElkOiBzdHJpbmc7XG4gICAgZmlsZVBhdGg/OiBzdHJpbmc7XG4gICAgdGltZXN0YW1wOiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBGaWxlTGlzdGluZ0NhY2hlIHtcbiAgICBmaWxlczogUHJvamVjdEZpbGVbXTtcbiAgICB0aW1lc3RhbXA6IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIENoaWxkQXJ0aWZhY3RzQ2FjaGUge1xuICAgIGNoaWxkcmVuOiBQcm9qZWN0W107XG4gICAgdGltZXN0YW1wOiBudW1iZXI7XG59XG5cbmV4cG9ydCBjbGFzcyBIeXBoYUZpbGVTeXN0ZW1Qcm92aWRlciBpbXBsZW1lbnRzIHZzY29kZS5GaWxlU3lzdGVtUHJvdmlkZXIge1xuICAgIHByaXZhdGUgYXV0aFByb3ZpZGVyOiBIeXBoYUF1dGhQcm92aWRlcjtcbiAgICBwcml2YXRlIF9lbWl0dGVyID0gbmV3IHZzY29kZS5FdmVudEVtaXR0ZXI8dnNjb2RlLkZpbGVDaGFuZ2VFdmVudFtdPigpO1xuICAgIHByaXZhdGUgX2NhY2hlID0gbmV3IE1hcDxzdHJpbmcsIFVpbnQ4QXJyYXk+KCk7XG4gICAgcHJpdmF0ZSBhcnRpZmFjdE1hbmFnZXI6IGFueSA9IG51bGw7XG4gICAgcHJpdmF0ZSBpc0luaXRpYWxpemluZyA9IGZhbHNlO1xuICAgIHByaXZhdGUgaW5pdGlhbGl6YXRpb25Qcm9taXNlOiBQcm9taXNlPHZvaWQ+IHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBsYXN0SW5pdEF0dGVtcHQgPSAwO1xuICAgIHByaXZhdGUgaW5pdENvb2xkb3duID0gNTAwMDsgLy8gNSBzZWNvbmRzIGNvb2xkb3duIGJldHdlZW4gaW5pdCBhdHRlbXB0c1xuICAgIHByaXZhdGUgYXJ0aWZhY3RDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCB7IGFydGlmYWN0OiBhbnkgfCBudWxsOyB0aW1lc3RhbXA6IG51bWJlciB9PigpO1xuICAgIHByaXZhdGUgY2FjaGVUaW1lb3V0ID0gMzAwMDAwOyAvLyA1IG1pbnV0ZXMgY2FjaGUgZm9yIGFydGlmYWN0c1xuXG4gICAgLy8gTmV3IGNhY2hlcyBmb3Igb3B0aW1pemF0aW9uXG4gICAgcHJpdmF0ZSBwYXRoUmVzb2x1dGlvbkNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIFBhdGhSZXNvbHV0aW9uQ2FjaGU+KCk7XG4gICAgcHJpdmF0ZSBmaWxlTGlzdGluZ0NhY2hlID0gbmV3IE1hcDxzdHJpbmcsIEZpbGVMaXN0aW5nQ2FjaGU+KCk7XG4gICAgcHJpdmF0ZSBjaGlsZEFydGlmYWN0c0NhY2hlID0gbmV3IE1hcDxzdHJpbmcsIENoaWxkQXJ0aWZhY3RzQ2FjaGU+KCk7XG4gICAgcHJpdmF0ZSBzaG9ydENhY2hlVGltZW91dCA9IDMwMDAwOyAvLyAzMCBzZWNvbmRzIGZvciBwYXRoL2ZpbGUgbGlzdGluZ3NcbiAgICBcbiAgICAvLyBSZXF1ZXN0IGRlZHVwbGljYXRpb25cbiAgICBwcml2YXRlIHBlbmRpbmdSZXF1ZXN0cyA9IG5ldyBNYXA8c3RyaW5nLCBQcm9taXNlPGFueT4+KCk7XG5cbiAgICByZWFkb25seSBvbkRpZENoYW5nZUZpbGU6IHZzY29kZS5FdmVudDx2c2NvZGUuRmlsZUNoYW5nZUV2ZW50W10+ID0gdGhpcy5fZW1pdHRlci5ldmVudDtcblxuICAgIGNvbnN0cnVjdG9yKGF1dGhQcm92aWRlcjogSHlwaGFBdXRoUHJvdmlkZXIpIHtcbiAgICAgICAgdGhpcy5hdXRoUHJvdmlkZXIgPSBhdXRoUHJvdmlkZXI7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5eC77iPIEh5cGhhRmlsZVN5c3RlbVByb3ZpZGVyIGluaXRpYWxpemVkLCBzdGFydGluZyBhcnRpZmFjdCBtYW5hZ2VyIGluaXRpYWxpemF0aW9uJyk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUFydGlmYWN0TWFuYWdlcigpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2VuZXJhdGVDYWNoZUtleSguLi5wYXJ0czogc3RyaW5nW10pOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gcGFydHMuam9pbignOjonKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGlzVmFsaWRDYWNoZUVudHJ5KHRpbWVzdGFtcDogbnVtYmVyLCB0aW1lb3V0OiBudW1iZXIgPSB0aGlzLnNob3J0Q2FjaGVUaW1lb3V0KTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAoRGF0ZS5ub3coKSAtIHRpbWVzdGFtcCkgPCB0aW1lb3V0O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZGVkdXBsaWNhdGVSZXF1ZXN0PFQ+KGtleTogc3RyaW5nLCByZXF1ZXN0Rm46ICgpID0+IFByb21pc2U8VD4pOiBQcm9taXNlPFQ+IHtcbiAgICAgICAgLy8gSWYgdGhlcmUncyBhbHJlYWR5IGEgcGVuZGluZyByZXF1ZXN0IGZvciB0aGlzIGtleSwgcmV0dXJuIGl0XG4gICAgICAgIGlmICh0aGlzLnBlbmRpbmdSZXF1ZXN0cy5oYXMoa2V5KSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflIQgRGVkdXBsaWNhdGluZyByZXF1ZXN0IGZvcjonLCBrZXkpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGVuZGluZ1JlcXVlc3RzLmdldChrZXkpITtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBuZXcgcmVxdWVzdCBhbmQgY2FjaGUgdGhlIHByb21pc2VcbiAgICAgICAgY29uc3QgcHJvbWlzZSA9IHJlcXVlc3RGbigpLmZpbmFsbHkoKCkgPT4ge1xuICAgICAgICAgICAgLy8gQ2xlYW4gdXAgd2hlbiByZXF1ZXN0IGNvbXBsZXRlc1xuICAgICAgICAgICAgdGhpcy5wZW5kaW5nUmVxdWVzdHMuZGVsZXRlKGtleSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMucGVuZGluZ1JlcXVlc3RzLnNldChrZXksIHByb21pc2UpO1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc29sdmVBcnRpZmFjdFBhdGhDYWNoZWQocGF0aDogc3RyaW5nKTogUHJvbWlzZTx7IGFydGlmYWN0SWQ6IHN0cmluZzsgZmlsZVBhdGg/OiBzdHJpbmcgfT4ge1xuICAgICAgICBjb25zdCBjYWNoZWQgPSB0aGlzLnBhdGhSZXNvbHV0aW9uQ2FjaGUuZ2V0KHBhdGgpO1xuICAgICAgICBpZiAoY2FjaGVkICYmIHRoaXMuaXNWYWxpZENhY2hlRW50cnkoY2FjaGVkLnRpbWVzdGFtcCkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn46vIFVzaW5nIGNhY2hlZCBwYXRoIHJlc29sdXRpb24gZm9yOicsIHBhdGgpO1xuICAgICAgICAgICAgcmV0dXJuIHsgYXJ0aWZhY3RJZDogY2FjaGVkLmFydGlmYWN0SWQsIGZpbGVQYXRoOiBjYWNoZWQuZmlsZVBhdGggfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlcXVlc3RLZXkgPSBgcmVzb2x2ZUFydGlmYWN0UGF0aDoke3BhdGh9YDtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGVkdXBsaWNhdGVSZXF1ZXN0KHJlcXVlc3RLZXksIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5SNIFJlc29sdmluZyBhcnRpZmFjdCBwYXRoOicsIHBhdGgpO1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5yZXNvbHZlQXJ0aWZhY3RQYXRoKHBhdGgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDYWNoZSB0aGUgcmVzdWx0XG4gICAgICAgICAgICB0aGlzLnBhdGhSZXNvbHV0aW9uQ2FjaGUuc2V0KHBhdGgsIHtcbiAgICAgICAgICAgICAgICBhcnRpZmFjdElkOiByZXN1bHQuYXJ0aWZhY3RJZCxcbiAgICAgICAgICAgICAgICBmaWxlUGF0aDogcmVzdWx0LmZpbGVQYXRoLFxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgbGlzdENoaWxkQXJ0aWZhY3RzQ2FjaGVkKHBhcmVudElkOiBzdHJpbmcpOiBQcm9taXNlPFByb2plY3RbXT4ge1xuICAgICAgICBjb25zdCBjYWNoZWQgPSB0aGlzLmNoaWxkQXJ0aWZhY3RzQ2FjaGUuZ2V0KHBhcmVudElkKTtcbiAgICAgICAgaWYgKGNhY2hlZCAmJiB0aGlzLmlzVmFsaWRDYWNoZUVudHJ5KGNhY2hlZC50aW1lc3RhbXApKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+OryBVc2luZyBjYWNoZWQgY2hpbGQgYXJ0aWZhY3RzIGZvcjonLCBwYXJlbnRJZCk7XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkLmNoaWxkcmVuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVxdWVzdEtleSA9IGBsaXN0Q2hpbGRBcnRpZmFjdHM6JHtwYXJlbnRJZH1gO1xuICAgICAgICByZXR1cm4gdGhpcy5kZWR1cGxpY2F0ZVJlcXVlc3QocmVxdWVzdEtleSwgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4sgTGlzdGluZyBjaGlsZCBhcnRpZmFjdHMgZm9yIHBhcmVudDonLCBwYXJlbnRJZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYXJ0aWZhY3RNYW5hZ2VyID0gYXdhaXQgdGhpcy5lbnN1cmVBcnRpZmFjdE1hbmFnZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+TiyBMaXN0aW5nIGFydGlmYWN0cyB3aXRoIHBhcmVudDonLCBwYXJlbnRJZCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvamVjdHNMaXN0ID0gYXdhaXQgYXJ0aWZhY3RNYW5hZ2VyLmxpc3Qoe1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnRfaWQ6IHBhcmVudElkLFxuICAgICAgICAgICAgICAgICAgICBzdGFnZTogJ2FsbCcsXG4gICAgICAgICAgICAgICAgICAgIF9ya3dhcmdzOiB0cnVlXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBwcm9qZWN0c0xpc3QubWFwKChwcm9qZWN0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4sgUHJvY2Vzc2luZyBjaGlsZCBhcnRpZmFjdDonLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbElkOiBwcm9qZWN0LmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50SWQ6IHBhcmVudElkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvamVjdFR5cGU6IHByb2plY3QudHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3RNYW5pZmVzdDogcHJvamVjdC5tYW5pZmVzdFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSB0aGUgSUQgYXMgcmV0dXJuZWQgYnkgdGhlIHNlcnZlciAtIGRvbid0IG1vZGlmeSBpdFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhcnRpZmFjdElkID0gcHJvamVjdC5pZDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OLIENoaWxkIGFydGlmYWN0IHByb2Nlc3NlZDonLCBwcm9qZWN0LmlkLCAnLT4gZmluYWwgSUQ6JywgYXJ0aWZhY3RJZCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IGFydGlmYWN0SWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdDogcHJvamVjdC5tYW5pZmVzdCB8fCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogcHJvamVjdC5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvbjogJzEuMC4wJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncHJvamVjdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlZF9hdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2FjaGUgdGhlIHJlc3VsdFxuICAgICAgICAgICAgICAgIHRoaXMuY2hpbGRBcnRpZmFjdHNDYWNoZS5zZXQocGFyZW50SWQsIHtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IHJlc3VsdCxcbiAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4sgRm91bmQnLCByZXN1bHQubGVuZ3RoLCAnY2hpbGQgYXJ0aWZhY3RzJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEZhaWxlZCB0byBsaXN0IGNoaWxkIGFydGlmYWN0czonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGxpc3RGaWxlc0NhY2hlZChhcnRpZmFjdElkOiBzdHJpbmcsIGRpclBhdGg6IHN0cmluZyk6IFByb21pc2U8UHJvamVjdEZpbGVbXT4ge1xuICAgICAgICBjb25zdCBjYWNoZUtleSA9IHRoaXMuZ2VuZXJhdGVDYWNoZUtleShhcnRpZmFjdElkLCBkaXJQYXRoKTtcbiAgICAgICAgY29uc3QgY2FjaGVkID0gdGhpcy5maWxlTGlzdGluZ0NhY2hlLmdldChjYWNoZUtleSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY2FjaGVkICYmIHRoaXMuaXNWYWxpZENhY2hlRW50cnkoY2FjaGVkLnRpbWVzdGFtcCkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn46vIFVzaW5nIGNhY2hlZCBmaWxlIGxpc3RpbmcgZm9yOicsIGFydGlmYWN0SWQsICdkaXI6JywgZGlyUGF0aCB8fCAnKHJvb3QpJyk7XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkLmZpbGVzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVxdWVzdEtleSA9IGBsaXN0RmlsZXM6JHtjYWNoZUtleX1gO1xuICAgICAgICByZXR1cm4gdGhpcy5kZWR1cGxpY2F0ZVJlcXVlc3QocmVxdWVzdEtleSwgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4QgTGlzdGluZyBmaWxlcyBmb3IgYXJ0aWZhY3Q6JywgYXJ0aWZhY3RJZCwgJ2luIGRpcmVjdG9yeTonLCBkaXJQYXRoIHx8ICcocm9vdCknKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBhcnRpZmFjdE1hbmFnZXIgPSBhd2FpdCB0aGlzLmVuc3VyZUFydGlmYWN0TWFuYWdlcigpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OEIExpc3RpbmcgZmlsZXMgd2l0aCBhcnRpZmFjdF9pZDonLCBhcnRpZmFjdElkLCAnZGlyX3BhdGg6JywgZGlyUGF0aCB8fCAnJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZXMgPSBhd2FpdCBhcnRpZmFjdE1hbmFnZXIubGlzdF9maWxlcyh7XG4gICAgICAgICAgICAgICAgICAgIGFydGlmYWN0X2lkOiBhcnRpZmFjdElkLFxuICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiBcInN0YWdlXCIsXG4gICAgICAgICAgICAgICAgICAgIGRpcl9wYXRoOiBkaXJQYXRoIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICBfcmt3YXJnczogdHJ1ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGZpbGVzLm1hcCgoZmlsZTogYW55KSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBmaWxlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGZpbGUucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogZmlsZS50eXBlLFxuICAgICAgICAgICAgICAgICAgICBzaXplOiBmaWxlLnNpemUsXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZWRfYXQ6IGZpbGUuY3JlYXRlZF9hdCxcbiAgICAgICAgICAgICAgICAgICAgbW9kaWZpZWRfYXQ6IGZpbGUubW9kaWZpZWRfYXRcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2FjaGUgdGhlIHJlc3VsdFxuICAgICAgICAgICAgICAgIHRoaXMuZmlsZUxpc3RpbmdDYWNoZS5zZXQoY2FjaGVLZXksIHtcbiAgICAgICAgICAgICAgICAgICAgZmlsZXM6IHJlc3VsdCxcbiAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4QgRm91bmQnLCByZXN1bHQubGVuZ3RoLCAnZmlsZXMnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGDinYwgRmFpbGVkIHRvIGxpc3QgZmlsZXMgZm9yICR7YXJ0aWZhY3RJZH06YCwgZXJyb3IpO1xuICAgICAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpbnZhbGlkYXRlQ2FjaGUoYXJ0aWZhY3RJZD86IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBpZiAoYXJ0aWZhY3RJZCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfl5HvuI8gSW52YWxpZGF0aW5nIGNhY2hlcyBmb3IgYXJ0aWZhY3Q6JywgYXJ0aWZhY3RJZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEludmFsaWRhdGUgYXJ0aWZhY3QgY2FjaGVcbiAgICAgICAgICAgIHRoaXMuYXJ0aWZhY3RDYWNoZS5kZWxldGUoYXJ0aWZhY3RJZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEludmFsaWRhdGUgY2hpbGQgYXJ0aWZhY3RzIGNhY2hlIGZvciB0aGlzIGFydGlmYWN0IGFzIHBhcmVudFxuICAgICAgICAgICAgdGhpcy5jaGlsZEFydGlmYWN0c0NhY2hlLmRlbGV0ZShhcnRpZmFjdElkKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW52YWxpZGF0ZSBmaWxlIGxpc3RpbmcgY2FjaGUgZm9yIHRoaXMgYXJ0aWZhY3RcbiAgICAgICAgICAgIGZvciAoY29uc3QgW2tleSwgX10gb2YgdGhpcy5maWxlTGlzdGluZ0NhY2hlLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aChgJHthcnRpZmFjdElkfTo6YCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5maWxlTGlzdGluZ0NhY2hlLmRlbGV0ZShrZXkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW52YWxpZGF0ZSBwYXRoIHJlc29sdXRpb24gY2FjaGUgdGhhdCBtaWdodCByZWZlcmVuY2UgdGhpcyBhcnRpZmFjdFxuICAgICAgICAgICAgZm9yIChjb25zdCBbcGF0aCwgY2FjaGVkXSBvZiB0aGlzLnBhdGhSZXNvbHV0aW9uQ2FjaGUuZW50cmllcygpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhY2hlZC5hcnRpZmFjdElkID09PSBhcnRpZmFjdElkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGF0aFJlc29sdXRpb25DYWNoZS5kZWxldGUocGF0aCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfl5HvuI8gQ2xlYXJpbmcgYWxsIGNhY2hlcycpO1xuICAgICAgICAgICAgdGhpcy5hcnRpZmFjdENhY2hlLmNsZWFyKCk7XG4gICAgICAgICAgICB0aGlzLnBhdGhSZXNvbHV0aW9uQ2FjaGUuY2xlYXIoKTtcbiAgICAgICAgICAgIHRoaXMuZmlsZUxpc3RpbmdDYWNoZS5jbGVhcigpO1xuICAgICAgICAgICAgdGhpcy5jaGlsZEFydGlmYWN0c0NhY2hlLmNsZWFyKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGNsZWFyRXhwaXJlZENhY2hlcygpOiB2b2lkIHtcbiAgICAgICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGV4cGlyZWQgYXJ0aWZhY3QgY2FjaGVcbiAgICAgICAgY29uc3QgZXhwaXJlZEFydGlmYWN0czogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCBjYWNoZWRdIG9mIHRoaXMuYXJ0aWZhY3RDYWNoZS5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIGlmIChub3cgLSBjYWNoZWQudGltZXN0YW1wID49IHRoaXMuY2FjaGVUaW1lb3V0KSB7XG4gICAgICAgICAgICAgICAgZXhwaXJlZEFydGlmYWN0cy5wdXNoKGtleSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGV4cGlyZWQgcGF0aCByZXNvbHV0aW9uIGNhY2hlXG4gICAgICAgIGNvbnN0IGV4cGlyZWRQYXRoczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCBjYWNoZWRdIG9mIHRoaXMucGF0aFJlc29sdXRpb25DYWNoZS5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIGlmIChub3cgLSBjYWNoZWQudGltZXN0YW1wID49IHRoaXMuc2hvcnRDYWNoZVRpbWVvdXQpIHtcbiAgICAgICAgICAgICAgICBleHBpcmVkUGF0aHMucHVzaChrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBleHBpcmVkIGZpbGUgbGlzdGluZyBjYWNoZVxuICAgICAgICBjb25zdCBleHBpcmVkRmlsZUxpc3RpbmdzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIGNhY2hlZF0gb2YgdGhpcy5maWxlTGlzdGluZ0NhY2hlLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgaWYgKG5vdyAtIGNhY2hlZC50aW1lc3RhbXAgPj0gdGhpcy5zaG9ydENhY2hlVGltZW91dCkge1xuICAgICAgICAgICAgICAgIGV4cGlyZWRGaWxlTGlzdGluZ3MucHVzaChrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBleHBpcmVkIGNoaWxkIGFydGlmYWN0cyBjYWNoZVxuICAgICAgICBjb25zdCBleHBpcmVkQ2hpbGRBcnRpZmFjdHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgY2FjaGVkXSBvZiB0aGlzLmNoaWxkQXJ0aWZhY3RzQ2FjaGUuZW50cmllcygpKSB7XG4gICAgICAgICAgICBpZiAobm93IC0gY2FjaGVkLnRpbWVzdGFtcCA+PSB0aGlzLnNob3J0Q2FjaGVUaW1lb3V0KSB7XG4gICAgICAgICAgICAgICAgZXhwaXJlZENoaWxkQXJ0aWZhY3RzLnB1c2goa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgdG90YWxFeHBpcmVkID0gZXhwaXJlZEFydGlmYWN0cy5sZW5ndGggKyBleHBpcmVkUGF0aHMubGVuZ3RoICsgZXhwaXJlZEZpbGVMaXN0aW5ncy5sZW5ndGggKyBleHBpcmVkQ2hpbGRBcnRpZmFjdHMubGVuZ3RoO1xuICAgICAgICBcbiAgICAgICAgaWYgKHRvdGFsRXhwaXJlZCA+IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5eR77iPIENsZWFyaW5nJywgdG90YWxFeHBpcmVkLCAnZXhwaXJlZCBjYWNoZSBlbnRyaWVzJyk7XG4gICAgICAgICAgICBleHBpcmVkQXJ0aWZhY3RzLmZvckVhY2goa2V5ID0+IHRoaXMuYXJ0aWZhY3RDYWNoZS5kZWxldGUoa2V5KSk7XG4gICAgICAgICAgICBleHBpcmVkUGF0aHMuZm9yRWFjaChrZXkgPT4gdGhpcy5wYXRoUmVzb2x1dGlvbkNhY2hlLmRlbGV0ZShrZXkpKTtcbiAgICAgICAgICAgIGV4cGlyZWRGaWxlTGlzdGluZ3MuZm9yRWFjaChrZXkgPT4gdGhpcy5maWxlTGlzdGluZ0NhY2hlLmRlbGV0ZShrZXkpKTtcbiAgICAgICAgICAgIGV4cGlyZWRDaGlsZEFydGlmYWN0cy5mb3JFYWNoKGtleSA9PiB0aGlzLmNoaWxkQXJ0aWZhY3RzQ2FjaGUuZGVsZXRlKGtleSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRBcnRpZmFjdENhY2hlZChhcnRpZmFjdElkOiBzdHJpbmcpOiBQcm9taXNlPGFueSB8IG51bGw+IHtcbiAgICAgICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgY29uc3QgY2FjaGVkID0gdGhpcy5hcnRpZmFjdENhY2hlLmdldChhcnRpZmFjdElkKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjYWNoZWQgJiYgKG5vdyAtIGNhY2hlZC50aW1lc3RhbXApIDwgdGhpcy5jYWNoZVRpbWVvdXQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn46vIFVzaW5nIGNhY2hlZCBhcnRpZmFjdCBmb3InLCBhcnRpZmFjdElkLCAnOicsIGNhY2hlZC5hcnRpZmFjdD8ubWFuaWZlc3Q/Lm5hbWUgfHwgJ251bGwnKTtcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWQuYXJ0aWZhY3Q7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJlcXVlc3RLZXkgPSBgZ2V0QXJ0aWZhY3Q6JHthcnRpZmFjdElkfWA7XG4gICAgICAgIHJldHVybiB0aGlzLmRlZHVwbGljYXRlUmVxdWVzdChyZXF1ZXN0S2V5LCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5SEIEZldGNoaW5nIGZyZXNoIGFydGlmYWN0IGRhdGEgZm9yJywgYXJ0aWZhY3RJZCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYXJ0aWZhY3QgPSBhd2FpdCB0aGlzLmdldEFydGlmYWN0KGFydGlmYWN0SWQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENhY2hlIHRoZSByZXN1bHQgKGluY2x1ZGluZyBudWxsIHJlc3VsdHMpXG4gICAgICAgICAgICAgICAgdGhpcy5hcnRpZmFjdENhY2hlLnNldChhcnRpZmFjdElkLCB7IGFydGlmYWN0LCB0aW1lc3RhbXA6IG5vdyB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoYXJ0aWZhY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfjq8gQ2FjaGVkIGFydGlmYWN0IGZvcicsIGFydGlmYWN0SWQsICc6JywgYXJ0aWZhY3QubWFuaWZlc3Q/Lm5hbWUsICd0eXBlOicsIGFydGlmYWN0LnR5cGUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn46vIENhY2hlZCBub3QtZm91bmQgcmVzdWx0IGZvcicsIGFydGlmYWN0SWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJ0aWZhY3Q7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBGYWlsZWQgdG8gZ2V0IGFydGlmYWN0IGZvcicsIGFydGlmYWN0SWQsICc6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENhY2hlIGVycm9yIHJlc3VsdHMgdG8gYXZvaWQgcmVwZWF0ZWQgYXR0ZW1wdHNcbiAgICAgICAgICAgICAgICB0aGlzLmFydGlmYWN0Q2FjaGUuc2V0KGFydGlmYWN0SWQsIHsgYXJ0aWZhY3Q6IG51bGwsIHRpbWVzdGFtcDogbm93IH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldEFydGlmYWN0VHlwZUNhY2hlZChhcnRpZmFjdElkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICAgICAgY29uc3QgYXJ0aWZhY3QgPSBhd2FpdCB0aGlzLmdldEFydGlmYWN0Q2FjaGVkKGFydGlmYWN0SWQpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGFydGlmYWN0KSB7XG4gICAgICAgICAgICBjb25zdCB0eXBlID0gYXJ0aWZhY3QudHlwZSB8fCAnYXJ0aWZhY3QnO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfjq8gRXh0cmFjdGVkIHR5cGUgZnJvbSBjYWNoZWQgYXJ0aWZhY3QnLCBhcnRpZmFjdElkLCAnOicsIHR5cGUpO1xuICAgICAgICAgICAgcmV0dXJuIHR5cGU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+OryBObyBhcnRpZmFjdCBmb3VuZCBmb3IgdHlwZSBleHRyYWN0aW9uOicsIGFydGlmYWN0SWQpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc29sdmVBcnRpZmFjdFBhdGgocGF0aDogc3RyaW5nKTogUHJvbWlzZTx7IGFydGlmYWN0SWQ6IHN0cmluZzsgZmlsZVBhdGg/OiBzdHJpbmcgfT4ge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+UjSBSZXNvbHZpbmcgYXJ0aWZhY3QgcGF0aDonLCBwYXRoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBsZWFkaW5nIHNsYXNoIGFuZCBzcGxpdCBpbnRvIHNlZ21lbnRzXG4gICAgICAgIGNvbnN0IHNlZ21lbnRzID0gcGF0aC5zdWJzdHJpbmcoMSkuc3BsaXQoJy8nKS5maWx0ZXIocyA9PiBzKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChzZWdtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIC8vIFJvb3QgcGF0aCAtIHRoaXMgc2hvdWxkIGJlIGhhbmRsZWQgYnkgdGhlIHdvcmtzcGFjZSByb290IGxvZ2ljXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCByZXNvbHZlIGVtcHR5IHBhdGgnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgbGV0IGN1cnJlbnRBcnRpZmFjdElkID0gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBUcmF2ZXJzZSBzZWdtZW50cyB0byBmaW5kIHRoZSBkZWVwZXN0IGFydGlmYWN0XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2VnbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHNlZ21lbnQgPSBzZWdtZW50c1tpXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAvLyBGaXJzdCBzZWdtZW50IC0gdGVzdCBhcyByb290IGFydGlmYWN0XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflI0gVGVzdGluZyByb290IGFydGlmYWN0IElEOicsIHNlZ21lbnQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFydGlmYWN0VHlwZSA9IGF3YWl0IHRoaXMuZ2V0QXJ0aWZhY3RUeXBlQ2FjaGVkKHNlZ21lbnQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChhcnRpZmFjdFR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEFydGlmYWN0SWQgPSBzZWdtZW50O1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIEZvdW5kIHJvb3QgYXJ0aWZhY3Q6JywgY3VycmVudEFydGlmYWN0SWQsICd0eXBlOicsIGFydGlmYWN0VHlwZSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoYXJ0aWZhY3RUeXBlICE9PSAnY29sbGVjdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5vdCBhIGNvbGxlY3Rpb24sIHJlbWFpbmluZyBzZWdtZW50cyBhcmUgZmlsZSBwYXRoXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZW1haW5pbmdTZWdtZW50cyA9IHNlZ21lbnRzLnNsaWNlKGkgKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcmVtYWluaW5nU2VnbWVudHMubGVuZ3RoID4gMCA/IHJlbWFpbmluZ1NlZ21lbnRzLmpvaW4oJy8nKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn46vIEZpbmFsIHJlc29sdXRpb24gLSBBcnRpZmFjdDonLCBjdXJyZW50QXJ0aWZhY3RJZCwgJ0ZpbGVQYXRoOicsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IGFydGlmYWN0SWQ6IGN1cnJlbnRBcnRpZmFjdElkLCBmaWxlUGF0aCB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIENvbnRpbnVlIHRvIGNoZWNrIGlmIG5leHQgc2VnbWVudCBpcyBhIGNoaWxkIGFydGlmYWN0XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KdjCBSb290IGFydGlmYWN0IG5vdCBmb3VuZDonLCBzZWdtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSb290IGFydGlmYWN0ICcke3NlZ21lbnR9JyBub3QgZm91bmRgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZvciBzdWJzZXF1ZW50IHNlZ21lbnRzLCBpZiBjdXJyZW50IGFydGlmYWN0IGlzIGEgY29sbGVjdGlvbixcbiAgICAgICAgICAgICAgICAvLyBjaGVjayBpZiB0aGlzIHNlZ21lbnQgaXMgYSBkaXJlY3QgY2hpbGQgYXJ0aWZhY3RcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudEFydGlmYWN0SWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflI0gVGVzdGluZyBjaGlsZCBhcnRpZmFjdDonLCBzZWdtZW50LCAnb2YgcGFyZW50OicsIGN1cnJlbnRBcnRpZmFjdElkKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEZpcnN0IGNoZWNrIGlmIHRoZSBjdXJyZW50IGFydGlmYWN0IGlzIGEgY29sbGVjdGlvblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnRUeXBlID0gYXdhaXQgdGhpcy5nZXRBcnRpZmFjdFR5cGVDYWNoZWQoY3VycmVudEFydGlmYWN0SWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFyZW50VHlwZSA9PT0gJ2NvbGxlY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBHZXQgY2hpbGQgYXJ0aWZhY3RzIHRvIHNlZSBpZiB0aGlzIHNlZ21lbnQgbWF0Y2hlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hpbGRBcnRpZmFjdHMgPSBhd2FpdCB0aGlzLmxpc3RDaGlsZEFydGlmYWN0c0NhY2hlZChjdXJyZW50QXJ0aWZhY3RJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXRjaGluZ0NoaWxkID0gY2hpbGRBcnRpZmFjdHMuZmluZChjaGlsZCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hpbGROYW1lID0gY2hpbGQuaWQuaW5jbHVkZXMoJy8nKSA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZC5pZC5zcGxpdCgnLycpLnBvcCgpIDogXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkLmlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZE5hbWUgPT09IHNlZ21lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1hdGNoaW5nQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3VuZCBtYXRjaGluZyBjaGlsZCBhcnRpZmFjdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRBcnRpZmFjdElkID0gbWF0Y2hpbmdDaGlsZC5pZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIEZvdW5kIGNoaWxkIGFydGlmYWN0OicsIGN1cnJlbnRBcnRpZmFjdElkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGNoaWxkIGlzIGFsc28gYSBjb2xsZWN0aW9uIG9yIGhhcyByZW1haW5pbmcgc2VnbWVudHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjaGlsZFR5cGUgPSBhd2FpdCB0aGlzLmdldEFydGlmYWN0VHlwZUNhY2hlZChtYXRjaGluZ0NoaWxkLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hpbGRUeXBlICE9PSAnY29sbGVjdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm90IGEgY29sbGVjdGlvbiwgcmVtYWluaW5nIHNlZ21lbnRzIGFyZSBmaWxlIHBhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVtYWluaW5nU2VnbWVudHMgPSBzZWdtZW50cy5zbGljZShpICsgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcmVtYWluaW5nU2VnbWVudHMubGVuZ3RoID4gMCA/IHJlbWFpbmluZ1NlZ21lbnRzLmpvaW4oJy8nKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfjq8gRmluYWwgcmVzb2x1dGlvbiAtIEFydGlmYWN0OicsIGN1cnJlbnRBcnRpZmFjdElkLCAnRmlsZVBhdGg6JywgZmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBhcnRpZmFjdElkOiBjdXJyZW50QXJ0aWZhY3RJZCwgZmlsZVBhdGggfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ29udGludWUgdG8gY2hlY2sgbmV4dCBzZWdtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlZ21lbnQgaXMgbm90IGEgY2hpbGQgYXJ0aWZhY3QsIHNvIGl0J3MgcGFydCBvZiBmaWxlIHBhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZW1haW5pbmdTZWdtZW50cyA9IHNlZ21lbnRzLnNsaWNlKGkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcmVtYWluaW5nU2VnbWVudHMubGVuZ3RoID4gMCA/IHJlbWFpbmluZ1NlZ21lbnRzLmpvaW4oJy8nKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+OryBGaW5hbCByZXNvbHV0aW9uIC0gQXJ0aWZhY3Q6JywgY3VycmVudEFydGlmYWN0SWQsICdGaWxlUGF0aDonLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgYXJ0aWZhY3RJZDogY3VycmVudEFydGlmYWN0SWQsIGZpbGVQYXRoIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQYXJlbnQgaXMgbm90IGEgY29sbGVjdGlvbiwgcmVtYWluaW5nIHNlZ21lbnRzIGFyZSBmaWxlIHBhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbWFpbmluZ1NlZ21lbnRzID0gc2VnbWVudHMuc2xpY2UoaSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHJlbWFpbmluZ1NlZ21lbnRzLmxlbmd0aCA+IDAgPyByZW1haW5pbmdTZWdtZW50cy5qb2luKCcvJykgOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+OryBGaW5hbCByZXNvbHV0aW9uIC0gQXJ0aWZhY3Q6JywgY3VycmVudEFydGlmYWN0SWQsICdGaWxlUGF0aDonLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBhcnRpZmFjdElkOiBjdXJyZW50QXJ0aWZhY3RJZCwgZmlsZVBhdGggfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWxsIHNlZ21lbnRzIHdlcmUgdHJhdmVyc2VkLCBjdXJyZW50QXJ0aWZhY3RJZCBpcyB0aGUgZmluYWwgYXJ0aWZhY3RcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfjq8gRmluYWwgcmVzb2x1dGlvbiAtIEFydGlmYWN0OicsIGN1cnJlbnRBcnRpZmFjdElkLCAnRmlsZVBhdGg6IG5vbmUnKTtcbiAgICAgICAgcmV0dXJuIHsgYXJ0aWZhY3RJZDogY3VycmVudEFydGlmYWN0SWQgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGluaXRpYWxpemVBcnRpZmFjdE1hbmFnZXIoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY29vbGRvd24gdG8gcHJldmVudCByYXBpZCBzdWNjZXNzaXZlIGNhbGxzXG4gICAgICAgIGlmIChub3cgLSB0aGlzLmxhc3RJbml0QXR0ZW1wdCA8IHRoaXMuaW5pdENvb2xkb3duKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBJbml0aWFsaXphdGlvbiBjb29sZG93biBhY3RpdmUsIHNraXBwaW5nIGF0dGVtcHQnKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluaXRpYWxpemF0aW9uUHJvbWlzZSB8fCBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmlzSW5pdGlhbGl6aW5nIHx8IHRoaXMuYXJ0aWZhY3RNYW5hZ2VyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBJbml0aWFsaXphdGlvbiBhbHJlYWR5IGluIHByb2dyZXNzIG9yIGNvbXBsZXRlZCcpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5pdGlhbGl6YXRpb25Qcm9taXNlIHx8IFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5sYXN0SW5pdEF0dGVtcHQgPSBub3c7XG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXppbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLmluaXRpYWxpemF0aW9uUHJvbWlzZSA9IHRoaXMucGVyZm9ybUluaXRpYWxpemF0aW9uKCk7XG4gICAgICAgIHJldHVybiB0aGlzLmluaXRpYWxpemF0aW9uUHJvbWlzZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHBlcmZvcm1Jbml0aWFsaXphdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5SEIEluaXRpYWxpemluZyBhcnRpZmFjdCBtYW5hZ2VyLi4uJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEp1c3QgdHJ5IHRvIGdldCB0aGUgc2VydmVyIGNvbm5lY3Rpb24gZGlyZWN0bHlcbiAgICAgICAgICAgIC8vIEF1dGhlbnRpY2F0aW9uIHdpbGwgYmUgaGFuZGxlZCBieSBnZXRTZXJ2ZXIoKSBpZiBuZWVkZWRcbiAgICAgICAgICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuYXV0aFByb3ZpZGVyLmdldFNlcnZlcigpO1xuICAgICAgICAgICAgaWYgKHNlcnZlcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgU2VydmVyIGNvbm5lY3Rpb24gZXN0YWJsaXNoZWQgZHVyaW5nIGluaXRpYWxpemF0aW9uJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5hcnRpZmFjdE1hbmFnZXIgPSBhd2FpdCBzZXJ2ZXIuZ2V0U2VydmljZShcInB1YmxpYy9hcnRpZmFjdC1tYW5hZ2VyXCIpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgQXJ0aWZhY3QgbWFuYWdlciBpbml0aWFsaXplZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KdjCBObyBzZXJ2ZXIgY29ubmVjdGlvbiBhdmFpbGFibGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ+KaoO+4jyBDb3VsZCBub3QgZXN0YWJsaXNoIHNlcnZlciBjb25uZWN0aW9uOicsIGVycm9yLm1lc3NhZ2UpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ+KaoO+4jyBBdXRoZW50aWNhdGlvbiByZXF1aXJlZCAtIGFydGlmYWN0IG1hbmFnZXIgd2lsbCBiZSB1bmF2YWlsYWJsZScpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5pc0luaXRpYWxpemluZyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBlbnN1cmVBcnRpZmFjdE1hbmFnZXIoKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ/CflI0gZW5zdXJlQXJ0aWZhY3RNYW5hZ2VyIGNhbGxlZCAtIGN1cnJlbnQgc3RhdGU6Jywge1xuICAgICAgICAgICAgaGFzQXJ0aWZhY3RNYW5hZ2VyOiAhIXRoaXMuYXJ0aWZhY3RNYW5hZ2VyLFxuICAgICAgICAgICAgaXNJbml0aWFsaXppbmc6IHRoaXMuaXNJbml0aWFsaXppbmcsXG4gICAgICAgICAgICBsYXN0SW5pdEF0dGVtcHQ6IHRoaXMubGFzdEluaXRBdHRlbXB0LFxuICAgICAgICAgICAgdGltZVNpbmNlTGFzdEluaXQ6IERhdGUubm93KCkgLSB0aGlzLmxhc3RJbml0QXR0ZW1wdFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDbGVhbiB1cCBleHBpcmVkIGNhY2hlIGVudHJpZXMgcGVyaW9kaWNhbGx5XG4gICAgICAgIHRoaXMuY2xlYXJFeHBpcmVkQ2FjaGVzKCk7XG5cbiAgICAgICAgaWYgKCF0aGlzLmFydGlmYWN0TWFuYWdlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflIQgTm8gYXJ0aWZhY3QgbWFuYWdlciwgYXR0ZW1wdGluZyBpbml0aWFsaXphdGlvbi4uLicpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5pbml0aWFsaXplQXJ0aWZhY3RNYW5hZ2VyKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElmIHN0aWxsIG5vIGFydGlmYWN0IG1hbmFnZXIsIHRyeSB0byBnZXQgc2VydmVyIGNvbm5lY3Rpb24gcmVhY3RpdmVseVxuICAgICAgICBpZiAoIXRoaXMuYXJ0aWZhY3RNYW5hZ2VyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBTdGlsbCBubyBhcnRpZmFjdCBtYW5hZ2VyLCB0cnlpbmcgcmVhY3RpdmUgYXBwcm9hY2guLi4nKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflIQgQXR0ZW1wdGluZyB0byBnZXQgc2VydmVyIGNvbm5lY3Rpb24gcmVhY3RpdmVseScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuYXV0aFByb3ZpZGVyLmdldFNlcnZlcigpO1xuICAgICAgICAgICAgICAgIHRoaXMuYXJ0aWZhY3RNYW5hZ2VyID0gYXdhaXQgc2VydmVyLmdldFNlcnZpY2UoXCJwdWJsaWMvYXJ0aWZhY3QtbWFuYWdlclwiKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIEFydGlmYWN0IG1hbmFnZXIgb2J0YWluZWQgcmVhY3RpdmVseScpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBGYWlsZWQgdG8gZ2V0IGFydGlmYWN0IG1hbmFnZXIgcmVhY3RpdmVseTonLCBlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FydGlmYWN0IG1hbmFnZXIgbm90IGF2YWlsYWJsZSAtIGF1dGhlbnRpY2F0aW9uIHJlcXVpcmVkLiBQbGVhc2UgbG9naW4gZmlyc3QuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0aGlzLmFydGlmYWN0TWFuYWdlcjtcbiAgICB9XG5cbiAgICB3YXRjaCh1cmk6IHZzY29kZS5VcmksIG9wdGlvbnM6IHsgcmVjdXJzaXZlOiBib29sZWFuOyBleGNsdWRlczogc3RyaW5nW107IH0pOiB2c2NvZGUuRGlzcG9zYWJsZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5GB77iPIFdhdGNoaW5nIFVSSTonLCB1cmkudG9TdHJpbmcoKSk7XG4gICAgICAgIHJldHVybiBuZXcgdnNjb2RlLkRpc3Bvc2FibGUoKCkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CfkYHvuI8gU3RvcHBlZCB3YXRjaGluZyBVUkk6JywgdXJpLnRvU3RyaW5nKCkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBhc3luYyBzdGF0KHVyaTogdnNjb2RlLlVyaSk6IFByb21pc2U8dnNjb2RlLkZpbGVTdGF0PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5OKIEdldHRpbmcgc3RhdCBmb3IgVVJJOicsIHVyaS50b1N0cmluZygpKTtcbiAgICAgICAgY29uc3QgcGF0aCA9IHRoaXMudXJpVG9QYXRoKHVyaSk7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5OKIENvbnZlcnRlZCB0byBwYXRoOicsIHBhdGgpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGFydGlmYWN0SWQsIGZpbGVQYXRoIH0gPSBhd2FpdCB0aGlzLnJlc29sdmVBcnRpZmFjdFBhdGhDYWNoZWQocGF0aCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+TiiBSZXNvbHZlZCAtIGFydGlmYWN0SWQ6JywgYXJ0aWZhY3RJZCwgJ2ZpbGVQYXRoOicsIGZpbGVQYXRoKTtcblxuICAgICAgICAgICAgaWYgKCFmaWxlUGF0aCkge1xuICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgYW4gYXJ0aWZhY3QgZGlyZWN0b3J5XG4gICAgICAgICAgICAgICAgY29uc3QgYXJ0aWZhY3QgPSBhd2FpdCB0aGlzLmdldEFydGlmYWN0Q2FjaGVkKGFydGlmYWN0SWQpO1xuICAgICAgICAgICAgICAgIGlmIChhcnRpZmFjdCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+TiiBBcnRpZmFjdCBmb3VuZDonLCBhcnRpZmFjdC5tYW5pZmVzdD8ubmFtZSB8fCBhcnRpZmFjdElkLCAndHlwZTonLCBhcnRpZmFjdC50eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHZzY29kZS5GaWxlVHlwZS5EaXJlY3RvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICBjdGltZTogbmV3IERhdGUoYXJ0aWZhY3QubWFuaWZlc3Q/LmNyZWF0ZWRfYXQgfHwgRGF0ZS5ub3coKSkuZ2V0VGltZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgbXRpbWU6IG5ldyBEYXRlKGFydGlmYWN0Lm1hbmlmZXN0Py5jcmVhdGVkX2F0IHx8IERhdGUubm93KCkpLmdldFRpbWUoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IDBcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBmaWxlIHdpdGhpbiBhbiBhcnRpZmFjdFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OKIEdldHRpbmcgZmlsZSBzdGF0IGZvcjonLCBmaWxlUGF0aCwgJ2luIGFydGlmYWN0OicsIGFydGlmYWN0SWQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBhd2FpdCB0aGlzLmdldEZpbGVJbmZvKGFydGlmYWN0SWQsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+TiiBGaWxlIGZvdW5kOicsIGZpbGUubmFtZSwgJ3R5cGU6JywgZmlsZS50eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGZpbGUudHlwZSA9PT0gJ2RpcmVjdG9yeScgPyB2c2NvZGUuRmlsZVR5cGUuRGlyZWN0b3J5IDogdnNjb2RlLkZpbGVUeXBlLkZpbGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjdGltZTogZmlsZS5jcmVhdGVkX2F0ID8gbmV3IERhdGUoZmlsZS5jcmVhdGVkX2F0KS5nZXRUaW1lKCkgOiBEYXRlLm5vdygpLFxuICAgICAgICAgICAgICAgICAgICAgICAgbXRpbWU6IGZpbGUubW9kaWZpZWRfYXQgPyBuZXcgRGF0ZShmaWxlLm1vZGlmaWVkX2F0KS5nZXRUaW1lKCkgOiBEYXRlLm5vdygpLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZTogZmlsZS5zaXplIHx8IDBcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRXJyb3IgaW4gc3RhdDonLCBlcnJvcik7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZygn4p2MIEZpbGUgbm90IGZvdW5kIGZvciBVUkk6JywgdXJpLnRvU3RyaW5nKCkpO1xuICAgICAgICB0aHJvdyB2c2NvZGUuRmlsZVN5c3RlbUVycm9yLkZpbGVOb3RGb3VuZCh1cmkpO1xuICAgIH1cblxuICAgIGFzeW5jIHJlYWREaXJlY3RvcnkodXJpOiB2c2NvZGUuVXJpKTogUHJvbWlzZTxbc3RyaW5nLCB2c2NvZGUuRmlsZVR5cGVdW10+IHtcbiAgICAgICAgY29uc3QgcGF0aCA9IHRoaXMudXJpVG9QYXRoKHVyaSk7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5OBIFJlYWRpbmcgZGlyZWN0b3J5IC0gVVJJOicsIHVyaS50b1N0cmluZygpLCAnUGF0aDonLCBwYXRoKTtcblxuICAgICAgICAvLyBQcmV2ZW50IGluZmluaXRlIGxvb3BzIGJ5IGNoZWNraW5nIGZvciBleGNlc3NpdmVseSBsb25nIHBhdGhzXG4gICAgICAgIGlmIChwYXRoLmxlbmd0aCA+IDEwMDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBQYXRoIHRvbyBsb25nLCBwb3NzaWJsZSBpbmZpbml0ZSBsb29wIGRldGVjdGVkOicsIHBhdGguc3Vic3RyaW5nKDAsIDEwMCkgKyAnLi4uJyk7XG4gICAgICAgICAgICB0aHJvdyB2c2NvZGUuRmlsZVN5c3RlbUVycm9yLkZpbGVOb3RGb3VuZCh1cmkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgYXJ0aWZhY3RJZCwgZmlsZVBhdGggfSA9IGF3YWl0IHRoaXMucmVzb2x2ZUFydGlmYWN0UGF0aENhY2hlZChwYXRoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OBIFJlc29sdmVkIC0gYXJ0aWZhY3RJZDonLCBhcnRpZmFjdElkLCAnZmlsZVBhdGg6JywgZmlsZVBhdGgpO1xuXG4gICAgICAgICAgICAvLyBHZXQgdGhlIGFydGlmYWN0IHRvIGRldGVybWluZSBpdHMgdHlwZVxuICAgICAgICAgICAgY29uc3QgYXJ0aWZhY3QgPSBhd2FpdCB0aGlzLmdldEFydGlmYWN0Q2FjaGVkKGFydGlmYWN0SWQpO1xuICAgICAgICAgICAgaWYgKCFhcnRpZmFjdCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinYwgQXJ0aWZhY3Qgbm90IGZvdW5kOicsIGFydGlmYWN0SWQpO1xuICAgICAgICAgICAgICAgIHRocm93IHZzY29kZS5GaWxlU3lzdGVtRXJyb3IuRmlsZU5vdEZvdW5kKHVyaSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChhcnRpZmFjdC50eXBlID09PSAnY29sbGVjdGlvbicpIHtcbiAgICAgICAgICAgICAgICAvLyBMaXN0IGNoaWxkIGFydGlmYWN0cyB1c2luZyBjYWNoZWQgbWV0aG9kXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4EgQXJ0aWZhY3QgaXMgY29sbGVjdGlvbiwgbGlzdGluZyBjaGlsZCBhcnRpZmFjdHMnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjaGlsZEFydGlmYWN0cyA9IGF3YWl0IHRoaXMubGlzdENoaWxkQXJ0aWZhY3RzQ2FjaGVkKGFydGlmYWN0SWQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEJldHRlciBoYW5kbGluZyBvZiBjaGlsZCBhcnRpZmFjdCBuYW1lc1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGNoaWxkQXJ0aWZhY3RzLm1hcChjaGlsZCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QganVzdCB0aGUgbGFzdCBzZWdtZW50IG9mIHRoZSBjaGlsZCBJRFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjaGlsZE5hbWUgPSBjaGlsZC5pZC5pbmNsdWRlcygnLycpID8gXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZC5pZC5zcGxpdCgnLycpLnBvcCgpIHx8IGNoaWxkLmlkIDogXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZC5pZDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OBIENoaWxkIGFydGlmYWN0OicsIGNoaWxkLmlkLCAnLT4gZGlzcGxheSBuYW1lOicsIGNoaWxkTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbY2hpbGROYW1lLCB2c2NvZGUuRmlsZVR5cGUuRGlyZWN0b3J5XSBhcyBbc3RyaW5nLCB2c2NvZGUuRmlsZVR5cGVdO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OBIEZvdW5kJywgcmVzdWx0Lmxlbmd0aCwgJ2NoaWxkIGFydGlmYWN0cycpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIExpc3QgZmlsZXMgaW4gdGhlIGFydGlmYWN0IHVzaW5nIGNhY2hlZCBtZXRob2RcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+TgSBBcnRpZmFjdCBoYXMgZmlsZXMsIGxpc3RpbmcgZmlsZXMgaW4gcGF0aDonLCBmaWxlUGF0aCB8fCAnKHJvb3QpJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZXMgPSBhd2FpdCB0aGlzLmxpc3RGaWxlc0NhY2hlZChhcnRpZmFjdElkLCBmaWxlUGF0aCB8fCAnJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gZmlsZXMubWFwKGZpbGUgPT4gW1xuICAgICAgICAgICAgICAgICAgICBmaWxlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGZpbGUudHlwZSA9PT0gJ2RpcmVjdG9yeScgPyB2c2NvZGUuRmlsZVR5cGUuRGlyZWN0b3J5IDogdnNjb2RlLkZpbGVUeXBlLkZpbGVcbiAgICAgICAgICAgICAgICBdIGFzIFtzdHJpbmcsIHZzY29kZS5GaWxlVHlwZV0pO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OBIEZvdW5kJywgcmVzdWx0Lmxlbmd0aCwgJ2ZpbGVzJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBFcnJvciBpbiByZWFkRGlyZWN0b3J5OicsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IHZzY29kZS5GaWxlU3lzdGVtRXJyb3IuRmlsZU5vdEZvdW5kKHVyaSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBjcmVhdGVEaXJlY3RvcnkodXJpOiB2c2NvZGUuVXJpKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHBhdGggPSB0aGlzLnVyaVRvUGF0aCh1cmkpO1xuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgYXJ0aWZhY3RJZCwgZmlsZVBhdGggfSA9IGF3YWl0IHRoaXMucmVzb2x2ZUFydGlmYWN0UGF0aENhY2hlZChwYXRoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFmaWxlUGF0aCkge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0aW5nIGEgbmV3IGFydGlmYWN0IChwcm9qZWN0IGZvbGRlcilcbiAgICAgICAgICAgICAgICBjb25zdCBwYXRoU2VnbWVudHMgPSBwYXRoLnNwbGl0KCcvJykuZmlsdGVyKHMgPT4gcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZm9sZGVyTmFtZSA9IHBhdGhTZWdtZW50c1twYXRoU2VnbWVudHMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyZW50UGF0aCA9IHBhdGhTZWdtZW50cy5zbGljZSgwLCAtMSkuam9pbignLycpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudEFydGlmYWN0SWQgPSBwYXJlbnRQYXRoIHx8ICdyb290JztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmNyZWF0ZUNoaWxkQXJ0aWZhY3QocGFyZW50QXJ0aWZhY3RJZCwgZm9sZGVyTmFtZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZvciByZWd1bGFyIGRpcmVjdG9yaWVzIHdpdGhpbiBhbiBhcnRpZmFjdCwgdGhleSBhcmUgY3JlYXRlZCBpbXBsaWNpdGx5IHdoZW4gZmlsZXMgYXJlIHdyaXR0ZW5cbiAgICAgICAgICAgICAgICAvLyBXZSBkb24ndCBuZWVkIHRvIGV4cGxpY2l0bHkgY3JlYXRlIGRpcmVjdG9yaWVzIGluIHRoZSBmaWxlIHN5c3RlbVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEZhaWxlZCB0byBjcmVhdGUgZGlyZWN0b3J5OicsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IHZzY29kZS5GaWxlU3lzdGVtRXJyb3IuTm9QZXJtaXNzaW9ucyh1cmkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgcmVhZEZpbGUodXJpOiB2c2NvZGUuVXJpKTogUHJvbWlzZTxVaW50OEFycmF5PiB7XG4gICAgICAgIGNvbnN0IHBhdGggPSB0aGlzLnVyaVRvUGF0aCh1cmkpO1xuICAgICAgICBjb25zb2xlLmxvZygn8J+TliBSZWFkaW5nIGZpbGUgLSBVUkk6JywgdXJpLnRvU3RyaW5nKCksICdQYXRoOicsIHBhdGgpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY2FjaGVkID0gdGhpcy5fY2FjaGUuZ2V0KHBhdGgpO1xuICAgICAgICBpZiAoY2FjaGVkKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+TliBGaWxlIGZvdW5kIGluIGNhY2hlJyk7XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgYXJ0aWZhY3RJZCwgZmlsZVBhdGggfSA9IGF3YWl0IHRoaXMucmVzb2x2ZUFydGlmYWN0UGF0aENhY2hlZChwYXRoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OWIFJlc29sdmVkIC0gYXJ0aWZhY3RJZDonLCBhcnRpZmFjdElkLCAnZmlsZVBhdGg6JywgZmlsZVBhdGgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWZpbGVQYXRoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KdjCBDYW5ub3QgcmVhZCBmaWxlOiBubyBmaWxlIHBhdGggc3BlY2lmaWVkJyk7XG4gICAgICAgICAgICAgICAgdGhyb3cgdnNjb2RlLkZpbGVTeXN0ZW1FcnJvci5GaWxlTm90Rm91bmQodXJpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk5YgR2V0dGluZyBmaWxlIGNvbnRlbnQgZnJvbSBIeXBoYSBzZXJ2ZXInKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmdldEZpbGVDb250ZW50KGFydGlmYWN0SWQsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoY29udGVudCk7XG4gICAgICAgICAgICB0aGlzLl9jYWNoZS5zZXQocGF0aCwgZGF0YSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+TliBGaWxlIGNvbnRlbnQgcmV0cmlldmVkIGFuZCBjYWNoZWQsIHNpemU6JywgZGF0YS5sZW5ndGgsICdieXRlcycpO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmVycm9yKCfinYwgRmFpbGVkIHRvIHJlYWQgZmlsZTonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyB2c2NvZGUuRmlsZVN5c3RlbUVycm9yLkZpbGVOb3RGb3VuZCh1cmkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgd3JpdGVGaWxlKHVyaTogdnNjb2RlLlVyaSwgY29udGVudDogVWludDhBcnJheSwgb3B0aW9uczogeyBjcmVhdGU6IGJvb2xlYW47IG92ZXJ3cml0ZTogYm9vbGVhbjsgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwYXRoID0gdGhpcy51cmlUb1BhdGgodXJpKTtcbiAgICAgICAgY29uc29sZS5sb2coJ+Kcj++4jyBXcml0aW5nIGZpbGUgLSBVUkk6JywgdXJpLnRvU3RyaW5nKCksICdQYXRoOicsIHBhdGgsICdTaXplOicsIGNvbnRlbnQubGVuZ3RoLCAnYnl0ZXMnKTtcbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGFydGlmYWN0SWQsIGZpbGVQYXRoIH0gPSBhd2FpdCB0aGlzLnJlc29sdmVBcnRpZmFjdFBhdGhDYWNoZWQocGF0aCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn4pyP77iPIFJlc29sdmVkIC0gYXJ0aWZhY3RJZDonLCBhcnRpZmFjdElkLCAnZmlsZVBhdGg6JywgZmlsZVBhdGgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWZpbGVQYXRoKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KdjCBDYW5ub3Qgd3JpdGUgZmlsZTogbm8gZmlsZSBwYXRoIHNwZWNpZmllZCcpO1xuICAgICAgICAgICAgICAgIHRocm93IHZzY29kZS5GaWxlU3lzdGVtRXJyb3IuTm9QZXJtaXNzaW9ucyh1cmkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn4pyP77iPIFNhdmluZyBmaWxlIHRvIEh5cGhhIHNlcnZlcicpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlRmlsZShhcnRpZmFjdElkLCBmaWxlUGF0aCwgY29udGVudCk7XG4gICAgICAgICAgICB0aGlzLl9jYWNoZS5zZXQocGF0aCwgY29udGVudCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEludmFsaWRhdGUgYWxsIGNhY2hlcyBmb3IgdGhpcyBhcnRpZmFjdCBzaW5jZSB0aGUgYXJ0aWZhY3QgY29udGVudCBjaGFuZ2VkXG4gICAgICAgICAgICB0aGlzLmludmFsaWRhdGVDYWNoZShhcnRpZmFjdElkKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coJ+Kcj++4jyBGaWxlIHNhdmVkIHN1Y2Nlc3NmdWxseSwgZmlyaW5nIGNoYW5nZSBldmVudCcpO1xuICAgICAgICAgICAgdGhpcy5fZW1pdHRlci5maXJlKFt7XG4gICAgICAgICAgICAgICAgdHlwZTogdnNjb2RlLkZpbGVDaGFuZ2VUeXBlLkNoYW5nZWQsXG4gICAgICAgICAgICAgICAgdXJpOiB1cmlcbiAgICAgICAgICAgIH1dKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBGYWlsZWQgdG8gd3JpdGUgZmlsZTonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyB2c2NvZGUuRmlsZVN5c3RlbUVycm9yLlVuYXZhaWxhYmxlKHVyaSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBkZWxldGUodXJpOiB2c2NvZGUuVXJpLCBvcHRpb25zOiB7IHJlY3Vyc2l2ZTogYm9vbGVhbjsgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwYXRoID0gdGhpcy51cmlUb1BhdGgodXJpKTtcbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGFydGlmYWN0SWQsIGZpbGVQYXRoIH0gPSBhd2FpdCB0aGlzLnJlc29sdmVBcnRpZmFjdFBhdGhDYWNoZWQocGF0aCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghZmlsZVBhdGgpIHtcbiAgICAgICAgICAgICAgICAvLyBEZWxldGluZyBhbiBhcnRpZmFjdCBpdHNlbGZcbiAgICAgICAgICAgICAgICB0aGlzLmludmFsaWRhdGVDYWNoZShhcnRpZmFjdElkKTtcbiAgICAgICAgICAgICAgICB0aHJvdyB2c2NvZGUuRmlsZVN5c3RlbUVycm9yLk5vUGVybWlzc2lvbnModXJpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXdhaXQgdGhpcy5kZWxldGVGaWxlKGFydGlmYWN0SWQsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgIHRoaXMuX2NhY2hlLmRlbGV0ZShwYXRoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW52YWxpZGF0ZSBhbGwgY2FjaGVzIGZvciB0aGlzIGFydGlmYWN0IHNpbmNlIHRoZSBhcnRpZmFjdCBjb250ZW50IGNoYW5nZWRcbiAgICAgICAgICAgIHRoaXMuaW52YWxpZGF0ZUNhY2hlKGFydGlmYWN0SWQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLl9lbWl0dGVyLmZpcmUoW3tcbiAgICAgICAgICAgICAgICB0eXBlOiB2c2NvZGUuRmlsZUNoYW5nZVR5cGUuRGVsZXRlZCxcbiAgICAgICAgICAgICAgICB1cmk6IHVyaVxuICAgICAgICAgICAgfV0pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGRlbGV0ZSBmaWxlOicsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IHZzY29kZS5GaWxlU3lzdGVtRXJyb3IuVW5hdmFpbGFibGUodXJpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHJlbmFtZShvbGRVcmk6IHZzY29kZS5VcmksIG5ld1VyaTogdnNjb2RlLlVyaSwgb3B0aW9uczogeyBvdmVyd3JpdGU6IGJvb2xlYW47IH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3Qgb2xkUGF0aCA9IHRoaXMudXJpVG9QYXRoKG9sZFVyaSk7XG4gICAgICAgIGNvbnN0IG5ld1BhdGggPSB0aGlzLnVyaVRvUGF0aChuZXdVcmkpO1xuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgYXJ0aWZhY3RJZDogb2xkQXJ0aWZhY3RJZCwgZmlsZVBhdGg6IG9sZEZpbGVQYXRoIH0gPSBhd2FpdCB0aGlzLnJlc29sdmVBcnRpZmFjdFBhdGhDYWNoZWQob2xkUGF0aCk7XG4gICAgICAgICAgICBjb25zdCB7IGFydGlmYWN0SWQ6IG5ld0FydGlmYWN0SWQsIGZpbGVQYXRoOiBuZXdGaWxlUGF0aCB9ID0gYXdhaXQgdGhpcy5yZXNvbHZlQXJ0aWZhY3RQYXRoQ2FjaGVkKG5ld1BhdGgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIW9sZEZpbGVQYXRoIHx8ICFuZXdGaWxlUGF0aCB8fCBvbGRBcnRpZmFjdElkICE9PSBuZXdBcnRpZmFjdElkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgdnNjb2RlLkZpbGVTeXN0ZW1FcnJvci5Ob1Blcm1pc3Npb25zKG9sZFVyaSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVuYW1lRmlsZShvbGRBcnRpZmFjdElkLCBvbGRGaWxlUGF0aCwgbmV3RmlsZVBhdGgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gdGhpcy5fY2FjaGUuZ2V0KG9sZFBhdGgpO1xuICAgICAgICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jYWNoZS5kZWxldGUob2xkUGF0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fY2FjaGUuc2V0KG5ld1BhdGgsIGNvbnRlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbnZhbGlkYXRlIGFsbCBjYWNoZXMgZm9yIHRoaXMgYXJ0aWZhY3Qgc2luY2UgdGhlIGFydGlmYWN0IGNvbnRlbnQgY2hhbmdlZFxuICAgICAgICAgICAgdGhpcy5pbnZhbGlkYXRlQ2FjaGUob2xkQXJ0aWZhY3RJZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuX2VtaXR0ZXIuZmlyZShbXG4gICAgICAgICAgICAgICAgeyB0eXBlOiB2c2NvZGUuRmlsZUNoYW5nZVR5cGUuRGVsZXRlZCwgdXJpOiBvbGRVcmkgfSxcbiAgICAgICAgICAgICAgICB7IHR5cGU6IHZzY29kZS5GaWxlQ2hhbmdlVHlwZS5DcmVhdGVkLCB1cmk6IG5ld1VyaSB9XG4gICAgICAgICAgICBdKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byByZW5hbWUgZmlsZTonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyB2c2NvZGUuRmlsZVN5c3RlbUVycm9yLlVuYXZhaWxhYmxlKG9sZFVyaSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHVyaVRvUGF0aCh1cmk6IHZzY29kZS5VcmkpOiBzdHJpbmcge1xuICAgICAgICBsZXQgcGF0aCA9IHVyaS5wYXRoO1xuICAgICAgICBjb25zb2xlLmxvZygn8J+UlyBVUkkgdG8gUGF0aCBjb252ZXJzaW9uIC0gT3JpZ2luYWwgVVJJOicsIHVyaS50b1N0cmluZygpLCAnU2NoZW1lOicsIHVyaS5zY2hlbWUsICdBdXRob3JpdHk6JywgdXJpLmF1dGhvcml0eSwgJ1BhdGg6JywgdXJpLnBhdGgsICdGaW5hbCBwYXRoOicsIHBhdGgpO1xuICAgICAgICByZXR1cm4gcGF0aDtcbiAgICB9XG5cbiAgICAvLyBIeXBoYSBBUEkgbWV0aG9kc1xuICAgIHByaXZhdGUgYXN5bmMgZ2V0QXJ0aWZhY3QoYXJ0aWZhY3RJZDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ/CflI0gR2V0dGluZyBhcnRpZmFjdDonLCBhcnRpZmFjdElkKTtcbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBhcnRpZmFjdE1hbmFnZXIgPSBhd2FpdCB0aGlzLmVuc3VyZUFydGlmYWN0TWFuYWdlcigpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflI0gQXJ0aWZhY3QgbWFuYWdlciBvYnRhaW5lZCwgcmVhZGluZyBhcnRpZmFjdCcpO1xuICAgICAgICAgICAgY29uc3QgYXJ0aWZhY3QgPSBhd2FpdCBhcnRpZmFjdE1hbmFnZXIucmVhZCh7XG4gICAgICAgICAgICAgICAgYXJ0aWZhY3RfaWQ6IGFydGlmYWN0SWQsXG4gICAgICAgICAgICAgICAgX3Jrd2FyZ3M6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflI0gQXJ0aWZhY3QgcmVhZCBzdWNjZXNzZnVsbHk6JywgYXJ0aWZhY3Q/Lm1hbmlmZXN0Py5uYW1lIHx8IGFydGlmYWN0SWQpO1xuICAgICAgICAgICAgcmV0dXJuIGFydGlmYWN0O1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihg4p2MIEZhaWxlZCB0byBnZXQgYXJ0aWZhY3QgJHthcnRpZmFjdElkfTpgLCBlcnJvcik7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgbGlzdENoaWxkQXJ0aWZhY3RzKHBhcmVudElkOiBzdHJpbmcpOiBQcm9taXNlPFByb2plY3RbXT4ge1xuICAgICAgICAvLyBUaGlzIG1ldGhvZCBpcyBub3cgcmVwbGFjZWQgYnkgbGlzdENoaWxkQXJ0aWZhY3RzQ2FjaGVkXG4gICAgICAgIHJldHVybiB0aGlzLmxpc3RDaGlsZEFydGlmYWN0c0NhY2hlZChwYXJlbnRJZCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBsaXN0RmlsZXMoYXJ0aWZhY3RJZDogc3RyaW5nLCBkaXJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFByb2plY3RGaWxlW10+IHtcbiAgICAgICAgLy8gVGhpcyBtZXRob2QgaXMgbm93IHJlcGxhY2VkIGJ5IGxpc3RGaWxlc0NhY2hlZFxuICAgICAgICByZXR1cm4gdGhpcy5saXN0RmlsZXNDYWNoZWQoYXJ0aWZhY3RJZCwgZGlyUGF0aCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRGaWxlSW5mbyhhcnRpZmFjdElkOiBzdHJpbmcsIGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFByb2plY3RGaWxlIHwgbnVsbD4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gR2V0IHRoZSBkaXJlY3RvcnkgY29udGFpbmluZyB0aGlzIGZpbGVcbiAgICAgICAgICAgIGNvbnN0IGRpclBhdGggPSBmaWxlUGF0aC5pbmNsdWRlcygnLycpID8gZmlsZVBhdGguc3Vic3RyaW5nKDAsIGZpbGVQYXRoLmxhc3RJbmRleE9mKCcvJykpIDogJyc7XG4gICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IGZpbGVQYXRoLmluY2x1ZGVzKCcvJykgPyBmaWxlUGF0aC5zdWJzdHJpbmcoZmlsZVBhdGgubGFzdEluZGV4T2YoJy8nKSArIDEpIDogZmlsZVBhdGg7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGZpbGVzID0gYXdhaXQgdGhpcy5saXN0RmlsZXNDYWNoZWQoYXJ0aWZhY3RJZCwgZGlyUGF0aCk7XG4gICAgICAgICAgICByZXR1cm4gZmlsZXMuZmluZChmaWxlID0+IGZpbGUubmFtZSA9PT0gZmlsZU5hbWUpIHx8IG51bGw7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gZ2V0IGZpbGUgaW5mbyAke2ZpbGVQYXRofSBpbiBhcnRpZmFjdCAke2FydGlmYWN0SWR9OmAsIGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRGaWxlQ29udGVudChhcnRpZmFjdElkOiBzdHJpbmcsIGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+TpSBHZXR0aW5nIGZpbGUgY29udGVudCBmb3I6JywgZmlsZVBhdGgsICdpbiBhcnRpZmFjdDonLCBhcnRpZmFjdElkKTtcbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBhcnRpZmFjdE1hbmFnZXIgPSBhd2FpdCB0aGlzLmVuc3VyZUFydGlmYWN0TWFuYWdlcigpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk6UgR2V0dGluZyBmaWxlIFVSTCBmcm9tIGFydGlmYWN0IG1hbmFnZXInKTtcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IGF3YWl0IGFydGlmYWN0TWFuYWdlci5nZXRfZmlsZSh7XG4gICAgICAgICAgICAgICAgYXJ0aWZhY3RfaWQ6IGFydGlmYWN0SWQsXG4gICAgICAgICAgICAgICAgZmlsZV9wYXRoOiBmaWxlUGF0aCxcbiAgICAgICAgICAgICAgICB2ZXJzaW9uOiAnc3RhZ2UnLFxuICAgICAgICAgICAgICAgIF9ya3dhcmdzOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk6UgRmV0Y2hpbmcgZmlsZSBjb250ZW50IGZyb20gVVJMJyk7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCk7XG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KdjCBIVFRQIGVycm9yOicsIHJlc3BvbnNlLnN0YXR1cywgcmVzcG9uc2Uuc3RhdHVzVGV4dCk7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfTogJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk6UgRmlsZSBjb250ZW50IHJldHJpZXZlZCwgc2l6ZTonLCBjb250ZW50Lmxlbmd0aCwgJ2NoYXJhY3RlcnMnKTtcbiAgICAgICAgICAgIHJldHVybiBjb250ZW50O1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gY29uc29sZS5kZWJ1Zyhg4p2MIEZhaWxlZCB0byBnZXQgZmlsZSBjb250ZW50IGZvciAke2ZpbGVQYXRofTpgLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2F2ZUZpbGUoYXJ0aWZhY3RJZDogc3RyaW5nLCBmaWxlUGF0aDogc3RyaW5nLCBjb250ZW50OiBVaW50OEFycmF5KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBhcnRpZmFjdE1hbmFnZXIgPSBhd2FpdCB0aGlzLmVuc3VyZUFydGlmYWN0TWFuYWdlcigpO1xuICAgICAgICAgICAgLy8gYXdhaXQgYXJ0aWZhY3RNYW5hZ2VyLmVkaXQoe1xuICAgICAgICAgICAgLy8gICAgIGFydGlmYWN0X2lkOiBhcnRpZmFjdElkLFxuICAgICAgICAgICAgLy8gICAgIHZlcnNpb246IFwibGF0ZXN0XCIsXG4gICAgICAgICAgICAvLyAgICAgc3RhZ2U6IHRydWUsXG4gICAgICAgICAgICAvLyAgICAgX3Jrd2FyZ3M6IHRydWVcbiAgICAgICAgICAgIC8vIH0pXG4gICAgICAgICAgICBjb25zdCBwcmVzaWduZWRVcmwgPSBhd2FpdCBhcnRpZmFjdE1hbmFnZXIucHV0X2ZpbGUoe1xuICAgICAgICAgICAgICAgIGFydGlmYWN0X2lkOiBhcnRpZmFjdElkLFxuICAgICAgICAgICAgICAgIGZpbGVfcGF0aDogZmlsZVBhdGgsXG4gICAgICAgICAgICAgICAgX3Jrd2FyZ3M6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHByZXNpZ25lZFVybCwge1xuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgICAgICAgICAgYm9keTogY29udGVudCxcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnJyAvLyBpbXBvcnRhbnQgZm9yIHMzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIGF3YWl0IGFydGlmYWN0TWFuYWdlci5jb21taXQoe1xuICAgICAgICAgICAgLy8gICAgIGFydGlmYWN0X2lkOiBhcnRpZmFjdElkLFxuICAgICAgICAgICAgLy8gICAgIF9ya3dhcmdzOiB0cnVlXG4gICAgICAgICAgICAvLyB9KVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVcGxvYWQgZmFpbGVkOiAke3Jlc3BvbnNlLnN0YXR1c30gJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgRmlsZSBzYXZlZDogJHtmaWxlUGF0aH1gKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBzYXZlIGZpbGUgJHtmaWxlUGF0aH06YCwgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGRlbGV0ZUZpbGUoYXJ0aWZhY3RJZDogc3RyaW5nLCBmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBhcnRpZmFjdE1hbmFnZXIgPSBhd2FpdCB0aGlzLmVuc3VyZUFydGlmYWN0TWFuYWdlcigpO1xuICAgICAgICAgICAgYXdhaXQgYXJ0aWZhY3RNYW5hZ2VyLnJlbW92ZV9maWxlKHtcbiAgICAgICAgICAgICAgICBhcnRpZmFjdF9pZDogYXJ0aWZhY3RJZCxcbiAgICAgICAgICAgICAgICBmaWxlX3BhdGg6IGZpbGVQYXRoLFxuICAgICAgICAgICAgICAgIF9ya3dhcmdzOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBGaWxlIGRlbGV0ZWQ6ICR7ZmlsZVBhdGh9YCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gZGVsZXRlIGZpbGUgJHtmaWxlUGF0aH06YCwgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlbmFtZUZpbGUoYXJ0aWZhY3RJZDogc3RyaW5nLCBvbGRQYXRoOiBzdHJpbmcsIG5ld1BhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYXJ0aWZhY3RNYW5hZ2VyID0gYXdhaXQgdGhpcy5lbnN1cmVBcnRpZmFjdE1hbmFnZXIoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gMS4gR2V0IGZpbGUgY29udGVudCBmcm9tIG9sZCBwYXRoXG4gICAgICAgICAgICBjb25zdCB1cmwgPSBhd2FpdCBhcnRpZmFjdE1hbmFnZXIuZ2V0X2ZpbGUoe1xuICAgICAgICAgICAgICAgIGFydGlmYWN0X2lkOiBhcnRpZmFjdElkLFxuICAgICAgICAgICAgICAgIGZpbGVfcGF0aDogb2xkUGF0aCxcbiAgICAgICAgICAgICAgICB2ZXJzaW9uOiAnc3RhZ2UnLFxuICAgICAgICAgICAgICAgIF9ya3dhcmdzOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gMi4gRmV0Y2ggdGhlIGNvbnRlbnRcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsKTtcbiAgICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBmZXRjaCBmaWxlIGNvbnRlbnQgZm9yIHJlbmFtZTogJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyAzLiBHZXQgdGhlIGNvbnRlbnQgYmxvYlxuICAgICAgICAgICAgY29uc3QgY29udGVudEJsb2IgPSBhd2FpdCByZXNwb25zZS5ibG9iKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIDQuIEdldCBwcmVzaWduZWQgVVJMIGZvciBuZXcgcGF0aFxuICAgICAgICAgICAgY29uc3QgcHJlc2lnbmVkVXJsID0gYXdhaXQgYXJ0aWZhY3RNYW5hZ2VyLnB1dF9maWxlKHtcbiAgICAgICAgICAgICAgICBhcnRpZmFjdF9pZDogYXJ0aWZhY3RJZCxcbiAgICAgICAgICAgICAgICBmaWxlX3BhdGg6IG5ld1BhdGgsXG4gICAgICAgICAgICAgICAgX3Jrd2FyZ3M6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyA1LiBVcGxvYWQgY29udGVudCB0byBuZXcgcGF0aFxuICAgICAgICAgICAgY29uc3QgdXBsb2FkUmVzcG9uc2UgPSBhd2FpdCBmZXRjaChwcmVzaWduZWRVcmwsIHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgICAgICAgICAgIGJvZHk6IGNvbnRlbnRCbG9iLFxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICcnIC8vIGltcG9ydGFudCBmb3IgczNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCF1cGxvYWRSZXNwb25zZS5vaykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVXBsb2FkIG9mIHJlbmFtZWQgZmlsZSBmYWlsZWQgd2l0aCBzdGF0dXM6ICR7dXBsb2FkUmVzcG9uc2Uuc3RhdHVzfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyA2LiBEZWxldGUgdGhlIG9sZCBmaWxlXG4gICAgICAgICAgICBhd2FpdCBhcnRpZmFjdE1hbmFnZXIucmVtb3ZlX2ZpbGUoe1xuICAgICAgICAgICAgICAgIGFydGlmYWN0X2lkOiBhcnRpZmFjdElkLFxuICAgICAgICAgICAgICAgIGZpbGVfcGF0aDogb2xkUGF0aCxcbiAgICAgICAgICAgICAgICBfcmt3YXJnczogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIDcuIEFkZCBhIHNtYWxsIGRlbGF5IGJlZm9yZSByZXR1cm5pbmcgdG8gZW5zdXJlIHNlcnZlci1zaWRlIHByb3BhZ2F0aW9uXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMzAwKSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBGaWxlIHJlbmFtZWQgZnJvbSAke29sZFBhdGh9IHRvICR7bmV3UGF0aH1gKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byByZW5hbWUgZmlsZSBmcm9tICR7b2xkUGF0aH0gdG8gJHtuZXdQYXRofTpgLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlQ2hpbGRBcnRpZmFjdChwYXJlbnRJZDogc3RyaW5nLCBmb2xkZXJOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGFydGlmYWN0TWFuYWdlciA9IGF3YWl0IHRoaXMuZW5zdXJlQXJ0aWZhY3RNYW5hZ2VyKCk7XG4gICAgICAgICAgICBhd2FpdCBhcnRpZmFjdE1hbmFnZXIuY3JlYXRlKHtcbiAgICAgICAgICAgICAgICBwYXJlbnRfaWQ6IHBhcmVudElkLFxuICAgICAgICAgICAgICAgIGFsaWFzOiBmb2xkZXJOYW1lLFxuICAgICAgICAgICAgICAgIHR5cGU6IFwicHJvamVjdFwiLFxuICAgICAgICAgICAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGZvbGRlck5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBgUHJvamVjdCBmb2xkZXI6ICR7Zm9sZGVyTmFtZX1gLFxuICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiBcIjAuMS4wXCIsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwicHJvamVjdFwiXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBfcmt3YXJnczogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEludmFsaWRhdGUgY2FjaGUgZm9yIHBhcmVudCBhcnRpZmFjdCBzaW5jZSBpdCBub3cgaGFzIGEgbmV3IGNoaWxkXG4gICAgICAgICAgICB0aGlzLmludmFsaWRhdGVDYWNoZShwYXJlbnRJZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBDcmVhdGVkIGNoaWxkIGFydGlmYWN0OiAke2ZvbGRlck5hbWV9YCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gY3JlYXRlIGNoaWxkIGFydGlmYWN0ICR7Zm9sZGVyTmFtZX06YCwgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG59ICIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInZzY29kZVwiKTsiLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiIiwiLy8gc3RhcnR1cFxuLy8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4vLyBUaGlzIGVudHJ5IG1vZHVsZSBpcyByZWZlcmVuY2VkIGJ5IG90aGVyIG1vZHVsZXMgc28gaXQgY2FuJ3QgYmUgaW5saW5lZFxudmFyIF9fd2VicGFja19leHBvcnRzX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKFwiLi9zcmMvZXh0ZW5zaW9uLnRzXCIpO1xuIiwiIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9