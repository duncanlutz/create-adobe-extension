#! /usr/bin/env node
import chalk from "chalk";
import inquirer from 'inquirer';
import { create } from "xmlbuilder2";
import fs from 'fs';
import path from 'path'
import axios from "axios";
import cliProgress from "cli-progress";
import shell from 'shelljs';

const flags = process.argv.slice(2);
let programVersionArr = [];
let bundleId;
let debugEnabled = false;
const bar = new cliProgress.SingleBar({ clearOnComplete: true }, cliProgress.Presets.shades_classic);
let mainFolder;
let config;

(
    async () => {
        const loc = await shell.exec("npm root -g", { silent: true });
        config = JSON.parse(fs.readFileSync(loc.stdout.replace('\n', '') + '/create-adobe-extension/adconfig.json', 'utf-8'));
    }
)()
    .then(() => {

        const checkFold = async () => {
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
        }

        if (flags.length > 0) {
            const checkManifest = () => {
                if (!fs.existsSync(`${process.cwd()}/CSXS/manifest.xml`)) {
                    return false;
                }

                return true;
            }

            const addExtension = async () => {
                const manifestFile = fs.readFileSync(`${process.cwd()}/CSXS/manifest.xml`, 'utf-8');
                const extensionSplit = manifestFile.split('<ExtensionList>\n');
                const curIds = manifestFile.match(/(?<=\<Extension Id=").*?(?=\")/gm);
                (
                    async () => {
                        if (!checkManifest()) {
                            console.log(chalk.red(`manifest.xml doesn't exist. Run 'npx create-adobe-extension' to initialize extension.`));
                            return;
                        }
                        const addBundleId = manifestFile.match(/(?<=ExtensionBundleId=").*?(?=")/gm)[0];
                        const addExtensionInfo = await inquirer.prompt([
                            {
                                type: 'input',
                                name: 'addExtension_name',
                                message: 'Extension Name:'
                            },
                            {
                                type: 'input',
                                name: 'addExtension_id',
                                message: `Extension ID (should begin with ${addBundleId}):`,
                                validate(val) {
                                    const newBundleId = addBundleId.replaceAll('.', '\\.');
                                    const bundleTest = new RegExp(`${newBundleId}\\..{1,}`, 'g');
                                    const bundlePass = val.match(bundleTest);
                                    if (!bundlePass) {
                                        return `Beginning of Extension ID should begin with ${addBundleId}`
                                    }

                                    for (let i = 0; i < curIds.length; i++) {
                                        if (val === curIds[i]) {
                                            return `Id ${val} is already used in this bundle.`
                                        }
                                    }

                                    return true;
                                }
                            },
                            {
                                type: 'input',
                                name: 'addExtension_version',
                                message: 'Extension Version:',
                                default: '1.0.0',
                                validate(val) {
                                    const pass = val.match(/[^a-zA-Z]/gm);
                                    if (pass) {
                                        return true;
                                    }

                                    return 'Version cannot contain letters'
                                }
                            },
                            {
                                type: 'list',
                                name: 'addExtension_type',
                                message: 'Extension Type:',
                                choices: [
                                    { name: 'Panel' },
                                    { name: 'ModalDialog' },
                                    { name: 'Modeless' },
                                    { name: 'Custom (CEP 5.0 and above)' }
                                ]
                            },
                            {
                                type: 'confirm',
                                name: 'addExtension_node',
                                message: 'Enable Node.js?',
                                default: 'true'
                            },
                        ]);

                        return addExtensionInfo;
                    })()
                    .then((answers) => {
                        const newExtensionList = `${extensionSplit[0]}<ExtensionList>\n    <Extension Id="${answers.addExtension_id}" Version="${answers.addExtension_version}"/>\n${extensionSplit[1]}`;
                        const newExtensionSplit = newExtensionList.split('<DispatchInfoList>\n');
                        const htmlNameSplit = answers.addExtension_name.split(' ');
                        let htmlNameString = '';
                        for (let i = 0; i < htmlNameSplit.length; i++) {
                            let newString = '';
                            if (i === 0) {
                                htmlNameString += htmlNameSplit[i].toLowerCase();
                                continue;
                            }

                            const newSplit = htmlNameSplit[i].toLowerCase().split('');


                            for (let x = 0; x < newSplit.length; x++) {
                                if (x === 0) {
                                    newString += newSplit[x].toUpperCase();
                                    continue;
                                }

                                newString += newSplit[x];
                            }
                            htmlNameString += newString;
                        }
                        const addExtensionStr = `${newExtensionSplit[0]}<DispatchInfoList>\n    <Extension Id="${answers.addExtension_id}">\n      <DispatchInfo>\n        <Resources>\n          <MainPath>./html/${htmlNameString}_index.html</MainPath>\n${answers.addExtension_node ? '          <CEFCommandLine>\n            <Parameter>--enable-nodejs</Parameter>\n          </CEFCommandLine>' : ''}\n        </Resources>\n        <Lifecycle>\n          <AutoVisible>true</AutoVisible>\n        </Lifecycle>\n        <UI>\n          <Type>${answers.addExtension_type}</Type>\n          <Menu>${answers.addExtension_name}</Menu>\n          <Geometry>\n            <Size>\n              <Height>580</Height>\n              <Width>1020</Width>\n            </Size>\n          </Geometry>\n        </UI>\n      </DispatchInfo>\n    </Extension>\n${newExtensionSplit[1]}`;

                        fs.writeFileSync(`${process.cwd()}/CSXS/manifest.xml`, addExtensionStr, 'utf-8')

                        if (!fs.existsSync(`${process.cwd()}/html`)) {
                            fs.mkdirSync(`${process.cwd()}/html`);
                        }

                        if (!fs.existsSync(`${process.cwd()}/js`)) {
                            fs.mkdirSync(`${process.cwd()}/js`);
                        }

                        const newHtmlData = `<!DOCTYPE html\n    PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n<html xmlns="http://www.w3.org/1999/xhtml">\n\n<head>\n  <link rel="stylesheet" href="style.css">\n</head>\n\n<body id="index_body">\n    <div class="welcome">Welcome to your Adobe Extension</div>\n    <script src="./js/CSInterface.js"></script>\n    <script src="./js/JQuery.js"></script>\n    <script src="./js/${htmlNameString}_app.js"></script>\n</body>\n\n</html>\n`;

                        fs.writeFileSync(`${process.cwd()}/js/${htmlNameString}_app.js`, '/* This function is here because you enabled Debugging.\nIt evaluates your "main.jsx" file every time it is called. */\n\nfunction loadScript() {\n  let root = decodeURI(\n    window.__adobe_cep__.getSystemPath("extension")\n    ).replace(/file\:\\/{1,}/, "");\n    let fullpath = `${ root }${ "./jsx/main.jsx".replace(/^\./, "") }`;\n    window.__adobe_cep__.evalScript(`$.evalFile("${fullpath}")`);\n  }\n\nloadScript();', 'utf-8')

                        fs.writeFileSync(`${process.cwd()}/html/${htmlNameString}_index.html`, newHtmlData, 'utf-8');
                    })
            }

            const foldCheckFunction = async () => {
                let foldConf = false;
                let fQuestObj = {
                    type: 'confirm',
                    name: 'folder_toggle',
                    message: ''
                }
                if (config.FolderCheck) {
                    fQuestObj.message = 'Do you want to disable the Extension Folder warning message?';
                    foldConf = false;
                }
                else {
                    fQuestObj.message = 'Do you want to enable the Extension Folder warning message?';
                    foldConf = true;
                }
                const fQuestion = await inquirer.prompt([fQuestObj])
                    .then((answers) => {
                        if (answers.folder_toggle) {
                            bar.start(100, 0);
                            let newConfig = { ...config, FolderCheck: foldConf };
                            config = newConfig;
                            bar.update(50);
                            fs.writeFileSync('./adconfig.json', JSON.stringify(config), 'utf-8');
                            bar.update(100);
                            bar.stop();
                        }
                    })
            }

            const optionFlag = async () => {
                console.log(chalk.green(`--options:`) + chalk.gray(' Display a list of all flags available for create-adobe-extension.\n') + chalk.green(`--folder-check:`) + chalk.gray(' Enable/disable a warning when creating an extension outside of standard Adobe Extensions folder.\n') + chalk.green(`--add:`) + chalk.gray(` Add a new extension to an existing extension bundle (make sure you're inside the folder of the bundle you'd like to add to before running).`));
                process.exit(0);
            }

            const flagCheck = async () => {
                for (let i = 0; i < flags.length; i++) {
                    switch (flags[i]) {
                        case '--folder-check': const f = await foldCheckFunction(); return;
                        case '--add': const a = await addExtension(); return;
                        case '--options': const of = await optionFlag(); return;
                    }
                }
            }

            flagCheck();
        }

        // Initialize CEP Extension
        if (flags.length === 0) {
            (
                async () => {

                    // Check if folder check is enabled
                    if (config.FolderCheck) {
                        const check = await checkFold();
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
                        process.exit(0);
                    }, 300);

                })
        }
    })