import { createSignal, Show, Signal } from "solid-js"
import { App, LaunchContext } from "~/os"
import { type FsPath, readFile, writeFile, entryName as fsEntryName, parentPath as fsParentPath } from "~/os/fs"
import { FileDialog, type FileDialogResult, type FileDialogOptions } from "~/os/apps/file-explorer"
import type { EditorStatus } from "./types"
import { Toolbar, StatusBar, EditorArea, Footer } from "./components"

export class TextEditorApp extends App {
  static appId = "text-editor"
  static appName = "Text Editor"
  static appIcon = "file-text"
  static appDescription = "Open and edit plain text files."
  static appColor = "blue"
  static appProtected = false
  static supportedFileTypes = [".txt", ".md", ".json", ".csv", ".log", ".yml", ".yaml"] as const

  id = TextEditorApp.appId
  name = TextEditorApp.appName
  icon = TextEditorApp.appIcon
  description = TextEditorApp.appDescription
  color = TextEditorApp.appColor

  defaultSize = { width: 700, height: 500 }

  private currentPath: Signal<FsPath | null>
  private content: Signal<string>
  private status: Signal<EditorStatus>
  private errorMessage: Signal<string>
  private hasUnsavedChanges: Signal<boolean>
  private openDialogOpen: Signal<boolean>
  private saveDialogOpen: Signal<boolean>

  constructor() {
    super()

    this.currentPath = createSignal<FsPath | null>(null)
    this.content = createSignal("")
    this.status = createSignal<EditorStatus>("idle")
    this.errorMessage = createSignal("")
    this.hasUnsavedChanges = createSignal(false)
    this.openDialogOpen = createSignal(false)
    this.saveDialogOpen = createSignal(false)
  }

  onLaunch = (context: LaunchContext) => {
    if (context.filePath) {
      void this.loadFile(context.filePath)
    }
  }

  private loadFile = async (path: FsPath) => {
    this.status[1]("loading")
    this.errorMessage[1]("")

    try {
      const data = await readFile(path, { as: "text" })
      if (data === undefined) {
        throw new Error("File not found")
      }
      this.content[1](data as string)
      this.currentPath[1](path)
      this.hasUnsavedChanges[1](false)
      this.status[1]("idle")
    } catch (err) {
      this.status[1]("error")
      this.errorMessage[1](err instanceof Error ? err.message : "Failed to load file")
    }
  }

  private saveFile = async (path: FsPath) => {
    this.status[1]("saving")
    this.errorMessage[1]("")

    try {
      await writeFile(path, this.content[0](), { mimeType: "text/plain", parents: true })
      this.currentPath[1](path)
      this.hasUnsavedChanges[1](false)
      this.status[1]("idle")
    } catch (err) {
      this.status[1]("error")
      this.errorMessage[1](err instanceof Error ? err.message : "Failed to save file")
    }
  }

  private handleSave = () => {
    const path = this.currentPath[0]()
    if (path) {
      void this.saveFile(path)
    } else {
      this.saveDialogOpen[1](true)
    }
  }

  private handleOpenDialogResult = (result: FileDialogResult) => {
    if (result.cancelled || result.paths.length === 0) return
    void this.loadFile(result.paths[0])
  }

  private handleSaveDialogResult = (result: FileDialogResult) => {
    if (result.cancelled || result.paths.length === 0) return
    void this.saveFile(result.paths[0])
  }

  private handleContentChange = (value: string) => {
    this.content[1](value)
    if (this.currentPath[0]()) {
      this.hasUnsavedChanges[1](true)
    }
  }

  private getOpenDialogOptions = (): FileDialogOptions => {
    const current = this.currentPath[0]()
    return {
      mode: "open",
      title: "Open File",
      initialPath: current ? fsParentPath(current) : "/Documents",
      selectionType: "file",
      allowedExtensions: [...TextEditorApp.supportedFileTypes],
      multiSelect: false,
    }
  }

  private getSaveDialogOptions = (): FileDialogOptions => {
    const current = this.currentPath[0]()
    return {
      mode: "save",
      title: "Save File",
      initialPath: current ? fsParentPath(current) : "/Documents",
      selectionType: "file",
      defaultFileName: current ? fsEntryName(current) : "untitled.txt",
    }
  }

  private getFileName = () => {
    const path = this.currentPath[0]()
    if (!path) return "Untitled"
    return fsEntryName(path)
  }

  render = () => {
    return (
      <div class="flex h-full flex-col bg-background">
        <FileDialog
          open={this.openDialogOpen[0]}
          onOpenChange={this.openDialogOpen[1]}
          options={this.getOpenDialogOptions()}
          onResult={this.handleOpenDialogResult}
        />

        <FileDialog
          open={this.saveDialogOpen[0]}
          onOpenChange={this.saveDialogOpen[1]}
          options={this.getSaveDialogOptions()}
          onResult={this.handleSaveDialogResult}
        />

        <Toolbar
          status={this.status[0]}
          currentPath={this.currentPath[0]}
          onOpen={() => this.openDialogOpen[1](true)}
          onSave={this.handleSave}
          onSaveAs={() => this.saveDialogOpen[1](true)}
        />

        <Show when={this.currentPath[0]() || this.status[0]() === "error"}>
          <StatusBar
            status={this.status[0]}
            errorMessage={this.errorMessage[0]}
            fileName={this.getFileName}
            hasUnsavedChanges={this.hasUnsavedChanges[0]}
          />
        </Show>

        <EditorArea
          currentPath={this.currentPath[0]}
          content={this.content[0]}
          status={this.status[0]}
          onContentChange={this.handleContentChange}
        />

        <Footer currentPath={this.currentPath[0]} characterCount={() => this.content[0]().length} />
      </div>
    )
  }
}
