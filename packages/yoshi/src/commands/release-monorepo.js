const fs = require('fs-extra');
const path = require('path');
const wnpm = require('wnpm-ci');
const parseArgs = require('minimist');
const { splitPackagesPromise } = require('./utils');
const {
  inTeamCity: checkInTeamCity,
  inPRTeamCity: checkInPRTeamCity,
} = require('yoshi-helpers/queries');

const cliArgs = parseArgs(process.argv.slice(2));

const shouldBumpMinor = cliArgs.minor;
const inTeamCity = checkInTeamCity();
const inPRTeamCity = checkInPRTeamCity();

module.exports = async () => {
  if (inTeamCity && !inPRTeamCity) {
    const [, libs] = await splitPackagesPromise;

    // Patch libraries' `package.json` main field to point to `dist`
    await Promise.all(
      libs.map(async lib => {
        const packageJsonPath = path.join(lib.location, 'package.json');
        const json = await fs.readJSON(packageJsonPath);

        // Point to js version of the file in the `dist` directory
        json.main = path.join('dist', json.main.replace('.ts', '.js'));

        fs.writeFileSync(packageJsonPath, JSON.stringify(json, null, 2));
      }),
    );

    await Promise.all(
      libs.map(lib => {
        return wnpm.prepareForRelease({ shouldBumpMinor, cwd: lib.location });
      }),
    );
  }

  return {
    persistent: false,
  };
};
