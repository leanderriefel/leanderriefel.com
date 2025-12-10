import { registerApp } from "~/os"
import { InformationApp } from "~/os/apps/information"
import { SettingsApp } from "~/os/apps/settings"
import { TestApp } from "~/os/apps/test"
import { FileExplorerApp } from "~/os/apps/file-explorer"
import { AppStoreApp } from "~/os/apps/app-store"
import { TextEditorApp } from "~/os/apps/text-editor"

registerApp(FileExplorerApp)
registerApp(InformationApp)
registerApp(TestApp)
registerApp(SettingsApp)
registerApp(AppStoreApp)
registerApp(TextEditorApp)
