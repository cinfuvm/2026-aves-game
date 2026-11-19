#!/usr/bin/env node
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process = __importStar(require("child_process"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const strip_json_comments_1 = __importDefault(require("strip-json-comments"));
const yesno_1 = __importDefault(require("yesno"));
const commander_1 = require("commander");
const chokidar = __importStar(require("chokidar"));
const esbuild = __importStar(require("esbuild"));
const version = require("../package.json").version;
const program = new commander_1.Command();
program.version(version);
program
    .command("init")
    .description("Copy the required files inside current directory. If a file already exists, it will be skipped.")
    .action(init);
program
    .command("build")
    .description(" Compile and compress your game")
    // .option('-w, --watch', 'Will automatically recompile and refresh the TIC game')
    .action((option, command) => {
    build({ run: false });
});
program
    .command("run")
    .description(" Build, watch, and launch your TIC-80 game")
    // .option('-w, --watch', 'Will automatically recompile and refresh the TIC game')
    .action((option, command) => {
    build({ run: true });
});
program.parse();
/**
 * Initialization code
 * Copy required files to working dir
 */
function init() {
    const toCopyDir = path.join(__dirname, "../tocopy");
    console.log("The following files will be added to the current directory:");
    // Fetch all files to copy
    fs.readdirSync(toCopyDir).forEach((file) => {
        console.log(file);
    });
    (0, yesno_1.default)({ question: "Proceed to copy? (y/n)" }).then((ok) => {
        if (!ok) {
            console.log("Stopping installation");
            process.exit(0);
        }
        console.log();
        fs.readdirSync(toCopyDir).forEach((file) => {
            const from = path.join(toCopyDir, file);
            const to = path.join(process.cwd(), file);
            fs.copySync(from, to, {
                filter: () => {
                    if (fs.existsSync(to)) {
                        console.log(`/!\\ ${file} already exists in directory, skipping`);
                        return false;
                    }
                    return true;
                },
            });
        });
        console.log('\nAll files copied. Edit the tsc80-config.json, then type "tsc80 run"');
        process.exit(0);
    });
}
/**
 * Compile, compress, run
 */
function build({ run = false }) {
    const config = JSON.parse((0, strip_json_comments_1.default)(fs.readFileSync("tsc80-config.json", "utf8")));
    const tsConfig = JSON.parse((0, strip_json_comments_1.default)(fs.readFileSync("tsconfig.json", "utf-8")));
    const toWatch = path.join(process.cwd(), "**/*.ts");
    if (run) {
        // Watch changes
        chokidar
            .watch(toWatch)
            .on("change", () => {
            try {
                compileAndRun(false);
            }
            catch (e) {
                console.error(e);
            }
        })
            .on("ready", () => compileAndRun());
    }
    else {
        // Build once
        compileAndRun(false);
    }
    function compileAndRun(launch = true) {
        const metadata = extractMetadata();
        compile();
        makeGameFile(metadata);
        launch && launchTIC();
    }
    function extractMetadata() {
        const keys = [
            "title",
            "author",
            "desc",
            "site",
            "license",
            "version",
            "script",
            "input",
            "saveid",
        ];
        let metadata = "";
        const code = fs.readFileSync(config.entry, "utf8");
        const lines = code.split("\n");
        for (const line of lines) {
            if (keys.find((k) => line.startsWith(`// ${k}:`))) {
                metadata += line + "\n";
            }
        }
        return metadata;
    }
    function compile() {
        const target = tsConfig?.compilerOptions?.target ?? "es2020";
        console.log(`Building ${config.outfile} to ${target}...`);
        if (!!config.treeShaking)
            console.log("Tree shaking enabled");
        esbuild.buildSync({
            entryPoints: [config.entry],
            bundle: true,
            format: "esm",
            outfile: config.outfile,
            loader: { ".ts": "ts" },
            keepNames: true,
            treeShaking: !!config.treeShaking,
            charset: "utf8",
            minifyIdentifiers: false, // Or else global functions will be mangled https://esbuild.github.io/api/#minify-considerations
            minifyWhitespace: config.minify,
            minifySyntax: config.minify,
            target,
        });
    }
    function makeGameFile(metadata) {
        const buildStr = fs
            .readFileSync(config.outfile, "utf8")
            // Explicit strict mode breaks the global TIC scope
            .replace('"use strict";', "");
        if (buildStr.length < 10) {
            console.log("empty code");
            console.log(buildStr);
        }
        if (!process.env.TIC80_PATH && !config.ticExecutable) {
            console.log('Missing "ticExecutable" in tsc80-config.json or TIC80_PATH env var');
            process.exit(0);
        }
        fs.writeFileSync(config.outfile, metadata + buildStr);
        console.log("Build complete.");
    }
    function launchTIC() {
        // TIC80_PATH tiene prioridad sobre ticExecutable del config,
        // para que cada integrante del equipo use la ruta de su máquina.
        const ticExecutable = process.env.TIC80_PATH || config.ticExecutable;
        let child = child_process.spawn(ticExecutable, [
            "--skip",
            "--keepcmd",
            `--fs=${process.cwd()}`,
            "--cmd",
            `load game.js & load ${config.outfile} code & run`,
        ], {
            stdio: "inherit",
        });
        child.on("exit", (code, signal) => {
            process.exit(code ?? 0);
        });
    }
}
