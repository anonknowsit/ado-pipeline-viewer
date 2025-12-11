import * as azdev from "azure-devops-node-api";
import {
  BuildResult,
  BuildStatus,
} from "azure-devops-node-api/interfaces/BuildInterfaces";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const authProvider = new AuthenticationProvider(context);
  const pipelinesProvider = new PipelinesProvider(context);

  vscode.window.registerTreeDataProvider("azurePipelinesAuth", authProvider);
  vscode.window.registerTreeDataProvider("azurePipelines", pipelinesProvider);

  vscode.commands.registerCommand(
    "azurePipelines.openLogs",
    (pipeline: Pipeline) => pipelinesProvider.openLogs(pipeline)
  );
  vscode.commands.registerCommand(
    "azurePipelines.viewLogsInWebview",
    (pipeline: Pipeline) => pipelinesProvider.openLogsInWebview(pipeline)
  );

  // Start auto-refresh immediately
  pipelinesProvider.startAutoRefresh();

  context.subscriptions.push(
    vscode.commands.registerCommand("azurePipelines.refresh", () =>
      pipelinesProvider.refresh()
    ),
    vscode.commands.registerCommand("azurePipelines.setPAT", () =>
      authProvider.setPAT()
    ),
    vscode.commands.registerCommand("azurePipelines.setOrgUrl", () =>
      authProvider.setOrgUrl()
    ),
    vscode.commands.registerCommand("azurePipelines.addProject", () =>
      authProvider.addProject()
    ),
    vscode.commands.registerCommand("azurePipelines.removeProject", () =>
      authProvider.removeProject()
    ),
    vscode.commands.registerCommand("azurePipelines.resetSecrets", () =>
      authProvider.resetSecrets()
    )
  );
}

class AuthenticationProvider
  implements vscode.TreeDataProvider<ConfigStatusItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<ConfigStatusItem | null> =
    new vscode.EventEmitter<ConfigStatusItem | null>();
  readonly onDidChangeTreeData: vscode.Event<ConfigStatusItem | null> =
    this._onDidChangeTreeData.event;

  constructor(private context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(null);
  }

  getTreeItem(element: ConfigStatusItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<ConfigStatusItem[]> {
    const pat = await this.getPAT();
    const orgUrl = await this.getOrgUrl();
    const projects = await this.getProjects();

    const projectItems = projects.map(
      (project) =>
        new ConfigStatusItem(
          `Project: ${project}`,
          vscode.TreeItemCollapsibleState.None,
          new vscode.ThemeIcon("project")
        )
    );

    return [
      new ConfigStatusItem(
        `PAT: ${pat ? "Set" : "Not Set"}`,
        vscode.TreeItemCollapsibleState.None,
        new vscode.ThemeIcon("key")
      ),
      new ConfigStatusItem(
        `Organization: ${orgUrl || "Not Set"}`,
        vscode.TreeItemCollapsibleState.None,
        new vscode.ThemeIcon("organization")
      ),
      ...projectItems,
    ];
  }

  async setPAT(): Promise<void> {
    const pat = await vscode.window.showInputBox({
      prompt: "Enter your Azure DevOps Personal Access Token",
      password: true,
    });
    if (pat) {
      try {
        await this.context.secrets.store("azureDevOpsPAT", pat);
        vscode.window.showInformationMessage("PAT stored successfully");
        this.refresh();
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to store PAT: ${error}`);
      }
    }
  }

  async setOrgUrl(): Promise<void> {
    const orgUrl = await vscode.window.showInputBox({
      prompt: "Enter your Azure DevOps Organization URL",
      placeHolder: "https://dev.azure.com/your-organization",
    });
    if (orgUrl) {
      try {
        await this.context.globalState.update("azureDevOpsOrgUrl", orgUrl);
        vscode.window.showInformationMessage(
          "Organization URL stored successfully"
        );
        this.refresh();
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to store Organization URL: ${error}`
        );
      }
    }
  }

  async addProject(): Promise<void> {
    const projectName = await vscode.window.showInputBox({
      prompt: "Enter your Azure DevOps Project Name",
    });
    if (projectName) {
      try {
        let projects = await this.getProjects();
        projects.push(projectName);
        await this.context.globalState.update("azureDevOpsProjects", projects);
        vscode.window.showInformationMessage("Project added successfully");
        this.refresh();
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to add project: ${error}`);
      }
    }
  }

  async removeProject(): Promise<void> {
    const projects = await this.getProjects();
    const projectName = await vscode.window.showQuickPick(projects, {
      placeHolder: "Select a project to remove",
    });
    if (projectName) {
      try {
        const updatedProjects = projects.filter(
          (project) => project !== projectName
        );
        await this.context.globalState.update(
          "azureDevOpsProjects",
          updatedProjects
        );
        vscode.window.showInformationMessage("Project removed successfully");
        this.refresh();
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to remove project: ${error}`);
      }
    }
  }

  async resetSecrets(): Promise<void> {
    try {
      await this.context.secrets.delete("azureDevOpsPAT");
      await this.context.globalState.update("azureDevOpsOrgUrl", undefined);
      await this.context.globalState.update("azureDevOpsProjects", []);
      vscode.window.showInformationMessage(
        "Azure DevOps secrets have been reset"
      );
      this.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to reset secrets: ${error}`);
    }
  }

  async getPAT(): Promise<string | undefined> {
    return this.context.secrets.get("azureDevOpsPAT");
  }

  async getOrgUrl(): Promise<string | undefined> {
    return this.context.globalState.get("azureDevOpsOrgUrl");
  }

  async getProjects(): Promise<string[]> {
    return this.context.globalState.get("azureDevOpsProjects", []);
  }
}

class PipelinesProvider
  implements vscode.TreeDataProvider<Pipeline | SeparatorItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    Pipeline | SeparatorItem | null
  > = new vscode.EventEmitter();
  readonly onDidChangeTreeData: vscode.Event<Pipeline | SeparatorItem | null> =
    this._onDidChangeTreeData.event;
  private interval: NodeJS.Timeout | undefined;
  private runningPipelines: number = 0;
  private previousRunningPipelines: number = 0;
  private statusBarItem: vscode.StatusBarItem;

  constructor(private context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.command = "azurePipelines.showRunningPipelines";
    context.subscriptions.push(this.statusBarItem);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(null);
  }

  startAutoRefresh(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.interval = setInterval(() => this.refreshData(), 60000); // Refresh every 60 seconds
  }

  private async refreshData(): Promise<void> {
    await this.fetchPipelinesWithSeparators();
    this.refresh();
  }

  getTreeItem(element: Pipeline | SeparatorItem): vscode.TreeItem {
    return element;
  }

  async getChildren(
    element?: Pipeline | SeparatorItem
  ): Promise<(Pipeline | SeparatorItem)[]> {
    if (!element) {
      return this.fetchPipelinesWithSeparators();
    }
    return [];
  }

  private async fetchPipelinesWithSeparators(): Promise<
    (Pipeline | SeparatorItem)[]
  > {
    const pat = await this.getPAT();
    const orgUrl = await this.getOrgUrl();
    const projects = await this.getProjects();

    if (!pat || !orgUrl || projects.length === 0) {
      return [];
    }

    try {
      const authHandler = azdev.getPersonalAccessTokenHandler(pat);
      const connection = new azdev.WebApi(orgUrl, authHandler);
      const buildApi = await connection.getBuildApi();

      let result: (Pipeline | SeparatorItem)[] = [];

      for (const projectName of projects) {
        result.push(new SeparatorItem(projectName));

        const builds = await buildApi.getBuilds(
          projectName,
          undefined, // definitions
          undefined, // queues
          undefined, // buildNumber
          undefined, // minTime
          undefined, // maxTime
          undefined, // requestedFor
          undefined, // reasonFilter
          undefined, // statusFilter
          undefined, // resultFilter
          undefined, // tagFilters
          undefined, // properties
          undefined, // top
          undefined, // continuationToken
          undefined, // maxBuildsPerDefinition
          undefined, // deletedFilter
          undefined, // queryOrder
          undefined // branchName
        );

        const sortedBuilds = builds.sort(
          (a, b) =>
            (b.finishTime ? new Date(b.finishTime).getTime() : Date.now()) -
            (a.finishTime ? new Date(a.finishTime).getTime() : Date.now())
        );

        const limitedBuilds = sortedBuilds.slice(0, 15);

        const projectPipelines = limitedBuilds
          .filter((build) => build.id !== undefined)
          .map(
            (build) =>
              new Pipeline(
                build.definition?.name || "Unknown",
                this.getBuildResultString(build.result),
                build.status === BuildStatus.InProgress,
                vscode.TreeItemCollapsibleState.None,
                build.buildNumber || "Unknown",
                projectName,
                build.id!
              )
          );

        result.push(...projectPipelines);
      }

      this.previousRunningPipelines = this.runningPipelines;
      this.runningPipelines = result.filter(
        (item) => item instanceof Pipeline && item.isRunning
      ).length;

      this.updateActivityBarIcon(
        result.filter(
          (item) => item instanceof Pipeline && item.isRunning
        ) as Pipeline[]
      );

      return result;
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error fetching pipelines: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }
  }

  async openLogs(pipeline: Pipeline) {
    const pat = await this.getPAT();
    const orgUrl = await this.getOrgUrl();

    if (!pat || !orgUrl) {
      vscode.window.showErrorMessage("PAT or Organization URL is not set");
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Fetching logs for ${pipeline.label}`,
        cancellable: false,
      },
      async (progress) => {
        try {
          const authHandler = azdev.getPersonalAccessTokenHandler(pat);
          const connection = new azdev.WebApi(orgUrl, authHandler);
          const buildApi = await connection.getBuildApi();

          const outputChannel = vscode.window.createOutputChannel(
            `Pipeline Logs: ${pipeline.label} (Build ${pipeline.buildNumber})`
          );
          outputChannel.show(true);

          outputChannel.appendLine(
            `Fetching logs for pipeline: ${pipeline.label} (Build ${pipeline.buildNumber})`
          );
          outputChannel.appendLine("---");

          progress.report({ increment: 20, message: "Fetching timeline..." });

          // Fetch the timeline for the build
          const timeline = await buildApi.getBuildTimeline(
            pipeline.projectName,
            pipeline.buildId
          );

          console.log("Timeline Records:", timeline.records);

          // Filter tasks from the timeline
          const tasks =
            timeline.records?.filter((record) => record.type === "Task") || [];
          console.log("Filtered Tasks:", tasks);

          progress.report({ increment: 30, message: "Fetching logs..." });

          // Fetch logs for the build
          const logs = await buildApi.getBuildLogs(
            pipeline.projectName,
            pipeline.buildId
          );

          progress.report({ increment: 30, message: "Processing logs..." });

          for (let i = 0; i < logs.length; i++) {
            const log = logs[i];
            if (log.id !== undefined) {
              // Get the corresponding task
              const task = tasks.find((t) => t.log?.id === log.id);

              // Use the name property as the task name
              const taskName = task?.name || `Log ${log.id}`;

              outputChannel.appendLine(`\n--- ${taskName} ---`);
              const logContent = await buildApi.getBuildLogLines(
                pipeline.projectName,
                pipeline.buildId,
                log.id
              );

              // Process and format log content
              const formattedLogContent = logContent
                .map((line) => {
                  // Extract timestamp and message
                  const match = line.match(
                    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}).\d+Z\s(.*)$/
                  );
                  if (match) {
                    const [, timestamp, message] = match;
                    return `${timestamp} ${message}`;
                  }
                  return line;
                })
                .join("\n");

              outputChannel.appendLine(formattedLogContent);
              outputChannel.appendLine("---");
            }
            progress.report({
              increment: 20 / logs.length,
              message: `Processing log ${i + 1} of ${logs.length}...`,
            });
          }

          outputChannel.appendLine("Log fetching completed.");
          progress.report({ increment: 20, message: "Completed" });
        } catch (error) {
          vscode.window.showErrorMessage(
            `Error fetching logs: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    );
  }

  async openLogsInWebview(pipeline: Pipeline) {
    const pat = await this.getPAT();
    const orgUrl = await this.getOrgUrl();

    if (!pat || !orgUrl) {
      vscode.window.showErrorMessage("PAT or Organization URL is not set");
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "pipelineLogs",
      `Logs: ${pipeline.label}`,
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = this.getWebviewContent("Loading logs...");

    try {
      const authHandler = azdev.getPersonalAccessTokenHandler(pat);
      const connection = new azdev.WebApi(orgUrl, authHandler);
      const buildApi = await connection.getBuildApi();

      // Fetch the timeline for the build
      const timeline = await buildApi.getBuildTimeline(
        pipeline.projectName,
        pipeline.buildId
      );

      console.log("Timeline Records:", timeline.records);

      // Filter tasks from the timeline
      const tasks =
        timeline.records?.filter((record) => record.type === "Task") || [];
      console.log("Filtered Tasks:", tasks);

      // Fetch logs for the build
      const logs = await buildApi.getBuildLogs(
        pipeline.projectName,
        pipeline.buildId
      );

      let logContent = "";

      for (const log of logs) {
        if (log.id !== undefined) {
          // Find the corresponding task for the log
          const task = tasks.find((t) => t.log?.id === log.id);

          // Use the task name or fallback to "Log X"
          const taskName = task?.name || `Log ${log.id}`;
          console.log(`Task Name for Log ${log.id}:`, taskName);

          // Fetch the log lines
          const logLines = await buildApi.getBuildLogLines(
            pipeline.projectName,
            pipeline.buildId,
            log.id
          );

          // Add the task name and log content to the Webview
          logContent += `
          <div class="task">
            <div class="task-header">${taskName}</div>
            <div class="task-content">${logLines.join("\n")}</div>
          </div>
          <hr>
        `;
        }
      }

      // Update the Webview content with the fetched logs
      panel.webview.html = this.getWebviewContent(logContent);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error fetching logs: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      panel.webview.html = this.getWebviewContent(
        `Error fetching logs: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private getWebviewContent(logs: string): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pipeline Logs</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #1e1e1e;
          color: #d4d4d4;
        }
        header {
          background-color: #007acc;
          color: white;
          padding: 10px;
          text-align: center;
          font-size: 1.5em;
        }
        .container {
          padding: 20px;
        }
        .task {
          margin-bottom: 20px;
          border: 1px solid #3c3c3c;
          border-radius: 5px;
          overflow: hidden;
        }
        .task-header {
          background-color: #252526;
          color: #dcdcaa;
          padding: 10px;
          font-size: 1.2em;
          font-weight: bold;
        }
        .task-content {
          background-color: #1e1e1e;
          padding: 10px;
          white-space: pre-wrap; /* Wrap long lines */
          word-wrap: break-word; /* Break long words */
          overflow-x: auto;
        }
        .task-content::-webkit-scrollbar {
          width: 8px;
        }
        .task-content::-webkit-scrollbar-thumb {
          background: #007acc;
          border-radius: 4px;
        }
        .task-content::-webkit-scrollbar-track {
          background: #333;
        }
      </style>
    </head>
    <body>
      <header>Pipeline Logs</header>
      <div class="container">
        ${logs}
      </div>
    </body>
    </html>
  `;
}

  private async getPAT(): Promise<string | undefined> {
    return this.context.secrets.get("azureDevOpsPAT");
  }

  private async getOrgUrl(): Promise<string | undefined> {
    return this.context.globalState.get("azureDevOpsOrgUrl");
  }

  private async getProjects(): Promise<string[]> {
    return this.context.globalState.get("azureDevOpsProjects", []);
  }

  private getBuildResultString(result: BuildResult | undefined): string {
    if (result === undefined) {
      return "Unknown";
    }
    switch (result) {
      case BuildResult.Succeeded:
        return "Succeeded";
      case BuildResult.PartiallySucceeded:
        return "Partially Succeeded";
      case BuildResult.Failed:
        return "Failed";
      case BuildResult.Canceled:
        return "Canceled";
      default:
        return "Unknown";
    }
  }

  private updateActivityBarIcon(runningPipelines: Pipeline[]) {
    if (this.runningPipelines > 0) {
      vscode.commands.executeCommand(
        "setContext",
        "azurePipelines.hasRunningPipelines",
        true
      );
      vscode.commands.executeCommand(
        "setContext",
        "azurePipelines.runningPipelinesCount",
        this.runningPipelines
      );
      if (this.runningPipelines > this.previousRunningPipelines) {
        // New pipeline started
        const pipelineInfo = runningPipelines
          .map((p) => `${p.label} (${p.buildNumber}) - ${p.projectName}`)
          .join(", ");
        vscode.window.showInformationMessage(
          `Total running pipelines: ${this.runningPipelines}. Running: ${pipelineInfo}`
        );
      }
    } else {
      vscode.commands.executeCommand(
        "setContext",
        "azurePipelines.hasRunningPipelines",
        false
      );
      vscode.commands.executeCommand(
        "setContext",
        "azurePipelines.runningPipelinesCount",
        0
      );
    }
    // Update status bar
    this.updateStatusBar(runningPipelines);
  }

  private updateStatusBar(runningPipelines: Pipeline[]) {
    if (this.runningPipelines > 0) {
      const pipelineInfo = runningPipelines
        .map((p) => `${p.label} (${p.buildNumber}) - ${p.projectName}`)
        .join(", ");
      this.statusBarItem.text = `$(sync~spin) ${this.runningPipelines} pipeline(s) running: ${pipelineInfo}`;
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }
}

class Pipeline extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    private status: string,
    public readonly isRunning: boolean,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly buildNumber: string,
    public readonly projectName: string,
    public readonly buildId: number
  ) {
    super(`${label} (${buildNumber}) - ${projectName}`, collapsibleState);
    this.tooltip = `${label} (${buildNumber}) - ${projectName} - ${status}`;
    this.description = `${buildNumber} - ${status}${
      isRunning ? " (Running)" : ""
    }`;
    this.iconPath = this.getIconPath();
    this.command = {
      command: "azurePipelines.openLogs",
      title: "Open Logs",
      arguments: [this],
    };
    this.contextValue = "pipeline"; // Add this line
  }

  private getIconPath(): vscode.ThemeIcon {
    if (this.isRunning) {
      return new vscode.ThemeIcon("sync~spin");
    }
    switch (this.status.toLowerCase()) {
      case "succeeded":
        return new vscode.ThemeIcon("check");
      case "failed":
        return new vscode.ThemeIcon("x");
      case "canceled":
        return new vscode.ThemeIcon("dash");
      case "partially succeeded":
        return new vscode.ThemeIcon("warning");
      default:
        return new vscode.ThemeIcon("circle-outline");
    }
  }
}

class SeparatorItem extends vscode.TreeItem {
  constructor(projectName: string) {
    super(projectName, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon("project");
    this.description = `${"─".repeat(20)}`;
    this.contextValue = "pipeline";
  }
}

class ConfigStatusItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly iconPath: vscode.ThemeIcon
  ) {
    super(label, collapsibleState);
    this.iconPath = iconPath;
  }
}

export function deactivate() {}
