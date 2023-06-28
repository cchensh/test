// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

const ParamReference = (...path)=>{
    const fullPath = path.filter(Boolean).join(".");
    return {
        toString: ()=>`{{${fullPath}}}`,
        toJSON: ()=>`{{${fullPath}}}`
    };
};
const WithUntypedObjectProxy = (rootObject, ...path)=>{
    const parameterizedObject = {
        ...rootObject,
        ...ParamReference(...path)
    };
    const proxy = new Proxy(parameterizedObject, {
        get: function(obj, prop) {
            if (prop in obj) {
                return Reflect.get.apply(obj, arguments);
            }
            if (typeof prop === "string") {
                return WithUntypedObjectProxy(obj, ...path, prop);
            }
            return Reflect.get.apply(obj, arguments);
        }
    });
    return proxy;
};
const SchemaTypes = {
    string: "string",
    boolean: "boolean",
    integer: "integer",
    number: "number",
    object: "object",
    array: "array"
};
const isCustomType = (type)=>type instanceof CustomType;
const isTypedObject = (def)=>"properties" in def;
function DefineType(definition) {
    return new CustomType(definition);
}
const isTypedArray = (def)=>"items" in def;
class CustomType {
    id;
    title;
    description;
    constructor(definition){
        this.definition = definition;
        this.id = definition.name;
        this.definition = definition;
        this.description = definition.description;
        this.title = definition.title;
    }
    generateReferenceString() {
        return this.id.includes("#/") ? this.id : `#/types/${this.id}`;
    }
    toString() {
        return this.generateReferenceString();
    }
    toJSON() {
        return this.generateReferenceString();
    }
    registerParameterTypes(manifest) {
        if (isCustomType(this.definition.type)) {
            manifest.registerType(this.definition.type);
        } else if (isTypedArray(this.definition)) {
            if (isCustomType(this.definition.items.type)) {
                manifest.registerType(this.definition.items.type);
            }
        } else if (isTypedObject(this.definition)) {
            Object.values(this.definition.properties)?.forEach((property)=>{
                if (isCustomType(property.type)) {
                    manifest.registerType(property.type);
                }
            });
        }
    }
    export() {
        const { name: _n , ...definition } = this.definition;
        return JSON.parse(JSON.stringify(definition));
    }
    definition;
}
const ParameterVariable = (namespace, paramName, definition)=>{
    let param = null;
    if (isCustomType(definition.type)) {
        return ParameterVariable(namespace, paramName, definition.type.definition);
    } else if (definition.type === SchemaTypes.object) {
        if (isTypedObject(definition)) {
            param = CreateTypedObjectParameterVariable(namespace, paramName, definition);
        } else {
            param = CreateUntypedObjectParameterVariable(namespace, paramName);
        }
    } else {
        param = CreateSingleParameterVariable(namespace, paramName);
    }
    return param;
};
const CreateTypedObjectParameterVariable = (namespace, paramName, definition)=>{
    const ns = namespace ? `${namespace}.` : "";
    const pathReference = `${ns}${paramName}`;
    const param = ParamReference(pathReference);
    for (const [propName, propDefinition] of Object.entries(definition.properties || {})){
        param[propName] = ParameterVariable(pathReference, propName, propDefinition);
    }
    return WithUntypedObjectProxy(param, namespace, paramName);
};
const CreateUntypedObjectParameterVariable = (namespace, paramName)=>{
    return WithUntypedObjectProxy({}, namespace, paramName);
};
const CreateSingleParameterVariable = (namespace, paramName)=>{
    return ParamReference(namespace, paramName);
};
const DefineFunction = (definition)=>{
    return new SlackFunctionDefinition(definition);
};
class SlackFunctionDefinition {
    id;
    constructor(definition){
        this.definition = definition;
        this.id = definition.callback_id;
        this.definition = definition;
    }
    registerParameterTypes(manifest) {
        const { input_parameters: inputParams , output_parameters: outputParams  } = this.definition;
        manifest.registerTypes(inputParams?.properties ?? {});
        manifest.registerTypes(outputParams?.properties ?? {});
    }
    export() {
        return {
            title: this.definition.title,
            description: this.definition.description,
            source_file: this.definition.source_file,
            input_parameters: this.definition.input_parameters ?? {
                properties: {},
                required: []
            },
            output_parameters: this.definition.output_parameters ?? {
                properties: {},
                required: []
            }
        };
    }
    definition;
}
const CHAR_FORWARD_SLASH = 47;
let NATIVE_OS = "linux";
const navigator = globalThis.navigator;
if (globalThis.Deno != null) {
    NATIVE_OS = Deno.build.os;
} else if (navigator?.appVersion?.includes?.("Win") ?? false) {
    NATIVE_OS = "windows";
}
const isWindows = NATIVE_OS == "windows";
function assertPath(path) {
    if (typeof path !== "string") {
        throw new TypeError(`Path must be a string. Received ${JSON.stringify(path)}`);
    }
}
function isPosixPathSeparator(code) {
    return code === 47;
}
function isPathSeparator(code) {
    return isPosixPathSeparator(code) || code === 92;
}
function isWindowsDeviceRoot(code) {
    return code >= 97 && code <= 122 || code >= 65 && code <= 90;
}
function normalizeString(path, allowAboveRoot, separator, isPathSeparator) {
    let res = "";
    let lastSegmentLength = 0;
    let lastSlash = -1;
    let dots = 0;
    let code;
    for(let i = 0, len = path.length; i <= len; ++i){
        if (i < len) code = path.charCodeAt(i);
        else if (isPathSeparator(code)) break;
        else code = CHAR_FORWARD_SLASH;
        if (isPathSeparator(code)) {
            if (lastSlash === i - 1 || dots === 1) {} else if (lastSlash !== i - 1 && dots === 2) {
                if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 || res.charCodeAt(res.length - 2) !== 46) {
                    if (res.length > 2) {
                        const lastSlashIndex = res.lastIndexOf(separator);
                        if (lastSlashIndex === -1) {
                            res = "";
                            lastSegmentLength = 0;
                        } else {
                            res = res.slice(0, lastSlashIndex);
                            lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
                        }
                        lastSlash = i;
                        dots = 0;
                        continue;
                    } else if (res.length === 2 || res.length === 1) {
                        res = "";
                        lastSegmentLength = 0;
                        lastSlash = i;
                        dots = 0;
                        continue;
                    }
                }
                if (allowAboveRoot) {
                    if (res.length > 0) res += `${separator}..`;
                    else res = "..";
                    lastSegmentLength = 2;
                }
            } else {
                if (res.length > 0) res += separator + path.slice(lastSlash + 1, i);
                else res = path.slice(lastSlash + 1, i);
                lastSegmentLength = i - lastSlash - 1;
            }
            lastSlash = i;
            dots = 0;
        } else if (code === 46 && dots !== -1) {
            ++dots;
        } else {
            dots = -1;
        }
    }
    return res;
}
function _format(sep, pathObject) {
    const dir = pathObject.dir || pathObject.root;
    const base = pathObject.base || (pathObject.name || "") + (pathObject.ext || "");
    if (!dir) return base;
    if (dir === pathObject.root) return dir + base;
    return dir + sep + base;
}
class DenoStdInternalError extends Error {
    constructor(message){
        super(message);
        this.name = "DenoStdInternalError";
    }
}
function assert(expr, msg = "") {
    if (!expr) {
        throw new DenoStdInternalError(msg);
    }
}
const sep = "\\";
const delimiter = ";";
function resolve(...pathSegments) {
    let resolvedDevice = "";
    let resolvedTail = "";
    let resolvedAbsolute = false;
    for(let i = pathSegments.length - 1; i >= -1; i--){
        let path;
        if (i >= 0) {
            path = pathSegments[i];
        } else if (!resolvedDevice) {
            if (globalThis.Deno == null) {
                throw new TypeError("Resolved a drive-letter-less path without a CWD.");
            }
            path = Deno.cwd();
        } else {
            if (globalThis.Deno == null) {
                throw new TypeError("Resolved a relative path without a CWD.");
            }
            path = Deno.env.get(`=${resolvedDevice}`) || Deno.cwd();
            if (path === undefined || path.slice(0, 3).toLowerCase() !== `${resolvedDevice.toLowerCase()}\\`) {
                path = `${resolvedDevice}\\`;
            }
        }
        assertPath(path);
        const len = path.length;
        if (len === 0) continue;
        let rootEnd = 0;
        let device = "";
        let isAbsolute = false;
        const code = path.charCodeAt(0);
        if (len > 1) {
            if (isPathSeparator(code)) {
                isAbsolute = true;
                if (isPathSeparator(path.charCodeAt(1))) {
                    let j = 2;
                    let last = j;
                    for(; j < len; ++j){
                        if (isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        const firstPart = path.slice(last, j);
                        last = j;
                        for(; j < len; ++j){
                            if (!isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j < len && j !== last) {
                            last = j;
                            for(; j < len; ++j){
                                if (isPathSeparator(path.charCodeAt(j))) break;
                            }
                            if (j === len) {
                                device = `\\\\${firstPart}\\${path.slice(last)}`;
                                rootEnd = j;
                            } else if (j !== last) {
                                device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                                rootEnd = j;
                            }
                        }
                    }
                } else {
                    rootEnd = 1;
                }
            } else if (isWindowsDeviceRoot(code)) {
                if (path.charCodeAt(1) === 58) {
                    device = path.slice(0, 2);
                    rootEnd = 2;
                    if (len > 2) {
                        if (isPathSeparator(path.charCodeAt(2))) {
                            isAbsolute = true;
                            rootEnd = 3;
                        }
                    }
                }
            }
        } else if (isPathSeparator(code)) {
            rootEnd = 1;
            isAbsolute = true;
        }
        if (device.length > 0 && resolvedDevice.length > 0 && device.toLowerCase() !== resolvedDevice.toLowerCase()) {
            continue;
        }
        if (resolvedDevice.length === 0 && device.length > 0) {
            resolvedDevice = device;
        }
        if (!resolvedAbsolute) {
            resolvedTail = `${path.slice(rootEnd)}\\${resolvedTail}`;
            resolvedAbsolute = isAbsolute;
        }
        if (resolvedAbsolute && resolvedDevice.length > 0) break;
    }
    resolvedTail = normalizeString(resolvedTail, !resolvedAbsolute, "\\", isPathSeparator);
    return resolvedDevice + (resolvedAbsolute ? "\\" : "") + resolvedTail || ".";
}
function normalize(path) {
    assertPath(path);
    const len = path.length;
    if (len === 0) return ".";
    let rootEnd = 0;
    let device;
    let isAbsolute = false;
    const code = path.charCodeAt(0);
    if (len > 1) {
        if (isPathSeparator(code)) {
            isAbsolute = true;
            if (isPathSeparator(path.charCodeAt(1))) {
                let j = 2;
                let last = j;
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    const firstPart = path.slice(last, j);
                    last = j;
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        last = j;
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            return `\\\\${firstPart}\\${path.slice(last)}\\`;
                        } else if (j !== last) {
                            device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                            rootEnd = j;
                        }
                    }
                }
            } else {
                rootEnd = 1;
            }
        } else if (isWindowsDeviceRoot(code)) {
            if (path.charCodeAt(1) === 58) {
                device = path.slice(0, 2);
                rootEnd = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) {
                        isAbsolute = true;
                        rootEnd = 3;
                    }
                }
            }
        }
    } else if (isPathSeparator(code)) {
        return "\\";
    }
    let tail;
    if (rootEnd < len) {
        tail = normalizeString(path.slice(rootEnd), !isAbsolute, "\\", isPathSeparator);
    } else {
        tail = "";
    }
    if (tail.length === 0 && !isAbsolute) tail = ".";
    if (tail.length > 0 && isPathSeparator(path.charCodeAt(len - 1))) {
        tail += "\\";
    }
    if (device === undefined) {
        if (isAbsolute) {
            if (tail.length > 0) return `\\${tail}`;
            else return "\\";
        } else if (tail.length > 0) {
            return tail;
        } else {
            return "";
        }
    } else if (isAbsolute) {
        if (tail.length > 0) return `${device}\\${tail}`;
        else return `${device}\\`;
    } else if (tail.length > 0) {
        return device + tail;
    } else {
        return device;
    }
}
function isAbsolute(path) {
    assertPath(path);
    const len = path.length;
    if (len === 0) return false;
    const code = path.charCodeAt(0);
    if (isPathSeparator(code)) {
        return true;
    } else if (isWindowsDeviceRoot(code)) {
        if (len > 2 && path.charCodeAt(1) === 58) {
            if (isPathSeparator(path.charCodeAt(2))) return true;
        }
    }
    return false;
}
function join(...paths) {
    const pathsCount = paths.length;
    if (pathsCount === 0) return ".";
    let joined;
    let firstPart = null;
    for(let i = 0; i < pathsCount; ++i){
        const path = paths[i];
        assertPath(path);
        if (path.length > 0) {
            if (joined === undefined) joined = firstPart = path;
            else joined += `\\${path}`;
        }
    }
    if (joined === undefined) return ".";
    let needsReplace = true;
    let slashCount = 0;
    assert(firstPart != null);
    if (isPathSeparator(firstPart.charCodeAt(0))) {
        ++slashCount;
        const firstLen = firstPart.length;
        if (firstLen > 1) {
            if (isPathSeparator(firstPart.charCodeAt(1))) {
                ++slashCount;
                if (firstLen > 2) {
                    if (isPathSeparator(firstPart.charCodeAt(2))) ++slashCount;
                    else {
                        needsReplace = false;
                    }
                }
            }
        }
    }
    if (needsReplace) {
        for(; slashCount < joined.length; ++slashCount){
            if (!isPathSeparator(joined.charCodeAt(slashCount))) break;
        }
        if (slashCount >= 2) joined = `\\${joined.slice(slashCount)}`;
    }
    return normalize(joined);
}
function relative(from, to) {
    assertPath(from);
    assertPath(to);
    if (from === to) return "";
    const fromOrig = resolve(from);
    const toOrig = resolve(to);
    if (fromOrig === toOrig) return "";
    from = fromOrig.toLowerCase();
    to = toOrig.toLowerCase();
    if (from === to) return "";
    let fromStart = 0;
    let fromEnd = from.length;
    for(; fromStart < fromEnd; ++fromStart){
        if (from.charCodeAt(fromStart) !== 92) break;
    }
    for(; fromEnd - 1 > fromStart; --fromEnd){
        if (from.charCodeAt(fromEnd - 1) !== 92) break;
    }
    const fromLen = fromEnd - fromStart;
    let toStart = 0;
    let toEnd = to.length;
    for(; toStart < toEnd; ++toStart){
        if (to.charCodeAt(toStart) !== 92) break;
    }
    for(; toEnd - 1 > toStart; --toEnd){
        if (to.charCodeAt(toEnd - 1) !== 92) break;
    }
    const toLen = toEnd - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for(; i <= length; ++i){
        if (i === length) {
            if (toLen > length) {
                if (to.charCodeAt(toStart + i) === 92) {
                    return toOrig.slice(toStart + i + 1);
                } else if (i === 2) {
                    return toOrig.slice(toStart + i);
                }
            }
            if (fromLen > length) {
                if (from.charCodeAt(fromStart + i) === 92) {
                    lastCommonSep = i;
                } else if (i === 2) {
                    lastCommonSep = 3;
                }
            }
            break;
        }
        const fromCode = from.charCodeAt(fromStart + i);
        const toCode = to.charCodeAt(toStart + i);
        if (fromCode !== toCode) break;
        else if (fromCode === 92) lastCommonSep = i;
    }
    if (i !== length && lastCommonSep === -1) {
        return toOrig;
    }
    let out = "";
    if (lastCommonSep === -1) lastCommonSep = 0;
    for(i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i){
        if (i === fromEnd || from.charCodeAt(i) === 92) {
            if (out.length === 0) out += "..";
            else out += "\\..";
        }
    }
    if (out.length > 0) {
        return out + toOrig.slice(toStart + lastCommonSep, toEnd);
    } else {
        toStart += lastCommonSep;
        if (toOrig.charCodeAt(toStart) === 92) ++toStart;
        return toOrig.slice(toStart, toEnd);
    }
}
function toNamespacedPath(path) {
    if (typeof path !== "string") return path;
    if (path.length === 0) return "";
    const resolvedPath = resolve(path);
    if (resolvedPath.length >= 3) {
        if (resolvedPath.charCodeAt(0) === 92) {
            if (resolvedPath.charCodeAt(1) === 92) {
                const code = resolvedPath.charCodeAt(2);
                if (code !== 63 && code !== 46) {
                    return `\\\\?\\UNC\\${resolvedPath.slice(2)}`;
                }
            }
        } else if (isWindowsDeviceRoot(resolvedPath.charCodeAt(0))) {
            if (resolvedPath.charCodeAt(1) === 58 && resolvedPath.charCodeAt(2) === 92) {
                return `\\\\?\\${resolvedPath}`;
            }
        }
    }
    return path;
}
function dirname(path) {
    assertPath(path);
    const len = path.length;
    if (len === 0) return ".";
    let rootEnd = -1;
    let end = -1;
    let matchedSlash = true;
    let offset = 0;
    const code = path.charCodeAt(0);
    if (len > 1) {
        if (isPathSeparator(code)) {
            rootEnd = offset = 1;
            if (isPathSeparator(path.charCodeAt(1))) {
                let j = 2;
                let last = j;
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    last = j;
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        last = j;
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            return path;
                        }
                        if (j !== last) {
                            rootEnd = offset = j + 1;
                        }
                    }
                }
            }
        } else if (isWindowsDeviceRoot(code)) {
            if (path.charCodeAt(1) === 58) {
                rootEnd = offset = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) rootEnd = offset = 3;
                }
            }
        }
    } else if (isPathSeparator(code)) {
        return path;
    }
    for(let i = len - 1; i >= offset; --i){
        if (isPathSeparator(path.charCodeAt(i))) {
            if (!matchedSlash) {
                end = i;
                break;
            }
        } else {
            matchedSlash = false;
        }
    }
    if (end === -1) {
        if (rootEnd === -1) return ".";
        else end = rootEnd;
    }
    return path.slice(0, end);
}
function basename(path, ext = "") {
    if (ext !== undefined && typeof ext !== "string") {
        throw new TypeError('"ext" argument must be a string');
    }
    assertPath(path);
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    let i;
    if (path.length >= 2) {
        const drive = path.charCodeAt(0);
        if (isWindowsDeviceRoot(drive)) {
            if (path.charCodeAt(1) === 58) start = 2;
        }
    }
    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
        if (ext.length === path.length && ext === path) return "";
        let extIdx = ext.length - 1;
        let firstNonSlashEnd = -1;
        for(i = path.length - 1; i >= start; --i){
            const code = path.charCodeAt(i);
            if (isPathSeparator(code)) {
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            } else {
                if (firstNonSlashEnd === -1) {
                    matchedSlash = false;
                    firstNonSlashEnd = i + 1;
                }
                if (extIdx >= 0) {
                    if (code === ext.charCodeAt(extIdx)) {
                        if (--extIdx === -1) {
                            end = i;
                        }
                    } else {
                        extIdx = -1;
                        end = firstNonSlashEnd;
                    }
                }
            }
        }
        if (start === end) end = firstNonSlashEnd;
        else if (end === -1) end = path.length;
        return path.slice(start, end);
    } else {
        for(i = path.length - 1; i >= start; --i){
            if (isPathSeparator(path.charCodeAt(i))) {
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            } else if (end === -1) {
                matchedSlash = false;
                end = i + 1;
            }
        }
        if (end === -1) return "";
        return path.slice(start, end);
    }
}
function extname(path) {
    assertPath(path);
    let start = 0;
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    if (path.length >= 2 && path.charCodeAt(1) === 58 && isWindowsDeviceRoot(path.charCodeAt(0))) {
        start = startPart = 2;
    }
    for(let i = path.length - 1; i >= start; --i){
        const code = path.charCodeAt(i);
        if (isPathSeparator(code)) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        return "";
    }
    return path.slice(startDot, end);
}
function format(pathObject) {
    if (pathObject === null || typeof pathObject !== "object") {
        throw new TypeError(`The "pathObject" argument must be of type Object. Received type ${typeof pathObject}`);
    }
    return _format("\\", pathObject);
}
function parse(path) {
    assertPath(path);
    const ret = {
        root: "",
        dir: "",
        base: "",
        ext: "",
        name: ""
    };
    const len = path.length;
    if (len === 0) return ret;
    let rootEnd = 0;
    let code = path.charCodeAt(0);
    if (len > 1) {
        if (isPathSeparator(code)) {
            rootEnd = 1;
            if (isPathSeparator(path.charCodeAt(1))) {
                let j = 2;
                let last = j;
                for(; j < len; ++j){
                    if (isPathSeparator(path.charCodeAt(j))) break;
                }
                if (j < len && j !== last) {
                    last = j;
                    for(; j < len; ++j){
                        if (!isPathSeparator(path.charCodeAt(j))) break;
                    }
                    if (j < len && j !== last) {
                        last = j;
                        for(; j < len; ++j){
                            if (isPathSeparator(path.charCodeAt(j))) break;
                        }
                        if (j === len) {
                            rootEnd = j;
                        } else if (j !== last) {
                            rootEnd = j + 1;
                        }
                    }
                }
            }
        } else if (isWindowsDeviceRoot(code)) {
            if (path.charCodeAt(1) === 58) {
                rootEnd = 2;
                if (len > 2) {
                    if (isPathSeparator(path.charCodeAt(2))) {
                        if (len === 3) {
                            ret.root = ret.dir = path;
                            return ret;
                        }
                        rootEnd = 3;
                    }
                } else {
                    ret.root = ret.dir = path;
                    return ret;
                }
            }
        }
    } else if (isPathSeparator(code)) {
        ret.root = ret.dir = path;
        return ret;
    }
    if (rootEnd > 0) ret.root = path.slice(0, rootEnd);
    let startDot = -1;
    let startPart = rootEnd;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    let preDotState = 0;
    for(; i >= rootEnd; --i){
        code = path.charCodeAt(i);
        if (isPathSeparator(code)) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        if (end !== -1) {
            ret.base = ret.name = path.slice(startPart, end);
        }
    } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
        ret.ext = path.slice(startDot, end);
    }
    if (startPart > 0 && startPart !== rootEnd) {
        ret.dir = path.slice(0, startPart - 1);
    } else ret.dir = ret.root;
    return ret;
}
function fromFileUrl(url) {
    url = url instanceof URL ? url : new URL(url);
    if (url.protocol != "file:") {
        throw new TypeError("Must be a file URL.");
    }
    let path = decodeURIComponent(url.pathname.replace(/^\/*([A-Za-z]:)(\/|$)/, "$1/").replace(/\//g, "\\").replace(/%(?![0-9A-Fa-f]{2})/g, "%25"));
    if (url.hostname != "") {
        path = `\\\\${url.hostname}${path}`;
    }
    return path;
}
const mod = {
    sep: sep,
    delimiter: delimiter,
    resolve: resolve,
    normalize: normalize,
    isAbsolute: isAbsolute,
    join: join,
    relative: relative,
    toNamespacedPath: toNamespacedPath,
    dirname: dirname,
    basename: basename,
    extname: extname,
    format: format,
    parse: parse,
    fromFileUrl: fromFileUrl
};
const sep1 = "/";
const delimiter1 = ":";
function resolve1(...pathSegments) {
    let resolvedPath = "";
    let resolvedAbsolute = false;
    for(let i = pathSegments.length - 1; i >= -1 && !resolvedAbsolute; i--){
        let path;
        if (i >= 0) path = pathSegments[i];
        else {
            if (globalThis.Deno == null) {
                throw new TypeError("Resolved a relative path without a CWD.");
            }
            path = Deno.cwd();
        }
        assertPath(path);
        if (path.length === 0) {
            continue;
        }
        resolvedPath = `${path}/${resolvedPath}`;
        resolvedAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    }
    resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute, "/", isPosixPathSeparator);
    if (resolvedAbsolute) {
        if (resolvedPath.length > 0) return `/${resolvedPath}`;
        else return "/";
    } else if (resolvedPath.length > 0) return resolvedPath;
    else return ".";
}
function normalize1(path) {
    assertPath(path);
    if (path.length === 0) return ".";
    const isAbsolute = path.charCodeAt(0) === 47;
    const trailingSeparator = path.charCodeAt(path.length - 1) === 47;
    path = normalizeString(path, !isAbsolute, "/", isPosixPathSeparator);
    if (path.length === 0 && !isAbsolute) path = ".";
    if (path.length > 0 && trailingSeparator) path += "/";
    if (isAbsolute) return `/${path}`;
    return path;
}
function isAbsolute1(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47;
}
function join1(...paths) {
    if (paths.length === 0) return ".";
    let joined;
    for(let i = 0, len = paths.length; i < len; ++i){
        const path = paths[i];
        assertPath(path);
        if (path.length > 0) {
            if (!joined) joined = path;
            else joined += `/${path}`;
        }
    }
    if (!joined) return ".";
    return normalize1(joined);
}
function relative1(from, to) {
    assertPath(from);
    assertPath(to);
    if (from === to) return "";
    from = resolve1(from);
    to = resolve1(to);
    if (from === to) return "";
    let fromStart = 1;
    const fromEnd = from.length;
    for(; fromStart < fromEnd; ++fromStart){
        if (from.charCodeAt(fromStart) !== 47) break;
    }
    const fromLen = fromEnd - fromStart;
    let toStart = 1;
    const toEnd = to.length;
    for(; toStart < toEnd; ++toStart){
        if (to.charCodeAt(toStart) !== 47) break;
    }
    const toLen = toEnd - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for(; i <= length; ++i){
        if (i === length) {
            if (toLen > length) {
                if (to.charCodeAt(toStart + i) === 47) {
                    return to.slice(toStart + i + 1);
                } else if (i === 0) {
                    return to.slice(toStart + i);
                }
            } else if (fromLen > length) {
                if (from.charCodeAt(fromStart + i) === 47) {
                    lastCommonSep = i;
                } else if (i === 0) {
                    lastCommonSep = 0;
                }
            }
            break;
        }
        const fromCode = from.charCodeAt(fromStart + i);
        const toCode = to.charCodeAt(toStart + i);
        if (fromCode !== toCode) break;
        else if (fromCode === 47) lastCommonSep = i;
    }
    let out = "";
    for(i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i){
        if (i === fromEnd || from.charCodeAt(i) === 47) {
            if (out.length === 0) out += "..";
            else out += "/..";
        }
    }
    if (out.length > 0) return out + to.slice(toStart + lastCommonSep);
    else {
        toStart += lastCommonSep;
        if (to.charCodeAt(toStart) === 47) ++toStart;
        return to.slice(toStart);
    }
}
function toNamespacedPath1(path) {
    return path;
}
function dirname1(path) {
    assertPath(path);
    if (path.length === 0) return ".";
    const hasRoot = path.charCodeAt(0) === 47;
    let end = -1;
    let matchedSlash = true;
    for(let i = path.length - 1; i >= 1; --i){
        if (path.charCodeAt(i) === 47) {
            if (!matchedSlash) {
                end = i;
                break;
            }
        } else {
            matchedSlash = false;
        }
    }
    if (end === -1) return hasRoot ? "/" : ".";
    if (hasRoot && end === 1) return "//";
    return path.slice(0, end);
}
function basename1(path, ext = "") {
    if (ext !== undefined && typeof ext !== "string") {
        throw new TypeError('"ext" argument must be a string');
    }
    assertPath(path);
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    let i;
    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
        if (ext.length === path.length && ext === path) return "";
        let extIdx = ext.length - 1;
        let firstNonSlashEnd = -1;
        for(i = path.length - 1; i >= 0; --i){
            const code = path.charCodeAt(i);
            if (code === 47) {
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            } else {
                if (firstNonSlashEnd === -1) {
                    matchedSlash = false;
                    firstNonSlashEnd = i + 1;
                }
                if (extIdx >= 0) {
                    if (code === ext.charCodeAt(extIdx)) {
                        if (--extIdx === -1) {
                            end = i;
                        }
                    } else {
                        extIdx = -1;
                        end = firstNonSlashEnd;
                    }
                }
            }
        }
        if (start === end) end = firstNonSlashEnd;
        else if (end === -1) end = path.length;
        return path.slice(start, end);
    } else {
        for(i = path.length - 1; i >= 0; --i){
            if (path.charCodeAt(i) === 47) {
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            } else if (end === -1) {
                matchedSlash = false;
                end = i + 1;
            }
        }
        if (end === -1) return "";
        return path.slice(start, end);
    }
}
function extname1(path) {
    assertPath(path);
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    for(let i = path.length - 1; i >= 0; --i){
        const code = path.charCodeAt(i);
        if (code === 47) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        return "";
    }
    return path.slice(startDot, end);
}
function format1(pathObject) {
    if (pathObject === null || typeof pathObject !== "object") {
        throw new TypeError(`The "pathObject" argument must be of type Object. Received type ${typeof pathObject}`);
    }
    return _format("/", pathObject);
}
function parse1(path) {
    assertPath(path);
    const ret = {
        root: "",
        dir: "",
        base: "",
        ext: "",
        name: ""
    };
    if (path.length === 0) return ret;
    const isAbsolute = path.charCodeAt(0) === 47;
    let start;
    if (isAbsolute) {
        ret.root = "/";
        start = 1;
    } else {
        start = 0;
    }
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    let preDotState = 0;
    for(; i >= start; --i){
        const code = path.charCodeAt(i);
        if (code === 47) {
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            matchedSlash = false;
            end = i + 1;
        }
        if (code === 46) {
            if (startDot === -1) startDot = i;
            else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
            preDotState = -1;
        }
    }
    if (startDot === -1 || end === -1 || preDotState === 0 || preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        if (end !== -1) {
            if (startPart === 0 && isAbsolute) {
                ret.base = ret.name = path.slice(1, end);
            } else {
                ret.base = ret.name = path.slice(startPart, end);
            }
        }
    } else {
        if (startPart === 0 && isAbsolute) {
            ret.name = path.slice(1, startDot);
            ret.base = path.slice(1, end);
        } else {
            ret.name = path.slice(startPart, startDot);
            ret.base = path.slice(startPart, end);
        }
        ret.ext = path.slice(startDot, end);
    }
    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);
    else if (isAbsolute) ret.dir = "/";
    return ret;
}
function fromFileUrl1(url) {
    url = url instanceof URL ? url : new URL(url);
    if (url.protocol != "file:") {
        throw new TypeError("Must be a file URL.");
    }
    return decodeURIComponent(url.pathname.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"));
}
const mod1 = {
    sep: sep1,
    delimiter: delimiter1,
    resolve: resolve1,
    normalize: normalize1,
    isAbsolute: isAbsolute1,
    join: join1,
    relative: relative1,
    toNamespacedPath: toNamespacedPath1,
    dirname: dirname1,
    basename: basename1,
    extname: extname1,
    format: format1,
    parse: parse1,
    fromFileUrl: fromFileUrl1
};
const path = isWindows ? mod : mod1;
const { basename: basename2 , delimiter: delimiter2 , dirname: dirname2 , extname: extname2 , format: format2 , fromFileUrl: fromFileUrl2 , isAbsolute: isAbsolute2 , join: join2 , normalize: normalize2 , parse: parse2 , relative: relative2 , resolve: resolve2 , sep: sep2 , toNamespacedPath: toNamespacedPath2  } = path;
Deno.build.os == "windows";
Deno.build.os === "windows";
var EOL;
(function(EOL) {
    EOL["LF"] = "\n";
    EOL["CRLF"] = "\r\n";
})(EOL || (EOL = {}));
var Status;
(function(Status) {
    Status[Status["Continue"] = 100] = "Continue";
    Status[Status["SwitchingProtocols"] = 101] = "SwitchingProtocols";
    Status[Status["Processing"] = 102] = "Processing";
    Status[Status["EarlyHints"] = 103] = "EarlyHints";
    Status[Status["OK"] = 200] = "OK";
    Status[Status["Created"] = 201] = "Created";
    Status[Status["Accepted"] = 202] = "Accepted";
    Status[Status["NonAuthoritativeInfo"] = 203] = "NonAuthoritativeInfo";
    Status[Status["NoContent"] = 204] = "NoContent";
    Status[Status["ResetContent"] = 205] = "ResetContent";
    Status[Status["PartialContent"] = 206] = "PartialContent";
    Status[Status["MultiStatus"] = 207] = "MultiStatus";
    Status[Status["AlreadyReported"] = 208] = "AlreadyReported";
    Status[Status["IMUsed"] = 226] = "IMUsed";
    Status[Status["MultipleChoices"] = 300] = "MultipleChoices";
    Status[Status["MovedPermanently"] = 301] = "MovedPermanently";
    Status[Status["Found"] = 302] = "Found";
    Status[Status["SeeOther"] = 303] = "SeeOther";
    Status[Status["NotModified"] = 304] = "NotModified";
    Status[Status["UseProxy"] = 305] = "UseProxy";
    Status[Status["TemporaryRedirect"] = 307] = "TemporaryRedirect";
    Status[Status["PermanentRedirect"] = 308] = "PermanentRedirect";
    Status[Status["BadRequest"] = 400] = "BadRequest";
    Status[Status["Unauthorized"] = 401] = "Unauthorized";
    Status[Status["PaymentRequired"] = 402] = "PaymentRequired";
    Status[Status["Forbidden"] = 403] = "Forbidden";
    Status[Status["NotFound"] = 404] = "NotFound";
    Status[Status["MethodNotAllowed"] = 405] = "MethodNotAllowed";
    Status[Status["NotAcceptable"] = 406] = "NotAcceptable";
    Status[Status["ProxyAuthRequired"] = 407] = "ProxyAuthRequired";
    Status[Status["RequestTimeout"] = 408] = "RequestTimeout";
    Status[Status["Conflict"] = 409] = "Conflict";
    Status[Status["Gone"] = 410] = "Gone";
    Status[Status["LengthRequired"] = 411] = "LengthRequired";
    Status[Status["PreconditionFailed"] = 412] = "PreconditionFailed";
    Status[Status["RequestEntityTooLarge"] = 413] = "RequestEntityTooLarge";
    Status[Status["RequestURITooLong"] = 414] = "RequestURITooLong";
    Status[Status["UnsupportedMediaType"] = 415] = "UnsupportedMediaType";
    Status[Status["RequestedRangeNotSatisfiable"] = 416] = "RequestedRangeNotSatisfiable";
    Status[Status["ExpectationFailed"] = 417] = "ExpectationFailed";
    Status[Status["Teapot"] = 418] = "Teapot";
    Status[Status["MisdirectedRequest"] = 421] = "MisdirectedRequest";
    Status[Status["UnprocessableEntity"] = 422] = "UnprocessableEntity";
    Status[Status["Locked"] = 423] = "Locked";
    Status[Status["FailedDependency"] = 424] = "FailedDependency";
    Status[Status["TooEarly"] = 425] = "TooEarly";
    Status[Status["UpgradeRequired"] = 426] = "UpgradeRequired";
    Status[Status["PreconditionRequired"] = 428] = "PreconditionRequired";
    Status[Status["TooManyRequests"] = 429] = "TooManyRequests";
    Status[Status["RequestHeaderFieldsTooLarge"] = 431] = "RequestHeaderFieldsTooLarge";
    Status[Status["UnavailableForLegalReasons"] = 451] = "UnavailableForLegalReasons";
    Status[Status["InternalServerError"] = 500] = "InternalServerError";
    Status[Status["NotImplemented"] = 501] = "NotImplemented";
    Status[Status["BadGateway"] = 502] = "BadGateway";
    Status[Status["ServiceUnavailable"] = 503] = "ServiceUnavailable";
    Status[Status["GatewayTimeout"] = 504] = "GatewayTimeout";
    Status[Status["HTTPVersionNotSupported"] = 505] = "HTTPVersionNotSupported";
    Status[Status["VariantAlsoNegotiates"] = 506] = "VariantAlsoNegotiates";
    Status[Status["InsufficientStorage"] = 507] = "InsufficientStorage";
    Status[Status["LoopDetected"] = 508] = "LoopDetected";
    Status[Status["NotExtended"] = 510] = "NotExtended";
    Status[Status["NetworkAuthenticationRequired"] = 511] = "NetworkAuthenticationRequired";
})(Status || (Status = {}));
const STATUS_TEXT = {
    [Status.Accepted]: "Accepted",
    [Status.AlreadyReported]: "Already Reported",
    [Status.BadGateway]: "Bad Gateway",
    [Status.BadRequest]: "Bad Request",
    [Status.Conflict]: "Conflict",
    [Status.Continue]: "Continue",
    [Status.Created]: "Created",
    [Status.EarlyHints]: "Early Hints",
    [Status.ExpectationFailed]: "Expectation Failed",
    [Status.FailedDependency]: "Failed Dependency",
    [Status.Forbidden]: "Forbidden",
    [Status.Found]: "Found",
    [Status.GatewayTimeout]: "Gateway Timeout",
    [Status.Gone]: "Gone",
    [Status.HTTPVersionNotSupported]: "HTTP Version Not Supported",
    [Status.IMUsed]: "IM Used",
    [Status.InsufficientStorage]: "Insufficient Storage",
    [Status.InternalServerError]: "Internal Server Error",
    [Status.LengthRequired]: "Length Required",
    [Status.Locked]: "Locked",
    [Status.LoopDetected]: "Loop Detected",
    [Status.MethodNotAllowed]: "Method Not Allowed",
    [Status.MisdirectedRequest]: "Misdirected Request",
    [Status.MovedPermanently]: "Moved Permanently",
    [Status.MultiStatus]: "Multi Status",
    [Status.MultipleChoices]: "Multiple Choices",
    [Status.NetworkAuthenticationRequired]: "Network Authentication Required",
    [Status.NoContent]: "No Content",
    [Status.NonAuthoritativeInfo]: "Non Authoritative Info",
    [Status.NotAcceptable]: "Not Acceptable",
    [Status.NotExtended]: "Not Extended",
    [Status.NotFound]: "Not Found",
    [Status.NotImplemented]: "Not Implemented",
    [Status.NotModified]: "Not Modified",
    [Status.OK]: "OK",
    [Status.PartialContent]: "Partial Content",
    [Status.PaymentRequired]: "Payment Required",
    [Status.PermanentRedirect]: "Permanent Redirect",
    [Status.PreconditionFailed]: "Precondition Failed",
    [Status.PreconditionRequired]: "Precondition Required",
    [Status.Processing]: "Processing",
    [Status.ProxyAuthRequired]: "Proxy Auth Required",
    [Status.RequestEntityTooLarge]: "Request Entity Too Large",
    [Status.RequestHeaderFieldsTooLarge]: "Request Header Fields Too Large",
    [Status.RequestTimeout]: "Request Timeout",
    [Status.RequestURITooLong]: "Request URI Too Long",
    [Status.RequestedRangeNotSatisfiable]: "Requested Range Not Satisfiable",
    [Status.ResetContent]: "Reset Content",
    [Status.SeeOther]: "See Other",
    [Status.ServiceUnavailable]: "Service Unavailable",
    [Status.SwitchingProtocols]: "Switching Protocols",
    [Status.Teapot]: "I'm a teapot",
    [Status.TemporaryRedirect]: "Temporary Redirect",
    [Status.TooEarly]: "Too Early",
    [Status.TooManyRequests]: "Too Many Requests",
    [Status.Unauthorized]: "Unauthorized",
    [Status.UnavailableForLegalReasons]: "Unavailable For Legal Reasons",
    [Status.UnprocessableEntity]: "Unprocessable Entity",
    [Status.UnsupportedMediaType]: "Unsupported Media Type",
    [Status.UpgradeRequired]: "Upgrade Required",
    [Status.UseProxy]: "Use Proxy",
    [Status.VariantAlsoNegotiates]: "Variant Also Negotiates"
};
function isClientErrorStatus(status) {
    return status >= 400 && status < 500;
}
const ERROR_STATUS_MAP = {
    "BadRequest": 400,
    "Unauthorized": 401,
    "PaymentRequired": 402,
    "Forbidden": 403,
    "NotFound": 404,
    "MethodNotAllowed": 405,
    "NotAcceptable": 406,
    "ProxyAuthRequired": 407,
    "RequestTimeout": 408,
    "Conflict": 409,
    "Gone": 410,
    "LengthRequired": 411,
    "PreconditionFailed": 412,
    "RequestEntityTooLarge": 413,
    "RequestURITooLong": 414,
    "UnsupportedMediaType": 415,
    "RequestedRangeNotSatisfiable": 416,
    "ExpectationFailed": 417,
    "Teapot": 418,
    "MisdirectedRequest": 421,
    "UnprocessableEntity": 422,
    "Locked": 423,
    "FailedDependency": 424,
    "UpgradeRequired": 426,
    "PreconditionRequired": 428,
    "TooManyRequests": 429,
    "RequestHeaderFieldsTooLarge": 431,
    "UnavailableForLegalReasons": 451,
    "InternalServerError": 500,
    "NotImplemented": 501,
    "BadGateway": 502,
    "ServiceUnavailable": 503,
    "GatewayTimeout": 504,
    "HTTPVersionNotSupported": 505,
    "VariantAlsoNegotiates": 506,
    "InsufficientStorage": 507,
    "LoopDetected": 508,
    "NotExtended": 510,
    "NetworkAuthenticationRequired": 511
};
class HttpError extends Error {
    #status = Status.InternalServerError;
    #expose;
    #headers;
    constructor(message = "Http Error", options){
        super(message, options);
        this.#expose = options?.expose === undefined ? isClientErrorStatus(this.status) : options.expose;
        if (options?.headers) {
            this.#headers = new Headers(options.headers);
        }
    }
    get expose() {
        return this.#expose;
    }
    get headers() {
        return this.#headers;
    }
    get status() {
        return this.#status;
    }
}
function createHttpErrorConstructor(status) {
    const name = `${Status[status]}Error`;
    const ErrorCtor = class extends HttpError {
        constructor(message = STATUS_TEXT[status], options){
            super(message, options);
            Object.defineProperty(this, "name", {
                configurable: true,
                enumerable: false,
                value: name,
                writable: true
            });
        }
        get status() {
            return status;
        }
    };
    return ErrorCtor;
}
const errors = {};
for (const [key, value] of Object.entries(ERROR_STATUS_MAP)){
    errors[key] = createHttpErrorConstructor(value);
}
function createHttpError(status = Status.InternalServerError, message, options) {
    return new errors[Status[status]](message, options);
}
class BaseSlackAPIClient {
    #token;
    #baseURL;
    constructor(token, options = {}){
        this.#token = token;
        this.#baseURL = options.slackApiUrl || "https://slack.com/api/";
    }
    setSlackApiUrl(apiURL) {
        this.#baseURL = apiURL;
        return this;
    }
    async apiCall(method, data = {}) {
        const url = `${this.#baseURL.replace(/\/$/, "")}/${method}`;
        const body = serializeData(data);
        const token = data.token || this.#token || "";
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body
        });
        if (!response.ok) {
            throw await this.createHttpError(response);
        }
        return await this.createBaseResponse(response);
    }
    async response(url, data) {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw await this.createHttpError(response);
        }
        return await this.createBaseResponse(response);
    }
    async createHttpError(response) {
        const text = await response.text();
        return createHttpError(response.status, `${response.status}: ${text}`, {
            headers: response.headers
        });
    }
    async createBaseResponse(response) {
        return {
            toFetchResponse: ()=>response,
            ...await response.json()
        };
    }
}
function serializeData(data) {
    const encodedData = {};
    Object.entries(data).forEach(([key, value])=>{
        if (value === undefined) return;
        const serializedValue = typeof value !== "string" ? JSON.stringify(value) : value;
        encodedData[key] = serializedValue;
    });
    return new URLSearchParams(encodedData);
}
const ProxifyAndTypeClient = (baseClient)=>{
    const apiCallHandler = (method, payload)=>{
        return baseClient.apiCall(method, payload);
    };
    const clientToProxy = {
        setSlackApiUrl: baseClient.setSlackApiUrl.bind(baseClient),
        apiCall: baseClient.apiCall.bind(baseClient),
        response: baseClient.response.bind(baseClient)
    };
    const client = APIProxy(clientToProxy, apiCallHandler);
    return client;
};
const APIProxy = (rootClient, apiCallback, ...path)=>{
    const method = path.filter(Boolean).join(".");
    const objectToProxy = rootClient !== null ? rootClient : (payload)=>{
        return apiCallback(method, payload);
    };
    const proxy = new Proxy(objectToProxy, {
        get (obj, prop) {
            if (typeof prop === "string" && !(prop in obj)) {
                return APIProxy(null, apiCallback, ...path, prop);
            }
            return Reflect.get.apply(obj, arguments);
        }
    });
    return proxy;
};
const Interactor = {
    id: "{{data.interactivity.interactor.id}}"
};
Object.defineProperty(Interactor, "toJSON", {
    value: ()=>"{{data.interactivity.interactor}}"
});
const Interactivity = {
    interactivity_pointer: "{{data.interactivity.interactivity_pointer}}",
    interactor: Interactor
};
Object.defineProperty(Interactivity, "toJSON", {
    value: ()=>"{{data.interactivity}}"
});
const DndStatus = {
    dnd_enabled: "{{data.dnd_status.dnd_enabled}}",
    next_dnd_end_ts: "{{data.dnd_status.next_dnd_end_ts}}",
    next_dnd_start_ts: "{{data.dnd_status.next_dnd_start_ts}}"
};
Object.defineProperty(DndStatus, "toJSON", {
    value: ()=>"{{data.dnd_status}}"
});
const Icon = {};
Object.defineProperty(Icon, "toJSON", {
    value: ()=>"{{data.invite.inviting_team.icon}}"
});
const InvitingTeam = {
    date_created: "{{data.invite.inviting_team.date_created}}",
    domain: "{{data.invite.inviting_team.domain}}",
    icon: Icon,
    id: "{{data.invite.inviting_team.id}}",
    is_verified: "{{data.invite.inviting_team.is_verified}}",
    name: "{{data.invite.inviting_team.name}}"
};
Object.defineProperty(InvitingTeam, "toJSON", {
    value: ()=>"{{data.invite.inviting_team}}"
});
const InvitingUser = {
    display_name: "{{data.invite.inviting_user.display_name}}",
    id: "{{data.invite.inviting_user.id}}",
    is_bot: "{{data.invite.inviting_user.is_bot}}",
    name: "{{data.invite.inviting_user.name}}",
    real_name: "{{data.invite.inviting_user.real_name}}",
    team_id: "{{data.invite.inviting_user.team_id}}",
    timezone: "{{data.invite.inviting_user.timezone}}"
};
Object.defineProperty(InvitingUser, "toJSON", {
    value: ()=>"{{data.invite.inviting_user}}"
});
const Invite = {
    date_created: "{{data.invite.date_created}}",
    date_invalid: "{{data.invite.date_invalid}}",
    id: "{{data.invite.id}}",
    inviting_team: InvitingTeam,
    inviting_user: InvitingUser,
    recipient_email: "{{data.invite.recipient_email}}",
    recipient_user_id: "{{data.invite.recipient_user_id}}"
};
Object.defineProperty(Invite, "toJSON", {
    value: ()=>"{{data.invite}}"
});
const AcceptingUser = {
    display_name: "{{data.accepting_user.display_name}}",
    id: "{{data.accepting_user.id}}",
    is_bot: "{{data.accepting_user.is_bot}}",
    name: "{{data.accepting_user.name}}",
    real_name: "{{data.accepting_user.real_name}}",
    team_id: "{{data.accepting_user.team_id}}",
    timezone: "{{data.accepting_user.timezone}}"
};
Object.defineProperty(AcceptingUser, "toJSON", {
    value: ()=>"{{data.accepting_user}}"
});
const ApprovingUser = {
    display_name: "{{data.approving_user.display_name}}",
    id: "{{data.approving_user.id}}",
    is_bot: "{{data.approving_user.is_bot}}",
    name: "{{data.approving_user.name}}",
    real_name: "{{data.approving_user.real_name}}",
    team_id: "{{data.approving_user.team_id}}",
    timezone: "{{data.approving_user.timezone}}"
};
Object.defineProperty(ApprovingUser, "toJSON", {
    value: ()=>"{{data.approving_user}}"
});
const DecliningUser = {
    display_name: "{{data.declining_user.display_name}}",
    id: "{{data.declining_user.id}}",
    is_bot: "{{data.declining_user.is_bot}}",
    name: "{{data.declining_user.name}}",
    real_name: "{{data.declining_user.real_name}}",
    team_id: "{{data.declining_user.team_id}}",
    timezone: "{{data.declining_user.timezone}}"
};
Object.defineProperty(DecliningUser, "toJSON", {
    value: ()=>"{{data.declining_user}}"
});
const User = {
    display_name: "{{data.user.display_name}}",
    id: "{{data.user.id}}",
    is_bot: "{{data.user.is_bot}}",
    name: "{{data.user.name}}",
    real_name: "{{data.user.real_name}}",
    team_id: "{{data.user.team_id}}",
    timezone: "{{data.user.timezone}}"
};
Object.defineProperty(User, "toJSON", {
    value: ()=>"{{data.user}}"
});
const SlackAPI = (token, options = {})=>{
    const baseClient = new BaseSlackAPIClient(token, options);
    const client = ProxifyAndTypeClient(baseClient);
    return client;
};
const enrichContext = (context)=>{
    const token = context.token;
    const slackApiUrl = (context.env || {})["SLACK_API_URL"];
    const client = SlackAPI(token, {
        slackApiUrl: slackApiUrl ? slackApiUrl : undefined
    });
    return {
        ...context,
        client
    };
};
class UnhandledEventError extends Error {
    constructor(message){
        super(message);
        this.name = "UnhandledEventError";
    }
}
function normalizeConstraintToArray(constraint) {
    if (typeof constraint === "string") {
        constraint = [
            constraint
        ];
    }
    return constraint;
}
function matchBasicConstraintField(constraint, field, payload) {
    if (constraint instanceof RegExp) {
        if (payload[field].match(constraint)) {
            return true;
        }
    } else if (constraint instanceof Array) {
        for(let j = 0; j < constraint.length; j++){
            const c = constraint[j];
            if (payload[field] === c) {
                return true;
            }
        }
    }
    return false;
}
const BlockActionsRouter = (func)=>{
    const router = new ActionsRouter(func);
    const exportedHandler = router.export();
    exportedHandler.addHandler = (...args)=>{
        router.addHandler.apply(router, args);
        return exportedHandler;
    };
    return exportedHandler;
};
class ActionsRouter {
    routes;
    constructor(func){
        this.func = func;
        this.func = func;
        this.routes = [];
    }
    addHandler(actionConstraint, handler) {
        this.routes.push([
            actionConstraint,
            handler
        ]);
        return this;
    }
    export() {
        return async (context)=>{
            const action = context.action;
            const handler = this.matchHandler(action);
            if (handler === null) {
                throw new UnhandledEventError(`Received block action payload with action=${JSON.stringify(action)} but this app has no action handler defined to handle it!`);
            }
            const enrichedContext = enrichContext(context);
            return await handler(enrichedContext);
        };
    }
    matchHandler(action) {
        for(let i = 0; i < this.routes.length; i++){
            const route = this.routes[i];
            let [constraint, handler] = route;
            if (constraint instanceof RegExp || constraint instanceof Array || typeof constraint === "string") {
                constraint = normalizeConstraintToArray(constraint);
                if (matchBasicConstraintField(constraint, "action_id", action)) {
                    return handler;
                }
            } else {
                let actionIDMatched = constraint.action_id ? false : true;
                let blockIDMatched = constraint.block_id ? false : true;
                if (constraint.action_id) {
                    actionIDMatched = matchBasicConstraintField(normalizeConstraintToArray(constraint.action_id), "action_id", action);
                }
                if (constraint.block_id) {
                    blockIDMatched = matchBasicConstraintField(normalizeConstraintToArray(constraint.block_id), "block_id", action);
                }
                if (blockIDMatched && actionIDMatched) {
                    return handler;
                }
            }
        }
        return null;
    }
    func;
}
const BlockSuggestionRouter = (func)=>{
    const router = new SuggestionRouter(func);
    const exportedHandler = router.export();
    exportedHandler.addHandler = (...args)=>{
        router.addHandler.apply(router, args);
        return exportedHandler;
    };
    return exportedHandler;
};
class SuggestionRouter {
    routes;
    constructor(func){
        this.func = func;
        this.func = func;
        this.routes = [];
    }
    addHandler(actionConstraint, handler) {
        this.routes.push([
            actionConstraint,
            handler
        ]);
        return this;
    }
    export() {
        return async (context)=>{
            const suggestion = context.body;
            const handler = this.matchHandler(suggestion);
            if (handler === null) {
                throw new UnhandledEventError(`Received block suggestion payload with suggestion=${JSON.stringify(suggestion)} but this app has no suggestion handler defined to handle it!`);
            }
            const enrichedContext = enrichContext(context);
            return await handler(enrichedContext);
        };
    }
    matchHandler(action) {
        for(let i = 0; i < this.routes.length; i++){
            const route = this.routes[i];
            let [constraint, handler] = route;
            if (constraint instanceof RegExp || constraint instanceof Array || typeof constraint === "string") {
                constraint = normalizeConstraintToArray(constraint);
                if (matchBasicConstraintField(constraint, "action_id", action)) {
                    return handler;
                }
            } else {
                let actionIDMatched = constraint.action_id ? false : true;
                let blockIDMatched = constraint.block_id ? false : true;
                if (constraint.action_id) {
                    actionIDMatched = matchBasicConstraintField(normalizeConstraintToArray(constraint.action_id), "action_id", action);
                }
                if (constraint.block_id) {
                    blockIDMatched = matchBasicConstraintField(normalizeConstraintToArray(constraint.block_id), "block_id", action);
                }
                if (blockIDMatched && actionIDMatched) {
                    return handler;
                }
            }
        }
        return null;
    }
    func;
}
const ViewsRouter = (func)=>{
    return new ViewRouter(func);
};
class ViewRouter {
    closedRoutes;
    submissionRoutes;
    constructor(func){
        this.func = func;
        this.func = func;
        this.submissionRoutes = [];
        this.closedRoutes = [];
        this.viewClosed = this.viewClosed.bind(this);
        this.viewSubmission = this.viewSubmission.bind(this);
    }
    addClosedHandler(viewConstraint, handler) {
        const constraint = {
            type: "view_closed",
            callback_id: viewConstraint
        };
        this.closedRoutes.push([
            constraint,
            handler
        ]);
        return this;
    }
    addSubmissionHandler(viewConstraint, handler) {
        const constraint = {
            type: "view_submission",
            callback_id: viewConstraint
        };
        this.submissionRoutes.push([
            constraint,
            handler
        ]);
        return this;
    }
    async viewClosed(context) {
        const handler = this.matchHandler(context.body.type, context.view);
        if (handler === null) {
            throw new UnhandledEventError(`Received ${context.body.type} payload ${JSON.stringify(context.view)} but this app has no view handler defined to handle it!`);
        }
        const enrichedContext = enrichContext(context);
        return await handler(enrichedContext);
    }
    async viewSubmission(context) {
        const handler = this.matchHandler(context.body.type, context.view);
        if (handler === null) {
            throw new UnhandledEventError(`Received ${context.body.type} payload ${JSON.stringify(context.view)} but this app has no view handler defined to handle it!`);
        }
        const enrichedContext = enrichContext(context);
        return await handler(enrichedContext);
    }
    matchHandler(type, view) {
        let routes;
        if (type === "view_closed") {
            routes = this.closedRoutes;
        } else {
            routes = this.submissionRoutes;
        }
        for(let i = 0; i < routes.length; i++){
            const route = routes[i];
            const [constraint, _handler] = route;
            if (constraint.type !== type) continue;
            const constraintArray = normalizeConstraintToArray(constraint.callback_id);
            if (matchBasicConstraintField(constraintArray, "callback_id", view)) {
                return _handler;
            }
        }
        return null;
    }
    func;
}
const SlackFunction = (func, functionHandler)=>{
    const handlerModule = (ctx, ...args)=>{
        const newContext = enrichContext(ctx);
        return functionHandler.apply(functionHandler, [
            newContext,
            ...args
        ]);
    };
    handlerModule.unhandledEvent = undefined;
    const blockActionsRouter = BlockActionsRouter(func);
    const blockSuggestionRouter = BlockSuggestionRouter(func);
    const viewsRouter = ViewsRouter(func);
    handlerModule.addBlockActionsHandler = (...args)=>{
        blockActionsRouter.addHandler.apply(blockActionsRouter, args);
        return handlerModule;
    };
    handlerModule.addBlockSuggestionHandler = (...args)=>{
        blockSuggestionRouter.addHandler.apply(blockSuggestionRouter, args);
        return handlerModule;
    };
    handlerModule.addViewClosedHandler = (...args)=>{
        viewsRouter.addClosedHandler.apply(viewsRouter, args);
        return handlerModule;
    };
    handlerModule.addViewSubmissionHandler = (...args)=>{
        viewsRouter.addSubmissionHandler.apply(viewsRouter, args);
        return handlerModule;
    };
    handlerModule.addUnhandledEventHandler = (handler)=>{
        handlerModule.unhandledEvent = (ctx, ...args)=>{
            const newContext = enrichContext(ctx);
            return handler.apply(handler, [
                newContext,
                ...args
            ]);
        };
        return handlerModule;
    };
    handlerModule.blockActions = blockActionsRouter;
    handlerModule.blockSuggestion = blockSuggestionRouter;
    handlerModule.viewClosed = viewsRouter.viewClosed;
    handlerModule.viewSubmission = viewsRouter.viewSubmission;
    return handlerModule;
};
const SlackPrimitiveTypes = {
    user_id: "slack#/types/user_id",
    channel_id: "slack#/types/channel_id",
    usergroup_id: "slack#/types/usergroup_id",
    date: "slack#/types/date",
    timestamp: "slack#/types/timestamp",
    blocks: "slack#/types/blocks",
    oauth2: "slack#/types/credential/oauth2",
    rich_text: "slack#/types/rich_text",
    message_ts: "slack#/types/message_ts"
};
const UserContextType = DefineType({
    name: "slack#/types/user_context",
    type: SchemaTypes.object,
    properties: {
        id: {
            type: SlackPrimitiveTypes.user_id
        },
        secret: {
            type: SchemaTypes.string
        }
    },
    required: [
        "id",
        "secret"
    ]
});
const InteractivityType = DefineType({
    name: "slack#/types/interactivity",
    description: "Context about a user interaction",
    type: SchemaTypes.object,
    properties: {
        interactivity_pointer: {
            type: SchemaTypes.string
        },
        interactor: {
            type: UserContextType
        }
    },
    required: [
        "interactivity_pointer",
        "interactor"
    ]
});
const FormInput = DefineType({
    name: "slack#/types/form_input_object",
    description: "Input fields to be shown on the form",
    type: SchemaTypes.object,
    properties: {
        required: {
            type: SchemaTypes.array,
            items: {
                type: SchemaTypes.string
            }
        },
        elements: {
            type: SchemaTypes.array,
            items: {
                type: SchemaTypes.object
            }
        }
    },
    required: [
        "elements"
    ]
});
const MessageContextType = DefineType({
    name: "slack#/types/message_context",
    type: SchemaTypes.object,
    properties: {
        message_ts: {
            type: SlackPrimitiveTypes.message_ts
        },
        user_id: {
            type: SlackPrimitiveTypes.user_id
        },
        channel_id: {
            type: SlackPrimitiveTypes.channel_id
        }
    },
    required: [
        "message_ts"
    ]
});
const CustomSlackTypes = {
    interactivity: InteractivityType,
    user_context: UserContextType,
    message_context: MessageContextType
};
const InternalSlackTypes = {
    form_input_object: FormInput
};
const __default = {
    ...SlackPrimitiveTypes,
    ...CustomSlackTypes
};
const __default1 = DefineFunction({
    callback_id: "slack#/functions/add_pin",
    source_file: "",
    title: "Pin to channel",
    description: "Pin a message to a channel",
    input_parameters: {
        properties: {
            channel_id: {
                type: __default.channel_id,
                description: "Search all channels",
                title: "Select a channel"
            },
            message: {
                type: SchemaTypes.string,
                description: "Enter a message URL or message timestamp",
                title: "Message URL or message timestamp"
            }
        },
        required: [
            "channel_id",
            "message"
        ]
    },
    output_parameters: {
        properties: {},
        required: []
    }
});
const __default2 = DefineFunction({
    callback_id: "slack#/functions/add_user_to_usergroup",
    source_file: "",
    title: "Add to user group",
    description: "Add someone to a user group.",
    input_parameters: {
        properties: {
            usergroup_id: {
                type: __default.usergroup_id,
                description: "Search all user groups",
                title: "Select a user group"
            },
            user_ids: {
                type: SchemaTypes.array,
                description: "Search all people",
                title: "Select member(s)",
                items: {
                    type: __default.user_id
                }
            }
        },
        required: [
            "usergroup_id",
            "user_ids"
        ]
    },
    output_parameters: {
        properties: {
            usergroup_id: {
                type: __default.usergroup_id,
                description: "User group",
                title: "User group"
            }
        },
        required: [
            "usergroup_id"
        ]
    }
});
const __default3 = DefineFunction({
    callback_id: "slack#/functions/archive_channel",
    source_file: "",
    title: "Archive a channel",
    description: "Archive a Slack channel",
    input_parameters: {
        properties: {
            channel_id: {
                type: __default.channel_id,
                description: "Search all channels",
                title: "Select a channel"
            }
        },
        required: [
            "channel_id"
        ]
    },
    output_parameters: {
        properties: {
            channel_id: {
                type: __default.channel_id,
                description: "Channel name",
                title: "Channel name"
            }
        },
        required: [
            "channel_id"
        ]
    }
});
const __default4 = DefineFunction({
    callback_id: "slack#/functions/create_channel",
    source_file: "",
    title: "Create a channel",
    description: "Create a Slack channel",
    input_parameters: {
        properties: {
            channel_name: {
                type: SchemaTypes.string,
                description: "Enter a channel name",
                title: "Channel name"
            },
            manager_ids: {
                type: SchemaTypes.array,
                description: "Search all people",
                title: "Select Channel Manager(s)",
                items: {
                    type: __default.user_id
                }
            },
            is_private: {
                type: SchemaTypes.boolean,
                description: "Make this channel private",
                title: "Make channel private"
            }
        },
        required: [
            "channel_name"
        ]
    },
    output_parameters: {
        properties: {
            channel_id: {
                type: __default.channel_id,
                description: "Channel name",
                title: "Channel name"
            },
            manager_ids: {
                type: SchemaTypes.array,
                description: "Person(s) who were made channel manager",
                title: "Person(s) who were made channel manager",
                items: {
                    type: __default.user_id
                }
            }
        },
        required: [
            "channel_id"
        ]
    }
});
const __default5 = DefineFunction({
    callback_id: "slack#/functions/create_usergroup",
    source_file: "",
    title: "Create a user group",
    description: "Create a Slack user group",
    input_parameters: {
        properties: {
            usergroup_handle: {
                type: SchemaTypes.string,
                description: "Ex: accounts-team",
                title: "Handle"
            },
            usergroup_name: {
                type: SchemaTypes.string,
                description: "Ex. Accounts Team",
                title: "Display name"
            }
        },
        required: [
            "usergroup_handle",
            "usergroup_name"
        ]
    },
    output_parameters: {
        properties: {
            usergroup_id: {
                type: __default.usergroup_id,
                description: "User group",
                title: "User group"
            }
        },
        required: [
            "usergroup_id"
        ]
    }
});
const __default6 = DefineFunction({
    callback_id: "slack#/functions/delay",
    source_file: "",
    title: "Delay",
    description: "Pause the workflow for a set amount of time",
    input_parameters: {
        properties: {
            minutes_to_delay: {
                type: SchemaTypes.integer,
                description: "Enter number of minutes",
                title: "Delay for this many minutes"
            }
        },
        required: [
            "minutes_to_delay"
        ]
    },
    output_parameters: {
        properties: {},
        required: []
    }
});
const __default7 = DefineFunction({
    callback_id: "slack#/functions/invite_user_to_channel",
    source_file: "",
    title: "Invite to channel",
    description: "Invite someone to a channel. This will only work if this workflow created the channel.",
    input_parameters: {
        properties: {
            channel_ids: {
                type: SchemaTypes.array,
                description: "Search all channels",
                title: "Select channel(s)",
                items: {
                    type: __default.channel_id
                }
            },
            user_ids: {
                type: SchemaTypes.array,
                description: "Search all people",
                title: "Select member(s)",
                items: {
                    type: __default.user_id
                }
            }
        },
        required: [
            "channel_ids",
            "user_ids"
        ]
    },
    output_parameters: {
        properties: {
            user_ids: {
                type: SchemaTypes.array,
                description: "Person(s) who were invited",
                title: "Person(s) who were invited",
                items: {
                    type: __default.user_id
                }
            }
        },
        required: []
    }
});
const __default8 = DefineFunction({
    callback_id: "slack#/functions/open_form",
    source_file: "",
    title: "Open a form",
    description: "Opens a form for the user",
    input_parameters: {
        properties: {
            title: {
                type: SchemaTypes.string,
                description: "Title of the form",
                title: "title"
            },
            description: {
                type: SchemaTypes.string,
                description: "Description of the form",
                title: "description"
            },
            submit_label: {
                type: SchemaTypes.string,
                description: "Submit Label of the form",
                title: "submit_label"
            },
            fields: {
                type: InternalSlackTypes.form_input_object,
                description: "Input fields to be shown on the form",
                title: "fields"
            },
            interactivity: {
                type: __default.interactivity,
                description: "Context about the interactive event that led to opening of the form",
                title: "interactivity"
            }
        },
        required: [
            "title",
            "fields",
            "interactivity"
        ]
    },
    output_parameters: {
        properties: {
            fields: {
                type: SchemaTypes.object,
                description: "fields",
                title: "fields"
            },
            interactivity: {
                type: __default.interactivity,
                description: "Context about the form submit action interactive event",
                title: "interactivity"
            }
        },
        required: [
            "fields",
            "interactivity"
        ]
    }
});
const __default9 = DefineFunction({
    callback_id: "slack#/functions/remove_user_from_usergroup",
    source_file: "",
    title: "Remove from a user group",
    description: "Remove someone from a user group",
    input_parameters: {
        properties: {
            usergroup_id: {
                type: __default.usergroup_id,
                description: "Search all user groups",
                title: "Select a user group"
            },
            user_ids: {
                type: SchemaTypes.array,
                description: "Search all people",
                title: "Select member(s)",
                items: {
                    type: __default.user_id
                }
            }
        },
        required: [
            "usergroup_id",
            "user_ids"
        ]
    },
    output_parameters: {
        properties: {
            usergroup_id: {
                type: __default.usergroup_id,
                description: "User group",
                title: "User group"
            }
        },
        required: []
    }
});
const __default10 = DefineFunction({
    callback_id: "slack#/functions/reply_in_thread",
    source_file: "",
    title: "Reply in thread",
    description: "Send a message in a thread",
    input_parameters: {
        properties: {
            message_context: {
                type: __default.message_context,
                description: "Select a message to reply to",
                title: "Select a message to reply to"
            },
            message: {
                type: __default.rich_text,
                description: "Add a reply",
                title: "Add a reply"
            },
            reply_broadcast: {
                type: SchemaTypes.boolean,
                description: "Also send to conversation",
                title: "Also send to conversation"
            },
            metadata: {
                type: SchemaTypes.object,
                description: "Metadata you post to Slack is accessible to any app or user who is a member of that workspace",
                title: "Message metadata",
                properties: {
                    event_type: {
                        type: SchemaTypes.string
                    },
                    event_payload: {
                        type: SchemaTypes.object
                    }
                },
                additionalProperties: true,
                required: [
                    "event_type",
                    "event_payload"
                ]
            }
        },
        required: [
            "message_context",
            "message"
        ]
    },
    output_parameters: {
        properties: {
            message_context: {
                type: __default.message_context,
                description: "Reference to the message sent",
                title: "Reference to the message sent"
            },
            message_link: {
                type: SchemaTypes.string,
                description: "Message link",
                title: "Message link"
            }
        },
        required: [
            "message_context",
            "message_link"
        ]
    }
});
const __default11 = DefineFunction({
    callback_id: "slack#/functions/send_dm",
    source_file: "",
    title: "Send a direct message",
    description: "Send a direct message to someone",
    input_parameters: {
        properties: {
            user_id: {
                type: __default.user_id,
                description: "Search all people",
                title: "Select a member"
            },
            message: {
                type: __default.rich_text,
                description: "Add a message",
                title: "Add a message"
            },
            interactive_blocks: {
                type: __default.blocks,
                description: "Button(s) to send with the message",
                title: "Button(s) to send with the message"
            }
        },
        required: [
            "user_id",
            "message"
        ]
    },
    output_parameters: {
        properties: {
            message_timestamp: {
                type: __default.timestamp,
                description: "Message time stamp",
                title: "Message time stamp"
            },
            message_link: {
                type: SchemaTypes.string,
                description: "Message link",
                title: "Message link"
            },
            action: {
                type: SchemaTypes.object,
                description: "Button interactivity data",
                title: "Button interactivity data"
            },
            interactivity: {
                type: __default.interactivity,
                description: "Interactivity context",
                title: "interactivity"
            },
            message_context: {
                type: __default.message_context,
                description: "Reference to the message sent",
                title: "Reference to the message sent"
            }
        },
        required: [
            "message_timestamp",
            "message_link",
            "message_context"
        ]
    }
});
const __default12 = DefineFunction({
    callback_id: "slack#/functions/send_ephemeral_message",
    source_file: "",
    title: "Send an ephemeral message",
    description: "Send a private message to someone in a channel",
    input_parameters: {
        properties: {
            channel_id: {
                type: __default.channel_id,
                description: "Search all channels",
                title: "Select a channel"
            },
            user_id: {
                type: __default.user_id,
                description: "Search all people",
                title: "Select a member of the channel"
            },
            message: {
                type: __default.rich_text,
                description: "Add a message",
                title: "Add a message"
            },
            thread_ts: {
                type: SchemaTypes.string,
                description: "Provide another message's ts value to make this message a reply",
                title: "Another message's timestamp value"
            }
        },
        required: [
            "channel_id",
            "user_id",
            "message"
        ]
    },
    output_parameters: {
        properties: {
            message_ts: {
                type: __default.message_ts,
                description: "Message time stamp",
                title: "Message time stamp"
            }
        },
        required: [
            "message_ts"
        ]
    }
});
const __default13 = DefineFunction({
    callback_id: "slack#/functions/send_message",
    source_file: "",
    title: "Send a message to channel",
    description: "Send a message to channel",
    input_parameters: {
        properties: {
            channel_id: {
                type: __default.channel_id,
                description: "Search all channels",
                title: "Select a channel"
            },
            message: {
                type: __default.rich_text,
                description: "Add a message",
                title: "Add a message"
            },
            metadata: {
                type: SchemaTypes.object,
                description: "Metadata you post to Slack is accessible to any app or user who is a member of that workspace",
                title: "Message metadata",
                properties: {
                    event_type: {
                        type: SchemaTypes.string
                    },
                    event_payload: {
                        type: SchemaTypes.object
                    }
                },
                additionalProperties: true,
                required: [
                    "event_type",
                    "event_payload"
                ]
            },
            interactive_blocks: {
                type: __default.blocks,
                description: "Button(s) to send with the message",
                title: "Button(s) to send with the message"
            }
        },
        required: [
            "channel_id",
            "message"
        ]
    },
    output_parameters: {
        properties: {
            message_timestamp: {
                type: __default.timestamp,
                description: "Message time stamp",
                title: "Message time stamp"
            },
            message_link: {
                type: SchemaTypes.string,
                description: "Message link",
                title: "Message link"
            },
            action: {
                type: SchemaTypes.object,
                description: "Button interactivity data",
                title: "Button interactivity data"
            },
            interactivity: {
                type: __default.interactivity,
                description: "Interactivity context",
                title: "interactivity"
            },
            message_context: {
                type: __default.message_context,
                description: "Reference to the message sent",
                title: "Reference to the message sent"
            }
        },
        required: [
            "message_timestamp",
            "message_link",
            "message_context"
        ]
    }
});
const __default14 = DefineFunction({
    callback_id: "slack#/functions/update_channel_topic",
    source_file: "",
    title: "Update channel topic",
    description: "Update the topic of a specific channel. This will work only if this workflow created the channel.",
    input_parameters: {
        properties: {
            channel_id: {
                type: __default.channel_id,
                description: "Search all channels",
                title: "Select a channel"
            },
            topic: {
                type: SchemaTypes.string,
                description: "Enter a topic",
                title: "Add a topic"
            }
        },
        required: [
            "channel_id",
            "topic"
        ]
    },
    output_parameters: {
        properties: {
            topic: {
                type: SchemaTypes.string,
                description: "Channel topic",
                title: "Channel topic"
            }
        },
        required: [
            "topic"
        ]
    }
});
const SlackFunctions = {
    AddPin: __default1,
    AddUserToUsergroup: __default2,
    ArchiveChannel: __default3,
    CreateChannel: __default4,
    CreateUsergroup: __default5,
    Delay: __default6,
    InviteUserToChannel: __default7,
    OpenForm: __default8,
    RemoveUserFromUsergroup: __default9,
    ReplyInThread: __default10,
    SendDm: __default11,
    SendEphemeralMessage: __default12,
    SendMessage: __default13,
    UpdateChannelTopic: __default14
};
const SlackSchema = {
    types: __default,
    functions: SlackFunctions
};
const ProviderTypes = {
    CUSTOM: "CUSTOM"
};
const Schema = {
    oauth2: ProviderTypes
};
const Schema1 = {
    types: SchemaTypes,
    slack: SlackSchema,
    providers: Schema
};
const DefineProperty = (definition)=>{
    return definition;
};
const GreetingFunctionDefinition = DefineFunction({
    callback_id: "greeting_function",
    title: "Generate a greeting",
    description: "Generate a greeting",
    source_file: "functions/greeting_function.ts",
    input_parameters: {
        properties: {
            recipient: {
                type: Schema1.slack.types.user_id,
                description: "Greeting recipient"
            },
            message: {
                type: Schema1.types.string,
                description: "Message to the recipient"
            },
            test: DefineProperty({
                type: Schema1.types.object,
                properties: {
                    title: {
                        type: Schema1.types.string,
                        description: "Issue Title"
                    },
                    description: {
                        type: Schema1.types.string,
                        description: "Issue Description"
                    },
                    assignees: {
                        type: Schema1.types.string,
                        description: "Assignees"
                    }
                },
                required: [
                    "title"
                ]
            })
        },
        required: [
            "message",
            "test"
        ]
    },
    output_parameters: {
        properties: {
            greeting: {
                type: Schema1.types.string,
                description: "Greeting for the recipient"
            }
        },
        required: [
            "greeting"
        ]
    }
});
const __default15 = SlackFunction(GreetingFunctionDefinition, ({ inputs  })=>{
    const { recipient , message  } = inputs;
    const salutations = [
        "Hello",
        "Hi",
        "Howdy",
        "Hola",
        "Salut"
    ];
    const salutation = salutations[Math.floor(Math.random() * salutations.length)];
    const greeting = `${salutation}, <@${recipient}>! :wave: Someone sent the following greeting: \n\n>${message}`;
    return {
        outputs: {
            greeting
        }
    };
});
export { __default15 as default };
export { GreetingFunctionDefinition as GreetingFunctionDefinition };
