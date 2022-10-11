Object.defineProperty(exports, "__esModule", { value: true });

var fs = require("fs");
var path = require("path");
var rollup = require("rollup");
var compilerSfc = require("@vue/compiler-sfc");
var compilerDom = require("@vue/compiler-dom");
var transform_css = require("css-to-react-native-transform");
var unplugin = require("unplugin");

function _interopDefaultLegacy(e) {
  return e && typeof e === "object" && "default" in e ? e : { default: e };
}

var fs__default = /*#__PURE__*/ _interopDefaultLegacy(fs);
var path__default = /*#__PURE__*/ _interopDefaultLegacy(path);
var transform_css__default = /*#__PURE__*/ _interopDefaultLegacy(transform_css);

function mixin(options, plugin) {
  for (var key in plugin) {
    if (!options[key]) {
      options[key] = plugin[key];
      continue;
    }

    if (typeof options[key] == "object") {
      options[key] = mixin(options[key], plugin[key]);
      continue;
    }

    if (key == "nodeTransforms") {
      const a = options[key];
      const b = plugin[key];

      options[key] = function (node, context) {
        if (a(node, context) === false) return;

        b(node, context);
      };
    } else {
      options[key] = plugin[key];
    }
  }

  return options;
}

// wrapper arround SFC parser to support native & web attributes to filter templates/styles/scripts/...
function parse(data, options) {
  const remove_tags = options.mode == "native" ? "web" : "native";

  options = Object.assign(
    {
      compiler: {
        parse(source, options) {
          const res = compilerDom.parse(source, options);
          res.children = res.children.filter(
            (o) => !o.props || !o.props.find((r) => r.name == remove_tags)
          );
          return res;
        },
      },
    },
    options
  );

  return compilerSfc.parse(data, options);
}

const standardTemplateOptions = {
  compilerOptions: {
    nodeTransforms(node, context) {
      if (node.type == 3) {
        context.removeNode(node);
      }
    },
    isNativeTag() {
      return false;
    },
  },
};

// --------------------------------------------

function generateStyle(app, id, shortID) {
  var style = compilerSfc.compileStyle({
    id: id,
    source: app.styles.reduce((a, b) => a + b.content + "\n", "").trim(" "),
  });

  style = transform_css__default["default"](style.code);

  const styles = style;
  style = `import { StyleSheet } from 'react-native';\n`;

  if (app.cssVars.length == 0) {
    return (
      style +
      `export default StyleSheet.create(${JSON.stringify(styles, null, 4)})`
    );
  }

  // bind css values to stylesheet
  var cssColors = {};
  for (var x of app.cssVars) {
    const id = `${shortID}-${x.split(".").join("_")}`;
    cssColors[`var(--${id})`] = `stylesheet[${JSON.stringify(id)}]`;
  }

  style =
    style +
    `export default function style(stylesheet) {\n    return StyleSheet.create({\n`;
  for (var key in styles) {
    style = style + `        ${JSON.stringify(key)}: {\n`;
    for (var key2 in styles[key]) {
      var val = styles[key][key2];
      val = cssColors[val] || JSON.stringify(val);
      style = style + `            "${key2}": ${val},\n`;
    }

    style = style + `        },\n`;
  }

  return style + "\n    })\n}";
}

function genImport(parserConfig, name, kind) {
  return `import ${name} from ${JSON.stringify(
    parserConfig.filename + "?" + kind
  )}\n`;
}

// --------------------------------------------

// plugin to compile vue files
var vue = unplugin.createUnplugin((parserConfig) => {
  const templateOptions = mixin(
    standardTemplateOptions,
    parserConfig.templateOptions
  );
  const app = parse(parserConfig.content, parserConfig).descriptor;

  const shortID = Math.random().toString(36).substr(2, 10);
  const id = "data-v-" + shortID;

  return {
    name: "vue",
    // webpack's id filter is outside of loader logic,
    // an additional hook is needed for better perf on webpack
    transformInclude(id) {
      return id.endsWith(".vue");
    },
    // just like rollup transform
    resolveId(source) {
      if (
        source == parserConfig.filename ||
        source.startsWith(parserConfig.filename + "?")
      )
        return source;

      return { id: source, external: true };
    },
    load(path) {
      // generate top level vue parts combiner
      if (path === parserConfig.filename) {
        var code = "";

        // add template & script
        if (app.script || app.scriptSetup) {
          code = genImport(parserConfig, "options", "script");
        } else if (app.template) {
          code = genImport(parserConfig, "{ render }", "template");
          code = code + "var options = { render }\n\n";
        } else {
          code = "var options = {}\n\n";
        }

        // add styelsheet
        if (app.styles.length > 0) {
          code = code + genImport(parserConfig, "stylesheet", "style");
          code = code + "options.stylesheet = stylesheet\n\n";
        }

        // add plugins
        for (var i in app.customBlocks) {
          const block = app.customBlocks[i];
          code =
            code +
            genImport(parserConfig, "block" + i, block.type + "&index=" + i);
          code +=
            "typeof(block" + i + ") == 'function' && block" + i + "(options)";
        }

        return (
          code +
          `
                    import { defineComponent } from 'vue'
                    export default defineComponent(options)
                `
        );
      }

      // ---

      path = path.substr(parserConfig.filename.length + 1);

      // generate style part
      if (path === "style") {
        return generateStyle(app, id, shortID);
      }

      // generate script part
      if (path === "script") {
        const script = compilerSfc.compileScript(app, {
          id: id,
          inlineTemplate: true,
          prod: true,
          templateOptions: templateOptions,
        });

        return {
          code: script.content,
          map: script.map,
          // ast:  script.ast,
        };
      }

      // generate template part when no script is available
      if (path === "template") {
        const template = compilerSfc.compileTemplate({
          id: id,
          filename: parserConfig.filename,
          source: app.template.content,
          ssr: false,
          isProd: true,
          compilerOptions: templateOptions.compilerOptions,
        });

        return {
          code: template.code,
          map: template.map,
          // ast:  template.ast,
        };
      }

      // generate custom blocks
      return {
        code: app.customBlocks[0].content,
        map: app.customBlocks[0].map,
      };
    },
  };
});

var projectConfigs = {};

async function compile(config, vueConfig) {
  const parserConfig = {
    filename: path__default["default"].basename(config.filename),
    mode: "native",
    content: config.src,
    templateOptions: vueConfig.templateOptions,
  };

  const bundle = await rollup.rollup({
    input: parserConfig.filename, // resolved by our plugin
    plugins: [vue.rollup(parserConfig), ...(vueConfig.plugins || [])],
    output: [
      {
        file: parserConfig.filename + ".js",
        format: "es",
      },
    ],
  });

  const res = await bundle.generate({
    sourcemap: true,
    format: "es",
  });

  return res.output[0];
}

// forward to babel transformer
function upstreamTransform(config, metroConfig) {
  const transformer =
    config.upstreamTransformer ||
    require(metroConfig.transformer.upstreamTransformer ||
      "metro-react-native-babel-transformer");
  return transformer.transform(config);
}

// metro bundler transformer
async function transform(config) {
  // load project config
  var metroConfig = projectConfigs[config.options.projectRoot];
  if (!metroConfig) {
    metroConfig = {};

    try {
      metroConfig = require(config.options.projectRoot + "/metro.config");

      if (typeof metroConfig == "function")
        metroConfig = await metroConfig(config.options.projectRoot);
    } catch (e) {
      console.error("could not load metro config", e);
    }

    projectConfigs[config.options.projectRoot] = metroConfig;
  }

  // transform vue files
  if (config.filename.endsWith(".vue")) {
    var vueConfig = metroConfig.vue || metroConfig.transformer?.vue || {};
    var app = await compile(config, vueConfig);

    // debug compiled code
    if (vueConfig.saveJS && app.code) {
      fs__default["default"].writeFileSync(config.filename + ".js", app.code);

      const src = JSON.stringify(
        "./" + path__default["default"].basename(config.filename) + ".js"
      );
      app.code =
        "import App from " + src + "\nexport default App\nexport * from " + src;
    }

    config.src = app.code || "";
  }

  return upstreamTransform(config, metroConfig);
}

exports["default"] = vue;
exports.transform = transform;
