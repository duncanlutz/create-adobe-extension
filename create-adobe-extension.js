#! /usr/bin/env node
import chalk from "chalk";
import inquirer from 'inquirer';
import { create } from "xmlbuilder2";
import fs from 'fs';
import path from 'path'
import axios from "axios";
import cliProgress from "cli-progress";
import figlet from "figlet";

const args = process.argv.slice(2);
let programVersionArr = [];
let bundleId;
let debugEnabled = false;
const bar = new cliProgress.SingleBar({ clearOnComplete: true }, cliProgress.Presets.shades_classic);
let mainFolder;

figlet.text('Create Adobe Extension', {
    font: 'Big'
}, (err, data) => {
    if (err) {
        throw new Error(err);
    }

    console.log(chalk.red(data));
})

setTimeout(() => {

    // Initialize CEP Extension
    if (args.length === 0) {
        (
            async () => {
                const curFolderArr = process.cwd().split('/')
                if (curFolderArr[curFolderArr.length - 1].toLowerCase() !== 'extensions') {
                    const folderCheck = await inquirer.prompt([{
                        type: 'confirm',
                        name: 'continue',
                        message: `It doesn't look like you're in the CEP Extensions folder, do you want to continue?`
                    }])
                        .then((answers) => {
                            if (answers.continue === false) {
                                console.log(chalk.red('Exiting process...'));
                                process.exit(0);
                            }
                        })
                }

                const firstQuestions = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'project_name',
                        message: 'Extension Name:',
                        validate(val) {
                            if (val !== '') {
                                return true;
                            }

                            return 'Extension Name cannot be blank.'
                        }
                    },
                    {
                        type: 'input',
                        name: 'bundle_id',
                        message: 'Bundle ID:',
                        validate(val) {
                            const comPass = val.match(/^com./g);
                            const namePass = val.match(/(?<=com\.)\w{1,}/g);
                            bundleId = val;
                            if (comPass && namePass) {
                                return true;
                            }
                            if (!comPass) {
                                return 'Bundle ID must begin with "com."';
                            }
                            if (!namePass) {
                                return 'Bundle ID must contain more than "com."';
                            }
                        }
                    }]);
                const idQuestions = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'extension_id',
                        message: `Extension ID (should begin with ${bundleId}):`,
                        validate(val) {
                            const newBundleId = bundleId.replaceAll('.', '\\.');
                            const bundleTest = new RegExp(`${newBundleId}\\..{1,}`, 'g');
                            const bundlePass = val.match(bundleTest);
                            if (bundlePass) {
                                return true;
                            }

                            return `Beginning of Extension ID should begin with ${bundleId}`
                        }
                    },
                    {
                        type: 'input',
                        name: 'extension_version',
                        message: 'Extension Version:',
                        default: '1.0.0'
                    },
                    {
                        type: 'list',
                        name: 'csxs_version',
                        message: 'CSXS Version:',
                        choices: [
                            { name: '11.0' },
                            { name: '10.0' },
                            { name: '9.0' },
                            { name: '8.0' },
                            { name: '7.0' },
                            { name: '6.0' },
                            { name: '5.0' },
                            { name: '4.0' }
                        ]

                    },
                    {
                        type: 'list',
                        name: 'extension_type',
                        message: 'Extension Type:',
                        choices: [
                            { name: 'Panel' },
                            { name: 'ModalDialog' },
                            { name: 'Modeless' },
                            { name: 'Custom (CEP 5.0 and above)' }
                        ]
                    }
                ]);
                let origProgramArr = [];
                const programs = await inquirer.prompt([{
                    type: 'checkbox',
                    name: 'adobe_programs',
                    message: 'Program(s):',
                    choices: [
                        { name: 'Photoshop' },
                        { name: 'InDesign' },
                        { name: 'InCopy' },
                        { name: 'Illustrator' },
                        { name: 'Premiere Pro' },
                        { name: 'Prelude' },
                        { name: 'After Effects' },
                        { name: 'Animate' },
                        { name: 'Audition' },
                        { name: 'Dreamweaver' },
                        { name: 'Bridge' },
                        { name: 'Rush' }
                    ],
                    pageSize: 12,
                    validate(val) {
                        if (val[0] !== undefined) {
                            return true;
                        }

                        return 'Select at least one program for your extension to run in'
                    },
                    filter(val) {
                        let finalArr = [];
                        val.forEach(app => {
                            origProgramArr.push(app);
                            let returnVal;
                            switch (app) {
                                case 'Photoshop': returnVal = 'PHSP';
                                    break;
                                case 'InDesign': returnVal = 'IDSN';
                                    break;
                                case 'InCopy': returnVal = 'AICY';
                                    break;
                                case 'Illustrator': returnVal = 'ILST';
                                    break;
                                case 'Premiere Pro': returnVal = 'PPRO';
                                    break;
                                case 'Prelude': returnVal = 'PRLD';
                                    break;
                                case 'After Effects': returnVal = 'AEFT';
                                    break;
                                case 'Animate': returnVal = 'FLPR';
                                    break;
                                case 'Audition': returnVal = 'AUDT';
                                    break;
                                case 'Dreamweaver': returnVal = 'DRWV';
                                    break;
                                case 'Bridge': returnVal = 'KBRG';
                                    break;
                                case 'Rush': returnVal = 'RUSH';
                                    break;
                            }
                            finalArr.push(returnVal);
                        })
                        return finalArr;
                    }
                }]);

                let programsArr = [];

                for (let i = 0; i < Object.values(programs)[0].length; i++) {
                    const progShort = Object.values(programs)[0][i].toLowerCase();
                    const tempObject = {
                        type: 'input',
                        name: `${progShort}-version`,
                        message: `${origProgramArr[i]} Version(s)`,
                        default: '1.0,99.0',
                        validate(val) {
                            const fail = val.match(/[a-zA-Z]/g);
                            if (!fail) {
                                return true;
                            }

                            return 'Please enter a valid version number or numbers'
                        },
                        filter(val) {
                            const newVal = val.replace(/\s/, '');
                            programVersionArr.push(newVal);
                            return newVal
                        }
                    };

                    programsArr.push(tempObject);
                }
                console.log(chalk.bold(`Separate program version numbers with comma's:`) + ' ' + chalk.cyan(`15.0, 99.9`));
                const programVersions = await inquirer.prompt(programsArr);

                const options = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'node_enabled',
                        message: 'Enable Node.js?',
                        default: 'true'
                    }, {
                        type: 'confirm',
                        name: 'debug_enabled',
                        message: 'Enable Debugging?',
                        default: 'true'
                    }
                ])

                return { ...firstQuestions, ...idQuestions, ...programs, ...programVersions, ...options }
            })()
            .then((answers) => {
                if (!fs.existsSync(`./${answers.project_name}`)) {
                    fs.mkdirSync(`./${answers.project_name}`);
                }
                mainFolder = `./${answers.project_name}`;

                bar.start(100, 0);
                if (answers.debug_enabled) debugEnabled = true;
                let newProgramsArr = [];
                for (let i = 0; i < answers.adobe_programs.length; i++) {
                    newProgramsArr.push([answers.adobe_programs[i], programVersionArr[i]]);
                }

                // assemble xml file from user answers
                const root = create({ version: '1.0', encoding: 'UTF-8', standalone: 'no' })
                const extensionManifest = root.ele("ExtensionManifest", { "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance", "ExtensionBundleId": answers.bundle_id, "ExtensionBundleVersion": answers.extension_version, "Version": "11.0" })
                    .ele("ExtensionList")
                    .ele('Extension', { Id: answers.extension_id, Version: '1' }).up()
                    .up();
                const executionEnvironment = extensionManifest.ele('ExecutionEnvironment');
                const hostList = executionEnvironment.ele('HostList');
                for (let i = 0; i < newProgramsArr.length; i++) {
                    const program = newProgramsArr[i][0];
                    const version = newProgramsArr[i][1];
                    const host = hostList.ele('Host');
                    host.att('Name', program);
                    let versionNumber = version;
                    if (version.split(',').length > 1) {
                        versionNumber = `[${version}]`;
                    }
                    host.att('Version', versionNumber);
                }
                hostList.up()
                    .ele('LocaleList')
                    .ele('Locale', { Code: "All" }).up()
                    .up()
                    .ele('RequiredRuntimeList')
                    .ele('RequiredRuntime', { Name: 'CSXS', Version: answers.csxs_version }).up().up()
                executionEnvironment.up()
                const dispatchInfoList = extensionManifest.ele('DispatchInfoList')
                    .ele('Extension', { Id: answers.extension_id });
                const dispatchInfo = dispatchInfoList.ele('DispatchInfo');
                const resources = dispatchInfo.ele('Resources')
                    .ele('MainPath').txt('./html/index.html').up();
                if (answers.debug_enabled !== true) {
                    resources.ele('ScriptPath').txt('./jsx/main.jsx').up();
                }
                if (answers.node_enabled === true) {
                    resources.ele('CEFCommandLine').ele('Parameter').txt('--enable-nodejs').up().up();
                }
                dispatchInfo
                    .ele('Lifecycle')
                    .ele('AutoVisible').txt('true').up()
                    .up()
                    .ele('UI')
                    .ele('Type').txt(answers.extension_type).up()
                    .ele('Menu').txt(answers.project_name).up()
                    .ele('Geometry')
                    .ele('Size')
                    .ele('Height').txt('580').up()
                    .ele('Width').txt('1020').up()
                const xml = root.end({ prettyPrint: true });
                const csxsFold = `./${mainFolder}/CSXS/`;

                bar.update(5);

                if (!fs.existsSync(csxsFold)) {
                    fs.mkdirSync(csxsFold)
                }

                const fileLoc = path.join(csxsFold, `manifest.xml`);

                fs.writeFileSync(fileLoc, xml, 'utf-8');

                bar.update(10);

                if (answers.debug_enabled) {

                    const dRoot = create({ version: '1.0', encoding: 'UTF-8', standalone: 'no' })
                    const extensionList = dRoot.ele('ExtensionList')
                    const extension = extensionList.ele('Extension', { Id: answers.extension_id })
                    const hostList = extension.ele('HostList')
                    for (let i = 0; i < newProgramsArr.length; i++) {
                        let baseNum = 8090;
                        const program = newProgramsArr[i][0];
                        const host = hostList.ele('Host');
                        host.att('Name', program);
                        host.att('Port', `${baseNum + i}`);
                    }

                    const debugXml = dRoot.end({ prettyPrint: true });

                    // let debugString = `<ExtensionList>\n  <Extension Id="${answers.extension_id}">\n      <HostList>\n          `;

                    // for (let i = 0; i < newProgramsArr.length; i++) {
                    //     const program = newProgramsArr[i][0];
                    //     if (newProgramsArr.length === 1) {
                    //         debugString += `<Host Name="${program}" Port="8080">\n      `;
                    //         break;
                    //     }
                    //     if (i === newProgramsArr.length - 1) {
                    //         debugString += `<Host Name="${program}" Port="8080">\n      `;
                    //         break;
                    //     }
                    //     if (newProgramsArr.length > 1 && i !== newProgramsArr.length - 1) {
                    //         debugString += `<Host Name="${program}" Port="8080">\n          `;
                    //     }
                    // }

                    // debugString += `</HostList>\n  </Extension>\n</ExtensionList>`


                    const debugLoc = path.join(mainFolder, `.debug`);

                    fs.writeFileSync(debugLoc, debugXml, 'ascii');

                    bar.update(20);
                }
            })
            .then(() => {
                const agroLibUrl = `https://raw.githubusercontent.com/Adobe-CEP/CEP-Resources/master/CEP_11.x/Samples/CEP_HTML_Test_Extension-10.0/js/AgoraLib.js`;
                const csInterfaceUrl = `https://raw.githubusercontent.com/Adobe-CEP/CEP-Resources/master/CEP_11.x/Samples/CEP_HTML_Test_Extension-10.0/js/CSInterface.js`;
                const vulcanUrl = `https://raw.githubusercontent.com/Adobe-CEP/CEP-Resources/master/CEP_11.x/Samples/CEP_HTML_Test_Extension-10.0/js/Vulcan.js`;
                const jqueryUrl = `https://raw.githubusercontent.com/Adobe-CEP/CEP-Resources/master/CEP_11.x/Samples/CEP_HTML_Test_Extension-10.0/js/JQuery/jquery.js`;
                const urlArr = [agroLibUrl, csInterfaceUrl, vulcanUrl, jqueryUrl];
                let urlInd = 0;

                urlArr.forEach(url => {
                    axios({
                        method: 'GET',
                        url
                    })
                        .then((res) => {
                            let name;
                            switch (urlInd) {
                                case 0: name = 'AgroLib.js';
                                    break;
                                case 1: name = 'CSInterface.js';
                                    break;
                                case 2: name = 'Vulcan.js';
                                    break;
                                case 3: name = 'JQuery.js';
                                    break;
                            }

                            if (!fs.existsSync(`./${mainFolder}/js`)) {
                                fs.mkdirSync(`./${mainFolder}/js`);
                            }

                            fs.writeFileSync(`./${mainFolder}/js/${name}`, res.data, 'utf-8');
                            urlInd++;
                        })
                    bar.update(80);
                })

                if (debugEnabled) {

                }

                if (!fs.existsSync(`./${mainFolder}/js`)) {
                    fs.mkdirSync(`./${mainFolder}/js`);
                }

                fs.writeFileSync(`./${mainFolder}/js/app.js`, '/* This function is here because you enabled Debugging.\nIt evaluates your "main.jsx" file every time it is called. */\n\nfunction loadScript() {\n  let root = decodeURI(\n    window.__adobe_cep__.getSystemPath("extension")\n    ).replace(/file\:\\/{1,}/, "");\n    let fullpath = `${ root }${ "./jsx/main.jsx".replace(/^\./, "") }`;\n    window.__adobe_cep__.evalScript(`$.evalFile("${fullpath}")`);\n  }\n\nloadScript();', 'utf-8')

                if (!fs.existsSync(`./${mainFolder}/html`)) {
                    fs.mkdirSync(`./${mainFolder}/html`);
                }

                const htmlData = '<!DOCTYPE html\n    PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n<html xmlns="http://www.w3.org/1999/xhtml">\n\n<head>\n  <link rel="stylesheet" href="style.css">\n</head>\n\n<body id="index_body">\n    <div class="welcome">Welcome to your Adobe Extension</div>\n    <script src="./js/CSInterface.js"></script>\n    <script src="./js/JQuery.js"></script>\n    <script src="./js/app.js"></script>\n</body>\n\n</html>\n';

                fs.writeFileSync(`./${mainFolder}/html/index.html`, htmlData, "utf-8");

                if (!fs.existsSync(`./${mainFolder}/css`)) {
                    fs.mkdirSync(`./${mainFolder}/css`);
                }

                const cssStr = `.welcome {\n  color: #fff\n};`

                fs.writeFileSync(`./${mainFolder}/css/style.css`, cssStr, 'utf-8');

                bar.update(90);

                if (!fs.existsSync(`./${mainFolder}/jsx`)) {
                    fs.mkdirSync(`./${mainFolder}/jsx`);
                }

                fs.writeFileSync(`./${mainFolder}/jsx//main.jsx`, '', 'utf-8');

                bar.update(100);

                setTimeout(() => {
                    bar.stop();
                }, 300);

            })
    }
    else {
        args.forEach(arg => {
            console.log(chalk.red(`Error: Argument "${arg}" not recognized`));
        })
    }

}, 50);