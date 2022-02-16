const { spawn } = require("child_process");

const cypress = require("cypress");
const arg = require("arg");

const args = arg(
  {
    "--folder": String, // The name of the folder to run files from
    "--open": [Boolean], // Run Cypress in open mode or not? Doesn't accept additional arguments
  },
  { permissive: true }, // Passes all other flags and args to the Cypress parser
);

const cliArgs = args._;

const folder = args["--folder"];
const isFolder = !!folder;

const isOpenMode = args["--open"];
const isCI = process.env["CI"];
const isCurrents = process.env["CURRENTS_KEY"];

const parseArguments = async () => {
  // cypress.cli.parseArguments requires `cypress run` as the first two arguments
  if (cliArgs[0] !== "cypress") {
    cliArgs.unshift("cypress");
  }

  if (cliArgs[1] !== "run") {
    cliArgs.splice(1, 0, "run");
  }

  return await cypress.cli.parseRunArguments(cliArgs);
};

const getSourceFolder = folder => {
  return `./frontend/test/metabase/scenarios/${folder}/**/*.cy.spec.js`;
};

const getReporterConfig = isCI => {
  return isCI
    ? {
        reporter: "junit",
        "reporter-options": "mochaFile=cypress/results/results-[hash].xml",
      }
    : null;
};

const runCypress = async (baseUrl, exitFunction) => {
  if (isCurrents) {
    await runCurrents(baseUrl);
  } else {
    const defaultConfig = {
      configFile: "frontend/test/__support__/e2e/cypress.json",
      config: {
        baseUrl,
      },
      spec: isFolder && getSourceFolder(folder),
    };

    const reporterConfig = getReporterConfig(isCI);

    const userArgs = await parseArguments();

    const finalConfig = Object.assign(
      {},
      defaultConfig,
      reporterConfig,
      userArgs,
    );

    try {
      const { status, message, totalFailed, failures } = isOpenMode
        ? await cypress.open(finalConfig)
        : await cypress.run(finalConfig);

      // At least one test failed
      if (totalFailed > 0) {
        await exitFunction(1);
      }

      // Something went wrong and Cypress failed to even run tests
      if (status === "failed" && failures) {
        console.error(message);

        await exitFunction(failures);
      }
    } catch (e) {
      console.error("Failed to run Cypress!\n", e);

      await exitFunction(1);
    }
  }
};

const baseCurrentsArgs = baseUrl => [
  "currents",
  "run",
  "--config-file",
  "frontend/test/__support__/e2e/cypress.json",
  "--config",
  `baseUrl=${baseUrl}`,
];

async function runCurrents(baseUrl) {
  const currentsArgs = baseCurrentsArgs(baseUrl).concat(cliArgs);

  const currentsProcess = spawn("yarn", currentsArgs, { stdio: "inherit" });

  return new Promise((resolve, reject) => {
    currentsProcess.on("exit", resolve);
  });
}

module.exports = runCypress;
