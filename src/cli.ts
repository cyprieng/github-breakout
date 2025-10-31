import { ColorPalette, Options, generateSVG } from "./svg";
import * as fs from "fs";
import * as path from "path";

// Parse arguments
interface ParsedArgs {
  username?: string; // GitHub username
  token?: string; // GitHub token
  defaultColors?: boolean; // Use default colors
  light?: boolean; // Generate light mode SVG
  dark?: boolean; // Generate dark mode SVG
  enableGhostBricks?: boolean; // Ghost bricks for days without contribution
  paddleColor?: string; // Paddle color
  ballColor?: string; // Ball color
  bricksColors?: [string, string, string, string, string]; // Bricks colors
  outputPath?: string; // Output path
}

/**
 * Get an input value from environment variables or from GitHub Actions inputs
 * @param name - The name of the input variable.
 * @returns The input value as a string or undefined if not found.
 */
function getInput(name: string): string | undefined {
  const envName = `INPUT_${name.replace(/-/g, "_").toUpperCase()}`;
  return process.env[envName] || process.env[name] || undefined;
}

/**
 * Parse command-line arguments into an object.
 * @param argv - The array of command-line arguments to parse.
 * @returns An object containing the parsed arguments.
 */
function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    defaultColors: false,
    dark: false,
    light: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--username" && i + 1 < argv.length) {
      parsed.username = argv[++i];
    } else if (arg === "--token" && i + 1 < argv.length) {
      parsed.token = argv[++i];
    } else if (arg === "--default-colors") {
      parsed.defaultColors = true;
    } else if (arg === "--dark") {
      parsed.dark = true;
    } else if (arg === "--light") {
      parsed.light = true;
    } else if (arg === "--no-ghost-bricks") {
      parsed.enableGhostBricks = false;
    } else if (arg === "--output-path") {
      parsed.outputPath = argv[++i];
    } else if (arg === "--paddle-color") {
      parsed.paddleColor = argv[++i];
    } else if (arg === "--ball-color") {
      parsed.ballColor = argv[++i];
    } else if (arg === "--bricks-colors") {
      const colors = argv[++i].split(",");
      if (colors.length === 5) {
        parsed.bricksColors = colors as [
          string,
          string,
          string,
          string,
          string,
        ];
      }
    }
  }
  return parsed;
}

// Parse CLI arguments
const cliArgs = parseArgs(process.argv.slice(2));

// Build options from CLI args and environment variables
const bricksColorsInput = (getInput("BRICKS_COLORS") ?? "").split(",");
const bricksColorsFromInput =
  bricksColorsInput.length === 5
    ? (bricksColorsInput as [string, string, string, string, string])
    : undefined;

const options = {
  username: cliArgs.username || getInput("GITHUB_USERNAME"),
  token: cliArgs.token || getInput("GITHUB_TOKEN"),
  defaultColors: cliArgs.defaultColors,
  dark: cliArgs.dark,
  light: cliArgs.light,
  enableGhostBricks:
    cliArgs.enableGhostBricks ??
    (getInput("ENABLE_GHOST_BRICKS") ?? "true") === "true",
  paddleColor: cliArgs.paddleColor || getInput("PADDLE_COLOR"),
  ballColor: cliArgs.ballColor || getInput("BALL_COLOR"),
  bricksColors: cliArgs.bricksColors || bricksColorsFromInput,
  path: cliArgs.outputPath || getInput("OUTPUT_PATH") || "output",
};

if (!options.username || !options.token) {
  console.error(
    "Error: Both a GitHub username and token are required.\n" +
      "Provide via --username/--token or set GITHUB_USERNAME and GITHUB_TOKEN as environment variables.\n" +
      "Or use in GitHub Actions with 'github_username' and 'github_token' inputs.",
  );
  process.exit(1);
}

// Default options
if (
  !options.dark &&
  !options.light &&
  !options.defaultColors &&
  !options.bricksColors &&
  !options.paddleColor &&
  !options.ballColor
) {
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
const variants: {
  bricksColors: Options["bricksColors"];
  name: string;
}[] = [];
if (options.paddleColor || options.ballColor || options.bricksColors) {
  variants.push({
    bricksColors: (options.bricksColors as ColorPalette) || "github_light",
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
Promise.all(
  variants.map((variant) =>
    generateSVG(options.username!, options.token!, {
      enableGhostBricks: options.enableGhostBricks,
      paddleColor: variant.name === "custom" ? options.paddleColor : undefined,
      ballColor: variant.name === "custom" ? options.ballColor : undefined,
      bricksColors: variant.bricksColors,
    }).then((svg) => {
      const outputFile = path.join(outDir, `${variant.name}.svg`);
      fs.writeFileSync(outputFile, svg);
      console.log(`SVG generated: ${outputFile}`);
    }),
  ),
).catch((err) => {
  console.error("Failed to generate SVG(s):", err);
  process.exit(1);
});
