# Change Log

All notable changes to the "Azure DevOps - Pipeline Viewer" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.5] - 2024-07-30

### Added

- Implemented a spinning sync icon for running pipelines in the tree view.
- Added "(Running)" text to the description of running pipelines for additional clarity.

### Changed

- Modified the pipeline view to show the latest 15 pipelines from each project, regardless of their status.
- Updated the sorting of pipelines to be based on finish time in descending order.
- Improved error handling when opening logs during ongoing refreshes.

### Fixed

- Resolved issues with opening logs while the pipeline view is refreshing.

## [0.0.4] - 2024-07-29

### Updated

- Adjusted README.md file

### Added

- Implemented a progress indicator when fetching pipeline logs.
- Added the ability to view detailed logs for each pipeline run.
- Highlighted custom tasks in the log output for better visibility.

### Changed

- Modified the log output to include the build number in the pipeline name for easier differentiation.
- Adjusted the timestamp format in logs to YYYY-MM-DDTHH:MM:SS for improved readability.

## [0.0.3] - 2024-07-29

### Changed

- Adjusted the extension to show the latest 20 pipeline runs from all pipelines within each project.
- Updated the README.md file with new information.

## [0.0.2] - 2024-07-27

### Added

- Added tutorial animation.
- Added indicator description in README.md.

## [0.0.1] - 2024-07-27

### Added

- Initial release of Azure DevOps - Pipeline Viewer.
- View Azure DevOps pipelines for multiple projects within a single organization.
- Display pipeline status with icons:
  - Running: Sync icon
  - Succeeded: Check icon
  - Failed: X icon
  - Canceled: Dash icon
  - Partially Succeeded: Warning icon
- Show build number for each pipeline.
- Group pipelines by project with visual separators.
- Auto-refresh pipeline status every 10 seconds.
- Manual refresh option in the Pipelines view.
- Set and manage Azure DevOps Personal Access Token (PAT).
- Configure Azure DevOps organization URL.
- Add and remove multiple Azure DevOps projects.
- Authentication view to manage PAT, organization URL, and projects.
- Status bar item showing count and details of running pipelines.
- Command Palette commands for all main functions.
- Primary sidebar with overflow menu for easy access to all functions.

### Security

- Implemented secure storage for Personal Access Token using VSCode Secret Storage API
