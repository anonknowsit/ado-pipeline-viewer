# Change Log

All notable changes to the "Azure DevOps - Pipeline Viewer" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2] - 2024-07-27

### Added

- Animation
- Indicator description in README.md

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

- Implemented secure storage for Personal Access Token using VSCode Secret Storage API.
