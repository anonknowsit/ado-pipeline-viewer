# Azure DevOps - Pipeline Viewer

<p align=center>
<img src="azure-pipeline-viewer.jpeg"  width="250" height="250"> 
</p>

Azure DevOps - Pipeline Viewer is a Visual Studio Code extension that allows you to view Azure DevOps pipelines directly within the VSCode environment. The extension supports multiple projects within a single organization and provides a clear and organized view of your pipelines.

## Features

- View Azure DevOps pipelines for multiple projects within a single organization.
- Display pipeline status, build number, and project name.
  - Indicators:
    - "-" - Canceled
    - "X" - Failed
    - "🗸" - Succeeded
    - "⚠️" - Partial successful
- Auto-refresh to keep pipeline status up-to-date.
- Visual separators with project names and icons for better organization.
- Set and manage Azure DevOps Personal Access Token (PAT), organization URL, and project names.
- View detailed logs for each pipeline run.
- Highlight custom tasks in the log output for better visibility.
- Progress indicator when fetching pipeline logs.

## Installation

1. Install [Visual Studio Code](https://code.visualstudio.com/).
2. Open the Extensions view by clicking on the Extensions icon in the Sidebar or pressing `Ctrl+Shift+X`.
3. Search for "Azure DevOps - Pipeline Viewer" and click Install.

## Usage

There are two ways to set up and use the Azure DevOps - Pipeline Viewer:

### Method 1: Command Palette

1. Open the Command Palette (`Ctrl+Shift+P`).
2. Run the command `Azure Pipelines: Set Azure DevOps PAT` to set your Personal Access Token.
3. Run the command `Azure Pipelines: Set Azure DevOps Organization URL` to set your organization URL.
4. Run the command `Azure Pipelines: Add Azure DevOps Project` to add one or more projects.
5. Open the "Azure Pipelines" view in the Sidebar to see your pipelines.

### Method 2: Primary Sidebar with Overflow Menu

1. Click on the Azure DevOps icon in the primary sidebar to open the extension view.
2. In the "Authentication" view, you'll see an overflow menu (three dots) in the top-right corner.
3. From this overflow menu, select:
   - "Set Azure DevOps PAT" to set your Personal Access Token.
   - "Set Azure DevOps Organization URL" to set your organization URL.
   - "Add Azure DevOps Project" to add one or more projects.
   - "Remove Azure DevOps Project" to remove a project.
   - "Reset Azure DevOps Secrets" to clear all settings.
4. After configuring, switch to the "Pipelines" view to see your pipelines.

The extension will automatically refresh the pipeline view every 15 seconds to keep the status up-to-date. You can also manually refresh using the refresh button in the view.

<br>

![Alt Text](https://raw.githubusercontent.com/anonknowsit/ado-pipeline-viewer/master/Animation.gif)

### Viewing Pipeline Logs

To view logs for a pipeline run:

1. Click on a pipeline in the "Pipelines" view.
2. The logs will open in the Output panel, showing detailed information about the pipeline run.
3. Custom tasks in the logs are highlighted for easy identification.

<br>

![Alt Text](https://raw.githubusercontent.com/anonknowsit/ado-pipeline-viewer/master/AnimationLogs.gif)

## Configuration

### Commands

- **Set Azure DevOps PAT**: Set your Azure DevOps Personal Access Token.
- **Set Azure DevOps Organization URL**: Set your Azure DevOps organization URL.
- **Add Azure DevOps Project**: Add a new project to view pipelines.
- **Remove Azure DevOps Project**: Remove an existing project.
- **Reset Azure DevOps Secrets**: Reset all stored secrets (PAT, organization URL, projects).
- **Refresh**: Manually refresh the pipeline view.

### Views

- **Authentication**: Manage your Azure DevOps PAT, organization URL, and projects.
- **Pipelines**: View and manage your Azure DevOps pipelines.

### Auto-Refresh

The extension automatically refreshes the pipeline view every 15 seconds to keep the status up-to-date.

## Acknowledgements

- [Azure DevOps Node API](https://github.com/microsoft/azure-devops-node-api) for interacting with Azure DevOps.
- [Visual Studio Code API](https://code.visualstudio.com/api) for building the extension.

### Contributing

If you'd like to contribute to the development of this extension, please visit my GitHub repository.

### Feedback and Issues

If you encounter any issues or have suggestions for improvements, please open an issue on our GitHub repository.

### About the Author

Created with ❤️ by [Anonknowsit](https://github.com/anonknowsit)
