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
    const panel = vscode.window.createWebviewPanel('svamp-studio-welcome', 'Welcome to Svamp Studio', vscode.ViewColumn.One, {
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
    <title>Welcome to Svamp Studio</title>
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
            <h1>🧪 Svamp Studio</h1>
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
            <p>Svamp Studio v1.0.0 | Powered by Hypha</p>
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
    console.log('🚀 Svamp Studio extension is now active!');
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
    const welcomeCommand = vscode.commands.registerCommand('svamp-studio.welcome', () => {
        console.log('💡 Welcome command executed');
        (0, WelcomePage_1.showWelcomePage)(context, authProvider);
    });
    const loginCommand = vscode.commands.registerCommand('svamp-studio.login', async () => {
        console.log('🔐 Login command executed');
        const success = await authProvider.login();
        if (success) {
            console.log('✅ Login successful');
        }
        else {
            console.log('❌ Login failed');
        }
    });
    const logoutCommand = vscode.commands.registerCommand('svamp-studio.logout', async () => {
        console.log('🔓 Logout command executed');
        await authProvider.logout();
        console.log('✅ Logout completed');
    });
    const browseProjectsCommand = vscode.commands.registerCommand('svamp-studio.browseProjects', async () => {
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
    console.log('🎉 Svamp Studio extension activation complete!');
}
exports.activate = activate;
function deactivate() {
    console.log('👋 Svamp Studio extension is deactivated');
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
        this.onDidChangeFile = this._emitter.event;
        this.authProvider = authProvider;
        console.log('🗂️ HyphaFileSystemProvider initialized, starting artifact manager initialization');
        this.initializeArtifactManager();
    }
    async getArtifactCached(artifactId) {
        const now = Date.now();
        const cached = this.artifactCache.get(artifactId);
        if (cached && (now - cached.timestamp) < this.cacheTimeout) {
            console.log('🎯 Using cached artifact for', artifactId, ':', cached.artifact?.manifest?.name || 'null');
            return cached.artifact;
        }
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
    invalidateArtifactCache(artifactId) {
        if (artifactId) {
            console.log('🗑️ Invalidating cache for artifact:', artifactId);
            this.artifactCache.delete(artifactId);
        }
        else {
            console.log('🗑️ Clearing entire artifact cache');
            this.artifactCache.clear();
        }
    }
    clearExpiredCache() {
        const now = Date.now();
        const expiredKeys = [];
        for (const [key, cached] of this.artifactCache.entries()) {
            if (now - cached.timestamp >= this.cacheTimeout) {
                expiredKeys.push(key);
            }
        }
        if (expiredKeys.length > 0) {
            console.log('🗑️ Clearing', expiredKeys.length, 'expired cache entries');
            expiredKeys.forEach(key => this.artifactCache.delete(key));
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
                        const childArtifacts = await this.listChildArtifacts(currentArtifactId);
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
        this.clearExpiredCache();
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
            const { artifactId, filePath } = await this.resolveArtifactPath(path);
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
            const { artifactId, filePath } = await this.resolveArtifactPath(path);
            console.log('📁 Resolved - artifactId:', artifactId, 'filePath:', filePath);
            // Get the artifact to determine its type
            const artifact = await this.getArtifactCached(artifactId);
            if (!artifact) {
                console.log('❌ Artifact not found:', artifactId);
                throw vscode.FileSystemError.FileNotFound(uri);
            }
            if (artifact.type === 'collection') {
                // List child artifacts
                console.log('📁 Artifact is collection, listing child artifacts');
                const childArtifacts = await this.listChildArtifacts(artifactId);
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
                // List files in the artifact
                console.log('📁 Artifact has files, listing files in path:', filePath || '(root)');
                const files = await this.listFiles(artifactId, filePath || '');
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
            const { artifactId, filePath } = await this.resolveArtifactPath(path);
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
            const { artifactId, filePath } = await this.resolveArtifactPath(path);
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
            const { artifactId, filePath } = await this.resolveArtifactPath(path);
            console.log('✏️ Resolved - artifactId:', artifactId, 'filePath:', filePath);
            if (!filePath) {
                console.log('❌ Cannot write file: no file path specified');
                throw vscode.FileSystemError.NoPermissions(uri);
            }
            console.log('✏️ Saving file to Hypha server');
            await this.saveFile(artifactId, filePath, content);
            this._cache.set(path, content);
            // Invalidate artifact cache since the artifact may have been modified
            this.invalidateArtifactCache(artifactId);
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
            const { artifactId, filePath } = await this.resolveArtifactPath(path);
            if (!filePath) {
                // Deleting an artifact itself
                this.invalidateArtifactCache(artifactId);
                throw vscode.FileSystemError.NoPermissions(uri);
            }
            await this.deleteFile(artifactId, filePath);
            this._cache.delete(path);
            // Invalidate artifact cache since the artifact content changed
            this.invalidateArtifactCache(artifactId);
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
            const { artifactId: oldArtifactId, filePath: oldFilePath } = await this.resolveArtifactPath(oldPath);
            const { artifactId: newArtifactId, filePath: newFilePath } = await this.resolveArtifactPath(newPath);
            if (!oldFilePath || !newFilePath || oldArtifactId !== newArtifactId) {
                throw vscode.FileSystemError.NoPermissions(oldUri);
            }
            await this.renameFile(oldArtifactId, oldFilePath, newFilePath);
            const content = this._cache.get(oldPath);
            if (content) {
                this._cache.delete(oldPath);
                this._cache.set(newPath, content);
            }
            // Invalidate artifact cache since the artifact content changed
            this.invalidateArtifactCache(oldArtifactId);
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
            console.log('📋 Found', result.length, 'child artifacts');
            return result;
        }
        catch (error) {
            console.error('❌ Failed to list child artifacts:', error);
            return [];
        }
    }
    async listFiles(artifactId, dirPath) {
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
            console.log('📄 Found', result.length, 'files');
            return result;
        }
        catch (error) {
            console.error(`❌ Failed to list files for ${artifactId}:`, error);
            return [];
        }
    }
    async getFileInfo(artifactId, filePath) {
        try {
            // Get the directory containing this file
            const dirPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';
            const fileName = filePath.includes('/') ? filePath.substring(filePath.lastIndexOf('/') + 1) : filePath;
            const files = await this.listFiles(artifactId, dirPath);
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
            this.invalidateArtifactCache(parentId);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uLmpzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBO0FBQ0EsSUFBSSxJQUF5RDtBQUM3RDtBQUNBLE1BQU07QUFBQSxFQUtxQztBQUMzQyxDQUFDO0FBQ0QseUJBQXlCO0FBQ3pCO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxpQ0FBaUMsMEJBQW1CLEVBQUUsOEJBQW1COztBQUV6RSw4QkFBbUIsR0FBRywwQkFBbUI7QUFDekMscUJBQXFCLDhCQUFtQixHQUFHLDBCQUFtQjtBQUM5RDtBQUNBO0FBQ0Esc0JBQXNCO0FBQ3RCLCtEQUErRCw4QkFBbUI7QUFDbEYsc0VBQXNFLDhCQUFtQjtBQUN6Rix5RUFBeUUsOEJBQW1CO0FBQzVGLHlFQUF5RSw4QkFBbUI7QUFDNUY7QUFDQTtBQUNBO0FBQ0E7Ozs7OztBQU1BO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZUFBZTtBQUNmLE1BQU07QUFDTixlQUFlO0FBQ2Y7QUFDQSxJQUFJO0FBQ0osYUFBYTtBQUNiLElBQUk7QUFDSixhQUFhO0FBQ2IsSUFBSTtBQUNKLGFBQWE7QUFDYixJQUFJO0FBQ0osYUFBYTtBQUNiLElBQUk7QUFDSjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHdDQUF3QyxJQUFJLHdCQUF3QixLQUFLO0FBQ3pFO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsMkNBQTJDLElBQUksd0JBQXdCLEtBQUs7QUFDNUU7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5QkFBeUIsS0FBSyxHQUFHLEVBQUU7QUFDbkM7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLFlBQVk7QUFDWjtBQUNBLDhDQUE4QyxFQUFFLGFBQWEsUUFBUTtBQUNyRTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBLG9EQUFvRCxLQUFLO0FBQ3pEO0FBQ0E7QUFDQSx5QkFBeUIsS0FBSyxHQUFHLEVBQUU7QUFDbkM7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLFlBQVk7QUFDWjtBQUNBLHNEQUFzRCxHQUFHLFdBQVcsUUFBUTtBQUM1RTtBQUNBO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSwwQ0FBMEM7QUFDMUM7O0FBRUE7QUFDQSxzQ0FBc0M7QUFDdEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQSxPQUFPO0FBQ1A7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ04sd0NBQXdDLFlBQVk7QUFDcEQ7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVyxRQUFRO0FBQ25CO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHVDQUF1QyxzQkFBc0IsR0FBRyxnQkFBZ0I7QUFDaEY7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVCxPQUFPO0FBQ1A7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnQkFBZ0I7QUFDaEI7QUFDQSxnREFBZ0Qsd0JBQXdCLElBQUksYUFBYTtBQUN6RjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLCtDQUErQyxpQkFBaUI7QUFDaEU7QUFDQSxjQUFjO0FBQ2Q7QUFDQSxtQ0FBbUMsaUJBQWlCLFNBQVMsZUFBZTtBQUM1RTtBQUNBO0FBQ0EsWUFBWTtBQUNaO0FBQ0EseUVBQXlFLGFBQWE7QUFDdEY7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsMkRBQTJELElBQUk7QUFDL0Q7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxzQ0FBc0MsSUFBSTtBQUMxQztBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSwyREFBMkQsSUFBSTtBQUMvRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsMENBQTBDLEtBQUs7QUFDL0M7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsMkRBQTJELElBQUk7QUFDL0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDBDQUEwQyxLQUFLO0FBQy9DO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLDBDQUEwQyxLQUFLO0FBQy9DO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSwyREFBMkQsSUFBSTtBQUMvRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwwQ0FBMEMsS0FBSztBQUMvQztBQUNBO0FBQ0EsMkNBQTJDLEtBQUssU0FBUyxzQkFBc0I7QUFDL0U7QUFDQSxZQUFZLGNBQWM7QUFDMUI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsOEJBQThCLEtBQUssU0FBUyxzQkFBc0I7QUFDbEU7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0EsY0FBYyxjQUFjO0FBQzVCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFD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Q0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ04saURBQWlELFFBQVE7QUFDekQ7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0JBQWdCO0FBQ2hCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsWUFBWTtBQUNaO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBO0FBQ0EsV0FBVztBQUNYLFFBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxXQUFXO0FBQ1gsVUFBVTtB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QUc7QUFDSDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLE9BQU87QUFDUCxLQUFLO0FBQ0w7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLFdBQVcsUUFBUTtBQUNuQixhQUFhLFNBQVM7QUFDdEI7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxXQUFXLEtBQUs7QUFDaEIsYUFBYSxTQUFTO0FBQ3RCO0FB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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnQkFBZ0I7QUFDaEIsZ0JBQWdCO0FBQ2hCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx5Q0FBeUM7QUFDekM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsZ0NBQWdDO0FBQ2hDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2IsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDRCQUE0QixLQUFLLEVBQUU7QUFBQSxFQUFFO0FBQ3JDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHVDQUF1QztBQUN2QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnQ0FBZ0M7QUFDaEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsbUJBQW1CO0FBQ25CLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDs7QUFFQSxPQUFPOztBQUVQO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsNkNBQTZDLDBCQUFtQixFQUFFLGlDQUFtQjs7QUFFckYsaUNBQW1CLEdBQUcsMEJBQW1CO0FBQ3pDLHFCQUFxQixpQ0FBbUIsR0FBRywwQkFBbUI7QUFDOUQ7QUFDQTtBQUNBO0FBQ0Esc0JBQXNCO0FBQ3RCLHdFQUF3RSxpQ0FBbUI7QUFDM0YsNEVBQTRFLGlDQUFtQjtBQUMvRix1RUFBdUUsaUNBQW1CO0FBQzFGLCtFQUErRSxpQ0FBbUI7Ozs7O0FBS2xHO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseUNBQXlDO0FBQ3pDLGtDQUFrQztBQUNsQyxtQ0FBbUM7QUFDbkMsNENBQTRDO0FBQzVDLG1DQUFtQztBQUNuQyx1Q0FBdUM7QUFDdkMsMENBQTBDO0FBQzFDLDhDQUE4QztBQUM5QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHFDQUFxQyxxQkFBcUIsMEZBQTBGLHFCQUFxQjtBQUN6SztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw0Q0FBNEMsc0JBQXNCO0FBQ2xFO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHdDQUF3QyxvQkFBb0I7QUFDNUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esd0NBQXdDLG9CQUFvQjtBQUM1RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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LENBQUMsS0FBSyxDQUFDLG1DQUFtQyxVQUFVLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN2RSxNQUFNLEtBQUssQ0FBQztTQUNmO0lBQ0wsQ0FBQztDQUNKO0FBenhCRCwwREF5eEJDOzs7Ozs7Ozs7Ozs7QUNsekJEOzs7Ozs7VUNBQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBOztVQUVBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBOzs7O1VFdEJBO1VBQ0E7VUFDQTtVQUNBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vc3ZhbXAtc3R1ZGlvLy4vbm9kZV9tb2R1bGVzL2h5cGhhLXJwYy9kaXN0L2h5cGhhLXJwYy13ZWJzb2NrZXQuanMiLCJ3ZWJwYWNrOi8vc3ZhbXAtc3R1ZGlvLy4vbm9kZV9tb2R1bGVzL2h5cGhhLXJwYy9pbmRleC5qcyIsIndlYnBhY2s6Ly9zdmFtcC1zdHVkaW8vLi9zcmMvY29tcG9uZW50cy9XZWxjb21lUGFnZS50cyIsIndlYnBhY2s6Ly9zdmFtcC1zdHVkaW8vLi9zcmMvZXh0ZW5zaW9uLnRzIiwid2VicGFjazovL3N2YW1wLXN0dWRpby8uL3NyYy9wcm92aWRlcnMvSHlwaGFBdXRoUHJvdmlkZXIudHMiLCJ3ZWJwYWNrOi8vc3ZhbXAtc3R1ZGlvLy4vc3JjL3Byb3ZpZGVycy9IeXBoYUZpbGVTeXN0ZW1Qcm92aWRlci50cyIsIndlYnBhY2s6Ly9zdmFtcC1zdHVkaW8vZXh0ZXJuYWwgY29tbW9uanMgXCJ2c2NvZGVcIiIsIndlYnBhY2s6Ly9zdmFtcC1zdHVkaW8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vc3ZhbXAtc3R1ZGlvL3dlYnBhY2svYmVmb3JlLXN0YXJ0dXAiLCJ3ZWJwYWNrOi8vc3ZhbXAtc3R1ZGlvL3dlYnBhY2svc3RhcnR1cCIsIndlYnBhY2s6Ly9zdmFtcC1zdHVkaW8vd2VicGFjay9hZnRlci1zdGFydHVwIl0sInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiB3ZWJwYWNrVW5pdmVyc2FsTW9kdWxlRGVmaW5pdGlvbihyb290LCBmYWN0b3J5KSB7XG5cdGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0Jylcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKTtcblx0ZWxzZSBpZih0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpXG5cdFx0ZGVmaW5lKFwiaHlwaGFXZWJzb2NrZXRDbGllbnRcIiwgW10sIGZhY3RvcnkpO1xuXHRlbHNlIGlmKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jylcblx0XHRleHBvcnRzW1wiaHlwaGFXZWJzb2NrZXRDbGllbnRcIl0gPSBmYWN0b3J5KCk7XG5cdGVsc2Vcblx0XHRyb290W1wiaHlwaGFXZWJzb2NrZXRDbGllbnRcIl0gPSBmYWN0b3J5KCk7XG59KSh0aGlzLCAoKSA9PiB7XG5yZXR1cm4gLyoqKioqKi8gKCgpID0+IHsgLy8gd2VicGFja0Jvb3RzdHJhcFxuLyoqKioqKi8gXHRcInVzZSBzdHJpY3RcIjtcbi8qKioqKiovIFx0dmFyIF9fd2VicGFja19tb2R1bGVzX18gPSAoe1xuXG4vKioqLyBcIi4vc3JjL3JwYy5qc1wiOlxuLyohKioqKioqKioqKioqKioqKioqKiohKlxcXG4gICEqKiogLi9zcmMvcnBjLmpzICoqKiFcbiAgXFwqKioqKioqKioqKioqKioqKioqKi9cbi8qKiovICgoX191bnVzZWRfd2VicGFja19tb2R1bGUsIF9fd2VicGFja19leHBvcnRzX18sIF9fd2VicGFja19yZXF1aXJlX18pID0+IHtcblxuX193ZWJwYWNrX3JlcXVpcmVfXy5yKF9fd2VicGFja19leHBvcnRzX18pO1xuLyogaGFybW9ueSBleHBvcnQgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIHtcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgQVBJX1ZFUlNJT046ICgpID0+ICgvKiBiaW5kaW5nICovIEFQSV9WRVJTSU9OKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgUlBDOiAoKSA9PiAoLyogYmluZGluZyAqLyBSUEMpXG4vKiBoYXJtb255IGV4cG9ydCAqLyB9KTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vdXRpbHMgKi8gXCIuL3NyYy91dGlscy9pbmRleC5qc1wiKTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfdXRpbHNfc2NoZW1hX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL3V0aWxzL3NjaGVtYSAqLyBcIi4vc3JjL3V0aWxzL3NjaGVtYS5qc1wiKTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfbXNncGFja19tc2dwYWNrX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISBAbXNncGFjay9tc2dwYWNrICovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vZGVjb2RlLm1qc1wiKTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfbXNncGFja19tc2dwYWNrX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8zX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISBAbXNncGFjay9tc2dwYWNrICovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vZW5jb2RlLm1qc1wiKTtcbi8qKlxuICogQ29udGFpbnMgdGhlIFJQQyBvYmplY3QgdXNlZCBib3RoIGJ5IHRoZSBhcHBsaWNhdGlvblxuICogc2l0ZSwgYW5kIGJ5IGVhY2ggcGx1Z2luXG4gKi9cblxuXG5cblxuXG5jb25zdCBBUElfVkVSU0lPTiA9IDM7XG5jb25zdCBDSFVOS19TSVpFID0gMTAyNCAqIDI1NjtcbmNvbnN0IENPTkNVUlJFTkNZX0xJTUlUID0gMzA7XG5cbmNvbnN0IEFycmF5QnVmZmVyVmlldyA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihcbiAgT2JqZWN0LmdldFByb3RvdHlwZU9mKG5ldyBVaW50OEFycmF5KCkpLFxuKS5jb25zdHJ1Y3RvcjtcblxuZnVuY3Rpb24gX2FwcGVuZEJ1ZmZlcihidWZmZXIxLCBidWZmZXIyKSB7XG4gIGNvbnN0IHRtcCA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcjEuYnl0ZUxlbmd0aCArIGJ1ZmZlcjIuYnl0ZUxlbmd0aCk7XG4gIHRtcC5zZXQobmV3IFVpbnQ4QXJyYXkoYnVmZmVyMSksIDApO1xuICB0bXAuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZmZlcjIpLCBidWZmZXIxLmJ5dGVMZW5ndGgpO1xuICByZXR1cm4gdG1wLmJ1ZmZlcjtcbn1cblxuZnVuY3Rpb24gaW5kZXhPYmplY3Qob2JqLCBpcykge1xuICBpZiAoIWlzKSB0aHJvdyBuZXcgRXJyb3IoXCJ1bmRlZmluZWQgaW5kZXhcIik7XG4gIGlmICh0eXBlb2YgaXMgPT09IFwic3RyaW5nXCIpIHJldHVybiBpbmRleE9iamVjdChvYmosIGlzLnNwbGl0KFwiLlwiKSk7XG4gIGVsc2UgaWYgKGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIG9iajtcbiAgZWxzZSByZXR1cm4gaW5kZXhPYmplY3Qob2JqW2lzWzBdXSwgaXMuc2xpY2UoMSkpO1xufVxuXG5mdW5jdGlvbiBfZ2V0X3NjaGVtYShvYmosIG5hbWUgPSBudWxsLCBza2lwQ29udGV4dCA9IGZhbHNlKSB7XG4gIGlmIChBcnJheS5pc0FycmF5KG9iaikpIHtcbiAgICByZXR1cm4gb2JqLm1hcCgodiwgaSkgPT4gX2dldF9zY2hlbWEodiwgbnVsbCwgc2tpcENvbnRleHQpKTtcbiAgfSBlbHNlIGlmICh0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiICYmIG9iaiAhPT0gbnVsbCkge1xuICAgIGxldCBzY2hlbWEgPSB7fTtcbiAgICBmb3IgKGxldCBrIGluIG9iaikge1xuICAgICAgc2NoZW1hW2tdID0gX2dldF9zY2hlbWEob2JqW2tdLCBrLCBza2lwQ29udGV4dCk7XG4gICAgfVxuICAgIHJldHVybiBzY2hlbWE7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG9iaiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgaWYgKG9iai5fX3NjaGVtYV9fKSB7XG4gICAgICBjb25zdCBzY2hlbWEgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG9iai5fX3NjaGVtYV9fKSk7XG4gICAgICBpZiAobmFtZSkge1xuICAgICAgICBzY2hlbWEubmFtZSA9IG5hbWU7XG4gICAgICAgIG9iai5fX3NjaGVtYV9fLm5hbWUgPSBuYW1lO1xuICAgICAgfVxuICAgICAgaWYgKHNraXBDb250ZXh0KSB7XG4gICAgICAgIGlmIChzY2hlbWEucGFyYW1ldGVycyAmJiBzY2hlbWEucGFyYW1ldGVycy5wcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgZGVsZXRlIHNjaGVtYS5wYXJhbWV0ZXJzLnByb3BlcnRpZXNbXCJjb250ZXh0XCJdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4geyB0eXBlOiBcImZ1bmN0aW9uXCIsIGZ1bmN0aW9uOiBzY2hlbWEgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHsgdHlwZTogXCJmdW5jdGlvblwiIH07XG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGVvZiBvYmogPT09IFwibnVtYmVyXCIpIHtcbiAgICByZXR1cm4geyB0eXBlOiBcIm51bWJlclwiIH07XG4gIH0gZWxzZSBpZiAodHlwZW9mIG9iaiA9PT0gXCJzdHJpbmdcIikge1xuICAgIHJldHVybiB7IHR5cGU6IFwic3RyaW5nXCIgfTtcbiAgfSBlbHNlIGlmICh0eXBlb2Ygb2JqID09PSBcImJvb2xlYW5cIikge1xuICAgIHJldHVybiB7IHR5cGU6IFwiYm9vbGVhblwiIH07XG4gIH0gZWxzZSBpZiAob2JqID09PSBudWxsKSB7XG4gICAgcmV0dXJuIHsgdHlwZTogXCJudWxsXCIgfTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge307XG4gIH1cbn1cblxuZnVuY3Rpb24gX2Fubm90YXRlX3NlcnZpY2Uoc2VydmljZSwgc2VydmljZVR5cGVJbmZvKSB7XG4gIGZ1bmN0aW9uIHZhbGlkYXRlS2V5cyhzZXJ2aWNlRGljdCwgc2NoZW1hRGljdCwgcGF0aCA9IFwicm9vdFwiKSB7XG4gICAgLy8gVmFsaWRhdGUgdGhhdCBhbGwga2V5cyBpbiBzY2hlbWFEaWN0IGV4aXN0IGluIHNlcnZpY2VEaWN0XG4gICAgZm9yIChsZXQga2V5IGluIHNjaGVtYURpY3QpIHtcbiAgICAgIGlmICghc2VydmljZURpY3QuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3Npbmcga2V5ICcke2tleX0nIGluIHNlcnZpY2UgYXQgcGF0aCAnJHtwYXRofSdgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgYW55IHVuZXhwZWN0ZWQga2V5cyBpbiBzZXJ2aWNlRGljdFxuICAgIGZvciAobGV0IGtleSBpbiBzZXJ2aWNlRGljdCkge1xuICAgICAgaWYgKGtleSAhPT0gXCJ0eXBlXCIgJiYgIXNjaGVtYURpY3QuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuZXhwZWN0ZWQga2V5ICcke2tleX0nIGluIHNlcnZpY2UgYXQgcGF0aCAnJHtwYXRofSdgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBhbm5vdGF0ZVJlY3Vyc2l2ZShuZXdTZXJ2aWNlLCBzY2hlbWFJbmZvLCBwYXRoID0gXCJyb290XCIpIHtcbiAgICBpZiAodHlwZW9mIG5ld1NlcnZpY2UgPT09IFwib2JqZWN0XCIgJiYgIUFycmF5LmlzQXJyYXkobmV3U2VydmljZSkpIHtcbiAgICAgIHZhbGlkYXRlS2V5cyhuZXdTZXJ2aWNlLCBzY2hlbWFJbmZvLCBwYXRoKTtcbiAgICAgIGZvciAobGV0IGsgaW4gbmV3U2VydmljZSkge1xuICAgICAgICBsZXQgdiA9IG5ld1NlcnZpY2Vba107XG4gICAgICAgIGxldCBuZXdQYXRoID0gYCR7cGF0aH0uJHtrfWA7XG4gICAgICAgIGlmICh0eXBlb2YgdiA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheSh2KSkge1xuICAgICAgICAgIGFubm90YXRlUmVjdXJzaXZlKHYsIHNjaGVtYUluZm9ba10sIG5ld1BhdGgpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICBpZiAoc2NoZW1hSW5mby5oYXNPd25Qcm9wZXJ0eShrKSkge1xuICAgICAgICAgICAgbmV3U2VydmljZVtrXSA9ICgwLF91dGlsc19zY2hlbWFfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5zY2hlbWFGdW5jdGlvbikodiwge1xuICAgICAgICAgICAgICBuYW1lOiBzY2hlbWFJbmZvW2tdW1wibmFtZVwiXSxcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHNjaGVtYUluZm9ba10uZGVzY3JpcHRpb24gfHwgXCJcIixcbiAgICAgICAgICAgICAgcGFyYW1ldGVyczogc2NoZW1hSW5mb1trXVtcInBhcmFtZXRlcnNcIl0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBgTWlzc2luZyBzY2hlbWEgZm9yIGZ1bmN0aW9uICcke2t9JyBhdCBwYXRoICcke25ld1BhdGh9J2AsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShuZXdTZXJ2aWNlKSkge1xuICAgICAgaWYgKG5ld1NlcnZpY2UubGVuZ3RoICE9PSBzY2hlbWFJbmZvLmxlbmd0aCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYExlbmd0aCBtaXNtYXRjaCBhdCBwYXRoICcke3BhdGh9J2ApO1xuICAgICAgfVxuICAgICAgbmV3U2VydmljZS5mb3JFYWNoKCh2LCBpKSA9PiB7XG4gICAgICAgIGxldCBuZXdQYXRoID0gYCR7cGF0aH1bJHtpfV1gO1xuICAgICAgICBpZiAodHlwZW9mIHYgPT09IFwib2JqZWN0XCIgJiYgIUFycmF5LmlzQXJyYXkodikpIHtcbiAgICAgICAgICBhbm5vdGF0ZVJlY3Vyc2l2ZSh2LCBzY2hlbWFJbmZvW2ldLCBuZXdQYXRoKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdiA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgaWYgKHNjaGVtYUluZm8uaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgICAgIG5ld1NlcnZpY2VbaV0gPSAoMCxfdXRpbHNfc2NoZW1hX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18uc2NoZW1hRnVuY3Rpb24pKHYsIHtcbiAgICAgICAgICAgICAgbmFtZTogc2NoZW1hSW5mb1tpXVtcIm5hbWVcIl0sXG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBzY2hlbWFJbmZvW2ldLmRlc2NyaXB0aW9uIHx8IFwiXCIsXG4gICAgICAgICAgICAgIHBhcmFtZXRlcnM6IHNjaGVtYUluZm9baV1bXCJwYXJhbWV0ZXJzXCJdLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgYE1pc3Npbmcgc2NoZW1hIGZvciBmdW5jdGlvbiBhdCBpbmRleCAke2l9IGluIHBhdGggJyR7bmV3UGF0aH0nYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICB2YWxpZGF0ZUtleXMoc2VydmljZSwgc2VydmljZVR5cGVJbmZvW1wiZGVmaW5pdGlvblwiXSk7XG4gIGFubm90YXRlUmVjdXJzaXZlKHNlcnZpY2UsIHNlcnZpY2VUeXBlSW5mb1tcImRlZmluaXRpb25cIl0pO1xuICByZXR1cm4gc2VydmljZTtcbn1cblxuZnVuY3Rpb24gZ2V0RnVuY3Rpb25JbmZvKGZ1bmMpIHtcbiAgY29uc3QgZnVuY1N0cmluZyA9IGZ1bmMudG9TdHJpbmcoKTtcblxuICAvLyBFeHRyYWN0IGZ1bmN0aW9uIG5hbWVcbiAgY29uc3QgbmFtZU1hdGNoID0gZnVuY1N0cmluZy5tYXRjaCgvZnVuY3Rpb25cXHMqKFxcdyopLyk7XG4gIGNvbnN0IG5hbWUgPSAobmFtZU1hdGNoICYmIG5hbWVNYXRjaFsxXSkgfHwgXCJcIjtcblxuICAvLyBFeHRyYWN0IGZ1bmN0aW9uIHBhcmFtZXRlcnMsIGV4Y2x1ZGluZyBjb21tZW50c1xuICBjb25zdCBwYXJhbXNNYXRjaCA9IGZ1bmNTdHJpbmcubWF0Y2goL1xcKChbXildKilcXCkvKTtcbiAgbGV0IHBhcmFtcyA9IFwiXCI7XG4gIGlmIChwYXJhbXNNYXRjaCkge1xuICAgIHBhcmFtcyA9IHBhcmFtc01hdGNoWzFdXG4gICAgICAuc3BsaXQoXCIsXCIpXG4gICAgICAubWFwKChwKSA9PlxuICAgICAgICBwXG4gICAgICAgICAgLnJlcGxhY2UoL1xcL1xcKi4qP1xcKlxcLy9nLCBcIlwiKSAvLyBSZW1vdmUgYmxvY2sgY29tbWVudHNcbiAgICAgICAgICAucmVwbGFjZSgvXFwvXFwvLiokL2csIFwiXCIpLFxuICAgICAgKSAvLyBSZW1vdmUgbGluZSBjb21tZW50c1xuICAgICAgLmZpbHRlcigocCkgPT4gcC50cmltKCkubGVuZ3RoID4gMCkgLy8gUmVtb3ZlIGVtcHR5IHN0cmluZ3MgYWZ0ZXIgcmVtb3ZpbmcgY29tbWVudHNcbiAgICAgIC5tYXAoKHApID0+IHAudHJpbSgpKSAvLyBUcmltIHJlbWFpbmluZyB3aGl0ZXNwYWNlXG4gICAgICAuam9pbihcIiwgXCIpO1xuICB9XG5cbiAgLy8gRXh0cmFjdCBmdW5jdGlvbiBkb2NzdHJpbmcgKGJsb2NrIGNvbW1lbnQpXG4gIGxldCBkb2NNYXRjaCA9IGZ1bmNTdHJpbmcubWF0Y2goL1xcKVxccypcXHtcXHMqXFwvXFwqKFtcXHNcXFNdKj8pXFwqXFwvLyk7XG4gIGNvbnN0IGRvY3N0cmluZ0Jsb2NrID0gKGRvY01hdGNoICYmIGRvY01hdGNoWzFdLnRyaW0oKSkgfHwgXCJcIjtcblxuICAvLyBFeHRyYWN0IGZ1bmN0aW9uIGRvY3N0cmluZyAobGluZSBjb21tZW50KVxuICBkb2NNYXRjaCA9IGZ1bmNTdHJpbmcubWF0Y2goL1xcKVxccypcXHtcXHMqKFxcL1xcL1tcXHNcXFNdKj8pXFxuXFxzKlteXFxzXFwvXS8pO1xuICBjb25zdCBkb2NzdHJpbmdMaW5lID1cbiAgICAoZG9jTWF0Y2ggJiZcbiAgICAgIGRvY01hdGNoWzFdXG4gICAgICAgIC5zcGxpdChcIlxcblwiKVxuICAgICAgICAubWFwKChzKSA9PiBzLnJlcGxhY2UoL15cXC9cXC9cXHMqLywgXCJcIikudHJpbSgpKVxuICAgICAgICAuam9pbihcIlxcblwiKSkgfHxcbiAgICBcIlwiO1xuXG4gIGNvbnN0IGRvY3N0cmluZyA9IGRvY3N0cmluZ0Jsb2NrIHx8IGRvY3N0cmluZ0xpbmU7XG4gIHJldHVybiAoXG4gICAgbmFtZSAmJlxuICAgIHBhcmFtcy5sZW5ndGggPiAwICYmIHtcbiAgICAgIG5hbWU6IG5hbWUsXG4gICAgICBzaWc6IHBhcmFtcyxcbiAgICAgIGRvYzogZG9jc3RyaW5nLFxuICAgIH1cbiAgKTtcbn1cblxuZnVuY3Rpb24gY29uY2F0QXJyYXlCdWZmZXJzKGJ1ZmZlcnMpIHtcbiAgdmFyIGJ1ZmZlcnNMZW5ndGhzID0gYnVmZmVycy5tYXAoZnVuY3Rpb24gKGIpIHtcbiAgICAgIHJldHVybiBiLmJ5dGVMZW5ndGg7XG4gICAgfSksXG4gICAgdG90YWxCdWZmZXJsZW5ndGggPSBidWZmZXJzTGVuZ3Rocy5yZWR1Y2UoZnVuY3Rpb24gKHAsIGMpIHtcbiAgICAgIHJldHVybiBwICsgYztcbiAgICB9LCAwKSxcbiAgICB1bml0OEFyciA9IG5ldyBVaW50OEFycmF5KHRvdGFsQnVmZmVybGVuZ3RoKTtcbiAgYnVmZmVyc0xlbmd0aHMucmVkdWNlKGZ1bmN0aW9uIChwLCBjLCBpKSB7XG4gICAgdW5pdDhBcnIuc2V0KG5ldyBVaW50OEFycmF5KGJ1ZmZlcnNbaV0pLCBwKTtcbiAgICByZXR1cm4gcCArIGM7XG4gIH0sIDApO1xuICByZXR1cm4gdW5pdDhBcnIuYnVmZmVyO1xufVxuXG5jbGFzcyBUaW1lciB7XG4gIGNvbnN0cnVjdG9yKHRpbWVvdXQsIGNhbGxiYWNrLCBhcmdzLCBsYWJlbCkge1xuICAgIHRoaXMuX3RpbWVvdXQgPSB0aW1lb3V0O1xuICAgIHRoaXMuX2NhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgdGhpcy5fYXJncyA9IGFyZ3M7XG4gICAgdGhpcy5fbGFiZWwgPSBsYWJlbCB8fCBcInRpbWVyXCI7XG4gICAgdGhpcy5fdGFzayA9IG51bGw7XG4gICAgdGhpcy5zdGFydGVkID0gZmFsc2U7XG4gIH1cblxuICBzdGFydCgpIHtcbiAgICBpZiAodGhpcy5zdGFydGVkKSB7XG4gICAgICB0aGlzLnJlc2V0KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3Rhc2sgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy5fY2FsbGJhY2suYXBwbHkodGhpcywgdGhpcy5fYXJncyk7XG4gICAgICB9LCB0aGlzLl90aW1lb3V0ICogMTAwMCk7XG4gICAgICB0aGlzLnN0YXJ0ZWQgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIGlmICh0aGlzLl90YXNrICYmIHRoaXMuc3RhcnRlZCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX3Rhc2spO1xuICAgICAgdGhpcy5fdGFzayA9IG51bGw7XG4gICAgICB0aGlzLnN0YXJ0ZWQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKGBDbGVhcmluZyBhIHRpbWVyICgke3RoaXMuX2xhYmVsfSkgd2hpY2ggaXMgbm90IHN0YXJ0ZWRgKTtcbiAgICB9XG4gIH1cblxuICByZXNldCgpIHtcbiAgICBpZiAodGhpcy5fdGFzaykge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX3Rhc2spO1xuICAgIH1cbiAgICB0aGlzLl90YXNrID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLl9jYWxsYmFjay5hcHBseSh0aGlzLCB0aGlzLl9hcmdzKTtcbiAgICB9LCB0aGlzLl90aW1lb3V0ICogMTAwMCk7XG4gICAgdGhpcy5zdGFydGVkID0gdHJ1ZTtcbiAgfVxufVxuXG5jbGFzcyBSZW1vdGVTZXJ2aWNlIGV4dGVuZHMgT2JqZWN0IHt9XG5cbi8qKlxuICogUlBDIG9iamVjdCByZXByZXNlbnRzIGEgc2luZ2xlIHNpdGUgaW4gdGhlXG4gKiBjb21tdW5pY2F0aW9uIHByb3RvY29sIGJldHdlZW4gdGhlIGFwcGxpY2F0aW9uIGFuZCB0aGUgcGx1Z2luXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGNvbm5lY3Rpb24gYSBzcGVjaWFsIG9iamVjdCBhbGxvd2luZyB0byBzZW5kXG4gKiBhbmQgcmVjZWl2ZSBtZXNzYWdlcyBmcm9tIHRoZSBvcHBvc2l0ZSBzaXRlIChiYXNpY2FsbHkgaXRcbiAqIHNob3VsZCBvbmx5IHByb3ZpZGUgc2VuZCgpIGFuZCBvbk1lc3NhZ2UoKSBtZXRob2RzKVxuICovXG5jbGFzcyBSUEMgZXh0ZW5kcyBfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5NZXNzYWdlRW1pdHRlciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIGNvbm5lY3Rpb24sXG4gICAge1xuICAgICAgY2xpZW50X2lkID0gbnVsbCxcbiAgICAgIGRlZmF1bHRfY29udGV4dCA9IG51bGwsXG4gICAgICBuYW1lID0gbnVsbCxcbiAgICAgIGNvZGVjcyA9IG51bGwsXG4gICAgICBtZXRob2RfdGltZW91dCA9IG51bGwsXG4gICAgICBtYXhfbWVzc2FnZV9idWZmZXJfc2l6ZSA9IDAsXG4gICAgICBkZWJ1ZyA9IGZhbHNlLFxuICAgICAgd29ya3NwYWNlID0gbnVsbCxcbiAgICAgIHNpbGVudCA9IGZhbHNlLFxuICAgICAgYXBwX2lkID0gbnVsbCxcbiAgICAgIHNlcnZlcl9iYXNlX3VybCA9IG51bGwsXG4gICAgICBsb25nX21lc3NhZ2VfY2h1bmtfc2l6ZSA9IG51bGwsXG4gICAgfSxcbiAgKSB7XG4gICAgc3VwZXIoZGVidWcpO1xuICAgIHRoaXMuX2NvZGVjcyA9IGNvZGVjcyB8fCB7fTtcbiAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKGNsaWVudF9pZCAmJiB0eXBlb2YgY2xpZW50X2lkID09PSBcInN0cmluZ1wiKTtcbiAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKGNsaWVudF9pZCwgXCJjbGllbnRfaWQgaXMgcmVxdWlyZWRcIik7XG4gICAgdGhpcy5fY2xpZW50X2lkID0gY2xpZW50X2lkO1xuICAgIHRoaXMuX25hbWUgPSBuYW1lO1xuICAgIHRoaXMuX2FwcF9pZCA9IGFwcF9pZCB8fCBcIipcIjtcbiAgICB0aGlzLl9sb2NhbF93b3Jrc3BhY2UgPSB3b3Jrc3BhY2U7XG4gICAgdGhpcy5fc2lsZW50ID0gc2lsZW50O1xuICAgIHRoaXMuZGVmYXVsdF9jb250ZXh0ID0gZGVmYXVsdF9jb250ZXh0IHx8IHt9O1xuICAgIHRoaXMuX21ldGhvZF9hbm5vdGF0aW9ucyA9IG5ldyBXZWFrTWFwKCk7XG4gICAgdGhpcy5fbWF4X21lc3NhZ2VfYnVmZmVyX3NpemUgPSBtYXhfbWVzc2FnZV9idWZmZXJfc2l6ZTtcbiAgICB0aGlzLl9jaHVua19zdG9yZSA9IHt9O1xuICAgIHRoaXMuX21ldGhvZF90aW1lb3V0ID0gbWV0aG9kX3RpbWVvdXQgfHwgMzA7XG4gICAgdGhpcy5fc2VydmVyX2Jhc2VfdXJsID0gc2VydmVyX2Jhc2VfdXJsO1xuICAgIHRoaXMuX2xvbmdfbWVzc2FnZV9jaHVua19zaXplID0gbG9uZ19tZXNzYWdlX2NodW5rX3NpemUgfHwgQ0hVTktfU0laRTtcblxuICAgIC8vIG1ha2Ugc3VyZSB0aGVyZSBpcyBhbiBleGVjdXRlIGZ1bmN0aW9uXG4gICAgdGhpcy5fc2VydmljZXMgPSB7fTtcbiAgICB0aGlzLl9vYmplY3Rfc3RvcmUgPSB7XG4gICAgICBzZXJ2aWNlczogdGhpcy5fc2VydmljZXMsXG4gICAgfTtcblxuICAgIGlmIChjb25uZWN0aW9uKSB7XG4gICAgICB0aGlzLmFkZF9zZXJ2aWNlKHtcbiAgICAgICAgaWQ6IFwiYnVpbHQtaW5cIixcbiAgICAgICAgdHlwZTogXCJidWlsdC1pblwiLFxuICAgICAgICBuYW1lOiBgQnVpbHQtaW4gc2VydmljZXMgZm9yICR7dGhpcy5fbG9jYWxfd29ya3NwYWNlfS8ke3RoaXMuX2NsaWVudF9pZH1gLFxuICAgICAgICBjb25maWc6IHtcbiAgICAgICAgICByZXF1aXJlX2NvbnRleHQ6IHRydWUsXG4gICAgICAgICAgdmlzaWJpbGl0eTogXCJwdWJsaWNcIixcbiAgICAgICAgICBhcGlfdmVyc2lvbjogQVBJX1ZFUlNJT04sXG4gICAgICAgIH0sXG4gICAgICAgIHBpbmc6IHRoaXMuX3BpbmcuYmluZCh0aGlzKSxcbiAgICAgICAgZ2V0X3NlcnZpY2U6IHRoaXMuZ2V0X2xvY2FsX3NlcnZpY2UuYmluZCh0aGlzKSxcbiAgICAgICAgbWVzc2FnZV9jYWNoZToge1xuICAgICAgICAgIGNyZWF0ZTogdGhpcy5fY3JlYXRlX21lc3NhZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgICBhcHBlbmQ6IHRoaXMuX2FwcGVuZF9tZXNzYWdlLmJpbmQodGhpcyksXG4gICAgICAgICAgc2V0OiB0aGlzLl9zZXRfbWVzc2FnZS5iaW5kKHRoaXMpLFxuICAgICAgICAgIHByb2Nlc3M6IHRoaXMuX3Byb2Nlc3NfbWVzc2FnZS5iaW5kKHRoaXMpLFxuICAgICAgICAgIHJlbW92ZTogdGhpcy5fcmVtb3ZlX21lc3NhZ2UuYmluZCh0aGlzKSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgICAgdGhpcy5vbihcIm1ldGhvZFwiLCB0aGlzLl9oYW5kbGVfbWV0aG9kLmJpbmQodGhpcykpO1xuICAgICAgdGhpcy5vbihcImVycm9yXCIsIGNvbnNvbGUuZXJyb3IpO1xuXG4gICAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKGNvbm5lY3Rpb24uZW1pdF9tZXNzYWdlICYmIGNvbm5lY3Rpb24ub25fbWVzc2FnZSk7XG4gICAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKFxuICAgICAgICBjb25uZWN0aW9uLm1hbmFnZXJfaWQgIT09IHVuZGVmaW5lZCxcbiAgICAgICAgXCJDb25uZWN0aW9uIG11c3QgaGF2ZSBtYW5hZ2VyX2lkXCIsXG4gICAgICApO1xuICAgICAgdGhpcy5fZW1pdF9tZXNzYWdlID0gY29ubmVjdGlvbi5lbWl0X21lc3NhZ2UuYmluZChjb25uZWN0aW9uKTtcbiAgICAgIGNvbm5lY3Rpb24ub25fbWVzc2FnZSh0aGlzLl9vbl9tZXNzYWdlLmJpbmQodGhpcykpO1xuICAgICAgdGhpcy5fY29ubmVjdGlvbiA9IGNvbm5lY3Rpb247XG4gICAgICBjb25zdCBvbkNvbm5lY3RlZCA9IGFzeW5jIChjb25uZWN0aW9uSW5mbykgPT4ge1xuICAgICAgICBpZiAoIXRoaXMuX3NpbGVudCAmJiB0aGlzLl9jb25uZWN0aW9uLm1hbmFnZXJfaWQpIHtcbiAgICAgICAgICBjb25zb2xlLmRlYnVnKFwiQ29ubmVjdGlvbiBlc3RhYmxpc2hlZCwgcmVwb3J0aW5nIHNlcnZpY2VzLi4uXCIpO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBtYW5hZ2VyID0gYXdhaXQgdGhpcy5nZXRfbWFuYWdlcl9zZXJ2aWNlKHtcbiAgICAgICAgICAgICAgdGltZW91dDogMTAsXG4gICAgICAgICAgICAgIGNhc2VfY29udmVyc2lvbjogXCJjYW1lbFwiLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCBzZXJ2aWNlcyA9IE9iamVjdC52YWx1ZXModGhpcy5fc2VydmljZXMpO1xuICAgICAgICAgICAgY29uc3Qgc2VydmljZXNDb3VudCA9IHNlcnZpY2VzLmxlbmd0aDtcbiAgICAgICAgICAgIGxldCByZWdpc3RlcmVkQ291bnQgPSAwO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBzZXJ2aWNlIG9mIHNlcnZpY2VzKSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VydmljZUluZm8gPSB0aGlzLl9leHRyYWN0X3NlcnZpY2VfaW5mbyhzZXJ2aWNlKTtcbiAgICAgICAgICAgICAgICBhd2FpdCBtYW5hZ2VyLnJlZ2lzdGVyU2VydmljZShzZXJ2aWNlSW5mbyk7XG4gICAgICAgICAgICAgICAgcmVnaXN0ZXJlZENvdW50Kys7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKHNlcnZpY2VFcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICAgICAgICBgRmFpbGVkIHRvIHJlZ2lzdGVyIHNlcnZpY2UgJHtzZXJ2aWNlLmlkIHx8IFwidW5rbm93blwifTogJHtzZXJ2aWNlRXJyb3J9YCxcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChyZWdpc3RlcmVkQ291bnQgPT09IHNlcnZpY2VzQ291bnQpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFxuICAgICAgICAgICAgICAgIGBTdWNjZXNzZnVsbHkgcmVnaXN0ZXJlZCBhbGwgJHtyZWdpc3RlcmVkQ291bnR9IHNlcnZpY2VzIHdpdGggdGhlIHNlcnZlcmAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgICAgICAgYE9ubHkgcmVnaXN0ZXJlZCAke3JlZ2lzdGVyZWRDb3VudH0gb3V0IG9mICR7c2VydmljZXNDb3VudH0gc2VydmljZXMgd2l0aCB0aGUgc2VydmVyYCxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChtYW5hZ2VyRXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICAgIGBGYWlsZWQgdG8gZ2V0IG1hbmFnZXIgc2VydmljZSBmb3IgcmVnaXN0ZXJpbmcgc2VydmljZXM6ICR7bWFuYWdlckVycm9yfWAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBjb25zb2xlLmRlYnVnKFwiQ29ubmVjdGlvbiBlc3RhYmxpc2hlZFwiLCBjb25uZWN0aW9uSW5mbyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbm5lY3Rpb25JbmZvKSB7XG4gICAgICAgICAgaWYgKGNvbm5lY3Rpb25JbmZvLnB1YmxpY19iYXNlX3VybCkge1xuICAgICAgICAgICAgdGhpcy5fc2VydmVyX2Jhc2VfdXJsID0gY29ubmVjdGlvbkluZm8ucHVibGljX2Jhc2VfdXJsO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLl9maXJlKFwiY29ubmVjdGVkXCIsIGNvbm5lY3Rpb25JbmZvKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGNvbm5lY3Rpb24ub25fY29ubmVjdGVkKG9uQ29ubmVjdGVkKTtcbiAgICAgIG9uQ29ubmVjdGVkKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2VtaXRfbWVzc2FnZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJObyBjb25uZWN0aW9uIHRvIGVtaXQgbWVzc2FnZVwiKTtcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgcmVnaXN0ZXJfY29kZWMoY29uZmlnKSB7XG4gICAgaWYgKCFjb25maWdbXCJuYW1lXCJdIHx8ICghY29uZmlnW1wiZW5jb2RlclwiXSAmJiAhY29uZmlnW1wiZGVjb2RlclwiXSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgXCJJbnZhbGlkIGNvZGVjIGZvcm1hdCwgcGxlYXNlIG1ha2Ugc3VyZSB5b3UgcHJvdmlkZSBhIG5hbWUsIHR5cGUsIGVuY29kZXIgYW5kIGRlY29kZXIuXCIsXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoY29uZmlnLnR5cGUpIHtcbiAgICAgICAgZm9yIChsZXQgayBvZiBPYmplY3Qua2V5cyh0aGlzLl9jb2RlY3MpKSB7XG4gICAgICAgICAgaWYgKHRoaXMuX2NvZGVjc1trXS50eXBlID09PSBjb25maWcudHlwZSB8fCBrID09PSBjb25maWcubmFtZSkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2NvZGVjc1trXTtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcIlJlbW92ZSBkdXBsaWNhdGVkIGNvZGVjOiBcIiArIGspO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy5fY29kZWNzW2NvbmZpZ1tcIm5hbWVcIl1dID0gY29uZmlnO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIF9waW5nKG1zZywgY29udGV4dCkge1xuICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLmFzc2VydCkobXNnID09IFwicGluZ1wiKTtcbiAgICByZXR1cm4gXCJwb25nXCI7XG4gIH1cblxuICBhc3luYyBwaW5nKGNsaWVudF9pZCwgdGltZW91dCkge1xuICAgIGxldCBtZXRob2QgPSB0aGlzLl9nZW5lcmF0ZV9yZW1vdGVfbWV0aG9kKHtcbiAgICAgIF9yc2VydmVyOiB0aGlzLl9zZXJ2ZXJfYmFzZV91cmwsXG4gICAgICBfcnRhcmdldDogY2xpZW50X2lkLFxuICAgICAgX3JtZXRob2Q6IFwic2VydmljZXMuYnVpbHQtaW4ucGluZ1wiLFxuICAgICAgX3Jwcm9taXNlOiB0cnVlLFxuICAgICAgX3Jkb2M6IFwiUGluZyBhIHJlbW90ZSBjbGllbnRcIixcbiAgICB9KTtcbiAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKChhd2FpdCBtZXRob2QoXCJwaW5nXCIsIHRpbWVvdXQpKSA9PSBcInBvbmdcIik7XG4gIH1cblxuICBfY3JlYXRlX21lc3NhZ2Uoa2V5LCBoZWFydGJlYXQsIG92ZXJ3cml0ZSwgY29udGV4dCkge1xuICAgIGlmIChoZWFydGJlYXQpIHtcbiAgICAgIGlmICghdGhpcy5fb2JqZWN0X3N0b3JlW2tleV0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBzZXNzaW9uIGRvZXMgbm90IGV4aXN0IGFueW1vcmU6ICR7a2V5fWApO1xuICAgICAgfVxuICAgICAgdGhpcy5fb2JqZWN0X3N0b3JlW2tleV1bXCJ0aW1lclwiXS5yZXNldCgpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5fb2JqZWN0X3N0b3JlW1wibWVzc2FnZV9jYWNoZVwiXSkge1xuICAgICAgdGhpcy5fb2JqZWN0X3N0b3JlW1wibWVzc2FnZV9jYWNoZVwiXSA9IHt9O1xuICAgIH1cbiAgICBpZiAoIW92ZXJ3cml0ZSAmJiB0aGlzLl9vYmplY3Rfc3RvcmVbXCJtZXNzYWdlX2NhY2hlXCJdW2tleV0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYE1lc3NhZ2Ugd2l0aCB0aGUgc2FtZSBrZXkgKCR7a2V5fSkgYWxyZWFkeSBleGlzdHMgaW4gdGhlIGNhY2hlIHN0b3JlLCBwbGVhc2UgdXNlIG92ZXJ3cml0ZT10cnVlIG9yIHJlbW92ZSBpdCBmaXJzdC5gLFxuICAgICAgKTtcbiAgICB9XG4gICAgdGhpcy5fb2JqZWN0X3N0b3JlW1wibWVzc2FnZV9jYWNoZVwiXVtrZXldID0gW107XG4gIH1cblxuICBfYXBwZW5kX21lc3NhZ2Uoa2V5LCBkYXRhLCBoZWFydGJlYXQsIGNvbnRleHQpIHtcbiAgICBpZiAoaGVhcnRiZWF0KSB7XG4gICAgICBpZiAoIXRoaXMuX29iamVjdF9zdG9yZVtrZXldKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgc2Vzc2lvbiBkb2VzIG5vdCBleGlzdCBhbnltb3JlOiAke2tleX1gKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX29iamVjdF9zdG9yZVtrZXldW1widGltZXJcIl0ucmVzZXQoKTtcbiAgICB9XG4gICAgY29uc3QgY2FjaGUgPSB0aGlzLl9vYmplY3Rfc3RvcmVbXCJtZXNzYWdlX2NhY2hlXCJdO1xuICAgIGlmICghY2FjaGVba2V5XSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNZXNzYWdlIHdpdGgga2V5ICR7a2V5fSBkb2VzIG5vdCBleGlzdHMuYCk7XG4gICAgfVxuICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLmFzc2VydCkoZGF0YSBpbnN0YW5jZW9mIEFycmF5QnVmZmVyVmlldyk7XG4gICAgY2FjaGVba2V5XS5wdXNoKGRhdGEpO1xuICB9XG5cbiAgX3NldF9tZXNzYWdlKGtleSwgaW5kZXgsIGRhdGEsIGhlYXJ0YmVhdCwgY29udGV4dCkge1xuICAgIGlmIChoZWFydGJlYXQpIHtcbiAgICAgIGlmICghdGhpcy5fb2JqZWN0X3N0b3JlW2tleV0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBzZXNzaW9uIGRvZXMgbm90IGV4aXN0IGFueW1vcmU6ICR7a2V5fWApO1xuICAgICAgfVxuICAgICAgdGhpcy5fb2JqZWN0X3N0b3JlW2tleV1bXCJ0aW1lclwiXS5yZXNldCgpO1xuICAgIH1cbiAgICBjb25zdCBjYWNoZSA9IHRoaXMuX29iamVjdF9zdG9yZVtcIm1lc3NhZ2VfY2FjaGVcIl07XG4gICAgaWYgKCFjYWNoZVtrZXldKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1lc3NhZ2Ugd2l0aCBrZXkgJHtrZXl9IGRvZXMgbm90IGV4aXN0cy5gKTtcbiAgICB9XG4gICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KShkYXRhIGluc3RhbmNlb2YgQXJyYXlCdWZmZXJWaWV3KTtcbiAgICBjYWNoZVtrZXldW2luZGV4XSA9IGRhdGE7XG4gIH1cblxuICBfcmVtb3ZlX21lc3NhZ2Uoa2V5LCBjb250ZXh0KSB7XG4gICAgY29uc3QgY2FjaGUgPSB0aGlzLl9vYmplY3Rfc3RvcmVbXCJtZXNzYWdlX2NhY2hlXCJdO1xuICAgIGlmICghY2FjaGVba2V5XSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNZXNzYWdlIHdpdGgga2V5ICR7a2V5fSBkb2VzIG5vdCBleGlzdHMuYCk7XG4gICAgfVxuICAgIGRlbGV0ZSBjYWNoZVtrZXldO1xuICB9XG5cbiAgX3Byb2Nlc3NfbWVzc2FnZShrZXksIGhlYXJ0YmVhdCwgY29udGV4dCkge1xuICAgIGlmIChoZWFydGJlYXQpIHtcbiAgICAgIGlmICghdGhpcy5fb2JqZWN0X3N0b3JlW2tleV0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBzZXNzaW9uIGRvZXMgbm90IGV4aXN0IGFueW1vcmU6ICR7a2V5fWApO1xuICAgICAgfVxuICAgICAgdGhpcy5fb2JqZWN0X3N0b3JlW2tleV1bXCJ0aW1lclwiXS5yZXNldCgpO1xuICAgIH1cbiAgICBjb25zdCBjYWNoZSA9IHRoaXMuX29iamVjdF9zdG9yZVtcIm1lc3NhZ2VfY2FjaGVcIl07XG4gICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KSghIWNvbnRleHQsIFwiQ29udGV4dCBpcyByZXF1aXJlZFwiKTtcbiAgICBpZiAoIWNhY2hlW2tleV0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTWVzc2FnZSB3aXRoIGtleSAke2tleX0gZG9lcyBub3QgZXhpc3RzLmApO1xuICAgIH1cbiAgICBjYWNoZVtrZXldID0gY29uY2F0QXJyYXlCdWZmZXJzKGNhY2hlW2tleV0pO1xuICAgIC8vIGNvbnNvbGUuZGVidWcoYFByb2Nlc3NpbmcgbWVzc2FnZSAke2tleX0gKGJ5dGVzPSR7Y2FjaGVba2V5XS5ieXRlTGVuZ3RofSlgKTtcbiAgICBsZXQgdW5wYWNrZXIgPSAoMCxfbXNncGFja19tc2dwYWNrX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18uZGVjb2RlTXVsdGkpKGNhY2hlW2tleV0pO1xuICAgIGNvbnN0IHsgZG9uZSwgdmFsdWUgfSA9IHVucGFja2VyLm5leHQoKTtcbiAgICBjb25zdCBtYWluID0gdmFsdWU7XG4gICAgLy8gTWFrZSBzdXJlIHRoZSBmaWVsZHMgYXJlIGZyb20gdHJ1c3RlZCBzb3VyY2VcbiAgICBPYmplY3QuYXNzaWduKG1haW4sIHtcbiAgICAgIGZyb206IGNvbnRleHQuZnJvbSxcbiAgICAgIHRvOiBjb250ZXh0LnRvLFxuICAgICAgd3M6IGNvbnRleHQud3MsXG4gICAgICB1c2VyOiBjb250ZXh0LnVzZXIsXG4gICAgfSk7XG4gICAgbWFpbltcImN0eFwiXSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkobWFpbikpO1xuICAgIE9iamVjdC5hc3NpZ24obWFpbltcImN0eFwiXSwgdGhpcy5kZWZhdWx0X2NvbnRleHQpO1xuICAgIGlmICghZG9uZSkge1xuICAgICAgbGV0IGV4dHJhID0gdW5wYWNrZXIubmV4dCgpO1xuICAgICAgT2JqZWN0LmFzc2lnbihtYWluLCBleHRyYS52YWx1ZSk7XG4gICAgfVxuICAgIHRoaXMuX2ZpcmUobWFpbltcInR5cGVcIl0sIG1haW4pO1xuICAgIC8vIGNvbnNvbGUuZGVidWcoXG4gICAgLy8gICB0aGlzLl9jbGllbnRfaWQsXG4gICAgLy8gICBgUHJvY2Vzc2VkIG1lc3NhZ2UgJHtrZXl9IChieXRlcz0ke2NhY2hlW2tleV0uYnl0ZUxlbmd0aH0pYCxcbiAgICAvLyApO1xuICAgIGRlbGV0ZSBjYWNoZVtrZXldO1xuICB9XG5cbiAgX29uX21lc3NhZ2UobWVzc2FnZSkge1xuICAgIGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgY29uc3QgbWFpbiA9IEpTT04ucGFyc2UobWVzc2FnZSk7XG4gICAgICB0aGlzLl9maXJlKG1haW5bXCJ0eXBlXCJdLCBtYWluKTtcbiAgICB9IGVsc2UgaWYgKG1lc3NhZ2UgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgICAgbGV0IHVucGFja2VyID0gKDAsX21zZ3BhY2tfbXNncGFja19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLmRlY29kZU11bHRpKShtZXNzYWdlKTtcbiAgICAgIGNvbnN0IHsgZG9uZSwgdmFsdWUgfSA9IHVucGFja2VyLm5leHQoKTtcbiAgICAgIGNvbnN0IG1haW4gPSB2YWx1ZTtcbiAgICAgIC8vIEFkZCB0cnVzdGVkIGNvbnRleHQgdG8gdGhlIG1ldGhvZCBjYWxsXG4gICAgICBtYWluW1wiY3R4XCJdID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShtYWluKSk7XG4gICAgICBPYmplY3QuYXNzaWduKG1haW5bXCJjdHhcIl0sIHRoaXMuZGVmYXVsdF9jb250ZXh0KTtcbiAgICAgIGlmICghZG9uZSkge1xuICAgICAgICBsZXQgZXh0cmEgPSB1bnBhY2tlci5uZXh0KCk7XG4gICAgICAgIE9iamVjdC5hc3NpZ24obWFpbiwgZXh0cmEudmFsdWUpO1xuICAgICAgfVxuICAgICAgdGhpcy5fZmlyZShtYWluW1widHlwZVwiXSwgbWFpbik7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgbWVzc2FnZSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgdGhpcy5fZmlyZShtZXNzYWdlW1widHlwZVwiXSwgbWVzc2FnZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgbWVzc2FnZSBmb3JtYXRcIik7XG4gICAgfVxuICB9XG5cbiAgcmVzZXQoKSB7XG4gICAgdGhpcy5fZXZlbnRfaGFuZGxlcnMgPSB7fTtcbiAgICB0aGlzLl9zZXJ2aWNlcyA9IHt9O1xuICB9XG5cbiAgYXN5bmMgZGlzY29ubmVjdCgpIHtcbiAgICB0aGlzLl9maXJlKFwiZGlzY29ubmVjdGVkXCIpO1xuICAgIGF3YWl0IHRoaXMuX2Nvbm5lY3Rpb24uZGlzY29ubmVjdCgpO1xuICB9XG5cbiAgYXN5bmMgZ2V0X21hbmFnZXJfc2VydmljZShjb25maWcpIHtcbiAgICBjb25maWcgPSBjb25maWcgfHwge307XG5cbiAgICAvLyBBZGQgcmV0cnkgbG9naWNcbiAgICBjb25zdCBtYXhSZXRyaWVzID0gMjA7XG4gICAgY29uc3QgcmV0cnlEZWxheSA9IDUwMDsgLy8gNTAwbXNcblxuICAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDwgbWF4UmV0cmllczsgYXR0ZW1wdCsrKSB7XG4gICAgICBpZiAoIXRoaXMuX2Nvbm5lY3Rpb24ubWFuYWdlcl9pZCkge1xuICAgICAgICBpZiAoYXR0ZW1wdCA8IG1heFJldHJpZXMgLSAxKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgYE1hbmFnZXIgSUQgbm90IHNldCwgcmV0cnlpbmcgaW4gJHtyZXRyeURlbGF5fW1zIChhdHRlbXB0ICR7YXR0ZW1wdCArIDF9LyR7bWF4UmV0cmllc30pYCxcbiAgICAgICAgICApO1xuICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIHJldHJ5RGVsYXkpKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNYW5hZ2VyIElEIG5vdCBzZXQgYWZ0ZXIgbWF4aW11bSByZXRyaWVzXCIpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHN2YyA9IGF3YWl0IHRoaXMuZ2V0X3JlbW90ZV9zZXJ2aWNlKFxuICAgICAgICAgIGAqLyR7dGhpcy5fY29ubmVjdGlvbi5tYW5hZ2VyX2lkfTpkZWZhdWx0YCxcbiAgICAgICAgICBjb25maWcsXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiBzdmM7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGlmIChhdHRlbXB0IDwgbWF4UmV0cmllcyAtIDEpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgICBgRmFpbGVkIHRvIGdldCBtYW5hZ2VyIHNlcnZpY2UsIHJldHJ5aW5nIGluICR7cmV0cnlEZWxheX1tczogJHtlLm1lc3NhZ2V9YCxcbiAgICAgICAgICApO1xuICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIHJldHJ5RGVsYXkpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0X2FsbF9sb2NhbF9zZXJ2aWNlcygpIHtcbiAgICByZXR1cm4gdGhpcy5fc2VydmljZXM7XG4gIH1cbiAgZ2V0X2xvY2FsX3NlcnZpY2Uoc2VydmljZV9pZCwgY29udGV4dCkge1xuICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLmFzc2VydCkoc2VydmljZV9pZCk7XG4gICAgY29uc3QgW3dzLCBjbGllbnRfaWRdID0gY29udGV4dFtcInRvXCJdLnNwbGl0KFwiL1wiKTtcbiAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKFxuICAgICAgY2xpZW50X2lkID09PSB0aGlzLl9jbGllbnRfaWQsXG4gICAgICBcIlNlcnZpY2VzIGNhbiBvbmx5IGJlIGFjY2Vzc2VkIGxvY2FsbHlcIixcbiAgICApO1xuXG4gICAgY29uc3Qgc2VydmljZSA9IHRoaXMuX3NlcnZpY2VzW3NlcnZpY2VfaWRdO1xuICAgIGlmICghc2VydmljZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2VydmljZSBub3QgZm91bmQ6IFwiICsgc2VydmljZV9pZCk7XG4gICAgfVxuXG4gICAgc2VydmljZS5jb25maWdbXCJ3b3Jrc3BhY2VcIl0gPSBjb250ZXh0W1wid3NcIl07XG4gICAgLy8gYWxsb3cgYWNjZXNzIGZvciB0aGUgc2FtZSB3b3Jrc3BhY2VcbiAgICBpZiAoc2VydmljZS5jb25maWcudmlzaWJpbGl0eSA9PSBcInB1YmxpY1wiKSB7XG4gICAgICByZXR1cm4gc2VydmljZTtcbiAgICB9XG5cbiAgICAvLyBhbGxvdyBhY2Nlc3MgZm9yIHRoZSBzYW1lIHdvcmtzcGFjZVxuICAgIGlmIChjb250ZXh0W1wid3NcIl0gPT09IHdzKSB7XG4gICAgICByZXR1cm4gc2VydmljZTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgUGVybWlzc2lvbiBkZW5pZWQgZm9yIGdldHRpbmcgcHJvdGVjdGVkIHNlcnZpY2U6ICR7c2VydmljZV9pZH0sIHdvcmtzcGFjZSBtaXNtYXRjaDogJHt3c30gIT0gJHtjb250ZXh0W1wid3NcIl19YCxcbiAgICApO1xuICB9XG4gIGFzeW5jIGdldF9yZW1vdGVfc2VydmljZShzZXJ2aWNlX3VyaSwgY29uZmlnKSB7XG4gICAgbGV0IHsgdGltZW91dCwgY2FzZV9jb252ZXJzaW9uLCBrd2FyZ3NfZXhwYW5zaW9uIH0gPSBjb25maWcgfHwge307XG4gICAgdGltZW91dCA9IHRpbWVvdXQgPT09IHVuZGVmaW5lZCA/IHRoaXMuX21ldGhvZF90aW1lb3V0IDogdGltZW91dDtcbiAgICBpZiAoIXNlcnZpY2VfdXJpICYmIHRoaXMuX2Nvbm5lY3Rpb24ubWFuYWdlcl9pZCkge1xuICAgICAgc2VydmljZV91cmkgPSBcIiovXCIgKyB0aGlzLl9jb25uZWN0aW9uLm1hbmFnZXJfaWQ7XG4gICAgfSBlbHNlIGlmICghc2VydmljZV91cmkuaW5jbHVkZXMoXCI6XCIpKSB7XG4gICAgICBzZXJ2aWNlX3VyaSA9IHRoaXMuX2NsaWVudF9pZCArIFwiOlwiICsgc2VydmljZV91cmk7XG4gICAgfVxuICAgIGNvbnN0IHByb3ZpZGVyID0gc2VydmljZV91cmkuc3BsaXQoXCI6XCIpWzBdO1xuICAgIGxldCBzZXJ2aWNlX2lkID0gc2VydmljZV91cmkuc3BsaXQoXCI6XCIpWzFdO1xuICAgIGlmIChzZXJ2aWNlX2lkLmluY2x1ZGVzKFwiQFwiKSkge1xuICAgICAgc2VydmljZV9pZCA9IHNlcnZpY2VfaWQuc3BsaXQoXCJAXCIpWzBdO1xuICAgICAgY29uc3QgYXBwX2lkID0gc2VydmljZV91cmkuc3BsaXQoXCJAXCIpWzFdO1xuICAgICAgaWYgKHRoaXMuX2FwcF9pZCAmJiB0aGlzLl9hcHBfaWQgIT09IFwiKlwiKVxuICAgICAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKFxuICAgICAgICAgIGFwcF9pZCA9PT0gdGhpcy5fYXBwX2lkLFxuICAgICAgICAgIGBJbnZhbGlkIGFwcCBpZDogJHthcHBfaWR9ICE9ICR7dGhpcy5fYXBwX2lkfWAsXG4gICAgICAgICk7XG4gICAgfVxuICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLmFzc2VydCkocHJvdmlkZXIsIGBJbnZhbGlkIHNlcnZpY2UgdXJpOiAke3NlcnZpY2VfdXJpfWApO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1ldGhvZCA9IHRoaXMuX2dlbmVyYXRlX3JlbW90ZV9tZXRob2Qoe1xuICAgICAgICBfcnNlcnZlcjogdGhpcy5fc2VydmVyX2Jhc2VfdXJsLFxuICAgICAgICBfcnRhcmdldDogcHJvdmlkZXIsXG4gICAgICAgIF9ybWV0aG9kOiBcInNlcnZpY2VzLmJ1aWx0LWluLmdldF9zZXJ2aWNlXCIsXG4gICAgICAgIF9ycHJvbWlzZTogdHJ1ZSxcbiAgICAgICAgX3Jkb2M6IFwiR2V0IGEgcmVtb3RlIHNlcnZpY2VcIixcbiAgICAgIH0pO1xuICAgICAgbGV0IHN2YyA9IGF3YWl0ICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLndhaXRGb3IpKFxuICAgICAgICBtZXRob2Qoc2VydmljZV9pZCksXG4gICAgICAgIHRpbWVvdXQsXG4gICAgICAgIFwiVGltZW91dCBFcnJvcjogRmFpbGVkIHRvIGdldCByZW1vdGUgc2VydmljZTogXCIgKyBzZXJ2aWNlX3VyaSxcbiAgICAgICk7XG4gICAgICBzdmMuaWQgPSBgJHtwcm92aWRlcn06JHtzZXJ2aWNlX2lkfWA7XG4gICAgICBpZiAoa3dhcmdzX2V4cGFuc2lvbikge1xuICAgICAgICBzdmMgPSAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5leHBhbmRLd2FyZ3MpKHN2Yyk7XG4gICAgICB9XG4gICAgICBpZiAoY2FzZV9jb252ZXJzaW9uKVxuICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihcbiAgICAgICAgICBuZXcgUmVtb3RlU2VydmljZSgpLFxuICAgICAgICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLmNvbnZlcnRDYXNlKShzdmMsIGNhc2VfY29udmVyc2lvbiksXG4gICAgICAgICk7XG4gICAgICBlbHNlIHJldHVybiBPYmplY3QuYXNzaWduKG5ldyBSZW1vdGVTZXJ2aWNlKCksIHN2Yyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS53YXJuKFwiRmFpbGVkIHRvIGdldCByZW1vdGUgc2VydmljZTogXCIgKyBzZXJ2aWNlX3VyaSwgZSk7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuICBfYW5ub3RhdGVfc2VydmljZV9tZXRob2RzKFxuICAgIGFPYmplY3QsXG4gICAgb2JqZWN0X2lkLFxuICAgIHJlcXVpcmVfY29udGV4dCxcbiAgICBydW5faW5fZXhlY3V0b3IsXG4gICAgdmlzaWJpbGl0eSxcbiAgKSB7XG4gICAgaWYgKHR5cGVvZiBhT2JqZWN0ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIC8vIG1hcmsgdGhlIG1ldGhvZCBhcyBhIHJlbW90ZSBtZXRob2QgdGhhdCByZXF1aXJlcyBjb250ZXh0XG4gICAgICBsZXQgbWV0aG9kX25hbWUgPSBvYmplY3RfaWQuc3BsaXQoXCIuXCIpWzFdO1xuICAgICAgdGhpcy5fbWV0aG9kX2Fubm90YXRpb25zLnNldChhT2JqZWN0LCB7XG4gICAgICAgIHJlcXVpcmVfY29udGV4dDogQXJyYXkuaXNBcnJheShyZXF1aXJlX2NvbnRleHQpXG4gICAgICAgICAgPyByZXF1aXJlX2NvbnRleHQuaW5jbHVkZXMobWV0aG9kX25hbWUpXG4gICAgICAgICAgOiAhIXJlcXVpcmVfY29udGV4dCxcbiAgICAgICAgcnVuX2luX2V4ZWN1dG9yOiBydW5faW5fZXhlY3V0b3IsXG4gICAgICAgIG1ldGhvZF9pZDogXCJzZXJ2aWNlcy5cIiArIG9iamVjdF9pZCxcbiAgICAgICAgdmlzaWJpbGl0eTogdmlzaWJpbGl0eSxcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoYU9iamVjdCBpbnN0YW5jZW9mIEFycmF5IHx8IGFPYmplY3QgaW5zdGFuY2VvZiBPYmplY3QpIHtcbiAgICAgIGZvciAobGV0IGtleSBvZiBPYmplY3Qua2V5cyhhT2JqZWN0KSkge1xuICAgICAgICBsZXQgdmFsID0gYU9iamVjdFtrZXldO1xuICAgICAgICBpZiAodHlwZW9mIHZhbCA9PT0gXCJmdW5jdGlvblwiICYmIHZhbC5fX3JwY19vYmplY3RfXykge1xuICAgICAgICAgIGxldCBjbGllbnRfaWQgPSB2YWwuX19ycGNfb2JqZWN0X18uX3J0YXJnZXQ7XG4gICAgICAgICAgaWYgKGNsaWVudF9pZC5pbmNsdWRlcyhcIi9cIikpIHtcbiAgICAgICAgICAgIGNsaWVudF9pZCA9IGNsaWVudF9pZC5zcGxpdChcIi9cIilbMV07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0aGlzLl9jbGllbnRfaWQgPT09IGNsaWVudF9pZCkge1xuICAgICAgICAgICAgaWYgKGFPYmplY3QgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICBhT2JqZWN0ID0gYU9iamVjdC5zbGljZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gcmVjb3ZlciBsb2NhbCBtZXRob2RcbiAgICAgICAgICAgIGFPYmplY3Rba2V5XSA9IGluZGV4T2JqZWN0KFxuICAgICAgICAgICAgICB0aGlzLl9vYmplY3Rfc3RvcmUsXG4gICAgICAgICAgICAgIHZhbC5fX3JwY19vYmplY3RfXy5fcm1ldGhvZCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB2YWwgPSBhT2JqZWN0W2tleV07IC8vIG1ha2Ugc3VyZSBpdCdzIGFubm90YXRlZCBsYXRlclxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgIGBMb2NhbCBtZXRob2Qgbm90IGZvdW5kOiAke3ZhbC5fX3JwY19vYmplY3RfXy5fcm1ldGhvZH0sIGNsaWVudCBpZCBtaXNtYXRjaCAke3RoaXMuX2NsaWVudF9pZH0gIT0gJHtjbGllbnRfaWR9YCxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2Fubm90YXRlX3NlcnZpY2VfbWV0aG9kcyhcbiAgICAgICAgICB2YWwsXG4gICAgICAgICAgb2JqZWN0X2lkICsgXCIuXCIgKyBrZXksXG4gICAgICAgICAgcmVxdWlyZV9jb250ZXh0LFxuICAgICAgICAgIHJ1bl9pbl9leGVjdXRvcixcbiAgICAgICAgICB2aXNpYmlsaXR5LFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBhZGRfc2VydmljZShhcGksIG92ZXJ3cml0ZSkge1xuICAgIGlmICghYXBpIHx8IEFycmF5LmlzQXJyYXkoYXBpKSkgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBzZXJ2aWNlIG9iamVjdFwiKTtcbiAgICBpZiAoYXBpLmNvbnN0cnVjdG9yID09PSBPYmplY3QpIHtcbiAgICAgIGFwaSA9IE9iamVjdC5hc3NpZ24oe30sIGFwaSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IG5vcm1BcGkgPSB7fTtcbiAgICAgIGNvbnN0IHByb3BzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoYXBpKS5jb25jYXQoXG4gICAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKE9iamVjdC5nZXRQcm90b3R5cGVPZihhcGkpKSxcbiAgICAgICk7XG4gICAgICBmb3IgKGxldCBrIG9mIHByb3BzKSB7XG4gICAgICAgIGlmIChrICE9PSBcImNvbnN0cnVjdG9yXCIpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGFwaVtrXSA9PT0gXCJmdW5jdGlvblwiKSBub3JtQXBpW2tdID0gYXBpW2tdLmJpbmQoYXBpKTtcbiAgICAgICAgICBlbHNlIG5vcm1BcGlba10gPSBhcGlba107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIEZvciBjbGFzcyBpbnN0YW5jZSwgd2UgbmVlZCBzZXQgYSBkZWZhdWx0IGlkXG4gICAgICBhcGkuaWQgPSBhcGkuaWQgfHwgXCJkZWZhdWx0XCI7XG4gICAgICBhcGkgPSBub3JtQXBpO1xuICAgIH1cbiAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKFxuICAgICAgYXBpLmlkICYmIHR5cGVvZiBhcGkuaWQgPT09IFwic3RyaW5nXCIsXG4gICAgICBgU2VydmljZSBpZCBub3QgZm91bmQ6ICR7YXBpfWAsXG4gICAgKTtcbiAgICBpZiAoIWFwaS5uYW1lKSB7XG4gICAgICBhcGkubmFtZSA9IGFwaS5pZDtcbiAgICB9XG4gICAgaWYgKCFhcGkuY29uZmlnKSB7XG4gICAgICBhcGkuY29uZmlnID0ge307XG4gICAgfVxuICAgIGlmICghYXBpLnR5cGUpIHtcbiAgICAgIGFwaS50eXBlID0gXCJnZW5lcmljXCI7XG4gICAgfVxuICAgIC8vIHJlcXVpcmVfY29udGV4dCBvbmx5IGFwcGxpZXMgdG8gdGhlIHRvcC1sZXZlbCBmdW5jdGlvbnNcbiAgICBsZXQgcmVxdWlyZV9jb250ZXh0ID0gZmFsc2UsXG4gICAgICBydW5faW5fZXhlY3V0b3IgPSBmYWxzZTtcbiAgICBpZiAoYXBpLmNvbmZpZy5yZXF1aXJlX2NvbnRleHQpXG4gICAgICByZXF1aXJlX2NvbnRleHQgPSBhcGkuY29uZmlnLnJlcXVpcmVfY29udGV4dDtcbiAgICBpZiAoYXBpLmNvbmZpZy5ydW5faW5fZXhlY3V0b3IpIHJ1bl9pbl9leGVjdXRvciA9IHRydWU7XG4gICAgY29uc3QgdmlzaWJpbGl0eSA9IGFwaS5jb25maWcudmlzaWJpbGl0eSB8fCBcInByb3RlY3RlZFwiO1xuICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLmFzc2VydCkoW1wicHJvdGVjdGVkXCIsIFwicHVibGljXCJdLmluY2x1ZGVzKHZpc2liaWxpdHkpKTtcbiAgICB0aGlzLl9hbm5vdGF0ZV9zZXJ2aWNlX21ldGhvZHMoXG4gICAgICBhcGksXG4gICAgICBhcGlbXCJpZFwiXSxcbiAgICAgIHJlcXVpcmVfY29udGV4dCxcbiAgICAgIHJ1bl9pbl9leGVjdXRvcixcbiAgICAgIHZpc2liaWxpdHksXG4gICAgKTtcblxuICAgIGlmICh0aGlzLl9zZXJ2aWNlc1thcGkuaWRdKSB7XG4gICAgICBpZiAob3ZlcndyaXRlKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9zZXJ2aWNlc1thcGkuaWRdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBTZXJ2aWNlIGFscmVhZHkgZXhpc3RzOiAke2FwaS5pZH0sIHBsZWFzZSBzcGVjaWZ5IGEgZGlmZmVyZW50IGlkIChub3QgJHthcGkuaWR9KSBvciBvdmVyd3JpdGU9dHJ1ZWAsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuX3NlcnZpY2VzW2FwaS5pZF0gPSBhcGk7XG4gICAgcmV0dXJuIGFwaTtcbiAgfVxuXG4gIF9leHRyYWN0X3NlcnZpY2VfaW5mbyhzZXJ2aWNlKSB7XG4gICAgY29uc3QgY29uZmlnID0gc2VydmljZS5jb25maWcgfHwge307XG4gICAgY29uZmlnLndvcmtzcGFjZSA9XG4gICAgICBjb25maWcud29ya3NwYWNlIHx8IHRoaXMuX2xvY2FsX3dvcmtzcGFjZSB8fCB0aGlzLl9jb25uZWN0aW9uLndvcmtzcGFjZTtcbiAgICBjb25zdCBza2lwQ29udGV4dCA9IGNvbmZpZy5yZXF1aXJlX2NvbnRleHQ7XG4gICAgY29uc3Qgc2VydmljZVNjaGVtYSA9IF9nZXRfc2NoZW1hKHNlcnZpY2UsIG51bGwsIHNraXBDb250ZXh0KTtcbiAgICBjb25zdCBzZXJ2aWNlSW5mbyA9IHtcbiAgICAgIGNvbmZpZzogY29uZmlnLFxuICAgICAgaWQ6IGAke2NvbmZpZy53b3Jrc3BhY2V9LyR7dGhpcy5fY2xpZW50X2lkfToke3NlcnZpY2VbXCJpZFwiXX1gLFxuICAgICAgbmFtZTogc2VydmljZS5uYW1lIHx8IHNlcnZpY2VbXCJpZFwiXSxcbiAgICAgIGRlc2NyaXB0aW9uOiBzZXJ2aWNlLmRlc2NyaXB0aW9uIHx8IFwiXCIsXG4gICAgICB0eXBlOiBzZXJ2aWNlLnR5cGUgfHwgXCJnZW5lcmljXCIsXG4gICAgICBkb2NzOiBzZXJ2aWNlLmRvY3MgfHwgbnVsbCxcbiAgICAgIGFwcF9pZDogdGhpcy5fYXBwX2lkLFxuICAgICAgc2VydmljZV9zY2hlbWE6IHNlcnZpY2VTY2hlbWEsXG4gICAgfTtcbiAgICByZXR1cm4gc2VydmljZUluZm87XG4gIH1cblxuICBhc3luYyBnZXRfc2VydmljZV9zY2hlbWEoc2VydmljZSkge1xuICAgIGNvbnN0IHNraXBDb250ZXh0ID0gc2VydmljZS5jb25maWcucmVxdWlyZV9jb250ZXh0O1xuICAgIHJldHVybiBfZ2V0X3NjaGVtYShzZXJ2aWNlLCBudWxsLCBza2lwQ29udGV4dCk7XG4gIH1cblxuICBhc3luYyByZWdpc3Rlcl9zZXJ2aWNlKGFwaSwgY29uZmlnKSB7XG4gICAgbGV0IHsgY2hlY2tfdHlwZSwgbm90aWZ5LCBvdmVyd3JpdGUgfSA9IGNvbmZpZyB8fCB7fTtcbiAgICBub3RpZnkgPSBub3RpZnkgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBub3RpZnk7XG4gICAgbGV0IG1hbmFnZXI7XG4gICAgaWYgKGNoZWNrX3R5cGUgJiYgYXBpLnR5cGUpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG1hbmFnZXIgPSBhd2FpdCB0aGlzLmdldF9tYW5hZ2VyX3NlcnZpY2Uoe1xuICAgICAgICAgIHRpbWVvdXQ6IDEwLFxuICAgICAgICAgIGNhc2VfY29udmVyc2lvbjogXCJjYW1lbFwiLFxuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgdHlwZV9pbmZvID0gYXdhaXQgbWFuYWdlci5nZXRfc2VydmljZV90eXBlKGFwaS50eXBlKTtcbiAgICAgICAgYXBpID0gX2Fubm90YXRlX3NlcnZpY2UoYXBpLCB0eXBlX2luZm8pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBnZXQgc2VydmljZSB0eXBlICR7YXBpLnR5cGV9LCBlcnJvcjogJHtlfWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHNlcnZpY2UgPSB0aGlzLmFkZF9zZXJ2aWNlKGFwaSwgb3ZlcndyaXRlKTtcbiAgICBjb25zdCBzZXJ2aWNlSW5mbyA9IHRoaXMuX2V4dHJhY3Rfc2VydmljZV9pbmZvKHNlcnZpY2UpO1xuICAgIGlmIChub3RpZnkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIG1hbmFnZXIgPVxuICAgICAgICAgIG1hbmFnZXIgfHxcbiAgICAgICAgICAoYXdhaXQgdGhpcy5nZXRfbWFuYWdlcl9zZXJ2aWNlKHtcbiAgICAgICAgICAgIHRpbWVvdXQ6IDEwLFxuICAgICAgICAgICAgY2FzZV9jb252ZXJzaW9uOiBcImNhbWVsXCIsXG4gICAgICAgICAgfSkpO1xuICAgICAgICBhd2FpdCBtYW5hZ2VyLnJlZ2lzdGVyU2VydmljZShzZXJ2aWNlSW5mbyk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIG5vdGlmeSB3b3Jrc3BhY2UgbWFuYWdlcjogJHtlfWApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc2VydmljZUluZm87XG4gIH1cblxuICBhc3luYyB1bnJlZ2lzdGVyX3NlcnZpY2Uoc2VydmljZSwgbm90aWZ5KSB7XG4gICAgbm90aWZ5ID0gbm90aWZ5ID09PSB1bmRlZmluZWQgPyB0cnVlIDogbm90aWZ5O1xuICAgIGxldCBzZXJ2aWNlX2lkO1xuICAgIGlmICh0eXBlb2Ygc2VydmljZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgc2VydmljZV9pZCA9IHNlcnZpY2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlcnZpY2VfaWQgPSBzZXJ2aWNlLmlkO1xuICAgIH1cbiAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKFxuICAgICAgc2VydmljZV9pZCAmJiB0eXBlb2Ygc2VydmljZV9pZCA9PT0gXCJzdHJpbmdcIixcbiAgICAgIGBJbnZhbGlkIHNlcnZpY2UgaWQ6ICR7c2VydmljZV9pZH1gLFxuICAgICk7XG4gICAgaWYgKHNlcnZpY2VfaWQuaW5jbHVkZXMoXCI6XCIpKSB7XG4gICAgICBzZXJ2aWNlX2lkID0gc2VydmljZV9pZC5zcGxpdChcIjpcIilbMV07XG4gICAgfVxuICAgIGlmIChzZXJ2aWNlX2lkLmluY2x1ZGVzKFwiQFwiKSkge1xuICAgICAgc2VydmljZV9pZCA9IHNlcnZpY2VfaWQuc3BsaXQoXCJAXCIpWzBdO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuX3NlcnZpY2VzW3NlcnZpY2VfaWRdKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFNlcnZpY2Ugbm90IGZvdW5kOiAke3NlcnZpY2VfaWR9YCk7XG4gICAgfVxuICAgIGlmIChub3RpZnkpIHtcbiAgICAgIGNvbnN0IG1hbmFnZXIgPSBhd2FpdCB0aGlzLmdldF9tYW5hZ2VyX3NlcnZpY2Uoe1xuICAgICAgICB0aW1lb3V0OiAxMCxcbiAgICAgICAgY2FzZV9jb252ZXJzaW9uOiBcImNhbWVsXCIsXG4gICAgICB9KTtcbiAgICAgIGF3YWl0IG1hbmFnZXIudW5yZWdpc3RlclNlcnZpY2Uoc2VydmljZV9pZCk7XG4gICAgfVxuICAgIGRlbGV0ZSB0aGlzLl9zZXJ2aWNlc1tzZXJ2aWNlX2lkXTtcbiAgfVxuXG4gIF9uZGFycmF5KHR5cGVkQXJyYXksIHNoYXBlLCBkdHlwZSkge1xuICAgIGNvbnN0IF9kdHlwZSA9ICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLnR5cGVkQXJyYXlUb0R0eXBlKSh0eXBlZEFycmF5KTtcbiAgICBpZiAoZHR5cGUgJiYgZHR5cGUgIT09IF9kdHlwZSkge1xuICAgICAgdGhyb3cgKFxuICAgICAgICBcImR0eXBlIGRvZXNuJ3QgbWF0Y2ggdGhlIHR5cGUgb2YgdGhlIGFycmF5OiBcIiArIF9kdHlwZSArIFwiICE9IFwiICsgZHR5cGVcbiAgICAgICk7XG4gICAgfVxuICAgIHNoYXBlID0gc2hhcGUgfHwgW3R5cGVkQXJyYXkubGVuZ3RoXTtcbiAgICByZXR1cm4ge1xuICAgICAgX3J0eXBlOiBcIm5kYXJyYXlcIixcbiAgICAgIF9ydmFsdWU6IHR5cGVkQXJyYXkuYnVmZmVyLFxuICAgICAgX3JzaGFwZTogc2hhcGUsXG4gICAgICBfcmR0eXBlOiBfZHR5cGUsXG4gICAgfTtcbiAgfVxuXG4gIF9lbmNvZGVfY2FsbGJhY2soXG4gICAgbmFtZSxcbiAgICBjYWxsYmFjayxcbiAgICBzZXNzaW9uX2lkLFxuICAgIGNsZWFyX2FmdGVyX2NhbGxlZCxcbiAgICB0aW1lcixcbiAgICBsb2NhbF93b3Jrc3BhY2UsXG4gICAgZGVzY3JpcHRpb24sXG4gICkge1xuICAgIGxldCBtZXRob2RfaWQgPSBgJHtzZXNzaW9uX2lkfS4ke25hbWV9YDtcbiAgICBsZXQgZW5jb2RlZCA9IHtcbiAgICAgIF9ydHlwZTogXCJtZXRob2RcIixcbiAgICAgIF9ydGFyZ2V0OiBsb2NhbF93b3Jrc3BhY2VcbiAgICAgICAgPyBgJHtsb2NhbF93b3Jrc3BhY2V9LyR7dGhpcy5fY2xpZW50X2lkfWBcbiAgICAgICAgOiB0aGlzLl9jbGllbnRfaWQsXG4gICAgICBfcm1ldGhvZDogbWV0aG9kX2lkLFxuICAgICAgX3Jwcm9taXNlOiBmYWxzZSxcbiAgICB9O1xuXG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgbGV0IHdyYXBwZWRfY2FsbGJhY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjYWxsYmFjay5hcHBseShudWxsLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgYEVycm9yIGluIGNhbGxiYWNrKCR7bWV0aG9kX2lkfSwgJHtkZXNjcmlwdGlvbn0pOiAke2Vycm9yfWAsXG4gICAgICAgICk7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBpZiAodGltZXIgJiYgdGltZXIuc3RhcnRlZCkge1xuICAgICAgICAgIHRpbWVyLmNsZWFyKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNsZWFyX2FmdGVyX2NhbGxlZCAmJiBzZWxmLl9vYmplY3Rfc3RvcmVbc2Vzc2lvbl9pZF0pIHtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkRlbGV0aW5nIHNlc3Npb25cIiwgc2Vzc2lvbl9pZCwgXCJmcm9tXCIsIHNlbGYuX2NsaWVudF9pZCk7XG4gICAgICAgICAgZGVsZXRlIHNlbGYuX29iamVjdF9zdG9yZVtzZXNzaW9uX2lkXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgd3JhcHBlZF9jYWxsYmFjay5fX25hbWVfXyA9IGBjYWxsYmFjaygke21ldGhvZF9pZH0pYDtcbiAgICByZXR1cm4gW2VuY29kZWQsIHdyYXBwZWRfY2FsbGJhY2tdO1xuICB9XG5cbiAgYXN5bmMgX2VuY29kZV9wcm9taXNlKFxuICAgIHJlc29sdmUsXG4gICAgcmVqZWN0LFxuICAgIHNlc3Npb25faWQsXG4gICAgY2xlYXJfYWZ0ZXJfY2FsbGVkLFxuICAgIHRpbWVyLFxuICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgICBkZXNjcmlwdGlvbixcbiAgKSB7XG4gICAgbGV0IHN0b3JlID0gdGhpcy5fZ2V0X3Nlc3Npb25fc3RvcmUoc2Vzc2lvbl9pZCwgdHJ1ZSk7XG4gICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KShcbiAgICAgIHN0b3JlLFxuICAgICAgYEZhaWxlZCB0byBjcmVhdGUgc2Vzc2lvbiBzdG9yZSAke3Nlc3Npb25faWR9IGR1ZSB0byBpbnZhbGlkIHBhcmVudGAsXG4gICAgKTtcbiAgICBsZXQgZW5jb2RlZCA9IHt9O1xuXG4gICAgaWYgKHRpbWVyICYmIHJlamVjdCAmJiB0aGlzLl9tZXRob2RfdGltZW91dCkge1xuICAgICAgW2VuY29kZWQuaGVhcnRiZWF0LCBzdG9yZS5oZWFydGJlYXRdID0gdGhpcy5fZW5jb2RlX2NhbGxiYWNrKFxuICAgICAgICBcImhlYXJ0YmVhdFwiLFxuICAgICAgICB0aW1lci5yZXNldC5iaW5kKHRpbWVyKSxcbiAgICAgICAgc2Vzc2lvbl9pZCxcbiAgICAgICAgZmFsc2UsXG4gICAgICAgIG51bGwsXG4gICAgICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgICAgICAgLy8gYGhlYXJ0YmVhdCAoJHtkZXNjcmlwdGlvbn0pYCxcbiAgICAgICk7XG4gICAgICBzdG9yZS50aW1lciA9IHRpbWVyO1xuICAgICAgZW5jb2RlZC5pbnRlcnZhbCA9IHRoaXMuX21ldGhvZF90aW1lb3V0IC8gMjtcbiAgICB9IGVsc2Uge1xuICAgICAgdGltZXIgPSBudWxsO1xuICAgIH1cblxuICAgIFtlbmNvZGVkLnJlc29sdmUsIHN0b3JlLnJlc29sdmVdID0gdGhpcy5fZW5jb2RlX2NhbGxiYWNrKFxuICAgICAgXCJyZXNvbHZlXCIsXG4gICAgICByZXNvbHZlLFxuICAgICAgc2Vzc2lvbl9pZCxcbiAgICAgIGNsZWFyX2FmdGVyX2NhbGxlZCxcbiAgICAgIHRpbWVyLFxuICAgICAgbG9jYWxfd29ya3NwYWNlLFxuICAgICAgYHJlc29sdmUgKCR7ZGVzY3JpcHRpb259KWAsXG4gICAgKTtcbiAgICBbZW5jb2RlZC5yZWplY3QsIHN0b3JlLnJlamVjdF0gPSB0aGlzLl9lbmNvZGVfY2FsbGJhY2soXG4gICAgICBcInJlamVjdFwiLFxuICAgICAgcmVqZWN0LFxuICAgICAgc2Vzc2lvbl9pZCxcbiAgICAgIGNsZWFyX2FmdGVyX2NhbGxlZCxcbiAgICAgIHRpbWVyLFxuICAgICAgbG9jYWxfd29ya3NwYWNlLFxuICAgICAgYHJlamVjdCAoJHtkZXNjcmlwdGlvbn0pYCxcbiAgICApO1xuICAgIHJldHVybiBlbmNvZGVkO1xuICB9XG5cbiAgYXN5bmMgX3NlbmRfY2h1bmtzKGRhdGEsIHRhcmdldF9pZCwgc2Vzc2lvbl9pZCkge1xuICAgIC8vIDEpIEdldCB0aGUgcmVtb3RlIHNlcnZpY2VcbiAgICBjb25zdCByZW1vdGVfc2VydmljZXMgPSBhd2FpdCB0aGlzLmdldF9yZW1vdGVfc2VydmljZShcbiAgICAgIGAke3RhcmdldF9pZH06YnVpbHQtaW5gLFxuICAgICk7XG4gICAgaWYgKCFyZW1vdGVfc2VydmljZXMubWVzc2FnZV9jYWNoZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBcIlJlbW90ZSBjbGllbnQgZG9lcyBub3Qgc3VwcG9ydCBtZXNzYWdlIGNhY2hpbmcgZm9yIGxhcmdlIG1lc3NhZ2VzLlwiLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBjb25zdCBtZXNzYWdlX2NhY2hlID0gcmVtb3RlX3NlcnZpY2VzLm1lc3NhZ2VfY2FjaGU7XG4gICAgY29uc3QgbWVzc2FnZV9pZCA9IHNlc3Npb25faWQgfHwgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18ucmFuZElkKSgpO1xuICAgIGNvbnN0IHRvdGFsX3NpemUgPSBkYXRhLmxlbmd0aDtcbiAgICBjb25zdCBzdGFydF90aW1lID0gRGF0ZS5ub3coKTsgLy8gbWVhc3VyZSB0aW1lXG4gICAgY29uc3QgY2h1bmtfbnVtID0gTWF0aC5jZWlsKHRvdGFsX3NpemUgLyB0aGlzLl9sb25nX21lc3NhZ2VfY2h1bmtfc2l6ZSk7XG4gICAgaWYgKHJlbW90ZV9zZXJ2aWNlcy5jb25maWcuYXBpX3ZlcnNpb24gPj0gMykge1xuICAgICAgYXdhaXQgbWVzc2FnZV9jYWNoZS5jcmVhdGUobWVzc2FnZV9pZCwgISFzZXNzaW9uX2lkKTtcbiAgICAgIGNvbnN0IHNlbWFwaG9yZSA9IG5ldyBfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5TZW1hcGhvcmUoQ09OQ1VSUkVOQ1lfTElNSVQpO1xuXG4gICAgICBjb25zdCB0YXNrcyA9IFtdO1xuICAgICAgZm9yIChsZXQgaWR4ID0gMDsgaWR4IDwgY2h1bmtfbnVtOyBpZHgrKykge1xuICAgICAgICBjb25zdCBzdGFydEJ5dGUgPSBpZHggKiB0aGlzLl9sb25nX21lc3NhZ2VfY2h1bmtfc2l6ZTtcbiAgICAgICAgY29uc3QgY2h1bmsgPSBkYXRhLnNsaWNlKFxuICAgICAgICAgIHN0YXJ0Qnl0ZSxcbiAgICAgICAgICBzdGFydEJ5dGUgKyB0aGlzLl9sb25nX21lc3NhZ2VfY2h1bmtfc2l6ZSxcbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCB0YXNrRm4gPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgYXdhaXQgbWVzc2FnZV9jYWNoZS5zZXQobWVzc2FnZV9pZCwgaWR4LCBjaHVuaywgISFzZXNzaW9uX2lkKTtcbiAgICAgICAgICBjb25zb2xlLmRlYnVnKFxuICAgICAgICAgICAgYFNlbmRpbmcgY2h1bmsgJHtpZHggKyAxfS8ke2NodW5rX251bX0gKHRvdGFsPSR7dG90YWxfc2l6ZX0gYnl0ZXMpYCxcbiAgICAgICAgICApO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFB1c2ggaW50byBhbiBhcnJheSwgZWFjaCBvbmUgcnVucyB1bmRlciB0aGUgc2VtYXBob3JlXG4gICAgICAgIHRhc2tzLnB1c2goc2VtYXBob3JlLnJ1bih0YXNrRm4pKTtcbiAgICAgIH1cblxuICAgICAgLy8gV2FpdCBmb3IgYWxsIGNodW5rIHVwbG9hZHMgdG8gZmluaXNoXG4gICAgICBhd2FpdCBQcm9taXNlLmFsbCh0YXNrcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIDMpIExlZ2FjeSB2ZXJzaW9uIChzZXF1ZW50aWFsIGFwcGVuZHMpOlxuICAgICAgYXdhaXQgbWVzc2FnZV9jYWNoZS5jcmVhdGUobWVzc2FnZV9pZCwgISFzZXNzaW9uX2lkKTtcbiAgICAgIGZvciAobGV0IGlkeCA9IDA7IGlkeCA8IGNodW5rX251bTsgaWR4KyspIHtcbiAgICAgICAgY29uc3Qgc3RhcnRCeXRlID0gaWR4ICogdGhpcy5fbG9uZ19tZXNzYWdlX2NodW5rX3NpemU7XG4gICAgICAgIGNvbnN0IGNodW5rID0gZGF0YS5zbGljZShcbiAgICAgICAgICBzdGFydEJ5dGUsXG4gICAgICAgICAgc3RhcnRCeXRlICsgdGhpcy5fbG9uZ19tZXNzYWdlX2NodW5rX3NpemUsXG4gICAgICAgICk7XG4gICAgICAgIGF3YWl0IG1lc3NhZ2VfY2FjaGUuYXBwZW5kKG1lc3NhZ2VfaWQsIGNodW5rLCAhIXNlc3Npb25faWQpO1xuICAgICAgICBjb25zb2xlLmRlYnVnKFxuICAgICAgICAgIGBTZW5kaW5nIGNodW5rICR7aWR4ICsgMX0vJHtjaHVua19udW19ICh0b3RhbD0ke3RvdGFsX3NpemV9IGJ5dGVzKWAsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICAgIGF3YWl0IG1lc3NhZ2VfY2FjaGUucHJvY2VzcyhtZXNzYWdlX2lkLCAhIXNlc3Npb25faWQpO1xuICAgIGNvbnN0IGR1cmF0aW9uU2VjID0gKChEYXRlLm5vdygpIC0gc3RhcnRfdGltZSkgLyAxMDAwKS50b0ZpeGVkKDIpO1xuICAgIGNvbnNvbGUuZGVidWcoYEFsbCBjaHVua3MgKCR7dG90YWxfc2l6ZX0gYnl0ZXMpIHNlbnQgaW4gJHtkdXJhdGlvblNlY30gc2ApO1xuICB9XG5cbiAgZW1pdChtYWluX21lc3NhZ2UsIGV4dHJhX2RhdGEpIHtcbiAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKFxuICAgICAgdHlwZW9mIG1haW5fbWVzc2FnZSA9PT0gXCJvYmplY3RcIiAmJiBtYWluX21lc3NhZ2UudHlwZSxcbiAgICAgIFwiSW52YWxpZCBtZXNzYWdlLCBtdXN0IGJlIGFuIG9iamVjdCB3aXRoIGEgYHR5cGVgIGZpZWxkcy5cIixcbiAgICApO1xuICAgIGlmICghbWFpbl9tZXNzYWdlLnRvKSB7XG4gICAgICB0aGlzLl9maXJlKG1haW5fbWVzc2FnZS50eXBlLCBtYWluX21lc3NhZ2UpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsZXQgbWVzc2FnZV9wYWNrYWdlID0gKDAsX21zZ3BhY2tfbXNncGFja19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfM19fLmVuY29kZSkobWFpbl9tZXNzYWdlKTtcbiAgICBpZiAoZXh0cmFfZGF0YSkge1xuICAgICAgY29uc3QgZXh0cmEgPSAoMCxfbXNncGFja19tc2dwYWNrX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8zX18uZW5jb2RlKShleHRyYV9kYXRhKTtcbiAgICAgIG1lc3NhZ2VfcGFja2FnZSA9IG5ldyBVaW50OEFycmF5KFsuLi5tZXNzYWdlX3BhY2thZ2UsIC4uLmV4dHJhXSk7XG4gICAgfVxuICAgIGNvbnN0IHRvdGFsX3NpemUgPSBtZXNzYWdlX3BhY2thZ2UubGVuZ3RoO1xuICAgIGlmICh0b3RhbF9zaXplID4gdGhpcy5fbG9uZ19tZXNzYWdlX2NodW5rX3NpemUgKyAxMDI0KSB7XG4gICAgICBjb25zb2xlLndhcm4oYFNlbmRpbmcgbGFyZ2UgbWVzc2FnZSAoc2l6ZT0ke3RvdGFsX3NpemV9KWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZW1pdF9tZXNzYWdlKG1lc3NhZ2VfcGFja2FnZSk7XG4gIH1cblxuICBfZ2VuZXJhdGVfcmVtb3RlX21ldGhvZChcbiAgICBlbmNvZGVkX21ldGhvZCxcbiAgICByZW1vdGVfcGFyZW50LFxuICAgIGxvY2FsX3BhcmVudCxcbiAgICByZW1vdGVfd29ya3NwYWNlLFxuICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgKSB7XG4gICAgbGV0IHRhcmdldF9pZCA9IGVuY29kZWRfbWV0aG9kLl9ydGFyZ2V0O1xuICAgIGlmIChyZW1vdGVfd29ya3NwYWNlICYmICF0YXJnZXRfaWQuaW5jbHVkZXMoXCIvXCIpKSB7XG4gICAgICBpZiAocmVtb3RlX3dvcmtzcGFjZSAhPT0gdGFyZ2V0X2lkKSB7XG4gICAgICAgIHRhcmdldF9pZCA9IHJlbW90ZV93b3Jrc3BhY2UgKyBcIi9cIiArIHRhcmdldF9pZDtcbiAgICAgIH1cbiAgICAgIC8vIEZpeCB0aGUgdGFyZ2V0IGlkIHRvIGJlIGFuIGFic29sdXRlIGlkXG4gICAgICBlbmNvZGVkX21ldGhvZC5fcnRhcmdldCA9IHRhcmdldF9pZDtcbiAgICB9XG4gICAgbGV0IG1ldGhvZF9pZCA9IGVuY29kZWRfbWV0aG9kLl9ybWV0aG9kO1xuICAgIGxldCB3aXRoX3Byb21pc2UgPSBlbmNvZGVkX21ldGhvZC5fcnByb21pc2UgfHwgZmFsc2U7XG4gICAgY29uc3QgZGVzY3JpcHRpb24gPSBgbWV0aG9kOiAke21ldGhvZF9pZH0sIGRvY3M6ICR7ZW5jb2RlZF9tZXRob2QuX3Jkb2N9YDtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgIGZ1bmN0aW9uIHJlbW90ZV9tZXRob2QoKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBsZXQgbG9jYWxfc2Vzc2lvbl9pZCA9ICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLnJhbmRJZCkoKTtcbiAgICAgICAgaWYgKGxvY2FsX3BhcmVudCkge1xuICAgICAgICAgIC8vIFN0b3JlIHRoZSBjaGlsZHJlbiBzZXNzaW9uIHVuZGVyIHRoZSBwYXJlbnRcbiAgICAgICAgICBsb2NhbF9zZXNzaW9uX2lkID0gbG9jYWxfcGFyZW50ICsgXCIuXCIgKyBsb2NhbF9zZXNzaW9uX2lkO1xuICAgICAgICB9XG4gICAgICAgIGxldCBzdG9yZSA9IHNlbGYuX2dldF9zZXNzaW9uX3N0b3JlKGxvY2FsX3Nlc3Npb25faWQsIHRydWUpO1xuICAgICAgICBpZiAoIXN0b3JlKSB7XG4gICAgICAgICAgcmVqZWN0KFxuICAgICAgICAgICAgbmV3IEVycm9yKFxuICAgICAgICAgICAgICBgUnVudGltZSBFcnJvcjogRmFpbGVkIHRvIGdldCBzZXNzaW9uIHN0b3JlICR7bG9jYWxfc2Vzc2lvbl9pZH0gKGNvbnRleHQ6ICR7ZGVzY3JpcHRpb259KWAsXG4gICAgICAgICAgICApLFxuICAgICAgICAgICk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHN0b3JlW1widGFyZ2V0X2lkXCJdID0gdGFyZ2V0X2lkO1xuICAgICAgICBjb25zdCBhcmdzID0gYXdhaXQgc2VsZi5fZW5jb2RlKFxuICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyksXG4gICAgICAgICAgbG9jYWxfc2Vzc2lvbl9pZCxcbiAgICAgICAgICBsb2NhbF93b3Jrc3BhY2UsXG4gICAgICAgICk7XG4gICAgICAgIGNvbnN0IGFyZ0xlbmd0aCA9IGFyZ3MubGVuZ3RoO1xuICAgICAgICAvLyBpZiB0aGUgbGFzdCBhcmd1bWVudCBpcyBhbiBvYmplY3QsIG1hcmsgaXQgYXMga3dhcmdzXG4gICAgICAgIGNvbnN0IHdpdGhLd2FyZ3MgPVxuICAgICAgICAgIGFyZ0xlbmd0aCA+IDAgJiZcbiAgICAgICAgICB0eXBlb2YgYXJnc1thcmdMZW5ndGggLSAxXSA9PT0gXCJvYmplY3RcIiAmJlxuICAgICAgICAgIGFyZ3NbYXJnTGVuZ3RoIC0gMV0gIT09IG51bGwgJiZcbiAgICAgICAgICBhcmdzW2FyZ0xlbmd0aCAtIDFdLl9ya3dhcmdzO1xuICAgICAgICBpZiAod2l0aEt3YXJncykgZGVsZXRlIGFyZ3NbYXJnTGVuZ3RoIC0gMV0uX3Jrd2FyZ3M7XG5cbiAgICAgICAgbGV0IGZyb21fY2xpZW50O1xuICAgICAgICBpZiAoIXNlbGYuX2xvY2FsX3dvcmtzcGFjZSkge1xuICAgICAgICAgIGZyb21fY2xpZW50ID0gc2VsZi5fY2xpZW50X2lkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZyb21fY2xpZW50ID0gc2VsZi5fbG9jYWxfd29ya3NwYWNlICsgXCIvXCIgKyBzZWxmLl9jbGllbnRfaWQ7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgbWFpbl9tZXNzYWdlID0ge1xuICAgICAgICAgIHR5cGU6IFwibWV0aG9kXCIsXG4gICAgICAgICAgZnJvbTogZnJvbV9jbGllbnQsXG4gICAgICAgICAgdG86IHRhcmdldF9pZCxcbiAgICAgICAgICBtZXRob2Q6IG1ldGhvZF9pZCxcbiAgICAgICAgfTtcbiAgICAgICAgbGV0IGV4dHJhX2RhdGEgPSB7fTtcbiAgICAgICAgaWYgKGFyZ3MpIHtcbiAgICAgICAgICBleHRyYV9kYXRhW1wiYXJnc1wiXSA9IGFyZ3M7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHdpdGhLd2FyZ3MpIHtcbiAgICAgICAgICBleHRyYV9kYXRhW1wid2l0aF9rd2FyZ3NcIl0gPSB3aXRoS3dhcmdzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coXG4gICAgICAgIC8vICAgYENhbGxpbmcgcmVtb3RlIG1ldGhvZCAke3RhcmdldF9pZH06JHttZXRob2RfaWR9LCBzZXNzaW9uOiAke2xvY2FsX3Nlc3Npb25faWR9YFxuICAgICAgICAvLyApO1xuICAgICAgICBpZiAocmVtb3RlX3BhcmVudCkge1xuICAgICAgICAgIC8vIFNldCB0aGUgcGFyZW50IHNlc3Npb25cbiAgICAgICAgICAvLyBOb3RlOiBJdCdzIGEgc2Vzc2lvbiBpZCBmb3IgdGhlIHJlbW90ZSwgbm90IHRoZSBjdXJyZW50IGNsaWVudFxuICAgICAgICAgIG1haW5fbWVzc2FnZVtcInBhcmVudFwiXSA9IHJlbW90ZV9wYXJlbnQ7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgdGltZXIgPSBudWxsO1xuICAgICAgICBpZiAod2l0aF9wcm9taXNlKSB7XG4gICAgICAgICAgLy8gT25seSBwYXNzIHRoZSBjdXJyZW50IHNlc3Npb24gaWQgdG8gdGhlIHJlbW90ZVxuICAgICAgICAgIC8vIGlmIHdlIHdhbnQgdG8gcmVjZWl2ZWQgdGhlIHJlc3VsdFxuICAgICAgICAgIC8vIEkuZS4gdGhlIHNlc3Npb24gaWQgd29uJ3QgYmUgcGFzc2VkIGZvciBwcm9taXNlcyB0aGVtc2VsdmVzXG4gICAgICAgICAgbWFpbl9tZXNzYWdlW1wic2Vzc2lvblwiXSA9IGxvY2FsX3Nlc3Npb25faWQ7XG4gICAgICAgICAgbGV0IG1ldGhvZF9uYW1lID0gYCR7dGFyZ2V0X2lkfToke21ldGhvZF9pZH1gO1xuICAgICAgICAgIHRpbWVyID0gbmV3IFRpbWVyKFxuICAgICAgICAgICAgc2VsZi5fbWV0aG9kX3RpbWVvdXQsXG4gICAgICAgICAgICByZWplY3QsXG4gICAgICAgICAgICBbYE1ldGhvZCBjYWxsIHRpbWUgb3V0OiAke21ldGhvZF9uYW1lfSwgY29udGV4dDogJHtkZXNjcmlwdGlvbn1gXSxcbiAgICAgICAgICAgIG1ldGhvZF9uYW1lLFxuICAgICAgICAgICk7XG4gICAgICAgICAgLy8gQnkgZGVmYXVsdCwgaHlwaGEgd2lsbCBjbGVhciB0aGUgc2Vzc2lvbiBhZnRlciB0aGUgbWV0aG9kIGlzIGNhbGxlZFxuICAgICAgICAgIC8vIEhvd2V2ZXIsIGlmIHRoZSBhcmdzIGNvbnRhaW5zIF9yaW50ZiA9PT0gdHJ1ZSwgd2Ugd2lsbCBub3QgY2xlYXIgdGhlIHNlc3Npb25cbiAgICAgICAgICBsZXQgY2xlYXJfYWZ0ZXJfY2FsbGVkID0gdHJ1ZTtcbiAgICAgICAgICBmb3IgKGxldCBhcmcgb2YgYXJncykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBhcmcgPT09IFwib2JqZWN0XCIgJiYgYXJnLl9yaW50ZiA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICBjbGVhcl9hZnRlcl9jYWxsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHByb21pc2VEYXRhID0gYXdhaXQgc2VsZi5fZW5jb2RlX3Byb21pc2UoXG4gICAgICAgICAgICByZXNvbHZlLFxuICAgICAgICAgICAgcmVqZWN0LFxuICAgICAgICAgICAgbG9jYWxfc2Vzc2lvbl9pZCxcbiAgICAgICAgICAgIGNsZWFyX2FmdGVyX2NhbGxlZCxcbiAgICAgICAgICAgIHRpbWVyLFxuICAgICAgICAgICAgbG9jYWxfd29ya3NwYWNlLFxuICAgICAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGlmICh3aXRoX3Byb21pc2UgPT09IHRydWUpIHtcbiAgICAgICAgICAgIGV4dHJhX2RhdGFbXCJwcm9taXNlXCJdID0gcHJvbWlzZURhdGE7XG4gICAgICAgICAgfSBlbHNlIGlmICh3aXRoX3Byb21pc2UgPT09IFwiKlwiKSB7XG4gICAgICAgICAgICBleHRyYV9kYXRhW1wicHJvbWlzZVwiXSA9IFwiKlwiO1xuICAgICAgICAgICAgZXh0cmFfZGF0YVtcInRcIl0gPSBzZWxmLl9tZXRob2RfdGltZW91dCAvIDI7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgcHJvbWlzZSB0eXBlOiAke3dpdGhfcHJvbWlzZX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGhlIG1lc3NhZ2UgY29uc2lzdHMgb2YgdHdvIHNlZ21lbnRzLCB0aGUgbWFpbiBtZXNzYWdlIGFuZCBleHRyYSBkYXRhXG4gICAgICAgIGxldCBtZXNzYWdlX3BhY2thZ2UgPSAoMCxfbXNncGFja19tc2dwYWNrX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8zX18uZW5jb2RlKShtYWluX21lc3NhZ2UpO1xuICAgICAgICBpZiAoZXh0cmFfZGF0YSkge1xuICAgICAgICAgIGNvbnN0IGV4dHJhID0gKDAsX21zZ3BhY2tfbXNncGFja19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfM19fLmVuY29kZSkoZXh0cmFfZGF0YSk7XG4gICAgICAgICAgbWVzc2FnZV9wYWNrYWdlID0gbmV3IFVpbnQ4QXJyYXkoWy4uLm1lc3NhZ2VfcGFja2FnZSwgLi4uZXh0cmFdKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0b3RhbF9zaXplID0gbWVzc2FnZV9wYWNrYWdlLmxlbmd0aDtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRvdGFsX3NpemUgPD0gc2VsZi5fbG9uZ19tZXNzYWdlX2NodW5rX3NpemUgKyAxMDI0IHx8XG4gICAgICAgICAgcmVtb3RlX21ldGhvZC5fX25vX2NodW5rX19cbiAgICAgICAgKSB7XG4gICAgICAgICAgc2VsZlxuICAgICAgICAgICAgLl9lbWl0X21lc3NhZ2UobWVzc2FnZV9wYWNrYWdlKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICBpZiAodGltZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiByZXNvbHZlZCBzdWNjZXNzZnVsbHksIHJlc2V0IHRoZSB0aW1lclxuICAgICAgICAgICAgICAgIHRpbWVyLnJlc2V0KCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHNlbmQgbWVzc2FnZVwiLCBlcnIpO1xuICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgaWYgKHRpbWVyKSB7XG4gICAgICAgICAgICAgICAgdGltZXIuY2xlYXIoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gc2VuZCBjaHVuayBieSBjaHVua1xuICAgICAgICAgIHNlbGZcbiAgICAgICAgICAgIC5fc2VuZF9jaHVua3MobWVzc2FnZV9wYWNrYWdlLCB0YXJnZXRfaWQsIHJlbW90ZV9wYXJlbnQpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIGlmICh0aW1lcikge1xuICAgICAgICAgICAgICAgIC8vIElmIHJlc29sdmVkIHN1Y2Nlc3NmdWxseSwgcmVzZXQgdGhlIHRpbWVyXG4gICAgICAgICAgICAgICAgdGltZXIucmVzZXQoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gc2VuZCBtZXNzYWdlXCIsIGVycik7XG4gICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICBpZiAodGltZXIpIHtcbiAgICAgICAgICAgICAgICB0aW1lci5jbGVhcigpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gR2VuZXJhdGUgZGVidWdnaW5nIGluZm9ybWF0aW9uIGZvciB0aGUgbWV0aG9kXG4gICAgcmVtb3RlX21ldGhvZC5fX3JwY19vYmplY3RfXyA9IGVuY29kZWRfbWV0aG9kO1xuICAgIGNvbnN0IHBhcnRzID0gbWV0aG9kX2lkLnNwbGl0KFwiLlwiKTtcblxuICAgIHJlbW90ZV9tZXRob2QuX19uYW1lX18gPSBlbmNvZGVkX21ldGhvZC5fcm5hbWUgfHwgcGFydHNbcGFydHMubGVuZ3RoIC0gMV07XG4gICAgaWYgKHJlbW90ZV9tZXRob2QuX19uYW1lX18uaW5jbHVkZXMoXCIjXCIpKSB7XG4gICAgICByZW1vdGVfbWV0aG9kLl9fbmFtZV9fID0gcmVtb3RlX21ldGhvZC5fX25hbWVfXy5zcGxpdChcIiNcIilbMV07XG4gICAgfVxuICAgIHJlbW90ZV9tZXRob2QuX19kb2NfXyA9XG4gICAgICBlbmNvZGVkX21ldGhvZC5fcmRvYyB8fCBgUmVtb3RlIG1ldGhvZDogJHttZXRob2RfaWR9YDtcbiAgICByZW1vdGVfbWV0aG9kLl9fc2NoZW1hX18gPSBlbmNvZGVkX21ldGhvZC5fcnNjaGVtYTtcbiAgICAvLyBQcmV2ZW50IGNpcmN1bGFyIGNodW5rIHNlbmRpbmdcbiAgICByZW1vdGVfbWV0aG9kLl9fbm9fY2h1bmtfXyA9XG4gICAgICBlbmNvZGVkX21ldGhvZC5fcm1ldGhvZCA9PT0gXCJzZXJ2aWNlcy5idWlsdC1pbi5tZXNzYWdlX2NhY2hlLmFwcGVuZFwiO1xuICAgIHJldHVybiByZW1vdGVfbWV0aG9kO1xuICB9XG5cbiAgZ2V0X2NsaWVudF9pbmZvKCkge1xuICAgIGNvbnN0IHNlcnZpY2VzID0gW107XG4gICAgZm9yIChsZXQgc2VydmljZSBvZiBPYmplY3QudmFsdWVzKHRoaXMuX3NlcnZpY2VzKSkge1xuICAgICAgc2VydmljZXMucHVzaCh0aGlzLl9leHRyYWN0X3NlcnZpY2VfaW5mbyhzZXJ2aWNlKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiB0aGlzLl9jbGllbnRfaWQsXG4gICAgICBzZXJ2aWNlczogc2VydmljZXMsXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIF9oYW5kbGVfbWV0aG9kKGRhdGEpIHtcbiAgICBsZXQgcmVqZWN0ID0gbnVsbDtcbiAgICBsZXQgaGVhcnRiZWF0X3Rhc2sgPSBudWxsO1xuICAgIHRyeSB7XG4gICAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKGRhdGEubWV0aG9kICYmIGRhdGEuY3R4ICYmIGRhdGEuZnJvbSk7XG4gICAgICBjb25zdCBtZXRob2RfbmFtZSA9IGRhdGEuZnJvbSArIFwiOlwiICsgZGF0YS5tZXRob2Q7XG4gICAgICBjb25zdCByZW1vdGVfd29ya3NwYWNlID0gZGF0YS5mcm9tLnNwbGl0KFwiL1wiKVswXTtcbiAgICAgIGNvbnN0IHJlbW90ZV9jbGllbnRfaWQgPSBkYXRhLmZyb20uc3BsaXQoXCIvXCIpWzFdO1xuICAgICAgLy8gTWFrZSBzdXJlIHRoZSB0YXJnZXQgaWQgaXMgYW4gYWJzb2x1dGUgaWRcbiAgICAgIGRhdGFbXCJ0b1wiXSA9IGRhdGFbXCJ0b1wiXS5pbmNsdWRlcyhcIi9cIilcbiAgICAgICAgPyBkYXRhW1widG9cIl1cbiAgICAgICAgOiByZW1vdGVfd29ya3NwYWNlICsgXCIvXCIgKyBkYXRhW1widG9cIl07XG4gICAgICBkYXRhW1wiY3R4XCJdW1widG9cIl0gPSBkYXRhW1widG9cIl07XG4gICAgICBsZXQgbG9jYWxfd29ya3NwYWNlO1xuICAgICAgaWYgKCF0aGlzLl9sb2NhbF93b3Jrc3BhY2UpIHtcbiAgICAgICAgbG9jYWxfd29ya3NwYWNlID0gZGF0YVtcInRvXCJdLnNwbGl0KFwiL1wiKVswXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0aGlzLl9sb2NhbF93b3Jrc3BhY2UgJiYgdGhpcy5fbG9jYWxfd29ya3NwYWNlICE9PSBcIipcIikge1xuICAgICAgICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLmFzc2VydCkoXG4gICAgICAgICAgICBkYXRhW1widG9cIl0uc3BsaXQoXCIvXCIpWzBdID09PSB0aGlzLl9sb2NhbF93b3Jrc3BhY2UsXG4gICAgICAgICAgICBcIldvcmtzcGFjZSBtaXNtYXRjaDogXCIgK1xuICAgICAgICAgICAgICBkYXRhW1widG9cIl0uc3BsaXQoXCIvXCIpWzBdICtcbiAgICAgICAgICAgICAgXCIgIT0gXCIgK1xuICAgICAgICAgICAgICB0aGlzLl9sb2NhbF93b3Jrc3BhY2UsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBsb2NhbF93b3Jrc3BhY2UgPSB0aGlzLl9sb2NhbF93b3Jrc3BhY2U7XG4gICAgICB9XG4gICAgICBjb25zdCBsb2NhbF9wYXJlbnQgPSBkYXRhLnBhcmVudDtcblxuICAgICAgbGV0IHJlc29sdmUsIHJlamVjdDtcbiAgICAgIGlmIChkYXRhLnByb21pc2UpIHtcbiAgICAgICAgLy8gRGVjb2RlIHRoZSBwcm9taXNlIHdpdGggdGhlIHJlbW90ZSBzZXNzaW9uIGlkXG4gICAgICAgIC8vIFN1Y2ggdGhhdCB0aGUgc2Vzc2lvbiBpZCB3aWxsIGJlIHBhc3NlZCB0byB0aGUgcmVtb3RlIGFzIGEgcGFyZW50IHNlc3Npb24gaWRcbiAgICAgICAgY29uc3QgcHJvbWlzZSA9IGF3YWl0IHRoaXMuX2RlY29kZShcbiAgICAgICAgICBkYXRhLnByb21pc2UgPT09IFwiKlwiID8gdGhpcy5fZXhwYW5kX3Byb21pc2UoZGF0YSkgOiBkYXRhLnByb21pc2UsXG4gICAgICAgICAgZGF0YS5zZXNzaW9uLFxuICAgICAgICAgIGxvY2FsX3BhcmVudCxcbiAgICAgICAgICByZW1vdGVfd29ya3NwYWNlLFxuICAgICAgICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgICAgICAgKTtcbiAgICAgICAgcmVzb2x2ZSA9IHByb21pc2UucmVzb2x2ZTtcbiAgICAgICAgcmVqZWN0ID0gcHJvbWlzZS5yZWplY3Q7XG4gICAgICAgIGlmIChwcm9taXNlLmhlYXJ0YmVhdCAmJiBwcm9taXNlLmludGVydmFsKSB7XG4gICAgICAgICAgYXN5bmMgZnVuY3Rpb24gaGVhcnRiZWF0KCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgLy8gY29uc29sZS5kZWJ1ZyhcIlJlc2V0IGhlYXJ0YmVhdCB0aW1lcjogXCIgKyBkYXRhLm1ldGhvZCk7XG4gICAgICAgICAgICAgIGF3YWl0IHByb21pc2UuaGVhcnRiZWF0KCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBoZWFydGJlYXRfdGFzayA9IHNldEludGVydmFsKGhlYXJ0YmVhdCwgcHJvbWlzZS5pbnRlcnZhbCAqIDEwMDApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGxldCBtZXRob2Q7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIG1ldGhvZCA9IGluZGV4T2JqZWN0KHRoaXMuX29iamVjdF9zdG9yZSwgZGF0YVtcIm1ldGhvZFwiXSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIGNvbnNvbGUuZGVidWcoXCJGYWlsZWQgdG8gZmluZCBtZXRob2RcIiwgbWV0aG9kX25hbWUsIHRoaXMuX2NsaWVudF9pZCwgZSk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgTWV0aG9kIG5vdCBmb3VuZDogJHttZXRob2RfbmFtZX0gYXQgJHt0aGlzLl9jbGllbnRfaWR9YCxcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KShcbiAgICAgICAgbWV0aG9kICYmIHR5cGVvZiBtZXRob2QgPT09IFwiZnVuY3Rpb25cIixcbiAgICAgICAgXCJJbnZhbGlkIG1ldGhvZDogXCIgKyBtZXRob2RfbmFtZSxcbiAgICAgICk7XG5cbiAgICAgIC8vIENoZWNrIHBlcm1pc3Npb25cbiAgICAgIGlmICh0aGlzLl9tZXRob2RfYW5ub3RhdGlvbnMuaGFzKG1ldGhvZCkpIHtcbiAgICAgICAgLy8gRm9yIHNlcnZpY2VzLCBpdCBzaG91bGQgbm90IGJlIHByb3RlY3RlZFxuICAgICAgICBpZiAodGhpcy5fbWV0aG9kX2Fubm90YXRpb25zLmdldChtZXRob2QpLnZpc2liaWxpdHkgPT09IFwicHJvdGVjdGVkXCIpIHtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBsb2NhbF93b3Jrc3BhY2UgIT09IHJlbW90ZV93b3Jrc3BhY2UgJiZcbiAgICAgICAgICAgIChyZW1vdGVfd29ya3NwYWNlICE9PSBcIipcIiB8fFxuICAgICAgICAgICAgICByZW1vdGVfY2xpZW50X2lkICE9PSB0aGlzLl9jb25uZWN0aW9uLm1hbmFnZXJfaWQpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgIFwiUGVybWlzc2lvbiBkZW5pZWQgZm9yIGludm9raW5nIHByb3RlY3RlZCBtZXRob2QgXCIgK1xuICAgICAgICAgICAgICAgIG1ldGhvZF9uYW1lICtcbiAgICAgICAgICAgICAgICBcIiwgd29ya3NwYWNlIG1pc21hdGNoOiBcIiArXG4gICAgICAgICAgICAgICAgbG9jYWxfd29ya3NwYWNlICtcbiAgICAgICAgICAgICAgICBcIiAhPSBcIiArXG4gICAgICAgICAgICAgICAgcmVtb3RlX3dvcmtzcGFjZSxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBGb3Igc2Vzc2lvbnMsIHRoZSB0YXJnZXRfaWQgc2hvdWxkIG1hdGNoIGV4YWN0bHlcbiAgICAgICAgbGV0IHNlc3Npb25fdGFyZ2V0X2lkID1cbiAgICAgICAgICB0aGlzLl9vYmplY3Rfc3RvcmVbZGF0YS5tZXRob2Quc3BsaXQoXCIuXCIpWzBdXS50YXJnZXRfaWQ7XG4gICAgICAgIGlmIChcbiAgICAgICAgICBsb2NhbF93b3Jrc3BhY2UgPT09IHJlbW90ZV93b3Jrc3BhY2UgJiZcbiAgICAgICAgICBzZXNzaW9uX3RhcmdldF9pZCAmJlxuICAgICAgICAgIHNlc3Npb25fdGFyZ2V0X2lkLmluZGV4T2YoXCIvXCIpID09PSAtMVxuICAgICAgICApIHtcbiAgICAgICAgICBzZXNzaW9uX3RhcmdldF9pZCA9IGxvY2FsX3dvcmtzcGFjZSArIFwiL1wiICsgc2Vzc2lvbl90YXJnZXRfaWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNlc3Npb25fdGFyZ2V0X2lkICE9PSBkYXRhLmZyb20pIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICBcIkFjY2VzcyBkZW5pZWQgZm9yIG1ldGhvZCBjYWxsIChcIiArXG4gICAgICAgICAgICAgIG1ldGhvZF9uYW1lICtcbiAgICAgICAgICAgICAgXCIpIGZyb20gXCIgK1xuICAgICAgICAgICAgICBkYXRhLmZyb20gK1xuICAgICAgICAgICAgICBcIiB0byB0YXJnZXQgXCIgK1xuICAgICAgICAgICAgICBzZXNzaW9uX3RhcmdldF9pZCxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIE1ha2Ugc3VyZSB0aGUgcGFyZW50IHNlc3Npb24gaXMgc3RpbGwgb3BlblxuICAgICAgaWYgKGxvY2FsX3BhcmVudCkge1xuICAgICAgICAvLyBUaGUgcGFyZW50IHNlc3Npb24gc2hvdWxkIGJlIGEgc2Vzc2lvbiB0aGF0IGdlbmVyYXRlIHRoZSBjdXJyZW50IG1ldGhvZCBjYWxsXG4gICAgICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLmFzc2VydCkoXG4gICAgICAgICAgdGhpcy5fZ2V0X3Nlc3Npb25fc3RvcmUobG9jYWxfcGFyZW50LCB0cnVlKSAhPT0gbnVsbCxcbiAgICAgICAgICBcIlBhcmVudCBzZXNzaW9uIHdhcyBjbG9zZWQ6IFwiICsgbG9jYWxfcGFyZW50LFxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgbGV0IGFyZ3M7XG4gICAgICBpZiAoZGF0YS5hcmdzKSB7XG4gICAgICAgIGFyZ3MgPSBhd2FpdCB0aGlzLl9kZWNvZGUoXG4gICAgICAgICAgZGF0YS5hcmdzLFxuICAgICAgICAgIGRhdGEuc2Vzc2lvbixcbiAgICAgICAgICBudWxsLFxuICAgICAgICAgIHJlbW90ZV93b3Jrc3BhY2UsXG4gICAgICAgICAgbnVsbCxcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFyZ3MgPSBbXTtcbiAgICAgIH1cbiAgICAgIGlmIChcbiAgICAgICAgdGhpcy5fbWV0aG9kX2Fubm90YXRpb25zLmhhcyhtZXRob2QpICYmXG4gICAgICAgIHRoaXMuX21ldGhvZF9hbm5vdGF0aW9ucy5nZXQobWV0aG9kKS5yZXF1aXJlX2NvbnRleHRcbiAgICAgICkge1xuICAgICAgICAvLyBpZiBhcmdzLmxlbmd0aCArIDEgaXMgbGVzcyB0aGFuIHRoZSByZXF1aXJlZCBudW1iZXIgb2YgYXJndW1lbnRzIHdlIHdpbGwgcGFkIHdpdGggdW5kZWZpbmVkXG4gICAgICAgIC8vIHNvIHdlIG1ha2Ugc3VyZSB0aGUgbGFzdCBhcmd1bWVudCBpcyB0aGUgY29udGV4dFxuICAgICAgICBpZiAoYXJncy5sZW5ndGggKyAxIDwgbWV0aG9kLmxlbmd0aCkge1xuICAgICAgICAgIGZvciAobGV0IGkgPSBhcmdzLmxlbmd0aDsgaSA8IG1ldGhvZC5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3MucHVzaCh1bmRlZmluZWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhcmdzLnB1c2goZGF0YS5jdHgpO1xuICAgICAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKFxuICAgICAgICAgIGFyZ3MubGVuZ3RoID09PSBtZXRob2QubGVuZ3RoLFxuICAgICAgICAgIGBSdW50aW1lIEVycm9yOiBJbnZhbGlkIG51bWJlciBvZiBhcmd1bWVudHMgZm9yIG1ldGhvZCAke21ldGhvZF9uYW1lfSwgZXhwZWN0ZWQgJHttZXRob2QubGVuZ3RofSBidXQgZ290ICR7YXJncy5sZW5ndGh9YCxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIC8vIGNvbnNvbGUuZGVidWcoYEV4ZWN1dGluZyBtZXRob2Q6ICR7bWV0aG9kX25hbWV9ICgke2RhdGEubWV0aG9kfSlgKTtcbiAgICAgIGlmIChkYXRhLnByb21pc2UpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gbWV0aG9kLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgIHJlc3VsdFxuICAgICAgICAgICAgLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaGVhcnRiZWF0X3Rhc2spO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICBjbGVhckludGVydmFsKGhlYXJ0YmVhdF90YXNrKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICBjbGVhckludGVydmFsKGhlYXJ0YmVhdF90YXNrKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWV0aG9kLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICBjbGVhckludGVydmFsKGhlYXJ0YmVhdF90YXNrKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGlmIChyZWplY3QpIHtcbiAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIC8vIGNvbnNvbGUuZGVidWcoXCJFcnJvciBkdXJpbmcgY2FsbGluZyBtZXRob2Q6IFwiLCBlcnIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIGR1cmluZyBjYWxsaW5nIG1ldGhvZDogXCIsIGVycik7XG4gICAgICB9XG4gICAgICAvLyBtYWtlIHN1cmUgd2UgY2xlYXIgdGhlIGhlYXJ0YmVhdCB0aW1lclxuICAgICAgY2xlYXJJbnRlcnZhbChoZWFydGJlYXRfdGFzayk7XG4gICAgfVxuICB9XG5cbiAgZW5jb2RlKGFPYmplY3QsIHNlc3Npb25faWQpIHtcbiAgICByZXR1cm4gdGhpcy5fZW5jb2RlKGFPYmplY3QsIHNlc3Npb25faWQpO1xuICB9XG5cbiAgX2dldF9zZXNzaW9uX3N0b3JlKHNlc3Npb25faWQsIGNyZWF0ZSkge1xuICAgIGxldCBzdG9yZSA9IHRoaXMuX29iamVjdF9zdG9yZTtcbiAgICBjb25zdCBsZXZlbHMgPSBzZXNzaW9uX2lkLnNwbGl0KFwiLlwiKTtcbiAgICBpZiAoY3JlYXRlKSB7XG4gICAgICBjb25zdCBsYXN0X2luZGV4ID0gbGV2ZWxzLmxlbmd0aCAtIDE7XG4gICAgICBmb3IgKGxldCBsZXZlbCBvZiBsZXZlbHMuc2xpY2UoMCwgbGFzdF9pbmRleCkpIHtcbiAgICAgICAgaWYgKCFzdG9yZVtsZXZlbF0pIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBzdG9yZSA9IHN0b3JlW2xldmVsXTtcbiAgICAgIH1cbiAgICAgIC8vIENyZWF0ZSB0aGUgbGFzdCBsZXZlbFxuICAgICAgaWYgKCFzdG9yZVtsZXZlbHNbbGFzdF9pbmRleF1dKSB7XG4gICAgICAgIHN0b3JlW2xldmVsc1tsYXN0X2luZGV4XV0gPSB7fTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdG9yZVtsZXZlbHNbbGFzdF9pbmRleF1dO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGxldCBsZXZlbCBvZiBsZXZlbHMpIHtcbiAgICAgICAgaWYgKCFzdG9yZVtsZXZlbF0pIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBzdG9yZSA9IHN0b3JlW2xldmVsXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdG9yZTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUHJlcGFyZXMgdGhlIHByb3ZpZGVkIHNldCBvZiByZW1vdGUgbWV0aG9kIGFyZ3VtZW50cyBmb3JcbiAgICogc2VuZGluZyB0byB0aGUgcmVtb3RlIHNpdGUsIHJlcGxhY2VzIGFsbCB0aGUgY2FsbGJhY2tzIHdpdGhcbiAgICogaWRlbnRpZmllcnNcbiAgICpcbiAgICogQHBhcmFtIHtBcnJheX0gYXJncyB0byB3cmFwXG4gICAqXG4gICAqIEByZXR1cm5zIHtBcnJheX0gd3JhcHBlZCBhcmd1bWVudHNcbiAgICovXG4gIGFzeW5jIF9lbmNvZGUoYU9iamVjdCwgc2Vzc2lvbl9pZCwgbG9jYWxfd29ya3NwYWNlKSB7XG4gICAgY29uc3QgYVR5cGUgPSB0eXBlb2YgYU9iamVjdDtcbiAgICBpZiAoXG4gICAgICBhVHlwZSA9PT0gXCJudW1iZXJcIiB8fFxuICAgICAgYVR5cGUgPT09IFwic3RyaW5nXCIgfHxcbiAgICAgIGFUeXBlID09PSBcImJvb2xlYW5cIiB8fFxuICAgICAgYU9iamVjdCA9PT0gbnVsbCB8fFxuICAgICAgYU9iamVjdCA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICBhT2JqZWN0IGluc3RhbmNlb2YgVWludDhBcnJheVxuICAgICkge1xuICAgICAgcmV0dXJuIGFPYmplY3Q7XG4gICAgfVxuICAgIGlmIChhT2JqZWN0IGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIF9ydHlwZTogXCJtZW1vcnl2aWV3XCIsXG4gICAgICAgIF9ydmFsdWU6IG5ldyBVaW50OEFycmF5KGFPYmplY3QpLFxuICAgICAgfTtcbiAgICB9XG4gICAgLy8gUmV1c2UgdGhlIHJlbW90ZSBvYmplY3RcbiAgICBpZiAoYU9iamVjdC5fX3JwY19vYmplY3RfXykge1xuICAgICAgY29uc3QgX3NlcnZlciA9IGFPYmplY3QuX19ycGNfb2JqZWN0X18uX3JzZXJ2ZXIgfHwgdGhpcy5fc2VydmVyX2Jhc2VfdXJsO1xuICAgICAgaWYgKF9zZXJ2ZXIgPT09IHRoaXMuX3NlcnZlcl9iYXNlX3VybCkge1xuICAgICAgICByZXR1cm4gYU9iamVjdC5fX3JwY19vYmplY3RfXztcbiAgICAgIH0gLy8gZWxzZSB7XG4gICAgICAvLyAgIGNvbnNvbGUuZGVidWcoXG4gICAgICAvLyAgICAgYEVuY29kaW5nIHJlbW90ZSBmdW5jdGlvbiBmcm9tIGEgZGlmZmVyZW50IHNlcnZlciAke19zZXJ2ZXJ9LCBjdXJyZW50IHNlcnZlcjogJHt0aGlzLl9zZXJ2ZXJfYmFzZV91cmx9YCxcbiAgICAgIC8vICAgKTtcbiAgICAgIC8vIH1cbiAgICB9XG5cbiAgICBsZXQgYk9iamVjdDtcblxuICAgIC8vIHNraXAgaWYgYWxyZWFkeSBlbmNvZGVkXG4gICAgaWYgKGFPYmplY3QuY29uc3RydWN0b3IgaW5zdGFuY2VvZiBPYmplY3QgJiYgYU9iamVjdC5fcnR5cGUpIHtcbiAgICAgIC8vIG1ha2Ugc3VyZSB0aGUgaW50ZXJmYWNlIGZ1bmN0aW9ucyBhcmUgZW5jb2RlZFxuICAgICAgY29uc3QgdGVtcCA9IGFPYmplY3QuX3J0eXBlO1xuICAgICAgZGVsZXRlIGFPYmplY3QuX3J0eXBlO1xuICAgICAgYk9iamVjdCA9IGF3YWl0IHRoaXMuX2VuY29kZShhT2JqZWN0LCBzZXNzaW9uX2lkLCBsb2NhbF93b3Jrc3BhY2UpO1xuICAgICAgYk9iamVjdC5fcnR5cGUgPSB0ZW1wO1xuICAgICAgcmV0dXJuIGJPYmplY3Q7XG4gICAgfVxuXG4gICAgaWYgKCgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLmlzR2VuZXJhdG9yKShhT2JqZWN0KSB8fCAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5pc0FzeW5jR2VuZXJhdG9yKShhT2JqZWN0KSkge1xuICAgICAgLy8gSGFuZGxlIGdlbmVyYXRvciBmdW5jdGlvbnMgYW5kIGdlbmVyYXRvciBvYmplY3RzXG4gICAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKFxuICAgICAgICBzZXNzaW9uX2lkICYmIHR5cGVvZiBzZXNzaW9uX2lkID09PSBcInN0cmluZ1wiLFxuICAgICAgICBcIlNlc3Npb24gSUQgaXMgcmVxdWlyZWQgZm9yIGdlbmVyYXRvciBlbmNvZGluZ1wiLFxuICAgICAgKTtcbiAgICAgIGNvbnN0IG9iamVjdF9pZCA9ICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLnJhbmRJZCkoKTtcblxuICAgICAgLy8gR2V0IHRoZSBzZXNzaW9uIHN0b3JlXG4gICAgICBjb25zdCBzdG9yZSA9IHRoaXMuX2dldF9zZXNzaW9uX3N0b3JlKHNlc3Npb25faWQsIHRydWUpO1xuICAgICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KShcbiAgICAgICAgc3RvcmUgIT09IG51bGwsXG4gICAgICAgIGBGYWlsZWQgdG8gY3JlYXRlIHNlc3Npb24gc3RvcmUgJHtzZXNzaW9uX2lkfSBkdWUgdG8gaW52YWxpZCBwYXJlbnRgLFxuICAgICAgKTtcblxuICAgICAgLy8gQ2hlY2sgaWYgaXQncyBhbiBhc3luYyBnZW5lcmF0b3JcbiAgICAgIGNvbnN0IGlzQXN5bmMgPSAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5pc0FzeW5jR2VuZXJhdG9yKShhT2JqZWN0KTtcblxuICAgICAgLy8gRGVmaW5lIG1ldGhvZCB0byBnZXQgbmV4dCBpdGVtIGZyb20gdGhlIGdlbmVyYXRvclxuICAgICAgY29uc3QgbmV4dEl0ZW1NZXRob2QgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgIGlmIChpc0FzeW5jKSB7XG4gICAgICAgICAgY29uc3QgaXRlcmF0b3IgPSBhT2JqZWN0O1xuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgICBpZiAocmVzdWx0LmRvbmUpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBzdG9yZVtvYmplY3RfaWRdO1xuICAgICAgICAgICAgcmV0dXJuIHsgX3J0eXBlOiBcInN0b3BfaXRlcmF0aW9uXCIgfTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdC52YWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBpdGVyYXRvciA9IGFPYmplY3Q7XG4gICAgICAgICAgY29uc3QgcmVzdWx0ID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgIGlmIChyZXN1bHQuZG9uZSkge1xuICAgICAgICAgICAgZGVsZXRlIHN0b3JlW29iamVjdF9pZF07XG4gICAgICAgICAgICByZXR1cm4geyBfcnR5cGU6IFwic3RvcF9pdGVyYXRpb25cIiB9O1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVzdWx0LnZhbHVlO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAvLyBTdG9yZSB0aGUgbmV4dF9pdGVtIG1ldGhvZCBpbiB0aGUgc2Vzc2lvblxuICAgICAgc3RvcmVbb2JqZWN0X2lkXSA9IG5leHRJdGVtTWV0aG9kO1xuXG4gICAgICAvLyBDcmVhdGUgYSBtZXRob2QgdGhhdCB3aWxsIGJlIHVzZWQgdG8gZmV0Y2ggdGhlIG5leHQgaXRlbSBmcm9tIHRoZSBnZW5lcmF0b3JcbiAgICAgIGJPYmplY3QgPSB7XG4gICAgICAgIF9ydHlwZTogXCJnZW5lcmF0b3JcIixcbiAgICAgICAgX3JzZXJ2ZXI6IHRoaXMuX3NlcnZlcl9iYXNlX3VybCxcbiAgICAgICAgX3J0YXJnZXQ6IHRoaXMuX2NsaWVudF9pZCxcbiAgICAgICAgX3JtZXRob2Q6IGAke3Nlc3Npb25faWR9LiR7b2JqZWN0X2lkfWAsXG4gICAgICAgIF9ycHJvbWlzZTogXCIqXCIsXG4gICAgICAgIF9yZG9jOiBcIlJlbW90ZSBnZW5lcmF0b3JcIixcbiAgICAgIH07XG4gICAgICByZXR1cm4gYk9iamVjdDtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBhT2JqZWN0ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIGlmICh0aGlzLl9tZXRob2RfYW5ub3RhdGlvbnMuaGFzKGFPYmplY3QpKSB7XG4gICAgICAgIGxldCBhbm5vdGF0aW9uID0gdGhpcy5fbWV0aG9kX2Fubm90YXRpb25zLmdldChhT2JqZWN0KTtcbiAgICAgICAgYk9iamVjdCA9IHtcbiAgICAgICAgICBfcnR5cGU6IFwibWV0aG9kXCIsXG4gICAgICAgICAgX3JzZXJ2ZXI6IHRoaXMuX3NlcnZlcl9iYXNlX3VybCxcbiAgICAgICAgICBfcnRhcmdldDogdGhpcy5fY2xpZW50X2lkLFxuICAgICAgICAgIF9ybWV0aG9kOiBhbm5vdGF0aW9uLm1ldGhvZF9pZCxcbiAgICAgICAgICBfcnByb21pc2U6IFwiKlwiLFxuICAgICAgICAgIF9ybmFtZTogYU9iamVjdC5uYW1lLFxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uYXNzZXJ0KSh0eXBlb2Ygc2Vzc2lvbl9pZCA9PT0gXCJzdHJpbmdcIik7XG4gICAgICAgIGxldCBvYmplY3RfaWQ7XG4gICAgICAgIGlmIChhT2JqZWN0Ll9fbmFtZV9fKSB7XG4gICAgICAgICAgb2JqZWN0X2lkID0gYCR7KDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18ucmFuZElkKSgpfSMke2FPYmplY3QuX19uYW1lX199YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvYmplY3RfaWQgPSAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5yYW5kSWQpKCk7XG4gICAgICAgIH1cbiAgICAgICAgYk9iamVjdCA9IHtcbiAgICAgICAgICBfcnR5cGU6IFwibWV0aG9kXCIsXG4gICAgICAgICAgX3JzZXJ2ZXI6IHRoaXMuX3NlcnZlcl9iYXNlX3VybCxcbiAgICAgICAgICBfcnRhcmdldDogdGhpcy5fY2xpZW50X2lkLFxuICAgICAgICAgIF9ybWV0aG9kOiBgJHtzZXNzaW9uX2lkfS4ke29iamVjdF9pZH1gLFxuICAgICAgICAgIF9ycHJvbWlzZTogXCIqXCIsXG4gICAgICAgICAgX3JuYW1lOiBhT2JqZWN0Lm5hbWUsXG4gICAgICAgIH07XG4gICAgICAgIGxldCBzdG9yZSA9IHRoaXMuX2dldF9zZXNzaW9uX3N0b3JlKHNlc3Npb25faWQsIHRydWUpO1xuICAgICAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKFxuICAgICAgICAgIHN0b3JlICE9PSBudWxsLFxuICAgICAgICAgIGBGYWlsZWQgdG8gY3JlYXRlIHNlc3Npb24gc3RvcmUgJHtzZXNzaW9uX2lkfSBkdWUgdG8gaW52YWxpZCBwYXJlbnRgLFxuICAgICAgICApO1xuICAgICAgICBzdG9yZVtvYmplY3RfaWRdID0gYU9iamVjdDtcbiAgICAgIH1cbiAgICAgIGJPYmplY3QuX3Jkb2MgPSBhT2JqZWN0Ll9fZG9jX187XG4gICAgICBpZiAoIWJPYmplY3QuX3Jkb2MpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBmdW5jSW5mbyA9IGdldEZ1bmN0aW9uSW5mbyhhT2JqZWN0KTtcbiAgICAgICAgICBpZiAoZnVuY0luZm8gJiYgIWJPYmplY3QuX3Jkb2MpIHtcbiAgICAgICAgICAgIGJPYmplY3QuX3Jkb2MgPSBgJHtmdW5jSW5mby5kb2N9YDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIGV4dHJhY3QgZnVuY3Rpb24gZG9jc3RyaW5nOlwiLCBhT2JqZWN0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYk9iamVjdC5fcnNjaGVtYSA9IGFPYmplY3QuX19zY2hlbWFfXztcbiAgICAgIHJldHVybiBiT2JqZWN0O1xuICAgIH1cbiAgICBjb25zdCBpc2FycmF5ID0gQXJyYXkuaXNBcnJheShhT2JqZWN0KTtcblxuICAgIGZvciAobGV0IHRwIG9mIE9iamVjdC5rZXlzKHRoaXMuX2NvZGVjcykpIHtcbiAgICAgIGNvbnN0IGNvZGVjID0gdGhpcy5fY29kZWNzW3RwXTtcbiAgICAgIGlmIChjb2RlYy5lbmNvZGVyICYmIGFPYmplY3QgaW5zdGFuY2VvZiBjb2RlYy50eXBlKSB7XG4gICAgICAgIC8vIFRPRE86IHdoYXQgaWYgbXVsdGlwbGUgZW5jb2RlcnMgZm91bmRcbiAgICAgICAgbGV0IGVuY29kZWRPYmogPSBhd2FpdCBQcm9taXNlLnJlc29sdmUoY29kZWMuZW5jb2RlcihhT2JqZWN0KSk7XG4gICAgICAgIGlmIChlbmNvZGVkT2JqICYmICFlbmNvZGVkT2JqLl9ydHlwZSkgZW5jb2RlZE9iai5fcnR5cGUgPSBjb2RlYy5uYW1lO1xuICAgICAgICAvLyBlbmNvZGUgdGhlIGZ1bmN0aW9ucyBpbiB0aGUgaW50ZXJmYWNlIG9iamVjdFxuICAgICAgICBpZiAodHlwZW9mIGVuY29kZWRPYmogPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICBjb25zdCB0ZW1wID0gZW5jb2RlZE9iai5fcnR5cGU7XG4gICAgICAgICAgZGVsZXRlIGVuY29kZWRPYmouX3J0eXBlO1xuICAgICAgICAgIGVuY29kZWRPYmogPSBhd2FpdCB0aGlzLl9lbmNvZGUoXG4gICAgICAgICAgICBlbmNvZGVkT2JqLFxuICAgICAgICAgICAgc2Vzc2lvbl9pZCxcbiAgICAgICAgICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgICAgICAgICApO1xuICAgICAgICAgIGVuY29kZWRPYmouX3J0eXBlID0gdGVtcDtcbiAgICAgICAgfVxuICAgICAgICBiT2JqZWN0ID0gZW5jb2RlZE9iajtcbiAgICAgICAgcmV0dXJuIGJPYmplY3Q7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKFxuICAgICAgLypnbG9iYWwgdGYqL1xuICAgICAgdHlwZW9mIHRmICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICB0Zi5UZW5zb3IgJiZcbiAgICAgIGFPYmplY3QgaW5zdGFuY2VvZiB0Zi5UZW5zb3JcbiAgICApIHtcbiAgICAgIGNvbnN0IHZfYnVmZmVyID0gYU9iamVjdC5kYXRhU3luYygpO1xuICAgICAgYk9iamVjdCA9IHtcbiAgICAgICAgX3J0eXBlOiBcIm5kYXJyYXlcIixcbiAgICAgICAgX3J2YWx1ZTogbmV3IFVpbnQ4QXJyYXkodl9idWZmZXIuYnVmZmVyKSxcbiAgICAgICAgX3JzaGFwZTogYU9iamVjdC5zaGFwZSxcbiAgICAgICAgX3JkdHlwZTogYU9iamVjdC5kdHlwZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIC8qZ2xvYmFsIG5qKi9cbiAgICAgIHR5cGVvZiBuaiAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgICAgbmouTmRBcnJheSAmJlxuICAgICAgYU9iamVjdCBpbnN0YW5jZW9mIG5qLk5kQXJyYXlcbiAgICApIHtcbiAgICAgIGNvbnN0IGR0eXBlID0gKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18udHlwZWRBcnJheVRvRHR5cGUpKGFPYmplY3Quc2VsZWN0aW9uLmRhdGEpO1xuICAgICAgYk9iamVjdCA9IHtcbiAgICAgICAgX3J0eXBlOiBcIm5kYXJyYXlcIixcbiAgICAgICAgX3J2YWx1ZTogbmV3IFVpbnQ4QXJyYXkoYU9iamVjdC5zZWxlY3Rpb24uZGF0YS5idWZmZXIpLFxuICAgICAgICBfcnNoYXBlOiBhT2JqZWN0LnNoYXBlLFxuICAgICAgICBfcmR0eXBlOiBkdHlwZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChhT2JqZWN0IGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYU9iamVjdCk7XG4gICAgICBiT2JqZWN0ID0ge1xuICAgICAgICBfcnR5cGU6IFwiZXJyb3JcIixcbiAgICAgICAgX3J2YWx1ZTogYU9iamVjdC50b1N0cmluZygpLFxuICAgICAgICBfcnRyYWNlOiBhT2JqZWN0LnN0YWNrLFxuICAgICAgfTtcbiAgICB9XG4gICAgLy8gc2VuZCBvYmplY3RzIHN1cHBvcnRlZCBieSBzdHJ1Y3R1cmUgY2xvbmUgYWxnb3JpdGhtXG4gICAgLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL1dlYl9Xb3JrZXJzX0FQSS9TdHJ1Y3R1cmVkX2Nsb25lX2FsZ29yaXRobVxuICAgIGVsc2UgaWYgKFxuICAgICAgYU9iamVjdCAhPT0gT2JqZWN0KGFPYmplY3QpIHx8XG4gICAgICBhT2JqZWN0IGluc3RhbmNlb2YgQm9vbGVhbiB8fFxuICAgICAgYU9iamVjdCBpbnN0YW5jZW9mIFN0cmluZyB8fFxuICAgICAgYU9iamVjdCBpbnN0YW5jZW9mIERhdGUgfHxcbiAgICAgIGFPYmplY3QgaW5zdGFuY2VvZiBSZWdFeHAgfHxcbiAgICAgIGFPYmplY3QgaW5zdGFuY2VvZiBJbWFnZURhdGEgfHxcbiAgICAgICh0eXBlb2YgRmlsZUxpc3QgIT09IFwidW5kZWZpbmVkXCIgJiYgYU9iamVjdCBpbnN0YW5jZW9mIEZpbGVMaXN0KSB8fFxuICAgICAgKHR5cGVvZiBGaWxlU3lzdGVtRGlyZWN0b3J5SGFuZGxlICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICAgIGFPYmplY3QgaW5zdGFuY2VvZiBGaWxlU3lzdGVtRGlyZWN0b3J5SGFuZGxlKSB8fFxuICAgICAgKHR5cGVvZiBGaWxlU3lzdGVtRmlsZUhhbmRsZSAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgICAgICBhT2JqZWN0IGluc3RhbmNlb2YgRmlsZVN5c3RlbUZpbGVIYW5kbGUpIHx8XG4gICAgICAodHlwZW9mIEZpbGVTeXN0ZW1IYW5kbGUgIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICAgICAgYU9iamVjdCBpbnN0YW5jZW9mIEZpbGVTeXN0ZW1IYW5kbGUpIHx8XG4gICAgICAodHlwZW9mIEZpbGVTeXN0ZW1Xcml0YWJsZUZpbGVTdHJlYW0gIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICAgICAgYU9iamVjdCBpbnN0YW5jZW9mIEZpbGVTeXN0ZW1Xcml0YWJsZUZpbGVTdHJlYW0pXG4gICAgKSB7XG4gICAgICBiT2JqZWN0ID0gYU9iamVjdDtcbiAgICAgIC8vIFRPRE86IGF2b2lkIG9iamVjdCBzdWNoIGFzIER5bmFtaWNQbHVnaW4gaW5zdGFuY2UuXG4gICAgfSBlbHNlIGlmIChhT2JqZWN0IGluc3RhbmNlb2YgQmxvYikge1xuICAgICAgbGV0IF9jdXJyZW50X3BvcyA9IDA7XG4gICAgICBhc3luYyBmdW5jdGlvbiByZWFkKGxlbmd0aCkge1xuICAgICAgICBsZXQgYmxvYjtcbiAgICAgICAgaWYgKGxlbmd0aCkge1xuICAgICAgICAgIGJsb2IgPSBhT2JqZWN0LnNsaWNlKF9jdXJyZW50X3BvcywgX2N1cnJlbnRfcG9zICsgbGVuZ3RoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBibG9iID0gYU9iamVjdC5zbGljZShfY3VycmVudF9wb3MpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJldCA9IG5ldyBVaW50OEFycmF5KGF3YWl0IGJsb2IuYXJyYXlCdWZmZXIoKSk7XG4gICAgICAgIF9jdXJyZW50X3BvcyA9IF9jdXJyZW50X3BvcyArIHJldC5ieXRlTGVuZ3RoO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgfVxuICAgICAgZnVuY3Rpb24gc2Vlayhwb3MpIHtcbiAgICAgICAgX2N1cnJlbnRfcG9zID0gcG9zO1xuICAgICAgfVxuICAgICAgYk9iamVjdCA9IHtcbiAgICAgICAgX3J0eXBlOiBcImlvc3RyZWFtXCIsXG4gICAgICAgIF9ybmF0aXZlOiBcImpzOmJsb2JcIixcbiAgICAgICAgdHlwZTogYU9iamVjdC50eXBlLFxuICAgICAgICBuYW1lOiBhT2JqZWN0Lm5hbWUsXG4gICAgICAgIHNpemU6IGFPYmplY3Quc2l6ZSxcbiAgICAgICAgcGF0aDogYU9iamVjdC5fcGF0aCB8fCBhT2JqZWN0LndlYmtpdFJlbGF0aXZlUGF0aCxcbiAgICAgICAgcmVhZDogYXdhaXQgdGhpcy5fZW5jb2RlKHJlYWQsIHNlc3Npb25faWQsIGxvY2FsX3dvcmtzcGFjZSksXG4gICAgICAgIHNlZWs6IGF3YWl0IHRoaXMuX2VuY29kZShzZWVrLCBzZXNzaW9uX2lkLCBsb2NhbF93b3Jrc3BhY2UpLFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGFPYmplY3QgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlclZpZXcpIHtcbiAgICAgIGNvbnN0IGR0eXBlID0gKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18udHlwZWRBcnJheVRvRHR5cGUpKGFPYmplY3QpO1xuICAgICAgYk9iamVjdCA9IHtcbiAgICAgICAgX3J0eXBlOiBcInR5cGVkYXJyYXlcIixcbiAgICAgICAgX3J2YWx1ZTogbmV3IFVpbnQ4QXJyYXkoYU9iamVjdC5idWZmZXIpLFxuICAgICAgICBfcmR0eXBlOiBkdHlwZSxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChhT2JqZWN0IGluc3RhbmNlb2YgRGF0YVZpZXcpIHtcbiAgICAgIGJPYmplY3QgPSB7XG4gICAgICAgIF9ydHlwZTogXCJtZW1vcnl2aWV3XCIsXG4gICAgICAgIF9ydmFsdWU6IG5ldyBVaW50OEFycmF5KGFPYmplY3QuYnVmZmVyKSxcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChhT2JqZWN0IGluc3RhbmNlb2YgU2V0KSB7XG4gICAgICBiT2JqZWN0ID0ge1xuICAgICAgICBfcnR5cGU6IFwic2V0XCIsXG4gICAgICAgIF9ydmFsdWU6IGF3YWl0IHRoaXMuX2VuY29kZShcbiAgICAgICAgICBBcnJheS5mcm9tKGFPYmplY3QpLFxuICAgICAgICAgIHNlc3Npb25faWQsXG4gICAgICAgICAgbG9jYWxfd29ya3NwYWNlLFxuICAgICAgICApLFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGFPYmplY3QgaW5zdGFuY2VvZiBNYXApIHtcbiAgICAgIGJPYmplY3QgPSB7XG4gICAgICAgIF9ydHlwZTogXCJvcmRlcmVkbWFwXCIsXG4gICAgICAgIF9ydmFsdWU6IGF3YWl0IHRoaXMuX2VuY29kZShcbiAgICAgICAgICBBcnJheS5mcm9tKGFPYmplY3QpLFxuICAgICAgICAgIHNlc3Npb25faWQsXG4gICAgICAgICAgbG9jYWxfd29ya3NwYWNlLFxuICAgICAgICApLFxuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgYU9iamVjdC5jb25zdHJ1Y3RvciBpbnN0YW5jZW9mIE9iamVjdCB8fFxuICAgICAgQXJyYXkuaXNBcnJheShhT2JqZWN0KVxuICAgICkge1xuICAgICAgYk9iamVjdCA9IGlzYXJyYXkgPyBbXSA6IHt9O1xuICAgICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKGFPYmplY3QpO1xuICAgICAgZm9yIChsZXQgayBvZiBrZXlzKSB7XG4gICAgICAgIGJPYmplY3Rba10gPSBhd2FpdCB0aGlzLl9lbmNvZGUoXG4gICAgICAgICAgYU9iamVjdFtrXSxcbiAgICAgICAgICBzZXNzaW9uX2lkLFxuICAgICAgICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgYGh5cGhhLXJwYzogVW5zdXBwb3J0ZWQgZGF0YSB0eXBlOiAke2FPYmplY3R9LCB5b3UgY2FuIHJlZ2lzdGVyIGEgY3VzdG9tIGNvZGVjIHRvIGVuY29kZS9kZWNvZGUgdGhlIG9iamVjdC5gO1xuICAgIH1cblxuICAgIGlmICghYk9iamVjdCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIGVuY29kZSBvYmplY3RcIik7XG4gICAgfVxuICAgIHJldHVybiBiT2JqZWN0O1xuICB9XG5cbiAgYXN5bmMgZGVjb2RlKGFPYmplY3QpIHtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5fZGVjb2RlKGFPYmplY3QpO1xuICB9XG5cbiAgYXN5bmMgX2RlY29kZShcbiAgICBhT2JqZWN0LFxuICAgIHJlbW90ZV9wYXJlbnQsXG4gICAgbG9jYWxfcGFyZW50LFxuICAgIHJlbW90ZV93b3Jrc3BhY2UsXG4gICAgbG9jYWxfd29ya3NwYWNlLFxuICApIHtcbiAgICBpZiAoIWFPYmplY3QpIHtcbiAgICAgIHJldHVybiBhT2JqZWN0O1xuICAgIH1cbiAgICBsZXQgYk9iamVjdDtcbiAgICBpZiAoYU9iamVjdC5fcnR5cGUpIHtcbiAgICAgIGlmIChcbiAgICAgICAgdGhpcy5fY29kZWNzW2FPYmplY3QuX3J0eXBlXSAmJlxuICAgICAgICB0aGlzLl9jb2RlY3NbYU9iamVjdC5fcnR5cGVdLmRlY29kZXJcbiAgICAgICkge1xuICAgICAgICBjb25zdCB0ZW1wID0gYU9iamVjdC5fcnR5cGU7XG4gICAgICAgIGRlbGV0ZSBhT2JqZWN0Ll9ydHlwZTtcbiAgICAgICAgYU9iamVjdCA9IGF3YWl0IHRoaXMuX2RlY29kZShcbiAgICAgICAgICBhT2JqZWN0LFxuICAgICAgICAgIHJlbW90ZV9wYXJlbnQsXG4gICAgICAgICAgbG9jYWxfcGFyZW50LFxuICAgICAgICAgIHJlbW90ZV93b3Jrc3BhY2UsXG4gICAgICAgICAgbG9jYWxfd29ya3NwYWNlLFxuICAgICAgICApO1xuICAgICAgICBhT2JqZWN0Ll9ydHlwZSA9IHRlbXA7XG5cbiAgICAgICAgYk9iamVjdCA9IGF3YWl0IFByb21pc2UucmVzb2x2ZShcbiAgICAgICAgICB0aGlzLl9jb2RlY3NbYU9iamVjdC5fcnR5cGVdLmRlY29kZXIoYU9iamVjdCksXG4gICAgICAgICk7XG4gICAgICB9IGVsc2UgaWYgKGFPYmplY3QuX3J0eXBlID09PSBcIm1ldGhvZFwiKSB7XG4gICAgICAgIGJPYmplY3QgPSB0aGlzLl9nZW5lcmF0ZV9yZW1vdGVfbWV0aG9kKFxuICAgICAgICAgIGFPYmplY3QsXG4gICAgICAgICAgcmVtb3RlX3BhcmVudCxcbiAgICAgICAgICBsb2NhbF9wYXJlbnQsXG4gICAgICAgICAgcmVtb3RlX3dvcmtzcGFjZSxcbiAgICAgICAgICBsb2NhbF93b3Jrc3BhY2UsXG4gICAgICAgICk7XG4gICAgICB9IGVsc2UgaWYgKGFPYmplY3QuX3J0eXBlID09PSBcImdlbmVyYXRvclwiKSB7XG4gICAgICAgIC8vIENyZWF0ZSBhIG1ldGhvZCB0byBmZXRjaCBuZXh0IGl0ZW1zIGZyb20gdGhlIHJlbW90ZSBnZW5lcmF0b3JcbiAgICAgICAgY29uc3QgZ2VuX21ldGhvZCA9IHRoaXMuX2dlbmVyYXRlX3JlbW90ZV9tZXRob2QoXG4gICAgICAgICAgYU9iamVjdCxcbiAgICAgICAgICByZW1vdGVfcGFyZW50LFxuICAgICAgICAgIGxvY2FsX3BhcmVudCxcbiAgICAgICAgICByZW1vdGVfd29ya3NwYWNlLFxuICAgICAgICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBDcmVhdGUgYW4gYXN5bmMgZ2VuZXJhdG9yIHByb3h5XG4gICAgICAgIGFzeW5jIGZ1bmN0aW9uKiBhc3luY0dlbmVyYXRvclByb3h5KCkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5leHRfaXRlbSA9IGF3YWl0IGdlbl9tZXRob2QoKTtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBmb3IgU3RvcEl0ZXJhdGlvbiBzaWduYWxcbiAgICAgICAgICAgICAgICBpZiAobmV4dF9pdGVtICYmIG5leHRfaXRlbS5fcnR5cGUgPT09IFwic3RvcF9pdGVyYXRpb25cIikge1xuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHlpZWxkIG5leHRfaXRlbTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgaW4gZ2VuZXJhdG9yOlwiLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkVycm9yIGluIGdlbmVyYXRvcjpcIiwgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJPYmplY3QgPSBhc3luY0dlbmVyYXRvclByb3h5KCk7XG4gICAgICB9IGVsc2UgaWYgKGFPYmplY3QuX3J0eXBlID09PSBcIm5kYXJyYXlcIikge1xuICAgICAgICAvKmdsb2JhbCBuaiB0ZiovXG4gICAgICAgIC8vY3JlYXRlIGJ1aWxkIGFycmF5L3RlbnNvciBpZiB1c2VkIGluIHRoZSBwbHVnaW5cbiAgICAgICAgaWYgKHR5cGVvZiBuaiAhPT0gXCJ1bmRlZmluZWRcIiAmJiBuai5hcnJheSkge1xuICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGFPYmplY3QuX3J2YWx1ZSkpIHtcbiAgICAgICAgICAgIGFPYmplY3QuX3J2YWx1ZSA9IGFPYmplY3QuX3J2YWx1ZS5yZWR1Y2UoX2FwcGVuZEJ1ZmZlcik7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJPYmplY3QgPSBualxuICAgICAgICAgICAgLmFycmF5KG5ldyBVaW50OChhT2JqZWN0Ll9ydmFsdWUpLCBhT2JqZWN0Ll9yZHR5cGUpXG4gICAgICAgICAgICAucmVzaGFwZShhT2JqZWN0Ll9yc2hhcGUpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB0ZiAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0Zi5UZW5zb3IpIHtcbiAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShhT2JqZWN0Ll9ydmFsdWUpKSB7XG4gICAgICAgICAgICBhT2JqZWN0Ll9ydmFsdWUgPSBhT2JqZWN0Ll9ydmFsdWUucmVkdWNlKF9hcHBlbmRCdWZmZXIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBhcnJheXR5cGUgPSBfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5kdHlwZVRvVHlwZWRBcnJheVthT2JqZWN0Ll9yZHR5cGVdO1xuICAgICAgICAgIGJPYmplY3QgPSB0Zi50ZW5zb3IoXG4gICAgICAgICAgICBuZXcgYXJyYXl0eXBlKGFPYmplY3QuX3J2YWx1ZSksXG4gICAgICAgICAgICBhT2JqZWN0Ll9yc2hhcGUsXG4gICAgICAgICAgICBhT2JqZWN0Ll9yZHR5cGUsXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvL2tlZXAgaXQgYXMgcmVndWxhciBpZiB0cmFuc2ZlcmVkIHRvIHRoZSBtYWluIGFwcFxuICAgICAgICAgIGJPYmplY3QgPSBhT2JqZWN0O1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGFPYmplY3QuX3J0eXBlID09PSBcImVycm9yXCIpIHtcbiAgICAgICAgYk9iamVjdCA9IG5ldyBFcnJvcihcbiAgICAgICAgICBcIlJlbW90ZUVycm9yOiBcIiArIGFPYmplY3QuX3J2YWx1ZSArIFwiXFxuXCIgKyAoYU9iamVjdC5fcnRyYWNlIHx8IFwiXCIpLFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIGlmIChhT2JqZWN0Ll9ydHlwZSA9PT0gXCJ0eXBlZGFycmF5XCIpIHtcbiAgICAgICAgY29uc3QgYXJyYXl0eXBlID0gX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uZHR5cGVUb1R5cGVkQXJyYXlbYU9iamVjdC5fcmR0eXBlXTtcbiAgICAgICAgaWYgKCFhcnJheXR5cGUpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5zdXBwb3J0ZWQgZHR5cGU6IFwiICsgYU9iamVjdC5fcmR0eXBlKTtcbiAgICAgICAgY29uc3QgYnVmZmVyID0gYU9iamVjdC5fcnZhbHVlLmJ1ZmZlci5zbGljZShcbiAgICAgICAgICBhT2JqZWN0Ll9ydmFsdWUuYnl0ZU9mZnNldCxcbiAgICAgICAgICBhT2JqZWN0Ll9ydmFsdWUuYnl0ZU9mZnNldCArIGFPYmplY3QuX3J2YWx1ZS5ieXRlTGVuZ3RoLFxuICAgICAgICApO1xuICAgICAgICBiT2JqZWN0ID0gbmV3IGFycmF5dHlwZShidWZmZXIpO1xuICAgICAgfSBlbHNlIGlmIChhT2JqZWN0Ll9ydHlwZSA9PT0gXCJtZW1vcnl2aWV3XCIpIHtcbiAgICAgICAgYk9iamVjdCA9IGFPYmplY3QuX3J2YWx1ZS5idWZmZXIuc2xpY2UoXG4gICAgICAgICAgYU9iamVjdC5fcnZhbHVlLmJ5dGVPZmZzZXQsXG4gICAgICAgICAgYU9iamVjdC5fcnZhbHVlLmJ5dGVPZmZzZXQgKyBhT2JqZWN0Ll9ydmFsdWUuYnl0ZUxlbmd0aCxcbiAgICAgICAgKTsgLy8gQXJyYXlCdWZmZXJcbiAgICAgIH0gZWxzZSBpZiAoYU9iamVjdC5fcnR5cGUgPT09IFwiaW9zdHJlYW1cIikge1xuICAgICAgICBpZiAoYU9iamVjdC5fcm5hdGl2ZSA9PT0gXCJqczpibG9iXCIpIHtcbiAgICAgICAgICBjb25zdCByZWFkID0gYXdhaXQgdGhpcy5fZ2VuZXJhdGVfcmVtb3RlX21ldGhvZChcbiAgICAgICAgICAgIGFPYmplY3QucmVhZCxcbiAgICAgICAgICAgIHJlbW90ZV9wYXJlbnQsXG4gICAgICAgICAgICBsb2NhbF9wYXJlbnQsXG4gICAgICAgICAgICByZW1vdGVfd29ya3NwYWNlLFxuICAgICAgICAgICAgbG9jYWxfd29ya3NwYWNlLFxuICAgICAgICAgICk7XG4gICAgICAgICAgY29uc3QgYnl0ZXMgPSBhd2FpdCByZWFkKCk7XG4gICAgICAgICAgYk9iamVjdCA9IG5ldyBCbG9iKFtieXRlc10sIHtcbiAgICAgICAgICAgIHR5cGU6IGFPYmplY3QudHlwZSxcbiAgICAgICAgICAgIG5hbWU6IGFPYmplY3QubmFtZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBiT2JqZWN0ID0ge307XG4gICAgICAgICAgZm9yIChsZXQgayBvZiBPYmplY3Qua2V5cyhhT2JqZWN0KSkge1xuICAgICAgICAgICAgaWYgKCFrLnN0YXJ0c1dpdGgoXCJfXCIpKSB7XG4gICAgICAgICAgICAgIGJPYmplY3Rba10gPSBhd2FpdCB0aGlzLl9kZWNvZGUoXG4gICAgICAgICAgICAgICAgYU9iamVjdFtrXSxcbiAgICAgICAgICAgICAgICByZW1vdGVfcGFyZW50LFxuICAgICAgICAgICAgICAgIGxvY2FsX3BhcmVudCxcbiAgICAgICAgICAgICAgICByZW1vdGVfd29ya3NwYWNlLFxuICAgICAgICAgICAgICAgIGxvY2FsX3dvcmtzcGFjZSxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYk9iamVjdFtcIl9fcnBjX29iamVjdF9fXCJdID0gYU9iamVjdDtcbiAgICAgIH0gZWxzZSBpZiAoYU9iamVjdC5fcnR5cGUgPT09IFwib3JkZXJlZG1hcFwiKSB7XG4gICAgICAgIGJPYmplY3QgPSBuZXcgTWFwKFxuICAgICAgICAgIGF3YWl0IHRoaXMuX2RlY29kZShcbiAgICAgICAgICAgIGFPYmplY3QuX3J2YWx1ZSxcbiAgICAgICAgICAgIHJlbW90ZV9wYXJlbnQsXG4gICAgICAgICAgICBsb2NhbF9wYXJlbnQsXG4gICAgICAgICAgICByZW1vdGVfd29ya3NwYWNlLFxuICAgICAgICAgICAgbG9jYWxfd29ya3NwYWNlLFxuICAgICAgICAgICksXG4gICAgICAgICk7XG4gICAgICB9IGVsc2UgaWYgKGFPYmplY3QuX3J0eXBlID09PSBcInNldFwiKSB7XG4gICAgICAgIGJPYmplY3QgPSBuZXcgU2V0KFxuICAgICAgICAgIGF3YWl0IHRoaXMuX2RlY29kZShcbiAgICAgICAgICAgIGFPYmplY3QuX3J2YWx1ZSxcbiAgICAgICAgICAgIHJlbW90ZV9wYXJlbnQsXG4gICAgICAgICAgICBsb2NhbF9wYXJlbnQsXG4gICAgICAgICAgICByZW1vdGVfd29ya3NwYWNlLFxuICAgICAgICAgICAgbG9jYWxfd29ya3NwYWNlLFxuICAgICAgICAgICksXG4gICAgICAgICk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB0ZW1wID0gYU9iamVjdC5fcnR5cGU7XG4gICAgICAgIGRlbGV0ZSBhT2JqZWN0Ll9ydHlwZTtcbiAgICAgICAgYk9iamVjdCA9IGF3YWl0IHRoaXMuX2RlY29kZShcbiAgICAgICAgICBhT2JqZWN0LFxuICAgICAgICAgIHJlbW90ZV9wYXJlbnQsXG4gICAgICAgICAgbG9jYWxfcGFyZW50LFxuICAgICAgICAgIHJlbW90ZV93b3Jrc3BhY2UsXG4gICAgICAgICAgbG9jYWxfd29ya3NwYWNlLFxuICAgICAgICApO1xuICAgICAgICBiT2JqZWN0Ll9ydHlwZSA9IHRlbXA7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChhT2JqZWN0LmNvbnN0cnVjdG9yID09PSBPYmplY3QgfHwgQXJyYXkuaXNBcnJheShhT2JqZWN0KSkge1xuICAgICAgY29uc3QgaXNhcnJheSA9IEFycmF5LmlzQXJyYXkoYU9iamVjdCk7XG4gICAgICBiT2JqZWN0ID0gaXNhcnJheSA/IFtdIDoge307XG4gICAgICBmb3IgKGxldCBrIG9mIE9iamVjdC5rZXlzKGFPYmplY3QpKSB7XG4gICAgICAgIGlmIChpc2FycmF5IHx8IGFPYmplY3QuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICBjb25zdCB2ID0gYU9iamVjdFtrXTtcbiAgICAgICAgICBiT2JqZWN0W2tdID0gYXdhaXQgdGhpcy5fZGVjb2RlKFxuICAgICAgICAgICAgdixcbiAgICAgICAgICAgIHJlbW90ZV9wYXJlbnQsXG4gICAgICAgICAgICBsb2NhbF9wYXJlbnQsXG4gICAgICAgICAgICByZW1vdGVfd29ya3NwYWNlLFxuICAgICAgICAgICAgbG9jYWxfd29ya3NwYWNlLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYk9iamVjdCA9IGFPYmplY3Q7XG4gICAgfVxuICAgIGlmIChiT2JqZWN0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkZhaWxlZCB0byBkZWNvZGUgb2JqZWN0XCIpO1xuICAgIH1cbiAgICByZXR1cm4gYk9iamVjdDtcbiAgfVxuXG4gIF9leHBhbmRfcHJvbWlzZShkYXRhKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGhlYXJ0YmVhdDoge1xuICAgICAgICBfcnR5cGU6IFwibWV0aG9kXCIsXG4gICAgICAgIF9ydGFyZ2V0OiBkYXRhLmZyb20uc3BsaXQoXCIvXCIpWzFdLFxuICAgICAgICBfcm1ldGhvZDogZGF0YS5zZXNzaW9uICsgXCIuaGVhcnRiZWF0XCIsXG4gICAgICAgIF9yZG9jOiBgaGVhcnRiZWF0IGNhbGxiYWNrIGZvciBtZXRob2Q6ICR7ZGF0YS5tZXRob2R9YCxcbiAgICAgIH0sXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIF9ydHlwZTogXCJtZXRob2RcIixcbiAgICAgICAgX3J0YXJnZXQ6IGRhdGEuZnJvbS5zcGxpdChcIi9cIilbMV0sXG4gICAgICAgIF9ybWV0aG9kOiBkYXRhLnNlc3Npb24gKyBcIi5yZXNvbHZlXCIsXG4gICAgICAgIF9yZG9jOiBgcmVzb2x2ZSBjYWxsYmFjayBmb3IgbWV0aG9kOiAke2RhdGEubWV0aG9kfWAsXG4gICAgICB9LFxuICAgICAgcmVqZWN0OiB7XG4gICAgICAgIF9ydHlwZTogXCJtZXRob2RcIixcbiAgICAgICAgX3J0YXJnZXQ6IGRhdGEuZnJvbS5zcGxpdChcIi9cIilbMV0sXG4gICAgICAgIF9ybWV0aG9kOiBkYXRhLnNlc3Npb24gKyBcIi5yZWplY3RcIixcbiAgICAgICAgX3Jkb2M6IGByZWplY3QgY2FsbGJhY2sgZm9yIG1ldGhvZDogJHtkYXRhLm1ldGhvZH1gLFxuICAgICAgfSxcbiAgICAgIGludGVydmFsOiBkYXRhLnQsXG4gICAgfTtcbiAgfVxufVxuXG5cbi8qKiovIH0pLFxuXG4vKioqLyBcIi4vc3JjL3V0aWxzL2luZGV4LmpzXCI6XG4vKiEqKioqKioqKioqKioqKioqKioqKioqKioqKioqISpcXFxuICAhKioqIC4vc3JjL3V0aWxzL2luZGV4LmpzICoqKiFcbiAgXFwqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuLyoqKi8gKChfX3VudXNlZF93ZWJwYWNrX21vZHVsZSwgX193ZWJwYWNrX2V4cG9ydHNfXywgX193ZWJwYWNrX3JlcXVpcmVfXykgPT4ge1xuXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIoX193ZWJwYWNrX2V4cG9ydHNfXyk7XG4vKiBoYXJtb255IGV4cG9ydCAqLyBfX3dlYnBhY2tfcmVxdWlyZV9fLmQoX193ZWJwYWNrX2V4cG9ydHNfXywge1xuLyogaGFybW9ueSBleHBvcnQgKi8gICBNZXNzYWdlRW1pdHRlcjogKCkgPT4gKC8qIGJpbmRpbmcgKi8gTWVzc2FnZUVtaXR0ZXIpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBTZW1hcGhvcmU6ICgpID0+ICgvKiBiaW5kaW5nICovIFNlbWFwaG9yZSksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIGFzc2VydDogKCkgPT4gKC8qIGJpbmRpbmcgKi8gYXNzZXJ0KSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgY2FjaGVSZXF1aXJlbWVudHM6ICgpID0+ICgvKiBiaW5kaW5nICovIGNhY2hlUmVxdWlyZW1lbnRzKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgY29udmVydENhc2U6ICgpID0+ICgvKiBiaW5kaW5nICovIGNvbnZlcnRDYXNlKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgZHR5cGVUb1R5cGVkQXJyYXk6ICgpID0+ICgvKiBiaW5kaW5nICovIGR0eXBlVG9UeXBlZEFycmF5KSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgZXhwYW5kS3dhcmdzOiAoKSA9PiAoLyogYmluZGluZyAqLyBleHBhbmRLd2FyZ3MpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBpc0FzeW5jR2VuZXJhdG9yOiAoKSA9PiAoLyogYmluZGluZyAqLyBpc0FzeW5jR2VuZXJhdG9yKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgaXNHZW5lcmF0b3I6ICgpID0+ICgvKiBiaW5kaW5nICovIGlzR2VuZXJhdG9yKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgbG9hZFJlcXVpcmVtZW50czogKCkgPT4gKC8qIGJpbmRpbmcgKi8gbG9hZFJlcXVpcmVtZW50cyksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIGxvYWRSZXF1aXJlbWVudHNJbldlYndvcmtlcjogKCkgPT4gKC8qIGJpbmRpbmcgKi8gbG9hZFJlcXVpcmVtZW50c0luV2Vid29ya2VyKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgbG9hZFJlcXVpcmVtZW50c0luV2luZG93OiAoKSA9PiAoLyogYmluZGluZyAqLyBsb2FkUmVxdWlyZW1lbnRzSW5XaW5kb3cpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBub3JtYWxpemVDb25maWc6ICgpID0+ICgvKiBiaW5kaW5nICovIG5vcm1hbGl6ZUNvbmZpZyksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIHBhcnNlU2VydmljZVVybDogKCkgPT4gKC8qIGJpbmRpbmcgKi8gcGFyc2VTZXJ2aWNlVXJsKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgcmFuZElkOiAoKSA9PiAoLyogYmluZGluZyAqLyByYW5kSWQpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICB0b0NhbWVsQ2FzZTogKCkgPT4gKC8qIGJpbmRpbmcgKi8gdG9DYW1lbENhc2UpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICB0b1NuYWtlQ2FzZTogKCkgPT4gKC8qIGJpbmRpbmcgKi8gdG9TbmFrZUNhc2UpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICB0eXBlZEFycmF5VG9EdHlwZTogKCkgPT4gKC8qIGJpbmRpbmcgKi8gdHlwZWRBcnJheVRvRHR5cGUpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICB0eXBlZEFycmF5VG9EdHlwZU1hcHBpbmc6ICgpID0+ICgvKiBiaW5kaW5nICovIHR5cGVkQXJyYXlUb0R0eXBlTWFwcGluZyksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIHVybEpvaW46ICgpID0+ICgvKiBiaW5kaW5nICovIHVybEpvaW4pLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICB3YWl0Rm9yOiAoKSA9PiAoLyogYmluZGluZyAqLyB3YWl0Rm9yKVxuLyogaGFybW9ueSBleHBvcnQgKi8gfSk7XG5mdW5jdGlvbiByYW5kSWQoKSB7XG4gIHJldHVybiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgMTApICsgbmV3IERhdGUoKS5nZXRUaW1lKCk7XG59XG5cbmZ1bmN0aW9uIHRvQ2FtZWxDYXNlKHN0cikge1xuICAvLyBDaGVjayBpZiB0aGUgc3RyaW5nIGlzIGFscmVhZHkgaW4gY2FtZWxDYXNlXG4gIGlmICghc3RyLmluY2x1ZGVzKFwiX1wiKSkge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbiAgLy8gQ29udmVydCBmcm9tIHNuYWtlX2Nhc2UgdG8gY2FtZWxDYXNlXG4gIHJldHVybiBzdHIucmVwbGFjZSgvXy4vZywgKG1hdGNoKSA9PiBtYXRjaFsxXS50b1VwcGVyQ2FzZSgpKTtcbn1cblxuZnVuY3Rpb24gdG9TbmFrZUNhc2Uoc3RyKSB7XG4gIC8vIENvbnZlcnQgZnJvbSBjYW1lbENhc2UgdG8gc25ha2VfY2FzZVxuICByZXR1cm4gc3RyLnJlcGxhY2UoLyhbQS1aXSkvZywgXCJfJDFcIikudG9Mb3dlckNhc2UoKTtcbn1cblxuZnVuY3Rpb24gZXhwYW5kS3dhcmdzKG9iaikge1xuICBpZiAodHlwZW9mIG9iaiAhPT0gXCJvYmplY3RcIiB8fCBvYmogPT09IG51bGwpIHtcbiAgICByZXR1cm4gb2JqOyAvLyBSZXR1cm4gdGhlIHZhbHVlIGlmIG9iaiBpcyBub3QgYW4gb2JqZWN0XG4gIH1cblxuICBjb25zdCBuZXdPYmogPSBBcnJheS5pc0FycmF5KG9iaikgPyBbXSA6IHt9O1xuXG4gIGZvciAoY29uc3Qga2V5IGluIG9iaikge1xuICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgY29uc3QgdmFsdWUgPSBvYmpba2V5XTtcblxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIG5ld09ialtrZXldID0gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICBpZiAoYXJncy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRnVuY3Rpb24gXCIke2tleX1cIiBleHBlY3RzIGF0IGxlYXN0IG9uZSBhcmd1bWVudC5gKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgbGFzdCBhcmd1bWVudCBpcyBhbiBvYmplY3RcbiAgICAgICAgICBjb25zdCBsYXN0QXJnID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgIGxldCBrd2FyZ3MgPSB7fTtcblxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIHR5cGVvZiBsYXN0QXJnID09PSBcIm9iamVjdFwiICYmXG4gICAgICAgICAgICBsYXN0QXJnICE9PSBudWxsICYmXG4gICAgICAgICAgICAhQXJyYXkuaXNBcnJheShsYXN0QXJnKVxuICAgICAgICAgICkge1xuICAgICAgICAgICAgLy8gRXh0cmFjdCBrd2FyZ3MgZnJvbSB0aGUgbGFzdCBhcmd1bWVudFxuICAgICAgICAgICAga3dhcmdzID0geyAuLi5sYXN0QXJnLCBfcmt3YXJnOiB0cnVlIH07XG4gICAgICAgICAgICBhcmdzID0gYXJncy5zbGljZSgwLCAtMSk7IC8vIFJlbW92ZSB0aGUgbGFzdCBhcmd1bWVudCBmcm9tIGFyZ3NcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBDYWxsIHRoZSBvcmlnaW5hbCBmdW5jdGlvbiB3aXRoIHBvc2l0aW9uYWwgYXJncyBmb2xsb3dlZCBieSBrd2FyZ3NcbiAgICAgICAgICByZXR1cm4gdmFsdWUoLi4uYXJncywga3dhcmdzKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBQcmVzZXJ2ZSBtZXRhZGF0YSBsaWtlIF9fbmFtZV9fIGFuZCBfX3NjaGVtYV9fXG4gICAgICAgIG5ld09ialtrZXldLl9fbmFtZV9fID0ga2V5O1xuICAgICAgICBpZiAodmFsdWUuX19zY2hlbWFfXykge1xuICAgICAgICAgIG5ld09ialtrZXldLl9fc2NoZW1hX18gPSB7IC4uLnZhbHVlLl9fc2NoZW1hX18gfTtcbiAgICAgICAgICBuZXdPYmpba2V5XS5fX3NjaGVtYV9fLm5hbWUgPSBrZXk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5ld09ialtrZXldID0gZXhwYW5kS3dhcmdzKHZhbHVlKTsgLy8gUmVjdXJzaXZlbHkgcHJvY2VzcyBuZXN0ZWQgb2JqZWN0c1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXdPYmo7XG59XG5cbmZ1bmN0aW9uIGNvbnZlcnRDYXNlKG9iaiwgY2FzZVR5cGUpIHtcbiAgaWYgKHR5cGVvZiBvYmogIT09IFwib2JqZWN0XCIgfHwgb2JqID09PSBudWxsIHx8ICFjYXNlVHlwZSkge1xuICAgIHJldHVybiBvYmo7IC8vIFJldHVybiB0aGUgdmFsdWUgaWYgb2JqIGlzIG5vdCBhbiBvYmplY3RcbiAgfVxuXG4gIGNvbnN0IG5ld09iaiA9IEFycmF5LmlzQXJyYXkob2JqKSA/IFtdIDoge307XG5cbiAgZm9yIChjb25zdCBrZXkgaW4gb2JqKSB7XG4gICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IG9ialtrZXldO1xuICAgICAgY29uc3QgY2FtZWxLZXkgPSB0b0NhbWVsQ2FzZShrZXkpO1xuICAgICAgY29uc3Qgc25ha2VLZXkgPSB0b1NuYWtlQ2FzZShrZXkpO1xuXG4gICAgICBpZiAoY2FzZVR5cGUgPT09IFwiY2FtZWxcIikge1xuICAgICAgICBuZXdPYmpbY2FtZWxLZXldID0gY29udmVydENhc2UodmFsdWUsIGNhc2VUeXBlKTtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgbmV3T2JqW2NhbWVsS2V5XS5fX25hbWVfXyA9IGNhbWVsS2V5O1xuICAgICAgICAgIGlmICh2YWx1ZS5fX3NjaGVtYV9fKSB7XG4gICAgICAgICAgICBuZXdPYmpbY2FtZWxLZXldLl9fc2NoZW1hX18gPSB7IC4uLnZhbHVlLl9fc2NoZW1hX18gfTtcbiAgICAgICAgICAgIG5ld09ialtjYW1lbEtleV0uX19zY2hlbWFfXy5uYW1lID0gY2FtZWxLZXk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGNhc2VUeXBlID09PSBcInNuYWtlXCIpIHtcbiAgICAgICAgbmV3T2JqW3NuYWtlS2V5XSA9IGNvbnZlcnRDYXNlKHZhbHVlLCBjYXNlVHlwZSk7XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgIG5ld09ialtzbmFrZUtleV0uX19uYW1lX18gPSBzbmFrZUtleTtcbiAgICAgICAgICBpZiAodmFsdWUuX19zY2hlbWFfXykge1xuICAgICAgICAgICAgbmV3T2JqW3NuYWtlS2V5XS5fX3NjaGVtYV9fID0geyAuLi52YWx1ZS5fX3NjaGVtYV9fIH07XG4gICAgICAgICAgICBuZXdPYmpbc25ha2VLZXldLl9fc2NoZW1hX18ubmFtZSA9IHNuYWtlS2V5O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVE9ETyBoYW5kbGUgc2NoZW1hIGZvciBjYW1lbCArIHNuYWtlXG4gICAgICAgIGlmIChjYXNlVHlwZS5pbmNsdWRlcyhcImNhbWVsXCIpKSB7XG4gICAgICAgICAgbmV3T2JqW2NhbWVsS2V5XSA9IGNvbnZlcnRDYXNlKHZhbHVlLCBcImNhbWVsXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjYXNlVHlwZS5pbmNsdWRlcyhcInNuYWtlXCIpKSB7XG4gICAgICAgICAgbmV3T2JqW3NuYWtlS2V5XSA9IGNvbnZlcnRDYXNlKHZhbHVlLCBcInNuYWtlXCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ld09iajtcbn1cblxuZnVuY3Rpb24gcGFyc2VTZXJ2aWNlVXJsKHVybCkge1xuICAvLyBFbnN1cmUgbm8gdHJhaWxpbmcgc2xhc2hcbiAgdXJsID0gdXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKTtcblxuICAvLyBSZWdleCBwYXR0ZXJuIHRvIG1hdGNoIHRoZSBVUkwgc3RydWN0dXJlXG4gIGNvbnN0IHBhdHRlcm4gPSBuZXcgUmVnRXhwKFxuICAgIFwiXihodHRwcz86XFxcXC9cXFxcL1teL10rKVwiICsgLy8gc2VydmVyX3VybCAoaHR0cCBvciBodHRwcyBmb2xsb3dlZCBieSBkb21haW4pXG4gICAgICBcIlxcXFwvKFthLXowLTlfLV0rKVwiICsgLy8gd29ya3NwYWNlIChsb3dlcmNhc2UgbGV0dGVycywgbnVtYmVycywgLSBvciBfKVxuICAgICAgXCJcXFxcL3NlcnZpY2VzXFxcXC9cIiArIC8vIHN0YXRpYyBwYXJ0IG9mIHRoZSBVUkxcbiAgICAgIFwiKD86KD88Y2xpZW50SWQ+W2EtekEtWjAtOV8tXSspOik/XCIgKyAvLyBvcHRpb25hbCBjbGllbnRfaWRcbiAgICAgIFwiKD88c2VydmljZUlkPlthLXpBLVowLTlfLV0rKVwiICsgLy8gc2VydmljZV9pZFxuICAgICAgXCIoPzpAKD88YXBwSWQ+W2EtekEtWjAtOV8tXSspKT9cIiwgLy8gb3B0aW9uYWwgYXBwX2lkXG4gICk7XG5cbiAgY29uc3QgbWF0Y2ggPSB1cmwubWF0Y2gocGF0dGVybik7XG4gIGlmICghbWF0Y2gpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJVUkwgZG9lcyBub3QgbWF0Y2ggdGhlIGV4cGVjdGVkIHBhdHRlcm5cIik7XG4gIH1cblxuICBjb25zdCBzZXJ2ZXJVcmwgPSBtYXRjaFsxXTtcbiAgY29uc3Qgd29ya3NwYWNlID0gbWF0Y2hbMl07XG4gIGNvbnN0IGNsaWVudElkID0gbWF0Y2guZ3JvdXBzPy5jbGllbnRJZCB8fCBcIipcIjtcbiAgY29uc3Qgc2VydmljZUlkID0gbWF0Y2guZ3JvdXBzPy5zZXJ2aWNlSWQ7XG4gIGNvbnN0IGFwcElkID0gbWF0Y2guZ3JvdXBzPy5hcHBJZCB8fCBcIipcIjtcblxuICByZXR1cm4geyBzZXJ2ZXJVcmwsIHdvcmtzcGFjZSwgY2xpZW50SWQsIHNlcnZpY2VJZCwgYXBwSWQgfTtcbn1cblxuY29uc3QgZHR5cGVUb1R5cGVkQXJyYXkgPSB7XG4gIGludDg6IEludDhBcnJheSxcbiAgaW50MTY6IEludDE2QXJyYXksXG4gIGludDMyOiBJbnQzMkFycmF5LFxuICB1aW50ODogVWludDhBcnJheSxcbiAgdWludDE2OiBVaW50MTZBcnJheSxcbiAgdWludDMyOiBVaW50MzJBcnJheSxcbiAgZmxvYXQzMjogRmxvYXQzMkFycmF5LFxuICBmbG9hdDY0OiBGbG9hdDY0QXJyYXksXG4gIGFycmF5OiBBcnJheSxcbn07XG5cbmFzeW5jIGZ1bmN0aW9uIGxvYWRSZXF1aXJlbWVudHNJbldpbmRvdyhyZXF1aXJlbWVudHMpIHtcbiAgZnVuY3Rpb24gX2ltcG9ydFNjcmlwdCh1cmwpIHtcbiAgICAvL3VybCBpcyBVUkwgb2YgZXh0ZXJuYWwgZmlsZSwgaW1wbGVtZW50YXRpb25Db2RlIGlzIHRoZSBjb2RlXG4gICAgLy90byBiZSBjYWxsZWQgZnJvbSB0aGUgZmlsZSwgbG9jYXRpb24gaXMgdGhlIGxvY2F0aW9uIHRvXG4gICAgLy9pbnNlcnQgdGhlIDxzY3JpcHQ+IGVsZW1lbnRcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdmFyIHNjcmlwdFRhZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XG4gICAgICBzY3JpcHRUYWcuc3JjID0gdXJsO1xuICAgICAgc2NyaXB0VGFnLnR5cGUgPSBcInRleHQvamF2YXNjcmlwdFwiO1xuICAgICAgc2NyaXB0VGFnLm9ubG9hZCA9IHJlc29sdmU7XG4gICAgICBzY3JpcHRUYWcub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09PSBcImxvYWRlZFwiIHx8IHRoaXMucmVhZHlTdGF0ZSA9PT0gXCJjb21wbGV0ZVwiKSB7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgc2NyaXB0VGFnLm9uZXJyb3IgPSByZWplY3Q7XG4gICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHNjcmlwdFRhZyk7XG4gICAgfSk7XG4gIH1cblxuICAvLyBzdXBwb3J0IGltcG9ydFNjcmlwdHMgb3V0c2lkZSB3ZWIgd29ya2VyXG4gIGFzeW5jIGZ1bmN0aW9uIGltcG9ydFNjcmlwdHMoKSB7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLFxuICAgICAgbGVuID0gYXJncy5sZW5ndGgsXG4gICAgICBpID0gMDtcbiAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBhd2FpdCBfaW1wb3J0U2NyaXB0KGFyZ3NbaV0pO1xuICAgIH1cbiAgfVxuXG4gIGlmIChcbiAgICByZXF1aXJlbWVudHMgJiZcbiAgICAoQXJyYXkuaXNBcnJheShyZXF1aXJlbWVudHMpIHx8IHR5cGVvZiByZXF1aXJlbWVudHMgPT09IFwic3RyaW5nXCIpXG4gICkge1xuICAgIHRyeSB7XG4gICAgICB2YXIgbGlua19ub2RlO1xuICAgICAgcmVxdWlyZW1lbnRzID1cbiAgICAgICAgdHlwZW9mIHJlcXVpcmVtZW50cyA9PT0gXCJzdHJpbmdcIiA/IFtyZXF1aXJlbWVudHNdIDogcmVxdWlyZW1lbnRzO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVxdWlyZW1lbnRzKSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJlcXVpcmVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgIHJlcXVpcmVtZW50c1tpXS50b0xvd2VyQ2FzZSgpLmVuZHNXaXRoKFwiLmNzc1wiKSB8fFxuICAgICAgICAgICAgcmVxdWlyZW1lbnRzW2ldLnN0YXJ0c1dpdGgoXCJjc3M6XCIpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBpZiAocmVxdWlyZW1lbnRzW2ldLnN0YXJ0c1dpdGgoXCJjc3M6XCIpKSB7XG4gICAgICAgICAgICAgIHJlcXVpcmVtZW50c1tpXSA9IHJlcXVpcmVtZW50c1tpXS5zbGljZSg0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxpbmtfbm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJsaW5rXCIpO1xuICAgICAgICAgICAgbGlua19ub2RlLnJlbCA9IFwic3R5bGVzaGVldFwiO1xuICAgICAgICAgICAgbGlua19ub2RlLmhyZWYgPSByZXF1aXJlbWVudHNbaV07XG4gICAgICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKGxpbmtfbm9kZSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgIHJlcXVpcmVtZW50c1tpXS50b0xvd2VyQ2FzZSgpLmVuZHNXaXRoKFwiLm1qc1wiKSB8fFxuICAgICAgICAgICAgcmVxdWlyZW1lbnRzW2ldLnN0YXJ0c1dpdGgoXCJtanM6XCIpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICAvLyBpbXBvcnQgZXNtb2R1bGVcbiAgICAgICAgICAgIGlmIChyZXF1aXJlbWVudHNbaV0uc3RhcnRzV2l0aChcIm1qczpcIikpIHtcbiAgICAgICAgICAgICAgcmVxdWlyZW1lbnRzW2ldID0gcmVxdWlyZW1lbnRzW2ldLnNsaWNlKDQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYXdhaXQgaW1wb3J0KC8qIHdlYnBhY2tJZ25vcmU6IHRydWUgKi8gcmVxdWlyZW1lbnRzW2ldKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICAgcmVxdWlyZW1lbnRzW2ldLnRvTG93ZXJDYXNlKCkuZW5kc1dpdGgoXCIuanNcIikgfHxcbiAgICAgICAgICAgIHJlcXVpcmVtZW50c1tpXS5zdGFydHNXaXRoKFwianM6XCIpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICBpZiAocmVxdWlyZW1lbnRzW2ldLnN0YXJ0c1dpdGgoXCJqczpcIikpIHtcbiAgICAgICAgICAgICAgcmVxdWlyZW1lbnRzW2ldID0gcmVxdWlyZW1lbnRzW2ldLnNsaWNlKDMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYXdhaXQgaW1wb3J0U2NyaXB0cyhyZXF1aXJlbWVudHNbaV0pO1xuICAgICAgICAgIH0gZWxzZSBpZiAocmVxdWlyZW1lbnRzW2ldLnN0YXJ0c1dpdGgoXCJodHRwXCIpKSB7XG4gICAgICAgICAgICBhd2FpdCBpbXBvcnRTY3JpcHRzKHJlcXVpcmVtZW50c1tpXSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChyZXF1aXJlbWVudHNbaV0uc3RhcnRzV2l0aChcImNhY2hlOlwiKSkge1xuICAgICAgICAgICAgLy9pZ25vcmUgY2FjaGVcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJVbnByb2Nlc3NlZCByZXF1aXJlbWVudHMgdXJsOiBcIiArIHJlcXVpcmVtZW50c1tpXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBcInVuc3VwcG9ydGVkIHJlcXVpcmVtZW50cyBkZWZpbml0aW9uXCI7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdGhyb3cgXCJmYWlsZWQgdG8gaW1wb3J0IHJlcXVpcmVkIHNjcmlwdHM6IFwiICsgcmVxdWlyZW1lbnRzLnRvU3RyaW5nKCk7XG4gICAgfVxuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxvYWRSZXF1aXJlbWVudHNJbldlYndvcmtlcihyZXF1aXJlbWVudHMpIHtcbiAgaWYgKFxuICAgIHJlcXVpcmVtZW50cyAmJlxuICAgIChBcnJheS5pc0FycmF5KHJlcXVpcmVtZW50cykgfHwgdHlwZW9mIHJlcXVpcmVtZW50cyA9PT0gXCJzdHJpbmdcIilcbiAgKSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmICghQXJyYXkuaXNBcnJheShyZXF1aXJlbWVudHMpKSB7XG4gICAgICAgIHJlcXVpcmVtZW50cyA9IFtyZXF1aXJlbWVudHNdO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXF1aXJlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHJlcXVpcmVtZW50c1tpXS50b0xvd2VyQ2FzZSgpLmVuZHNXaXRoKFwiLmNzc1wiKSB8fFxuICAgICAgICAgIHJlcXVpcmVtZW50c1tpXS5zdGFydHNXaXRoKFwiY3NzOlwiKVxuICAgICAgICApIHtcbiAgICAgICAgICB0aHJvdyBcInVuYWJsZSB0byBpbXBvcnQgY3NzIGluIGEgd2Vid29ya2VyXCI7XG4gICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgcmVxdWlyZW1lbnRzW2ldLnRvTG93ZXJDYXNlKCkuZW5kc1dpdGgoXCIuanNcIikgfHxcbiAgICAgICAgICByZXF1aXJlbWVudHNbaV0uc3RhcnRzV2l0aChcImpzOlwiKVxuICAgICAgICApIHtcbiAgICAgICAgICBpZiAocmVxdWlyZW1lbnRzW2ldLnN0YXJ0c1dpdGgoXCJqczpcIikpIHtcbiAgICAgICAgICAgIHJlcXVpcmVtZW50c1tpXSA9IHJlcXVpcmVtZW50c1tpXS5zbGljZSgzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaW1wb3J0U2NyaXB0cyhyZXF1aXJlbWVudHNbaV0pO1xuICAgICAgICB9IGVsc2UgaWYgKHJlcXVpcmVtZW50c1tpXS5zdGFydHNXaXRoKFwiaHR0cFwiKSkge1xuICAgICAgICAgIGltcG9ydFNjcmlwdHMocmVxdWlyZW1lbnRzW2ldKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZXF1aXJlbWVudHNbaV0uc3RhcnRzV2l0aChcImNhY2hlOlwiKSkge1xuICAgICAgICAgIC8vaWdub3JlIGNhY2hlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJVbnByb2Nlc3NlZCByZXF1aXJlbWVudHMgdXJsOiBcIiArIHJlcXVpcmVtZW50c1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0aHJvdyBcImZhaWxlZCB0byBpbXBvcnQgcmVxdWlyZWQgc2NyaXB0czogXCIgKyByZXF1aXJlbWVudHMudG9TdHJpbmcoKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbG9hZFJlcXVpcmVtZW50cyhyZXF1aXJlbWVudHMpIHtcbiAgaWYgKFxuICAgIHR5cGVvZiBXb3JrZXJHbG9iYWxTY29wZSAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgIHNlbGYgaW5zdGFuY2VvZiBXb3JrZXJHbG9iYWxTY29wZVxuICApIHtcbiAgICByZXR1cm4gbG9hZFJlcXVpcmVtZW50c0luV2Vid29ya2VyKHJlcXVpcmVtZW50cyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGxvYWRSZXF1aXJlbWVudHNJbldpbmRvdyhyZXF1aXJlbWVudHMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUNvbmZpZyhjb25maWcpIHtcbiAgY29uZmlnLnZlcnNpb24gPSBjb25maWcudmVyc2lvbiB8fCBcIjAuMS4wXCI7XG4gIGNvbmZpZy5kZXNjcmlwdGlvbiA9XG4gICAgY29uZmlnLmRlc2NyaXB0aW9uIHx8IGBbVE9ETzogYWRkIGRlc2NyaXB0aW9uIGZvciAke2NvbmZpZy5uYW1lfSBdYDtcbiAgY29uZmlnLnR5cGUgPSBjb25maWcudHlwZSB8fCBcInJwYy13aW5kb3dcIjtcbiAgY29uZmlnLmlkID0gY29uZmlnLmlkIHx8IHJhbmRJZCgpO1xuICBjb25maWcudGFyZ2V0X29yaWdpbiA9IGNvbmZpZy50YXJnZXRfb3JpZ2luIHx8IFwiKlwiO1xuICBjb25maWcuYWxsb3dfZXhlY3V0aW9uID0gY29uZmlnLmFsbG93X2V4ZWN1dGlvbiB8fCBmYWxzZTtcbiAgLy8gcmVtb3ZlIGZ1bmN0aW9uc1xuICBjb25maWcgPSBPYmplY3Qua2V5cyhjb25maWcpLnJlZHVjZSgocCwgYykgPT4ge1xuICAgIGlmICh0eXBlb2YgY29uZmlnW2NdICE9PSBcImZ1bmN0aW9uXCIpIHBbY10gPSBjb25maWdbY107XG4gICAgcmV0dXJuIHA7XG4gIH0sIHt9KTtcbiAgcmV0dXJuIGNvbmZpZztcbn1cbmNvbnN0IHR5cGVkQXJyYXlUb0R0eXBlTWFwcGluZyA9IHtcbiAgSW50OEFycmF5OiBcImludDhcIixcbiAgSW50MTZBcnJheTogXCJpbnQxNlwiLFxuICBJbnQzMkFycmF5OiBcImludDMyXCIsXG4gIFVpbnQ4QXJyYXk6IFwidWludDhcIixcbiAgVWludDE2QXJyYXk6IFwidWludDE2XCIsXG4gIFVpbnQzMkFycmF5OiBcInVpbnQzMlwiLFxuICBGbG9hdDMyQXJyYXk6IFwiZmxvYXQzMlwiLFxuICBGbG9hdDY0QXJyYXk6IFwiZmxvYXQ2NFwiLFxuICBBcnJheTogXCJhcnJheVwiLFxufTtcblxuY29uc3QgdHlwZWRBcnJheVRvRHR5cGVLZXlzID0gW107XG5mb3IgKGNvbnN0IGFyclR5cGUgb2YgT2JqZWN0LmtleXModHlwZWRBcnJheVRvRHR5cGVNYXBwaW5nKSkge1xuICB0eXBlZEFycmF5VG9EdHlwZUtleXMucHVzaChldmFsKGFyclR5cGUpKTtcbn1cblxuZnVuY3Rpb24gdHlwZWRBcnJheVRvRHR5cGUob2JqKSB7XG4gIGxldCBkdHlwZSA9IHR5cGVkQXJyYXlUb0R0eXBlTWFwcGluZ1tvYmouY29uc3RydWN0b3IubmFtZV07XG4gIGlmICghZHR5cGUpIHtcbiAgICBjb25zdCBwdCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmopO1xuICAgIGZvciAoY29uc3QgYXJyVHlwZSBvZiB0eXBlZEFycmF5VG9EdHlwZUtleXMpIHtcbiAgICAgIGlmIChwdCBpbnN0YW5jZW9mIGFyclR5cGUpIHtcbiAgICAgICAgZHR5cGUgPSB0eXBlZEFycmF5VG9EdHlwZU1hcHBpbmdbYXJyVHlwZS5uYW1lXTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBkdHlwZTtcbn1cblxuZnVuY3Rpb24gY2FjaGVVcmxJblNlcnZpY2VXb3JrZXIodXJsKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IHtcbiAgICAgIGNvbW1hbmQ6IFwiYWRkXCIsXG4gICAgICB1cmw6IHVybCxcbiAgICB9O1xuICAgIGlmICghbmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIgfHwgIW5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKSB7XG4gICAgICByZWplY3QoXCJTZXJ2aWNlIHdvcmtlciBpcyBub3Qgc3VwcG9ydGVkLlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgbWVzc2FnZUNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICBtZXNzYWdlQ2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgIGlmIChldmVudC5kYXRhICYmIGV2ZW50LmRhdGEuZXJyb3IpIHtcbiAgICAgICAgcmVqZWN0KGV2ZW50LmRhdGEuZXJyb3IpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZShldmVudC5kYXRhICYmIGV2ZW50LmRhdGEucmVzdWx0KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyICYmIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLmNvbnRyb2xsZXIpIHtcbiAgICAgIG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLmNvbnRyb2xsZXIucG9zdE1lc3NhZ2UobWVzc2FnZSwgW1xuICAgICAgICBtZXNzYWdlQ2hhbm5lbC5wb3J0MixcbiAgICAgIF0pO1xuICAgIH0gZWxzZSB7XG4gICAgICByZWplY3QoXCJTZXJ2aWNlIHdvcmtlciBjb250cm9sbGVyIGlzIG5vdCBhdmFpbGFibGVcIik7XG4gICAgfVxuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY2FjaGVSZXF1aXJlbWVudHMocmVxdWlyZW1lbnRzKSB7XG4gIHJlcXVpcmVtZW50cyA9IHJlcXVpcmVtZW50cyB8fCBbXTtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHJlcXVpcmVtZW50cykpIHtcbiAgICByZXF1aXJlbWVudHMgPSBbcmVxdWlyZW1lbnRzXTtcbiAgfVxuICBmb3IgKGxldCByZXEgb2YgcmVxdWlyZW1lbnRzKSB7XG4gICAgLy9yZW1vdmUgcHJlZml4XG4gICAgaWYgKHJlcS5zdGFydHNXaXRoKFwianM6XCIpKSByZXEgPSByZXEuc2xpY2UoMyk7XG4gICAgaWYgKHJlcS5zdGFydHNXaXRoKFwiY3NzOlwiKSkgcmVxID0gcmVxLnNsaWNlKDQpO1xuICAgIGlmIChyZXEuc3RhcnRzV2l0aChcImNhY2hlOlwiKSkgcmVxID0gcmVxLnNsaWNlKDYpO1xuICAgIGlmICghcmVxLnN0YXJ0c1dpdGgoXCJodHRwXCIpKSBjb250aW51ZTtcblxuICAgIGF3YWl0IGNhY2hlVXJsSW5TZXJ2aWNlV29ya2VyKHJlcSkuY2F0Y2goKGUpID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYXNzZXJ0KGNvbmRpdGlvbiwgbWVzc2FnZSkge1xuICBpZiAoIWNvbmRpdGlvbikge1xuICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlIHx8IFwiQXNzZXJ0aW9uIGZhaWxlZFwiKTtcbiAgfVxufVxuXG4vLyNTb3VyY2UgaHR0cHM6Ly9iaXQubHkvMm5lV2ZKMlxuZnVuY3Rpb24gdXJsSm9pbiguLi5hcmdzKSB7XG4gIHJldHVybiBhcmdzXG4gICAgLmpvaW4oXCIvXCIpXG4gICAgLnJlcGxhY2UoL1tcXC9dKy9nLCBcIi9cIilcbiAgICAucmVwbGFjZSgvXiguKyk6XFwvLywgXCIkMTovL1wiKVxuICAgIC5yZXBsYWNlKC9eZmlsZTovLCBcImZpbGU6L1wiKVxuICAgIC5yZXBsYWNlKC9cXC8oXFw/fCZ8I1teIV0pL2csIFwiJDFcIilcbiAgICAucmVwbGFjZSgvXFw/L2csIFwiJlwiKVxuICAgIC5yZXBsYWNlKFwiJlwiLCBcIj9cIik7XG59XG5cbmZ1bmN0aW9uIHdhaXRGb3IocHJvbSwgdGltZSwgZXJyb3IpIHtcbiAgbGV0IHRpbWVyO1xuICByZXR1cm4gUHJvbWlzZS5yYWNlKFtcbiAgICBwcm9tLFxuICAgIG5ldyBQcm9taXNlKFxuICAgICAgKF9yLCByZWopID0+XG4gICAgICAgICh0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHJlaihlcnJvciB8fCBcIlRpbWVvdXQgRXJyb3JcIik7XG4gICAgICAgIH0sIHRpbWUgKiAxMDAwKSksXG4gICAgKSxcbiAgXSkuZmluYWxseSgoKSA9PiBjbGVhclRpbWVvdXQodGltZXIpKTtcbn1cblxuY2xhc3MgTWVzc2FnZUVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihkZWJ1Zykge1xuICAgIHRoaXMuX2V2ZW50X2hhbmRsZXJzID0ge307XG4gICAgdGhpcy5fb25jZV9oYW5kbGVycyA9IHt9O1xuICAgIHRoaXMuX2RlYnVnID0gZGVidWc7XG4gIH1cbiAgZW1pdCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJlbWl0IGlzIG5vdCBpbXBsZW1lbnRlZFwiKTtcbiAgfVxuICBvbihldmVudCwgaGFuZGxlcikge1xuICAgIGlmICghdGhpcy5fZXZlbnRfaGFuZGxlcnNbZXZlbnRdKSB7XG4gICAgICB0aGlzLl9ldmVudF9oYW5kbGVyc1tldmVudF0gPSBbXTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRfaGFuZGxlcnNbZXZlbnRdLnB1c2goaGFuZGxlcik7XG4gIH1cbiAgb25jZShldmVudCwgaGFuZGxlcikge1xuICAgIGhhbmRsZXIuX19fZXZlbnRfcnVuX29uY2UgPSB0cnVlO1xuICAgIHRoaXMub24oZXZlbnQsIGhhbmRsZXIpO1xuICB9XG4gIG9mZihldmVudCwgaGFuZGxlcikge1xuICAgIGlmICghZXZlbnQgJiYgIWhhbmRsZXIpIHtcbiAgICAgIC8vIHJlbW92ZSBhbGwgZXZlbnRzIGhhbmRsZXJzXG4gICAgICB0aGlzLl9ldmVudF9oYW5kbGVycyA9IHt9O1xuICAgIH0gZWxzZSBpZiAoZXZlbnQgJiYgIWhhbmRsZXIpIHtcbiAgICAgIC8vIHJlbW92ZSBhbGwgaGFubGRlcnMgZm9yIHRoZSBldmVudFxuICAgICAgaWYgKHRoaXMuX2V2ZW50X2hhbmRsZXJzW2V2ZW50XSkgdGhpcy5fZXZlbnRfaGFuZGxlcnNbZXZlbnRdID0gW107XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHJlbW92ZSBhIHNwZWNpZmljIGhhbmRsZXJcbiAgICAgIGlmICh0aGlzLl9ldmVudF9oYW5kbGVyc1tldmVudF0pIHtcbiAgICAgICAgY29uc3QgaWR4ID0gdGhpcy5fZXZlbnRfaGFuZGxlcnNbZXZlbnRdLmluZGV4T2YoaGFuZGxlcik7XG4gICAgICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgICAgIHRoaXMuX2V2ZW50X2hhbmRsZXJzW2V2ZW50XS5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBfZmlyZShldmVudCwgZGF0YSkge1xuICAgIGlmICh0aGlzLl9ldmVudF9oYW5kbGVyc1tldmVudF0pIHtcbiAgICAgIHZhciBpID0gdGhpcy5fZXZlbnRfaGFuZGxlcnNbZXZlbnRdLmxlbmd0aDtcbiAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgY29uc3QgaGFuZGxlciA9IHRoaXMuX2V2ZW50X2hhbmRsZXJzW2V2ZW50XVtpXTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBoYW5kbGVyKGRhdGEpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICBpZiAoaGFuZGxlci5fX19ldmVudF9ydW5fb25jZSkge1xuICAgICAgICAgICAgdGhpcy5fZXZlbnRfaGFuZGxlcnNbZXZlbnRdLnNwbGljZShpLCAxKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuX2RlYnVnKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcInVuaGFuZGxlZCBldmVudFwiLCBldmVudCwgZGF0YSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgd2FpdEZvcihldmVudCwgdGltZW91dCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBoYW5kbGVyID0gKGRhdGEpID0+IHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgIH07XG4gICAgICB0aGlzLm9uY2UoZXZlbnQsIGhhbmRsZXIpO1xuICAgICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy5vZmYoZXZlbnQsIGhhbmRsZXIpO1xuICAgICAgICByZWplY3QobmV3IEVycm9yKFwiVGltZW91dFwiKSk7XG4gICAgICB9LCB0aW1lb3V0KTtcbiAgICB9KTtcbiAgfVxufVxuXG5jbGFzcyBTZW1hcGhvcmUge1xuICBjb25zdHJ1Y3RvcihtYXgpIHtcbiAgICB0aGlzLm1heCA9IG1heDtcbiAgICB0aGlzLnF1ZXVlID0gW107XG4gICAgdGhpcy5jdXJyZW50ID0gMDtcbiAgfVxuICBhc3luYyBydW4odGFzaykge1xuICAgIGlmICh0aGlzLmN1cnJlbnQgPj0gdGhpcy5tYXgpIHtcbiAgICAgIC8vIFdhaXQgdW50aWwgYSBzbG90IGlzIGZyZWVcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB0aGlzLnF1ZXVlLnB1c2gocmVzb2x2ZSkpO1xuICAgIH1cbiAgICB0aGlzLmN1cnJlbnQrKztcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IHRhc2soKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5jdXJyZW50LS07XG4gICAgICBpZiAodGhpcy5xdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgIC8vIHJlbGVhc2Ugb25lIHdhaXRlclxuICAgICAgICB0aGlzLnF1ZXVlLnNoaWZ0KCkoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBDaGVjayBpZiB0aGUgb2JqZWN0IGlzIGEgZ2VuZXJhdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gT2JqZWN0IHRvIGNoZWNrXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBvYmplY3QgaXMgYSBnZW5lcmF0b3JcbiAqL1xuZnVuY3Rpb24gaXNHZW5lcmF0b3Iob2JqKSB7XG4gIGlmICghb2JqKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIChcbiAgICB0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiICYmXG4gICAgdHlwZW9mIG9iai5uZXh0ID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICB0eXBlb2Ygb2JqLnRocm93ID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICB0eXBlb2Ygb2JqLnJldHVybiA9PT0gXCJmdW5jdGlvblwiXG4gICk7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYW4gb2JqZWN0IGlzIGFuIGFzeW5jIGdlbmVyYXRvciBvYmplY3RcbiAqIEBwYXJhbSB7YW55fSBvYmogLSBPYmplY3QgdG8gY2hlY2tcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIG9iamVjdCBpcyBhbiBhc3luYyBnZW5lcmF0b3Igb2JqZWN0XG4gKi9cbmZ1bmN0aW9uIGlzQXN5bmNHZW5lcmF0b3Iob2JqKSB7XG4gIGlmICghb2JqKSByZXR1cm4gZmFsc2U7XG4gIC8vIENoZWNrIGlmIGl0J3MgYW4gYXN5bmMgZ2VuZXJhdG9yIG9iamVjdFxuICByZXR1cm4gKFxuICAgIHR5cGVvZiBvYmogPT09IFwib2JqZWN0XCIgJiZcbiAgICB0eXBlb2Ygb2JqLm5leHQgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgIHR5cGVvZiBvYmoudGhyb3cgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgIHR5cGVvZiBvYmoucmV0dXJuID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICBTeW1ib2wuYXN5bmNJdGVyYXRvciBpbiBPYmplY3Qob2JqKSAmJlxuICAgIG9ialtTeW1ib2wudG9TdHJpbmdUYWddID09PSBcIkFzeW5jR2VuZXJhdG9yXCJcbiAgKTtcbn1cblxuXG4vKioqLyB9KSxcblxuLyoqKi8gXCIuL3NyYy91dGlscy9zY2hlbWEuanNcIjpcbi8qISoqKioqKioqKioqKioqKioqKioqKioqKioqKioqISpcXFxuICAhKioqIC4vc3JjL3V0aWxzL3NjaGVtYS5qcyAqKiohXG4gIFxcKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKioqLyAoKF9fdW51c2VkX3dlYnBhY2tfbW9kdWxlLCBfX3dlYnBhY2tfZXhwb3J0c19fLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSA9PiB7XG5cbl9fd2VicGFja19yZXF1aXJlX18ucihfX3dlYnBhY2tfZXhwb3J0c19fKTtcbi8qIGhhcm1vbnkgZXhwb3J0ICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCB7XG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIHNjaGVtYUZ1bmN0aW9uOiAoKSA9PiAoLyogYmluZGluZyAqLyBzY2hlbWFGdW5jdGlvbilcbi8qIGhhcm1vbnkgZXhwb3J0ICovIH0pO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF9fX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4gKi8gXCIuL3NyYy91dGlscy9pbmRleC5qc1wiKTtcblxuXG5mdW5jdGlvbiBzY2hlbWFGdW5jdGlvbihcbiAgZnVuYyxcbiAgeyBzY2hlbWFfdHlwZSA9IFwiYXV0b1wiLCBuYW1lID0gbnVsbCwgZGVzY3JpcHRpb24gPSBudWxsLCBwYXJhbWV0ZXJzID0gbnVsbCB9LFxuKSB7XG4gIGlmICghZnVuYyB8fCB0eXBlb2YgZnVuYyAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgdGhyb3cgRXJyb3IoXCJmdW5jIHNob3VsZCBiZSBhIGZ1bmN0aW9uXCIpO1xuICB9XG4gICgwLF9fX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5hc3NlcnQpKHNjaGVtYV90eXBlID09PSBcImF1dG9cIiwgXCJzY2hlbWFfdHlwZSBzaG91bGQgYmUgYXV0b1wiKTtcbiAgKDAsX19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLmFzc2VydCkobmFtZSwgXCJuYW1lIHNob3VsZCBub3QgYmUgbnVsbFwiKTtcbiAgKDAsX19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLmFzc2VydCkoXG4gICAgcGFyYW1ldGVycyAmJiBwYXJhbWV0ZXJzLnR5cGUgPT09IFwib2JqZWN0XCIsXG4gICAgXCJwYXJhbWV0ZXJzIHNob3VsZCBiZSBhbiBvYmplY3RcIixcbiAgKTtcbiAgZnVuYy5fX3NjaGVtYV9fID0ge1xuICAgIG5hbWU6IG5hbWUsXG4gICAgZGVzY3JpcHRpb246IGRlc2NyaXB0aW9uLFxuICAgIHBhcmFtZXRlcnM6IHBhcmFtZXRlcnMgfHwgW10sXG4gIH07XG4gIHJldHVybiBmdW5jO1xufVxuXG5cbi8qKiovIH0pLFxuXG4vKioqLyBcIi4vc3JjL3dlYnJ0Yy1jbGllbnQuanNcIjpcbi8qISoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiEqXFxcbiAgISoqKiAuL3NyYy93ZWJydGMtY2xpZW50LmpzICoqKiFcbiAgXFwqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKioqLyAoKF9fdW51c2VkX3dlYnBhY2tfbW9kdWxlLCBfX3dlYnBhY2tfZXhwb3J0c19fLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSA9PiB7XG5cbl9fd2VicGFja19yZXF1aXJlX18ucihfX3dlYnBhY2tfZXhwb3J0c19fKTtcbi8qIGhhcm1vbnkgZXhwb3J0ICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCB7XG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIGdldFJUQ1NlcnZpY2U6ICgpID0+ICgvKiBiaW5kaW5nICovIGdldFJUQ1NlcnZpY2UpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICByZWdpc3RlclJUQ1NlcnZpY2U6ICgpID0+ICgvKiBiaW5kaW5nICovIHJlZ2lzdGVyUlRDU2VydmljZSlcbi8qIGhhcm1vbnkgZXhwb3J0ICovIH0pO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF9ycGNfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vcnBjLmpzICovIFwiLi9zcmMvcnBjLmpzXCIpO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgLi91dGlscyAqLyBcIi4vc3JjL3V0aWxzL2luZGV4LmpzXCIpO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF91dGlsc19zY2hlbWFfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vdXRpbHMvc2NoZW1hLmpzICovIFwiLi9zcmMvdXRpbHMvc2NoZW1hLmpzXCIpO1xuXG5cblxuXG5jbGFzcyBXZWJSVENDb25uZWN0aW9uIHtcbiAgY29uc3RydWN0b3IoY2hhbm5lbCkge1xuICAgIHRoaXMuX2RhdGFfY2hhbm5lbCA9IGNoYW5uZWw7XG4gICAgdGhpcy5faGFuZGxlX21lc3NhZ2UgPSBudWxsO1xuICAgIHRoaXMuX3JlY29ubmVjdGlvbl90b2tlbiA9IG51bGw7XG4gICAgdGhpcy5faGFuZGxlX2Rpc2Nvbm5lY3RlZCA9IG51bGw7XG4gICAgdGhpcy5faGFuZGxlX2Nvbm5lY3RlZCA9ICgpID0+IHt9O1xuICAgIHRoaXMubWFuYWdlcl9pZCA9IG51bGw7XG4gICAgdGhpcy5fbGFzdF9tZXNzYWdlID0gbnVsbDtcbiAgICB0aGlzLl9kYXRhX2NoYW5uZWwub25vcGVuID0gYXN5bmMgKCkgPT4ge1xuICAgICAgaWYgKHRoaXMuX2xhc3RfbWVzc2FnZSkge1xuICAgICAgICBjb25zb2xlLmluZm8oXCJSZXNlbmRpbmcgbGFzdCBtZXNzYWdlIGFmdGVyIGNvbm5lY3Rpb24gZXN0YWJsaXNoZWRcIik7XG4gICAgICAgIHRoaXMuX2RhdGFfY2hhbm5lbC5zZW5kKHRoaXMuX2xhc3RfbWVzc2FnZSk7XG4gICAgICAgIHRoaXMuX2xhc3RfbWVzc2FnZSA9IG51bGw7XG4gICAgICB9XG4gICAgICB0aGlzLl9oYW5kbGVfY29ubmVjdGVkICYmXG4gICAgICAgIHRoaXMuX2hhbmRsZV9jb25uZWN0ZWQoeyBjaGFubmVsOiB0aGlzLl9kYXRhX2NoYW5uZWwgfSk7XG4gICAgfTtcbiAgICB0aGlzLl9kYXRhX2NoYW5uZWwub25tZXNzYWdlID0gYXN5bmMgKGV2ZW50KSA9PiB7XG4gICAgICBsZXQgZGF0YSA9IGV2ZW50LmRhdGE7XG4gICAgICBpZiAoZGF0YSBpbnN0YW5jZW9mIEJsb2IpIHtcbiAgICAgICAgZGF0YSA9IGF3YWl0IGRhdGEuYXJyYXlCdWZmZXIoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2hhbmRsZV9tZXNzYWdlKGRhdGEpO1xuICAgIH07XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5fZGF0YV9jaGFubmVsLm9uY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAodGhpcy5faGFuZGxlX2Rpc2Nvbm5lY3RlZCkgdGhpcy5faGFuZGxlX2Rpc2Nvbm5lY3RlZChcImNsb3NlZFwiKTtcbiAgICAgIGNvbnNvbGUubG9nKFwid2Vic29ja2V0IGNsb3NlZFwiKTtcbiAgICAgIHNlbGYuX2RhdGFfY2hhbm5lbCA9IG51bGw7XG4gICAgfTtcbiAgfVxuXG4gIG9uX2Rpc2Nvbm5lY3RlZChoYW5kbGVyKSB7XG4gICAgdGhpcy5faGFuZGxlX2Rpc2Nvbm5lY3RlZCA9IGhhbmRsZXI7XG4gIH1cblxuICBvbl9jb25uZWN0ZWQoaGFuZGxlcikge1xuICAgIHRoaXMuX2hhbmRsZV9jb25uZWN0ZWQgPSBoYW5kbGVyO1xuICB9XG5cbiAgb25fbWVzc2FnZShoYW5kbGVyKSB7XG4gICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18uYXNzZXJ0KShoYW5kbGVyLCBcImhhbmRsZXIgaXMgcmVxdWlyZWRcIik7XG4gICAgdGhpcy5faGFuZGxlX21lc3NhZ2UgPSBoYW5kbGVyO1xuICB9XG5cbiAgYXN5bmMgZW1pdF9tZXNzYWdlKGRhdGEpIHtcbiAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5hc3NlcnQpKHRoaXMuX2hhbmRsZV9tZXNzYWdlLCBcIk5vIGhhbmRsZXIgZm9yIG1lc3NhZ2VcIik7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuX2xhc3RfbWVzc2FnZSA9IGRhdGE7XG4gICAgICB0aGlzLl9kYXRhX2NoYW5uZWwuc2VuZChkYXRhKTtcbiAgICAgIHRoaXMuX2xhc3RfbWVzc2FnZSA9IG51bGw7XG4gICAgfSBjYXRjaCAoZXhwKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gc2VuZCBkYXRhLCBlcnJvcjogJHtleHB9YCk7XG4gICAgICB0aHJvdyBleHA7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZGlzY29ubmVjdChyZWFzb24pIHtcbiAgICB0aGlzLl9sYXN0X21lc3NhZ2UgPSBudWxsO1xuICAgIHRoaXMuX2RhdGFfY2hhbm5lbCA9IG51bGw7XG4gICAgY29uc29sZS5pbmZvKGBkYXRhIGNoYW5uZWwgY29ubmVjdGlvbiBkaXNjb25uZWN0ZWQgKCR7cmVhc29ufSlgKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBfc2V0dXBSUEMoY29uZmlnKSB7XG4gICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLmFzc2VydCkoY29uZmlnLmNoYW5uZWwsIFwiTm8gY2hhbm5lbCBwcm92aWRlZFwiKTtcbiAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18uYXNzZXJ0KShjb25maWcud29ya3NwYWNlLCBcIk5vIHdvcmtzcGFjZSBwcm92aWRlZFwiKTtcbiAgY29uc3QgY2hhbm5lbCA9IGNvbmZpZy5jaGFubmVsO1xuICBjb25zdCBjbGllbnRJZCA9IGNvbmZpZy5jbGllbnRfaWQgfHwgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18ucmFuZElkKSgpO1xuICBjb25zdCBjb25uZWN0aW9uID0gbmV3IFdlYlJUQ0Nvbm5lY3Rpb24oY2hhbm5lbCk7XG4gIGNvbmZpZy5jb250ZXh0ID0gY29uZmlnLmNvbnRleHQgfHwge307XG4gIGNvbmZpZy5jb250ZXh0LmNvbm5lY3Rpb25fdHlwZSA9IFwid2VicnRjXCI7XG4gIGNvbmZpZy5jb250ZXh0LndzID0gY29uZmlnLndvcmtzcGFjZTtcbiAgY29uc3QgcnBjID0gbmV3IF9ycGNfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5SUEMoY29ubmVjdGlvbiwge1xuICAgIGNsaWVudF9pZDogY2xpZW50SWQsXG4gICAgZGVmYXVsdF9jb250ZXh0OiBjb25maWcuY29udGV4dCxcbiAgICBuYW1lOiBjb25maWcubmFtZSxcbiAgICBtZXRob2RfdGltZW91dDogY29uZmlnLm1ldGhvZF90aW1lb3V0IHx8IDEwLjAsXG4gICAgd29ya3NwYWNlOiBjb25maWcud29ya3NwYWNlLFxuICAgIGFwcF9pZDogY29uZmlnLmFwcF9pZCxcbiAgICBsb25nX21lc3NhZ2VfY2h1bmtfc2l6ZTogY29uZmlnLmxvbmdfbWVzc2FnZV9jaHVua19zaXplLFxuICB9KTtcbiAgcmV0dXJuIHJwYztcbn1cblxuYXN5bmMgZnVuY3Rpb24gX2NyZWF0ZU9mZmVyKHBhcmFtcywgc2VydmVyLCBjb25maWcsIG9uSW5pdCwgY29udGV4dCkge1xuICBjb25maWcgPSBjb25maWcgfHwge307XG4gIGxldCBvZmZlciA9IG5ldyBSVENTZXNzaW9uRGVzY3JpcHRpb24oe1xuICAgIHNkcDogcGFyYW1zLnNkcCxcbiAgICB0eXBlOiBwYXJhbXMudHlwZSxcbiAgfSk7XG5cbiAgbGV0IHBjID0gbmV3IFJUQ1BlZXJDb25uZWN0aW9uKHtcbiAgICBpY2VTZXJ2ZXJzOiBjb25maWcuaWNlX3NlcnZlcnMgfHwgW1xuICAgICAgeyB1cmxzOiBbXCJzdHVuOnN0dW4ubC5nb29nbGUuY29tOjE5MzAyXCJdIH0sXG4gICAgXSxcbiAgICBzZHBTZW1hbnRpY3M6IFwidW5pZmllZC1wbGFuXCIsXG4gIH0pO1xuXG4gIGlmIChzZXJ2ZXIpIHtcbiAgICBwYy5hZGRFdmVudExpc3RlbmVyKFwiZGF0YWNoYW5uZWxcIiwgYXN5bmMgKGV2ZW50KSA9PiB7XG4gICAgICBjb25zdCBjaGFubmVsID0gZXZlbnQuY2hhbm5lbDtcbiAgICAgIGxldCBjdHggPSBudWxsO1xuICAgICAgaWYgKGNvbnRleHQgJiYgY29udGV4dC51c2VyKSBjdHggPSB7IHVzZXI6IGNvbnRleHQudXNlciwgd3M6IGNvbnRleHQud3MgfTtcbiAgICAgIGNvbnN0IHJwYyA9IGF3YWl0IF9zZXR1cFJQQyh7XG4gICAgICAgIGNoYW5uZWw6IGNoYW5uZWwsXG4gICAgICAgIGNsaWVudF9pZDogY2hhbm5lbC5sYWJlbCxcbiAgICAgICAgd29ya3NwYWNlOiBzZXJ2ZXIuY29uZmlnLndvcmtzcGFjZSxcbiAgICAgICAgY29udGV4dDogY3R4LFxuICAgICAgfSk7XG4gICAgICAvLyBNYXAgYWxsIHRoZSBsb2NhbCBzZXJ2aWNlcyB0byB0aGUgd2VicnRjIGNsaWVudFxuICAgICAgcnBjLl9zZXJ2aWNlcyA9IHNlcnZlci5ycGMuX3NlcnZpY2VzO1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKG9uSW5pdCkge1xuICAgIGF3YWl0IG9uSW5pdChwYyk7XG4gIH1cblxuICBhd2FpdCBwYy5zZXRSZW1vdGVEZXNjcmlwdGlvbihvZmZlcik7XG5cbiAgbGV0IGFuc3dlciA9IGF3YWl0IHBjLmNyZWF0ZUFuc3dlcigpO1xuICBhd2FpdCBwYy5zZXRMb2NhbERlc2NyaXB0aW9uKGFuc3dlcik7XG5cbiAgcmV0dXJuIHtcbiAgICBzZHA6IHBjLmxvY2FsRGVzY3JpcHRpb24uc2RwLFxuICAgIHR5cGU6IHBjLmxvY2FsRGVzY3JpcHRpb24udHlwZSxcbiAgICB3b3Jrc3BhY2U6IHNlcnZlci5jb25maWcud29ya3NwYWNlLFxuICB9O1xufVxuXG5hc3luYyBmdW5jdGlvbiBnZXRSVENTZXJ2aWNlKHNlcnZlciwgc2VydmljZV9pZCwgY29uZmlnKSB7XG4gIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcbiAgY29uZmlnLnBlZXJfaWQgPSBjb25maWcucGVlcl9pZCB8fCAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5yYW5kSWQpKCk7XG5cbiAgY29uc3QgcGMgPSBuZXcgUlRDUGVlckNvbm5lY3Rpb24oe1xuICAgIGljZVNlcnZlcnM6IGNvbmZpZy5pY2Vfc2VydmVycyB8fCBbXG4gICAgICB7IHVybHM6IFtcInN0dW46c3R1bi5sLmdvb2dsZS5jb206MTkzMDJcIl0gfSxcbiAgICBdLFxuICAgIHNkcFNlbWFudGljczogXCJ1bmlmaWVkLXBsYW5cIixcbiAgfSk7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICB0cnkge1xuICAgICAgcGMuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICAgXCJjb25uZWN0aW9uc3RhdGVjaGFuZ2VcIixcbiAgICAgICAgKCkgPT4ge1xuICAgICAgICAgIGlmIChwYy5jb25uZWN0aW9uU3RhdGUgPT09IFwiZmFpbGVkXCIpIHtcbiAgICAgICAgICAgIHBjLmNsb3NlKCk7XG4gICAgICAgICAgICByZWplY3QobmV3IEVycm9yKFwiV2ViUlRDIENvbm5lY3Rpb24gZmFpbGVkXCIpKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHBjLmNvbm5lY3Rpb25TdGF0ZSA9PT0gXCJjbG9zZWRcIikge1xuICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihcIldlYlJUQyBDb25uZWN0aW9uIGNsb3NlZFwiKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiV2ViUlRDIENvbm5lY3Rpb24gc3RhdGU6IFwiLCBwYy5jb25uZWN0aW9uU3RhdGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZmFsc2UsXG4gICAgICApO1xuXG4gICAgICBpZiAoY29uZmlnLm9uX2luaXQpIHtcbiAgICAgICAgYXdhaXQgY29uZmlnLm9uX2luaXQocGMpO1xuICAgICAgICBkZWxldGUgY29uZmlnLm9uX2luaXQ7XG4gICAgICB9XG4gICAgICBsZXQgY2hhbm5lbCA9IHBjLmNyZWF0ZURhdGFDaGFubmVsKGNvbmZpZy5wZWVyX2lkLCB7IG9yZGVyZWQ6IHRydWUgfSk7XG4gICAgICBjaGFubmVsLmJpbmFyeVR5cGUgPSBcImFycmF5YnVmZmVyXCI7XG4gICAgICBjb25zdCBvZmZlciA9IGF3YWl0IHBjLmNyZWF0ZU9mZmVyKCk7XG4gICAgICBhd2FpdCBwYy5zZXRMb2NhbERlc2NyaXB0aW9uKG9mZmVyKTtcbiAgICAgIGNvbnN0IHN2YyA9IGF3YWl0IHNlcnZlci5nZXRTZXJ2aWNlKHNlcnZpY2VfaWQpO1xuICAgICAgY29uc3QgYW5zd2VyID0gYXdhaXQgc3ZjLm9mZmVyKHtcbiAgICAgICAgc2RwOiBwYy5sb2NhbERlc2NyaXB0aW9uLnNkcCxcbiAgICAgICAgdHlwZTogcGMubG9jYWxEZXNjcmlwdGlvbi50eXBlLFxuICAgICAgfSk7XG5cbiAgICAgIGNoYW5uZWwub25vcGVuID0gKCkgPT4ge1xuICAgICAgICBjb25maWcuY2hhbm5lbCA9IGNoYW5uZWw7XG4gICAgICAgIGNvbmZpZy53b3Jrc3BhY2UgPSBhbnN3ZXIud29ya3NwYWNlO1xuICAgICAgICAvLyBXYWl0IGZvciB0aGUgY2hhbm5lbCB0byBiZSBvcGVuIGJlZm9yZSByZXR1cm5pbmcgdGhlIHJwY1xuICAgICAgICAvLyBUaGlzIGlzIG5lZWRlZCBmb3Igc2FmYXJpIHRvIHdvcmtcbiAgICAgICAgc2V0VGltZW91dChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgcnBjID0gYXdhaXQgX3NldHVwUlBDKGNvbmZpZyk7XG4gICAgICAgICAgcGMucnBjID0gcnBjO1xuICAgICAgICAgIGFzeW5jIGZ1bmN0aW9uIGdldF9zZXJ2aWNlKG5hbWUsIC4uLmFyZ3MpIHtcbiAgICAgICAgICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLmFzc2VydCkoXG4gICAgICAgICAgICAgICFuYW1lLmluY2x1ZGVzKFwiOlwiKSxcbiAgICAgICAgICAgICAgXCJXZWJSVEMgc2VydmljZSBuYW1lIHNob3VsZCBub3QgY29udGFpbiAnOidcIixcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5hc3NlcnQpKFxuICAgICAgICAgICAgICAhbmFtZS5pbmNsdWRlcyhcIi9cIiksXG4gICAgICAgICAgICAgIFwiV2ViUlRDIHNlcnZpY2UgbmFtZSBzaG91bGQgbm90IGNvbnRhaW4gJy8nXCIsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHJwYy5nZXRfcmVtb3RlX3NlcnZpY2UoXG4gICAgICAgICAgICAgIGNvbmZpZy53b3Jrc3BhY2UgKyBcIi9cIiArIGNvbmZpZy5wZWVyX2lkICsgXCI6XCIgKyBuYW1lLFxuICAgICAgICAgICAgICAuLi5hcmdzLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYXN5bmMgZnVuY3Rpb24gZGlzY29ubmVjdCgpIHtcbiAgICAgICAgICAgIGF3YWl0IHJwYy5kaXNjb25uZWN0KCk7XG4gICAgICAgICAgICBwYy5jbG9zZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBwYy5nZXRTZXJ2aWNlID0gKDAsX3V0aWxzX3NjaGVtYV9qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLnNjaGVtYUZ1bmN0aW9uKShnZXRfc2VydmljZSwge1xuICAgICAgICAgICAgbmFtZTogXCJnZXRTZXJ2aWNlXCIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJHZXQgYSByZW1vdGUgc2VydmljZSB2aWEgd2VicnRjXCIsXG4gICAgICAgICAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICBzZXJ2aWNlX2lkOiB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiBcInN0cmluZ1wiLFxuICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgICAgICAgICAgIFwiU2VydmljZSBJRC4gVGhpcyBzaG91bGQgYmUgYSBzZXJ2aWNlIGlkIGluIHRoZSBmb3JtYXQ6ICd3b3Jrc3BhY2Uvc2VydmljZV9pZCcsICd3b3Jrc3BhY2UvY2xpZW50X2lkOnNlcnZpY2VfaWQnIG9yICd3b3Jrc3BhY2UvY2xpZW50X2lkOnNlcnZpY2VfaWRAYXBwX2lkJ1wiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiT3B0aW9ucyBmb3IgdGhlIHNlcnZpY2VcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICByZXF1aXJlZDogW1wiaWRcIl0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHBjLmRpc2Nvbm5lY3QgPSAoMCxfdXRpbHNfc2NoZW1hX2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18uc2NoZW1hRnVuY3Rpb24pKGRpc2Nvbm5lY3QsIHtcbiAgICAgICAgICAgIG5hbWU6IFwiZGlzY29ubmVjdFwiLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiRGlzY29ubmVjdCBmcm9tIHRoZSB3ZWJydGMgY29ubmVjdGlvbiB2aWEgd2VicnRjXCIsXG4gICAgICAgICAgICBwYXJhbWV0ZXJzOiB7IHR5cGU6IFwib2JqZWN0XCIsIHByb3BlcnRpZXM6IHt9IH0sXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcGMucmVnaXN0ZXJDb2RlYyA9ICgwLF91dGlsc19zY2hlbWFfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXy5zY2hlbWFGdW5jdGlvbikocnBjLnJlZ2lzdGVyX2NvZGVjLCB7XG4gICAgICAgICAgICBuYW1lOiBcInJlZ2lzdGVyQ29kZWNcIixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlJlZ2lzdGVyIGEgY29kZWMgZm9yIHRoZSB3ZWJydGMgY29ubmVjdGlvblwiLFxuICAgICAgICAgICAgcGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgY29kZWM6IHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJDb2RlYyB0byByZWdpc3RlclwiLFxuICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiB7IHR5cGU6IFwic3RyaW5nXCIgfSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZToge30sXG4gICAgICAgICAgICAgICAgICAgIGVuY29kZXI6IHsgdHlwZTogXCJmdW5jdGlvblwiIH0sXG4gICAgICAgICAgICAgICAgICAgIGRlY29kZXI6IHsgdHlwZTogXCJmdW5jdGlvblwiIH0sXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJlc29sdmUocGMpO1xuICAgICAgICB9LCA1MDApO1xuICAgICAgfTtcblxuICAgICAgY2hhbm5lbC5vbmNsb3NlID0gKCkgPT4gcmVqZWN0KG5ldyBFcnJvcihcIkRhdGEgY2hhbm5lbCBjbG9zZWRcIikpO1xuXG4gICAgICBhd2FpdCBwYy5zZXRSZW1vdGVEZXNjcmlwdGlvbihcbiAgICAgICAgbmV3IFJUQ1Nlc3Npb25EZXNjcmlwdGlvbih7XG4gICAgICAgICAgc2RwOiBhbnN3ZXIuc2RwLFxuICAgICAgICAgIHR5cGU6IGFuc3dlci50eXBlLFxuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmVqZWN0KGUpO1xuICAgIH1cbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJlZ2lzdGVyUlRDU2VydmljZShzZXJ2ZXIsIHNlcnZpY2VfaWQsIGNvbmZpZykge1xuICBjb25maWcgPSBjb25maWcgfHwge1xuICAgIHZpc2liaWxpdHk6IFwicHJvdGVjdGVkXCIsXG4gICAgcmVxdWlyZV9jb250ZXh0OiB0cnVlLFxuICB9O1xuICBjb25zdCBvbkluaXQgPSBjb25maWcub25faW5pdDtcbiAgZGVsZXRlIGNvbmZpZy5vbl9pbml0O1xuICByZXR1cm4gYXdhaXQgc2VydmVyLnJlZ2lzdGVyU2VydmljZSh7XG4gICAgaWQ6IHNlcnZpY2VfaWQsXG4gICAgY29uZmlnLFxuICAgIG9mZmVyOiAocGFyYW1zLCBjb250ZXh0KSA9PlxuICAgICAgX2NyZWF0ZU9mZmVyKHBhcmFtcywgc2VydmVyLCBjb25maWcsIG9uSW5pdCwgY29udGV4dCksXG4gIH0pO1xufVxuXG5cblxuXG4vKioqLyB9KSxcblxuLyoqKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS9DYWNoZWRLZXlEZWNvZGVyLm1qc1wiOlxuLyohKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiEqXFxcbiAgISoqKiAuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS9DYWNoZWRLZXlEZWNvZGVyLm1qcyAqKiohXG4gIFxcKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qKiovICgoX191bnVzZWRfd2VicGFja19fX3dlYnBhY2tfbW9kdWxlX18sIF9fd2VicGFja19leHBvcnRzX18sIF9fd2VicGFja19yZXF1aXJlX18pID0+IHtcblxuX193ZWJwYWNrX3JlcXVpcmVfXy5yKF9fd2VicGFja19leHBvcnRzX18pO1xuLyogaGFybW9ueSBleHBvcnQgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIHtcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgQ2FjaGVkS2V5RGVjb2RlcjogKCkgPT4gKC8qIGJpbmRpbmcgKi8gQ2FjaGVkS2V5RGVjb2Rlcilcbi8qIGhhcm1vbnkgZXhwb3J0ICovIH0pO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF91dGlsc191dGY4X21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgLi91dGlscy91dGY4Lm1qcyAqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL3V0aWxzL3V0ZjgubWpzXCIpO1xuXG52YXIgREVGQVVMVF9NQVhfS0VZX0xFTkdUSCA9IDE2O1xudmFyIERFRkFVTFRfTUFYX0xFTkdUSF9QRVJfS0VZID0gMTY7XG52YXIgQ2FjaGVkS2V5RGVjb2RlciA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBDYWNoZWRLZXlEZWNvZGVyKG1heEtleUxlbmd0aCwgbWF4TGVuZ3RoUGVyS2V5KSB7XG4gICAgICAgIGlmIChtYXhLZXlMZW5ndGggPT09IHZvaWQgMCkgeyBtYXhLZXlMZW5ndGggPSBERUZBVUxUX01BWF9LRVlfTEVOR1RIOyB9XG4gICAgICAgIGlmIChtYXhMZW5ndGhQZXJLZXkgPT09IHZvaWQgMCkgeyBtYXhMZW5ndGhQZXJLZXkgPSBERUZBVUxUX01BWF9MRU5HVEhfUEVSX0tFWTsgfVxuICAgICAgICB0aGlzLm1heEtleUxlbmd0aCA9IG1heEtleUxlbmd0aDtcbiAgICAgICAgdGhpcy5tYXhMZW5ndGhQZXJLZXkgPSBtYXhMZW5ndGhQZXJLZXk7XG4gICAgICAgIHRoaXMuaGl0ID0gMDtcbiAgICAgICAgdGhpcy5taXNzID0gMDtcbiAgICAgICAgLy8gYXZvaWQgYG5ldyBBcnJheShOKWAsIHdoaWNoIG1ha2VzIGEgc3BhcnNlIGFycmF5LFxuICAgICAgICAvLyBiZWNhdXNlIGEgc3BhcnNlIGFycmF5IGlzIHR5cGljYWxseSBzbG93ZXIgdGhhbiBhIG5vbi1zcGFyc2UgYXJyYXkuXG4gICAgICAgIHRoaXMuY2FjaGVzID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5tYXhLZXlMZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5jYWNoZXMucHVzaChbXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgQ2FjaGVkS2V5RGVjb2Rlci5wcm90b3R5cGUuY2FuQmVDYWNoZWQgPSBmdW5jdGlvbiAoYnl0ZUxlbmd0aCkge1xuICAgICAgICByZXR1cm4gYnl0ZUxlbmd0aCA+IDAgJiYgYnl0ZUxlbmd0aCA8PSB0aGlzLm1heEtleUxlbmd0aDtcbiAgICB9O1xuICAgIENhY2hlZEtleURlY29kZXIucHJvdG90eXBlLmZpbmQgPSBmdW5jdGlvbiAoYnl0ZXMsIGlucHV0T2Zmc2V0LCBieXRlTGVuZ3RoKSB7XG4gICAgICAgIHZhciByZWNvcmRzID0gdGhpcy5jYWNoZXNbYnl0ZUxlbmd0aCAtIDFdO1xuICAgICAgICBGSU5EX0NIVU5LOiBmb3IgKHZhciBfaSA9IDAsIHJlY29yZHNfMSA9IHJlY29yZHM7IF9pIDwgcmVjb3Jkc18xLmxlbmd0aDsgX2krKykge1xuICAgICAgICAgICAgdmFyIHJlY29yZCA9IHJlY29yZHNfMVtfaV07XG4gICAgICAgICAgICB2YXIgcmVjb3JkQnl0ZXMgPSByZWNvcmQuYnl0ZXM7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGJ5dGVMZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIGlmIChyZWNvcmRCeXRlc1tqXSAhPT0gYnl0ZXNbaW5wdXRPZmZzZXQgKyBqXSkge1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZSBGSU5EX0NIVU5LO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZWNvcmQuc3RyO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH07XG4gICAgQ2FjaGVkS2V5RGVjb2Rlci5wcm90b3R5cGUuc3RvcmUgPSBmdW5jdGlvbiAoYnl0ZXMsIHZhbHVlKSB7XG4gICAgICAgIHZhciByZWNvcmRzID0gdGhpcy5jYWNoZXNbYnl0ZXMubGVuZ3RoIC0gMV07XG4gICAgICAgIHZhciByZWNvcmQgPSB7IGJ5dGVzOiBieXRlcywgc3RyOiB2YWx1ZSB9O1xuICAgICAgICBpZiAocmVjb3Jkcy5sZW5ndGggPj0gdGhpcy5tYXhMZW5ndGhQZXJLZXkpIHtcbiAgICAgICAgICAgIC8vIGByZWNvcmRzYCBhcmUgZnVsbCFcbiAgICAgICAgICAgIC8vIFNldCBgcmVjb3JkYCB0byBhbiBhcmJpdHJhcnkgcG9zaXRpb24uXG4gICAgICAgICAgICByZWNvcmRzWyhNYXRoLnJhbmRvbSgpICogcmVjb3Jkcy5sZW5ndGgpIHwgMF0gPSByZWNvcmQ7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZWNvcmRzLnB1c2gocmVjb3JkKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgQ2FjaGVkS2V5RGVjb2Rlci5wcm90b3R5cGUuZGVjb2RlID0gZnVuY3Rpb24gKGJ5dGVzLCBpbnB1dE9mZnNldCwgYnl0ZUxlbmd0aCkge1xuICAgICAgICB2YXIgY2FjaGVkVmFsdWUgPSB0aGlzLmZpbmQoYnl0ZXMsIGlucHV0T2Zmc2V0LCBieXRlTGVuZ3RoKTtcbiAgICAgICAgaWYgKGNhY2hlZFZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuaGl0Kys7XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkVmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5taXNzKys7XG4gICAgICAgIHZhciBzdHIgPSAoMCxfdXRpbHNfdXRmOF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy51dGY4RGVjb2RlSnMpKGJ5dGVzLCBpbnB1dE9mZnNldCwgYnl0ZUxlbmd0aCk7XG4gICAgICAgIC8vIEVuc3VyZSB0byBjb3B5IGEgc2xpY2Ugb2YgYnl0ZXMgYmVjYXVzZSB0aGUgYnl0ZSBtYXkgYmUgTm9kZUpTIEJ1ZmZlciBhbmQgQnVmZmVyI3NsaWNlKCkgcmV0dXJucyBhIHJlZmVyZW5jZSB0byBpdHMgaW50ZXJuYWwgQXJyYXlCdWZmZXIuXG4gICAgICAgIHZhciBzbGljZWRDb3B5T2ZCeXRlcyA9IFVpbnQ4QXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYnl0ZXMsIGlucHV0T2Zmc2V0LCBpbnB1dE9mZnNldCArIGJ5dGVMZW5ndGgpO1xuICAgICAgICB0aGlzLnN0b3JlKHNsaWNlZENvcHlPZkJ5dGVzLCBzdHIpO1xuICAgICAgICByZXR1cm4gc3RyO1xuICAgIH07XG4gICAgcmV0dXJuIENhY2hlZEtleURlY29kZXI7XG59KCkpO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1DYWNoZWRLZXlEZWNvZGVyLm1qcy5tYXBcblxuLyoqKi8gfSksXG5cbi8qKiovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vRGVjb2RlRXJyb3IubWpzXCI6XG4vKiEqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiEqXFxcbiAgISoqKiAuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS9EZWNvZGVFcnJvci5tanMgKioqIVxuICBcXCoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuLyoqKi8gKChfX3VudXNlZF93ZWJwYWNrX19fd2VicGFja19tb2R1bGVfXywgX193ZWJwYWNrX2V4cG9ydHNfXywgX193ZWJwYWNrX3JlcXVpcmVfXykgPT4ge1xuXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIoX193ZWJwYWNrX2V4cG9ydHNfXyk7XG4vKiBoYXJtb255IGV4cG9ydCAqLyBfX3dlYnBhY2tfcmVxdWlyZV9fLmQoX193ZWJwYWNrX2V4cG9ydHNfXywge1xuLyogaGFybW9ueSBleHBvcnQgKi8gICBEZWNvZGVFcnJvcjogKCkgPT4gKC8qIGJpbmRpbmcgKi8gRGVjb2RlRXJyb3IpXG4vKiBoYXJtb255IGV4cG9ydCAqLyB9KTtcbnZhciBfX2V4dGVuZHMgPSAodW5kZWZpbmVkICYmIHVuZGVmaW5lZC5fX2V4dGVuZHMpIHx8IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGV4dGVuZFN0YXRpY3MgPSBmdW5jdGlvbiAoZCwgYikge1xuICAgICAgICBleHRlbmRTdGF0aWNzID0gT2JqZWN0LnNldFByb3RvdHlwZU9mIHx8XG4gICAgICAgICAgICAoeyBfX3Byb3RvX186IFtdIH0gaW5zdGFuY2VvZiBBcnJheSAmJiBmdW5jdGlvbiAoZCwgYikgeyBkLl9fcHJvdG9fXyA9IGI7IH0pIHx8XG4gICAgICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xuICAgICAgICByZXR1cm4gZXh0ZW5kU3RhdGljcyhkLCBiKTtcbiAgICB9O1xuICAgIHJldHVybiBmdW5jdGlvbiAoZCwgYikge1xuICAgICAgICBpZiAodHlwZW9mIGIgIT09IFwiZnVuY3Rpb25cIiAmJiBiICE9PSBudWxsKVxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNsYXNzIGV4dGVuZHMgdmFsdWUgXCIgKyBTdHJpbmcoYikgKyBcIiBpcyBub3QgYSBjb25zdHJ1Y3RvciBvciBudWxsXCIpO1xuICAgICAgICBleHRlbmRTdGF0aWNzKGQsIGIpO1xuICAgICAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cbiAgICAgICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xuICAgIH07XG59KSgpO1xudmFyIERlY29kZUVycm9yID0gLyoqIEBjbGFzcyAqLyAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhEZWNvZGVFcnJvciwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBEZWNvZGVFcnJvcihtZXNzYWdlKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IF9zdXBlci5jYWxsKHRoaXMsIG1lc3NhZ2UpIHx8IHRoaXM7XG4gICAgICAgIC8vIGZpeCB0aGUgcHJvdG90eXBlIGNoYWluIGluIGEgY3Jvc3MtcGxhdGZvcm0gd2F5XG4gICAgICAgIHZhciBwcm90byA9IE9iamVjdC5jcmVhdGUoRGVjb2RlRXJyb3IucHJvdG90eXBlKTtcbiAgICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKF90aGlzLCBwcm90byk7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShfdGhpcywgXCJuYW1lXCIsIHtcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgdmFsdWU6IERlY29kZUVycm9yLm5hbWUsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gX3RoaXM7XG4gICAgfVxuICAgIHJldHVybiBEZWNvZGVFcnJvcjtcbn0oRXJyb3IpKTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9RGVjb2RlRXJyb3IubWpzLm1hcFxuXG4vKioqLyB9KSxcblxuLyoqKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS9EZWNvZGVyLm1qc1wiOlxuLyohKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiEqXFxcbiAgISoqKiAuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS9EZWNvZGVyLm1qcyAqKiohXG4gIFxcKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qKiovICgoX191bnVzZWRfd2VicGFja19fX3dlYnBhY2tfbW9kdWxlX18sIF9fd2VicGFja19leHBvcnRzX18sIF9fd2VicGFja19yZXF1aXJlX18pID0+IHtcblxuX193ZWJwYWNrX3JlcXVpcmVfXy5yKF9fd2VicGFja19leHBvcnRzX18pO1xuLyogaGFybW9ueSBleHBvcnQgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIHtcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgRGF0YVZpZXdJbmRleE91dE9mQm91bmRzRXJyb3I6ICgpID0+ICgvKiBiaW5kaW5nICovIERhdGFWaWV3SW5kZXhPdXRPZkJvdW5kc0Vycm9yKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgRGVjb2RlcjogKCkgPT4gKC8qIGJpbmRpbmcgKi8gRGVjb2Rlcilcbi8qIGhhcm1vbnkgZXhwb3J0ICovIH0pO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF91dGlsc19wcmV0dHlCeXRlX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfNF9fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgLi91dGlscy9wcmV0dHlCeXRlLm1qcyAqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL3V0aWxzL3ByZXR0eUJ5dGUubWpzXCIpO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF9FeHRlbnNpb25Db2RlY19tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vRXh0ZW5zaW9uQ29kZWMubWpzICovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vRXh0ZW5zaW9uQ29kZWMubWpzXCIpO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF91dGlsc19pbnRfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL3V0aWxzL2ludC5tanMgKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS91dGlscy9pbnQubWpzXCIpO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF91dGlsc191dGY4X21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfNl9fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgLi91dGlscy91dGY4Lm1qcyAqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL3V0aWxzL3V0ZjgubWpzXCIpO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF91dGlsc190eXBlZEFycmF5c19tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzNfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vdXRpbHMvdHlwZWRBcnJheXMubWpzICovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vdXRpbHMvdHlwZWRBcnJheXMubWpzXCIpO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF9DYWNoZWRLZXlEZWNvZGVyX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgLi9DYWNoZWRLZXlEZWNvZGVyLm1qcyAqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL0NhY2hlZEtleURlY29kZXIubWpzXCIpO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF9EZWNvZGVFcnJvcl9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzVfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vRGVjb2RlRXJyb3IubWpzICovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vRGVjb2RlRXJyb3IubWpzXCIpO1xudmFyIF9fYXdhaXRlciA9ICh1bmRlZmluZWQgJiYgdW5kZWZpbmVkLl9fYXdhaXRlcikgfHwgZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xuICAgIGZ1bmN0aW9uIGFkb3B0KHZhbHVlKSB7IHJldHVybiB2YWx1ZSBpbnN0YW5jZW9mIFAgPyB2YWx1ZSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUodmFsdWUpOyB9KTsgfVxuICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XG4gICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IGFkb3B0KHJlc3VsdC52YWx1ZSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XG4gICAgfSk7XG59O1xudmFyIF9fZ2VuZXJhdG9yID0gKHVuZGVmaW5lZCAmJiB1bmRlZmluZWQuX19nZW5lcmF0b3IpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBib2R5KSB7XG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZztcbiAgICByZXR1cm4gZyA9IHsgbmV4dDogdmVyYigwKSwgXCJ0aHJvd1wiOiB2ZXJiKDEpLCBcInJldHVyblwiOiB2ZXJiKDIpIH0sIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiAoZ1tTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9KSwgZztcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBzdGVwKFtuLCB2XSk7IH07IH1cbiAgICBmdW5jdGlvbiBzdGVwKG9wKSB7XG4gICAgICAgIGlmIChmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiR2VuZXJhdG9yIGlzIGFscmVhZHkgZXhlY3V0aW5nLlwiKTtcbiAgICAgICAgd2hpbGUgKF8pIHRyeSB7XG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XG4gICAgICAgICAgICBpZiAoeSA9IDAsIHQpIG9wID0gW29wWzBdICYgMiwgdC52YWx1ZV07XG4gICAgICAgICAgICBzd2l0Y2ggKG9wWzBdKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA0OiBfLmxhYmVsKys7IHJldHVybiB7IHZhbHVlOiBvcFsxXSwgZG9uZTogZmFsc2UgfTtcbiAgICAgICAgICAgICAgICBjYXNlIDU6IF8ubGFiZWwrKzsgeSA9IG9wWzFdOyBvcCA9IFswXTsgY29udGludWU7XG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKHQgPSBfLnRyeXMsIHQgPSB0Lmxlbmd0aCA+IDAgJiYgdFt0Lmxlbmd0aCAtIDFdKSAmJiAob3BbMF0gPT09IDYgfHwgb3BbMF0gPT09IDIpKSB7IF8gPSAwOyBjb250aW51ZTsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDYgJiYgXy5sYWJlbCA8IHRbMV0pIHsgXy5sYWJlbCA9IHRbMV07IHQgPSBvcDsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHQgJiYgXy5sYWJlbCA8IHRbMl0pIHsgXy5sYWJlbCA9IHRbMl07IF8ub3BzLnB1c2gob3ApOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgIF8udHJ5cy5wb3AoKTsgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcbiAgICAgICAgfSBjYXRjaCAoZSkgeyBvcCA9IFs2LCBlXTsgeSA9IDA7IH0gZmluYWxseSB7IGYgPSB0ID0gMDsgfVxuICAgICAgICBpZiAob3BbMF0gJiA1KSB0aHJvdyBvcFsxXTsgcmV0dXJuIHsgdmFsdWU6IG9wWzBdID8gb3BbMV0gOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcbiAgICB9XG59O1xudmFyIF9fYXN5bmNWYWx1ZXMgPSAodW5kZWZpbmVkICYmIHVuZGVmaW5lZC5fX2FzeW5jVmFsdWVzKSB8fCBmdW5jdGlvbiAobykge1xuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XG4gICAgdmFyIG0gPSBvW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSwgaTtcbiAgICByZXR1cm4gbSA/IG0uY2FsbChvKSA6IChvID0gdHlwZW9mIF9fdmFsdWVzID09PSBcImZ1bmN0aW9uXCIgPyBfX3ZhbHVlcyhvKSA6IG9bU3ltYm9sLml0ZXJhdG9yXSgpLCBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaSk7XG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxuICAgIGZ1bmN0aW9uIHNldHRsZShyZXNvbHZlLCByZWplY3QsIGQsIHYpIHsgUHJvbWlzZS5yZXNvbHZlKHYpLnRoZW4oZnVuY3Rpb24odikgeyByZXNvbHZlKHsgdmFsdWU6IHYsIGRvbmU6IGQgfSk7IH0sIHJlamVjdCk7IH1cbn07XG52YXIgX19hd2FpdCA9ICh1bmRlZmluZWQgJiYgdW5kZWZpbmVkLl9fYXdhaXQpIHx8IGZ1bmN0aW9uICh2KSB7IHJldHVybiB0aGlzIGluc3RhbmNlb2YgX19hd2FpdCA/ICh0aGlzLnYgPSB2LCB0aGlzKSA6IG5ldyBfX2F3YWl0KHYpOyB9XG52YXIgX19hc3luY0dlbmVyYXRvciA9ICh1bmRlZmluZWQgJiYgdW5kZWZpbmVkLl9fYXN5bmNHZW5lcmF0b3IpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBnZW5lcmF0b3IpIHtcbiAgICBpZiAoIVN5bWJvbC5hc3luY0l0ZXJhdG9yKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiU3ltYm9sLmFzeW5jSXRlcmF0b3IgaXMgbm90IGRlZmluZWQuXCIpO1xuICAgIHZhciBnID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pLCBpLCBxID0gW107XG4gICAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiKSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xuICAgIGZ1bmN0aW9uIHZlcmIobikgeyBpZiAoZ1tuXSkgaVtuXSA9IGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAoYSwgYikgeyBxLnB1c2goW24sIHYsIGEsIGJdKSA+IDEgfHwgcmVzdW1lKG4sIHYpOyB9KTsgfTsgfVxuICAgIGZ1bmN0aW9uIHJlc3VtZShuLCB2KSB7IHRyeSB7IHN0ZXAoZ1tuXSh2KSk7IH0gY2F0Y2ggKGUpIHsgc2V0dGxlKHFbMF1bM10sIGUpOyB9IH1cbiAgICBmdW5jdGlvbiBzdGVwKHIpIHsgci52YWx1ZSBpbnN0YW5jZW9mIF9fYXdhaXQgPyBQcm9taXNlLnJlc29sdmUoci52YWx1ZS52KS50aGVuKGZ1bGZpbGwsIHJlamVjdCkgOiBzZXR0bGUocVswXVsyXSwgcik7IH1cbiAgICBmdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7IHJlc3VtZShcIm5leHRcIiwgdmFsdWUpOyB9XG4gICAgZnVuY3Rpb24gcmVqZWN0KHZhbHVlKSB7IHJlc3VtZShcInRocm93XCIsIHZhbHVlKTsgfVxuICAgIGZ1bmN0aW9uIHNldHRsZShmLCB2KSB7IGlmIChmKHYpLCBxLnNoaWZ0KCksIHEubGVuZ3RoKSByZXN1bWUocVswXVswXSwgcVswXVsxXSk7IH1cbn07XG5cblxuXG5cblxuXG5cbnZhciBpc1ZhbGlkTWFwS2V5VHlwZSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICB2YXIga2V5VHlwZSA9IHR5cGVvZiBrZXk7XG4gICAgcmV0dXJuIGtleVR5cGUgPT09IFwic3RyaW5nXCIgfHwga2V5VHlwZSA9PT0gXCJudW1iZXJcIjtcbn07XG52YXIgSEVBRF9CWVRFX1JFUVVJUkVEID0gLTE7XG52YXIgRU1QVFlfVklFVyA9IG5ldyBEYXRhVmlldyhuZXcgQXJyYXlCdWZmZXIoMCkpO1xudmFyIEVNUFRZX0JZVEVTID0gbmV3IFVpbnQ4QXJyYXkoRU1QVFlfVklFVy5idWZmZXIpO1xuLy8gSUUxMTogSGFjayB0byBzdXBwb3J0IElFMTEuXG4vLyBJRTExOiBEcm9wIHRoaXMgaGFjayBhbmQganVzdCB1c2UgUmFuZ2VFcnJvciB3aGVuIElFMTEgaXMgb2Jzb2xldGUuXG52YXIgRGF0YVZpZXdJbmRleE91dE9mQm91bmRzRXJyb3IgPSAoZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIC8vIElFMTE6IFRoZSBzcGVjIHNheXMgaXQgc2hvdWxkIHRocm93IFJhbmdlRXJyb3IsXG4gICAgICAgIC8vIElFMTE6IGJ1dCBpbiBJRTExIGl0IHRocm93cyBUeXBlRXJyb3IuXG4gICAgICAgIEVNUFRZX1ZJRVcuZ2V0SW50OCgwKTtcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIGUuY29uc3RydWN0b3I7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihcIm5ldmVyIHJlYWNoZWRcIik7XG59KSgpO1xudmFyIE1PUkVfREFUQSA9IG5ldyBEYXRhVmlld0luZGV4T3V0T2ZCb3VuZHNFcnJvcihcIkluc3VmZmljaWVudCBkYXRhXCIpO1xudmFyIHNoYXJlZENhY2hlZEtleURlY29kZXIgPSBuZXcgX0NhY2hlZEtleURlY29kZXJfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uQ2FjaGVkS2V5RGVjb2RlcigpO1xudmFyIERlY29kZXIgPSAvKiogQGNsYXNzICovIChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRGVjb2RlcihleHRlbnNpb25Db2RlYywgY29udGV4dCwgbWF4U3RyTGVuZ3RoLCBtYXhCaW5MZW5ndGgsIG1heEFycmF5TGVuZ3RoLCBtYXhNYXBMZW5ndGgsIG1heEV4dExlbmd0aCwga2V5RGVjb2Rlcikge1xuICAgICAgICBpZiAoZXh0ZW5zaW9uQ29kZWMgPT09IHZvaWQgMCkgeyBleHRlbnNpb25Db2RlYyA9IF9FeHRlbnNpb25Db2RlY19tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5FeHRlbnNpb25Db2RlYy5kZWZhdWx0Q29kZWM7IH1cbiAgICAgICAgaWYgKGNvbnRleHQgPT09IHZvaWQgMCkgeyBjb250ZXh0ID0gdW5kZWZpbmVkOyB9XG4gICAgICAgIGlmIChtYXhTdHJMZW5ndGggPT09IHZvaWQgMCkgeyBtYXhTdHJMZW5ndGggPSBfdXRpbHNfaW50X21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLlVJTlQzMl9NQVg7IH1cbiAgICAgICAgaWYgKG1heEJpbkxlbmd0aCA9PT0gdm9pZCAwKSB7IG1heEJpbkxlbmd0aCA9IF91dGlsc19pbnRfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18uVUlOVDMyX01BWDsgfVxuICAgICAgICBpZiAobWF4QXJyYXlMZW5ndGggPT09IHZvaWQgMCkgeyBtYXhBcnJheUxlbmd0aCA9IF91dGlsc19pbnRfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18uVUlOVDMyX01BWDsgfVxuICAgICAgICBpZiAobWF4TWFwTGVuZ3RoID09PSB2b2lkIDApIHsgbWF4TWFwTGVuZ3RoID0gX3V0aWxzX2ludF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXy5VSU5UMzJfTUFYOyB9XG4gICAgICAgIGlmIChtYXhFeHRMZW5ndGggPT09IHZvaWQgMCkgeyBtYXhFeHRMZW5ndGggPSBfdXRpbHNfaW50X21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLlVJTlQzMl9NQVg7IH1cbiAgICAgICAgaWYgKGtleURlY29kZXIgPT09IHZvaWQgMCkgeyBrZXlEZWNvZGVyID0gc2hhcmVkQ2FjaGVkS2V5RGVjb2RlcjsgfVxuICAgICAgICB0aGlzLmV4dGVuc2lvbkNvZGVjID0gZXh0ZW5zaW9uQ29kZWM7XG4gICAgICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgIHRoaXMubWF4U3RyTGVuZ3RoID0gbWF4U3RyTGVuZ3RoO1xuICAgICAgICB0aGlzLm1heEJpbkxlbmd0aCA9IG1heEJpbkxlbmd0aDtcbiAgICAgICAgdGhpcy5tYXhBcnJheUxlbmd0aCA9IG1heEFycmF5TGVuZ3RoO1xuICAgICAgICB0aGlzLm1heE1hcExlbmd0aCA9IG1heE1hcExlbmd0aDtcbiAgICAgICAgdGhpcy5tYXhFeHRMZW5ndGggPSBtYXhFeHRMZW5ndGg7XG4gICAgICAgIHRoaXMua2V5RGVjb2RlciA9IGtleURlY29kZXI7XG4gICAgICAgIHRoaXMudG90YWxQb3MgPSAwO1xuICAgICAgICB0aGlzLnBvcyA9IDA7XG4gICAgICAgIHRoaXMudmlldyA9IEVNUFRZX1ZJRVc7XG4gICAgICAgIHRoaXMuYnl0ZXMgPSBFTVBUWV9CWVRFUztcbiAgICAgICAgdGhpcy5oZWFkQnl0ZSA9IEhFQURfQllURV9SRVFVSVJFRDtcbiAgICAgICAgdGhpcy5zdGFjayA9IFtdO1xuICAgIH1cbiAgICBEZWNvZGVyLnByb3RvdHlwZS5yZWluaXRpYWxpemVTdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy50b3RhbFBvcyA9IDA7XG4gICAgICAgIHRoaXMuaGVhZEJ5dGUgPSBIRUFEX0JZVEVfUkVRVUlSRUQ7XG4gICAgICAgIHRoaXMuc3RhY2subGVuZ3RoID0gMDtcbiAgICAgICAgLy8gdmlldywgYnl0ZXMsIGFuZCBwb3Mgd2lsbCBiZSByZS1pbml0aWFsaXplZCBpbiBzZXRCdWZmZXIoKVxuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUuc2V0QnVmZmVyID0gZnVuY3Rpb24gKGJ1ZmZlcikge1xuICAgICAgICB0aGlzLmJ5dGVzID0gKDAsX3V0aWxzX3R5cGVkQXJyYXlzX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfM19fLmVuc3VyZVVpbnQ4QXJyYXkpKGJ1ZmZlcik7XG4gICAgICAgIHRoaXMudmlldyA9ICgwLF91dGlsc190eXBlZEFycmF5c19tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzNfXy5jcmVhdGVEYXRhVmlldykodGhpcy5ieXRlcyk7XG4gICAgICAgIHRoaXMucG9zID0gMDtcbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLmFwcGVuZEJ1ZmZlciA9IGZ1bmN0aW9uIChidWZmZXIpIHtcbiAgICAgICAgaWYgKHRoaXMuaGVhZEJ5dGUgPT09IEhFQURfQllURV9SRVFVSVJFRCAmJiAhdGhpcy5oYXNSZW1haW5pbmcoMSkpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0QnVmZmVyKGJ1ZmZlcik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB2YXIgcmVtYWluaW5nRGF0YSA9IHRoaXMuYnl0ZXMuc3ViYXJyYXkodGhpcy5wb3MpO1xuICAgICAgICAgICAgdmFyIG5ld0RhdGEgPSAoMCxfdXRpbHNfdHlwZWRBcnJheXNfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8zX18uZW5zdXJlVWludDhBcnJheSkoYnVmZmVyKTtcbiAgICAgICAgICAgIC8vIGNvbmNhdCByZW1haW5pbmdEYXRhICsgbmV3RGF0YVxuICAgICAgICAgICAgdmFyIG5ld0J1ZmZlciA9IG5ldyBVaW50OEFycmF5KHJlbWFpbmluZ0RhdGEubGVuZ3RoICsgbmV3RGF0YS5sZW5ndGgpO1xuICAgICAgICAgICAgbmV3QnVmZmVyLnNldChyZW1haW5pbmdEYXRhKTtcbiAgICAgICAgICAgIG5ld0J1ZmZlci5zZXQobmV3RGF0YSwgcmVtYWluaW5nRGF0YS5sZW5ndGgpO1xuICAgICAgICAgICAgdGhpcy5zZXRCdWZmZXIobmV3QnVmZmVyKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUuaGFzUmVtYWluaW5nID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlldy5ieXRlTGVuZ3RoIC0gdGhpcy5wb3MgPj0gc2l6ZTtcbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLmNyZWF0ZUV4dHJhQnl0ZUVycm9yID0gZnVuY3Rpb24gKHBvc1RvU2hvdykge1xuICAgICAgICB2YXIgX2EgPSB0aGlzLCB2aWV3ID0gX2EudmlldywgcG9zID0gX2EucG9zO1xuICAgICAgICByZXR1cm4gbmV3IFJhbmdlRXJyb3IoXCJFeHRyYSBcIi5jb25jYXQodmlldy5ieXRlTGVuZ3RoIC0gcG9zLCBcIiBvZiBcIikuY29uY2F0KHZpZXcuYnl0ZUxlbmd0aCwgXCIgYnl0ZShzKSBmb3VuZCBhdCBidWZmZXJbXCIpLmNvbmNhdChwb3NUb1Nob3csIFwiXVwiKSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBAdGhyb3dzIHtAbGluayBEZWNvZGVFcnJvcn1cbiAgICAgKiBAdGhyb3dzIHtAbGluayBSYW5nZUVycm9yfVxuICAgICAqL1xuICAgIERlY29kZXIucHJvdG90eXBlLmRlY29kZSA9IGZ1bmN0aW9uIChidWZmZXIpIHtcbiAgICAgICAgdGhpcy5yZWluaXRpYWxpemVTdGF0ZSgpO1xuICAgICAgICB0aGlzLnNldEJ1ZmZlcihidWZmZXIpO1xuICAgICAgICB2YXIgb2JqZWN0ID0gdGhpcy5kb0RlY29kZVN5bmMoKTtcbiAgICAgICAgaWYgKHRoaXMuaGFzUmVtYWluaW5nKDEpKSB7XG4gICAgICAgICAgICB0aHJvdyB0aGlzLmNyZWF0ZUV4dHJhQnl0ZUVycm9yKHRoaXMucG9zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUuZGVjb2RlTXVsdGkgPSBmdW5jdGlvbiAoYnVmZmVyKSB7XG4gICAgICAgIHJldHVybiBfX2dlbmVyYXRvcih0aGlzLCBmdW5jdGlvbiAoX2EpIHtcbiAgICAgICAgICAgIHN3aXRjaCAoX2EubGFiZWwpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVpbml0aWFsaXplU3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRCdWZmZXIoYnVmZmVyKTtcbiAgICAgICAgICAgICAgICAgICAgX2EubGFiZWwgPSAxO1xuICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmhhc1JlbWFpbmluZygxKSkgcmV0dXJuIFszIC8qYnJlYWsqLywgM107XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbNCAvKnlpZWxkKi8sIHRoaXMuZG9EZWNvZGVTeW5jKCldO1xuICAgICAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgICAgICAgX2Euc2VudCgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzMgLypicmVhayovLCAxXTtcbiAgICAgICAgICAgICAgICBjYXNlIDM6IHJldHVybiBbMiAvKnJldHVybiovXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5kZWNvZGVBc3luYyA9IGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgdmFyIHN0cmVhbV8xLCBzdHJlYW1fMV8xO1xuICAgICAgICB2YXIgZV8xLCBfYTtcbiAgICAgICAgcmV0dXJuIF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGRlY29kZWQsIG9iamVjdCwgYnVmZmVyLCBlXzFfMSwgX2IsIGhlYWRCeXRlLCBwb3MsIHRvdGFsUG9zO1xuICAgICAgICAgICAgcmV0dXJuIF9fZ2VuZXJhdG9yKHRoaXMsIGZ1bmN0aW9uIChfYykge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoX2MubGFiZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICAgICAgZGVjb2RlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgX2MubGFiZWwgPSAxO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgICAgICBfYy50cnlzLnB1c2goWzEsIDYsIDcsIDEyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJlYW1fMSA9IF9fYXN5bmNWYWx1ZXMoc3RyZWFtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9jLmxhYmVsID0gMjtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAyOiByZXR1cm4gWzQgLyp5aWVsZCovLCBzdHJlYW1fMS5uZXh0KCldO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIShzdHJlYW1fMV8xID0gX2Muc2VudCgpLCAhc3RyZWFtXzFfMS5kb25lKSkgcmV0dXJuIFszIC8qYnJlYWsqLywgNV07XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSBzdHJlYW1fMV8xLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRlY29kZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyB0aGlzLmNyZWF0ZUV4dHJhQnl0ZUVycm9yKHRoaXMudG90YWxQb3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRCdWZmZXIoYnVmZmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5kb0RlY29kZVN5bmMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWNvZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEoZSBpbnN0YW5jZW9mIERhdGFWaWV3SW5kZXhPdXRPZkJvdW5kc0Vycm9yKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlOyAvLyByZXRocm93XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZhbGx0aHJvdWdoXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRvdGFsUG9zICs9IHRoaXMucG9zO1xuICAgICAgICAgICAgICAgICAgICAgICAgX2MubGFiZWwgPSA0O1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQ6IHJldHVybiBbMyAvKmJyZWFrKi8sIDJdO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDU6IHJldHVybiBbMyAvKmJyZWFrKi8sIDEyXTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA2OlxuICAgICAgICAgICAgICAgICAgICAgICAgZV8xXzEgPSBfYy5zZW50KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlXzEgPSB7IGVycm9yOiBlXzFfMSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFszIC8qYnJlYWsqLywgMTJdO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDc6XG4gICAgICAgICAgICAgICAgICAgICAgICBfYy50cnlzLnB1c2goWzcsICwgMTAsIDExXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIShzdHJlYW1fMV8xICYmICFzdHJlYW1fMV8xLmRvbmUgJiYgKF9hID0gc3RyZWFtXzEucmV0dXJuKSkpIHJldHVybiBbMyAvKmJyZWFrKi8sIDldO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFs0IC8qeWllbGQqLywgX2EuY2FsbChzdHJlYW1fMSldO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDg6XG4gICAgICAgICAgICAgICAgICAgICAgICBfYy5zZW50KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBfYy5sYWJlbCA9IDk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgOTogcmV0dXJuIFszIC8qYnJlYWsqLywgMTFdO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDEwOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVfMSkgdGhyb3cgZV8xLmVycm9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFs3IC8qZW5kZmluYWxseSovXTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxMTogcmV0dXJuIFs3IC8qZW5kZmluYWxseSovXTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxMjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZWNvZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaGFzUmVtYWluaW5nKDEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXh0cmFCeXRlRXJyb3IodGhpcy50b3RhbFBvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbMiAvKnJldHVybiovLCBvYmplY3RdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgX2IgPSB0aGlzLCBoZWFkQnl0ZSA9IF9iLmhlYWRCeXRlLCBwb3MgPSBfYi5wb3MsIHRvdGFsUG9zID0gX2IudG90YWxQb3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihcIkluc3VmZmljaWVudCBkYXRhIGluIHBhcnNpbmcgXCIuY29uY2F0KCgwLF91dGlsc19wcmV0dHlCeXRlX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfNF9fLnByZXR0eUJ5dGUpKGhlYWRCeXRlKSwgXCIgYXQgXCIpLmNvbmNhdCh0b3RhbFBvcywgXCIgKFwiKS5jb25jYXQocG9zLCBcIiBpbiB0aGUgY3VycmVudCBidWZmZXIpXCIpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5kZWNvZGVBcnJheVN0cmVhbSA9IGZ1bmN0aW9uIChzdHJlYW0pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZGVjb2RlTXVsdGlBc3luYyhzdHJlYW0sIHRydWUpO1xuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUuZGVjb2RlU3RyZWFtID0gZnVuY3Rpb24gKHN0cmVhbSkge1xuICAgICAgICByZXR1cm4gdGhpcy5kZWNvZGVNdWx0aUFzeW5jKHN0cmVhbSwgZmFsc2UpO1xuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUuZGVjb2RlTXVsdGlBc3luYyA9IGZ1bmN0aW9uIChzdHJlYW0sIGlzQXJyYXkpIHtcbiAgICAgICAgcmV0dXJuIF9fYXN5bmNHZW5lcmF0b3IodGhpcywgYXJndW1lbnRzLCBmdW5jdGlvbiBkZWNvZGVNdWx0aUFzeW5jXzEoKSB7XG4gICAgICAgICAgICB2YXIgaXNBcnJheUhlYWRlclJlcXVpcmVkLCBhcnJheUl0ZW1zTGVmdCwgc3RyZWFtXzIsIHN0cmVhbV8yXzEsIGJ1ZmZlciwgZV8yLCBlXzNfMTtcbiAgICAgICAgICAgIHZhciBlXzMsIF9hO1xuICAgICAgICAgICAgcmV0dXJuIF9fZ2VuZXJhdG9yKHRoaXMsIGZ1bmN0aW9uIChfYikge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoX2IubGFiZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICAgICAgaXNBcnJheUhlYWRlclJlcXVpcmVkID0gaXNBcnJheTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFycmF5SXRlbXNMZWZ0ID0gLTE7XG4gICAgICAgICAgICAgICAgICAgICAgICBfYi5sYWJlbCA9IDE7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgICAgIF9iLnRyeXMucHVzaChbMSwgMTMsIDE0LCAxOV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyZWFtXzIgPSBfX2FzeW5jVmFsdWVzKHN0cmVhbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBfYi5sYWJlbCA9IDI7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMjogcmV0dXJuIFs0IC8qeWllbGQqLywgX19hd2FpdChzdHJlYW1fMi5uZXh0KCkpXTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEoc3RyZWFtXzJfMSA9IF9iLnNlbnQoKSwgIXN0cmVhbV8yXzEuZG9uZSkpIHJldHVybiBbMyAvKmJyZWFrKi8sIDEyXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlciA9IHN0cmVhbV8yXzEudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNBcnJheSAmJiBhcnJheUl0ZW1zTGVmdCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IHRoaXMuY3JlYXRlRXh0cmFCeXRlRXJyb3IodGhpcy50b3RhbFBvcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGVuZEJ1ZmZlcihidWZmZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzQXJyYXlIZWFkZXJSZXF1aXJlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFycmF5SXRlbXNMZWZ0ID0gdGhpcy5yZWFkQXJyYXlTaXplKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNBcnJheUhlYWRlclJlcXVpcmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgX2IubGFiZWwgPSA0O1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBfYi50cnlzLnB1c2goWzQsIDksICwgMTBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9iLmxhYmVsID0gNTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1OlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZhbHNlKSB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFs0IC8qeWllbGQqLywgX19hd2FpdCh0aGlzLmRvRGVjb2RlU3luYygpKV07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNjogcmV0dXJuIFs0IC8qeWllbGQqLywgX2Iuc2VudCgpXTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA3OlxuICAgICAgICAgICAgICAgICAgICAgICAgX2Iuc2VudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKC0tYXJyYXlJdGVtc0xlZnQgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzMgLypicmVhayovLCA4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbMyAvKmJyZWFrKi8sIDVdO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDg6IHJldHVybiBbMyAvKmJyZWFrKi8sIDEwXTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA5OlxuICAgICAgICAgICAgICAgICAgICAgICAgZV8yID0gX2Iuc2VudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEoZV8yIGluc3RhbmNlb2YgRGF0YVZpZXdJbmRleE91dE9mQm91bmRzRXJyb3IpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgZV8yOyAvLyByZXRocm93XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzMgLypicmVhayovLCAxMF07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTA6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRvdGFsUG9zICs9IHRoaXMucG9zO1xuICAgICAgICAgICAgICAgICAgICAgICAgX2IubGFiZWwgPSAxMTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxMTogcmV0dXJuIFszIC8qYnJlYWsqLywgMl07XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTI6IHJldHVybiBbMyAvKmJyZWFrKi8sIDE5XTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxMzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGVfM18xID0gX2Iuc2VudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZV8zID0geyBlcnJvcjogZV8zXzEgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbMyAvKmJyZWFrKi8sIDE5XTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxNDpcbiAgICAgICAgICAgICAgICAgICAgICAgIF9iLnRyeXMucHVzaChbMTQsICwgMTcsIDE4XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIShzdHJlYW1fMl8xICYmICFzdHJlYW1fMl8xLmRvbmUgJiYgKF9hID0gc3RyZWFtXzIucmV0dXJuKSkpIHJldHVybiBbMyAvKmJyZWFrKi8sIDE2XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbNCAvKnlpZWxkKi8sIF9fYXdhaXQoX2EuY2FsbChzdHJlYW1fMikpXTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxNTpcbiAgICAgICAgICAgICAgICAgICAgICAgIF9iLnNlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIF9iLmxhYmVsID0gMTY7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTY6IHJldHVybiBbMyAvKmJyZWFrKi8sIDE4XTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxNzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlXzMpIHRocm93IGVfMy5lcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbNyAvKmVuZGZpbmFsbHkqL107XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTg6IHJldHVybiBbNyAvKmVuZGZpbmFsbHkqL107XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTk6IHJldHVybiBbMiAvKnJldHVybiovXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5kb0RlY29kZVN5bmMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIERFQ09ERTogd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgIHZhciBoZWFkQnl0ZSA9IHRoaXMucmVhZEhlYWRCeXRlKCk7XG4gICAgICAgICAgICB2YXIgb2JqZWN0ID0gdm9pZCAwO1xuICAgICAgICAgICAgaWYgKGhlYWRCeXRlID49IDB4ZTApIHtcbiAgICAgICAgICAgICAgICAvLyBuZWdhdGl2ZSBmaXhpbnQgKDExMXggeHh4eCkgMHhlMCAtIDB4ZmZcbiAgICAgICAgICAgICAgICBvYmplY3QgPSBoZWFkQnl0ZSAtIDB4MTAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPCAweGMwKSB7XG4gICAgICAgICAgICAgICAgaWYgKGhlYWRCeXRlIDwgMHg4MCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBwb3NpdGl2ZSBmaXhpbnQgKDB4eHggeHh4eCkgMHgwMCAtIDB4N2ZcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0ID0gaGVhZEJ5dGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlIDwgMHg5MCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBmaXhtYXAgKDEwMDAgeHh4eCkgMHg4MCAtIDB4OGZcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNpemUgPSBoZWFkQnl0ZSAtIDB4ODA7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzaXplICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1c2hNYXBTdGF0ZShzaXplKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29tcGxldGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIERFQ09ERTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdCA9IHt9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlIDwgMHhhMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBmaXhhcnJheSAoMTAwMSB4eHh4KSAweDkwIC0gMHg5ZlxuICAgICAgICAgICAgICAgICAgICB2YXIgc2l6ZSA9IGhlYWRCeXRlIC0gMHg5MDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNpemUgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEFycmF5U3RhdGUoc2l6ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZSBERUNPREU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZml4c3RyICgxMDF4IHh4eHgpIDB4YTAgLSAweGJmXG4gICAgICAgICAgICAgICAgICAgIHZhciBieXRlTGVuZ3RoID0gaGVhZEJ5dGUgLSAweGEwO1xuICAgICAgICAgICAgICAgICAgICBvYmplY3QgPSB0aGlzLmRlY29kZVV0ZjhTdHJpbmcoYnl0ZUxlbmd0aCwgMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4YzApIHtcbiAgICAgICAgICAgICAgICAvLyBuaWxcbiAgICAgICAgICAgICAgICBvYmplY3QgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4YzIpIHtcbiAgICAgICAgICAgICAgICAvLyBmYWxzZVxuICAgICAgICAgICAgICAgIG9iamVjdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4YzMpIHtcbiAgICAgICAgICAgICAgICAvLyB0cnVlXG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlID09PSAweGNhKSB7XG4gICAgICAgICAgICAgICAgLy8gZmxvYXQgMzJcbiAgICAgICAgICAgICAgICBvYmplY3QgPSB0aGlzLnJlYWRGMzIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlID09PSAweGNiKSB7XG4gICAgICAgICAgICAgICAgLy8gZmxvYXQgNjRcbiAgICAgICAgICAgICAgICBvYmplY3QgPSB0aGlzLnJlYWRGNjQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlID09PSAweGNjKSB7XG4gICAgICAgICAgICAgICAgLy8gdWludCA4XG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5yZWFkVTgoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlID09PSAweGNkKSB7XG4gICAgICAgICAgICAgICAgLy8gdWludCAxNlxuICAgICAgICAgICAgICAgIG9iamVjdCA9IHRoaXMucmVhZFUxNigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4Y2UpIHtcbiAgICAgICAgICAgICAgICAvLyB1aW50IDMyXG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5yZWFkVTMyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhjZikge1xuICAgICAgICAgICAgICAgIC8vIHVpbnQgNjRcbiAgICAgICAgICAgICAgICBvYmplY3QgPSB0aGlzLnJlYWRVNjQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlID09PSAweGQwKSB7XG4gICAgICAgICAgICAgICAgLy8gaW50IDhcbiAgICAgICAgICAgICAgICBvYmplY3QgPSB0aGlzLnJlYWRJOCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4ZDEpIHtcbiAgICAgICAgICAgICAgICAvLyBpbnQgMTZcbiAgICAgICAgICAgICAgICBvYmplY3QgPSB0aGlzLnJlYWRJMTYoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlID09PSAweGQyKSB7XG4gICAgICAgICAgICAgICAgLy8gaW50IDMyXG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5yZWFkSTMyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhkMykge1xuICAgICAgICAgICAgICAgIC8vIGludCA2NFxuICAgICAgICAgICAgICAgIG9iamVjdCA9IHRoaXMucmVhZEk2NCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4ZDkpIHtcbiAgICAgICAgICAgICAgICAvLyBzdHIgOFxuICAgICAgICAgICAgICAgIHZhciBieXRlTGVuZ3RoID0gdGhpcy5sb29rVTgoKTtcbiAgICAgICAgICAgICAgICBvYmplY3QgPSB0aGlzLmRlY29kZVV0ZjhTdHJpbmcoYnl0ZUxlbmd0aCwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhkYSkge1xuICAgICAgICAgICAgICAgIC8vIHN0ciAxNlxuICAgICAgICAgICAgICAgIHZhciBieXRlTGVuZ3RoID0gdGhpcy5sb29rVTE2KCk7XG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5kZWNvZGVVdGY4U3RyaW5nKGJ5dGVMZW5ndGgsIDIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4ZGIpIHtcbiAgICAgICAgICAgICAgICAvLyBzdHIgMzJcbiAgICAgICAgICAgICAgICB2YXIgYnl0ZUxlbmd0aCA9IHRoaXMubG9va1UzMigpO1xuICAgICAgICAgICAgICAgIG9iamVjdCA9IHRoaXMuZGVjb2RlVXRmOFN0cmluZyhieXRlTGVuZ3RoLCA0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlID09PSAweGRjKSB7XG4gICAgICAgICAgICAgICAgLy8gYXJyYXkgMTZcbiAgICAgICAgICAgICAgICB2YXIgc2l6ZSA9IHRoaXMucmVhZFUxNigpO1xuICAgICAgICAgICAgICAgIGlmIChzaXplICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaEFycmF5U3RhdGUoc2l6ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29tcGxldGUoKTtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWUgREVDT0RFO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0ID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4ZGQpIHtcbiAgICAgICAgICAgICAgICAvLyBhcnJheSAzMlxuICAgICAgICAgICAgICAgIHZhciBzaXplID0gdGhpcy5yZWFkVTMyKCk7XG4gICAgICAgICAgICAgICAgaWYgKHNpemUgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoQXJyYXlTdGF0ZShzaXplKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZSBERUNPREU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvYmplY3QgPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhkZSkge1xuICAgICAgICAgICAgICAgIC8vIG1hcCAxNlxuICAgICAgICAgICAgICAgIHZhciBzaXplID0gdGhpcy5yZWFkVTE2KCk7XG4gICAgICAgICAgICAgICAgaWYgKHNpemUgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoTWFwU3RhdGUoc2l6ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29tcGxldGUoKTtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWUgREVDT0RFO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0ID0ge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoaGVhZEJ5dGUgPT09IDB4ZGYpIHtcbiAgICAgICAgICAgICAgICAvLyBtYXAgMzJcbiAgICAgICAgICAgICAgICB2YXIgc2l6ZSA9IHRoaXMucmVhZFUzMigpO1xuICAgICAgICAgICAgICAgIGlmIChzaXplICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHVzaE1hcFN0YXRlKHNpemUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbXBsZXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlIERFQ09ERTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdCA9IHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlID09PSAweGM0KSB7XG4gICAgICAgICAgICAgICAgLy8gYmluIDhcbiAgICAgICAgICAgICAgICB2YXIgc2l6ZSA9IHRoaXMubG9va1U4KCk7XG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5kZWNvZGVCaW5hcnkoc2l6ZSwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhjNSkge1xuICAgICAgICAgICAgICAgIC8vIGJpbiAxNlxuICAgICAgICAgICAgICAgIHZhciBzaXplID0gdGhpcy5sb29rVTE2KCk7XG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5kZWNvZGVCaW5hcnkoc2l6ZSwgMik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhjNikge1xuICAgICAgICAgICAgICAgIC8vIGJpbiAzMlxuICAgICAgICAgICAgICAgIHZhciBzaXplID0gdGhpcy5sb29rVTMyKCk7XG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5kZWNvZGVCaW5hcnkoc2l6ZSwgNCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhkNCkge1xuICAgICAgICAgICAgICAgIC8vIGZpeGV4dCAxXG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5kZWNvZGVFeHRlbnNpb24oMSwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhkNSkge1xuICAgICAgICAgICAgICAgIC8vIGZpeGV4dCAyXG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5kZWNvZGVFeHRlbnNpb24oMiwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhkNikge1xuICAgICAgICAgICAgICAgIC8vIGZpeGV4dCA0XG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5kZWNvZGVFeHRlbnNpb24oNCwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhkNykge1xuICAgICAgICAgICAgICAgIC8vIGZpeGV4dCA4XG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5kZWNvZGVFeHRlbnNpb24oOCwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhkOCkge1xuICAgICAgICAgICAgICAgIC8vIGZpeGV4dCAxNlxuICAgICAgICAgICAgICAgIG9iamVjdCA9IHRoaXMuZGVjb2RlRXh0ZW5zaW9uKDE2LCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGhlYWRCeXRlID09PSAweGM3KSB7XG4gICAgICAgICAgICAgICAgLy8gZXh0IDhcbiAgICAgICAgICAgICAgICB2YXIgc2l6ZSA9IHRoaXMubG9va1U4KCk7XG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5kZWNvZGVFeHRlbnNpb24oc2l6ZSwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhjOCkge1xuICAgICAgICAgICAgICAgIC8vIGV4dCAxNlxuICAgICAgICAgICAgICAgIHZhciBzaXplID0gdGhpcy5sb29rVTE2KCk7XG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5kZWNvZGVFeHRlbnNpb24oc2l6ZSwgMik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChoZWFkQnl0ZSA9PT0gMHhjOSkge1xuICAgICAgICAgICAgICAgIC8vIGV4dCAzMlxuICAgICAgICAgICAgICAgIHZhciBzaXplID0gdGhpcy5sb29rVTMyKCk7XG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5kZWNvZGVFeHRlbnNpb24oc2l6ZSwgNCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgX0RlY29kZUVycm9yX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfNV9fLkRlY29kZUVycm9yKFwiVW5yZWNvZ25pemVkIHR5cGUgYnl0ZTogXCIuY29uY2F0KCgwLF91dGlsc19wcmV0dHlCeXRlX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfNF9fLnByZXR0eUJ5dGUpKGhlYWRCeXRlKSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgdmFyIHN0YWNrID0gdGhpcy5zdGFjaztcbiAgICAgICAgICAgIHdoaWxlIChzdGFjay5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gYXJyYXlzIGFuZCBtYXBzXG4gICAgICAgICAgICAgICAgdmFyIHN0YXRlID0gc3RhY2tbc3RhY2subGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlLnR5cGUgPT09IDAgLyogU3RhdGUuQVJSQVkgKi8pIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUuYXJyYXlbc3RhdGUucG9zaXRpb25dID0gb2JqZWN0O1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5wb3NpdGlvbisrO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdGUucG9zaXRpb24gPT09IHN0YXRlLnNpemUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0ID0gc3RhdGUuYXJyYXk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZSBERUNPREU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoc3RhdGUudHlwZSA9PT0gMSAvKiBTdGF0ZS5NQVBfS0VZICovKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghaXNWYWxpZE1hcEtleVR5cGUob2JqZWN0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IF9EZWNvZGVFcnJvcl9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzVfXy5EZWNvZGVFcnJvcihcIlRoZSB0eXBlIG9mIGtleSBtdXN0IGJlIHN0cmluZyBvciBudW1iZXIgYnV0IFwiICsgdHlwZW9mIG9iamVjdCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKG9iamVjdCA9PT0gXCJfX3Byb3RvX19cIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IF9EZWNvZGVFcnJvcl9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzVfXy5EZWNvZGVFcnJvcihcIlRoZSBrZXkgX19wcm90b19fIGlzIG5vdCBhbGxvd2VkXCIpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLmtleSA9IG9iamVjdDtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUudHlwZSA9IDIgLyogU3RhdGUuTUFQX1ZBTFVFICovO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZSBERUNPREU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBpdCBtdXN0IGJlIGBzdGF0ZS50eXBlID09PSBTdGF0ZS5NQVBfVkFMVUVgIGhlcmVcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUubWFwW3N0YXRlLmtleV0gPSBvYmplY3Q7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLnJlYWRDb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdGUucmVhZENvdW50ID09PSBzdGF0ZS5zaXplKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFjay5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdCA9IHN0YXRlLm1hcDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlLmtleSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS50eXBlID0gMSAvKiBTdGF0ZS5NQVBfS0VZICovO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWUgREVDT0RFO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgfVxuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUucmVhZEhlYWRCeXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5oZWFkQnl0ZSA9PT0gSEVBRF9CWVRFX1JFUVVJUkVEKSB7XG4gICAgICAgICAgICB0aGlzLmhlYWRCeXRlID0gdGhpcy5yZWFkVTgoKTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiaGVhZEJ5dGVcIiwgcHJldHR5Qnl0ZSh0aGlzLmhlYWRCeXRlKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuaGVhZEJ5dGU7XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5jb21wbGV0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5oZWFkQnl0ZSA9IEhFQURfQllURV9SRVFVSVJFRDtcbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLnJlYWRBcnJheVNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBoZWFkQnl0ZSA9IHRoaXMucmVhZEhlYWRCeXRlKCk7XG4gICAgICAgIHN3aXRjaCAoaGVhZEJ5dGUpIHtcbiAgICAgICAgICAgIGNhc2UgMHhkYzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZWFkVTE2KCk7XG4gICAgICAgICAgICBjYXNlIDB4ZGQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVhZFUzMigpO1xuICAgICAgICAgICAgZGVmYXVsdDoge1xuICAgICAgICAgICAgICAgIGlmIChoZWFkQnl0ZSA8IDB4YTApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGhlYWRCeXRlIC0gMHg5MDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBfRGVjb2RlRXJyb3JfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV81X18uRGVjb2RlRXJyb3IoXCJVbnJlY29nbml6ZWQgYXJyYXkgdHlwZSBieXRlOiBcIi5jb25jYXQoKDAsX3V0aWxzX3ByZXR0eUJ5dGVfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV80X18ucHJldHR5Qnl0ZSkoaGVhZEJ5dGUpKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5wdXNoTWFwU3RhdGUgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICAgICAgICBpZiAoc2l6ZSA+IHRoaXMubWF4TWFwTGVuZ3RoKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgX0RlY29kZUVycm9yX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfNV9fLkRlY29kZUVycm9yKFwiTWF4IGxlbmd0aCBleGNlZWRlZDogbWFwIGxlbmd0aCAoXCIuY29uY2F0KHNpemUsIFwiKSA+IG1heE1hcExlbmd0aExlbmd0aCAoXCIpLmNvbmNhdCh0aGlzLm1heE1hcExlbmd0aCwgXCIpXCIpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnN0YWNrLnB1c2goe1xuICAgICAgICAgICAgdHlwZTogMSAvKiBTdGF0ZS5NQVBfS0VZICovLFxuICAgICAgICAgICAgc2l6ZTogc2l6ZSxcbiAgICAgICAgICAgIGtleTogbnVsbCxcbiAgICAgICAgICAgIHJlYWRDb3VudDogMCxcbiAgICAgICAgICAgIG1hcDoge30sXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUucHVzaEFycmF5U3RhdGUgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICAgICAgICBpZiAoc2l6ZSA+IHRoaXMubWF4QXJyYXlMZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBfRGVjb2RlRXJyb3JfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV81X18uRGVjb2RlRXJyb3IoXCJNYXggbGVuZ3RoIGV4Y2VlZGVkOiBhcnJheSBsZW5ndGggKFwiLmNvbmNhdChzaXplLCBcIikgPiBtYXhBcnJheUxlbmd0aCAoXCIpLmNvbmNhdCh0aGlzLm1heEFycmF5TGVuZ3RoLCBcIilcIikpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RhY2sucHVzaCh7XG4gICAgICAgICAgICB0eXBlOiAwIC8qIFN0YXRlLkFSUkFZICovLFxuICAgICAgICAgICAgc2l6ZTogc2l6ZSxcbiAgICAgICAgICAgIGFycmF5OiBuZXcgQXJyYXkoc2l6ZSksXG4gICAgICAgICAgICBwb3NpdGlvbjogMCxcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5kZWNvZGVVdGY4U3RyaW5nID0gZnVuY3Rpb24gKGJ5dGVMZW5ndGgsIGhlYWRlck9mZnNldCkge1xuICAgICAgICB2YXIgX2E7XG4gICAgICAgIGlmIChieXRlTGVuZ3RoID4gdGhpcy5tYXhTdHJMZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBfRGVjb2RlRXJyb3JfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV81X18uRGVjb2RlRXJyb3IoXCJNYXggbGVuZ3RoIGV4Y2VlZGVkOiBVVEYtOCBieXRlIGxlbmd0aCAoXCIuY29uY2F0KGJ5dGVMZW5ndGgsIFwiKSA+IG1heFN0ckxlbmd0aCAoXCIpLmNvbmNhdCh0aGlzLm1heFN0ckxlbmd0aCwgXCIpXCIpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5ieXRlcy5ieXRlTGVuZ3RoIDwgdGhpcy5wb3MgKyBoZWFkZXJPZmZzZXQgKyBieXRlTGVuZ3RoKSB7XG4gICAgICAgICAgICB0aHJvdyBNT1JFX0RBVEE7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG9mZnNldCA9IHRoaXMucG9zICsgaGVhZGVyT2Zmc2V0O1xuICAgICAgICB2YXIgb2JqZWN0O1xuICAgICAgICBpZiAodGhpcy5zdGF0ZUlzTWFwS2V5KCkgJiYgKChfYSA9IHRoaXMua2V5RGVjb2RlcikgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLmNhbkJlQ2FjaGVkKGJ5dGVMZW5ndGgpKSkge1xuICAgICAgICAgICAgb2JqZWN0ID0gdGhpcy5rZXlEZWNvZGVyLmRlY29kZSh0aGlzLmJ5dGVzLCBvZmZzZXQsIGJ5dGVMZW5ndGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGJ5dGVMZW5ndGggPiBfdXRpbHNfdXRmOF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzZfXy5URVhUX0RFQ09ERVJfVEhSRVNIT0xEKSB7XG4gICAgICAgICAgICBvYmplY3QgPSAoMCxfdXRpbHNfdXRmOF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzZfXy51dGY4RGVjb2RlVEQpKHRoaXMuYnl0ZXMsIG9mZnNldCwgYnl0ZUxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBvYmplY3QgPSAoMCxfdXRpbHNfdXRmOF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzZfXy51dGY4RGVjb2RlSnMpKHRoaXMuYnl0ZXMsIG9mZnNldCwgYnl0ZUxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5wb3MgKz0gaGVhZGVyT2Zmc2V0ICsgYnl0ZUxlbmd0aDtcbiAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLnN0YXRlSXNNYXBLZXkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLnN0YWNrLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBzdGF0ZSA9IHRoaXMuc3RhY2tbdGhpcy5zdGFjay5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZS50eXBlID09PSAxIC8qIFN0YXRlLk1BUF9LRVkgKi87XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUuZGVjb2RlQmluYXJ5ID0gZnVuY3Rpb24gKGJ5dGVMZW5ndGgsIGhlYWRPZmZzZXQpIHtcbiAgICAgICAgaWYgKGJ5dGVMZW5ndGggPiB0aGlzLm1heEJpbkxlbmd0aCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IF9EZWNvZGVFcnJvcl9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzVfXy5EZWNvZGVFcnJvcihcIk1heCBsZW5ndGggZXhjZWVkZWQ6IGJpbiBsZW5ndGggKFwiLmNvbmNhdChieXRlTGVuZ3RoLCBcIikgPiBtYXhCaW5MZW5ndGggKFwiKS5jb25jYXQodGhpcy5tYXhCaW5MZW5ndGgsIFwiKVwiKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0aGlzLmhhc1JlbWFpbmluZyhieXRlTGVuZ3RoICsgaGVhZE9mZnNldCkpIHtcbiAgICAgICAgICAgIHRocm93IE1PUkVfREFUQTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgb2Zmc2V0ID0gdGhpcy5wb3MgKyBoZWFkT2Zmc2V0O1xuICAgICAgICB2YXIgb2JqZWN0ID0gdGhpcy5ieXRlcy5zdWJhcnJheShvZmZzZXQsIG9mZnNldCArIGJ5dGVMZW5ndGgpO1xuICAgICAgICB0aGlzLnBvcyArPSBoZWFkT2Zmc2V0ICsgYnl0ZUxlbmd0aDtcbiAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLmRlY29kZUV4dGVuc2lvbiA9IGZ1bmN0aW9uIChzaXplLCBoZWFkT2Zmc2V0KSB7XG4gICAgICAgIGlmIChzaXplID4gdGhpcy5tYXhFeHRMZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBfRGVjb2RlRXJyb3JfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV81X18uRGVjb2RlRXJyb3IoXCJNYXggbGVuZ3RoIGV4Y2VlZGVkOiBleHQgbGVuZ3RoIChcIi5jb25jYXQoc2l6ZSwgXCIpID4gbWF4RXh0TGVuZ3RoIChcIikuY29uY2F0KHRoaXMubWF4RXh0TGVuZ3RoLCBcIilcIikpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBleHRUeXBlID0gdGhpcy52aWV3LmdldEludDgodGhpcy5wb3MgKyBoZWFkT2Zmc2V0KTtcbiAgICAgICAgdmFyIGRhdGEgPSB0aGlzLmRlY29kZUJpbmFyeShzaXplLCBoZWFkT2Zmc2V0ICsgMSAvKiBleHRUeXBlICovKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuZXh0ZW5zaW9uQ29kZWMuZGVjb2RlKGRhdGEsIGV4dFR5cGUsIHRoaXMuY29udGV4dCk7XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5sb29rVTggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnZpZXcuZ2V0VWludDgodGhpcy5wb3MpO1xuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUubG9va1UxNiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlldy5nZXRVaW50MTYodGhpcy5wb3MpO1xuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUubG9va1UzMiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudmlldy5nZXRVaW50MzIodGhpcy5wb3MpO1xuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUucmVhZFU4ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLnZpZXcuZ2V0VWludDgodGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcysrO1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5yZWFkSTggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHRoaXMudmlldy5nZXRJbnQ4KHRoaXMucG9zKTtcbiAgICAgICAgdGhpcy5wb3MrKztcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG4gICAgRGVjb2Rlci5wcm90b3R5cGUucmVhZFUxNiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gdGhpcy52aWV3LmdldFVpbnQxNih0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IDI7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLnJlYWRJMTYgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHRoaXMudmlldy5nZXRJbnQxNih0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IDI7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLnJlYWRVMzIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHRoaXMudmlldy5nZXRVaW50MzIodGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSA0O1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5yZWFkSTMyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLnZpZXcuZ2V0SW50MzIodGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSA0O1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5yZWFkVTY0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSAoMCxfdXRpbHNfaW50X21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLmdldFVpbnQ2NCkodGhpcy52aWV3LCB0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IDg7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLnJlYWRJNjQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9ICgwLF91dGlsc19pbnRfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18uZ2V0SW50NjQpKHRoaXMudmlldywgdGhpcy5wb3MpO1xuICAgICAgICB0aGlzLnBvcyArPSA4O1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgICBEZWNvZGVyLnByb3RvdHlwZS5yZWFkRjMyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLnZpZXcuZ2V0RmxvYXQzMih0aGlzLnBvcyk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuICAgIERlY29kZXIucHJvdG90eXBlLnJlYWRGNjQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHRoaXMudmlldy5nZXRGbG9hdDY0KHRoaXMucG9zKTtcbiAgICAgICAgdGhpcy5wb3MgKz0gODtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG4gICAgcmV0dXJuIERlY29kZXI7XG59KCkpO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1EZWNvZGVyLm1qcy5tYXBcblxuLyoqKi8gfSksXG5cbi8qKiovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vRW5jb2Rlci5tanNcIjpcbi8qISoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiohKlxcXG4gICEqKiogLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vRW5jb2Rlci5tanMgKioqIVxuICBcXCoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKioqLyAoKF9fdW51c2VkX3dlYnBhY2tfX193ZWJwYWNrX21vZHVsZV9fLCBfX3dlYnBhY2tfZXhwb3J0c19fLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSA9PiB7XG5cbl9fd2VicGFja19yZXF1aXJlX18ucihfX3dlYnBhY2tfZXhwb3J0c19fKTtcbi8qIGhhcm1vbnkgZXhwb3J0ICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCB7XG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIERFRkFVTFRfSU5JVElBTF9CVUZGRVJfU0laRTogKCkgPT4gKC8qIGJpbmRpbmcgKi8gREVGQVVMVF9JTklUSUFMX0JVRkZFUl9TSVpFKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgREVGQVVMVF9NQVhfREVQVEg6ICgpID0+ICgvKiBiaW5kaW5nICovIERFRkFVTFRfTUFYX0RFUFRIKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgRW5jb2RlcjogKCkgPT4gKC8qIGJpbmRpbmcgKi8gRW5jb2Rlcilcbi8qIGhhcm1vbnkgZXhwb3J0ICovIH0pO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF91dGlsc191dGY4X21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgLi91dGlscy91dGY4Lm1qcyAqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL3V0aWxzL3V0ZjgubWpzXCIpO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF9FeHRlbnNpb25Db2RlY19tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vRXh0ZW5zaW9uQ29kZWMubWpzICovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vRXh0ZW5zaW9uQ29kZWMubWpzXCIpO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF91dGlsc19pbnRfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8zX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL3V0aWxzL2ludC5tanMgKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS91dGlscy9pbnQubWpzXCIpO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF91dGlsc190eXBlZEFycmF5c19tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vdXRpbHMvdHlwZWRBcnJheXMubWpzICovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vdXRpbHMvdHlwZWRBcnJheXMubWpzXCIpO1xuXG5cblxuXG52YXIgREVGQVVMVF9NQVhfREVQVEggPSAxMDA7XG52YXIgREVGQVVMVF9JTklUSUFMX0JVRkZFUl9TSVpFID0gMjA0ODtcbnZhciBFbmNvZGVyID0gLyoqIEBjbGFzcyAqLyAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEVuY29kZXIoZXh0ZW5zaW9uQ29kZWMsIGNvbnRleHQsIG1heERlcHRoLCBpbml0aWFsQnVmZmVyU2l6ZSwgc29ydEtleXMsIGZvcmNlRmxvYXQzMiwgaWdub3JlVW5kZWZpbmVkLCBmb3JjZUludGVnZXJUb0Zsb2F0KSB7XG4gICAgICAgIGlmIChleHRlbnNpb25Db2RlYyA9PT0gdm9pZCAwKSB7IGV4dGVuc2lvbkNvZGVjID0gX0V4dGVuc2lvbkNvZGVjX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLkV4dGVuc2lvbkNvZGVjLmRlZmF1bHRDb2RlYzsgfVxuICAgICAgICBpZiAoY29udGV4dCA9PT0gdm9pZCAwKSB7IGNvbnRleHQgPSB1bmRlZmluZWQ7IH1cbiAgICAgICAgaWYgKG1heERlcHRoID09PSB2b2lkIDApIHsgbWF4RGVwdGggPSBERUZBVUxUX01BWF9ERVBUSDsgfVxuICAgICAgICBpZiAoaW5pdGlhbEJ1ZmZlclNpemUgPT09IHZvaWQgMCkgeyBpbml0aWFsQnVmZmVyU2l6ZSA9IERFRkFVTFRfSU5JVElBTF9CVUZGRVJfU0laRTsgfVxuICAgICAgICBpZiAoc29ydEtleXMgPT09IHZvaWQgMCkgeyBzb3J0S2V5cyA9IGZhbHNlOyB9XG4gICAgICAgIGlmIChmb3JjZUZsb2F0MzIgPT09IHZvaWQgMCkgeyBmb3JjZUZsb2F0MzIgPSBmYWxzZTsgfVxuICAgICAgICBpZiAoaWdub3JlVW5kZWZpbmVkID09PSB2b2lkIDApIHsgaWdub3JlVW5kZWZpbmVkID0gZmFsc2U7IH1cbiAgICAgICAgaWYgKGZvcmNlSW50ZWdlclRvRmxvYXQgPT09IHZvaWQgMCkgeyBmb3JjZUludGVnZXJUb0Zsb2F0ID0gZmFsc2U7IH1cbiAgICAgICAgdGhpcy5leHRlbnNpb25Db2RlYyA9IGV4dGVuc2lvbkNvZGVjO1xuICAgICAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICB0aGlzLm1heERlcHRoID0gbWF4RGVwdGg7XG4gICAgICAgIHRoaXMuaW5pdGlhbEJ1ZmZlclNpemUgPSBpbml0aWFsQnVmZmVyU2l6ZTtcbiAgICAgICAgdGhpcy5zb3J0S2V5cyA9IHNvcnRLZXlzO1xuICAgICAgICB0aGlzLmZvcmNlRmxvYXQzMiA9IGZvcmNlRmxvYXQzMjtcbiAgICAgICAgdGhpcy5pZ25vcmVVbmRlZmluZWQgPSBpZ25vcmVVbmRlZmluZWQ7XG4gICAgICAgIHRoaXMuZm9yY2VJbnRlZ2VyVG9GbG9hdCA9IGZvcmNlSW50ZWdlclRvRmxvYXQ7XG4gICAgICAgIHRoaXMucG9zID0gMDtcbiAgICAgICAgdGhpcy52aWV3ID0gbmV3IERhdGFWaWV3KG5ldyBBcnJheUJ1ZmZlcih0aGlzLmluaXRpYWxCdWZmZXJTaXplKSk7XG4gICAgICAgIHRoaXMuYnl0ZXMgPSBuZXcgVWludDhBcnJheSh0aGlzLnZpZXcuYnVmZmVyKTtcbiAgICB9XG4gICAgRW5jb2Rlci5wcm90b3R5cGUucmVpbml0aWFsaXplU3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucG9zID0gMDtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFRoaXMgaXMgYWxtb3N0IGVxdWl2YWxlbnQgdG8ge0BsaW5rIEVuY29kZXIjZW5jb2RlfSwgYnV0IGl0IHJldHVybnMgYW4gcmVmZXJlbmNlIG9mIHRoZSBlbmNvZGVyJ3MgaW50ZXJuYWwgYnVmZmVyIGFuZCB0aHVzIG11Y2ggZmFzdGVyIHRoYW4ge0BsaW5rIEVuY29kZXIjZW5jb2RlfS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIEVuY29kZXMgdGhlIG9iamVjdCBhbmQgcmV0dXJucyBhIHNoYXJlZCByZWZlcmVuY2UgdGhlIGVuY29kZXIncyBpbnRlcm5hbCBidWZmZXIuXG4gICAgICovXG4gICAgRW5jb2Rlci5wcm90b3R5cGUuZW5jb2RlU2hhcmVkUmVmID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICB0aGlzLnJlaW5pdGlhbGl6ZVN0YXRlKCk7XG4gICAgICAgIHRoaXMuZG9FbmNvZGUob2JqZWN0LCAxKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYnl0ZXMuc3ViYXJyYXkoMCwgdGhpcy5wb3MpO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogQHJldHVybnMgRW5jb2RlcyB0aGUgb2JqZWN0IGFuZCByZXR1cm5zIGEgY29weSBvZiB0aGUgZW5jb2RlcidzIGludGVybmFsIGJ1ZmZlci5cbiAgICAgKi9cbiAgICBFbmNvZGVyLnByb3RvdHlwZS5lbmNvZGUgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHRoaXMucmVpbml0aWFsaXplU3RhdGUoKTtcbiAgICAgICAgdGhpcy5kb0VuY29kZShvYmplY3QsIDEpO1xuICAgICAgICByZXR1cm4gdGhpcy5ieXRlcy5zbGljZSgwLCB0aGlzLnBvcyk7XG4gICAgfTtcbiAgICBFbmNvZGVyLnByb3RvdHlwZS5kb0VuY29kZSA9IGZ1bmN0aW9uIChvYmplY3QsIGRlcHRoKSB7XG4gICAgICAgIGlmIChkZXB0aCA+IHRoaXMubWF4RGVwdGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRvbyBkZWVwIG9iamVjdHMgaW4gZGVwdGggXCIuY29uY2F0KGRlcHRoKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9iamVjdCA9PSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLmVuY29kZU5pbCgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QgPT09IFwiYm9vbGVhblwiKSB7XG4gICAgICAgICAgICB0aGlzLmVuY29kZUJvb2xlYW4ob2JqZWN0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0ID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICB0aGlzLmVuY29kZU51bWJlcihvYmplY3QpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIHRoaXMuZW5jb2RlU3RyaW5nKG9iamVjdCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmVuY29kZU9iamVjdChvYmplY3QsIGRlcHRoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgRW5jb2Rlci5wcm90b3R5cGUuZW5zdXJlQnVmZmVyU2l6ZVRvV3JpdGUgPSBmdW5jdGlvbiAoc2l6ZVRvV3JpdGUpIHtcbiAgICAgICAgdmFyIHJlcXVpcmVkU2l6ZSA9IHRoaXMucG9zICsgc2l6ZVRvV3JpdGU7XG4gICAgICAgIGlmICh0aGlzLnZpZXcuYnl0ZUxlbmd0aCA8IHJlcXVpcmVkU2l6ZSkge1xuICAgICAgICAgICAgdGhpcy5yZXNpemVCdWZmZXIocmVxdWlyZWRTaXplICogMik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEVuY29kZXIucHJvdG90eXBlLnJlc2l6ZUJ1ZmZlciA9IGZ1bmN0aW9uIChuZXdTaXplKSB7XG4gICAgICAgIHZhciBuZXdCdWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIobmV3U2l6ZSk7XG4gICAgICAgIHZhciBuZXdCeXRlcyA9IG5ldyBVaW50OEFycmF5KG5ld0J1ZmZlcik7XG4gICAgICAgIHZhciBuZXdWaWV3ID0gbmV3IERhdGFWaWV3KG5ld0J1ZmZlcik7XG4gICAgICAgIG5ld0J5dGVzLnNldCh0aGlzLmJ5dGVzKTtcbiAgICAgICAgdGhpcy52aWV3ID0gbmV3VmlldztcbiAgICAgICAgdGhpcy5ieXRlcyA9IG5ld0J5dGVzO1xuICAgIH07XG4gICAgRW5jb2Rlci5wcm90b3R5cGUuZW5jb2RlTmlsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLndyaXRlVTgoMHhjMCk7XG4gICAgfTtcbiAgICBFbmNvZGVyLnByb3RvdHlwZS5lbmNvZGVCb29sZWFuID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICAgICAgICBpZiAob2JqZWN0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4YzIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4YzMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBFbmNvZGVyLnByb3RvdHlwZS5lbmNvZGVOdW1iZXIgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIGlmIChOdW1iZXIuaXNTYWZlSW50ZWdlcihvYmplY3QpICYmICF0aGlzLmZvcmNlSW50ZWdlclRvRmxvYXQpIHtcbiAgICAgICAgICAgIGlmIChvYmplY3QgPj0gMCkge1xuICAgICAgICAgICAgICAgIGlmIChvYmplY3QgPCAweDgwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHBvc2l0aXZlIGZpeGludFxuICAgICAgICAgICAgICAgICAgICB0aGlzLndyaXRlVTgob2JqZWN0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAob2JqZWN0IDwgMHgxMDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdWludCA4XG4gICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGNjKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53cml0ZVU4KG9iamVjdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKG9iamVjdCA8IDB4MTAwMDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdWludCAxNlxuICAgICAgICAgICAgICAgICAgICB0aGlzLndyaXRlVTgoMHhjZCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGVVMTYob2JqZWN0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAob2JqZWN0IDwgMHgxMDAwMDAwMDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gdWludCAzMlxuICAgICAgICAgICAgICAgICAgICB0aGlzLndyaXRlVTgoMHhjZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGVVMzIob2JqZWN0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHVpbnQgNjRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4Y2YpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLndyaXRlVTY0KG9iamVjdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdCA+PSAtMHgyMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBuZWdhdGl2ZSBmaXhpbnRcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4ZTAgfCAob2JqZWN0ICsgMHgyMCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChvYmplY3QgPj0gLTB4ODApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaW50IDhcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4ZDApO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLndyaXRlSTgob2JqZWN0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAob2JqZWN0ID49IC0weDgwMDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaW50IDE2XG4gICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGQxKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53cml0ZUkxNihvYmplY3QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChvYmplY3QgPj0gLTB4ODAwMDAwMDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaW50IDMyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGQyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53cml0ZUkzMihvYmplY3QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaW50IDY0XG4gICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGQzKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53cml0ZUk2NChvYmplY3QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIG5vbi1pbnRlZ2VyIG51bWJlcnNcbiAgICAgICAgICAgIGlmICh0aGlzLmZvcmNlRmxvYXQzMikge1xuICAgICAgICAgICAgICAgIC8vIGZsb2F0IDMyXG4gICAgICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4Y2EpO1xuICAgICAgICAgICAgICAgIHRoaXMud3JpdGVGMzIob2JqZWN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGZsb2F0IDY0XG4gICAgICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4Y2IpO1xuICAgICAgICAgICAgICAgIHRoaXMud3JpdGVGNjQob2JqZWN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgRW5jb2Rlci5wcm90b3R5cGUud3JpdGVTdHJpbmdIZWFkZXIgPSBmdW5jdGlvbiAoYnl0ZUxlbmd0aCkge1xuICAgICAgICBpZiAoYnl0ZUxlbmd0aCA8IDMyKSB7XG4gICAgICAgICAgICAvLyBmaXhzdHJcbiAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGEwICsgYnl0ZUxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoYnl0ZUxlbmd0aCA8IDB4MTAwKSB7XG4gICAgICAgICAgICAvLyBzdHIgOFxuICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4ZDkpO1xuICAgICAgICAgICAgdGhpcy53cml0ZVU4KGJ5dGVMZW5ndGgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGJ5dGVMZW5ndGggPCAweDEwMDAwKSB7XG4gICAgICAgICAgICAvLyBzdHIgMTZcbiAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGRhKTtcbiAgICAgICAgICAgIHRoaXMud3JpdGVVMTYoYnl0ZUxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoYnl0ZUxlbmd0aCA8IDB4MTAwMDAwMDAwKSB7XG4gICAgICAgICAgICAvLyBzdHIgMzJcbiAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGRiKTtcbiAgICAgICAgICAgIHRoaXMud3JpdGVVMzIoYnl0ZUxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUb28gbG9uZyBzdHJpbmc6IFwiLmNvbmNhdChieXRlTGVuZ3RoLCBcIiBieXRlcyBpbiBVVEYtOFwiKSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEVuY29kZXIucHJvdG90eXBlLmVuY29kZVN0cmluZyA9IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgICAgICAgdmFyIG1heEhlYWRlclNpemUgPSAxICsgNDtcbiAgICAgICAgdmFyIHN0ckxlbmd0aCA9IG9iamVjdC5sZW5ndGg7XG4gICAgICAgIGlmIChzdHJMZW5ndGggPiBfdXRpbHNfdXRmOF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5URVhUX0VOQ09ERVJfVEhSRVNIT0xEKSB7XG4gICAgICAgICAgICB2YXIgYnl0ZUxlbmd0aCA9ICgwLF91dGlsc191dGY4X21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLnV0ZjhDb3VudCkob2JqZWN0KTtcbiAgICAgICAgICAgIHRoaXMuZW5zdXJlQnVmZmVyU2l6ZVRvV3JpdGUobWF4SGVhZGVyU2l6ZSArIGJ5dGVMZW5ndGgpO1xuICAgICAgICAgICAgdGhpcy53cml0ZVN0cmluZ0hlYWRlcihieXRlTGVuZ3RoKTtcbiAgICAgICAgICAgICgwLF91dGlsc191dGY4X21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLnV0ZjhFbmNvZGVURSkob2JqZWN0LCB0aGlzLmJ5dGVzLCB0aGlzLnBvcyk7XG4gICAgICAgICAgICB0aGlzLnBvcyArPSBieXRlTGVuZ3RoO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdmFyIGJ5dGVMZW5ndGggPSAoMCxfdXRpbHNfdXRmOF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy51dGY4Q291bnQpKG9iamVjdCk7XG4gICAgICAgICAgICB0aGlzLmVuc3VyZUJ1ZmZlclNpemVUb1dyaXRlKG1heEhlYWRlclNpemUgKyBieXRlTGVuZ3RoKTtcbiAgICAgICAgICAgIHRoaXMud3JpdGVTdHJpbmdIZWFkZXIoYnl0ZUxlbmd0aCk7XG4gICAgICAgICAgICAoMCxfdXRpbHNfdXRmOF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy51dGY4RW5jb2RlSnMpKG9iamVjdCwgdGhpcy5ieXRlcywgdGhpcy5wb3MpO1xuICAgICAgICAgICAgdGhpcy5wb3MgKz0gYnl0ZUxlbmd0aDtcbiAgICAgICAgfVxuICAgIH07XG4gICAgRW5jb2Rlci5wcm90b3R5cGUuZW5jb2RlT2JqZWN0ID0gZnVuY3Rpb24gKG9iamVjdCwgZGVwdGgpIHtcbiAgICAgICAgLy8gdHJ5IHRvIGVuY29kZSBvYmplY3RzIHdpdGggY3VzdG9tIGNvZGVjIGZpcnN0IG9mIG5vbi1wcmltaXRpdmVzXG4gICAgICAgIHZhciBleHQgPSB0aGlzLmV4dGVuc2lvbkNvZGVjLnRyeVRvRW5jb2RlKG9iamVjdCwgdGhpcy5jb250ZXh0KTtcbiAgICAgICAgaWYgKGV4dCAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLmVuY29kZUV4dGVuc2lvbihleHQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0KSkge1xuICAgICAgICAgICAgdGhpcy5lbmNvZGVBcnJheShvYmplY3QsIGRlcHRoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcob2JqZWN0KSkge1xuICAgICAgICAgICAgdGhpcy5lbmNvZGVCaW5hcnkob2JqZWN0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0ID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICB0aGlzLmVuY29kZU1hcChvYmplY3QsIGRlcHRoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIHN5bWJvbCwgZnVuY3Rpb24gYW5kIG90aGVyIHNwZWNpYWwgb2JqZWN0IGNvbWUgaGVyZSB1bmxlc3MgZXh0ZW5zaW9uQ29kZWMgaGFuZGxlcyB0aGVtLlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5yZWNvZ25pemVkIG9iamVjdDogXCIuY29uY2F0KE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuYXBwbHkob2JqZWN0KSkpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBFbmNvZGVyLnByb3RvdHlwZS5lbmNvZGVCaW5hcnkgPSBmdW5jdGlvbiAob2JqZWN0KSB7XG4gICAgICAgIHZhciBzaXplID0gb2JqZWN0LmJ5dGVMZW5ndGg7XG4gICAgICAgIGlmIChzaXplIDwgMHgxMDApIHtcbiAgICAgICAgICAgIC8vIGJpbiA4XG4gICAgICAgICAgICB0aGlzLndyaXRlVTgoMHhjNCk7XG4gICAgICAgICAgICB0aGlzLndyaXRlVTgoc2l6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc2l6ZSA8IDB4MTAwMDApIHtcbiAgICAgICAgICAgIC8vIGJpbiAxNlxuICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4YzUpO1xuICAgICAgICAgICAgdGhpcy53cml0ZVUxNihzaXplKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzaXplIDwgMHgxMDAwMDAwMDApIHtcbiAgICAgICAgICAgIC8vIGJpbiAzMlxuICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4YzYpO1xuICAgICAgICAgICAgdGhpcy53cml0ZVUzMihzaXplKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRvbyBsYXJnZSBiaW5hcnk6IFwiLmNvbmNhdChzaXplKSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGJ5dGVzID0gKDAsX3V0aWxzX3R5cGVkQXJyYXlzX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLmVuc3VyZVVpbnQ4QXJyYXkpKG9iamVjdCk7XG4gICAgICAgIHRoaXMud3JpdGVVOGEoYnl0ZXMpO1xuICAgIH07XG4gICAgRW5jb2Rlci5wcm90b3R5cGUuZW5jb2RlQXJyYXkgPSBmdW5jdGlvbiAob2JqZWN0LCBkZXB0aCkge1xuICAgICAgICB2YXIgc2l6ZSA9IG9iamVjdC5sZW5ndGg7XG4gICAgICAgIGlmIChzaXplIDwgMTYpIHtcbiAgICAgICAgICAgIC8vIGZpeGFycmF5XG4gICAgICAgICAgICB0aGlzLndyaXRlVTgoMHg5MCArIHNpemUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHNpemUgPCAweDEwMDAwKSB7XG4gICAgICAgICAgICAvLyBhcnJheSAxNlxuICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4ZGMpO1xuICAgICAgICAgICAgdGhpcy53cml0ZVUxNihzaXplKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzaXplIDwgMHgxMDAwMDAwMDApIHtcbiAgICAgICAgICAgIC8vIGFycmF5IDMyXG4gICAgICAgICAgICB0aGlzLndyaXRlVTgoMHhkZCk7XG4gICAgICAgICAgICB0aGlzLndyaXRlVTMyKHNpemUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVG9vIGxhcmdlIGFycmF5OiBcIi5jb25jYXQoc2l6ZSkpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIF9pID0gMCwgb2JqZWN0XzEgPSBvYmplY3Q7IF9pIDwgb2JqZWN0XzEubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgICAgICB2YXIgaXRlbSA9IG9iamVjdF8xW19pXTtcbiAgICAgICAgICAgIHRoaXMuZG9FbmNvZGUoaXRlbSwgZGVwdGggKyAxKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgRW5jb2Rlci5wcm90b3R5cGUuY291bnRXaXRob3V0VW5kZWZpbmVkID0gZnVuY3Rpb24gKG9iamVjdCwga2V5cykge1xuICAgICAgICB2YXIgY291bnQgPSAwO1xuICAgICAgICBmb3IgKHZhciBfaSA9IDAsIGtleXNfMSA9IGtleXM7IF9pIDwga2V5c18xLmxlbmd0aDsgX2krKykge1xuICAgICAgICAgICAgdmFyIGtleSA9IGtleXNfMVtfaV07XG4gICAgICAgICAgICBpZiAob2JqZWN0W2tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgIH07XG4gICAgRW5jb2Rlci5wcm90b3R5cGUuZW5jb2RlTWFwID0gZnVuY3Rpb24gKG9iamVjdCwgZGVwdGgpIHtcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmplY3QpO1xuICAgICAgICBpZiAodGhpcy5zb3J0S2V5cykge1xuICAgICAgICAgICAga2V5cy5zb3J0KCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNpemUgPSB0aGlzLmlnbm9yZVVuZGVmaW5lZCA/IHRoaXMuY291bnRXaXRob3V0VW5kZWZpbmVkKG9iamVjdCwga2V5cykgOiBrZXlzLmxlbmd0aDtcbiAgICAgICAgaWYgKHNpemUgPCAxNikge1xuICAgICAgICAgICAgLy8gZml4bWFwXG4gICAgICAgICAgICB0aGlzLndyaXRlVTgoMHg4MCArIHNpemUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHNpemUgPCAweDEwMDAwKSB7XG4gICAgICAgICAgICAvLyBtYXAgMTZcbiAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGRlKTtcbiAgICAgICAgICAgIHRoaXMud3JpdGVVMTYoc2l6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc2l6ZSA8IDB4MTAwMDAwMDAwKSB7XG4gICAgICAgICAgICAvLyBtYXAgMzJcbiAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGRmKTtcbiAgICAgICAgICAgIHRoaXMud3JpdGVVMzIoc2l6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUb28gbGFyZ2UgbWFwIG9iamVjdDogXCIuY29uY2F0KHNpemUpKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBfaSA9IDAsIGtleXNfMiA9IGtleXM7IF9pIDwga2V5c18yLmxlbmd0aDsgX2krKykge1xuICAgICAgICAgICAgdmFyIGtleSA9IGtleXNfMltfaV07XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBvYmplY3Rba2V5XTtcbiAgICAgICAgICAgIGlmICghKHRoaXMuaWdub3JlVW5kZWZpbmVkICYmIHZhbHVlID09PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5lbmNvZGVTdHJpbmcoa2V5KTtcbiAgICAgICAgICAgICAgICB0aGlzLmRvRW5jb2RlKHZhbHVlLCBkZXB0aCArIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBFbmNvZGVyLnByb3RvdHlwZS5lbmNvZGVFeHRlbnNpb24gPSBmdW5jdGlvbiAoZXh0KSB7XG4gICAgICAgIHZhciBzaXplID0gZXh0LmRhdGEubGVuZ3RoO1xuICAgICAgICBpZiAoc2l6ZSA9PT0gMSkge1xuICAgICAgICAgICAgLy8gZml4ZXh0IDFcbiAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGQ0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzaXplID09PSAyKSB7XG4gICAgICAgICAgICAvLyBmaXhleHQgMlxuICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4ZDUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHNpemUgPT09IDQpIHtcbiAgICAgICAgICAgIC8vIGZpeGV4dCA0XG4gICAgICAgICAgICB0aGlzLndyaXRlVTgoMHhkNik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc2l6ZSA9PT0gOCkge1xuICAgICAgICAgICAgLy8gZml4ZXh0IDhcbiAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGQ3KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChzaXplID09PSAxNikge1xuICAgICAgICAgICAgLy8gZml4ZXh0IDE2XG4gICAgICAgICAgICB0aGlzLndyaXRlVTgoMHhkOCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc2l6ZSA8IDB4MTAwKSB7XG4gICAgICAgICAgICAvLyBleHQgOFxuICAgICAgICAgICAgdGhpcy53cml0ZVU4KDB4YzcpO1xuICAgICAgICAgICAgdGhpcy53cml0ZVU4KHNpemUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHNpemUgPCAweDEwMDAwKSB7XG4gICAgICAgICAgICAvLyBleHQgMTZcbiAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGM4KTtcbiAgICAgICAgICAgIHRoaXMud3JpdGVVMTYoc2l6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoc2l6ZSA8IDB4MTAwMDAwMDAwKSB7XG4gICAgICAgICAgICAvLyBleHQgMzJcbiAgICAgICAgICAgIHRoaXMud3JpdGVVOCgweGM5KTtcbiAgICAgICAgICAgIHRoaXMud3JpdGVVMzIoc2l6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUb28gbGFyZ2UgZXh0ZW5zaW9uIG9iamVjdDogXCIuY29uY2F0KHNpemUpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLndyaXRlSTgoZXh0LnR5cGUpO1xuICAgICAgICB0aGlzLndyaXRlVThhKGV4dC5kYXRhKTtcbiAgICB9O1xuICAgIEVuY29kZXIucHJvdG90eXBlLndyaXRlVTggPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVCdWZmZXJTaXplVG9Xcml0ZSgxKTtcbiAgICAgICAgdGhpcy52aWV3LnNldFVpbnQ4KHRoaXMucG9zLCB2YWx1ZSk7XG4gICAgICAgIHRoaXMucG9zKys7XG4gICAgfTtcbiAgICBFbmNvZGVyLnByb3RvdHlwZS53cml0ZVU4YSA9IGZ1bmN0aW9uICh2YWx1ZXMpIHtcbiAgICAgICAgdmFyIHNpemUgPSB2YWx1ZXMubGVuZ3RoO1xuICAgICAgICB0aGlzLmVuc3VyZUJ1ZmZlclNpemVUb1dyaXRlKHNpemUpO1xuICAgICAgICB0aGlzLmJ5dGVzLnNldCh2YWx1ZXMsIHRoaXMucG9zKTtcbiAgICAgICAgdGhpcy5wb3MgKz0gc2l6ZTtcbiAgICB9O1xuICAgIEVuY29kZXIucHJvdG90eXBlLndyaXRlSTggPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVCdWZmZXJTaXplVG9Xcml0ZSgxKTtcbiAgICAgICAgdGhpcy52aWV3LnNldEludDgodGhpcy5wb3MsIHZhbHVlKTtcbiAgICAgICAgdGhpcy5wb3MrKztcbiAgICB9O1xuICAgIEVuY29kZXIucHJvdG90eXBlLndyaXRlVTE2ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlQnVmZmVyU2l6ZVRvV3JpdGUoMik7XG4gICAgICAgIHRoaXMudmlldy5zZXRVaW50MTYodGhpcy5wb3MsIHZhbHVlKTtcbiAgICAgICAgdGhpcy5wb3MgKz0gMjtcbiAgICB9O1xuICAgIEVuY29kZXIucHJvdG90eXBlLndyaXRlSTE2ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlQnVmZmVyU2l6ZVRvV3JpdGUoMik7XG4gICAgICAgIHRoaXMudmlldy5zZXRJbnQxNih0aGlzLnBvcywgdmFsdWUpO1xuICAgICAgICB0aGlzLnBvcyArPSAyO1xuICAgIH07XG4gICAgRW5jb2Rlci5wcm90b3R5cGUud3JpdGVVMzIgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVCdWZmZXJTaXplVG9Xcml0ZSg0KTtcbiAgICAgICAgdGhpcy52aWV3LnNldFVpbnQzMih0aGlzLnBvcywgdmFsdWUpO1xuICAgICAgICB0aGlzLnBvcyArPSA0O1xuICAgIH07XG4gICAgRW5jb2Rlci5wcm90b3R5cGUud3JpdGVJMzIgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVCdWZmZXJTaXplVG9Xcml0ZSg0KTtcbiAgICAgICAgdGhpcy52aWV3LnNldEludDMyKHRoaXMucG9zLCB2YWx1ZSk7XG4gICAgICAgIHRoaXMucG9zICs9IDQ7XG4gICAgfTtcbiAgICBFbmNvZGVyLnByb3RvdHlwZS53cml0ZUYzMiA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLmVuc3VyZUJ1ZmZlclNpemVUb1dyaXRlKDQpO1xuICAgICAgICB0aGlzLnZpZXcuc2V0RmxvYXQzMih0aGlzLnBvcywgdmFsdWUpO1xuICAgICAgICB0aGlzLnBvcyArPSA0O1xuICAgIH07XG4gICAgRW5jb2Rlci5wcm90b3R5cGUud3JpdGVGNjQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdGhpcy5lbnN1cmVCdWZmZXJTaXplVG9Xcml0ZSg4KTtcbiAgICAgICAgdGhpcy52aWV3LnNldEZsb2F0NjQodGhpcy5wb3MsIHZhbHVlKTtcbiAgICAgICAgdGhpcy5wb3MgKz0gODtcbiAgICB9O1xuICAgIEVuY29kZXIucHJvdG90eXBlLndyaXRlVTY0ID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHRoaXMuZW5zdXJlQnVmZmVyU2l6ZVRvV3JpdGUoOCk7XG4gICAgICAgICgwLF91dGlsc19pbnRfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8zX18uc2V0VWludDY0KSh0aGlzLnZpZXcsIHRoaXMucG9zLCB2YWx1ZSk7XG4gICAgICAgIHRoaXMucG9zICs9IDg7XG4gICAgfTtcbiAgICBFbmNvZGVyLnByb3RvdHlwZS53cml0ZUk2NCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICB0aGlzLmVuc3VyZUJ1ZmZlclNpemVUb1dyaXRlKDgpO1xuICAgICAgICAoMCxfdXRpbHNfaW50X21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfM19fLnNldEludDY0KSh0aGlzLnZpZXcsIHRoaXMucG9zLCB2YWx1ZSk7XG4gICAgICAgIHRoaXMucG9zICs9IDg7XG4gICAgfTtcbiAgICByZXR1cm4gRW5jb2Rlcjtcbn0oKSk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUVuY29kZXIubWpzLm1hcFxuXG4vKioqLyB9KSxcblxuLyoqKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS9FeHREYXRhLm1qc1wiOlxuLyohKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiEqXFxcbiAgISoqKiAuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS9FeHREYXRhLm1qcyAqKiohXG4gIFxcKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qKiovICgoX191bnVzZWRfd2VicGFja19fX3dlYnBhY2tfbW9kdWxlX18sIF9fd2VicGFja19leHBvcnRzX18sIF9fd2VicGFja19yZXF1aXJlX18pID0+IHtcblxuX193ZWJwYWNrX3JlcXVpcmVfXy5yKF9fd2VicGFja19leHBvcnRzX18pO1xuLyogaGFybW9ueSBleHBvcnQgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIHtcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgRXh0RGF0YTogKCkgPT4gKC8qIGJpbmRpbmcgKi8gRXh0RGF0YSlcbi8qIGhhcm1vbnkgZXhwb3J0ICovIH0pO1xuLyoqXG4gKiBFeHREYXRhIGlzIHVzZWQgdG8gaGFuZGxlIEV4dGVuc2lvbiBUeXBlcyB0aGF0IGFyZSBub3QgcmVnaXN0ZXJlZCB0byBFeHRlbnNpb25Db2RlYy5cbiAqL1xudmFyIEV4dERhdGEgPSAvKiogQGNsYXNzICovIChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRXh0RGF0YSh0eXBlLCBkYXRhKSB7XG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgICAgIHRoaXMuZGF0YSA9IGRhdGE7XG4gICAgfVxuICAgIHJldHVybiBFeHREYXRhO1xufSgpKTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9RXh0RGF0YS5tanMubWFwXG5cbi8qKiovIH0pLFxuXG4vKioqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL0V4dGVuc2lvbkNvZGVjLm1qc1wiOlxuLyohKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiohKlxcXG4gICEqKiogLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vRXh0ZW5zaW9uQ29kZWMubWpzICoqKiFcbiAgXFwqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qKiovICgoX191bnVzZWRfd2VicGFja19fX3dlYnBhY2tfbW9kdWxlX18sIF9fd2VicGFja19leHBvcnRzX18sIF9fd2VicGFja19yZXF1aXJlX18pID0+IHtcblxuX193ZWJwYWNrX3JlcXVpcmVfXy5yKF9fd2VicGFja19leHBvcnRzX18pO1xuLyogaGFybW9ueSBleHBvcnQgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIHtcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgRXh0ZW5zaW9uQ29kZWM6ICgpID0+ICgvKiBiaW5kaW5nICovIEV4dGVuc2lvbkNvZGVjKVxuLyogaGFybW9ueSBleHBvcnQgKi8gfSk7XG4vKiBoYXJtb255IGltcG9ydCAqLyB2YXIgX0V4dERhdGFfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL0V4dERhdGEubWpzICovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vRXh0RGF0YS5tanNcIik7XG4vKiBoYXJtb255IGltcG9ydCAqLyB2YXIgX3RpbWVzdGFtcF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vdGltZXN0YW1wLm1qcyAqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL3RpbWVzdGFtcC5tanNcIik7XG4vLyBFeHRlbnNpb25Db2RlYyB0byBoYW5kbGUgTWVzc2FnZVBhY2sgZXh0ZW5zaW9uc1xuXG5cbnZhciBFeHRlbnNpb25Db2RlYyA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBFeHRlbnNpb25Db2RlYygpIHtcbiAgICAgICAgLy8gYnVpbHQtaW4gZXh0ZW5zaW9uc1xuICAgICAgICB0aGlzLmJ1aWx0SW5FbmNvZGVycyA9IFtdO1xuICAgICAgICB0aGlzLmJ1aWx0SW5EZWNvZGVycyA9IFtdO1xuICAgICAgICAvLyBjdXN0b20gZXh0ZW5zaW9uc1xuICAgICAgICB0aGlzLmVuY29kZXJzID0gW107XG4gICAgICAgIHRoaXMuZGVjb2RlcnMgPSBbXTtcbiAgICAgICAgdGhpcy5yZWdpc3RlcihfdGltZXN0YW1wX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLnRpbWVzdGFtcEV4dGVuc2lvbik7XG4gICAgfVxuICAgIEV4dGVuc2lvbkNvZGVjLnByb3RvdHlwZS5yZWdpc3RlciA9IGZ1bmN0aW9uIChfYSkge1xuICAgICAgICB2YXIgdHlwZSA9IF9hLnR5cGUsIGVuY29kZSA9IF9hLmVuY29kZSwgZGVjb2RlID0gX2EuZGVjb2RlO1xuICAgICAgICBpZiAodHlwZSA+PSAwKSB7XG4gICAgICAgICAgICAvLyBjdXN0b20gZXh0ZW5zaW9uc1xuICAgICAgICAgICAgdGhpcy5lbmNvZGVyc1t0eXBlXSA9IGVuY29kZTtcbiAgICAgICAgICAgIHRoaXMuZGVjb2RlcnNbdHlwZV0gPSBkZWNvZGU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBidWlsdC1pbiBleHRlbnNpb25zXG4gICAgICAgICAgICB2YXIgaW5kZXggPSAxICsgdHlwZTtcbiAgICAgICAgICAgIHRoaXMuYnVpbHRJbkVuY29kZXJzW2luZGV4XSA9IGVuY29kZTtcbiAgICAgICAgICAgIHRoaXMuYnVpbHRJbkRlY29kZXJzW2luZGV4XSA9IGRlY29kZTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgRXh0ZW5zaW9uQ29kZWMucHJvdG90eXBlLnRyeVRvRW5jb2RlID0gZnVuY3Rpb24gKG9iamVjdCwgY29udGV4dCkge1xuICAgICAgICAvLyBidWlsdC1pbiBleHRlbnNpb25zXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5idWlsdEluRW5jb2RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBlbmNvZGVFeHQgPSB0aGlzLmJ1aWx0SW5FbmNvZGVyc1tpXTtcbiAgICAgICAgICAgIGlmIChlbmNvZGVFeHQgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHZhciBkYXRhID0gZW5jb2RlRXh0KG9iamVjdCwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdHlwZSA9IC0xIC0gaTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBfRXh0RGF0YV9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5FeHREYXRhKHR5cGUsIGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBjdXN0b20gZXh0ZW5zaW9uc1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZW5jb2RlcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBlbmNvZGVFeHQgPSB0aGlzLmVuY29kZXJzW2ldO1xuICAgICAgICAgICAgaWYgKGVuY29kZUV4dCAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRhdGEgPSBlbmNvZGVFeHQob2JqZWN0LCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0eXBlID0gaTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBfRXh0RGF0YV9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5FeHREYXRhKHR5cGUsIGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgX0V4dERhdGFfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18uRXh0RGF0YSkge1xuICAgICAgICAgICAgLy8gdG8ga2VlcCBFeHREYXRhIGFzIGlzXG4gICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH07XG4gICAgRXh0ZW5zaW9uQ29kZWMucHJvdG90eXBlLmRlY29kZSA9IGZ1bmN0aW9uIChkYXRhLCB0eXBlLCBjb250ZXh0KSB7XG4gICAgICAgIHZhciBkZWNvZGVFeHQgPSB0eXBlIDwgMCA/IHRoaXMuYnVpbHRJbkRlY29kZXJzWy0xIC0gdHlwZV0gOiB0aGlzLmRlY29kZXJzW3R5cGVdO1xuICAgICAgICBpZiAoZGVjb2RlRXh0KSB7XG4gICAgICAgICAgICByZXR1cm4gZGVjb2RlRXh0KGRhdGEsIHR5cGUsIGNvbnRleHQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gZGVjb2RlKCkgZG9lcyBub3QgZmFpbCwgcmV0dXJucyBFeHREYXRhIGluc3RlYWQuXG4gICAgICAgICAgICByZXR1cm4gbmV3IF9FeHREYXRhX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLkV4dERhdGEodHlwZSwgZGF0YSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIEV4dGVuc2lvbkNvZGVjLmRlZmF1bHRDb2RlYyA9IG5ldyBFeHRlbnNpb25Db2RlYygpO1xuICAgIHJldHVybiBFeHRlbnNpb25Db2RlYztcbn0oKSk7XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPUV4dGVuc2lvbkNvZGVjLm1qcy5tYXBcblxuLyoqKi8gfSksXG5cbi8qKiovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vZGVjb2RlLm1qc1wiOlxuLyohKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqISpcXFxuICAhKioqIC4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL2RlY29kZS5tanMgKioqIVxuICBcXCoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qKiovICgoX191bnVzZWRfd2VicGFja19fX3dlYnBhY2tfbW9kdWxlX18sIF9fd2VicGFja19leHBvcnRzX18sIF9fd2VicGFja19yZXF1aXJlX18pID0+IHtcblxuX193ZWJwYWNrX3JlcXVpcmVfXy5yKF9fd2VicGFja19leHBvcnRzX18pO1xuLyogaGFybW9ueSBleHBvcnQgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIHtcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgZGVjb2RlOiAoKSA9PiAoLyogYmluZGluZyAqLyBkZWNvZGUpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBkZWNvZGVNdWx0aTogKCkgPT4gKC8qIGJpbmRpbmcgKi8gZGVjb2RlTXVsdGkpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBkZWZhdWx0RGVjb2RlT3B0aW9uczogKCkgPT4gKC8qIGJpbmRpbmcgKi8gZGVmYXVsdERlY29kZU9wdGlvbnMpXG4vKiBoYXJtb255IGV4cG9ydCAqLyB9KTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfRGVjb2Rlcl9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vRGVjb2Rlci5tanMgKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS9EZWNvZGVyLm1qc1wiKTtcblxudmFyIGRlZmF1bHREZWNvZGVPcHRpb25zID0ge307XG4vKipcbiAqIEl0IGRlY29kZXMgYSBzaW5nbGUgTWVzc2FnZVBhY2sgb2JqZWN0IGluIGEgYnVmZmVyLlxuICpcbiAqIFRoaXMgaXMgYSBzeW5jaHJvbm91cyBkZWNvZGluZyBmdW5jdGlvbi5cbiAqIFNlZSBvdGhlciB2YXJpYW50cyBmb3IgYXN5bmNocm9ub3VzIGRlY29kaW5nOiB7QGxpbmsgZGVjb2RlQXN5bmMoKX0sIHtAbGluayBkZWNvZGVTdHJlYW0oKX0sIG9yIHtAbGluayBkZWNvZGVBcnJheVN0cmVhbSgpfS5cbiAqXG4gKiBAdGhyb3dzIHtAbGluayBSYW5nZUVycm9yfSBpZiB0aGUgYnVmZmVyIGlzIGluY29tcGxldGUsIGluY2x1ZGluZyB0aGUgY2FzZSB3aGVyZSB0aGUgYnVmZmVyIGlzIGVtcHR5LlxuICogQHRocm93cyB7QGxpbmsgRGVjb2RlRXJyb3J9IGlmIHRoZSBidWZmZXIgY29udGFpbnMgaW52YWxpZCBkYXRhLlxuICovXG5mdW5jdGlvbiBkZWNvZGUoYnVmZmVyLCBvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMgPT09IHZvaWQgMCkgeyBvcHRpb25zID0gZGVmYXVsdERlY29kZU9wdGlvbnM7IH1cbiAgICB2YXIgZGVjb2RlciA9IG5ldyBfRGVjb2Rlcl9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5EZWNvZGVyKG9wdGlvbnMuZXh0ZW5zaW9uQ29kZWMsIG9wdGlvbnMuY29udGV4dCwgb3B0aW9ucy5tYXhTdHJMZW5ndGgsIG9wdGlvbnMubWF4QmluTGVuZ3RoLCBvcHRpb25zLm1heEFycmF5TGVuZ3RoLCBvcHRpb25zLm1heE1hcExlbmd0aCwgb3B0aW9ucy5tYXhFeHRMZW5ndGgpO1xuICAgIHJldHVybiBkZWNvZGVyLmRlY29kZShidWZmZXIpO1xufVxuLyoqXG4gKiBJdCBkZWNvZGVzIG11bHRpcGxlIE1lc3NhZ2VQYWNrIG9iamVjdHMgaW4gYSBidWZmZXIuXG4gKiBUaGlzIGlzIGNvcnJlc3BvbmRpbmcgdG8ge0BsaW5rIGRlY29kZU11bHRpU3RyZWFtKCl9LlxuICpcbiAqIEB0aHJvd3Mge0BsaW5rIFJhbmdlRXJyb3J9IGlmIHRoZSBidWZmZXIgaXMgaW5jb21wbGV0ZSwgaW5jbHVkaW5nIHRoZSBjYXNlIHdoZXJlIHRoZSBidWZmZXIgaXMgZW1wdHkuXG4gKiBAdGhyb3dzIHtAbGluayBEZWNvZGVFcnJvcn0gaWYgdGhlIGJ1ZmZlciBjb250YWlucyBpbnZhbGlkIGRhdGEuXG4gKi9cbmZ1bmN0aW9uIGRlY29kZU11bHRpKGJ1ZmZlciwgb3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zID09PSB2b2lkIDApIHsgb3B0aW9ucyA9IGRlZmF1bHREZWNvZGVPcHRpb25zOyB9XG4gICAgdmFyIGRlY29kZXIgPSBuZXcgX0RlY29kZXJfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uRGVjb2RlcihvcHRpb25zLmV4dGVuc2lvbkNvZGVjLCBvcHRpb25zLmNvbnRleHQsIG9wdGlvbnMubWF4U3RyTGVuZ3RoLCBvcHRpb25zLm1heEJpbkxlbmd0aCwgb3B0aW9ucy5tYXhBcnJheUxlbmd0aCwgb3B0aW9ucy5tYXhNYXBMZW5ndGgsIG9wdGlvbnMubWF4RXh0TGVuZ3RoKTtcbiAgICByZXR1cm4gZGVjb2Rlci5kZWNvZGVNdWx0aShidWZmZXIpO1xufVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGVjb2RlLm1qcy5tYXBcblxuLyoqKi8gfSksXG5cbi8qKiovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vZW5jb2RlLm1qc1wiOlxuLyohKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqISpcXFxuICAhKioqIC4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL2VuY29kZS5tanMgKioqIVxuICBcXCoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qKiovICgoX191bnVzZWRfd2VicGFja19fX3dlYnBhY2tfbW9kdWxlX18sIF9fd2VicGFja19leHBvcnRzX18sIF9fd2VicGFja19yZXF1aXJlX18pID0+IHtcblxuX193ZWJwYWNrX3JlcXVpcmVfXy5yKF9fd2VicGFja19leHBvcnRzX18pO1xuLyogaGFybW9ueSBleHBvcnQgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIHtcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgZW5jb2RlOiAoKSA9PiAoLyogYmluZGluZyAqLyBlbmNvZGUpXG4vKiBoYXJtb255IGV4cG9ydCAqLyB9KTtcbi8qIGhhcm1vbnkgaW1wb3J0ICovIHZhciBfRW5jb2Rlcl9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vRW5jb2Rlci5tanMgKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS9FbmNvZGVyLm1qc1wiKTtcblxudmFyIGRlZmF1bHRFbmNvZGVPcHRpb25zID0ge307XG4vKipcbiAqIEl0IGVuY29kZXMgYHZhbHVlYCBpbiB0aGUgTWVzc2FnZVBhY2sgZm9ybWF0IGFuZFxuICogcmV0dXJucyBhIGJ5dGUgYnVmZmVyLlxuICpcbiAqIFRoZSByZXR1cm5lZCBidWZmZXIgaXMgYSBzbGljZSBvZiBhIGxhcmdlciBgQXJyYXlCdWZmZXJgLCBzbyB5b3UgaGF2ZSB0byB1c2UgaXRzIGAjYnl0ZU9mZnNldGAgYW5kIGAjYnl0ZUxlbmd0aGAgaW4gb3JkZXIgdG8gY29udmVydCBpdCB0byBhbm90aGVyIHR5cGVkIGFycmF5cyBpbmNsdWRpbmcgTm9kZUpTIGBCdWZmZXJgLlxuICovXG5mdW5jdGlvbiBlbmNvZGUodmFsdWUsIG9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7IG9wdGlvbnMgPSBkZWZhdWx0RW5jb2RlT3B0aW9uczsgfVxuICAgIHZhciBlbmNvZGVyID0gbmV3IF9FbmNvZGVyX21qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fLkVuY29kZXIob3B0aW9ucy5leHRlbnNpb25Db2RlYywgb3B0aW9ucy5jb250ZXh0LCBvcHRpb25zLm1heERlcHRoLCBvcHRpb25zLmluaXRpYWxCdWZmZXJTaXplLCBvcHRpb25zLnNvcnRLZXlzLCBvcHRpb25zLmZvcmNlRmxvYXQzMiwgb3B0aW9ucy5pZ25vcmVVbmRlZmluZWQsIG9wdGlvbnMuZm9yY2VJbnRlZ2VyVG9GbG9hdCk7XG4gICAgcmV0dXJuIGVuY29kZXIuZW5jb2RlU2hhcmVkUmVmKHZhbHVlKTtcbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWVuY29kZS5tanMubWFwXG5cbi8qKiovIH0pLFxuXG4vKioqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL3RpbWVzdGFtcC5tanNcIjpcbi8qISoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiEqXFxcbiAgISoqKiAuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS90aW1lc3RhbXAubWpzICoqKiFcbiAgXFwqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKioqLyAoKF9fdW51c2VkX3dlYnBhY2tfX193ZWJwYWNrX21vZHVsZV9fLCBfX3dlYnBhY2tfZXhwb3J0c19fLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSA9PiB7XG5cbl9fd2VicGFja19yZXF1aXJlX18ucihfX3dlYnBhY2tfZXhwb3J0c19fKTtcbi8qIGhhcm1vbnkgZXhwb3J0ICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCB7XG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIEVYVF9USU1FU1RBTVA6ICgpID0+ICgvKiBiaW5kaW5nICovIEVYVF9USU1FU1RBTVApLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBkZWNvZGVUaW1lc3RhbXBFeHRlbnNpb246ICgpID0+ICgvKiBiaW5kaW5nICovIGRlY29kZVRpbWVzdGFtcEV4dGVuc2lvbiksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIGRlY29kZVRpbWVzdGFtcFRvVGltZVNwZWM6ICgpID0+ICgvKiBiaW5kaW5nICovIGRlY29kZVRpbWVzdGFtcFRvVGltZVNwZWMpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBlbmNvZGVEYXRlVG9UaW1lU3BlYzogKCkgPT4gKC8qIGJpbmRpbmcgKi8gZW5jb2RlRGF0ZVRvVGltZVNwZWMpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBlbmNvZGVUaW1lU3BlY1RvVGltZXN0YW1wOiAoKSA9PiAoLyogYmluZGluZyAqLyBlbmNvZGVUaW1lU3BlY1RvVGltZXN0YW1wKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgZW5jb2RlVGltZXN0YW1wRXh0ZW5zaW9uOiAoKSA9PiAoLyogYmluZGluZyAqLyBlbmNvZGVUaW1lc3RhbXBFeHRlbnNpb24pLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICB0aW1lc3RhbXBFeHRlbnNpb246ICgpID0+ICgvKiBiaW5kaW5nICovIHRpbWVzdGFtcEV4dGVuc2lvbilcbi8qIGhhcm1vbnkgZXhwb3J0ICovIH0pO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF9EZWNvZGVFcnJvcl9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vRGVjb2RlRXJyb3IubWpzICovIFwiLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vRGVjb2RlRXJyb3IubWpzXCIpO1xuLyogaGFybW9ueSBpbXBvcnQgKi8gdmFyIF91dGlsc19pbnRfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL3V0aWxzL2ludC5tanMgKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS91dGlscy9pbnQubWpzXCIpO1xuLy8gaHR0cHM6Ly9naXRodWIuY29tL21zZ3BhY2svbXNncGFjay9ibG9iL21hc3Rlci9zcGVjLm1kI3RpbWVzdGFtcC1leHRlbnNpb24tdHlwZVxuXG5cbnZhciBFWFRfVElNRVNUQU1QID0gLTE7XG52YXIgVElNRVNUQU1QMzJfTUFYX1NFQyA9IDB4MTAwMDAwMDAwIC0gMTsgLy8gMzItYml0IHVuc2lnbmVkIGludFxudmFyIFRJTUVTVEFNUDY0X01BWF9TRUMgPSAweDQwMDAwMDAwMCAtIDE7IC8vIDM0LWJpdCB1bnNpZ25lZCBpbnRcbmZ1bmN0aW9uIGVuY29kZVRpbWVTcGVjVG9UaW1lc3RhbXAoX2EpIHtcbiAgICB2YXIgc2VjID0gX2Euc2VjLCBuc2VjID0gX2EubnNlYztcbiAgICBpZiAoc2VjID49IDAgJiYgbnNlYyA+PSAwICYmIHNlYyA8PSBUSU1FU1RBTVA2NF9NQVhfU0VDKSB7XG4gICAgICAgIC8vIEhlcmUgc2VjID49IDAgJiYgbnNlYyA+PSAwXG4gICAgICAgIGlmIChuc2VjID09PSAwICYmIHNlYyA8PSBUSU1FU1RBTVAzMl9NQVhfU0VDKSB7XG4gICAgICAgICAgICAvLyB0aW1lc3RhbXAgMzIgPSB7IHNlYzMyICh1bnNpZ25lZCkgfVxuICAgICAgICAgICAgdmFyIHJ2ID0gbmV3IFVpbnQ4QXJyYXkoNCk7XG4gICAgICAgICAgICB2YXIgdmlldyA9IG5ldyBEYXRhVmlldyhydi5idWZmZXIpO1xuICAgICAgICAgICAgdmlldy5zZXRVaW50MzIoMCwgc2VjKTtcbiAgICAgICAgICAgIHJldHVybiBydjtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIHRpbWVzdGFtcCA2NCA9IHsgbnNlYzMwICh1bnNpZ25lZCksIHNlYzM0ICh1bnNpZ25lZCkgfVxuICAgICAgICAgICAgdmFyIHNlY0hpZ2ggPSBzZWMgLyAweDEwMDAwMDAwMDtcbiAgICAgICAgICAgIHZhciBzZWNMb3cgPSBzZWMgJiAweGZmZmZmZmZmO1xuICAgICAgICAgICAgdmFyIHJ2ID0gbmV3IFVpbnQ4QXJyYXkoOCk7XG4gICAgICAgICAgICB2YXIgdmlldyA9IG5ldyBEYXRhVmlldyhydi5idWZmZXIpO1xuICAgICAgICAgICAgLy8gbnNlYzMwIHwgc2VjSGlnaDJcbiAgICAgICAgICAgIHZpZXcuc2V0VWludDMyKDAsIChuc2VjIDw8IDIpIHwgKHNlY0hpZ2ggJiAweDMpKTtcbiAgICAgICAgICAgIC8vIHNlY0xvdzMyXG4gICAgICAgICAgICB2aWV3LnNldFVpbnQzMig0LCBzZWNMb3cpO1xuICAgICAgICAgICAgcmV0dXJuIHJ2O1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICAvLyB0aW1lc3RhbXAgOTYgPSB7IG5zZWMzMiAodW5zaWduZWQpLCBzZWM2NCAoc2lnbmVkKSB9XG4gICAgICAgIHZhciBydiA9IG5ldyBVaW50OEFycmF5KDEyKTtcbiAgICAgICAgdmFyIHZpZXcgPSBuZXcgRGF0YVZpZXcocnYuYnVmZmVyKTtcbiAgICAgICAgdmlldy5zZXRVaW50MzIoMCwgbnNlYyk7XG4gICAgICAgICgwLF91dGlsc19pbnRfbWpzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uc2V0SW50NjQpKHZpZXcsIDQsIHNlYyk7XG4gICAgICAgIHJldHVybiBydjtcbiAgICB9XG59XG5mdW5jdGlvbiBlbmNvZGVEYXRlVG9UaW1lU3BlYyhkYXRlKSB7XG4gICAgdmFyIG1zZWMgPSBkYXRlLmdldFRpbWUoKTtcbiAgICB2YXIgc2VjID0gTWF0aC5mbG9vcihtc2VjIC8gMWUzKTtcbiAgICB2YXIgbnNlYyA9IChtc2VjIC0gc2VjICogMWUzKSAqIDFlNjtcbiAgICAvLyBOb3JtYWxpemVzIHsgc2VjLCBuc2VjIH0gdG8gZW5zdXJlIG5zZWMgaXMgdW5zaWduZWQuXG4gICAgdmFyIG5zZWNJblNlYyA9IE1hdGguZmxvb3IobnNlYyAvIDFlOSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2VjOiBzZWMgKyBuc2VjSW5TZWMsXG4gICAgICAgIG5zZWM6IG5zZWMgLSBuc2VjSW5TZWMgKiAxZTksXG4gICAgfTtcbn1cbmZ1bmN0aW9uIGVuY29kZVRpbWVzdGFtcEV4dGVuc2lvbihvYmplY3QpIHtcbiAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICB2YXIgdGltZVNwZWMgPSBlbmNvZGVEYXRlVG9UaW1lU3BlYyhvYmplY3QpO1xuICAgICAgICByZXR1cm4gZW5jb2RlVGltZVNwZWNUb1RpbWVzdGFtcCh0aW1lU3BlYyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG5mdW5jdGlvbiBkZWNvZGVUaW1lc3RhbXBUb1RpbWVTcGVjKGRhdGEpIHtcbiAgICB2YXIgdmlldyA9IG5ldyBEYXRhVmlldyhkYXRhLmJ1ZmZlciwgZGF0YS5ieXRlT2Zmc2V0LCBkYXRhLmJ5dGVMZW5ndGgpO1xuICAgIC8vIGRhdGEgbWF5IGJlIDMyLCA2NCwgb3IgOTYgYml0c1xuICAgIHN3aXRjaCAoZGF0YS5ieXRlTGVuZ3RoKSB7XG4gICAgICAgIGNhc2UgNDoge1xuICAgICAgICAgICAgLy8gdGltZXN0YW1wIDMyID0geyBzZWMzMiB9XG4gICAgICAgICAgICB2YXIgc2VjID0gdmlldy5nZXRVaW50MzIoMCk7XG4gICAgICAgICAgICB2YXIgbnNlYyA9IDA7XG4gICAgICAgICAgICByZXR1cm4geyBzZWM6IHNlYywgbnNlYzogbnNlYyB9O1xuICAgICAgICB9XG4gICAgICAgIGNhc2UgODoge1xuICAgICAgICAgICAgLy8gdGltZXN0YW1wIDY0ID0geyBuc2VjMzAsIHNlYzM0IH1cbiAgICAgICAgICAgIHZhciBuc2VjMzBBbmRTZWNIaWdoMiA9IHZpZXcuZ2V0VWludDMyKDApO1xuICAgICAgICAgICAgdmFyIHNlY0xvdzMyID0gdmlldy5nZXRVaW50MzIoNCk7XG4gICAgICAgICAgICB2YXIgc2VjID0gKG5zZWMzMEFuZFNlY0hpZ2gyICYgMHgzKSAqIDB4MTAwMDAwMDAwICsgc2VjTG93MzI7XG4gICAgICAgICAgICB2YXIgbnNlYyA9IG5zZWMzMEFuZFNlY0hpZ2gyID4+PiAyO1xuICAgICAgICAgICAgcmV0dXJuIHsgc2VjOiBzZWMsIG5zZWM6IG5zZWMgfTtcbiAgICAgICAgfVxuICAgICAgICBjYXNlIDEyOiB7XG4gICAgICAgICAgICAvLyB0aW1lc3RhbXAgOTYgPSB7IG5zZWMzMiAodW5zaWduZWQpLCBzZWM2NCAoc2lnbmVkKSB9XG4gICAgICAgICAgICB2YXIgc2VjID0gKDAsX3V0aWxzX2ludF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5nZXRJbnQ2NCkodmlldywgNCk7XG4gICAgICAgICAgICB2YXIgbnNlYyA9IHZpZXcuZ2V0VWludDMyKDApO1xuICAgICAgICAgICAgcmV0dXJuIHsgc2VjOiBzZWMsIG5zZWM6IG5zZWMgfTtcbiAgICAgICAgfVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IF9EZWNvZGVFcnJvcl9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5EZWNvZGVFcnJvcihcIlVucmVjb2duaXplZCBkYXRhIHNpemUgZm9yIHRpbWVzdGFtcCAoZXhwZWN0ZWQgNCwgOCwgb3IgMTIpOiBcIi5jb25jYXQoZGF0YS5sZW5ndGgpKTtcbiAgICB9XG59XG5mdW5jdGlvbiBkZWNvZGVUaW1lc3RhbXBFeHRlbnNpb24oZGF0YSkge1xuICAgIHZhciB0aW1lU3BlYyA9IGRlY29kZVRpbWVzdGFtcFRvVGltZVNwZWMoZGF0YSk7XG4gICAgcmV0dXJuIG5ldyBEYXRlKHRpbWVTcGVjLnNlYyAqIDFlMyArIHRpbWVTcGVjLm5zZWMgLyAxZTYpO1xufVxudmFyIHRpbWVzdGFtcEV4dGVuc2lvbiA9IHtcbiAgICB0eXBlOiBFWFRfVElNRVNUQU1QLFxuICAgIGVuY29kZTogZW5jb2RlVGltZXN0YW1wRXh0ZW5zaW9uLFxuICAgIGRlY29kZTogZGVjb2RlVGltZXN0YW1wRXh0ZW5zaW9uLFxufTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXRpbWVzdGFtcC5tanMubWFwXG5cbi8qKiovIH0pLFxuXG4vKioqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL3V0aWxzL2ludC5tanNcIjpcbi8qISoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiEqXFxcbiAgISoqKiAuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS91dGlscy9pbnQubWpzICoqKiFcbiAgXFwqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4vKioqLyAoKF9fdW51c2VkX3dlYnBhY2tfX193ZWJwYWNrX21vZHVsZV9fLCBfX3dlYnBhY2tfZXhwb3J0c19fLCBfX3dlYnBhY2tfcmVxdWlyZV9fKSA9PiB7XG5cbl9fd2VicGFja19yZXF1aXJlX18ucihfX3dlYnBhY2tfZXhwb3J0c19fKTtcbi8qIGhhcm1vbnkgZXhwb3J0ICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCB7XG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIFVJTlQzMl9NQVg6ICgpID0+ICgvKiBiaW5kaW5nICovIFVJTlQzMl9NQVgpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBnZXRJbnQ2NDogKCkgPT4gKC8qIGJpbmRpbmcgKi8gZ2V0SW50NjQpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBnZXRVaW50NjQ6ICgpID0+ICgvKiBiaW5kaW5nICovIGdldFVpbnQ2NCksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIHNldEludDY0OiAoKSA9PiAoLyogYmluZGluZyAqLyBzZXRJbnQ2NCksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIHNldFVpbnQ2NDogKCkgPT4gKC8qIGJpbmRpbmcgKi8gc2V0VWludDY0KVxuLyogaGFybW9ueSBleHBvcnQgKi8gfSk7XG4vLyBJbnRlZ2VyIFV0aWxpdHlcbnZhciBVSU5UMzJfTUFYID0gNDI5NDk2NzI5NTtcbi8vIERhdGFWaWV3IGV4dGVuc2lvbiB0byBoYW5kbGUgaW50NjQgLyB1aW50NjQsXG4vLyB3aGVyZSB0aGUgYWN0dWFsIHJhbmdlIGlzIDUzLWJpdHMgaW50ZWdlciAoYS5rLmEuIHNhZmUgaW50ZWdlcilcbmZ1bmN0aW9uIHNldFVpbnQ2NCh2aWV3LCBvZmZzZXQsIHZhbHVlKSB7XG4gICAgdmFyIGhpZ2ggPSB2YWx1ZSAvIDQyOTQ5NjcyOTY7XG4gICAgdmFyIGxvdyA9IHZhbHVlOyAvLyBoaWdoIGJpdHMgYXJlIHRydW5jYXRlZCBieSBEYXRhVmlld1xuICAgIHZpZXcuc2V0VWludDMyKG9mZnNldCwgaGlnaCk7XG4gICAgdmlldy5zZXRVaW50MzIob2Zmc2V0ICsgNCwgbG93KTtcbn1cbmZ1bmN0aW9uIHNldEludDY0KHZpZXcsIG9mZnNldCwgdmFsdWUpIHtcbiAgICB2YXIgaGlnaCA9IE1hdGguZmxvb3IodmFsdWUgLyA0Mjk0OTY3Mjk2KTtcbiAgICB2YXIgbG93ID0gdmFsdWU7IC8vIGhpZ2ggYml0cyBhcmUgdHJ1bmNhdGVkIGJ5IERhdGFWaWV3XG4gICAgdmlldy5zZXRVaW50MzIob2Zmc2V0LCBoaWdoKTtcbiAgICB2aWV3LnNldFVpbnQzMihvZmZzZXQgKyA0LCBsb3cpO1xufVxuZnVuY3Rpb24gZ2V0SW50NjQodmlldywgb2Zmc2V0KSB7XG4gICAgdmFyIGhpZ2ggPSB2aWV3LmdldEludDMyKG9mZnNldCk7XG4gICAgdmFyIGxvdyA9IHZpZXcuZ2V0VWludDMyKG9mZnNldCArIDQpO1xuICAgIHJldHVybiBoaWdoICogNDI5NDk2NzI5NiArIGxvdztcbn1cbmZ1bmN0aW9uIGdldFVpbnQ2NCh2aWV3LCBvZmZzZXQpIHtcbiAgICB2YXIgaGlnaCA9IHZpZXcuZ2V0VWludDMyKG9mZnNldCk7XG4gICAgdmFyIGxvdyA9IHZpZXcuZ2V0VWludDMyKG9mZnNldCArIDQpO1xuICAgIHJldHVybiBoaWdoICogNDI5NDk2NzI5NiArIGxvdztcbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWludC5tanMubWFwXG5cbi8qKiovIH0pLFxuXG4vKioqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL3V0aWxzL3ByZXR0eUJ5dGUubWpzXCI6XG4vKiEqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqISpcXFxuICAhKioqIC4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL3V0aWxzL3ByZXR0eUJ5dGUubWpzICoqKiFcbiAgXFwqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuLyoqKi8gKChfX3VudXNlZF93ZWJwYWNrX19fd2VicGFja19tb2R1bGVfXywgX193ZWJwYWNrX2V4cG9ydHNfXywgX193ZWJwYWNrX3JlcXVpcmVfXykgPT4ge1xuXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIoX193ZWJwYWNrX2V4cG9ydHNfXyk7XG4vKiBoYXJtb255IGV4cG9ydCAqLyBfX3dlYnBhY2tfcmVxdWlyZV9fLmQoX193ZWJwYWNrX2V4cG9ydHNfXywge1xuLyogaGFybW9ueSBleHBvcnQgKi8gICBwcmV0dHlCeXRlOiAoKSA9PiAoLyogYmluZGluZyAqLyBwcmV0dHlCeXRlKVxuLyogaGFybW9ueSBleHBvcnQgKi8gfSk7XG5mdW5jdGlvbiBwcmV0dHlCeXRlKGJ5dGUpIHtcbiAgICByZXR1cm4gXCJcIi5jb25jYXQoYnl0ZSA8IDAgPyBcIi1cIiA6IFwiXCIsIFwiMHhcIikuY29uY2F0KE1hdGguYWJzKGJ5dGUpLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCBcIjBcIikpO1xufVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cHJldHR5Qnl0ZS5tanMubWFwXG5cbi8qKiovIH0pLFxuXG4vKioqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL3V0aWxzL3R5cGVkQXJyYXlzLm1qc1wiOlxuLyohKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiohKlxcXG4gICEqKiogLi9ub2RlX21vZHVsZXMvQG1zZ3BhY2svbXNncGFjay9kaXN0LmVzNStlc20vdXRpbHMvdHlwZWRBcnJheXMubWpzICoqKiFcbiAgXFwqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qKiovICgoX191bnVzZWRfd2VicGFja19fX3dlYnBhY2tfbW9kdWxlX18sIF9fd2VicGFja19leHBvcnRzX18sIF9fd2VicGFja19yZXF1aXJlX18pID0+IHtcblxuX193ZWJwYWNrX3JlcXVpcmVfXy5yKF9fd2VicGFja19leHBvcnRzX18pO1xuLyogaGFybW9ueSBleHBvcnQgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIHtcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgY3JlYXRlRGF0YVZpZXc6ICgpID0+ICgvKiBiaW5kaW5nICovIGNyZWF0ZURhdGFWaWV3KSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgZW5zdXJlVWludDhBcnJheTogKCkgPT4gKC8qIGJpbmRpbmcgKi8gZW5zdXJlVWludDhBcnJheSlcbi8qIGhhcm1vbnkgZXhwb3J0ICovIH0pO1xuZnVuY3Rpb24gZW5zdXJlVWludDhBcnJheShidWZmZXIpIHtcbiAgICBpZiAoYnVmZmVyIGluc3RhbmNlb2YgVWludDhBcnJheSkge1xuICAgICAgICByZXR1cm4gYnVmZmVyO1xuICAgIH1cbiAgICBlbHNlIGlmIChBcnJheUJ1ZmZlci5pc1ZpZXcoYnVmZmVyKSkge1xuICAgICAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyLmJ1ZmZlciwgYnVmZmVyLmJ5dGVPZmZzZXQsIGJ1ZmZlci5ieXRlTGVuZ3RoKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoYnVmZmVyIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICAvLyBBcnJheUxpa2U8bnVtYmVyPlxuICAgICAgICByZXR1cm4gVWludDhBcnJheS5mcm9tKGJ1ZmZlcik7XG4gICAgfVxufVxuZnVuY3Rpb24gY3JlYXRlRGF0YVZpZXcoYnVmZmVyKSB7XG4gICAgaWYgKGJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgICAgIHJldHVybiBuZXcgRGF0YVZpZXcoYnVmZmVyKTtcbiAgICB9XG4gICAgdmFyIGJ1ZmZlclZpZXcgPSBlbnN1cmVVaW50OEFycmF5KGJ1ZmZlcik7XG4gICAgcmV0dXJuIG5ldyBEYXRhVmlldyhidWZmZXJWaWV3LmJ1ZmZlciwgYnVmZmVyVmlldy5ieXRlT2Zmc2V0LCBidWZmZXJWaWV3LmJ5dGVMZW5ndGgpO1xufVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dHlwZWRBcnJheXMubWpzLm1hcFxuXG4vKioqLyB9KSxcblxuLyoqKi8gXCIuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS91dGlscy91dGY4Lm1qc1wiOlxuLyohKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiEqXFxcbiAgISoqKiAuL25vZGVfbW9kdWxlcy9AbXNncGFjay9tc2dwYWNrL2Rpc3QuZXM1K2VzbS91dGlscy91dGY4Lm1qcyAqKiohXG4gIFxcKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qKiovICgoX191bnVzZWRfd2VicGFja19fX3dlYnBhY2tfbW9kdWxlX18sIF9fd2VicGFja19leHBvcnRzX18sIF9fd2VicGFja19yZXF1aXJlX18pID0+IHtcblxuX193ZWJwYWNrX3JlcXVpcmVfXy5yKF9fd2VicGFja19leHBvcnRzX18pO1xuLyogaGFybW9ueSBleHBvcnQgKi8gX193ZWJwYWNrX3JlcXVpcmVfXy5kKF9fd2VicGFja19leHBvcnRzX18sIHtcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgVEVYVF9ERUNPREVSX1RIUkVTSE9MRDogKCkgPT4gKC8qIGJpbmRpbmcgKi8gVEVYVF9ERUNPREVSX1RIUkVTSE9MRCksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIFRFWFRfRU5DT0RFUl9USFJFU0hPTEQ6ICgpID0+ICgvKiBiaW5kaW5nICovIFRFWFRfRU5DT0RFUl9USFJFU0hPTEQpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICB1dGY4Q291bnQ6ICgpID0+ICgvKiBiaW5kaW5nICovIHV0ZjhDb3VudCksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIHV0ZjhEZWNvZGVKczogKCkgPT4gKC8qIGJpbmRpbmcgKi8gdXRmOERlY29kZUpzKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgdXRmOERlY29kZVREOiAoKSA9PiAoLyogYmluZGluZyAqLyB1dGY4RGVjb2RlVEQpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICB1dGY4RW5jb2RlSnM6ICgpID0+ICgvKiBiaW5kaW5nICovIHV0ZjhFbmNvZGVKcyksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIHV0ZjhFbmNvZGVURTogKCkgPT4gKC8qIGJpbmRpbmcgKi8gdXRmOEVuY29kZVRFKVxuLyogaGFybW9ueSBleHBvcnQgKi8gfSk7XG4vKiBoYXJtb255IGltcG9ydCAqLyB2YXIgX2ludF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vaW50Lm1qcyAqLyBcIi4vbm9kZV9tb2R1bGVzL0Btc2dwYWNrL21zZ3BhY2svZGlzdC5lczUrZXNtL3V0aWxzL2ludC5tanNcIik7XG52YXIgX2EsIF9iLCBfYztcbi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bm5lY2Vzc2FyeS1jb25kaXRpb24gKi9cblxudmFyIFRFWFRfRU5DT0RJTkdfQVZBSUxBQkxFID0gKHR5cGVvZiBwcm9jZXNzID09PSBcInVuZGVmaW5lZFwiIHx8ICgoX2EgPSBwcm9jZXNzID09PSBudWxsIHx8IHByb2Nlc3MgPT09IHZvaWQgMCA/IHZvaWQgMCA6IHByb2Nlc3MuZW52KSA9PT0gbnVsbCB8fCBfYSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX2FbXCJURVhUX0VOQ09ESU5HXCJdKSAhPT0gXCJuZXZlclwiKSAmJlxuICAgIHR5cGVvZiBUZXh0RW5jb2RlciAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgIHR5cGVvZiBUZXh0RGVjb2RlciAhPT0gXCJ1bmRlZmluZWRcIjtcbmZ1bmN0aW9uIHV0ZjhDb3VudChzdHIpIHtcbiAgICB2YXIgc3RyTGVuZ3RoID0gc3RyLmxlbmd0aDtcbiAgICB2YXIgYnl0ZUxlbmd0aCA9IDA7XG4gICAgdmFyIHBvcyA9IDA7XG4gICAgd2hpbGUgKHBvcyA8IHN0ckxlbmd0aCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBzdHIuY2hhckNvZGVBdChwb3MrKyk7XG4gICAgICAgIGlmICgodmFsdWUgJiAweGZmZmZmZjgwKSA9PT0gMCkge1xuICAgICAgICAgICAgLy8gMS1ieXRlXG4gICAgICAgICAgICBieXRlTGVuZ3RoKys7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICgodmFsdWUgJiAweGZmZmZmODAwKSA9PT0gMCkge1xuICAgICAgICAgICAgLy8gMi1ieXRlc1xuICAgICAgICAgICAgYnl0ZUxlbmd0aCArPSAyO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gaGFuZGxlIHN1cnJvZ2F0ZSBwYWlyXG4gICAgICAgICAgICBpZiAodmFsdWUgPj0gMHhkODAwICYmIHZhbHVlIDw9IDB4ZGJmZikge1xuICAgICAgICAgICAgICAgIC8vIGhpZ2ggc3Vycm9nYXRlXG4gICAgICAgICAgICAgICAgaWYgKHBvcyA8IHN0ckxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXh0cmEgPSBzdHIuY2hhckNvZGVBdChwb3MpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGV4dHJhICYgMHhmYzAwKSA9PT0gMHhkYzAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK3BvcztcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gKCh2YWx1ZSAmIDB4M2ZmKSA8PCAxMCkgKyAoZXh0cmEgJiAweDNmZikgKyAweDEwMDAwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCh2YWx1ZSAmIDB4ZmZmZjAwMDApID09PSAwKSB7XG4gICAgICAgICAgICAgICAgLy8gMy1ieXRlXG4gICAgICAgICAgICAgICAgYnl0ZUxlbmd0aCArPSAzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gNC1ieXRlXG4gICAgICAgICAgICAgICAgYnl0ZUxlbmd0aCArPSA0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBieXRlTGVuZ3RoO1xufVxuZnVuY3Rpb24gdXRmOEVuY29kZUpzKHN0ciwgb3V0cHV0LCBvdXRwdXRPZmZzZXQpIHtcbiAgICB2YXIgc3RyTGVuZ3RoID0gc3RyLmxlbmd0aDtcbiAgICB2YXIgb2Zmc2V0ID0gb3V0cHV0T2Zmc2V0O1xuICAgIHZhciBwb3MgPSAwO1xuICAgIHdoaWxlIChwb3MgPCBzdHJMZW5ndGgpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gc3RyLmNoYXJDb2RlQXQocG9zKyspO1xuICAgICAgICBpZiAoKHZhbHVlICYgMHhmZmZmZmY4MCkgPT09IDApIHtcbiAgICAgICAgICAgIC8vIDEtYnl0ZVxuICAgICAgICAgICAgb3V0cHV0W29mZnNldCsrXSA9IHZhbHVlO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoKHZhbHVlICYgMHhmZmZmZjgwMCkgPT09IDApIHtcbiAgICAgICAgICAgIC8vIDItYnl0ZXNcbiAgICAgICAgICAgIG91dHB1dFtvZmZzZXQrK10gPSAoKHZhbHVlID4+IDYpICYgMHgxZikgfCAweGMwO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gaGFuZGxlIHN1cnJvZ2F0ZSBwYWlyXG4gICAgICAgICAgICBpZiAodmFsdWUgPj0gMHhkODAwICYmIHZhbHVlIDw9IDB4ZGJmZikge1xuICAgICAgICAgICAgICAgIC8vIGhpZ2ggc3Vycm9nYXRlXG4gICAgICAgICAgICAgICAgaWYgKHBvcyA8IHN0ckxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXh0cmEgPSBzdHIuY2hhckNvZGVBdChwb3MpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKGV4dHJhICYgMHhmYzAwKSA9PT0gMHhkYzAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK3BvcztcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gKCh2YWx1ZSAmIDB4M2ZmKSA8PCAxMCkgKyAoZXh0cmEgJiAweDNmZikgKyAweDEwMDAwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCh2YWx1ZSAmIDB4ZmZmZjAwMDApID09PSAwKSB7XG4gICAgICAgICAgICAgICAgLy8gMy1ieXRlXG4gICAgICAgICAgICAgICAgb3V0cHV0W29mZnNldCsrXSA9ICgodmFsdWUgPj4gMTIpICYgMHgwZikgfCAweGUwO1xuICAgICAgICAgICAgICAgIG91dHB1dFtvZmZzZXQrK10gPSAoKHZhbHVlID4+IDYpICYgMHgzZikgfCAweDgwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gNC1ieXRlXG4gICAgICAgICAgICAgICAgb3V0cHV0W29mZnNldCsrXSA9ICgodmFsdWUgPj4gMTgpICYgMHgwNykgfCAweGYwO1xuICAgICAgICAgICAgICAgIG91dHB1dFtvZmZzZXQrK10gPSAoKHZhbHVlID4+IDEyKSAmIDB4M2YpIHwgMHg4MDtcbiAgICAgICAgICAgICAgICBvdXRwdXRbb2Zmc2V0KytdID0gKCh2YWx1ZSA+PiA2KSAmIDB4M2YpIHwgMHg4MDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBvdXRwdXRbb2Zmc2V0KytdID0gKHZhbHVlICYgMHgzZikgfCAweDgwO1xuICAgIH1cbn1cbnZhciBzaGFyZWRUZXh0RW5jb2RlciA9IFRFWFRfRU5DT0RJTkdfQVZBSUxBQkxFID8gbmV3IFRleHRFbmNvZGVyKCkgOiB1bmRlZmluZWQ7XG52YXIgVEVYVF9FTkNPREVSX1RIUkVTSE9MRCA9ICFURVhUX0VOQ09ESU5HX0FWQUlMQUJMRVxuICAgID8gX2ludF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5VSU5UMzJfTUFYXG4gICAgOiB0eXBlb2YgcHJvY2VzcyAhPT0gXCJ1bmRlZmluZWRcIiAmJiAoKF9iID0gcHJvY2VzcyA9PT0gbnVsbCB8fCBwcm9jZXNzID09PSB2b2lkIDAgPyB2b2lkIDAgOiBwcm9jZXNzLmVudikgPT09IG51bGwgfHwgX2IgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9iW1wiVEVYVF9FTkNPRElOR1wiXSkgIT09IFwiZm9yY2VcIlxuICAgICAgICA/IDIwMFxuICAgICAgICA6IDA7XG5mdW5jdGlvbiB1dGY4RW5jb2RlVEVlbmNvZGUoc3RyLCBvdXRwdXQsIG91dHB1dE9mZnNldCkge1xuICAgIG91dHB1dC5zZXQoc2hhcmVkVGV4dEVuY29kZXIuZW5jb2RlKHN0ciksIG91dHB1dE9mZnNldCk7XG59XG5mdW5jdGlvbiB1dGY4RW5jb2RlVEVlbmNvZGVJbnRvKHN0ciwgb3V0cHV0LCBvdXRwdXRPZmZzZXQpIHtcbiAgICBzaGFyZWRUZXh0RW5jb2Rlci5lbmNvZGVJbnRvKHN0ciwgb3V0cHV0LnN1YmFycmF5KG91dHB1dE9mZnNldCkpO1xufVxudmFyIHV0ZjhFbmNvZGVURSA9IChzaGFyZWRUZXh0RW5jb2RlciA9PT0gbnVsbCB8fCBzaGFyZWRUZXh0RW5jb2RlciA9PT0gdm9pZCAwID8gdm9pZCAwIDogc2hhcmVkVGV4dEVuY29kZXIuZW5jb2RlSW50bykgPyB1dGY4RW5jb2RlVEVlbmNvZGVJbnRvIDogdXRmOEVuY29kZVRFZW5jb2RlO1xudmFyIENIVU5LX1NJWkUgPSA0MDk2O1xuZnVuY3Rpb24gdXRmOERlY29kZUpzKGJ5dGVzLCBpbnB1dE9mZnNldCwgYnl0ZUxlbmd0aCkge1xuICAgIHZhciBvZmZzZXQgPSBpbnB1dE9mZnNldDtcbiAgICB2YXIgZW5kID0gb2Zmc2V0ICsgYnl0ZUxlbmd0aDtcbiAgICB2YXIgdW5pdHMgPSBbXTtcbiAgICB2YXIgcmVzdWx0ID0gXCJcIjtcbiAgICB3aGlsZSAob2Zmc2V0IDwgZW5kKSB7XG4gICAgICAgIHZhciBieXRlMSA9IGJ5dGVzW29mZnNldCsrXTtcbiAgICAgICAgaWYgKChieXRlMSAmIDB4ODApID09PSAwKSB7XG4gICAgICAgICAgICAvLyAxIGJ5dGVcbiAgICAgICAgICAgIHVuaXRzLnB1c2goYnl0ZTEpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKChieXRlMSAmIDB4ZTApID09PSAweGMwKSB7XG4gICAgICAgICAgICAvLyAyIGJ5dGVzXG4gICAgICAgICAgICB2YXIgYnl0ZTIgPSBieXRlc1tvZmZzZXQrK10gJiAweDNmO1xuICAgICAgICAgICAgdW5pdHMucHVzaCgoKGJ5dGUxICYgMHgxZikgPDwgNikgfCBieXRlMik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoKGJ5dGUxICYgMHhmMCkgPT09IDB4ZTApIHtcbiAgICAgICAgICAgIC8vIDMgYnl0ZXNcbiAgICAgICAgICAgIHZhciBieXRlMiA9IGJ5dGVzW29mZnNldCsrXSAmIDB4M2Y7XG4gICAgICAgICAgICB2YXIgYnl0ZTMgPSBieXRlc1tvZmZzZXQrK10gJiAweDNmO1xuICAgICAgICAgICAgdW5pdHMucHVzaCgoKGJ5dGUxICYgMHgxZikgPDwgMTIpIHwgKGJ5dGUyIDw8IDYpIHwgYnl0ZTMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKChieXRlMSAmIDB4ZjgpID09PSAweGYwKSB7XG4gICAgICAgICAgICAvLyA0IGJ5dGVzXG4gICAgICAgICAgICB2YXIgYnl0ZTIgPSBieXRlc1tvZmZzZXQrK10gJiAweDNmO1xuICAgICAgICAgICAgdmFyIGJ5dGUzID0gYnl0ZXNbb2Zmc2V0KytdICYgMHgzZjtcbiAgICAgICAgICAgIHZhciBieXRlNCA9IGJ5dGVzW29mZnNldCsrXSAmIDB4M2Y7XG4gICAgICAgICAgICB2YXIgdW5pdCA9ICgoYnl0ZTEgJiAweDA3KSA8PCAweDEyKSB8IChieXRlMiA8PCAweDBjKSB8IChieXRlMyA8PCAweDA2KSB8IGJ5dGU0O1xuICAgICAgICAgICAgaWYgKHVuaXQgPiAweGZmZmYpIHtcbiAgICAgICAgICAgICAgICB1bml0IC09IDB4MTAwMDA7XG4gICAgICAgICAgICAgICAgdW5pdHMucHVzaCgoKHVuaXQgPj4+IDEwKSAmIDB4M2ZmKSB8IDB4ZDgwMCk7XG4gICAgICAgICAgICAgICAgdW5pdCA9IDB4ZGMwMCB8ICh1bml0ICYgMHgzZmYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdW5pdHMucHVzaCh1bml0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHVuaXRzLnB1c2goYnl0ZTEpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh1bml0cy5sZW5ndGggPj0gQ0hVTktfU0laRSkge1xuICAgICAgICAgICAgcmVzdWx0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCB1bml0cyk7XG4gICAgICAgICAgICB1bml0cy5sZW5ndGggPSAwO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmICh1bml0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJlc3VsdCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgdW5pdHMpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxudmFyIHNoYXJlZFRleHREZWNvZGVyID0gVEVYVF9FTkNPRElOR19BVkFJTEFCTEUgPyBuZXcgVGV4dERlY29kZXIoKSA6IG51bGw7XG52YXIgVEVYVF9ERUNPREVSX1RIUkVTSE9MRCA9ICFURVhUX0VOQ09ESU5HX0FWQUlMQUJMRVxuICAgID8gX2ludF9tanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5VSU5UMzJfTUFYXG4gICAgOiB0eXBlb2YgcHJvY2VzcyAhPT0gXCJ1bmRlZmluZWRcIiAmJiAoKF9jID0gcHJvY2VzcyA9PT0gbnVsbCB8fCBwcm9jZXNzID09PSB2b2lkIDAgPyB2b2lkIDAgOiBwcm9jZXNzLmVudikgPT09IG51bGwgfHwgX2MgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9jW1wiVEVYVF9ERUNPREVSXCJdKSAhPT0gXCJmb3JjZVwiXG4gICAgICAgID8gMjAwXG4gICAgICAgIDogMDtcbmZ1bmN0aW9uIHV0ZjhEZWNvZGVURChieXRlcywgaW5wdXRPZmZzZXQsIGJ5dGVMZW5ndGgpIHtcbiAgICB2YXIgc3RyaW5nQnl0ZXMgPSBieXRlcy5zdWJhcnJheShpbnB1dE9mZnNldCwgaW5wdXRPZmZzZXQgKyBieXRlTGVuZ3RoKTtcbiAgICByZXR1cm4gc2hhcmVkVGV4dERlY29kZXIuZGVjb2RlKHN0cmluZ0J5dGVzKTtcbn1cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXV0ZjgubWpzLm1hcFxuXG4vKioqLyB9KVxuXG4vKioqKioqLyBcdH0pO1xuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbi8qKioqKiovIFx0Ly8gVGhlIG1vZHVsZSBjYWNoZVxuLyoqKioqKi8gXHR2YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG4vKioqKioqLyBcdFxuLyoqKioqKi8gXHQvLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuLyoqKioqKi8gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG4vKioqKioqLyBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4vKioqKioqLyBcdFx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG4vKioqKioqLyBcdFx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG4vKioqKioqLyBcdFx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG4vKioqKioqLyBcdFx0fVxuLyoqKioqKi8gXHRcdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG4vKioqKioqLyBcdFx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG4vKioqKioqLyBcdFx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG4vKioqKioqLyBcdFx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuLyoqKioqKi8gXHRcdFx0ZXhwb3J0czoge31cbi8qKioqKiovIFx0XHR9O1xuLyoqKioqKi8gXHRcbi8qKioqKiovIFx0XHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cbi8qKioqKiovIFx0XHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcbi8qKioqKiovIFx0XG4vKioqKioqLyBcdFx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcbi8qKioqKiovIFx0XHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4vKioqKioqLyBcdH1cbi8qKioqKiovIFx0XG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuLyoqKioqKi8gXHQvKiB3ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMgKi9cbi8qKioqKiovIFx0KCgpID0+IHtcbi8qKioqKiovIFx0XHQvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9ucyBmb3IgaGFybW9ueSBleHBvcnRzXG4vKioqKioqLyBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcbi8qKioqKiovIFx0XHRcdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcbi8qKioqKiovIFx0XHRcdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKGRlZmluaXRpb24sIGtleSkgJiYgIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBrZXkpKSB7XG4vKioqKioqLyBcdFx0XHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcbi8qKioqKiovIFx0XHRcdFx0fVxuLyoqKioqKi8gXHRcdFx0fVxuLyoqKioqKi8gXHRcdH07XG4vKioqKioqLyBcdH0pKCk7XG4vKioqKioqLyBcdFxuLyoqKioqKi8gXHQvKiB3ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kICovXG4vKioqKioqLyBcdCgoKSA9PiB7XG4vKioqKioqLyBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKVxuLyoqKioqKi8gXHR9KSgpO1xuLyoqKioqKi8gXHRcbi8qKioqKiovIFx0Lyogd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCAqL1xuLyoqKioqKi8gXHQoKCkgPT4ge1xuLyoqKioqKi8gXHRcdC8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbi8qKioqKiovIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuLyoqKioqKi8gXHRcdFx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG4vKioqKioqLyBcdFx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuLyoqKioqKi8gXHRcdFx0fVxuLyoqKioqKi8gXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbi8qKioqKiovIFx0XHR9O1xuLyoqKioqKi8gXHR9KSgpO1xuLyoqKioqKi8gXHRcbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG52YXIgX193ZWJwYWNrX2V4cG9ydHNfXyA9IHt9O1xuLyohKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqISpcXFxuICAhKioqIC4vc3JjL3dlYnNvY2tldC1jbGllbnQuanMgKioqIVxuICBcXCoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cbl9fd2VicGFja19yZXF1aXJlX18ucihfX3dlYnBhY2tfZXhwb3J0c19fKTtcbi8qIGhhcm1vbnkgZXhwb3J0ICovIF9fd2VicGFja19yZXF1aXJlX18uZChfX3dlYnBhY2tfZXhwb3J0c19fLCB7XG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIEFQSV9WRVJTSU9OOiAoKSA9PiAoLyogcmVleHBvcnQgc2FmZSAqLyBfcnBjX2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uQVBJX1ZFUlNJT04pLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBMb2NhbFdlYlNvY2tldDogKCkgPT4gKC8qIGJpbmRpbmcgKi8gTG9jYWxXZWJTb2NrZXQpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBSUEM6ICgpID0+ICgvKiByZWV4cG9ydCBzYWZlICovIF9ycGNfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzBfXy5SUEMpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBjb25uZWN0VG9TZXJ2ZXI6ICgpID0+ICgvKiBiaW5kaW5nICovIGNvbm5lY3RUb1NlcnZlciksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIGdldFJUQ1NlcnZpY2U6ICgpID0+ICgvKiByZWV4cG9ydCBzYWZlICovIF93ZWJydGNfY2xpZW50X2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8zX18uZ2V0UlRDU2VydmljZSksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIGdldFJlbW90ZVNlcnZpY2U6ICgpID0+ICgvKiBiaW5kaW5nICovIGdldFJlbW90ZVNlcnZpY2UpLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBsb2FkUmVxdWlyZW1lbnRzOiAoKSA9PiAoLyogcmVleHBvcnQgc2FmZSAqLyBfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5sb2FkUmVxdWlyZW1lbnRzKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgbG9naW46ICgpID0+ICgvKiBiaW5kaW5nICovIGxvZ2luKSxcbi8qIGhhcm1vbnkgZXhwb3J0ICovICAgcmVnaXN0ZXJSVENTZXJ2aWNlOiAoKSA9PiAoLyogcmVleHBvcnQgc2FmZSAqLyBfd2VicnRjX2NsaWVudF9qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfM19fLnJlZ2lzdGVyUlRDU2VydmljZSksXG4vKiBoYXJtb255IGV4cG9ydCAqLyAgIHNjaGVtYUZ1bmN0aW9uOiAoKSA9PiAoLyogcmVleHBvcnQgc2FmZSAqLyBfdXRpbHNfc2NoZW1hX2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18uc2NoZW1hRnVuY3Rpb24pLFxuLyogaGFybW9ueSBleHBvcnQgKi8gICBzZXR1cExvY2FsQ2xpZW50OiAoKSA9PiAoLyogYmluZGluZyAqLyBzZXR1cExvY2FsQ2xpZW50KVxuLyogaGFybW9ueSBleHBvcnQgKi8gfSk7XG4vKiBoYXJtb255IGltcG9ydCAqLyB2YXIgX3JwY19qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMF9fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgLi9ycGMuanMgKi8gXCIuL3NyYy9ycGMuanNcIik7XG4vKiBoYXJtb255IGltcG9ydCAqLyB2YXIgX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKC8qISAuL3V0aWxzICovIFwiLi9zcmMvdXRpbHMvaW5kZXguanNcIik7XG4vKiBoYXJtb255IGltcG9ydCAqLyB2YXIgX3V0aWxzX3NjaGVtYV9qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fID0gX193ZWJwYWNrX3JlcXVpcmVfXygvKiEgLi91dGlscy9zY2hlbWEuanMgKi8gXCIuL3NyYy91dGlscy9zY2hlbWEuanNcIik7XG4vKiBoYXJtb255IGltcG9ydCAqLyB2YXIgX3dlYnJ0Y19jbGllbnRfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzNfXyA9IF9fd2VicGFja19yZXF1aXJlX18oLyohIC4vd2VicnRjLWNsaWVudC5qcyAqLyBcIi4vc3JjL3dlYnJ0Yy1jbGllbnQuanNcIik7XG5cblxuXG5cblxuXG5cblxuXG5jb25zdCBNQVhfUkVUUlkgPSAxMDAwMDAwO1xuXG5jbGFzcyBXZWJzb2NrZXRSUENDb25uZWN0aW9uIHtcbiAgY29uc3RydWN0b3IoXG4gICAgc2VydmVyX3VybCxcbiAgICBjbGllbnRfaWQsXG4gICAgd29ya3NwYWNlLFxuICAgIHRva2VuLFxuICAgIHJlY29ubmVjdGlvbl90b2tlbiA9IG51bGwsXG4gICAgdGltZW91dCA9IDYwLFxuICAgIFdlYlNvY2tldENsYXNzID0gbnVsbCxcbiAgICB0b2tlbl9yZWZyZXNoX2ludGVydmFsID0gMiAqIDYwICogNjAsXG4gICkge1xuICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLmFzc2VydCkoc2VydmVyX3VybCAmJiBjbGllbnRfaWQsIFwic2VydmVyX3VybCBhbmQgY2xpZW50X2lkIGFyZSByZXF1aXJlZFwiKTtcbiAgICB0aGlzLl9zZXJ2ZXJfdXJsID0gc2VydmVyX3VybDtcbiAgICB0aGlzLl9jbGllbnRfaWQgPSBjbGllbnRfaWQ7XG4gICAgdGhpcy5fd29ya3NwYWNlID0gd29ya3NwYWNlO1xuICAgIHRoaXMuX3Rva2VuID0gdG9rZW47XG4gICAgdGhpcy5fcmVjb25uZWN0aW9uX3Rva2VuID0gcmVjb25uZWN0aW9uX3Rva2VuO1xuICAgIHRoaXMuX3dlYnNvY2tldCA9IG51bGw7XG4gICAgdGhpcy5faGFuZGxlX21lc3NhZ2UgPSBudWxsO1xuICAgIHRoaXMuX2hhbmRsZV9jb25uZWN0ZWQgPSBudWxsOyAvLyBDb25uZWN0aW9uIG9wZW4gZXZlbnQgaGFuZGxlclxuICAgIHRoaXMuX2hhbmRsZV9kaXNjb25uZWN0ZWQgPSBudWxsOyAvLyBEaXNjb25uZWN0aW9uIGV2ZW50IGhhbmRsZXJcbiAgICB0aGlzLl90aW1lb3V0ID0gdGltZW91dDtcbiAgICB0aGlzLl9XZWJTb2NrZXRDbGFzcyA9IFdlYlNvY2tldENsYXNzIHx8IFdlYlNvY2tldDsgLy8gQWxsb3cgb3ZlcnJpZGluZyB0aGUgV2ViU29ja2V0IGNsYXNzXG4gICAgdGhpcy5fY2xvc2VkID0gZmFsc2U7XG4gICAgdGhpcy5fbGVnYWN5X2F1dGggPSBudWxsO1xuICAgIHRoaXMuY29ubmVjdGlvbl9pbmZvID0gbnVsbDtcbiAgICB0aGlzLl9lbmFibGVfcmVjb25uZWN0ID0gZmFsc2U7XG4gICAgdGhpcy5fdG9rZW5fcmVmcmVzaF9pbnRlcnZhbCA9IHRva2VuX3JlZnJlc2hfaW50ZXJ2YWw7XG4gICAgdGhpcy5tYW5hZ2VyX2lkID0gbnVsbDtcbiAgICB0aGlzLl9yZWZyZXNoX3Rva2VuX3Rhc2sgPSBudWxsO1xuICAgIHRoaXMuX2xhc3RfbWVzc2FnZSA9IG51bGw7IC8vIFN0b3JlIHRoZSBsYXN0IHNlbnQgbWVzc2FnZVxuICB9XG5cbiAgb25fbWVzc2FnZShoYW5kbGVyKSB7XG4gICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18uYXNzZXJ0KShoYW5kbGVyLCBcImhhbmRsZXIgaXMgcmVxdWlyZWRcIik7XG4gICAgdGhpcy5faGFuZGxlX21lc3NhZ2UgPSBoYW5kbGVyO1xuICB9XG5cbiAgb25fY29ubmVjdGVkKGhhbmRsZXIpIHtcbiAgICB0aGlzLl9oYW5kbGVfY29ubmVjdGVkID0gaGFuZGxlcjtcbiAgfVxuXG4gIG9uX2Rpc2Nvbm5lY3RlZChoYW5kbGVyKSB7XG4gICAgdGhpcy5faGFuZGxlX2Rpc2Nvbm5lY3RlZCA9IGhhbmRsZXI7XG4gIH1cblxuICBhc3luYyBfYXR0ZW1wdF9jb25uZWN0aW9uKHNlcnZlcl91cmwsIGF0dGVtcHRfZmFsbGJhY2sgPSB0cnVlKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMuX2xlZ2FjeV9hdXRoID0gZmFsc2U7XG4gICAgICBjb25zdCB3ZWJzb2NrZXQgPSBuZXcgdGhpcy5fV2ViU29ja2V0Q2xhc3Moc2VydmVyX3VybCk7XG4gICAgICB3ZWJzb2NrZXQuYmluYXJ5VHlwZSA9IFwiYXJyYXlidWZmZXJcIjtcblxuICAgICAgd2Vic29ja2V0Lm9ub3BlbiA9ICgpID0+IHtcbiAgICAgICAgY29uc29sZS5pbmZvKFwiV2ViU29ja2V0IGNvbm5lY3Rpb24gZXN0YWJsaXNoZWRcIik7XG4gICAgICAgIHJlc29sdmUod2Vic29ja2V0KTtcbiAgICAgIH07XG5cbiAgICAgIHdlYnNvY2tldC5vbmVycm9yID0gKGV2ZW50KSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJXZWJTb2NrZXQgY29ubmVjdGlvbiBlcnJvcjpcIiwgZXZlbnQpO1xuICAgICAgICByZWplY3QobmV3IEVycm9yKGBXZWJTb2NrZXQgY29ubmVjdGlvbiBlcnJvcjogJHtldmVudH1gKSk7XG4gICAgICB9O1xuXG4gICAgICB3ZWJzb2NrZXQub25jbG9zZSA9IChldmVudCkgPT4ge1xuICAgICAgICBpZiAoZXZlbnQuY29kZSA9PT0gMTAwMyAmJiBhdHRlbXB0X2ZhbGxiYWNrKSB7XG4gICAgICAgICAgY29uc29sZS5pbmZvKFxuICAgICAgICAgICAgXCJSZWNlaXZlZCAxMDAzIGVycm9yLCBhdHRlbXB0aW5nIGNvbm5lY3Rpb24gd2l0aCBxdWVyeSBwYXJhbWV0ZXJzLlwiLFxuICAgICAgICAgICk7XG4gICAgICAgICAgdGhpcy5fbGVnYWN5X2F1dGggPSB0cnVlO1xuICAgICAgICAgIHRoaXMuX2F0dGVtcHRfY29ubmVjdGlvbl93aXRoX3F1ZXJ5X3BhcmFtcyhzZXJ2ZXJfdXJsKVxuICAgICAgICAgICAgLnRoZW4ocmVzb2x2ZSlcbiAgICAgICAgICAgIC5jYXRjaChyZWplY3QpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2hhbmRsZV9kaXNjb25uZWN0ZWQpIHtcbiAgICAgICAgICB0aGlzLl9oYW5kbGVfZGlzY29ubmVjdGVkKGV2ZW50LnJlYXNvbik7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBfYXR0ZW1wdF9jb25uZWN0aW9uX3dpdGhfcXVlcnlfcGFyYW1zKHNlcnZlcl91cmwpIHtcbiAgICAvLyBJbml0aWFsaXplIGFuIGFycmF5IHRvIGhvbGQgcGFydHMgb2YgdGhlIHF1ZXJ5IHN0cmluZ1xuICAgIGNvbnN0IHF1ZXJ5UGFyYW1zUGFydHMgPSBbXTtcblxuICAgIC8vIENvbmRpdGlvbmFsbHkgYWRkIGVhY2ggcGFyYW1ldGVyIGlmIGl0IGhhcyBhIG5vbi1lbXB0eSB2YWx1ZVxuICAgIGlmICh0aGlzLl9jbGllbnRfaWQpXG4gICAgICBxdWVyeVBhcmFtc1BhcnRzLnB1c2goYGNsaWVudF9pZD0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLl9jbGllbnRfaWQpfWApO1xuICAgIGlmICh0aGlzLl93b3Jrc3BhY2UpXG4gICAgICBxdWVyeVBhcmFtc1BhcnRzLnB1c2goYHdvcmtzcGFjZT0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLl93b3Jrc3BhY2UpfWApO1xuICAgIGlmICh0aGlzLl90b2tlbilcbiAgICAgIHF1ZXJ5UGFyYW1zUGFydHMucHVzaChgdG9rZW49JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5fdG9rZW4pfWApO1xuICAgIGlmICh0aGlzLl9yZWNvbm5lY3Rpb25fdG9rZW4pXG4gICAgICBxdWVyeVBhcmFtc1BhcnRzLnB1c2goXG4gICAgICAgIGByZWNvbm5lY3Rpb25fdG9rZW49JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5fcmVjb25uZWN0aW9uX3Rva2VuKX1gLFxuICAgICAgKTtcblxuICAgIC8vIEpvaW4gdGhlIHBhcnRzIHdpdGggJyYnIHRvIGZvcm0gdGhlIGZpbmFsIHF1ZXJ5IHN0cmluZywgcHJlcGVuZCAnPycgaWYgdGhlcmUgYXJlIGFueSBwYXJhbWV0ZXJzXG4gICAgY29uc3QgcXVlcnlTdHJpbmcgPVxuICAgICAgcXVlcnlQYXJhbXNQYXJ0cy5sZW5ndGggPiAwID8gYD8ke3F1ZXJ5UGFyYW1zUGFydHMuam9pbihcIiZcIil9YCA6IFwiXCI7XG5cbiAgICAvLyBDb25zdHJ1Y3QgdGhlIGZ1bGwgVVJMIGJ5IGFwcGVuZGluZyB0aGUgcXVlcnkgc3RyaW5nIGlmIGl0IGV4aXN0c1xuICAgIGNvbnN0IGZ1bGxfdXJsID0gc2VydmVyX3VybCArIHF1ZXJ5U3RyaW5nO1xuXG4gICAgcmV0dXJuIGF3YWl0IHRoaXMuX2F0dGVtcHRfY29ubmVjdGlvbihmdWxsX3VybCwgZmFsc2UpO1xuICB9XG5cbiAgX2VzdGFibGlzaF9jb25uZWN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLl93ZWJzb2NrZXQub25tZXNzYWdlID0gKGV2ZW50KSA9PiB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSBldmVudC5kYXRhO1xuICAgICAgICBjb25zdCBmaXJzdF9tZXNzYWdlID0gSlNPTi5wYXJzZShkYXRhKTtcbiAgICAgICAgaWYgKGZpcnN0X21lc3NhZ2UudHlwZSA9PSBcImNvbm5lY3Rpb25faW5mb1wiKSB7XG4gICAgICAgICAgdGhpcy5jb25uZWN0aW9uX2luZm8gPSBmaXJzdF9tZXNzYWdlO1xuICAgICAgICAgIGlmICh0aGlzLl93b3Jrc3BhY2UpIHtcbiAgICAgICAgICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLmFzc2VydCkoXG4gICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbl9pbmZvLndvcmtzcGFjZSA9PT0gdGhpcy5fd29ya3NwYWNlLFxuICAgICAgICAgICAgICBgQ29ubmVjdGVkIHRvIHRoZSB3cm9uZyB3b3Jrc3BhY2U6ICR7dGhpcy5jb25uZWN0aW9uX2luZm8ud29ya3NwYWNlfSwgZXhwZWN0ZWQ6ICR7dGhpcy5fd29ya3NwYWNlfWAsXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodGhpcy5jb25uZWN0aW9uX2luZm8ucmVjb25uZWN0aW9uX3Rva2VuKSB7XG4gICAgICAgICAgICB0aGlzLl9yZWNvbm5lY3Rpb25fdG9rZW4gPSB0aGlzLmNvbm5lY3Rpb25faW5mby5yZWNvbm5lY3Rpb25fdG9rZW47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0aGlzLmNvbm5lY3Rpb25faW5mby5yZWNvbm5lY3Rpb25fdG9rZW5fbGlmZV90aW1lKSB7XG4gICAgICAgICAgICAvLyBtYWtlIHN1cmUgdGhlIHRva2VuIHJlZnJlc2ggaW50ZXJ2YWwgaXMgbGVzcyB0aGFuIHRoZSB0b2tlbiBsaWZlIHRpbWVcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgdGhpcy50b2tlbl9yZWZyZXNoX2ludGVydmFsID5cbiAgICAgICAgICAgICAgdGhpcy5jb25uZWN0aW9uX2luZm8ucmVjb25uZWN0aW9uX3Rva2VuX2xpZmVfdGltZSAvIDEuNVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAgICAgICBgVG9rZW4gcmVmcmVzaCBpbnRlcnZhbCBpcyB0b28gbG9uZyAoJHt0aGlzLnRva2VuX3JlZnJlc2hfaW50ZXJ2YWx9KSwgc2V0dGluZyBpdCB0byAxLjUgdGltZXMgb2YgdGhlIHRva2VuIGxpZmUgdGltZSgke3RoaXMuY29ubmVjdGlvbl9pbmZvLnJlY29ubmVjdGlvbl90b2tlbl9saWZlX3RpbWV9KS5gLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB0aGlzLnRva2VuX3JlZnJlc2hfaW50ZXJ2YWwgPVxuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvbl9pbmZvLnJlY29ubmVjdGlvbl90b2tlbl9saWZlX3RpbWUgLyAxLjU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMubWFuYWdlcl9pZCA9IHRoaXMuY29ubmVjdGlvbl9pbmZvLm1hbmFnZXJfaWQgfHwgbnVsbDtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgIGBTdWNjZXNzZnVsbHkgY29ubmVjdGVkIHRvIHRoZSBzZXJ2ZXIsIHdvcmtzcGFjZTogJHt0aGlzLmNvbm5lY3Rpb25faW5mby53b3Jrc3BhY2V9LCBtYW5hZ2VyX2lkOiAke3RoaXMubWFuYWdlcl9pZH1gLFxuICAgICAgICAgICk7XG4gICAgICAgICAgaWYgKHRoaXMuY29ubmVjdGlvbl9pbmZvLmFubm91bmNlbWVudCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYCR7dGhpcy5jb25uZWN0aW9uX2luZm8uYW5ub3VuY2VtZW50fWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXNvbHZlKHRoaXMuY29ubmVjdGlvbl9pbmZvKTtcbiAgICAgICAgfSBlbHNlIGlmIChmaXJzdF9tZXNzYWdlLnR5cGUgPT0gXCJlcnJvclwiKSB7XG4gICAgICAgICAgY29uc3QgZXJyb3IgPSBcIkNvbm5lY3Rpb25BYm9ydGVkRXJyb3I6IFwiICsgZmlyc3RfbWVzc2FnZS5tZXNzYWdlO1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gY29ubmVjdCwgXCIgKyBlcnJvcik7XG4gICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihlcnJvcikpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICAgXCJDb25uZWN0aW9uQWJvcnRlZEVycm9yOiBVbmV4cGVjdGVkIG1lc3NhZ2UgcmVjZWl2ZWQgZnJvbSB0aGUgc2VydmVyOlwiLFxuICAgICAgICAgICAgZGF0YSxcbiAgICAgICAgICApO1xuICAgICAgICAgIHJlamVjdChcbiAgICAgICAgICAgIG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgXCJDb25uZWN0aW9uQWJvcnRlZEVycm9yOiBVbmV4cGVjdGVkIG1lc3NhZ2UgcmVjZWl2ZWQgZnJvbSB0aGUgc2VydmVyXCIsXG4gICAgICAgICAgICApLFxuICAgICAgICAgICk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgb3BlbigpIHtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgIFwiQ3JlYXRpbmcgYSBuZXcgd2Vic29ja2V0IGNvbm5lY3Rpb24gdG9cIixcbiAgICAgIHRoaXMuX3NlcnZlcl91cmwuc3BsaXQoXCI/XCIpWzBdLFxuICAgICk7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuX3dlYnNvY2tldCA9IGF3YWl0IHRoaXMuX2F0dGVtcHRfY29ubmVjdGlvbih0aGlzLl9zZXJ2ZXJfdXJsKTtcbiAgICAgIGlmICh0aGlzLl9sZWdhY3lfYXV0aCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgXCJOb3RJbXBsZW1lbnRlZEVycm9yOiBMZWdhY3kgYXV0aGVudGljYXRpb24gaXMgbm90IHN1cHBvcnRlZFwiLFxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgLy8gU2VuZCBhdXRoZW50aWNhdGlvbiBpbmZvIGFzIHRoZSBmaXJzdCBtZXNzYWdlIGlmIGNvbm5lY3RlZCB3aXRob3V0IHF1ZXJ5IHBhcmFtc1xuICAgICAgY29uc3QgYXV0aEluZm8gPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIGNsaWVudF9pZDogdGhpcy5fY2xpZW50X2lkLFxuICAgICAgICB3b3Jrc3BhY2U6IHRoaXMuX3dvcmtzcGFjZSxcbiAgICAgICAgdG9rZW46IHRoaXMuX3Rva2VuLFxuICAgICAgICByZWNvbm5lY3Rpb25fdG9rZW46IHRoaXMuX3JlY29ubmVjdGlvbl90b2tlbixcbiAgICAgIH0pO1xuICAgICAgdGhpcy5fd2Vic29ja2V0LnNlbmQoYXV0aEluZm8pO1xuICAgICAgLy8gV2FpdCBmb3IgdGhlIGZpcnN0IG1lc3NhZ2UgZnJvbSB0aGUgc2VydmVyXG4gICAgICBhd2FpdCAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy53YWl0Rm9yKShcbiAgICAgICAgdGhpcy5fZXN0YWJsaXNoX2Nvbm5lY3Rpb24oKSxcbiAgICAgICAgdGhpcy5fdGltZW91dCxcbiAgICAgICAgXCJGYWlsZWQgdG8gcmVjZWl2ZSB0aGUgZmlyc3QgbWVzc2FnZSBmcm9tIHRoZSBzZXJ2ZXJcIixcbiAgICAgICk7XG4gICAgICBpZiAodGhpcy5fdG9rZW5fcmVmcmVzaF9pbnRlcnZhbCA+IDApIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5fc2VuZF9yZWZyZXNoX3Rva2VuKCk7XG4gICAgICAgICAgdGhpcy5fcmVmcmVzaF90b2tlbl90YXNrID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fc2VuZF9yZWZyZXNoX3Rva2VuKCk7XG4gICAgICAgICAgfSwgdGhpcy5fdG9rZW5fcmVmcmVzaF9pbnRlcnZhbCAqIDEwMDApO1xuICAgICAgICB9LCAyMDAwKTtcbiAgICAgIH1cbiAgICAgIC8vIExpc3RlbiB0byBtZXNzYWdlcyBmcm9tIHRoZSBzZXJ2ZXJcbiAgICAgIHRoaXMuX2VuYWJsZV9yZWNvbm5lY3QgPSB0cnVlO1xuICAgICAgdGhpcy5fY2xvc2VkID0gZmFsc2U7XG4gICAgICB0aGlzLl93ZWJzb2NrZXQub25tZXNzYWdlID0gKGV2ZW50KSA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgZXZlbnQuZGF0YSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgIGNvbnN0IHBhcnNlZERhdGEgPSBKU09OLnBhcnNlKGV2ZW50LmRhdGEpO1xuICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBtZXNzYWdlIGlzIGEgcmVjb25uZWN0aW9uIHRva2VuXG4gICAgICAgICAgaWYgKHBhcnNlZERhdGEudHlwZSA9PT0gXCJyZWNvbm5lY3Rpb25fdG9rZW5cIikge1xuICAgICAgICAgICAgdGhpcy5fcmVjb25uZWN0aW9uX3Rva2VuID0gcGFyc2VkRGF0YS5yZWNvbm5lY3Rpb25fdG9rZW47XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlY29ubmVjdGlvbiB0b2tlbiByZWNlaXZlZFwiKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJSZWNlaXZlZCBtZXNzYWdlIGZyb20gdGhlIHNlcnZlcjpcIiwgcGFyc2VkRGF0YSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuX2hhbmRsZV9tZXNzYWdlKGV2ZW50LmRhdGEpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICB0aGlzLl93ZWJzb2NrZXQub25lcnJvciA9IChldmVudCkgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiV2ViU29ja2V0IGNvbm5lY3Rpb24gZXJyb3I6XCIsIGV2ZW50KTtcbiAgICAgIH07XG5cbiAgICAgIHRoaXMuX3dlYnNvY2tldC5vbmNsb3NlID0gdGhpcy5faGFuZGxlX2Nsb3NlLmJpbmQodGhpcyk7XG5cbiAgICAgIGlmICh0aGlzLl9oYW5kbGVfY29ubmVjdGVkKSB7XG4gICAgICAgIHRoaXMuX2hhbmRsZV9jb25uZWN0ZWQodGhpcy5jb25uZWN0aW9uX2luZm8pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuY29ubmVjdGlvbl9pbmZvO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICBcIkZhaWxlZCB0byBjb25uZWN0IHRvXCIsXG4gICAgICAgIHRoaXMuX3NlcnZlcl91cmwuc3BsaXQoXCI/XCIpWzBdLFxuICAgICAgICBlcnJvcixcbiAgICAgICk7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBfc2VuZF9yZWZyZXNoX3Rva2VuKCkge1xuICAgIGlmICh0aGlzLl93ZWJzb2NrZXQgJiYgdGhpcy5fd2Vic29ja2V0LnJlYWR5U3RhdGUgPT09IFdlYlNvY2tldC5PUEVOKSB7XG4gICAgICBjb25zdCByZWZyZXNoTWVzc2FnZSA9IEpTT04uc3RyaW5naWZ5KHsgdHlwZTogXCJyZWZyZXNoX3Rva2VuXCIgfSk7XG4gICAgICB0aGlzLl93ZWJzb2NrZXQuc2VuZChyZWZyZXNoTWVzc2FnZSk7XG4gICAgICBjb25zb2xlLmxvZyhcIlJlcXVlc3RlZCByZWZyZXNoIHRva2VuXCIpO1xuICAgIH1cbiAgfVxuXG4gIF9oYW5kbGVfY2xvc2UoZXZlbnQpIHtcbiAgICBpZiAoXG4gICAgICAhdGhpcy5fY2xvc2VkICYmXG4gICAgICB0aGlzLl93ZWJzb2NrZXQgJiZcbiAgICAgIHRoaXMuX3dlYnNvY2tldC5yZWFkeVN0YXRlID09PSBXZWJTb2NrZXQuQ0xPU0VEXG4gICAgKSB7XG4gICAgICBpZiAoWzEwMDAsIDEwMDFdLmluY2x1ZGVzKGV2ZW50LmNvZGUpKSB7XG4gICAgICAgIGNvbnNvbGUuaW5mbyhcbiAgICAgICAgICBgV2Vic29ja2V0IGNvbm5lY3Rpb24gY2xvc2VkIChjb2RlOiAke2V2ZW50LmNvZGV9KTogJHtldmVudC5yZWFzb259YCxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKHRoaXMuX2hhbmRsZV9kaXNjb25uZWN0ZWQpIHtcbiAgICAgICAgICB0aGlzLl9oYW5kbGVfZGlzY29ubmVjdGVkKGV2ZW50LnJlYXNvbik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY2xvc2VkID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fZW5hYmxlX3JlY29ubmVjdCkge1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgXCJXZWJzb2NrZXQgY29ubmVjdGlvbiBjbG9zZWQgdW5leHBlY3RlZGx5IChjb2RlOiAlcyk6ICVzXCIsXG4gICAgICAgICAgZXZlbnQuY29kZSxcbiAgICAgICAgICBldmVudC5yZWFzb24sXG4gICAgICAgICk7XG4gICAgICAgIGxldCByZXRyeSA9IDA7XG4gICAgICAgIGNvbnN0IHJlY29ubmVjdCA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgICBgUmVjb25uZWN0aW5nIHRvICR7dGhpcy5fc2VydmVyX3VybC5zcGxpdChcIj9cIilbMF19IChhdHRlbXB0ICMke3JldHJ5fSlgLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vIE9wZW4gdGhlIGNvbm5lY3Rpb24sIHRoaXMgd2lsbCB0cmlnZ2VyIHRoZSBvbl9jb25uZWN0ZWQgY2FsbGJhY2tcbiAgICAgICAgICAgIGF3YWl0IHRoaXMub3BlbigpO1xuXG4gICAgICAgICAgICAvLyBXYWl0IGEgc2hvcnQgdGltZSBmb3Igc2VydmljZXMgdG8gYmUgcmVnaXN0ZXJlZFxuICAgICAgICAgICAgLy8gVGhpcyBnaXZlcyB0aW1lIGZvciB0aGUgb25fY29ubmVjdGVkIGNhbGxiYWNrIHRvIGNvbXBsZXRlXG4gICAgICAgICAgICAvLyB3aGljaCBpbmNsdWRlcyByZS1yZWdpc3RlcmluZyBhbGwgc2VydmljZXMgdG8gdGhlIHNlcnZlclxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwKSk7XG5cbiAgICAgICAgICAgIC8vIFJlc2VuZCBsYXN0IG1lc3NhZ2UgaWYgdGhlcmUgd2FzIG9uZVxuICAgICAgICAgICAgaWYgKHRoaXMuX2xhc3RfbWVzc2FnZSkge1xuICAgICAgICAgICAgICBjb25zb2xlLmluZm8oXCJSZXNlbmRpbmcgbGFzdCBtZXNzYWdlIGFmdGVyIHJlY29ubmVjdGlvblwiKTtcbiAgICAgICAgICAgICAgdGhpcy5fd2Vic29ja2V0LnNlbmQodGhpcy5fbGFzdF9tZXNzYWdlKTtcbiAgICAgICAgICAgICAgdGhpcy5fbGFzdF9tZXNzYWdlID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICAgICAgYFN1Y2Nlc3NmdWxseSByZWNvbm5lY3RlZCB0byBzZXJ2ZXIgJHt0aGlzLl9zZXJ2ZXJfdXJsfSAoc2VydmljZXMgcmUtcmVnaXN0ZXJlZClgLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoYCR7ZX1gLmluY2x1ZGVzKFwiQ29ubmVjdGlvbkFib3J0ZWRFcnJvcjpcIikpIHtcbiAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiRmFpbGVkIHRvIHJlY29ubmVjdCwgY29ubmVjdGlvbiBhYm9ydGVkOlwiLCBlKTtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChgJHtlfWAuaW5jbHVkZXMoXCJOb3RJbXBsZW1lbnRlZEVycm9yOlwiKSkge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICAgICAgIGAke2V9XFxuSXQgYXBwZWFycyB0aGF0IHlvdSBhcmUgdHJ5aW5nIHRvIGNvbm5lY3QgdG8gYSBoeXBoYSBzZXJ2ZXIgdGhhdCBpcyBvbGRlciB0aGFuIDAuMjAuMCwgcGxlYXNlIHVwZ3JhZGUgdGhlIGh5cGhhIHNlcnZlciBvciB1c2UgdGhlIHdlYnNvY2tldCBjbGllbnQgaW4gaW1qb3ktcnBjKGh0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL2ltam95LXJwYykgaW5zdGVhZGAsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMDApKTtcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgdGhpcy5fd2Vic29ja2V0ICYmXG4gICAgICAgICAgICAgIHRoaXMuX3dlYnNvY2tldC5yZWFkeVN0YXRlID09PSBXZWJTb2NrZXQuQ09OTkVDVEVEXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0cnkgKz0gMTtcbiAgICAgICAgICAgIGlmIChyZXRyeSA8IE1BWF9SRVRSWSkge1xuICAgICAgICAgICAgICBhd2FpdCByZWNvbm5lY3QoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gcmVjb25uZWN0IGFmdGVyXCIsIE1BWF9SRVRSWSwgXCJhdHRlbXB0c1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJlY29ubmVjdCgpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGhpcy5faGFuZGxlX2Rpc2Nvbm5lY3RlZCkge1xuICAgICAgICB0aGlzLl9oYW5kbGVfZGlzY29ubmVjdGVkKGV2ZW50LnJlYXNvbik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZW1pdF9tZXNzYWdlKGRhdGEpIHtcbiAgICBpZiAodGhpcy5fY2xvc2VkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb25uZWN0aW9uIGlzIGNsb3NlZFwiKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLl93ZWJzb2NrZXQgfHwgdGhpcy5fd2Vic29ja2V0LnJlYWR5U3RhdGUgIT09IFdlYlNvY2tldC5PUEVOKSB7XG4gICAgICBhd2FpdCB0aGlzLm9wZW4oKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuX2xhc3RfbWVzc2FnZSA9IGRhdGE7IC8vIFN0b3JlIHRoZSBtZXNzYWdlIGJlZm9yZSBzZW5kaW5nXG4gICAgICB0aGlzLl93ZWJzb2NrZXQuc2VuZChkYXRhKTtcbiAgICAgIHRoaXMuX2xhc3RfbWVzc2FnZSA9IG51bGw7IC8vIENsZWFyIGFmdGVyIHN1Y2Nlc3NmdWwgc2VuZFxuICAgIH0gY2F0Y2ggKGV4cCkge1xuICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIHNlbmQgZGF0YSwgZXJyb3I6ICR7ZXhwfWApO1xuICAgICAgdGhyb3cgZXhwO1xuICAgIH1cbiAgfVxuXG4gIGRpc2Nvbm5lY3QocmVhc29uKSB7XG4gICAgdGhpcy5fY2xvc2VkID0gdHJ1ZTtcbiAgICB0aGlzLl9sYXN0X21lc3NhZ2UgPSBudWxsOyAvLyBDbGVhciBsYXN0IG1lc3NhZ2Ugb24gZGlzY29ubmVjdFxuICAgIC8vIEVuc3VyZSB3ZWJzb2NrZXQgaXMgY2xvc2VkIGlmIGl0IGV4aXN0cyBhbmQgaXMgbm90IGFscmVhZHkgY2xvc2VkIG9yIGNsb3NpbmdcbiAgICBpZiAoXG4gICAgICB0aGlzLl93ZWJzb2NrZXQgJiZcbiAgICAgIHRoaXMuX3dlYnNvY2tldC5yZWFkeVN0YXRlICE9PSBXZWJTb2NrZXQuQ0xPU0VEICYmXG4gICAgICB0aGlzLl93ZWJzb2NrZXQucmVhZHlTdGF0ZSAhPT0gV2ViU29ja2V0LkNMT1NJTkdcbiAgICApIHtcbiAgICAgIHRoaXMuX3dlYnNvY2tldC5jbG9zZSgxMDAwLCByZWFzb24pO1xuICAgIH1cbiAgICBpZiAodGhpcy5fcmVmcmVzaF90b2tlbl90YXNrKSB7XG4gICAgICBjbGVhckludGVydmFsKHRoaXMuX3JlZnJlc2hfdG9rZW5fdGFzayk7XG4gICAgfVxuICAgIGNvbnNvbGUuaW5mbyhgV2ViU29ja2V0IGNvbm5lY3Rpb24gZGlzY29ubmVjdGVkICgke3JlYXNvbn0pYCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplU2VydmVyVXJsKHNlcnZlcl91cmwpIHtcbiAgaWYgKCFzZXJ2ZXJfdXJsKSB0aHJvdyBuZXcgRXJyb3IoXCJzZXJ2ZXJfdXJsIGlzIHJlcXVpcmVkXCIpO1xuICBpZiAoc2VydmVyX3VybC5zdGFydHNXaXRoKFwiaHR0cDovL1wiKSkge1xuICAgIHNlcnZlcl91cmwgPVxuICAgICAgc2VydmVyX3VybC5yZXBsYWNlKFwiaHR0cDovL1wiLCBcIndzOi8vXCIpLnJlcGxhY2UoL1xcLyQvLCBcIlwiKSArIFwiL3dzXCI7XG4gIH0gZWxzZSBpZiAoc2VydmVyX3VybC5zdGFydHNXaXRoKFwiaHR0cHM6Ly9cIikpIHtcbiAgICBzZXJ2ZXJfdXJsID1cbiAgICAgIHNlcnZlcl91cmwucmVwbGFjZShcImh0dHBzOi8vXCIsIFwid3NzOi8vXCIpLnJlcGxhY2UoL1xcLyQvLCBcIlwiKSArIFwiL3dzXCI7XG4gIH1cbiAgcmV0dXJuIHNlcnZlcl91cmw7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxvZ2luKGNvbmZpZykge1xuICBjb25zdCBzZXJ2aWNlX2lkID0gY29uZmlnLmxvZ2luX3NlcnZpY2VfaWQgfHwgXCJwdWJsaWMvaHlwaGEtbG9naW5cIjtcbiAgY29uc3Qgd29ya3NwYWNlID0gY29uZmlnLndvcmtzcGFjZTtcbiAgY29uc3QgZXhwaXJlc19pbiA9IGNvbmZpZy5leHBpcmVzX2luO1xuICBjb25zdCB0aW1lb3V0ID0gY29uZmlnLmxvZ2luX3RpbWVvdXQgfHwgNjA7XG4gIGNvbnN0IGNhbGxiYWNrID0gY29uZmlnLmxvZ2luX2NhbGxiYWNrO1xuICBjb25zdCBwcm9maWxlID0gY29uZmlnLnByb2ZpbGU7XG5cbiAgY29uc3Qgc2VydmVyID0gYXdhaXQgY29ubmVjdFRvU2VydmVyKHtcbiAgICBuYW1lOiBcImluaXRpYWwgbG9naW4gY2xpZW50XCIsXG4gICAgc2VydmVyX3VybDogY29uZmlnLnNlcnZlcl91cmwsXG4gIH0pO1xuICB0cnkge1xuICAgIGNvbnN0IHN2YyA9IGF3YWl0IHNlcnZlci5nZXRTZXJ2aWNlKHNlcnZpY2VfaWQpO1xuICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLmFzc2VydCkoc3ZjLCBgRmFpbGVkIHRvIGdldCB0aGUgbG9naW4gc2VydmljZTogJHtzZXJ2aWNlX2lkfWApO1xuICAgIGxldCBjb250ZXh0O1xuICAgIGlmICh3b3Jrc3BhY2UpIHtcbiAgICAgIGNvbnRleHQgPSBhd2FpdCBzdmMuc3RhcnQoeyB3b3Jrc3BhY2UsIGV4cGlyZXNfaW4sIF9ya3dhcmdzOiB0cnVlIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb250ZXh0ID0gYXdhaXQgc3ZjLnN0YXJ0KCk7XG4gICAgfVxuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgYXdhaXQgY2FsbGJhY2soY29udGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKGBQbGVhc2Ugb3BlbiB5b3VyIGJyb3dzZXIgYW5kIGxvZ2luIGF0ICR7Y29udGV4dC5sb2dpbl91cmx9YCk7XG4gICAgfVxuICAgIHJldHVybiBhd2FpdCBzdmMuY2hlY2soY29udGV4dC5rZXksIHsgdGltZW91dCwgcHJvZmlsZSwgX3Jrd2FyZ3M6IHRydWUgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH0gZmluYWxseSB7XG4gICAgYXdhaXQgc2VydmVyLmRpc2Nvbm5lY3QoKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiB3ZWJydGNHZXRTZXJ2aWNlKHdtLCBydGNfc2VydmljZV9pZCwgcXVlcnksIGNvbmZpZykge1xuICBjb25maWcgPSBjb25maWcgfHwge307XG4gIGNvbnN0IHdlYnJ0YyA9IGNvbmZpZy53ZWJydGM7XG4gIGNvbnN0IHdlYnJ0Y19jb25maWcgPSBjb25maWcud2VicnRjX2NvbmZpZztcbiAgaWYgKGNvbmZpZy53ZWJydGMgIT09IHVuZGVmaW5lZCkgZGVsZXRlIGNvbmZpZy53ZWJydGM7XG4gIGlmIChjb25maWcud2VicnRjX2NvbmZpZyAhPT0gdW5kZWZpbmVkKSBkZWxldGUgY29uZmlnLndlYnJ0Y19jb25maWc7XG4gICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLmFzc2VydCkoXG4gICAgW3VuZGVmaW5lZCwgdHJ1ZSwgZmFsc2UsIFwiYXV0b1wiXS5pbmNsdWRlcyh3ZWJydGMpLFxuICAgIFwid2VicnRjIG11c3QgYmUgdHJ1ZSwgZmFsc2Ugb3IgJ2F1dG8nXCIsXG4gICk7XG5cbiAgY29uc3Qgc3ZjID0gYXdhaXQgd20uZ2V0U2VydmljZShxdWVyeSwgY29uZmlnKTtcbiAgaWYgKHdlYnJ0YyA9PT0gdHJ1ZSB8fCB3ZWJydGMgPT09IFwiYXV0b1wiKSB7XG4gICAgaWYgKHN2Yy5pZC5pbmNsdWRlcyhcIjpcIikgJiYgc3ZjLmlkLmluY2x1ZGVzKFwiL1wiKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gQXNzdW1pbmcgdGhhdCB0aGUgY2xpZW50IHJlZ2lzdGVyZWQgYSB3ZWJydGMgc2VydmljZSB3aXRoIHRoZSBjbGllbnRfaWQgKyBcIi1ydGNcIlxuICAgICAgICBjb25zdCBwZWVyID0gYXdhaXQgKDAsX3dlYnJ0Y19jbGllbnRfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzNfXy5nZXRSVENTZXJ2aWNlKSh3bSwgcnRjX3NlcnZpY2VfaWQsIHdlYnJ0Y19jb25maWcpO1xuICAgICAgICBjb25zdCBydGNTdmMgPSBhd2FpdCBwZWVyLmdldFNlcnZpY2Uoc3ZjLmlkLnNwbGl0KFwiOlwiKVsxXSwgY29uZmlnKTtcbiAgICAgICAgcnRjU3ZjLl93ZWJydGMgPSB0cnVlO1xuICAgICAgICBydGNTdmMuX3BlZXIgPSBwZWVyO1xuICAgICAgICBydGNTdmMuX3NlcnZpY2UgPSBzdmM7XG4gICAgICAgIHJldHVybiBydGNTdmM7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICBcIkZhaWxlZCB0byBnZXQgd2VicnRjIHNlcnZpY2UsIHVzaW5nIHdlYnNvY2tldCBjb25uZWN0aW9uXCIsXG4gICAgICAgICAgZSxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHdlYnJ0YyA9PT0gdHJ1ZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIGdldCB0aGUgc2VydmljZSB2aWEgd2VicnRjXCIpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3ZjO1xufVxuXG5hc3luYyBmdW5jdGlvbiBjb25uZWN0VG9TZXJ2ZXIoY29uZmlnKSB7XG4gIGlmIChjb25maWcuc2VydmVyKSB7XG4gICAgY29uZmlnLnNlcnZlcl91cmwgPSBjb25maWcuc2VydmVyX3VybCB8fCBjb25maWcuc2VydmVyLnVybDtcbiAgICBjb25maWcuV2ViU29ja2V0Q2xhc3MgPVxuICAgICAgY29uZmlnLldlYlNvY2tldENsYXNzIHx8IGNvbmZpZy5zZXJ2ZXIuV2ViU29ja2V0Q2xhc3M7XG4gIH1cbiAgbGV0IGNsaWVudElkID0gY29uZmlnLmNsaWVudF9pZDtcbiAgaWYgKCFjbGllbnRJZCkge1xuICAgIGNsaWVudElkID0gKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18ucmFuZElkKSgpO1xuICAgIGNvbmZpZy5jbGllbnRfaWQgPSBjbGllbnRJZDtcbiAgfVxuXG4gIGxldCBzZXJ2ZXJfdXJsID0gbm9ybWFsaXplU2VydmVyVXJsKGNvbmZpZy5zZXJ2ZXJfdXJsKTtcblxuICBsZXQgY29ubmVjdGlvbiA9IG5ldyBXZWJzb2NrZXRSUENDb25uZWN0aW9uKFxuICAgIHNlcnZlcl91cmwsXG4gICAgY2xpZW50SWQsXG4gICAgY29uZmlnLndvcmtzcGFjZSxcbiAgICBjb25maWcudG9rZW4sXG4gICAgY29uZmlnLnJlY29ubmVjdGlvbl90b2tlbixcbiAgICBjb25maWcubWV0aG9kX3RpbWVvdXQgfHwgNjAsXG4gICAgY29uZmlnLldlYlNvY2tldENsYXNzLFxuICApO1xuICBjb25zdCBjb25uZWN0aW9uX2luZm8gPSBhd2FpdCBjb25uZWN0aW9uLm9wZW4oKTtcbiAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18uYXNzZXJ0KShcbiAgICBjb25uZWN0aW9uX2luZm8sXG4gICAgXCJGYWlsZWQgdG8gY29ubmVjdCB0byB0aGUgc2VydmVyLCBubyBjb25uZWN0aW9uIGluZm8gb2J0YWluZWQuIFRoaXMgaXNzdWUgaXMgbW9zdCBsaWtlbHkgZHVlIHRvIGFuIG91dGRhdGVkIEh5cGhhIHNlcnZlciB2ZXJzaW9uLiBQbGVhc2UgdXNlIGBpbWpveS1ycGNgIGZvciBjb21wYXRpYmlsaXR5LCBvciB1cGdyYWRlIHRoZSBIeXBoYSBzZXJ2ZXIgdG8gdGhlIGxhdGVzdCB2ZXJzaW9uLlwiLFxuICApO1xuICAvLyB3YWl0IGZvciAwLjUgc2Vjb25kc1xuICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTtcbiAgLy8gRW5zdXJlIG1hbmFnZXJfaWQgaXMgc2V0IGJlZm9yZSBwcm9jZWVkaW5nXG4gIGlmICghY29ubmVjdGlvbi5tYW5hZ2VyX2lkKSB7XG4gICAgY29uc29sZS53YXJuKFwiTWFuYWdlciBJRCBub3Qgc2V0IGltbWVkaWF0ZWx5LCB3YWl0aW5nLi4uXCIpO1xuXG4gICAgLy8gV2FpdCBmb3IgbWFuYWdlcl9pZCB0byBiZSBzZXQgd2l0aCB0aW1lb3V0XG4gICAgY29uc3QgbWF4V2FpdFRpbWUgPSA1MDAwOyAvLyA1IHNlY29uZHNcbiAgICBjb25zdCBjaGVja0ludGVydmFsID0gMTAwOyAvLyAxMDBtc1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG5cbiAgICB3aGlsZSAoIWNvbm5lY3Rpb24ubWFuYWdlcl9pZCAmJiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lIDwgbWF4V2FpdFRpbWUpIHtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIGNoZWNrSW50ZXJ2YWwpKTtcbiAgICB9XG5cbiAgICBpZiAoIWNvbm5lY3Rpb24ubWFuYWdlcl9pZCkge1xuICAgICAgY29uc29sZS5lcnJvcihcIk1hbmFnZXIgSUQgc3RpbGwgbm90IHNldCBhZnRlciB3YWl0aW5nXCIpO1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIGdldCBtYW5hZ2VyIElEIGZyb20gc2VydmVyXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmluZm8oYE1hbmFnZXIgSUQgc2V0IGFmdGVyIHdhaXRpbmc6ICR7Y29ubmVjdGlvbi5tYW5hZ2VyX2lkfWApO1xuICAgIH1cbiAgfVxuICBpZiAoY29uZmlnLndvcmtzcGFjZSAmJiBjb25uZWN0aW9uX2luZm8ud29ya3NwYWNlICE9PSBjb25maWcud29ya3NwYWNlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYENvbm5lY3RlZCB0byB0aGUgd3Jvbmcgd29ya3NwYWNlOiAke2Nvbm5lY3Rpb25faW5mby53b3Jrc3BhY2V9LCBleHBlY3RlZDogJHtjb25maWcud29ya3NwYWNlfWAsXG4gICAgKTtcbiAgfVxuXG4gIGNvbnN0IHdvcmtzcGFjZSA9IGNvbm5lY3Rpb25faW5mby53b3Jrc3BhY2U7XG4gIGNvbnN0IHJwYyA9IG5ldyBfcnBjX2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8wX18uUlBDKGNvbm5lY3Rpb24sIHtcbiAgICBjbGllbnRfaWQ6IGNsaWVudElkLFxuICAgIHdvcmtzcGFjZSxcbiAgICBkZWZhdWx0X2NvbnRleHQ6IHsgY29ubmVjdGlvbl90eXBlOiBcIndlYnNvY2tldFwiIH0sXG4gICAgbmFtZTogY29uZmlnLm5hbWUsXG4gICAgbWV0aG9kX3RpbWVvdXQ6IGNvbmZpZy5tZXRob2RfdGltZW91dCxcbiAgICBhcHBfaWQ6IGNvbmZpZy5hcHBfaWQsXG4gICAgc2VydmVyX2Jhc2VfdXJsOiBjb25uZWN0aW9uX2luZm8ucHVibGljX2Jhc2VfdXJsLFxuICAgIGxvbmdfbWVzc2FnZV9jaHVua19zaXplOiBjb25maWcubG9uZ19tZXNzYWdlX2NodW5rX3NpemUsXG4gIH0pO1xuICBjb25zdCB3bSA9IGF3YWl0IHJwYy5nZXRfbWFuYWdlcl9zZXJ2aWNlKHtcbiAgICB0aW1lb3V0OiBjb25maWcubWV0aG9kX3RpbWVvdXQsXG4gICAgY2FzZV9jb252ZXJzaW9uOiBcImNhbWVsXCIsXG4gICAga3dhcmdzX2V4cGFuc2lvbjogY29uZmlnLmt3YXJnc19leHBhbnNpb24gfHwgZmFsc2UsXG4gIH0pO1xuICB3bS5ycGMgPSBycGM7XG5cbiAgYXN5bmMgZnVuY3Rpb24gX2V4cG9ydChhcGkpIHtcbiAgICBhcGkuaWQgPSBcImRlZmF1bHRcIjtcbiAgICBhcGkubmFtZSA9IGFwaS5uYW1lIHx8IGNvbmZpZy5uYW1lIHx8IGFwaS5pZDtcbiAgICBhcGkuZGVzY3JpcHRpb24gPSBhcGkuZGVzY3JpcHRpb24gfHwgY29uZmlnLmRlc2NyaXB0aW9uO1xuICAgIGF3YWl0IHJwYy5yZWdpc3Rlcl9zZXJ2aWNlKGFwaSwgeyBvdmVyd3JpdGU6IHRydWUgfSk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBnZXRBcHAoY2xpZW50SWQpIHtcbiAgICBjbGllbnRJZCA9IGNsaWVudElkIHx8IFwiKlwiO1xuICAgICgwLF91dGlsc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMV9fLmFzc2VydCkoIWNsaWVudElkLmluY2x1ZGVzKFwiOlwiKSwgXCJjbGllbnRJZCBzaG91bGQgbm90IGNvbnRhaW4gJzonXCIpO1xuICAgIGlmICghY2xpZW50SWQuaW5jbHVkZXMoXCIvXCIpKSB7XG4gICAgICBjbGllbnRJZCA9IGNvbm5lY3Rpb25faW5mby53b3Jrc3BhY2UgKyBcIi9cIiArIGNsaWVudElkO1xuICAgIH1cbiAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5hc3NlcnQpKFxuICAgICAgY2xpZW50SWQuc3BsaXQoXCIvXCIpLmxlbmd0aCA9PT0gMixcbiAgICAgIFwiY2xpZW50SWQgc2hvdWxkIG1hdGNoIHBhdHRlcm4gd29ya3NwYWNlL2NsaWVudElkXCIsXG4gICAgKTtcbiAgICByZXR1cm4gYXdhaXQgd20uZ2V0U2VydmljZShgJHtjbGllbnRJZH06ZGVmYXVsdGApO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gbGlzdEFwcHMod3MpIHtcbiAgICB3cyA9IHdzIHx8IHdvcmtzcGFjZTtcbiAgICAoMCxfdXRpbHNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzFfXy5hc3NlcnQpKCF3cy5pbmNsdWRlcyhcIjpcIiksIFwid29ya3NwYWNlIHNob3VsZCBub3QgY29udGFpbiAnOidcIik7XG4gICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18uYXNzZXJ0KSghd3MuaW5jbHVkZXMoXCIvXCIpLCBcIndvcmtzcGFjZSBzaG91bGQgbm90IGNvbnRhaW4gJy8nXCIpO1xuICAgIGNvbnN0IHF1ZXJ5ID0geyB3b3Jrc3BhY2U6IHdzLCBzZXJ2aWNlX2lkOiBcImRlZmF1bHRcIiB9O1xuICAgIHJldHVybiBhd2FpdCB3bS5saXN0U2VydmljZXMocXVlcnkpO1xuICB9XG5cbiAgaWYgKGNvbm5lY3Rpb25faW5mbykge1xuICAgIHdtLmNvbmZpZyA9IE9iamVjdC5hc3NpZ24od20uY29uZmlnLCBjb25uZWN0aW9uX2luZm8pO1xuICB9XG4gIHdtLmV4cG9ydCA9ICgwLF91dGlsc19zY2hlbWFfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXy5zY2hlbWFGdW5jdGlvbikoX2V4cG9ydCwge1xuICAgIG5hbWU6IFwiZXhwb3J0XCIsXG4gICAgZGVzY3JpcHRpb246IFwiRXhwb3J0IHRoZSBhcGkuXCIsXG4gICAgcGFyYW1ldGVyczoge1xuICAgICAgcHJvcGVydGllczogeyBhcGk6IHsgZGVzY3JpcHRpb246IFwiVGhlIGFwaSB0byBleHBvcnRcIiwgdHlwZTogXCJvYmplY3RcIiB9IH0sXG4gICAgICByZXF1aXJlZDogW1wiYXBpXCJdLFxuICAgICAgdHlwZTogXCJvYmplY3RcIixcbiAgICB9LFxuICB9KTtcbiAgd20uZ2V0QXBwID0gKDAsX3V0aWxzX3NjaGVtYV9qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLnNjaGVtYUZ1bmN0aW9uKShnZXRBcHAsIHtcbiAgICBuYW1lOiBcImdldEFwcFwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIkdldCB0aGUgYXBwLlwiLFxuICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgY2xpZW50SWQ6IHsgZGVmYXVsdDogXCIqXCIsIGRlc2NyaXB0aW9uOiBcIlRoZSBjbGllbnRJZFwiLCB0eXBlOiBcInN0cmluZ1wiIH0sXG4gICAgICB9LFxuICAgICAgdHlwZTogXCJvYmplY3RcIixcbiAgICB9LFxuICB9KTtcbiAgd20ubGlzdEFwcHMgPSAoMCxfdXRpbHNfc2NoZW1hX2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18uc2NoZW1hRnVuY3Rpb24pKGxpc3RBcHBzLCB7XG4gICAgbmFtZTogXCJsaXN0QXBwc1wiLFxuICAgIGRlc2NyaXB0aW9uOiBcIkxpc3QgdGhlIGFwcHMuXCIsXG4gICAgcGFyYW1ldGVyczoge1xuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICB3b3Jrc3BhY2U6IHtcbiAgICAgICAgICBkZWZhdWx0OiB3b3Jrc3BhY2UsXG4gICAgICAgICAgZGVzY3JpcHRpb246IFwiVGhlIHdvcmtzcGFjZVwiLFxuICAgICAgICAgIHR5cGU6IFwic3RyaW5nXCIsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgdHlwZTogXCJvYmplY3RcIixcbiAgICB9LFxuICB9KTtcbiAgd20uZGlzY29ubmVjdCA9ICgwLF91dGlsc19zY2hlbWFfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXy5zY2hlbWFGdW5jdGlvbikocnBjLmRpc2Nvbm5lY3QuYmluZChycGMpLCB7XG4gICAgbmFtZTogXCJkaXNjb25uZWN0XCIsXG4gICAgZGVzY3JpcHRpb246IFwiRGlzY29ubmVjdCBmcm9tIHRoZSBzZXJ2ZXIuXCIsXG4gICAgcGFyYW1ldGVyczogeyB0eXBlOiBcIm9iamVjdFwiLCBwcm9wZXJ0aWVzOiB7fSwgcmVxdWlyZWQ6IFtdIH0sXG4gIH0pO1xuICB3bS5yZWdpc3RlckNvZGVjID0gKDAsX3V0aWxzX3NjaGVtYV9qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLnNjaGVtYUZ1bmN0aW9uKShycGMucmVnaXN0ZXJfY29kZWMuYmluZChycGMpLCB7XG4gICAgbmFtZTogXCJyZWdpc3RlckNvZGVjXCIsXG4gICAgZGVzY3JpcHRpb246IFwiUmVnaXN0ZXIgYSBjb2RlYyBmb3IgdGhlIHdlYnJ0YyBjb25uZWN0aW9uXCIsXG4gICAgcGFyYW1ldGVyczoge1xuICAgICAgdHlwZTogXCJvYmplY3RcIixcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgY29kZWM6IHtcbiAgICAgICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkNvZGVjIHRvIHJlZ2lzdGVyXCIsXG4gICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgbmFtZTogeyB0eXBlOiBcInN0cmluZ1wiIH0sXG4gICAgICAgICAgICB0eXBlOiB7fSxcbiAgICAgICAgICAgIGVuY29kZXI6IHsgdHlwZTogXCJmdW5jdGlvblwiIH0sXG4gICAgICAgICAgICBkZWNvZGVyOiB7IHR5cGU6IFwiZnVuY3Rpb25cIiB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuXG4gIHdtLmVtaXQgPSAoMCxfdXRpbHNfc2NoZW1hX2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18uc2NoZW1hRnVuY3Rpb24pKHJwYy5lbWl0LmJpbmQocnBjKSwge1xuICAgIG5hbWU6IFwiZW1pdFwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIkVtaXQgYSBtZXNzYWdlLlwiLFxuICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgIHByb3BlcnRpZXM6IHsgZGF0YTogeyBkZXNjcmlwdGlvbjogXCJUaGUgZGF0YSB0byBlbWl0XCIsIHR5cGU6IFwib2JqZWN0XCIgfSB9LFxuICAgICAgcmVxdWlyZWQ6IFtcImRhdGFcIl0sXG4gICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgIH0sXG4gIH0pO1xuXG4gIHdtLm9uID0gKDAsX3V0aWxzX3NjaGVtYV9qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLnNjaGVtYUZ1bmN0aW9uKShycGMub24uYmluZChycGMpLCB7XG4gICAgbmFtZTogXCJvblwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIlJlZ2lzdGVyIGEgbWVzc2FnZSBoYW5kbGVyLlwiLFxuICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgZXZlbnQ6IHsgZGVzY3JpcHRpb246IFwiVGhlIGV2ZW50IHRvIGxpc3RlbiB0b1wiLCB0eXBlOiBcInN0cmluZ1wiIH0sXG4gICAgICAgIGhhbmRsZXI6IHsgZGVzY3JpcHRpb246IFwiVGhlIGhhbmRsZXIgZnVuY3Rpb25cIiwgdHlwZTogXCJmdW5jdGlvblwiIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFtcImV2ZW50XCIsIFwiaGFuZGxlclwiXSxcbiAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgfSxcbiAgfSk7XG5cbiAgd20ub2ZmID0gKDAsX3V0aWxzX3NjaGVtYV9qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLnNjaGVtYUZ1bmN0aW9uKShycGMub2ZmLmJpbmQocnBjKSwge1xuICAgIG5hbWU6IFwib2ZmXCIsXG4gICAgZGVzY3JpcHRpb246IFwiUmVtb3ZlIGEgbWVzc2FnZSBoYW5kbGVyLlwiLFxuICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgZXZlbnQ6IHsgZGVzY3JpcHRpb246IFwiVGhlIGV2ZW50IHRvIHJlbW92ZVwiLCB0eXBlOiBcInN0cmluZ1wiIH0sXG4gICAgICAgIGhhbmRsZXI6IHsgZGVzY3JpcHRpb246IFwiVGhlIGhhbmRsZXIgZnVuY3Rpb25cIiwgdHlwZTogXCJmdW5jdGlvblwiIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFtcImV2ZW50XCIsIFwiaGFuZGxlclwiXSxcbiAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgfSxcbiAgfSk7XG5cbiAgd20ub25jZSA9ICgwLF91dGlsc19zY2hlbWFfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXy5zY2hlbWFGdW5jdGlvbikocnBjLm9uY2UuYmluZChycGMpLCB7XG4gICAgbmFtZTogXCJvbmNlXCIsXG4gICAgZGVzY3JpcHRpb246IFwiUmVnaXN0ZXIgYSBvbmUtdGltZSBtZXNzYWdlIGhhbmRsZXIuXCIsXG4gICAgcGFyYW1ldGVyczoge1xuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBldmVudDogeyBkZXNjcmlwdGlvbjogXCJUaGUgZXZlbnQgdG8gbGlzdGVuIHRvXCIsIHR5cGU6IFwic3RyaW5nXCIgfSxcbiAgICAgICAgaGFuZGxlcjogeyBkZXNjcmlwdGlvbjogXCJUaGUgaGFuZGxlciBmdW5jdGlvblwiLCB0eXBlOiBcImZ1bmN0aW9uXCIgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogW1wiZXZlbnRcIiwgXCJoYW5kbGVyXCJdLFxuICAgICAgdHlwZTogXCJvYmplY3RcIixcbiAgICB9LFxuICB9KTtcblxuICB3bS5nZXRTZXJ2aWNlU2NoZW1hID0gKDAsX3V0aWxzX3NjaGVtYV9qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLnNjaGVtYUZ1bmN0aW9uKShycGMuZ2V0X3NlcnZpY2Vfc2NoZW1hLCB7XG4gICAgbmFtZTogXCJnZXRTZXJ2aWNlU2NoZW1hXCIsXG4gICAgZGVzY3JpcHRpb246IFwiR2V0IHRoZSBzZXJ2aWNlIHNjaGVtYS5cIixcbiAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHNlcnZpY2U6IHtcbiAgICAgICAgICBkZXNjcmlwdGlvbjogXCJUaGUgc2VydmljZSB0byBleHRyYWN0IHNjaGVtYVwiLFxuICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgcmVxdWlyZWQ6IFtcInNlcnZpY2VcIl0sXG4gICAgICB0eXBlOiBcIm9iamVjdFwiLFxuICAgIH0sXG4gIH0pO1xuXG4gIHdtLnJlZ2lzdGVyU2VydmljZSA9ICgwLF91dGlsc19zY2hlbWFfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXy5zY2hlbWFGdW5jdGlvbikocnBjLnJlZ2lzdGVyX3NlcnZpY2UuYmluZChycGMpLCB7XG4gICAgbmFtZTogXCJyZWdpc3RlclNlcnZpY2VcIixcbiAgICBkZXNjcmlwdGlvbjogXCJSZWdpc3RlciBhIHNlcnZpY2UuXCIsXG4gICAgcGFyYW1ldGVyczoge1xuICAgICAgcHJvcGVydGllczoge1xuICAgICAgICBzZXJ2aWNlOiB7IGRlc2NyaXB0aW9uOiBcIlRoZSBzZXJ2aWNlIHRvIHJlZ2lzdGVyXCIsIHR5cGU6IFwib2JqZWN0XCIgfSxcbiAgICAgICAgZm9yY2U6IHtcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZSxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogXCJGb3JjZSB0byByZWdpc3RlciB0aGUgc2VydmljZVwiLFxuICAgICAgICAgIHR5cGU6IFwiYm9vbGVhblwiLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHJlcXVpcmVkOiBbXCJzZXJ2aWNlXCJdLFxuICAgICAgdHlwZTogXCJvYmplY3RcIixcbiAgICB9LFxuICB9KTtcbiAgd20udW5yZWdpc3RlclNlcnZpY2UgPSAoMCxfdXRpbHNfc2NoZW1hX2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18uc2NoZW1hRnVuY3Rpb24pKHJwYy51bnJlZ2lzdGVyX3NlcnZpY2UuYmluZChycGMpLCB7XG4gICAgbmFtZTogXCJ1bnJlZ2lzdGVyU2VydmljZVwiLFxuICAgIGRlc2NyaXB0aW9uOiBcIlVucmVnaXN0ZXIgYSBzZXJ2aWNlLlwiLFxuICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgc2VydmljZToge1xuICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlRoZSBzZXJ2aWNlIGlkIHRvIHVucmVnaXN0ZXJcIixcbiAgICAgICAgICB0eXBlOiBcInN0cmluZ1wiLFxuICAgICAgICB9LFxuICAgICAgICBub3RpZnk6IHtcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk5vdGlmeSB0aGUgd29ya3NwYWNlIG1hbmFnZXJcIixcbiAgICAgICAgICB0eXBlOiBcImJvb2xlYW5cIixcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogW1wic2VydmljZVwiXSxcbiAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgfSxcbiAgfSk7XG4gIGlmIChjb25uZWN0aW9uLm1hbmFnZXJfaWQpIHtcbiAgICBycGMub24oXCJmb3JjZS1leGl0XCIsIGFzeW5jIChtZXNzYWdlKSA9PiB7XG4gICAgICBpZiAobWVzc2FnZS5mcm9tID09PSBcIiovXCIgKyBjb25uZWN0aW9uLm1hbmFnZXJfaWQpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJEaXNjb25uZWN0aW5nIGZyb20gc2VydmVyLCByZWFzb246XCIsIG1lc3NhZ2UucmVhc29uKTtcbiAgICAgICAgYXdhaXQgcnBjLmRpc2Nvbm5lY3QoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICBpZiAoY29uZmlnLndlYnJ0Yykge1xuICAgIGF3YWl0ICgwLF93ZWJydGNfY2xpZW50X2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8zX18ucmVnaXN0ZXJSVENTZXJ2aWNlKSh3bSwgYCR7Y2xpZW50SWR9LXJ0Y2AsIGNvbmZpZy53ZWJydGNfY29uZmlnKTtcbiAgICAvLyBtYWtlIGEgY29weSBvZiB3bSwgc28gd2VicnRjIGNhbiB1c2UgdGhlIG9yaWdpbmFsIHdtLmdldFNlcnZpY2VcbiAgICBjb25zdCBfd20gPSBPYmplY3QuYXNzaWduKHt9LCB3bSk7XG4gICAgY29uc3QgZGVzY3JpcHRpb24gPSBfd20uZ2V0U2VydmljZS5fX3NjaGVtYV9fLmRlc2NyaXB0aW9uO1xuICAgIC8vIFRPRE86IEZpeCB0aGUgc2NoZW1hIGZvciBhZGRpbmcgb3B0aW9ucyBmb3Igd2VicnRjXG4gICAgY29uc3QgcGFyYW1ldGVycyA9IF93bS5nZXRTZXJ2aWNlLl9fc2NoZW1hX18ucGFyYW1ldGVycztcbiAgICB3bS5nZXRTZXJ2aWNlID0gKDAsX3V0aWxzX3NjaGVtYV9qc19fV0VCUEFDS19JTVBPUlRFRF9NT0RVTEVfMl9fLnNjaGVtYUZ1bmN0aW9uKShcbiAgICAgIHdlYnJ0Y0dldFNlcnZpY2UuYmluZChudWxsLCBfd20sIGAke3dvcmtzcGFjZX0vJHtjbGllbnRJZH0tcnRjYCksXG4gICAgICB7XG4gICAgICAgIG5hbWU6IFwiZ2V0U2VydmljZVwiLFxuICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgcGFyYW1ldGVycyxcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIHdtLmdldFJUQ1NlcnZpY2UgPSAoMCxfdXRpbHNfc2NoZW1hX2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8yX18uc2NoZW1hRnVuY3Rpb24pKF93ZWJydGNfY2xpZW50X2pzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8zX18uZ2V0UlRDU2VydmljZS5iaW5kKG51bGwsIHdtKSwge1xuICAgICAgbmFtZTogXCJnZXRSVENTZXJ2aWNlXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCJHZXQgdGhlIHdlYnJ0YyBjb25uZWN0aW9uLCByZXR1cm5zIGEgcGVlciBjb25uZWN0aW9uLlwiLFxuICAgICAgcGFyYW1ldGVyczoge1xuICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJUaGUgY29uZmlnIGZvciB0aGUgd2VicnRjIHNlcnZpY2VcIixcbiAgICAgICAgICAgIHR5cGU6IFwib2JqZWN0XCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgcmVxdWlyZWQ6IFtcImNvbmZpZ1wiXSxcbiAgICAgICAgdHlwZTogXCJvYmplY3RcIixcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgX2dldFNlcnZpY2UgPSB3bS5nZXRTZXJ2aWNlO1xuICAgIHdtLmdldFNlcnZpY2UgPSAocXVlcnksIGNvbmZpZykgPT4ge1xuICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xuICAgICAgcmV0dXJuIF9nZXRTZXJ2aWNlKHF1ZXJ5LCBjb25maWcpO1xuICAgIH07XG4gICAgd20uZ2V0U2VydmljZS5fX3NjaGVtYV9fID0gX2dldFNlcnZpY2UuX19zY2hlbWFfXztcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHJlZ2lzdGVyUHJvYmVzKHByb2Jlcykge1xuICAgIHByb2Jlcy5pZCA9IFwicHJvYmVzXCI7XG4gICAgcHJvYmVzLm5hbWUgPSBcIlByb2Jlc1wiO1xuICAgIHByb2Jlcy5jb25maWcgPSB7IHZpc2liaWxpdHk6IFwicHVibGljXCIgfTtcbiAgICBwcm9iZXMudHlwZSA9IFwicHJvYmVzXCI7XG4gICAgcHJvYmVzLmRlc2NyaXB0aW9uID0gYFByb2JlcyBTZXJ2aWNlLCB2aXNpdCAke3NlcnZlcl91cmx9LyR7d29ya3NwYWNlfXNlcnZpY2VzL3Byb2JlcyBmb3IgdGhlIGF2YWlsYWJsZSBwcm9iZXMuYDtcbiAgICByZXR1cm4gYXdhaXQgd20ucmVnaXN0ZXJTZXJ2aWNlKHByb2JlcywgeyBvdmVyd3JpdGU6IHRydWUgfSk7XG4gIH1cblxuICB3bS5yZWdpc3RlclByb2JlcyA9ICgwLF91dGlsc19zY2hlbWFfanNfX1dFQlBBQ0tfSU1QT1JURURfTU9EVUxFXzJfXy5zY2hlbWFGdW5jdGlvbikocmVnaXN0ZXJQcm9iZXMsIHtcbiAgICBuYW1lOiBcInJlZ2lzdGVyUHJvYmVzXCIsXG4gICAgZGVzY3JpcHRpb246IFwiUmVnaXN0ZXIgcHJvYmVzIHNlcnZpY2VcIixcbiAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIHByb2Jlczoge1xuICAgICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICAgXCJUaGUgcHJvYmVzIHRvIHJlZ2lzdGVyLCBlLmcuIHsnbGl2ZW5lc3MnOiB7J3R5cGUnOiAnZnVuY3Rpb24nLCAnZGVzY3JpcHRpb24nOiAnQ2hlY2sgdGhlIGxpdmVuZXNzIG9mIHRoZSBzZXJ2aWNlJ319XCIsXG4gICAgICAgICAgdHlwZTogXCJvYmplY3RcIixcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICByZXF1aXJlZDogW1wicHJvYmVzXCJdLFxuICAgICAgdHlwZTogXCJvYmplY3RcIixcbiAgICB9LFxuICB9KTtcblxuICByZXR1cm4gd207XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldFJlbW90ZVNlcnZpY2Uoc2VydmljZVVyaSwgY29uZmlnID0ge30pIHtcbiAgY29uc3QgeyBzZXJ2ZXJVcmwsIHdvcmtzcGFjZSwgY2xpZW50SWQsIHNlcnZpY2VJZCwgYXBwSWQgfSA9XG4gICAgKDAsX3V0aWxzX19XRUJQQUNLX0lNUE9SVEVEX01PRFVMRV8xX18ucGFyc2VTZXJ2aWNlVXJsKShzZXJ2aWNlVXJpKTtcbiAgY29uc3QgZnVsbFNlcnZpY2VJZCA9IGAke3dvcmtzcGFjZX0vJHtjbGllbnRJZH06JHtzZXJ2aWNlSWR9QCR7YXBwSWR9YDtcblxuICBpZiAoY29uZmlnLnNlcnZlclVybCkge1xuICAgIGlmIChjb25maWcuc2VydmVyVXJsICE9PSBzZXJ2ZXJVcmwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgXCJzZXJ2ZXJfdXJsIGluIGNvbmZpZyBkb2VzIG5vdCBtYXRjaCB0aGUgc2VydmVyX3VybCBpbiB0aGUgdXJsXCIsXG4gICAgICApO1xuICAgIH1cbiAgfVxuICBjb25maWcuc2VydmVyVXJsID0gc2VydmVyVXJsO1xuICBjb25zdCBzZXJ2ZXIgPSBhd2FpdCBjb25uZWN0VG9TZXJ2ZXIoY29uZmlnKTtcbiAgcmV0dXJuIGF3YWl0IHNlcnZlci5nZXRTZXJ2aWNlKGZ1bGxTZXJ2aWNlSWQpO1xufVxuXG5jbGFzcyBMb2NhbFdlYlNvY2tldCB7XG4gIGNvbnN0cnVjdG9yKHVybCwgY2xpZW50X2lkLCB3b3Jrc3BhY2UpIHtcbiAgICB0aGlzLnVybCA9IHVybDtcbiAgICB0aGlzLm9ub3BlbiA9ICgpID0+IHt9O1xuICAgIHRoaXMub25tZXNzYWdlID0gKCkgPT4ge307XG4gICAgdGhpcy5vbmNsb3NlID0gKCkgPT4ge307XG4gICAgdGhpcy5vbmVycm9yID0gKCkgPT4ge307XG4gICAgdGhpcy5jbGllbnRfaWQgPSBjbGllbnRfaWQ7XG4gICAgdGhpcy53b3Jrc3BhY2UgPSB3b3Jrc3BhY2U7XG4gICAgY29uc3QgY29udGV4dCA9IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiBzZWxmO1xuICAgIGNvbnN0IGlzV2luZG93ID0gdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIjtcbiAgICB0aGlzLnBvc3RNZXNzYWdlID0gKG1lc3NhZ2UpID0+IHtcbiAgICAgIGlmIChpc1dpbmRvdykge1xuICAgICAgICB3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKG1lc3NhZ2UsIFwiKlwiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNlbGYucG9zdE1lc3NhZ2UobWVzc2FnZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMucmVhZHlTdGF0ZSA9IFdlYlNvY2tldC5DT05ORUNUSU5HO1xuICAgIGNvbnRleHQuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIFwibWVzc2FnZVwiLFxuICAgICAgKGV2ZW50KSA9PiB7XG4gICAgICAgIGNvbnN0IHsgdHlwZSwgZGF0YSwgdG8gfSA9IGV2ZW50LmRhdGE7XG4gICAgICAgIGlmICh0byAhPT0gdGhpcy5jbGllbnRfaWQpIHtcbiAgICAgICAgICAvLyBjb25zb2xlLmRlYnVnKFwibWVzc2FnZSBub3QgZm9yIG1lXCIsIHRvLCB0aGlzLmNsaWVudF9pZCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgIGNhc2UgXCJtZXNzYWdlXCI6XG4gICAgICAgICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09PSBXZWJTb2NrZXQuT1BFTiAmJiB0aGlzLm9ubWVzc2FnZSkge1xuICAgICAgICAgICAgICB0aGlzLm9ubWVzc2FnZSh7IGRhdGE6IGRhdGEgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIFwiY29ubmVjdGVkXCI6XG4gICAgICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSBXZWJTb2NrZXQuT1BFTjtcbiAgICAgICAgICAgIHRoaXMub25vcGVuKGV2ZW50KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgXCJjbG9zZWRcIjpcbiAgICAgICAgICAgIHRoaXMucmVhZHlTdGF0ZSA9IFdlYlNvY2tldC5DTE9TRUQ7XG4gICAgICAgICAgICB0aGlzLm9uY2xvc2UoZXZlbnQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgZmFsc2UsXG4gICAgKTtcblxuICAgIGlmICghdGhpcy5jbGllbnRfaWQpIHRocm93IG5ldyBFcnJvcihcImNsaWVudF9pZCBpcyByZXF1aXJlZFwiKTtcbiAgICBpZiAoIXRoaXMud29ya3NwYWNlKSB0aHJvdyBuZXcgRXJyb3IoXCJ3b3Jrc3BhY2UgaXMgcmVxdWlyZWRcIik7XG4gICAgdGhpcy5wb3N0TWVzc2FnZSh7XG4gICAgICB0eXBlOiBcImNvbm5lY3RcIixcbiAgICAgIHVybDogdGhpcy51cmwsXG4gICAgICBmcm9tOiB0aGlzLmNsaWVudF9pZCxcbiAgICAgIHdvcmtzcGFjZTogdGhpcy53b3Jrc3BhY2UsXG4gICAgfSk7XG4gIH1cblxuICBzZW5kKGRhdGEpIHtcbiAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09PSBXZWJTb2NrZXQuT1BFTikge1xuICAgICAgdGhpcy5wb3N0TWVzc2FnZSh7XG4gICAgICAgIHR5cGU6IFwibWVzc2FnZVwiLFxuICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICBmcm9tOiB0aGlzLmNsaWVudF9pZCxcbiAgICAgICAgd29ya3NwYWNlOiB0aGlzLndvcmtzcGFjZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGNsb3NlKCkge1xuICAgIHRoaXMucmVhZHlTdGF0ZSA9IFdlYlNvY2tldC5DTE9TSU5HO1xuICAgIHRoaXMucG9zdE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogXCJjbG9zZVwiLFxuICAgICAgZnJvbTogdGhpcy5jbGllbnRfaWQsXG4gICAgICB3b3Jrc3BhY2U6IHRoaXMud29ya3NwYWNlLFxuICAgIH0pO1xuICAgIHRoaXMub25jbG9zZSgpO1xuICB9XG5cbiAgYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICAgIGlmICh0eXBlID09PSBcIm1lc3NhZ2VcIikge1xuICAgICAgdGhpcy5vbm1lc3NhZ2UgPSBsaXN0ZW5lcjtcbiAgICB9XG4gICAgaWYgKHR5cGUgPT09IFwib3BlblwiKSB7XG4gICAgICB0aGlzLm9ub3BlbiA9IGxpc3RlbmVyO1xuICAgIH1cbiAgICBpZiAodHlwZSA9PT0gXCJjbG9zZVwiKSB7XG4gICAgICB0aGlzLm9uY2xvc2UgPSBsaXN0ZW5lcjtcbiAgICB9XG4gICAgaWYgKHR5cGUgPT09IFwiZXJyb3JcIikge1xuICAgICAgdGhpcy5vbmVycm9yID0gbGlzdGVuZXI7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHNldHVwTG9jYWxDbGllbnQoe1xuICBlbmFibGVfZXhlY3V0aW9uID0gZmFsc2UsXG4gIG9uX3JlYWR5ID0gbnVsbCxcbn0pIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCBjb250ZXh0ID0gdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHNlbGY7XG4gICAgY29uc3QgaXNXaW5kb3cgPSB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiO1xuICAgIGNvbnRleHQuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIFwibWVzc2FnZVwiLFxuICAgICAgKGV2ZW50KSA9PiB7XG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICB0eXBlLFxuICAgICAgICAgIHNlcnZlcl91cmwsXG4gICAgICAgICAgd29ya3NwYWNlLFxuICAgICAgICAgIGNsaWVudF9pZCxcbiAgICAgICAgICB0b2tlbixcbiAgICAgICAgICBtZXRob2RfdGltZW91dCxcbiAgICAgICAgICBuYW1lLFxuICAgICAgICAgIGNvbmZpZyxcbiAgICAgICAgfSA9IGV2ZW50LmRhdGE7XG5cbiAgICAgICAgaWYgKHR5cGUgPT09IFwiaW5pdGlhbGl6ZUh5cGhhQ2xpZW50XCIpIHtcbiAgICAgICAgICBpZiAoIXNlcnZlcl91cmwgfHwgIXdvcmtzcGFjZSB8fCAhY2xpZW50X2lkKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwic2VydmVyX3VybCwgd29ya3NwYWNlLCBhbmQgY2xpZW50X2lkIGFyZSByZXF1aXJlZC5cIik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFzZXJ2ZXJfdXJsLnN0YXJ0c1dpdGgoXCJodHRwczovL2xvY2FsLWh5cGhhLXNlcnZlcjpcIikpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICAgIFwic2VydmVyX3VybCBzaG91bGQgc3RhcnQgd2l0aCBodHRwczovL2xvY2FsLWh5cGhhLXNlcnZlcjpcIixcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY2xhc3MgRml4ZWRMb2NhbFdlYlNvY2tldCBleHRlbmRzIExvY2FsV2ViU29ja2V0IHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yKHVybCkge1xuICAgICAgICAgICAgICAvLyBDYWxsIHRoZSBwYXJlbnQgY2xhc3MncyBjb25zdHJ1Y3RvciB3aXRoIGZpeGVkIHZhbHVlc1xuICAgICAgICAgICAgICBzdXBlcih1cmwsIGNsaWVudF9pZCwgd29ya3NwYWNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgY29ubmVjdFRvU2VydmVyKHtcbiAgICAgICAgICAgIHNlcnZlcl91cmwsXG4gICAgICAgICAgICB3b3Jrc3BhY2UsXG4gICAgICAgICAgICBjbGllbnRfaWQsXG4gICAgICAgICAgICB0b2tlbixcbiAgICAgICAgICAgIG1ldGhvZF90aW1lb3V0LFxuICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgIFdlYlNvY2tldENsYXNzOiBGaXhlZExvY2FsV2ViU29ja2V0LFxuICAgICAgICAgIH0pLnRoZW4oYXN5bmMgKHNlcnZlcikgPT4ge1xuICAgICAgICAgICAgZ2xvYmFsVGhpcy5hcGkgPSBzZXJ2ZXI7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAvLyBmb3IgaWZyYW1lXG4gICAgICAgICAgICAgIGlmIChpc1dpbmRvdyAmJiBlbmFibGVfZXhlY3V0aW9uKSB7XG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gbG9hZFNjcmlwdChzY3JpcHQpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNjcmlwdEVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuICAgICAgICAgICAgICAgICAgICBzY3JpcHRFbGVtZW50LmlubmVySFRNTCA9IHNjcmlwdC5jb250ZW50O1xuICAgICAgICAgICAgICAgICAgICBzY3JpcHRFbGVtZW50LmxhbmcgPSBzY3JpcHQubGFuZztcblxuICAgICAgICAgICAgICAgICAgICBzY3JpcHRFbGVtZW50Lm9ubG9hZCA9ICgpID0+IHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgc2NyaXB0RWxlbWVudC5vbmVycm9yID0gKGUpID0+IHJlamVjdChlKTtcblxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHNjcmlwdEVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjb25maWcuc3R5bGVzICYmIGNvbmZpZy5zdHlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBzdHlsZSBvZiBjb25maWcuc3R5bGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0eWxlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgc3R5bGVFbGVtZW50LmlubmVySFRNTCA9IHN0eWxlLmNvbnRlbnQ7XG4gICAgICAgICAgICAgICAgICAgIHN0eWxlRWxlbWVudC5sYW5nID0gc3R5bGUubGFuZztcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZUVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLmxpbmtzICYmIGNvbmZpZy5saW5rcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGxpbmsgb2YgY29uZmlnLmxpbmtzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpbmtFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7XG4gICAgICAgICAgICAgICAgICAgIGxpbmtFbGVtZW50LmhyZWYgPSBsaW5rLnVybDtcbiAgICAgICAgICAgICAgICAgICAgbGlua0VsZW1lbnQuaW5uZXJUZXh0ID0gbGluay50ZXh0O1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGxpbmtFbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpZy53aW5kb3dzICYmIGNvbmZpZy53aW5kb3dzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdyBvZiBjb25maWcud2luZG93cykge1xuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmlubmVySFRNTCA9IHcuY29udGVudDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjb25maWcuc2NyaXB0cyAmJiBjb25maWcuc2NyaXB0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNjcmlwdCBvZiBjb25maWcuc2NyaXB0cykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2NyaXB0LmxhbmcgIT09IFwiamF2YXNjcmlwdFwiKVxuICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIk9ubHkgamF2YXNjcmlwdCBzY3JpcHRzIGFyZSBzdXBwb3J0ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGxvYWRTY3JpcHQoc2NyaXB0KTsgLy8gQXdhaXQgdGhlIGxvYWRpbmcgb2YgZWFjaCBzY3JpcHRcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gZm9yIHdlYiB3b3JrZXJcbiAgICAgICAgICAgICAgZWxzZSBpZiAoXG4gICAgICAgICAgICAgICAgIWlzV2luZG93ICYmXG4gICAgICAgICAgICAgICAgZW5hYmxlX2V4ZWN1dGlvbiAmJlxuICAgICAgICAgICAgICAgIGNvbmZpZy5zY3JpcHRzICYmXG4gICAgICAgICAgICAgICAgY29uZmlnLnNjcmlwdHMubGVuZ3RoID4gMFxuICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNjcmlwdCBvZiBjb25maWcuc2NyaXB0cykge1xuICAgICAgICAgICAgICAgICAgaWYgKHNjcmlwdC5sYW5nICE9PSBcImphdmFzY3JpcHRcIilcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiT25seSBqYXZhc2NyaXB0IHNjcmlwdHMgYXJlIHN1cHBvcnRlZFwiKTtcbiAgICAgICAgICAgICAgICAgIGV2YWwoc2NyaXB0LmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmIChvbl9yZWFkeSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IG9uX3JlYWR5KHNlcnZlciwgY29uZmlnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXNvbHZlKHNlcnZlcik7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGZhbHNlLFxuICAgICk7XG4gICAgaWYgKGlzV2luZG93KSB7XG4gICAgICB3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKHsgdHlwZTogXCJoeXBoYUNsaWVudFJlYWR5XCIgfSwgXCIqXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzZWxmLnBvc3RNZXNzYWdlKHsgdHlwZTogXCJoeXBoYUNsaWVudFJlYWR5XCIgfSk7XG4gICAgfVxuICB9KTtcbn1cblxuLyoqKioqKi8gXHRyZXR1cm4gX193ZWJwYWNrX2V4cG9ydHNfXztcbi8qKioqKiovIH0pKClcbjtcbn0pO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aHlwaGEtcnBjLXdlYnNvY2tldC5qcy5tYXAiLCJtb2R1bGUuZXhwb3J0cyA9IHsgaHlwaGFXZWJzb2NrZXRDbGllbnQ6IHJlcXVpcmUoXCIuL2Rpc3QvaHlwaGEtcnBjLXdlYnNvY2tldC5qc1wiKX07IiwiaW1wb3J0ICogYXMgdnNjb2RlIGZyb20gJ3ZzY29kZSc7XG5pbXBvcnQgeyBIeXBoYUF1dGhQcm92aWRlciB9IGZyb20gJy4uL3Byb3ZpZGVycy9IeXBoYUF1dGhQcm92aWRlcic7XG5cbmV4cG9ydCBmdW5jdGlvbiBzaG93V2VsY29tZVBhZ2UoY29udGV4dDogdnNjb2RlLkV4dGVuc2lvbkNvbnRleHQsIGF1dGhQcm92aWRlcjogSHlwaGFBdXRoUHJvdmlkZXIpIHtcbiAgICBjb25zdCBwYW5lbCA9IHZzY29kZS53aW5kb3cuY3JlYXRlV2Vidmlld1BhbmVsKFxuICAgICAgICAnc3ZhbXAtc3R1ZGlvLXdlbGNvbWUnLFxuICAgICAgICAnV2VsY29tZSB0byBTdmFtcCBTdHVkaW8nLFxuICAgICAgICB2c2NvZGUuVmlld0NvbHVtbi5PbmUsXG4gICAgICAgIHtcbiAgICAgICAgICAgIGVuYWJsZVNjcmlwdHM6IHRydWUsXG4gICAgICAgICAgICByZXRhaW5Db250ZXh0V2hlbkhpZGRlbjogdHJ1ZVxuICAgICAgICB9XG4gICAgKTtcblxuICAgIC8vIEhhbmRsZSBtZXNzYWdlcyBmcm9tIHRoZSB3ZWJ2aWV3XG4gICAgcGFuZWwud2Vidmlldy5vbkRpZFJlY2VpdmVNZXNzYWdlKFxuICAgICAgICBhc3luYyBtZXNzYWdlID0+IHtcbiAgICAgICAgICAgIHN3aXRjaCAobWVzc2FnZS5jb21tYW5kKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnbG9naW4nOlxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UkCBXZWJ2aWV3IGxvZ2luIHJlcXVlc3QgcmVjZWl2ZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3VjY2VzcyA9IGF3YWl0IGF1dGhQcm92aWRlci5sb2dpbigpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KchSBXZWJ2aWV3IGxvZ2luIHN1Y2Nlc3NmdWwnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhbmVsLndlYnZpZXcucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAnbG9naW5TdWNjZXNzJywgdXNlcjogYXV0aFByb3ZpZGVyLmdldFVzZXIoKSB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinYwgV2VidmlldyBsb2dpbiBmYWlsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhbmVsLndlYnZpZXcucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAnbG9naW5FcnJvcicsIGVycm9yOiAnTG9naW4gZmFpbGVkJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdsb2dvdXQnOlxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UkyBXZWJ2aWV3IGxvZ291dCByZXF1ZXN0IHJlY2VpdmVkJyk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGF1dGhQcm92aWRlci5sb2dvdXQoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KchSBXZWJ2aWV3IGxvZ291dCBjb21wbGV0ZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgcGFuZWwud2Vidmlldy5wb3N0TWVzc2FnZSh7IGNvbW1hbmQ6ICdsb2dvdXRTdWNjZXNzJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnY29ubmVjdEh5cGhhJzpcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4EgV2VidmlldyBjb25uZWN0IHRvIEh5cGhhIHJlcXVlc3QgcmVjZWl2ZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVzZSBoeXBoYTovLyBzY2hlbWUgY29uc2lzdGVudGx5ICBcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVyaSA9IHZzY29kZS5VcmkucGFyc2UoJ2h5cGhhOi8vYWdlbnQtbGFiLXByb2plY3RzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+TgSBPcGVuaW5nIGZvbGRlciB3aXRoIFVSSTonLCB1cmkudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHZzY29kZS5jb21tYW5kcy5leGVjdXRlQ29tbWFuZCgndnNjb2RlLm9wZW5Gb2xkZXInLCB1cmkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KchSBGb2xkZXIgb3BlbmVkIHN1Y2Nlc3NmdWxseSBmcm9tIHdlYnZpZXcnKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBGYWlsZWQgdG8gb3BlbiBmb2xkZXIgZnJvbSB3ZWJ2aWV3OicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhbmVsLndlYnZpZXcucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAnZXJyb3InLCBlcnJvcjogYEZhaWxlZCB0byBvcGVuIHByb2plY3RzOiAke2Vycm9yfWAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgY29udGV4dC5zdWJzY3JpcHRpb25zXG4gICAgKTtcblxuICAgIC8vIFNldCBpbml0aWFsIEhUTUwgY29udGVudFxuICAgIHVwZGF0ZVdlYnZpZXdDb250ZW50KHBhbmVsLCBhdXRoUHJvdmlkZXIpO1xuICAgIFxuICAgIC8vIFVwZGF0ZSBjb250ZW50IHJlYWN0aXZlbHkgd2hlbiBhdXRoIHN0YXRlIGNoYW5nZXNcbiAgICBjb25zdCBhdXRoU3RhdGVTdWJzY3JpcHRpb24gPSBhdXRoUHJvdmlkZXIub25BdXRoU3RhdGVDaGFuZ2VkKChhdXRoU3RhdGUpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ/CflIQgQXV0aCBzdGF0ZSBjaGFuZ2VkLCB1cGRhdGluZyB3ZWJ2aWV3IGNvbnRlbnQnKTtcbiAgICAgICAgdXBkYXRlV2Vidmlld0NvbnRlbnQocGFuZWwsIGF1dGhQcm92aWRlcik7XG4gICAgfSk7XG5cbiAgICBwYW5lbC5vbkRpZERpc3Bvc2UoKCkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+Xke+4jyBEaXNwb3Npbmcgd2VsY29tZSBwYWdlIHJlc291cmNlcycpO1xuICAgICAgICBhdXRoU3RhdGVTdWJzY3JpcHRpb24uZGlzcG9zZSgpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHBhbmVsO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVXZWJ2aWV3Q29udGVudChwYW5lbDogdnNjb2RlLldlYnZpZXdQYW5lbCwgYXV0aFByb3ZpZGVyOiBIeXBoYUF1dGhQcm92aWRlcikge1xuICAgIGNvbnN0IGlzQXV0aGVudGljYXRlZCA9IGF1dGhQcm92aWRlci5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICBjb25zdCB1c2VyID0gYXV0aFByb3ZpZGVyLmdldFVzZXIoKTtcblxuICAgIHBhbmVsLndlYnZpZXcuaHRtbCA9IGdldFdlYnZpZXdDb250ZW50KGlzQXV0aGVudGljYXRlZCwgdXNlcik7XG59XG5cbmZ1bmN0aW9uIGdldFdlYnZpZXdDb250ZW50KGlzQXV0aGVudGljYXRlZDogYm9vbGVhbiwgdXNlcjogYW55KTogc3RyaW5nIHtcbiAgICByZXR1cm4gYDwhRE9DVFlQRSBodG1sPlxuPGh0bWwgbGFuZz1cImVuXCI+XG48aGVhZD5cbiAgICA8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj5cbiAgICA8bWV0YSBuYW1lPVwidmlld3BvcnRcIiBjb250ZW50PVwid2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEuMFwiPlxuICAgIDx0aXRsZT5XZWxjb21lIHRvIFN2YW1wIFN0dWRpbzwvdGl0bGU+XG4gICAgPHN0eWxlPlxuICAgICAgICBib2R5IHtcbiAgICAgICAgICAgIGZvbnQtZmFtaWx5OiAtYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsICdTZWdvZSBVSScsICdSb2JvdG8nLCBzYW5zLXNlcmlmO1xuICAgICAgICAgICAgcGFkZGluZzogMjBweDtcbiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6IHZhcigtLXZzY29kZS1lZGl0b3ItYmFja2dyb3VuZCk7XG4gICAgICAgICAgICBjb2xvcjogdmFyKC0tdnNjb2RlLWVkaXRvci1mb3JlZ3JvdW5kKTtcbiAgICAgICAgICAgIGxpbmUtaGVpZ2h0OiAxLjY7XG4gICAgICAgIH1cbiAgICAgICAgLmNvbnRhaW5lciB7XG4gICAgICAgICAgICBtYXgtd2lkdGg6IDgwMHB4O1xuICAgICAgICAgICAgbWFyZ2luOiAwIGF1dG87XG4gICAgICAgIH1cbiAgICAgICAgLmhlYWRlciB7XG4gICAgICAgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gICAgICAgICAgICBtYXJnaW4tYm90dG9tOiA0MHB4O1xuICAgICAgICB9XG4gICAgICAgIC5oZWFkZXIgaDEge1xuICAgICAgICAgICAgZm9udC1zaXplOiAyLjVlbTtcbiAgICAgICAgICAgIG1hcmdpbi1ib3R0b206IDEwcHg7XG4gICAgICAgICAgICBjb2xvcjogdmFyKC0tdnNjb2RlLXRleHRMaW5rLWZvcmVncm91bmQpO1xuICAgICAgICB9XG4gICAgICAgIC5oZWFkZXIgcCB7XG4gICAgICAgICAgICBmb250LXNpemU6IDEuMmVtO1xuICAgICAgICAgICAgb3BhY2l0eTogMC44O1xuICAgICAgICB9XG4gICAgICAgIC5sb2dpbi1zZWN0aW9uIHtcbiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6IHZhcigtLXZzY29kZS1lZGl0b3ItaW5hY3RpdmVTZWxlY3Rpb25CYWNrZ3JvdW5kKTtcbiAgICAgICAgICAgIHBhZGRpbmc6IDMwcHg7XG4gICAgICAgICAgICBib3JkZXItcmFkaXVzOiA4cHg7XG4gICAgICAgICAgICBtYXJnaW4tYm90dG9tOiAzMHB4O1xuICAgICAgICAgICAgdGV4dC1hbGlnbjogY2VudGVyO1xuICAgICAgICB9XG4gICAgICAgIC51c2VyLWluZm8ge1xuICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogdmFyKC0tdnNjb2RlLWlucHV0VmFsaWRhdGlvbi1pbmZvQmFja2dyb3VuZCk7XG4gICAgICAgICAgICBwYWRkaW5nOiAyMHB4O1xuICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogOHB4O1xuICAgICAgICAgICAgbWFyZ2luLWJvdHRvbTogMzBweDtcbiAgICAgICAgICAgIGJvcmRlci1sZWZ0OiA0cHggc29saWQgdmFyKC0tdnNjb2RlLWlucHV0VmFsaWRhdGlvbi1pbmZvQm9yZGVyKTtcbiAgICAgICAgfVxuICAgICAgICAuZmVhdHVyZXMge1xuICAgICAgICAgICAgZGlzcGxheTogZ3JpZDtcbiAgICAgICAgICAgIGdyaWQtdGVtcGxhdGUtY29sdW1uczogcmVwZWF0KGF1dG8tZml0LCBtaW5tYXgoMjUwcHgsIDFmcikpO1xuICAgICAgICAgICAgZ2FwOiAyMHB4O1xuICAgICAgICAgICAgbWFyZ2luLWJvdHRvbTogNDBweDtcbiAgICAgICAgfVxuICAgICAgICAuZmVhdHVyZSB7XG4gICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS12c2NvZGUtZWRpdG9yLWluYWN0aXZlU2VsZWN0aW9uQmFja2dyb3VuZCk7XG4gICAgICAgICAgICBwYWRkaW5nOiAyMHB4O1xuICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogOHB4O1xuICAgICAgICB9XG4gICAgICAgIC5mZWF0dXJlIGgzIHtcbiAgICAgICAgICAgIGNvbG9yOiB2YXIoLS12c2NvZGUtdGV4dExpbmstZm9yZWdyb3VuZCk7XG4gICAgICAgICAgICBtYXJnaW4tYm90dG9tOiAxMHB4O1xuICAgICAgICB9XG4gICAgICAgIC5idG4ge1xuICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogdmFyKC0tdnNjb2RlLWJ1dHRvbi1iYWNrZ3JvdW5kKTtcbiAgICAgICAgICAgIGNvbG9yOiB2YXIoLS12c2NvZGUtYnV0dG9uLWZvcmVncm91bmQpO1xuICAgICAgICAgICAgYm9yZGVyOiBub25lO1xuICAgICAgICAgICAgcGFkZGluZzogMTJweCAyNHB4O1xuICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogNHB4O1xuICAgICAgICAgICAgY3Vyc29yOiBwb2ludGVyO1xuICAgICAgICAgICAgZm9udC1zaXplOiAxNHB4O1xuICAgICAgICAgICAgbWFyZ2luOiA1cHg7XG4gICAgICAgICAgICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kLWNvbG9yIDAuMnM7XG4gICAgICAgIH1cbiAgICAgICAgLmJ0bjpob3ZlciB7XG4gICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS12c2NvZGUtYnV0dG9uLWhvdmVyQmFja2dyb3VuZCk7XG4gICAgICAgIH1cbiAgICAgICAgLmJ0bi1zZWNvbmRhcnkge1xuICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogdmFyKC0tdnNjb2RlLWJ1dHRvbi1zZWNvbmRhcnlCYWNrZ3JvdW5kKTtcbiAgICAgICAgICAgIGNvbG9yOiB2YXIoLS12c2NvZGUtYnV0dG9uLXNlY29uZGFyeUZvcmVncm91bmQpO1xuICAgICAgICB9XG4gICAgICAgIC5idG4tc2Vjb25kYXJ5OmhvdmVyIHtcbiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6IHZhcigtLXZzY29kZS1idXR0b24tc2Vjb25kYXJ5SG92ZXJCYWNrZ3JvdW5kKTtcbiAgICAgICAgfVxuICAgICAgICAuc3RhdHVzIHtcbiAgICAgICAgICAgIHBhZGRpbmc6IDEwcHg7XG4gICAgICAgICAgICBib3JkZXItcmFkaXVzOiA0cHg7XG4gICAgICAgICAgICBtYXJnaW46IDEwcHggMDtcbiAgICAgICAgfVxuICAgICAgICAuc3RhdHVzLnN1Y2Nlc3Mge1xuICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogdmFyKC0tdnNjb2RlLWlucHV0VmFsaWRhdGlvbi1pbmZvQmFja2dyb3VuZCk7XG4gICAgICAgICAgICBjb2xvcjogdmFyKC0tdnNjb2RlLWlucHV0VmFsaWRhdGlvbi1pbmZvRm9yZWdyb3VuZCk7XG4gICAgICAgIH1cbiAgICAgICAgLnN0YXR1cy5lcnJvciB7XG4gICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS12c2NvZGUtaW5wdXRWYWxpZGF0aW9uLWVycm9yQmFja2dyb3VuZCk7XG4gICAgICAgICAgICBjb2xvcjogdmFyKC0tdnNjb2RlLWlucHV0VmFsaWRhdGlvbi1lcnJvckZvcmVncm91bmQpO1xuICAgICAgICB9XG4gICAgPC9zdHlsZT5cbjwvaGVhZD5cbjxib2R5PlxuICAgIDxkaXYgY2xhc3M9XCJjb250YWluZXJcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPlxuICAgICAgICAgICAgPGgxPvCfp6ogU3ZhbXAgU3R1ZGlvPC9oMT5cbiAgICAgICAgICAgIDxwPllvdXIgdGFpbG9yZWQgVlMgQ29kZSBlbnZpcm9ubWVudCBmb3IgSHlwaGEgc2VydmVyIGludGVncmF0aW9uPC9wPlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICAke2lzQXV0aGVudGljYXRlZCA/IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1c2VyLWluZm9cIj5cbiAgICAgICAgICAgICAgICA8aDM+4pyFIENvbm5lY3RlZCB0byBIeXBoYSBTZXJ2ZXI8L2gzPlxuICAgICAgICAgICAgICAgIDxwPjxzdHJvbmc+TG9nZ2VkIGluIGFzOjwvc3Ryb25nPiAke3VzZXI/LmVtYWlsIHx8ICdVbmtub3duJ308L3A+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ0biBidG4tc2Vjb25kYXJ5XCIgb25jbGljaz1cImxvZ291dCgpXCI+TG9nb3V0PC9idXR0b24+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ0blwiIG9uY2xpY2s9XCJjb25uZWN0SHlwaGEoKVwiPkJyb3dzZSBIeXBoYSBQcm9qZWN0czwvYnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGAgOiBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwibG9naW4tc2VjdGlvblwiPlxuICAgICAgICAgICAgICAgIDxoMz7wn5SQIENvbm5lY3QgdG8gSHlwaGEgU2VydmVyPC9oMz5cbiAgICAgICAgICAgICAgICA8cD5Mb2dpbiB0byBhY2Nlc3MgeW91ciBwcm9qZWN0cyBhbmQgY29sbGFib3JhdGUgd2l0aCB0aGUgSHlwaGEgZWNvc3lzdGVtPC9wPlxuICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJidG5cIiBvbmNsaWNrPVwibG9naW4oKVwiPkxvZ2luIHRvIEh5cGhhPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPGRpdiBpZD1cInN0YXR1c1wiPjwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGB9XG5cbiAgICAgICAgPGRpdiBjbGFzcz1cImZlYXR1cmVzXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmVhdHVyZVwiPlxuICAgICAgICAgICAgICAgIDxoMz7wn5eC77iPIFByb2plY3QgTWFuYWdlbWVudDwvaDM+XG4gICAgICAgICAgICAgICAgPHA+QWNjZXNzIGFuZCBtYW5hZ2UgeW91ciBIeXBoYSBwcm9qZWN0cyBkaXJlY3RseSBmcm9tIFZTIENvZGUuIEJyb3dzZSwgZWRpdCwgYW5kIHN5bmMgZmlsZXMgc2VhbWxlc3NseS48L3A+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmZWF0dXJlXCI+XG4gICAgICAgICAgICAgICAgPGgzPvCflIQgUmVhbC10aW1lIFN5bmM8L2gzPlxuICAgICAgICAgICAgICAgIDxwPkNoYW5nZXMgYXJlIGF1dG9tYXRpY2FsbHkgc3luY2hyb25pemVkIHdpdGggdGhlIEh5cGhhIHNlcnZlciwgZW5hYmxpbmcgY29sbGFib3JhdGl2ZSBkZXZlbG9wbWVudC48L3A+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmZWF0dXJlXCI+XG4gICAgICAgICAgICAgICAgPGgzPvCfm6DvuI8gQXJ0aWZhY3QgTWFuYWdlcjwvaDM+XG4gICAgICAgICAgICAgICAgPHA+TGV2ZXJhZ2UgdGhlIEh5cGhhIEFydGlmYWN0IE1hbmFnZXIgZm9yIG1hbmFnaW5nIGRhdGFzZXRzLCBtb2RlbHMsIGFuZCBhcHBsaWNhdGlvbnMuPC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIDxkaXYgc3R5bGU9XCJ0ZXh0LWFsaWduOiBjZW50ZXI7IG9wYWNpdHk6IDAuNzsgZm9udC1zaXplOiAwLjllbTtcIj5cbiAgICAgICAgICAgIDxwPlN2YW1wIFN0dWRpbyB2MS4wLjAgfCBQb3dlcmVkIGJ5IEh5cGhhPC9wPlxuICAgICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cblxuICAgIDxzY3JpcHQ+XG4gICAgICAgIGNvbnN0IHZzY29kZSA9IGFjcXVpcmVWc0NvZGVBcGkoKTtcblxuICAgICAgICBmdW5jdGlvbiBsb2dpbigpIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1c0VsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0YXR1cycpO1xuICAgICAgICAgICAgaWYgKHN0YXR1c0VsKSB7XG4gICAgICAgICAgICAgICAgc3RhdHVzRWwuaW5uZXJIVE1MID0gJzxkaXYgY2xhc3M9XCJzdGF0dXNcIj5Jbml0aWF0aW5nIGxvZ2luLi4uPC9kaXY+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZzY29kZS5wb3N0TWVzc2FnZSh7IGNvbW1hbmQ6ICdsb2dpbicgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBsb2dvdXQoKSB7XG4gICAgICAgICAgICB2c2NvZGUucG9zdE1lc3NhZ2UoeyBjb21tYW5kOiAnbG9nb3V0JyB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGNvbm5lY3RIeXBoYSgpIHtcbiAgICAgICAgICAgIHZzY29kZS5wb3N0TWVzc2FnZSh7IGNvbW1hbmQ6ICdjb25uZWN0SHlwaGEnIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTGlzdGVuIGZvciBtZXNzYWdlcyBmcm9tIHRoZSBleHRlbnNpb25cbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBldmVudCA9PiB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gZXZlbnQuZGF0YTtcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1c0VsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0YXR1cycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBzd2l0Y2ggKG1lc3NhZ2UuY29tbWFuZCkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ2xvZ2luU3VjY2Vzcyc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGF0dXNFbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzRWwuaW5uZXJIVE1MID0gJzxkaXYgY2xhc3M9XCJzdGF0dXMgc3VjY2Vzc1wiPkxvZ2luIHN1Y2Nlc3NmdWwhIFJlbG9hZGluZy4uLjwvZGl2Pic7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2xvZ2luRXJyb3InOlxuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHVzRWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1c0VsLmlubmVySFRNTCA9ICc8ZGl2IGNsYXNzPVwic3RhdHVzIGVycm9yXCI+TG9naW4gZmFpbGVkOiAnICsgbWVzc2FnZS5lcnJvciArICc8L2Rpdj4nO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2xvZ291dFN1Y2Nlc3MnOlxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIDwvc2NyaXB0PlxuPC9ib2R5PlxuPC9odG1sPmA7XG59ICIsImltcG9ydCAqIGFzIHZzY29kZSBmcm9tICd2c2NvZGUnO1xuaW1wb3J0IHsgSHlwaGFGaWxlU3lzdGVtUHJvdmlkZXIgfSBmcm9tICcuL3Byb3ZpZGVycy9IeXBoYUZpbGVTeXN0ZW1Qcm92aWRlcic7XG5pbXBvcnQgeyBIeXBoYUF1dGhQcm92aWRlciB9IGZyb20gJy4vcHJvdmlkZXJzL0h5cGhhQXV0aFByb3ZpZGVyJztcbmltcG9ydCB7IHNob3dXZWxjb21lUGFnZSB9IGZyb20gJy4vY29tcG9uZW50cy9XZWxjb21lUGFnZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBhY3RpdmF0ZShjb250ZXh0OiB2c2NvZGUuRXh0ZW5zaW9uQ29udGV4dCkge1xuICAgIGNvbnNvbGUubG9nKCfwn5qAIFN2YW1wIFN0dWRpbyBleHRlbnNpb24gaXMgbm93IGFjdGl2ZSEnKTtcblxuICAgIC8vIEluaXRpYWxpemUgYXV0aGVudGljYXRpb24gcHJvdmlkZXJcbiAgICBjb25zdCBhdXRoUHJvdmlkZXIgPSBuZXcgSHlwaGFBdXRoUHJvdmlkZXIoY29udGV4dCk7XG4gICAgY29uc29sZS5sb2coJ+KchSBBdXRoIHByb3ZpZGVyIGluaXRpYWxpemVkJyk7XG4gICAgXG4gICAgLy8gSW5pdGlhbGl6ZSBmaWxlc3lzdGVtIHByb3ZpZGVyXG4gICAgY29uc3QgZmlsZVN5c3RlbVByb3ZpZGVyID0gbmV3IEh5cGhhRmlsZVN5c3RlbVByb3ZpZGVyKGF1dGhQcm92aWRlcik7XG4gICAgY29uc29sZS5sb2coJ+KchSBGaWxlIHN5c3RlbSBwcm92aWRlciBpbml0aWFsaXplZCcpO1xuICAgIFxuICAgIC8vIFJlZ2lzdGVyIGZpbGVzeXN0ZW0gcHJvdmlkZXJcbiAgICBjb25zdCBkaXNwb3NhYmxlID0gdnNjb2RlLndvcmtzcGFjZS5yZWdpc3RlckZpbGVTeXN0ZW1Qcm92aWRlcignaHlwaGEnLCBmaWxlU3lzdGVtUHJvdmlkZXIsIHtcbiAgICAgICAgaXNDYXNlU2Vuc2l0aXZlOiB0cnVlLFxuICAgICAgICBpc1JlYWRvbmx5OiBmYWxzZVxuICAgIH0pO1xuICAgIFxuICAgIGNvbnRleHQuc3Vic2NyaXB0aW9ucy5wdXNoKGRpc3Bvc2FibGUpO1xuICAgIGNvbnNvbGUubG9nKCfinIUgRmlsZSBzeXN0ZW0gcHJvdmlkZXIgcmVnaXN0ZXJlZCBmb3IgaHlwaGE6Ly8gc2NoZW1lJyk7XG5cbiAgICAvLyBSZWdpc3RlciBjb21tYW5kc1xuICAgIGNvbnN0IHdlbGNvbWVDb21tYW5kID0gdnNjb2RlLmNvbW1hbmRzLnJlZ2lzdGVyQ29tbWFuZCgnc3ZhbXAtc3R1ZGlvLndlbGNvbWUnLCAoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5KhIFdlbGNvbWUgY29tbWFuZCBleGVjdXRlZCcpO1xuICAgICAgICBzaG93V2VsY29tZVBhZ2UoY29udGV4dCwgYXV0aFByb3ZpZGVyKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IGxvZ2luQ29tbWFuZCA9IHZzY29kZS5jb21tYW5kcy5yZWdpc3RlckNvbW1hbmQoJ3N2YW1wLXN0dWRpby5sb2dpbicsIGFzeW5jICgpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ/CflJAgTG9naW4gY29tbWFuZCBleGVjdXRlZCcpO1xuICAgICAgICBjb25zdCBzdWNjZXNzID0gYXdhaXQgYXV0aFByb3ZpZGVyLmxvZ2luKCk7XG4gICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIExvZ2luIHN1Y2Nlc3NmdWwnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinYwgTG9naW4gZmFpbGVkJyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IGxvZ291dENvbW1hbmQgPSB2c2NvZGUuY29tbWFuZHMucmVnaXN0ZXJDb21tYW5kKCdzdmFtcC1zdHVkaW8ubG9nb3V0JywgYXN5bmMgKCkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+UkyBMb2dvdXQgY29tbWFuZCBleGVjdXRlZCcpO1xuICAgICAgICBhd2FpdCBhdXRoUHJvdmlkZXIubG9nb3V0KCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCfinIUgTG9nb3V0IGNvbXBsZXRlZCcpO1xuICAgIH0pO1xuXG4gICAgY29uc3QgYnJvd3NlUHJvamVjdHNDb21tYW5kID0gdnNjb2RlLmNvbW1hbmRzLnJlZ2lzdGVyQ29tbWFuZCgnc3ZhbXAtc3R1ZGlvLmJyb3dzZVByb2plY3RzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+TgSBCcm93c2UgcHJvamVjdHMgY29tbWFuZCBleGVjdXRlZCcpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gVXNlIGh5cGhhOi8vIHNjaGVtZSBjb25zaXN0ZW50bHlcbiAgICAgICAgICAgIGNvbnN0IHVyaSA9IHZzY29kZS5VcmkucGFyc2UoJ2h5cGhhOi8vYWdlbnQtbGFiLXByb2plY3RzJyk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+TgSBPcGVuaW5nIGZvbGRlciB3aXRoIFVSSTonLCB1cmkudG9TdHJpbmcoKSk7XG4gICAgICAgIGF3YWl0IHZzY29kZS5jb21tYW5kcy5leGVjdXRlQ29tbWFuZCgndnNjb2RlLm9wZW5Gb2xkZXInLCB1cmkpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ+KchSBGb2xkZXIgb3BlbmVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEZhaWxlZCB0byBvcGVuIGZvbGRlcjonLCBlcnJvcik7XG4gICAgICAgICAgICB2c2NvZGUud2luZG93LnNob3dFcnJvck1lc3NhZ2UoYEZhaWxlZCB0byBvcGVuIEh5cGhhIHByb2plY3RzOiAke2Vycm9yfWApO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBBZGQgY29tbWFuZHMgdG8gc3Vic2NyaXB0aW9uc1xuICAgIGNvbnRleHQuc3Vic2NyaXB0aW9ucy5wdXNoKHdlbGNvbWVDb21tYW5kLCBsb2dpbkNvbW1hbmQsIGxvZ291dENvbW1hbmQsIGJyb3dzZVByb2plY3RzQ29tbWFuZCk7XG4gICAgY29uc29sZS5sb2coJ+KchSBDb21tYW5kcyByZWdpc3RlcmVkJyk7XG5cbiAgICAvLyBBZGQgcHJvdmlkZXJzIHRvIHN1YnNjcmlwdGlvbnMgZm9yIHByb3BlciBjbGVhbnVwXG4gICAgY29udGV4dC5zdWJzY3JpcHRpb25zLnB1c2goYXV0aFByb3ZpZGVyKTtcblxuICAgIC8vIFNob3cgd2VsY29tZSBwYWdlIG9uIGZpcnN0IGFjdGl2YXRpb25cbiAgICBjb25zb2xlLmxvZygn8J+ThCBTaG93aW5nIHdlbGNvbWUgcGFnZScpO1xuICAgIHNob3dXZWxjb21lUGFnZShjb250ZXh0LCBhdXRoUHJvdmlkZXIpO1xuICAgIFxuICAgIGNvbnNvbGUubG9nKCfwn46JIFN2YW1wIFN0dWRpbyBleHRlbnNpb24gYWN0aXZhdGlvbiBjb21wbGV0ZSEnKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlYWN0aXZhdGUoKSB7XG4gICAgY29uc29sZS5sb2coJ/CfkYsgU3ZhbXAgU3R1ZGlvIGV4dGVuc2lvbiBpcyBkZWFjdGl2YXRlZCcpO1xufSAiLCJpbXBvcnQgKiBhcyB2c2NvZGUgZnJvbSAndnNjb2RlJztcblxuaW50ZXJmYWNlIExvZ2luQ29uZmlnIHtcbiAgICBzZXJ2ZXJfdXJsOiBzdHJpbmc7XG4gICAgbG9naW5fY2FsbGJhY2s6IChjb250ZXh0OiB7IGxvZ2luX3VybDogc3RyaW5nIH0pID0+IHZvaWQ7XG59XG5cbmludGVyZmFjZSBIeXBoYVVzZXIge1xuICAgIGVtYWlsOiBzdHJpbmc7XG4gICAgaWQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIEh5cGhhQXV0aFByb3ZpZGVyIHtcbiAgICBwcml2YXRlIGNvbnRleHQ6IHZzY29kZS5FeHRlbnNpb25Db250ZXh0O1xuICAgIHByaXZhdGUgdG9rZW46IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgdXNlcjogSHlwaGFVc2VyIHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBjbGllbnQ6IGFueSA9IG51bGw7XG4gICAgcHJpdmF0ZSBzZXJ2ZXI6IGFueSA9IG51bGw7XG4gICAgcHJpdmF0ZSByZWFkb25seSBzZXJ2ZXJVcmwgPSBcImh0dHBzOi8vaHlwaGEuYWljZWxsLmlvXCI7XG4gICAgcHJpdmF0ZSBpc0Nvbm5lY3RpbmcgPSBmYWxzZTtcbiAgICBwcml2YXRlIGNvbm5lY3Rpb25Qcm9taXNlOiBQcm9taXNlPGFueT4gfCBudWxsID0gbnVsbDtcbiAgICBcbiAgICAvLyBFdmVudCBlbWl0dGVycyBmb3IgcmVhY3RpdmUgdXBkYXRlc1xuICAgIHByaXZhdGUgX29uQXV0aFN0YXRlQ2hhbmdlZCA9IG5ldyB2c2NvZGUuRXZlbnRFbWl0dGVyPHsgaXNBdXRoZW50aWNhdGVkOiBib29sZWFuOyB1c2VyOiBIeXBoYVVzZXIgfCBudWxsIH0+KCk7XG4gICAgcmVhZG9ubHkgb25BdXRoU3RhdGVDaGFuZ2VkID0gdGhpcy5fb25BdXRoU3RhdGVDaGFuZ2VkLmV2ZW50O1xuXG4gICAgY29uc3RydWN0b3IoY29udGV4dDogdnNjb2RlLkV4dGVuc2lvbkNvbnRleHQpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ/CflJAgSW5pdGlhbGl6aW5nIEh5cGhhQXV0aFByb3ZpZGVyJyk7XG4gICAgICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgIHRoaXMubG9hZFNhdmVkQXV0aCgpO1xuICAgIH1cblxuICAgIHByaXZhdGUgbG9hZFNhdmVkQXV0aCgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfk6UgTG9hZGluZyBzYXZlZCBhdXRoZW50aWNhdGlvbiBkYXRhJyk7XG4gICAgICAgIC8vIExvYWQgdG9rZW4gZnJvbSB3b3Jrc3BhY2Ugc3RhdGVcbiAgICAgICAgdGhpcy50b2tlbiA9IHRoaXMuY29udGV4dC53b3Jrc3BhY2VTdGF0ZS5nZXQoJ2h5cGhhVG9rZW4nKSB8fCBudWxsO1xuICAgICAgICB0aGlzLnVzZXIgPSB0aGlzLmNvbnRleHQud29ya3NwYWNlU3RhdGUuZ2V0KCdoeXBoYVVzZXInKSB8fCBudWxsO1xuICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfk6UgVG9rZW4gbG9hZGVkOicsIHRoaXMudG9rZW4gPyAnWWVzJyA6ICdObycpO1xuICAgICAgICBjb25zb2xlLmxvZygn8J+TpSBVc2VyIGxvYWRlZDonLCB0aGlzLnVzZXI/LmVtYWlsIHx8ICdOb25lJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy50b2tlbiAmJiB0aGlzLmlzVG9rZW5WYWxpZCgpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBUb2tlbiBpcyB2YWxpZCwgYXR0ZW1wdGluZyBhdXRvLWNvbm5lY3QnKTtcbiAgICAgICAgICAgIHRoaXMuYXV0b0Nvbm5lY3QoKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLnRva2VuKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn4pqg77iPIFRva2VuIGV4aXN0cyBidXQgaXMgZXhwaXJlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ+KEue+4jyBObyBzYXZlZCB0b2tlbiBmb3VuZCcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpc1Rva2VuVmFsaWQoKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IHRva2VuRXhwaXJ5ID0gdGhpcy5jb250ZXh0LndvcmtzcGFjZVN0YXRlLmdldCgnaHlwaGFUb2tlbkV4cGlyeScpO1xuICAgICAgICBjb25zdCBpc1ZhbGlkID0gdG9rZW5FeHBpcnkgJiYgbmV3IERhdGUodG9rZW5FeHBpcnkgYXMgc3RyaW5nKSA+IG5ldyBEYXRlKCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5WSIFRva2VuIHZhbGlkaXR5IGNoZWNrIC0gRXhwaXJlczonLCB0b2tlbkV4cGlyeSwgJ1ZhbGlkOicsICEhaXNWYWxpZCk7XG4gICAgICAgIHJldHVybiAhIWlzVmFsaWQ7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzYXZlQXV0aCh0b2tlbjogc3RyaW5nLCB1c2VyPzogSHlwaGFVc2VyKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5K+IFNhdmluZyBhdXRoZW50aWNhdGlvbiBkYXRhIGZvciB1c2VyOicsIHVzZXI/LmVtYWlsIHx8ICd1bmtub3duJyk7XG4gICAgICAgIHRoaXMudG9rZW4gPSB0b2tlbjtcbiAgICAgICAgdGhpcy51c2VyID0gdXNlciB8fCBudWxsO1xuICAgICAgICBcbiAgICAgICAgYXdhaXQgdGhpcy5jb250ZXh0LndvcmtzcGFjZVN0YXRlLnVwZGF0ZSgnaHlwaGFUb2tlbicsIHRva2VuKTtcbiAgICAgICAgYXdhaXQgdGhpcy5jb250ZXh0LndvcmtzcGFjZVN0YXRlLnVwZGF0ZSgnaHlwaGFVc2VyJywgdXNlcik7XG4gICAgICAgIGF3YWl0IHRoaXMuY29udGV4dC53b3Jrc3BhY2VTdGF0ZS51cGRhdGUoJ2h5cGhhVG9rZW5FeHBpcnknLCBcbiAgICAgICAgICAgIG5ldyBEYXRlKERhdGUubm93KCkgKyAzICogNjAgKiA2MCAqIDEwMDApLnRvSVNPU3RyaW5nKCkpO1xuICAgICAgICBjb25zb2xlLmxvZygn8J+SviBBdXRoZW50aWNhdGlvbiBkYXRhIHNhdmVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgICBcbiAgICAgICAgLy8gRmlyZSBhdXRoIHN0YXRlIGNoYW5nZWQgZXZlbnRcbiAgICAgICAgdGhpcy5maXJlQXV0aFN0YXRlQ2hhbmdlZCgpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgY2xlYXJBdXRoKCkge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+Xke+4jyBDbGVhcmluZyBhdXRoZW50aWNhdGlvbiBkYXRhJyk7XG4gICAgICAgIHRoaXMudG9rZW4gPSBudWxsO1xuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB0aGlzLmNsaWVudCA9IG51bGw7XG4gICAgICAgIHRoaXMuc2VydmVyID0gbnVsbDtcbiAgICAgICAgdGhpcy5pc0Nvbm5lY3RpbmcgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5jb25uZWN0aW9uUHJvbWlzZSA9IG51bGw7XG4gICAgICAgIFxuICAgICAgICBhd2FpdCB0aGlzLmNvbnRleHQud29ya3NwYWNlU3RhdGUudXBkYXRlKCdoeXBoYVRva2VuJywgdW5kZWZpbmVkKTtcbiAgICAgICAgYXdhaXQgdGhpcy5jb250ZXh0LndvcmtzcGFjZVN0YXRlLnVwZGF0ZSgnaHlwaGFVc2VyJywgdW5kZWZpbmVkKTtcbiAgICAgICAgYXdhaXQgdGhpcy5jb250ZXh0LndvcmtzcGFjZVN0YXRlLnVwZGF0ZSgnaHlwaGFUb2tlbkV4cGlyeScsIHVuZGVmaW5lZCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5eR77iPIEF1dGhlbnRpY2F0aW9uIGRhdGEgY2xlYXJlZCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gRmlyZSBhdXRoIHN0YXRlIGNoYW5nZWQgZXZlbnRcbiAgICAgICAgdGhpcy5maXJlQXV0aFN0YXRlQ2hhbmdlZCgpO1xuICAgIH1cblxuICAgIGFzeW5jIGxvZ2luKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+UkCBTdGFydGluZyBsb2dpbiBwcm9jZXNzIHRvOicsIHRoaXMuc2VydmVyVXJsKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEltcG9ydCBoeXBoYS1ycGMgZHluYW1pY2FsbHlcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OmIEltcG9ydGluZyBoeXBoYS1ycGMgbW9kdWxlJyk7XG4gICAgICAgICAgICBjb25zdCB7IGh5cGhhV2Vic29ja2V0Q2xpZW50IH0gPSBhd2FpdCBpbXBvcnQoJ2h5cGhhLXJwYycpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk6YgaHlwaGEtcnBjIG1vZHVsZSBpbXBvcnRlZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgY29uZmlnOiBMb2dpbkNvbmZpZyA9IHtcbiAgICAgICAgICAgICAgICBzZXJ2ZXJfdXJsOiB0aGlzLnNlcnZlclVybCxcbiAgICAgICAgICAgICAgICBsb2dpbl9jYWxsYmFjazogKGNvbnRleHQ6IHsgbG9naW5fdXJsOiBzdHJpbmcgfSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+MkCBPcGVuaW5nIGxvZ2luIFVSTDonLCBjb250ZXh0LmxvZ2luX3VybCk7XG4gICAgICAgICAgICAgICAgICAgIHZzY29kZS5lbnYub3BlbkV4dGVybmFsKHZzY29kZS5VcmkucGFyc2UoY29udGV4dC5sb2dpbl91cmwpKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflJAgUmVxdWVzdGluZyBsb2dpbiB0b2tlbiBmcm9tIHNlcnZlcicpO1xuICAgICAgICAgICAgY29uc3QgdG9rZW4gPSBhd2FpdCBoeXBoYVdlYnNvY2tldENsaWVudC5sb2dpbihjb25maWcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodG9rZW4pIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIExvZ2luIHRva2VuIHJlY2VpdmVkLCBlc3RhYmxpc2hpbmcgY29ubmVjdGlvbicpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuY29ubmVjdCh0b2tlbik7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KchSBMb2dpbiBzdWNjZXNzZnVsJyk7XG4gICAgICAgICAgICAgICAgdnNjb2RlLndpbmRvdy5zaG93SW5mb3JtYXRpb25NZXNzYWdlKCdTdWNjZXNzZnVsbHkgbG9nZ2VkIGludG8gSHlwaGEgc2VydmVyJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinYwgRmFpbGVkIHRvIG9idGFpbiBhdXRoZW50aWNhdGlvbiB0b2tlbicpO1xuICAgICAgICAgICAgICAgIHZzY29kZS53aW5kb3cuc2hvd0Vycm9yTWVzc2FnZSgnRmFpbGVkIHRvIG9idGFpbiBhdXRoZW50aWNhdGlvbiB0b2tlbicpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBMb2dpbiBmYWlsZWQ6JywgZXJyb3IpO1xuICAgICAgICAgICAgdnNjb2RlLndpbmRvdy5zaG93RXJyb3JNZXNzYWdlKGBMb2dpbiBmYWlsZWQ6ICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNvbm5lY3QodG9rZW46IHN0cmluZykge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+UlyBFc3RhYmxpc2hpbmcgY29ubmVjdGlvbiB0byBIeXBoYSBzZXJ2ZXInKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgaHlwaGFXZWJzb2NrZXRDbGllbnQgfSA9IGF3YWl0IGltcG9ydCgnaHlwaGEtcnBjJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5SXIENvbm5lY3Rpbmcgd2l0aCB0b2tlbiB0bzonLCB0aGlzLnNlcnZlclVybCk7XG4gICAgICAgICAgICB0aGlzLnNlcnZlciA9IGF3YWl0IGh5cGhhV2Vic29ja2V0Q2xpZW50LmNvbm5lY3RUb1NlcnZlcih7XG4gICAgICAgICAgICAgICAgc2VydmVyX3VybDogdGhpcy5zZXJ2ZXJVcmwsXG4gICAgICAgICAgICAgICAgdG9rZW46IHRva2VuLFxuICAgICAgICAgICAgICAgIG1ldGhvZF90aW1lb3V0OiAxODAwMDAsXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgdXNlciA9IHRoaXMuc2VydmVyLmNvbmZpZy51c2VyO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflJcgQ29ubmVjdGlvbiBlc3RhYmxpc2hlZCBmb3IgdXNlcjonLCB1c2VyPy5lbWFpbCB8fCAndW5rbm93bicpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zYXZlQXV0aCh0b2tlbiwgdXNlcik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwi4pyFIENvbm5lY3RlZCB0byBIeXBoYSBzZXJ2ZXIgYXM6XCIsIHVzZXIpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIENvbm5lY3Rpb24gZmFpbGVkOicsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBhdXRvQ29ubmVjdCgpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ/CflIQgQXR0ZW1wdGluZyBhdXRvLWNvbm5lY3Qgd2l0aCBzYXZlZCB0b2tlbicpO1xuICAgICAgICBpZiAodGhpcy50b2tlbiAmJiB0aGlzLmlzVG9rZW5WYWxpZCgpKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuY29ubmVjdCh0aGlzLnRva2VuKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIEF1dG8tY29ubmVjdCBzdWNjZXNzZnVsJyk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBBdXRvLWNvbm5lY3QgZmFpbGVkOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+Xke+4jyBDbGVhcmluZyBpbnZhbGlkIGF1dGhlbnRpY2F0aW9uIGRhdGEnKTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmNsZWFyQXV0aCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgbG9nb3V0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+UkyBTdGFydGluZyBsb2dvdXQgcHJvY2VzcycpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5jbGVhckF1dGgoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgTG9nb3V0IHN1Y2Nlc3NmdWwnKTtcbiAgICAgICAgICAgIHZzY29kZS53aW5kb3cuc2hvd0luZm9ybWF0aW9uTWVzc2FnZSgnTG9nZ2VkIG91dCBmcm9tIEh5cGhhIHNlcnZlcicpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIExvZ291dCBlcnJvcjonLCBlcnJvcik7XG4gICAgICAgICAgICB2c2NvZGUud2luZG93LnNob3dFcnJvck1lc3NhZ2UoYExvZ291dCBmYWlsZWQ6ICR7ZXJyb3J9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpc0F1dGhlbnRpY2F0ZWQoKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGF1dGhlbnRpY2F0ZWQgPSB0aGlzLnRva2VuICE9PSBudWxsICYmIHRoaXMuaXNUb2tlblZhbGlkKCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5SNIEF1dGhlbnRpY2F0aW9uIGNoZWNrIC0gQXV0aGVudGljYXRlZDonLCBhdXRoZW50aWNhdGVkLCAnSGFzIHRva2VuOicsICEhdGhpcy50b2tlbiwgJ1Rva2VuIHZhbGlkOicsIHRoaXMudG9rZW4gPyB0aGlzLmlzVG9rZW5WYWxpZCgpIDogZmFsc2UpO1xuICAgICAgICByZXR1cm4gYXV0aGVudGljYXRlZDtcbiAgICB9XG5cbiAgICBnZXRVc2VyKCk6IEh5cGhhVXNlciB8IG51bGwge1xuICAgICAgICByZXR1cm4gdGhpcy51c2VyO1xuICAgIH1cblxuICAgIGdldFRva2VuKCk6IHN0cmluZyB8IG51bGwge1xuICAgICAgICByZXR1cm4gdGhpcy50b2tlbjtcbiAgICB9XG5cbiAgICBhc3luYyBnZXRTZXJ2ZXIoKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgLy8gSWYgd2UgYWxyZWFkeSBoYXZlIGEgc2VydmVyIGNvbm5lY3Rpb24sIHJldHVybiBpdFxuICAgICAgICBpZiAodGhpcy5zZXJ2ZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5SXIFNlcnZlciBjb25uZWN0aW9uIGFscmVhZHkgYXZhaWxhYmxlJyk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZXJ2ZXI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiB3ZSdyZSBhbHJlYWR5IGluIHRoZSBwcm9jZXNzIG9mIGNvbm5lY3RpbmcsIHdhaXQgZm9yIHRoYXQgdG8gY29tcGxldGVcbiAgICAgICAgaWYgKHRoaXMuaXNDb25uZWN0aW5nICYmIHRoaXMuY29ubmVjdGlvblByb21pc2UpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5SEIENvbm5lY3Rpb24gYWxyZWFkeSBpbiBwcm9ncmVzcywgd2FpdGluZy4uLicpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmNvbm5lY3Rpb25Qcm9taXNlO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnNlcnZlcjtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIENvbm5lY3Rpb24gaW4gcHJvZ3Jlc3MgZmFpbGVkOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHdlIGhhdmUgYSB2YWxpZCB0b2tlbiBidXQgbm8gc2VydmVyIGNvbm5lY3Rpb24sIGF0dGVtcHQgdG8gY29ubmVjdFxuICAgICAgICBpZiAodGhpcy50b2tlbiAmJiB0aGlzLmlzVG9rZW5WYWxpZCgpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBObyBzZXJ2ZXIgY29ubmVjdGlvbiBidXQgdmFsaWQgdG9rZW4gYXZhaWxhYmxlLCBhdHRlbXB0aW5nIHRvIGNvbm5lY3QnKTtcbiAgICAgICAgICAgIHRoaXMuaXNDb25uZWN0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvblByb21pc2UgPSB0aGlzLmNvbm5lY3RXaXRoRXhpc3RpbmdUb2tlbigpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuY29ubmVjdGlvblByb21pc2U7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VydmVyO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRmFpbGVkIHRvIGNvbm5lY3Qgd2l0aCBleGlzdGluZyB0b2tlbjonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5jbGVhckF1dGgoKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBlc3RhYmxpc2ggc2VydmVyIGNvbm5lY3Rpb24gd2l0aCBleGlzdGluZyB0b2tlbicpO1xuICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICB0aGlzLmlzQ29ubmVjdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMuY29ubmVjdGlvblByb21pc2UgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gTm8gdmFsaWQgdG9rZW4gYXZhaWxhYmxlLCBuZWVkIHRvIGF1dGhlbnRpY2F0ZVxuICAgICAgICBjb25zb2xlLmxvZygn4p2MIE5vIHNlcnZlciBjb25uZWN0aW9uIGFuZCBubyB2YWxpZCB0b2tlbiAtIGF1dGhlbnRpY2F0aW9uIHJlcXVpcmVkJyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gc2VydmVyIGNvbm5lY3Rpb24gYXZhaWxhYmxlIC0gYXV0aGVudGljYXRpb24gcmVxdWlyZWQuIFBsZWFzZSBsb2dpbiBmaXJzdC4nKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNvbm5lY3RXaXRoRXhpc3RpbmdUb2tlbigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKCF0aGlzLnRva2VuKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIHRva2VuIGF2YWlsYWJsZSBmb3IgY29ubmVjdGlvbicpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5jb25uZWN0KHRoaXMudG9rZW4pO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ+KchSBTdWNjZXNzZnVsbHkgY29ubmVjdGVkIHdpdGggZXhpc3RpbmcgdG9rZW4nKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBGYWlsZWQgdG8gY29ubmVjdCB3aXRoIGV4aXN0aW5nIHRva2VuOicsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgZW5zdXJlQ29ubmVjdGlvbigpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0U2VydmVyKCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UkCBDb25uZWN0aW9uIGZhaWxlZCwgcHJvbXB0aW5nIGZvciBsb2dpbicpO1xuICAgICAgICAgICAgdnNjb2RlLndpbmRvdy5zaG93V2FybmluZ01lc3NhZ2UoXG4gICAgICAgICAgICAgICAgJ0h5cGhhIHNlcnZlciBjb25uZWN0aW9uIHJlcXVpcmVkLiBQbGVhc2UgbG9naW4gdG8gY29udGludWUuJyxcbiAgICAgICAgICAgICAgICAnTG9naW4nXG4gICAgICAgICAgICApLnRoZW4oc2VsZWN0aW9uID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0aW9uID09PSAnTG9naW4nKSB7XG4gICAgICAgICAgICAgICAgICAgIHZzY29kZS5jb21tYW5kcy5leGVjdXRlQ29tbWFuZCgnaHlwaGEubG9naW4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgZ2V0QXJ0aWZhY3RNYW5hZ2VyKCk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn46vIEdldHRpbmcgYXJ0aWZhY3QgbWFuYWdlciBzZXJ2aWNlJyk7XG4gICAgICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuZ2V0U2VydmVyKCk7XG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfjq8gUmVxdWVzdGluZyBhcnRpZmFjdCBtYW5hZ2VyIHNlcnZpY2UgZnJvbSBzZXJ2ZXInKTtcbiAgICAgICAgICAgIGNvbnN0IGFydGlmYWN0TWFuYWdlciA9IGF3YWl0IHNlcnZlci5nZXRTZXJ2aWNlKFwicHVibGljL2FydGlmYWN0LW1hbmFnZXJcIik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+OryBBcnRpZmFjdCBtYW5hZ2VyIHNlcnZpY2Ugb2J0YWluZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gICAgICAgICAgICByZXR1cm4gYXJ0aWZhY3RNYW5hZ2VyO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEZhaWxlZCB0byBnZXQgYXJ0aWZhY3QgbWFuYWdlcjonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgZmlyZUF1dGhTdGF0ZUNoYW5nZWQoKSB7XG4gICAgICAgIGNvbnN0IGlzQXV0aGVudGljYXRlZCA9IHRoaXMuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5SEIEZpcmluZyBhdXRoIHN0YXRlIGNoYW5nZWQgZXZlbnQgLSBhdXRoZW50aWNhdGVkOicsIGlzQXV0aGVudGljYXRlZCwgJ3VzZXI6JywgdGhpcy51c2VyPy5lbWFpbCB8fCAnbm9uZScpO1xuICAgICAgICB0aGlzLl9vbkF1dGhTdGF0ZUNoYW5nZWQuZmlyZSh7IGlzQXV0aGVudGljYXRlZCwgdXNlcjogdGhpcy51c2VyIH0pO1xuICAgIH1cblxuICAgIGRpc3Bvc2UoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5eR77iPIERpc3Bvc2luZyBIeXBoYUF1dGhQcm92aWRlcicpO1xuICAgICAgICB0aGlzLl9vbkF1dGhTdGF0ZUNoYW5nZWQuZGlzcG9zZSgpO1xuICAgIH1cbn0gIiwiaW1wb3J0ICogYXMgdnNjb2RlIGZyb20gJ3ZzY29kZSc7XG5pbXBvcnQgeyBIeXBoYUF1dGhQcm92aWRlciB9IGZyb20gJy4vSHlwaGFBdXRoUHJvdmlkZXInO1xuXG5pbnRlcmZhY2UgUHJvamVjdEZpbGUge1xuICAgIG5hbWU6IHN0cmluZztcbiAgICBwYXRoOiBzdHJpbmc7XG4gICAgdHlwZTogJ2ZpbGUnIHwgJ2RpcmVjdG9yeSc7XG4gICAgY29udGVudD86IHN0cmluZztcbiAgICBjcmVhdGVkX2F0Pzogc3RyaW5nO1xuICAgIG1vZGlmaWVkX2F0Pzogc3RyaW5nO1xuICAgIHNpemU/OiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBQcm9qZWN0IHtcbiAgICBpZDogc3RyaW5nO1xuICAgIG1hbmlmZXN0OiB7XG4gICAgICAgIG5hbWU6IHN0cmluZztcbiAgICAgICAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgICAgICAgdmVyc2lvbjogc3RyaW5nO1xuICAgICAgICB0eXBlOiBzdHJpbmc7XG4gICAgICAgIGNyZWF0ZWRfYXQ6IHN0cmluZztcbiAgICB9O1xuICAgIGZpbGVzPzogUHJvamVjdEZpbGVbXTtcbn1cblxuZXhwb3J0IGNsYXNzIEh5cGhhRmlsZVN5c3RlbVByb3ZpZGVyIGltcGxlbWVudHMgdnNjb2RlLkZpbGVTeXN0ZW1Qcm92aWRlciB7XG4gICAgcHJpdmF0ZSBhdXRoUHJvdmlkZXI6IEh5cGhhQXV0aFByb3ZpZGVyO1xuICAgIHByaXZhdGUgX2VtaXR0ZXIgPSBuZXcgdnNjb2RlLkV2ZW50RW1pdHRlcjx2c2NvZGUuRmlsZUNoYW5nZUV2ZW50W10+KCk7XG4gICAgcHJpdmF0ZSBfY2FjaGUgPSBuZXcgTWFwPHN0cmluZywgVWludDhBcnJheT4oKTtcbiAgICBwcml2YXRlIGFydGlmYWN0TWFuYWdlcjogYW55ID0gbnVsbDtcbiAgICBwcml2YXRlIGlzSW5pdGlhbGl6aW5nID0gZmFsc2U7XG4gICAgcHJpdmF0ZSBpbml0aWFsaXphdGlvblByb21pc2U6IFByb21pc2U8dm9pZD4gfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIGxhc3RJbml0QXR0ZW1wdCA9IDA7XG4gICAgcHJpdmF0ZSBpbml0Q29vbGRvd24gPSA1MDAwOyAvLyA1IHNlY29uZHMgY29vbGRvd24gYmV0d2VlbiBpbml0IGF0dGVtcHRzXG4gICAgcHJpdmF0ZSBhcnRpZmFjdENhY2hlID0gbmV3IE1hcDxzdHJpbmcsIHsgYXJ0aWZhY3Q6IGFueSB8IG51bGw7IHRpbWVzdGFtcDogbnVtYmVyIH0+KCk7XG4gICAgcHJpdmF0ZSBjYWNoZVRpbWVvdXQgPSAzMDAwMDA7IC8vIDUgbWludXRlcyBjYWNoZSBmb3IgYXJ0aWZhY3RzXG5cbiAgICByZWFkb25seSBvbkRpZENoYW5nZUZpbGU6IHZzY29kZS5FdmVudDx2c2NvZGUuRmlsZUNoYW5nZUV2ZW50W10+ID0gdGhpcy5fZW1pdHRlci5ldmVudDtcblxuICAgIGNvbnN0cnVjdG9yKGF1dGhQcm92aWRlcjogSHlwaGFBdXRoUHJvdmlkZXIpIHtcbiAgICAgICAgdGhpcy5hdXRoUHJvdmlkZXIgPSBhdXRoUHJvdmlkZXI7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5eC77iPIEh5cGhhRmlsZVN5c3RlbVByb3ZpZGVyIGluaXRpYWxpemVkLCBzdGFydGluZyBhcnRpZmFjdCBtYW5hZ2VyIGluaXRpYWxpemF0aW9uJyk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUFydGlmYWN0TWFuYWdlcigpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0QXJ0aWZhY3RDYWNoZWQoYXJ0aWZhY3RJZDogc3RyaW5nKTogUHJvbWlzZTxhbnkgfCBudWxsPiB7XG4gICAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIGNvbnN0IGNhY2hlZCA9IHRoaXMuYXJ0aWZhY3RDYWNoZS5nZXQoYXJ0aWZhY3RJZCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoY2FjaGVkICYmIChub3cgLSBjYWNoZWQudGltZXN0YW1wKSA8IHRoaXMuY2FjaGVUaW1lb3V0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+OryBVc2luZyBjYWNoZWQgYXJ0aWZhY3QgZm9yJywgYXJ0aWZhY3RJZCwgJzonLCBjYWNoZWQuYXJ0aWZhY3Q/Lm1hbmlmZXN0Py5uYW1lIHx8ICdudWxsJyk7XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkLmFydGlmYWN0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflIQgRmV0Y2hpbmcgZnJlc2ggYXJ0aWZhY3QgZGF0YSBmb3InLCBhcnRpZmFjdElkKTtcbiAgICAgICAgICAgIGNvbnN0IGFydGlmYWN0ID0gYXdhaXQgdGhpcy5nZXRBcnRpZmFjdChhcnRpZmFjdElkKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FjaGUgdGhlIHJlc3VsdCAoaW5jbHVkaW5nIG51bGwgcmVzdWx0cylcbiAgICAgICAgICAgIHRoaXMuYXJ0aWZhY3RDYWNoZS5zZXQoYXJ0aWZhY3RJZCwgeyBhcnRpZmFjdCwgdGltZXN0YW1wOiBub3cgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChhcnRpZmFjdCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn46vIENhY2hlZCBhcnRpZmFjdCBmb3InLCBhcnRpZmFjdElkLCAnOicsIGFydGlmYWN0Lm1hbmlmZXN0Py5uYW1lLCAndHlwZTonLCBhcnRpZmFjdC50eXBlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfjq8gQ2FjaGVkIG5vdC1mb3VuZCByZXN1bHQgZm9yJywgYXJ0aWZhY3RJZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiBhcnRpZmFjdDtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBGYWlsZWQgdG8gZ2V0IGFydGlmYWN0IGZvcicsIGFydGlmYWN0SWQsICc6JywgZXJyb3IpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDYWNoZSBlcnJvciByZXN1bHRzIHRvIGF2b2lkIHJlcGVhdGVkIGF0dGVtcHRzXG4gICAgICAgICAgICB0aGlzLmFydGlmYWN0Q2FjaGUuc2V0KGFydGlmYWN0SWQsIHsgYXJ0aWZhY3Q6IG51bGwsIHRpbWVzdGFtcDogbm93IH0pO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldEFydGlmYWN0VHlwZUNhY2hlZChhcnRpZmFjdElkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+IHtcbiAgICAgICAgY29uc3QgYXJ0aWZhY3QgPSBhd2FpdCB0aGlzLmdldEFydGlmYWN0Q2FjaGVkKGFydGlmYWN0SWQpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGFydGlmYWN0KSB7XG4gICAgICAgICAgICBjb25zdCB0eXBlID0gYXJ0aWZhY3QudHlwZSB8fCAnYXJ0aWZhY3QnO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfjq8gRXh0cmFjdGVkIHR5cGUgZnJvbSBjYWNoZWQgYXJ0aWZhY3QnLCBhcnRpZmFjdElkLCAnOicsIHR5cGUpO1xuICAgICAgICAgICAgcmV0dXJuIHR5cGU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+OryBObyBhcnRpZmFjdCBmb3VuZCBmb3IgdHlwZSBleHRyYWN0aW9uOicsIGFydGlmYWN0SWQpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGludmFsaWRhdGVBcnRpZmFjdENhY2hlKGFydGlmYWN0SWQ/OiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgaWYgKGFydGlmYWN0SWQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5eR77iPIEludmFsaWRhdGluZyBjYWNoZSBmb3IgYXJ0aWZhY3Q6JywgYXJ0aWZhY3RJZCk7XG4gICAgICAgICAgICB0aGlzLmFydGlmYWN0Q2FjaGUuZGVsZXRlKGFydGlmYWN0SWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfl5HvuI8gQ2xlYXJpbmcgZW50aXJlIGFydGlmYWN0IGNhY2hlJyk7XG4gICAgICAgICAgICB0aGlzLmFydGlmYWN0Q2FjaGUuY2xlYXIoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgY2xlYXJFeHBpcmVkQ2FjaGUoKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIGNvbnN0IGV4cGlyZWRLZXlzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCBjYWNoZWRdIG9mIHRoaXMuYXJ0aWZhY3RDYWNoZS5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIGlmIChub3cgLSBjYWNoZWQudGltZXN0YW1wID49IHRoaXMuY2FjaGVUaW1lb3V0KSB7XG4gICAgICAgICAgICAgICAgZXhwaXJlZEtleXMucHVzaChrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoZXhwaXJlZEtleXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfl5HvuI8gQ2xlYXJpbmcnLCBleHBpcmVkS2V5cy5sZW5ndGgsICdleHBpcmVkIGNhY2hlIGVudHJpZXMnKTtcbiAgICAgICAgICAgIGV4cGlyZWRLZXlzLmZvckVhY2goa2V5ID0+IHRoaXMuYXJ0aWZhY3RDYWNoZS5kZWxldGUoa2V5KSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc29sdmVBcnRpZmFjdFBhdGgocGF0aDogc3RyaW5nKTogUHJvbWlzZTx7IGFydGlmYWN0SWQ6IHN0cmluZzsgZmlsZVBhdGg/OiBzdHJpbmcgfT4ge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+UjSBSZXNvbHZpbmcgYXJ0aWZhY3QgcGF0aDonLCBwYXRoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBsZWFkaW5nIHNsYXNoIGFuZCBzcGxpdCBpbnRvIHNlZ21lbnRzXG4gICAgICAgIGNvbnN0IHNlZ21lbnRzID0gcGF0aC5zdWJzdHJpbmcoMSkuc3BsaXQoJy8nKS5maWx0ZXIocyA9PiBzKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChzZWdtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIC8vIFJvb3QgcGF0aCAtIHRoaXMgc2hvdWxkIGJlIGhhbmRsZWQgYnkgdGhlIHdvcmtzcGFjZSByb290IGxvZ2ljXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCByZXNvbHZlIGVtcHR5IHBhdGgnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgbGV0IGN1cnJlbnRBcnRpZmFjdElkID0gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBUcmF2ZXJzZSBzZWdtZW50cyB0byBmaW5kIHRoZSBkZWVwZXN0IGFydGlmYWN0XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2VnbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHNlZ21lbnQgPSBzZWdtZW50c1tpXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAvLyBGaXJzdCBzZWdtZW50IC0gdGVzdCBhcyByb290IGFydGlmYWN0XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflI0gVGVzdGluZyByb290IGFydGlmYWN0IElEOicsIHNlZ21lbnQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFydGlmYWN0VHlwZSA9IGF3YWl0IHRoaXMuZ2V0QXJ0aWZhY3RUeXBlQ2FjaGVkKHNlZ21lbnQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChhcnRpZmFjdFR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEFydGlmYWN0SWQgPSBzZWdtZW50O1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIEZvdW5kIHJvb3QgYXJ0aWZhY3Q6JywgY3VycmVudEFydGlmYWN0SWQsICd0eXBlOicsIGFydGlmYWN0VHlwZSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoYXJ0aWZhY3RUeXBlICE9PSAnY29sbGVjdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5vdCBhIGNvbGxlY3Rpb24sIHJlbWFpbmluZyBzZWdtZW50cyBhcmUgZmlsZSBwYXRoXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZW1haW5pbmdTZWdtZW50cyA9IHNlZ21lbnRzLnNsaWNlKGkgKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcmVtYWluaW5nU2VnbWVudHMubGVuZ3RoID4gMCA/IHJlbWFpbmluZ1NlZ21lbnRzLmpvaW4oJy8nKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn46vIEZpbmFsIHJlc29sdXRpb24gLSBBcnRpZmFjdDonLCBjdXJyZW50QXJ0aWZhY3RJZCwgJ0ZpbGVQYXRoOicsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IGFydGlmYWN0SWQ6IGN1cnJlbnRBcnRpZmFjdElkLCBmaWxlUGF0aCB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIENvbnRpbnVlIHRvIGNoZWNrIGlmIG5leHQgc2VnbWVudCBpcyBhIGNoaWxkIGFydGlmYWN0XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KdjCBSb290IGFydGlmYWN0IG5vdCBmb3VuZDonLCBzZWdtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSb290IGFydGlmYWN0ICcke3NlZ21lbnR9JyBub3QgZm91bmRgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZvciBzdWJzZXF1ZW50IHNlZ21lbnRzLCBpZiBjdXJyZW50IGFydGlmYWN0IGlzIGEgY29sbGVjdGlvbixcbiAgICAgICAgICAgICAgICAvLyBjaGVjayBpZiB0aGlzIHNlZ21lbnQgaXMgYSBkaXJlY3QgY2hpbGQgYXJ0aWZhY3RcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudEFydGlmYWN0SWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/CflI0gVGVzdGluZyBjaGlsZCBhcnRpZmFjdDonLCBzZWdtZW50LCAnb2YgcGFyZW50OicsIGN1cnJlbnRBcnRpZmFjdElkKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEZpcnN0IGNoZWNrIGlmIHRoZSBjdXJyZW50IGFydGlmYWN0IGlzIGEgY29sbGVjdGlvblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnRUeXBlID0gYXdhaXQgdGhpcy5nZXRBcnRpZmFjdFR5cGVDYWNoZWQoY3VycmVudEFydGlmYWN0SWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFyZW50VHlwZSA9PT0gJ2NvbGxlY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBHZXQgY2hpbGQgYXJ0aWZhY3RzIHRvIHNlZSBpZiB0aGlzIHNlZ21lbnQgbWF0Y2hlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hpbGRBcnRpZmFjdHMgPSBhd2FpdCB0aGlzLmxpc3RDaGlsZEFydGlmYWN0cyhjdXJyZW50QXJ0aWZhY3RJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtYXRjaGluZ0NoaWxkID0gY2hpbGRBcnRpZmFjdHMuZmluZChjaGlsZCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hpbGROYW1lID0gY2hpbGQuaWQuaW5jbHVkZXMoJy8nKSA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZC5pZC5zcGxpdCgnLycpLnBvcCgpIDogXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkLmlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZE5hbWUgPT09IHNlZ21lbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1hdGNoaW5nQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3VuZCBtYXRjaGluZyBjaGlsZCBhcnRpZmFjdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRBcnRpZmFjdElkID0gbWF0Y2hpbmdDaGlsZC5pZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIEZvdW5kIGNoaWxkIGFydGlmYWN0OicsIGN1cnJlbnRBcnRpZmFjdElkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGNoaWxkIGlzIGFsc28gYSBjb2xsZWN0aW9uIG9yIGhhcyByZW1haW5pbmcgc2VnbWVudHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjaGlsZFR5cGUgPSBhd2FpdCB0aGlzLmdldEFydGlmYWN0VHlwZUNhY2hlZChtYXRjaGluZ0NoaWxkLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hpbGRUeXBlICE9PSAnY29sbGVjdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm90IGEgY29sbGVjdGlvbiwgcmVtYWluaW5nIHNlZ21lbnRzIGFyZSBmaWxlIHBhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVtYWluaW5nU2VnbWVudHMgPSBzZWdtZW50cy5zbGljZShpICsgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcmVtYWluaW5nU2VnbWVudHMubGVuZ3RoID4gMCA/IHJlbWFpbmluZ1NlZ21lbnRzLmpvaW4oJy8nKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfjq8gRmluYWwgcmVzb2x1dGlvbiAtIEFydGlmYWN0OicsIGN1cnJlbnRBcnRpZmFjdElkLCAnRmlsZVBhdGg6JywgZmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBhcnRpZmFjdElkOiBjdXJyZW50QXJ0aWZhY3RJZCwgZmlsZVBhdGggfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ29udGludWUgdG8gY2hlY2sgbmV4dCBzZWdtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlZ21lbnQgaXMgbm90IGEgY2hpbGQgYXJ0aWZhY3QsIHNvIGl0J3MgcGFydCBvZiBmaWxlIHBhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZW1haW5pbmdTZWdtZW50cyA9IHNlZ21lbnRzLnNsaWNlKGkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcmVtYWluaW5nU2VnbWVudHMubGVuZ3RoID4gMCA/IHJlbWFpbmluZ1NlZ21lbnRzLmpvaW4oJy8nKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+OryBGaW5hbCByZXNvbHV0aW9uIC0gQXJ0aWZhY3Q6JywgY3VycmVudEFydGlmYWN0SWQsICdGaWxlUGF0aDonLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgYXJ0aWZhY3RJZDogY3VycmVudEFydGlmYWN0SWQsIGZpbGVQYXRoIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQYXJlbnQgaXMgbm90IGEgY29sbGVjdGlvbiwgcmVtYWluaW5nIHNlZ21lbnRzIGFyZSBmaWxlIHBhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbWFpbmluZ1NlZ21lbnRzID0gc2VnbWVudHMuc2xpY2UoaSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHJlbWFpbmluZ1NlZ21lbnRzLmxlbmd0aCA+IDAgPyByZW1haW5pbmdTZWdtZW50cy5qb2luKCcvJykgOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+OryBGaW5hbCByZXNvbHV0aW9uIC0gQXJ0aWZhY3Q6JywgY3VycmVudEFydGlmYWN0SWQsICdGaWxlUGF0aDonLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBhcnRpZmFjdElkOiBjdXJyZW50QXJ0aWZhY3RJZCwgZmlsZVBhdGggfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWxsIHNlZ21lbnRzIHdlcmUgdHJhdmVyc2VkLCBjdXJyZW50QXJ0aWZhY3RJZCBpcyB0aGUgZmluYWwgYXJ0aWZhY3RcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfjq8gRmluYWwgcmVzb2x1dGlvbiAtIEFydGlmYWN0OicsIGN1cnJlbnRBcnRpZmFjdElkLCAnRmlsZVBhdGg6IG5vbmUnKTtcbiAgICAgICAgcmV0dXJuIHsgYXJ0aWZhY3RJZDogY3VycmVudEFydGlmYWN0SWQgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGluaXRpYWxpemVBcnRpZmFjdE1hbmFnZXIoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY29vbGRvd24gdG8gcHJldmVudCByYXBpZCBzdWNjZXNzaXZlIGNhbGxzXG4gICAgICAgIGlmIChub3cgLSB0aGlzLmxhc3RJbml0QXR0ZW1wdCA8IHRoaXMuaW5pdENvb2xkb3duKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBJbml0aWFsaXphdGlvbiBjb29sZG93biBhY3RpdmUsIHNraXBwaW5nIGF0dGVtcHQnKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluaXRpYWxpemF0aW9uUHJvbWlzZSB8fCBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmlzSW5pdGlhbGl6aW5nIHx8IHRoaXMuYXJ0aWZhY3RNYW5hZ2VyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBJbml0aWFsaXphdGlvbiBhbHJlYWR5IGluIHByb2dyZXNzIG9yIGNvbXBsZXRlZCcpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5pdGlhbGl6YXRpb25Qcm9taXNlIHx8IFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5sYXN0SW5pdEF0dGVtcHQgPSBub3c7XG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXppbmcgPSB0cnVlO1xuICAgICAgICB0aGlzLmluaXRpYWxpemF0aW9uUHJvbWlzZSA9IHRoaXMucGVyZm9ybUluaXRpYWxpemF0aW9uKCk7XG4gICAgICAgIHJldHVybiB0aGlzLmluaXRpYWxpemF0aW9uUHJvbWlzZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHBlcmZvcm1Jbml0aWFsaXphdGlvbigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5SEIEluaXRpYWxpemluZyBhcnRpZmFjdCBtYW5hZ2VyLi4uJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEp1c3QgdHJ5IHRvIGdldCB0aGUgc2VydmVyIGNvbm5lY3Rpb24gZGlyZWN0bHlcbiAgICAgICAgICAgIC8vIEF1dGhlbnRpY2F0aW9uIHdpbGwgYmUgaGFuZGxlZCBieSBnZXRTZXJ2ZXIoKSBpZiBuZWVkZWRcbiAgICAgICAgICAgIGNvbnN0IHNlcnZlciA9IGF3YWl0IHRoaXMuYXV0aFByb3ZpZGVyLmdldFNlcnZlcigpO1xuICAgICAgICAgICAgaWYgKHNlcnZlcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgU2VydmVyIGNvbm5lY3Rpb24gZXN0YWJsaXNoZWQgZHVyaW5nIGluaXRpYWxpemF0aW9uJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5hcnRpZmFjdE1hbmFnZXIgPSBhd2FpdCBzZXJ2ZXIuZ2V0U2VydmljZShcInB1YmxpYy9hcnRpZmFjdC1tYW5hZ2VyXCIpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgQXJ0aWZhY3QgbWFuYWdlciBpbml0aWFsaXplZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KdjCBObyBzZXJ2ZXIgY29ubmVjdGlvbiBhdmFpbGFibGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ+KaoO+4jyBDb3VsZCBub3QgZXN0YWJsaXNoIHNlcnZlciBjb25uZWN0aW9uOicsIGVycm9yLm1lc3NhZ2UpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ+KaoO+4jyBBdXRoZW50aWNhdGlvbiByZXF1aXJlZCAtIGFydGlmYWN0IG1hbmFnZXIgd2lsbCBiZSB1bmF2YWlsYWJsZScpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgdGhpcy5pc0luaXRpYWxpemluZyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBlbnN1cmVBcnRpZmFjdE1hbmFnZXIoKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ/CflI0gZW5zdXJlQXJ0aWZhY3RNYW5hZ2VyIGNhbGxlZCAtIGN1cnJlbnQgc3RhdGU6Jywge1xuICAgICAgICAgICAgaGFzQXJ0aWZhY3RNYW5hZ2VyOiAhIXRoaXMuYXJ0aWZhY3RNYW5hZ2VyLFxuICAgICAgICAgICAgaXNJbml0aWFsaXppbmc6IHRoaXMuaXNJbml0aWFsaXppbmcsXG4gICAgICAgICAgICBsYXN0SW5pdEF0dGVtcHQ6IHRoaXMubGFzdEluaXRBdHRlbXB0LFxuICAgICAgICAgICAgdGltZVNpbmNlTGFzdEluaXQ6IERhdGUubm93KCkgLSB0aGlzLmxhc3RJbml0QXR0ZW1wdFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDbGVhbiB1cCBleHBpcmVkIGNhY2hlIGVudHJpZXMgcGVyaW9kaWNhbGx5XG4gICAgICAgIHRoaXMuY2xlYXJFeHBpcmVkQ2FjaGUoKTtcblxuICAgICAgICBpZiAoIXRoaXMuYXJ0aWZhY3RNYW5hZ2VyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBObyBhcnRpZmFjdCBtYW5hZ2VyLCBhdHRlbXB0aW5nIGluaXRpYWxpemF0aW9uLi4uJyk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmluaXRpYWxpemVBcnRpZmFjdE1hbmFnZXIoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgc3RpbGwgbm8gYXJ0aWZhY3QgbWFuYWdlciwgdHJ5IHRvIGdldCBzZXJ2ZXIgY29ubmVjdGlvbiByZWFjdGl2ZWx5XG4gICAgICAgIGlmICghdGhpcy5hcnRpZmFjdE1hbmFnZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5SEIFN0aWxsIG5vIGFydGlmYWN0IG1hbmFnZXIsIHRyeWluZyByZWFjdGl2ZSBhcHByb2FjaC4uLicpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+UhCBBdHRlbXB0aW5nIHRvIGdldCBzZXJ2ZXIgY29ubmVjdGlvbiByZWFjdGl2ZWx5Jyk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VydmVyID0gYXdhaXQgdGhpcy5hdXRoUHJvdmlkZXIuZ2V0U2VydmVyKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5hcnRpZmFjdE1hbmFnZXIgPSBhd2FpdCBzZXJ2ZXIuZ2V0U2VydmljZShcInB1YmxpYy9hcnRpZmFjdC1tYW5hZ2VyXCIpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgQXJ0aWZhY3QgbWFuYWdlciBvYnRhaW5lZCByZWFjdGl2ZWx5Jyk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEZhaWxlZCB0byBnZXQgYXJ0aWZhY3QgbWFuYWdlciByZWFjdGl2ZWx5OicsIGVycm9yLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQXJ0aWZhY3QgbWFuYWdlciBub3QgYXZhaWxhYmxlIC0gYXV0aGVudGljYXRpb24gcmVxdWlyZWQuIFBsZWFzZSBsb2dpbiBmaXJzdC4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRoaXMuYXJ0aWZhY3RNYW5hZ2VyO1xuICAgIH1cblxuICAgIHdhdGNoKHVyaTogdnNjb2RlLlVyaSwgb3B0aW9uczogeyByZWN1cnNpdmU6IGJvb2xlYW47IGV4Y2x1ZGVzOiBzdHJpbmdbXTsgfSk6IHZzY29kZS5EaXNwb3NhYmxlIHtcbiAgICAgICAgY29uc29sZS5sb2coJ/CfkYHvuI8gV2F0Y2hpbmcgVVJJOicsIHVyaS50b1N0cmluZygpKTtcbiAgICAgICAgcmV0dXJuIG5ldyB2c2NvZGUuRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+Rge+4jyBTdG9wcGVkIHdhdGNoaW5nIFVSSTonLCB1cmkudG9TdHJpbmcoKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFzeW5jIHN0YXQodXJpOiB2c2NvZGUuVXJpKTogUHJvbWlzZTx2c2NvZGUuRmlsZVN0YXQ+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfk4ogR2V0dGluZyBzdGF0IGZvciBVUkk6JywgdXJpLnRvU3RyaW5nKCkpO1xuICAgICAgICBjb25zdCBwYXRoID0gdGhpcy51cmlUb1BhdGgodXJpKTtcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfk4ogQ29udmVydGVkIHRvIHBhdGg6JywgcGF0aCk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgYXJ0aWZhY3RJZCwgZmlsZVBhdGggfSA9IGF3YWl0IHRoaXMucmVzb2x2ZUFydGlmYWN0UGF0aChwYXRoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OKIFJlc29sdmVkIC0gYXJ0aWZhY3RJZDonLCBhcnRpZmFjdElkLCAnZmlsZVBhdGg6JywgZmlsZVBhdGgpO1xuXG4gICAgICAgICAgICBpZiAoIWZpbGVQYXRoKSB7XG4gICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBhbiBhcnRpZmFjdCBkaXJlY3RvcnlcbiAgICAgICAgICAgICAgICBjb25zdCBhcnRpZmFjdCA9IGF3YWl0IHRoaXMuZ2V0QXJ0aWZhY3RDYWNoZWQoYXJ0aWZhY3RJZCk7XG4gICAgICAgICAgICAgICAgaWYgKGFydGlmYWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OKIEFydGlmYWN0IGZvdW5kOicsIGFydGlmYWN0Lm1hbmlmZXN0Py5uYW1lIHx8IGFydGlmYWN0SWQsICd0eXBlOicsIGFydGlmYWN0LnR5cGUpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogdnNjb2RlLkZpbGVUeXBlLkRpcmVjdG9yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0aW1lOiBuZXcgRGF0ZShhcnRpZmFjdC5tYW5pZmVzdD8uY3JlYXRlZF9hdCB8fCBEYXRlLm5vdygpKS5nZXRUaW1lKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBtdGltZTogbmV3IERhdGUoYXJ0aWZhY3QubWFuaWZlc3Q/LmNyZWF0ZWRfYXQgfHwgRGF0ZS5ub3coKSkuZ2V0VGltZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZTogMFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBhIGZpbGUgd2l0aGluIGFuIGFydGlmYWN0XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4ogR2V0dGluZyBmaWxlIHN0YXQgZm9yOicsIGZpbGVQYXRoLCAnaW4gYXJ0aWZhY3Q6JywgYXJ0aWZhY3RJZCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZSA9IGF3YWl0IHRoaXMuZ2V0RmlsZUluZm8oYXJ0aWZhY3RJZCwgZmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgIGlmIChmaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OKIEZpbGUgZm91bmQ6JywgZmlsZS5uYW1lLCAndHlwZTonLCBmaWxlLnR5cGUpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogZmlsZS50eXBlID09PSAnZGlyZWN0b3J5JyA/IHZzY29kZS5GaWxlVHlwZS5EaXJlY3RvcnkgOiB2c2NvZGUuRmlsZVR5cGUuRmlsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGN0aW1lOiBmaWxlLmNyZWF0ZWRfYXQgPyBuZXcgRGF0ZShmaWxlLmNyZWF0ZWRfYXQpLmdldFRpbWUoKSA6IERhdGUubm93KCksXG4gICAgICAgICAgICAgICAgICAgICAgICBtdGltZTogZmlsZS5tb2RpZmllZF9hdCA/IG5ldyBEYXRlKGZpbGUubW9kaWZpZWRfYXQpLmdldFRpbWUoKSA6IERhdGUubm93KCksXG4gICAgICAgICAgICAgICAgICAgICAgICBzaXplOiBmaWxlLnNpemUgfHwgMFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBFcnJvciBpbiBzdGF0OicsIGVycm9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCfinYwgRmlsZSBub3QgZm91bmQgZm9yIFVSSTonLCB1cmkudG9TdHJpbmcoKSk7XG4gICAgICAgIHRocm93IHZzY29kZS5GaWxlU3lzdGVtRXJyb3IuRmlsZU5vdEZvdW5kKHVyaSk7XG4gICAgfVxuXG4gICAgYXN5bmMgcmVhZERpcmVjdG9yeSh1cmk6IHZzY29kZS5VcmkpOiBQcm9taXNlPFtzdHJpbmcsIHZzY29kZS5GaWxlVHlwZV1bXT4ge1xuICAgICAgICBjb25zdCBwYXRoID0gdGhpcy51cmlUb1BhdGgodXJpKTtcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfk4EgUmVhZGluZyBkaXJlY3RvcnkgLSBVUkk6JywgdXJpLnRvU3RyaW5nKCksICdQYXRoOicsIHBhdGgpO1xuXG4gICAgICAgIC8vIFByZXZlbnQgaW5maW5pdGUgbG9vcHMgYnkgY2hlY2tpbmcgZm9yIGV4Y2Vzc2l2ZWx5IGxvbmcgcGF0aHNcbiAgICAgICAgaWYgKHBhdGgubGVuZ3RoID4gMTAwMCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIFBhdGggdG9vIGxvbmcsIHBvc3NpYmxlIGluZmluaXRlIGxvb3AgZGV0ZWN0ZWQ6JywgcGF0aC5zdWJzdHJpbmcoMCwgMTAwKSArICcuLi4nKTtcbiAgICAgICAgICAgIHRocm93IHZzY29kZS5GaWxlU3lzdGVtRXJyb3IuRmlsZU5vdEZvdW5kKHVyaSk7XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBhcnRpZmFjdElkLCBmaWxlUGF0aCB9ID0gYXdhaXQgdGhpcy5yZXNvbHZlQXJ0aWZhY3RQYXRoKHBhdGgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4EgUmVzb2x2ZWQgLSBhcnRpZmFjdElkOicsIGFydGlmYWN0SWQsICdmaWxlUGF0aDonLCBmaWxlUGF0aCk7XG5cbiAgICAgICAgICAgIC8vIEdldCB0aGUgYXJ0aWZhY3QgdG8gZGV0ZXJtaW5lIGl0cyB0eXBlXG4gICAgICAgICAgICBjb25zdCBhcnRpZmFjdCA9IGF3YWl0IHRoaXMuZ2V0QXJ0aWZhY3RDYWNoZWQoYXJ0aWZhY3RJZCk7XG4gICAgICAgICAgICBpZiAoIWFydGlmYWN0KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KdjCBBcnRpZmFjdCBub3QgZm91bmQ6JywgYXJ0aWZhY3RJZCk7XG4gICAgICAgICAgICAgICAgdGhyb3cgdnNjb2RlLkZpbGVTeXN0ZW1FcnJvci5GaWxlTm90Rm91bmQodXJpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGFydGlmYWN0LnR5cGUgPT09ICdjb2xsZWN0aW9uJykge1xuICAgICAgICAgICAgICAgIC8vIExpc3QgY2hpbGQgYXJ0aWZhY3RzXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4EgQXJ0aWZhY3QgaXMgY29sbGVjdGlvbiwgbGlzdGluZyBjaGlsZCBhcnRpZmFjdHMnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjaGlsZEFydGlmYWN0cyA9IGF3YWl0IHRoaXMubGlzdENoaWxkQXJ0aWZhY3RzKGFydGlmYWN0SWQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEJldHRlciBoYW5kbGluZyBvZiBjaGlsZCBhcnRpZmFjdCBuYW1lc1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGNoaWxkQXJ0aWZhY3RzLm1hcChjaGlsZCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QganVzdCB0aGUgbGFzdCBzZWdtZW50IG9mIHRoZSBjaGlsZCBJRFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjaGlsZE5hbWUgPSBjaGlsZC5pZC5pbmNsdWRlcygnLycpID8gXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZC5pZC5zcGxpdCgnLycpLnBvcCgpIHx8IGNoaWxkLmlkIDogXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZC5pZDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OBIENoaWxkIGFydGlmYWN0OicsIGNoaWxkLmlkLCAnLT4gZGlzcGxheSBuYW1lOicsIGNoaWxkTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbY2hpbGROYW1lLCB2c2NvZGUuRmlsZVR5cGUuRGlyZWN0b3J5XSBhcyBbc3RyaW5nLCB2c2NvZGUuRmlsZVR5cGVdO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OBIEZvdW5kJywgcmVzdWx0Lmxlbmd0aCwgJ2NoaWxkIGFydGlmYWN0cycpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIExpc3QgZmlsZXMgaW4gdGhlIGFydGlmYWN0XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4EgQXJ0aWZhY3QgaGFzIGZpbGVzLCBsaXN0aW5nIGZpbGVzIGluIHBhdGg6JywgZmlsZVBhdGggfHwgJyhyb290KScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVzID0gYXdhaXQgdGhpcy5saXN0RmlsZXMoYXJ0aWZhY3RJZCwgZmlsZVBhdGggfHwgJycpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGZpbGVzLm1hcChmaWxlID0+IFtcbiAgICAgICAgICAgICAgICAgICAgZmlsZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBmaWxlLnR5cGUgPT09ICdkaXJlY3RvcnknID8gdnNjb2RlLkZpbGVUeXBlLkRpcmVjdG9yeSA6IHZzY29kZS5GaWxlVHlwZS5GaWxlXG4gICAgICAgICAgICAgICAgXSBhcyBbc3RyaW5nLCB2c2NvZGUuRmlsZVR5cGVdKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn8J+TgSBGb3VuZCcsIHJlc3VsdC5sZW5ndGgsICdmaWxlcycpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCfinYwgRXJyb3IgaW4gcmVhZERpcmVjdG9yeTonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyB2c2NvZGUuRmlsZVN5c3RlbUVycm9yLkZpbGVOb3RGb3VuZCh1cmkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgY3JlYXRlRGlyZWN0b3J5KHVyaTogdnNjb2RlLlVyaSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwYXRoID0gdGhpcy51cmlUb1BhdGgodXJpKTtcbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGFydGlmYWN0SWQsIGZpbGVQYXRoIH0gPSBhd2FpdCB0aGlzLnJlc29sdmVBcnRpZmFjdFBhdGgocGF0aCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghZmlsZVBhdGgpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGluZyBhIG5ldyBhcnRpZmFjdCAocHJvamVjdCBmb2xkZXIpXG4gICAgICAgICAgICAgICAgY29uc3QgcGF0aFNlZ21lbnRzID0gcGF0aC5zcGxpdCgnLycpLmZpbHRlcihzID0+IHMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZvbGRlck5hbWUgPSBwYXRoU2VnbWVudHNbcGF0aFNlZ21lbnRzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudFBhdGggPSBwYXRoU2VnbWVudHMuc2xpY2UoMCwgLTEpLmpvaW4oJy8nKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnRBcnRpZmFjdElkID0gcGFyZW50UGF0aCB8fCAncm9vdCc7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5jcmVhdGVDaGlsZEFydGlmYWN0KHBhcmVudEFydGlmYWN0SWQsIGZvbGRlck5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgcmVndWxhciBkaXJlY3RvcmllcyB3aXRoaW4gYW4gYXJ0aWZhY3QsIHRoZXkgYXJlIGNyZWF0ZWQgaW1wbGljaXRseSB3aGVuIGZpbGVzIGFyZSB3cml0dGVuXG4gICAgICAgICAgICAgICAgLy8gV2UgZG9uJ3QgbmVlZCB0byBleHBsaWNpdGx5IGNyZWF0ZSBkaXJlY3RvcmllcyBpbiB0aGUgZmlsZSBzeXN0ZW1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBGYWlsZWQgdG8gY3JlYXRlIGRpcmVjdG9yeTonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyB2c2NvZGUuRmlsZVN5c3RlbUVycm9yLk5vUGVybWlzc2lvbnModXJpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHJlYWRGaWxlKHVyaTogdnNjb2RlLlVyaSk6IFByb21pc2U8VWludDhBcnJheT4ge1xuICAgICAgICBjb25zdCBwYXRoID0gdGhpcy51cmlUb1BhdGgodXJpKTtcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfk5YgUmVhZGluZyBmaWxlIC0gVVJJOicsIHVyaS50b1N0cmluZygpLCAnUGF0aDonLCBwYXRoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNhY2hlZCA9IHRoaXMuX2NhY2hlLmdldChwYXRoKTtcbiAgICAgICAgaWYgKGNhY2hlZCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk5YgRmlsZSBmb3VuZCBpbiBjYWNoZScpO1xuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGFydGlmYWN0SWQsIGZpbGVQYXRoIH0gPSBhd2FpdCB0aGlzLnJlc29sdmVBcnRpZmFjdFBhdGgocGF0aCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygn8J+TliBSZXNvbHZlZCAtIGFydGlmYWN0SWQ6JywgYXJ0aWZhY3RJZCwgJ2ZpbGVQYXRoOicsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFmaWxlUGF0aCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinYwgQ2Fubm90IHJlYWQgZmlsZTogbm8gZmlsZSBwYXRoIHNwZWNpZmllZCcpO1xuICAgICAgICAgICAgICAgIHRocm93IHZzY29kZS5GaWxlU3lzdGVtRXJyb3IuRmlsZU5vdEZvdW5kKHVyaSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OWIEdldHRpbmcgZmlsZSBjb250ZW50IGZyb20gSHlwaGEgc2VydmVyJyk7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5nZXRGaWxlQ29udGVudChhcnRpZmFjdElkLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKGNvbnRlbnQpO1xuICAgICAgICAgICAgdGhpcy5fY2FjaGUuc2V0KHBhdGgsIGRhdGEpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk5YgRmlsZSBjb250ZW50IHJldHJpZXZlZCBhbmQgY2FjaGVkLCBzaXplOicsIGRhdGEubGVuZ3RoLCAnYnl0ZXMnKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gY29uc29sZS5lcnJvcign4p2MIEZhaWxlZCB0byByZWFkIGZpbGU6JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgdnNjb2RlLkZpbGVTeXN0ZW1FcnJvci5GaWxlTm90Rm91bmQodXJpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIHdyaXRlRmlsZSh1cmk6IHZzY29kZS5VcmksIGNvbnRlbnQ6IFVpbnQ4QXJyYXksIG9wdGlvbnM6IHsgY3JlYXRlOiBib29sZWFuOyBvdmVyd3JpdGU6IGJvb2xlYW47IH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcGF0aCA9IHRoaXMudXJpVG9QYXRoKHVyaSk7XG4gICAgICAgIGNvbnNvbGUubG9nKCfinI/vuI8gV3JpdGluZyBmaWxlIC0gVVJJOicsIHVyaS50b1N0cmluZygpLCAnUGF0aDonLCBwYXRoLCAnU2l6ZTonLCBjb250ZW50Lmxlbmd0aCwgJ2J5dGVzJyk7XG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBhcnRpZmFjdElkLCBmaWxlUGF0aCB9ID0gYXdhaXQgdGhpcy5yZXNvbHZlQXJ0aWZhY3RQYXRoKHBhdGgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ+Kcj++4jyBSZXNvbHZlZCAtIGFydGlmYWN0SWQ6JywgYXJ0aWZhY3RJZCwgJ2ZpbGVQYXRoOicsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFmaWxlUGF0aCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfinYwgQ2Fubm90IHdyaXRlIGZpbGU6IG5vIGZpbGUgcGF0aCBzcGVjaWZpZWQnKTtcbiAgICAgICAgICAgICAgICB0aHJvdyB2c2NvZGUuRmlsZVN5c3RlbUVycm9yLk5vUGVybWlzc2lvbnModXJpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ+Kcj++4jyBTYXZpbmcgZmlsZSB0byBIeXBoYSBzZXJ2ZXInKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZUZpbGUoYXJ0aWZhY3RJZCwgZmlsZVBhdGgsIGNvbnRlbnQpO1xuICAgICAgICAgICAgdGhpcy5fY2FjaGUuc2V0KHBhdGgsIGNvbnRlbnQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbnZhbGlkYXRlIGFydGlmYWN0IGNhY2hlIHNpbmNlIHRoZSBhcnRpZmFjdCBtYXkgaGF2ZSBiZWVuIG1vZGlmaWVkXG4gICAgICAgICAgICB0aGlzLmludmFsaWRhdGVBcnRpZmFjdENhY2hlKGFydGlmYWN0SWQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn4pyP77iPIEZpbGUgc2F2ZWQgc3VjY2Vzc2Z1bGx5LCBmaXJpbmcgY2hhbmdlIGV2ZW50Jyk7XG4gICAgICAgICAgICB0aGlzLl9lbWl0dGVyLmZpcmUoW3tcbiAgICAgICAgICAgICAgICB0eXBlOiB2c2NvZGUuRmlsZUNoYW5nZVR5cGUuQ2hhbmdlZCxcbiAgICAgICAgICAgICAgICB1cmk6IHVyaVxuICAgICAgICAgICAgfV0pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcign4p2MIEZhaWxlZCB0byB3cml0ZSBmaWxlOicsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IHZzY29kZS5GaWxlU3lzdGVtRXJyb3IuVW5hdmFpbGFibGUodXJpKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGRlbGV0ZSh1cmk6IHZzY29kZS5VcmksIG9wdGlvbnM6IHsgcmVjdXJzaXZlOiBib29sZWFuOyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHBhdGggPSB0aGlzLnVyaVRvUGF0aCh1cmkpO1xuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgYXJ0aWZhY3RJZCwgZmlsZVBhdGggfSA9IGF3YWl0IHRoaXMucmVzb2x2ZUFydGlmYWN0UGF0aChwYXRoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFmaWxlUGF0aCkge1xuICAgICAgICAgICAgICAgIC8vIERlbGV0aW5nIGFuIGFydGlmYWN0IGl0c2VsZlxuICAgICAgICAgICAgICAgIHRoaXMuaW52YWxpZGF0ZUFydGlmYWN0Q2FjaGUoYXJ0aWZhY3RJZCk7XG4gICAgICAgICAgICAgICAgdGhyb3cgdnNjb2RlLkZpbGVTeXN0ZW1FcnJvci5Ob1Blcm1pc3Npb25zKHVyaSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZGVsZXRlRmlsZShhcnRpZmFjdElkLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICB0aGlzLl9jYWNoZS5kZWxldGUocGF0aCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEludmFsaWRhdGUgYXJ0aWZhY3QgY2FjaGUgc2luY2UgdGhlIGFydGlmYWN0IGNvbnRlbnQgY2hhbmdlZFxuICAgICAgICAgICAgdGhpcy5pbnZhbGlkYXRlQXJ0aWZhY3RDYWNoZShhcnRpZmFjdElkKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5fZW1pdHRlci5maXJlKFt7XG4gICAgICAgICAgICAgICAgdHlwZTogdnNjb2RlLkZpbGVDaGFuZ2VUeXBlLkRlbGV0ZWQsXG4gICAgICAgICAgICAgICAgdXJpOiB1cmlcbiAgICAgICAgICAgIH1dKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBkZWxldGUgZmlsZTonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyB2c2NvZGUuRmlsZVN5c3RlbUVycm9yLlVuYXZhaWxhYmxlKHVyaSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyByZW5hbWUob2xkVXJpOiB2c2NvZGUuVXJpLCBuZXdVcmk6IHZzY29kZS5VcmksIG9wdGlvbnM6IHsgb3ZlcndyaXRlOiBib29sZWFuOyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IG9sZFBhdGggPSB0aGlzLnVyaVRvUGF0aChvbGRVcmkpO1xuICAgICAgICBjb25zdCBuZXdQYXRoID0gdGhpcy51cmlUb1BhdGgobmV3VXJpKTtcbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGFydGlmYWN0SWQ6IG9sZEFydGlmYWN0SWQsIGZpbGVQYXRoOiBvbGRGaWxlUGF0aCB9ID0gYXdhaXQgdGhpcy5yZXNvbHZlQXJ0aWZhY3RQYXRoKG9sZFBhdGgpO1xuICAgICAgICAgICAgY29uc3QgeyBhcnRpZmFjdElkOiBuZXdBcnRpZmFjdElkLCBmaWxlUGF0aDogbmV3RmlsZVBhdGggfSA9IGF3YWl0IHRoaXMucmVzb2x2ZUFydGlmYWN0UGF0aChuZXdQYXRoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFvbGRGaWxlUGF0aCB8fCAhbmV3RmlsZVBhdGggfHwgb2xkQXJ0aWZhY3RJZCAhPT0gbmV3QXJ0aWZhY3RJZCkge1xuICAgICAgICAgICAgICAgIHRocm93IHZzY29kZS5GaWxlU3lzdGVtRXJyb3IuTm9QZXJtaXNzaW9ucyhvbGRVcmkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJlbmFtZUZpbGUob2xkQXJ0aWZhY3RJZCwgb2xkRmlsZVBhdGgsIG5ld0ZpbGVQYXRoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IHRoaXMuX2NhY2hlLmdldChvbGRQYXRoKTtcbiAgICAgICAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY2FjaGUuZGVsZXRlKG9sZFBhdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2NhY2hlLnNldChuZXdQYXRoLCBjb250ZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW52YWxpZGF0ZSBhcnRpZmFjdCBjYWNoZSBzaW5jZSB0aGUgYXJ0aWZhY3QgY29udGVudCBjaGFuZ2VkXG4gICAgICAgICAgICB0aGlzLmludmFsaWRhdGVBcnRpZmFjdENhY2hlKG9sZEFydGlmYWN0SWQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLl9lbWl0dGVyLmZpcmUoW1xuICAgICAgICAgICAgICAgIHsgdHlwZTogdnNjb2RlLkZpbGVDaGFuZ2VUeXBlLkRlbGV0ZWQsIHVyaTogb2xkVXJpIH0sXG4gICAgICAgICAgICAgICAgeyB0eXBlOiB2c2NvZGUuRmlsZUNoYW5nZVR5cGUuQ3JlYXRlZCwgdXJpOiBuZXdVcmkgfVxuICAgICAgICAgICAgXSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcmVuYW1lIGZpbGU6JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgdnNjb2RlLkZpbGVTeXN0ZW1FcnJvci5VbmF2YWlsYWJsZShvbGRVcmkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB1cmlUb1BhdGgodXJpOiB2c2NvZGUuVXJpKTogc3RyaW5nIHtcbiAgICAgICAgbGV0IHBhdGggPSB1cmkucGF0aDtcbiAgICAgICAgY29uc29sZS5sb2coJ/CflJcgVVJJIHRvIFBhdGggY29udmVyc2lvbiAtIE9yaWdpbmFsIFVSSTonLCB1cmkudG9TdHJpbmcoKSwgJ1NjaGVtZTonLCB1cmkuc2NoZW1lLCAnQXV0aG9yaXR5OicsIHVyaS5hdXRob3JpdHksICdQYXRoOicsIHVyaS5wYXRoLCAnRmluYWwgcGF0aDonLCBwYXRoKTtcbiAgICAgICAgcmV0dXJuIHBhdGg7XG4gICAgfVxuXG4gICAgLy8gSHlwaGEgQVBJIG1ldGhvZHNcbiAgICBwcml2YXRlIGFzeW5jIGdldEFydGlmYWN0KGFydGlmYWN0SWQ6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKCfwn5SNIEdldHRpbmcgYXJ0aWZhY3Q6JywgYXJ0aWZhY3RJZCk7XG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYXJ0aWZhY3RNYW5hZ2VyID0gYXdhaXQgdGhpcy5lbnN1cmVBcnRpZmFjdE1hbmFnZXIoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5SNIEFydGlmYWN0IG1hbmFnZXIgb2J0YWluZWQsIHJlYWRpbmcgYXJ0aWZhY3QnKTtcbiAgICAgICAgICAgIGNvbnN0IGFydGlmYWN0ID0gYXdhaXQgYXJ0aWZhY3RNYW5hZ2VyLnJlYWQoe1xuICAgICAgICAgICAgICAgIGFydGlmYWN0X2lkOiBhcnRpZmFjdElkLFxuICAgICAgICAgICAgICAgIF9ya3dhcmdzOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5SNIEFydGlmYWN0IHJlYWQgc3VjY2Vzc2Z1bGx5OicsIGFydGlmYWN0Py5tYW5pZmVzdD8ubmFtZSB8fCBhcnRpZmFjdElkKTtcbiAgICAgICAgICAgIHJldHVybiBhcnRpZmFjdDtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYOKdjCBGYWlsZWQgdG8gZ2V0IGFydGlmYWN0ICR7YXJ0aWZhY3RJZH06YCwgZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGxpc3RDaGlsZEFydGlmYWN0cyhwYXJlbnRJZDogc3RyaW5nKTogUHJvbWlzZTxQcm9qZWN0W10+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfk4sgTGlzdGluZyBjaGlsZCBhcnRpZmFjdHMgZm9yIHBhcmVudDonLCBwYXJlbnRJZCk7XG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYXJ0aWZhY3RNYW5hZ2VyID0gYXdhaXQgdGhpcy5lbnN1cmVBcnRpZmFjdE1hbmFnZXIoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OLIExpc3RpbmcgYXJ0aWZhY3RzIHdpdGggcGFyZW50OicsIHBhcmVudElkKTtcbiAgICAgICAgICAgIGNvbnN0IHByb2plY3RzTGlzdCA9IGF3YWl0IGFydGlmYWN0TWFuYWdlci5saXN0KHtcbiAgICAgICAgICAgICAgICBwYXJlbnRfaWQ6IHBhcmVudElkLFxuICAgICAgICAgICAgICAgIHN0YWdlOiAnYWxsJyxcbiAgICAgICAgICAgICAgICBfcmt3YXJnczogdHJ1ZVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHByb2plY3RzTGlzdC5tYXAoKHByb2plY3Q6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OLIFByb2Nlc3NpbmcgY2hpbGQgYXJ0aWZhY3Q6Jywge1xuICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbElkOiBwcm9qZWN0LmlkLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnRJZDogcGFyZW50SWQsXG4gICAgICAgICAgICAgICAgICAgIHByb2plY3RUeXBlOiBwcm9qZWN0LnR5cGUsXG4gICAgICAgICAgICAgICAgICAgIHByb2plY3RNYW5pZmVzdDogcHJvamVjdC5tYW5pZmVzdFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVzZSB0aGUgSUQgYXMgcmV0dXJuZWQgYnkgdGhlIHNlcnZlciAtIGRvbid0IG1vZGlmeSBpdFxuICAgICAgICAgICAgICAgIGNvbnN0IGFydGlmYWN0SWQgPSBwcm9qZWN0LmlkO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OLIENoaWxkIGFydGlmYWN0IHByb2Nlc3NlZDonLCBwcm9qZWN0LmlkLCAnLT4gZmluYWwgSUQ6JywgYXJ0aWZhY3RJZCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IGFydGlmYWN0SWQsXG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0OiBwcm9qZWN0Lm1hbmlmZXN0IHx8IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHByb2plY3QuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJycsXG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiAnMS4wLjAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3Byb2plY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRlZF9hdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCfwn5OLIEZvdW5kJywgcmVzdWx0Lmxlbmd0aCwgJ2NoaWxkIGFydGlmYWN0cycpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBGYWlsZWQgdG8gbGlzdCBjaGlsZCBhcnRpZmFjdHM6JywgZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBsaXN0RmlsZXMoYXJ0aWZhY3RJZDogc3RyaW5nLCBkaXJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFByb2plY3RGaWxlW10+IHtcbiAgICAgICAgY29uc29sZS5sb2coJ/Cfk4QgTGlzdGluZyBmaWxlcyBmb3IgYXJ0aWZhY3Q6JywgYXJ0aWZhY3RJZCwgJ2luIGRpcmVjdG9yeTonLCBkaXJQYXRoIHx8ICcocm9vdCknKTtcbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBhcnRpZmFjdE1hbmFnZXIgPSBhd2FpdCB0aGlzLmVuc3VyZUFydGlmYWN0TWFuYWdlcigpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4QgTGlzdGluZyBmaWxlcyB3aXRoIGFydGlmYWN0X2lkOicsIGFydGlmYWN0SWQsICdkaXJfcGF0aDonLCBkaXJQYXRoIHx8ICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVzID0gYXdhaXQgYXJ0aWZhY3RNYW5hZ2VyLmxpc3RfZmlsZXMoe1xuICAgICAgICAgICAgICAgIGFydGlmYWN0X2lkOiBhcnRpZmFjdElkLFxuICAgICAgICAgICAgICAgIHZlcnNpb246IFwic3RhZ2VcIixcbiAgICAgICAgICAgICAgICBkaXJfcGF0aDogZGlyUGF0aCB8fCAnJyxcbiAgICAgICAgICAgICAgICBfcmt3YXJnczogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGZpbGVzLm1hcCgoZmlsZTogYW55KSA9PiAoe1xuICAgICAgICAgICAgICAgIG5hbWU6IGZpbGUubmFtZSxcbiAgICAgICAgICAgICAgICBwYXRoOiBmaWxlLnBhdGgsXG4gICAgICAgICAgICAgICAgdHlwZTogZmlsZS50eXBlLFxuICAgICAgICAgICAgICAgIHNpemU6IGZpbGUuc2l6ZSxcbiAgICAgICAgICAgICAgICBjcmVhdGVkX2F0OiBmaWxlLmNyZWF0ZWRfYXQsXG4gICAgICAgICAgICAgICAgbW9kaWZpZWRfYXQ6IGZpbGUubW9kaWZpZWRfYXRcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk4QgRm91bmQnLCByZXN1bHQubGVuZ3RoLCAnZmlsZXMnKTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGDinYwgRmFpbGVkIHRvIGxpc3QgZmlsZXMgZm9yICR7YXJ0aWZhY3RJZH06YCwgZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRGaWxlSW5mbyhhcnRpZmFjdElkOiBzdHJpbmcsIGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFByb2plY3RGaWxlIHwgbnVsbD4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gR2V0IHRoZSBkaXJlY3RvcnkgY29udGFpbmluZyB0aGlzIGZpbGVcbiAgICAgICAgICAgIGNvbnN0IGRpclBhdGggPSBmaWxlUGF0aC5pbmNsdWRlcygnLycpID8gZmlsZVBhdGguc3Vic3RyaW5nKDAsIGZpbGVQYXRoLmxhc3RJbmRleE9mKCcvJykpIDogJyc7XG4gICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IGZpbGVQYXRoLmluY2x1ZGVzKCcvJykgPyBmaWxlUGF0aC5zdWJzdHJpbmcoZmlsZVBhdGgubGFzdEluZGV4T2YoJy8nKSArIDEpIDogZmlsZVBhdGg7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGZpbGVzID0gYXdhaXQgdGhpcy5saXN0RmlsZXMoYXJ0aWZhY3RJZCwgZGlyUGF0aCk7XG4gICAgICAgICAgICByZXR1cm4gZmlsZXMuZmluZChmaWxlID0+IGZpbGUubmFtZSA9PT0gZmlsZU5hbWUpIHx8IG51bGw7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gZ2V0IGZpbGUgaW5mbyAke2ZpbGVQYXRofSBpbiBhcnRpZmFjdCAke2FydGlmYWN0SWR9OmAsIGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRGaWxlQ29udGVudChhcnRpZmFjdElkOiBzdHJpbmcsIGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICBjb25zb2xlLmxvZygn8J+TpSBHZXR0aW5nIGZpbGUgY29udGVudCBmb3I6JywgZmlsZVBhdGgsICdpbiBhcnRpZmFjdDonLCBhcnRpZmFjdElkKTtcbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBhcnRpZmFjdE1hbmFnZXIgPSBhd2FpdCB0aGlzLmVuc3VyZUFydGlmYWN0TWFuYWdlcigpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk6UgR2V0dGluZyBmaWxlIFVSTCBmcm9tIGFydGlmYWN0IG1hbmFnZXInKTtcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IGF3YWl0IGFydGlmYWN0TWFuYWdlci5nZXRfZmlsZSh7XG4gICAgICAgICAgICAgICAgYXJ0aWZhY3RfaWQ6IGFydGlmYWN0SWQsXG4gICAgICAgICAgICAgICAgZmlsZV9wYXRoOiBmaWxlUGF0aCxcbiAgICAgICAgICAgICAgICB2ZXJzaW9uOiAnc3RhZ2UnLFxuICAgICAgICAgICAgICAgIF9ya3dhcmdzOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk6UgRmV0Y2hpbmcgZmlsZSBjb250ZW50IGZyb20gVVJMJyk7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHVybCk7XG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+KdjCBIVFRQIGVycm9yOicsIHJlc3BvbnNlLnN0YXR1cywgcmVzcG9uc2Uuc3RhdHVzVGV4dCk7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfTogJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ/Cfk6UgRmlsZSBjb250ZW50IHJldHJpZXZlZCwgc2l6ZTonLCBjb250ZW50Lmxlbmd0aCwgJ2NoYXJhY3RlcnMnKTtcbiAgICAgICAgICAgIHJldHVybiBjb250ZW50O1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gY29uc29sZS5kZWJ1Zyhg4p2MIEZhaWxlZCB0byBnZXQgZmlsZSBjb250ZW50IGZvciAke2ZpbGVQYXRofTpgLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2F2ZUZpbGUoYXJ0aWZhY3RJZDogc3RyaW5nLCBmaWxlUGF0aDogc3RyaW5nLCBjb250ZW50OiBVaW50OEFycmF5KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBhcnRpZmFjdE1hbmFnZXIgPSBhd2FpdCB0aGlzLmVuc3VyZUFydGlmYWN0TWFuYWdlcigpO1xuICAgICAgICAgICAgLy8gYXdhaXQgYXJ0aWZhY3RNYW5hZ2VyLmVkaXQoe1xuICAgICAgICAgICAgLy8gICAgIGFydGlmYWN0X2lkOiBhcnRpZmFjdElkLFxuICAgICAgICAgICAgLy8gICAgIHZlcnNpb246IFwibGF0ZXN0XCIsXG4gICAgICAgICAgICAvLyAgICAgc3RhZ2U6IHRydWUsXG4gICAgICAgICAgICAvLyAgICAgX3Jrd2FyZ3M6IHRydWVcbiAgICAgICAgICAgIC8vIH0pXG4gICAgICAgICAgICBjb25zdCBwcmVzaWduZWRVcmwgPSBhd2FpdCBhcnRpZmFjdE1hbmFnZXIucHV0X2ZpbGUoe1xuICAgICAgICAgICAgICAgIGFydGlmYWN0X2lkOiBhcnRpZmFjdElkLFxuICAgICAgICAgICAgICAgIGZpbGVfcGF0aDogZmlsZVBhdGgsXG4gICAgICAgICAgICAgICAgX3Jrd2FyZ3M6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHByZXNpZ25lZFVybCwge1xuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BVVCcsXG4gICAgICAgICAgICAgICAgYm9keTogY29udGVudCxcbiAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnJyAvLyBpbXBvcnRhbnQgZm9yIHMzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIGF3YWl0IGFydGlmYWN0TWFuYWdlci5jb21taXQoe1xuICAgICAgICAgICAgLy8gICAgIGFydGlmYWN0X2lkOiBhcnRpZmFjdElkLFxuICAgICAgICAgICAgLy8gICAgIF9ya3dhcmdzOiB0cnVlXG4gICAgICAgICAgICAvLyB9KVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVcGxvYWQgZmFpbGVkOiAke3Jlc3BvbnNlLnN0YXR1c30gJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgRmlsZSBzYXZlZDogJHtmaWxlUGF0aH1gKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBzYXZlIGZpbGUgJHtmaWxlUGF0aH06YCwgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGRlbGV0ZUZpbGUoYXJ0aWZhY3RJZDogc3RyaW5nLCBmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBhcnRpZmFjdE1hbmFnZXIgPSBhd2FpdCB0aGlzLmVuc3VyZUFydGlmYWN0TWFuYWdlcigpO1xuICAgICAgICAgICAgYXdhaXQgYXJ0aWZhY3RNYW5hZ2VyLnJlbW92ZV9maWxlKHtcbiAgICAgICAgICAgICAgICBhcnRpZmFjdF9pZDogYXJ0aWZhY3RJZCxcbiAgICAgICAgICAgICAgICBmaWxlX3BhdGg6IGZpbGVQYXRoLFxuICAgICAgICAgICAgICAgIF9ya3dhcmdzOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBGaWxlIGRlbGV0ZWQ6ICR7ZmlsZVBhdGh9YCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gZGVsZXRlIGZpbGUgJHtmaWxlUGF0aH06YCwgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlbmFtZUZpbGUoYXJ0aWZhY3RJZDogc3RyaW5nLCBvbGRQYXRoOiBzdHJpbmcsIG5ld1BhdGg6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYXJ0aWZhY3RNYW5hZ2VyID0gYXdhaXQgdGhpcy5lbnN1cmVBcnRpZmFjdE1hbmFnZXIoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gMS4gR2V0IGZpbGUgY29udGVudCBmcm9tIG9sZCBwYXRoXG4gICAgICAgICAgICBjb25zdCB1cmwgPSBhd2FpdCBhcnRpZmFjdE1hbmFnZXIuZ2V0X2ZpbGUoe1xuICAgICAgICAgICAgICAgIGFydGlmYWN0X2lkOiBhcnRpZmFjdElkLFxuICAgICAgICAgICAgICAgIGZpbGVfcGF0aDogb2xkUGF0aCxcbiAgICAgICAgICAgICAgICB2ZXJzaW9uOiAnc3RhZ2UnLFxuICAgICAgICAgICAgICAgIF9ya3dhcmdzOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gMi4gRmV0Y2ggdGhlIGNvbnRlbnRcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godXJsKTtcbiAgICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBmZXRjaCBmaWxlIGNvbnRlbnQgZm9yIHJlbmFtZTogJHtyZXNwb25zZS5zdGF0dXNUZXh0fWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyAzLiBHZXQgdGhlIGNvbnRlbnQgYmxvYlxuICAgICAgICAgICAgY29uc3QgY29udGVudEJsb2IgPSBhd2FpdCByZXNwb25zZS5ibG9iKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIDQuIEdldCBwcmVzaWduZWQgVVJMIGZvciBuZXcgcGF0aFxuICAgICAgICAgICAgY29uc3QgcHJlc2lnbmVkVXJsID0gYXdhaXQgYXJ0aWZhY3RNYW5hZ2VyLnB1dF9maWxlKHtcbiAgICAgICAgICAgICAgICBhcnRpZmFjdF9pZDogYXJ0aWZhY3RJZCxcbiAgICAgICAgICAgICAgICBmaWxlX3BhdGg6IG5ld1BhdGgsXG4gICAgICAgICAgICAgICAgX3Jrd2FyZ3M6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyA1LiBVcGxvYWQgY29udGVudCB0byBuZXcgcGF0aFxuICAgICAgICAgICAgY29uc3QgdXBsb2FkUmVzcG9uc2UgPSBhd2FpdCBmZXRjaChwcmVzaWduZWRVcmwsIHtcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQVVQnLFxuICAgICAgICAgICAgICAgIGJvZHk6IGNvbnRlbnRCbG9iLFxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICcnIC8vIGltcG9ydGFudCBmb3IgczNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCF1cGxvYWRSZXNwb25zZS5vaykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVXBsb2FkIG9mIHJlbmFtZWQgZmlsZSBmYWlsZWQgd2l0aCBzdGF0dXM6ICR7dXBsb2FkUmVzcG9uc2Uuc3RhdHVzfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyA2LiBEZWxldGUgdGhlIG9sZCBmaWxlXG4gICAgICAgICAgICBhd2FpdCBhcnRpZmFjdE1hbmFnZXIucmVtb3ZlX2ZpbGUoe1xuICAgICAgICAgICAgICAgIGFydGlmYWN0X2lkOiBhcnRpZmFjdElkLFxuICAgICAgICAgICAgICAgIGZpbGVfcGF0aDogb2xkUGF0aCxcbiAgICAgICAgICAgICAgICBfcmt3YXJnczogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIDcuIEFkZCBhIHNtYWxsIGRlbGF5IGJlZm9yZSByZXR1cm5pbmcgdG8gZW5zdXJlIHNlcnZlci1zaWRlIHByb3BhZ2F0aW9uXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMzAwKSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBGaWxlIHJlbmFtZWQgZnJvbSAke29sZFBhdGh9IHRvICR7bmV3UGF0aH1gKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byByZW5hbWUgZmlsZSBmcm9tICR7b2xkUGF0aH0gdG8gJHtuZXdQYXRofTpgLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlQ2hpbGRBcnRpZmFjdChwYXJlbnRJZDogc3RyaW5nLCBmb2xkZXJOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGFydGlmYWN0TWFuYWdlciA9IGF3YWl0IHRoaXMuZW5zdXJlQXJ0aWZhY3RNYW5hZ2VyKCk7XG4gICAgICAgICAgICBhd2FpdCBhcnRpZmFjdE1hbmFnZXIuY3JlYXRlKHtcbiAgICAgICAgICAgICAgICBwYXJlbnRfaWQ6IHBhcmVudElkLFxuICAgICAgICAgICAgICAgIGFsaWFzOiBmb2xkZXJOYW1lLFxuICAgICAgICAgICAgICAgIHR5cGU6IFwicHJvamVjdFwiLFxuICAgICAgICAgICAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGZvbGRlck5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBgUHJvamVjdCBmb2xkZXI6ICR7Zm9sZGVyTmFtZX1gLFxuICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiBcIjAuMS4wXCIsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwicHJvamVjdFwiXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBfcmt3YXJnczogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEludmFsaWRhdGUgY2FjaGUgZm9yIHBhcmVudCBhcnRpZmFjdCBzaW5jZSBpdCBub3cgaGFzIGEgbmV3IGNoaWxkXG4gICAgICAgICAgICB0aGlzLmludmFsaWRhdGVBcnRpZmFjdENhY2hlKHBhcmVudElkKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coYENyZWF0ZWQgY2hpbGQgYXJ0aWZhY3Q6ICR7Zm9sZGVyTmFtZX1gKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBjcmVhdGUgY2hpbGQgYXJ0aWZhY3QgJHtmb2xkZXJOYW1lfTpgLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cbn0gIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwidnNjb2RlXCIpOyIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0uY2FsbChtb2R1bGUuZXhwb3J0cywgbW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIiLCIvLyBzdGFydHVwXG4vLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbi8vIFRoaXMgZW50cnkgbW9kdWxlIGlzIHJlZmVyZW5jZWQgYnkgb3RoZXIgbW9kdWxlcyBzbyBpdCBjYW4ndCBiZSBpbmxpbmVkXG52YXIgX193ZWJwYWNrX2V4cG9ydHNfXyA9IF9fd2VicGFja19yZXF1aXJlX18oXCIuL3NyYy9leHRlbnNpb24udHNcIik7XG4iLCIiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=