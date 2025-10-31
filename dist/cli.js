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
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
const svg_1 = require("./svg");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Get an input value from environment variables or from GitHub Actions inputs
 * @param name - The name of the input variable.
 * @returns The input value as a string or undefined if not found.
 */
function getInput(name) {
    const envName = `INPUT_${name.replace(/-/g, "_").toUpperCase()}`;
    return process.env[envName] || process.env[name] || undefined;
}
/**
 * Parse command-line arguments into an object.
 * @param argv - The array of command-line arguments to parse.
 * @returns An object containing the parsed arguments.
 */
function parseArgs(argv) {
    const parsed = {
        defaultColors: false,
        dark: false,
        light: false,
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--username" && i + 1 < argv.length) {
            parsed.username = argv[++i];
        }
        else if (arg === "--token" && i + 1 < argv.length) {
            parsed.token = argv[++i];
        }
        else if (arg === "--default-colors") {
            parsed.defaultColors = true;
        }
        else if (arg === "--dark") {
            parsed.dark = true;
        }
        else if (arg === "--light") {
            parsed.light = true;
        }
        else if (arg === "--no-ghost-bricks") {
            parsed.enableGhostBricks = false;
        }
        else if (arg === "--output-path") {
            parsed.outputPath = argv[++i];
        }
        else if (arg === "--paddle-color") {
            parsed.paddleColor = argv[++i];
        }
        else if (arg === "--ball-color") {
            parsed.ballColor = argv[++i];
        }
        else if (arg === "--bricks-colors") {
            const colors = argv[++i].split(",");
            if (colors.length === 5) {
                parsed.bricksColors = colors;
            }
        }
    }
    return parsed;
}
// Parse CLI arguments
const cliArgs = parseArgs(process.argv.slice(2));
// Build options from CLI args and environment variables
const bricksColorsInput = ((_a = getInput("BRICKS_COLORS")) !== null && _a !== void 0 ? _a : "").split(",");
const bricksColorsFromInput = bricksColorsInput.length === 5
    ? bricksColorsInput
    : undefined;
const options = {
    username: cliArgs.username || getInput("GITHUB_USERNAME"),
    token: cliArgs.token || getInput("GITHUB_TOKEN"),
    defaultColors: cliArgs.defaultColors,
    dark: cliArgs.dark,
    light: cliArgs.light,
    enableGhostBricks: (_b = cliArgs.enableGhostBricks) !== null && _b !== void 0 ? _b : ((_c = getInput("ENABLE_GHOST_BRICKS")) !== null && _c !== void 0 ? _c : "true") === "true",
    paddleColor: cliArgs.paddleColor || getInput("PADDLE_COLOR"),
    ballColor: cliArgs.ballColor || getInput("BALL_COLOR"),
    bricksColors: cliArgs.bricksColors || bricksColorsFromInput,
    path: cliArgs.outputPath || getInput("OUTPUT_PATH") || "output",
};
if (!options.username || !options.token) {
    console.error("Error: Both a GitHub username and token are required.\n" +
        "Provide via --username/--token or set GITHUB_USERNAME and GITHUB_TOKEN as environment variables.\n" +
        "Or use in GitHub Actions with 'github_username' and 'github_token' inputs.");
    process.exit(1);
}
// Default options
if (!options.dark &&
    !options.light &&
    !options.defaultColors &&
    !options.bricksColors &&
    !options.paddleColor &&
    !options.ballColor) {
    options.defaultColors = true; // Default colors if neither is specified
    // Enable both for GitHub actions by default
    if (process.env.GITHUB_ACTIONS === "true") {
        options.dark = true;
    }
}
// Output directory
let outDir = options.path;
if (!path.isAbsolute(outDir)) {
    outDir = path.resolve(process.cwd(), outDir);
}
// Create directory
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}
// Variants to build
const variants = [];
if (options.paddleColor || options.ballColor || options.bricksColors) {
    variants.push({
        bricksColors: options.bricksColors || "github_light",
        name: "custom",
    });
}
if (options.defaultColors) {
    variants.push({ bricksColors: undefined, name: "light" });
}
if (options.light) {
    variants.push({ bricksColors: "github_light", name: "light" });
}
if (options.dark) {
    variants.push({ bricksColors: "github_dark", name: "dark" });
}
// Build images
Promise.all(variants.map((variant) => (0, svg_1.generateSVG)(options.username, options.token, {
    enableGhostBricks: options.enableGhostBricks,
    paddleColor: variant.name === "custom" ? options.paddleColor : undefined,
    ballColor: variant.name === "custom" ? options.ballColor : undefined,
    bricksColors: variant.bricksColors,
}).then((svg) => {
    const outputFile = path.join(outDir, `${variant.name}.svg`);
    fs.writeFileSync(outputFile, svg);
    console.log(`SVG generated: ${outputFile}`);
}))).catch((err) => {
    console.error("Failed to generate SVG(s):", err);
    process.exit(1);
});
