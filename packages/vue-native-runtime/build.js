Object.defineProperty(exports, "__esModule", { value: true });

var shared$2 = require("@vue/shared");
var React = require("react");
var reactNative = require("react-native");

function _interopDefaultLegacy(e) {
  return e && typeof e === "object" && "default" in e ? e : { default: e };
}

var shared__default = /*#__PURE__*/ _interopDefaultLegacy(shared$2);
var React__default = /*#__PURE__*/ _interopDefaultLegacy(React);

function warn$1(msg, ...args) {
  console.warn(`[Vue warn] ${msg}`, ...args);
}

let activeEffectScope;
class EffectScope {
  constructor(detached = false) {
    /**
     * @internal
     */
    this.active = true;
    /**
     * @internal
     */
    this.effects = [];
    /**
     * @internal
     */
    this.cleanups = [];
    if (!detached && activeEffectScope) {
      this.parent = activeEffectScope;
      this.index =
        (activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(
          this
        ) - 1;
    }
  }
  run(fn) {
    if (this.active) {
      const currentEffectScope = activeEffectScope;
      try {
        activeEffectScope = this;
        return fn();
      } finally {
        activeEffectScope = currentEffectScope;
      }
    } else if (process.env.NODE_ENV !== "production") {
      warn$1(`cannot run an inactive effect scope.`);
    }
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  on() {
    activeEffectScope = this;
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  off() {
    activeEffectScope = this.parent;
  }
  stop(fromParent) {
    if (this.active) {
      let i, l;
      for (i = 0, l = this.effects.length; i < l; i++) {
        this.effects[i].stop();
      }
      for (i = 0, l = this.cleanups.length; i < l; i++) {
        this.cleanups[i]();
      }
      if (this.scopes) {
        for (i = 0, l = this.scopes.length; i < l; i++) {
          this.scopes[i].stop(true);
        }
      }
      // nested scope, dereference from parent to avoid memory leaks
      if (this.parent && !fromParent) {
        // optimized O(1) removal
        const last = this.parent.scopes.pop();
        if (last && last !== this) {
          this.parent.scopes[this.index] = last;
          last.index = this.index;
        }
      }
      this.active = false;
    }
  }
}
function effectScope(detached) {
  return new EffectScope(detached);
}
function recordEffectScope(effect, scope = activeEffectScope) {
  if (scope && scope.active) {
    scope.effects.push(effect);
  }
}
function getCurrentScope() {
  return activeEffectScope;
}
function onScopeDispose(fn) {
  if (activeEffectScope) {
    activeEffectScope.cleanups.push(fn);
  } else if (process.env.NODE_ENV !== "production") {
    warn$1(
      `onScopeDispose() is called when there is no active effect scope` +
        ` to be associated with.`
    );
  }
}

const createDep = (effects) => {
  const dep = new Set(effects);
  dep.w = 0;
  dep.n = 0;
  return dep;
};
const wasTracked = (dep) => (dep.w & trackOpBit) > 0;
const newTracked = (dep) => (dep.n & trackOpBit) > 0;
const initDepMarkers = ({ deps }) => {
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].w |= trackOpBit; // set was tracked
    }
  }
};
const finalizeDepMarkers = (effect) => {
  const { deps } = effect;
  if (deps.length) {
    let ptr = 0;
    for (let i = 0; i < deps.length; i++) {
      const dep = deps[i];
      if (wasTracked(dep) && !newTracked(dep)) {
        dep.delete(effect);
      } else {
        deps[ptr++] = dep;
      }
      // clear bits
      dep.w &= ~trackOpBit;
      dep.n &= ~trackOpBit;
    }
    deps.length = ptr;
  }
};

const targetMap = new WeakMap();
// The number of effects currently being tracked recursively.
let effectTrackDepth = 0;
let trackOpBit = 1;
/**
 * The bitwise track markers support at most 30 levels of recursion.
 * This value is chosen to enable modern JS engines to use a SMI on all platforms.
 * When recursion depth is greater, fall back to using a full cleanup.
 */
const maxMarkerBits = 30;
let activeEffect;
const ITERATE_KEY = Symbol(
  process.env.NODE_ENV !== "production" ? "iterate" : ""
);
const MAP_KEY_ITERATE_KEY = Symbol(
  process.env.NODE_ENV !== "production" ? "Map key iterate" : ""
);
class ReactiveEffect {
  constructor(fn, scheduler = null, scope) {
    this.fn = fn;
    this.scheduler = scheduler;
    this.active = true;
    this.deps = [];
    this.parent = undefined;
    recordEffectScope(this, scope);
  }
  run() {
    if (!this.active) {
      return this.fn();
    }
    let parent = activeEffect;
    let lastShouldTrack = shouldTrack;
    while (parent) {
      if (parent === this) {
        return;
      }
      parent = parent.parent;
    }
    try {
      this.parent = activeEffect;
      activeEffect = this;
      shouldTrack = true;
      trackOpBit = 1 << ++effectTrackDepth;
      if (effectTrackDepth <= maxMarkerBits) {
        initDepMarkers(this);
      } else {
        cleanupEffect(this);
      }
      return this.fn();
    } finally {
      if (effectTrackDepth <= maxMarkerBits) {
        finalizeDepMarkers(this);
      }
      trackOpBit = 1 << --effectTrackDepth;
      activeEffect = this.parent;
      shouldTrack = lastShouldTrack;
      this.parent = undefined;
      if (this.deferStop) {
        this.stop();
      }
    }
  }
  stop() {
    // stopped while running itself - defer the cleanup
    if (activeEffect === this) {
      this.deferStop = true;
    } else if (this.active) {
      cleanupEffect(this);
      if (this.onStop) {
        this.onStop();
      }
      this.active = false;
    }
  }
}
function cleanupEffect(effect) {
  const { deps } = effect;
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect);
    }
    deps.length = 0;
  }
}
function effect(fn, options) {
  if (fn.effect) {
    fn = fn.effect.fn;
  }
  const _effect = new ReactiveEffect(fn);
  if (options) {
    shared$2.extend(_effect, options);
    if (options.scope) recordEffectScope(_effect, options.scope);
  }
  if (!options || !options.lazy) {
    _effect.run();
  }
  const runner = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}
function stop(runner) {
  runner.effect.stop();
}
let shouldTrack = true;
const trackStack = [];
function pauseTracking() {
  trackStack.push(shouldTrack);
  shouldTrack = false;
}
function resetTracking() {
  const last = trackStack.pop();
  shouldTrack = last === undefined ? true : last;
}
function track(target, type, key) {
  if (shouldTrack && activeEffect) {
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()));
    }
    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(key, (dep = createDep()));
    }
    const eventInfo =
      process.env.NODE_ENV !== "production"
        ? { effect: activeEffect, target, type, key }
        : undefined;
    trackEffects(dep, eventInfo);
  }
}
function trackEffects(dep, debuggerEventExtraInfo) {
  let shouldTrack = false;
  if (effectTrackDepth <= maxMarkerBits) {
    if (!newTracked(dep)) {
      dep.n |= trackOpBit; // set newly tracked
      shouldTrack = !wasTracked(dep);
    }
  } else {
    // Full cleanup mode.
    shouldTrack = !dep.has(activeEffect);
  }
  if (shouldTrack) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
    if (process.env.NODE_ENV !== "production" && activeEffect.onTrack) {
      activeEffect.onTrack(
        Object.assign({ effect: activeEffect }, debuggerEventExtraInfo)
      );
    }
  }
}
function trigger(target, type, key, newValue, oldValue, oldTarget) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    // never been tracked
    return;
  }
  let deps = [];
  if (type === "clear" /* TriggerOpTypes.CLEAR */) {
    // collection being cleared
    // trigger all effects for target
    deps = [...depsMap.values()];
  } else if (key === "length" && shared$2.isArray(target)) {
    depsMap.forEach((dep, key) => {
      if (key === "length" || key >= newValue) {
        deps.push(dep);
      }
    });
  } else {
    // schedule runs for SET | ADD | DELETE
    if (key !== void 0) {
      deps.push(depsMap.get(key));
    }
    // also run for iteration key on ADD | DELETE | Map.SET
    switch (type) {
      case "add" /* TriggerOpTypes.ADD */:
        if (!shared$2.isArray(target)) {
          deps.push(depsMap.get(ITERATE_KEY));
          if (shared$2.isMap(target)) {
            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
          }
        } else if (shared$2.isIntegerKey(key)) {
          // new index added to array -> length changes
          deps.push(depsMap.get("length"));
        }
        break;
      case "delete" /* TriggerOpTypes.DELETE */:
        if (!shared$2.isArray(target)) {
          deps.push(depsMap.get(ITERATE_KEY));
          if (shared$2.isMap(target)) {
            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
          }
        }
        break;
      case "set" /* TriggerOpTypes.SET */:
        if (shared$2.isMap(target)) {
          deps.push(depsMap.get(ITERATE_KEY));
        }
        break;
    }
  }
  const eventInfo =
    process.env.NODE_ENV !== "production"
      ? { target, type, key, newValue, oldValue, oldTarget }
      : undefined;
  if (deps.length === 1) {
    if (deps[0]) {
      if (process.env.NODE_ENV !== "production") {
        triggerEffects(deps[0], eventInfo);
      } else {
        triggerEffects(deps[0]);
      }
    }
  } else {
    const effects = [];
    for (const dep of deps) {
      if (dep) {
        effects.push(...dep);
      }
    }
    if (process.env.NODE_ENV !== "production") {
      triggerEffects(createDep(effects), eventInfo);
    } else {
      triggerEffects(createDep(effects));
    }
  }
}
function triggerEffects(dep, debuggerEventExtraInfo) {
  // spread into array for stabilization
  const effects = shared$2.isArray(dep) ? dep : [...dep];
  for (const effect of effects) {
    if (effect.computed) {
      triggerEffect(effect, debuggerEventExtraInfo);
    }
  }
  for (const effect of effects) {
    if (!effect.computed) {
      triggerEffect(effect, debuggerEventExtraInfo);
    }
  }
}
function triggerEffect(effect, debuggerEventExtraInfo) {
  if (effect !== activeEffect || effect.allowRecurse) {
    if (process.env.NODE_ENV !== "production" && effect.onTrigger) {
      effect.onTrigger(shared$2.extend({ effect }, debuggerEventExtraInfo));
    }
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  }
}

const isNonTrackableKeys = /*#__PURE__*/ shared$2.makeMap(
  `__proto__,__v_isRef,__isVue`
);
const builtInSymbols = new Set(
  /*#__PURE__*/
  Object.getOwnPropertyNames(Symbol)
    // ios10.x Object.getOwnPropertyNames(Symbol) can enumerate 'arguments' and 'caller'
    // but accessing them on Symbol leads to TypeError because Symbol is a strict mode
    // function
    .filter((key) => key !== "arguments" && key !== "caller")
    .map((key) => Symbol[key])
    .filter(shared$2.isSymbol)
);
const get = /*#__PURE__*/ createGetter();
const shallowGet = /*#__PURE__*/ createGetter(false, true);
const readonlyGet = /*#__PURE__*/ createGetter(true);
const shallowReadonlyGet = /*#__PURE__*/ createGetter(true, true);
const arrayInstrumentations = /*#__PURE__*/ createArrayInstrumentations();
function createArrayInstrumentations() {
  const instrumentations = {};
  ["includes", "indexOf", "lastIndexOf"].forEach((key) => {
    instrumentations[key] = function (...args) {
      const arr = toRaw(this);
      for (let i = 0, l = this.length; i < l; i++) {
        track(arr, "get" /* TrackOpTypes.GET */, i + "");
      }
      // we run the method using the original args first (which may be reactive)
      const res = arr[key](...args);
      if (res === -1 || res === false) {
        // if that didn't work, run it again using raw values.
        return arr[key](...args.map(toRaw));
      } else {
        return res;
      }
    };
  });
  ["push", "pop", "shift", "unshift", "splice"].forEach((key) => {
    instrumentations[key] = function (...args) {
      pauseTracking();
      const res = toRaw(this)[key].apply(this, args);
      resetTracking();
      return res;
    };
  });
  return instrumentations;
}
function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
      return !isReadonly;
    } else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
      return isReadonly;
    } else if (key === "__v_isShallow" /* ReactiveFlags.IS_SHALLOW */) {
      return shallow;
    } else if (
      key === "__v_raw" /* ReactiveFlags.RAW */ &&
      receiver ===
        (isReadonly
          ? shallow
            ? shallowReadonlyMap
            : readonlyMap
          : shallow
          ? shallowReactiveMap
          : reactiveMap
        ).get(target)
    ) {
      return target;
    }
    const targetIsArray = shared$2.isArray(target);
    if (
      !isReadonly &&
      targetIsArray &&
      shared$2.hasOwn(arrayInstrumentations, key)
    ) {
      return Reflect.get(arrayInstrumentations, key, receiver);
    }
    const res = Reflect.get(target, key, receiver);
    if (
      shared$2.isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)
    ) {
      return res;
    }
    if (!isReadonly) {
      track(target, "get" /* TrackOpTypes.GET */, key);
    }
    if (shallow) {
      return res;
    }
    if (isRef(res)) {
      // ref unwrapping - skip unwrap for Array + integer key.
      return targetIsArray && shared$2.isIntegerKey(key) ? res : res.value;
    }
    if (shared$2.isObject(res)) {
      // Convert returned value into a proxy as well. we do the isObject check
      // here to avoid invalid value warning. Also need to lazy access readonly
      // and reactive here to avoid circular dependency.
      return isReadonly ? readonly(res) : reactive(res);
    }
    return res;
  };
}
const set = /*#__PURE__*/ createSetter();
const shallowSet = /*#__PURE__*/ createSetter(true);
function createSetter(shallow = false) {
  return function set(target, key, value, receiver) {
    let oldValue = target[key];
    if (isReadonly(oldValue) && isRef(oldValue) && !isRef(value)) {
      return false;
    }
    if (!shallow) {
      if (!isShallow(value) && !isReadonly(value)) {
        oldValue = toRaw(oldValue);
        value = toRaw(value);
      }
      if (!shared$2.isArray(target) && isRef(oldValue) && !isRef(value)) {
        oldValue.value = value;
        return true;
      }
    }
    const hadKey =
      shared$2.isArray(target) && shared$2.isIntegerKey(key)
        ? Number(key) < target.length
        : shared$2.hasOwn(target, key);
    const result = Reflect.set(target, key, value, receiver);
    // don't trigger if target is something up in the prototype chain of original
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, "add" /* TriggerOpTypes.ADD */, key, value);
      } else if (shared$2.hasChanged(value, oldValue)) {
        trigger(target, "set" /* TriggerOpTypes.SET */, key, value, oldValue);
      }
    }
    return result;
  };
}
function deleteProperty(target, key) {
  const hadKey = shared$2.hasOwn(target, key);
  const oldValue = target[key];
  const result = Reflect.deleteProperty(target, key);
  if (result && hadKey) {
    trigger(
      target,
      "delete" /* TriggerOpTypes.DELETE */,
      key,
      undefined,
      oldValue
    );
  }
  return result;
}
function has(target, key) {
  const result = Reflect.has(target, key);
  if (!shared$2.isSymbol(key) || !builtInSymbols.has(key)) {
    track(target, "has" /* TrackOpTypes.HAS */, key);
  }
  return result;
}
function ownKeys(target) {
  track(
    target,
    "iterate" /* TrackOpTypes.ITERATE */,
    shared$2.isArray(target) ? "length" : ITERATE_KEY
  );
  return Reflect.ownKeys(target);
}
const mutableHandlers = {
  get,
  set,
  deleteProperty,
  has,
  ownKeys,
};
const readonlyHandlers = {
  get: readonlyGet,
  set(target, key) {
    if (process.env.NODE_ENV !== "production") {
      warn$1(
        `Set operation on key "${String(key)}" failed: target is readonly.`,
        target
      );
    }
    return true;
  },
  deleteProperty(target, key) {
    if (process.env.NODE_ENV !== "production") {
      warn$1(
        `Delete operation on key "${String(key)}" failed: target is readonly.`,
        target
      );
    }
    return true;
  },
};
const shallowReactiveHandlers = /*#__PURE__*/ shared$2.extend(
  {},
  mutableHandlers,
  {
    get: shallowGet,
    set: shallowSet,
  }
);
// Props handlers are special in the sense that it should not unwrap top-level
// refs (in order to allow refs to be explicitly passed down), but should
// retain the reactivity of the normal readonly object.
const shallowReadonlyHandlers = /*#__PURE__*/ shared$2.extend(
  {},
  readonlyHandlers,
  {
    get: shallowReadonlyGet,
  }
);

const toShallow = (value) => value;
const getProto = (v) => Reflect.getPrototypeOf(v);
function get$1(target, key, isReadonly = false, isShallow = false) {
  // #1772: readonly(reactive(Map)) should return readonly + reactive version
  // of the value
  target = target["__v_raw" /* ReactiveFlags.RAW */];
  const rawTarget = toRaw(target);
  const rawKey = toRaw(key);
  if (!isReadonly) {
    if (key !== rawKey) {
      track(rawTarget, "get" /* TrackOpTypes.GET */, key);
    }
    track(rawTarget, "get" /* TrackOpTypes.GET */, rawKey);
  }
  const { has } = getProto(rawTarget);
  const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
  if (has.call(rawTarget, key)) {
    return wrap(target.get(key));
  } else if (has.call(rawTarget, rawKey)) {
    return wrap(target.get(rawKey));
  } else if (target !== rawTarget) {
    // #3602 readonly(reactive(Map))
    // ensure that the nested reactive `Map` can do tracking for itself
    target.get(key);
  }
}
function has$1(key, isReadonly = false) {
  const target = this["__v_raw" /* ReactiveFlags.RAW */];
  const rawTarget = toRaw(target);
  const rawKey = toRaw(key);
  if (!isReadonly) {
    if (key !== rawKey) {
      track(rawTarget, "has" /* TrackOpTypes.HAS */, key);
    }
    track(rawTarget, "has" /* TrackOpTypes.HAS */, rawKey);
  }
  return key === rawKey
    ? target.has(key)
    : target.has(key) || target.has(rawKey);
}
function size(target, isReadonly = false) {
  target = target["__v_raw" /* ReactiveFlags.RAW */];
  !isReadonly &&
    track(toRaw(target), "iterate" /* TrackOpTypes.ITERATE */, ITERATE_KEY);
  return Reflect.get(target, "size", target);
}
function add(value) {
  value = toRaw(value);
  const target = toRaw(this);
  const proto = getProto(target);
  const hadKey = proto.has.call(target, value);
  if (!hadKey) {
    target.add(value);
    trigger(target, "add" /* TriggerOpTypes.ADD */, value, value);
  }
  return this;
}
function set$1(key, value) {
  value = toRaw(value);
  const target = toRaw(this);
  const { has, get } = getProto(target);
  let hadKey = has.call(target, key);
  if (!hadKey) {
    key = toRaw(key);
    hadKey = has.call(target, key);
  } else if (process.env.NODE_ENV !== "production") {
    checkIdentityKeys(target, has, key);
  }
  const oldValue = get.call(target, key);
  target.set(key, value);
  if (!hadKey) {
    trigger(target, "add" /* TriggerOpTypes.ADD */, key, value);
  } else if (shared$2.hasChanged(value, oldValue)) {
    trigger(target, "set" /* TriggerOpTypes.SET */, key, value, oldValue);
  }
  return this;
}
function deleteEntry(key) {
  const target = toRaw(this);
  const { has, get } = getProto(target);
  let hadKey = has.call(target, key);
  if (!hadKey) {
    key = toRaw(key);
    hadKey = has.call(target, key);
  } else if (process.env.NODE_ENV !== "production") {
    checkIdentityKeys(target, has, key);
  }
  const oldValue = get ? get.call(target, key) : undefined;
  // forward the operation before queueing reactions
  const result = target.delete(key);
  if (hadKey) {
    trigger(
      target,
      "delete" /* TriggerOpTypes.DELETE */,
      key,
      undefined,
      oldValue
    );
  }
  return result;
}
function clear() {
  const target = toRaw(this);
  const hadItems = target.size !== 0;
  const oldTarget =
    process.env.NODE_ENV !== "production"
      ? shared$2.isMap(target)
        ? new Map(target)
        : new Set(target)
      : undefined;
  // forward the operation before queueing reactions
  const result = target.clear();
  if (hadItems) {
    trigger(
      target,
      "clear" /* TriggerOpTypes.CLEAR */,
      undefined,
      undefined,
      oldTarget
    );
  }
  return result;
}
function createForEach(isReadonly, isShallow) {
  return function forEach(callback, thisArg) {
    const observed = this;
    const target = observed["__v_raw" /* ReactiveFlags.RAW */];
    const rawTarget = toRaw(target);
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
    !isReadonly &&
      track(rawTarget, "iterate" /* TrackOpTypes.ITERATE */, ITERATE_KEY);
    return target.forEach((value, key) => {
      // important: make sure the callback is
      // 1. invoked with the reactive map as `this` and 3rd arg
      // 2. the value received should be a corresponding reactive/readonly.
      return callback.call(thisArg, wrap(value), wrap(key), observed);
    });
  };
}
function createIterableMethod(method, isReadonly, isShallow) {
  return function (...args) {
    const target = this["__v_raw" /* ReactiveFlags.RAW */];
    const rawTarget = toRaw(target);
    const targetIsMap = shared$2.isMap(rawTarget);
    const isPair =
      method === "entries" || (method === Symbol.iterator && targetIsMap);
    const isKeyOnly = method === "keys" && targetIsMap;
    const innerIterator = target[method](...args);
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
    !isReadonly &&
      track(
        rawTarget,
        "iterate" /* TrackOpTypes.ITERATE */,
        isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY
      );
    // return a wrapped iterator which returns observed versions of the
    // values emitted from the real iterator
    return {
      // iterator protocol
      next() {
        const { value, done } = innerIterator.next();
        return done
          ? { value, done }
          : {
              value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
              done,
            };
      },
      // iterable protocol
      [Symbol.iterator]() {
        return this;
      },
    };
  };
}
function createReadonlyMethod(type) {
  return function (...args) {
    if (process.env.NODE_ENV !== "production") {
      const key = args[0] ? `on key "${args[0]}" ` : ``;
      console.warn(
        `${shared$2.capitalize(
          type
        )} operation ${key}failed: target is readonly.`,
        toRaw(this)
      );
    }
    return type === "delete" /* TriggerOpTypes.DELETE */ ? false : this;
  };
}
function createInstrumentations() {
  const mutableInstrumentations = {
    get(key) {
      return get$1(this, key);
    },
    get size() {
      return size(this);
    },
    has: has$1,
    add,
    set: set$1,
    delete: deleteEntry,
    clear,
    forEach: createForEach(false, false),
  };
  const shallowInstrumentations = {
    get(key) {
      return get$1(this, key, false, true);
    },
    get size() {
      return size(this);
    },
    has: has$1,
    add,
    set: set$1,
    delete: deleteEntry,
    clear,
    forEach: createForEach(false, true),
  };
  const readonlyInstrumentations = {
    get(key) {
      return get$1(this, key, true);
    },
    get size() {
      return size(this, true);
    },
    has(key) {
      return has$1.call(this, key, true);
    },
    add: createReadonlyMethod("add" /* TriggerOpTypes.ADD */),
    set: createReadonlyMethod("set" /* TriggerOpTypes.SET */),
    delete: createReadonlyMethod("delete" /* TriggerOpTypes.DELETE */),
    clear: createReadonlyMethod("clear" /* TriggerOpTypes.CLEAR */),
    forEach: createForEach(true, false),
  };
  const shallowReadonlyInstrumentations = {
    get(key) {
      return get$1(this, key, true, true);
    },
    get size() {
      return size(this, true);
    },
    has(key) {
      return has$1.call(this, key, true);
    },
    add: createReadonlyMethod("add" /* TriggerOpTypes.ADD */),
    set: createReadonlyMethod("set" /* TriggerOpTypes.SET */),
    delete: createReadonlyMethod("delete" /* TriggerOpTypes.DELETE */),
    clear: createReadonlyMethod("clear" /* TriggerOpTypes.CLEAR */),
    forEach: createForEach(true, true),
  };
  const iteratorMethods = ["keys", "values", "entries", Symbol.iterator];
  iteratorMethods.forEach((method) => {
    mutableInstrumentations[method] = createIterableMethod(
      method,
      false,
      false
    );
    readonlyInstrumentations[method] = createIterableMethod(
      method,
      true,
      false
    );
    shallowInstrumentations[method] = createIterableMethod(method, false, true);
    shallowReadonlyInstrumentations[method] = createIterableMethod(
      method,
      true,
      true
    );
  });
  return [
    mutableInstrumentations,
    readonlyInstrumentations,
    shallowInstrumentations,
    shallowReadonlyInstrumentations,
  ];
}
const [
  mutableInstrumentations,
  readonlyInstrumentations,
  shallowInstrumentations,
  shallowReadonlyInstrumentations,
] = /* #__PURE__*/ createInstrumentations();
function createInstrumentationGetter(isReadonly, shallow) {
  const instrumentations = shallow
    ? isReadonly
      ? shallowReadonlyInstrumentations
      : shallowInstrumentations
    : isReadonly
    ? readonlyInstrumentations
    : mutableInstrumentations;
  return (target, key, receiver) => {
    if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
      return !isReadonly;
    } else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
      return isReadonly;
    } else if (key === "__v_raw" /* ReactiveFlags.RAW */) {
      return target;
    }
    return Reflect.get(
      shared$2.hasOwn(instrumentations, key) && key in target
        ? instrumentations
        : target,
      key,
      receiver
    );
  };
}
const mutableCollectionHandlers = {
  get: /*#__PURE__*/ createInstrumentationGetter(false, false),
};
const shallowCollectionHandlers = {
  get: /*#__PURE__*/ createInstrumentationGetter(false, true),
};
const readonlyCollectionHandlers = {
  get: /*#__PURE__*/ createInstrumentationGetter(true, false),
};
const shallowReadonlyCollectionHandlers = {
  get: /*#__PURE__*/ createInstrumentationGetter(true, true),
};
function checkIdentityKeys(target, has, key) {
  const rawKey = toRaw(key);
  if (rawKey !== key && has.call(target, rawKey)) {
    const type = shared$2.toRawType(target);
    console.warn(
      `Reactive ${type} contains both the raw and reactive ` +
        `versions of the same object${type === `Map` ? ` as keys` : ``}, ` +
        `which can lead to inconsistencies. ` +
        `Avoid differentiating between the raw and reactive versions ` +
        `of an object and only use the reactive version if possible.`
    );
  }
}

const reactiveMap = new WeakMap();
const shallowReactiveMap = new WeakMap();
const readonlyMap = new WeakMap();
const shallowReadonlyMap = new WeakMap();
function targetTypeMap(rawType) {
  switch (rawType) {
    case "Object":
    case "Array":
      return 1 /* TargetType.COMMON */;
    case "Map":
    case "Set":
    case "WeakMap":
    case "WeakSet":
      return 2 /* TargetType.COLLECTION */;
    default:
      return 0 /* TargetType.INVALID */;
  }
}
function getTargetType(value) {
  return value["__v_skip" /* ReactiveFlags.SKIP */] ||
    !Object.isExtensible(value)
    ? 0 /* TargetType.INVALID */
    : targetTypeMap(shared$2.toRawType(value));
}
function reactive(target) {
  // if trying to observe a readonly proxy, return the readonly version.
  if (isReadonly(target)) {
    return target;
  }
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  );
}
/**
 * Return a shallowly-reactive copy of the original object, where only the root
 * level properties are reactive. It also does not auto-unwrap refs (even at the
 * root level).
 */
function shallowReactive(target) {
  return createReactiveObject(
    target,
    false,
    shallowReactiveHandlers,
    shallowCollectionHandlers,
    shallowReactiveMap
  );
}
/**
 * Creates a readonly copy of the original object. Note the returned copy is not
 * made reactive, but `readonly` can be called on an already reactive object.
 */
function readonly(target) {
  return createReactiveObject(
    target,
    true,
    readonlyHandlers,
    readonlyCollectionHandlers,
    readonlyMap
  );
}
/**
 * Returns a reactive-copy of the original object, where only the root level
 * properties are readonly, and does NOT unwrap refs nor recursively convert
 * returned properties.
 * This is used for creating the props proxy object for stateful components.
 */
function shallowReadonly(target) {
  return createReactiveObject(
    target,
    true,
    shallowReadonlyHandlers,
    shallowReadonlyCollectionHandlers,
    shallowReadonlyMap
  );
}
function createReactiveObject(
  target,
  isReadonly,
  baseHandlers,
  collectionHandlers,
  proxyMap
) {
  if (!shared$2.isObject(target)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`value cannot be made reactive: ${String(target)}`);
    }
    return target;
  }
  // target is already a Proxy, return it.
  // exception: calling readonly() on a reactive object
  if (
    target["__v_raw" /* ReactiveFlags.RAW */] &&
    !(isReadonly && target["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */])
  ) {
    return target;
  }
  // target already has corresponding Proxy
  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }
  // only specific value types can be observed.
  const targetType = getTargetType(target);
  if (targetType === 0 /* TargetType.INVALID */) {
    return target;
  }
  const proxy = new Proxy(
    target,
    targetType === 2 /* TargetType.COLLECTION */
      ? collectionHandlers
      : baseHandlers
  );
  proxyMap.set(target, proxy);
  return proxy;
}
function isReactive(value) {
  if (isReadonly(value)) {
    return isReactive(value["__v_raw" /* ReactiveFlags.RAW */]);
  }
  return !!(value && value["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */]);
}
function isReadonly(value) {
  return !!(value && value["__v_isReadonly" /* ReactiveFlags.IS_READONLY */]);
}
function isShallow(value) {
  return !!(value && value["__v_isShallow" /* ReactiveFlags.IS_SHALLOW */]);
}
function isProxy(value) {
  return isReactive(value) || isReadonly(value);
}
function toRaw(observed) {
  const raw = observed && observed["__v_raw" /* ReactiveFlags.RAW */];
  return raw ? toRaw(raw) : observed;
}
function markRaw(value) {
  shared$2.def(value, "__v_skip" /* ReactiveFlags.SKIP */, true);
  return value;
}
const toReactive = (value) =>
  shared$2.isObject(value) ? reactive(value) : value;
const toReadonly = (value) =>
  shared$2.isObject(value) ? readonly(value) : value;

function trackRefValue(ref) {
  if (shouldTrack && activeEffect) {
    ref = toRaw(ref);
    if (process.env.NODE_ENV !== "production") {
      trackEffects(ref.dep || (ref.dep = createDep()), {
        target: ref,
        type: "get" /* TrackOpTypes.GET */,
        key: "value",
      });
    } else {
      trackEffects(ref.dep || (ref.dep = createDep()));
    }
  }
}
function triggerRefValue(ref, newVal) {
  ref = toRaw(ref);
  if (ref.dep) {
    if (process.env.NODE_ENV !== "production") {
      triggerEffects(ref.dep, {
        target: ref,
        type: "set" /* TriggerOpTypes.SET */,
        key: "value",
        newValue: newVal,
      });
    } else {
      triggerEffects(ref.dep);
    }
  }
}
function isRef(r) {
  return !!(r && r.__v_isRef === true);
}
function ref(value) {
  return createRef(value, false);
}
function shallowRef(value) {
  return createRef(value, true);
}
function createRef(rawValue, shallow) {
  if (isRef(rawValue)) {
    return rawValue;
  }
  return new RefImpl(rawValue, shallow);
}
class RefImpl {
  constructor(value, __v_isShallow) {
    this.__v_isShallow = __v_isShallow;
    this.dep = undefined;
    this.__v_isRef = true;
    this._rawValue = __v_isShallow ? value : toRaw(value);
    this._value = __v_isShallow ? value : toReactive(value);
  }
  get value() {
    trackRefValue(this);
    return this._value;
  }
  set value(newVal) {
    const useDirectValue =
      this.__v_isShallow || isShallow(newVal) || isReadonly(newVal);
    newVal = useDirectValue ? newVal : toRaw(newVal);
    if (shared$2.hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal;
      this._value = useDirectValue ? newVal : toReactive(newVal);
      triggerRefValue(this, newVal);
    }
  }
}
function triggerRef(ref) {
  triggerRefValue(
    ref,
    process.env.NODE_ENV !== "production" ? ref.value : void 0
  );
}
function unref(ref) {
  return isRef(ref) ? ref.value : ref;
}
const shallowUnwrapHandlers = {
  get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
  set: (target, key, value, receiver) => {
    const oldValue = target[key];
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value;
      return true;
    } else {
      return Reflect.set(target, key, value, receiver);
    }
  },
};
function proxyRefs(objectWithRefs) {
  return isReactive(objectWithRefs)
    ? objectWithRefs
    : new Proxy(objectWithRefs, shallowUnwrapHandlers);
}
class CustomRefImpl {
  constructor(factory) {
    this.dep = undefined;
    this.__v_isRef = true;
    const { get, set } = factory(
      () => trackRefValue(this),
      () => triggerRefValue(this)
    );
    this._get = get;
    this._set = set;
  }
  get value() {
    return this._get();
  }
  set value(newVal) {
    this._set(newVal);
  }
}
function customRef$1(factory) {
  return new CustomRefImpl(factory);
}
function toRefs(object) {
  if (process.env.NODE_ENV !== "production" && !isProxy(object)) {
    console.warn(
      `toRefs() expects a reactive object but received a plain one.`
    );
  }
  const ret = shared$2.isArray(object) ? new Array(object.length) : {};
  for (const key in object) {
    ret[key] = toRef(object, key);
  }
  return ret;
}
class ObjectRefImpl {
  constructor(_object, _key, _defaultValue) {
    this._object = _object;
    this._key = _key;
    this._defaultValue = _defaultValue;
    this.__v_isRef = true;
  }
  get value() {
    const val = this._object[this._key];
    return val === undefined ? this._defaultValue : val;
  }
  set value(newVal) {
    this._object[this._key] = newVal;
  }
}
function toRef(object, key, defaultValue) {
  const val = object[key];
  return isRef(val) ? val : new ObjectRefImpl(object, key, defaultValue);
}

var _a;
class ComputedRefImpl {
  constructor(getter, _setter, isReadonly, isSSR) {
    this._setter = _setter;
    this.dep = undefined;
    this.__v_isRef = true;
    this[_a] = false;
    this._dirty = true;
    this.effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true;
        triggerRefValue(this);
      }
    });
    this.effect.computed = this;
    this.effect.active = this._cacheable = !isSSR;
    this["__v_isReadonly" /* ReactiveFlags.IS_READONLY */] = isReadonly;
  }
  get value() {
    // the computed ref may get wrapped by other proxies e.g. readonly() #3376
    const self = toRaw(this);
    trackRefValue(self);
    if (self._dirty || !self._cacheable) {
      self._dirty = false;
      self._value = self.effect.run();
    }
    return self._value;
  }
  set value(newValue) {
    this._setter(newValue);
  }
}
_a = "__v_isReadonly" /* ReactiveFlags.IS_READONLY */;
function computed$1(getterOrOptions, debugOptions, isSSR = false) {
  let getter;
  let setter;
  const onlyGetter = shared$2.isFunction(getterOrOptions);
  if (onlyGetter) {
    getter = getterOrOptions;
    setter =
      process.env.NODE_ENV !== "production"
        ? () => {
            console.warn("Write operation failed: computed value is readonly");
          }
        : shared$2.NOOP;
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }
  const cRef = new ComputedRefImpl(
    getter,
    setter,
    onlyGetter || !setter,
    isSSR
  );
  if (process.env.NODE_ENV !== "production" && debugOptions && !isSSR) {
    cRef.effect.onTrack = debugOptions.onTrack;
    cRef.effect.onTrigger = debugOptions.onTrigger;
  }
  return cRef;
}

const stack = [];
function pushWarningContext(vnode) {
  stack.push(vnode);
}
function popWarningContext() {
  stack.pop();
}
function warn(msg, ...args) {
  // avoid props formatting or warn handler tracking deps that might be mutated
  // during patch, leading to infinite recursion.
  pauseTracking();
  const instance = stack.length ? stack[stack.length - 1].component : null;
  const appWarnHandler = instance && instance.appContext.config.warnHandler;
  const trace = getComponentTrace();
  if (appWarnHandler) {
    callWithErrorHandling(
      appWarnHandler,
      instance,
      11 /* ErrorCodes.APP_WARN_HANDLER */,
      [
        msg + args.join(""),
        instance && instance.proxy,
        trace
          .map(
            ({ vnode }) => `at <${formatComponentName(instance, vnode.type)}>`
          )
          .join("\n"),
        trace,
      ]
    );
  } else {
    const warnArgs = [`[Vue warn]: ${msg}`, ...args];
    /* istanbul ignore if */
    if (
      trace.length &&
      // avoid spamming console during tests
      !false
    ) {
      warnArgs.push(`\n`, ...formatTrace(trace));
    }
    console.warn(...warnArgs);
  }
  resetTracking();
}
function getComponentTrace() {
  let currentVNode = stack[stack.length - 1];
  if (!currentVNode) {
    return [];
  }
  // we can't just use the stack because it will be incomplete during updates
  // that did not start from the root. Re-construct the parent chain using
  // instance parent pointers.
  const normalizedStack = [];
  while (currentVNode) {
    const last = normalizedStack[0];
    if (last && last.vnode === currentVNode) {
      last.recurseCount++;
    } else {
      normalizedStack.push({
        vnode: currentVNode,
        recurseCount: 0,
      });
    }
    const parentInstance =
      currentVNode.component && currentVNode.component.parent;
    currentVNode = parentInstance && parentInstance.vnode;
  }
  return normalizedStack;
}
/* istanbul ignore next */
function formatTrace(trace) {
  const logs = [];
  trace.forEach((entry, i) => {
    logs.push(...(i === 0 ? [] : [`\n`]), ...formatTraceEntry(entry));
  });
  return logs;
}
function formatTraceEntry({ vnode, recurseCount }) {
  const postfix =
    recurseCount > 0 ? `... (${recurseCount} recursive calls)` : ``;
  const isRoot = vnode.component ? vnode.component.parent == null : false;
  const open = ` at <${formatComponentName(
    vnode.component,
    vnode.type,
    isRoot
  )}`;
  const close = `>` + postfix;
  return vnode.props
    ? [open, ...formatProps(vnode.props), close]
    : [open + close];
}
/* istanbul ignore next */
function formatProps(props) {
  const res = [];
  const keys = Object.keys(props);
  keys.slice(0, 3).forEach((key) => {
    res.push(...formatProp(key, props[key]));
  });
  if (keys.length > 3) {
    res.push(` ...`);
  }
  return res;
}
/* istanbul ignore next */
function formatProp(key, value, raw) {
  if (shared$2.isString(value)) {
    value = JSON.stringify(value);
    return raw ? value : [`${key}=${value}`];
  } else if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value == null
  ) {
    return raw ? value : [`${key}=${value}`];
  } else if (isRef(value)) {
    value = formatProp(key, toRaw(value.value), true);
    return raw ? value : [`${key}=Ref<`, value, `>`];
  } else if (shared$2.isFunction(value)) {
    return [`${key}=fn${value.name ? `<${value.name}>` : ``}`];
  } else {
    value = toRaw(value);
    return raw ? value : [`${key}=`, value];
  }
}

const ErrorTypeStrings = {
  ["sp" /* LifecycleHooks.SERVER_PREFETCH */]: "serverPrefetch hook",
  ["bc" /* LifecycleHooks.BEFORE_CREATE */]: "beforeCreate hook",
  ["c" /* LifecycleHooks.CREATED */]: "created hook",
  ["bm" /* LifecycleHooks.BEFORE_MOUNT */]: "beforeMount hook",
  ["m" /* LifecycleHooks.MOUNTED */]: "mounted hook",
  ["bu" /* LifecycleHooks.BEFORE_UPDATE */]: "beforeUpdate hook",
  ["u" /* LifecycleHooks.UPDATED */]: "updated",
  ["bum" /* LifecycleHooks.BEFORE_UNMOUNT */]: "beforeUnmount hook",
  ["um" /* LifecycleHooks.UNMOUNTED */]: "unmounted hook",
  ["a" /* LifecycleHooks.ACTIVATED */]: "activated hook",
  ["da" /* LifecycleHooks.DEACTIVATED */]: "deactivated hook",
  ["ec" /* LifecycleHooks.ERROR_CAPTURED */]: "errorCaptured hook",
  ["rtc" /* LifecycleHooks.RENDER_TRACKED */]: "renderTracked hook",
  ["rtg" /* LifecycleHooks.RENDER_TRIGGERED */]: "renderTriggered hook",
  [0 /* ErrorCodes.SETUP_FUNCTION */]: "setup function",
  [1 /* ErrorCodes.RENDER_FUNCTION */]: "render function",
  [2 /* ErrorCodes.WATCH_GETTER */]: "watcher getter",
  [3 /* ErrorCodes.WATCH_CALLBACK */]: "watcher callback",
  [4 /* ErrorCodes.WATCH_CLEANUP */]: "watcher cleanup function",
  [5 /* ErrorCodes.NATIVE_EVENT_HANDLER */]: "native event handler",
  [6 /* ErrorCodes.COMPONENT_EVENT_HANDLER */]: "component event handler",
  [7 /* ErrorCodes.VNODE_HOOK */]: "vnode hook",
  [8 /* ErrorCodes.DIRECTIVE_HOOK */]: "directive hook",
  [9 /* ErrorCodes.TRANSITION_HOOK */]: "transition hook",
  [10 /* ErrorCodes.APP_ERROR_HANDLER */]: "app errorHandler",
  [11 /* ErrorCodes.APP_WARN_HANDLER */]: "app warnHandler",
  [12 /* ErrorCodes.FUNCTION_REF */]: "ref function",
  [13 /* ErrorCodes.ASYNC_COMPONENT_LOADER */]: "async component loader",
  [14 /* ErrorCodes.SCHEDULER */]:
    "scheduler flush. This is likely a Vue internals bug. " +
    "Please open an issue at https://new-issue.vuejs.org/?repo=vuejs/core",
};
function callWithErrorHandling(fn, instance, type, args) {
  let res;
  try {
    res = args ? fn(...args) : fn();
  } catch (err) {
    handleError$1(err, instance, type);
  }
  return res;
}
function callWithAsyncErrorHandling(fn, instance, type, args) {
  if (shared$2.isFunction(fn)) {
    const res = callWithErrorHandling(fn, instance, type, args);
    if (res && shared$2.isPromise(res)) {
      res.catch((err) => {
        handleError$1(err, instance, type);
      });
    }
    return res;
  }
  const values = [];
  for (let i = 0; i < fn.length; i++) {
    values.push(callWithAsyncErrorHandling(fn[i], instance, type, args));
  }
  return values;
}
function handleError$1(err, instance, type, throwInDev = true) {
  const contextVNode = instance ? instance.vnode : null;
  if (instance) {
    let cur = instance.parent;
    // the exposed instance is the render proxy to keep it consistent with 2.x
    const exposedInstance = instance.proxy;
    // in production the hook receives only the error code
    const errorInfo =
      process.env.NODE_ENV !== "production" ? ErrorTypeStrings[type] : type;
    while (cur) {
      const errorCapturedHooks = cur.ec;
      if (errorCapturedHooks) {
        for (let i = 0; i < errorCapturedHooks.length; i++) {
          if (
            errorCapturedHooks[i](err, exposedInstance, errorInfo) === false
          ) {
            return;
          }
        }
      }
      cur = cur.parent;
    }
    // app-level handling
    const appErrorHandler = instance.appContext.config.errorHandler;
    if (appErrorHandler) {
      callWithErrorHandling(
        appErrorHandler,
        null,
        10 /* ErrorCodes.APP_ERROR_HANDLER */,
        [err, exposedInstance, errorInfo]
      );
      return;
    }
  }
  logError(err, type, contextVNode, throwInDev);
}
function logError(err, type, contextVNode, throwInDev = true) {
  if (process.env.NODE_ENV !== "production") {
    const info = ErrorTypeStrings[type];
    if (contextVNode) {
      pushWarningContext(contextVNode);
    }
    warn(`Unhandled error${info ? ` during execution of ${info}` : ``}`);
    if (contextVNode) {
      popWarningContext();
    }
    // crash in dev by default so it's more noticeable
    if (throwInDev) {
      throw err;
    } else {
      console.error(err);
    }
  } else {
    // recover in prod to reduce the impact on end-user
    console.error(err);
  }
}

let isFlushing = false;
let isFlushPending = false;
const queue = [];
let flushIndex = 0;
const pendingPostFlushCbs = [];
let activePostFlushCbs = null;
let postFlushIndex = 0;
const resolvedPromise = /*#__PURE__*/ Promise.resolve();
let currentFlushPromise = null;
const RECURSION_LIMIT = 100;
function nextTick(fn) {
  const p = currentFlushPromise || resolvedPromise;
  return fn ? p.then(this ? fn.bind(this) : fn) : p;
}
// #2768
// Use binary-search to find a suitable position in the queue,
// so that the queue maintains the increasing order of job's id,
// which can prevent the job from being skipped and also can avoid repeated patching.
function findInsertionIndex(id) {
  // the start index should be `flushIndex + 1`
  let start = flushIndex + 1;
  let end = queue.length;
  while (start < end) {
    const middle = (start + end) >>> 1;
    const middleJobId = getId(queue[middle]);
    middleJobId < id ? (start = middle + 1) : (end = middle);
  }
  return start;
}
function queueJob(job) {
  // the dedupe search uses the startIndex argument of Array.includes()
  // by default the search index includes the current job that is being run
  // so it cannot recursively trigger itself again.
  // if the job is a watch() callback, the search will start with a +1 index to
  // allow it recursively trigger itself - it is the user's responsibility to
  // ensure it doesn't end up in an infinite loop.
  if (
    !queue.length ||
    !queue.includes(
      job,
      isFlushing && job.allowRecurse ? flushIndex + 1 : flushIndex
    )
  ) {
    if (job.id == null) {
      queue.push(job);
    } else {
      queue.splice(findInsertionIndex(job.id), 0, job);
    }
    queueFlush();
  }
}
function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true;
    currentFlushPromise = resolvedPromise.then(flushJobs);
  }
}
function invalidateJob(job) {
  const i = queue.indexOf(job);
  if (i > flushIndex) {
    queue.splice(i, 1);
  }
}
function queuePostFlushCb(cb) {
  if (!shared$2.isArray(cb)) {
    if (
      !activePostFlushCbs ||
      !activePostFlushCbs.includes(
        cb,
        cb.allowRecurse ? postFlushIndex + 1 : postFlushIndex
      )
    ) {
      pendingPostFlushCbs.push(cb);
    }
  } else {
    // if cb is an array, it is a component lifecycle hook which can only be
    // triggered by a job, which is already deduped in the main queue, so
    // we can skip duplicate check here to improve perf
    pendingPostFlushCbs.push(...cb);
  }
  queueFlush();
}
function flushPreFlushCbs(
  seen,
  // if currently flushing, skip the current job itself
  i = isFlushing ? flushIndex + 1 : 0
) {
  if (process.env.NODE_ENV !== "production") {
    seen = seen || new Map();
  }
  for (; i < queue.length; i++) {
    const cb = queue[i];
    if (cb && cb.pre) {
      if (
        process.env.NODE_ENV !== "production" &&
        checkRecursiveUpdates(seen, cb)
      ) {
        continue;
      }
      queue.splice(i, 1);
      i--;
      cb();
    }
  }
}
function flushPostFlushCbs(seen) {
  if (pendingPostFlushCbs.length) {
    const deduped = [...new Set(pendingPostFlushCbs)];
    pendingPostFlushCbs.length = 0;
    // #1947 already has active queue, nested flushPostFlushCbs call
    if (activePostFlushCbs) {
      activePostFlushCbs.push(...deduped);
      return;
    }
    activePostFlushCbs = deduped;
    if (process.env.NODE_ENV !== "production") {
      seen = seen || new Map();
    }
    activePostFlushCbs.sort((a, b) => getId(a) - getId(b));
    for (
      postFlushIndex = 0;
      postFlushIndex < activePostFlushCbs.length;
      postFlushIndex++
    ) {
      if (
        process.env.NODE_ENV !== "production" &&
        checkRecursiveUpdates(seen, activePostFlushCbs[postFlushIndex])
      ) {
        continue;
      }
      activePostFlushCbs[postFlushIndex]();
    }
    activePostFlushCbs = null;
    postFlushIndex = 0;
  }
}
const getId = (job) => (job.id == null ? Infinity : job.id);
const comparator = (a, b) => {
  const diff = getId(a) - getId(b);
  if (diff === 0) {
    if (a.pre && !b.pre) return -1;
    if (b.pre && !a.pre) return 1;
  }
  return diff;
};
function flushJobs(seen) {
  isFlushPending = false;
  isFlushing = true;
  if (process.env.NODE_ENV !== "production") {
    seen = seen || new Map();
  }
  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child so its render effect will have smaller
  //    priority number)
  // 2. If a component is unmounted during a parent component's update,
  //    its update can be skipped.
  queue.sort(comparator);
  // conditional usage of checkRecursiveUpdate must be determined out of
  // try ... catch block since Rollup by default de-optimizes treeshaking
  // inside try-catch. This can leave all warning code unshaked. Although
  // they would get eventually shaken by a minifier like terser, some minifiers
  // would fail to do that (e.g. https://github.com/evanw/esbuild/issues/1610)
  const check =
    process.env.NODE_ENV !== "production"
      ? (job) => checkRecursiveUpdates(seen, job)
      : shared$2.NOOP;
  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex];
      if (job && job.active !== false) {
        if (process.env.NODE_ENV !== "production" && check(job)) {
          continue;
        }
        // console.log(`running:`, job.id)
        callWithErrorHandling(job, null, 14 /* ErrorCodes.SCHEDULER */);
      }
    }
  } finally {
    flushIndex = 0;
    queue.length = 0;
    flushPostFlushCbs(seen);
    isFlushing = false;
    currentFlushPromise = null;
    // some postFlushCb queued jobs!
    // keep flushing until it drains.
    if (queue.length || pendingPostFlushCbs.length) {
      flushJobs(seen);
    }
  }
}
function checkRecursiveUpdates(seen, fn) {
  if (!seen.has(fn)) {
    seen.set(fn, 1);
  } else {
    const count = seen.get(fn);
    if (count > RECURSION_LIMIT) {
      const instance = fn.ownerInstance;
      const componentName = instance && getComponentName(instance.type);
      warn(
        `Maximum recursive updates exceeded${
          componentName ? ` in component <${componentName}>` : ``
        }. ` +
          `This means you have a reactive effect that is mutating its own ` +
          `dependencies and thus recursively triggering itself. Possible sources ` +
          `include component template, render function, updated hook or ` +
          `watcher source function.`
      );
      return true;
    } else {
      seen.set(fn, count + 1);
    }
  }
}

/* eslint-disable no-restricted-globals */
let isHmrUpdating = false;
const hmrDirtyComponents = new Set();
// Expose the HMR runtime on the global object
// This makes it entirely tree-shakable without polluting the exports and makes
// it easier to be used in toolings like vue-loader
// Note: for a component to be eligible for HMR it also needs the __hmrId option
// to be set so that its instances can be registered / removed.
if (process.env.NODE_ENV !== "production") {
  shared$2.getGlobalThis().__VUE_HMR_RUNTIME__ = {
    createRecord: tryWrap(createRecord),
    rerender: tryWrap(rerender),
    reload: tryWrap(reload),
  };
}
const map = new Map();
function registerHMR(instance) {
  const id = instance.type.__hmrId;
  let record = map.get(id);
  if (!record) {
    createRecord(id, instance.type);
    record = map.get(id);
  }
  record.instances.add(instance);
}
function unregisterHMR(instance) {
  map.get(instance.type.__hmrId).instances.delete(instance);
}
function createRecord(id, initialDef) {
  if (map.has(id)) {
    return false;
  }
  map.set(id, {
    initialDef: normalizeClassComponent(initialDef),
    instances: new Set(),
  });
  return true;
}
function normalizeClassComponent(component) {
  return isClassComponent(component) ? component.__vccOpts : component;
}
function rerender(id, newRender) {
  const record = map.get(id);
  if (!record) {
    return;
  }
  // update initial record (for not-yet-rendered component)
  record.initialDef.render = newRender;
  [...record.instances].forEach((instance) => {
    if (newRender) {
      instance.render = newRender;
      normalizeClassComponent(instance.type).render = newRender;
    }
    instance.renderCache = [];
    // this flag forces child components with slot content to update
    isHmrUpdating = true;
    instance.update();
    isHmrUpdating = false;
  });
}
function reload(id, newComp) {
  const record = map.get(id);
  if (!record) return;
  newComp = normalizeClassComponent(newComp);
  // update initial def (for not-yet-rendered components)
  updateComponentDef(record.initialDef, newComp);
  // create a snapshot which avoids the set being mutated during updates
  const instances = [...record.instances];
  for (const instance of instances) {
    const oldComp = normalizeClassComponent(instance.type);
    if (!hmrDirtyComponents.has(oldComp)) {
      // 1. Update existing comp definition to match new one
      if (oldComp !== record.initialDef) {
        updateComponentDef(oldComp, newComp);
      }
      // 2. mark definition dirty. This forces the renderer to replace the
      // component on patch.
      hmrDirtyComponents.add(oldComp);
    }
    // 3. invalidate options resolution cache
    instance.appContext.optionsCache.delete(instance.type);
    // 4. actually update
    if (instance.ceReload) {
      // custom element
      hmrDirtyComponents.add(oldComp);
      instance.ceReload(newComp.styles);
      hmrDirtyComponents.delete(oldComp);
    } else if (instance.parent) {
      // 4. Force the parent instance to re-render. This will cause all updated
      // components to be unmounted and re-mounted. Queue the update so that we
      // don't end up forcing the same parent to re-render multiple times.
      queueJob(instance.parent.update);
      // instance is the inner component of an async custom element
      // invoke to reset styles
      if (instance.parent.type.__asyncLoader && instance.parent.ceReload) {
        instance.parent.ceReload(newComp.styles);
      }
    } else if (instance.appContext.reload) {
      // root instance mounted via createApp() has a reload method
      instance.appContext.reload();
    } else if (typeof window !== "undefined") {
      // root instance inside tree created via raw render(). Force reload.
      window.location.reload();
    } else {
      console.warn(
        "[HMR] Root or manually mounted instance modified. Full reload required."
      );
    }
  }
  // 5. make sure to cleanup dirty hmr components after update
  queuePostFlushCb(() => {
    for (const instance of instances) {
      hmrDirtyComponents.delete(normalizeClassComponent(instance.type));
    }
  });
}
function updateComponentDef(oldComp, newComp) {
  shared$2.extend(oldComp, newComp);
  for (const key in oldComp) {
    if (key !== "__file" && !(key in newComp)) {
      delete oldComp[key];
    }
  }
}
function tryWrap(fn) {
  return (id, arg) => {
    try {
      return fn(id, arg);
    } catch (e) {
      console.error(e);
      console.warn(
        `[HMR] Something went wrong during Vue component hot-reload. ` +
          `Full reload required.`
      );
    }
  };
}

let devtools;
let buffer = [];
let devtoolsNotInstalled = false;
function emit(event, ...args) {
  if (devtools) {
    devtools.emit(event, ...args);
  } else if (!devtoolsNotInstalled) {
    buffer.push({ event, args });
  }
}
function setDevtoolsHook(hook, target) {
  var _a, _b;
  devtools = hook;
  if (devtools) {
    devtools.enabled = true;
    buffer.forEach(({ event, args }) => devtools.emit(event, ...args));
    buffer = [];
  } else if (
    // handle late devtools injection - only do this if we are in an actual
    // browser environment to avoid the timer handle stalling test runner exit
    // (#4815)
    typeof window !== "undefined" &&
    // some envs mock window but not fully
    window.HTMLElement &&
    // also exclude jsdom
    !((_b =
      (_a = window.navigator) === null || _a === void 0
        ? void 0
        : _a.userAgent) === null || _b === void 0
      ? void 0
      : _b.includes("jsdom"))
  ) {
    const replay = (target.__VUE_DEVTOOLS_HOOK_REPLAY__ =
      target.__VUE_DEVTOOLS_HOOK_REPLAY__ || []);
    replay.push((newHook) => {
      setDevtoolsHook(newHook, target);
    });
    // clear buffer after 3s - the user probably doesn't have devtools installed
    // at all, and keeping the buffer will cause memory leaks (#4738)
    setTimeout(() => {
      if (!devtools) {
        target.__VUE_DEVTOOLS_HOOK_REPLAY__ = null;
        devtoolsNotInstalled = true;
        buffer = [];
      }
    }, 3000);
  } else {
    // non-browser env, assume not installed
    devtoolsNotInstalled = true;
    buffer = [];
  }
}
function devtoolsInitApp(app, version) {
  emit("app:init" /* DevtoolsHooks.APP_INIT */, app, version, {
    Fragment: Fragment$1,
    Text,
    Comment: Comment$1,
    Static,
  });
}
function devtoolsUnmountApp(app) {
  emit("app:unmount" /* DevtoolsHooks.APP_UNMOUNT */, app);
}
const devtoolsComponentAdded = /*#__PURE__*/ createDevtoolsComponentHook(
  "component:added" /* DevtoolsHooks.COMPONENT_ADDED */
);
const devtoolsComponentUpdated = /*#__PURE__*/ createDevtoolsComponentHook(
  "component:updated" /* DevtoolsHooks.COMPONENT_UPDATED */
);
const devtoolsComponentRemoved = /*#__PURE__*/ createDevtoolsComponentHook(
  "component:removed" /* DevtoolsHooks.COMPONENT_REMOVED */
);
function createDevtoolsComponentHook(hook) {
  return (component) => {
    emit(
      hook,
      component.appContext.app,
      component.uid,
      component.parent ? component.parent.uid : undefined,
      component
    );
  };
}
const devtoolsPerfStart = /*#__PURE__*/ createDevtoolsPerformanceHook(
  "perf:start" /* DevtoolsHooks.PERFORMANCE_START */
);
const devtoolsPerfEnd = /*#__PURE__*/ createDevtoolsPerformanceHook(
  "perf:end" /* DevtoolsHooks.PERFORMANCE_END */
);
function createDevtoolsPerformanceHook(hook) {
  return (component, type, time) => {
    emit(hook, component.appContext.app, component.uid, component, type, time);
  };
}
function devtoolsComponentEmit(component, event, params) {
  emit(
    "component:emit" /* DevtoolsHooks.COMPONENT_EMIT */,
    component.appContext.app,
    component,
    event,
    params
  );
}

function emit$1(instance, event, ...rawArgs) {
  if (instance.isUnmounted) return;
  const props = instance.vnode.props || shared$2.EMPTY_OBJ;
  if (process.env.NODE_ENV !== "production") {
    const {
      emitsOptions,
      propsOptions: [propsOptions],
    } = instance;
    if (emitsOptions) {
      if (!(event in emitsOptions) && !false) {
        if (!propsOptions || !(shared$2.toHandlerKey(event) in propsOptions)) {
          warn(
            `Component emitted event "${event}" but it is neither declared in ` +
              `the emits option nor as an "${shared$2.toHandlerKey(
                event
              )}" prop.`
          );
        }
      } else {
        const validator = emitsOptions[event];
        if (shared$2.isFunction(validator)) {
          const isValid = validator(...rawArgs);
          if (!isValid) {
            warn(
              `Invalid event arguments: event validation failed for event "${event}".`
            );
          }
        }
      }
    }
  }
  let args = rawArgs;
  const isModelListener = event.startsWith("update:");
  // for v-model update:xxx events, apply modifiers on args
  const modelArg = isModelListener && event.slice(7);
  if (modelArg && modelArg in props) {
    const modifiersKey = `${
      modelArg === "modelValue" ? "model" : modelArg
    }Modifiers`;
    const { number, trim } = props[modifiersKey] || shared$2.EMPTY_OBJ;
    if (trim) {
      args = rawArgs.map((a) => a.trim());
    }
    if (number) {
      args = rawArgs.map(shared$2.toNumber);
    }
  }
  if (process.env.NODE_ENV !== "production" || __VUE_PROD_DEVTOOLS__) {
    devtoolsComponentEmit(instance, event, args);
  }
  if (process.env.NODE_ENV !== "production") {
    const lowerCaseEvent = event.toLowerCase();
    if (
      lowerCaseEvent !== event &&
      props[shared$2.toHandlerKey(lowerCaseEvent)]
    ) {
      warn(
        `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(
            instance,
            instance.type
          )} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${shared$2.hyphenate(
            event
          )}" instead of "${event}".`
      );
    }
  }
  let handlerName;
  let handler =
    props[(handlerName = shared$2.toHandlerKey(event))] ||
    // also try camelCase event handler (#2249)
    props[(handlerName = shared$2.toHandlerKey(shared$2.camelize(event)))];
  // for v-model update:xxx events, also trigger kebab-case equivalent
  // for props passed via kebab-case
  if (!handler && isModelListener) {
    handler =
      props[(handlerName = shared$2.toHandlerKey(shared$2.hyphenate(event)))];
  }
  if (handler) {
    callWithAsyncErrorHandling(
      handler,
      instance,
      6 /* ErrorCodes.COMPONENT_EVENT_HANDLER */,
      args
    );
  }
  const onceHandler = props[handlerName + `Once`];
  if (onceHandler) {
    if (!instance.emitted) {
      instance.emitted = {};
    } else if (instance.emitted[handlerName]) {
      return;
    }
    instance.emitted[handlerName] = true;
    callWithAsyncErrorHandling(
      onceHandler,
      instance,
      6 /* ErrorCodes.COMPONENT_EVENT_HANDLER */,
      args
    );
  }
}
function normalizeEmitsOptions(comp, appContext, asMixin = false) {
  const cache = appContext.emitsCache;
  const cached = cache.get(comp);
  if (cached !== undefined) {
    return cached;
  }
  const raw = comp.emits;
  let normalized = {};
  // apply mixin/extends props
  let hasExtends = false;
  if (__VUE_OPTIONS_API__ && !shared$2.isFunction(comp)) {
    const extendEmits = (raw) => {
      const normalizedFromExtend = normalizeEmitsOptions(raw, appContext, true);
      if (normalizedFromExtend) {
        hasExtends = true;
        shared$2.extend(normalized, normalizedFromExtend);
      }
    };
    if (!asMixin && appContext.mixins.length) {
      appContext.mixins.forEach(extendEmits);
    }
    if (comp.extends) {
      extendEmits(comp.extends);
    }
    if (comp.mixins) {
      comp.mixins.forEach(extendEmits);
    }
  }
  if (!raw && !hasExtends) {
    if (shared$2.isObject(comp)) {
      cache.set(comp, null);
    }
    return null;
  }
  if (shared$2.isArray(raw)) {
    raw.forEach((key) => (normalized[key] = null));
  } else {
    shared$2.extend(normalized, raw);
  }
  if (shared$2.isObject(comp)) {
    cache.set(comp, normalized);
  }
  return normalized;
}
// Check if an incoming prop key is a declared emit event listener.
// e.g. With `emits: { click: null }`, props named `onClick` and `onclick` are
// both considered matched listeners.
function isEmitListener(options, key) {
  if (!options || !shared$2.isOn(key)) {
    return false;
  }
  key = key.slice(2).replace(/Once$/, "");
  return (
    shared$2.hasOwn(options, key[0].toLowerCase() + key.slice(1)) ||
    shared$2.hasOwn(options, shared$2.hyphenate(key)) ||
    shared$2.hasOwn(options, key)
  );
}

/**
 * mark the current rendering instance for asset resolution (e.g.
 * resolveComponent, resolveDirective) during render
 */
let currentRenderingInstance$1 = null;
let currentScopeId = null;
/**
 * Note: rendering calls maybe nested. The function returns the parent rendering
 * instance if present, which should be restored after the render is done:
 *
 * ```js
 * const prev = setCurrentRenderingInstance(i)
 * // ...render
 * setCurrentRenderingInstance(prev)
 * ```
 */
function setCurrentRenderingInstance(instance) {
  const prev = currentRenderingInstance$1;
  currentRenderingInstance$1 = instance;
  currentScopeId = (instance && instance.type.__scopeId) || null;
  return prev;
}
/**
 * Wrap a slot function to memoize current rendering instance
 * @private compiler helper
 */
function withCtx$1(
  fn,
  ctx = currentRenderingInstance$1,
  isNonScopedSlot // false only
) {
  if (!ctx) return fn;
  // already normalized
  if (fn._n) {
    return fn;
  }
  const renderFnWithContext = (...args) => {
    // If a user calls a compiled slot inside a template expression (#1745), it
    // can mess up block tracking, so by default we disable block tracking and
    // force bail out when invoking a compiled slot (indicated by the ._d flag).
    // This isn't necessary if rendering a compiled `<slot>`, so we flip the
    // ._d flag off when invoking the wrapped fn inside `renderSlot`.
    if (renderFnWithContext._d) {
      setBlockTracking$1(-1);
    }
    const prevInstance = setCurrentRenderingInstance(ctx);
    const res = fn(...args);
    setCurrentRenderingInstance(prevInstance);
    if (renderFnWithContext._d) {
      setBlockTracking$1(1);
    }
    if (process.env.NODE_ENV !== "production" || __VUE_PROD_DEVTOOLS__) {
      devtoolsComponentUpdated(ctx);
    }
    return res;
  };
  // mark normalized to avoid duplicated wrapping
  renderFnWithContext._n = true;
  // mark this as compiled by default
  // this is used in vnode.ts -> normalizeChildren() to set the slot
  // rendering flag.
  renderFnWithContext._c = true;
  // disable block tracking by default
  renderFnWithContext._d = true;
  return renderFnWithContext;
}

/**
 * dev only flag to track whether $attrs was used during render.
 * If $attrs was used during render then the warning for failed attrs
 * fallthrough can be suppressed.
 */
let accessedAttrs = false;
function markAttrsAccessed() {
  accessedAttrs = true;
}
function renderComponentRoot(instance) {
  const {
    type: Component,
    vnode,
    proxy,
    withProxy,
    props,
    propsOptions: [propsOptions],
    slots,
    attrs,
    emit,
    render,
    renderCache,
    data,
    setupState,
    ctx,
    inheritAttrs,
  } = instance;
  let result;
  let fallthroughAttrs;
  const prev = setCurrentRenderingInstance(instance);
  if (process.env.NODE_ENV !== "production") {
    accessedAttrs = false;
  }
  try {
    if (vnode.shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */) {
      // withProxy is a proxy with a different `has` trap only for
      // runtime-compiled render functions using `with` block.
      const proxyToUse = withProxy || proxy;
      result = normalizeVNode(
        render.call(
          proxyToUse,
          proxyToUse,
          renderCache,
          props,
          setupState,
          data,
          ctx
        )
      );
      fallthroughAttrs = attrs;
    } else {
      // functional
      const render = Component;
      // in dev, mark attrs accessed if optional props (attrs === props)
      if (process.env.NODE_ENV !== "production" && attrs === props) {
        markAttrsAccessed();
      }
      result = normalizeVNode(
        render.length > 1
          ? render(
              props,
              process.env.NODE_ENV !== "production"
                ? {
                    get attrs() {
                      markAttrsAccessed();
                      return attrs;
                    },
                    slots,
                    emit,
                  }
                : { attrs, slots, emit }
            )
          : render(props, null /* we know it doesn't need it */)
      );
      fallthroughAttrs = Component.props
        ? attrs
        : getFunctionalFallthrough(attrs);
    }
  } catch (err) {
    handleError$1(err, instance, 1 /* ErrorCodes.RENDER_FUNCTION */);
    result = createVNode$1(Comment$1);
  }
  // attr merging
  // in dev mode, comments are preserved, and it's possible for a template
  // to have comments along side the root element which makes it a fragment
  let root = result;
  let setRoot = undefined;
  if (
    process.env.NODE_ENV !== "production" &&
    result.patchFlag > 0 &&
    result.patchFlag & 2048 /* PatchFlags.DEV_ROOT_FRAGMENT */
  ) {
    [root, setRoot] = getChildRoot(result);
  }
  if (fallthroughAttrs && inheritAttrs !== false) {
    const keys = Object.keys(fallthroughAttrs);
    const { shapeFlag } = root;
    if (keys.length) {
      if (
        shapeFlag &
        (1 /* ShapeFlags.ELEMENT */ | 6) /* ShapeFlags.COMPONENT */
      ) {
        if (propsOptions && keys.some(shared$2.isModelListener)) {
          // If a v-model listener (onUpdate:xxx) has a corresponding declared
          // prop, it indicates this component expects to handle v-model and
          // it should not fallthrough.
          // related: #1543, #1643, #1989
          fallthroughAttrs = filterModelListeners(
            fallthroughAttrs,
            propsOptions
          );
        }
        root = cloneVNode$1(root, fallthroughAttrs);
      } else if (
        process.env.NODE_ENV !== "production" &&
        !accessedAttrs &&
        root.type !== Comment$1
      ) {
        const allAttrs = Object.keys(attrs);
        const eventAttrs = [];
        const extraAttrs = [];
        for (let i = 0, l = allAttrs.length; i < l; i++) {
          const key = allAttrs[i];
          if (shared$2.isOn(key)) {
            // ignore v-model handlers when they fail to fallthrough
            if (!shared$2.isModelListener(key)) {
              // remove `on`, lowercase first letter to reflect event casing
              // accurately
              eventAttrs.push(key[2].toLowerCase() + key.slice(3));
            }
          } else {
            extraAttrs.push(key);
          }
        }
        if (extraAttrs.length) {
          warn(
            `Extraneous non-props attributes (` +
              `${extraAttrs.join(", ")}) ` +
              `were passed to component but could not be automatically inherited ` +
              `because component renders fragment or text root nodes.`
          );
        }
        if (eventAttrs.length) {
          warn(
            `Extraneous non-emits event listeners (` +
              `${eventAttrs.join(", ")}) ` +
              `were passed to component but could not be automatically inherited ` +
              `because component renders fragment or text root nodes. ` +
              `If the listener is intended to be a component custom event listener only, ` +
              `declare it using the "emits" option.`
          );
        }
      }
    }
  }
  // inherit directives
  if (vnode.dirs) {
    if (process.env.NODE_ENV !== "production" && !isElementRoot(root)) {
      warn(
        `Runtime directive used on component with non-element root node. ` +
          `The directives will not function as intended.`
      );
    }
    // clone before mutating since the root may be a hoisted vnode
    root = cloneVNode$1(root);
    root.dirs = root.dirs ? root.dirs.concat(vnode.dirs) : vnode.dirs;
  }
  // inherit transition data
  if (vnode.transition) {
    if (process.env.NODE_ENV !== "production" && !isElementRoot(root)) {
      warn(
        `Component inside <Transition> renders non-element root node ` +
          `that cannot be animated.`
      );
    }
    root.transition = vnode.transition;
  }
  if (process.env.NODE_ENV !== "production" && setRoot) {
    setRoot(root);
  } else {
    result = root;
  }
  setCurrentRenderingInstance(prev);
  return result;
}
/**
 * dev only
 * In dev mode, template root level comments are rendered, which turns the
 * template into a fragment root, but we need to locate the single element
 * root for attrs and scope id processing.
 */
const getChildRoot = (vnode) => {
  const rawChildren = vnode.children;
  const dynamicChildren = vnode.dynamicChildren;
  const childRoot = filterSingleRoot(rawChildren);
  if (!childRoot) {
    return [vnode, undefined];
  }
  const index = rawChildren.indexOf(childRoot);
  const dynamicIndex = dynamicChildren
    ? dynamicChildren.indexOf(childRoot)
    : -1;
  const setRoot = (updatedRoot) => {
    rawChildren[index] = updatedRoot;
    if (dynamicChildren) {
      if (dynamicIndex > -1) {
        dynamicChildren[dynamicIndex] = updatedRoot;
      } else if (updatedRoot.patchFlag > 0) {
        vnode.dynamicChildren = [...dynamicChildren, updatedRoot];
      }
    }
  };
  return [normalizeVNode(childRoot), setRoot];
};
function filterSingleRoot(children) {
  let singleRoot;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (isVNode$1(child)) {
      // ignore user comment
      if (child.type !== Comment$1 || child.children === "v-if") {
        if (singleRoot) {
          // has more than 1 non-comment child, return now
          return;
        } else {
          singleRoot = child;
        }
      }
    } else {
      return;
    }
  }
  return singleRoot;
}
const getFunctionalFallthrough = (attrs) => {
  let res;
  for (const key in attrs) {
    if (key === "class" || key === "style" || shared$2.isOn(key)) {
      (res || (res = {}))[key] = attrs[key];
    }
  }
  return res;
};
const filterModelListeners = (attrs, props) => {
  const res = {};
  for (const key in attrs) {
    if (!shared$2.isModelListener(key) || !(key.slice(9) in props)) {
      res[key] = attrs[key];
    }
  }
  return res;
};
const isElementRoot = (vnode) => {
  return (
    vnode.shapeFlag &
      (6 /* ShapeFlags.COMPONENT */ | 1) /* ShapeFlags.ELEMENT */ ||
    vnode.type === Comment$1 // potential v-if branch switch
  );
};
function shouldUpdateComponent(prevVNode, nextVNode, optimized) {
  const { props: prevProps, children: prevChildren, component } = prevVNode;
  const { props: nextProps, children: nextChildren, patchFlag } = nextVNode;
  const emits = component.emitsOptions;
  // Parent component's render function was hot-updated. Since this may have
  // caused the child component's slots content to have changed, we need to
  // force the child to update as well.
  if (
    process.env.NODE_ENV !== "production" &&
    (prevChildren || nextChildren) &&
    isHmrUpdating
  ) {
    return true;
  }
  // force child update for runtime directive or transition on component vnode.
  if (nextVNode.dirs || nextVNode.transition) {
    return true;
  }
  if (optimized && patchFlag >= 0) {
    if (patchFlag & 1024 /* PatchFlags.DYNAMIC_SLOTS */) {
      // slot content that references values that might have changed,
      // e.g. in a v-for
      return true;
    }
    if (patchFlag & 16 /* PatchFlags.FULL_PROPS */) {
      if (!prevProps) {
        return !!nextProps;
      }
      // presence of this flag indicates props are always non-null
      return hasPropsChanged(prevProps, nextProps, emits);
    } else if (patchFlag & 8 /* PatchFlags.PROPS */) {
      const dynamicProps = nextVNode.dynamicProps;
      for (let i = 0; i < dynamicProps.length; i++) {
        const key = dynamicProps[i];
        if (nextProps[key] !== prevProps[key] && !isEmitListener(emits, key)) {
          return true;
        }
      }
    }
  } else {
    // this path is only taken by manually written render functions
    // so presence of any children leads to a forced update
    if (prevChildren || nextChildren) {
      if (!nextChildren || !nextChildren.$stable) {
        return true;
      }
    }
    if (prevProps === nextProps) {
      return false;
    }
    if (!prevProps) {
      return !!nextProps;
    }
    if (!nextProps) {
      return true;
    }
    return hasPropsChanged(prevProps, nextProps, emits);
  }
  return false;
}
function hasPropsChanged(prevProps, nextProps, emitsOptions) {
  const nextKeys = Object.keys(nextProps);
  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true;
  }
  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i];
    if (
      nextProps[key] !== prevProps[key] &&
      !isEmitListener(emitsOptions, key)
    ) {
      return true;
    }
  }
  return false;
}
function updateHOCHostEl(
  { vnode, parent },
  el // HostNode
) {
  while (parent && parent.subTree === vnode) {
    (vnode = parent.vnode).el = el;
    parent = parent.parent;
  }
}

const isSuspense = (type) => type.__isSuspense;
function queueEffectWithSuspense(fn, suspense) {
  if (suspense && suspense.pendingBranch) {
    if (shared$2.isArray(fn)) {
      suspense.effects.push(...fn);
    } else {
      suspense.effects.push(fn);
    }
  } else {
    queuePostFlushCb(fn);
  }
}

function provide$1(key, value) {
  if (!currentInstance) {
    if (process.env.NODE_ENV !== "production") {
      warn(`provide() can only be used inside setup().`);
    }
  } else {
    let provides = currentInstance.provides;
    // by default an instance inherits its parent's provides object
    // but when it needs to provide values of its own, it creates its
    // own provides object using parent provides object as prototype.
    // this way in `inject` we can simply look up injections from direct
    // parent and let the prototype chain do the work.
    const parentProvides =
      currentInstance.parent && currentInstance.parent.provides;
    if (parentProvides === provides) {
      provides = currentInstance.provides = Object.create(parentProvides);
    }
    // TS doesn't allow symbol as index type
    provides[key] = value;
  }
}
function inject$1(key, defaultValue, treatDefaultAsFactory = false) {
  // fallback to `currentRenderingInstance` so that this can be called in
  // a functional component
  const instance = currentInstance || currentRenderingInstance$1;
  if (instance) {
    // #2400
    // to support `app.use` plugins,
    // fallback to appContext's `provides` if the instance is at root
    const provides =
      instance.parent == null
        ? instance.vnode.appContext && instance.vnode.appContext.provides
        : instance.parent.provides;
    if (provides && key in provides) {
      // TS doesn't allow symbol as index type
      return provides[key];
    } else if (arguments.length > 1) {
      return treatDefaultAsFactory && shared$2.isFunction(defaultValue)
        ? defaultValue.call(instance.proxy)
        : defaultValue;
    } else if (process.env.NODE_ENV !== "production") {
      warn(`injection "${String(key)}" not found.`);
    }
  } else if (process.env.NODE_ENV !== "production") {
    warn(`inject() can only be used inside setup() or functional components.`);
  }
}

// Simple effect.
function watchEffect(effect, options) {
  return doWatch(effect, null, options);
}
function watchPostEffect(effect, options) {
  return doWatch(
    effect,
    null,
    process.env.NODE_ENV !== "production"
      ? Object.assign(Object.assign({}, options), { flush: "post" })
      : { flush: "post" }
  );
}
function watchSyncEffect(effect, options) {
  return doWatch(
    effect,
    null,
    process.env.NODE_ENV !== "production"
      ? Object.assign(Object.assign({}, options), { flush: "sync" })
      : { flush: "sync" }
  );
}
// initial value for watchers to trigger on undefined initial values
const INITIAL_WATCHER_VALUE = {};
// implementation
function watch(source, cb, options) {
  if (process.env.NODE_ENV !== "production" && !shared$2.isFunction(cb)) {
    warn(
      `\`watch(fn, options?)\` signature has been moved to a separate API. ` +
        `Use \`watchEffect(fn, options?)\` instead. \`watch\` now only ` +
        `supports \`watch(source, cb, options?) signature.`
    );
  }
  return doWatch(source, cb, options);
}
function doWatch(
  source,
  cb,
  { immediate, deep, flush, onTrack, onTrigger } = shared$2.EMPTY_OBJ
) {
  if (process.env.NODE_ENV !== "production" && !cb) {
    if (immediate !== undefined) {
      warn(
        `watch() "immediate" option is only respected when using the ` +
          `watch(source, callback, options?) signature.`
      );
    }
    if (deep !== undefined) {
      warn(
        `watch() "deep" option is only respected when using the ` +
          `watch(source, callback, options?) signature.`
      );
    }
  }
  const warnInvalidSource = (s) => {
    warn(
      `Invalid watch source: `,
      s,
      `A watch source can only be a getter/effect function, a ref, ` +
        `a reactive object, or an array of these types.`
    );
  };
  const instance = currentInstance;
  let getter;
  let forceTrigger = false;
  let isMultiSource = false;
  if (isRef(source)) {
    getter = () => source.value;
    forceTrigger = isShallow(source);
  } else if (isReactive(source)) {
    getter = () => source;
    deep = true;
  } else if (shared$2.isArray(source)) {
    isMultiSource = true;
    forceTrigger = source.some((s) => isReactive(s) || isShallow(s));
    getter = () =>
      source.map((s) => {
        if (isRef(s)) {
          return s.value;
        } else if (isReactive(s)) {
          return traverse(s);
        } else if (shared$2.isFunction(s)) {
          return callWithErrorHandling(
            s,
            instance,
            2 /* ErrorCodes.WATCH_GETTER */
          );
        } else {
          process.env.NODE_ENV !== "production" && warnInvalidSource(s);
        }
      });
  } else if (shared$2.isFunction(source)) {
    if (cb) {
      // getter with cb
      getter = () =>
        callWithErrorHandling(
          source,
          instance,
          2 /* ErrorCodes.WATCH_GETTER */
        );
    } else {
      // no cb -> simple effect
      getter = () => {
        if (instance && instance.isUnmounted) {
          return;
        }
        if (cleanup) {
          cleanup();
        }
        return callWithAsyncErrorHandling(
          source,
          instance,
          3 /* ErrorCodes.WATCH_CALLBACK */,
          [onCleanup]
        );
      };
    }
  } else {
    getter = shared$2.NOOP;
    process.env.NODE_ENV !== "production" && warnInvalidSource(source);
  }
  if (cb && deep) {
    const baseGetter = getter;
    getter = () => traverse(baseGetter());
  }
  let cleanup;
  let onCleanup = (fn) => {
    cleanup = effect.onStop = () => {
      callWithErrorHandling(fn, instance, 4 /* ErrorCodes.WATCH_CLEANUP */);
    };
  };
  // in SSR there is no need to setup an actual effect, and it should be noop
  // unless it's eager
  if (isInSSRComponentSetup) {
    // we will also not call the invalidate callback (+ runner is not set up)
    onCleanup = shared$2.NOOP;
    if (!cb) {
      getter();
    } else if (immediate) {
      callWithAsyncErrorHandling(
        cb,
        instance,
        3 /* ErrorCodes.WATCH_CALLBACK */,
        [getter(), isMultiSource ? [] : undefined, onCleanup]
      );
    }
    return shared$2.NOOP;
  }
  let oldValue = isMultiSource ? [] : INITIAL_WATCHER_VALUE;
  const job = () => {
    if (!effect.active) {
      return;
    }
    if (cb) {
      // watch(source, cb)
      const newValue = effect.run();
      if (
        deep ||
        forceTrigger ||
        (isMultiSource
          ? newValue.some((v, i) => shared$2.hasChanged(v, oldValue[i]))
          : shared$2.hasChanged(newValue, oldValue)) ||
        false
      ) {
        // cleanup before running cb again
        if (cleanup) {
          cleanup();
        }
        callWithAsyncErrorHandling(
          cb,
          instance,
          3 /* ErrorCodes.WATCH_CALLBACK */,
          [
            newValue,
            // pass undefined as the old value when it's changed for the first time
            oldValue === INITIAL_WATCHER_VALUE ? undefined : oldValue,
            onCleanup,
          ]
        );
        oldValue = newValue;
      }
    } else {
      // watchEffect
      effect.run();
    }
  };
  // important: mark the job as a watcher callback so that scheduler knows
  // it is allowed to self-trigger (#1727)
  job.allowRecurse = !!cb;
  let scheduler;
  if (flush === "sync") {
    scheduler = job; // the scheduler function gets called directly
  } else if (flush === "post") {
    scheduler = () => queuePostRenderEffect(job, instance && instance.suspense);
  } else {
    // default: 'pre'
    job.pre = true;
    if (instance) job.id = instance.uid;
    scheduler = () => queueJob(job);
  }
  const effect = new ReactiveEffect(getter, scheduler);
  if (process.env.NODE_ENV !== "production") {
    effect.onTrack = onTrack;
    effect.onTrigger = onTrigger;
  }
  // initial run
  if (cb) {
    if (immediate) {
      job();
    } else {
      oldValue = effect.run();
    }
  } else if (flush === "post") {
    queuePostRenderEffect(
      effect.run.bind(effect),
      instance && instance.suspense
    );
  } else {
    effect.run();
  }
  return () => {
    effect.stop();
    if (instance && instance.scope) {
      shared$2.remove(instance.scope.effects, effect);
    }
  };
}
// this.$watch
function instanceWatch$1(source, value, options) {
  const publicThis = this.proxy;
  const getter = shared$2.isString(source)
    ? source.includes(".")
      ? createPathGetter$1(publicThis, source)
      : () => publicThis[source]
    : source.bind(publicThis, publicThis);
  let cb;
  if (shared$2.isFunction(value)) {
    cb = value;
  } else {
    cb = value.handler;
    options = value;
  }
  const cur = currentInstance;
  setCurrentInstance$2(this);
  const res = doWatch(getter, cb.bind(publicThis), options);
  if (cur) {
    setCurrentInstance$2(cur);
  } else {
    unsetCurrentInstance();
  }
  return res;
}
function createPathGetter$1(ctx, path) {
  const segments = path.split(".");
  return () => {
    let cur = ctx;
    for (let i = 0; i < segments.length && cur; i++) {
      cur = cur[segments[i]];
    }
    return cur;
  };
}
function traverse(value, seen) {
  if (!shared$2.isObject(value) || value["__v_skip" /* ReactiveFlags.SKIP */]) {
    return value;
  }
  seen = seen || new Set();
  if (seen.has(value)) {
    return value;
  }
  seen.add(value);
  if (isRef(value)) {
    traverse(value.value, seen);
  } else if (shared$2.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], seen);
    }
  } else if (shared$2.isSet(value) || shared$2.isMap(value)) {
    value.forEach((v) => {
      traverse(v, seen);
    });
  } else if (shared$2.isPlainObject(value)) {
    for (const key in value) {
      traverse(value[key], seen);
    }
  }
  return value;
}

const isAsyncWrapper = (i) => !!i.type.__asyncLoader;

const isKeepAlive = (vnode) => vnode.type.__isKeepAlive;
function onActivated$1(hook, target) {
  registerKeepAliveHook(hook, "a" /* LifecycleHooks.ACTIVATED */, target);
}
function onDeactivated$1(hook, target) {
  registerKeepAliveHook(hook, "da" /* LifecycleHooks.DEACTIVATED */, target);
}
function registerKeepAliveHook(hook, type, target = currentInstance) {
  // cache the deactivate branch check wrapper for injected hooks so the same
  // hook can be properly deduped by the scheduler. "__wdc" stands for "with
  // deactivation check".
  const wrappedHook =
    hook.__wdc ||
    (hook.__wdc = () => {
      // only fire the hook if the target instance is NOT in a deactivated branch.
      let current = target;
      while (current) {
        if (current.isDeactivated) {
          return;
        }
        current = current.parent;
      }
      return hook();
    });
  injectHook(type, wrappedHook, target);
  // In addition to registering it on the target instance, we walk up the parent
  // chain and register it on all ancestor instances that are keep-alive roots.
  // This avoids the need to walk the entire component tree when invoking these
  // hooks, and more importantly, avoids the need to track child components in
  // arrays.
  if (target) {
    let current = target.parent;
    while (current && current.parent) {
      if (isKeepAlive(current.parent.vnode)) {
        injectToKeepAliveRoot(wrappedHook, type, target, current);
      }
      current = current.parent;
    }
  }
}
function injectToKeepAliveRoot(hook, type, target, keepAliveRoot) {
  // injectHook wraps the original for error handling, so make sure to remove
  // the wrapped version.
  const injected = injectHook(type, hook, keepAliveRoot, true /* prepend */);
  onUnmounted$1(() => {
    shared$2.remove(keepAliveRoot[type], injected);
  }, target);
}

function injectHook(type, hook, target = currentInstance, prepend = false) {
  if (target) {
    const hooks = target[type] || (target[type] = []);
    // cache the error handling wrapper for injected hooks so the same hook
    // can be properly deduped by the scheduler. "__weh" stands for "with error
    // handling".
    const wrappedHook =
      hook.__weh ||
      (hook.__weh = (...args) => {
        if (target.isUnmounted) {
          return;
        }
        // disable tracking inside all lifecycle hooks
        // since they can potentially be called inside effects.
        pauseTracking();
        // Set currentInstance during hook invocation.
        // This assumes the hook does not synchronously trigger other hooks, which
        // can only be false when the user does something really funky.
        setCurrentInstance$2(target);
        const res = callWithAsyncErrorHandling(hook, target, type, args);
        unsetCurrentInstance();
        resetTracking();
        return res;
      });
    if (prepend) {
      hooks.unshift(wrappedHook);
    } else {
      hooks.push(wrappedHook);
    }
    return wrappedHook;
  } else if (process.env.NODE_ENV !== "production") {
    const apiName = shared$2.toHandlerKey(
      ErrorTypeStrings[type].replace(/ hook$/, "")
    );
    warn(
      `${apiName} is called when there is no active component instance to be ` +
        `associated with. ` +
        `Lifecycle injection APIs can only be used during execution of setup().` +
        (` If you are using async setup(), make sure to register lifecycle ` +
          `hooks before the first await statement.`)
    );
  }
}
const createHook$1 =
  (lifecycle) =>
  (hook, target = currentInstance) =>
    // post-create lifecycle registrations are noops during SSR (except for serverPrefetch)
    (!isInSSRComponentSetup ||
      lifecycle === "sp") /* LifecycleHooks.SERVER_PREFETCH */ &&
    injectHook(lifecycle, (...args) => hook(...args), target);
const onBeforeMount$1 = createHook$1("bm" /* LifecycleHooks.BEFORE_MOUNT */);
const onMounted$1 = createHook$1("m" /* LifecycleHooks.MOUNTED */);
const onBeforeUpdate$1 = createHook$1("bu" /* LifecycleHooks.BEFORE_UPDATE */);
const onUpdated$1 = createHook$1("u" /* LifecycleHooks.UPDATED */);
const onBeforeUnmount$1 = createHook$1(
  "bum" /* LifecycleHooks.BEFORE_UNMOUNT */
);
const onUnmounted$1 = createHook$1("um" /* LifecycleHooks.UNMOUNTED */);
const onServerPrefetch$1 = createHook$1(
  "sp" /* LifecycleHooks.SERVER_PREFETCH */
);
const onRenderTriggered$1 = createHook$1(
  "rtg" /* LifecycleHooks.RENDER_TRIGGERED */
);
const onRenderTracked$1 = createHook$1(
  "rtc" /* LifecycleHooks.RENDER_TRACKED */
);
function onErrorCaptured$1(hook, target = currentInstance) {
  injectHook("ec" /* LifecycleHooks.ERROR_CAPTURED */, hook, target);
}

/**
Runtime helper for applying directives to a vnode. Example usage:

const comp = resolveComponent('comp')
const foo = resolveDirective('foo')
const bar = resolveDirective('bar')

return withDirectives(h(comp), [
  [foo, this.x],
  [bar, this.y]
])
*/
function validateDirectiveName(name) {
  if (shared$2.isBuiltInDirective(name)) {
    warn("Do not use built-in directive ids as custom directive id: " + name);
  }
}
function invokeDirectiveHook(vnode, prevVNode, instance, name) {
  const bindings = vnode.dirs;
  const oldBindings = prevVNode && prevVNode.dirs;
  for (let i = 0; i < bindings.length; i++) {
    const binding = bindings[i];
    if (oldBindings) {
      binding.oldValue = oldBindings[i].value;
    }
    let hook = binding.dir[name];
    if (hook) {
      // disable tracking inside all lifecycle hooks
      // since they can potentially be called inside effects.
      pauseTracking();
      callWithAsyncErrorHandling(
        hook,
        instance,
        8 /* ErrorCodes.DIRECTIVE_HOOK */,
        [vnode.el, binding, vnode, prevVNode]
      );
      resetTracking();
    }
  }
}
const NULL_DYNAMIC_COMPONENT = Symbol();

/**
 * For prefixing keys in v-on="obj" with "on"
 * @private
 */
function toHandlers(obj, preserveCaseIfNecessary) {
  const ret = {};
  if (process.env.NODE_ENV !== "production" && !shared$2.isObject(obj)) {
    warn(`v-on with no argument expects an object value.`);
    return ret;
  }
  for (const key in obj) {
    ret[
      preserveCaseIfNecessary && /[A-Z]/.test(key)
        ? `on:${key}`
        : shared$2.toHandlerKey(key)
    ] = obj[key];
  }
  return ret;
}

/**
 * #2437 In Vue 3, functional components do not have a public instance proxy but
 * they exist in the internal parent chain. For code that relies on traversing
 * public $parent chains, skip functional ones and go to the parent instead.
 */
const getPublicInstance = (i) => {
  if (!i) return null;
  if (isStatefulComponent(i)) return getExposeProxy(i) || i.proxy;
  return getPublicInstance(i.parent);
};
const publicPropertiesMap =
  // Move PURE marker to new line to workaround compiler discarding it
  // due to type annotation
  /*#__PURE__*/ shared$2.extend(Object.create(null), {
    $: (i) => i,
    $el: (i) => i.vnode.el,
    $data: (i) => i.data,
    $props: (i) =>
      process.env.NODE_ENV !== "production"
        ? shallowReadonly(i.props)
        : i.props,
    $attrs: (i) =>
      process.env.NODE_ENV !== "production"
        ? shallowReadonly(i.attrs)
        : i.attrs,
    $slots: (i) =>
      process.env.NODE_ENV !== "production"
        ? shallowReadonly(i.slots)
        : i.slots,
    $refs: (i) =>
      process.env.NODE_ENV !== "production" ? shallowReadonly(i.refs) : i.refs,
    $parent: (i) => getPublicInstance(i.parent),
    $root: (i) => getPublicInstance(i.root),
    $emit: (i) => i.emit,
    $options: (i) => (__VUE_OPTIONS_API__ ? resolveMergedOptions(i) : i.type),
    $forceUpdate: (i) => i.f || (i.f = () => queueJob(i.update)),
    $nextTick: (i) => i.n || (i.n = nextTick.bind(i.proxy)),
    $watch: (i) =>
      __VUE_OPTIONS_API__ ? instanceWatch$1.bind(i) : shared$2.NOOP,
  });
const isReservedPrefix = (key) => key === "_" || key === "$";
const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { ctx, setupState, data, props, accessCache, type, appContext } =
      instance;
    // for internal formatters to know that this is a Vue instance
    if (process.env.NODE_ENV !== "production" && key === "__isVue") {
      return true;
    }
    // prioritize <script setup> bindings during dev.
    // this allows even properties that start with _ or $ to be used - so that
    // it aligns with the production behavior where the render fn is inlined and
    // indeed has access to all declared variables.
    if (
      process.env.NODE_ENV !== "production" &&
      setupState !== shared$2.EMPTY_OBJ &&
      setupState.__isScriptSetup &&
      shared$2.hasOwn(setupState, key)
    ) {
      return setupState[key];
    }
    // data / props / ctx
    // This getter gets called for every property access on the render context
    // during render and is a major hotspot. The most expensive part of this
    // is the multiple hasOwn() calls. It's much faster to do a simple property
    // access on a plain object, so we use an accessCache object (with null
    // prototype) to memoize what access type a key corresponds to.
    let normalizedProps;
    if (key[0] !== "$") {
      const n = accessCache[key];
      if (n !== undefined) {
        switch (n) {
          case 1 /* AccessTypes.SETUP */:
            return setupState[key];
          case 2 /* AccessTypes.DATA */:
            return data[key];
          case 4 /* AccessTypes.CONTEXT */:
            return ctx[key];
          case 3 /* AccessTypes.PROPS */:
            return props[key];
          // default: just fallthrough
        }
      } else if (
        setupState !== shared$2.EMPTY_OBJ &&
        shared$2.hasOwn(setupState, key)
      ) {
        accessCache[key] = 1 /* AccessTypes.SETUP */;
        return setupState[key];
      } else if (data !== shared$2.EMPTY_OBJ && shared$2.hasOwn(data, key)) {
        accessCache[key] = 2 /* AccessTypes.DATA */;
        return data[key];
      } else if (
        // only cache other properties when instance has declared (thus stable)
        // props
        (normalizedProps = instance.propsOptions[0]) &&
        shared$2.hasOwn(normalizedProps, key)
      ) {
        accessCache[key] = 3 /* AccessTypes.PROPS */;
        return props[key];
      } else if (ctx !== shared$2.EMPTY_OBJ && shared$2.hasOwn(ctx, key)) {
        accessCache[key] = 4 /* AccessTypes.CONTEXT */;
        return ctx[key];
      } else if (!__VUE_OPTIONS_API__ || shouldCacheAccess) {
        accessCache[key] = 0 /* AccessTypes.OTHER */;
      }
    }
    const publicGetter = publicPropertiesMap[key];
    let cssModule, globalProperties;
    // public $xxx properties
    if (publicGetter) {
      if (key === "$attrs") {
        track(instance, "get" /* TrackOpTypes.GET */, key);
        process.env.NODE_ENV !== "production" && markAttrsAccessed();
      }
      return publicGetter(instance);
    } else if (
      // css module (injected by vue-loader)
      (cssModule = type.__cssModules) &&
      (cssModule = cssModule[key])
    ) {
      return cssModule;
    } else if (ctx !== shared$2.EMPTY_OBJ && shared$2.hasOwn(ctx, key)) {
      // user may set custom properties to `this` that start with `$`
      accessCache[key] = 4 /* AccessTypes.CONTEXT */;
      return ctx[key];
    } else if (
      // global properties
      ((globalProperties = appContext.config.globalProperties),
      shared$2.hasOwn(globalProperties, key))
    ) {
      {
        return globalProperties[key];
      }
    } else if (
      process.env.NODE_ENV !== "production" &&
      currentRenderingInstance$1 &&
      (!shared$2.isString(key) ||
        // #1091 avoid internal isRef/isVNode checks on component instance leading
        // to infinite warning loop
        key.indexOf("__v") !== 0)
    ) {
      if (
        data !== shared$2.EMPTY_OBJ &&
        isReservedPrefix(key[0]) &&
        shared$2.hasOwn(data, key)
      ) {
        warn(
          `Property ${JSON.stringify(
            key
          )} must be accessed via $data because it starts with a reserved ` +
            `character ("$" or "_") and is not proxied on the render context.`
        );
      } else if (instance === currentRenderingInstance$1) {
        warn(
          `Property ${JSON.stringify(key)} was accessed during render ` +
            `but is not defined on instance.`
        );
      }
    }
  },
  set({ _: instance }, key, value) {
    const { data, setupState, ctx } = instance;
    if (setupState !== shared$2.EMPTY_OBJ && shared$2.hasOwn(setupState, key)) {
      setupState[key] = value;
      return true;
    } else if (data !== shared$2.EMPTY_OBJ && shared$2.hasOwn(data, key)) {
      data[key] = value;
      return true;
    } else if (shared$2.hasOwn(instance.props, key)) {
      process.env.NODE_ENV !== "production" &&
        warn(
          `Attempting to mutate prop "${key}". Props are readonly.`,
          instance
        );
      return false;
    }
    if (key[0] === "$" && key.slice(1) in instance) {
      process.env.NODE_ENV !== "production" &&
        warn(
          `Attempting to mutate public property "${key}". ` +
            `Properties starting with $ are reserved and readonly.`,
          instance
        );
      return false;
    } else {
      if (
        process.env.NODE_ENV !== "production" &&
        key in instance.appContext.config.globalProperties
      ) {
        Object.defineProperty(ctx, key, {
          enumerable: true,
          configurable: true,
          value,
        });
      } else {
        ctx[key] = value;
      }
    }
    return true;
  },
  has(
    { _: { data, setupState, accessCache, ctx, appContext, propsOptions } },
    key
  ) {
    let normalizedProps;
    return (
      !!accessCache[key] ||
      (data !== shared$2.EMPTY_OBJ && shared$2.hasOwn(data, key)) ||
      (setupState !== shared$2.EMPTY_OBJ && shared$2.hasOwn(setupState, key)) ||
      ((normalizedProps = propsOptions[0]) &&
        shared$2.hasOwn(normalizedProps, key)) ||
      shared$2.hasOwn(ctx, key) ||
      shared$2.hasOwn(publicPropertiesMap, key) ||
      shared$2.hasOwn(appContext.config.globalProperties, key)
    );
  },
  defineProperty(target, key, descriptor) {
    if (descriptor.get != null) {
      // invalidate key cache of a getter based property #5417
      target._.accessCache[key] = 0;
    } else if (shared$2.hasOwn(descriptor, "value")) {
      this.set(target, key, descriptor.value, null);
    }
    return Reflect.defineProperty(target, key, descriptor);
  },
};
if (process.env.NODE_ENV !== "production" && !false) {
  PublicInstanceProxyHandlers.ownKeys = (target) => {
    warn(
      `Avoid app logic that relies on enumerating keys on a component instance. ` +
        `The keys will be empty in production mode to avoid performance overhead.`
    );
    return Reflect.ownKeys(target);
  };
}
// dev only
// In dev mode, the proxy target exposes the same properties as seen on `this`
// for easier console inspection. In prod mode it will be an empty object so
// these properties definitions can be skipped.
function createDevRenderContext(instance) {
  const target = {};
  // expose internal instance for proxy handlers
  Object.defineProperty(target, `_`, {
    configurable: true,
    enumerable: false,
    get: () => instance,
  });
  // expose public properties
  Object.keys(publicPropertiesMap).forEach((key) => {
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: false,
      get: () => publicPropertiesMap[key](instance),
      // intercepted by the proxy so no need for implementation,
      // but needed to prevent set errors
      set: shared$2.NOOP,
    });
  });
  return target;
}
// dev only
function exposePropsOnRenderContext(instance) {
  const {
    ctx,
    propsOptions: [propsOptions],
  } = instance;
  if (propsOptions) {
    Object.keys(propsOptions).forEach((key) => {
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => instance.props[key],
        set: shared$2.NOOP,
      });
    });
  }
}
// dev only
function exposeSetupStateOnRenderContext(instance) {
  const { ctx, setupState } = instance;
  Object.keys(toRaw(setupState)).forEach((key) => {
    if (!setupState.__isScriptSetup) {
      if (isReservedPrefix(key[0])) {
        warn(
          `setup() return property ${JSON.stringify(
            key
          )} should not start with "$" or "_" ` +
            `which are reserved prefixes for Vue internals.`
        );
        return;
      }
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => setupState[key],
        set: shared$2.NOOP,
      });
    }
  });
}

function createDuplicateChecker() {
  const cache = Object.create(null);
  return (type, key) => {
    if (cache[key]) {
      warn(`${type} property "${key}" is already defined in ${cache[key]}.`);
    } else {
      cache[key] = type;
    }
  };
}
let shouldCacheAccess = true;
function applyOptions(instance) {
  const options = resolveMergedOptions(instance);
  const publicThis = instance.proxy;
  const ctx = instance.ctx;
  // do not cache property access on public proxy during state initialization
  shouldCacheAccess = false;
  // call beforeCreate first before accessing other options since
  // the hook may mutate resolved options (#2791)
  if (options.beforeCreate) {
    callHook(
      options.beforeCreate,
      instance,
      "bc" /* LifecycleHooks.BEFORE_CREATE */
    );
  }
  const {
    // state
    data: dataOptions,
    computed: computedOptions,
    methods,
    watch: watchOptions,
    provide: provideOptions,
    inject: injectOptions,
    // lifecycle
    created,
    beforeMount,
    mounted,
    beforeUpdate,
    updated,
    activated,
    deactivated,
    beforeDestroy,
    beforeUnmount,
    destroyed,
    unmounted,
    render,
    renderTracked,
    renderTriggered,
    errorCaptured,
    serverPrefetch,
    // public API
    expose,
    inheritAttrs,
    // assets
    components,
    directives,
    filters,
  } = options;
  const checkDuplicateProperties =
    process.env.NODE_ENV !== "production" ? createDuplicateChecker() : null;
  if (process.env.NODE_ENV !== "production") {
    const [propsOptions] = instance.propsOptions;
    if (propsOptions) {
      for (const key in propsOptions) {
        checkDuplicateProperties("Props" /* OptionTypes.PROPS */, key);
      }
    }
  }
  // options initialization order (to be consistent with Vue 2):
  // - props (already done outside of this function)
  // - inject
  // - methods
  // - data (deferred since it relies on `this` access)
  // - computed
  // - watch (deferred since it relies on `this` access)
  if (injectOptions) {
    resolveInjections(
      injectOptions,
      ctx,
      checkDuplicateProperties,
      instance.appContext.config.unwrapInjectedRef
    );
  }
  if (methods) {
    for (const key in methods) {
      const methodHandler = methods[key];
      if (shared$2.isFunction(methodHandler)) {
        // In dev mode, we use the `createRenderContext` function to define
        // methods to the proxy target, and those are read-only but
        // reconfigurable, so it needs to be redefined here
        if (process.env.NODE_ENV !== "production") {
          Object.defineProperty(ctx, key, {
            value: methodHandler.bind(publicThis),
            configurable: true,
            enumerable: true,
            writable: true,
          });
        } else {
          ctx[key] = methodHandler.bind(publicThis);
        }
        if (process.env.NODE_ENV !== "production") {
          checkDuplicateProperties("Methods" /* OptionTypes.METHODS */, key);
        }
      } else if (process.env.NODE_ENV !== "production") {
        warn(
          `Method "${key}" has type "${typeof methodHandler}" in the component definition. ` +
            `Did you reference the function correctly?`
        );
      }
    }
  }
  if (dataOptions) {
    if (
      process.env.NODE_ENV !== "production" &&
      !shared$2.isFunction(dataOptions)
    ) {
      warn(
        `The data option must be a function. ` +
          `Plain object usage is no longer supported.`
      );
    }
    const data = dataOptions.call(publicThis, publicThis);
    if (process.env.NODE_ENV !== "production" && shared$2.isPromise(data)) {
      warn(
        `data() returned a Promise - note data() cannot be async; If you ` +
          `intend to perform data fetching before component renders, use ` +
          `async setup() + <Suspense>.`
      );
    }
    if (!shared$2.isObject(data)) {
      process.env.NODE_ENV !== "production" &&
        warn(`data() should return an object.`);
    } else {
      instance.data = reactive(data);
      if (process.env.NODE_ENV !== "production") {
        for (const key in data) {
          checkDuplicateProperties("Data" /* OptionTypes.DATA */, key);
          // expose data on ctx during dev
          if (!isReservedPrefix(key[0])) {
            Object.defineProperty(ctx, key, {
              configurable: true,
              enumerable: true,
              get: () => data[key],
              set: shared$2.NOOP,
            });
          }
        }
      }
    }
  }
  // state initialization complete at this point - start caching access
  shouldCacheAccess = true;
  if (computedOptions) {
    for (const key in computedOptions) {
      const opt = computedOptions[key];
      const get = shared$2.isFunction(opt)
        ? opt.bind(publicThis, publicThis)
        : shared$2.isFunction(opt.get)
        ? opt.get.bind(publicThis, publicThis)
        : shared$2.NOOP;
      if (process.env.NODE_ENV !== "production" && get === shared$2.NOOP) {
        warn(`Computed property "${key}" has no getter.`);
      }
      const set =
        !shared$2.isFunction(opt) && shared$2.isFunction(opt.set)
          ? opt.set.bind(publicThis)
          : process.env.NODE_ENV !== "production"
          ? () => {
              warn(
                `Write operation failed: computed property "${key}" is readonly.`
              );
            }
          : shared$2.NOOP;
      const c = computed({
        get,
        set,
      });
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => c.value,
        set: (v) => (c.value = v),
      });
      if (process.env.NODE_ENV !== "production") {
        checkDuplicateProperties("Computed" /* OptionTypes.COMPUTED */, key);
      }
    }
  }
  if (watchOptions) {
    for (const key in watchOptions) {
      createWatcher(watchOptions[key], ctx, publicThis, key);
    }
  }
  if (provideOptions) {
    const provides = shared$2.isFunction(provideOptions)
      ? provideOptions.call(publicThis)
      : provideOptions;
    Reflect.ownKeys(provides).forEach((key) => {
      provide$1(key, provides[key]);
    });
  }
  if (created) {
    callHook(created, instance, "c" /* LifecycleHooks.CREATED */);
  }
  function registerLifecycleHook(register, hook) {
    if (shared$2.isArray(hook)) {
      hook.forEach((_hook) => register(_hook.bind(publicThis)));
    } else if (hook) {
      register(hook.bind(publicThis));
    }
  }
  registerLifecycleHook(onBeforeMount$1, beforeMount);
  registerLifecycleHook(onMounted$1, mounted);
  registerLifecycleHook(onBeforeUpdate$1, beforeUpdate);
  registerLifecycleHook(onUpdated$1, updated);
  registerLifecycleHook(onActivated$1, activated);
  registerLifecycleHook(onDeactivated$1, deactivated);
  registerLifecycleHook(onErrorCaptured$1, errorCaptured);
  registerLifecycleHook(onRenderTracked$1, renderTracked);
  registerLifecycleHook(onRenderTriggered$1, renderTriggered);
  registerLifecycleHook(onBeforeUnmount$1, beforeUnmount);
  registerLifecycleHook(onUnmounted$1, unmounted);
  registerLifecycleHook(onServerPrefetch$1, serverPrefetch);
  if (shared$2.isArray(expose)) {
    if (expose.length) {
      const exposed = instance.exposed || (instance.exposed = {});
      expose.forEach((key) => {
        Object.defineProperty(exposed, key, {
          get: () => publicThis[key],
          set: (val) => (publicThis[key] = val),
        });
      });
    } else if (!instance.exposed) {
      instance.exposed = {};
    }
  }
  // options that are handled when creating the instance but also need to be
  // applied from mixins
  if (render && instance.render === shared$2.NOOP) {
    instance.render = render;
  }
  if (inheritAttrs != null) {
    instance.inheritAttrs = inheritAttrs;
  }
  // asset options.
  if (components) instance.components = components;
  if (directives) instance.directives = directives;
}
function resolveInjections(
  injectOptions,
  ctx,
  checkDuplicateProperties = shared$2.NOOP,
  unwrapRef = false
) {
  if (shared$2.isArray(injectOptions)) {
    injectOptions = normalizeInject$1(injectOptions);
  }
  for (const key in injectOptions) {
    const opt = injectOptions[key];
    let injected;
    if (shared$2.isObject(opt)) {
      if ("default" in opt) {
        injected = inject$1(
          opt.from || key,
          opt.default,
          true /* treat default function as factory */
        );
      } else {
        injected = inject$1(opt.from || key);
      }
    } else {
      injected = inject$1(opt);
    }
    if (isRef(injected)) {
      // TODO remove the check in 3.3
      if (unwrapRef) {
        Object.defineProperty(ctx, key, {
          enumerable: true,
          configurable: true,
          get: () => injected.value,
          set: (v) => (injected.value = v),
        });
      } else {
        if (process.env.NODE_ENV !== "production") {
          warn(
            `injected property "${key}" is a ref and will be auto-unwrapped ` +
              `and no longer needs \`.value\` in the next minor release. ` +
              `To opt-in to the new behavior now, ` +
              `set \`app.config.unwrapInjectedRef = true\` (this config is ` +
              `temporary and will not be needed in the future.)`
          );
        }
        ctx[key] = injected;
      }
    } else {
      ctx[key] = injected;
    }
    if (process.env.NODE_ENV !== "production") {
      checkDuplicateProperties("Inject" /* OptionTypes.INJECT */, key);
    }
  }
}
function callHook(hook, instance, type) {
  callWithAsyncErrorHandling(
    shared$2.isArray(hook)
      ? hook.map((h) => h.bind(instance.proxy))
      : hook.bind(instance.proxy),
    instance,
    type
  );
}
function createWatcher(raw, ctx, publicThis, key) {
  const getter = key.includes(".")
    ? createPathGetter$1(publicThis, key)
    : () => publicThis[key];
  if (shared$2.isString(raw)) {
    const handler = ctx[raw];
    if (shared$2.isFunction(handler)) {
      watch(getter, handler);
    } else if (process.env.NODE_ENV !== "production") {
      warn(`Invalid watch handler specified by key "${raw}"`, handler);
    }
  } else if (shared$2.isFunction(raw)) {
    watch(getter, raw.bind(publicThis));
  } else if (shared$2.isObject(raw)) {
    if (shared$2.isArray(raw)) {
      raw.forEach((r) => createWatcher(r, ctx, publicThis, key));
    } else {
      const handler = shared$2.isFunction(raw.handler)
        ? raw.handler.bind(publicThis)
        : ctx[raw.handler];
      if (shared$2.isFunction(handler)) {
        watch(getter, handler, raw);
      } else if (process.env.NODE_ENV !== "production") {
        warn(
          `Invalid watch handler specified by key "${raw.handler}"`,
          handler
        );
      }
    }
  } else if (process.env.NODE_ENV !== "production") {
    warn(`Invalid watch option: "${key}"`, raw);
  }
}
/**
 * Resolve merged options and cache it on the component.
 * This is done only once per-component since the merging does not involve
 * instances.
 */
function resolveMergedOptions(instance) {
  const base = instance.type;
  const { mixins, extends: extendsOptions } = base;
  const {
    mixins: globalMixins,
    optionsCache: cache,
    config: { optionMergeStrategies },
  } = instance.appContext;
  const cached = cache.get(base);
  let resolved;
  if (cached) {
    resolved = cached;
  } else if (!globalMixins.length && !mixins && !extendsOptions) {
    {
      resolved = base;
    }
  } else {
    resolved = {};
    if (globalMixins.length) {
      globalMixins.forEach((m) =>
        mergeOptions$1(resolved, m, optionMergeStrategies, true)
      );
    }
    mergeOptions$1(resolved, base, optionMergeStrategies);
  }
  if (shared$2.isObject(base)) {
    cache.set(base, resolved);
  }
  return resolved;
}
function mergeOptions$1(to, from, strats, asMixin = false) {
  const { mixins, extends: extendsOptions } = from;
  if (extendsOptions) {
    mergeOptions$1(to, extendsOptions, strats, true);
  }
  if (mixins) {
    mixins.forEach((m) => mergeOptions$1(to, m, strats, true));
  }
  for (const key in from) {
    if (asMixin && key === "expose") {
      process.env.NODE_ENV !== "production" &&
        warn(
          `"expose" option is ignored when declared in mixins or extends. ` +
            `It should only be declared in the base component itself.`
        );
    } else {
      const strat = internalOptionMergeStrats$1[key] || (strats && strats[key]);
      to[key] = strat ? strat(to[key], from[key]) : from[key];
    }
  }
  return to;
}
const internalOptionMergeStrats$1 = {
  data: mergeDataFn$1,
  props: mergeObjectOptions$1,
  emits: mergeObjectOptions$1,
  // objects
  methods: mergeObjectOptions$1,
  computed: mergeObjectOptions$1,
  // lifecycle
  beforeCreate: mergeAsArray$1,
  created: mergeAsArray$1,
  beforeMount: mergeAsArray$1,
  mounted: mergeAsArray$1,
  beforeUpdate: mergeAsArray$1,
  updated: mergeAsArray$1,
  beforeDestroy: mergeAsArray$1,
  beforeUnmount: mergeAsArray$1,
  destroyed: mergeAsArray$1,
  unmounted: mergeAsArray$1,
  activated: mergeAsArray$1,
  deactivated: mergeAsArray$1,
  errorCaptured: mergeAsArray$1,
  serverPrefetch: mergeAsArray$1,
  // assets
  components: mergeObjectOptions$1,
  directives: mergeObjectOptions$1,
  // watch
  watch: mergeWatchOptions$1,
  // provide / inject
  provide: mergeDataFn$1,
  inject: mergeInject$1,
};
function mergeDataFn$1(to, from) {
  if (!from) {
    return to;
  }
  if (!to) {
    return from;
  }
  return function mergedDataFn() {
    return shared$2.extend(
      shared$2.isFunction(to) ? to.call(this, this) : to,
      shared$2.isFunction(from) ? from.call(this, this) : from
    );
  };
}
function mergeInject$1(to, from) {
  return mergeObjectOptions$1(normalizeInject$1(to), normalizeInject$1(from));
}
function normalizeInject$1(raw) {
  if (shared$2.isArray(raw)) {
    const res = {};
    for (let i = 0; i < raw.length; i++) {
      res[raw[i]] = raw[i];
    }
    return res;
  }
  return raw;
}
function mergeAsArray$1(to, from) {
  return to ? [...new Set([].concat(to, from))] : from;
}
function mergeObjectOptions$1(to, from) {
  return to
    ? shared$2.extend(shared$2.extend(Object.create(null), to), from)
    : from;
}
function mergeWatchOptions$1(to, from) {
  if (!to) return from;
  if (!from) return to;
  const merged = shared$2.extend(Object.create(null), to);
  for (const key in from) {
    merged[key] = mergeAsArray$1(to[key], from[key]);
  }
  return merged;
}

function initProps(
  instance,
  rawProps,
  isStateful, // result of bitwise flag comparison
  isSSR = false
) {
  const props = {};
  const attrs = {};
  shared$2.def(attrs, InternalObjectKey, 1);
  instance.propsDefaults = Object.create(null);
  setFullProps(instance, rawProps, props, attrs);
  // ensure all declared prop keys are present
  for (const key in instance.propsOptions[0]) {
    if (!(key in props)) {
      props[key] = undefined;
    }
  }
  // validation
  if (process.env.NODE_ENV !== "production") {
    validateProps(rawProps || {}, props, instance);
  }
  if (isStateful) {
    // stateful
    instance.props = isSSR ? props : shallowReactive(props);
  } else {
    if (!instance.type.props) {
      // functional w/ optional props, props === attrs
      instance.props = attrs;
    } else {
      // functional w/ declared props
      instance.props = props;
    }
  }
  instance.attrs = attrs;
}
function isInHmrContext(instance) {
  while (instance) {
    if (instance.type.__hmrId) return true;
    instance = instance.parent;
  }
}
function updateProps(instance, rawProps, rawPrevProps, optimized) {
  const {
    props,
    attrs,
    vnode: { patchFlag },
  } = instance;
  const rawCurrentProps = toRaw(props);
  const [options] = instance.propsOptions;
  let hasAttrsChanged = false;
  if (
    // always force full diff in dev
    // - #1942 if hmr is enabled with sfc component
    // - vite#872 non-sfc component used by sfc component
    !(process.env.NODE_ENV !== "production" && isInHmrContext(instance)) &&
    (optimized || patchFlag > 0) &&
    !((patchFlag & 16) /* PatchFlags.FULL_PROPS */)
  ) {
    if (patchFlag & 8 /* PatchFlags.PROPS */) {
      // Compiler-generated props & no keys change, just set the updated
      // the props.
      const propsToUpdate = instance.vnode.dynamicProps;
      for (let i = 0; i < propsToUpdate.length; i++) {
        let key = propsToUpdate[i];
        // skip if the prop key is a declared emit event listener
        if (isEmitListener(instance.emitsOptions, key)) {
          continue;
        }
        // PROPS flag guarantees rawProps to be non-null
        const value = rawProps[key];
        if (options) {
          // attr / props separation was done on init and will be consistent
          // in this code path, so just check if attrs have it.
          if (shared$2.hasOwn(attrs, key)) {
            if (value !== attrs[key]) {
              attrs[key] = value;
              hasAttrsChanged = true;
            }
          } else {
            const camelizedKey = shared$2.camelize(key);
            props[camelizedKey] = resolvePropValue(
              options,
              rawCurrentProps,
              camelizedKey,
              value,
              instance,
              false /* isAbsent */
            );
          }
        } else {
          if (value !== attrs[key]) {
            attrs[key] = value;
            hasAttrsChanged = true;
          }
        }
      }
    }
  } else {
    // full props update.
    if (setFullProps(instance, rawProps, props, attrs)) {
      hasAttrsChanged = true;
    }
    // in case of dynamic props, check if we need to delete keys from
    // the props object
    let kebabKey;
    for (const key in rawCurrentProps) {
      if (
        !rawProps ||
        // for camelCase
        (!shared$2.hasOwn(rawProps, key) &&
          // it's possible the original props was passed in as kebab-case
          // and converted to camelCase (#955)
          ((kebabKey = shared$2.hyphenate(key)) === key ||
            !shared$2.hasOwn(rawProps, kebabKey)))
      ) {
        if (options) {
          if (
            rawPrevProps &&
            // for camelCase
            (rawPrevProps[key] !== undefined ||
              // for kebab-case
              rawPrevProps[kebabKey] !== undefined)
          ) {
            props[key] = resolvePropValue(
              options,
              rawCurrentProps,
              key,
              undefined,
              instance,
              true /* isAbsent */
            );
          }
        } else {
          delete props[key];
        }
      }
    }
    // in the case of functional component w/o props declaration, props and
    // attrs point to the same object so it should already have been updated.
    if (attrs !== rawCurrentProps) {
      for (const key in attrs) {
        if (!rawProps || (!shared$2.hasOwn(rawProps, key) && !false)) {
          delete attrs[key];
          hasAttrsChanged = true;
        }
      }
    }
  }
  // trigger updates for $attrs in case it's used in component slots
  if (hasAttrsChanged) {
    trigger(instance, "set" /* TriggerOpTypes.SET */, "$attrs");
  }
  if (process.env.NODE_ENV !== "production") {
    validateProps(rawProps || {}, props, instance);
  }
}
function setFullProps(instance, rawProps, props, attrs) {
  const [options, needCastKeys] = instance.propsOptions;
  let hasAttrsChanged = false;
  let rawCastValues;
  if (rawProps) {
    for (let key in rawProps) {
      // key, ref are reserved and never passed down
      if (shared$2.isReservedProp(key)) {
        continue;
      }
      const value = rawProps[key];
      // prop option names are camelized during normalization, so to support
      // kebab -> camel conversion here we need to camelize the key.
      let camelKey;
      if (
        options &&
        shared$2.hasOwn(options, (camelKey = shared$2.camelize(key)))
      ) {
        if (!needCastKeys || !needCastKeys.includes(camelKey)) {
          props[camelKey] = value;
        } else {
          (rawCastValues || (rawCastValues = {}))[camelKey] = value;
        }
      } else if (!isEmitListener(instance.emitsOptions, key)) {
        if (!(key in attrs) || value !== attrs[key]) {
          attrs[key] = value;
          hasAttrsChanged = true;
        }
      }
    }
  }
  if (needCastKeys) {
    const rawCurrentProps = toRaw(props);
    const castValues = rawCastValues || shared$2.EMPTY_OBJ;
    for (let i = 0; i < needCastKeys.length; i++) {
      const key = needCastKeys[i];
      props[key] = resolvePropValue(
        options,
        rawCurrentProps,
        key,
        castValues[key],
        instance,
        !shared$2.hasOwn(castValues, key)
      );
    }
  }
  return hasAttrsChanged;
}
function resolvePropValue(options, props, key, value, instance, isAbsent) {
  const opt = options[key];
  if (opt != null) {
    const hasDefault = shared$2.hasOwn(opt, "default");
    // default values
    if (hasDefault && value === undefined) {
      const defaultValue = opt.default;
      if (opt.type !== Function && shared$2.isFunction(defaultValue)) {
        const { propsDefaults } = instance;
        if (key in propsDefaults) {
          value = propsDefaults[key];
        } else {
          setCurrentInstance$2(instance);
          value = propsDefaults[key] = defaultValue.call(null, props);
          unsetCurrentInstance();
        }
      } else {
        value = defaultValue;
      }
    }
    // boolean casting
    if (opt[0 /* BooleanFlags.shouldCast */]) {
      if (isAbsent && !hasDefault) {
        value = false;
      } else if (
        opt[1 /* BooleanFlags.shouldCastTrue */] &&
        (value === "" || value === shared$2.hyphenate(key))
      ) {
        value = true;
      }
    }
  }
  return value;
}
function normalizePropsOptions(comp, appContext, asMixin = false) {
  const cache = appContext.propsCache;
  const cached = cache.get(comp);
  if (cached) {
    return cached;
  }
  const raw = comp.props;
  const normalized = {};
  const needCastKeys = [];
  // apply mixin/extends props
  let hasExtends = false;
  if (__VUE_OPTIONS_API__ && !shared$2.isFunction(comp)) {
    const extendProps = (raw) => {
      hasExtends = true;
      const [props, keys] = normalizePropsOptions(raw, appContext, true);
      shared$2.extend(normalized, props);
      if (keys) needCastKeys.push(...keys);
    };
    if (!asMixin && appContext.mixins.length) {
      appContext.mixins.forEach(extendProps);
    }
    if (comp.extends) {
      extendProps(comp.extends);
    }
    if (comp.mixins) {
      comp.mixins.forEach(extendProps);
    }
  }
  if (!raw && !hasExtends) {
    if (shared$2.isObject(comp)) {
      cache.set(comp, shared$2.EMPTY_ARR);
    }
    return shared$2.EMPTY_ARR;
  }
  if (shared$2.isArray(raw)) {
    for (let i = 0; i < raw.length; i++) {
      if (process.env.NODE_ENV !== "production" && !shared$2.isString(raw[i])) {
        warn(`props must be strings when using array syntax.`, raw[i]);
      }
      const normalizedKey = shared$2.camelize(raw[i]);
      if (validatePropName(normalizedKey)) {
        normalized[normalizedKey] = shared$2.EMPTY_OBJ;
      }
    }
  } else if (raw) {
    if (process.env.NODE_ENV !== "production" && !shared$2.isObject(raw)) {
      warn(`invalid props options`, raw);
    }
    for (const key in raw) {
      const normalizedKey = shared$2.camelize(key);
      if (validatePropName(normalizedKey)) {
        const opt = raw[key];
        const prop = (normalized[normalizedKey] =
          shared$2.isArray(opt) || shared$2.isFunction(opt)
            ? { type: opt }
            : opt);
        if (prop) {
          const booleanIndex = getTypeIndex(Boolean, prop.type);
          const stringIndex = getTypeIndex(String, prop.type);
          prop[0 /* BooleanFlags.shouldCast */] = booleanIndex > -1;
          prop[1 /* BooleanFlags.shouldCastTrue */] =
            stringIndex < 0 || booleanIndex < stringIndex;
          // if the prop needs boolean casting or default value
          if (booleanIndex > -1 || shared$2.hasOwn(prop, "default")) {
            needCastKeys.push(normalizedKey);
          }
        }
      }
    }
  }
  const res = [normalized, needCastKeys];
  if (shared$2.isObject(comp)) {
    cache.set(comp, res);
  }
  return res;
}
function validatePropName(key) {
  if (key[0] !== "$") {
    return true;
  } else if (process.env.NODE_ENV !== "production") {
    warn(`Invalid prop name: "${key}" is a reserved property.`);
  }
  return false;
}
// use function string name to check type constructors
// so that it works across vms / iframes.
function getType$1(ctor) {
  const match = ctor && ctor.toString().match(/^\s*function (\w+)/);
  return match ? match[1] : ctor === null ? "null" : "";
}
function isSameType(a, b) {
  return getType$1(a) === getType$1(b);
}
function getTypeIndex(type, expectedTypes) {
  if (shared$2.isArray(expectedTypes)) {
    return expectedTypes.findIndex((t) => isSameType(t, type));
  } else if (shared$2.isFunction(expectedTypes)) {
    return isSameType(expectedTypes, type) ? 0 : -1;
  }
  return -1;
}
/**
 * dev only
 */
function validateProps(rawProps, props, instance) {
  const resolvedValues = toRaw(props);
  const options = instance.propsOptions[0];
  for (const key in options) {
    let opt = options[key];
    if (opt == null) continue;
    validateProp(
      key,
      resolvedValues[key],
      opt,
      !shared$2.hasOwn(rawProps, key) &&
        !shared$2.hasOwn(rawProps, shared$2.hyphenate(key))
    );
  }
}
/**
 * dev only
 */
function validateProp(name, value, prop, isAbsent) {
  const { type, required, validator } = prop;
  // required!
  if (required && isAbsent) {
    warn('Missing required prop: "' + name + '"');
    return;
  }
  // missing but optional
  if (value == null && !prop.required) {
    return;
  }
  // type check
  if (type != null && type !== true) {
    let isValid = false;
    const types = shared$2.isArray(type) ? type : [type];
    const expectedTypes = [];
    // value is valid as long as one of the specified types match
    for (let i = 0; i < types.length && !isValid; i++) {
      const { valid, expectedType } = assertType$1(value, types[i]);
      expectedTypes.push(expectedType || "");
      isValid = valid;
    }
    if (!isValid) {
      warn(getInvalidTypeMessage(name, value, expectedTypes));
      return;
    }
  }
  // custom validator
  if (validator && !validator(value)) {
    warn(
      'Invalid prop: custom validator check failed for prop "' + name + '".'
    );
  }
}
const isSimpleType$1 = /*#__PURE__*/ shared$2.makeMap(
  "String,Number,Boolean,Function,Symbol,BigInt"
);
/**
 * dev only
 */
function assertType$1(value, type) {
  let valid;
  const expectedType = getType$1(type);
  if (isSimpleType$1(expectedType)) {
    const t = typeof value;
    valid = t === expectedType.toLowerCase();
    // for primitive wrapper objects
    if (!valid && t === "object") {
      valid = value instanceof type;
    }
  } else if (expectedType === "Object") {
    valid = shared$2.isObject(value);
  } else if (expectedType === "Array") {
    valid = shared$2.isArray(value);
  } else if (expectedType === "null") {
    valid = value === null;
  } else {
    valid = value instanceof type;
  }
  return {
    valid,
    expectedType,
  };
}
/**
 * dev only
 */
function getInvalidTypeMessage(name, value, expectedTypes) {
  let message =
    `Invalid prop: type check failed for prop "${name}".` +
    ` Expected ${expectedTypes.map(shared$2.capitalize).join(" | ")}`;
  const expectedType = expectedTypes[0];
  const receivedType = shared$2.toRawType(value);
  const expectedValue = styleValue(value, expectedType);
  const receivedValue = styleValue(value, receivedType);
  // check if we need to specify expected value
  if (
    expectedTypes.length === 1 &&
    isExplicable(expectedType) &&
    !isBoolean(expectedType, receivedType)
  ) {
    message += ` with value ${expectedValue}`;
  }
  message += `, got ${receivedType} `;
  // check if we need to specify received value
  if (isExplicable(receivedType)) {
    message += `with value ${receivedValue}.`;
  }
  return message;
}
/**
 * dev only
 */
function styleValue(value, type) {
  if (type === "String") {
    return `"${value}"`;
  } else if (type === "Number") {
    return `${Number(value)}`;
  } else {
    return `${value}`;
  }
}
/**
 * dev only
 */
function isExplicable(type) {
  const explicitTypes = ["string", "number", "boolean"];
  return explicitTypes.some((elem) => type.toLowerCase() === elem);
}
/**
 * dev only
 */
function isBoolean(...args) {
  return args.some((elem) => elem.toLowerCase() === "boolean");
}

const isInternalKey = (key) => key[0] === "_" || key === "$stable";
const normalizeSlotValue = (value) =>
  shared$2.isArray(value) ? value.map(normalizeVNode) : [normalizeVNode(value)];
const normalizeSlot = (key, rawSlot, ctx) => {
  if (rawSlot._n) {
    // already normalized - #5353
    return rawSlot;
  }
  const normalized = withCtx$1((...args) => {
    if (process.env.NODE_ENV !== "production" && currentInstance) {
      warn(
        `Slot "${key}" invoked outside of the render function: ` +
          `this will not track dependencies used in the slot. ` +
          `Invoke the slot function inside the render function instead.`
      );
    }
    return normalizeSlotValue(rawSlot(...args));
  }, ctx);
  normalized._c = false;
  return normalized;
};
const normalizeObjectSlots = (rawSlots, slots, instance) => {
  const ctx = rawSlots._ctx;
  for (const key in rawSlots) {
    if (isInternalKey(key)) continue;
    const value = rawSlots[key];
    if (shared$2.isFunction(value)) {
      slots[key] = normalizeSlot(key, value, ctx);
    } else if (value != null) {
      if (process.env.NODE_ENV !== "production" && !false) {
        warn(
          `Non-function value encountered for slot "${key}". ` +
            `Prefer function slots for better performance.`
        );
      }
      const normalized = normalizeSlotValue(value);
      slots[key] = () => normalized;
    }
  }
};
const normalizeVNodeSlots = (instance, children) => {
  if (
    process.env.NODE_ENV !== "production" &&
    !isKeepAlive(instance.vnode) &&
    !false
  ) {
    warn(
      `Non-function value encountered for default slot. ` +
        `Prefer function slots for better performance.`
    );
  }
  const normalized = normalizeSlotValue(children);
  instance.slots.default = () => normalized;
};
const initSlots = (instance, children) => {
  if (instance.vnode.shapeFlag & 32 /* ShapeFlags.SLOTS_CHILDREN */) {
    const type = children._;
    if (type) {
      // users can get the shallow readonly version of the slots object through `this.$slots`,
      // we should avoid the proxy object polluting the slots of the internal instance
      instance.slots = toRaw(children);
      // make compiler marker non-enumerable
      shared$2.def(children, "_", type);
    } else {
      normalizeObjectSlots(children, (instance.slots = {}));
    }
  } else {
    instance.slots = {};
    if (children) {
      normalizeVNodeSlots(instance, children);
    }
  }
  shared$2.def(instance.slots, InternalObjectKey, 1);
};
const updateSlots = (instance, children, optimized) => {
  const { vnode, slots } = instance;
  let needDeletionCheck = true;
  let deletionComparisonTarget = shared$2.EMPTY_OBJ;
  if (vnode.shapeFlag & 32 /* ShapeFlags.SLOTS_CHILDREN */) {
    const type = children._;
    if (type) {
      // compiled slots.
      if (process.env.NODE_ENV !== "production" && isHmrUpdating) {
        // Parent was HMR updated so slot content may have changed.
        // force update slots and mark instance for hmr as well
        shared$2.extend(slots, children);
      } else if (optimized && type === 1 /* SlotFlags.STABLE */) {
        // compiled AND stable.
        // no need to update, and skip stale slots removal.
        needDeletionCheck = false;
      } else {
        // compiled but dynamic (v-if/v-for on slots) - update slots, but skip
        // normalization.
        shared$2.extend(slots, children);
        // #2893
        // when rendering the optimized slots by manually written render function,
        // we need to delete the `slots._` flag if necessary to make subsequent updates reliable,
        // i.e. let the `renderSlot` create the bailed Fragment
        if (!optimized && type === 1 /* SlotFlags.STABLE */) {
          delete slots._;
        }
      }
    } else {
      needDeletionCheck = !children.$stable;
      normalizeObjectSlots(children, slots);
    }
    deletionComparisonTarget = children;
  } else if (children) {
    // non slot object children (direct value) passed to a component
    normalizeVNodeSlots(instance, children);
    deletionComparisonTarget = { default: 1 };
  }
  // delete stale slots
  if (needDeletionCheck) {
    for (const key in slots) {
      if (!isInternalKey(key) && !(key in deletionComparisonTarget)) {
        delete slots[key];
      }
    }
  }
};

function createAppContext() {
  return {
    app: null,
    config: {
      isNativeTag: shared$2.NO,
      performance: false,
      globalProperties: {},
      optionMergeStrategies: {},
      errorHandler: undefined,
      warnHandler: undefined,
      compilerOptions: {},
    },
    mixins: [],
    components: {},
    directives: {},
    provides: Object.create(null),
    optionsCache: new WeakMap(),
    propsCache: new WeakMap(),
    emitsCache: new WeakMap(),
  };
}
let uid = 0;
function createAppAPI(render, hydrate) {
  return function createApp(rootComponent, rootProps = null) {
    if (!shared$2.isFunction(rootComponent)) {
      rootComponent = Object.assign({}, rootComponent);
    }
    if (rootProps != null && !shared$2.isObject(rootProps)) {
      process.env.NODE_ENV !== "production" &&
        warn(`root props passed to app.mount() must be an object.`);
      rootProps = null;
    }
    const context = createAppContext();
    const installedPlugins = new Set();
    let isMounted = false;
    const app = (context.app = {
      _uid: uid++,
      _component: rootComponent,
      _props: rootProps,
      _container: null,
      _context: context,
      _instance: null,
      version,
      get config() {
        return context.config;
      },
      set config(v) {
        if (process.env.NODE_ENV !== "production") {
          warn(
            `app.config cannot be replaced. Modify individual options instead.`
          );
        }
      },
      use(plugin, ...options) {
        if (installedPlugins.has(plugin)) {
          process.env.NODE_ENV !== "production" &&
            warn(`Plugin has already been applied to target app.`);
        } else if (plugin && shared$2.isFunction(plugin.install)) {
          installedPlugins.add(plugin);
          plugin.install(app, ...options);
        } else if (shared$2.isFunction(plugin)) {
          installedPlugins.add(plugin);
          plugin(app, ...options);
        } else if (process.env.NODE_ENV !== "production") {
          warn(
            `A plugin must either be a function or an object with an "install" ` +
              `function.`
          );
        }
        return app;
      },
      mixin(mixin) {
        if (__VUE_OPTIONS_API__) {
          if (!context.mixins.includes(mixin)) {
            context.mixins.push(mixin);
          } else if (process.env.NODE_ENV !== "production") {
            warn(
              "Mixin has already been applied to target app" +
                (mixin.name ? `: ${mixin.name}` : "")
            );
          }
        } else if (process.env.NODE_ENV !== "production") {
          warn("Mixins are only available in builds supporting Options API");
        }
        return app;
      },
      component(name, component) {
        if (process.env.NODE_ENV !== "production") {
          validateComponentName(name, context.config);
        }
        if (!component) {
          return context.components[name];
        }
        if (process.env.NODE_ENV !== "production" && context.components[name]) {
          warn(
            `Component "${name}" has already been registered in target app.`
          );
        }
        context.components[name] = component;
        return app;
      },
      directive(name, directive) {
        if (process.env.NODE_ENV !== "production") {
          validateDirectiveName(name);
        }
        if (!directive) {
          return context.directives[name];
        }
        if (process.env.NODE_ENV !== "production" && context.directives[name]) {
          warn(
            `Directive "${name}" has already been registered in target app.`
          );
        }
        context.directives[name] = directive;
        return app;
      },
      mount(rootContainer, isHydrate, isSVG) {
        if (!isMounted) {
          // #5571
          if (
            process.env.NODE_ENV !== "production" &&
            rootContainer.__vue_app__
          ) {
            warn(
              `There is already an app instance mounted on the host container.\n` +
                ` If you want to mount another app on the same host container,` +
                ` you need to unmount the previous app by calling \`app.unmount()\` first.`
            );
          }
          const vnode = createVNode$1(rootComponent, rootProps);
          // store app context on the root VNode.
          // this will be set on the root instance on initial mount.
          vnode.appContext = context;
          // HMR root reload
          if (process.env.NODE_ENV !== "production") {
            context.reload = () => {
              render(cloneVNode$1(vnode), rootContainer, isSVG);
            };
          }
          if (isHydrate && hydrate) {
            hydrate(vnode, rootContainer);
          } else {
            render(vnode, rootContainer, isSVG);
          }
          isMounted = true;
          app._container = rootContainer;
          rootContainer.__vue_app__ = app;
          if (process.env.NODE_ENV !== "production" || __VUE_PROD_DEVTOOLS__) {
            app._instance = vnode.component;
            devtoolsInitApp(app, version);
          }
          return getExposeProxy(vnode.component) || vnode.component.proxy;
        } else if (process.env.NODE_ENV !== "production") {
          warn(
            `App has already been mounted.\n` +
              `If you want to remount the same app, move your app creation logic ` +
              `into a factory function and create fresh app instances for each ` +
              `mount - e.g. \`const createMyApp = () => createApp(App)\``
          );
        }
      },
      unmount() {
        if (isMounted) {
          render(null, app._container);
          if (process.env.NODE_ENV !== "production" || __VUE_PROD_DEVTOOLS__) {
            app._instance = null;
            devtoolsUnmountApp(app);
          }
          delete app._container.__vue_app__;
        } else if (process.env.NODE_ENV !== "production") {
          warn(`Cannot unmount an app that is not mounted.`);
        }
      },
      provide(key, value) {
        if (process.env.NODE_ENV !== "production" && key in context.provides) {
          warn(
            `App already provides property with key "${String(key)}". ` +
              `It will be overwritten with the new value.`
          );
        }
        context.provides[key] = value;
        return app;
      },
    });
    return app;
  };
}

/**
 * Function for handling a template ref
 */
function setRef(rawRef, oldRawRef, parentSuspense, vnode, isUnmount = false) {
  if (shared$2.isArray(rawRef)) {
    rawRef.forEach((r, i) =>
      setRef(
        r,
        oldRawRef && (shared$2.isArray(oldRawRef) ? oldRawRef[i] : oldRawRef),
        parentSuspense,
        vnode,
        isUnmount
      )
    );
    return;
  }
  if (isAsyncWrapper(vnode) && !isUnmount) {
    // when mounting async components, nothing needs to be done,
    // because the template ref is forwarded to inner component
    return;
  }
  const refValue =
    vnode.shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */
      ? getExposeProxy(vnode.component) || vnode.component.proxy
      : vnode.el;
  const value = isUnmount ? null : refValue;
  const { i: owner, r: ref } = rawRef;
  if (process.env.NODE_ENV !== "production" && !owner) {
    warn(
      `Missing ref owner context. ref cannot be used on hoisted vnodes. ` +
        `A vnode with ref must be created inside the render function.`
    );
    return;
  }
  const oldRef = oldRawRef && oldRawRef.r;
  const refs =
    owner.refs === shared$2.EMPTY_OBJ ? (owner.refs = {}) : owner.refs;
  const setupState = owner.setupState;
  // dynamic ref changed. unset old ref
  if (oldRef != null && oldRef !== ref) {
    if (shared$2.isString(oldRef)) {
      refs[oldRef] = null;
      if (shared$2.hasOwn(setupState, oldRef)) {
        setupState[oldRef] = null;
      }
    } else if (isRef(oldRef)) {
      oldRef.value = null;
    }
  }
  if (shared$2.isFunction(ref)) {
    callWithErrorHandling(ref, owner, 12 /* ErrorCodes.FUNCTION_REF */, [
      value,
      refs,
    ]);
  } else {
    const _isString = shared$2.isString(ref);
    const _isRef = isRef(ref);
    if (_isString || _isRef) {
      const doSet = () => {
        if (rawRef.f) {
          const existing = _isString ? refs[ref] : ref.value;
          if (isUnmount) {
            shared$2.isArray(existing) && shared$2.remove(existing, refValue);
          } else {
            if (!shared$2.isArray(existing)) {
              if (_isString) {
                refs[ref] = [refValue];
                if (shared$2.hasOwn(setupState, ref)) {
                  setupState[ref] = refs[ref];
                }
              } else {
                ref.value = [refValue];
                if (rawRef.k) refs[rawRef.k] = ref.value;
              }
            } else if (!existing.includes(refValue)) {
              existing.push(refValue);
            }
          }
        } else if (_isString) {
          refs[ref] = value;
          if (shared$2.hasOwn(setupState, ref)) {
            setupState[ref] = value;
          }
        } else if (_isRef) {
          ref.value = value;
          if (rawRef.k) refs[rawRef.k] = value;
        } else if (process.env.NODE_ENV !== "production") {
          warn("Invalid template ref type:", ref, `(${typeof ref})`);
        }
      };
      if (value) {
        doSet.id = -1;
        queuePostRenderEffect(doSet, parentSuspense);
      } else {
        doSet();
      }
    } else if (process.env.NODE_ENV !== "production") {
      warn("Invalid template ref type:", ref, `(${typeof ref})`);
    }
  }
}

/* eslint-disable no-restricted-globals */
let supported;
let perf;
function startMeasure(instance, type) {
  if (instance.appContext.config.performance && isSupported()) {
    perf.mark(`vue-${type}-${instance.uid}`);
  }
  if (process.env.NODE_ENV !== "production" || __VUE_PROD_DEVTOOLS__) {
    devtoolsPerfStart(instance, type, isSupported() ? perf.now() : Date.now());
  }
}
function endMeasure(instance, type) {
  if (instance.appContext.config.performance && isSupported()) {
    const startTag = `vue-${type}-${instance.uid}`;
    const endTag = startTag + `:end`;
    perf.mark(endTag);
    perf.measure(
      `<${formatComponentName(instance, instance.type)}> ${type}`,
      startTag,
      endTag
    );
    perf.clearMarks(startTag);
    perf.clearMarks(endTag);
  }
  if (process.env.NODE_ENV !== "production" || __VUE_PROD_DEVTOOLS__) {
    devtoolsPerfEnd(instance, type, isSupported() ? perf.now() : Date.now());
  }
}
function isSupported() {
  if (supported !== undefined) {
    return supported;
  }
  if (typeof window !== "undefined" && window.performance) {
    supported = true;
    perf = window.performance;
  } else {
    supported = false;
  }
  return supported;
}

/**
 * This is only called in esm-bundler builds.
 * It is called when a renderer is created, in `baseCreateRenderer` so that
 * importing runtime-core is side-effects free.
 *
 * istanbul-ignore-next
 */
function initFeatureFlags() {
  const needWarn = [];
  if (typeof __VUE_OPTIONS_API__ !== "boolean") {
    process.env.NODE_ENV !== "production" &&
      needWarn.push(`__VUE_OPTIONS_API__`);
    shared$2.getGlobalThis().__VUE_OPTIONS_API__ = true;
  }
  if (typeof __VUE_PROD_DEVTOOLS__ !== "boolean") {
    process.env.NODE_ENV !== "production" &&
      needWarn.push(`__VUE_PROD_DEVTOOLS__`);
    shared$2.getGlobalThis().__VUE_PROD_DEVTOOLS__ = false;
  }
  if (process.env.NODE_ENV !== "production" && needWarn.length) {
    const multi = needWarn.length > 1;
    console.warn(
      `Feature flag${multi ? `s` : ``} ${needWarn.join(", ")} ${
        multi ? `are` : `is`
      } not explicitly defined. You are running the esm-bundler build of Vue, ` +
        `which expects these compile-time feature flags to be globally injected ` +
        `via the bundler config in order to get better tree-shaking in the ` +
        `production bundle.\n\n` +
        `For more details, see https://link.vuejs.org/feature-flags.`
    );
  }
}

const queuePostRenderEffect = queueEffectWithSuspense;
/**
 * The createRenderer function accepts two generic arguments:
 * HostNode and HostElement, corresponding to Node and Element types in the
 * host environment. For example, for runtime-dom, HostNode would be the DOM
 * `Node` interface and HostElement would be the DOM `Element` interface.
 *
 * Custom renderers can pass in the platform specific types like this:
 *
 * ``` js
 * const { render, createApp } = createRenderer<Node, Element>({
 *   patchProp,
 *   ...nodeOps
 * })
 * ```
 */
function createRenderer(options) {
  return baseCreateRenderer(options);
}
// implementation
function baseCreateRenderer(options, createHydrationFns) {
  // compile-time feature flags check
  {
    initFeatureFlags();
  }
  const target = shared$2.getGlobalThis();
  target.__VUE__ = true;
  if (process.env.NODE_ENV !== "production" || __VUE_PROD_DEVTOOLS__) {
    setDevtoolsHook(target.__VUE_DEVTOOLS_GLOBAL_HOOK__, target);
  }
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    createComment: hostCreateComment,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    setScopeId: hostSetScopeId = shared$2.NOOP,
    insertStaticContent: hostInsertStaticContent,
  } = options;
  // Note: functions inside this closure should use `const xxx = () => {}`
  // style in order to prevent being inlined by minifiers.
  const patch = (
    n1,
    n2,
    container,
    anchor = null,
    parentComponent = null,
    parentSuspense = null,
    isSVG = false,
    slotScopeIds = null,
    optimized = process.env.NODE_ENV !== "production" && isHmrUpdating
      ? false
      : !!n2.dynamicChildren
  ) => {
    if (n1 === n2) {
      return;
    }
    // patching & not same type, unmount old tree
    if (n1 && !isSameVNodeType(n1, n2)) {
      anchor = getNextHostNode(n1);
      unmount(n1, parentComponent, parentSuspense, true);
      n1 = null;
    }
    if (n2.patchFlag === -2 /* PatchFlags.BAIL */) {
      optimized = false;
      n2.dynamicChildren = null;
    }
    const { type, ref, shapeFlag } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container, anchor);
        break;
      case Comment$1:
        processCommentNode(n1, n2, container, anchor);
        break;
      case Static:
        if (n1 == null) {
          mountStaticNode(n2, container, anchor, isSVG);
        } else if (process.env.NODE_ENV !== "production") {
          patchStaticNode(n1, n2, container, isSVG);
        }
        break;
      case Fragment$1:
        processFragment(
          n1,
          n2,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds,
          optimized
        );
        break;
      default:
        if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
          processElement(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSVG,
            slotScopeIds,
            optimized
          );
        } else if (shapeFlag & 6 /* ShapeFlags.COMPONENT */) {
          processComponent(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSVG,
            slotScopeIds,
            optimized
          );
        } else if (shapeFlag & 64 /* ShapeFlags.TELEPORT */) {
          type.process(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSVG,
            slotScopeIds,
            optimized,
            internals
          );
        } else if (shapeFlag & 128 /* ShapeFlags.SUSPENSE */) {
          type.process(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSVG,
            slotScopeIds,
            optimized,
            internals
          );
        } else if (process.env.NODE_ENV !== "production") {
          warn("Invalid VNode type:", type, `(${typeof type})`);
        }
    }
    // set ref
    if (ref != null && parentComponent) {
      setRef(ref, n1 && n1.ref, parentSuspense, n2 || n1, !n2);
    }
  };
  const processText = (n1, n2, container, anchor) => {
    if (n1 == null) {
      hostInsert((n2.el = hostCreateText(n2.children)), container, anchor);
    } else {
      const el = (n2.el = n1.el);
      if (n2.children !== n1.children) {
        hostSetText(el, n2.children);
      }
    }
  };
  const processCommentNode = (n1, n2, container, anchor) => {
    if (n1 == null) {
      hostInsert(
        (n2.el = hostCreateComment(n2.children || "")),
        container,
        anchor
      );
    } else {
      // there's no support for dynamic comments
      n2.el = n1.el;
    }
  };
  const mountStaticNode = (n2, container, anchor, isSVG) => {
    [n2.el, n2.anchor] = hostInsertStaticContent(
      n2.children,
      container,
      anchor,
      isSVG,
      n2.el,
      n2.anchor
    );
  };
  /**
   * Dev / HMR only
   */
  const patchStaticNode = (n1, n2, container, isSVG) => {
    // static nodes are only patched during dev for HMR
    if (n2.children !== n1.children) {
      const anchor = hostNextSibling(n1.anchor);
      // remove existing
      removeStaticNode(n1);
      [n2.el, n2.anchor] = hostInsertStaticContent(
        n2.children,
        container,
        anchor,
        isSVG
      );
    } else {
      n2.el = n1.el;
      n2.anchor = n1.anchor;
    }
  };
  const moveStaticNode = ({ el, anchor }, container, nextSibling) => {
    let next;
    while (el && el !== anchor) {
      next = hostNextSibling(el);
      hostInsert(el, container, nextSibling);
      el = next;
    }
    hostInsert(anchor, container, nextSibling);
  };
  const removeStaticNode = ({ el, anchor }) => {
    let next;
    while (el && el !== anchor) {
      next = hostNextSibling(el);
      hostRemove(el);
      el = next;
    }
    hostRemove(anchor);
  };
  const processElement = (
    n1,
    n2,
    container,
    anchor,
    parentComponent,
    parentSuspense,
    isSVG,
    slotScopeIds,
    optimized
  ) => {
    isSVG = isSVG || n2.type === "svg";
    if (n1 == null) {
      mountElement(
        n2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      );
    } else {
      patchElement(
        n1,
        n2,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      );
    }
  };
  const mountElement = (
    vnode,
    container,
    anchor,
    parentComponent,
    parentSuspense,
    isSVG,
    slotScopeIds,
    optimized
  ) => {
    let el;
    let vnodeHook;
    const { type, props, shapeFlag, transition, dirs } = vnode;
    el = vnode.el = hostCreateElement(
      vnode.type,
      isSVG,
      props && props.is,
      props
    );
    // mount children first, since some props may rely on child content
    // being already rendered, e.g. `<select value>`
    if (shapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
      hostSetElementText(el, vnode.children);
    } else if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
      mountChildren(
        vnode.children,
        el,
        null,
        parentComponent,
        parentSuspense,
        isSVG && type !== "foreignObject",
        slotScopeIds,
        optimized
      );
    }
    if (dirs) {
      invokeDirectiveHook(vnode, null, parentComponent, "created");
    }
    // props
    if (props) {
      for (const key in props) {
        if (key !== "value" && !shared$2.isReservedProp(key)) {
          hostPatchProp(
            el,
            key,
            null,
            props[key],
            isSVG,
            vnode.children,
            parentComponent,
            parentSuspense,
            unmountChildren
          );
        }
      }
      /**
       * Special case for setting value on DOM elements:
       * - it can be order-sensitive (e.g. should be set *after* min/max, #2325, #4024)
       * - it needs to be forced (#1471)
       * #2353 proposes adding another renderer option to configure this, but
       * the properties affects are so finite it is worth special casing it
       * here to reduce the complexity. (Special casing it also should not
       * affect non-DOM renderers)
       */
      if ("value" in props) {
        hostPatchProp(el, "value", null, props.value);
      }
      if ((vnodeHook = props.onVnodeBeforeMount)) {
        invokeVNodeHook(vnodeHook, parentComponent, vnode);
      }
    }
    // scopeId
    setScopeId(el, vnode, vnode.scopeId, slotScopeIds, parentComponent);
    if (process.env.NODE_ENV !== "production" || __VUE_PROD_DEVTOOLS__) {
      Object.defineProperty(el, "__vnode", {
        value: vnode,
        enumerable: false,
      });
      Object.defineProperty(el, "__vueParentComponent", {
        value: parentComponent,
        enumerable: false,
      });
    }
    if (dirs) {
      invokeDirectiveHook(vnode, null, parentComponent, "beforeMount");
    }
    // #1583 For inside suspense + suspense not resolved case, enter hook should call when suspense resolved
    // #1689 For inside suspense + suspense resolved case, just call it
    const needCallTransitionHooks =
      (!parentSuspense || (parentSuspense && !parentSuspense.pendingBranch)) &&
      transition &&
      !transition.persisted;
    if (needCallTransitionHooks) {
      transition.beforeEnter(el);
    }
    hostInsert(el, container, anchor);
    if (
      (vnodeHook = props && props.onVnodeMounted) ||
      needCallTransitionHooks ||
      dirs
    ) {
      queuePostRenderEffect(() => {
        vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode);
        needCallTransitionHooks && transition.enter(el);
        dirs && invokeDirectiveHook(vnode, null, parentComponent, "mounted");
      }, parentSuspense);
    }
  };
  const setScopeId = (el, vnode, scopeId, slotScopeIds, parentComponent) => {
    if (scopeId) {
      hostSetScopeId(el, scopeId);
    }
    if (slotScopeIds) {
      for (let i = 0; i < slotScopeIds.length; i++) {
        hostSetScopeId(el, slotScopeIds[i]);
      }
    }
    if (parentComponent) {
      let subTree = parentComponent.subTree;
      if (
        process.env.NODE_ENV !== "production" &&
        subTree.patchFlag > 0 &&
        subTree.patchFlag & 2048 /* PatchFlags.DEV_ROOT_FRAGMENT */
      ) {
        subTree = filterSingleRoot(subTree.children) || subTree;
      }
      if (vnode === subTree) {
        const parentVNode = parentComponent.vnode;
        setScopeId(
          el,
          parentVNode,
          parentVNode.scopeId,
          parentVNode.slotScopeIds,
          parentComponent.parent
        );
      }
    }
  };
  const mountChildren = (
    children,
    container,
    anchor,
    parentComponent,
    parentSuspense,
    isSVG,
    slotScopeIds,
    optimized,
    start = 0
  ) => {
    for (let i = start; i < children.length; i++) {
      const child = (children[i] = optimized
        ? cloneIfMounted(children[i])
        : normalizeVNode(children[i]));
      patch(
        null,
        child,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      );
    }
  };
  const patchElement = (
    n1,
    n2,
    parentComponent,
    parentSuspense,
    isSVG,
    slotScopeIds,
    optimized
  ) => {
    const el = (n2.el = n1.el);
    let { patchFlag, dynamicChildren, dirs } = n2;
    // #1426 take the old vnode's patch flag into account since user may clone a
    // compiler-generated vnode, which de-opts to FULL_PROPS
    patchFlag |= n1.patchFlag & 16 /* PatchFlags.FULL_PROPS */;
    const oldProps = n1.props || shared$2.EMPTY_OBJ;
    const newProps = n2.props || shared$2.EMPTY_OBJ;
    let vnodeHook;
    // disable recurse in beforeUpdate hooks
    parentComponent && toggleRecurse(parentComponent, false);
    if ((vnodeHook = newProps.onVnodeBeforeUpdate)) {
      invokeVNodeHook(vnodeHook, parentComponent, n2, n1);
    }
    if (dirs) {
      invokeDirectiveHook(n2, n1, parentComponent, "beforeUpdate");
    }
    parentComponent && toggleRecurse(parentComponent, true);
    if (process.env.NODE_ENV !== "production" && isHmrUpdating) {
      // HMR updated, force full diff
      patchFlag = 0;
      optimized = false;
      dynamicChildren = null;
    }
    const areChildrenSVG = isSVG && n2.type !== "foreignObject";
    if (dynamicChildren) {
      patchBlockChildren(
        n1.dynamicChildren,
        dynamicChildren,
        el,
        parentComponent,
        parentSuspense,
        areChildrenSVG,
        slotScopeIds
      );
      if (
        process.env.NODE_ENV !== "production" &&
        parentComponent &&
        parentComponent.type.__hmrId
      ) {
        traverseStaticChildren(n1, n2);
      }
    } else if (!optimized) {
      // full diff
      patchChildren(
        n1,
        n2,
        el,
        null,
        parentComponent,
        parentSuspense,
        areChildrenSVG,
        slotScopeIds,
        false
      );
    }
    if (patchFlag > 0) {
      // the presence of a patchFlag means this element's render code was
      // generated by the compiler and can take the fast path.
      // in this path old node and new node are guaranteed to have the same shape
      // (i.e. at the exact same position in the source template)
      if (patchFlag & 16 /* PatchFlags.FULL_PROPS */) {
        // element props contain dynamic keys, full diff needed
        patchProps(
          el,
          n2,
          oldProps,
          newProps,
          parentComponent,
          parentSuspense,
          isSVG
        );
      } else {
        // class
        // this flag is matched when the element has dynamic class bindings.
        if (patchFlag & 2 /* PatchFlags.CLASS */) {
          if (oldProps.class !== newProps.class) {
            hostPatchProp(el, "class", null, newProps.class, isSVG);
          }
        }
        // style
        // this flag is matched when the element has dynamic style bindings
        if (patchFlag & 4 /* PatchFlags.STYLE */) {
          hostPatchProp(el, "style", oldProps.style, newProps.style, isSVG);
        }
        // props
        // This flag is matched when the element has dynamic prop/attr bindings
        // other than class and style. The keys of dynamic prop/attrs are saved for
        // faster iteration.
        // Note dynamic keys like :[foo]="bar" will cause this optimization to
        // bail out and go through a full diff because we need to unset the old key
        if (patchFlag & 8 /* PatchFlags.PROPS */) {
          // if the flag is present then dynamicProps must be non-null
          const propsToUpdate = n2.dynamicProps;
          for (let i = 0; i < propsToUpdate.length; i++) {
            const key = propsToUpdate[i];
            const prev = oldProps[key];
            const next = newProps[key];
            // #1471 force patch value
            if (next !== prev || key === "value") {
              hostPatchProp(
                el,
                key,
                prev,
                next,
                isSVG,
                n1.children,
                parentComponent,
                parentSuspense,
                unmountChildren
              );
            }
          }
        }
      }
      // text
      // This flag is matched when the element has only dynamic text children.
      if (patchFlag & 1 /* PatchFlags.TEXT */) {
        if (n1.children !== n2.children) {
          hostSetElementText(el, n2.children);
        }
      }
    } else if (!optimized && dynamicChildren == null) {
      // unoptimized, full diff
      patchProps(
        el,
        n2,
        oldProps,
        newProps,
        parentComponent,
        parentSuspense,
        isSVG
      );
    }
    if ((vnodeHook = newProps.onVnodeUpdated) || dirs) {
      queuePostRenderEffect(() => {
        vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, n2, n1);
        dirs && invokeDirectiveHook(n2, n1, parentComponent, "updated");
      }, parentSuspense);
    }
  };
  // The fast path for blocks.
  const patchBlockChildren = (
    oldChildren,
    newChildren,
    fallbackContainer,
    parentComponent,
    parentSuspense,
    isSVG,
    slotScopeIds
  ) => {
    for (let i = 0; i < newChildren.length; i++) {
      const oldVNode = oldChildren[i];
      const newVNode = newChildren[i];
      // Determine the container (parent element) for the patch.
      const container =
        // oldVNode may be an errored async setup() component inside Suspense
        // which will not have a mounted element
        oldVNode.el &&
        // - In the case of a Fragment, we need to provide the actual parent
        // of the Fragment itself so it can move its children.
        (oldVNode.type === Fragment$1 ||
          // - In the case of different nodes, there is going to be a replacement
          // which also requires the correct parent container
          !isSameVNodeType(oldVNode, newVNode) ||
          // - In the case of a component, it could contain anything.
          oldVNode.shapeFlag &
            (6 /* ShapeFlags.COMPONENT */ | 64) /* ShapeFlags.TELEPORT */)
          ? hostParentNode(oldVNode.el)
          : // In other cases, the parent container is not actually used so we
            // just pass the block element here to avoid a DOM parentNode call.
            fallbackContainer;
      patch(
        oldVNode,
        newVNode,
        container,
        null,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        true
      );
    }
  };
  const patchProps = (
    el,
    vnode,
    oldProps,
    newProps,
    parentComponent,
    parentSuspense,
    isSVG
  ) => {
    if (oldProps !== newProps) {
      if (oldProps !== shared$2.EMPTY_OBJ) {
        for (const key in oldProps) {
          if (!shared$2.isReservedProp(key) && !(key in newProps)) {
            hostPatchProp(
              el,
              key,
              oldProps[key],
              null,
              isSVG,
              vnode.children,
              parentComponent,
              parentSuspense,
              unmountChildren
            );
          }
        }
      }
      for (const key in newProps) {
        // empty string is not valid prop
        if (shared$2.isReservedProp(key)) continue;
        const next = newProps[key];
        const prev = oldProps[key];
        // defer patching value
        if (next !== prev && key !== "value") {
          hostPatchProp(
            el,
            key,
            prev,
            next,
            isSVG,
            vnode.children,
            parentComponent,
            parentSuspense,
            unmountChildren
          );
        }
      }
      if ("value" in newProps) {
        hostPatchProp(el, "value", oldProps.value, newProps.value);
      }
    }
  };
  const processFragment = (
    n1,
    n2,
    container,
    anchor,
    parentComponent,
    parentSuspense,
    isSVG,
    slotScopeIds,
    optimized
  ) => {
    const fragmentStartAnchor = (n2.el = n1 ? n1.el : hostCreateText(""));
    const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : hostCreateText(""));
    let { patchFlag, dynamicChildren, slotScopeIds: fragmentSlotScopeIds } = n2;
    if (
      process.env.NODE_ENV !== "production" &&
      // #5523 dev root fragment may inherit directives
      (isHmrUpdating || patchFlag & 2048) /* PatchFlags.DEV_ROOT_FRAGMENT */
    ) {
      // HMR updated / Dev root fragment (w/ comments), force full diff
      patchFlag = 0;
      optimized = false;
      dynamicChildren = null;
    }
    // check if this is a slot fragment with :slotted scope ids
    if (fragmentSlotScopeIds) {
      slotScopeIds = slotScopeIds
        ? slotScopeIds.concat(fragmentSlotScopeIds)
        : fragmentSlotScopeIds;
    }
    if (n1 == null) {
      hostInsert(fragmentStartAnchor, container, anchor);
      hostInsert(fragmentEndAnchor, container, anchor);
      // a fragment can only have array children
      // since they are either generated by the compiler, or implicitly created
      // from arrays.
      mountChildren(
        n2.children,
        container,
        fragmentEndAnchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      );
    } else {
      if (
        patchFlag > 0 &&
        patchFlag & 64 /* PatchFlags.STABLE_FRAGMENT */ &&
        dynamicChildren &&
        // #2715 the previous fragment could've been a BAILed one as a result
        // of renderSlot() with no valid children
        n1.dynamicChildren
      ) {
        // a stable fragment (template root or <template v-for>) doesn't need to
        // patch children order, but it may contain dynamicChildren.
        patchBlockChildren(
          n1.dynamicChildren,
          dynamicChildren,
          container,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds
        );
        if (
          process.env.NODE_ENV !== "production" &&
          parentComponent &&
          parentComponent.type.__hmrId
        ) {
          traverseStaticChildren(n1, n2);
        } else if (
          // #2080 if the stable fragment has a key, it's a <template v-for> that may
          //  get moved around. Make sure all root level vnodes inherit el.
          // #2134 or if it's a component root, it may also get moved around
          // as the component is being moved.
          n2.key != null ||
          (parentComponent && n2 === parentComponent.subTree)
        ) {
          traverseStaticChildren(n1, n2, true /* shallow */);
        }
      } else {
        // keyed / unkeyed, or manual fragments.
        // for keyed & unkeyed, since they are compiler generated from v-for,
        // each child is guaranteed to be a block so the fragment will never
        // have dynamicChildren.
        patchChildren(
          n1,
          n2,
          container,
          fragmentEndAnchor,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds,
          optimized
        );
      }
    }
  };
  const processComponent = (
    n1,
    n2,
    container,
    anchor,
    parentComponent,
    parentSuspense,
    isSVG,
    slotScopeIds,
    optimized
  ) => {
    n2.slotScopeIds = slotScopeIds;
    if (n1 == null) {
      if (n2.shapeFlag & 512 /* ShapeFlags.COMPONENT_KEPT_ALIVE */) {
        parentComponent.ctx.activate(n2, container, anchor, isSVG, optimized);
      } else {
        mountComponent(
          n2,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          isSVG,
          optimized
        );
      }
    } else {
      updateComponent(n1, n2, optimized);
    }
  };
  const mountComponent = (
    initialVNode,
    container,
    anchor,
    parentComponent,
    parentSuspense,
    isSVG,
    optimized
  ) => {
    const instance = (initialVNode.component = createComponentInstance(
      initialVNode,
      parentComponent,
      parentSuspense
    ));
    if (process.env.NODE_ENV !== "production" && instance.type.__hmrId) {
      registerHMR(instance);
    }
    if (process.env.NODE_ENV !== "production") {
      pushWarningContext(initialVNode);
      startMeasure(instance, `mount`);
    }
    // inject renderer internals for keepAlive
    if (isKeepAlive(initialVNode)) {
      instance.ctx.renderer = internals;
    }
    // resolve props and slots for setup context
    {
      if (process.env.NODE_ENV !== "production") {
        startMeasure(instance, `init`);
      }
      setupComponent(instance);
      if (process.env.NODE_ENV !== "production") {
        endMeasure(instance, `init`);
      }
    }
    // setup() is async. This component relies on async logic to be resolved
    // before proceeding
    if (instance.asyncDep) {
      parentSuspense && parentSuspense.registerDep(instance, setupRenderEffect);
      // Give it a placeholder if this is not hydration
      // TODO handle self-defined fallback
      if (!initialVNode.el) {
        const placeholder = (instance.subTree = createVNode$1(Comment$1));
        processCommentNode(null, placeholder, container, anchor);
      }
      return;
    }
    setupRenderEffect(
      instance,
      initialVNode,
      container,
      anchor,
      parentSuspense,
      isSVG,
      optimized
    );
    if (process.env.NODE_ENV !== "production") {
      popWarningContext();
      endMeasure(instance, `mount`);
    }
  };
  const updateComponent = (n1, n2, optimized) => {
    const instance = (n2.component = n1.component);
    if (shouldUpdateComponent(n1, n2, optimized)) {
      if (instance.asyncDep && !instance.asyncResolved) {
        // async & still pending - just update props and slots
        // since the component's reactive effect for render isn't set-up yet
        if (process.env.NODE_ENV !== "production") {
          pushWarningContext(n2);
        }
        updateComponentPreRender(instance, n2, optimized);
        if (process.env.NODE_ENV !== "production") {
          popWarningContext();
        }
        return;
      } else {
        // normal update
        instance.next = n2;
        // in case the child component is also queued, remove it to avoid
        // double updating the same child component in the same flush.
        invalidateJob(instance.update);
        // instance.update is the reactive effect.
        instance.update();
      }
    } else {
      // no update needed. just copy over properties
      n2.el = n1.el;
      instance.vnode = n2;
    }
  };
  const setupRenderEffect = (
    instance,
    initialVNode,
    container,
    anchor,
    parentSuspense,
    isSVG,
    optimized
  ) => {
    const componentUpdateFn = () => {
      if (!instance.isMounted) {
        let vnodeHook;
        const { el, props } = initialVNode;
        const { bm, m, parent } = instance;
        const isAsyncWrapperVNode = isAsyncWrapper(initialVNode);
        toggleRecurse(instance, false);
        // beforeMount hook
        if (bm) {
          shared$2.invokeArrayFns(bm);
        }
        // onVnodeBeforeMount
        if (
          !isAsyncWrapperVNode &&
          (vnodeHook = props && props.onVnodeBeforeMount)
        ) {
          invokeVNodeHook(vnodeHook, parent, initialVNode);
        }
        toggleRecurse(instance, true);
        if (el && hydrateNode) {
          // vnode has adopted host node - perform hydration instead of mount.
          const hydrateSubTree = () => {
            if (process.env.NODE_ENV !== "production") {
              startMeasure(instance, `render`);
            }
            instance.subTree = renderComponentRoot(instance);
            if (process.env.NODE_ENV !== "production") {
              endMeasure(instance, `render`);
            }
            if (process.env.NODE_ENV !== "production") {
              startMeasure(instance, `hydrate`);
            }
            hydrateNode(el, instance.subTree, instance, parentSuspense, null);
            if (process.env.NODE_ENV !== "production") {
              endMeasure(instance, `hydrate`);
            }
          };
          if (isAsyncWrapperVNode) {
            initialVNode.type.__asyncLoader().then(
              // note: we are moving the render call into an async callback,
              // which means it won't track dependencies - but it's ok because
              // a server-rendered async wrapper is already in resolved state
              // and it will never need to change.
              () => !instance.isUnmounted && hydrateSubTree()
            );
          } else {
            hydrateSubTree();
          }
        } else {
          if (process.env.NODE_ENV !== "production") {
            startMeasure(instance, `render`);
          }
          const subTree = (instance.subTree = renderComponentRoot(instance));
          if (process.env.NODE_ENV !== "production") {
            endMeasure(instance, `render`);
          }
          if (process.env.NODE_ENV !== "production") {
            startMeasure(instance, `patch`);
          }
          patch(
            null,
            subTree,
            container,
            anchor,
            instance,
            parentSuspense,
            isSVG
          );
          if (process.env.NODE_ENV !== "production") {
            endMeasure(instance, `patch`);
          }
          initialVNode.el = subTree.el;
        }
        // mounted hook
        if (m) {
          queuePostRenderEffect(m, parentSuspense);
        }
        // onVnodeMounted
        if (
          !isAsyncWrapperVNode &&
          (vnodeHook = props && props.onVnodeMounted)
        ) {
          const scopedInitialVNode = initialVNode;
          queuePostRenderEffect(
            () => invokeVNodeHook(vnodeHook, parent, scopedInitialVNode),
            parentSuspense
          );
        }
        // activated hook for keep-alive roots.
        // #1742 activated hook must be accessed after first render
        // since the hook may be injected by a child keep-alive
        if (
          initialVNode.shapeFlag &
            256 /* ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE */ ||
          (parent &&
            isAsyncWrapper(parent.vnode) &&
            parent.vnode.shapeFlag &
              256) /* ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE */
        ) {
          instance.a && queuePostRenderEffect(instance.a, parentSuspense);
        }
        instance.isMounted = true;
        if (process.env.NODE_ENV !== "production" || __VUE_PROD_DEVTOOLS__) {
          devtoolsComponentAdded(instance);
        }
        // #2458: deference mount-only object parameters to prevent memleaks
        initialVNode = container = anchor = null;
      } else {
        // updateComponent
        // This is triggered by mutation of component's own state (next: null)
        // OR parent calling processComponent (next: VNode)
        let { next, bu, u, parent, vnode } = instance;
        let originNext = next;
        let vnodeHook;
        if (process.env.NODE_ENV !== "production") {
          pushWarningContext(next || instance.vnode);
        }
        // Disallow component effect recursion during pre-lifecycle hooks.
        toggleRecurse(instance, false);
        if (next) {
          next.el = vnode.el;
          updateComponentPreRender(instance, next, optimized);
        } else {
          next = vnode;
        }
        // beforeUpdate hook
        if (bu) {
          shared$2.invokeArrayFns(bu);
        }
        // onVnodeBeforeUpdate
        if ((vnodeHook = next.props && next.props.onVnodeBeforeUpdate)) {
          invokeVNodeHook(vnodeHook, parent, next, vnode);
        }
        toggleRecurse(instance, true);
        // render
        if (process.env.NODE_ENV !== "production") {
          startMeasure(instance, `render`);
        }
        const nextTree = renderComponentRoot(instance);
        if (process.env.NODE_ENV !== "production") {
          endMeasure(instance, `render`);
        }
        const prevTree = instance.subTree;
        instance.subTree = nextTree;
        if (process.env.NODE_ENV !== "production") {
          startMeasure(instance, `patch`);
        }
        patch(
          prevTree,
          nextTree,
          // parent may have changed if it's in a teleport
          hostParentNode(prevTree.el),
          // anchor may have changed if it's in a fragment
          getNextHostNode(prevTree),
          instance,
          parentSuspense,
          isSVG
        );
        if (process.env.NODE_ENV !== "production") {
          endMeasure(instance, `patch`);
        }
        next.el = nextTree.el;
        if (originNext === null) {
          // self-triggered update. In case of HOC, update parent component
          // vnode el. HOC is indicated by parent instance's subTree pointing
          // to child component's vnode
          updateHOCHostEl(instance, nextTree.el);
        }
        // updated hook
        if (u) {
          queuePostRenderEffect(u, parentSuspense);
        }
        // onVnodeUpdated
        if ((vnodeHook = next.props && next.props.onVnodeUpdated)) {
          queuePostRenderEffect(
            () => invokeVNodeHook(vnodeHook, parent, next, vnode),
            parentSuspense
          );
        }
        if (process.env.NODE_ENV !== "production" || __VUE_PROD_DEVTOOLS__) {
          devtoolsComponentUpdated(instance);
        }
        if (process.env.NODE_ENV !== "production") {
          popWarningContext();
        }
      }
    };
    // create reactive effect for rendering
    const effect = (instance.effect = new ReactiveEffect(
      componentUpdateFn,
      () => queueJob(update),
      instance.scope // track it in component's effect scope
    ));
    const update = (instance.update = () => effect.run());
    update.id = instance.uid;
    // allowRecurse
    // #1801, #2043 component render effects should allow recursive updates
    toggleRecurse(instance, true);
    if (process.env.NODE_ENV !== "production") {
      effect.onTrack = instance.rtc
        ? (e) => shared$2.invokeArrayFns(instance.rtc, e)
        : void 0;
      effect.onTrigger = instance.rtg
        ? (e) => shared$2.invokeArrayFns(instance.rtg, e)
        : void 0;
      update.ownerInstance = instance;
    }
    update();
  };
  const updateComponentPreRender = (instance, nextVNode, optimized) => {
    nextVNode.component = instance;
    const prevProps = instance.vnode.props;
    instance.vnode = nextVNode;
    instance.next = null;
    updateProps(instance, nextVNode.props, prevProps, optimized);
    updateSlots(instance, nextVNode.children, optimized);
    pauseTracking();
    // props update may have triggered pre-flush watchers.
    // flush them before the render update.
    flushPreFlushCbs();
    resetTracking();
  };
  const patchChildren = (
    n1,
    n2,
    container,
    anchor,
    parentComponent,
    parentSuspense,
    isSVG,
    slotScopeIds,
    optimized = false
  ) => {
    const c1 = n1 && n1.children;
    const prevShapeFlag = n1 ? n1.shapeFlag : 0;
    const c2 = n2.children;
    const { patchFlag, shapeFlag } = n2;
    // fast path
    if (patchFlag > 0) {
      if (patchFlag & 128 /* PatchFlags.KEYED_FRAGMENT */) {
        // this could be either fully-keyed or mixed (some keyed some not)
        // presence of patchFlag means children are guaranteed to be arrays
        patchKeyedChildren(
          c1,
          c2,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds,
          optimized
        );
        return;
      } else if (patchFlag & 256 /* PatchFlags.UNKEYED_FRAGMENT */) {
        // unkeyed
        patchUnkeyedChildren(
          c1,
          c2,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds,
          optimized
        );
        return;
      }
    }
    // children has 3 possibilities: text, array or no children.
    if (shapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
      // text children fast path
      if (prevShapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
        unmountChildren(c1, parentComponent, parentSuspense);
      }
      if (c2 !== c1) {
        hostSetElementText(container, c2);
      }
    } else {
      if (prevShapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
        // prev children was array
        if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
          // two arrays, cannot assume anything, do full diff
          patchKeyedChildren(
            c1,
            c2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSVG,
            slotScopeIds,
            optimized
          );
        } else {
          // no new children, just unmount old
          unmountChildren(c1, parentComponent, parentSuspense, true);
        }
      } else {
        // prev children was text OR null
        // new children is array OR null
        if (prevShapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
          hostSetElementText(container, "");
        }
        // mount new if array
        if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
          mountChildren(
            c2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSVG,
            slotScopeIds,
            optimized
          );
        }
      }
    }
  };
  const patchUnkeyedChildren = (
    c1,
    c2,
    container,
    anchor,
    parentComponent,
    parentSuspense,
    isSVG,
    slotScopeIds,
    optimized
  ) => {
    c1 = c1 || shared$2.EMPTY_ARR;
    c2 = c2 || shared$2.EMPTY_ARR;
    const oldLength = c1.length;
    const newLength = c2.length;
    const commonLength = Math.min(oldLength, newLength);
    let i;
    for (i = 0; i < commonLength; i++) {
      const nextChild = (c2[i] = optimized
        ? cloneIfMounted(c2[i])
        : normalizeVNode(c2[i]));
      patch(
        c1[i],
        nextChild,
        container,
        null,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      );
    }
    if (oldLength > newLength) {
      // remove old
      unmountChildren(
        c1,
        parentComponent,
        parentSuspense,
        true,
        false,
        commonLength
      );
    } else {
      // mount new
      mountChildren(
        c2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized,
        commonLength
      );
    }
  };
  // can be all-keyed or mixed
  const patchKeyedChildren = (
    c1,
    c2,
    container,
    parentAnchor,
    parentComponent,
    parentSuspense,
    isSVG,
    slotScopeIds,
    optimized
  ) => {
    let i = 0;
    const l2 = c2.length;
    let e1 = c1.length - 1; // prev ending index
    let e2 = l2 - 1; // next ending index
    // 1. sync from start
    // (a b) c
    // (a b) d e
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = (c2[i] = optimized
        ? cloneIfMounted(c2[i])
        : normalizeVNode(c2[i]));
      if (isSameVNodeType(n1, n2)) {
        patch(
          n1,
          n2,
          container,
          null,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds,
          optimized
        );
      } else {
        break;
      }
      i++;
    }
    // 2. sync from end
    // a (b c)
    // d e (b c)
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = (c2[e2] = optimized
        ? cloneIfMounted(c2[e2])
        : normalizeVNode(c2[e2]));
      if (isSameVNodeType(n1, n2)) {
        patch(
          n1,
          n2,
          container,
          null,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds,
          optimized
        );
      } else {
        break;
      }
      e1--;
      e2--;
    }
    // 3. common sequence + mount
    // (a b)
    // (a b) c
    // i = 2, e1 = 1, e2 = 2
    // (a b)
    // c (a b)
    // i = 0, e1 = -1, e2 = 0
    if (i > e1) {
      if (i <= e2) {
        const nextPos = e2 + 1;
        const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor;
        while (i <= e2) {
          patch(
            null,
            (c2[i] = optimized ? cloneIfMounted(c2[i]) : normalizeVNode(c2[i])),
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSVG,
            slotScopeIds,
            optimized
          );
          i++;
        }
      }
    }
    // 4. common sequence + unmount
    // (a b) c
    // (a b)
    // i = 2, e1 = 2, e2 = 1
    // a (b c)
    // (b c)
    // i = 0, e1 = 0, e2 = -1
    else if (i > e2) {
      while (i <= e1) {
        unmount(c1[i], parentComponent, parentSuspense, true);
        i++;
      }
    }
    // 5. unknown sequence
    // [i ... e1 + 1]: a b [c d e] f g
    // [i ... e2 + 1]: a b [e d c h] f g
    // i = 2, e1 = 4, e2 = 5
    else {
      const s1 = i; // prev starting index
      const s2 = i; // next starting index
      // 5.1 build key:index map for newChildren
      const keyToNewIndexMap = new Map();
      for (i = s2; i <= e2; i++) {
        const nextChild = (c2[i] = optimized
          ? cloneIfMounted(c2[i])
          : normalizeVNode(c2[i]));
        if (nextChild.key != null) {
          if (
            process.env.NODE_ENV !== "production" &&
            keyToNewIndexMap.has(nextChild.key)
          ) {
            warn(
              `Duplicate keys found during update:`,
              JSON.stringify(nextChild.key),
              `Make sure keys are unique.`
            );
          }
          keyToNewIndexMap.set(nextChild.key, i);
        }
      }
      // 5.2 loop through old children left to be patched and try to patch
      // matching nodes & remove nodes that are no longer present
      let j;
      let patched = 0;
      const toBePatched = e2 - s2 + 1;
      let moved = false;
      // used to track whether any node has moved
      let maxNewIndexSoFar = 0;
      // works as Map<newIndex, oldIndex>
      // Note that oldIndex is offset by +1
      // and oldIndex = 0 is a special value indicating the new node has
      // no corresponding old node.
      // used for determining longest stable subsequence
      const newIndexToOldIndexMap = new Array(toBePatched);
      for (i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0;
      for (i = s1; i <= e1; i++) {
        const prevChild = c1[i];
        if (patched >= toBePatched) {
          // all new children have been patched so this can only be a removal
          unmount(prevChild, parentComponent, parentSuspense, true);
          continue;
        }
        let newIndex;
        if (prevChild.key != null) {
          newIndex = keyToNewIndexMap.get(prevChild.key);
        } else {
          // key-less node, try to locate a key-less node of the same type
          for (j = s2; j <= e2; j++) {
            if (
              newIndexToOldIndexMap[j - s2] === 0 &&
              isSameVNodeType(prevChild, c2[j])
            ) {
              newIndex = j;
              break;
            }
          }
        }
        if (newIndex === undefined) {
          unmount(prevChild, parentComponent, parentSuspense, true);
        } else {
          newIndexToOldIndexMap[newIndex - s2] = i + 1;
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex;
          } else {
            moved = true;
          }
          patch(
            prevChild,
            c2[newIndex],
            container,
            null,
            parentComponent,
            parentSuspense,
            isSVG,
            slotScopeIds,
            optimized
          );
          patched++;
        }
      }
      // 5.3 move and mount
      // generate longest stable subsequence only when nodes have moved
      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : shared$2.EMPTY_ARR;
      j = increasingNewIndexSequence.length - 1;
      // looping backwards so that we can use last patched node as anchor
      for (i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = s2 + i;
        const nextChild = c2[nextIndex];
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor;
        if (newIndexToOldIndexMap[i] === 0) {
          // mount new
          patch(
            null,
            nextChild,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSVG,
            slotScopeIds,
            optimized
          );
        } else if (moved) {
          // move if:
          // There is no stable subsequence (e.g. a reverse)
          // OR current node is not among the stable sequence
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            move(nextChild, container, anchor, 2 /* MoveType.REORDER */);
          } else {
            j--;
          }
        }
      }
    }
  };
  const move = (vnode, container, anchor, moveType, parentSuspense = null) => {
    const { el, type, transition, children, shapeFlag } = vnode;
    if (shapeFlag & 6 /* ShapeFlags.COMPONENT */) {
      move(vnode.component.subTree, container, anchor, moveType);
      return;
    }
    if (shapeFlag & 128 /* ShapeFlags.SUSPENSE */) {
      vnode.suspense.move(container, anchor, moveType);
      return;
    }
    if (shapeFlag & 64 /* ShapeFlags.TELEPORT */) {
      type.move(vnode, container, anchor, internals);
      return;
    }
    if (type === Fragment$1) {
      hostInsert(el, container, anchor);
      for (let i = 0; i < children.length; i++) {
        move(children[i], container, anchor, moveType);
      }
      hostInsert(vnode.anchor, container, anchor);
      return;
    }
    if (type === Static) {
      moveStaticNode(vnode, container, anchor);
      return;
    }
    // single nodes
    const needTransition =
      moveType !== 2 /* MoveType.REORDER */ &&
      shapeFlag & 1 /* ShapeFlags.ELEMENT */ &&
      transition;
    if (needTransition) {
      if (moveType === 0 /* MoveType.ENTER */) {
        transition.beforeEnter(el);
        hostInsert(el, container, anchor);
        queuePostRenderEffect(() => transition.enter(el), parentSuspense);
      } else {
        const { leave, delayLeave, afterLeave } = transition;
        const remove = () => hostInsert(el, container, anchor);
        const performLeave = () => {
          leave(el, () => {
            remove();
            afterLeave && afterLeave();
          });
        };
        if (delayLeave) {
          delayLeave(el, remove, performLeave);
        } else {
          performLeave();
        }
      }
    } else {
      hostInsert(el, container, anchor);
    }
  };
  const unmount = (
    vnode,
    parentComponent,
    parentSuspense,
    doRemove = false,
    optimized = false
  ) => {
    const {
      type,
      props,
      ref,
      children,
      dynamicChildren,
      shapeFlag,
      patchFlag,
      dirs,
    } = vnode;
    // unset ref
    if (ref != null) {
      setRef(ref, null, parentSuspense, vnode, true);
    }
    if (shapeFlag & 256 /* ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE */) {
      parentComponent.ctx.deactivate(vnode);
      return;
    }
    const shouldInvokeDirs = shapeFlag & 1 /* ShapeFlags.ELEMENT */ && dirs;
    const shouldInvokeVnodeHook = !isAsyncWrapper(vnode);
    let vnodeHook;
    if (
      shouldInvokeVnodeHook &&
      (vnodeHook = props && props.onVnodeBeforeUnmount)
    ) {
      invokeVNodeHook(vnodeHook, parentComponent, vnode);
    }
    if (shapeFlag & 6 /* ShapeFlags.COMPONENT */) {
      unmountComponent(vnode.component, parentSuspense, doRemove);
    } else {
      if (shapeFlag & 128 /* ShapeFlags.SUSPENSE */) {
        vnode.suspense.unmount(parentSuspense, doRemove);
        return;
      }
      if (shouldInvokeDirs) {
        invokeDirectiveHook(vnode, null, parentComponent, "beforeUnmount");
      }
      if (shapeFlag & 64 /* ShapeFlags.TELEPORT */) {
        vnode.type.remove(
          vnode,
          parentComponent,
          parentSuspense,
          optimized,
          internals,
          doRemove
        );
      } else if (
        dynamicChildren &&
        // #1153: fast path should not be taken for non-stable (v-for) fragments
        (type !== Fragment$1 ||
          (patchFlag > 0 && patchFlag & 64) /* PatchFlags.STABLE_FRAGMENT */)
      ) {
        // fast path for block nodes: only need to unmount dynamic children.
        unmountChildren(
          dynamicChildren,
          parentComponent,
          parentSuspense,
          false,
          true
        );
      } else if (
        (type === Fragment$1 &&
          patchFlag &
            (128 /* PatchFlags.KEYED_FRAGMENT */ |
              256) /* PatchFlags.UNKEYED_FRAGMENT */) ||
        (!optimized && shapeFlag & 16) /* ShapeFlags.ARRAY_CHILDREN */
      ) {
        unmountChildren(children, parentComponent, parentSuspense);
      }
      if (doRemove) {
        remove(vnode);
      }
    }
    if (
      (shouldInvokeVnodeHook &&
        (vnodeHook = props && props.onVnodeUnmounted)) ||
      shouldInvokeDirs
    ) {
      queuePostRenderEffect(() => {
        vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode);
        shouldInvokeDirs &&
          invokeDirectiveHook(vnode, null, parentComponent, "unmounted");
      }, parentSuspense);
    }
  };
  const remove = (vnode) => {
    const { type, el, anchor, transition } = vnode;
    if (type === Fragment$1) {
      if (
        process.env.NODE_ENV !== "production" &&
        vnode.patchFlag > 0 &&
        vnode.patchFlag & 2048 /* PatchFlags.DEV_ROOT_FRAGMENT */ &&
        transition &&
        !transition.persisted
      ) {
        vnode.children.forEach((child) => {
          if (child.type === Comment$1) {
            hostRemove(child.el);
          } else {
            remove(child);
          }
        });
      } else {
        removeFragment(el, anchor);
      }
      return;
    }
    if (type === Static) {
      removeStaticNode(vnode);
      return;
    }
    const performRemove = () => {
      hostRemove(el);
      if (transition && !transition.persisted && transition.afterLeave) {
        transition.afterLeave();
      }
    };
    if (
      vnode.shapeFlag & 1 /* ShapeFlags.ELEMENT */ &&
      transition &&
      !transition.persisted
    ) {
      const { leave, delayLeave } = transition;
      const performLeave = () => leave(el, performRemove);
      if (delayLeave) {
        delayLeave(vnode.el, performRemove, performLeave);
      } else {
        performLeave();
      }
    } else {
      performRemove();
    }
  };
  const removeFragment = (cur, end) => {
    // For fragments, directly remove all contained DOM nodes.
    // (fragment child nodes cannot have transition)
    let next;
    while (cur !== end) {
      next = hostNextSibling(cur);
      hostRemove(cur);
      cur = next;
    }
    hostRemove(end);
  };
  const unmountComponent = (instance, parentSuspense, doRemove) => {
    if (process.env.NODE_ENV !== "production" && instance.type.__hmrId) {
      unregisterHMR(instance);
    }
    const { bum, scope, update, subTree, um } = instance;
    // beforeUnmount hook
    if (bum) {
      shared$2.invokeArrayFns(bum);
    }
    // stop effects in component scope
    scope.stop();
    // update may be null if a component is unmounted before its async
    // setup has resolved.
    if (update) {
      // so that scheduler will no longer invoke it
      update.active = false;
      unmount(subTree, instance, parentSuspense, doRemove);
    }
    // unmounted hook
    if (um) {
      queuePostRenderEffect(um, parentSuspense);
    }
    queuePostRenderEffect(() => {
      instance.isUnmounted = true;
    }, parentSuspense);
    // A component with async dep inside a pending suspense is unmounted before
    // its async dep resolves. This should remove the dep from the suspense, and
    // cause the suspense to resolve immediately if that was the last dep.
    if (
      parentSuspense &&
      parentSuspense.pendingBranch &&
      !parentSuspense.isUnmounted &&
      instance.asyncDep &&
      !instance.asyncResolved &&
      instance.suspenseId === parentSuspense.pendingId
    ) {
      parentSuspense.deps--;
      if (parentSuspense.deps === 0) {
        parentSuspense.resolve();
      }
    }
    if (process.env.NODE_ENV !== "production" || __VUE_PROD_DEVTOOLS__) {
      devtoolsComponentRemoved(instance);
    }
  };
  const unmountChildren = (
    children,
    parentComponent,
    parentSuspense,
    doRemove = false,
    optimized = false,
    start = 0
  ) => {
    for (let i = start; i < children.length; i++) {
      unmount(
        children[i],
        parentComponent,
        parentSuspense,
        doRemove,
        optimized
      );
    }
  };
  const getNextHostNode = (vnode) => {
    if (vnode.shapeFlag & 6 /* ShapeFlags.COMPONENT */) {
      return getNextHostNode(vnode.component.subTree);
    }
    if (vnode.shapeFlag & 128 /* ShapeFlags.SUSPENSE */) {
      return vnode.suspense.next();
    }
    return hostNextSibling(vnode.anchor || vnode.el);
  };
  const render = (vnode, container, isSVG) => {
    if (vnode == null) {
      if (container._vnode) {
        unmount(container._vnode, null, null, true);
      }
    } else {
      patch(
        container._vnode || null,
        vnode,
        container,
        null,
        null,
        null,
        isSVG
      );
    }
    flushPreFlushCbs();
    flushPostFlushCbs();
    container._vnode = vnode;
  };
  const internals = {
    p: patch,
    um: unmount,
    m: move,
    r: remove,
    mt: mountComponent,
    mc: mountChildren,
    pc: patchChildren,
    pbc: patchBlockChildren,
    n: getNextHostNode,
    o: options,
  };
  let hydrate;
  let hydrateNode;
  if (createHydrationFns) {
    [hydrate, hydrateNode] = createHydrationFns(internals);
  }
  return {
    render,
    hydrate,
    createApp: createAppAPI(render, hydrate),
  };
}
function toggleRecurse({ effect, update }, allowed) {
  effect.allowRecurse = update.allowRecurse = allowed;
}
/**
 * #1156
 * When a component is HMR-enabled, we need to make sure that all static nodes
 * inside a block also inherit the DOM element from the previous tree so that
 * HMR updates (which are full updates) can retrieve the element for patching.
 *
 * #2080
 * Inside keyed `template` fragment static children, if a fragment is moved,
 * the children will always be moved. Therefore, in order to ensure correct move
 * position, el should be inherited from previous nodes.
 */
function traverseStaticChildren(n1, n2, shallow = false) {
  const ch1 = n1.children;
  const ch2 = n2.children;
  if (shared$2.isArray(ch1) && shared$2.isArray(ch2)) {
    for (let i = 0; i < ch1.length; i++) {
      // this is only called in the optimized path so array children are
      // guaranteed to be vnodes
      const c1 = ch1[i];
      let c2 = ch2[i];
      if (c2.shapeFlag & 1 /* ShapeFlags.ELEMENT */ && !c2.dynamicChildren) {
        if (
          c2.patchFlag <= 0 ||
          c2.patchFlag === 32 /* PatchFlags.HYDRATE_EVENTS */
        ) {
          c2 = ch2[i] = cloneIfMounted(ch2[i]);
          c2.el = c1.el;
        }
        if (!shallow) traverseStaticChildren(c1, c2);
      }
      // also inherit for comment nodes, but not placeholders (e.g. v-if which
      // would have received .el during block patch)
      if (
        process.env.NODE_ENV !== "production" &&
        c2.type === Comment$1 &&
        !c2.el
      ) {
        c2.el = c1.el;
      }
    }
  }
}
// https://en.wikipedia.org/wiki/Longest_increasing_subsequence
function getSequence(arr) {
  const p = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = (u + v) >> 1;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}

const isTeleport = (type) => type.__isTeleport;

const Fragment$1 = Symbol(
  process.env.NODE_ENV !== "production" ? "Fragment" : undefined
);
const Text = Symbol(process.env.NODE_ENV !== "production" ? "Text" : undefined);
const Comment$1 = Symbol(
  process.env.NODE_ENV !== "production" ? "Comment" : undefined
);
const Static = Symbol(
  process.env.NODE_ENV !== "production" ? "Static" : undefined
);
let currentBlock = null;
// Whether we should be tracking dynamic child nodes inside a block.
// Only tracks when this value is > 0
// We are not using a simple boolean because this value may need to be
// incremented/decremented by nested usage of v-once (see below)
let isBlockTreeEnabled = 1;
/**
 * Block tracking sometimes needs to be disabled, for example during the
 * creation of a tree that needs to be cached by v-once. The compiler generates
 * code like this:
 *
 * ``` js
 * _cache[1] || (
 *   setBlockTracking(-1),
 *   _cache[1] = createVNode(...),
 *   setBlockTracking(1),
 *   _cache[1]
 * )
 * ```
 *
 * @private
 */
function setBlockTracking$1(value) {
  isBlockTreeEnabled += value;
}
function isVNode$1(value) {
  return value ? value.__v_isVNode === true : false;
}
function isSameVNodeType(n1, n2) {
  if (
    process.env.NODE_ENV !== "production" &&
    n2.shapeFlag & 6 /* ShapeFlags.COMPONENT */ &&
    hmrDirtyComponents.has(n2.type)
  ) {
    // HMR only: if the component has been hot-updated, force a reload.
    return false;
  }
  return n1.type === n2.type && n1.key === n2.key;
}
const createVNodeWithArgsTransform = (...args) => {
  return _createVNode(...args);
};
const InternalObjectKey = `__vInternal`;
const normalizeKey = ({ key }) => (key != null ? key : null);
const normalizeRef = ({ ref, ref_key, ref_for }) => {
  return ref != null
    ? shared$2.isString(ref) || isRef(ref) || shared$2.isFunction(ref)
      ? { i: currentRenderingInstance$1, r: ref, k: ref_key, f: !!ref_for }
      : ref
    : null;
};
function createBaseVNode(
  type,
  props = null,
  children = null,
  patchFlag = 0,
  dynamicProps = null,
  shapeFlag = type === Fragment$1 ? 0 : 1 /* ShapeFlags.ELEMENT */,
  isBlockNode = false,
  needFullChildrenNormalization = false
) {
  const vnode = {
    __v_isVNode: true,
    __v_skip: true,
    type,
    props,
    key: props && normalizeKey(props),
    ref: props && normalizeRef(props),
    scopeId: currentScopeId,
    slotScopeIds: null,
    children,
    component: null,
    suspense: null,
    ssContent: null,
    ssFallback: null,
    dirs: null,
    transition: null,
    el: null,
    anchor: null,
    target: null,
    targetAnchor: null,
    staticCount: 0,
    shapeFlag,
    patchFlag,
    dynamicProps,
    dynamicChildren: null,
    appContext: null,
  };
  if (needFullChildrenNormalization) {
    normalizeChildren(vnode, children);
    // normalize suspense children
    if (shapeFlag & 128 /* ShapeFlags.SUSPENSE */) {
      type.normalize(vnode);
    }
  } else if (children) {
    // compiled element vnode - if children is passed, only possible types are
    // string or Array.
    vnode.shapeFlag |= shared$2.isString(children)
      ? 8 /* ShapeFlags.TEXT_CHILDREN */
      : 16 /* ShapeFlags.ARRAY_CHILDREN */;
  }
  // validate key
  if (process.env.NODE_ENV !== "production" && vnode.key !== vnode.key) {
    warn(`VNode created with invalid key (NaN). VNode type:`, vnode.type);
  }
  // track vnode for block tree
  if (
    isBlockTreeEnabled > 0 &&
    // avoid a block node from tracking itself
    !isBlockNode &&
    // has current parent block
    currentBlock &&
    // presence of a patch flag indicates this node needs patching on updates.
    // component nodes also should always be patched, because even if the
    // component doesn't need to update, it needs to persist the instance on to
    // the next vnode so that it can be properly unmounted later.
    (vnode.patchFlag > 0 || shapeFlag & 6) /* ShapeFlags.COMPONENT */ &&
    // the EVENTS flag is only for hydration and if it is the only flag, the
    // vnode should not be considered dynamic due to handler caching.
    vnode.patchFlag !== 32 /* PatchFlags.HYDRATE_EVENTS */
  ) {
    currentBlock.push(vnode);
  }
  return vnode;
}
const createVNode$1 =
  process.env.NODE_ENV !== "production"
    ? createVNodeWithArgsTransform
    : _createVNode;
function _createVNode(
  type,
  props = null,
  children = null,
  patchFlag = 0,
  dynamicProps = null,
  isBlockNode = false
) {
  if (!type || type === NULL_DYNAMIC_COMPONENT) {
    if (process.env.NODE_ENV !== "production" && !type) {
      warn(`Invalid vnode type when creating vnode: ${type}.`);
    }
    type = Comment$1;
  }
  if (isVNode$1(type)) {
    // createVNode receiving an existing vnode. This happens in cases like
    // <component :is="vnode"/>
    // #2078 make sure to merge refs during the clone instead of overwriting it
    const cloned = cloneVNode$1(type, props, true /* mergeRef: true */);
    if (children) {
      normalizeChildren(cloned, children);
    }
    if (isBlockTreeEnabled > 0 && !isBlockNode && currentBlock) {
      if (cloned.shapeFlag & 6 /* ShapeFlags.COMPONENT */) {
        currentBlock[currentBlock.indexOf(type)] = cloned;
      } else {
        currentBlock.push(cloned);
      }
    }
    cloned.patchFlag |= -2 /* PatchFlags.BAIL */;
    return cloned;
  }
  // class component normalization.
  if (isClassComponent(type)) {
    type = type.__vccOpts;
  }
  // class & style normalization.
  if (props) {
    // for reactive or proxy objects, we need to clone it to enable mutation.
    props = guardReactiveProps(props);
    let { class: klass, style } = props;
    if (klass && !shared$2.isString(klass)) {
      props.class = shared$2.normalizeClass(klass);
    }
    if (shared$2.isObject(style)) {
      // reactive state objects need to be cloned since they are likely to be
      // mutated
      if (isProxy(style) && !shared$2.isArray(style)) {
        style = shared$2.extend({}, style);
      }
      props.style = shared$2.normalizeStyle(style);
    }
  }
  // encode the vnode type information into a bitmap
  const shapeFlag = shared$2.isString(type)
    ? 1 /* ShapeFlags.ELEMENT */
    : isSuspense(type)
    ? 128 /* ShapeFlags.SUSPENSE */
    : isTeleport(type)
    ? 64 /* ShapeFlags.TELEPORT */
    : shared$2.isObject(type)
    ? 4 /* ShapeFlags.STATEFUL_COMPONENT */
    : shared$2.isFunction(type)
    ? 2 /* ShapeFlags.FUNCTIONAL_COMPONENT */
    : 0;
  if (
    process.env.NODE_ENV !== "production" &&
    shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */ &&
    isProxy(type)
  ) {
    type = toRaw(type);
    warn(
      `Vue received a Component which was made a reactive object. This can ` +
        `lead to unnecessary performance overhead, and should be avoided by ` +
        `marking the component with \`markRaw\` or using \`shallowRef\` ` +
        `instead of \`ref\`.`,
      `\nComponent that was made reactive: `,
      type
    );
  }
  return createBaseVNode(
    type,
    props,
    children,
    patchFlag,
    dynamicProps,
    shapeFlag,
    isBlockNode,
    true
  );
}
function guardReactiveProps(props) {
  if (!props) return null;
  return isProxy(props) || InternalObjectKey in props
    ? shared$2.extend({}, props)
    : props;
}
function cloneVNode$1(vnode, extraProps, mergeRef = false) {
  // This is intentionally NOT using spread or extend to avoid the runtime
  // key enumeration cost.
  const { props, ref, patchFlag, children } = vnode;
  const mergedProps = extraProps ? mergeProps(props || {}, extraProps) : props;
  const cloned = {
    __v_isVNode: true,
    __v_skip: true,
    type: vnode.type,
    props: mergedProps,
    key: mergedProps && normalizeKey(mergedProps),
    ref:
      extraProps && extraProps.ref
        ? // #2078 in the case of <component :is="vnode" ref="extra"/>
          // if the vnode itself already has a ref, cloneVNode will need to merge
          // the refs so the single vnode can be set on multiple refs
          mergeRef && ref
          ? shared$2.isArray(ref)
            ? ref.concat(normalizeRef(extraProps))
            : [ref, normalizeRef(extraProps)]
          : normalizeRef(extraProps)
        : ref,
    scopeId: vnode.scopeId,
    slotScopeIds: vnode.slotScopeIds,
    children:
      process.env.NODE_ENV !== "production" &&
      patchFlag === -1 /* PatchFlags.HOISTED */ &&
      shared$2.isArray(children)
        ? children.map(deepCloneVNode)
        : children,
    target: vnode.target,
    targetAnchor: vnode.targetAnchor,
    staticCount: vnode.staticCount,
    shapeFlag: vnode.shapeFlag,
    // if the vnode is cloned with extra props, we can no longer assume its
    // existing patch flag to be reliable and need to add the FULL_PROPS flag.
    // note: preserve flag for fragments since they use the flag for children
    // fast paths only.
    patchFlag:
      extraProps && vnode.type !== Fragment$1
        ? patchFlag === -1 // hoisted node
          ? 16 /* PatchFlags.FULL_PROPS */
          : patchFlag | 16 /* PatchFlags.FULL_PROPS */
        : patchFlag,
    dynamicProps: vnode.dynamicProps,
    dynamicChildren: vnode.dynamicChildren,
    appContext: vnode.appContext,
    dirs: vnode.dirs,
    transition: vnode.transition,
    // These should technically only be non-null on mounted VNodes. However,
    // they *should* be copied for kept-alive vnodes. So we just always copy
    // them since them being non-null during a mount doesn't affect the logic as
    // they will simply be overwritten.
    component: vnode.component,
    suspense: vnode.suspense,
    ssContent: vnode.ssContent && cloneVNode$1(vnode.ssContent),
    ssFallback: vnode.ssFallback && cloneVNode$1(vnode.ssFallback),
    el: vnode.el,
    anchor: vnode.anchor,
  };
  return cloned;
}
/**
 * Dev only, for HMR of hoisted vnodes reused in v-for
 * https://github.com/vitejs/vite/issues/2022
 */
function deepCloneVNode(vnode) {
  const cloned = cloneVNode$1(vnode);
  if (shared$2.isArray(vnode.children)) {
    cloned.children = vnode.children.map(deepCloneVNode);
  }
  return cloned;
}
/**
 * @private
 */
function createTextVNode$1(text = " ", flag = 0) {
  return createVNode$1(Text, null, text, flag);
}
function normalizeVNode(child) {
  if (child == null || typeof child === "boolean") {
    // empty placeholder
    return createVNode$1(Comment$1);
  } else if (shared$2.isArray(child)) {
    // fragment
    return createVNode$1(
      Fragment$1,
      null,
      // #3666, avoid reference pollution when reusing vnode
      child.slice()
    );
  } else if (typeof child === "object") {
    // already vnode, this should be the most common since compiled templates
    // always produce all-vnode children arrays
    return cloneIfMounted(child);
  } else {
    // strings and numbers
    return createVNode$1(Text, null, String(child));
  }
}
// optimized normalization for template-compiled render fns
function cloneIfMounted(child) {
  return (child.el === null &&
    child.patchFlag !== -1) /* PatchFlags.HOISTED */ ||
    child.memo
    ? child
    : cloneVNode$1(child);
}
function normalizeChildren(vnode, children) {
  let type = 0;
  const { shapeFlag } = vnode;
  if (children == null) {
    children = null;
  } else if (shared$2.isArray(children)) {
    type = 16 /* ShapeFlags.ARRAY_CHILDREN */;
  } else if (typeof children === "object") {
    if (
      shapeFlag &
      (1 /* ShapeFlags.ELEMENT */ | 64) /* ShapeFlags.TELEPORT */
    ) {
      // Normalize slot to plain children for plain element and Teleport
      const slot = children.default;
      if (slot) {
        // _c marker is added by withCtx() indicating this is a compiled slot
        slot._c && (slot._d = false);
        normalizeChildren(vnode, slot());
        slot._c && (slot._d = true);
      }
      return;
    } else {
      type = 32 /* ShapeFlags.SLOTS_CHILDREN */;
      const slotFlag = children._;
      if (!slotFlag && !(InternalObjectKey in children)) {
        children._ctx = currentRenderingInstance$1;
      } else if (
        slotFlag === 3 /* SlotFlags.FORWARDED */ &&
        currentRenderingInstance$1
      ) {
        // a child component receives forwarded slots from the parent.
        // its slot type is determined by its parent's slot type.
        if (currentRenderingInstance$1.slots._ === 1 /* SlotFlags.STABLE */) {
          children._ = 1 /* SlotFlags.STABLE */;
        } else {
          children._ = 2 /* SlotFlags.DYNAMIC */;
          vnode.patchFlag |= 1024 /* PatchFlags.DYNAMIC_SLOTS */;
        }
      }
    }
  } else if (shared$2.isFunction(children)) {
    children = { default: children, _ctx: currentRenderingInstance$1 };
    type = 32 /* ShapeFlags.SLOTS_CHILDREN */;
  } else {
    children = String(children);
    // force teleport children to array so it can be moved around
    if (shapeFlag & 64 /* ShapeFlags.TELEPORT */) {
      type = 16 /* ShapeFlags.ARRAY_CHILDREN */;
      children = [createTextVNode$1(children)];
    } else {
      type = 8 /* ShapeFlags.TEXT_CHILDREN */;
    }
  }
  vnode.children = children;
  vnode.shapeFlag |= type;
}
function mergeProps(...args) {
  const ret = {};
  for (let i = 0; i < args.length; i++) {
    const toMerge = args[i];
    for (const key in toMerge) {
      if (key === "class") {
        if (ret.class !== toMerge.class) {
          ret.class = shared$2.normalizeClass([ret.class, toMerge.class]);
        }
      } else if (key === "style") {
        ret.style = shared$2.normalizeStyle([ret.style, toMerge.style]);
      } else if (shared$2.isOn(key)) {
        const existing = ret[key];
        const incoming = toMerge[key];
        if (
          incoming &&
          existing !== incoming &&
          !(shared$2.isArray(existing) && existing.includes(incoming))
        ) {
          ret[key] = existing ? [].concat(existing, incoming) : incoming;
        }
      } else if (key !== "") {
        ret[key] = toMerge[key];
      }
    }
  }
  return ret;
}
function invokeVNodeHook(hook, instance, vnode, prevVNode = null) {
  callWithAsyncErrorHandling(hook, instance, 7 /* ErrorCodes.VNODE_HOOK */, [
    vnode,
    prevVNode,
  ]);
}

const emptyAppContext = createAppContext();
let uid$1 = 0;
function createComponentInstance(vnode, parent, suspense) {
  const type = vnode.type;
  // inherit parent app context - or - if root, adopt from root vnode
  const appContext =
    (parent ? parent.appContext : vnode.appContext) || emptyAppContext;
  const instance = {
    uid: uid$1++,
    vnode,
    type,
    parent,
    appContext,
    root: null,
    next: null,
    subTree: null,
    effect: null,
    update: null,
    scope: new EffectScope(true /* detached */),
    render: null,
    proxy: null,
    exposed: null,
    exposeProxy: null,
    withProxy: null,
    provides: parent ? parent.provides : Object.create(appContext.provides),
    accessCache: null,
    renderCache: [],
    // local resolved assets
    components: null,
    directives: null,
    // resolved props and emits options
    propsOptions: normalizePropsOptions(type, appContext),
    emitsOptions: normalizeEmitsOptions(type, appContext),
    // emit
    emit: null,
    emitted: null,
    // props default value
    propsDefaults: shared$2.EMPTY_OBJ,
    // inheritAttrs
    inheritAttrs: type.inheritAttrs,
    // state
    ctx: shared$2.EMPTY_OBJ,
    data: shared$2.EMPTY_OBJ,
    props: shared$2.EMPTY_OBJ,
    attrs: shared$2.EMPTY_OBJ,
    slots: shared$2.EMPTY_OBJ,
    refs: shared$2.EMPTY_OBJ,
    setupState: shared$2.EMPTY_OBJ,
    setupContext: null,
    // suspense related
    suspense,
    suspenseId: suspense ? suspense.pendingId : 0,
    asyncDep: null,
    asyncResolved: false,
    // lifecycle hooks
    // not using enums here because it results in computed properties
    isMounted: false,
    isUnmounted: false,
    isDeactivated: false,
    bc: null,
    c: null,
    bm: null,
    m: null,
    bu: null,
    u: null,
    um: null,
    bum: null,
    da: null,
    a: null,
    rtg: null,
    rtc: null,
    ec: null,
    sp: null,
  };
  if (process.env.NODE_ENV !== "production") {
    instance.ctx = createDevRenderContext(instance);
  } else {
    instance.ctx = { _: instance };
  }
  instance.root = parent ? parent.root : instance;
  instance.emit = emit$1.bind(null, instance);
  // apply custom element special handling
  if (vnode.ce) {
    vnode.ce(instance);
  }
  return instance;
}
let currentInstance = null;
const setCurrentInstance$2 = (instance) => {
  currentInstance = instance;
  instance.scope.on();
};
const unsetCurrentInstance = () => {
  currentInstance && currentInstance.scope.off();
  currentInstance = null;
};
const isBuiltInTag = /*#__PURE__*/ shared$2.makeMap("slot,component");
function validateComponentName(name, config) {
  const appIsNativeTag = config.isNativeTag || shared$2.NO;
  if (isBuiltInTag(name) || appIsNativeTag(name)) {
    warn(
      "Do not use built-in or reserved HTML elements as component id: " + name
    );
  }
}
function isStatefulComponent(instance) {
  return instance.vnode.shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */;
}
let isInSSRComponentSetup = false;
function setupComponent(instance, isSSR = false) {
  isInSSRComponentSetup = isSSR;
  const { props, children } = instance.vnode;
  const isStateful = isStatefulComponent(instance);
  initProps(instance, props, isStateful, isSSR);
  initSlots(instance, children);
  const setupResult = isStateful
    ? setupStatefulComponent(instance, isSSR)
    : undefined;
  isInSSRComponentSetup = false;
  return setupResult;
}
function setupStatefulComponent(instance, isSSR) {
  var _a;
  const Component = instance.type;
  if (process.env.NODE_ENV !== "production") {
    if (Component.name) {
      validateComponentName(Component.name, instance.appContext.config);
    }
    if (Component.components) {
      const names = Object.keys(Component.components);
      for (let i = 0; i < names.length; i++) {
        validateComponentName(names[i], instance.appContext.config);
      }
    }
    if (Component.directives) {
      const names = Object.keys(Component.directives);
      for (let i = 0; i < names.length; i++) {
        validateDirectiveName(names[i]);
      }
    }
    if (Component.compilerOptions && isRuntimeOnly()) {
      warn(
        `"compilerOptions" is only supported when using a build of Vue that ` +
          `includes the runtime compiler. Since you are using a runtime-only ` +
          `build, the options should be passed via your build tool config instead.`
      );
    }
  }
  // 0. create render proxy property access cache
  instance.accessCache = Object.create(null);
  // 1. create public instance / render proxy
  // also mark it raw so it's never observed
  instance.proxy = markRaw(
    new Proxy(instance.ctx, PublicInstanceProxyHandlers)
  );
  if (process.env.NODE_ENV !== "production") {
    exposePropsOnRenderContext(instance);
  }
  // 2. call setup()
  const { setup } = Component;
  if (setup) {
    const setupContext = (instance.setupContext =
      setup.length > 1 ? createSetupContext(instance) : null);
    setCurrentInstance$2(instance);
    pauseTracking();
    const setupResult = callWithErrorHandling(
      setup,
      instance,
      0 /* ErrorCodes.SETUP_FUNCTION */,
      [
        process.env.NODE_ENV !== "production"
          ? shallowReadonly(instance.props)
          : instance.props,
        setupContext,
      ]
    );
    resetTracking();
    unsetCurrentInstance();
    if (shared$2.isPromise(setupResult)) {
      setupResult.then(unsetCurrentInstance, unsetCurrentInstance);
      if (isSSR) {
        // return the promise so server-renderer can wait on it
        return setupResult
          .then((resolvedResult) => {
            handleSetupResult(instance, resolvedResult, isSSR);
          })
          .catch((e) => {
            handleError$1(e, instance, 0 /* ErrorCodes.SETUP_FUNCTION */);
          });
      } else {
        // async setup returned Promise.
        // bail here and wait for re-entry.
        instance.asyncDep = setupResult;
        if (process.env.NODE_ENV !== "production" && !instance.suspense) {
          const name =
            (_a = Component.name) !== null && _a !== void 0 ? _a : "Anonymous";
          warn(
            `Component <${name}>: setup function returned a promise, but no ` +
              `<Suspense> boundary was found in the parent component tree. ` +
              `A component with async setup() must be nested in a <Suspense> ` +
              `in order to be rendered.`
          );
        }
      }
    } else {
      handleSetupResult(instance, setupResult, isSSR);
    }
  } else {
    finishComponentSetup(instance, isSSR);
  }
}
function handleSetupResult(instance, setupResult, isSSR) {
  if (shared$2.isFunction(setupResult)) {
    // setup returned an inline render function
    if (instance.type.__ssrInlineRender) {
      // when the function's name is `ssrRender` (compiled by SFC inline mode),
      // set it as ssrRender instead.
      instance.ssrRender = setupResult;
    } else {
      instance.render = setupResult;
    }
  } else if (shared$2.isObject(setupResult)) {
    if (process.env.NODE_ENV !== "production" && isVNode$1(setupResult)) {
      warn(
        `setup() should not return VNodes directly - ` +
          `return a render function instead.`
      );
    }
    // setup returned bindings.
    // assuming a render function compiled from template is present.
    if (process.env.NODE_ENV !== "production" || __VUE_PROD_DEVTOOLS__) {
      instance.devtoolsRawSetupState = setupResult;
    }
    instance.setupState = proxyRefs(setupResult);
    if (process.env.NODE_ENV !== "production") {
      exposeSetupStateOnRenderContext(instance);
    }
  } else if (
    process.env.NODE_ENV !== "production" &&
    setupResult !== undefined
  ) {
    warn(
      `setup() should return an object. Received: ${
        setupResult === null ? "null" : typeof setupResult
      }`
    );
  }
  finishComponentSetup(instance, isSSR);
}
let compile;
// dev only
const isRuntimeOnly = () => !compile;
function finishComponentSetup(instance, isSSR, skipOptions) {
  const Component = instance.type;
  // template / render function normalization
  // could be already set when returned from setup()
  if (!instance.render) {
    // only do on-the-fly compile if not in SSR - SSR on-the-fly compilation
    // is done by server-renderer
    if (!isSSR && compile && !Component.render) {
      const template =
        Component.template || resolveMergedOptions(instance).template;
      if (template) {
        if (process.env.NODE_ENV !== "production") {
          startMeasure(instance, `compile`);
        }
        const { isCustomElement, compilerOptions } = instance.appContext.config;
        const { delimiters, compilerOptions: componentCompilerOptions } =
          Component;
        const finalCompilerOptions = shared$2.extend(
          shared$2.extend(
            {
              isCustomElement,
              delimiters,
            },
            compilerOptions
          ),
          componentCompilerOptions
        );
        Component.render = compile(template, finalCompilerOptions);
        if (process.env.NODE_ENV !== "production") {
          endMeasure(instance, `compile`);
        }
      }
    }
    instance.render = Component.render || shared$2.NOOP;
  }
  // support for 2.x options
  if (__VUE_OPTIONS_API__ && !false) {
    setCurrentInstance$2(instance);
    pauseTracking();
    applyOptions(instance);
    resetTracking();
    unsetCurrentInstance();
  }
  // warn missing template/render
  // the runtime compilation of template in SSR is done by server-render
  if (
    process.env.NODE_ENV !== "production" &&
    !Component.render &&
    instance.render === shared$2.NOOP &&
    !isSSR
  ) {
    /* istanbul ignore if */
    if (Component.template) {
      warn(
        `Component provided template option but ` +
          `runtime compilation is not supported in this build of Vue.` +
          ` Configure your bundler to alias "vue" to "vue/dist/vue.esm-bundler.js".` /* should not happen */
      );
    } else {
      warn(`Component is missing template or render function.`);
    }
  }
}
function createAttrsProxy(instance) {
  return new Proxy(
    instance.attrs,
    process.env.NODE_ENV !== "production"
      ? {
          get(target, key) {
            markAttrsAccessed();
            track(instance, "get" /* TrackOpTypes.GET */, "$attrs");
            return target[key];
          },
          set() {
            warn(`setupContext.attrs is readonly.`);
            return false;
          },
          deleteProperty() {
            warn(`setupContext.attrs is readonly.`);
            return false;
          },
        }
      : {
          get(target, key) {
            track(instance, "get" /* TrackOpTypes.GET */, "$attrs");
            return target[key];
          },
        }
  );
}
function createSetupContext(instance) {
  const expose = (exposed) => {
    if (process.env.NODE_ENV !== "production" && instance.exposed) {
      warn(`expose() should be called only once per setup().`);
    }
    instance.exposed = exposed || {};
  };
  let attrs;
  if (process.env.NODE_ENV !== "production") {
    // We use getters in dev in case libs like test-utils overwrite instance
    // properties (overwrites should not be done in prod)
    return Object.freeze({
      get attrs() {
        return attrs || (attrs = createAttrsProxy(instance));
      },
      get slots() {
        return shallowReadonly(instance.slots);
      },
      get emit() {
        return (event, ...args) => instance.emit(event, ...args);
      },
      expose,
    });
  } else {
    return {
      get attrs() {
        return attrs || (attrs = createAttrsProxy(instance));
      },
      slots: instance.slots,
      emit: instance.emit,
      expose,
    };
  }
}
function getExposeProxy(instance) {
  if (instance.exposed) {
    return (
      instance.exposeProxy ||
      (instance.exposeProxy = new Proxy(proxyRefs(markRaw(instance.exposed)), {
        get(target, key) {
          if (key in target) {
            return target[key];
          } else if (key in publicPropertiesMap) {
            return publicPropertiesMap[key](instance);
          }
        },
      }))
    );
  }
}
const classifyRE = /(?:^|[-_])(\w)/g;
const classify = (str) =>
  str.replace(classifyRE, (c) => c.toUpperCase()).replace(/[-_]/g, "");
function getComponentName(Component, includeInferred = true) {
  return shared$2.isFunction(Component)
    ? Component.displayName || Component.name
    : Component.name || (includeInferred && Component.__name);
}
/* istanbul ignore next */
function formatComponentName(instance, Component, isRoot = false) {
  let name = getComponentName(Component);
  if (!name && Component.__file) {
    const match = Component.__file.match(/([^/\\]+)\.\w+$/);
    if (match) {
      name = match[1];
    }
  }
  if (!name && instance && instance.parent) {
    // try to infer the name based on reverse resolution
    const inferFromRegistry = (registry) => {
      for (const key in registry) {
        if (registry[key] === Component) {
          return key;
        }
      }
    };
    name =
      inferFromRegistry(
        instance.components || instance.parent.type.components
      ) || inferFromRegistry(instance.appContext.components);
  }
  return name ? classify(name) : isRoot ? `App` : `Anonymous`;
}
function isClassComponent(value) {
  return shared$2.isFunction(value) && "__vccOpts" in value;
}

const computed = (getterOrOptions, debugOptions) => {
  // @ts-ignore
  return computed$1(getterOrOptions, debugOptions, isInSSRComponentSetup);
};

// dev only
const warnRuntimeUsage = (method) =>
  warn(
    `${method}() is a compiler-hint helper that is only usable inside ` +
      `<script setup> of a single file component. Its arguments should be ` +
      `compiled away and passing it at runtime has no effect.`
  );
// implementation
function defineProps() {
  if (process.env.NODE_ENV !== "production") {
    warnRuntimeUsage(`defineProps`);
  }
  return null;
}
// implementation
function defineEmits() {
  if (process.env.NODE_ENV !== "production") {
    warnRuntimeUsage(`defineEmits`);
  }
  return null;
}
/**
 * Vue `<script setup>` compiler macro for declaring a component's exposed
 * instance properties when it is accessed by a parent component via template
 * refs.
 *
 * `<script setup>` components are closed by default - i.e. variables inside
 * the `<script setup>` scope is not exposed to parent unless explicitly exposed
 * via `defineExpose`.
 *
 * This is only usable inside `<script setup>`, is compiled away in the
 * output and should **not** be actually called at runtime.
 */
function defineExpose(exposed) {
  if (process.env.NODE_ENV !== "production") {
    warnRuntimeUsage(`defineExpose`);
  }
}
/**
 * Vue `<script setup>` compiler macro for providing props default values when
 * using type-based `defineProps` declaration.
 *
 * Example usage:
 * ```ts
 * withDefaults(defineProps<{
 *   size?: number
 *   labels?: string[]
 * }>(), {
 *   size: 3,
 *   labels: () => ['default label']
 * })
 * ```
 *
 * This is only usable inside `<script setup>`, is compiled away in the output
 * and should **not** be actually called at runtime.
 */
function withDefaults(props, defaults) {
  if (process.env.NODE_ENV !== "production") {
    warnRuntimeUsage(`withDefaults`);
  }
  return null;
}
/**
 * Runtime helper for merging default declarations. Imported by compiled code
 * only.
 * @internal
 */
function mergeDefaults(raw, defaults) {
  const props = shared$2.isArray(raw)
    ? raw.reduce((normalized, p) => ((normalized[p] = {}), normalized), {})
    : raw;
  for (const key in defaults) {
    const opt = props[key];
    if (opt) {
      if (shared$2.isArray(opt) || shared$2.isFunction(opt)) {
        props[key] = { type: opt, default: defaults[key] };
      } else {
        opt.default = defaults[key];
      }
    } else if (opt === null) {
      props[key] = { default: defaults[key] };
    } else if (process.env.NODE_ENV !== "production") {
      warn(`props default key "${key}" has no corresponding declaration.`);
    }
  }
  return props;
}

const ssrContextKey = Symbol(
  process.env.NODE_ENV !== "production" ? `ssrContext` : ``
);
function isMemoSame(cached, memo) {
  const prev = cached.memo;
  if (prev.length != memo.length) {
    return false;
  }
  for (let i = 0; i < prev.length; i++) {
    if (shared$2.hasChanged(prev[i], memo[i])) {
      return false;
    }
  }
  // make sure to let parent block track it when returning cached
  if (isBlockTreeEnabled > 0 && currentBlock) {
    currentBlock.push(cached);
  }
  return true;
}

// Core API ------------------------------------------------------------------
const version = "3.2.40";
const _ssrUtils = {
  createComponentInstance,
  setupComponent,
  renderComponentRoot,
  setCurrentRenderingInstance,
  isVNode: isVNode$1,
  normalizeVNode,
};
/**
 * SSR utils for \@vue/server-renderer. Only exposed in ssr-possible builds.
 * @internal
 */
const ssrUtils = _ssrUtils;
/**
 * @internal only exposed in compat builds.
 */
const compatUtils = null;

// ------------------------------------------------------------
// from dom package:

const modifierGuards = {
  stop: (e) => e.stopPropagation(),
  prevent: (e) => e.preventDefault(),
  self: (e) => e.target !== e.currentTarget,
  ctrl: (e) => !e.ctrlKey,
  shift: (e) => !e.shiftKey,
  alt: (e) => !e.altKey,
  meta: (e) => !e.metaKey,
  left: (e) => "button" in e && e.button !== 0,
  middle: (e) => "button" in e && e.button !== 1,
  right: (e) => "button" in e && e.button !== 2,
  exact: () => false,
};
/**
 * @private
 */
function withModifiers(fn, modifiers) {
  return (event, ...args) => {
    for (let i = 0; i < modifiers.length; i++) {
      const guard = modifierGuards[modifiers[i]];
      if (guard && guard(event, modifiers)) return;
    }
    return fn(event, ...args);
  };
}

function matches(pattern, name) {
  if (shared__default["default"].isArray(pattern)) {
    return pattern.some((p) => matches(p, name));
  } else if (shared__default["default"].isString(pattern)) {
    return pattern.split(",").includes(name);
  } else if (pattern.test) {
    return pattern.test(name);
  }

  /* istanbul ignore next */
  return false;
}

class KeepAlive extends React__default["default"].PureComponent {
  #instances = [];

  #instance_names = {};

  #reverse_instance_names = [];

  #on_ref = [];

  #refs = [];

  #current = undefined;

  getInstance(name, child) {
    if (this.props.include && !matches(this.props.include, name)) {
      return -1;
    } else if (this.props.exclude && matches(this.props.exclude, name)) {
      return -1;
    } else if (this.props.max <= 1) {
      return -1;
    }

    var index = this.#instance_names[name];
    if (this.#current != index) {
      const old = this.#refs[this.#current];
      old && old.emit_hook && old.emit_hook("deactivated");
    }

    if (index === undefined) {
      index = this.#instances.length;
      this.#instance_names[name] = index;

      this.#reverse_instance_names.push(name);
      this.#refs.push(null);

      this.#on_ref.push((e) => {
        this.#refs[index] = e;
      });

      child = React__default["default"].cloneElement(child, {
        ref: this.#on_ref[index],
      });

      this.#instances.push(child);
      if (this.props.max && this.#instances.length > this.props.max) {
        this.shift();
      }
    } else {
      child = React__default["default"].cloneElement(child, {
        ref: this.#on_ref[index],
      });
      this.#instances[index] = child;

      if (index != this.#current) {
        const item = this.#refs[index];
        item && item.emit_hook && item.emit_hook("activated");
      }
    }

    this.#current = index;
    return index;
  }

  shift() {
    const name = this.#reverse_instance_names[0];
    this.#instances.shift();
    this.#reverse_instance_names.shift();
    this.#on_ref.shift();
    this.#refs.shift();
    delete this.#instance_names[name];
  }

  render() {
    if (!this.props.children) {
      return null;
    }

    if (
      __DEV__ &&
      Array.isArray(this.props.children) &&
      this.props.children.length > 1
    ) {
      if (!this._logged) {
        console.warn("KeepAlive should have only one child");
        this._logged = true;
      }

      return this.props.children;
    } else if (__DEV__) {
      this._logged = false;
    }

    var child = this.props.children;
    var type = child.type || {};
    var name =
      child.key ||
      this.props.name ||
      type.displayName ||
      type.name ||
      (type.render && (type.render.displayName || type.render.name)) ||
      "Unknown";

    var instance = this.getInstance(name, child);

    // ----

    const childs = [];
    for (var i in this.#instances) {
      var style = Object.create(this.props.style || {});
      if (i != instance) {
        style.display = "none";
      }

      childs.push(
        React__default["default"].createElement(
          reactNative.View,
          { key: i, style },
          this.#instances[i]
        )
      );
    }

    return childs;
  }
}

function handleError(err, instance, type, throwInDev = true) {
  const cb = instance?.$captureError;
  if (cb && cb(err, instance, type)) {
    return;
  }

  // ToDo emit to global handler if configured

  console.error("unhandled vue error", type, err);

  if (throwInDev && __DEV__) {
    throw err;
  }
}

class Suspense extends React__default["default"].PureComponent {
  #fallbackTimeout = null;

  #renderers = {};

  state = {
    show_fallback: true,
    has_pending_deps: false,
  };

  constructor(props) {
    super(props);

    const timeout = parseInt(props.timeout);
    if (timeout > 0 && !isNaN(timeout) && isFinite(timeout)) {
      this.state.show_fallback = false;

      this.#fallbackTimeout = setTimeout(() => {
        this.setState({ show_fallback: true });
        this.#fallbackTimeout = null;
      }, timeout);
    }
  }

  get children() {
    var { children, $slots } = this.props;
    if ($slots && $slots.default) children = $slots.default();

    if (!Array.isArray(children)) children = [children];

    return children;
  }

  componentWillUnmount() {
    clearTimeout(this.#fallbackTimeout);
  }

  render() {
    const children = this.children;
    var resolved = true;
    var loaderStarted = false;
    var showing = [];

    // resolves react async dependencies
    for (var i in children) {
      var child = children[i];
      if (this.#renderers[i]) {
        try {
          showing[i] = this.#renderers[i](child.props);
        } catch (e) {
          handleError(e, this.props.$parent, "Suspense");
        }

        continue;
      }

      if (!child || !child.type || !child.type._init || !child.type._payload) {
        showing[i] = child;
        continue;
      }

      showing[i] = null;

      // child should only init once
      if (!this.#renderers[i]) {
        this.#renderers[i] = () => null;

        try {
          var R = child.type._init(child.type._payload, true, child.props);

          if (typeof R == "function")
            this.#renderers[i] = (props) =>
              React__default["default"].createElement(
                R,
                props,
                props.children || null
              );
          else this.#renderers[i] = () => null;
        } catch (e) {
          if (!e?.then) {
            handleError(e, this.props.$parent, "Suspense");
            continue;
          }

          resolved = false;
          this.state.has_pending_deps = true;
          loaderStarted = true;

          var index = i;

          e.then((r) => {
            this.#renderers[index] = r?.default || r;
            this.setState({ has_pending_deps: false });
          }).catch((e) => {
            handleError(e, this.props.$parent, "Suspense");
          });
        }
      }

      try {
        showing[i] = this.#renderers[i](child.props);
      } catch (e) {
        handleError(e, this.props.$parent, "Suspense");
      }
    }

    if (loaderStarted && this.props.onPending) this.props.onPending();

    if (resolved) {
      if (!this.state.resolve_emiited && this.props.onResolve) {
        this.props.onResolve();
        this.state.resolve_emiited = true;
      }

      return React__default["default"].createElement(
        React__default["default"].Fragment,
        {},
        ...showing
      );
    }

    // show fallback
    if (!this.state.show_fallback) return null;

    var fallback = null;

    if (this.props.$slots?.fallback) {
      fallback = this.props.$slots?.fallback();
      fallback = React__default["default"].createElement(
        React__default["default"].Fragment,
        {},
        ...fallback
      );
    }

    if (this.props.fallback) {
      fallback = this.props.fallback;
    }

    if (fallback !== null && !this.state.fallback_emitted) {
      this.state.fallback_emitted = true;
      this.props.onFallback && this.props.onFallback();
    }

    return fallback;
  }
}

Suspense.$slots = true;

// --------------------

function defineAsyncComponent(options) {
  if (typeof options == "function") {
    options = { loader: options };
  }

  if (options.delay === undefined) options.delay = 200;

  var setters = {};
  var id = 0;
  var attempts = 1;

  const payload = {
    _result: null,
    _status: -1,
  };

  function start_loader(onDone, $parent) {
    payload._status = 0;

    // start async process
    options
      .loader()
      .then((r) => {
        payload._result = r.default;
        payload._status = 1;
        return null;
      })
      .catch((err) => {
        if (options.onError) {
          var retry = false;
          options.onError(
            err,
            () => {
              retry = true;
            },
            () => {},
            attempts
          );

          if (retry) {
            attempts++;
            setImmediate(start_loader.bind(this, onDone, $parent));
            throw "retry";
          }
        } else {
          handleError(err, $parent, "AsyncComponent");
        }

        onDone();
        payload._result = () => null;
        payload._status = 2;

        return options.errorComponent
          ? React__default["default"].createElement(options.errorComponent)
          : null;
      })
      .then((res) => {
        onDone();
        var n = setters;
        setters = null;

        for (var i in n) {
          n[i](res);
        }
      })
      .catch((e) => {
        if (e == "retry") return;

        onDone();
        handleError(e, $parent, "AsyncComponent");
      });
  }

  function _fallback(Fallback) {
    if (setters === null) return;

    for (var i in setters) {
      setters[i](React__default["default"].createElement(Fallback));
    }
  }

  // create render function that will handle states till async component is loaded
  payload._result = function render(props) {
    const [data, setData] = React.useState({
      id: id++,
      component:
        options.loadingComponent && options.delay <= 0
          ? React__default["default"].createElement(options.loadingComponent)
          : null,
    });

    // add changes listener
    React.useEffect(() => {
      if (setters === null) return;

      var id = data.id;
      setters[id] = (v) => {
        if (v === null) return setData(null);

        setData({
          id: data.id,
          component: v,
        });
      };

      return () => {
        if (setters !== null) {
          delete setters[id];
        }
      };
    });

    // return loaded component
    if (payload._status == 1) {
      return payload._result(props);
    }

    if (payload._status == -1) {
      var delay = null;
      var timeout = null;

      // support delay
      if (options.delay > 0 && options.loadingComponent) {
        delay = setTimeout(
          _fallback.bind(this, options.loadingComponent),
          options.delay
        );
      }

      // support timeout
      if (options.timeout > 0 && options.errorComponent) {
        timeout = setTimeout(
          _fallback.bind(this, options.errorComponent),
          options.timeout
        );
      }

      start_loader(function () {
        clearTimeout(delay);
        clearTimeout(timeout);
      }, props.$parent);
    }

    return data.component;
  };

  // return suspensible component
  return {
    $$typeof: Symbol.for("react.lazy"),
    _init: function (payload, suspense = false) {
      if (payload._status < 1 && options.suspensible !== false && suspense) {
        payload._status = 0;

        const r = options
          .loader()
          .then((v) => {
            payload._result = v;
            payload._status = 1;
            return v;
          })
          .catch((e) => {
            payload._result = () => null;
            payload._status = 2;
            return null;
          });

        throw r;
      }

      return payload._result;
    },
    _payload: payload,
  };
}

const CompositionContext = React__default["default"].createContext({});
CompositionContext.displayName = "VueContext";

function initGlobalConfig() {
  return {
    $root: null,
    provides: {},
    components: {},
    directives: {},
    mixins: [],
    config: {
      errorHandler: null,
      warnHandler: null,
      performance: true,
      compilerOptions: {},
      globalProperties: {},
      optionMergeStrategies: {},
    },
  };
}

const GlobalContext = initGlobalConfig(); // React.createContext({})
// GlobalContext.displayName = 'VueGlobalContext'

function attachApp(component, props = {}) {
  var global_config = GlobalContext; // initGlobalConfig()

  if (typeof component !== "function") {
    props.ref = (app) => {
      global_config.$root = (app && app._vm) || app;
    };
  }

  const App = function () {
    return React__default["default"].createElement(component, props);
  };

  App.version = version;
  App.config = global_config.config;

  App.mount = () => App;
  App.unmount = () => App;

  App.provide = (key, value) => {
    global_config.provides[key] = value; // toDo use context provider
    return App;
  };

  // register global component
  App.component = (name, component) => {
    if (component) {
      const PascalName = shared$2.capitalize(shared$2.camelize(name));
      // component.displayName = component.displayName || name

      global_config.components[name] = component;
      global_config.components[PascalName] = component;
      global_config.components[shared$2.hyphenate(PascalName)] = component;
      return App;
    }

    return global_config.components[name];
  };

  // register global directive
  App.directive = (name, directive) => {
    if (directive) {
      const PascalName = shared$2.capitalize(shared$2.camelize(name));

      global_config.directives[name] = directive;
      global_config.directives[PascalName] = directive;
      global_config.directives[shared$2.hyphenate(PascalName)] = directive;
      return App;
    }

    return global_config.directives[name];
  };

  const installed = {};
  App.use = (plugin, options) => {
    if (installed[plugin]) return App;

    installed[plugin] = true;
    if (plugin && plugin.install) {
      plugin.install(App, options);
    } else if (typeof plugin === "function") {
      plugin(App, options);
    }

    return App;
  };

  App.mixin = (config) => {
    global_config.mixins.push(config);
    return App;
  };

  return App;
}

var shared$1 = require("@vue/shared");

const internalOptionMergeStrats = {
  data: mergeDataFn,
  props: mergeObjectOptions,
  emits: mergeObjectOptions,
  // objects
  methods: mergeObjectOptions,
  computed: mergeObjectOptions,
  // lifecycle
  beforeCreate: mergeAsArray,
  created: mergeAsArray,
  beforeMount: mergeAsArray,
  mounted: mergeAsArray,
  beforeUpdate: mergeAsArray,
  updated: mergeAsArray,
  beforeDestroy: mergeAsArray,
  beforeUnmount: mergeAsArray,
  destroyed: mergeAsArray,
  unmounted: mergeAsArray,
  activated: mergeAsArray,
  deactivated: mergeAsArray,
  errorCaptured: mergeAsArray,
  serverPrefetch: mergeAsArray,
  // assets
  components: mergeObjectOptions,
  directives: mergeObjectOptions,
  // watch
  watch: mergeWatchOptions,
  // provide / inject
  provide: mergeDataFn,
  inject: mergeInject,
};

function mergeDataFn(to, from) {
  if (!from) {
    return to;
  }

  if (!to) {
    return from;
  }

  return function mergedDataFn() {
    return shared$1.extend(
      shared$1.isFunction(to) ? to.call(this, this) : to,
      shared$1.isFunction(from) ? from.call(this, this) : from
    );
  };
}

function mergeInject(to, from) {
  return mergeObjectOptions(normalizeInject(to), normalizeInject(from));
}

function mergeAsArray(to, from) {
  return to ? [...new Set([].concat(to, from))] : from;
}

function mergeObjectOptions(to, from) {
  return to
    ? shared$1.extend(shared$1.extend(Object.create(null), to), from)
    : from;
}

function mergeWatchOptions(to, from) {
  if (!to) return from;

  if (!from) return to;

  const merged = shared$1.extend(Object.create(null), to);
  for (const key in from) {
    merged[key] = mergeAsArray(to[key], from[key]);
  }
  return merged;
}

function mergeOptions(to, from, strats, asMixin = false) {
  const { mixins, extends: extendsOptions } = from;
  if (extendsOptions) {
    mergeOptions(to, extendsOptions, strats, true);
  }

  if (mixins) {
    mixins.forEach((m) => mergeOptions(to, m, strats, true));
  }

  for (const key in from) {
    if (asMixin && key === "expose") {
      console.warn(
        `"expose" option is ignored when declared in mixins or extends. ` +
          `It should only be declared in the base component itself.`
      );
    } else {
      const strat = internalOptionMergeStrats[key] || (strats && strats[key]);
      to[key] = strat ? strat(to[key], from[key]) : from[key];
    }
  }

  return to;
}

/**
 * Resolve merged options and cache it on the component.
 * This is done only once per-component since the merging does not involve
 * instances.
 */
function resolveOptions(instance, strats = {}) {
  if (!instance.mixins) return instance;

  for (var mixin of instance.mixins) {
    mergeOptions(instance, mixin, strats);
  }

  return instance;
}

const { customRef } = require("@vue/runtime-core");
const shared = require("@vue/shared");

function init(config) {
  if (!config) return () => () => {};

  // convert array props to object
  if (Array.isArray(config)) {
    var sub = config;
    config = {};
    for (var item of sub) {
      config[item] = {};
    }
  } else {
    // convert object props to object
    var sub = config;
    config = {};

    for (var key in sub) {
      config[key] = sub[key] || {};
      if (typeof config[key] == "function") {
        config[key] = { type: config[key] };
      }
    }
  }

  function setupConfig(name, conf) {
    var precheck = () => {};

    // add validators in dev mode
    if (__DEV__) {
      precheck = function (vm) {
        if (conf.required && typeof vm.props[name] === "undefined") {
          console.warn(`[VueJS] Missing required prop: ${name}`);
          return;
        } else if (typeof vm.props[name] === "undefined") {
          return;
        }

        var expected = assertTypes(vm.props[name], conf.type);
        if (expected !== true) {
          console.warn(
            `[VueJS] Invalid prop: type check failed for prop "${name}". Expected ${expected.join(
              " or "
            )}, got ${typeof vm.props[name]}.`
          );
        } else if (conf.validator && !conf.validator(vm.props[name])) {
          console.warn(
            `[VueJS] Invalid prop: custom validator check failed for prop "${name}".`
          );
        }
      };
    }

    // add direct getter
    config[name] = function (track) {
      track();
      __DEV__ && precheck(this);

      if (typeof this.props[name] === "undefined" && conf.default) {
        if (typeof conf.default == "function") return conf.default(this.props);

        return conf.default;
      }

      return this.props[name];
    };
  }

  // Setup getters
  for (var key in config) {
    if (key[0] === "$") {
      console.warn(`Invalid prop name: "${key}" is a reserved property.`);
      continue;
    }

    setupConfig(key, config[key]);
  }

  // create instance setup function
  return (instance, vm) => {
    var props = {};
    var props_trigger = null;
    var props_tracker = null;

    customRef((track, trigger) => {
      props_trigger = trigger;
      props_tracker = track;
      return {};
    });

    for (var key in config) {
      const fn = config[key].bind(instance, props_tracker);
      Object.defineProperty(props, key, { get: fn });
      Object.defineProperty(vm, key, { get: fn });
    }

    vm.$props = props;
    return props_trigger;
  };
}

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Taken from VueJS library since those functions are not exported:

const isSimpleType = /*#__PURE__*/ shared.makeMap(
  "String,Number,Boolean,Function,Symbol,BigInt"
);

function getType(ctor) {
  const match = ctor && ctor.toString().match(/^\s*function (\w+)/);
  return match ? match[1] : ctor === null ? "null" : "";
}

/**
 * dev only
 */
function assertType(value, type) {
  let valid;
  const expectedType = getType(type);
  if (isSimpleType(expectedType)) {
    const t = typeof value;
    valid = t === expectedType.toLowerCase();
    // for primitive wrapper objects
    if (!valid && t === "object") {
      valid = value instanceof type;
    }
  } else if (expectedType === "Object") {
    valid = shared.isObject(value);
  } else if (expectedType === "Array") {
    valid = shared.isArray(value);
  } else if (expectedType === "null") {
    valid = value === null;
  } else {
    valid = value instanceof type;
  }

  return {
    valid,
    expectedType,
  };
}

function assertTypes(value, type) {
  if (!type || type.length == 0) return true;

  const types = shared.isArray(type) ? type : [type];
  const expectedTypes = [];

  // value is valid as long as one of the specified types match
  for (let i = 0; i < types.length; i++) {
    const { valid, expectedType } = assertType(value, types[i]);
    expectedTypes.push(expectedType || "");
    if (valid) {
      return true;
    }
  }

  return expectedTypes;
}

// ----------------------------------------------------------------------

// const { watchSyncEffect } = require('@vue/runtime-core')
// global.__DEV__ = true

// const setup = init({
//     test: {
//         type:     String,
//         required: true
//     },
//     test2: {
//         type:     String,
//     }
// })

// const instance = {
//     props: {
//         test:  'vvs',
//         // test2: 'x'
//     }
// }

// const vm = {}

// var trigger = setup(instance, vm)

// watchSyncEffect(() => {
//     console.log('got $props', vm.$props.test)
// })

// instance.props.test = 'hello'
// trigger()

// enable renderTriggered & renderTracked features
function withRenderOptions(options) {
  return function (vm, helpers) {
    helpers.watch_render_options.onTrack = this.emit_hook.bind(
      this,
      "renderTracked"
    );
    helpers.watch_render_options.onTrigger = this.emit_hook.bind(
      this,
      "renderTriggered"
    );

    this.on_hook("renderTriggered", options.renderTriggered, true);
    this.on_hook("renderTracked", options.renderTracked, true);
  };
}

// enable emit options
function withEmits(options) {
  // setup emit validators
  if (typeof options.emits != "object") return;

  var has_data = false;
  var res = {};
  var additional = [];

  if (Array.isArray(options.emits)) {
    additional = options.emits.map((name) => shared$2.camelize("on-" + name));
  } else {
    for (var name in options.emits) {
      var subName = shared$2.camelize("on-" + name);
      if (typeof options.emits[name] == "function") {
        has_data = true;
        res[subName] = options.emits[name];
      } else {
        additional.push(subName);
      }
    }
  }

  if (!has_data && additional.length == 0) return;

  // return constructor
  return function (vm, helpers) {
    for (var name of additional) {
      helpers.known_props[name] = true;
    }

    for (var name in res) {
      helpers.known_props[name] = true;
      helpers.emit_validators[name] = res[name].bind(vm);
    }
  };
}

// enable props definitions
function withProps(options) {
  if (!options.props) return;

  var props_setup = init(options.props);
  return function (vm, helpers) {
    for (var prop in options.props) {
      helpers.known_props[prop] = true;
    }

    helpers.trigger_props_changed = props_setup(this, vm);
  };
}

function withDirectives$1(options) {
  if (!options.directives) return;

  return function () {
    for (var name in options.directives) {
      this.directive(name, options.directives[name]);
    }
  };
}

function withComponents(options) {
  if (!options.components) return;

  return function () {
    for (var name in options.components) {
      this.component(name, options.components[name]);
    }
  };
}

function withMethods(options) {
  if (!options.methods) return;

  return function (vm) {
    for (var name in options.methods) {
      vm[name] = options.methods[name].bind(vm);
    }
  };
}

function withInject(options) {
  if (!options.inject) return;

  var hasKeys = false;
  if (Array.isArray(options.inject)) {
    var old = options.inject;
    options.inject = {};
    for (var key in old) {
      hasKeys = true;
      options.inject[key] = {
        from: key,
      };
    }
  } else {
    for (var key in options.inject) {
      hasKeys = true;
      options.inject[key] = options.inject[key] || {};
      options.inject[key].from = options.inject[key].from || key;
    }
  }

  if (!hasKeys) return;

  return function () {
    for (var key in options.inject) {
      var config = options.inject[key];
      this.inject(key, config.default, true, config.from);
    }
  };
}

function withProvide(options) {
  if (!options.provide) return;

  return function (vm) {
    var provide = options.provide;
    if (typeof provide == "function") provide = provide.call(vm);

    for (var key in provide) {
      this.provide(key, provide[key]);
    }
  };
}

function withStylesheet(options) {
  if (!options.stylesheet) return;

  if (typeof options.stylesheet == "function") {
    return function (vm, helpers) {
      const stylesheet = options.stylesheet.bind(vm);

      watchEffect(() => {
        const css_vars = helpers.css_vars(vm);
        helpers.stylesheet = stylesheet(css_vars);
      });
    };
  }

  return function (vm, helpers) {
    helpers.stylesheet = options.stylesheet;
  };
}

function withSetup(options) {
  if (!options.setup) {
    return () => {};
  }

  // call script setup function
  return function (vm, helpers, props, expose) {
    const finaliser = (setup_result) => {
      if (typeof setup_result == "function") {
        helpers.render = setup_result.bind(vm);
      } else if (typeof setup_result == "object") {
        for (var key in setup_result) {
          vm[key] = setup_result[key];
        }
      }
    };

    try {
      const setup_result = options.setup(vm.$props, {
        expose: expose,
        emit: vm.$emit,
        slots: vm.$slots,
        attrs: vm.$attrs,
      });

      if (setup_result && setup_result.then)
        return setup_result.then(finaliser);

      finaliser(setup_result);
    } catch (e) {
      handleError(e, vm, "setup");
    }
  };
}

function withRender(options, render) {
  if (!render) {
    return;
  }

  return function (vm, helpers) {
    helpers.render = helpers.render || render.bind(vm);
  };
}

function withEmit(name) {
  return function () {
    return function () {
      this.emit_hook(name);
    };
  };
}

function withData(options) {
  if (!options.data) return;

  return function (vm) {
    vm.$data = ref(options.data.call(vm, vm)).value;
    attach(vm.$data, vm);
  };
}

function withComputed(options) {
  if (!options.computed) return;

  return function (vm) {
    for (var key in options.computed) {
      var fn = options.computed[key];
      if (typeof fn == "function") fn = fn.bind(vm, vm);

      if (typeof fn.get == "function") fn.get = fn.get.bind(vm, vm);

      if (typeof fn.set == "function") fn.set = fn.set.bind(vm);

      const data = computed$1(fn);

      Object.defineProperty(vm, key, {
        get: () => data.value,
        set: (value) => {
          data.value = value;
        },
      });
    }
  };
}

function withWatch(options) {
  if (!options.watch) return;

  return function () {
    // setup watchers
    for (var key in options.watch) {
      this.$watch(key, options.watch[key]);
    }
  };
}

// creates otpmized component constructor
function createChain(options, render) {
  var fns = [];

  for (let i = 2; i < arguments.length; i++) {
    const res = arguments[i] && arguments[i](options, render);
    if (typeof res == "function") {
      fns.push(res);
    }
  }

  return function (embeded, props, expose) {
    for (var e of fns) {
      e.call(embeded, embeded.vm, embeded.helpers, props, expose);
    }
  };
}

function setup(options, render) {
  // 16 directives
  const pre = createChain(
    options,
    render,
    __DEV__ && withRenderOptions,
    withEmits,
    withProps
  );

  const post = createChain(
    options,
    render,
    withRender,
    withMethods,
    withDirectives$1,
    withComponents,
    withEmit("beforeCreate"),
    withInject,
    withData,
    withComputed,
    withProvide,
    withStylesheet,
    withEmit("created"),
    withWatch
  );

  return [pre, withSetup(options), post];
}

// attach data
function attach(data, target, readonly = false) {
  for (var key in data) {
    if (key.startsWith("$") || key.startsWith("_")) continue;

    const k = key;
    Object.defineProperty(target, key, {
      get: () => data[k],
      set: readonly ? () => {} : (value) => (data[k] = value),
    });
  }
}

// this.$watch
function instanceWatch(
  source,
  value,
  options,
  setCurrentInstance,
  getCurrentInstance
) {
  const publicThis = this._vm;
  const getter =
    typeof source == "string"
      ? source.includes(".")
        ? createPathGetter(publicThis, source)
        : () => publicThis[source]
      : source.bind(publicThis, publicThis);
  let cb;
  if (typeof value == "function") {
    cb = value;
  } else {
    cb = value.handler;
    options = value;
  }

  const cur = getCurrentInstance();
  setCurrentInstance(this);
  const res = watch(getter, cb.bind(publicThis), options);
  if (cur) {
    setCurrentInstance(cur);
  } else {
    setCurrentInstance(null);
  }

  return res;
}

function createPathGetter(ctx, path) {
  const segments = path.split(".");
  return () => {
    let cur = ctx;
    for (let i = 0; i < segments.length && cur; i++) {
      cur = cur[segments[i]];
    }
    return cur;
  };
}

class VM {
  helpers = {
    watch_render_options: {},
    emit_validators: {},
    trigger_props_changed: () => {},
    css_vars: () => ({}),
    stylesheet: {},
    known_props: {
      $parent: true,
      $slots: true,
      children: true,
    },
    render: null,
  };

  vm = {};

  #components = {};

  #directives = {};

  #cache = {};

  #hooks = {};

  #stop_effect = () => null;

  #global_config = {};

  #refs_attachers = {};

  #exposed = {};

  #did_setup_provider = false;

  #provided = {};

  #provided_with_ctx = null;

  // setup VM instance
  constructor(global_config, options, props) {
    this.#global_config = global_config;

    // init vm instance
    this.vm = {
      $data: {},
      // $props // auto addded by proxy instance
      // $root  // auto addded by proxy instance
      // $attrs // auto added
      $refs: {},
      $slots: props.$slots || {},
      $options: options,
      $el: null,
      $parent: props.$parent || null,
      $emit: this.$emit.bind(this),
      $forceUpdate: () => this.forceUpdate(),
      $nextTick: (cb) => nextTick(cb.bind(this)),
      $watch: this.$watch.bind(this),
    };

    Object.defineProperty(this.vm, "$attrs", {
      enumerable: true,
      get: () => this.$attrs,
    });

    Object.defineProperty(this.vm, "$root", {
      enumerable: true,
      get: () => global_config.$root,
    });

    this.vm.$captureError = this.$captureError.bind(this);

    this.#exposed = this.vm;
    this.$slots = this.vm.$slots;

    var expose_altered = false;

    const expose = (obj = {}) => {
      if (!expose_altered) {
        expose_altered = true;

        this.#exposed = {
          get $props() {
            return this.vm.$props;
          },
        };

        function getter(name) {
          return this.vm[name];
        }

        for (var name in this.vm) {
          Object.defineProperty(this.#exposed, name, {
            enumerable: true,
            get: getter.bind(this.vm, name),
          });
        }

        for (var name of options.expose || []) {
          Object.defineProperty(this.#exposed, name, {
            enumerable: true,
            get: getter.bind(this.vm, name),
          });
        }
      }

      for (var key in obj) {
        this.#exposed[key] = obj[key];
      }
    };

    // public exposed instance
    options.expose && expose();
    this.expose = expose;

    // init hooks
    this.on_hook("beforeCreate", options.beforeCreate, true);
    this.on_hook("created", options.created, true);
    this.on_hook("beforeMount", options.beforeMount, true);
    this.on_hook("mounted", options.mounted, true);
    this.on_hook("beforeUpdate", options.beforeUpdate, true);
    this.on_hook("updated", options.updated, true);
    this.on_hook("beforeUnmount", options.beforeUnmount, true);
    this.on_hook("unmounted", options.unmounted, true);
    this.on_hook("errorCaptured", options.errorCaptured, true);
    this.on_hook("activated", options.activated, true);
    this.on_hook("deactivated", options.deactivated, true);

    // init component options
    attach(global_config.config.globalProperties, this.vm);
  }

  // --------------------------------------------

  on_hook(name, cb, bind = false) {
    if (!cb) return;

    if (Array.isArray(cb)) {
      for (var hook of cb) {
        this.on_hook(name, hook);
      }

      return;
    }

    this.#hooks[name] = this.#hooks[name] || [];
    if (bind) cb = cb.bind(this.vm);

    this.#hooks[name].push(cb);
  }

  emit_hook(name, data) {
    var found = false;

    for (var cb of this.#hooks[name] || []) {
      found = true;

      try {
        cb(data);
      } catch (e) {
        if (name == "errorCaptured") {
          throw e;
        } else {
          handleError(e, this.vm, name);
        }
      }
    }

    return found;
  }

  _attachRef(name) {
    var attacher = this.#refs_attachers[name];
    if (!attacher) {
      if (name == "$el") {
        attacher = (el) => {
          this.vm.$el = (el && el._vm) || el;
        };
      } else {
        attacher = (el) => {
          this.vm.$refs[name] = (el && el._vm) || el;
        };
      }

      this.#refs_attachers[name] = attacher;
    }

    return attacher;
  }

  useCssVars(vars) {
    this.helpers.css_vars = vars.bind(this);
  }

  getClassStylesheet(name) {
    if (!name) return null;

    var style = this.helpers.stylesheet[name];
    if (style !== undefined) return style;

    style = [];

    const classes = name.split(" ");
    for (var name of classes) {
      if (name == "") continue;

      const res = this.helpers.stylesheet[name];
      if (res) {
        style.push(res);
      }
    }

    if (style.length === 0) {
      this.helpers.stylesheet[name] = null;
      return null;
    }

    style = reactNative.StyleSheet.flatten(style);
    this.helpers.stylesheet[name] = style; // cache mixed classes result for next usage
    return style;
  }

  $captureError(e, instance, type) {
    if (this.emit_hook("errorCaptured", e, instance, type)) return true;

    if (this.#global_config.config.errorHandler) {
      this.#global_config.config.errorHandler(e, instance, type);
      return true;
    }
  }

  // ----------------- vue instance methods -----------------

  component(name, component) {
    if (component) {
      const PascalName = shared$2.capitalize(shared$2.camelize(name));
      // component.displayName = component.displayName || name

      this.#components[name] = component;
      this.#components[PascalName] = component;
      this.#components[shared$2.hyphenate(PascalName)] = component;
      return this;
    }

    return this.#components[name] || this.#global_config.components[name];
  }

  directive(name, directive) {
    if (directive) {
      const PascalName = shared$2.capitalize(shared$2.camelize(name));

      this.#directives[name] = directive;
      this.#directives[PascalName] = directive;
      this.#directives[shared$2.hyphenate(PascalName)] = directive;
      return this;
    }

    return this.#directives[name] || this.#global_config.directives[name];
  }

  provide(key, value) {
    // replace renderer to include react-native context provider
    if (!this.#did_setup_provider) {
      this.#did_setup_provider = true;
      const render = this.helpers.render;

      this.helpers.render = (vm, cache) => {
        if (!this.#provided_with_ctx) {
          this.#provided_with_ctx = Object.create(this.context);
          Object.assign(this.#provided_with_ctx, this.#provided);
        }

        return React__default["default"].createElement(
          CompositionContext.Provider,
          { value: this.#provided_with_ctx },
          render(vm, cache)
        );
      };
    }

    // register provided value
    this.#provided[key] = value;
    return this;
  }

  // Provide a value that can be injected in all descendent components within the application.
  inject(key, defaultValue, treatDefaultAsFactory = true, from = key) {
    Object.defineProperty(this.vm, key, {
      get: () => {
        const res =
          this.context[from] === undefined
            ? this.#global_config.provides[from]
            : this.context[from];

        if (res === undefined) {
          if (typeof defaultValue == "function" && treatDefaultAsFactory)
            return defaultValue();

          return defaultValue;
        }

        return res;
      },
      set: (value) => {
        if (this.context[from] !== undefined) {
          this.context[from] = value;
        } else if (this.#global_config.provides[from] !== undefined) {
          this.#global_config.provides[from] = value;
        }
      },
    });
  }

  $watch(source, value, options) {
    if (Array.isArray(value)) {
      for (var cb of value) {
        this.$watch(source, cb, options);
      }

      return this.vm;
    }

    if (typeof value == "string") value = this.vm[value];

    const fn = value;
    value = () => {
      try {
        return fn();
      } catch (e) {
        handleError(e, this.vm, "watcher");
      }
    };

    instanceWatch.call(
      {
        _vm: this.vm,
      },
      source,
      value,
      options,
      setCurrentInstance$1,
      getCurrentInstance$1
    );

    return this.vm;
  }

  $emit(name, ...args) {
    name = shared$2.camelize("on-" + name);
    if (
      this.helpers.emit_validators[name] &&
      !this.helpers.emit_validators[name](...args)
    ) {
      return this.vm;
    }

    if (typeof this.props[name] == "function") {
      this.props[name](...args);
    } else if (Array.isArray(this.props[name])) {
      for (var cb of this.props[name]) {
        cb(...args);
      }
    }

    return this.vm;
  }

  get version() {
    return version;
  }

  get $attrs() {
    if (this.helpers.attrs) return this.helpers.attrs;

    var attrs = {};
    for (var key in this.props) {
      if (this.helpers.known_props[key]) continue;

      attrs[key] = this.props[key];
    }

    this.helpers.attrs = attrs;
    return attrs;
  }

  get inheritAttrs() {
    return !(this.vm.$options.inheritAttrs === false);
  }

  get proxy() {
    return this.#exposed;
  }

  // --------------------------------------------

  forceUpdate() {}

  render() {
    setCurrentInstance$1(this, true);
    var rendering = true;

    try {
      this.#stop_effect();

      this.#stop_effect = watchEffect(() => {
        if (rendering === true) {
          rendering = this.helpers.render(this.vm, this.#cache);
          return;
        }

        this.forceUpdate();
      }, this.helpers.watch_render_options);
    } catch (e) {
      handleError(e, this.vm, "render");
    }

    return rendering;
  }
}

var setCurrentInstance$1 = () => {};
var getCurrentInstance$1 = () => {};

VM.onInstance = (setter, getter) => {
  setCurrentInstance$1 = setter;
  getCurrentInstance$1 = getter;
};

var setCurrentInstance = () => {};

// react component wrapper to vue component
class VueReactComponent extends React.Component {
  #vm = null;

  constructor(props, vm) {
    super(props);
    this.#vm = vm;
    vm.forceUpdate = this.forceUpdate.bind(this);

    if (!vm.helpers.render) vm.helpers.render = () => null;

    vm.emit_hook("beforeMount");
  }

  componentDidMount() {
    this.#vm.emit_hook("mounted");
  }

  componentDidUpdate() {
    this.#vm.emit_hook("updated");
  }

  getSnapshotBeforeUpdate() {
    this.#vm.emit_hook("beforeUpdate");
    return null;
  }

  componentWillUnmount() {
    this.#vm.emit_hook("beforeUnmount");
    this.#vm.emit_hook("unmounted");
  }

  componentDidCatch(error, errorInfo) {
    this.#vm.$captureError(error, this.#vm, errorInfo);
  }

  shouldComponentUpdate(props) {
    if (props != this.props) {
      delete this.#vm.helpers.attrs;
      this.#vm.helpers.trigger_props_changed();
    }

    return false;
  }

  render() {
    return this.#vm.render();
  }
}

VueReactComponent.contextType = CompositionContext;
VueReactComponent.$slots = true;

// --------------------------------------------

// transform options to react component
function defineComponent(app) {
  if (app.$$typeof) return app;

  var merged = false;
  var setup$1 = null;
  var global_config = null;

  // integrate mixins & generate setup function
  function getSetup() {
    if (!merged) {
      // global_config = initGlobalConfig()

      app.mixins = app.mixins || [];
      app.mixins = global_config.mixins.concat(app.mixins);

      resolveOptions(app, global_config.config.optionMergeStrategies);
      merged = true;

      setup$1 = setup(app, app.render);
    }

    return setup$1;
  }

  // generates React Component Class with a vm generator
  function generateComponent(genVM) {
    class VueComponent extends VueReactComponent {
      constructor(props = {}) {
        global_config = GlobalContext; // ToDo use react context
        super(props, genVM(props));
      }
    }

    VueComponent.options = app;
    VueComponent.$slots = true;

    if (app.name) {
      VueComponent.displayName = app.name;
    } else if (app.__name) {
      VueComponent.displayName = app.__name;
    }

    return VueComponent;
  }

  // generate async component
  if (app.async) {
    return {
      $$typeof: Symbol.for("react.lazy"),
      options: app,
      _init(payload, suspensible = false, props = {}) {
        global_config = GlobalContext; // ToDo use react context
        const [pre, setup, post] = getSetup();

        const vm = new VM(global_config, app, props);
        pre(vm, props);

        throw (async function () {
          setCurrentInstance(vm);
          await setup(vm, vm.helpers, props, vm.expose);
          post(vm, props);

          const VueComponent = generateComponent(() => vm);

          return function sync_render(props) {
            return React__default["default"].createElement(
              VueComponent,
              props,
              props.children || null
            );
          };
        })();
      },
      _payload: {
        _status: -1,
      },
    };
  }

  // generate sync component
  return generateComponent(function (props) {
    const [pre, setup, post] = getSetup();
    const vm = new VM(global_config, app, props);

    pre(vm, props);
    setCurrentInstance(vm);
    setup(vm, vm.helpers, props, vm.expose);
    post(vm, props);

    return vm;
  });
}

// create vue instance
function createApp(options, props) {
  const app = typeof options == "function" ? options : defineComponent(options);
  return attachApp(app, props);
}

function onInstance(setter, getter) {
  setCurrentInstance = setter;
  VM.onInstance(setter, getter);
}

class Directive extends React__default["default"].PureComponent {
  constructor(props) {
    super(props);

    this.old_values = [];

    this.emit("created");
    this.emit("beforeMount");
  }

  emit(name) {
    for (var i in this.props.directives) {
      var directive = this.props.directives[i];
      var [handler, value, arg, modifiers] = directive;
      if (!handler || typeof handler[name] !== "function") continue;

      handler = handler[name];

      const binding = {
        value,
        arg,
        modifiers,
        instance: this.props.currentRenderingInstance,
        dir: directive,
        oldValue: this.old_values[i],
      };

      handler(this.props.node, binding, {}, {});
      this.old_values[i] = value;
    }
  }

  componentDidMount() {
    this.emit("mounted"); // ToDo listen from parent event
  }

  getSnapshotBeforeUpdate() {
    this.emit("beforeUpdate"); // ToDo listen from parent event
    return null;
  }

  componentDidUpdate() {
    this.emit("updated"); // ToDo listen from parent event
  }

  componentWillUnmount() {
    this.emit("beforeUnmount"); // ToDo listen from parent event
    this.emit("unmounted"); // ToDo listen from parent event
  }

  render() {
    return this.props.node || null;
  }
}

function enableHooks(instance, hooks) {
  const render = instance.render.bind(instance);
  var state = {};

  const Hooks = function () {
    const res = hooks();
    Object.assign(state, res || {});
    return render();
  };

  instance.render = function () {
    return React__default["default"].createElement(Hooks, this.props);
  };

  return state;
}

let currentRenderingInstance = null;
var blockOpened = false;

onInstance(
  (instance, opening = false) => {
    currentRenderingInstance = instance;
    blockOpened = opening;
  },
  () => currentRenderingInstance
);

function getCurrentInstance() {
  return currentRenderingInstance;
}

// ----

function setBlockTracking() {}

function openBlock() {
  return null;
}

function createCommentVNode() {
  return null;
}

function h(T, props = {}, children = null) {
  if (typeof T == "string") T = resolveComponent(T);

  if ((typeof props != "object" || Array.isArray(props)) && children == null) {
    children = props;
    props = {};
  }

  return React__default["default"].createElement(T, props, children);
}

function render(T, props, children) {
  if (!T) return null;

  props = props || {};
  props.style = props.style || {};

  if (props.class && currentRenderingInstance) {
    props.style = reactNative.StyleSheet.flatten([
      currentRenderingInstance.getClassStylesheet(props.class),
      props.style,
    ]);
  }

  if (props.ref && currentRenderingInstance) {
    props.ref = currentRenderingInstance._attachRef(props.ref);
  }

  // attach childrens
  if ((T.render && T.render.$slots) || T.$slots) {
    props.$slots = children;
  } else {
    children = (children && children.default) || children || null;

    if (typeof children == "function") {
      children = children(props);
    }
  }

  if (!Array.isArray(children)) {
    children = [children];
  }

  return React__default["default"].createElement(T, props, ...children);
}

function renderWithParent(T, props, children, patchFlag, dynamicProps) {
  if (currentRenderingInstance) {
    props = props || {};
    props.$parent = currentRenderingInstance._vm;
  }

  return render(T, props, children);
}

const createVNode = renderWithParent; // from inner elements
const createElementVNode = renderWithParent;

const Fragment = "__Fragment__";

// from template root element
const createBlock = (T, props, children, patchFlag, dynamicProps) => {
  props = props || {};

  if (blockOpened) {
    blockOpened = false;
    if (typeof T != "function") {
      props.ref = "$el";
    }

    if (currentRenderingInstance && currentRenderingInstance.inheritAttrs) {
      props = mergeProps(props, currentRenderingInstance.$attrs);
    }
  } else if (currentRenderingInstance) {
    props.$parent = currentRenderingInstance._vm;
  }

  return render(T, props, children);
};

// used with directives
const createElementBlock = (T, props, children, patchFlag, dynamicProps) => {
  if (T == Fragment) return children || null;

  return renderWithParent(T, props, children);
};

// ---

function renderList(items, cb) {
  const res = [];

  if (typeof items == "number") {
    for (var i = 0; i < items; i++) res.push(cb(i));
  } else {
    for (var i in items) res.push(cb(items[i], i));
  }

  return res;
}

function renderSlot(slots, name, props = {}, fallback) {
  var item = slots[name] || fallback;
  if (typeof item == "function") item = item(props);

  if (!item) return null;

  if (Array.isArray(item))
    return React__default["default"].createElement(
      React__default["default"].Fragment,
      {},
      ...item
    );

  return item;
}

function withDirectives(node, directives) {
  node = Object.freeze(
    Object.assign(
      {
        style: node.props.style,
      },
      node
    )
  );

  return React__default["default"].createElement(
    Directive,
    {
      node: node,
      directives: directives,
      instance: currentRenderingInstance,
    },
    null
  );
}

function vModelText() {}

function withCtx(cb) {
  return cb;
}

function createTextVNode(txt) {
  return txt;
}

const components = {
  view: reactNative.View,
  button: reactNative.Button,
  text: reactNative.Text,
  touchable: reactNative.TouchableOpacity,
  "keep-alive": KeepAlive,
  KeepAlive: KeepAlive,
  suspense: Suspense,
  Suspense: Suspense,
};

function resolveComponent(name) {
  const item =
    (currentRenderingInstance && currentRenderingInstance.component(name)) ||
    components[name] ||
    null;
  __DEV__ && !item && console.warn(`Component ${name} not found`);
  return item;
}

function resolveDynamicComponent(name) {
  if (typeof name == "string") return resolveComponent(name);

  return name || null;
}

function resolveDirective(name) {
  return (
    (currentRenderingInstance && currentRenderingInstance.directive(name)) ||
    null
  );
}

// ------------------------------------------------------------
// lifecycles

function createHook(name) {
  return function (cb) {
    if (!currentRenderingInstance)
      return console.warn(
        name + " called outside of component render function"
      );

    currentRenderingInstance.on_hook(name, cb);
  };
}

const onBeforeMount = createHook("beforeMount");
const onMounted = createHook("mounted");
const onBeforeUpdate = createHook("beforeUpdate");
const onUpdated = createHook("updated");
const onBeforeUnmount = createHook("beforeUnmount");
const onUnmounted = createHook("unmounted");
const onServerPrefetch = createHook("serverPrefetch");
const onRenderTracked = createHook("renderTracked");
const onRenderTriggered = createHook("renderTriggered");
const onErrorCaptured = createHook("errorCaptured");
const onActivated = createHook("activated");
const onDeactivated = createHook("deactivated");

// ------------------------------------------------------------

function provide(key, value) {
  if (!currentRenderingInstance)
    return console.warn("provide called outside of component render function");

  currentRenderingInstance.provide(key, value);
}

function inject(key, defaultValue, treatDefaultAsFactory = true) {
  if (!currentRenderingInstance)
    return console.warn("inject called outside of component render function");

  currentRenderingInstance.inject(key, defaultValue, treatDefaultAsFactory);
}

// ------------------------------------------------------------

function withMemo(memo, render, cache, index) {
  const cached = cache[index];
  if (cached && isMemoSame(cached, memo)) {
    return cached.render;
  }

  const ret = render();
  cache[index] = {
    memo: memo.slice(),
    render: ret,
  };

  return ret;
}

function cloneVNode(node, props) {
  return React__default["default"].cloneElement(node, props);
}

function isVNode(node) {
  return React__default["default"].isValidElement(node);
}

// export function vShow(el, { value }) {
//     if(!value) {
//         el.style.display = 'none'
//     }
// }

const vShow = {
  // called before bound element's attributes
  // or event listeners are applied
  created(el, { value }) {
    if (!value) {
      el.style.display = "none";
    }
  },

  // called before the parent component is updated
  beforeUpdate(el, { value }) {
    if (!value) {
      el.style.display = "none";
    }
  },
};

function useCssVars(vars) {
  if (!currentRenderingInstance)
    return console.warn(
      "useCssVars called outside of component render function"
    );

  currentRenderingInstance.useCssVars(vars);
}

function useSlots() {
  if (!currentRenderingInstance)
    return console.warn(
      "useCssVars called outside of component render function"
    );

  return currentRenderingInstance.$slots;
}

function useAttrs() {
  if (!currentRenderingInstance)
    return console.warn(
      "useCssVars called outside of component render function"
    );

  return currentRenderingInstance.$attrs;
}

function withAsyncContext(ctx) {
  if (!currentRenderingInstance)
    return console.warn(
      "withAsyncContext called outside of component render function"
    );

  var current = currentRenderingInstance;
  return [ctx(), () => (currentRenderingInstance = current)];
}

function withHooks(renderer) {
  if (!currentRenderingInstance)
    return console.warn(
      "withHooks called outside of component render function"
    );

  return enableHooks(currentRenderingInstance, renderer);
}

function Comment() {
  return null;
}

// TODO: exported from vue:
// exports.BaseTransition = BaseTransition;
// exports.Static = Static;
// exports.Teleport = Teleport;

// exports.callWithAsyncErrorHandling = callWithAsyncErrorHandling;
// exports.callWithErrorHandling = callWithErrorHandling;

// exports.createHydrationRenderer = createHydrationRenderer;
// exports.createPropsRestProxy = createPropsRestProxy;
// exports.createSlots = createSlots;
// exports.createStaticVNode = createStaticVNode;
// exports.getTransitionRawChildren = getTransitionRawChildren;
// exports.initCustomFormatter = initCustomFormatter;
// exports.popScopeId = popScopeId;
// exports.pushScopeId = pushScopeId;
// exports.queuePostFlushCb = queuePostFlushCb;
// exports.registerRuntimeCompiler = registerRuntimeCompiler;
// exports.resolveFilter = resolveFilter;
// exports.resolveTransitionHooks = resolveTransitionHooks;
// exports.setDevtoolsHook = setDevtoolsHook;
// exports.setTransitionHooks = setTransitionHooks;
// exports.transformVNodeArgs = transformVNodeArgs;
// exports.useSSRContext = useSSRContext;
// exports.useTransitionState = useTransitionState;
// exports.withScopeId = withScopeId;

Object.defineProperty(exports, "camelize", {
  enumerable: true,
  get: function () {
    return shared$2.camelize;
  },
});
Object.defineProperty(exports, "capitalize", {
  enumerable: true,
  get: function () {
    return shared$2.capitalize;
  },
});
Object.defineProperty(exports, "hyphenate", {
  enumerable: true,
  get: function () {
    return shared$2.hyphenate;
  },
});
Object.defineProperty(exports, "normalizeClass", {
  enumerable: true,
  get: function () {
    return shared$2.normalizeClass;
  },
});
Object.defineProperty(exports, "normalizeProps", {
  enumerable: true,
  get: function () {
    return shared$2.normalizeProps;
  },
});
Object.defineProperty(exports, "normalizeStyle", {
  enumerable: true,
  get: function () {
    return shared$2.normalizeStyle;
  },
});
Object.defineProperty(exports, "toDisplayString", {
  enumerable: true,
  get: function () {
    return shared$2.toDisplayString;
  },
});
Object.defineProperty(exports, "toHandlerKey", {
  enumerable: true,
  get: function () {
    return shared$2.toHandlerKey;
  },
});
Object.defineProperty(exports, "Text", {
  enumerable: true,
  get: function () {
    return reactNative.Text;
  },
});
exports.Comment = Comment;
exports.CompositionContext = CompositionContext;
exports.Fragment = Fragment;
exports.KeepAlive = KeepAlive;
exports.ReactiveEffect = ReactiveEffect;
exports.Suspense = Suspense;
exports.cloneVNode = cloneVNode;
exports.compatUtils = compatUtils;
exports.computed = computed$1;
exports.createApp = createApp;
exports.createBlock = createBlock;
exports.createCommentVNode = createCommentVNode;
exports.createElementBlock = createElementBlock;
exports.createElementVNode = createElementVNode;
exports.createHook = createHook;
exports.createRenderer = createRenderer;
exports.createSSRApp = createApp;
exports.createTextVNode = createTextVNode;
exports.createVNode = createVNode;
exports.customRef = customRef$1;
exports.defineAsyncComponent = defineAsyncComponent;
exports.defineComponent = defineComponent;
exports.defineCustomElement = defineComponent;
exports.defineEmits = defineEmits;
exports.defineExpose = defineExpose;
exports.defineProps = defineProps;
exports.effect = effect;
exports.effectScope = effectScope;
exports.getCurrentInstance = getCurrentInstance;
exports.getCurrentScope = getCurrentScope;
exports.guardReactiveProps = guardReactiveProps;
exports.h = h;
exports.handleError = handleError;
exports.inject = inject;
exports.isMemoSame = isMemoSame;
exports.isProxy = isProxy;
exports.isReactive = isReactive;
exports.isReadonly = isReadonly;
exports.isRef = isRef;
exports.isRuntimeOnly = isRuntimeOnly;
exports.isShallow = isShallow;
exports.isVNode = isVNode;
exports.markRaw = markRaw;
exports.mergeDefaults = mergeDefaults;
exports.mergeProps = mergeProps;
exports.nextTick = nextTick;
exports.onActivated = onActivated;
exports.onBeforeMount = onBeforeMount;
exports.onBeforeUnmount = onBeforeUnmount;
exports.onBeforeUpdate = onBeforeUpdate;
exports.onDeactivated = onDeactivated;
exports.onErrorCaptured = onErrorCaptured;
exports.onMounted = onMounted;
exports.onRenderTracked = onRenderTracked;
exports.onRenderTriggered = onRenderTriggered;
exports.onScopeDispose = onScopeDispose;
exports.onServerPrefetch = onServerPrefetch;
exports.onUnmounted = onUnmounted;
exports.onUpdated = onUpdated;
exports.openBlock = openBlock;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.reactive = reactive;
exports.readonly = readonly;
exports.ref = ref;
exports.renderList = renderList;
exports.renderSlot = renderSlot;
exports.resolveComponent = resolveComponent;
exports.resolveDirective = resolveDirective;
exports.resolveDynamicComponent = resolveDynamicComponent;
exports.setBlockTracking = setBlockTracking;
exports.shallowReactive = shallowReactive;
exports.shallowReadonly = shallowReadonly;
exports.shallowRef = shallowRef;
exports.ssrContextKey = ssrContextKey;
exports.ssrUtils = ssrUtils;
exports.stop = stop;
exports.toHandlers = toHandlers;
exports.toRaw = toRaw;
exports.toRef = toRef;
exports.toRefs = toRefs;
exports.triggerRef = triggerRef;
exports.unref = unref;
exports.useAttrs = useAttrs;
exports.useCssVars = useCssVars;
exports.useSlots = useSlots;
exports.vModelText = vModelText;
exports.vShow = vShow;
exports.version = version;
exports.warn = warn;
exports.watch = watch;
exports.watchEffect = watchEffect;
exports.watchPostEffect = watchPostEffect;
exports.watchSyncEffect = watchSyncEffect;
exports.withAsyncContext = withAsyncContext;
exports.withCtx = withCtx;
exports.withDefaults = withDefaults;
exports.withDirectives = withDirectives;
exports.withHooks = withHooks;
exports.withMemo = withMemo;
exports.withModifiers = withModifiers;
