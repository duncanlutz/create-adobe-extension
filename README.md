# Create Adobe Extension
This package provides a CLI tool to create Adobe CEP Extensions.

## Features
- Create Adobe CEP Extensions without needing to download them from the CEP-Resources Github repository.
- Automatically generate .debug files based on your inputs.

## Usage
Navigate to the Adobe CEP Extensions folder on your machine and run command:

`npx create-adobe-extension`

The tool will request information about your extension, then create the necessary files for your extension.

## User Responses

- *Project Name:* Name of the extension Folder and the first extension in this bundle.

- *Bundle ID:* Must begin with "com." *i.e.: "com.test"*.

- *Extension ID:* Must begin with your Bundle ID. *i.e.: "com.test.panel"*.

- *Extension Version:* Extension version identifier. Set to 1.0.0 by default.

- *CSXS Version:* Sets the version of CSXS this extension will use. Set by default to the newest version.

- *Extension Type:* Indicates whether the this is a Panel, ModalDialog, Modless or Custom Extension.

- *Program(s):* Defines which program or programs this extension will open in.

- *Program Version(s):* Sets the version or versions this extension will run in. To set a range, seperate two numbers with a comma. Set by default to "1.0,99.0".

- *Enable Node.js:* Enable or disable the use of Node.js in your extension.

- *Enable Debugging:* Set whether or not to enable debugging. If enabled, this tool will create a .debug file with the appropriate extension info and adds a function to your javascript file that reloads your jsx script every time your javascript file is initialized (use in conjunction with [Adobe Live Reload](https://github.com/duncanlutz/Adobe-Live-Reload) for an optimal debugging experience).

# Changelog

## v1.1.2 (2022-04-19)

### Bug Fixes
- Changed method of detecting the current working folder for CEP Extension fold check.

## v1.1.0 (2022-04-19)

### Features
- feat: Added README file
- feat: Added check for whether user is in CEP Extensions folder
- feat: Added *Adobe Live Reload* Ascii art