/*!
 * lm_sensors.js
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence MIT
 */
const BIN = '/usr/bin/sensors -u';

/**
 * Parses the raw data from 'lm_sensors' and returns a
 * JSON representation.
 *
 *
 * @param {Array} lines The lines from stdout
 * @return {Object} JSON representation
 */
function parseSensors(lines) {
  const result = {};

  let currentDevice;
  let currentSensor;

  const setCurrentDevice = (d) => {
    currentDevice = d;
    currentSensor = null;

    if ( currentDevice && !result[currentDevice] ) {
      result[currentDevice] = {
        adapter: null,
        sensors: {}
      };
    }
  };

  lines.forEach((line, idx) => {
    if ( idx === 0 ) {
      setCurrentDevice(line);
    } else if ( line === '' || line === '\r' || line === '\n' ) {
      setCurrentDevice(lines[idx + 1]);
      return;
    }

    const matchAdapter = line.match(/^Adapter: (.*)/);
    if ( matchAdapter  ) {
      result[currentDevice].adapter = matchAdapter[1];
    } else {
      const matchSensor = line.match(/^(\w+):$/);
      if ( matchSensor ) {
        currentSensor = matchSensor[1];
        result[currentDevice].sensors[currentSensor] = {};
      }

      if ( currentSensor ) {
        const matchValue = line.match(/^\s+(\w+): (.*)/);
        if ( matchValue ) {
          const key = matchValue[1].split('_', 2)[1];
          result[currentDevice].sensors[currentSensor][key] = parseFloat(matchValue[2]);
        }
      }
    }
  });

  return result;
}

/**
 * Executes the command line to pull data from 'lm_sensors'
 *
 * Resolves with an Array of lines from stdout, or rejects with
 * an error message
 *
 * @return {Promise}
 */
const execSensors = () => new Promise((resolve, reject) => {
  require('child_process').exec(BIN, (err, stdout, stderr) => {
    if ( err ) {
      reject(err);
    } else {
      const out = stdout.toString();

      if ( out.length < 5 ) {
        reject('Invalid output from lm_sensors: ' + out);
      } else {
        resolve(out);
      }
    }
  });
});

/**
 * Executes and parses data from lm_sensors
 *
 * Resolves with JSON data, or rejects with an error message
 *
 * @return {Promise}
 */
const getSensors = () => new Promise((resolve, reject) => {
  execSensors().then((stdout) => {
    try {
      resolve(parseSensors(stdout.split('\n')));
    } catch ( e ) {
      reject(e);
    }
  }).catch(reject);
});

module.exports.sensors = getSensors;