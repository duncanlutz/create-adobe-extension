# Create Adobe Extension
This package provides a CLI tool to create Adobe CEP Extensions.

## Features
- Create Adobe CEP Extension Bundles without needing to download them from the CEP-Resources Github repository.
- Add new extensions to existing Adobe CEP Extension Bundles.
- Automatically generate .debug files based on your inputs.

## Usage
Navigate to the Folder you want to create your extension in.

By default the tool checks to see if you're creating an extension in the official Adobe extensions folder. If not, it will give you a warning asking if you want to continue.

These extension folders are found at:

- System extension folder
  - Win(x64): `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions`, and `C:\Program Files\Common Files\Adobe\CEP\extensions` (since CEP 6.1)
  - macOS: `/Library/Application Support/Adobe/CEP/extensions`

- Per-user extension folder
  - Win: `C:\Users\<USERNAME>\AppData\Roaming\Adobe\CEP/extensions`
  - macOS: `~/Library/Application Support/Adobe/CEP/extensions`

Now run command:

`$ npx create-adobe-extension`.

The tool will request information about your extension, then create the necessary files for your extension.

## Flags

- `--options`: Display a list of all flags available for create-adobe-extension.

- `--add`: Add a new extension to an existing extension bundle (make sure you're inside the folder of the bundle you'd like to add to before running).

- `--folder-check`: Enable/disable a warning when creating an extension outside of standard Adobe Extensions folder.

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

## v1.2.0 (2022-04-25)

### Added
- Added --add flag which allows for the creation of new extensions within an existing extension bundle.
- Added --options flag which displays all flags available in this package.
- Added --folder-check flag which enables/disables a check to warn users when they are creating an extension outside of the official Adobe extensions folders.

### Changes
- Updated README to clarify where the extension folders are located, what the package checks for and how to disable the checking.

### Removed
- Removed Ascii art title because it was annoying me when I used this package.

## v1.1.3 (2022-04-19)

### Changes
- Changed Ascii art title to match npm package title.

## v1.1.2 (2022-04-19)

### Changes
- Changed method of detecting the current working folder for CEP Extension fold check.

## v1.1.0 (2022-04-19)

### Added
- Added README file
- Added check for whether user is in CEP Extensions folder
- Added *Adobe Live Reload* Ascii art